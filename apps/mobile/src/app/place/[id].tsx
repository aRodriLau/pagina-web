import { ActivityIndicator, FlatList, Linking, Platform, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FEATURES, type FeatureCode } from '@tappa/shared';
import { FeatureBadges } from '../../components/FeatureBadges';
import { PostCard } from '../../components/PostCard';
import { Button, Chip, Row, Section } from '../../components/ui';
import { api } from '../../lib/api';
import { categoryLabels, priceLabel } from '../../lib/labels';
import type { Page, Place, Post } from '../../lib/types';
import { audienceColor, colors, font, space } from '../../lib/theme';

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const place = useQuery({ queryKey: ['place', id], queryFn: () => api<Place>(`/places/${id}`) });
  const posts = useQuery({ queryKey: ['place-posts', id], queryFn: () => api<Page<Post>>(`/places/${id}/posts`) });
  const vote = useMutation({
    mutationFn: (v: { feature: FeatureCode; present: boolean }) => api(`/places/${id}/features`, { method: 'POST', body: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['place', id] }),
  });
  const save = useMutation({
    mutationFn: async () => {
      const lists = await api<{ items: { id: string; name: string }[] }>('/me/lists');
      const list = lists.items[0] ?? (await api<{ id: string }>('/me/lists', { method: 'POST', body: { name: 'Da visitare' } }));
      await api(`/lists/${list.id}/places/${id}`, { method: 'PUT', body: {} });
    },
  });

  if (!place.data) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;
  const p = place.data;
  const myVote = (code: FeatureCode) => p.myFeatureVotes?.find((v) => v.feature === code)?.present;
  const openMaps = () => {
    const q = encodeURIComponent(`${p.name} ${p.city}`);
    Linking.openURL(Platform.OS === 'ios' ? `maps://?q=${q}&ll=${p.lat},${p.lng}` : `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`);
  };

  const header = (
    <View style={{ gap: space(5), paddingBottom: space(4) }}>
      <Stack.Screen options={{ title: p.name }} />
      <View style={{ gap: space(1) }}>
        <Text style={{ fontSize: font.xxl, fontWeight: '800', color: colors.text }}>{p.name}</Text>
        <Text style={{ fontSize: font.md, color: colors.muted }}>{categoryLabels[p.category]} · {p.address ?? p.city}</Text>
        <Text style={{ fontSize: font.lg }}>
          {p.ratingAvg ? `⭐ ${p.ratingAvg.toFixed(1)} (${p.ratingCount})   ` : ''}
          {p.avgCostPerPerson !== null ? `~${Math.round(p.avgCostPerPerson)}€ a persona (${p.costReportsCount} segnalazioni)` : priceLabel(p.priceLevel)}
        </Text>
      </View>
      <Row>
        <Button title="Portami qui" onPress={openMaps} style={{ flex: 1 }} />
        <Button title={save.isSuccess ? 'Salvato ✓' : 'Salva'} variant="secondary" onPress={() => save.mutate()} style={{ flex: 1 }} />
      </Row>
      {p.features?.length ? (
        <Section title="Cosa dice la community">
          <FeatureBadges features={p.features} />
        </Section>
      ) : null}
      <Section title="Ci sei stato? Conferma cosa c'è">
        <Row wrap>
          {FEATURES.map((f) => {
            const v = myVote(f.code);
            return (
              <Chip
                key={f.code}
                label={`${v === true ? '✓ ' : v === false ? '✗ ' : ''}${f.label.it}`}
                color={audienceColor[f.audience]}
                selected={v === true}
                onPress={() => vote.mutate({ feature: f.code, present: v !== true })}
              />
            );
          })}
        </Row>
      </Section>
      <Section title="Esperienze"><View /></Section>
    </View>
  );

  return (
    <FlatList
      data={posts.data?.items ?? []}
      keyExtractor={(x) => x.id}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: space(4), gap: space(4) }}
      renderItem={({ item }) => <PostCard post={item} />}
    />
  );
}
