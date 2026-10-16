import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { createRng } from '../../src/games/engine/rng';
import { HANGUP_SLOT, HELP_SLOT, slotRect } from '../../src/games/sino-to/art';
import { CHECKS, createCallGenerator, type Call, type CheckId } from '../../src/games/sino-to/calls';
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
const GAME = `/#/arcade/sino-to?seed=${SEED}`;
const state = (page: Page): Locator => page.locator('.game-state p');

/** The calls of a seed, derived the same way the game does. */
function callsOf(seed: string, count: number): Call[] {
  const rng = createRng(seed);
  const gen = createCallGenerator(createRng(`${rng()}:sino-calls`));
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

async function seen(page: Page) {
  await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['sino-to'])));
}

test.describe("Sino 'To?", () => {
  test("is open in the Arcade and starts with Ara's five-page briefing", async ({ page }) => {
    await page.goto('/#/arcade');
    await expect(page.getByRole('button', { name: /^Sino 'To\?/ })).toHaveAttribute('aria-label', "Sino 'To?, Voice-clone scams, New");
    await page.goto(GAME);
    const titles = ['Ring ring! Who is this?', 'AI can copy a voice', 'How to play', 'Hurry is the red flag', 'When should I trust it?'];
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const [i, title] of titles.entries()) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      if (i < 4) await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    expect(await stored(page, 'briefingsSeen')).toBe('["sino-to"]');
  });

  test('verifies a call by tap, decides rightly, sees the stamp text, and pauses', async ({ page }) => {
    test.setTimeout(90_000);
    await seen(page);
    await page.goto(GAME);
    await expect(page.getByRole('heading', { level: 2, name: "Sino 'To?" })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();

    const hud = page.getByRole('list', { name: 'Game status' });
    await expect(hud.getByRole('img', { name: 'Hearts: 3 of 3' })).toBeVisible();
    const [first, second] = callsOf(SEED, 2) as [Call, Call];
    await expect(state(page)).toContainText(`"${first.text}"`);
    await expect(state(page)).toContainText('Checks made: none yet.');
    await noHorizontalOverflow(page);

    // make a check that settles it, then decide
    const check = first.decisive[0] as CheckId;
    await tapSlot(page, CHECKS.indexOf(check));
    await expect(state(page)).toContainText(first.results[check].text);
    await expect(state(page)).toContainText('That settles it.');
    await tapSlot(page, first.scam ? HANGUP_SLOT : HELP_SLOT);
    await expect(state(page)).toContainText(first.scam ? 'ARAW GAME FAKE stamp' : 'Genuine call stamp');
    await expect(state(page)).toContainText(first.story.lesson);
    await expect(hud.locator('.game-hud__value').first()).toHaveText('160');
    await noHorizontalOverflow(page);

    // the second call comes after the reveal
    await expect(state(page)).toContainText(`"${second.text}"`, { timeout: 10_000 });

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'How to play' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'How to play' });
    await expect(dialog.getByText(/Calls and voice notes come in as transcripts/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await page.getByRole('button', { name: 'Resume' }).first().click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
  });

  test('keyboard: arrows pick a check and a decision, and a wrong decision costs a heart', async ({ page }) => {
    await seen(page);
    await page.goto(GAME);
    await page.getByRole('button', { name: 'Start' }).click();
    const hud = page.getByRole('list', { name: 'Game status' });
    const first = callsOf(SEED, 1)[0] as Call;
    await expect(state(page)).toContainText(`"${first.text}"`);
    await page.keyboard.press('ArrowRight');
    await expect(state(page)).toContainText('Highlighted: the check to call back the saved number', { timeout: 5000 });
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText(first.results.callback.text, { timeout: 5000 });
    // the wrong decision: help a fake, or hang up on a real call
    await page.keyboard.press('ArrowDown');
    if (first.scam) {
      await expect(state(page)).toContainText('Highlighted: the Help them button', { timeout: 5000 });
    } else {
      await page.keyboard.press('ArrowRight');
      await expect(state(page)).toContainText('Highlighted: the Hang up and report button', { timeout: 5000 });
    }
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText(first.scam ? 'You helped a scammer and lost a heart.' : 'You hung up on a real call and lost a heart.');
    await expect(hud.getByRole('img', { name: 'Hearts: 2 of 3' })).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('three wrong decisions close the switchboard, and the recap explains clones and verifying', async ({ page }) => {
    test.setTimeout(120_000);
    await seen(page);
    await page.goto(GAME);
    await page.getByRole('button', { name: 'Start' }).click();
    const over = page.getByRole('heading', { level: 2, name: /Good run!|Game over/ });
    const calls = callsOf(SEED, 4);
    // one right answer first, so there is a score to keep
    const first = calls[0] as Call;
    await expect(state(page)).toContainText('Call 1, ', { timeout: 10_000 });
    await tapSlot(page, CHECKS.indexOf(first.decisive[0] as CheckId));
    await tapSlot(page, first.scam ? HANGUP_SLOT : HELP_SLOT);
    await expect(state(page)).toContainText('points.', { timeout: 8000 });
    for (let i = 1; i <= 3; i++) {
      const call = calls[i] as Call;
      await expect(state(page)).toContainText(`Call ${i + 1}, `, { timeout: 12_000 });
      await tapSlot(page, call.scam ? HELP_SLOT : HANGUP_SLOT);
      await expect(state(page)).toContainText('lost a heart', { timeout: 8000 });
      await page.waitForTimeout(1300);
      await page.keyboard.press('Enter'); // skips the reveal
    }
    await expect(over).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { level: 3, name: "Ara's recap" })).toBeVisible();
    await expect(page.getByText(/^You took 4 calls: /)).toBeVisible();
    await expect(page.getByText(/^How it works: AI can copy a voice from a short clip/)).toBeVisible();
    await expect(page.getByText(/^Verify through a number or a person you already know/)).toBeVisible();
    await expect(page.getByText('When should I trust it? After I verify the call through a number or a person I already know, never the voice alone.')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    expect(JSON.parse((await stored(page, 'bestScores')) ?? '{}')).toMatchObject({ 'sino-to': expect.any(Number) });
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await expect(page.getByRole('button', { name: /^Sino 'To\?/ })).toHaveAttribute('aria-label', /Best \d+/);
  });

  test('the Daily Challenge link opens the same-seed run', async ({ page }) => {
    await seen(page);
    await page.goto('/#/arcade/sino-to?seed=daily');
    await expect(page.getByText('Same run for everyone today')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    await expect(state(page)).toContainText(/Call 1, .+: "/);
    await noHorizontalOverflow(page);
  });
});
