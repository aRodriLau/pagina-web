import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Place } from '../lib/types';
import { categoryLabels, priceLabel } from '../lib/labels';
import { colors, font, space } from '../lib/theme';
import { FeatureBadges } from './FeatureBadges';

export function PlaceCard({ place }: { place: Place }) {
  const cost = place.avgCostPerPerson !== null ? `~${Math.round(place.avgCostPerPerson)}€ a persona` : priceLabel(place.priceLevel);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(`/place/${place.id}`)}
      style={{ backgroundColor: colors.surface, borderRadius: 16, padding: space(4), gap: space(2), borderWidth: 1, borderColor: colors.border }}
    >
      <Text style={{ fontSize: font.lg, fontWeight: '700', color: colors.text }}>{place.name}</Text>
      <Text style={{ fontSize: font.md, color: colors.muted }}>
        {categoryLabels[place.category]} · {place.city}
        {place.distanceKm !== undefined ? ` · ${place.distanceKm} km` : ''}
      </Text>
      <View style={{ flexDirection: 'row', gap: space(3) }}>
        {place.ratingAvg ? <Text style={{ fontSize: font.md }}>⭐ {place.ratingAvg.toFixed(1)} ({place.ratingCount})</Text> : null}
        {cost ? <Text style={{ fontSize: font.md, color: colors.primary, fontWeight: '600' }}>{cost}</Text> : null}
      </View>
      {place.features?.length ? <FeatureBadges features={place.features} max={4} /> : null}
    </Pressable>
  );
}
