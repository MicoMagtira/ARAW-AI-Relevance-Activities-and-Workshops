// Review 2 screenshots (not part of verify): npx playwright test -c scripts/shots/shots.config.ts shots2.spec.ts
// Output: shots-out/screens-2. Logs OVERFLOW and AXE lines for every screen.
import AxeBuilder from '@axe-core/playwright';
import { test, type Page } from '@playwright/test';
const DIR = process.env.SHOTS_DIR ?? 'shots-out/screens-2';
const ALL = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'];
const CARDS: Record<string, number> = { m01: 9, m02: 8, m03: 8, m04: 8, m05: 8, m06: 8, m07: 8, m08: 8, m09: 8, m10: 8 };
const GAMES = ['takbo-data', 'feed-mo-to', 'luto-ni-ara', 'sino-to', 'lamok-lamay', 'tawid-lola', 'hati-tayo',
  'gawa-ko-to', 'tulog-na-bea', 'sa-sapatos-nila', 'objection'];

async function shot(page: Page, name: string, project: string, full = true) {
  await page.waitForTimeout(800);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) console.log(`OVERFLOW ${project} ${name} ${overflow}`);
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  for (const v of axe.violations) console.log(`AXE ${project} ${name} ${v.impact} ${v.id} ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  await page.screenshot({ path: `${DIR}/${project}-${name}.png`, fullPage: full });
}

function seed(page: Page, data: Record<string, unknown>) {
  return page.addInitScript((d) => {
    sessionStorage.setItem('araw:v1:booted', '1');
    for (const [k, v] of Object.entries(d)) localStorage.setItem(`araw:v1:${k}`, JSON.stringify(v));
  }, data);
}

const ROUTES: [string, string, Record<string, unknown>][] = [
  ['home-new', '/#/', {}],
  ['home-progress', '/#/', { modulesDone: ['m01', 'm02', 'm03'], badges: ['module-m01', 'streak-3'] }],
  ['learn', '/#/learn', { modulesDone: ['m01', 'm02', 'm03', 'm04', 'm05'] }],
  ['arcade', '/#/arcade', {}], ['daily', '/#/daily', {}], ['fof', '/#/play/fact-or-fake', {}], ['assess', '/#/assess/a', {}],
  ['library', '/#/library', {}], ['library-glossary', '/#/library/glossary', {}], ['library-komiks', '/#/library/komiks', {}],
  ['komiks-1', '/#/library/komiks/1', {}], ['komiks-5', '/#/library/komiks/5', {}],
  ['me', '/#/me', { modulesDone: ALL.slice(0, 4), badges: ['module-m01', 'streak-3'] }],
  ['certificate-locked', '/#/certificate', {}],
  ['certificate', '/#/certificate', { modulesDone: ALL }],
  ['report', '/#/report', {}], ['about', '/#/about', {}], ['notfound', '/#/nope', {}],
];

for (const [name, url, data] of ROUTES) {
  test(name, async ({ page }, info) => {
    await seed(page, data);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await shot(page, name, info.project.name);
  });
}

for (const id of ALL) {
  for (const mode of ['hook', 'game'] as const) {
    test(`${id}-${mode}`, async ({ page }, info) => {
      await seed(page, { modulesDone: ALL.filter((m) => m < id), ...(mode === 'game' ? { cardsDone: CARDS } : {}) });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/#/');
      await page.goto(`/#/learn/${id}?seed=shots`);
      await shot(page, `${id}-${mode}`, info.project.name);
    });
  }
}

for (const slug of GAMES) {
  test(`game-${slug}`, async ({ page }, info) => {
    await seed(page, { briefingsSeen: GAMES, modulesDone: ALL });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/#/arcade/${slug}?seed=shots`);
    await shot(page, `game-${slug}-intro`, info.project.name);
    const start = page.getByRole('button', { name: /^(Start|Play|Let's go|Simulan|Enter the hall|Begin|Open the hall)/i }).first();
    if (await start.isVisible().catch(() => false)) {
      await start.click();
      await page.waitForTimeout(1500);
      await shot(page, `game-${slug}-play`, info.project.name, false);
    } else console.log(`NOSTART ${info.project.name} ${slug}`);
  });
}

for (const [name, url, extra] of [['a11y-home', '/#/', {}], ['a11y-arcade', '/#/arcade', {}], ['a11y-komiks', '/#/library/komiks/2', {}],
  ['a11y-m08-game', '/#/learn/m08?seed=shots', { cardsDone: CARDS }], ['a11y-me', '/#/me', {}]] as const) {
  test(name, async ({ page }, info) => {
    await seed(page, { ...extra, modulesDone: ALL.slice(0, 7),
      settings: { largeText: true, highContrast: true, xlButtons: true, srHints: true, reduceMotion: true } });
    await page.goto('/#/');
    await page.goto(url);
    await shot(page, name, info.project.name);
  });
}
