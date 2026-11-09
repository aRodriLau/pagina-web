import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createPlace, createTestApp, prisma, registerUser, resetDb, uploadPhoto } from './helpers';

let app: FastifyInstance;
beforeAll(async () => { app = await createTestApp(); });
afterAll(async () => { await app.close(); });
beforeEach(resetDb);

async function publish(auth: Record<string, string>, placeId: string, extra: Record<string, unknown> = {}) {
  const key = await uploadPhoto(app, auth);
  const res = await app.inject({
    method: 'POST', url: '/v1/posts', headers: auth,
    payload: { placeId, photoKeys: [key], rating: 5, ...extra },
  });
  return res;
}

describe('post', () => {
  it('pubblica un post, aggiorna statistiche reali del luogo e conferma le caratteristiche', async () => {
    const famiglia = await registerUser(app, { travelerTypes: ['FAMILY_WITH_KIDS'] });
    const place = await createPlace(app, famiglia.auth, { priceLevel: 3 });

    const r1 = await publish(famiglia.auth, place.id, { rating: 4, costPerPerson: 18, kidsAges: [2, 6], confirmedFeatures: ['HIGH_CHAIR'], caption: 'Ottimo con i bimbi' });
    expect(r1.statusCode).toBe(201);
    const post = r1.json();
    expect(post.photos[0].url).toMatch(/^https:\/\/cdn\.test\/posts\//);
    expect(post.visitedWith).toContain('FAMILY_WITH_KIDS');

    const altro = await registerUser(app);
    await publish(altro.auth, place.id, { rating: 2, costPerPerson: 22 });

    const p = await app.inject({ url: `/v1/places/${place.id}` });
    expect(p.json()).toMatchObject({ ratingAvg: 3, ratingCount: 2, avgCostPerPerson: 20, costReportsCount: 2 });
    expect(p.json().features).toEqual([expect.objectContaining({ code: 'HIGH_CHAIR', confirmations: 1 })]);

    // Il filtro budget usa la spesa reale (20€) e non la fascia €€€
    const budget = await app.inject({ url: '/v1/places', query: { maxCostPerPerson: '25' } });
    expect(budget.json().items).toHaveLength(1);
  });

  it('non permette di usare foto di altri o già usate', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const place = await createPlace(app, a.auth);
    const keyA = await uploadPhoto(app, a.auth);

    const stolen = await app.inject({ method: 'POST', url: '/v1/posts', headers: b.auth, payload: { placeId: place.id, photoKeys: [keyA], rating: 5 } });
    expect(stolen.statusCode).toBe(400);

    const ok = await app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { placeId: place.id, photoKeys: [keyA], rating: 5 } });
    expect(ok.statusCode).toBe(201);
    const reused = await app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { placeId: place.id, photoKeys: [keyA], rating: 5 } });
    expect(reused.statusCode).toBe(400);
  });

  it('il feed "per me" mostra contenuti utili al mio modo di viaggiare', async () => {
    const nonno = await registerUser(app, { travelerTypes: ['SENIOR'] });
    const autore = await registerUser(app);
    const accessibile = await createPlace(app, autore.auth, { name: 'Museo accessibile', category: 'MUSEUM', features: ['ELEVATOR'] });
    const discoteca = await createPlace(app, autore.auth, { name: 'Disco', category: 'OTHER' });
    const conAnziani = await createPlace(app, autore.auth, { name: 'Giardino', category: 'PARK' });

    await publish(autore.auth, accessibile.id);
    await publish(autore.auth, discoteca.id);
    await publish(autore.auth, conAnziani.id, { visitedWith: ['SENIOR'] });

    const feed = await app.inject({ url: '/v1/feed', headers: nonno.auth });
    const names = feed.json().items.map((p: { place: { name: string } }) => p.place.name).sort();
    expect(names).toEqual(['Giardino', 'Museo accessibile']);

    const nearby = await app.inject({ url: '/v1/feed', headers: nonno.auth, query: { mode: 'nearby', lat: '41.9', lng: '12.48' } });
    expect(nearby.json().items).toHaveLength(3);

    const following = await app.inject({ url: '/v1/feed', headers: nonno.auth, query: { mode: 'following' } });
    expect(following.json().items).toHaveLength(0);
    await app.inject({ method: 'PUT', url: `/v1/users/${autore.user.id}/follow`, headers: nonno.auth });
    const following2 = await app.inject({ url: '/v1/feed', headers: nonno.auth, query: { mode: 'following' } });
    expect(following2.json().items).toHaveLength(3);
  });

  it('"utile" è idempotente e non si può votare il proprio post', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const place = await createPlace(app, a.auth);
    const post = (await publish(a.auth, place.id)).json();

    expect((await app.inject({ method: 'PUT', url: `/v1/posts/${post.id}/helpful`, headers: a.auth })).statusCode).toBe(400);
    await app.inject({ method: 'PUT', url: `/v1/posts/${post.id}/helpful`, headers: b.auth });
    const again = await app.inject({ method: 'PUT', url: `/v1/posts/${post.id}/helpful`, headers: b.auth });
    expect(again.json().helpfulCount).toBe(1);
    const undo = await app.inject({ method: 'DELETE', url: `/v1/posts/${post.id}/helpful`, headers: b.auth });
    expect(undo.json().helpfulCount).toBe(0);
  });

  it('commenti, blocchi e segnalazioni', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const place = await createPlace(app, a.auth);
    const post = (await publish(a.auth, place.id)).json();

    const c = await app.inject({ method: 'POST', url: `/v1/posts/${post.id}/comments`, headers: b.auth, payload: { body: 'C\'è parcheggio?' } });
    expect(c.statusCode).toBe(201);
    expect((await app.inject({ url: `/v1/posts/${post.id}` })).json().commentCount).toBe(1);

    // A blocca B: B non vede più il post e non può commentare
    await app.inject({ method: 'PUT', url: `/v1/users/${b.user.id}/block`, headers: a.auth });
    expect((await app.inject({ url: `/v1/posts/${post.id}`, headers: b.auth })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/v1/posts/${post.id}/comments`, headers: b.auth, payload: { body: 'ciao' } })).statusCode).toBe(403);

    // Una segnalazione per sicurezza dei minori nasconde subito il post
    const r = await app.inject({ method: 'POST', url: '/v1/reports', headers: b.auth, payload: { targetType: 'POST', targetId: post.id, reason: 'MINOR_SAFETY' } });
    expect(r.statusCode).toBe(202);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).status).toBe('HIDDEN');

    // Un moderatore ripristina
    await prisma.user.update({ where: { id: a.user.id }, data: { role: 'MODERATOR' } });
    const login = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: { email: a.email, password: a.password } });
    const modAuth = { authorization: `Bearer ${login.json().accessToken}` };
    expect((await app.inject({ url: '/v1/moderation/reports', headers: b.auth })).statusCode).toBe(401);
    const list = await app.inject({ url: '/v1/moderation/reports', headers: modAuth });
    const reportId = list.json().items[0].id;
    await app.inject({ method: 'POST', url: `/v1/moderation/reports/${reportId}/resolve`, headers: modAuth, payload: { action: 'restore' } });
    expect((await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).status).toBe('PUBLISHED');
  });

  it('liste di luoghi salvati private', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const place = await createPlace(app, a.auth);
    const list = (await app.inject({ method: 'POST', url: '/v1/me/lists', headers: a.auth, payload: { name: 'Roma con i nonni' } })).json();
    expect((await app.inject({ method: 'PUT', url: `/v1/lists/${list.id}/places/${place.id}`, headers: a.auth, payload: { note: 'prenotare' } })).statusCode).toBe(204);
    expect((await app.inject({ method: 'PUT', url: `/v1/lists/${list.id}/places/${place.id}`, headers: b.auth, payload: {} })).statusCode).toBe(403);
    const view = await app.inject({ url: `/v1/lists/${list.id}`, headers: a.auth });
    expect(view.json().places[0].note).toBe('prenotare');
    expect((await app.inject({ url: `/v1/lists/${list.id}`, headers: b.auth })).statusCode).toBe(404);
  });
});
