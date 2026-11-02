import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import license from 'rollup-plugin-license';

export default defineConfig({
  plugins: [
    react(),
    license({
      thirdParty: {
        multipleVersions: true,
        output: {
          file: path.resolve(process.cwd(), 'dist/web/THIRD_PARTY_LICENSES.txt'),
          encoding: 'utf-8',
        },
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  build: {
    outDir: 'dist/web',
  },
});
