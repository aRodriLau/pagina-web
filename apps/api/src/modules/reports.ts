import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { reportSchema } from '@tappa/shared';
import { notFound, parse } from '../lib/http';

/** Soglia di segnalazioni oltre la quale un contenuto viene nascosto in attesa di revisione. */
const AUTO_HIDE_THRESHOLD = 3;

export default async function reportRoutes(app: FastifyInstance) {
  const { prisma } = app.deps;

  app.post('/reports', { onRequest: app.authenticate, config: { rateLimit: { max: 20, timeWindow: '1 hour' } } }, async (req, reply) => {
    const input = parse(reportSchema, req.body);
    await prisma.report.upsert({
      where: { reporterId_targetType_targetId: { reporterId: req.user.sub, targetType: input.targetType, targetId: input.targetId } },
      create: { ...input, reporterId: req.user.sub },
      update: { reason: input.reason, details: input.details },
    });

    const open = await prisma.report.count({
      where: { targetType: input.targetType, targetId: input.targetId, status: 'OPEN' },
    });
    // La sicurezza dei minori ha priorità assoluta: basta una segnalazione per nascondere il post.
    const hide = input.reason === 'MINOR_SAFETY' || open >= AUTO_HIDE_THRESHOLD;
    if (hide && input.targetType === 'POST') {
      await prisma.post.updateMany({ where: { id: input.targetId, status: 'PUBLISHED' }, data: { status: 'HIDDEN' } });
    }
    if (hide && input.targetType === 'COMMENT') {
      await prisma.comment.updateMany({ where: { id: input.targetId, status: 'PUBLISHED' }, data: { status: 'HIDDEN' } });
    }
    return reply.code(202).send({ received: true });
  });

  // ---- Area moderatori ----
  const mod = { onRequest: app.requireRole('MODERATOR', 'ADMIN') };

  app.get('/moderation/reports', mod, async () => {
    const reports = await prisma.report.findMany({
      where: { status: 'OPEN' },
      orderBy: [{ createdAt: 'asc' }],
      take: 100,
    });
    return { items: reports };
  });

  app.post('/moderation/reports/:id/resolve', mod, async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const { action } = parse(z.object({ action: z.enum(['remove', 'restore', 'dismiss']) }), req.body);
    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) throw notFound('Segnalazione');

    // remove → contenuto rimosso; restore/dismiss → segnalazione infondata, il contenuto torna visibile
    const status = action === 'remove' ? 'REMOVED' : 'PUBLISHED';
    const where = { id: report.targetId };
    if (report.targetType === 'POST') await prisma.post.updateMany({ where, data: { status } });
    if (report.targetType === 'COMMENT') await prisma.comment.updateMany({ where, data: { status } });
    if (report.targetType === 'PLACE') await prisma.place.updateMany({ where, data: { status } });
    await prisma.report.updateMany({
      where: { targetType: report.targetType, targetId: report.targetId, status: 'OPEN' },
      data: { status: action === 'remove' ? 'ACTIONED' : 'DISMISSED', resolvedAt: new Date() },
    });
    return { ok: true };
  });
}
