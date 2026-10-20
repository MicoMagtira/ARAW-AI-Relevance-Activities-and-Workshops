// Takbo, Data!: jump, change lanes, grab the safe freebies, dodge the data traps, keep the Privacy Shield up.
// Seeded run on the game clock: the key timeline plays out the same way in every language (plan it with probe.mjs).
const HOW = [
  'Press Space, tap or click to jump over puddles, chickens and potholes.',
  'Press the up and down arrows (or W and S), or swipe up and down, to change lane.',
  'Safe freebies (water, clinic flyers, verified badges) ask for nothing and refill your Privacy Shield.',
  'Data traps ask for your birthday, ID photo, PhilHealth number or contacts. Steer around them or jump over them.',
  'The run ends when the Privacy Shield hits 0. You run faster the longer you last.',
];

export default {
  clock: true,
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/takbo-data?seed=video',
  storage: { briefingsSeen: ['takbo-data'] },
  async ready(page) {
    await page.locator('.game-card').waitFor();
  },
  timeline: [
    {
      at: 0,
      caption: HOW[1],
      async run(page, h) {
        await h.click(page.locator('.game-card .px-btn--gold'));
      },
    },
    { at: 2400, key: 'ArrowUp' }, // to the top lane: grab the verified app badge
    { at: 4600, key: 'ArrowDown' },
    { at: 5000, caption: HOW[0] },
    { at: 6600, key: ' ' }, // over the pothole
    { at: 8500, caption: HOW[2] },
    { at: 9000, key: 'ArrowDown' }, // bottom lane: badge, then the water refill
    { at: 12500, caption: HOW[3] },
    { at: 15300, key: ' ' }, // over the pothole in the bottom lane
    { at: 16300, key: 'ArrowUp' }, // the birthday trap has passed: into the middle lane for the flyer
    { at: 18500, caption: HOW[4] },
    { at: 24000, caption: 'Now it is your turn. Have fun!' },
  ],
  end: 25200,
};
