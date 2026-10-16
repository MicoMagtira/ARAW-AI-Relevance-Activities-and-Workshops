import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { answerFor } from '../../src/content/aiOrNot';
import { answerButton, currentItem, playAiOrNot } from './aon';
import { expect, noHorizontalOverflow, test } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function axeSerious(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

async function settled(page: Page) {
  await page.waitForFunction(() => document.querySelector('.aon-card, .aon--done')?.getAnimations().every((a) => a.playState === 'finished') ?? false);
}

/** Open the game step directly (all nine lesson cards done) with a fixed deck. */
async function openGame(page: Page, seed = 'e2e-seed') {
  await page.addInitScript(() => window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9 })));
  await page.goto('/#/');
  await page.goto(`/#/learn/m01?seed=${seed}`);
  await expect(page.getByRole('heading', { level: 2, name: 'AI or Not?' })).toBeVisible();
  await expect(page.getByText('Card 1 of 12')).toBeVisible();
}

/** Drag the card with a touch pointer (what a finger does); dispatched events work in every project. */
async function touchSwipe(page: Page, dx: number) {
  const el = page.locator('.aon-swipe');
  const box = await el.boundingBox();
  if (!box) throw new Error('card area not visible');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const base = { pointerType: 'touch', pointerId: 11, isPrimary: true, clientY: y };
  await el.dispatchEvent('pointerdown', { ...base, clientX: x });
  await el.dispatchEvent('pointermove', { ...base, clientX: x + dx / 2 });
  await el.dispatchEvent('pointermove', { ...base, clientX: x + dx });
  await el.dispatchEvent('pointerup', { ...base, clientX: x + dx });
}

test.describe('AI or Not?', () => {
  test('shows the card, fits the screen and is accessible before and after an answer', async ({ page }) => {
    await openGame(page);
    await expect(page.locator('.aon-card__detail')).toBeVisible();
    await expect(answerButton(page, 'ai')).toBeVisible();
    await expect(answerButton(page, 'not-ai')).toBeVisible();
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    const item = await currentItem(page);
    await answerButton(page, answerFor(item)).click();
    const feedback = page.getByRole('status').filter({ hasText: 'Correct!' });
    await expect(feedback).toContainText(item.kind === 'hype' ? 'Hype alert!' : item.why);
    await expect(feedback).toContainText('+10 points');
    await expect(page.getByText('10 pts')).toBeVisible();
    // the Next button takes focus so keyboard and screen-reader users continue from the feedback
    await expect(page.getByRole('button', { name: 'Next card' })).toBeFocused();
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });

  test('desktop puts the feedback beside the card; phone swaps the buttons for it', async ({ page }, info) => {
    await openGame(page);
    const item = await currentItem(page);
    await answerButton(page, answerFor(item)).click();
    await expect(page.getByRole('button', { name: 'Next card' })).toBeVisible();
    const stage = await page.locator('.aon-stage').boundingBox();
    const feedback = await page.locator('.aon-feedback-slot').boundingBox();
    if (!stage || !feedback) throw new Error('layout boxes missing');
    if (info.project.name === 'desktop') {
      expect(feedback.x).toBeGreaterThan(stage.x + stage.width - 1); // second column
      await expect(answerButton(page, 'ai')).toBeVisible();
    } else if (info.project.name === 'phone') {
      expect(feedback.y).toBeGreaterThanOrEqual(stage.y);
      await expect(answerButton(page, 'ai')).toBeHidden();
    }
  });

  test('plays 12 cards with the buttons, then shows the score, stars and what to remember', async ({ page }) => {
    await openGame(page);
    await playAiOrNot(page, [1]); // one slip: 11 right is still 3 stars
    await expect(page.getByText(/11 of 12 cards in the right bin/)).toBeVisible();
    // 11 right with one run broken at the start: 9 correct in a row after the slip = 110 + 3 bonuses
    await expect(page.getByText(/^Score: \d+ of 140 points/)).toBeVisible();
    await expect(page.getByText('Longest streak: 11 in a row.')).toBeVisible();
    await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Worth remembering' })).toBeVisible();
    await expect(page.locator('.aon-miss')).toHaveCount(1);
    await settled(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);

    await page.getByRole('button', { name: /Finish game/ }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByText('+50 XP', { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: '3 of 3 stars' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();

    // Play again deals a fresh 12 cards
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByText('Card 1 of 12')).toBeVisible();
  });

  test('a round with many mistakes still completes, with one star', async ({ page }) => {
    await openGame(page);
    await playAiOrNot(page, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await expect(page.getByText(/3 of 12 cards in the right bin/)).toBeVisible();
    await expect(page.getByRole('img', { name: '1 of 3 stars' })).toBeVisible();
    await expect(page.locator('.aon-miss')).toHaveCount(9);
    await page.getByRole('button', { name: /Finish game/ }).click();
    await expect(page.getByText('Game complete!')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeEnabled();
  });

  test('keyboard: arrow keys answer and Enter moves on', async ({ page }) => {
    await openGame(page);
    for (let i = 1; i <= 2; i++) {
      const item = await currentItem(page);
      // the key listener attaches just after the first paint, so the very first press may need a retry (a later press is ignored)
      await expect(async () => {
        await page.keyboard.press(answerFor(item) === 'ai' ? 'ArrowRight' : 'ArrowLeft');
        await expect(page.getByRole('status').filter({ hasText: 'Correct!' })).toBeVisible({ timeout: 1000 });
      }).toPass();
      await page.keyboard.press('Enter');
      await expect(page.getByText(`Card ${i + 1} of 12`)).toBeVisible();
    }
    // a wrong arrow explains and pays nothing
    const item = await currentItem(page);
    await page.keyboard.press(answerFor(item) === 'ai' ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.getByRole('status').filter({ hasText: 'So close!' })).toContainText('No points this time');
    await expect(page.getByText('20 pts')).toBeVisible();
  });

  test('touch swipe: right is AI, left is Not AI, a short drag does nothing', async ({ page }) => {
    await openGame(page);
    await touchSwipe(page, 30);
    await expect(page.getByRole('button', { name: 'Next card' })).toHaveCount(0);

    const item = await currentItem(page);
    await touchSwipe(page, answerFor(item) === 'ai' ? 150 : -150);
    await expect(page.getByRole('status').filter({ hasText: 'Correct!' })).toBeVisible();
    await page.getByRole('button', { name: 'Next card' }).click();

    const second = await currentItem(page);
    await touchSwipe(page, answerFor(second) === 'ai' ? -150 : 150); // the wrong way on purpose
    await expect(page.getByRole('status').filter({ hasText: 'So close!' })).toBeVisible();
  });

  test('every setting on: the game still fits and stays accessible', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('araw:v1:cardsDone', JSON.stringify({ m01: 9 })));
    await page.goto('/#/me');
    for (const name of ['Larger text', 'High contrast', 'Extra-large buttons', 'Screen-reader hints', 'Reduce motion']) {
      await page.getByRole('switch', { name }).click();
    }
    await openGame(page);
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
    const item = await currentItem(page);
    await answerButton(page, answerFor(item) === 'ai' ? 'not-ai' : 'ai').click();
    await noHorizontalOverflow(page);
    expect(await axeSerious(page)).toEqual([]);
  });
});
