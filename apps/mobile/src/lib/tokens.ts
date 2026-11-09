import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** I token stanno nel portachiavi del sistema (Keychain / Keystore), mai in chiaro. */
const KEY = 'tappa.session';

export interface Session {
  accessToken: string;
  refreshToken: string;
}

export async function loadSession(): Promise<Session | null> {
  const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function saveSession(s: Session | null) {
  if (Platform.OS === 'web') {
    if (s) globalThis.localStorage?.setItem(KEY, JSON.stringify(s));
    else globalThis.localStorage?.removeItem(KEY);
    return;
  }
  if (s) await SecureStore.setItemAsync(KEY, JSON.stringify(s));
  else await SecureStore.deleteItemAsync(KEY);
}
