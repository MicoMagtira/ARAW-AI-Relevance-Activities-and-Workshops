// Shared helpers for the AI or Not? e2e tests. The answers come from the content itself, so the tests never hard-code a deck.
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { AON_POOL, answerFor, type AonAnswer, type AonItem } from '../../src/content/aiOrNot';

/** The card on screen (the game's card heading is the only h3 inside the stage). */
export async function currentItem(page: Page): Promise<AonItem> {
  const name = (await page.locator('.aon-card__name').textContent()) ?? '';
  const item = AON_POOL.find((i) => i.name === name);
  if (!item) throw new Error(`unknown card: ${name}`);
  return item;
}

export const answerButton = (page: Page, a: AonAnswer) => page.getByRole('button', { name: a === 'ai' ? /^AI$/ : /^Not AI$/ });

const opposite = (a: AonAnswer): AonAnswer => (a === 'ai' ? 'not-ai' : 'ai');

/** Play all 12 cards with the buttons. `wrongOn` lists the card numbers (1-based) to answer wrongly. */
export async function playAiOrNot(page: Page, wrongOn: readonly number[] = []): Promise<void> {
  for (let i = 1; i <= 12; i++) {
    await expect(page.getByText(`Card ${i} of 12`)).toBeVisible();
    const item = await currentItem(page);
    const right = answerFor(item);
    await answerButton(page, wrongOn.includes(i) ? opposite(right) : right).click();
    await page.getByRole('button', { name: i === 12 ? 'See my score' : 'Next card' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Round complete!' })).toBeVisible();
}
