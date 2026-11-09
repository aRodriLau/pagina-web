import { Alert, ScrollView, Text } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TRAVELER_TYPES, type TravelerType } from '@tappa/shared';
import { Button, Chip, Row, Section } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { travelerLabels } from '../../lib/labels';
import type { PublicUser } from '../../lib/types';
import { colors, font, space } from '../../lib/theme';

type Me = PublicUser & { email: string; bio: string | null; counts: { posts: number; followers: number; following: number } };

export default function Profile() {
  const { logout } = useAuth();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') });
  const update = useMutation({
    mutationFn: (travelerTypes: TravelerType[]) => api('/me', { method: 'PATCH', body: { travelerTypes } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); qc.invalidateQueries({ queryKey: ['feed'] }); },
  });

  const deleteAccount = () =>
    Alert.alert('Eliminare l\'account?', 'Tutti i tuoi post, commenti e messaggi verranno cancellati definitivamente.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => { await api('/me', { method: 'DELETE' }); await logout(); } },
    ]);

  if (!me.data) return null;
  const types = me.data.travelerTypes;
  return (
    <ScrollView contentContainerStyle={{ padding: space(5), gap: space(6) }}>
      <Text style={{ fontSize: font.xl, fontWeight: '800' }}>{me.data.displayName}</Text>
      <Text style={{ fontSize: font.md, color: colors.muted }}>@{me.data.username} · {me.data.counts.posts} posti condivisi</Text>
      <Section title="Come viaggio">
        <Row wrap>
          {TRAVELER_TYPES.map((t) => (
            <Chip key={t} label={travelerLabels[t]} selected={types.includes(t)} onPress={() => update.mutate(types.includes(t) ? types.filter((x) => x !== t) : [...types, t])} />
          ))}
        </Row>
      </Section>
      <Button title="Esci" variant="secondary" onPress={logout} />
      <Button title="Elimina account" variant="danger" onPress={deleteAccount} />
    </ScrollView>
  );
}
