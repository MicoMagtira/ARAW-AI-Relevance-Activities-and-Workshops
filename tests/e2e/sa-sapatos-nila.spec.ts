import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { personaById, type FixId } from '../../src/games/sa-sapatos-nila/data';
import { beginVisit, install, newGame, serveAtKiosk, takeCounter, tryStep, visitorFor, MODULE_VISITS, type Game } from '../../src/games/sa-sapatos-nila/sim';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

async function settled(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
      .every((a) => a.playState === 'finished'),
  );
}

async function checkScreen(page: Page) {
  await settled(page);
  await noHorizontalOverflow(page);
  expect(await axeSerious(page)).toEqual([]);
}

const MODULE_SEED = 'e2e-m9';
const ARCADE_SEED = 'e2e-a9';
const press = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).click();
const kioskButton = (page: Page) => page.locator('[data-kiosk-press]');

async function openModuleGame(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8, m03: 8, m04: 8, m05: 8, m06: 8, m07: 8, m08: 8, m09: 8 }));
  });
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await page.goto(`/#/learn/m09?seed=${MODULE_SEED}`);
  await expect(page.getByRole('heading', { level: 2, name: 'Sa Sapatos Nila' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Sa Sapatos Nila' })).toBeVisible();
}

/** The fix that serves each of the five module visitors. */
const FIX_FOR: Readonly<Record<string, { id: FixId; button: RegExp }>> = {
  'lola-nena': { id: 'large-text', button: /^Large text/ },
  jun: { id: 'captions', button: /^Captions/ },
  'mang-ben': { id: 'lang-ilocano', button: /^Language: Ilocano/ },
  'kuya-rey': { id: 'lower', button: /^Lower screen/ },
  'aling-pacita': { id: 'counter', button: /^Assisted counter/ },
};

/**
 * Serve visitor `n` of the module game, mirroring every step in the sim. Calls `onStuck` while the visitor is stuck, with the
 * fix panel on screen, before the fix is installed. Returns the mirror.
 */
async function serveVisitor(page: Page, g0: Game, n: number, onStuck?: (id: string) => Promise<void>): Promise<Game> {
  const p = visitorFor(MODULE_SEED, n, 'module');
  let g = beginVisit(g0);
  await expect(page.getByRole('heading', { level: 3, name: `${p.name} comes to the health center` })).toBeVisible();
  await press(page, `Try the kiosk as ${p.name}`);
  // after a fix the player can press the kiosk button again or "Try the kiosk again": both are one try
  let act = () => kioskButton(page).click();
  for (let guard = 0; guard < 10; guard++) {
    const r = tryStep(g, p);
    g = r.game;
    await act();
    act = () => kioskButton(page).click();
    if (r.ok && r.done) {
      g = serveAtKiosk(g, p);
      break;
    }
    if (r.ok) continue;
    await expect(page.getByRole('heading', { level: 3, name: `${p.name} is stuck` })).toBeVisible();
    if (onStuck) await onStuck(p.id);
    const fix = FIX_FOR[p.id] as { id: FixId; button: RegExp };
    await press(page, fix.button);
    g = install(g, fix.id);
    if (fix.id === 'counter') {
      await press(page, 'Go to the assisted counter');
      g = takeCounter(g, p).game;
      break;
    }
    act = () => press(page, 'Try the kiosk again');
  }
  await expect(page.getByRole('heading', { level: 3, name: `${p.name} is served!` })).toBeVisible();
  return g;
}

test.describe('Sa Sapatos Nila (Module 9 game)', () => {
  test('the intro fits the screen, is accessible and puts the start button first', async ({ page }) => {
    await openModuleGame(page);
    await expect(page.getByText(/Five visitors will come/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open the kiosk' })).toBeInViewport();
    await page.getByText('How it works').click();
    await expect(page.getByText(/The game buttons stay clear and easy to use/)).toBeVisible();
    await checkScreen(page);
  });

  test('a visitor arrives with a portrait, the task and fix points, and the layout fits each size', async ({ page }, info) => {
    await openModuleGame(page);
    await press(page, 'Open the kiosk');
    await expect(page.getByRole('heading', { level: 3, name: 'Lola Nena comes to the health center' })).toBeVisible();
    await expect(page.locator('svg.sapatos-person')).toBeVisible();
    await expect(page.locator('svg.sapatos-person')).toHaveAttribute('aria-label', /Lola Nena, 72/);
    await expect(page.getByText('Fix points 2 / 5')).toBeVisible();
    await expect(page.getByText('Visitor 1 of 5')).toBeVisible();
    await checkScreen(page);
    for (const h of await page.locator('.sapatos-card .px-btn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
    const side = await page.locator('.sapatos-side').boundingBox();
    const main = await page.locator('.sapatos-main').boundingBox();
    if (!side || !main) throw new Error('layout boxes missing');
    if (info.project.name === 'phone') expect(main.y).toBeGreaterThanOrEqual(side.y + side.height - 1);
    else expect(main.x).toBeGreaterThan(side.x + side.width - 1);
  });

  test('every simulation filter stays inside the kiosk: the game controls are never blurred, hidden or too small', async ({ page }) => {
    await openModuleGame(page);
    await press(page, 'Open the kiosk');
    let g = newGame(MODULE_SEED, 'module');
    for (let n = 1; n <= MODULE_VISITS; n++) {
      g = await serveVisitor(page, g, n, async (id) => {
        // 1. the filter is on the kiosk's own text only
        const leaks = await page.evaluate(() => {
          const bad: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>('body *')) {
            if (el.closest('.kiosk__fx')) continue;
            const f = getComputedStyle(el).filter;
            if (f && f !== 'none') bad.push(`${el.tagName}.${el.className}: ${f}`);
          }
          return bad;
        });
        expect(leaks, id).toEqual([]);
        // 2. the kiosk and the fix controls stay real, named, focusable and 44px tall
        for (const sel of ['[data-kiosk-press]', '.sapatos-fix', '.sapatos-actions .px-btn']) {
          for (const h of await page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h, `${id} ${sel}`).toBeGreaterThanOrEqual(44);
        }
        await expect(page.locator('.kiosk [aria-hidden="true"] button, .kiosk button[aria-hidden]')).toHaveCount(0);
        // 3. the filter is also written in words, and the screen passes axe and has no sideways scroll
        await expect(page.locator('.sapatos-feel li').first()).toBeVisible();
        await checkScreen(page);
      });
      await press(page, n < MODULE_VISITS ? 'Next visitor' : 'See the result');
    }
  });

  test('shows each barrier as a filter on the kiosk and as words under it', async ({ page }) => {
    await openModuleGame(page);
    await press(page, 'Open the kiosk');
    const seen = new Map<string, () => Promise<void>>([
      [
        'lola-nena',
        async () => {
          await expect(page.locator('.kiosk--blur')).toHaveCount(1);
          await expect(page.getByText(/Everything on the screen is a blur/)).toBeVisible();
        },
      ],
      [
        'jun',
        async () => {
          await expect(page.getByText('Sound only: nothing to read, no captions.')).toBeVisible();
          await expect(page.getByText(/Your queue number is 12/)).toHaveCount(0);
        },
      ],
      [
        'mang-ben',
        async () => {
          await expect(page.locator('.kiosk [aria-hidden="true"]').first()).toBeVisible();
          await expect(page.getByRole('button', { name: 'Book a check-up, tomorrow 9 AM' })).toBeVisible();
          await expect(page.getByText(/only speaks English and Filipino/)).toBeVisible();
        },
      ],
      [
        'kuya-rey',
        async () => {
          await expect(page.locator('.kiosk__zone--high [data-kiosk-press]')).toHaveCount(1);
          await expect(page.getByText('Reach line: out of reach above')).toBeVisible();
        },
      ],
      [
        'aling-pacita',
        async () => {
          await expect(page.getByRole('img', { name: 'A QR code to scan with a smartphone' })).toBeVisible();
          await expect(page.getByText(/does not have one/)).toBeVisible();
        },
      ],
    ]);
    let g = newGame(MODULE_SEED, 'module');
    for (let n = 1; n <= MODULE_VISITS; n++) {
      g = await serveVisitor(page, g, n, async (id) => {
        await seen.get(id)?.();
        seen.delete(id);
      });
      await press(page, n < MODULE_VISITS ? 'Next visitor' : 'See the result');
    }
    expect([...seen.keys()]).toEqual([]);
  });

  test('a keyboard user can install a fix and try again, and focus follows each screen', async ({ page }) => {
    await openModuleGame(page);
    await press(page, 'Open the kiosk');
    let g = newGame(MODULE_SEED, 'module');
    for (let n = 1; n <= MODULE_VISITS; n++) {
      const p = visitorFor(MODULE_SEED, n, 'module');
      if (p.id === 'mang-ben') {
        g = beginVisit(g);
        await press(page, `Try the kiosk as ${p.name}`);
        await kioskButton(page).click();
        await kioskButton(page).click();
        await expect(page.getByRole('heading', { level: 3, name: 'Mang Ben is stuck' })).toBeFocused();
        const ilocano = page.getByRole('button', { name: /^Language: Ilocano/ });
        await ilocano.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByText('This is no longer a barrier for Mang Ben.')).toBeVisible();
        await expect(ilocano).toContainText('Installed');
        await press(page, 'Try the kiosk again');
        await expect(kioskButton(page)).toBeFocused();
        await kioskButton(page).click();
        await expect(page.getByRole('heading', { level: 3, name: 'Mang Ben is served!' })).toBeVisible();
        return;
      }
      g = await serveVisitor(page, g, n);
      await press(page, 'Next visitor');
    }
  });

  test('serving all five visitors with the right fixes gives the result, then Finish completes the game', async ({ page }) => {
    await openModuleGame(page);
    await press(page, 'Open the kiosk');
    let g = newGame(MODULE_SEED, 'module');
    for (let n = 1; n <= MODULE_VISITS; n++) {
      g = await serveVisitor(page, g, n);
      if (n === 1) {
        await expect(page.getByRole('img', { name: '3 of 3 satisfaction stars' })).toBeVisible();
        await checkScreen(page);
      }
      await expect(page.getByText(`Score ${g.score}`, { exact: true })).toBeVisible();
      await press(page, n < MODULE_VISITS ? 'Next visitor' : 'See the result');
    }
    await expect(page.getByRole('heading', { level: 3, name: 'Five visitors done!' })).toBeVisible();
    await expect(page.getByText('People served: 5')).toBeVisible();
    await checkScreen(page);
    await press(page, 'Finish game');
    await expect(page.getByText('Game complete!')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('visitors who leave are a lesson, not a fail: three leave and the module still finishes', async ({ page }) => {
    await openModuleGame(page);
    await press(page, 'Open the kiosk');
    for (let n = 1; n <= 3; n++) {
      const name = visitorFor(MODULE_SEED, n, 'module').name;
      await press(page, `Try the kiosk as ${name}`);
      const leave = page.getByRole('button', { name: `Let ${name} leave` });
      for (let guard = 0; guard < 6 && !(await leave.isVisible()); guard++) await kioskButton(page).click();
      await leave.click();
      await expect(page.getByRole('heading', { level: 3, name: `${name} left without help` })).toBeVisible();
      if (n === 1) await checkScreen(page);
      await press(page, n < 3 ? 'Next visitor' : 'See the result');
    }
    await expect(page.getByRole('heading', { level: 3, name: 'The health center closes for today' })).toBeVisible();
    await checkScreen(page);
    await press(page, 'Finish game');
    await expect(page.getByText('Game complete!')).toBeVisible();
  });
});

test.describe('Sa Sapatos Nila (Arcade)', () => {
  const ARCADE = `/#/arcade/sa-sapatos-nila?seed=${ARCADE_SEED}`;
  const unlock = (page: Page) => page.addInitScript(() => window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09'])));

  test('stays locked until Module 9 is done, with a kind notice', async ({ page }) => {
    await page.goto('/#/arcade/sa-sapatos-nila');
    await expect(page.getByText('Finish Module 9 to unlock this game.')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('has no clock: the visitor counter, score and a Finish run button, and Finish run ends the run', async ({ page }) => {
    await unlock(page);
    await page.goto(ARCADE);
    await expect(page.getByRole('heading', { level: 3, name: 'Sa Sapatos Nila' })).toBeVisible();
    await expect(page.getByText(/Visitors keep coming/)).toBeVisible();
    await checkScreen(page);
    await press(page, 'Open the kiosk');
    await expect(page.locator('.sapatos-hud')).toContainText('Visitor 1');
    await expect(page.getByText('Score 0', { exact: true })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveCount(0);
    await press(page, 'Finish run');
    await expect(page.getByRole('heading', { level: 3, name: 'Run finished' })).toBeVisible();
    await checkScreen(page);
  });

  test('letting three visitors leave closes the health center, saves the run, and Play again starts over', async ({ page }) => {
    await unlock(page);
    await page.goto(ARCADE);
    await press(page, 'Open the kiosk');
    for (let n = 1; n <= 3; n++) {
      const name = visitorFor(ARCADE_SEED, n, 'arcade').name;
      await press(page, `Try the kiosk as ${name}`);
      const leave = page.getByRole('button', { name: `Let ${name} leave` });
      for (let guard = 0; guard < 6 && !(await leave.isVisible()); guard++) await kioskButton(page).click();
      await leave.click();
      await press(page, n < 3 ? 'Next visitor' : 'See the result');
    }
    await expect(page.getByRole('heading', { level: 3, name: 'The health center closes for today' })).toBeVisible();
    await expect(page.getByText('People who left: 3')).toBeVisible();
    await checkScreen(page);
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Sa Sapatos Nila' })).toBeVisible();
    await page.goto('/#/arcade');
    await expect(page.locator('.arcade-tile[aria-label^="Sa Sapatos Nila"]')).toHaveAttribute('aria-label', /New|Best/);
    await noHorizontalOverflow(page);
  });

  test('knows its visitors by name (Lola Nena first)', async ({ page }) => {
    await unlock(page);
    await page.goto(ARCADE);
    await press(page, 'Open the kiosk');
    await expect(page.getByRole('heading', { level: 3, name: `${personaById('lola-nena').name} comes to the health center` })).toBeVisible();
  });
});
