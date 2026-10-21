import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { pwaPlugin } from './scripts/pwa-plugin.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Same cross-origin isolation as production (public/_headers): the Chatbot Sandbox AI may then use several threads.
const isolation = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless' };

export default defineConfig({
  base: './',
  server: { headers: isolation },
  preview: { headers: isolation },
  plugins: [preact(), pwaPlugin(pkg.version)],
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version} beta`),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    globals: false,
    css: false,
  },
});
