import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { attachRealtime } from '../src/realtime';
import { createPlace, createTestApp, registerUser, resetDb } from './helpers';

let app: FastifyInstance;
let baseUrl: string;
beforeAll(async () => {
  app = await createTestApp();
  attachRealtime(app);
  await app.listen({ port: 0, host: '127.0.0.1' });
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterAll(async () => { await app.close(); });
beforeEach(resetDb);

describe('chat', () => {
  it('consegna i messaggi in tempo reale e riusa la conversazione 1-a-1', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const place = await createPlace(app, a.auth);

    const socketB: Socket = connect(baseUrl, { path: '/realtime', auth: { token: b.accessToken }, transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => { socketB.on('connect', resolve); socketB.on('connect_error', reject); });
    const received = new Promise<{ body: string; place: { id: string } }>((resolve) => socketB.on('message:new', resolve));

    const conv = await app.inject({ method: 'POST', url: '/v1/conversations', headers: a.auth, payload: { memberIds: [b.user.id] } });
    expect(conv.statusCode).toBe(201);
    const again = await app.inject({ method: 'POST', url: '/v1/conversations', headers: b.auth, payload: { memberIds: [a.user.id] } });
    expect(again.json().id).toBe(conv.json().id);

    const sent = await app.inject({
      method: 'POST', url: `/v1/conversations/${conv.json().id}/messages`, headers: a.auth,
      payload: { body: 'Andiamo qui con i bambini?', placeId: place.id },
    });
    expect(sent.statusCode).toBe(201);
    const msg = await received;
    expect(msg.body).toBe('Andiamo qui con i bambini?');
    expect(msg.place.id).toBe(place.id);

    const listB = await app.inject({ url: '/v1/conversations', headers: b.auth });
    expect(listB.json().items[0].unread).toBe(true);
    await app.inject({ url: `/v1/conversations/${conv.json().id}/messages`, headers: b.auth });
    expect((await app.inject({ url: '/v1/conversations', headers: b.auth })).json().items[0].unread).toBe(false);
    socketB.close();
  });

  it('rifiuta socket senza token e chi non è membro', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const intruso = await registerUser(app);
    const conv = (await app.inject({ method: 'POST', url: '/v1/conversations', headers: a.auth, payload: { memberIds: [b.user.id] } })).json();
    expect((await app.inject({ url: `/v1/conversations/${conv.id}/messages`, headers: intruso.auth })).statusCode).toBe(404);

    const s = connect(baseUrl, { path: '/realtime', transports: ['websocket'] });
    const err = await new Promise<Error>((resolve) => s.on('connect_error', resolve));
    expect(err.message).toBe('UNAUTHORIZED');
    s.close();
  });

  it('non si può scrivere a chi ti ha bloccato', async () => {
    const a = await registerUser(app);
    const b = await registerUser(app);
    const conv = (await app.inject({ method: 'POST', url: '/v1/conversations', headers: a.auth, payload: { memberIds: [b.user.id] } })).json();
    await app.inject({ method: 'PUT', url: `/v1/users/${a.user.id}/block`, headers: b.auth });
    const res = await app.inject({ method: 'POST', url: `/v1/conversations/${conv.id}/messages`, headers: a.auth, payload: { body: 'ciao' } });
    expect(res.statusCode).toBe(403);
    const newConv = await app.inject({ method: 'POST', url: '/v1/conversations', headers: a.auth, payload: { memberIds: [b.user.id] } });
    expect(newConv.statusCode).toBe(403);
  });
});
