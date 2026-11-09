import { Prisma, type PrismaClient } from '@prisma/client';
import { FEATURE_VERIFIED_THRESHOLD, PRICE_LEVELS, type SearchPlacesInput } from '@tappa/shared';

type Tx = Prisma.TransactionClient | PrismaClient;

/** Registra il voto di un utente su una caratteristica e ricalcola l'aggregato del luogo. */
export async function voteFeatures(
  tx: Tx,
  userId: string,
  placeId: string,
  votes: { feature: string; present: boolean }[],
) {
  for (const { feature, present } of votes) {
    await tx.featureVote.upsert({
      where: { userId_placeId_feature: { userId, placeId, feature } },
      create: { userId, placeId, feature, present },
      update: { present },
    });
    const grouped = await tx.featureVote.groupBy({
      by: ['present'],
      where: { placeId, feature },
      _count: { _all: true },
    });
    const confirmations = grouped.find((g) => g.present)?._count._all ?? 0;
    const denials = grouped.find((g) => !g.present)?._count._all ?? 0;
    await tx.placeFeature.upsert({
      where: { placeId_feature: { placeId, feature } },
      create: { placeId, feature, confirmations, denials },
      update: { confirmations, denials },
    });
  }
}

/** Ricalcola valutazione media e spesa media reale a persona a partire dai post pubblicati. */
export async function refreshPlaceStats(tx: Tx, placeId: string) {
  const [rating, cost] = await Promise.all([
    tx.post.aggregate({ where: { placeId, status: 'PUBLISHED' }, _avg: { rating: true }, _count: { _all: true } }),
    tx.post.aggregate({
      where: { placeId, status: 'PUBLISHED', costPerPerson: { not: null } },
      _avg: { costPerPerson: true },
      _count: { _all: true },
    }),
  ]);
  await tx.place.update({
    where: { id: placeId },
    data: {
      ratingAvg: rating._avg.rating,
      ratingCount: rating._count._all,
      postCount: rating._count._all,
      avgCostPerPerson: cost._avg.costPerPerson,
      costReportsCount: cost._count._all,
    },
  });
}

/** Fascia di prezzo massima compatibile con un budget a persona. */
export function maxLevelForBudget(budget: number): number {
  let level = 0;
  for (const p of PRICE_LEVELS) {
    if (p.maxPerPerson !== null && p.maxPerPerson <= budget) level = p.level;
  }
  return level;
}

/**
 * Ricerca luoghi con filtri combinabili: testo, categoria, caratteristiche
 * (tutte richieste), budget, raggio geografico. Restituisce id ordinati e distanza.
 */
export async function searchPlaceIds(prisma: PrismaClient, q: SearchPlacesInput, offset: number) {
  const where: Prisma.Sql[] = [Prisma.sql`p.status = 'PUBLISHED'`];
  const hasPoint = q.lat !== undefined && q.lng !== undefined;
  const point = hasPoint
    ? Prisma.sql`ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography`
    : null;

  if (q.q) {
    where.push(Prisma.sql`(p.name ILIKE ${'%' + q.q + '%'} OR p.name % ${q.q} OR p.city ILIKE ${q.q + '%'})`);
  }
  if (q.city) where.push(Prisma.sql`lower(p.city) = lower(${q.city})`);
  if (q.category?.length) {
    where.push(Prisma.sql`p.category::text IN (${Prisma.join(q.category)})`);
  }
  if (q.maxPriceLevel !== undefined) {
    where.push(Prisma.sql`p."priceLevel" <= ${q.maxPriceLevel}`);
  }
  if (q.maxCostPerPerson !== undefined) {
    // Preferiamo la spesa reale dichiarata dagli utenti; se manca, usiamo la fascia di prezzo.
    where.push(Prisma.sql`(
      (p."avgCostPerPerson" IS NOT NULL AND p."avgCostPerPerson" <= ${q.maxCostPerPerson})
      OR (p."avgCostPerPerson" IS NULL AND p."priceLevel" <= ${maxLevelForBudget(q.maxCostPerPerson)})
    )`);
  }
  if (q.features?.length) {
    const minConf = q.verifiedOnly ? FEATURE_VERIFIED_THRESHOLD : 1;
    where.push(Prisma.sql`(
      SELECT count(*) FROM "PlaceFeature" f
      WHERE f."placeId" = p.id
        AND f.feature IN (${Prisma.join(q.features)})
        AND f.confirmations > f.denials
        AND f.confirmations >= ${minConf}
    ) = ${q.features.length}`);
  }
  if (point) {
    where.push(Prisma.sql`ST_DWithin(p.location, ${point}, ${q.radiusKm * 1000})`);
  }

  const distance = point ? Prisma.sql`ST_Distance(p.location, ${point}) / 1000` : Prisma.sql`NULL::float`;
  const order = point
    ? Prisma.sql`distance_km ASC, p.id`
    : Prisma.sql`p."ratingAvg" DESC NULLS LAST, p."postCount" DESC, p.id`;

  return prisma.$queryRaw<{ id: string; distance_km: number | null }[]>`
    SELECT p.id, ${distance} AS distance_km
    FROM "Place" p
    WHERE ${Prisma.join(where, ' AND ')}
    ORDER BY ${order}
    LIMIT ${q.limit + 1} OFFSET ${offset}
  `;
}
