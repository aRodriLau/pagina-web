import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { AccessTokenPayload } from './plugins/auth';

/**
 * Chat in tempo reale con Socket.IO. Ogni utente entra nella stanza `user:<id>`;
 * con Redis l'adapter permette di scalare su più istanze del server.
 */
export function attachRealtime(app: FastifyInstance, redisUrl?: string) {
  const origins = app.deps.config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  const io = new Server(app.server, { cors: { origin: origins }, path: '/realtime' });

  if (redisUrl) {
    const pub = new Redis(redisUrl);
    const sub = pub.duplicate();
    io.adapter(createAdapter(pub, sub));
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    try {
      const payload = app.jwt.verify<AccessTokenPayload>(token ?? '');
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.data.userId as string;
    await socket.join(`user:${userId}`);

    // Indicatore "sta scrivendo..." solo verso i membri della conversazione
    socket.on('typing', async ({ conversationId }: { conversationId?: string }) => {
      if (!conversationId) return;
      const members = await app.deps.prisma.conversationMember.findMany({
        where: { conversationId },
        select: { userId: true },
      });
      if (!members.some((m) => m.userId === userId)) return;
      for (const m of members) {
        if (m.userId !== userId) socket.to(`user:${m.userId}`).emit('typing', { conversationId, userId });
      }
    });
  });

  app.realtime = {
    emitToUsers(userIds, event, payload) {
      io.to(userIds.map((id) => `user:${id}`)).emit(event, payload);
    },
  };
  app.addHook('onClose', async () => {
    io.close();
  });
  return io;
}
