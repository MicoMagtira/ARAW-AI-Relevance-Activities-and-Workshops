import AxeBuilder from '@axe-core/playwright';
import type { Locator, Page } from '@playwright/test';
import { createRng } from '../../src/games/engine/rng';
import { LANE_RECT, tileRect } from '../../src/games/hati-tayo/art';
import { buildDay, buildModulePlay, pickSetting } from '../../src/games/hati-tayo/rules';
import type { Task } from '../../src/games/hati-tayo/tasks';
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

const MODULES_DONE = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06'];

// ---- the arcade game ------------------------------------------------------------------------------------------------
const SEED = 'e2e-a';
const GAME = `/#/arcade/hati-tayo?seed=${SEED}`;
const state = (page: Page): Locator => page.locator('.game-state p');

/** The first day's plan for the seed above, worked out the same way the game does. */
function dayOnePlan() {
  const seed = `${createRng(SEED)()}:hati-days`;
  return buildDay(pickSetting(createRng(`${seed}:setting`)), 1, seed);
}

/** A canvas point (logical 320x180) in page coordinates. */
async function point(page: Page, x: number, y: number) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + box.width * (x / 320), y: box.y + box.height * (y / 180) };
}

async function openArcadeGame(page: Page, { clock = true }: { clock?: boolean } = {}) {
  await page.addInitScript(
    ([done]) => {
      localStorage.setItem('araw:v1:modulesDone', JSON.stringify(done));
      localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['hati-tayo']));
    },
    [MODULES_DONE],
  );
  // a fake clock lets the test run whole seconds of game time quickly and exactly
  if (clock) await page.clock.install();
  await page.goto(GAME);
  await expect(page.getByRole('heading', { level: 2, name: 'Hati Tayo!' })).toBeVisible();
}

test.describe('Hati Tayo! (arcade)', () => {
  test('is locked until Module 6 is done, then open with a five-page briefing', async ({ page }) => {
    await page.goto('/#/arcade/hati-tayo');
    await expect(page.getByText('Finish Module 6 to unlock this game.')).toBeVisible();
    await noHorizontalOverflow(page);
    await page.addInitScript((done) => localStorage.setItem('araw:v1:modulesDone', JSON.stringify(done)), MODULES_DONE);
    await page.goto('/#/arcade');
    await page.reload();
    await expect(page.getByRole('button', { name: /^Hati Tayo!/ })).toHaveAttribute('aria-label', 'Hati Tayo!, AI and jobs, New');
    await page.goto(GAME);
    const titles = ['Thank goodness you are here!', 'AI is a fast helper', 'People do the caring', 'How to play', 'When should I trust it?'];
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    for (const [i, title] of titles.entries()) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
      if (i < 4) await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('araw:v1:briefingsSeen'))).toBe('["hati-tayo"]');
  });

  test('keys, taps and drags send tasks to a lane, and the strip says what happened', async ({ page }) => {
    await openArcadeGame(page);
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('button', { name: 'Start' }).click();

    const hud = page.getByRole('list', { name: 'Game status' });
    const service = hud.getByRole('meter', { name: 'Service' });
    await expect(service).toHaveAttribute('aria-valuenow', '100');
    await expect(state(page)).toContainText('A new day starts with 9 tasks');
    await page.clock.runFor(2600);
    await expect(state(page)).toContainText('Waiting tasks, oldest first. 1:');

    // day 1 opens with a task for AI, then a task for a person
    await page.keyboard.press('ArrowLeft');
    await expect(state(page)).toContainText(/Last result: GOOD SPLIT! \+\d+/);
    await page.clock.runFor(5600);
    await page.keyboard.press('ArrowLeft');
    await expect(state(page)).toContainText('Last result: AI SLIP-UP!');
    await expect(service).toHaveAttribute('aria-valuenow', '86');
    await noHorizontalOverflow(page);

    // a tap on a lane sends the selected task there
    await page.clock.runFor(5600);
    const human = await point(page, LANE_RECT.human.x + 60, LANE_RECT.human.y + 25);
    await page.mouse.click(human.x, human.y);
    await expect(state(page)).toContainText(/Last result: (GOOD SPLIT|DONE, BUT SLOW)/);
    await expect(state(page)).not.toContainText('AI SLIP-UP');
    await expect(state(page)).toContainText('The person is busy');

    // a drag from the queue to the AI lane
    await page.clock.runFor(5600);
    const before = (await state(page).textContent()) ?? '';
    const tile = tileRect(0);
    const from = await point(page, tile.x + tile.w / 2, tile.y + tile.h / 2);
    const to = await point(page, LANE_RECT.ai.x + 60, LANE_RECT.ai.y + 25);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 4 });
    await page.mouse.up();
    await expect(state(page)).not.toHaveText(before);
    await expect(state(page)).toContainText(/Last result: (GOOD SPLIT|DONE, BUT SLOW|AI SLIP-UP)/);
    await expect(hud.getByText('Score')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('a day sent to the right lanes ends with a report and a faster day 2', async ({ page }) => {
    test.setTimeout(90_000);
    await openArcadeGame(page);
    await page.getByRole('button', { name: 'Start' }).click();
    await page.clock.runFor(2600);
    const plan = dayOnePlan();
    expect(plan).toHaveLength(9);
    for (const [i, { task }] of plan.entries()) {
      await page.keyboard.press(task.needs === 'ai' ? 'ArrowLeft' : 'ArrowRight');
      await expect(state(page)).toContainText(/Last result: GOOD SPLIT!/);
      if (i < plan.length - 1) await page.clock.runFor(5600);
    }
    await page.clock.runFor(4500);
    await expect(state(page)).toContainText('Day 1 report: 9 good splits, 0 jobs done slowly by hand, 0 AI slip-ups, 0 missed tasks, clear bonus 25');
    await noHorizontalOverflow(page);
    await page.clock.runFor(900);
    await page.keyboard.press('Enter');
    await expect(state(page)).toContainText('A new day starts with 10 tasks');
    await expect(page.getByRole('list', { name: 'Game status' }).getByText('Day', { exact: true })).toBeVisible();
    expect(await axeSerious(page)).toEqual([]);
  });

  test('letting AI do everything empties the Service meter, and the recap explains AI at work', async ({ page }) => {
    test.setTimeout(120_000);
    await openArcadeGame(page);
    await page.getByRole('button', { name: 'Start' }).click();
    const over = page.getByRole('heading', { level: 2, name: /Good run!|Game over/ });
    for (let i = 0; i < 400 && !(await over.isVisible()); i++) {
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('Enter');
      await page.clock.runFor(1500);
    }
    await expect(over).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: "Ara's recap" })).toBeVisible();
    await expect(page.getByText(/^You kept .* going for \d+ days?:/)).toBeVisible();
    await expect(page.getByText(/^Human in the loop:/)).toBeVisible();
    await expect(page.getByText(/^Someone is always responsible\./)).toBeVisible();
    await expect(page.getByText('When should I trust it? With repeat drafts I can check. I keep care and decisions for people, and someone is always responsible.')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    await page.getByRole('link', { name: 'Back to Arcade' }).click();
    await expect(page).toHaveURL(/#\/arcade$/);
    await expect(page.getByRole('button', { name: /^Hati Tayo!/ })).toBeVisible();
  });

  test('the Daily Challenge link opens the same-seed run', async ({ page }) => {
    await openArcadeGame(page, { clock: false });
    await page.goto('/#/arcade/hati-tayo?seed=daily');
    await expect(page.getByText('Same run for everyone today')).toBeVisible();
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
    await expect(state(page)).toContainText('A new day starts with 9 tasks');
    await noHorizontalOverflow(page);
  });
});

// ---- the module game ----------------------------------------------------------------------------------------------
const MODULE_SEED = 'e2e';

/** Open the game directly (modules 1 to 5 done, all of module 6's lesson cards done). `?seed=` repeats the tasks. */
async function openModuleGame(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8, m03: 8, m04: 8, m05: 8, m06: 8 }));
  });
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await page.goto(`/#/learn/m06?seed=${MODULE_SEED}`);
  await expect(page.getByRole('heading', { level: 2, name: 'Hati Tayo!' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Hati Tayo!' })).toBeVisible();
}

const tasks = buildModulePlay(MODULE_SEED);
const send = (page: Page, lane: 'ai' | 'person') => page.getByRole('button', { name: new RegExp(lane === 'ai' ? '^AI helper' : '^Person') }).click();
const next = (page: Page) => page.getByRole('button', { name: /^(Next task|See the day report)/ }).click();

async function playAll(page: Page, choose: (t: Task) => 'ai' | 'person') {
  for (const t of tasks) {
    await expect(page.getByText(t.text, { exact: true })).toBeVisible();
    await send(page, choose(t));
    await next(page);
  }
}

test.describe('Hati Tayo! (Module 6 game)', () => {
  test('the intro fits the screen, is accessible and puts the start button first', async ({ page }) => {
    await openModuleGame(page);
    await expect(page.getByText(/Kuya Jun's first day with the AI helper/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start the day' })).toBeInViewport();
    await page.getByText('How it works').click();
    await expect(page.getByText('A person is slower, but comforts, decides and answers for the work.')).toBeVisible();
    await checkScreen(page);
  });

  test('a task shows two lane buttons, feedback for each pick and the Service meter', async ({ page }, info) => {
    await openModuleGame(page);
    await page.getByRole('button', { name: 'Start the day' }).click();
    await expect(page.getByText('Count the boxes of vitamins and masks in the stockroom.')).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Tasks done' })).toHaveAttribute('aria-valuetext', 'Task 1 of 8');
    const service = page.getByRole('meter', { name: 'Service' });
    await expect(service).toHaveAttribute('aria-valuenow', '100');
    await checkScreen(page);
    for (const lane of ['AI helper', 'Person']) expect(((await page.getByRole('button', { name: new RegExp(`^${lane}`) }).boundingBox()) ?? { height: 0 }).height).toBeGreaterThanOrEqual(44);
    const task = await page.locator('.hati-task').boundingBox();
    const ask = await page.locator('.hati-ask').boundingBox();
    if (!task || !ask) throw new Error('layout boxes missing');
    if (info.project.name === 'desktop') expect(ask.x).toBeGreaterThan(task.x + task.width - 1);
    else if (info.project.name === 'phone') expect(ask.y).toBeGreaterThanOrEqual(task.y + task.height - 1);

    await send(page, 'ai');
    await expect(page.getByText('Good split!')).toBeVisible();
    await expect(page.getByText('Counting is the same job again and again. AI is fast at it.')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next task/ })).toBeFocused();
    await checkScreen(page);
    await next(page);

    await send(page, 'ai');
    await expect(page.getByText('AI slip-up!')).toBeVisible();
    await expect(page.getByText("The AI told the worried mother 'Error 404: comfort not found'.")).toBeVisible();
    await expect(page.getByText(/^Better: the person\./)).toBeVisible();
    await expect(service).toHaveAttribute('aria-valuenow', '86');
    await checkScreen(page);
    await next(page);

    await send(page, 'person');
    const third = tasks[2] as Task;
    await expect(page.getByText(third.needs === 'ai' ? 'Done, but slow' : 'Good split!')).toBeVisible();
  });

  test('all eight tasks in the right lanes: three stars, then Finish completes the game', async ({ page }) => {
    await openModuleGame(page);
    await page.getByRole('button', { name: 'Start the day' }).click();
    await playAll(page, (t) => (t.needs === 'ai' ? 'ai' : 'person'));
    await expect(page.getByRole('heading', { level: 3, name: 'The day is done!' })).toBeVisible();
    await expect(page.getByText('Good splits: 8 of 8. Done slowly by hand: 0. AI slip-ups: 0.')).toBeVisible();
    await expect(page.getByText(/Working Together at its best/)).toBeVisible();
    await checkScreen(page);
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('every lane wrong still finishes: one star, no fail state', async ({ page }) => {
    await openModuleGame(page);
    await page.getByRole('button', { name: 'Start the day' }).click();
    await playAll(page, (t) => (t.needs === 'ai' ? 'person' : 'ai'));
    await expect(page.getByText('Good splits: 0 of 8. Done slowly by hand: 4. AI slip-ups: 4.')).toBeVisible();
    await expect(page.getByText(/A good start/)).toBeVisible();
    await checkScreen(page);
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
  });
});
