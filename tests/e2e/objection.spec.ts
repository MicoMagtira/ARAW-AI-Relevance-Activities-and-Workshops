import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { buildCase, type Case } from '../../src/games/objection/sim';
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

const MODULE_SEED = 'e2e-m10';
const ARCADE_SEED = 'e2e-a10';
const press = (page: Page, name: string | RegExp) => page.getByRole('button', { name }).click();

/** Click the evidence card with this title. */
const present = (page: Page, title: string) => page.locator('.objection-card--pick', { has: page.locator('.objection-card__title', { hasText: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).click();

async function goTo(page: Page, c: Case, index: number) {
  for (let i = 0; i < index; i++) await press(page, 'Next statement');
  await expect(page.getByText(`Statement ${index + 1} of ${c.statements.length}`, { exact: true })).toBeVisible();
}

async function openModuleGame(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8, m03: 8, m04: 8, m05: 8, m06: 8, m07: 8, m08: 8, m09: 8, m10: 8 }));
  });
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await page.goto(`/#/learn/m10?seed=${MODULE_SEED}`);
  await expect(page.getByRole('heading', { level: 2, name: 'OBJECTION!' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'OBJECTION!' })).toBeVisible();
}

/** Win case `no` of the module: step to the false statement, object, present the proof. Returns the case. */
async function winCase(page: Page, no: number): Promise<Case> {
  const c = buildCase(MODULE_SEED, 'module', no);
  await expect(page.getByRole('heading', { level: 3, name: c.title })).toBeVisible();
  await press(page, 'Begin the hearing');
  await goTo(page, c, c.lieIndex);
  await press(page, 'OBJECTION!');
  const proof = c.evidence.find((e) => e.id === c.proofId);
  await present(page, proof?.title as string);
  await expect(page.getByRole('heading', { level: 3, name: 'Case closed!' })).toBeVisible();
  return c;
}

test.describe('OBJECTION! (Module 10 game)', () => {
  test('the intro fits the screen, is accessible and puts the start button first', async ({ page }) => {
    await openModuleGame(page);
    await expect(page.getByText(/Three cases are waiting/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter the hall' })).toBeInViewport();
    await expect(page.locator('svg.objection-hall')).toBeVisible();
    await expect(page.locator('svg.objection-hall')).toHaveAttribute('aria-label', /barangay hall/);
    await page.getByText('How it works').click();
    await expect(page.getByText(/every person, clinic and app is made up/)).toBeVisible();
    await checkScreen(page);
  });

  test('the case file and the hearing lay out for each size, with every control reachable', async ({ page }, info) => {
    await openModuleGame(page);
    const c = buildCase(MODULE_SEED, 'module', 1);
    await press(page, 'Enter the hall');
    await expect(page.getByRole('heading', { level: 3, name: c.title })).toBeVisible();
    await expect(page.getByText(c.brief)).toBeVisible();
    await checkScreen(page);
    await press(page, 'Begin the hearing');
    await expect(page.getByRole('heading', { level: 3, name: `Testimony: ${c.witness}` })).toBeVisible();
    await expect(page.getByText(`Statement 1 of ${c.statements.length}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Strikes 0 / 3')).toBeVisible();
    for (const name of ['Back', 'Next statement', 'Press', 'OBJECTION!']) await expect(page.getByRole('button', { name })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Court record' })).toBeVisible();
    await expect(page.locator('.objection-card')).toHaveCount(c.evidence.length);
    await checkScreen(page);
    for (const h of await page.locator('.objection-panel .px-btn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
    const side = await page.locator('.objection-side').boundingBox();
    const main = await page.locator('.objection-main').boundingBox();
    if (!side || !main) throw new Error('layout boxes missing');
    if (info.project.name === 'phone') expect(main.y).toBeGreaterThanOrEqual(side.y + side.height - 1);
    else expect(main.x).toBeGreaterThan(side.x + side.width - 1);
  });

  test('statements scroll one at a time, Press shows a detail, and the list jumps back', async ({ page }) => {
    await openModuleGame(page);
    const c = buildCase(MODULE_SEED, 'module', 1);
    await press(page, 'Enter the hall');
    await press(page, 'Begin the hearing');
    await press(page, 'Press');
    await expect(page.getByText(c.statements[0]?.press as string)).toBeVisible();
    await press(page, 'Next statement');
    await expect(page.getByText(`Statement 2 of ${c.statements.length}`, { exact: true })).toBeVisible();
    await expect(page.getByText(c.statements[0]?.press as string)).toHaveCount(0);
    await page.getByText('Statements so far').click();
    await page.getByRole('button', { name: c.statements[0]?.text as string }).click();
    await expect(page.getByText(`Statement 1 of ${c.statements.length}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Strikes 0 / 3')).toBeVisible();
    await checkScreen(page);
  });

  test('presenting evidence shows the OBJECTION! shout and every card as a button; Take it back costs nothing', async ({ page }) => {
    await openModuleGame(page);
    const c = buildCase(MODULE_SEED, 'module', 1);
    await press(page, 'Enter the hall');
    await press(page, 'Begin the hearing');
    await press(page, 'OBJECTION!');
    await expect(page.getByRole('heading', { level: 3, name: 'Present your evidence against statement 1' })).toBeFocused();
    await expect(page.locator('.objection-shout')).toHaveText('OBJECTION!');
    await expect(page.locator('.objection-card--pick')).toHaveCount(c.evidence.length);
    await checkScreen(page);
    await press(page, 'Take it back, no strike');
    await expect(page.getByText('Strikes 0 / 3')).toBeVisible();
  });

  test('a wrong objection is overruled with the reason, costs a strike, and the statement is marked', async ({ page }) => {
    await openModuleGame(page);
    const c = buildCase(MODULE_SEED, 'module', 1);
    const wrong = c.statements.findIndex((_, i) => i !== c.lieIndex);
    await press(page, 'Enter the hall');
    await press(page, 'Begin the hearing');
    await goTo(page, c, wrong);
    await press(page, 'OBJECTION!');
    await present(page, c.evidence[0]?.title as string);
    await expect(page.getByRole('heading', { level: 3, name: 'Overruled! That statement is true.' })).toBeFocused();
    await expect(page.getByText(c.statements[wrong]?.why as string)).toBeVisible();
    await expect(page.getByText('Strike 1 of 3')).toBeVisible();
    await checkScreen(page);
    await press(page, 'Back to the testimony');
    await expect(page.getByText('Ruled true', { exact: true })).toBeVisible();
    await expect(page.getByText('Strikes 1 / 3')).toBeVisible();
    await expect(page.getByRole('button', { name: 'OBJECTION!' })).toHaveAttribute('aria-disabled', 'true');
  });

  test('the right statement with the wrong card is a strike with its own message', async ({ page }) => {
    await openModuleGame(page);
    const c = buildCase(MODULE_SEED, 'module', 1);
    const decoy = c.evidence.find((e) => e.id !== c.proofId);
    await press(page, 'Enter the hall');
    await press(page, 'Begin the hearing');
    await goTo(page, c, c.lieIndex);
    await press(page, 'OBJECTION!');
    await present(page, decoy?.title as string);
    await expect(page.getByRole('heading', { level: 3, name: 'Right statement, wrong evidence' })).toBeVisible();
    await expect(page.getByText(/does not prove it/)).toBeVisible();
    await checkScreen(page);
  });

  test('winning a case shows the case-closed summary with the proof, the why and the real-life path', async ({ page }) => {
    await openModuleGame(page);
    await press(page, 'Enter the hall');
    const c = await winCase(page, 1);
    await expect(page.getByRole('heading', { level: 3, name: 'Case closed!' })).toBeFocused();
    await expect(page.getByText(c.statements[c.lieIndex]?.why as string)).toBeVisible();
    await expect(page.getByText(c.lesson)).toBeVisible();
    await expect(page.getByText('No wrong objections: +50')).toBeVisible();
    await expect(page.getByText(/National Privacy Commission/).first()).toBeVisible();
    await checkScreen(page);
  });

  test('winning all three cases gives the result, then Finish completes the module', async ({ page }) => {
    await openModuleGame(page);
    await press(page, 'Enter the hall');
    for (let no = 1; no <= 3; no++) {
      await winCase(page, no);
      await press(page, no < 3 ? 'Next case' : 'See the result');
    }
    await expect(page.getByRole('heading', { level: 3, name: 'The hearing is over!' })).toBeVisible();
    await expect(page.getByText('Cases won: 3')).toBeVisible();
    await expect(page.getByText('Educational, not legal advice.')).toBeVisible();
    await checkScreen(page);
    await press(page, 'Finish game');
    await expect(page.getByText('Game complete!')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('three strikes adjourn the hearing, show the false statement, and the module still finishes', async ({ page }) => {
    await openModuleGame(page);
    const c = buildCase(MODULE_SEED, 'module', 1);
    const wrongs = c.statements.map((_, i) => i).filter((i) => i !== c.lieIndex);
    await press(page, 'Enter the hall');
    await press(page, 'Begin the hearing');
    for (let n = 0; n < 3; n++) {
      // jump with the statements list, so each wrong objection starts from anywhere
      await page.getByText('Statements so far').click();
      await page.getByRole('button', { name: c.statements[wrongs[n] as number]?.text as string }).click();
      await press(page, 'OBJECTION!');
      await present(page, c.evidence[0]?.title as string);
      await expect(page.getByText(`Strike ${n + 1} of 3`)).toBeVisible();
      await press(page, n < 2 ? 'Back to the testimony' : 'See the verdict');
    }
    await expect(page.getByRole('heading', { level: 3, name: 'Three strikes: the hearing is adjourned' })).toBeVisible();
    await expect(page.getByText(c.statements[c.lieIndex]?.why as string)).toBeVisible();
    await checkScreen(page);
    await press(page, 'Finish game');
    await expect(page.getByText('Game complete!')).toBeVisible();
  });

  test('works from the keyboard: Next, Press and OBJECTION! are real buttons with focus rings', async ({ page }) => {
    await openModuleGame(page);
    await press(page, 'Enter the hall');
    await press(page, 'Begin the hearing');
    // the hearing moves focus to the first statement when it opens; wait for that before taking focus
    await expect(page.locator('.objection-bubble')).toBeFocused();
    const next = page.getByRole('button', { name: 'Next statement' });
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/^Statement 2 of/)).toBeVisible();
    await page.getByRole('button', { name: 'Press' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.objection-press')).toBeVisible();
    const outline = await page.getByRole('button', { name: 'OBJECTION!' }).evaluate((el) => {
      (el as HTMLElement).focus();
      return getComputedStyle(el).outlineStyle;
    });
    expect(outline).not.toBe('none');
  });
});

test.describe('OBJECTION! (Arcade)', () => {
  const ARCADE = `/#/arcade/objection?seed=${ARCADE_SEED}`;
  const unlock = (page: Page) => page.addInitScript(() => window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'])));

  test('stays locked until Module 10 is done, with a kind notice', async ({ page }) => {
    await page.goto('/#/arcade/objection');
    await expect(page.getByText('Finish Module 10 to unlock this game.')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('has no clock: the case number, score, strikes and Finish run; Finish run ends the run', async ({ page }) => {
    await unlock(page);
    await page.goto(ARCADE);
    await expect(page.getByRole('heading', { level: 3, name: 'OBJECTION!' })).toBeVisible();
    await expect(page.getByText(/the run ends on your third strike/)).toBeVisible();
    await checkScreen(page);
    await press(page, 'Enter the hall');
    await expect(page.locator('.objection-hud')).toContainText('Case 1');
    await expect(page.getByText('Score 0', { exact: true })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveCount(0);
    await press(page, 'Finish run');
    await expect(page.getByRole('heading', { level: 3, name: 'Run finished' })).toBeVisible();
    await checkScreen(page);
  });

  test('winning cases scores points, three strikes end the run, the run is saved and Play again starts over', async ({ page }) => {
    await unlock(page);
    await page.goto(ARCADE);
    await press(page, 'Enter the hall');
    const c1 = buildCase(ARCADE_SEED, 'arcade', 1);
    await expect(page.getByRole('heading', { level: 3, name: c1.title })).toBeVisible();
    await press(page, 'Begin the hearing');
    await goTo(page, c1, c1.lieIndex);
    await press(page, 'OBJECTION!');
    await present(page, c1.evidence.find((e) => e.id === c1.proofId)?.title as string);
    await expect(page.getByText('Score 150', { exact: true })).toBeVisible();
    await press(page, 'Next case');
    // case 2: three wrong objections, jumping through the statements list
    const c2 = buildCase(ARCADE_SEED, 'arcade', 2);
    await expect(page.getByRole('heading', { level: 3, name: c2.title })).toBeVisible();
    await press(page, 'Begin the hearing');
    const wrongs = c2.statements.map((_, i) => i).filter((i) => i !== c2.lieIndex);
    for (let n = 0; n < 3; n++) {
      await page.getByText('Statements so far').click();
      await page.getByRole('button', { name: c2.statements[wrongs[n] as number]?.text as string }).click();
      await press(page, 'OBJECTION!');
      await present(page, c2.evidence[0]?.title as string);
      await press(page, n < 2 ? 'Back to the testimony' : 'See the verdict');
    }
    await expect(page.getByRole('heading', { level: 3, name: 'Three strikes: the hearing is adjourned' })).toBeVisible();
    await expect(page.getByText('Cases won: 1')).toBeVisible();
    await expect(page.getByText('Points: 150')).toBeVisible();
    await checkScreen(page);
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'OBJECTION!' })).toBeVisible();
    await page.goto('/#/arcade');
    await expect(page.locator('.arcade-tile[aria-label^="OBJECTION!"]')).toHaveAttribute('aria-label', /Best/);
    await noHorizontalOverflow(page);
  });
});
