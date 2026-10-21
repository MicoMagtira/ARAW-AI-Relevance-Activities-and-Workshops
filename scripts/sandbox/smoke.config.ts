// Chatbot Sandbox real-model smoke test and model bake-off (not part of verify: it downloads real models).
//   npx playwright test -c scripts/sandbox/smoke.config.ts
//   SANDBOX_MODELS=qwen3-0.6b,gemma3-1b SANDBOX_LANGS=en,fil SANDBOX_PROMPTS=8 npx playwright test -c scripts/sandbox/smoke.config.ts
// Answers go to shots-out/sandbox-bakeoff/. Models stay cached in .sandbox-profile/ between runs.
import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

export default defineConfig({
  ...base,
  testDir: '.',
  testMatch: /smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 4 * 60 * 60 * 1000,
  projects: [{ name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } }],
  webServer: { ...(base.webServer as object), cwd: '../..' } as never,
});
