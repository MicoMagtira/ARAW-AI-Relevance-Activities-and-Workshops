import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TABS = [
  { label: 'Home', hash: '#/', title: 'Home' },
  { label: 'Learn', hash: '#/learn', title: 'Learn' },
  { label: 'Arcade', hash: '#/arcade', title: 'Arcade' },
  { label: 'Library', hash: '#/library', title: 'Library' },
  { label: 'Me', hash: '#/me', title: 'Me' },
] as const;

const SCREENS = ['#/', '#/learn', '#/arcade', '#/library', '#/me', '#/report?screen=home', '#/about', '#/nope'];

const layoutFor = (width: number) => (width >= 1024 ? 'desktop' : width >= 600 ? 'tablet' : 'phone');

async function noHorizontalOverflow(page: Page) {
  // poll: right after a viewport resize the layout can take a frame to settle
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), {
      message: 'document must not scroll horizontally',
    })
    .toBeLessThanOrEqual(0);
}

/** Wait for the screen enter animation, so axe does not measure half-faded text. */
async function screenSettled(page: Page) {
  await page.waitForFunction(() => document.querySelector('.screen')?.getAnimations().every((a) => a.playState === 'finished') ?? false);
}

test.describe('app shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  });

  test('every tab is reachable from the navigation', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    for (const tab of TABS) {
      await nav.getByRole('link', { name: tab.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${tab.hash.replace('/', '\\/')}$`));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(tab.title);
      await expect(nav.getByRole('link', { name: tab.label, exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(page).toHaveTitle(`${tab.title} · ARAW`);
    }
  });

  test('navigation sits in the right place for this breakpoint', async ({ page }) => {
    const size = page.viewportSize();
    if (!size) throw new Error('no viewport');
    const layout = layoutFor(size.width);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    const navBox = await nav.boundingBox();
    const bannerBox = await page.locator('.banner').boundingBox();
    if (!navBox || !bannerBox) throw new Error('missing boxes');

    if (layout === 'desktop') {
      // left sidebar with the gold banner to its right
      expect(navBox.x).toBe(0);
      expect(navBox.height).toBeGreaterThan(navBox.width);
      expect(bannerBox.x).toBeGreaterThanOrEqual(navBox.width);
      await expect(page.locator('.sidebar__brand')).toBeVisible();
      await expect(page.locator('.sidebar__foot')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Report', exact: true })).toBeVisible();
      await expect(page.locator('.report-flag')).toBeHidden();
      await expect(page.locator('.avatar-link')).toBeVisible();
    } else if (layout === 'tablet') {
      // header on top, sticky top tabs directly under it
      expect(bannerBox.y).toBe(0);
      expect(navBox.y).toBeGreaterThanOrEqual(bannerBox.y + bannerBox.height - 1);
      expect(navBox.y).toBeLessThan(200);
      expect(navBox.width).toBeGreaterThan(navBox.height * 4);
      await expect(page.locator('.sidebar__brand')).toBeHidden();
      await expect(page.locator('.report-flag')).toBeVisible();
    } else {
      // fixed bottom tab bar
      expect(Math.round(navBox.y + navBox.height)).toBe(size.height);
      expect(navBox.width).toBe(size.width);
      await expect(page.locator('.report-flag')).toBeVisible();
    }

    // XP + streak chips and the report entry point are on every screen
    await expect(page.locator('.px-chip--xp')).toContainText('0 experience points');
    await expect(page.locator('.px-chip--streak')).toContainText('0 day streak');
    await expect(page.locator('.px-chip--xp')).toBeVisible();
    await expect(page.locator('.px-chip--streak')).toBeVisible();
    // beta disclaimer is visible on every size (sidebar footer on desktop, page footer elsewhere)
    await expect(page.getByText('Beta: educational, not medical advice').locator('visible=true').first()).toBeVisible();
  });

  test('tap targets are at least 44px', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    for (const link of await nav.getByRole('link').all()) {
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    }
    const flag = page.locator('.report-flag');
    if (await flag.isVisible()) {
      const box = await flag.boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('report entry point carries the current screen', async ({ page }) => {
    await page.goto('/#/arcade');
    const flag = page.locator('.report-flag');
    const link = (await flag.isVisible()) ? flag : page.locator('.sidebar__foot').getByRole('link', { name: 'Report', exact: true });
    await link.click();
    await expect(page).toHaveURL(/#\/report\?screen=arcade$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Report');
    await expect(page.locator('.preview-list dd').first()).toHaveText('arcade');
    const open = page.getByRole('link', { name: 'Open email' });
    await expect(open).toHaveAttribute('href', /^mailto:AIKasalig@gmail\.com\?subject=%5BARAW%5D%20Report%3A%20Something%20broke/);
  });

  test('unknown routes show a friendly Not Found with a Home button', async ({ page }) => {
    await page.goto('/#/definitely-not-here');
    await expect(page.getByText('Hala! This page is lost.')).toBeVisible();
    await page.getByRole('link', { name: 'Home', exact: true }).last().click();
    await expect(page).toHaveURL(/#\/$/);
  });

  test('skip link moves focus to the content without changing the route', async ({ page }) => {
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
    await expect(page).toHaveURL(/#\/$/);
  });

  for (const hash of SCREENS) {
    test(`no horizontal overflow and no serious a11y violations: ${hash}`, async ({ page }) => {
      await page.goto(`/${hash}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
      await screenSettled(page);
      await noHorizontalOverflow(page);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }

  test('no horizontal overflow from 320px to 2560px, with every accessibility setting on', async ({ page }) => {
    await page.goto('/#/me');
    for (const name of ['Larger text', 'High contrast', 'Extra-large buttons', 'Screen-reader hints', 'Reduce motion']) {
      await page.getByRole('switch', { name }).click();
    }
    for (const hash of SCREENS) {
      await page.goto(`/${hash}`);
      for (const [width, height] of [
        [320, 640],
        [360, 740],
        [600, 900],
        [820, 1180],
        [1024, 768],
        [1366, 768],
        [1920, 1080],
        [2560, 1440],
      ] as const) {
        await page.setViewportSize({ width, height });
        await noHorizontalOverflow(page);
      }
    }
  });
});

test.describe('settings and storage', () => {
  test('settings apply root classes, persist across reloads and reset', async ({ page }) => {
    await page.goto('/#/me');
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/a11y-/);

    await page.getByRole('switch', { name: 'Larger text' }).click();
    await page.getByRole('switch', { name: 'High contrast' }).click();
    await expect(html).toHaveClass(/a11y-large-text/);
    await expect(html).toHaveClass(/a11y-high-contrast/);
    await expect(page.getByRole('switch', { name: 'Larger text' })).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(html).toHaveClass(/a11y-large-text/);
    await expect(page.getByRole('switch', { name: 'High contrast' })).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: 'Reset my progress' }).click();
    const dialog = page.getByRole('dialog', { name: 'Reset progress?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(html).not.toHaveClass(/a11y-/);
    await expect(page.getByRole('status')).toContainText('Progress reset');
  });

  test('the app works when localStorage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/#/me');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Me');
    await page.getByRole('switch', { name: 'Larger text' }).click();
    await expect(page.locator('html')).toHaveClass(/a11y-large-text/);
  });
});
