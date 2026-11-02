import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'server/cli.ts' },
  outDir: 'dist',
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  external: ['fastify', '@fastify/static'],
  banner: { js: '#!/usr/bin/env node' },
  clean: false,
  dts: false,
  sourcemap: false,
  splitting: false,
  treeshake: true,
});
