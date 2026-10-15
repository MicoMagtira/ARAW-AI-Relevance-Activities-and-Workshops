import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { BOUNDARIES, type BoundaryId, type Moment, type MomentOption } from '../../src/games/tulog-na-bea/moments';
import { buildDay, choose, endDay, newGame, toggleBoundary, type Game } from '../../src/games/tulog-na-bea/sim';
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

const MODULE_SEED = 'e2e-m8';
const ARCADE_SEED = 'e2e-a8';
const total = (o: MomentOption) => o.fx.reduce((a, b) => a + b, 0);
const wise = (m: Moment): MomentOption => m.options.reduce((a, b) => (total(b) > total(a) ? b : a));
const greedy = (m: Moment): MomentOption => m.options.find((o) => o.pull) ?? (m.options[0] as MomentOption);

async function openModuleGame(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8, m03: 8, m04: 8, m05: 8, m06: 8, m07: 8, m08: 8 }));
  });
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await page.goto(`/#/learn/m08?seed=${MODULE_SEED}`);
  await expect(page.getByRole('heading', { level: 2, name: 'Tulog na, Bea!' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Tulog na, Bea!' })).toBeVisible();
}

const press = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).click();
const meter = (page: Page, name: string) => page.getByRole('meter', { name });

/** Play one full day (the plan is already on screen), mirroring every step in the sim. Returns the mirror. */
async function playDay(page: Page, seed: string, g0: Game, policy: (m: Moment) => MomentOption, afterFirst?: () => Promise<void>): Promise<Game> {
  let g = g0;
  await press(page, new RegExp(`^Start day ${g.day}`));
  let first = true;
  for (const m of buildDay(seed, g.day, g.boundaries)) {
    const o = policy(m);
    await expect(page.getByRole('heading', { level: 3, name: m.title, exact: true })).toBeVisible();
    if (first && afterFirst) await afterFirst();
    first = false;
    await page.getByRole('button', { name: o.text, exact: true }).click();
    g = choose(g, m, o).game;
    if (g.reset) {
      await press(page, /^See the result/);
      return g;
    }
    await press(page, g.slot >= 6 ? /^Go to sleep/ : /^Next part of the day/);
  }
  return endDay(g).game;
}

/** A reset day that came overnight leaves the summary on screen; one that came during the day already went to the result. */
async function seeResultIfWaiting(page: Page) {
  const next = page.getByRole('button', { name: /^See the result/ });
  if (await next.count()) await next.click();
}

test.describe('Tulog na, Bea! (Module 8 game)', () => {
  test('the intro fits the screen, is accessible and puts the start button first', async ({ page }) => {
    await openModuleGame(page);
    await expect(page.getByText(/Help Bea through three days/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Start the first day/ })).toBeInViewport();
    await page.getByText('How it works').click();
    await expect(page.getByText(/Four meters: Sleep, Mood, Study and Social/)).toBeVisible();
    await checkScreen(page);
  });

  test('the morning plan shows Bea, four meters and four boundaries with their costs, and lays out for each size', async ({ page }, info) => {
    await openModuleGame(page);
    await press(page, /^Start the first day/);
    await expect(page.getByRole('heading', { level: 3, name: 'Morning plan, day 1' })).toBeVisible();
    await expect(page.locator('svg.bea-scene')).toBeVisible();
    await expect(page.locator('svg.bea-scene')).toHaveAttribute('aria-label', /^Bea looks happy\. It is Morning, 6 to 8 AM\./);
    for (const m of ['Sleep', 'Mood', 'Study', 'Social']) await expect(meter(page, m)).toHaveAttribute('aria-valuenow', '70');
    await expect(page.locator('.tulog-bound')).toHaveCount(4);
    await expect(page.getByText('Mood −5 now, Mood −2 a day: fewer late-night chats and videos.')).toBeVisible();
    await checkScreen(page);

    for (const sel of ['.tulog-bound', '.tulog-card .px-btn']) {
      for (const h of await page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
    }
    const side = await page.locator('.tulog-side').boundingBox();
    const main = await page.locator('.tulog-main').boundingBox();
    if (!side || !main) throw new Error('layout boxes missing');
    if (info.project.name === 'phone') expect(main.y).toBeGreaterThanOrEqual(side.y + side.height - 1);
    else expect(main.x).toBeGreaterThan(side.x + side.width - 1);
  });

  test('a boundary costs a little right away, and a keyboard user can switch it on and off', async ({ page }) => {
    await openModuleGame(page);
    await press(page, /^Start the first day/);
    const focus = page.getByRole('button', { name: /^Focus mode/ });
    // a new screen puts focus on its heading: wait for that before moving focus ourselves
    await expect(page.getByRole('heading', { level: 3, name: 'Morning plan, day 1' })).toBeFocused();
    await focus.focus();
    await page.keyboard.press('Enter');
    await expect(focus).toHaveAttribute('aria-pressed', 'true');
    await expect(meter(page, 'Social')).toHaveAttribute('aria-valuenow', '64');
    await page.keyboard.press('Space');
    await expect(focus).toHaveAttribute('aria-pressed', 'false');
    await checkScreen(page);
  });

  test('a moment offers three choices; choosing shows what it did and why, then the day goes on', async ({ page }) => {
    await openModuleGame(page);
    await press(page, /^Start the first day/);
    await press(page, /^Start day 1/);
    const [first] = buildDay(MODULE_SEED, 1, []) as [Moment];
    await expect(page.getByRole('heading', { level: 3, name: first.title, exact: true })).toBeVisible();
    await expect(page.getByText(/^Part 1 of 6: Morning/)).toBeVisible();
    await expect(page.locator('.tulog-opt')).toHaveCount(3);
    await checkScreen(page);
    for (const h of await page.locator('.tulog-opt').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
    const o = greedy(first);
    await page.getByRole('button', { name: o.text, exact: true }).click();
    await expect(page.getByText(o.lesson, { exact: true })).toBeVisible();
    await expect(page.locator('.tulog-fx .px-chip').first()).toBeVisible();
    if (first.source) await expect(page.getByText(/^Design trick:/)).toBeVisible();
    await checkScreen(page);
    await press(page, /^Next part of the day/);
    await expect(page.getByText(/^Part 2 of 6: School/)).toBeVisible();
  });

  test('three balanced days with boundaries give the result, then Finish completes the game', async ({ page }) => {
    await openModuleGame(page);
    await press(page, /^Start the first day/);
    let g = newGame(MODULE_SEED);
    for (const b of ['focus', 'dinner', 'bedtime', 'mute'] as BoundaryId[]) {
      await press(page, new RegExp(`^${BOUNDARIES.find((x) => x.id === b)?.name}`));
      g = toggleBoundary(g, b);
    }
    for (let day = 1; day <= 3; day++) {
      g = await playDay(page, MODULE_SEED, g, wise);
      await expect(page.getByRole('heading', { level: 3, name: /^Day \d/ })).toBeVisible();
      if (day === 1) await checkScreen(page);
      if (day < 3) await press(page, new RegExp(`^Plan day ${day + 1}`));
      else await press(page, /^See the result/);
    }
    await expect(page.getByRole('heading', { level: 3, name: 'Three days done!' })).toBeVisible();
    await expect(page.getByText('Days finished: 3')).toBeVisible();
    await expect(page.getByText(`Good days: ${g.goodDays}`)).toBeVisible();
    await checkScreen(page);
    await press(page, 'Finish game');
    await expect(page.getByText('Game complete!')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('a reset day is a gentle lesson with the 1553 hotline, and the module still finishes', async ({ page }) => {
    await openModuleGame(page);
    await press(page, /^Start the first day/);
    let g = newGame(MODULE_SEED);
    for (let day = 1; day <= 3 && !g.reset; day++) {
      g = await playDay(page, MODULE_SEED, g, greedy);
      if (g.reset) await seeResultIfWaiting(page);
      else await press(page, day < 3 ? new RegExp(`^Plan day ${day + 1}`) : /^See the result/);
    }
    await expect(page.getByRole('heading', { level: 3, name: /^(Bea needs a reset day|Three days done!)$/ })).toBeVisible();
    await expect(page.getByText(/crisis hotline, 1553/)).toBeVisible();
    await checkScreen(page);
    await press(page, 'Finish game');
    await expect(page.getByText('Game complete!')).toBeVisible();
  });
});

test.describe('Tulog na, Bea! (Arcade)', () => {
  const ARCADE = `/#/arcade/tulog-na-bea?seed=${ARCADE_SEED}`;
  const unlock = (page: Page) => page.addInitScript(() => window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08'])));

  test('stays locked until Module 8 is done, with a kind notice', async ({ page }) => {
    await page.goto('/#/arcade/tulog-na-bea');
    await expect(page.getByText('Finish Module 8 to unlock this game.')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('has no clock: the day counter, score and a Finish run button, and Finish run ends the run', async ({ page }) => {
    await unlock(page);
    await page.goto(ARCADE);
    await expect(page.getByRole('heading', { level: 3, name: 'Tulog na, Bea!' })).toBeVisible();
    await expect(page.getByText(/Keep Bea balanced through day after day/)).toBeVisible();
    await checkScreen(page);
    await press(page, /^Start the first day/);
    await expect(page.getByText('Day 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Score 0', { exact: true })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveCount(0);
    await press(page, 'Finish run');
    await expect(page.getByRole('heading', { level: 3, name: 'Run finished' })).toBeVisible();
    await checkScreen(page);
  });

  test('giving in every time ends the run with a reset day, saves it, and Play again starts over', async ({ page }) => {
    await unlock(page);
    await page.goto(ARCADE);
    await press(page, /^Start the first day/);
    let g = newGame(ARCADE_SEED);
    while (!g.reset) {
      g = await playDay(page, ARCADE_SEED, g, greedy);
      if (g.reset) await seeResultIfWaiting(page);
      else await press(page, new RegExp(`^Plan day ${g.day}`));
    }
    await expect(page.getByRole('heading', { level: 3, name: 'Bea needs a reset day' })).toBeVisible();
    await expect(page.getByText(`Days finished: ${g.day - 1}`)).toBeVisible();
    await checkScreen(page);
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Tulog na, Bea!' })).toBeVisible();
    await page.goto('/#/arcade');
    await expect(page.locator('.arcade-tile[aria-label^="Tulog na, Bea!"]')).toHaveAttribute('aria-label', /New|Best/);
    await noHorizontalOverflow(page);
  });
});
