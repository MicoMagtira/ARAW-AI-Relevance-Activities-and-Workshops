// Layout audit (not part of verify): npx playwright test -c scripts/audit/audit.config.ts. Output: shots-out/audit/.
import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';
export default defineConfig({ ...base, testDir: '.', testMatch: /audit.spec.ts/, fullyParallel: true, workers: 4, projects: [{ name: 'audit', use: { browserName: 'chromium' } }],
  webServer: { ...(base.webServer as object), command: 'npx vite preview --port 4173 --strictPort', cwd: '../..' } as never });
