import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createPlace, createTestApp, registerUser, resetDb } from './helpers';

let app: FastifyInstance;
beforeAll(async () => { app = await createTestApp(); });
afterAll(async () => { await app.close(); });
beforeEach(resetDb);

const ROMA_CENTRO = { lat: 41.9028, lng: 12.4964 };

describe('luoghi e filtri', () => {
  it('filtra per caratteristiche, budget e distanza', async () => {
    const u = await registerUser(app);
    const trattoria = await createPlace(app, u.auth, {
      name: 'Trattoria Bimbi Felici', priceLevel: 1, features: ['HIGH_CHAIR', 'CHANGING_TABLE', 'DOGS_ALLOWED'],
    });
    await createPlace(app, u.auth, { name: 'Ristorante Stellato', priceLevel: 4, features: ['QUIET'] });
    await createPlace(app, u.auth, {
      name: 'Osteria Milano', city: 'Milano', lat: 45.4642, lng: 9.19, priceLevel: 1, features: ['HIGH_CHAIR', 'CHANGING_TABLE'],
    });

    const res = await app.inject({
      url: '/v1/places',
      query: { features: 'HIGH_CHAIR,CHANGING_TABLE', maxCostPerPerson: '20', lat: String(ROMA_CENTRO.lat), lng: String(ROMA_CENTRO.lng), radiusKm: '10' },
    });
    expect(res.statusCode).toBe(200);
    const items = res.json().items;
    expect(items.map((p: { id: string }) => p.id)).toEqual([trattoria.id]);
    expect(items[0].distanceKm).toBeGreaterThan(0);
    expect(items[0].distanceKm).toBeLessThan(5);

    const pets = await app.inject({ url: '/v1/places', query: { features: 'DOGS_ALLOWED' } });
    expect(pets.json().items).toHaveLength(1);

    const cheap = await app.inject({ url: '/v1/places', query: { maxPriceLevel: '1' } });
    expect(cheap.json().items).toHaveLength(2);
  });

  it('una caratteristica è "verificata" solo con abbastanza conferme e cade se smentita', async () => {
    const [a, b, c, d] = await Promise.all([registerUser(app), registerUser(app), registerUser(app), registerUser(app)]);
    const place = await createPlace(app, a.auth, { name: 'Museo', category: 'MUSEUM', features: ['ELEVATOR'] });

    const verified = await app.inject({ url: '/v1/places', query: { features: 'ELEVATOR', verifiedOnly: 'true' } });
    expect(verified.json().items).toHaveLength(0);

    for (const u of [b, c]) {
      await app.inject({ method: 'POST', url: `/v1/places/${place.id}/features`, headers: u.auth, payload: { feature: 'ELEVATOR', present: true } });
    }
    const now = await app.inject({ url: '/v1/places', query: { features: 'ELEVATOR', verifiedOnly: 'true' } });
    expect(now.json().items).toHaveLength(1);
    expect(now.json().items[0].features[0]).toMatchObject({ code: 'ELEVATOR', confirmations: 3, verified: true });

    // Lo stesso utente che cambia idea non conta due volte
    await app.inject({ method: 'POST', url: `/v1/places/${place.id}/features`, headers: d.auth, payload: { feature: 'ELEVATOR', present: false } });
    await app.inject({ method: 'POST', url: `/v1/places/${place.id}/features`, headers: d.auth, payload: { feature: 'ELEVATOR', present: false } });
    const detail = await app.inject({ url: `/v1/places/${place.id}`, headers: d.auth });
    expect(detail.json().features[0]).toMatchObject({ confirmations: 3, denials: 1 });
    expect(detail.json().myFeatureVotes).toEqual([{ feature: 'ELEVATOR', present: false }]);
  });

  it('ricerca testuale tollera errori di battitura', async () => {
    const u = await registerUser(app);
    await createPlace(app, u.auth, { name: 'Colosseo', category: 'ATTRACTION' });
    const res = await app.inject({ url: '/v1/places', query: { q: 'Coloseo' } });
    expect(res.json().items[0]?.name).toBe('Colosseo');
  });

  it('pagina i risultati', async () => {
    const u = await registerUser(app);
    for (let i = 0; i < 5; i++) await createPlace(app, u.auth, { name: `Parco ${i}`, category: 'PARK', lat: 41.9 + i / 1000 });
    const p1 = await app.inject({ url: '/v1/places', query: { limit: '3', ...Object.fromEntries(Object.entries(ROMA_CENTRO).map(([k, v]) => [k, String(v)])) } });
    expect(p1.json().items).toHaveLength(3);
    const p2 = await app.inject({ url: '/v1/places', query: { limit: '3', cursor: p1.json().nextCursor, lat: String(ROMA_CENTRO.lat), lng: String(ROMA_CENTRO.lng) } });
    expect(p2.json().items).toHaveLength(2);
    expect(p2.json().nextCursor).toBeNull();
  });

  it('valida gli input', async () => {
    const u = await registerUser(app);
    const bad = await app.inject({ method: 'POST', url: '/v1/places', headers: u.auth, payload: { name: 'X', category: 'NOPE', lat: 200 } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.details.length).toBeGreaterThan(0);
  });
});
