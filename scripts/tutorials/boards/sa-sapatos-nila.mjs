// Sa Sapatos Nila: try the kiosk through a visitor's eyes, install the fix that unblocks them, earn points, use the counter.
// A DOM game with no clock, so real-time beats. Seed "video" (Arcade): Lola Nena (blurry view) first, then Mang Ben (Ilocano).
// Elements are found by class and position (FIXES order: large text, voice, captions, lower screen, counter, then languages).
const kiosk = (page) => page.locator('[data-kiosk-press]');
const fix = (page, n) => page.locator('.sapatos-fix').nth(n);
const gold = (page, scope) => page.locator(`${scope} .px-btn--gold`).first();

/** Scroll smoothly until the element's top sits just under the sticky game bar. */
async function reveal(h, locator) {
  await locator.waitFor({ state: 'visible', timeout: 20_000 });
  const box = await locator.boundingBox();
  if (box && Math.abs(box.y - 84) > 12) await h.scroll(box.y - 84, 600);
}

export default {
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/sa-sapatos-nila?seed=video',
  storage: { modulesDone: ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'] },
  async ready(page) {
    await page.locator('.sapatos-card .px-btn--gold').waitFor();
  },
  beats: [
    {
      // open the kiosk, meet Lola Nena, and see the kiosk blurred the way she sees it (screen 1 still works)
      caption: 'sapatos.how.eyes',
      async run(page, h) {
        await h.click(gold(page, '.sapatos-card'));
        await h.sleep(700);
        await h.click(gold(page, '.sapatos-card'));
        await h.sleep(500);
        await h.click(kiosk(page));
        await h.sleep(500);
        await reveal(h, page.locator('.sapatos-feel'));
        await h.point(page.locator('.sapatos-feel li').first());
      },
      hold: 6000,
    },
    {
      // she gets stuck on screen 2: install Large text, then try again
      caption: 'sapatos.how.fix',
      async run(page, h) {
        await h.click(kiosk(page));
        await h.sleep(500);
        await reveal(h, page.locator('#sapatos-fix-title'));
        await h.sleep(400);
        await h.click(fix(page, 0));
        await h.sleep(600);
        await reveal(h, page.locator('.kiosk')); // back up to the kiosk: the letters are sharp and big now
        await h.point(kiosk(page));
      },
      hold: 6500,
    },
    {
      // served: stars and points; the next visitor brings 2 more fix points
      caption: 'sapatos.how.points',
      async run(page, h) {
        await h.click(kiosk(page));
        await h.sleep(400);
        await h.click(kiosk(page));
        await h.sleep(300);
        await reveal(h, page.locator('.sapatos-reveal'));
        await h.point(page.locator('.sapatos-stars'));
        await h.sleep(1500);
        await h.click(gold(page, '.sapatos-reveal'));
        await h.sleep(400);
        await reveal(h, page.locator('.sapatos-card'));
        await h.point(page.locator('.sapatos-gain'));
      },
      hold: 7000,
    },
    {
      // Mang Ben only reads Ilocano: the assisted counter serves him anyway
      caption: 'sapatos.how.counter',
      async run(page, h) {
        await h.click(gold(page, '.sapatos-card'));
        await h.sleep(400);
        await h.click(kiosk(page));
        await h.sleep(300);
        await h.click(kiosk(page));
        await h.sleep(400);
        await reveal(h, page.locator('#sapatos-fix-title'));
        await h.click(fix(page, 4));
        await h.sleep(500);
        await reveal(h, page.locator('.kiosk__counter'));
        await h.click(page.locator('.kiosk__counter button'));
        await h.sleep(300);
        await reveal(h, page.locator('.sapatos-reveal'));
        await h.point(page.locator('.sapatos-reveal .sapatos-points'));
      },
      hold: 7000,
    },
    {
      // no clock: three leaves close the center, or finish the run yourself
      caption: 'sapatos.how.arcade',
      async run(page, h) {
        await reveal(h, page.locator('.sapatos-meters'));
        await h.point(page.locator('.sapatos-meters .px-chip').nth(1));
        await h.sleep(1200);
        await h.click(page.locator('.sapatos-hud .px-btn--secondary'));
      },
      hold: 6000,
    },
    { caption: 'Now it is your turn. Have fun!', hold: 4000 },
  ],
};
