import { expect, test as base, type Page } from '@playwright/test';

/** Same key as src/app/boot.ts: pretend the splash already played in this session. */
const BOOT_KEY = 'araw:v1:booted';

/** `test` for every spec that is not about the splash: the boot screen is skipped. */
export const test = base.extend({
  page: async ({ page }, use) => {
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
