import type { ZodTypeAny, z } from 'zod';

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Non autenticato') => new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Operazione non consentita') => new HttpError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Risorsa') => new HttpError(404, 'NOT_FOUND', `${what} non trovato`);
export const conflict = (message: string) => new HttpError(409, 'CONFLICT', message);

/** Valida un input con zod e restituisce un 400 leggibile in caso di errore. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw badRequest(
      'Dati non validi',
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

/** Cursor opaco base64url per la paginazione. */
export const encodeCursor = (v: Record<string, unknown>) =>
  Buffer.from(JSON.stringify(v)).toString('base64url');

export function decodeCursor<T>(cursor: string | undefined): T | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as T;
  } catch {
    throw badRequest('Cursor non valido');
  }
}
