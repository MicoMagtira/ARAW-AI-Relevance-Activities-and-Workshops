import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Own config for the DOM text-fit tour: serves a separate build (dist-dom) on port 4183.
// Build first: npx vite build --outDir dist-dom
export default defineConfig({
  testDir: '.',
  testMatch: 'game-text-fit-dom.spec.ts',
  fullyParallel: true,
  workers: 5,
  timeout: 900_000,
  retries: 0,
  reporter: 'line',
  use: { baseURL: 'http://localhost:4183', trace: 'off', reducedMotion: 'reduce' },
  projects: [
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true } },
    { name: 'tablet', use: { browserName: 'chromium', viewport: { width: 820, height: 1180 } } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: 'npx vite preview --outDir dist-dom --port 4183 --strictPort',
    url: 'http://localhost:4183',
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
