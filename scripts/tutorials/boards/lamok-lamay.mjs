// Lamok Lamay: whack the real larvae, add the ones the AI camera missed, reject its wrong boxes, then tap DONE.
// Seeded run on the game clock (plan it with probe.mjs). The pointer glides over the canvas in logical game units (320x180).
// Seed "video", container 1 (blue drum): a seed with no box, a larva boxed 75%, a seed boxed 58% (a false alarm) and a
// larva with no box (a miss). Container 2 (old tire): larvae boxed 95% and 66%, plus a seed and a leaf bit with no box.
const HOW = [
  'Water containers pop up. The AI camera draws a box on what it thinks is a larva, with how sure it is (a percentage). Real larvae wriggle. Seeds, leaf bits and raisins lie still.',
  'With WHACK chosen, tap a boxed larva to whack it, or tap a larva with no box to add it. With REJECT chosen, tap a box around something that is not a larva. Keyboard: arrows pick an object, up chooses Whack, down chooses Reject, Space or Enter uses it.',
  'Tap DONE when you have fixed everything. Finishing early with no larva left gives a time bonus. A wrong whack or reject costs 20 points and your streak.',
  'Every larva left in the water when time is up grows into a mosquito and costs a heart. You have 5 hearts, and each new container is quicker than the last.',
  'The two meters grade the AI. Precision: of its boxes, how many were right. Catch rate: of the real larvae, how many got a box.',
];

// the tool tiles along the bottom (src/games/lamok-lamay/art.ts: TILE, slotRect)
const WHACK = { x: 54, y: 163 };
const REJECT = { x: 160, y: 163 };
const DONE = { x: 266, y: 163 };

/** A logical canvas point (320x180) in page pixels. */
async function at(page, x, y) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + box.width * (x / 320), y: box.y + box.height * (y / 180) };
}
/** Glide the pointer to a canvas point (the game highlights what is under it). */
const hover = (x, y) => async (page, h) => {
  const p = await at(page, x, y);
  await h.move(p.x, p.y, 22);
};
/** Glide to a canvas point, rest a moment, and tap it. */
const tap = (x, y) => async (page, h) => {
  const p = await at(page, x, y);
  await h.move(p.x, p.y, 22);
  await h.sleep(250);
  await page.mouse.down();
  await page.mouse.up();
};

export default {
  clock: true,
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/lamok-lamay?seed=video',
  storage: { briefingsSeen: ['lamok-lamay'] },
  async ready(page) {
    await page.locator('.game-card').waitFor();
  },
  timeline: [
    {
      at: 0,
      caption: HOW[0],
      async run(page, h) {
        await h.click(page.locator('.game-card .px-btn--gold'));
      },
    },
    { at: 1400, run: hover(125, 45) }, // the larva in a 75% box: it wriggles
    { at: 2400, run: hover(195, 90) }, // the seed in a 58% box: it lies still
    { at: 3400, caption: HOW[1] },
    { at: 3600, run: tap(125, 45) }, // whack the boxed larva
    { at: 4600, run: tap(277, 86) }, // add the larva the AI missed
    { at: 5600, run: tap(REJECT.x, REJECT.y) },
    { at: 6400, run: tap(195, 90) }, // reject the box around the seed
    { at: 8400, caption: HOW[2] },
    { at: 8800, run: tap(DONE.x, DONE.y) }, // all fixed: done early, time bonus
    { at: 12000, caption: HOW[4] },
    { at: 12100, run: hover(160, 121) }, // the precision and catch rate meters
    { at: 13600, run: tap(WHACK.x, WHACK.y) },
    { at: 14400, run: tap(46, 46) }, // whack the 95% larva in the tire
    { at: 15600, caption: HOW[3] },
    { at: 16000, run: tap(DONE.x, DONE.y) }, // done too soon: the 66% larva grows wings and costs a heart
    { at: 19600, caption: 'Now it is your turn. Have fun!' },
  ],
  end: 22200,
};
