import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { createRng } from '../../src/games/engine/rng';
import { COOK_SLOT, slotRect } from '../../src/games/luto-ni-ara/art';
import { INGREDIENTS, createOrderGenerator, type Ingredient, type Order } from '../../src/games/luto-ni-ara/orders';
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
const GAME = `/#/arcade/luto-ni-ara?seed=${SEED}`;
const state = (page: Page): Locator => page.locator('.game-state p');

/** The orders of a seed, derived the same way the game does. */
function ordersOf(seed: string, count: number): Order[] {
  const rng = createRng(seed);
  const gen = createOrderGenerator(createRng(`${rng()}:luto-orders`));
  return Array.from({ length: count }, (_, i) => gen.next(i));
}

/** A canvas point (logical 320x180) in page coordinates. */
async function point(page: Page, x: number, y: number) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + box.width * (x / 320), y: box.y + box.height * (y / 180) };
}

async function tapSlot(page: Page, slot: number) {
  const r = slotRect(slot);
  const p = await point(page, r.x + r.w / 2, r.y + r.h / 2);
  await page.mouse.click(p.x, p.y);
}

async function addAll(page: Page, ids: readonly Ingredient[]) {
  for (const id of ids) await tapSlot(page, INGREDIENTS.indexOf(id));
}

async function seen(page: Page) {
  await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['luto-ni-ara'])));
}

test.describe('Luto ni Ara', () => {
  test("is open in the Arcade and starts with Ara's five-page briefing", async ({ page }) => {
    await page.goto('/#/arcade');
    await expect(page.getByRole('button', { name: /^Luto ni Ara/ })).toHaveAttribute('aria-label', 'Luto ni Ara, Prompting AI well, New');
    await page.goto(GAME);
    const titles = ['Welcome to my kusina!', 'A good prompt is a good recipe', 'How to play', 'Health questions need extras', 'Kailan ako magtitiwala?'];
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const [i, title] of titles.entries()) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      if (i < 4) await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    expect(await stored(page, 'briefingsSeen')).toBe('["luto-ni-ara"]');
  });

  test('cooks a good dish by tap, a wrong dish by keyboard, and pauses', async ({ page }) => {
    test.setTimeout(90_000);
    await seen(page);
    await page.goto(GAME);
    await expect(page.getByRole('heading', { level: 2, name: 'Luto ni Ara' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();

    const hud = page.getByRole('list', { name: 'Game status' });
    await expect(hud.getByRole('img', { name: 'Hearts: 3 of 3' })).toBeVisible();
    const [first, second] = ordersOf(SEED, 2) as [Order, Order];
    await expect(state(page)).toContainText(`Order 1 from ${first.customer.name.toLowerCase()}: "${first.text}"`);
    await expect(state(page)).toContainText('In the pot: nothing yet.');
    await noHorizontalOverflow(page);

    // tap the ingredients the first order asks for, then COOK
    await addAll(page, first.needs);
    await tapSlot(page, COOK_SLOT);
    await expect(state(page)).toContainText(/You served: .+\. Good dish, \d+ points\./, { timeout: 8000 });
    await expect(hud.locator('.game-hud__value').first()).not.toHaveText('0');
    await noHorizontalOverflow(page);

    // the second order: by keyboard, add only the first shelf item and cook, which is a wrong dish
    await expect(state(page)).toContainText(`Order 2 from ${second.customer.name.toLowerCase()}`, { timeout: 10_000 });
    // the mouse still hovers the COOK button, so walk the highlight to the first tile (it stops at the edge)
    for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText('In the pot: audience.', { timeout: 5000 });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(state(page)).toContainText('Highlighted: the Cook button.', { timeout: 5000 });
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText('Wrong dish, you lost a heart.', { timeout: 8000 });
    await expect(hud.getByRole('img', { name: 'Hearts: 2 of 3' })).toBeVisible();

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'How to play' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'How to play' });
    await expect(dialog.getByText(/A customer orders an answer/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await page.getByRole('button', { name: 'Resume' }).first().click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
  });

  test('dragging an ingredient into the pot adds it, tapping it again takes it out', async ({ page }) => {
    await seen(page);
    await page.goto(GAME);
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(state(page)).toContainText('In the pot: nothing yet.');
    const from = slotRect(1);
    const start = await point(page, from.x + from.w / 2, from.y + from.h / 2);
    const mid = await point(page, 140, 110);
    const end = await point(page, 160, 98);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.waitForTimeout(120);
    await page.mouse.move(mid.x, mid.y, { steps: 6 });
    await page.waitForTimeout(120);
    await page.mouse.move(end.x, end.y, { steps: 4 });
    await page.waitForTimeout(120);
    await page.mouse.up();
    await expect(state(page)).toContainText('In the pot: language.', { timeout: 5000 });
    await tapSlot(page, 1);
    await expect(state(page)).toContainText('In the pot: nothing yet.', { timeout: 5000 });
    await noHorizontalOverflow(page);
  });

  test('three wrong dishes close the kitchen, and the recap explains prompts, sources and checking', async ({ page }) => {
    test.setTimeout(120_000);
    await seen(page);
    await page.goto(GAME);
    await page.getByRole('button', { name: 'Start' }).click();
    const over = page.getByRole('heading', { level: 2, name: /Good run!|Game over/ });
    // one good dish first, so there is a score to keep
    await expect(state(page)).toContainText('Order 1 from', { timeout: 10_000 });
    await addAll(page, (ordersOf(SEED, 1) as [Order])[0].needs);
    await tapSlot(page, COOK_SLOT);
    await expect(state(page)).toContainText('Good dish', { timeout: 8000 });
    for (let i = 2; i <= 4; i++) {
      await expect(state(page)).toContainText(`Order ${i} from`, { timeout: 10_000 });
      await tapSlot(page, 0); // audience only: something is always missing
      await tapSlot(page, COOK_SLOT);
      await expect(state(page)).toContainText('Wrong dish, you lost a heart.', { timeout: 8000 });
      await page.waitForTimeout(1000);
      await page.keyboard.press('Enter'); // skips the result
    }
    await expect(over).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 3, name: "Ara's recap" })).toBeVisible();
    await expect(page.getByText(/^You cooked for 4 orders: 1 good dish, 3 wrong dishes/)).toBeVisible();
    await expect(page.getByText(/^The ingredient you missed most: /)).toBeVisible();
    await expect(page.getByText(/^How it works: an AI chatbot answers exactly what you ask/)).toBeVisible();
    await expect(page.getByText(/^For health questions, ask it to cite sources/)).toBeVisible();
    await expect(page.getByText(/^A chatbot can still be wrong/)).toBeVisible();
    await expect(page.getByText('Kailan ako magtitiwala? When an answer shows its sources and admits when it is unsure, and I still check it with a health worker.')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    expect(JSON.parse((await stored(page, 'bestScores')) ?? '{}')).toMatchObject({ 'luto-ni-ara': expect.any(Number) });
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await expect(page.getByRole('button', { name: /^Luto ni Ara/ })).toHaveAttribute('aria-label', /Best \d+/);
  });

  test('the Daily Challenge link opens the same-seed run', async ({ page }) => {
    await seen(page);
    await page.goto('/#/arcade/luto-ni-ara?seed=daily');
    await expect(page.getByText('Same run for everyone today')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    await expect(state(page)).toContainText(/Order 1 from \w+: "/);
    await noHorizontalOverflow(page);
  });
});
