import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FEATURES, TRAVELER_TYPES, type FeatureCode, type TravelerType } from '@tappa/shared';
import { Button, Chip, Field, Row, Section } from '../../components/ui';
import { api, ApiError, uploadImage } from '../../lib/api';
import { categoryLabels, travelerLabels } from '../../lib/labels';
import type { Page, Place } from '../../lib/types';
import { audienceColor, colors, font, space } from '../../lib/theme';

export default function CreatePost() {
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [search, setSearch] = useState('');
  const [place, setPlace] = useState<Place | null>(null);
  const [rating, setRating] = useState(0);
  const [cost, setCost] = useState('');
  const [caption, setCaption] = useState('');
  const [visitedWith, setVisitedWith] = useState<TravelerType[]>([]);
  const [kidsAges, setKidsAges] = useState('');
  const [confirmed, setConfirmed] = useState<FeatureCode[]>([]);

  const places = useQuery({
    queryKey: ['place-search', search],
    enabled: search.length >= 2 && !place,
    queryFn: () => api<Page<Place>>('/places', { query: { q: search, limit: 8 } }),
  });

  async function pick() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.8, exif: false });
    if (!res.canceled) setPhotos(res.assets.slice(0, 10));
  }

  const publish = useMutation({
    mutationFn: async () => {
      if (!place) throw new Error('Scegli il luogo');
      const photoKeys = [];
      for (const p of photos) {
        photoKeys.push(await uploadImage(p.uri, p.mimeType ?? 'image/jpeg', p.fileSize ?? 1));
      }
      return api('/posts', {
        method: 'POST',
        body: {
          placeId: place.id,
          photoKeys,
          rating,
          caption: caption || undefined,
          costPerPerson: cost ? Number(cost.replace(',', '.')) : undefined,
          visitedWith,
          kidsAges: kidsAges.split(/[ ,]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 18),
          confirmedFeatures: confirmed,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed'] });
      setPhotos([]); setPlace(null); setRating(0); setCost(''); setCaption(''); setConfirmed([]); setKidsAges('');
      router.push('/');
    },
    onError: (e) => Alert.alert('Non pubblicato', e instanceof ApiError || e instanceof Error ? e.message : 'Riprova'),
  });

  const toggle = <T,>(list: T[], set: (v: T[]) => void, v: T) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <ScrollView contentContainerStyle={{ padding: space(4), gap: space(6) }}>
      <Section title="1. Le foto">
        <Text style={{ fontSize: font.sm, color: colors.muted }}>
          Fotografa il posto, non le persone. Per proteggere i più piccoli, evita volti di bambini riconoscibili.
        </Text>
        <ScrollView horizontal contentContainerStyle={{ gap: space(2) }}>
          {photos.map((p) => <Image key={p.uri} source={p.uri} style={{ width: 96, height: 96, borderRadius: 12 }} />)}
          <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Aggiungi foto" style={{ width: 96, height: 96, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 34, color: colors.primary }}>+</Text>
          </Pressable>
        </ScrollView>
      </Section>

      <Section title="2. Dove sei stato?">
        {place ? (
          <Row>
            <Text style={{ fontSize: font.lg, fontWeight: '700', flex: 1 }}>{place.name} · {place.city}</Text>
            <Chip label="Cambia" onPress={() => setPlace(null)} />
          </Row>
        ) : (
          <>
            <Field label="Cerca il luogo" value={search} onChangeText={setSearch} placeholder="Nome del posto" />
            {places.data?.items.map((p) => (
              <Pressable key={p.id} onPress={() => setPlace(p)} style={{ padding: space(3), backgroundColor: colors.surface, borderRadius: 10 }}>
                <Text style={{ fontSize: font.md, fontWeight: '600' }}>{p.name}</Text>
                <Text style={{ fontSize: font.sm, color: colors.muted }}>{categoryLabels[p.category]} · {p.city}</Text>
              </Pressable>
            ))}
          </>
        )}
      </Section>

      <Section title="3. Com'è andata?">
        <Row>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setRating(n)} accessibilityLabel={`${n} stelle`} style={{ padding: 4 }}>
              <Text style={{ fontSize: 36, opacity: n <= rating ? 1 : 0.25 }}>⭐</Text>
            </Pressable>
          ))}
        </Row>
        <Field label="Quanto hai speso a persona? (€)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="es. 18" />
        <Field label="Racconta (cosa è utile sapere?)" value={caption} onChangeText={setCaption} multiline style={{ minHeight: 100, textAlignVertical: 'top' }} placeholder="Parcheggio vicino, bagno al piano terra, il cameriere ha portato la ciotola al cane…" />
      </Section>

      <Section title="4. Con chi eri?">
        <Row wrap>
          {TRAVELER_TYPES.map((t) => <Chip key={t} label={travelerLabels[t]} selected={visitedWith.includes(t)} onPress={() => toggle(visitedWith, setVisitedWith, t)} />)}
        </Row>
        {visitedWith.includes('FAMILY_WITH_KIDS') ? (
          <Field label="Età dei bambini (solo numeri)" value={kidsAges} onChangeText={setKidsAges} placeholder="es. 2, 6" keyboardType="numbers-and-punctuation" />
        ) : null}
      </Section>

      <Section title="5. Cosa hai trovato?">
        <Text style={{ fontSize: font.sm, color: colors.muted }}>Ogni conferma aiuta un'altra famiglia, un nonno o un amico a quattro zampe.</Text>
        <Row wrap>
          {FEATURES.map((f) => (
            <Chip key={f.code} label={f.label.it} color={audienceColor[f.audience]} selected={confirmed.includes(f.code)} onPress={() => toggle(confirmed, setConfirmed, f.code)} />
          ))}
        </Row>
      </Section>

      <View style={{ paddingBottom: space(10) }}>
        <Button title="Pubblica" onPress={() => publish.mutate()} loading={publish.isPending} disabled={!place || !photos.length || !rating} />
      </View>
    </ScrollView>
  );
}
