// Feed Mo 'To: you are the algorithm. Pick one of three posts for Tita Baby with the arrows and Enter, or a click; watch
// CLICKS, Engagement and Balanced Feed. Seeded run on the game clock (posts depend only on the seed, never on the picks).
const HOW = [
  'You are the algorithm. Pick one of 3 posts to show the person before the timer ends.',
  'Press the left and right arrows (or A and D), then Space or Enter. You can also tap or click a post.',
  'CLICKS shows how much attention a post is likely to win. Scary posts win the most.',
  'Scary posts push Engagement up but shrink the Feed Bubble and drain Balanced Feed. Trusted health tips and new topics refill it.',
  'Gold chips are what the person likes. Each person has 10 posts, then comes the next one. Finish with both meters above 50 for a bonus.',
];

/** Glide the cursor to a point in the game's 320x180 logical units (and click there). */
async function glide(page, h, x, y, click = false) {
  const box = await page.locator('canvas.game-canvas').boundingBox();
  await h.move(box.x + (x / 320) * box.width, box.y + (y / 180) * box.height);
  if (click) {
    await h.sleep(200);
    await page.mouse.down();
    await page.mouse.up();
  }
}

export default {
  clock: true,
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/feed-mo-to?seed=video',
  storage: { briefingsSeen: ['feed-mo-to'] },
  async ready(page) {
    await page.locator('.game-card').waitFor();
  },
  timeline: [
    { at: 0, caption: HOW[0], run: (page, h) => h.click(page.locator('.game-card .px-btn--gold')) },
    { at: 4000, caption: HOW[1] },
    { at: 4600, key: 'ArrowLeft' }, // to the trusted health center tip
    { at: 5800, key: 'Enter' }, // Balanced Feed refills
    { at: 8600, caption: HOW[2] },
    { at: 9000, run: (page, h) => glide(page, h, 264, 116) }, // point at the miracle cure post: 3 CLICKS
    { at: 10300, run: (page, h) => glide(page, h, 160, 116, true) }, // click the showbiz post she likes
    { at: 12000, run: (page, h) => glide(page, h, 160, 200) }, // cursor out of the way
    { at: 12900, caption: HOW[3] },
    { at: 13500, key: 'ArrowLeft' }, // the scary post: Engagement up, Balanced Feed down
    { at: 14500, key: 'Enter' },
    { at: 17900, caption: HOW[4] },
    { at: 18600, key: 'ArrowLeft' }, // family, a gold chip she likes
    { at: 19600, key: 'Enter' },
    { at: 23200, caption: 'Now it is your turn. Have fun!' },
    { at: 23800, key: 'ArrowRight' }, // food, another gold chip
    { at: 24600, key: 'Enter' },
  ],
  end: 26400,
};
