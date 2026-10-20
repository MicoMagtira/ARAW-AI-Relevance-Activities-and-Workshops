// Tulog na, Bea!: keep Bea's four meters balanced, set boundaries each morning, choose what she does in each part of the day.
// Real-time beats (a DOM game, turn-based). Seed "video", day 1: the morning is the AI companion's "Good morning, Bea!" pull
// and school is the group project. Choices keep a fixed order in every language: morning option 2 (put the phone down and
// greet the family) and school option 0 (do her part with the group) are the balanced ones. Boundaries: 0 Focus mode,
// 1 Phone-free dinner, 2 Bedtime, 3 Mute group chats.
const gold = (page) => page.locator('.tulog-main .px-btn--gold');

/** Scroll smoothly so the element is in view (block: 'center' or 'start'), then let it settle. */
async function show(locator, h, block = 'center') {
  await locator.waitFor({ state: 'visible', timeout: 20_000 });
  await locator.evaluate((el, b) => {
    el.style.scrollMarginTop = '96px'; // clear the game's sticky header bar
    el.scrollIntoView({ behavior: 'smooth', block: b });
  }, block);
  await h.sleep(700);
}

export default {
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/tulog-na-bea?seed=video',
  storage: { modulesDone: ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08'] },
  async ready(page) {
    await page.locator('.tulog-card .px-btn--gold').waitFor();
  },
  beats: [
    {
      caption: 'tulog.how.meters',
      async run(page, h) {
        await h.click(page.locator('.tulog-card .px-btn--gold'));
        await page.locator('.tulog-meters').waitFor();
        await h.sleep(500);
        await h.point(page.locator('.tulog-meters'));
      },
      hold: 5000,
    },
    {
      caption: 'tulog.how.boundaries',
      async run(page, h) {
        await h.click(page.locator('.tulog-bound').nth(0));
        await h.sleep(600);
        await h.click(page.locator('.tulog-bound').nth(2));
      },
      hold: 6000,
    },
    {
      caption: 'tulog.how.moments',
      async run(page, h) {
        await show(gold(page), h);
        await h.click(gold(page));
        await show(page.locator('.tulog-main .tulog-card'), h, 'start');
        await h.point(page.locator('.tulog-opt').nth(0));
        await h.sleep(400);
        await h.point(page.locator('.tulog-opt').nth(2));
        await h.sleep(400);
        await h.click(page.locator('.tulog-opt').nth(2));
        await show(page.locator('.tulog-fx'), h);
      },
      hold: 6500,
    },
    {
      caption: 'tulog.how.score',
      async run(page, h) {
        await h.point(page.locator('.tulog-points'));
        await h.sleep(1500);
        await show(page.locator('.tulog-hud'), h, 'start');
        await h.point(page.locator('.tulog-hud .tulog-stat').nth(1));
      },
      hold: 5000,
    },
    {
      caption: 'tulog.how.arcade',
      async run(page, h) {
        await show(gold(page), h);
        await h.click(gold(page));
        await h.point(page.locator('.tulog-main .tulog-title')); // off the choices, so none looks picked
        await show(page.locator('.tulog-main .tulog-card'), h, 'start');
        await h.point(page.locator('.tulog-main .tulog-title'));
        await h.sleep(600);
        await h.click(page.locator('.tulog-opt').nth(0));
      },
      hold: 5500,
    },
    {
      caption: 'Now it is your turn. Have fun!',
      async run(page, h) {
        await show(page.locator('.tulog-fx'), h);
      },
      hold: 4000,
    },
  ],
};
