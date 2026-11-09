import { z } from 'zod';
import { FEATURE_CODES, PLACE_CATEGORIES, TRAVELER_TYPES } from './catalog';

export const registerSchema = z.object({
  email: z.string().email().max(254).transform((e) => e.toLowerCase().trim()),
  password: z
    .string()
    .min(10, 'La password deve avere almeno 10 caratteri')
    .max(128),
  displayName: z.string().trim().min(2).max(50),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,30}$/, 'Solo lettere minuscole, numeri, _ e .'),
  travelerTypes: z.array(z.enum(TRAVELER_TYPES)).max(TRAVELER_TYPES.length).default([]),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Devi accettare i termini' }) }),
  /** Dichiarazione di maggiore età: l'app non è destinata a minori. */
  isAdult: z.literal(true, { errorMap: () => ({ message: 'Devi avere almeno 18 anni' }) }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(20) });

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(50).optional(),
  bio: z.string().trim().max(300).optional(),
  homeCity: z.string().trim().max(100).optional(),
  travelerTypes: z.array(z.enum(TRAVELER_TYPES)).optional(),
  avatarKey: z.string().max(300).nullable().optional(),
});

export const latLngSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const createPlaceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(PLACE_CATEGORIES),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().min(1).max(100),
  country: z.string().trim().length(2).toUpperCase(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  priceLevel: z.number().int().min(0).max(4).optional(),
  website: z.string().url().max(300).optional(),
  phone: z.string().max(40).optional(),
  /** Id del luogo su Google Places / OSM, per evitare duplicati. */
  externalId: z.string().max(200).optional(),
  features: z.array(z.enum(FEATURE_CODES)).max(FEATURE_CODES.length).default([]),
});
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;

const csv = <T extends z.ZodTypeAny>(item: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : v),
    z.array(item),
  );

export const searchPlacesSchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    category: csv(z.enum(PLACE_CATEGORIES)).optional(),
    features: csv(z.enum(FEATURE_CODES)).optional(),
    /** Solo caratteristiche confermate da almeno N persone. */
    verifiedOnly: z.coerce.boolean().optional(),
    maxPriceLevel: z.coerce.number().int().min(0).max(4).optional(),
    /** Budget massimo per persona in euro (basato sulle spese reali dichiarate nei post). */
    maxCostPerPerson: z.coerce.number().min(0).max(10000).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radiusKm: z.coerce.number().min(0.1).max(200).default(10),
    city: z.string().trim().max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().optional(),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    message: 'lat e lng vanno passati insieme',
  });
export type SearchPlacesInput = z.infer<typeof searchPlacesSchema>;

export const featureVoteSchema = z.object({
  feature: z.enum(FEATURE_CODES),
  /** true = "confermo che c'è", false = "non c'è / non è vero". */
  present: z.boolean(),
});

export const createPostSchema = z.object({
  placeId: z.string().uuid(),
  caption: z.string().trim().max(2200).optional(),
  /** Chiavi delle immagini già caricate tramite URL firmato. */
  photoKeys: z.array(z.string().max(300)).min(1).max(10),
  rating: z.number().int().min(1).max(5),
  /** Quanto si è speso a persona: alimenta il filtro budget con dati reali. */
  costPerPerson: z.number().min(0).max(10000).optional(),
  visitedWith: z.array(z.enum(TRAVELER_TYPES)).default([]),
  /** Età dei bambini presenti (solo numeri, mai nomi): aiuta altre famiglie. */
  kidsAges: z.array(z.number().int().min(0).max(17)).max(10).default([]),
  /** Caratteristiche confermate durante la visita. */
  confirmedFeatures: z.array(z.enum(FEATURE_CODES)).default([]),
  visitedAt: z.coerce.date().optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const feedQuerySchema = z.object({
  /** "for-me": personalizzato sul profilo; "nearby": vicino a me; "following": persone seguite. */
  mode: z.enum(['for-me', 'nearby', 'following']).default('for-me'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

export const commentSchema = z.object({ body: z.string().trim().min(1).max(1000) });

export const uploadRequestSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  sizeBytes: z.number().int().min(1).max(15 * 1024 * 1024),
});

export const createConversationSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(50),
  title: z.string().trim().max(80).optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  /** Si può condividere un luogo in chat ("andiamo qui?"). */
  placeId: z.string().uuid().optional(),
});

export const reportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'USER', 'PLACE', 'MESSAGE']),
  targetId: z.string().uuid(),
  reason: z.enum(['SPAM', 'INAPPROPRIATE', 'MINOR_SAFETY', 'HARASSMENT', 'WRONG_INFO', 'OTHER']),
  details: z.string().trim().max(1000).optional(),
});

export const saveListSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isPublic: z.boolean().default(false),
});
