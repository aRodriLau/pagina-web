import { FEATURES, type FeatureCode, type PlaceCategory, type TravelerType } from '@tappa/shared';

export const featureLabel = (code: FeatureCode) => FEATURES.find((f) => f.code === code)?.label.it ?? code;
export const featureAudience = (code: FeatureCode) => FEATURES.find((f) => f.code === code)?.audience ?? 'KIDS';

export const travelerLabels: Record<TravelerType, string> = {
  FAMILY_WITH_KIDS: '👨‍👩‍👧 Con bambini',
  SENIOR: '🧓 Over 65',
  WITH_PETS: '🐕 Con animali',
  REDUCED_MOBILITY: '♿ Mobilità ridotta',
  SOLO: '🎒 Da solo',
  COUPLE: '💑 In coppia',
  GROUP: '👥 In gruppo',
};

export const categoryLabels: Record<PlaceCategory, string> = {
  RESTAURANT: '🍝 Ristoranti',
  CAFE: '☕ Bar e caffè',
  ATTRACTION: '🏛️ Da vedere',
  MUSEUM: '🖼️ Musei',
  PARK: '🌳 Parchi',
  PLAYGROUND: '🛝 Parchi giochi',
  BEACH: '🏖️ Spiagge',
  NATURE: '⛰️ Natura',
  ACCOMMODATION: '🏨 Dormire',
  SHOPPING: '🛍️ Shopping',
  EVENT: '🎪 Eventi',
  OTHER: '📍 Altro',
};

export const audienceLabels = {
  KIDS: '👶 Bambini',
  SENIORS: '🧓 Anziani',
  MOBILITY: '♿ Accessibilità',
  PETS: '🐾 Animali',
} as const;

export const priceLabel = (level: number | null) => (level === null ? '' : level === 0 ? 'Gratis' : '€'.repeat(level));
