import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { colors } from '../../lib/theme';

export default function AuthLayout() {
  if (useAuth().signedIn) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.bg }, headerTintColor: colors.primary }}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Crea il tuo account' }} />
    </Stack>
  );
}
