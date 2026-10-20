import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, noHorizontalOverflow, test } from './fixtures';

async function axeClean(page: Page) {
  // wait for the screen's fade-in and the dialog's step-in, so axe never measures half-faded text
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished' || a.effect?.getTiming().iterations === Infinity));
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
}

test.describe('how-to videos', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('araw:v1:language', JSON.stringify('en')));
  });

  test('the Library lists every clip; a clip plays with captions, a transcript and a video-only language switch', async ({ page }) => {
    await page.goto('/#/library/videos');
    await expect(page.getByRole('heading', { name: 'How-to videos' })).toBeVisible();
    const cards = page.locator('.video-card');
    await expect(cards).toHaveCount(13);
    await expect(cards.first()).toContainText('ARAW in one minute');
    await noHorizontalOverflow(page);
    await axeClean(page);

    await page.locator('.video-card', { hasText: 'How to play: Takbo, Data!' }).click();
    const dialog = page.getByRole('dialog', { name: 'How to play: Takbo, Data!' });
    await expect(dialog).toBeVisible();
    const video = dialog.locator('video');
    await expect(video).toHaveAttribute('src', 'videos/takbo-data/en.webm');
    await expect(video.locator('track')).toHaveAttribute('src', 'videos/takbo-data/en.vtt');
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(1);
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.duration)).toBeGreaterThan(15);
    await expect(dialog.locator('.tutorial__caption')).not.toBeEmpty();
    await expect(dialog.getByText(/Captioned, no sound/)).toBeVisible();

    await dialog.getByText('Read all the captions').click();
    await expect(dialog.locator('.tutorial__transcript li').first()).toHaveText('How to play: Takbo, Data!');
    await expect(dialog.locator('.tutorial__transcript li').nth(1)).toContainText('lane');

    // the language row changes only the video
    await dialog.getByRole('button', { name: 'Filipino' }).click();
    await expect(dialog.getByRole('button', { name: 'Filipino' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.locator('video')).toHaveAttribute('src', 'videos/takbo-data/fil.webm');
    await expect(dialog.locator('.tutorial__transcript li').first()).toHaveText(/Takbo, Data!/);
    await expect(dialog.locator('.tutorial__transcript li').first()).not.toHaveText('How to play: Takbo, Data!');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // captions can be turned off, and the choice is remembered
    await dialog.getByRole('switch', { name: 'Captions' }).click();
    await expect(dialog.locator('.tutorial__caption')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('araw:v1:tutorialCaptions'))).toBe('false');
    await noHorizontalOverflow(page);
    await axeClean(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('a canvas game shows its video in How to play, and the first-run briefing offers it', async ({ page }) => {
    await page.goto('/#/arcade/takbo-data?seed=e2e-a');
    const watch = page.getByRole('button', { name: 'Watch a short video' });
    await expect(watch).toBeVisible();
    await watch.click();
    const dialog = page.getByRole('dialog', { name: 'How to play' });
    await expect(dialog.locator('video')).toHaveAttribute('src', 'videos/takbo-data/en.webm');
    await expect(dialog.getByText(/Press Space, tap or click to jump/).last()).toBeVisible();
    await noHorizontalOverflow(page);
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    // the briefing is still there to read
    await expect(page.getByRole('heading', { level: 2, name: 'Wow, freebies everywhere!' })).toBeVisible();
  });

  test('a page game intro, the Home banner and the sidebar open the shared video dialog', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07'])));
    await page.goto('/#/arcade/gawa-ko-to');
    await page.getByRole('button', { name: /Watch how to play/ }).click();
    await expect(page.getByRole('dialog', { name: "How to play: Gawa Ko 'To!" }).locator('video')).toHaveAttribute('src', 'videos/gawa-ko-to/en.webm');
    await page.keyboard.press('Escape');

    await page.goto('/#/');
    await page.locator('.home-banner').getByRole('button', { name: /Watch the 1-minute tour/ }).click();
    const tour = page.getByRole('dialog', { name: 'ARAW in one minute' });
    await expect(tour.locator('video')).toHaveAttribute('src', 'videos/tour/en.webm');
    await noHorizontalOverflow(page);
    await page.keyboard.press('Escape');

    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await page.getByRole('navigation', { name: 'More' }).getByRole('button', { name: 'Watch the tour' }).click();
      await expect(tour).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('videos are never cached by the service worker', async ({ page }) => {
    const sw = await (await page.request.get('/sw.js')).text();
    expect(sw).toContain("url.pathname.includes('/videos/')");
  });
});
