/**
 * Dati dimostrativi: alcuni luoghi reali a Roma con caratteristiche
 * per famiglie, anziani e animali. Uso: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/tokens';
import { voteFeatures } from '../src/modules/place-service';

const prisma = new PrismaClient();

const PLACES = [
  { name: 'Bioparco di Roma', category: 'ATTRACTION', lat: 41.9166, lng: 12.4848, priceLevel: 2, features: ['STROLLER_FRIENDLY', 'CHANGING_TABLE', 'PLAY_AREA', 'SEATING_AVAILABLE', 'SHADE', 'KIDS_FREE_ENTRY'] },
  { name: 'Villa Borghese - Laghetto', category: 'PARK', lat: 41.9138, lng: 12.4823, priceLevel: 0, features: ['DOGS_ALLOWED', 'LARGE_DOGS_ALLOWED', 'SEATING_AVAILABLE', 'SHADE', 'STROLLER_FRIENDLY'] },
  { name: 'Musei Capitolini', category: 'MUSEUM', lat: 41.8930, lng: 12.4828, priceLevel: 2, features: ['ELEVATOR', 'ACCESSIBLE_TOILET', 'WHEELCHAIR_ACCESSIBLE', 'SENIOR_DISCOUNT', 'SEATING_AVAILABLE'] },
  { name: 'Explora - Museo dei Bambini', category: 'MUSEUM', lat: 41.9131, lng: 12.4702, priceLevel: 2, features: ['CHANGING_TABLE', 'BREASTFEEDING_AREA', 'PLAY_AREA', 'STROLLER_FRIENDLY', 'STEP_FREE_ENTRANCE'] },
  { name: 'Trattoria con giardino a Trastevere', category: 'RESTAURANT', lat: 41.8897, lng: 12.4694, priceLevel: 1, features: ['HIGH_CHAIR', 'KIDS_MENU', 'DOGS_ALLOWED', 'WATER_BOWL', 'PET_OUTDOOR_AREA'] },
  { name: 'Caffè tranquillo al Gianicolo', category: 'CAFE', lat: 41.8915, lng: 12.4613, priceLevel: 1, features: ['QUIET', 'SEATING_AVAILABLE', 'NEAR_PARKING', 'SHORT_WALK'] },
] as const;

async function main() {
  const passwordHash = await hashPassword('demo-password-123');
  const demo = await prisma.user.upsert({
    where: { email: 'demo@tappa.app' },
    update: {},
    create: {
      email: 'demo@tappa.app',
      username: 'demo',
      displayName: 'Famiglia Demo',
      passwordHash,
      travelerTypes: ['FAMILY_WITH_KIDS', 'WITH_PETS'],
      termsAcceptedAt: new Date(),
      emailVerifiedAt: new Date(),
    },
  });

  for (const p of PLACES) {
    const exists = await prisma.place.findFirst({ where: { name: p.name } });
    if (exists) continue;
    const { features, ...data } = p;
    const place = await prisma.place.create({
      data: { ...data, city: 'Roma', country: 'IT', createdById: demo.id },
    });
    await voteFeatures(prisma, demo.id, place.id, features.map((feature) => ({ feature, present: true })));
  }
  console.log(`Seed completato: ${PLACES.length} luoghi. Login demo: demo@tappa.app / demo-password-123`);
}

main().finally(() => prisma.$disconnect());
