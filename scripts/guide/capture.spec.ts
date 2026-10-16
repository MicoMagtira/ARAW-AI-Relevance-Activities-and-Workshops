// Captures the user-guide screenshots and the boxes of the elements the guide points at.
// Run: npm run build && npx playwright test -c scripts/guide/capture.config.ts   (see capture.config.ts)
// Images: public/guide/<id>-<phone|desktop>.png. Boxes: scripts/guide/out/parts/*.json, merged into out/manifest.json.
// Never capture the hidden test forms (#/assess/form_A|B): a printed test item would spoil the pre/post test.
// A target that cannot be found is logged as MISSING and left out; the guide then shows its number in the legend only.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Box, ShotVariant } from '../../src/screens/guide/callouts';

const HERE = dirname(fileURLToPath(import.meta.url));
const IMG_DIR = join(HERE, '..', '..', 'public', 'guide');
const PART_DIR = join(HERE, 'out', 'parts');

/** 2026-10-15 09:00 in Manila: a Thursday, so the Daily Challenge and streak look the same on every run. */
const NOW = new Date('2026-10-15T09:00:00+08:00');
const ALL = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'];
const GAMES = ['takbo-data', 'feed-mo-to', 'luto-ni-ara', 'sino-to', 'lamok-lamay', 'tawid-lola', 'hati-tayo', 'gawa-ko-to', 'tulog-na-bea', 'sa-sapatos-nila', 'objection'];

/** A lived-in player: four modules done, a streak, some XP, badges and best scores. */
const LIVED_IN: Record<string, unknown> = {
  profile: { nickname: 'Lorna', avatar: 2 },
  xp: 640,
  streak: { current: 4, best: 6, lastDay: '2026-10-14', freezeWeek: null },
  modulesDone: ALL.slice(0, 4),
  cardsDone: { m05: 3 },
  badges: ['module-m01', 'module-m02', 'module-m03', 'module-m04', 'streak-3', 'villain-dr-fake'],
  moduleStars: { m01: 3, m02: 2, m03: 3, m04: 2 },
  xpClaims: [],
  bestScores: { 'takbo-data': 1240, 'feed-mo-to': 860, 'luto-ni-ara': 540 },
  briefingsSeen: GAMES,
  komiksRead: ['1'],
  bestRadar: { dPrime: 1.4, c: 0.1, total: 10 },
};

type Target = (page: Page, variant: ShotVariant) => Locator;
interface Shot {
  id: string;
  url: string;
  /** localStorage values (merged over LIVED_IN unless `fresh`). */
  seed?: Record<string, unknown>;
  fresh?: boolean;
  /** Show the first-visit splash instead of skipping it. */
  splash?: boolean;
  only?: ShotVariant;
  /** Taller viewport (CSS px) for screens whose key parts do not fit 740 (phone) or 768 (desktop). Width never changes. */
  height?: Partial<Record<ShotVariant, number>>;
  /** Wait for this before acting (default: the screen heading). */
  ready?: Target;
  prepare?: (page: Page, variant: ShotVariant) => Promise<void>;
  /** Scroll so this element sits just under the sticky header. */
  scrollTo?: Target;
  /** Crop the image to this element (padded, clamped to the viewport). Default: the whole viewport. */
  crop?: Target;
  targets: Record<string, Target>;
}

const css = (selector: string): Target => (page) => page.locator(selector).filter({ visible: true }).first();
const role = (r: Parameters<Page['getByRole']>[0], name?: string | RegExp, exact = false): Target => (page) =>
  page.getByRole(r, name === undefined ? {} : { name, exact }).filter({ visible: true }).first();
const text = (t: string | RegExp): Target => (page) => page.getByText(t).filter({ visible: true }).first();
const byVariant = (phone: Target, desktop: Target): Target => (page, v) => (v === 'phone' ? phone(page, v) : desktop(page, v));

/** Answer Fact or Fake items until one turns out to be a fake (so the FAKE stamp shows). */
async function answerUntilStamp(page: Page): Promise<void> {
  for (let i = 0; i < 9; i++) {
    await page.getByRole('button', { name: 'Fake', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: /Correct!|So close!/ }).first()).toBeVisible();
    if ((await page.getByText('ARAW GAME · FAKE').count()) > 0) return;
    await page.getByRole('button', { name: 'Next' }).click();
  }
}

const SHOTS: Shot[] = [
  {
    id: 'splash',
    url: '/',
    splash: true,
    fresh: true,
    ready: role('button', 'Start'),
    targets: {
      title: css('.splash__title'),
      sound: (p) => p.locator('.splash').getByRole('switch').filter({ visible: true }).first(),
      start: role('button', 'Start'),
    },
  },
  {
    id: 'home',
    url: '/#/',
    targets: {
      hud: css('.banner__hud'),
      continue: css('.continue .px-btn, .continue a'),
      progress: css('.continue [role="progressbar"]'),
      report: css('.report-flag, .sidebar__foot a, .sidebar__foot .px-btn'),
      nav: byVariant(css('.tabbar, nav[aria-label="Main navigation"]'), css('.sidebar .nav, .sidebar')),
    },
  },
  {
    id: 'home-more',
    height: { phone: 1100 },
    url: '/#/',
    scrollTo: css('.home-daily'),
    targets: {
      daily: css('.home-daily'),
      myth: css('.myth-card'),
      arcade: css('.home-arcade'),
    },
  },
  {
    id: 'learn',
    height: { phone: 1180 },
    url: '/#/learn',
    targets: {
      done: css('.road-node--done'),
      current: css('.road-node--current'),
      locked: css('.road-node--locked'),
      count: text(/\d+ \/ 10 done/),
    },
  },
  {
    id: 'learn-details',
    height: { phone: 1000, desktop: 900 },
    url: '/#/learn',
    prepare: async (page) => {
      await page.getByRole('button', { name: /^Module 5:/ }).filter({ visible: true }).first().click();
      await page.waitForTimeout(400);
    },
    targets: {
      title: css('.learn__details .details__title, dialog .details__title'),
      start: role('link', /^(Start|Continue|Replay)$/),
    },
  },
  {
    id: 'lesson',
    height: { phone: 1200 },
    url: '/#/learn/m01',
    fresh: true,
    ready: role('progressbar', 'Lesson progress'),
    prepare: async (page) => {
      await page.getByRole('button', { name: /^Next/ }).click();
      await page.getByRole('button', { name: /^Next/ }).click();
      for (const label of ['Examples', 'Patterns', 'Guess']) await page.getByRole('button', { name: new RegExp(label) }).click();
      await page.getByRole('button', { name: /^Next/ }).click();
      await page.getByRole('button', { name: /What mangoes taste like/ }).click();
      await expect(page.getByRole('status').filter({ hasText: 'So close!' }).first()).toBeVisible();
      await page.waitForTimeout(300);
    },
    targets: {
      close: role('link', /^Close lesson/),
      progress: role('progressbar', 'Lesson progress'),
      ara: css('.lesson-ara'),
      answer: css('.option[aria-pressed="true"], .option.is-wrong, .option'),
      feedback: (p) => p.getByRole('status').filter({ hasText: 'So close!' }).filter({ visible: true }).first(),
      next: role('button', /^Next/),
    },
  },
  {
    id: 'fof-item',
    height: { phone: 1000 },
    url: '/#/play/fact-or-fake?seed=e2e-seed-2',
    ready: text(/Fact or Fake · 1 of 10/),
    targets: {
      count: text(/Fact or Fake · 1 of 10/),
      card: css('.fof-card'),
      fact: role('button', 'Fact', true),
      fake: role('button', 'Fake', true),
    },
  },
  {
    id: 'fof-answer',
    height: { phone: 1100 },
    url: '/#/play/fact-or-fake?seed=e2e-seed-2',
    ready: text(/Fact or Fake · 1 of 10/),
    prepare: answerUntilStamp,
    scrollTo: byVariant(css('.fof-card'), css('.lesson-bar')),
    targets: {
      stamp: text('ARAW GAME · FAKE'),
      feedback: css('.fof-feedback'),
      report: role('link', /^Report this item/),
      next: role('button', 'Next', true),
    },
  },
  {
    id: 'fof-radar',
    height: { phone: 1000 },
    url: '/#/play/fact-or-fake?seed=e2e-seed-2',
    ready: text(/Fact or Fake · 1 of 10/),
    prepare: async (page) => {
      const pattern = ['Fake', 'Fact', 'Fake', 'Fake', 'Fact', 'Fact', 'Fake', 'Fact', 'Fake', 'Fact'];
      for (let i = 0; i < 10; i++) {
        await page.getByRole('button', { name: pattern[i], exact: true }).click();
        await page.getByRole('button', { name: i === 9 ? 'See my Truth Radar' : 'Next' }).click();
      }
      await expect(page.getByRole('heading', { level: 2, name: 'Your Truth Radar' })).toBeVisible();
      await page.waitForTimeout(400);
    },
    targets: {
      score: css('.fof-results__score'),
      radar: role('meter', 'How well you tell them apart'),
      verdict: css('.radar__verdict'),
      again: role('button', 'Play again'),
    },
  },
  {
    id: 'arcade',
    height: { phone: 1000, desktop: 900 },
    url: '/#/arcade',
    targets: {
      featured: css('.arcade-featured'),
      tile: css('.arcade-tile'),
    },
  },
  {
    id: 'arcade-fof',
    url: '/#/arcade',
    scrollTo: (p) => p.getByRole('link', { name: 'Play Fact or Fake' }).filter({ visible: true }).first().locator('xpath=ancestor::*[contains(@class,"px-box")][1]'),
    targets: {
      fof: role('link', 'Play Fact or Fake'),
    },
  },
  {
    id: 'game-briefing',
    url: '/#/arcade/takbo-data?seed=guide',
    seed: { briefingsSeen: [] },
    ready: css('.briefing'),
    targets: {
      ara: css('.briefing__ara'),
      page: css('.briefing__dots'),
      next: role('button', 'Next', true),
      skip: role('button', /^Skip/),
    },
  },
  {
    id: 'game-intro',
    url: '/#/arcade/takbo-data?seed=guide',
    ready: role('button', 'Start', true),
    targets: {
      howto: role('button', 'How to play'),
      start: role('button', 'Start', true),
    },
  },
  {
    id: 'game-play',
    url: '/#/arcade/takbo-data?seed=guide',
    ready: role('button', 'Start', true),
    prepare: async (page) => {
      await page.getByRole('button', { name: 'Start', exact: true }).click();
      await expect(page.getByRole('list', { name: 'Game status' })).toBeVisible();
      await page.waitForTimeout(1500);
    },
    targets: {
      hud: role('list', 'Game status'),
      canvas: css('canvas'),
      pause: role('button', 'Pause'),
    },
  },
  {
    id: 'daily',
    height: { phone: 1200, desktop: 860 },
    url: '/#/daily',
    targets: {
      game: css('.daily-step'),
      items: (p) => p.locator('.daily-step').filter({ visible: true }).nth(1),
      status: text(/of 2 steps done/),
      streak: css('.daily-streak'),
    },
  },
  {
    id: 'daily-streak',
    url: '/#/daily',
    only: 'phone',
    scrollTo: css('.daily-side'),
    targets: {
      status: text(/of 2 steps done/),
      streak: css('.daily-streak'),
    },
  },
  {
    id: 'library-myths',
    height: { phone: 1100 },
    url: '/#/library',
    ready: role('tablist', 'Library sections'),
    prepare: async (page, variant) => {
      // on a phone the topic chips fold away behind a Filters button: the picture shows that button instead
      if (variant === 'desktop') {
        await page.locator('#myth-tawa-tawa-dengue button').first().click();
        await page.waitForTimeout(400);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
    },
    targets: {
      tabs: role('tablist', 'Library sections'),
      search: (p) => p.getByLabel('Search myths').filter({ visible: true }).first(),
      chips: byVariant(role('button', /^Filters/), css('.lib-choice__chips')),
      card: byVariant(css('.myth-flip'), css('.myth-flip--back')),
    },
  },
  {
    id: 'library-card',
    url: '/#/library',
    ready: role('tablist', 'Library sections'),
    prepare: async (page) => {
      await page.locator('#myth-tawa-tawa-dengue button').first().click();
      await page.waitForTimeout(400);
    },
    scrollTo: css('#myth-tawa-tawa-dengue'),
    targets: {
      fact: css('#myth-tawa-tawa-dengue .myth-flip__fact'),
      why: text('Why people believe it'),
      check: text('How to check'),
    },
  },
  {
    id: 'library-dictionary',
    url: '/#/library/glossary',
    ready: role('tablist', 'Library sections'),
    targets: {
      search: (p) => p.getByLabel('Search a word').filter({ visible: true }).first(),
      letters: css('.az'),
      word: css('.gl-card__term'),
    },
  },
  {
    id: 'library-comics',
    height: { phone: 1100, desktop: 960 },
    url: '/#/library/komiks',
    ready: role('tablist', 'Library sections'),
    targets: {
      episode: css('a.ep-card'),
    },
  },
  {
    id: 'comics-reader',
    height: { phone: 1180, desktop: 1000 },
    url: '/#/library/komiks/1',
    ready: css('.reader__stage'),
    targets: {
      stage: css('.reader__stage'),
      steps: css('.reader__steps, .reader__nav'),
      next: role('button', 'Next', true),
    },
  },
  {
    id: 'me-profile',
    url: '/#/me',
    targets: {
      nickname: (p) => p.getByLabel('Nickname').filter({ visible: true }).first(),
      avatar: css('.avatar-grid'),
      stats: css('.stat-list'),
    },
  },
  {
    id: 'me-badges',
    height: { phone: 1100 },
    url: '/#/me',
    scrollTo: css('.me-cabinet'),
    targets: {
      badge: css('.badge-pick'),
    },
  },
  {
    id: 'me-cert',
    url: '/#/me',
    scrollTo: css('.me-cert'),
    targets: {
      cert: css('.me-cert'),
      open: css('.me-cert .px-btn, .me-cert__locked'),
    },
  },
  {
    id: 'me-settings',
    url: '/#/me',
    scrollTo: css('.me-settings'),
    targets: {
      larger: role('switch', 'Larger text'),
      contrast: role('switch', 'High contrast'),
      buttons: role('switch', 'Extra-large buttons'),
      motion: role('switch', 'Reduce motion'),
    },
  },
  {
    id: 'me-sound',
    url: '/#/me',
    // the Sound heading when there is one, else the Music switch's row
    scrollTo: (p) =>
      p.getByRole('heading', { name: 'Sound', exact: true }).or(p.locator('.settings-row, .menu-row, li').filter({ has: p.getByRole('switch', { name: /Music/ }) })).filter({ visible: true }).first(),
    targets: {
      music: role('switch', /Music/),
      musicVolume: role('slider', /Music/),
      sfx: role('switch', /Sound effects/),
      sfxVolume: role('slider', /Sound effects/),
    },
  },
  {
    id: 'certificate',
    url: '/#/certificate',
    seed: { modulesDone: ALL, badges: [...ALL.map((m) => `module-${m}`), 'finale'] },
    ready: css('.cert-canvas'),
    prepare: async (page) => {
      await page.getByLabel('Your name').filter({ visible: true }).first().fill('Lorna Reyes');
      await page.waitForTimeout(400);
    },
    targets: {
      certificate: css('.cert-canvas'),
      name: (p) => p.locator('.cert-controls input').filter({ visible: true }).first(),
      save: css('.cert-actions .px-btn'),
    },
  },
  {
    id: 'report',
    height: { phone: 1300, desktop: 1000 },
    url: '/#/report',
    targets: {
      kind: css('.report-cats'),
      details: css('#report-details'),
      send: css('.report-ways .px-btn, button[type="submit"]'),
    },
  },
];

async function seed(page: Page, data: Record<string, unknown>, splash: boolean): Promise<void> {
  await page.addInitScript(
    ([d, showSplash]) => {
      try {
        if (!showSplash) sessionStorage.setItem('araw:v1:booted', '1');
        for (const [k, v] of Object.entries(d as Record<string, unknown>)) localStorage.setItem(`araw:v1:${k}`, JSON.stringify(v));
      } catch {
        /* storage blocked: the app falls back to memory */
      }
    },
    [data, splash] as const,
  );
}

async function headerOffset(page: Page): Promise<number> {
  return page.evaluate(() => {
    let bottom = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.banner, .lesson-bar, .tabs, [role="tablist"].top-tabs'))) {
      const s = getComputedStyle(el);
      if (s.position !== 'sticky' && s.position !== 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.top <= 1) bottom = Math.max(bottom, r.bottom);
    }
    return bottom;
  });
}

for (const shot of SHOTS) {
  test(shot.id, async ({ page }, info) => {
    const variant = info.project.name as ShotVariant;
    test.skip(!!shot.only && shot.only !== variant, `only ${shot.only}`);
    const h = shot.height?.[variant];
    if (h) await page.setViewportSize({ width: page.viewportSize()!.width, height: h });
    await page.clock.setFixedTime(NOW);
    await seed(page, { ...(shot.fresh ? {} : LIVED_IN), ...shot.seed }, !!shot.splash);
    await page.goto(shot.url);
    await (shot.ready ?? css('h1'))(page, variant).waitFor({ state: 'visible', timeout: 20_000 });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(500);
    if (shot.prepare) await shot.prepare(page, variant);

    if (shot.scrollTo) {
      const loc = shot.scrollTo(page, variant);
      if (await loc.isVisible().catch(() => false)) {
        const offset = await headerOffset(page);
        await loc.evaluate((el, off) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off - 12), offset);
        await page.waitForTimeout(300);
      } else console.log(`NOSCROLL ${variant} ${shot.id}`);
    }
    // the focused element's ring is not part of the picture
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());

    const vp = page.viewportSize()!;
    let clip = { x: 0, y: 0, width: vp.width, height: vp.height };
    if (shot.crop) {
      const b = await shot.crop(page, variant).boundingBox({ timeout: 1500 }).catch(() => null);
      if (b) {
        const pad = 12;
        const x = Math.max(0, Math.floor(b.x - pad));
        const y = Math.max(0, Math.floor(b.y - pad));
        clip = { x, y, width: Math.min(vp.width, Math.ceil(b.x + b.width + pad)) - x, height: Math.min(vp.height, Math.ceil(b.y + b.height + pad)) - y };
      }
    }

    const boxes: Record<string, Box> = {};
    for (const [key, target] of Object.entries(shot.targets)) {
      const b = await target(page, variant).boundingBox({ timeout: 1500 }).catch(() => null);
      if (!b || b.width === 0) {
        console.log(`MISSING ${variant} ${shot.id}.${key}`);
        continue;
      }
      const x0 = Math.max(b.x, clip.x);
      const y0 = Math.max(b.y, clip.y);
      const x1 = Math.min(b.x + b.width, clip.x + clip.width);
      const y1 = Math.min(b.y + b.height, clip.y + clip.height);
      if (x1 - x0 < 4 || y1 - y0 < 4) {
        console.log(`OFFSCREEN ${variant} ${shot.id}.${key}`);
        continue;
      }
      boxes[key] = { x: Math.round(x0 - clip.x), y: Math.round(y0 - clip.y), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) console.log(`OVERFLOW ${variant} ${shot.id} ${overflow}`);

    mkdirSync(IMG_DIR, { recursive: true });
    mkdirSync(PART_DIR, { recursive: true });
    const file = `${shot.id}-${variant}.png`;
    await page.screenshot({ path: join(IMG_DIR, file), clip, animations: 'disabled', caret: 'hide' });
    const scale = variant === 'phone' ? 2 : 1;
    writeFileSync(
      join(PART_DIR, `${shot.id}--${variant}.json`),
      JSON.stringify({ id: shot.id, variant, file: `guide/${file}`, w: clip.width, h: clip.height, scale, boxes }, null, 1),
    );
  });
}
