import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { GC_SCENARIOS, type GcChoice, type GcScenario } from '../../src/content/gc';
import { buildPlay } from '../../src/modules/m05/gcLogic';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SEED = 'e2e';

async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

/** Wait for entrance animations so contrast and layout are measured on the final state. */
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

/** Open the game directly (modules 1 to 4 done, all of module 5's lesson cards done). `?seed=` repeats the draw. */
async function openGame(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8, m03: 8, m04: 8, m05: 8 }));
  });
  await page.goto('/#/');
  // wait for Home to render: two hash changes in a row can coalesce, and a replay would then keep the finished game
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await page.goto(`/#/learn/m05?seed=${SEED}`);
  await expect(page.getByRole('heading', { level: 2, name: "Tita's GC" })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: "Tita's GC" })).toBeVisible();
}

const play = buildPlay(SEED);
const start = (page: Page) => page.getByRole('button', { name: 'Open the chat' }).click();
const choiceButton = (page: Page, c: GcChoice) => page.locator('.gc-choice', { hasText: c.label.slice(0, 40) });
const score = (c: GcChoice) => c.accuracy + c.kindness;
type Pick = (choices: readonly GcChoice[]) => GcChoice;
const best: Pick = (cs) => cs.reduce((a, b) => (score(b) > score(a) ? b : a));
const worst: Pick = (cs) => cs.reduce((a, b) => (score(b) < score(a) ? b : a));

/** The turn on screen, found from its prompt. */
async function currentTurn(page: Page, s: GcScenario) {
  const prompt = ((await page.locator('#gc-prompt').textContent()) ?? '').trim();
  const turn = s.turns.find((t) => t.prompt === prompt);
  if (!turn) throw new Error(`unknown prompt: ${prompt}`);
  return turn;
}

/** Make one move and press Continue. */
async function move(page: Page, s: GcScenario, pick: Pick) {
  const turn = await currentTurn(page, s);
  await choiceButton(page, pick(turn.choices)).click();
  await page.getByRole('button', { name: /^Continue the chat/ }).click();
}

/** Play one chat to its ending and on to the next chat (or the result). */
async function playChat(page: Page, s: GcScenario, pick: Pick, last: boolean) {
  const next = page.getByRole('button', { name: last ? /^See my result/ : /^Next chat/ });
  for (let i = 0; i < 6 && !(await next.count()); i++) await move(page, s, pick);
  await next.click();
}

test.describe("Tita's GC", () => {
  test('the intro shows the cast and how scoring works, fits the screen and is accessible', async ({ page }) => {
    await openGame(page);
    for (const name of ['Lola Nena', 'Tita Baby', 'Kuya Jun', 'Bea']) await expect(page.getByText(name, { exact: true })).toBeVisible();
    // the start button comes first; the scoring rules are folded into a details block
    const open = page.getByRole('button', { name: 'Open the chat' });
    const rules = page.getByText('How scoring works');
    await expect(open).toBeInViewport();
    const [openBox, rulesBox] = [await open.boundingBox(), await rules.boundingBox()];
    expect(openBox && rulesBox && openBox.y < rulesBox.y).toBe(true);
    await expect(page.getByText(/Accuracy: Did you check/)).toBeHidden();
    await rules.click();
    await expect(page.getByText(/Accuracy: Did you check/)).toBeVisible();
    await expect(page.getByText(/Kindness: Does your reply/)).toBeVisible();
    await checkScreen(page);
  });

  test('a chat shows the forward, all four kinds of move, the ripple and two meters', async ({ page }) => {
    await openGame(page);
    await start(page);
    const s = play[0] as GcScenario;
    await expect(page.getByText('Chat 1 of 3')).toBeVisible();
    await expect(page.getByText('Forwarded').first()).toBeVisible();
    const turn = await currentTurn(page, s);
    for (const c of turn.choices) await expect(choiceButton(page, c)).toBeVisible();
    for (const kind of ['React', 'Verify', 'Reply', 'Forward']) await expect(page.locator('.gc-choice__kind', { hasText: kind }).first()).toBeVisible();
    await expect(page.getByRole('meter', { name: 'Accuracy' })).toBeVisible();
    await expect(page.getByRole('meter', { name: 'Kindness' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Family ripple' })).toBeVisible();
    await checkScreen(page);
  });

  test('desktop puts the chat beside the choices; phone stacks them', async ({ page }, info) => {
    await openGame(page);
    await start(page);
    const chat = await page.locator('.gc-round__chat').boundingBox();
    const side = await page.locator('.gc-round__side').boundingBox();
    if (!chat || !side) throw new Error('layout boxes missing');
    if (info.project.name === 'desktop') expect(side.x).toBeGreaterThan(chat.x + chat.width - 1);
    else if (info.project.name === 'phone') expect(side.y).toBeGreaterThanOrEqual(chat.y + chat.height - 1);
  });

  test('a verify move opens a mini check in the chat, reveals the stamp, scores the move and focuses Continue', async ({ page }) => {
    await openGame(page);
    await start(page);
    const s = play[0] as GcScenario;
    const turn = await currentTurn(page, s);
    const verify = turn.choices.find((c) => c.kind === 'verify') as GcChoice;
    await expect(page.getByText('ARAW GAME · FAKE')).toHaveCount(0);
    await expect(page.getByText('Legit post')).toHaveCount(0);
    await choiceButton(page, verify).click();
    await expect(page.getByRole('region', { name: 'Mini check' })).toBeVisible();
    await expect(page.getByText(verify.why)).toBeVisible();
    await expect(page.getByRole('img', { name: 'Accuracy: 2 of 2' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Kindness: 2 of 2' })).toBeVisible();
    await expect(page.getByText(s.legit ? 'Legit post' : 'ARAW GAME · FAKE')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Continue the chat/ })).toBeFocused();
    await checkScreen(page);
  });

  test('a poor move says So close! with low scores, and the chat carries on to a rough ending', async ({ page }) => {
    await openGame(page);
    await start(page);
    const s = play[0] as GcScenario;
    const turn = await currentTurn(page, s);
    const poor = worst(turn.choices);
    await choiceButton(page, poor).click();
    await expect(page.getByText('So close!', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(poor.why)).toBeVisible();
    await page.getByRole('button', { name: /^Continue the chat/ }).click();
    await move(page, s, worst);
    await expect(page.getByText('Rough ending')).toBeVisible();
    await expect(page.getByText(/believed it, .* checked it, .* felt hurt\./).first()).toBeVisible();
    await checkScreen(page);
  });

  test('the best two moves give the best ending, full meters and the ripple', async ({ page }) => {
    await openGame(page);
    await start(page);
    const s = play[0] as GcScenario;
    await move(page, s, best);
    await move(page, s, best);
    await expect(page.getByText('Best ending')).toBeVisible();
    await expect(page.getByText(/^Ending: /)).toBeVisible();
    await expect(page.getByText('Accuracy 4 of 4, Kindness 4 of 4 in this chat.')).toBeVisible();
    await expect(page.getByText(/What the post was/)).toBeVisible();
    await checkScreen(page);
  });

  test('plays three chats on the best path: three stars, a true forward included, and flows on into the module', async ({ page }) => {
    await openGame(page);
    await start(page);
    for (let i = 0; i < play.length; i++) {
      await expect(page.getByText(`Chat ${i + 1} of 3`)).toBeVisible();
      await playChat(page, play[i] as GcScenario, best, i === play.length - 1);
    }
    await expect(page.getByRole('heading', { name: 'The chat is quiet again!' })).toBeVisible();
    await expect(page.getByRole('img', { name: '3 of 3 stars' }).first()).toBeVisible();
    await expect(page.getByText('This one was true.')).toBeVisible();
    await expect(page.getByText(/earned 24 of 24 points/)).toBeVisible();
    await checkScreen(page);

    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await page.getByRole('button', { name: /^Next/ }).click();
    await expect(page.getByRole('heading', { name: 'When should I trust it?' })).toBeVisible();
    await page.getByRole('button', { name: /^Next: quick Fact or Fake round/ }).click();
    await expect(page.getByRole('list', { name: 'Round progress' }).getByRole('listitem')).toHaveCount(5);
  });

  test('plays three chats on the worst path: one star, and the game still finishes', async ({ page }) => {
    await openGame(page);
    await start(page);
    for (let i = 0; i < play.length; i++) await playChat(page, play[i] as GcScenario, worst, i === play.length - 1);
    await expect(page.getByRole('img', { name: '1 of 3 stars' }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();
  });

  test('every scenario renders without overflow, check cards and endings included', async ({ page }) => {
    test.setTimeout(90_000);
    // pick seeds whose plays together cover all five scenarios
    const seeds: string[] = [];
    const covered = new Set<string>();
    for (let n = 0; covered.size < GC_SCENARIOS.length && n < 50; n++) {
      const seed = `cover-${n}`;
      const ids = buildPlay(seed).map((x) => x.id);
      if (ids.some((id) => !covered.has(id))) {
        seeds.push(seed);
        ids.forEach((id) => covered.add(id));
      }
    }
    expect(covered.size).toBe(GC_SCENARIOS.length);
    for (const seed of seeds) {
      await openGame(page);
      await page.goto(`/#/learn/m05?seed=${seed}`);
      await page.reload();
      await expect(page.getByRole('heading', { level: 3, name: "Tita's GC" })).toBeVisible();
      await start(page);
      const chats = buildPlay(seed);
      for (let i = 0; i < chats.length; i++) {
        const chat = chats[i] as GcScenario;
        await move(page, chat, best);
        await settled(page);
        await noHorizontalOverflow(page);
        await playChat(page, chat, i % 2 === 0 ? best : worst, i === chats.length - 1);
        await settled(page);
        await noHorizontalOverflow(page);
      }
      await expect(page.getByRole('heading', { name: 'The chat is quiet again!' })).toBeVisible();
    }
  });
});
