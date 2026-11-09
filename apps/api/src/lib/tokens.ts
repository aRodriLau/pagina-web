import { createHash, randomBytes, randomUUID } from 'node:crypto';
import argon2 from 'argon2';

// Parametri argon2id raccomandati da OWASP
const ARGON_OPTS = { type: argon2.argon2id as 2, memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const hashPassword = (password: string) => argon2.hash(password, ARGON_OPTS);
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);

/** Hash fittizio per rendere costante il tempo di risposta del login anche se l'email non esiste. */
let dummyHash: Promise<string> | null = null;
export const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));

export const newRefreshToken = () => randomBytes(48).toString('base64url');
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const newFamilyId = () => randomUUID();
