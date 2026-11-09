import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { TRAVELER_TYPES, type TravelerType } from '@tappa/shared';
import { Button, Chip, Field, Row, Section } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { travelerLabels } from '../../lib/labels';
import { colors, font, space } from '../../lib/theme';

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={{ flexDirection: 'row', alignItems: 'center', gap: space(3), minHeight: 48 }}>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
      <Text style={{ fontSize: font.md, flex: 1, color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ displayName: '', username: '', email: '', password: '' });
  const [types, setTypes] = useState<TravelerType[]>([]);
  const [isAdult, setAdult] = useState(false);
  const [acceptTerms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (t: TravelerType) => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]));

  async function submit() {
    setErrors({});
    setLoading(true);
    try {
      await register({ ...form, travelerTypes: types, isAdult, acceptTerms });
    } catch (e) {
      if (e instanceof ApiError && e.details) setErrors(Object.fromEntries(e.details.map((d) => [d.path, d.message])));
      else setErrors({ _: e instanceof Error ? e.message : 'Errore' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space(5), gap: space(5) }}>
      <Field label="Il tuo nome" value={form.displayName} onChangeText={set('displayName')} error={errors.displayName} />
      <Field label="Nome utente" value={form.username} onChangeText={set('username')} autoCapitalize="none" error={errors.username} />
      <Field label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" error={errors.email} />
      <Field label="Password (almeno 10 caratteri)" value={form.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" error={errors.password} />

      <Section title="Come viaggi di solito?">
        <Text style={{ fontSize: font.sm, color: colors.muted }}>Ti mostreremo prima i posti adatti a te. Puoi cambiarlo quando vuoi.</Text>
        <Row wrap>
          {TRAVELER_TYPES.map((t) => (
            <Chip key={t} label={travelerLabels[t]} selected={types.includes(t)} onPress={() => toggle(t)} />
          ))}
        </Row>
      </Section>

      <View>
        <Check label="Ho almeno 18 anni" value={isAdult} onChange={setAdult} />
        <Check label="Accetto i Termini e l'Informativa Privacy" value={acceptTerms} onChange={setTerms} />
      </View>
      {errors._ ? <Text style={{ color: colors.danger, fontSize: font.md }}>{errors._}</Text> : null}
      <Button title="Crea account" onPress={submit} loading={loading} disabled={!isAdult || !acceptTerms} />
    </ScrollView>
  );
}
