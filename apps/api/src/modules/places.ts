import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createPlaceSchema, featureVoteSchema, searchPlacesSchema } from '@tappa/shared';
import { conflict, decodeCursor, encodeCursor, notFound, parse } from '../lib/http';
import { searchPlaceIds, voteFeatures } from './place-service';
import { postInclude, serializePlace, serializePost } from './serializers';
import { blockedUserIds } from './users';

const idParam = z.object({ id: z.string().uuid() });

export default async function placeRoutes(app: FastifyInstance) {
  const { prisma, storage } = app.deps;

  app.get('/places', async (req) => {
    const q = parse(searchPlacesSchema, req.query);
    const offset = decodeCursor<{ o: number }>(q.cursor)?.o ?? 0;
    const rows = await searchPlaceIds(prisma, q, offset);
    const page = rows.slice(0, q.limit);
    const places = await prisma.place.findMany({
      where: { id: { in: page.map((r) => r.id) } },
      include: { features: true },
    });
    const byId = new Map(places.map((p) => [p.id, p]));
    return {
      items: page.flatMap((r) => {
        const p = byId.get(r.id);
        return p ? [serializePlace(p, { distanceKm: r.distance_km === null ? null : Math.round(r.distance_km * 100) / 100 })] : [];
      }),
      nextCursor: rows.length > q.limit ? encodeCursor({ o: offset + q.limit }) : null,
    };
  });

  app.get('/places/:id', { onRequest: app.optionalAuth }, async (req) => {
    const { id } = parse(idParam, req.params);
    const place = await prisma.place.findUnique({ where: { id }, include: { features: true } });
    if (!place || place.status !== 'PUBLISHED') throw notFound('Luogo');
    const myVotes = req.user
      ? await prisma.featureVote.findMany({ where: { placeId: id, userId: req.user.sub }, select: { feature: true, present: true } })
      : undefined;
    return { ...serializePlace(place), myFeatureVotes: myVotes };
  });

  app.post('/places', { onRequest: app.authenticate }, async (req, reply) => {
    const input = parse(createPlaceSchema, req.body);
    if (input.externalId) {
      const dup = await prisma.place.findUnique({ where: { externalId: input.externalId }, select: { id: true } });
      if (dup) throw conflict(`Luogo già presente: ${dup.id}`);
    }
    const { features, ...data } = input;
    const place = await prisma.$transaction(async (tx) => {
      const created = await tx.place.create({ data: { ...data, createdById: req.user.sub } });
      await voteFeatures(tx, req.user.sub, created.id, features.map((feature) => ({ feature, present: true })));
      return tx.place.findUniqueOrThrow({ where: { id: created.id }, include: { features: true } });
    });
    return reply.code(201).send(serializePlace(place));
  });

  /** "Confermo che c'è il fasciatoio" / "Non è vero, ci sono 3 gradini". */
  app.post('/places/:id/features', { onRequest: app.authenticate }, async (req) => {
    const { id } = parse(idParam, req.params);
    const vote = parse(featureVoteSchema, req.body);
    const exists = await prisma.place.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw notFound('Luogo');
    await prisma.$transaction((tx) => voteFeatures(tx, req.user.sub, id, [vote]));
    const place = await prisma.place.findUniqueOrThrow({ where: { id }, include: { features: true } });
    return serializePlace(place);
  });

  app.get('/places/:id/posts', { onRequest: app.optionalAuth }, async (req) => {
    const { id } = parse(idParam, req.params);
    const q = parse(
      z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) }),
      req.query,
    );
    const c = decodeCursor<{ createdAt: string; id: string }>(q.cursor);
    const blocked = await blockedUserIds(prisma, req.user?.sub);
    const posts = await prisma.post.findMany({
      where: {
        placeId: id,
        status: 'PUBLISHED',
        authorId: { notIn: blocked },
        ...(c ? { OR: [{ createdAt: { lt: new Date(c.createdAt) } }, { createdAt: new Date(c.createdAt), id: { lt: c.id } }] } : {}),
      },
      include: postInclude(req.user?.sub),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    const page = posts.slice(0, q.limit);
    const last = page.at(-1);
    return {
      items: page.map((p) => serializePost(p, storage)),
      nextCursor: posts.length > q.limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    };
  });
}
