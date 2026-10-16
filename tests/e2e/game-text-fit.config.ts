// Text-fit tour for the canvas games (tests/e2e/game-text-fit.spec.ts). Not part of `npm run verify`.
// Build first, into its own folder so dist/ and the usual ports stay free for other work:
//   npx vite build --outDir dist-canvas && npx playwright test -c tests/e2e/game-text-fit.config.ts
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

// FIT_PORT / FIT_DIST let two tours run side by side (FIT_GAMES=slug,slug picks games; FIT_PLAY_MS sets play time).
const PORT = Number(process.env.FIT_PORT ?? 4182);
const DIST = process.env.FIT_DIST ?? 'dist-canvas';

// fresh parts for the games about to run (the config is evaluated again in every worker, so only the main process clears)
if (!process.env.TEST_WORKER_INDEX) {
  const parts = fileURLToPath(new URL('./out/game-text-fit', import.meta.url));
  const only = process.env.FIT_GAMES?.split(',').filter(Boolean);
  if (existsSync(parts)) for (const f of readdirSync(parts)) if (!only || only.some((g) => f.startsWith(`${g}.`))) rmSync(`${parts}/${f}`, { force: true });
}

export default defineConfig({
  testDir: '.',
  testMatch: 'game-text-fit.spec.ts',
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: 'line',
  timeout: 180_000,
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off' },
  projects: [{ name: 'text-fit', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npx vite preview --outDir ${DIST} --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
