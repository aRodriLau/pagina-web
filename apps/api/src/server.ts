import { loadConfig } from './config';
import { buildApp } from './app';
import { prisma } from './lib/prisma';
import { createS3Storage } from './lib/storage';
import { attachRealtime } from './realtime';

const config = loadConfig();
const app = await buildApp({ config, prisma, storage: createS3Storage(config) });
attachRealtime(app, config.REDIS_URL);

const shutdown = async (signal: string) => {
  app.log.info(`${signal} ricevuto, chiusura in corso`);
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: config.PORT, host: '0.0.0.0' });
