import { execSync } from 'node:child_process';

/** Applica le migrazioni al database di test (le tabelle vengono svuotate prima di ogni test). */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://tappa:tappa@localhost:5432/tappa_test';
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: url }, stdio: 'inherit' });
}
