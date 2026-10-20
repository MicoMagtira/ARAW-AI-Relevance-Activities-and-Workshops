// Fact or Fake: read the post, press FACT or FAKE, read the feedback; every fake gets the ARAW GAME FAKE stamp.
// Free play with seed "video": item 1 is a fact (a GC reminder about dengue), item 2 a fake (a PhilHealth scare message),
// item 3 a fact. Captions reuse the Guide's Fact or Fake lines (translated). Elements found by class, never by text.
const FOF = {
  intro: 'Fact or Fake shows ten posts, messages or pictures. You decide: is it fact or fake? Every fake is made up for the game and gets a FAKE stamp.',
  decide: 'Read the post. Then press FACT or FAKE. On a phone you can also swipe: right for fact, left for fake.',
  feedback: 'After each answer, a card tells you if you were right, why, and how to check it in real life.',
  stamp: 'The FAKE stamp shows the post was made up for the game.',
  keys: 'Keyboard: right arrow or L for Fact, left arrow or A for Fake.',
};
const factBtn = (page) => page.locator('.fof-buttons .px-btn--fact');
const fakeBtn = (page) => page.locator('.fof-buttons .px-btn--fake');
const nextBtn = (page) => page.locator('.fof-feedback__actions .px-btn--gold');

/** Scroll smoothly until the element's top sits just under the sticky bar. */
async function reveal(h, locator, top = 84) {
  await locator.waitFor({ state: 'visible', timeout: 20_000 });
  const box = await locator.boundingBox();
  if (box && Math.abs(box.y - top) > 12) await h.scroll(box.y - top, 600);
}

export default {
  viewport: { width: 1024, height: 576 },
  url: '#/play/fact-or-fake?seed=video',
  async ready(page) {
    await page.locator('.fof-card').waitFor();
  },
  beats: [
    {
      // ten items (the dots), one card at a time
      caption: FOF.intro,
      async run(page, h) {
        await h.sleep(600);
        await h.point(page.locator('.fof-dots'));
        await h.sleep(1500);
        await h.point(page.locator('.fof-card'));
      },
      hold: 6500,
    },
    {
      // a true dengue reminder: press FACT
      caption: FOF.decide,
      async run(page, h) {
        await h.sleep(1800);
        await h.point(fakeBtn(page));
        await h.sleep(700);
        await h.click(factBtn(page));
      },
      hold: 6000,
    },
    {
      // the feedback card: right or not, why, and how to check
      caption: FOF.feedback,
      async run(page, h) {
        await reveal(h, page.locator('.fof-feedback'));
        await h.point(page.locator('.fof-feedback p').first());
        await h.sleep(3000);
        await h.click(nextBtn(page));
        await h.sleep(300);
        await reveal(h, page.locator('.fof-card'), 104); // the next post and both buttons in view
      },
      hold: 6500,
    },
    {
      // the PhilHealth scare message is fake: press FAKE, and the stamp lands on it
      caption: FOF.stamp,
      async run(page, h) {
        await h.click(fakeBtn(page));
        await h.sleep(400);
        // the answer moves focus (and the page) to the Next button: bring the stamped post back into view
        await reveal(h, page.locator('.fof-card'), 104);
        // point just under the stamp, so the cursor does not cover its words
        const stamp = page.locator('.fof-card .px-stamp');
        await stamp.waitFor();
        const box = await stamp.boundingBox();
        if (box) await h.move(box.x + box.width * 0.4, box.y + box.height + 22);
      },
      hold: 6000,
    },
    {
      // next item with the keyboard: right arrow = FACT
      caption: FOF.keys,
      async run(page, h) {
        await h.click(nextBtn(page));
        await h.sleep(1600);
        await h.press('ArrowRight', '→');
      },
      hold: 5500,
    },
    { caption: 'Now it is your turn. Have fun!', hold: 4000 },
  ],
};
