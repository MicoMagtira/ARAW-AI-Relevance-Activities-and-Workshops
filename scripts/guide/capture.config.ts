// User-guide screenshot capture (not part of verify).
//
//   npm run build && npx playwright test -c scripts/guide/capture.config.ts
//
// It builds nothing: it serves the existing dist/ on its OWN port (4180, so it never clashes with dev 5173 or preview 4173),
// captures every screen the guide needs at phone (360x740 @2x) and desktop (1366x768 @1x) size into public/guide/*.png,
// and writes the callout boxes to scripts/guide/out/manifest.json (merged from out/parts/ when the run ends).
// Then rebuild the printable guide: node scripts/guide/build-pdf.mjs
// One screen only: add -g <shot id>, e.g. `-g home`. One size only: add --project phone (or desktop).
import { defineConfig } from '@playwright/test';

const PORT = 4180;

export default defineConfig({
  testDir: '.',
  testMatch: /capture\.spec\.ts$/,
  outputDir: 'out/test-results',
  fullyParallel: true,
  retries: 1,
  reporter: 'line',
  timeout: 90_000,
  globalTeardown: './merge-manifest.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'phone',
      use: { browserName: 'chromium', viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 },
    },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
