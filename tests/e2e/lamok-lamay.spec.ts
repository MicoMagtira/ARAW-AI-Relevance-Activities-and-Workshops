import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { createRng } from '../../src/games/engine/rng';
import { DONE_SLOT, REJECT_SLOT, slotRect } from '../../src/games/lamok-lamay/art';
import { createScanGenerator, larvaeIn, type Scan, type ScanItem } from '../../src/games/lamok-lamay/scans';
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
const SEED = 'e2e-a';
const GAME = `/#/arcade/lamok-lamay?seed=${SEED}`;
const state = (page: Page): Locator => page.locator('.game-state p');

/** The scans of a seed, derived the same way the game does. */
function scansOf(seed: string, count: number): Scan[] {
  const rng = createRng(seed);
  const gen = createScanGenerator(createRng(`${rng()}:lamok-scans`));
  return Array.from({ length: count }, (_, i) => gen.next(i));
}

/** A canvas point (logical 320x180) in page coordinates. */
async function point(page: Page, x: number, y: number) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + box.width * (x / 320), y: box.y + box.height * (y / 180) };
}

async function tapItem(page: Page, item: ScanItem) {
  const p = await point(page, item.x, item.y);
  await page.mouse.click(p.x, p.y);
}

async function tapSlot(page: Page, slot: number) {
  const r = slotRect(slot);
  const p = await point(page, r.x + r.w / 2, r.y + r.h / 2);
  await page.mouse.click(p.x, p.y);
}

async function seen(page: Page) {
  await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['lamok-lamay'])));
}

test.describe('Lamok Lamay', () => {
  test("is open in the Arcade and starts with Ara's five-page briefing", async ({ page }) => {
    await page.goto('/#/arcade');
    await expect(page.getByRole('button', { name: /^Lamok Lamay/ })).toHaveAttribute('aria-label', 'Lamok Lamay, How AI sees, and misses, New');
    await page.goto(GAME);
    const titles = ['Bantay lamok time!', 'AI makes two mistakes', 'How to play', 'Clean water, new mosquitoes', 'Kailan ako magtitiwala?'];
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const [i, title] of titles.entries()) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      if (i < 4) await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    expect(await stored(page, 'briefingsSeen')).toBe('["lamok-lamay"]');
  });

  test('whacks, adds and rejects by tap, moves the meters, and pauses', async ({ page }) => {
    test.setTimeout(90_000);
    await seen(page);
    await page.goto(GAME);
    await expect(page.getByRole('heading', { level: 2, name: 'Lamok Lamay' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();

    const hud = page.getByRole('list', { name: 'Game status' });
    await expect(hud.getByRole('img', { name: 'Hearts: 5 of 5' })).toBeVisible();
    await expect(hud.getByRole('meter', { name: 'Precision' })).toHaveAttribute('aria-valuenow', '100');
    const first = scansOf(SEED, 1)[0] as Scan;
    const boxedLarva = first.items.find((i) => i.kind === 'larva' && i.boxed) as ScanItem;
    const missedLarva = first.items.find((i) => i.kind === 'larva' && !i.boxed) as ScanItem;
    const falseBox = first.items.find((i) => i.kind !== 'larva' && i.boxed) as ScanItem;
    await expect(state(page)).toContainText('Objects in the water', { timeout: 10_000 });
    await expect(state(page)).toContainText(`boxed by the AI as larvae ${boxedLarva.confidence}%`);
    await noHorizontalOverflow(page);

    await tapItem(page, boxedLarva);
    await expect(hud.locator('.game-hud__value').first()).toHaveText('50');
    await tapItem(page, missedLarva);
    await expect(hud.locator('.game-hud__value').first()).toHaveText('138');
    await expect(hud.getByRole('meter', { name: 'Catch rate' })).toHaveAttribute('aria-valuenow', '50');
    await tapSlot(page, REJECT_SLOT);
    await expect(state(page)).toContainText('Tool: Reject');
    await tapItem(page, falseBox);
    await expect(hud.locator('.game-hud__value').first()).toHaveText('210');
    await expect(hud.getByRole('meter', { name: 'Precision' })).toHaveAttribute('aria-valuenow', '50');
    await noHorizontalOverflow(page);

    await tapSlot(page, DONE_SLOT);
    await expect(state(page)).toContainText('You caught every larva.');
    await expect(state(page)).toContainText('Tip:');
    await expect(hud.getByRole('img', { name: 'Hearts: 5 of 5' })).toBeVisible();

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'How to play' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'How to play' });
    await expect(dialog.getByText(/Water containers pop up/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await page.getByRole('button', { name: 'Resume' }).first().click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
  });

  test('keyboard: arrows pick an object, down chooses Reject, and a wrong move costs points', async ({ page }) => {
    await seen(page);
    await page.goto(GAME);
    await page.getByRole('button', { name: 'Start' }).click();
    const hud = page.getByRole('list', { name: 'Game status' });
    await expect(state(page)).toContainText('Objects in the water', { timeout: 10_000 });
    await page.keyboard.press('ArrowRight');
    await expect(state(page)).toContainText('Highlighted: object 2.');
    await page.keyboard.press('ArrowDown');
    await expect(state(page)).toContainText('Tool: Reject');
    await page.keyboard.press('ArrowUp');
    await expect(state(page)).toContainText('Tool: Whack');
    // object 2 from the left: whacking it scores only if it is a boxed or missed larva
    const second = [...(scansOf(SEED, 1)[0] as Scan).items].sort((a, b) => a.x - b.x || a.y - b.y)[1] as ScanItem;
    await page.keyboard.press('Enter');
    await expect(hud.locator('.game-hud__value').first()).toHaveText(second.kind === 'larva' ? (second.boxed ? '50' : '80') : '0');
    // all the way right is the Done tile
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    await expect(state(page)).toContainText('Highlighted: the Done button.');
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText('Tip:');
    await noHorizontalOverflow(page);
  });

  test('five escaped larvae end the game, and the recap explains AI mistakes and dengue prevention', async ({ page }) => {
    test.setTimeout(120_000);
    await seen(page);
    await page.goto(GAME);
    await page.getByRole('button', { name: 'Start' }).click();
    const over = page.getByRole('heading', { level: 2, name: /Good run!|Game over/ });
    const scans = scansOf(SEED, 8);
    let lost = 0;
    for (const [i, scan] of scans.entries()) {
      await expect(state(page)).toContainText(`Scan ${i + 1}:`, { timeout: 12_000 });
      await expect(state(page)).toContainText('Objects in the water', { timeout: 6000 });
      await tapSlot(page, DONE_SLOT);
      await expect(state(page)).toContainText('Tip:', { timeout: 5000 });
      lost += larvaeIn(scan);
      if (lost >= 5) break;
      await page.waitForTimeout(2200);
      await page.keyboard.press('Enter'); // skips the result
    }
    await expect(over).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 3, name: "Ara's recap" })).toBeVisible();
    await expect(page.getByText(/^You checked \d+ containers?: /)).toBeVisible();
    await expect(page.getByText(/^The AI camera's precision was \d+%/)).toBeVisible();
    await expect(page.getByText(/^Dengue mosquitoes breed in clean standing water/)).toBeVisible();
    await expect(page.getByText('Kailan ako magtitiwala? I trust the AI camera as a helper, and my own eyes make the final call.')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await expect(page.getByRole('button', { name: /^Lamok Lamay/ })).toBeVisible();
  });

  test('the Daily Challenge link opens the same-seed run', async ({ page }) => {
    await seen(page);
    await page.goto('/#/arcade/lamok-lamay?seed=daily');
    await expect(page.getByText('Same run for everyone today')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    await expect(state(page)).toContainText(/Scan 1: /);
    await noHorizontalOverflow(page);
  });
});
