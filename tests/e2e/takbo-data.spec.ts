import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
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
const GAME = '/#/arcade/takbo-data?seed=e2e-a'; // an untouched run on this seed lasts about 22 seconds

test.describe('Takbo, Data!', () => {
  test('is open in the Arcade and starts with Ara\'s five-page briefing', async ({ page }) => {
    await page.goto('/#/arcade');
    const tile = page.getByRole('button', { name: /^Takbo, Data!/ });
    await expect(tile).toHaveAttribute('aria-label', 'Takbo, Data!, Data privacy, New');
    await page.goto(GAME);
    const titles = ['Hala, freebies everywhere!', 'Some "free" things cost your data', 'How to play', 'Why it matters', 'Kailan ako magtitiwala?'];
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const [i, title] of titles.entries()) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      if (i < 4) await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    expect(await stored(page, 'briefingsSeen')).toBe('["takbo-data"]');
  });

  test('a run: Shield and score HUD, text description, jump and lane keys, touch, pause, then game over with the recap', async ({ page }) => {
    test.setTimeout(120_000); // the run itself lasts up to a minute
    await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['takbo-data'])));
    await page.goto(GAME);
    await expect(page.getByRole('heading', { level: 2, name: 'Takbo, Data!' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();

    const hud = page.getByRole('list', { name: 'Game status' });
    await expect(hud.getByText('Privacy Shield')).toBeVisible();
    await expect(hud.getByText('Safe grabs')).toBeVisible();
    await expect(page.getByText(/Takbo, Data! Score \d+\. Privacy Shield at 100 percent\. Ara is in the middle lane/).first()).toBeVisible();

    // play a few seconds: jump, change lanes, tap the canvas
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(400);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.locator('canvas.game-canvas').click();
    await page.waitForTimeout(1500);
    await expect(hud.locator('.game-hud__value').first()).not.toHaveText('0');
    await noHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'How to play' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'How to play' });
    await expect(dialog.getByText(/Press Space, tap or click to jump/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await page.getByRole('button', { name: 'Resume' }).first().click();

    // stop playing: the Shield drains and the run ends
    const over = page.getByRole('heading', { level: 2, name: /Good run!|Game over/ });
    await expect(over).toBeVisible({ timeout: 100_000 });
    await expect(page.getByRole('heading', { level: 3, name: "Ara's recap" })).toBeVisible();
    await expect(page.getByText(/^You ran \d+ metres/)).toBeVisible();
    for (const n of [1, 2, 3]) await expect(page.getByText(new RegExp(`^Privacy tip ${n}: `))).toBeVisible();
    await expect(page.getByText(/give away any data|You gave away/)).toBeVisible();
    await expect(page.getByText("Kailan ako magtitiwala? When an offer doesn't ask for more of my data than it needs.")).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    expect(JSON.parse((await stored(page, 'bestScores')) ?? '{}')).toMatchObject({ 'takbo-data': expect.any(Number) });
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await expect(page.getByRole('button', { name: /^Takbo, Data!/ })).toHaveAttribute('aria-label', /Best \d+/);
  });

  test('the Daily Challenge link opens the same-seed run', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['takbo-data'])));
    await page.goto('/#/arcade/takbo-data?seed=daily');
    await expect(page.getByText('Same run for everyone today')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    await noHorizontalOverflow(page);
  });
});
