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

/** Wait for entrance animations so axe sees final colours. */
async function settled(page: Page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished' || a.effect?.getTiming().iterations === Infinity));
}

const wide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;
const stored = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(`araw:v1:${k}`), key);

/** The first-run briefing has been seen, so a game opens on its start card. */
async function briefingSeen(page: Page) {
  await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['demo'])));
}

const DEMO = '/#/arcade/demo?seed=e2e-seed';

test.describe('Arcade screen', () => {
  test('shows today\'s featured game, 11 tiles, the practice row and fits every width', async ({ page }) => {
    await page.goto('/#/arcade');
    await expect(page.getByRole('heading', { level: 1, name: 'Arcade' })).toBeVisible();
    await expect(page.getByText("Today's featured game")).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Endless games' })).toBeVisible();
    const tiles = page.locator('.arcade-tile');
    await expect(tiles).toHaveCount(11);
    await expect(page.getByText('4 of 11 ready')).toBeVisible();
    // six open from the start, five behind modules 6 to 10
    await expect(page.locator('.arcade-tile[aria-label$="Coming soon"]')).toHaveCount(2);
    for (const n of [6, 7, 8, 9, 10]) await expect(page.locator(`.arcade-tile[aria-label$="After Module ${n}"]`)).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 2, name: 'Practice' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play Fact or Fake' })).toHaveAttribute('href', '#/play/fact-or-fake');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('picking a tile shows its details (side panel on desktop, a sheet below)', async ({ page }) => {
    await page.goto('/#/arcade');
    await page.getByRole('button', { name: /^Lamok Lamay/ }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Lamok Lamay' })).toBeVisible();
    await expect(page.getByText('How AI sees, and misses').first()).toBeVisible();
    await expect(page.getByText('This game is still being built')).toBeVisible();
    if (wide(page)) {
      await expect(page.getByRole('dialog')).toHaveCount(0);
    } else {
      const dialog = page.getByRole('dialog', { name: 'Game details' });
      await expect(dialog).toBeVisible();
      await settled(page);
      await noHorizontalOverflow(page);
      expect(await axeSerious(page)).toEqual([]);
      await dialog.getByRole('button', { name: 'Close' }).first().click();
      await expect(dialog).toBeHidden();
    }
    await page.getByRole('button', { name: /^Hati Tayo!/ }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Hati Tayo!' })).toBeVisible();
    await expect(page.getByText('Finish Module 6 to add this game to the Arcade.')).toBeVisible();
  });

  test('module games return to Practice once their module is done', async ({ page }) => {
    await page.goto('/#/arcade');
    await expect(page.getByText('After Module 1', { exact: true })).toBeVisible();
    await page.evaluate(() => localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01'])));
    await page.reload();
    await expect(page.getByRole('link', { name: 'Replay in Module 1' })).toHaveAttribute('href', '#/learn/m01');
    await noHorizontalOverflow(page);
  });

  test('unknown, unfinished and locked games open a kind notice, never a broken screen', async ({ page }) => {
    await page.goto('/#/arcade/nope');
    await expect(page.getByRole('heading', { level: 2, name: 'Game not found' })).toBeVisible();
    await page.goto('/#/arcade/lamok-lamay');
    await expect(page.getByRole('heading', { level: 2, name: 'Lamok Lamay' })).toBeVisible();
    await expect(page.getByText('still being built')).toBeVisible();
    await page.goto('/#/arcade/hati-tayo');
    await expect(page.getByText('Finish Module 6 to unlock this game.')).toBeVisible();
    await noHorizontalOverflow(page);
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
  });
});

test.describe('GameShell with the demo game', () => {
  test('first run: Ara\'s five-page briefing, skippable and remembered', async ({ page }) => {
    await page.goto(DEMO);
    await expect(page.getByRole('heading', { level: 2, name: 'Hello, test pilot!' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (let i = 1; i < 5; i++) {
      await expect(page.getByText(`Page ${i} of 5`).first()).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await expect(page.getByRole('heading', { level: 2, name: 'Kailan ako magtitiwala?' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    expect(await stored(page, 'briefingsSeen')).toBe('["demo"]');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible(); // no briefing again
  });

  test('a run: HUD, text description, keys and taps score, pause, game over with recap and XP', async ({ page }) => {
    await briefingSeen(page);
    await page.goto(DEMO);
    await expect(page.getByRole('heading', { level: 2, name: 'Sun Tap' })).toBeVisible();
    await expect(page.getByText('Same run for everyone today')).toHaveCount(0);
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();

    const hud = page.getByRole('list', { name: 'Game status' });
    await expect(hud).toBeVisible();
    await expect(hud.getByText('Score')).toBeVisible();
    await expect(page.getByRole('img', { name: /^Sun Tap\. Score \d+\./ }).or(page.getByRole('img', { name: 'Sun Tap game screen' }))).toBeVisible();
    // three keys, one click on the canvas and one touch-style tap
    for (let i = 0; i < 3; i++) await page.keyboard.press('Space');
    await page.locator('canvas.game-canvas').click();
    await page.keyboard.press('ArrowLeft');
    await expect(hud.locator('.game-hud__value').first()).toHaveText('5', { timeout: 3000 });
    await expect(page.getByText(/Score 5\. [123] of 3 hearts left/)).toBeVisible({ timeout: 3000 });

    // pause with the button, resume
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Resume' }).first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeHidden();

    // stop playing: three missed glows end the run
    const over = page.getByRole('heading', { level: 2, name: 'Good run!' });
    await expect(over).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('+50 XP')).toBeVisible(); // 10 base + 20 good run + 20 new best
    await expect(page.getByText('New personal best!')).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: "Ara's recap" })).toBeVisible();
    await expect(page.getByText('Kailan ako magtitiwala? When I can check who said it.')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    expect(JSON.parse((await stored(page, 'bestScores')) ?? '{}')).toMatchObject({ demo: expect.any(Number) });
    expect(Number(await stored(page, 'xp'))).toBe(50);

    // a second, worse run pays less and keeps the best
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Game over' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('+10 XP')).toBeVisible();
    await expect(page.getByText('New personal best!')).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
  });

  test('pauses when the tab is hidden and with the Escape key; How to play lists the controls', async ({ page }) => {
    await briefingSeen(page);
    await page.goto(DEMO);
    await page.getByRole('button', { name: 'Start' }).click();
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    });
    await page.getByRole('button', { name: 'Resume' }).first().click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await page.getByRole('button', { name: 'How to play' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'How to play' });
    await expect(dialog.getByText('Tap, click or press Space to keep the sun glowing.')).toBeVisible();
    await settled(page);
    expect(await axeSerious(page)).toEqual([]);
    await dialog.getByRole('button', { name: 'Close' }).last().click();
    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Resume' }).first().click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeHidden();
  });

  test('"Pahinga muna!" pauses the game for a recap and a stretch, then play goes on', async ({ page }) => {
    await briefingSeen(page);
    await page.goto('/#/arcade/demo?seed=e2e-seed&break=1.5');
    await page.getByRole('button', { name: 'Start' }).click();
    // the demo run lasts about 3 seconds untouched, so the break (after 1.5 s of play) comes first
    await expect(page.getByRole('heading', { level: 2, name: 'Pahinga muna!' })).toBeVisible();
    await expect(page.getByText(/Stand up, roll your shoulders/)).toBeVisible();
    await expect(page.getByText(/Your run so far: \d+ points/)).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Keep playing' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Pahinga muna!' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeEnabled();
  });

  test('the canvas keeps its aspect ratio, letterboxed and sharp, and follows a resize', async ({ page }) => {
    await briefingSeen(page);
    await page.goto(DEMO);
    await page.getByRole('button', { name: 'Start' }).click();
    const geometry = () =>
      page.evaluate(() => {
        const stage = document.querySelector('.game-stage')?.getBoundingClientRect() as DOMRect;
        const canvas = document.querySelector('canvas.game-canvas') as HTMLCanvasElement;
        const c = canvas.getBoundingClientRect();
        return { stage: { l: stage.left, t: stage.top, r: stage.right, b: stage.bottom }, c: { l: c.left, t: c.top, r: c.right, b: c.bottom, w: c.width, h: c.height }, pw: canvas.width, ph: canvas.height, dpr: devicePixelRatio };
      });
    const check = () =>
      expect(async () => {
      const g = await geometry();
      expect(g.c.l).toBeGreaterThanOrEqual(g.stage.l - 5); // inside the stage (its border is 4px)
      expect(g.c.r).toBeLessThanOrEqual(g.stage.r + 1);
      expect(g.c.t).toBeGreaterThanOrEqual(g.stage.t - 5);
      expect(g.c.b).toBeLessThanOrEqual(g.stage.b + 1);
      expect(Math.abs(g.c.w / g.c.h - 16 / 9)).toBeLessThan(0.03);
      expect(Math.abs(g.c.l - g.stage.l - (g.stage.r - g.c.r))).toBeLessThanOrEqual(6); // centred
      expect(g.pw).toBeGreaterThanOrEqual(Math.floor(g.c.w * g.dpr)); // backing store has at least a pixel per device pixel
      if (g.c.w * g.dpr >= 320) expect(g.pw % 320).toBe(0); // and a whole number per logical pixel (smaller boxes scale down smoothly)
      await noHorizontalOverflow(page);
      }).toPass({ timeout: 5000 });
    await check();
    for (const size of [{ width: 320, height: 640 }, { width: 640, height: 360 }, { width: 1280, height: 720 }, { width: 2560, height: 1200 }, { width: 360, height: 740 }]) {
      await page.setViewportSize(size); // also covers an orientation change
      await check();
    }
  });

  test('every setting on: the game still fits and stays accessible', async ({ page }) => {
    await briefingSeen(page);
    await page.goto('/#/me');
    for (const name of ['Larger text', 'High contrast', 'Extra-large buttons', 'Screen-reader hints', 'Reduce motion']) {
      await page.getByRole('switch', { name }).click();
    }
    await page.goto(DEMO);
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'Read it out' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Sun Tap\. Score/ })).toHaveCount(1);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('leaving mid-run asks first; the close button on a start card goes straight back', async ({ page }) => {
    await briefingSeen(page);
    await page.goto(DEMO);
    await page.getByRole('button', { name: 'Leave game' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await page.goto(DEMO);
    await page.getByRole('button', { name: 'Start' }).click();
    await page.getByRole('button', { name: 'Leave game' }).click();
    const dialog = page.getByRole('dialog', { name: 'Leave this game?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep playing' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Paused' })).toBeVisible();
    await page.getByRole('button', { name: 'Leave game' }).click();
    await page.getByRole('dialog').getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
  });
});
