import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Link } from 'expo-router';
import { Button, Field } from '../../components/ui';
import { ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { colors, font, space } from '../../lib/theme';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossibile collegarsi. Controlla la connessione.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space(6), gap: space(5), flexGrow: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 44, fontWeight: '800', color: colors.primary }}>Tappa</Text>
        <Text style={{ fontSize: font.lg, color: colors.text, lineHeight: 28 }}>
          I posti giusti per chi viaggia davvero: con i bambini, con i nonni, con il cane.
        </Text>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" />
        {error ? <Text style={{ color: colors.danger, fontSize: font.md }} accessibilityLiveRegion="polite">{error}</Text> : null}
        <Button title="Entra" onPress={submit} loading={loading} disabled={!email || !password} />
        <Link href="/register" style={{ fontSize: font.md, color: colors.primary, textAlign: 'center', padding: space(3) }}>
          Non hai un account? Registrati
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
