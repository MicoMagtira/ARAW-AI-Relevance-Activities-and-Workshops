// ARAW in one minute: language, sunrise, Home, Learn and a lesson card, the Arcade, the Library, Me and its helpers,
// the report flag. Desktop layout (the primary design); real time, no game clock.
const C = {
  hello: 'Welcome to ARAW! Here is the app in one minute.',
  language: 'First, pick your language. You can change it later in Me.',
  start: 'Press Start when the sun has risen.',
  home: 'Home shows your next lesson, the daily challenge and the myth of the day.',
  learn: 'Learn has ten short modules. Go step by step, starting with Module 1.',
  lesson: 'Each module has short cards, quick questions and a game. Ara helps you along.',
  arcade: 'The Arcade has quick games to practise what you learned.',
  library: 'The Library has myths and facts, a glossary, comics and these videos.',
  me: 'In Me, see your badges and turn on helpers like Larger text.',
  report: 'See something wrong? Press the flag to tell us.',
  bye: 'Learn when to trust AI and health info. Let us begin!',
};

/** Move between screens through the hash, like a tap on a link (no reload, so the session stays). */
const go = (page, hash) => page.evaluate((h) => (window.location.hash = h), hash);
const nav = (page, path) => page.locator(`.sidebar .nav-item[href$="#${path}"]`);

export default {
  viewport: { width: 1280, height: 720 },
  splash: true,
  url: '',
  async ready(page) {
    await page.locator('#landing').waitFor();
  },
  beats: [
    {
      caption: C.hello,
      async run(page, h) {
        await h.point(page.locator('.splash__wordmark'));
      },
      hold: 3600,
    },
    {
      caption: C.language,
      async run(page, h) {
        await h.click(page.locator(`.lang-option__input[value="${h.lang}"]`));
        await h.sleep(900);
        await h.click(page.locator('.landing__select'));
      },
      hold: 5000,
    },
    {
      caption: C.start,
      async run(page, h) {
        await page.locator('#splash').waitFor();
        await h.point(page.locator('.splash__start'));
        await page.locator('.splash__start:not([disabled])').waitFor({ timeout: 15_000 });
        await h.click(page.locator('.splash__start'), { hold: 400 });
      },
      hold: 6600,
    },
    {
      caption: C.home,
      async run(page, h) {
        await page.locator('.home-banner').waitFor();
        await h.point(page.locator('.home-banner__word'));
        await h.sleep(1200);
        await h.point(page.locator('.home-hero .continue'));
        await h.sleep(800);
        await h.scroll(420, 1200);
        await h.point(page.locator('.home-daily'));
        await h.sleep(700);
        await h.point(page.locator('.home-myth .myth-card'));
      },
      hold: 6500,
    },
    {
      caption: C.learn,
      async run(page, h) {
        await h.click(nav(page, '/learn'));
        await page.locator('.px-btn[href$="/learn/m01"]').waitFor();
        await h.sleep(800);
        await h.point(page.locator('.px-btn[href$="/learn/m01"]'));
      },
      hold: 5200,
    },
    {
      caption: C.lesson,
      async run(page, h) {
        await h.click(page.locator('.px-btn[href$="/learn/m01"]'));
        const next = page.locator('.lesson-actions .px-btn--gold');
        await next.waitFor();
        await h.sleep(1600);
        await h.click(next);
        await h.sleep(1800);
        if (await next.isEnabled()) await h.click(next);
      },
      hold: 6800,
    },
    {
      caption: C.arcade,
      async run(page, h) {
        await go(page, '#/arcade');
        await page.locator('.arcade-tile').first().waitFor();
        await h.sleep(600);
        const tile = page.locator('.arcade-tile').first();
        await h.click(tile);
        await h.sleep(900);
        const watch = page.locator('.arcade-details .watch-btn');
        if (await watch.count()) await h.point(watch.first());
      },
      hold: 6000,
    },
    {
      caption: C.library,
      async run(page, h) {
        await h.click(nav(page, '/library'));
        const videos = page.locator('.px-tab').nth(3);
        await videos.waitFor();
        await h.sleep(900);
        await h.click(videos);
        await h.sleep(900);
        const card = page.locator('.video-card').first();
        if (await card.count()) await h.point(card);
      },
      hold: 6000,
    },
    {
      caption: C.me,
      async run(page, h) {
        await h.click(nav(page, '/me'));
        const settings = page.locator('.me-settings');
        await settings.waitFor();
        await h.sleep(500);
        await settings.scrollIntoViewIfNeeded();
        const larger = settings.locator('.px-switch').first();
        await h.click(larger);
        await h.sleep(1800);
        await h.click(larger);
      },
      hold: 6500,
    },
    {
      caption: C.report,
      async run(page, h) {
        await h.point(page.locator('.sidebar__foot .px-btn'));
      },
      hold: 4200,
    },
    {
      caption: C.bye,
      async run(page, h) {
        await h.click(nav(page, '/'));
        await page.locator('.home-banner').waitFor();
        await h.sleep(1200);
        await h.card({ kicker: 'AIKasalig', heading: 'ARAW', line: h.t(C.bye) }, 2600);
      },
      hold: 4200,
    },
  ],
};
