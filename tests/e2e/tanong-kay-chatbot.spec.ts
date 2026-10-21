import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { CHAT_ROUNDS, type ChatRound, type Ruling } from '../../src/content/chatbot';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

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

/** Open the game directly (modules 1 and 2 done, all of module 3's lesson cards done). `?seed=` repeats the draw. */
async function openGame(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02']));
    window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9, m02: 8, m03: 8 }));
  });
  await page.goto('/#/');
  await page.goto('/#/learn/m03?seed=e2e');
  await expect(page.getByRole('heading', { level: 2, name: 'Tanong kay Chatbot' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Tanong kay Chatbot' })).toBeVisible();
}

const start = (page: Page) => page.getByRole('button', { name: 'Start the chat' }).click();
const ruleButton = (page: Page, r: Ruling) => page.getByRole('button', { name: new RegExp(`^${r === 'tama' ? 'Usable' : r === 'mali' ? 'Wrong' : 'Get checked'}:`) });

/** The chat round on screen, found from Bea's question; null on the privacy round. */
async function currentRound(page: Page): Promise<ChatRound | null> {
  if (await page.getByText('Privacy round').count()) return null;
  const question = (await page.locator('.cb-bubble--bea').textContent()) ?? '';
  const round = CHAT_ROUNDS.find((r) => r.question === question);
  if (!round) throw new Error(`unknown round: ${question}`);
  return round;
}

/** Play the eight rounds. `wrong` lists round numbers (1-based) to rule wrongly, and the privacy round is wrong for any of them. */
async function playAll(page: Page, wrong: readonly number[] = []) {
  for (let i = 1; i <= 8; i++) {
    await expect(page.getByText(`Round ${i} of 8`)).toBeVisible();
    const round = await currentRound(page);
    const last = i === 8;
    if (round) {
      const rule: Ruling = wrong.includes(i) ? (round.ruling === 'tama' ? 'mali' : 'tama') : round.ruling;
      await ruleButton(page, rule).click();
    } else {
      if (!wrong.includes(i)) await page.getByRole('switch', { name: /Motion sensor/ }).click();
      await page.getByRole('button', { name: 'Decide' }).click();
    }
    await page.getByRole('button', { name: last ? 'See my result' : 'Next round' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Chat finished!' })).toBeVisible();
}

test.describe('Tanong kay Chatbot', () => {
  test('shows the intro with a link to the Chatbot Sandbox, fits the screen and is accessible', async ({ page }) => {
    await openGame(page);
    const sandbox = page.getByRole('link', { name: 'Open the Chatbot Sandbox' });
    await expect(sandbox).toBeVisible();
    await expect(sandbox).toHaveAttribute('href', '#/sandbox');
    await expect(page.getByText(/on your own device/)).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('a round shows the scripted chat and three rulings; a ruling gives feedback and focuses Next', async ({ page }) => {
    await openGame(page);
    await start(page);
    await expect(page.getByText('Round 1 of 8')).toBeVisible();
    const round = await currentRound(page);
    if (!round) throw new Error('the privacy round is never first');
    await expect(page.getByText(round.answer)).toBeVisible();
    await expect(page.getByText('Scripted answer for this game. Not a real chatbot.')).toBeVisible();
    for (const r of ['tama', 'mali', 'magpatingin'] as const) await expect(ruleButton(page, r)).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await ruleButton(page, round.ruling).click();
    await expect(page.getByText('+10 points')).toBeVisible();
    await expect(page.getByText(round.why)).toBeVisible();
    await expect(page.getByText(round.good)).toBeVisible();
    await expect(page.getByText('10 pts')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next round' })).toBeFocused();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('a red flag ruled as usable gets the gentle warning', async ({ page }) => {
    await openGame(page);
    await start(page);
    for (let i = 1; i <= 8; i++) {
      const round = await currentRound(page);
      if (round?.redFlag) {
        await ruleButton(page, 'tama').click();
        const alert = page.getByRole('alert').filter({ hasText: 'always go to a health worker' });
        await expect(alert).toBeVisible();
        await expect(page.getByText('So close!')).toBeVisible();
        await settled(page);
        await noHorizontalOverflow(page);
        expect(await axeSerious(page)).toEqual([]);
        return;
      }
      if (round) await ruleButton(page, round.ruling).click();
      else await page.getByRole('button', { name: 'Decide' }).click();
      await page.getByRole('button', { name: 'Next round' }).click();
    }
    throw new Error('every play has at least two red-flag rounds');
  });

  test('desktop puts the ruling beside the chat; phone stacks it below', async ({ page }, info) => {
    await openGame(page);
    await start(page);
    const chat = await page.locator('.cb-round__chat').boundingBox();
    const side = await page.locator('.cb-round__side').boundingBox();
    if (!chat || !side) throw new Error('layout boxes missing');
    if (info.project.name === 'desktop') expect(side.x).toBeGreaterThan(chat.x + chat.width - 1);
    else if (info.project.name === 'phone') expect(side.y).toBeGreaterThanOrEqual(chat.y + chat.height - 1);
  });

  test('the privacy round starts with every permission off and explains each choice', async ({ page }) => {
    await openGame(page);
    await start(page);
    for (let i = 1; i <= 8; i++) {
      const round = await currentRound(page);
      if (!round) break;
      await ruleButton(page, round.ruling).click();
      await page.getByRole('button', { name: 'Next round' }).click();
    }
    await expect(page.getByText('Privacy round')).toBeVisible();
    const switches = page.getByRole('switch');
    await expect(switches).toHaveCount(4);
    for (const s of await switches.all()) await expect(s).toHaveAttribute('aria-checked', 'false');
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await page.getByRole('switch', { name: /Your contacts/ }).click();
    await page.getByRole('button', { name: 'Decide' }).click();
    await expect(page.getByText('So close!')).toBeVisible();
    await expect(page.getByText(/Do not allow: counting steps never needs your family/)).toBeVisible();
    await expect(page.getByText(/Allow: counting steps is its whole job/)).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('plays all eight rounds right, then finishes with three stars and hands over to the module runner', async ({ page }) => {
    await openGame(page);
    await start(page);
    await playAll(page);
    await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(page.getByText('You ruled 8 of 8 rounds right. 80 points.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the Chatbot Sandbox' })).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();
  });

  test('wrong rulings still finish the game, with fewer stars', async ({ page }) => {
    await openGame(page);
    await start(page);
    await playAll(page, [1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(page.getByRole('img', { name: '1 of 3 stars' })).toBeVisible();
    await expect(page.getByText('You ruled 0 of 8 rounds right. 0 points.')).toBeVisible();
    await page.getByRole('button', { name: 'Finish game' }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();
  });
});
