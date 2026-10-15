import { expect, noHorizontalOverflow, test } from './fixtures';

test.describe('PWA', () => {
  test('manifest, icons and the head links are in place', async ({ page, request }) => {
    await page.goto('/#/');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
    const manifest = (await (await request.get('/manifest.webmanifest')).json()) as { name: string; display: string; icons: { src: string; purpose: string }[] };
    expect(manifest.name).toContain('ARAW');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((i) => i.purpose)).toEqual(expect.arrayContaining(['any', 'maskable']));
    for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok(), icon.src).toBe(true);
  });

  test('works offline after the first visit: shell, a lazy lesson and a game', async ({ page, context }) => {
    await page.goto('/#/');
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    // wait until the worker has finished caching and controls the page
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).length)).toBeGreaterThan(0);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
    await noHorizontalOverflow(page);

    // lazy chunks come from the cache too
    await page.goto('/#/library/glossary');
    await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
    await page.goto('/#/arcade/takbo-data');
    await expect(page.locator('canvas')).toBeVisible();
    await context.setOffline(false);
  });
});
