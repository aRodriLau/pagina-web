import { Text, View } from 'react-native';
import type { PlaceFeature } from '../lib/types';
import { featureAudience, featureLabel } from '../lib/labels';
import { audienceColor, font, space } from '../lib/theme';

/** Badge delle caratteristiche: ✓✓ = verificata da più persone. */
export function FeatureBadges({ features, max }: { features: PlaceFeature[]; max?: number }) {
  const shown = max ? features.slice(0, max) : features;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(1.5) }}>
      {shown.map((f) => {
        const c = audienceColor[featureAudience(f.code)];
        return (
          <View key={f.code} style={{ borderColor: c, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: c, fontSize: font.sm, fontWeight: '600' }} accessibilityLabel={`${featureLabel(f.code)}, confermato da ${f.confirmations} persone`}>
              {f.verified ? '✓✓ ' : '✓ '}{featureLabel(f.code)}
            </Text>
          </View>
        );
      })}
      {max && features.length > max ? <Text style={{ fontSize: font.sm }}>+{features.length - max}</Text> : null}
    </View>
  );
}
