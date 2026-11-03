// The print app (scripts/print/build.mjs builds it, then prints it with Playwright). Not part of the shipped app.
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('.'),
  base: './',
  plugins: [preact()],
  // fonts and logos stay files: the build serves the folder from disk, so there is no need to inline them
  build: { outDir: here('../out/site'), emptyOutDir: true, target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 4000, assetsInlineLimit: 0 },
  logLevel: 'error',
});
