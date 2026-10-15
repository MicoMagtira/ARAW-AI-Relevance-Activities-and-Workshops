import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { TILES } from '../../src/games/tawid-lola/art';
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
const GAME = '/#/arcade/tawid-lola?seed=e2e-a';
const state = (page: Page): Locator => page.locator('.game-state p');

/** A canvas point (logical 320x180) in page coordinates. */
async function point(page: Page, x: number, y: number) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + box.width * (x / 320), y: box.y + box.height * (y / 180) };
}

async function tapTile(page: Page, command: string) {
  const tile = TILES.find((t) => t.command === command);
  if (!tile) throw new Error(`no tile ${command}`);
  const p = await point(page, tile.x + tile.w / 2, 162);
  await page.mouse.click(p.x, p.y);
}

async function seen(page: Page) {
  await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['tawid-lola'])));
}

test.describe('Tawid, Lola!', () => {
  test("is open in the Arcade and starts with Ara's five-page briefing", async ({ page }) => {
    await page.goto('/#/arcade');
    await expect(page.getByRole('button', { name: /^Tawid, Lola!/ })).toHaveAttribute('aria-label', 'Tawid, Lola!, When to trust the AI guide, New');
    await page.goto(GAME);
    const titles = ['Tara, Lola, sa health center!', 'The AI guide is helpful but not perfect', 'How to play', 'Your eyes count', 'Kailan ako magtitiwala?'];
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const [i, title] of titles.entries()) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      if (i < 4) await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    expect(await stored(page, 'briefingsSeen')).toBe('["tawid-lola"]');
  });

  test('the guide speaks, WAIT moves the Trust Meter, GO steps forward, and pause works', async ({ page }) => {
    await seen(page);
    await page.goto(GAME);
    await expect(page.getByRole('heading', { level: 2, name: 'Tawid, Lola!' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();

    const hud = page.getByRole('list', { name: 'Game status' });
    await expect(hud.getByRole('img', { name: 'Hearts: 3 of 3' })).toBeVisible();
    const trust = hud.getByRole('meter', { name: 'Trust Meter' });
    await expect(trust).toHaveAttribute('aria-valuenow', '50');
    await expect(state(page)).toContainText(/The AI guide says (GO|WAIT), \d+ percent sure/);
    await expect(state(page)).toContainText('Your own view of the next lane');
    await expect(state(page)).toContainText('lane 0 of 5');

    // the first road is always one the guide gets right: waiting on a WAIT is +8, waiting on a GO is -3
    await tapTile(page, 'wait');
    await expect(state(page)).toContainText('Last: ');
    await expect(trust).toHaveAttribute('aria-valuenow', /^(58|47)$/);
    await noHorizontalOverflow(page);

    await page.keyboard.press('ArrowRight');
    await expect(state(page)).toContainText('column 12 of 20');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(state(page)).toContainText('column 10 of 20');
    await tapTile(page, 'go');
    await expect(state(page)).toContainText(/lane [01] of 5/);

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'How to play' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'How to play' });
    await expect(dialog.getByText(/Help Lola cross the street/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await page.getByRole('button', { name: 'Resume' }).first().click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
  });

  test('following the guide without looking costs hearts, and the recap explains automation bias', async ({ page }) => {
    test.setTimeout(150_000);
    await seen(page);
    await page.goto(GAME);
    await page.getByRole('button', { name: 'Start' }).click();
    const over = page.getByRole('heading', { level: 2, name: /Good run!|Game over/ });
    for (let i = 0; i < 600 && !(await over.isVisible()); i++) {
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(120);
    }
    await expect(over).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 3, name: "Ara's recap" })).toBeVisible();
    await expect(page.getByText(/^You made \d+ trips? to the health center/)).toBeVisible();
    await expect(page.getByText(/^How it works: automation bias/)).toBeVisible();
    await expect(page.getByText(/^Health apps and chatbots are the same/)).toBeVisible();
    await expect(page.getByText('Kailan ako magtitiwala? When the app matches what I see. When it does not, I stop and check with a person.')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await expect(page.getByRole('button', { name: /^Tawid, Lola!/ })).toBeVisible();
  });

  test('the Daily Challenge link opens the same-seed run', async ({ page }) => {
    await seen(page);
    await page.goto('/#/arcade/tawid-lola?seed=daily');
    await expect(page.getByText('Same run for everyone today')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    await expect(state(page)).toContainText('Trip 1:');
    await noHorizontalOverflow(page);
  });
});
