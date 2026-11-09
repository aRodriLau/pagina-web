import type { FeatureCode, PlaceCategory, TravelerType } from '@tappa/shared';

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  travelerTypes: TravelerType[];
}

export interface PlaceFeature {
  code: FeatureCode;
  confirmations: number;
  denials: number;
  verified: boolean;
}

export interface Place {
  id: string;
  name: string;
  description: string | null;
  category: PlaceCategory;
  address: string | null;
  city: string;
  country: string;
  lat: number;
  lng: number;
  priceLevel: number | null;
  avgCostPerPerson: number | null;
  costReportsCount: number;
  ratingAvg: number | null;
  ratingCount: number;
  postCount: number;
  features?: PlaceFeature[];
  distanceKm?: number;
  myFeatureVotes?: { feature: FeatureCode; present: boolean }[];
}

export interface Post {
  id: string;
  caption: string | null;
  rating: number;
  costPerPerson: number | null;
  visitedWith: TravelerType[];
  kidsAges: number[];
  helpfulCount: number;
  commentCount: number;
  markedHelpfulByMe?: boolean;
  createdAt: string;
  photos: { url: string; width: number | null; height: number | null }[];
  author: PublicUser;
  place: Pick<Place, 'id' | 'name' | 'city' | 'country' | 'category'>;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Conversation {
  id: string;
  title: string | null;
  isGroup: boolean;
  members: PublicUser[];
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unread: boolean;
}

export interface Message {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  place: Pick<Place, 'id' | 'name' | 'city' | 'category'> | null;
}
