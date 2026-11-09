import Fastify, { type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { Prisma } from '@prisma/client';
import { FEATURES, PLACE_CATEGORIES, PRICE_LEVELS, TRAVELER_TYPES } from '@tappa/shared';
import './context';
import type { AppDeps } from './context';
import { HttpError } from './lib/http';
import authPlugin from './plugins/auth';
import authRoutes from './modules/auth';
import chatRoutes from './modules/chat';
import listRoutes from './modules/lists';
import placeRoutes from './modules/places';
import postRoutes from './modules/posts';
import reportRoutes from './modules/reports';
import userRoutes from './modules/users';

export async function buildApp(deps: AppDeps, opts: FastifyServerOptions = {}) {
  const { config } = deps;
  const app = Fastify({
    logger: config.NODE_ENV === 'test' ? false : { level: config.NODE_ENV === 'production' ? 'info' : 'debug' },
    trustProxy: true,
    ...opts,
  });

  app.decorate('deps', deps);
  app.decorate('realtime', { emitToUsers: () => {} });

  await app.register(helmet);
  await app.register(cors, {
    origin: config.CORS_ORIGINS ? config.CORS_ORIGINS.split(',').map((s) => s.trim()) : false,
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    // In test disattiviamo il limite globale (le route con limite proprio restano attive)
    allowList: config.NODE_ENV === 'test' ? () => true : undefined,
  });
  await app.register(authPlugin, { secret: config.JWT_SECRET, accessTtl: config.ACCESS_TOKEN_TTL });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Risorsa non trovata' } });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Riferimento non valido' } });
    }
    const status = (err as { statusCode?: number }).statusCode ?? 500;
    if (status >= 500) req.log.error(err);
    return reply.code(status).send({
      error: { code: status === 429 ? 'RATE_LIMITED' : 'ERROR', message: status >= 500 ? 'Errore interno' : (err as Error).message },
    });
  });

  app.get('/health', async () => {
    await deps.prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  });

  /** Catalogo per l'app: categorie, caratteristiche (con etichette tradotte), fasce di prezzo. */
  app.get('/catalog', async () => ({
    categories: PLACE_CATEGORIES,
    features: FEATURES,
    travelerTypes: TRAVELER_TYPES,
    priceLevels: PRICE_LEVELS,
  }));

  await app.register(
    async (v1) => {
      await v1.register(authRoutes);
      await v1.register(userRoutes);
      await v1.register(placeRoutes);
      await v1.register(postRoutes);
      await v1.register(listRoutes);
      await v1.register(chatRoutes);
      await v1.register(reportRoutes);
    },
    { prefix: '/v1' },
  );

  return app;
}
