import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { loadConfig } from '../src/config';
import type { Storage } from '../src/lib/storage';

export const prisma = new PrismaClient();

export const fakeStorage: Storage = {
  async createUploadUrl(userId, contentType) {
    const key = `posts/${userId}/${crypto.randomUUID()}.${contentType.split('/')[1]}`;
    return { key, uploadUrl: `https://storage.test/${key}?signed=1` };
  },
  publicUrl: (key) => `https://cdn.test/${key}`,
};

export async function createTestApp() {
  return buildApp({ config: loadConfig(), prisma, storage: fakeStorage });
}

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'spatial_ref_sys')`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
}

let n = 0;
export async function registerUser(app: FastifyInstance, overrides: Record<string, unknown> = {}) {
  n += 1;
  const body = {
    email: `user${n}-${Date.now()}@example.com`,
    password: 'una-password-sicura',
    displayName: `Utente ${n}`,
    username: `utente_${n}_${Date.now() % 100000}`,
    travelerTypes: [],
    acceptTerms: true,
    isAdult: true,
    ...overrides,
  };
  const res = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: body });
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.body}`);
  const json = res.json();
  return { ...json, email: body.email, password: body.password, auth: { authorization: `Bearer ${json.accessToken}` } } as {
    user: { id: string; username: string };
    accessToken: string;
    refreshToken: string;
    email: string;
    password: string;
    auth: { authorization: string };
  };
}

export async function createPlace(app: FastifyInstance, auth: Record<string, string>, overrides: Record<string, unknown> = {}) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/places',
    headers: auth,
    payload: {
      name: 'Trattoria da Nonna',
      category: 'RESTAURANT',
      city: 'Roma',
      country: 'it',
      lat: 41.8986,
      lng: 12.4769,
      priceLevel: 2,
      features: [],
      ...overrides,
    },
  });
  if (res.statusCode !== 201) throw new Error(`createPlace failed: ${res.body}`);
  return res.json() as { id: string; [k: string]: unknown };
}

export async function uploadPhoto(app: FastifyInstance, auth: Record<string, string>) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/uploads',
    headers: auth,
    payload: { contentType: 'image/jpeg', sizeBytes: 200_000 },
  });
  if (res.statusCode !== 201) throw new Error(`upload failed: ${res.body}`);
  return res.json().key as string;
}
