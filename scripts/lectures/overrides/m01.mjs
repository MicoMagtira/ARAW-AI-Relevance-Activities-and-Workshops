// Module 1 lecture override: the "AI or Not?" game. A fixed seed makes the deck repeatable, so the lecture can answer the
// cards correctly: three cards slowly (with their "why"), the rest fast, then the result.
import { answerFor } from '../../../src/content/aiOrNot.ts';
import { buildDeck } from '../../../src/modules/m01/aonLogic.ts';

const SEED = 'lecture';
const SLOW = 3;

export default {
  seed: SEED,
  async game({ page, h, L, beat }) {
    const deck = buildDeck(SEED);
    const txt = async (sel) => ((await page.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    const feedback = async () => `${await txt('.aon-feedback__head')} ${await txt('.aon-feedback p')}`;
    const nextBtn = page.locator('.aon-feedback-slot button');
    const answerBtn = (item) => page.locator('.aon-buttons button').nth(answerFor(item) === 'ai' ? 1 : 0);

    await beat({
      screen: 'Game: AI or Not? (first card)',
      narr: async () => `${L.gameLook} ${await txt('.aon-card')} ${await txt('.aon-question')}`,
      read: async () => `${await txt('.aon-card')} ${await txt('.aon-question')}`,
    });
    for (let i = 0; i < SLOW; i++) {
      await beat({
        screen: `Game: card ${i + 1}, answer and why`,
        narr: async () => `${await txt('.aon-card')}. ${await feedback()}`,
        read: feedback,
        min: 6000,
        async run() {
          if (i > 0) await h.click(nextBtn);
          await h.sleep(i === 0 ? 1500 : 3500);
          await h.tap(answerBtn(deck[i]));
          await h.sleep(600);
        },
      });
    }
    await beat({
      screen: 'Game: the rest of the round, fast, then the result',
      narr: L.gameFast,
      read: async () => `${await txt('.aon-done__grid')} ${L.gameFast}`,
      async run() {
        await h.click(nextBtn);
        for (let i = SLOW; i < deck.length; i++) {
          await h.sleep(500);
          await page.keyboard.press(answerFor(deck[i]) === 'ai' ? 'ArrowRight' : 'ArrowLeft');
          await h.sleep(450);
          await page.keyboard.press('Enter');
        }
        await page.locator('.aon--done').waitFor({ state: 'visible', timeout: 10_000 });
      },
    });
    await h.click(page.locator('.aon--done .px-btn--gold').last());
    await page.locator('.game-result').waitFor({ state: 'visible', timeout: 10_000 });
  },
};
