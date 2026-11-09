import type { Place, PlaceFeature, Post, PostPhoto, User } from '@prisma/client';
import { FEATURE_VERIFIED_THRESHOLD } from '@tappa/shared';
import type { Storage } from '../lib/storage';

export function publicUser(u: Pick<User, 'id' | 'username' | 'displayName' | 'avatarKey' | 'travelerTypes'>, storage: Storage) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarKey ? storage.publicUrl(u.avatarKey) : null,
    travelerTypes: u.travelerTypes,
  };
}

export function serializeFeatures(features: Pick<PlaceFeature, 'feature' | 'confirmations' | 'denials'>[]) {
  return features
    .filter((f) => f.confirmations > f.denials)
    .map((f) => ({
      code: f.feature,
      confirmations: f.confirmations,
      denials: f.denials,
      verified: f.confirmations >= FEATURE_VERIFIED_THRESHOLD,
    }))
    .sort((a, b) => b.confirmations - a.confirmations);
}

export function serializePlace(p: Place & { features?: PlaceFeature[] }, extra: { distanceKm?: number | null } = {}) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    address: p.address,
    city: p.city,
    country: p.country,
    lat: p.lat,
    lng: p.lng,
    priceLevel: p.priceLevel,
    avgCostPerPerson: p.avgCostPerPerson === null ? null : Number(p.avgCostPerPerson),
    costReportsCount: p.costReportsCount,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    postCount: p.postCount,
    website: p.website,
    phone: p.phone,
    features: p.features ? serializeFeatures(p.features) : undefined,
    distanceKm: extra.distanceKm ?? undefined,
  };
}

type PostWithRelations = Post & {
  photos: PostPhoto[];
  author: Pick<User, 'id' | 'username' | 'displayName' | 'avatarKey' | 'travelerTypes'>;
  place: Pick<Place, 'id' | 'name' | 'city' | 'country' | 'category'>;
  helpful?: { userId: string }[];
};

export function serializePost(p: PostWithRelations, storage: Storage) {
  return {
    id: p.id,
    caption: p.caption,
    rating: p.rating,
    costPerPerson: p.costPerPerson === null ? null : Number(p.costPerPerson),
    visitedWith: p.visitedWith,
    kidsAges: p.kidsAges,
    visitedAt: p.visitedAt,
    helpfulCount: p.helpfulCount,
    commentCount: p.commentCount,
    markedHelpfulByMe: p.helpful ? p.helpful.length > 0 : undefined,
    createdAt: p.createdAt,
    photos: [...p.photos]
      .sort((a, b) => a.position - b.position)
      .map((ph) => ({ url: storage.publicUrl(ph.key), width: ph.width, height: ph.height, blurhash: ph.blurhash })),
    author: publicUser(p.author, storage),
    place: p.place,
  };
}

export const postInclude = (viewerId?: string) => ({
  photos: true,
  author: { select: { id: true, username: true, displayName: true, avatarKey: true, travelerTypes: true } },
  place: { select: { id: true, name: true, city: true, country: true, category: true } },
  ...(viewerId ? { helpful: { where: { userId: viewerId }, select: { userId: true } } } : {}),
});
