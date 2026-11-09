import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createConversationSchema, sendMessageSchema } from '@tappa/shared';
import { badRequest, decodeCursor, encodeCursor, forbidden, notFound, parse } from '../lib/http';
import { publicUser } from './serializers';
import { blockedUserIds } from './users';

const idParam = z.object({ id: z.string().uuid() });

export interface Realtime {
  emitToUsers(userIds: string[], event: string, payload: unknown): void;
}

declare module 'fastify' {
  interface FastifyInstance {
    realtime: Realtime;
  }
}

export default async function chatRoutes(app: FastifyInstance) {
  const { prisma, storage } = app.deps;

  const membership = async (conversationId: string, userId: string) => {
    const m = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!m) throw notFound('Conversazione');
    return m;
  };

  app.get('/conversations', { onRequest: app.authenticate }, async (req) => {
    const me = req.user.sub;
    const convs = await prisma.conversation.findMany({
      where: { members: { some: { userId: me } } },
      include: {
        members: { include: { user: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });
    return {
      items: convs.map((c) => {
        const mine = c.members.find((m) => m.userId === me);
        const last = c.messages[0];
        return {
          id: c.id,
          title: c.title,
          isGroup: c.isGroup,
          members: c.members.filter((m) => m.userId !== me).map((m) => publicUser(m.user, storage)),
          lastMessage: last ? { body: last.body, senderId: last.senderId, createdAt: last.createdAt } : null,
          unread: Boolean(last && last.senderId !== me && (!mine?.lastReadAt || last.createdAt > mine.lastReadAt)),
        };
      }),
    };
  });

  /** Crea una conversazione; per le chat 1-a-1 riusa quella esistente. */
  app.post('/conversations', { onRequest: app.authenticate }, async (req, reply) => {
    const input = parse(createConversationSchema, req.body);
    const me = req.user.sub;
    const others = [...new Set(input.memberIds.filter((id) => id !== me))];
    if (!others.length) throw badRequest('Serve almeno un altro partecipante');

    const blocked = await blockedUserIds(prisma, me);
    if (others.some((id) => blocked.includes(id))) throw forbidden('Non puoi scrivere a questo utente');
    const found = await prisma.user.count({ where: { id: { in: others }, deletedAt: null } });
    if (found !== others.length) throw notFound('Utente');

    if (others.length === 1) {
      const existing = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [{ members: { some: { userId: me } } }, { members: { some: { userId: others[0] } } }],
        },
      });
      if (existing) return reply.code(200).send({ id: existing.id });
    }
    const conv = await prisma.conversation.create({
      data: {
        title: others.length > 1 ? input.title : null,
        isGroup: others.length > 1,
        members: { create: [me, ...others].map((userId) => ({ userId })) },
      },
    });
    return reply.code(201).send({ id: conv.id });
  });

  app.get('/conversations/:id/messages', { onRequest: app.authenticate }, async (req) => {
    const { id } = parse(idParam, req.params);
    const q = parse(z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }), req.query);
    await membership(id, req.user.sub);
    const c = decodeCursor<{ createdAt: string; id: string }>(q.cursor);
    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        ...(c ? { OR: [{ createdAt: { lt: new Date(c.createdAt) } }, { createdAt: new Date(c.createdAt), id: { lt: c.id } }] } : {}),
      },
      include: { place: { select: { id: true, name: true, city: true, category: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId: id, userId: req.user.sub } },
      data: { lastReadAt: new Date() },
    });
    const page = messages.slice(0, q.limit);
    const last = page.at(-1);
    return {
      items: page.map((m) => ({ id: m.id, body: m.body, senderId: m.senderId, place: m.place, createdAt: m.createdAt })),
      nextCursor: messages.length > q.limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    };
  });

  app.post('/conversations/:id/messages', { onRequest: app.authenticate, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    const input = parse(sendMessageSchema, req.body);
    const me = req.user.sub;
    await membership(id, me);
    const members = await prisma.conversationMember.findMany({ where: { conversationId: id }, select: { userId: true } });
    const conv = await prisma.conversation.findUniqueOrThrow({ where: { id }, select: { isGroup: true } });
    if (!conv.isGroup) {
      const blocked = await blockedUserIds(prisma, me);
      if (members.some((m) => blocked.includes(m.userId))) throw forbidden('Non puoi scrivere a questo utente');
    }

    const message = await prisma.$transaction(async (tx) => {
      const m = await tx.message.create({
        data: { conversationId: id, senderId: me, body: input.body, placeId: input.placeId },
        include: { place: { select: { id: true, name: true, city: true, category: true } } },
      });
      await tx.conversation.update({ where: { id }, data: { lastMessageAt: m.createdAt } });
      await tx.conversationMember.update({
        where: { conversationId_userId: { conversationId: id, userId: me } },
        data: { lastReadAt: m.createdAt },
      });
      return m;
    });
    const payload = { id: message.id, conversationId: id, body: message.body, senderId: me, place: message.place, createdAt: message.createdAt };
    app.realtime.emitToUsers(members.map((m) => m.userId), 'message:new', payload);
    // TODO: notifica push (Expo Push / FCM / APNs) ai membri offline
    return reply.code(201).send(payload);
  });
}
