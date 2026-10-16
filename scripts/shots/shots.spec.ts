import { test } from '@playwright/test';
const DIR = process.env.SHOTS_DIR ?? 'shots-out/screens-1';

const ROUTES: [string, string][] = [
  ['home', '/#/'], ['learn', '/#/learn'], ['lesson-m06', '/#/learn/m06'],
  ['fof', '/#/play/fact-or-fake'], ['assess', '/#/assess/a'], ['arcade', '/#/arcade'], ['library', '/#/library'],
  ['me', '/#/me'], ['report', '/#/report'], ['about', '/#/about'], ['notfound', '/#/nope'],
];
const CARDS: Record<string, number> = { m01: 9, m02: 8, m03: 8, m04: 8, m05: 8 };

test('splash', async ({ page }, info) => {
  await page.goto('/');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${DIR}/${info.project.name}-splash.png` });
});

async function shot(page: import('@playwright/test').Page, name: string, project: string) {
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 0) console.log(`OVERFLOW ${project} ${name} ${overflow}`);
  await page.screenshot({ path: `${DIR}/${project}-${name}.png`, fullPage: true });
}

for (const [name, url] of ROUTES) {
  test(name, async ({ page }, info) => {
    await page.addInitScript(() => sessionStorage.setItem('araw:v1:booted', '1'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await shot(page, name, info.project.name);
  });
}

for (const id of Object.keys(CARDS)) {
  for (const mode of ['hook', 'game'] as const) {
    test(`${id}-${mode}`, async ({ page }, info) => {
      await page.addInitScript(([cards]) => {
        sessionStorage.setItem('araw:v1:booted', '1');
        localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04']));
        if (cards) localStorage.setItem('araw:v1:cardsDone', cards);
      }, [mode === 'game' ? JSON.stringify(CARDS) : ''] as const);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/#/');
      await page.goto(`/#/learn/${id}?seed=shots`);
      await shot(page, `${id}-${mode}`, info.project.name);
    });
  }
}

for (const [name, url, cards] of [['a11y-home', '/#/', ''], ['a11y-m05-game', '/#/learn/m05?seed=shots', '{"m05":8}'], ['a11y-fof', '/#/play/fact-or-fake', '']] as const) {
  test(name, async ({ page }, info) => {
    await page.addInitScript(([c]) => {
      sessionStorage.setItem('araw:v1:booted', '1');
      localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04']));
      if (c) localStorage.setItem('araw:v1:cardsDone', c);
      localStorage.setItem('araw:v1:settings', JSON.stringify({ largeText: true, highContrast: true, xlButtons: true, srHints: true, reduceMotion: true }));
    }, [cards] as const);
    await page.goto('/#/');
    await page.goto(url);
    await shot(page, name, info.project.name);
  });
}
