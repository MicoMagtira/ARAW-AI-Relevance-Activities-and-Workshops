// Builds the stand-alone Guide preview: npx vite build -c scripts/guide/preview/vite.config.ts
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: here('.'),
  base: './',
  publicDir: here('../../../public'),
  plugins: [preact()],
  define: { __APP_VERSION__: JSON.stringify('guide-preview') },
  build: { outDir: here('../out/preview'), emptyOutDir: true },
  preview: { port: 4180, strictPort: true },
});
