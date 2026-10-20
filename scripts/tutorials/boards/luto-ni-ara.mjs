// Luto ni Ara: read the order, put the right prompt ingredients in the pot (click, drag or keys), then COOK.
// Seeded run on the game clock (orders depend only on the seed, never on the player's choices).
const HOW = [
  'A customer orders an answer. Add the prompt ingredients the order asks for, then press COOK before the timer ends.',
  'Tap or click an ingredient to put it in the pot (tap it again to take it out), or drag it into the pot. With the keyboard use the arrow keys, then Space or Enter.',
  'Each part the customer names needs its ingredient: audience, language, length, format and role. Health questions also need Cite sources and Say if unsure.',
  'Missing ingredients serve a funny wrong dish and cost a heart. Adding things nobody asked for clutters the dish.',
  'Faster cooking earns a speed bonus, and health orders earn tips. You have 3 hearts, and orders get quicker and never repeat.',
];

// The game is 320x180 logical pixels. Shelf slots: 0 audience, 1 language, 2 length, 3 format, 4 role, 5 cite sources,
// 6 say if unsure, 7 COOK (4 per row).
const slot = (s) => ({ x: 2 + (s % 4) * 80 + 38, y: 124 + Math.floor(s / 4) * 29 + 12 });
const POT = { x: 160, y: 98 };

async function toScreen(page, p) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  return { x: box.x + (p.x / 320) * box.width, y: box.y + (p.y / 180) * box.height };
}

/** Glide to a logical point, optionally clicking there. */
async function glide(page, h, p, click = false) {
  const s = await toScreen(page, p);
  await h.move(s.x, s.y, 10); // quick glides: the clock waits for them, so they stretch the caption in real time
  if (click) {
    await h.sleep(100);
    await page.mouse.down();
    await page.mouse.up();
  }
}

/** A drag from a shelf slot into the pot, spread over game time so the game sees every move (start at `at`). */
function drag(at, s) {
  const from = slot(s);
  const steps = [];
  steps.push({ at, run: async (page, h) => { await glide(page, h, from); await page.mouse.down(); } });
  const n = 6;
  for (let i = 1; i <= n; i++) {
    const p = { x: from.x + ((POT.x - from.x) * i) / n, y: from.y + ((POT.y - from.y) * i) / n };
    steps.push({ at: at + 120 * i, run: async (page) => { const q = await toScreen(page, p); await page.mouse.move(q.x, q.y, { steps: 3 }); } });
  }
  steps.push({ at: at + 120 * (n + 2), run: (page) => page.mouse.up() });
  return steps;
}

export default {
  clock: true,
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/luto-ni-ara?seed=video2',
  storage: { briefingsSeen: ['luto-ni-ara'] },
  async ready(page) {
    await page.locator('.game-card').waitFor();
  },
  timeline: [
    // a result can be skipped 900 ms after it shows (COOK + 800 ms of cooking): the skip taps wait for that
    { at: 0, caption: HOW[0], run: (page, h) => h.click(page.locator('.game-card .px-btn--gold')) },
    // order 1: "Plan a school project for Lola in Taglish."
    { at: 4000, caption: HOW[1] },
    { at: 4600, key: 'Enter' }, // audience (highlighted first): for Lola
    ...drag(5400, 1), // language: in Taglish
    { at: 7200, run: (page, h) => glide(page, h, slot(7), true) }, // COOK
    { at: 9200, run: (page, h) => glide(page, h, POT, true) }, // next order
    // order 2: "Write a polite reminder for a teen. Talk like a nurse."
    { at: 9300, caption: HOW[2] },
    { at: 9500, run: (page, h) => glide(page, h, slot(0), true) }, // audience: for a teen
    { at: 9900, run: (page, h) => glide(page, h, slot(4), true) }, // role: talk like a nurse
    { at: 10300, run: (page, h) => glide(page, h, slot(7), true) }, // COOK
    { at: 12250, run: (page, h) => glide(page, h, POT, true) }, // next order
    // order 3, a health question: "Explain high blood pressure for Lolo. Use a list."
    { at: 12600, run: (page, h) => glide(page, h, slot(0), true) }, // audience: for Lolo
    { at: 13000, run: (page, h) => glide(page, h, slot(3), true) }, // format: use a list
    { at: 13400, run: (page, h) => glide(page, h, slot(5), true) }, // cite sources
    { at: 13800, run: (page, h) => glide(page, h, slot(6), true) }, // say if unsure
    { at: 14000, caption: HOW[4] },
    { at: 14200, run: (page, h) => glide(page, h, slot(7), true) }, // COOK: speed bonus and tips
    { at: 19000, caption: 'Now it is your turn. Have fun!' },
  ],
  end: 23000,
};
