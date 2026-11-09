import { useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { FEATURES, PLACE_CATEGORIES, type Audience, type FeatureCode, type PlaceCategory } from '@tappa/shared';
import { PlaceCard } from '../../components/PlaceCard';
import { Chip, Empty, Field, Row, Section } from '../../components/ui';
import { api } from '../../lib/api';
import { audienceLabels, categoryLabels } from '../../lib/labels';
import { useApproxLocation } from '../../lib/location';
import type { Page, Place } from '../../lib/types';
import { audienceColor, colors, font, space } from '../../lib/theme';

const BUDGETS = [
  { label: 'Gratis', value: 0 },
  { label: '≤ 15€', value: 15 },
  { label: '≤ 30€', value: 30 },
  { label: '≤ 50€', value: 50 },
];

export default function Explore() {
  const { coords } = useApproxLocation();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [audience, setAudience] = useState<Audience | null>(null);
  const [features, setFeatures] = useState<FeatureCode[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const query = useQuery({
    queryKey: ['places', q, category, features, budget, verifiedOnly, coords],
    queryFn: () =>
      api<Page<Place>>('/places', {
        query: {
          q: q.length >= 2 ? q : undefined,
          category: category ?? undefined,
          features,
          maxCostPerPerson: budget ?? undefined,
          verifiedOnly: verifiedOnly || undefined,
          lat: coords?.lat,
          lng: coords?.lng,
          radiusKm: coords ? 30 : undefined,
        },
      }),
  });

  const toggleFeature = (f: FeatureCode) => setFeatures((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]));

  const header = (
    <View style={{ gap: space(4), paddingBottom: space(2) }}>
      <Field label="Cerca un posto o una città" value={q} onChangeText={setQ} placeholder="es. Colosseo, gelateria, Napoli…" />

      <Section title="Per chi?">
        <Row wrap>
          {(Object.keys(audienceLabels) as Audience[]).map((a) => (
            <Chip key={a} label={audienceLabels[a]} color={audienceColor[a]} selected={audience === a} onPress={() => setAudience(audience === a ? null : a)} />
          ))}
        </Row>
        {audience ? (
          <Row wrap>
            {FEATURES.filter((f) => f.audience === audience).map((f) => (
              <Chip key={f.code} label={f.label.it} color={audienceColor[audience]} selected={features.includes(f.code)} onPress={() => toggleFeature(f.code)} />
            ))}
          </Row>
        ) : null}
        {features.length ? (
          <Chip label="Solo verificati dalla community ✓✓" selected={verifiedOnly} onPress={() => setVerifiedOnly(!verifiedOnly)} />
        ) : null}
      </Section>

      <Section title="Budget a persona">
        <Row wrap>
          {BUDGETS.map((b) => (
            <Chip key={b.value} label={b.label} color={colors.accent} selected={budget === b.value} onPress={() => setBudget(budget === b.value ? null : b.value)} />
          ))}
        </Row>
      </Section>

      <Section title="Cosa cerchi?">
        <Row wrap>
          {PLACE_CATEGORIES.map((c) => (
            <Chip key={c} label={categoryLabels[c]} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
          ))}
        </Row>
      </Section>
      <Text style={{ fontSize: font.sm, color: colors.muted }}>
        {coords ? 'Ordinati per distanza (entro 30 km)' : 'Attiva la posizione per vedere i posti vicini a te'}
      </Text>
    </View>
  );

  return (
    <FlatList
      data={query.data?.items ?? []}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: space(4), gap: space(3) }}
      renderItem={({ item }) => <PlaceCard place={item} />}
      ListEmptyComponent={query.isLoading ? <ActivityIndicator color={colors.primary} /> : <Empty text="Nessun posto con questi filtri. Prova ad allargarli." />}
    />
  );
}
