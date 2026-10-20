// Tawid, Lola!: cross the street with the AI guide, but use your own eyes. Seed "video", trip 1: four roads, and the guide
// is wrong (96% sure) on the second. Lola starts in column 11; the crossing is planned one column left, where the gaps line
// up with a margin of about a quarter second either way. The keys are on the game clock (plan them with probe.mjs).
const HOW = [
  'Help Lola cross the street to the health center. An AI guide says GO or WAIT for the next lane. It is usually right, and sometimes confidently wrong.',
  'Step forward with the GO tile, the Up arrow or W, or tap above Lola. Wait with WAIT, Space or Enter, or tap Lola. Move sideways with the Left and Right arrows or A and D. Down steps back.',
  'Use your own eyes on the traffic. If a vehicle is about to reach Lola, the horn beeps, Lola steps back to the last grass and you lose a heart. You have 3 hearts.',
  'The Trust Meter goes up when you follow the guide and it was right, and when you override it and it was wrong. It goes down when you follow a wrong call or ignore a right one. A higher meter gives a higher score multiplier, up to x2.',
  'Standing still for a moment in front of a road counts as choosing to wait. Each new lane scores 10 points and each trip to the health center 100. The next street is busier.',
];

export default {
  clock: true,
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/tawid-lola?seed=video',
  storage: { briefingsSeen: ['tawid-lola'] },
  async ready(page) {
    await page.locator('.game-card').waitFor();
  },
  timeline: [
    {
      at: 0,
      caption: HOW[0],
      async run(page, h) {
        await h.click(page.locator('.game-card .px-btn--gold'));
        await h.move(1010, 470, 10); // out of the way: this game is played with the keys
      },
    },
    { at: 300, key: ' ' }, // a motorbike is passing: the guide says WAIT, and it is right
    { at: 4400, caption: HOW[1] },
    { at: 5000, key: 'ArrowLeft' },
    { at: 5700, key: 'ArrowRight' },
    { at: 6400, key: 'ArrowLeft' }, // one column left of the start, where the gaps line up
    { at: 7300, key: ' ' },
    { at: 8600, caption: HOW[2] }, // Lola waits on the start strip while the motorbikes pass
    { at: 12800, caption: HOW[3] },
    { at: 13300, key: 'ArrowUp' }, // the guide says GO, and the lane is clear
    { at: 13800, key: ' ' }, // the guide says GO, 96% sure, but a motorbike is coming: wait (the meter jumps)
    { at: 14700, key: 'ArrowUp' }, // the guide says WAIT, but the lane is clear: go (the meter jumps again)
    { at: 15450, key: 'ArrowUp' },
    { at: 15900, key: 'ArrowUp' },
    { at: 16350, key: 'ArrowUp' }, // the health center
    { at: 17200, caption: HOW[4] },
    { at: 18800, key: ' ' }, // on to the next street; Lola stands still while a bus comes: that counts as WAIT
    { at: 21800, caption: 'Now it is your turn. Have fun!' },
  ],
  end: 25000,
};
