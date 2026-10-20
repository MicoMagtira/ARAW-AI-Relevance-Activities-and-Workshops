// Hati Tayo!: send each task to the AI lane or to the person. Seed "video2" (the clinic, day 1): the tasks take turns,
// AI job, people job, AI job, people job, so both lanes get used. Pointer steps glide over the canvas in logical game units
// (320x180); keyboard steps show a key cap. The game is locked until Module 6 is done, hence `modulesDone`.
const HOW = [
  'Tasks arrive in a queue at the top. Send each one to the AI lane (left) or to the person (right) before it waits too long.',
  'Tap a task, then tap a lane. Or drag the task onto a lane. With the keyboard: Up and Down choose a task, Left sends it to the AI, Right sends it to the person.',
  'AI is instant at repeat jobs such as counting, sorting, translating a draft and scheduling. It fails at comforting people and at judgement calls.',
  'The person is slow and can hold only three jobs. Giving them a repeat job works, but it wastes the time you need for care.',
  'The Service meter drops when AI fails, when a task waits too long, or when the queue is full. It is empty at zero. Each new day is faster, with a new mix.',
];

// src/games/hati-tayo/art.ts: the first queue tile and the two lanes
const TILE0 = { x: 36, y: 28 };
const TILE1 = { x: 98, y: 28 };
const AI_LANE = { x: 81, y: 151 };
const PERSON = { x: 239, y: 151 };

/** A logical canvas point (320x180) in page pixels. */
async function at(page, x, y) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  if (!box) throw new Error('no canvas');
  return { x: box.x + box.width * (x / 320), y: box.y + box.height * (y / 180) };
}
/** Glide the pointer to a canvas point (a lane under it lights up). */
const hover = ({ x, y }) => async (page, h) => {
  const p = await at(page, x, y);
  await h.move(p.x, p.y, 20);
};
/** Glide to a canvas point, rest a moment, and tap it. */
const tap = ({ x, y }) => async (page, h) => {
  const p = await at(page, x, y);
  await h.move(p.x, p.y, 20);
  await h.sleep(200);
  await page.mouse.down();
  await page.mouse.up();
};
/**
 * Drag from one canvas point to another, as timeline steps from `start`: the game reads a held pointer once a frame, and
 * the clock stands still while a step runs, so the press, each leg of the glide and the release get their own moment.
 */
const drag = (start, from, to, legs = 6) => {
  const steps = [
    {
      at: start,
      run: async (page, h) => {
        const a = await at(page, from.x, from.y);
        await h.move(a.x, a.y, 20);
        await h.sleep(200);
        await page.mouse.down();
      },
    },
  ];
  for (let i = 1; i <= legs; i++) {
    const x = from.x + ((to.x - from.x) * i) / legs;
    const y = from.y + ((to.y - from.y) * i) / legs;
    steps.push({ at: start + 200 + i * 80, run: async (page) => {
      const p = await at(page, x, y);
      await page.mouse.move(p.x, p.y, { steps: 4 });
    } });
  }
  steps.push({ at: start + 200 + legs * 80 + 300, run: (page) => page.mouse.up() });
  return steps;
};

export default {
  clock: true,
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/hati-tayo?seed=video2',
  storage: { briefingsSeen: ['hati-tayo'], modulesDone: ['m01', 'm02', 'm03', 'm04', 'm05', 'm06'] },
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
    { at: 900, run: tap({ x: 160, y: 100 }) }, // skip the "Day 1" card
    { at: 2200, run: hover(AI_LANE) },
    { at: 3400, run: hover(PERSON) },
    { at: 4600, caption: HOW[1] },
    { at: 5000, run: tap(TILE0) }, // choose the task (planning home visits)
    { at: 5800, run: tap(AI_LANE) }, // and send it to the AI
    ...drag(7400, TILE0, PERSON), // drag the next one, a hospital referral, to the person
    { at: 8800, run: hover({ x: 160, y: 205 }) }, // the pointer steps aside, under the game: the next tasks are sent with the keys
    { at: 10000, caption: HOW[2] },
    { at: 13100, key: 'ArrowLeft' }, // a translation draft: the AI does it at once
    { at: 15600, caption: HOW[3] },
    { at: 18700, key: 'ArrowRight' }, // a scared teen needs a person, who works on it for a few seconds
    { at: 20500, caption: HOW[4] },
    { at: 24600, caption: 'Now it is your turn. Have fun!' },
  ],
  end: 27600,
};
