import type { PrismaClient } from '@prisma/client';
import type { Config } from './config';
import type { Storage } from './lib/storage';

export interface AppDeps {
  config: Config;
  prisma: PrismaClient;
  storage: Storage;
}

declare module 'fastify' {
  interface FastifyInstance {
    deps: AppDeps;
  }
}
