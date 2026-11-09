import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema, registerSchema } from '@tappa/shared';
import { conflict, parse, unauthorized } from '../lib/http';
import { getDummyHash, hashPassword, newFamilyId, newRefreshToken, sha256, verifyPassword } from '../lib/tokens';

export default async function authRoutes(app: FastifyInstance) {
  const { prisma, config } = app.deps;

  async function issueTokens(user: { id: string; role: 'USER' | 'MODERATOR' | 'ADMIN' }, familyId: string = newFamilyId()) {
    const refreshToken = newRefreshToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId,
        expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
      },
    });
    const accessToken = app.jwt.sign({ sub: user.id, role: user.role });
    return { accessToken, refreshToken };
  }

  // Limiti stretti sugli endpoint di autenticazione contro brute force e credential stuffing
  const strict = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

  app.post('/auth/register', strict, async (req, reply) => {
    const input = parse(registerSchema, req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: input.email }, { username: input.username }] },
      select: { email: true },
    });
    if (existing) {
      throw conflict(existing.email === input.email ? 'Email già registrata' : 'Username non disponibile');
    }
    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash: await hashPassword(input.password),
        travelerTypes: input.travelerTypes,
        termsAcceptedAt: new Date(),
      },
    });
    // TODO(produzione): inviare email di verifica tramite il provider transazionale (Resend/Postmark)
    const tokens = await issueTokens(user);
    return reply.code(201).send({ user: { id: user.id, username: user.username }, ...tokens });
  });

  app.post('/auth/login', strict, async (req) => {
    const input = parse(loginSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.deletedAt) {
      await verifyPassword(await getDummyHash(), input.password);
      throw unauthorized('Email o password errati');
    }
    if (!(await verifyPassword(user.passwordHash, input.password))) {
      throw unauthorized('Email o password errati');
    }
    const tokens = await issueTokens(user);
    return { user: { id: user.id, username: user.username }, ...tokens };
  });

  /**
   * Rotazione dei refresh token con rilevamento del riuso:
   * se un token già usato viene presentato di nuovo, qualcuno l'ha rubato →
   * revochiamo tutta la famiglia e l'utente deve rifare login.
   */
  app.post('/auth/refresh', strict, async (req) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.user.deletedAt) {
      throw unauthorized('Sessione scaduta');
    }
    if (stored.usedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      req.log.warn({ userId: stored.userId }, 'refresh token riutilizzato: famiglia revocata');
      throw unauthorized('Sessione non valida');
    }
    const claimed = await prisma.refreshToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw unauthorized('Sessione non valida');
    return issueTokens(stored.user, stored.familyId);
  });

  app.post('/auth/logout', async (req, reply) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return reply.code(204).send();
  });
}
