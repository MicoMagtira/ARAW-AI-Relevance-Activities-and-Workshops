import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { noHorizontalOverflow } from './fixtures';

test.describe('language landing', () => {
  test('a first visit starts with no language picked; Select leads to the sunrise splash', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#landing')).toBeVisible();
    await expect(page.locator('#splash')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ARAW');
    await expect(page.getByRole('heading', { level: 2, name: 'Choose your language' })).toBeVisible();
    await expect(page.getByText('Created by Mico C. Magtira')).toBeVisible();

    const english = page.getByRole('radio', { name: 'English' });
    const select = page.getByRole('button', { name: 'Select' });
    await expect(english).not.toBeChecked();
    await expect(select).toBeDisabled();
    await noHorizontalOverflow(page);

    await english.click(); // the real radio covers the whole card, so the card is the tap target
    await expect(english).toBeChecked();
    await expect(select).toBeEnabled();
    await select.click();

    await expect(page.locator('#splash')).toBeVisible();
    await expect(page.locator('#splash')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('the choice is saved: the next session has it picked, and Me can change it', async ({ page, context }) => {
    await page.goto('/');
    await page.getByRole('radio', { name: 'English' }).check();
    await page.getByRole('button', { name: 'Select' }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('araw:v1:language'))).toBe('"en"');

    // a new browser session (new tab, empty sessionStorage) shows the landing again, with English already picked
    const next = await context.newPage();
    await next.goto('/');
    await expect(next.getByRole('radio', { name: 'English' })).toBeChecked();
    await expect(next.getByRole('button', { name: 'Select' })).toBeEnabled();

    // Me > Settings has the same picker
    await next.goto('/#/me');
    await next.reload();
    const group = next.getByRole('group', { name: 'Language' });
    await expect(group.getByRole('radio', { name: 'English' })).toBeChecked();
    await expect(next.getByText('More languages are coming soon.').first()).toBeVisible();
  });

  test('works with the keyboard alone', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: 'English' })).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio', { name: 'English' })).toBeChecked();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Select' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#splash')).toBeVisible();
  });

  test('deep links skip the landing too', async ({ page }) => {
    await page.goto('/#/library');
    await expect(page.locator('#landing')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Library');
  });

  test('fits at phone, tablet, desktop and landscape sizes with 44px targets', async ({ page }) => {
    await page.goto('/');
    for (const [width, height] of [
      [320, 568],
      [360, 740],
      [740, 360],
      [820, 1180],
      [1366, 768],
      [1920, 1080],
    ] as const) {
      await page.setViewportSize({ width, height });
      await noHorizontalOverflow(page);
      for (const target of [page.getByRole('radio', { name: 'English' }), page.getByRole('button', { name: 'Select' })]) {
        const box = await target.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    }
    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(page.getByRole('button', { name: 'Select' })).toBeInViewport({ ratio: 1 });
  });

  test('no serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
