import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { unauthorized } from '../lib/http';

export interface AccessTokenPayload {
  sub: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AccessTokenPayload;
    user: AccessTokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Come authenticate ma non fallisce se il token manca (per endpoint pubblici personalizzabili). */
    optionalAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: AccessTokenPayload['role'][]) => (req: FastifyRequest) => Promise<void>;
  }
}

export default fp<{ secret: string; accessTtl: string }>(async (app, opts) => {
  await app.register(jwt, { secret: opts.secret, sign: { expiresIn: opts.accessTtl } });

  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw unauthorized();
    }
  });

  app.decorate('optionalAuth', async (req: FastifyRequest) => {
    if (!req.headers.authorization) return;
    try {
      await req.jwtVerify();
    } catch {
      throw unauthorized();
    }
  });

  app.decorate('requireRole', (...roles: AccessTokenPayload['role'][]) => async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw unauthorized();
    }
    if (!roles.includes(req.user.role)) throw unauthorized('Permessi insufficienti');
  });
});
