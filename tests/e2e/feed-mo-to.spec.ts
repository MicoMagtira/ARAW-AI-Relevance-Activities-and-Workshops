import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

async function settled(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished' || a.effect?.getTiming().iterations === Infinity));
}

const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(`araw:v1:${k}`), key);
const GAME = '/#/arcade/feed-mo-to?seed=e2e-a';
const SCARY = ['scary health posts', 'miracle cure posts'];

const state = (page: Page): Locator => page.locator('.game-state p');

/** Pick the first scary post with the keyboard (the clamp makes the key presses independent of where the highlight was). */
async function pickScary(page: Page) {
  await expect(state(page)).toContainText('Option 1,', { timeout: 15_000 });
  const text = (await state(page).textContent()) ?? '';
  const topics = [...text.matchAll(/Option \d, ([^:]+):/g)].map((m) => m[1] as string);
  const index = Math.max(0, topics.findIndex((t) => SCARY.includes(t)));
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < index; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(state(page)).toContainText('You showed', { timeout: 5000 });
}

test.describe("Feed Mo 'To", () => {
  test("is open in the Arcade and starts with Ara's five-page briefing", async ({ page }) => {
    await page.goto('/#/arcade');
    await expect(page.getByRole('button', { name: /^Feed Mo 'To/ })).toHaveAttribute('aria-label', "Feed Mo 'To, Algorithms and filter bubbles, New");
    await page.goto(GAME);
    const titles = ['Today, YOU are the algorithm!', 'Feeds pick what keeps people scrolling', 'How to play', 'Why it matters', 'When should I trust it?'];
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const [i, title] of titles.entries()) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      if (i < 4) await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    expect(await stored(page, 'briefingsSeen')).toBe('["feed-mo-to"]');
  });

  test('plays by keyboard and by tap, pauses, then the scary-only feed pops its bubble and the recap explains why', async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['feed-mo-to'])));
    await page.goto(GAME);
    await expect(page.getByRole('heading', { level: 2, name: "Feed Mo 'To" })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();

    const hud = page.getByRole('list', { name: 'Game status' });
    await expect(hud.getByRole('meter', { name: 'Engagement' })).toBeVisible();
    await expect(hud.getByRole('meter', { name: 'Balanced Feed' })).toBeVisible();
    await expect(state(page)).toContainText(/Feed Mo 'To\. Score 0\. Engagement 60 percent\. Balanced Feed 90 percent\. tita baby, post 1 of 10\./);

    // the first post, by keyboard: three options with the full text, then the result
    await expect(state(page)).toContainText('Option 3,', { timeout: 10_000 });
    await expect(state(page)).toContainText('Highlighted: option 2.');
    await noHorizontalOverflow(page);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText(/You showed ".+" .*Engagement [+-]?\d+, Balanced Feed [+-]?\d+, \d+ points\./, { timeout: 5000 });
    await expect(hud.locator('.game-hud__value').first()).not.toHaveText('0');

    // the second post, by tap on the middle card
    await expect(state(page)).toContainText('post 2 of 10', { timeout: 10_000 });
    await expect(state(page)).toContainText('Option 1,');
    const canvas = page.locator('canvas.game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('no canvas');
    await canvas.click({ position: { x: box.width * (160 / 320), y: box.height * (116 / 180) } });
    await expect(state(page)).toContainText('You showed', { timeout: 5000 });

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'How to play' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'How to play' });
    await expect(dialog.getByText(/You are the algorithm\. Pick one of 3 posts/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await page.getByRole('button', { name: 'Resume' }).first().click();

    // chase engagement only: Balanced Feed hits 0
    const over = page.getByRole('heading', { level: 2, name: /Good run!|Game over/ });
    for (let i = 0; i < 12 && !(await over.isVisible()); i++) {
      if ((await state(page).textContent())?.includes('post 10 of 10')) break;
      await pickScary(page).catch(() => undefined);
    }
    await expect(over).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 3, name: "Ara's recap" })).toBeVisible();
    await expect(page.getByText(/^You curated feeds for \d+ (person|people)/)).toBeVisible();
    await expect(page.getByText(/^Her feed shrank into a bubble/)).toBeVisible();
    await expect(page.getByText(/^How it works: a recommendation algorithm/)).toBeVisible();
    await expect(page.getByText(/^A filter bubble is when a feed keeps showing/)).toBeVisible();
    await expect(page.getByText(/^Why scary health posts spread/)).toBeVisible();
    await expect(page.getByText(/^Tip: search on purpose for trusted sources/)).toBeVisible();
    await expect(page.getByText('When should I trust it? When a feed shows me many sides, and I search on purpose for trusted sources.')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    expect(JSON.parse((await stored(page, 'bestScores')) ?? '{}')).toMatchObject({ 'feed-mo-to': expect.any(Number) });
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await expect(page.getByRole('button', { name: /^Feed Mo 'To/ })).toHaveAttribute('aria-label', /Best \d+/);
  });

  test('doing nothing makes her scroll away until she logs off bored', async ({ page }) => {
    test.setTimeout(120_000);
    await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['feed-mo-to'])));
    await page.goto(GAME);
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(state(page)).toContainText('Option 1,', { timeout: 10_000 });
    await expect(page.getByRole('heading', { level: 2, name: /Good run!|Game over/ })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/^She logged off, bored\./)).toBeVisible();
    await expect(page.getByText(/4 times you ran out of time/)).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('the Daily Challenge link opens the same-seed run', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['feed-mo-to'])));
    await page.goto('/#/arcade/feed-mo-to?seed=daily');
    await expect(page.getByText('Same run for everyone today')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    await noHorizontalOverflow(page);
  });
});
