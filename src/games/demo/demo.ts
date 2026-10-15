// "Sun Tap": a tiny demo game that only the tests use (route #/arcade/demo, never listed in the Arcade).
// Keep the sun glowing: any tap, click, swipe, arrow key or Space refills the glow. Seeded, so the same seed drains the same.
import { PALETTE, box, disc, hearts, sunrise, text } from '../engine/draw';
import type { GameDef, GameInstance } from '../engine/types';
import { rngInt } from '../engine/rng';

const START_GLOW = 50;
const REFILL = 25;
const MAX_HEARTS = 3;

const demo: GameDef = {
  slug: 'demo',
  name: 'Sun Tap',
  width: 320,
  height: 180,
  goodRun: 5,
  howTo: ['Tap, click or press Space to keep the sun glowing.', 'Arrow keys and swipes work too.', 'If the glow runs out you lose a heart. Three hearts, then the run is over.'],
  briefing: [
    { title: 'Hello, test pilot!', text: 'This little game is only here for testing the Arcade.', mood: 'wink' },
    { title: 'The idea', text: 'Keep the sun glowing for as long as you can.', mood: 'happy' },
    { title: 'How to play', text: 'Tap, click or press Space. Swipes and arrow keys count too.', mood: 'idle' },
    { title: 'Why it matters', text: 'Real games here teach how to stay safe from health misinformation.', mood: 'think' },
    { title: 'Kailan ako magtitiwala?', text: 'When the source is clear and the facts can be checked.', mood: 'happy' },
  ],
  takeaway: 'Kailan ako magtitiwala? When I can check who said it.',
  create({ rng }): GameInstance {
    const drainPerSecond = rngInt(rng, 40, 50);
    let glow = START_GLOW;
    let lives = MAX_HEARTS;
    let score = 0;
    let over = false;

    return {
      step(dtMs, input) {
        if (over) return;
        const presses = input.actions.length + input.taps.length;
        score += presses;
        glow = Math.min(100, glow + presses * REFILL);
        glow -= (drainPerSecond * dtMs) / 1000;
        if (glow <= 0) {
          lives -= 1;
          glow = START_GLOW;
          if (lives <= 0) over = true;
        }
      },
      draw(ctx) {
        sunrise(ctx, 320, 180);
        disc(ctx, PALETTE.goldDeep, 160, 100, 12 + Math.round(glow / 5));
        disc(ctx, PALETTE.gold, 160, 100, 8 + Math.round(glow / 8));
        box(ctx, PALETTE.ink, 60, 160, 200, 8);
        box(ctx, glow > 30 ? PALETTE.fact : PALETTE.fake, 62, 162, Math.round((glow / 100) * 196), 4);
        text(ctx, `SCORE ${score}`, 8, 8, { size: 8, color: PALETTE.ink });
        hearts(ctx, lives, MAX_HEARTS, 320 - 8 - MAX_HEARTS * 16, 8);
      },
      stats() {
        const shown = Math.max(0, Math.round(glow));
        return {
          score,
          over,
          hud: [
            { id: 'score', label: 'Score', value: String(score) },
            { id: 'hearts', label: 'Hearts', value: `${lives} of ${MAX_HEARTS}`, hearts: { n: lives, max: MAX_HEARTS } },
            { id: 'glow', label: 'Glow', value: `${shown}%`, meter: shown },
          ],
          description: `Sun Tap. Score ${score}. ${lives} of ${MAX_HEARTS} hearts left. The sun glow is at ${shown} percent.`,
          recap: [`You kept the sun glowing for ${score} ${score === 1 ? 'tap' : 'taps'}.`, 'This is a test game, so there is no health lesson here.'],
        };
      },
    };
  },
};

export default demo;
