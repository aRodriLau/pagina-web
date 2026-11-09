import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { saveListSchema } from '@tappa/shared';
import { forbidden, notFound, parse } from '../lib/http';
import { serializePlace } from './serializers';

const idParam = z.object({ id: z.string().uuid() });
const itemParams = z.object({ id: z.string().uuid(), placeId: z.string().uuid() });

/** Liste di luoghi salvati: "Roma con i nonni", "Weekend con Pippo"... */
export default async function listRoutes(app: FastifyInstance) {
  const { prisma } = app.deps;

  const ownList = async (listId: string, userId: string) => {
    const list = await prisma.savedList.findUnique({ where: { id: listId } });
    if (!list) throw notFound('Lista');
    if (list.ownerId !== userId) throw forbidden();
    return list;
  };

  app.get('/me/lists', { onRequest: app.authenticate }, async (req) => {
    const lists = await prisma.savedList.findMany({
      where: { ownerId: req.user.sub },
      include: { _count: { select: { places: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { items: lists.map((l) => ({ id: l.id, name: l.name, isPublic: l.isPublic, placeCount: l._count.places })) };
  });

  app.post('/me/lists', { onRequest: app.authenticate }, async (req, reply) => {
    const input = parse(saveListSchema, req.body);
    const list = await prisma.savedList.create({ data: { ...input, ownerId: req.user.sub } });
    return reply.code(201).send(list);
  });

  app.get('/lists/:id', { onRequest: app.optionalAuth }, async (req) => {
    const { id } = parse(idParam, req.params);
    const list = await prisma.savedList.findUnique({
      where: { id },
      include: { places: { include: { place: { include: { features: true } } }, orderBy: { createdAt: 'desc' } } },
    });
    if (!list || (!list.isPublic && list.ownerId !== req.user?.sub)) throw notFound('Lista');
    return {
      id: list.id,
      name: list.name,
      isPublic: list.isPublic,
      places: list.places.map((sp) => ({ note: sp.note, place: serializePlace(sp.place) })),
    };
  });

  app.delete('/lists/:id', { onRequest: app.authenticate }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    await ownList(id, req.user.sub);
    await prisma.savedList.delete({ where: { id } });
    return reply.code(204).send();
  });

  app.put('/lists/:id/places/:placeId', { onRequest: app.authenticate }, async (req, reply) => {
    const { id, placeId } = parse(itemParams, req.params);
    const { note } = parse(z.object({ note: z.string().max(300).optional() }), req.body ?? {});
    await ownList(id, req.user.sub);
    await prisma.savedPlace.upsert({
      where: { listId_placeId: { listId: id, placeId } },
      create: { listId: id, placeId, note },
      update: { note },
    });
    return reply.code(204).send();
  });

  app.delete('/lists/:id/places/:placeId', { onRequest: app.authenticate }, async (req, reply) => {
    const { id, placeId } = parse(itemParams, req.params);
    await ownList(id, req.user.sub);
    await prisma.savedPlace.deleteMany({ where: { listId: id, placeId } });
    return reply.code(204).send();
  });
}
