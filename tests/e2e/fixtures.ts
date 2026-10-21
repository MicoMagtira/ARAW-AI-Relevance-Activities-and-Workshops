import { expect, test as base, type Page } from '@playwright/test';

/** Same key as src/app/boot.ts: pretend the splash already played in this session. */
const BOOT_KEY = 'araw:v1:booted';

/** `test` for every spec that is not about the splash: the boot screen is skipped. */
export const test = base.extend({
  page: async ({ page }, use) => {
    // no test may download a Chatbot Sandbox model (the sandbox starts its download on its own): every page gets the
    // scripted test AI, already "on the device"; tests/e2e/sandbox.spec.ts sets its own options per test
    await page.route('**/huggingface.co/**', (route) => route.abort());
    await page.addInitScript(() => {
      (window as unknown as { __ARAW_FAKE_LLM__?: object }).__ARAW_FAKE_LLM__ = { cached: true, delay: 5 };
    });
    await page.addInitScript((key) => {
      try {
        window.sessionStorage.setItem(key, '1');
      } catch {
        /* blocked storage: the app falls back to its in-memory flag */
      }
    }, BOOT_KEY);
    await use(page);
  },
});

export { expect };

export async function noHorizontalOverflow(page: Page): Promise<void> {
  // poll: right after a viewport resize the layout can take a frame to settle
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), {
      message: 'document must not scroll horizontally',
    })
    .toBeLessThanOrEqual(0);
}

/** The first screen of a session is the language landing: pick English and press Select to reach the sunrise splash. */
export async function passLanding(page: Page): Promise<void> {
  await page.getByRole('radio', { name: 'English' }).check();
  await page.getByRole('button', { name: 'Select' }).click();
  await expect(page.locator('#splash')).toBeFocused();
}
