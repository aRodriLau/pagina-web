import { API_URL } from './config';
import { loadSession, saveSession, type Session } from './tokens';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: { path: string; message: string }[]) {
    super(message);
  }
}

let session: Session | null = null;
let onSessionChange: (s: Session | null) => void = () => {};
let refreshing: Promise<boolean> | null = null;

export async function initSession(listener: (s: Session | null) => void) {
  onSessionChange = listener;
  session = await loadSession();
  return session;
}

export async function setSession(s: Session | null) {
  session = s;
  await saveSession(s);
  onSessionChange(s);
}

export const getAccessToken = () => session?.accessToken ?? null;

async function refresh(): Promise<boolean> {
  if (!session) return false;
  const res = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!res.ok) {
    await setSession(null);
    return false;
  }
  await setSession(await res.json());
  return true;
}

type Query = Record<string, string | number | boolean | string[] | undefined | null>;

/** Client HTTP: aggiunge il token e lo rinnova automaticamente quando scade. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown; query?: Query } = {}, retry = true): Promise<T> {
  const qs = opts.query
    ? '?' + Object.entries(opts.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))
        .map(([k, v]) => `${k}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : String(v))}`)
        .join('&')
    : '';
  const res = await fetch(`${API_URL}/v1${path}${qs}`, {
    method: opts.method ?? 'GET',
    headers: {
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && retry && session) {
    refreshing ??= refresh().finally(() => (refreshing = null));
    if (await refreshing) return api<T>(path, opts, false);
  }
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json?.error?.message ?? 'Errore di rete', json?.error?.details);
  return json as T;
}

/** Carica una foto direttamente sullo storage tramite URL firmato e restituisce la chiave. */
export async function uploadImage(uri: string, contentType: string, sizeBytes: number) {
  const { key, uploadUrl } = await api<{ key: string; uploadUrl: string }>('/uploads', {
    method: 'POST',
    body: { contentType, sizeBytes },
  });
  const blob = await (await fetch(uri)).blob();
  const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: blob });
  if (!put.ok) throw new ApiError(put.status, 'Caricamento della foto non riuscito');
  return key;
}
