// OBJECTION!: listen to the witness, press a statement for detail, then object to the false one with the evidence that proves it.
// A DOM game with no clock, so real-time beats. Seed "video" (Arcade), case 1: four statements, the 4th is false, and the
// card that proves it is the first one in the court record. Elements are found by class and position, never by text.
const actions = (page) => page.locator('.objection-actions .px-btn');
const next = (page) => actions(page).nth(1); // Back, Next, Press, OBJECTION!
const pressBtn = (page) => page.locator('.objection-actions .px-btn--gold');

/** Scroll smoothly until the element's top sits just under the sticky game bar. */
async function reveal(h, locator) {
  await locator.waitFor({ state: 'visible', timeout: 20_000 });
  const box = await locator.boundingBox();
  if (box && Math.abs(box.y - 84) > 12) await h.scroll(box.y - 84, 600);
}

export default {
  viewport: { width: 1024, height: 576 },
  url: '#/arcade/objection?seed=video',
  storage: { modulesDone: ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'] },
  async ready(page) {
    await page.locator('.objection-panel .px-btn--gold').waitFor();
  },
  beats: [
    {
      // enter the hall, read the case file, and step through the statements
      caption: 'objection.how.listen',
      async run(page, h) {
        await h.click(page.locator('.objection-panel .px-btn--gold').first());
        await h.sleep(900);
        await h.click(page.locator('.objection-panel .px-btn--gold').first());
        await h.sleep(900);
        await h.click(next(page));
        await h.sleep(1000);
        await h.click(next(page));
      },
      hold: 6500,
    },
    {
      // the 4th statement: press it and the witness says more
      caption: 'objection.how.press',
      async run(page, h) {
        await h.click(next(page));
        await h.sleep(900);
        await h.click(pressBtn(page));
        await h.sleep(300);
        await h.point(page.locator('.objection-press'));
      },
      hold: 5500,
    },
    {
      // OBJECTION! on the false statement, then the card that proves it
      caption: 'objection.how.objection',
      async run(page, h) {
        await h.click(page.locator('.objection-shout-btn'));
        await h.sleep(500);
        await reveal(h, page.locator('.objection-present'));
        await h.sleep(500);
        await h.click(page.locator('.objection-card--pick').first());
        await h.sleep(300);
        await reveal(h, page.locator('.objection-reveal'));
      },
      hold: 7000,
    },
    {
      // the case is won cleanly (bonus); the hearts are the strikes left
      caption: 'objection.how.strikes',
      async run(page, h) {
        await reveal(h, page.locator('.objection-reveal .objection-list'));
        await h.point(page.locator('.objection-reveal .objection-list'));
        await h.sleep(1500);
        await reveal(h, page.locator('.objection-hud'));
        await h.point(page.locator('.objection-strikes'));
      },
      hold: 6000,
    },
    {
      // no clock: three strikes end the run, or finish it yourself
      caption: 'objection.how.arcade',
      async run(page, h) {
        await h.sleep(1200);
        await h.click(page.locator('.objection-hud .px-btn--secondary'));
      },
      hold: 5500,
    },
    { caption: 'Now it is your turn. Have fun!', hold: 4000 },
  ],
};
