import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { noHorizontalOverflow } from './fixtures';

test.describe('sunrise splash', () => {
  test('first visit shows the splash, SIMULAN goes Home', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ARAW');
    await expect(page.getByText('AI Relevance Activities and Workshops')).toBeVisible();
    await expect(page.getByText('An AIKasalig project')).toBeVisible();
    await expect(page.getByText('Beta: educational, not medical advice')).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0); // the app shell is not behind it
    await expect(page.locator('.splash__scene .ara')).toHaveAttribute('data-mood', 'happy');
    await noHorizontalOverflow(page);

    const start = page.getByRole('button', { name: 'Simulan' });
    await expect(start).toBeInViewport();
    await start.click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.locator('#main')).toBeFocused();

    // once per session: a reload goes straight to Home
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  });

  test('skip link is the first stop and also leads Home', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip intro' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
    await expect(page).toHaveURL(/#\/$/);
  });

  test('SIMULAN is reachable and activated with the keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Simulan' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  });

  test('deep links skip the splash', async ({ page }) => {
    await page.goto('/#/learn');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learn');
  });

  test('Ara is crisp (an integer multiple of 32px) and hidden from screen readers here', async ({ page }) => {
    await page.goto('/');
    const svg = page.locator('.splash__ara .ara__svg');
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.width ?? 0) % 32).toBe(0);
    expect(box?.width).toBe(box?.height);
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  test('loading bar is complete at once with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.splash__loading')).toContainText('100%');
    await expect(page.locator('.splash__seg.is-on')).toHaveCount(10);
  });

  test('stays inside the viewport at phone, tablet, desktop and landscape sizes', async ({ page }) => {
    await page.goto('/');
    for (const [width, height] of [
      [320, 568],
      [360, 740],
      [740, 360],
      [844, 390],
      [820, 1180],
      [1024, 768],
      [1366, 768],
      [1440, 900],
      [1920, 1080],
      [2560, 1440],
    ] as const) {
      await page.setViewportSize({ width, height });
      await noHorizontalOverflow(page);
      await expect(page.getByRole('button', { name: 'Simulan' })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
      const box = await page.locator('.splash__ara .ara__svg').boundingBox();
      expect((box?.width ?? 0) % 32).toBe(0);
    }
  });

  test('SIMULAN is a 44px target and on screen without scrolling at 1366x768', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    const start = page.getByRole('button', { name: 'Simulan' });
    const box = await start.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expect(start).toBeInViewport({ ratio: 1 });
  });

  test('no serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => document.querySelector('.splash__loading')?.textContent?.includes('100%') ?? false);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('works when sessionStorage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'sessionStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError');
        },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Simulan' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  });
});
