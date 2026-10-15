import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, noHorizontalOverflow, test } from './fixtures';

// One sweep over every screen at the widths the app is designed for (the Playwright projects only cover three of them).
// It sets its own viewport, so it runs once (desktop project) instead of three times.
const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },
  { name: '360', width: 360, height: 740 },
  { name: '414', width: 414, height: 896 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: 'phone landscape', width: 740, height: 360 },
] as const;

const SCREENS = [
  '/',
  '/learn',
  '/learn/m01',
  '/arcade',
  '/arcade/takbo-data',
  '/arcade/gawa-ko-to',
  '/arcade/hati-tayo',
  '/play/fact-or-fake',
  '/daily',
  '/library/myths',
  '/library/glossary',
  '/library/komiks',
  '/me',
  '/about',
  '/report',
  '/certificate',
  '/no-such-page',
];

/** Controls people press: each needs a 44px target (inline text links are exempt, as in WCAG 2.5.8). */
const TARGETS = 'button, [role="tab"], [role="switch"], [role="radio"], [role="checkbox"], input:not([type="hidden"]), select, textarea, nav a, .btn';

async function settle(page: Page) {
  await page.locator('#main').waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState === 'finished' || a.effect?.getTiming().iterations === Infinity));
}

test.describe('Responsive sweep', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewports');
  });
  test.setTimeout(180_000);

  for (const vp of VIEWPORTS) {
    test(`every screen fits at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.addInitScript(() => localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(['takbo-data', 'gawa-ko-to', 'hati-tayo'])));
      const problems: string[] = [];
      for (const path of SCREENS) {
        await page.goto(`/#${path}`);
        await settle(page);
        await noHorizontalOverflow(page);
        if (path === '/arcade/takbo-data') await expect(page.locator('canvas')).toHaveCount(1); // the pixel rules below really ran on a game canvas
        const found = await page.evaluate((selector) => {
          const out: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>(selector)) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0 || getComputedStyle(el).visibility === 'hidden') continue;
            if (el.closest('[inert], [hidden]')) continue;
            if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0]} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          for (const canvas of document.querySelectorAll('canvas')) {
            if (!/pixelated|crisp-edges/.test(getComputedStyle(canvas).imageRendering)) out.push('canvas without pixelated rendering');
            const r = canvas.getBoundingClientRect();
            if (r.right > innerWidth + 0.5 || r.left < -0.5) out.push('canvas outside the viewport');
          }
          return out;
        }, TARGETS);
        for (const f of found) problems.push(`${path}: ${f}`);
      }
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});

// Accessibility sweep (WCAG 2.2 AA tags): every route, every module hook and every arcade intro at phone, tablet and desktop sizes.
// A new player is the hardest state (everything locked), which is where an unfocusable scrolling list once slipped through.
const GAME_SLUGS = ['takbo-data', 'feed-mo-to', 'luto-ni-ara', 'sino-to', 'lamok-lamay', 'tawid-lola', 'hati-tayo', 'gawa-ko-to', 'tulog-na-bea', 'sa-sapatos-nila', 'objection'];
const AXE_SCREENS = [
  '/',
  '/learn',
  '/arcade',
  '/daily',
  '/play/fact-or-fake',
  '/assess/a',
  '/library',
  '/library/myths',
  '/library/glossary',
  '/library/komiks',
  '/library/komiks/1',
  '/me',
  '/certificate',
  '/report',
  '/about',
  '/no-such-page',
  ...Array.from({ length: 10 }, (_, i) => `/learn/m${String(i + 1).padStart(2, '0')}`),
  ...GAME_SLUGS.map((slug) => `/arcade/${slug}`),
];
const AXE_SIZES = [
  { name: 'phone', width: 360, height: 740 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

test.describe('Accessibility sweep', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'sets its own viewports');
  });
  test.setTimeout(240_000);

  for (const size of AXE_SIZES) {
    test(`axe finds nothing on any screen at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const problems: string[] = [];
      for (const path of AXE_SCREENS) {
        await page.goto(`/#${path}`);
        await settle(page);
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        for (const v of result.violations) problems.push(`${path}: ${v.impact} ${v.id} ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
      }
      expect(problems, problems.join('\n')).toEqual([]);
    });
  }
});
