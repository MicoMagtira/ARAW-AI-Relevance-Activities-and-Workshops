// Review screenshots (not part of verify): npx playwright test -c build/shots/shots.config.ts. Output: build/screens-1 or $SHOTS_DIR.
import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';
export default defineConfig({ ...base, testDir: '.', testMatch: 'shots.spec.ts', fullyParallel: true,
  webServer: { ...(base.webServer as object), command: 'npx vite preview --port 4173 --strictPort', cwd: '../..' } as never });
