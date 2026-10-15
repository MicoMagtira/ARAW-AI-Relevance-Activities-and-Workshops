import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { topicById } from '../../src/games/gawa-ko-to/parts';
import { buildBrief, buildModuleBriefs, type Brief } from '../../src/games/gawa-ko-to/rules';
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

const MODULE_SEED = 'e2e-m7';
const ARCADE_SEED = 'e2e-a';
const briefs = buildModuleBriefs(MODULE_SEED);

async function openModuleGame(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8, m03: 8, m04: 8, m05: 8, m06: 8, m07: 8 }));
  });
  await page.goto('/#/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await page.goto(`/#/learn/m07?seed=${MODULE_SEED}`);
  await expect(page.getByRole('heading', { level: 2, name: "Gawa Ko 'To!" })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: "Gawa Ko 'To!" })).toBeVisible();
}

const start = (page: Page) => page.getByRole('button', { name: /^Start making posters/ }).click();
const opt = (page: Page, text: string | RegExp) => page.locator('label.gawa-opt', { hasText: text });
const pick = (page: Page, text: string | RegExp) => opt(page, text).click();
const press = (page: Page, name: RegExp) => page.getByRole('button', { name }).click();
const poster = (page: Page) => page.locator('svg.gawa-poster');

/** Fill a poster. `honest` adds every step the picture needs; otherwise only the three picks are made. */
async function make(page: Page, b: Brief, honest: boolean) {
  const topic = topicById(b.topic);
  const req = b.requirements;
  const aiSlogan = req.includes('ai-slogan');
  await pick(page, req.includes('neighbor') ? /Mang Rey/ : req.includes('artist') ? /Ate Dani/ : /^AI-generated picture/);
  await pick(page, (topic.slogans.find((s) => s.ai === aiSlogan)?.text ?? ''));
  await pick(page, (topic.facts.find((f) => f.ok)?.text ?? ''));
  if (honest) {
    if (req.includes('ai-picture') || aiSlogan) await press(page, /Made with AI/);
    if (req.includes('artist')) await press(page, /^Credit Ate Dani/);
    if (req.includes('neighbor')) await press(page, /^Ask permission/);
  }
  await press(page, /^Publish poster/);
}

test.describe("Gawa Ko 'To! (Module 7 game)", () => {
  test('the intro fits the screen, is accessible and puts the start button first', async ({ page }) => {
    await openModuleGame(page);
    await expect(page.getByText(/You will make three, one at a time/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Start making posters/ })).toBeInViewport();
    await page.getByText('How it works').click();
    await expect(page.getByText(/Anything an AI made gets the "Made with AI" label/)).toBeVisible();
    await checkScreen(page);
  });

  test('the studio shows the brief, builds the SVG poster as parts are picked, and lays out for each size', async ({ page }, info) => {
    await openModuleGame(page);
    await start(page);
    const [first] = briefs as [Brief];
    const topic = topicById(first.topic);
    await expect(page.getByText(`Make ${topic.ask} for Barangay Masagana.`)).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Posters done' })).toHaveAttribute('aria-valuetext', 'Poster 1 of 3');
    await expect(poster(page)).toBeVisible();
    await expect(poster(page).locator('title')).toContainText('No picture yet');
    await checkScreen(page);

    const publish = page.getByRole('button', { name: /^Publish poster/ });
    await expect(publish).toBeDisabled();
    await pick(page, /Stock photo/);
    await expect(poster(page).locator('title')).toContainText('Picture: Stock photo');
    await pick(page, topic.slogans[0]?.text ?? '');
    await pick(page, topic.facts[0]?.text ?? '');
    await expect(publish).toBeEnabled();
    await expect(poster(page).locator('title')).toContainText(`Health fact: ${topic.facts[0]?.text}`);
    await checkScreen(page);

    for (const sel of ['.gawa-opt', '.gawa-honest .px-btn', '.gawa-publish .px-btn']) {
      for (const box of await page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
    }
    const preview = await page.locator('.gawa-preview').boundingBox();
    const steps = await page.locator('.gawa-steps').boundingBox();
    if (!preview || !steps) throw new Error('layout boxes missing');
    if (info.project.name === 'desktop') expect(steps.x).toBeGreaterThan(preview.x + preview.width - 1);
    else if (info.project.name === 'phone') expect(steps.y).toBeGreaterThanOrEqual(preview.y + preview.height - 1);
  });

  test('asking a real person for permission shows their answer; a keyboard user can pick and toggle', async ({ page }) => {
    await openModuleGame(page);
    await start(page);
    const ask = page.getByRole('button', { name: /^Ask permission/ });
    await expect(ask).toBeDisabled();
    await pick(page, /Mang Rey/);
    await expect(ask).toBeEnabled();
    await ask.click();
    await expect(page.getByText(/Sure, for the health drive!/)).toBeVisible();
    await pick(page, /AI picture of Dr\. Lim/);
    await page.getByRole('button', { name: /^Ask permission/ }).click();
    await expect(page.getByText(/I never made that picture/)).toBeVisible();
    const label = page.getByRole('button', { name: /Made with AI/ });
    await label.focus();
    await page.keyboard.press('Enter');
    await expect(label).toHaveAttribute('aria-pressed', 'true');
    await expect(poster(page).locator('title')).toContainText('Sticker: Made with AI');
    await checkScreen(page);
  });

  test('three honest posters give three stars, then Finish completes the game', async ({ page }) => {
    await openModuleGame(page);
    await start(page);
    for (const [i, b] of briefs.entries()) {
      await expect(page.getByRole('progressbar', { name: 'Posters done' })).toHaveAttribute('aria-valuetext', `Poster ${i + 1} of 3`);
      await make(page, b, true);
      await expect(page.getByRole('heading', { level: 3, name: 'Published!' })).toBeVisible();
      if (i === 0) await checkScreen(page);
      await press(page, i === 2 ? /^See the result/ : /^Next brief/);
    }
    await expect(page.getByRole('heading', { level: 3, name: 'All three posters are done!' })).toBeVisible();
    await expect(page.getByText('Honest posters: 3 of 3.')).toBeVisible();
    await checkScreen(page);
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('skipping the steps gets the poster Reported! with a stamp and a checklist, and the module still finishes', async ({ page }) => {
    await openModuleGame(page);
    await start(page);
    for (const [i, b] of briefs.entries()) {
      await make(page, b, false);
      const needsStep = b.requirements.some((r) => r !== 'ai-slogan');
      await expect(page.getByRole('heading', { level: 3, name: needsStep ? 'Reported!' : 'Published!' })).toBeVisible();
      if (i === 0) {
        await expect(poster(page).locator('title')).toContainText('Stamp: Reported!');
        await expect(poster(page).locator('text.poster-stamp')).toHaveText('REPORTED!');
        await expect(page.locator('.gawa-check--fail').first()).toBeVisible();
        await checkScreen(page);
      }
      await press(page, i === 2 ? /^See the result/ : /^Next brief/);
    }
    await expect(page.getByText('Honest posters: 0 of 3.')).toBeVisible();
    await checkScreen(page);
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
  });

  test('a wrong health fact gets the ARAW GAME FAKE stamp and the reason', async ({ page }) => {
    await openModuleGame(page);
    await start(page);
    const topic = topicById((briefs[0] as Brief).topic);
    const wrong = topic.facts.find((f) => !f.ok);
    await pick(page, /Stock photo/);
    await pick(page, topic.slogans[0]?.text ?? '');
    await pick(page, wrong?.text ?? '');
    await press(page, /^Publish poster/);
    await expect(poster(page).locator('text.poster-stamp-s')).toHaveText('ARAW GAME · FAKE');
    await expect(page.getByText(wrong?.why ?? '', { exact: false })).toBeVisible();
    await noHorizontalOverflow(page);
  });
});

test.describe("Gawa Ko 'To! (Arcade)", () => {
  const ARCADE = `/#/arcade/gawa-ko-to?seed=${ARCADE_SEED}`;
  const unlock = (page: Page) => page.addInitScript(() => window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07'])));

  test('stays locked until Module 7 is done, with a kind notice', async ({ page }) => {
    await page.goto('/#/arcade/gawa-ko-to');
    await expect(page.getByText('Finish Module 7 to unlock this game.')).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test('plays a timed poster with a clock you can pause, then goes on to the next brief', async ({ page }) => {
    await unlock(page);
    await page.clock.install();
    await page.goto(ARCADE);
    await expect(page.getByRole('heading', { level: 3, name: "Gawa Ko 'To!" })).toBeVisible();
    await checkScreen(page);
    await start(page);
    await expect(page.getByRole('timer')).toHaveText('90s left');
    await expect(page.getByRole('img', { name: '3 of 3 hearts left' })).toBeVisible();
    await page.clock.runFor(10_000);
    await expect(page.getByRole('timer')).toHaveText('80s left');
    await press(page, /^Pause clock/);
    await page.clock.runFor(30_000);
    await expect(page.getByRole('timer')).toHaveText('80s left');
    await press(page, /^Resume clock/);
    await make(page, buildBrief(ARCADE_SEED, 1), true);
    await expect(page.getByRole('heading', { level: 3, name: 'Published!' })).toBeVisible();
    await checkScreen(page);
    await press(page, /^Next brief/);
    await expect(page.getByText('Poster 2', { exact: true })).toBeVisible();
    await expect(page.getByRole('timer')).toHaveText('85s left');
  });

  test('a poster sent out when the clock runs out costs a heart; three end the game and save the run', async ({ page }) => {
    await unlock(page);
    await page.clock.install();
    await page.goto(ARCADE);
    await start(page);
    for (let i = 0; i < 3; i++) {
      await page.clock.runFor(100_000);
      await expect(page.getByRole('heading', { level: 3, name: 'Reported!' })).toBeVisible();
      await expect(page.getByText('Time ran out, so the poster went out as it was.')).toBeVisible();
      await expect(page.getByRole('img', { name: `${2 - i} of 3 hearts left` })).toBeVisible();
      if (i === 0) await checkScreen(page);
      await press(page, i === 2 ? /^See the result/ : /^Next brief/);
    }
    await expect(page.getByRole('heading', { level: 3, name: 'Game over' })).toBeVisible();
    await checkScreen(page);
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('heading', { level: 3, name: "Gawa Ko 'To!" })).toBeVisible();
    await page.goto('/#/arcade');
    await expect(page.locator('.arcade-tile[aria-label^="Gawa Ko \'To!"]')).toHaveAttribute('aria-label', /New|Best/);
    await noHorizontalOverflow(page);
  });
});
