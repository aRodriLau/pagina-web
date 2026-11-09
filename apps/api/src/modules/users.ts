import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { updateProfileSchema } from '@tappa/shared';
import { badRequest, decodeCursor, encodeCursor, notFound, parse } from '../lib/http';
import { postInclude, publicUser, serializePost } from './serializers';

const usernameParam = z.object({ username: z.string().min(1).max(30) });
const idParam = z.object({ id: z.string().uuid() });

/** Id degli utenti con cui il viewer non deve interagire (blocco in entrambe le direzioni). */
export async function blockedUserIds(prisma: FastifyInstance['deps']['prisma'], viewerId?: string) {
  if (!viewerId) return [];
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((r) => (r.blockerId === viewerId ? r.blockedId : r.blockerId));
}

export default async function userRoutes(app: FastifyInstance) {
  const { prisma, storage } = app.deps;

  app.get('/me', { onRequest: app.authenticate }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { _count: { select: { posts: true, followers: true, following: true } } },
    });
    if (!user || user.deletedAt) throw notFound('Utente');
    return {
      ...publicUser(user, storage),
      email: user.email,
      bio: user.bio,
      homeCity: user.homeCity,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      counts: user._count,
      createdAt: user.createdAt,
    };
  });

  app.patch('/me', { onRequest: app.authenticate }, async (req) => {
    const input = parse(updateProfileSchema, req.body);
    if (input.avatarKey && !input.avatarKey.startsWith(`posts/${req.user.sub}/`)) {
      throw badRequest('Avatar non valido');
    }
    const user = await prisma.user.update({ where: { id: req.user.sub }, data: input });
    return publicUser(user, storage);
  });

  /** Diritto all'oblio (GDPR art. 17): cancella l'account e tutti i contenuti collegati. */
  app.delete('/me', { onRequest: app.authenticate }, async (req, reply) => {
    await prisma.user.delete({ where: { id: req.user.sub } });
    return reply.code(204).send();
  });

  /** Portabilità dei dati (GDPR art. 20). */
  app.get('/me/export', { onRequest: app.authenticate }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true, email: true, username: true, displayName: true, bio: true, homeCity: true,
        travelerTypes: true, createdAt: true, termsAcceptedAt: true,
        posts: { include: { photos: true } },
        comments: true,
        lists: { include: { places: true } },
        featureVotes: true,
        messages: true,
      },
    });
    return { exportedAt: new Date(), user };
  });

  app.get('/users/:username', { onRequest: app.optionalAuth }, async (req) => {
    const { username } = parse(usernameParam, req.params);
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      include: { _count: { select: { posts: true, followers: true, following: true } } },
    });
    const blocked = await blockedUserIds(prisma, req.user?.sub);
    if (!user || user.deletedAt || blocked.includes(user.id)) throw notFound('Utente');
    const isFollowing = req.user
      ? Boolean(await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.user.sub, followingId: user.id } },
        }))
      : undefined;
    return { ...publicUser(user, storage), bio: user.bio, homeCity: user.homeCity, counts: user._count, isFollowing };
  });

  app.get('/users/:username/posts', { onRequest: app.optionalAuth }, async (req) => {
    const { username } = parse(usernameParam, req.params);
    const q = parse(z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) }), req.query);
    const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() }, select: { id: true } });
    if (!user) throw notFound('Utente');
    const c = decodeCursor<{ createdAt: string; id: string }>(q.cursor);
    const posts = await prisma.post.findMany({
      where: {
        authorId: user.id,
        status: 'PUBLISHED',
        ...(c ? { OR: [{ createdAt: { lt: new Date(c.createdAt) } }, { createdAt: new Date(c.createdAt), id: { lt: c.id } }] } : {}),
      },
      include: postInclude(req.user?.sub),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
    });
    const page = posts.slice(0, q.limit);
    const last = page.at(-1);
    return {
      items: page.map((p) => serializePost(p, storage)),
      nextCursor: posts.length > q.limit && last ? encodeCursor({ createdAt: last.createdAt, id: last.id }) : null,
    };
  });

  app.put('/users/:id/follow', { onRequest: app.authenticate }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    if (id === req.user.sub) throw badRequest('Non puoi seguire te stesso');
    if ((await blockedUserIds(prisma, req.user.sub)).includes(id)) throw notFound('Utente');
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: req.user.sub, followingId: id } },
      create: { followerId: req.user.sub, followingId: id },
      update: {},
    });
    return reply.code(204).send();
  });

  app.delete('/users/:id/follow', { onRequest: app.authenticate }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    await prisma.follow.deleteMany({ where: { followerId: req.user.sub, followingId: id } });
    return reply.code(204).send();
  });

  app.put('/users/:id/block', { onRequest: app.authenticate }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    if (id === req.user.sub) throw badRequest('Non puoi bloccare te stesso');
    await prisma.$transaction([
      prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: req.user.sub, blockedId: id } },
        create: { blockerId: req.user.sub, blockedId: id },
        update: {},
      }),
      prisma.follow.deleteMany({
        where: { OR: [{ followerId: req.user.sub, followingId: id }, { followerId: id, followingId: req.user.sub }] },
      }),
    ]);
    return reply.code(204).send();
  });

  app.delete('/users/:id/block', { onRequest: app.authenticate }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    await prisma.block.deleteMany({ where: { blockerId: req.user.sub, blockedId: id } });
    return reply.code(204).send();
  });
}
