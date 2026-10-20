// Gawa Ko 'To!: pick a picture, a slogan and a health fact, add the honest steps, publish.
// Real-time beats (a DOM game). Seed "video34": poster 1 (dengue) must use the AI picture and Mang Rey says no when asked;
// poster 2 (cough check) must use Ate Dani's drawing. Options keep a fixed order in every language: pictures are
// 0 AI picture, 1 stock photo, 2 Mang Rey's photo, 3 Ate Dani's drawing, 4 AI picture of Dr. Lim; slogan 0 is never
// AI-written; fact 0 is always correct and fact 2 always wrong. Honest steps: 0 label, 1 credit, 2 ask permission.
const group = (page, i) => page.locator('.gawa-steps .gawa-group').nth(i);
const pic = (page, i) => group(page, 0).locator('.gawa-opt').nth(i);
const slogan = (page, i) => group(page, 1).locator('.gawa-opt').nth(i);
const fact = (page, i) => group(page, 2).locator('.gawa-opt').nth(i);
const honest = (page, i) => page.locator('.gawa-honest .px-btn').nth(i);
const publish = (page) => page.locator('.gawa-publish .px-btn');

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
  url: '#/arcade/gawa-ko-to?seed=video34',
  storage: { modulesDone: ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08'] },
  async ready(page) {
    await page.locator('.gawa-card .px-btn--gold').waitFor();
  },
  beats: [
    {
      caption: 'gawa.how.parts',
      async run(page, h) {
        await h.click(page.locator('.gawa-card .px-btn--gold'));
        await h.sleep(600);
        await h.click(pic(page, 0));
        await show(group(page, 1), h, 'start');
        await h.click(slogan(page, 0));
        await h.click(fact(page, 0));
      },
      hold: 5500,
    },
    {
      caption: 'gawa.how.consent',
      async run(page, h) {
        await show(group(page, 0), h, 'start');
        await h.click(pic(page, 2));
        await show(page.locator('.gawa-honest'), h);
        await h.click(honest(page, 2));
        await page.locator('.gawa-reply').waitFor();
        await h.point(page.locator('.gawa-reply'));
        await h.sleep(1800);
        await show(group(page, 0), h, 'start');
        await h.click(pic(page, 0)); // he said no: back to the AI picture
      },
      hold: 6500,
    },
    {
      caption: 'gawa.how.label',
      async run(page, h) {
        await show(page.locator('.gawa-honest'), h);
        await h.click(honest(page, 0));
      },
      hold: 4500,
    },
    {
      caption: 'gawa.how.fact',
      async run(page, h) {
        await show(group(page, 2), h);
        await h.point(fact(page, 2));
        await h.sleep(1200);
        await h.point(fact(page, 0));
        await h.sleep(500);
        await h.click(publish(page));
        const check = page.locator('.gawa-check').nth(3); // checks: label, consent, credit, fact, brief
        await show(check, h);
        await h.point(check);
      },
      hold: 5500,
    },
    {
      caption: 'gawa.how.arcade',
      async run(page, h) {
        await h.click(page.locator('.gawa-reveal .px-btn--gold'));
        await show(page.locator('.gawa-brief'), h, 'start');
        await h.point(page.locator('.gawa-reqs li'));
      },
      hold: 4500,
    },
    {
      caption: 'gawa.how.credit',
      async run(page, h) {
        await h.click(pic(page, 3));
        await show(group(page, 1), h, 'start');
        await h.click(slogan(page, 0));
        await h.click(fact(page, 0));
        await show(page.locator('.gawa-honest'), h);
        await h.click(honest(page, 1));
      },
      hold: 5000,
    },
    {
      caption: 'Now it is your turn. Have fun!',
      async run(page, h) {
        await h.click(publish(page));
        await show(page.locator('.gawa-reveal'), h, 'start');
      },
      hold: 4000,
    },
  ],
};
