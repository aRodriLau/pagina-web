import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  // Il pacchetto condiviso è TypeScript sorgente: va incluso nel bundle
  noExternal: ['@tappa/shared'],
  clean: true,
});
