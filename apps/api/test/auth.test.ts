import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp, prisma, registerUser, resetDb } from './helpers';

let app: FastifyInstance;
beforeAll(async () => { app = await createTestApp(); });
afterAll(async () => { await app.close(); });
beforeEach(resetDb);

describe('autenticazione', () => {
  it('registra un utente e non salva la password in chiaro', async () => {
    const u = await registerUser(app, { travelerTypes: ['SENIOR'] });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.user.id } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row.travelerTypes).toEqual(['SENIOR']);

    const me = await app.inject({ url: '/v1/me', headers: u.auth });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toBe(u.email);
  });

  it('rifiuta registrazioni senza consenso o maggiore età, e duplicati', async () => {
    const base = { email: 'a@b.it', password: 'una-password-sicura', displayName: 'Anna', username: 'anna' };
    const noAdult = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { ...base, acceptTerms: true } });
    expect(noAdult.statusCode).toBe(400);

    const ok = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { ...base, acceptTerms: true, isAdult: true } });
    expect(ok.statusCode).toBe(201);
    const dup = await app.inject({ method: 'POST', url: '/v1/auth/register', payload: { ...base, username: 'anna2', acceptTerms: true, isAdult: true } });
    expect(dup.statusCode).toBe(409);
  });

  it('login con credenziali errate dà 401 senza rivelare se l\'email esiste', async () => {
    const u = await registerUser(app);
    const wrong = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: u.email, password: 'sbagliata!!' } });
    const missing = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: 'nessuno@x.it', password: 'sbagliata!!' } });
    expect(wrong.statusCode).toBe(401);
    expect(missing.statusCode).toBe(401);
    expect(wrong.json().error.message).toBe(missing.json().error.message);

    const ok = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: u.email.toUpperCase(), password: u.password } });
    expect(ok.statusCode).toBe(200);
  });

  it('ruota i refresh token e revoca la famiglia se uno viene riutilizzato', async () => {
    const u = await registerUser(app);
    const r1 = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: u.refreshToken } });
    expect(r1.statusCode).toBe(200);
    const next = r1.json().refreshToken;

    // Riuso del vecchio token → attacco: tutta la famiglia viene revocata
    const reuse = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: u.refreshToken } });
    expect(reuse.statusCode).toBe(401);
    const afterReuse = await app.inject({ method: 'POST', url: '/v1/auth/refresh', payload: { refreshToken: next } });
    expect(afterReuse.statusCode).toBe(401);
  });

  it('richiede autenticazione sulle rotte private', async () => {
    expect((await app.inject({ url: '/v1/me' })).statusCode).toBe(401);
    expect((await app.inject({ url: '/v1/me', headers: { authorization: 'Bearer falso' } })).statusCode).toBe(401);
  });

  it('cancella l\'account e tutti i suoi dati (GDPR)', async () => {
    const u = await registerUser(app);
    const del = await app.inject({ method: 'DELETE', url: '/v1/me', headers: u.auth });
    expect(del.statusCode).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: u.user.id } })).toBeNull();
  });
});
