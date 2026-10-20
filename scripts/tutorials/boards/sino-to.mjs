// Sino 'To?: read the call, make a check (secret question, call back, ask a relative, hotline), then HELP THEM or
// HANG UP + REPORT. Seeded run on the game clock (calls depend only on the seed, never on the player's choices).
const HOW = [
  'Calls and voice notes come in as transcripts. Some are real, and some are AI voice clones. Read, check, then decide.',
  'Tap or click a check to make it (or use the arrow keys, then Space or Enter): the family secret question, a call back to the saved number, ask another relative, or the official hotline.',
  'Then choose HELP THEM or HANG UP + REPORT. Helping a scam, or hanging up on a real emergency, costs a heart. You have 3 hearts.',
  'A decision backed by proof scores 100 points, plus up to 60 for using few checks. Verified calls in a row raise your multiplier up to x2. A guess without proof scores only 20.',
  'Some checks cannot settle a call (the phone rings out, the line is busy). Try another one. Later calls leave fewer checks that settle it.',
];

// The game is 320x180 logical pixels: four checks on the top row of tiles, HELP THEM and HANG UP + REPORT below.
const SECRET = { x: 40, y: 136 };
const HOTLINE = { x: 280, y: 136 };
const HELP = { x: 80, y: 165 };
const HANGUP = { x: 240, y: 165 };
const REST = { x: 180, y: 100 }; // over the log, away from the buttons

/** Glide to a logical point, optionally clicking there. */
async function glide(page, h, p, click = false) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  await h.move(box.x + (p.x / 320) * box.width, box.y + (p.y / 180) * box.height, 12);
  if (click) {
    await h.sleep(120);
    await page.mouse.down();
    await page.mouse.up();
  }
}

export default {
  clock: true,
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/sino-to?seed=v2',
  storage: { briefingsSeen: ['sino-to'] },
  async ready(page) {
    await page.locator('.game-card').waitFor();
  },
  timeline: [
    { at: 0, caption: HOW[0], run: (page, h) => h.click(page.locator('.game-card .px-btn--gold')) },
    // call 1, a voice clone of Tito Raul: "The doctor says I need an operation tonight. Please send P8,000 ... Hurry!"
    { at: 4500, caption: HOW[1] },
    { at: 5200, run: (page, h) => glide(page, h, SECRET, true) }, // secret question: "I forgot! Hurry up!"
    { at: 8800, caption: HOW[2] },
    { at: 9600, run: (page, h) => glide(page, h, HANGUP, true) }, // HANG UP + REPORT: scam stopped
    { at: 11000, run: (page, h) => glide(page, h, REST) }, // cursor off the buttons while the next call comes in
    // call 2 (the reveal ends on its own at 13800), the real Mama: "I twisted my ankle ... I'm short P2,000 for the X-ray."
    { at: 14000, caption: HOW[4] },
    { at: 16300, run: (page, h) => glide(page, h, HOTLINE, true) }, // official hotline: long queue, settles nothing
    { at: 17300, run: (page, h) => glide(page, h, SECRET, true) }, // secret question: right answer
    { at: 18300, caption: HOW[3] },
    { at: 18600, run: (page, h) => glide(page, h, HELP, true) }, // HELP THEM: points, streak 2 (x1.5)
    { at: 23300, caption: 'Now it is your turn. Have fun!' },
  ],
  end: 27000,
};
