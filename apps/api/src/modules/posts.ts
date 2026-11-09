import { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  FEATURES,
  commentSchema,
  createPostSchema,
  feedQuerySchema,
  uploadRequestSchema,
  type Audience,
  type TravelerType,
} from '@tappa/shared';
import { badRequest, decodeCursor, encodeCursor, forbidden, notFound, parse } from '../lib/http';
import { refreshPlaceStats, voteFeatures } from './place-service';
import { publicUser, postInclude, serializePost } from './serializers';
import { blockedUserIds } from './users';

const idParam = z.object({ id: z.string().uuid() });

const AUDIENCES_FOR: Partial<Record<TravelerType, Audience[]>> = {
  FAMILY_WITH_KIDS: ['KIDS'],
  SENIOR: ['SENIORS', 'MOBILITY'],
  WITH_PETS: ['PETS'],
  REDUCED_MOBILITY: ['MOBILITY'],
};

export function featureCodesForTraveler(types: TravelerType[]): string[] {
  const audiences = new Set(types.flatMap((t) => AUDIENCES_FOR[t] ?? []));
  return FEATURES.filter((f) => audiences.has(f.audience)).map((f) => f.code);
}

type Cursor = { createdAt: string; id: string };
const cursorWhere = (c: Cursor | null): Prisma.PostWhereInput =>
  c ? { OR: [{ createdAt: { lt: new Date(c.createdAt) } }, { createdAt: new Date(c.createdAt), id: { lt: c.id } }] } : {};

export default async function postRoutes(app: FastifyInstance) {
  const { prisma, storage } = app.deps;

  /** Passo 1 della pubblicazione: l'app chiede un URL firmato e carica la foto direttamente sullo storage. */
  app.post('/uploads', { onRequest: app.authenticate, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (req, reply) => {
    const input = parse(uploadRequestSchema, req.body);
    const { key, uploadUrl } = await storage.createUploadUrl(req.user.sub, input.contentType, input.sizeBytes);
    await prisma.upload.create({
      data: { key, userId: req.user.sub, contentType: input.contentType, sizeBytes: input.sizeBytes },
    });
    return reply.code(201).send({ key, uploadUrl, method: 'PUT', headers: { 'Content-Type': input.contentType } });
  });

  /** Passo 2: si crea il post con le chiavi delle foto caricate. */
  app.post('/posts', { onRequest: app.authenticate }, async (req, reply) => {
    const input = parse(createPostSchema, req.body);
    const userId = req.user.sub;

    const place = await prisma.place.findUnique({ where: { id: input.placeId }, select: { id: true, status: true } });
    if (!place || place.status !== 'PUBLISHED') throw notFound('Luogo');

    const uploads = await prisma.upload.findMany({
      where: { key: { in: input.photoKeys }, userId, status: 'PENDING' },
      select: { key: true },
    });
    if (uploads.length !== new Set(input.photoKeys).size) {
      throw badRequest('Una o più foto non sono valide o sono già state usate');
    }
    if (input.kidsAges.length && !input.visitedWith.includes('FAMILY_WITH_KIDS')) {
      input.visitedWith.push('FAMILY_WITH_KIDS');
    }

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          authorId: userId,
          placeId: input.placeId,
          caption: input.caption,
          rating: input.rating,
          costPerPerson: input.costPerPerson,
          visitedWith: input.visitedWith,
          kidsAges: input.kidsAges,
          visitedAt: input.visitedAt,
          photos: { create: input.photoKeys.map((key, position) => ({ key, position })) },
        },
      });
      await tx.upload.updateMany({ where: { key: { in: input.photoKeys } }, data: { status: 'ATTACHED' } });
      await voteFeatures(tx, userId, input.placeId, input.confirmedFeatures.map((feature) => ({ feature, present: true })));
      await refreshPlaceStats(tx, input.placeId);
      return tx.post.findUniqueOrThrow({ where: { id: created.id }, include: postInclude(userId) });
    });
    // TODO: accodare job per moderazione automatica immagini (volti di minori, contenuti espliciti)
    return reply.code(201).send(serializePost(post, storage));
  });

  app.get('/posts/:id', { onRequest: app.optionalAuth }, async (req) => {
    const { id } = parse(idParam, req.params);
    const post = await prisma.post.findUnique({ where: { id }, include: postInclude(req.user?.sub) });
    const blocked = await blockedUserIds(prisma, req.user?.sub);
    if (!post || post.status !== 'PUBLISHED' || blocked.includes(post.authorId)) throw notFound('Post');
    return serializePost(post, storage);
  });

  app.delete('/posts/:id', { onRequest: app.authenticate }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, placeId: true } });
    if (!post) throw notFound('Post');
    if (post.authorId !== req.user.sub && req.user.role === 'USER') throw forbidden();
    await prisma.$transaction(async (tx) => {
      await tx.post.delete({ where: { id } });
      await refreshPlaceStats(tx, post.placeId);
    });
    return reply.code(204).send();
  });

  app.get('/feed', { onRequest: app.authenticate }, async (req) => {
    const q = parse(feedQuerySchema, req.query);
    const viewerId = req.user.sub;
    const c = decodeCursor<Cursor>(q.cursor);
    const blocked = await blockedUserIds(prisma, viewerId);

    const where: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
      authorId: { notIn: blocked },
      ...cursorWhere(c),
    };

    if (q.mode === 'following') {
      const following = await prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } });
      where.AND = [{ authorId: { in: following.map((f) => f.followingId) } }];
    } else if (q.mode === 'nearby') {
      if (q.lat === undefined || q.lng === undefined) throw badRequest('Per il feed "nearby" servono lat e lng');
      const near = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Place"
        WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography, 25000)
        ORDER BY location <-> ST_SetSRID(ST_MakePoint(${q.lng}, ${q.lat}), 4326)::geography
        LIMIT 500`;
      where.AND = [{ placeId: { in: near.map((p) => p.id) } }];
    } else {
      // "Per me": post di chi viaggia come me, o in luoghi con caratteristiche utili al mio profilo.
      const me = await prisma.user.findUniqueOrThrow({ where: { id: viewerId }, select: { travelerTypes: true } });
      const codes = featureCodesForTraveler(me.travelerTypes);
      if (me.travelerTypes.length) {
        where.AND = [{
          OR: [
            { visitedWith: { hasSome: me.travelerTypes } },
            ...(codes.length ? [{ place: { features: { some: { feature: { in: codes }, confirmations: { gt: 0 } } } } }] : []),
          ],
        }];
      }
    }

    const posts = await prisma.post.findMany({
      where,
      include: postInclude(viewerId),
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

  app.put('/posts/:id/helpful', { onRequest: app.authenticate }, async (req) => {
    const { id } = parse(idParam, req.params);
    const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) throw notFound('Post');
    if (post.authorId === req.user.sub) throw badRequest('Non puoi votare un tuo post');
    const count = await prisma.$transaction(async (tx) => {
      const r = await tx.helpfulVote.createMany({ data: [{ userId: req.user.sub, postId: id }], skipDuplicates: true });
      const p = r.count
        ? await tx.post.update({ where: { id }, data: { helpfulCount: { increment: 1 } } })
        : await tx.post.findUniqueOrThrow({ where: { id } });
      return p.helpfulCount;
    });
    return { helpfulCount: count, markedHelpfulByMe: true };
  });

  app.delete('/posts/:id/helpful', { onRequest: app.authenticate }, async (req) => {
    const { id } = parse(idParam, req.params);
    const count = await prisma.$transaction(async (tx) => {
      const r = await tx.helpfulVote.deleteMany({ where: { userId: req.user.sub, postId: id } });
      const p = r.count
        ? await tx.post.update({ where: { id }, data: { helpfulCount: { decrement: 1 } } })
        : await tx.post.findUnique({ where: { id } });
      if (!p) throw notFound('Post');
      return p.helpfulCount;
    });
    return { helpfulCount: count, markedHelpfulByMe: false };
  });

  app.get('/posts/:id/comments', { onRequest: app.optionalAuth }, async (req) => {
    const { id } = parse(idParam, req.params);
    const blocked = await blockedUserIds(prisma, req.user?.sub);
    const comments = await prisma.comment.findMany({
      where: { postId: id, status: 'PUBLISHED', authorId: { notIn: blocked } },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return {
      items: comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt, author: publicUser(c.author, storage) })),
    };
  });

  app.post('/posts/:id/comments', { onRequest: app.authenticate, config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    const { body } = parse(commentSchema, req.body);
    const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true, status: true } });
    if (!post || post.status !== 'PUBLISHED') throw notFound('Post');
    if ((await blockedUserIds(prisma, req.user.sub)).includes(post.authorId)) throw forbidden();
    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({ data: { postId: id, authorId: req.user.sub, body }, include: { author: true } });
      await tx.post.update({ where: { id }, data: { commentCount: { increment: 1 } } });
      return c;
    });
    return reply.code(201).send({ id: comment.id, body: comment.body, createdAt: comment.createdAt, author: publicUser(comment.author, storage) });
  });

  app.delete('/comments/:id', { onRequest: app.authenticate }, async (req, reply) => {
    const { id } = parse(idParam, req.params);
    const comment = await prisma.comment.findUnique({ where: { id }, include: { post: { select: { authorId: true } } } });
    if (!comment) throw notFound('Commento');
    const canDelete = comment.authorId === req.user.sub || comment.post.authorId === req.user.sub || req.user.role !== 'USER';
    if (!canDelete) throw forbidden();
    await prisma.$transaction([
      prisma.comment.delete({ where: { id } }),
      prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
    ]);
    return reply.code(204).send();
  });
}
