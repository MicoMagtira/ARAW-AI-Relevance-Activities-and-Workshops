import { expect, noHorizontalOverflow, test } from './fixtures';

test.describe('How to use ARAW guide', () => {
  test('opens from Me, shows pictures with callouts and offers the printable PDF', async ({ page, request }) => {
    await page.goto('/#/me');
    await page.getByRole('link', { name: /How to use ARAW/ }).click();
    await expect(page).toHaveURL(/#\/guide$/);
    await expect(page.getByRole('heading', { level: 2, name: 'How to use ARAW' })).toBeVisible();

    const pdf = page.getByRole('link', { name: /printable guide/i });
    await expect(pdf).toHaveAttribute('href', /guide\/ARAW-User-Guide\.pdf$/);
    const res = await request.get('/guide/ARAW-User-Guide.pdf');
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toContain('pdf');

    const firstShot = page.locator('main img[src*="guide/"]').filter({ visible: true }).first();
    await firstShot.scrollIntoViewIfNeeded();
    await expect(firstShot).toHaveAttribute('alt', /.+/);
    await expect.poll(() => firstShot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await noHorizontalOverflow(page);
  });

  test('is linked from About', async ({ page }) => {
    await page.goto('/#/about');
    await page.getByRole('link', { name: /picture guide/ }).click();
    await expect(page).toHaveURL(/#\/guide$/);
  });
});
