import { mkdirSync, appendFileSync } from 'node:fs';
import { test } from '@playwright/test';

const OUT = 'shots-out/audit';
const LANGS = (process.env.AUDIT_LANGS ?? 'en,fil,ceb,ilo,hil').split(',');
const VPS = [['phone', 360, 740], ['phoneL', 740, 360], ['tablet', 820, 1180], ['laptop', 1366, 768], ['wide', 1920, 1080]] as const;
const PAGES = ['/', '/learn', '/learn/m01', '/arcade', '/daily', '/library/myths', '/library/glossary', '/library/komiks', '/me', '/about', '/report', '/guide', '/play/fact-or-fake'];
const GAMES = ['takbo-data', 'feed-mo-to', 'luto-ni-ara', 'sino-to', 'lamok-lamay', 'tawid-lola', 'hati-tayo', 'gawa-ko-to', 'tulog-na-bea', 'sa-sapatos-nila', 'objection'];
const ROUTES = [...PAGES.map((p) => [p, p] as const), ...GAMES.map((g) => [`g-${g}`, `/arcade/${g}`] as const)];

/** Runs in the page: returns human-readable layout problems. */
function detect(): string[] {
  const issues: string[] = [];
  const vw = document.documentElement.clientWidth;
  const label = (e: Element) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''}`;
  const visible = (e: Element) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const txt = (e: Element) => [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim()).map((n) => { const rg = document.createRange(); rg.selectNodeContents(n); return rg.getBoundingClientRect(); }).filter((r) => r.width > 0);
  const els = [...document.body.querySelectorAll('*')].filter((e) => visible(e) && txt(e).length).slice(0, 600);
  const boxes = els.map((e) => { const rs = txt(e); const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top)), r2 = Math.max(...rs.map((r) => r.right)), b = Math.max(...rs.map((r) => r.bottom)); return { e, l, t, r: r2, b }; });
  for (const { e, l, r } of boxes) {
    const s = getComputedStyle(e);
    if (l < -1000) continue; // honeypot field parked off-screen if ((r > vw + 1 || l < -1) && !e.closest('.az, [data-scroll]') && !/auto|scroll/.test(getComputedStyle(e.parentElement!.closest('ul,div') ?? e).overflowX)) issues.push(`OFFSCREEN ${label(e)} "${e.textContent!.trim().slice(0, 30)}" ${Math.round(l)}..${Math.round(r)} vw=${vw}`);
    const clips = /hidden|clip/.test(s.overflowX + s.overflowY);
    if (clips && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) && e.clientWidth > 0) issues.push(`CLIPPED ${label(e)} "${e.textContent!.trim().slice(0, 30)}" ${e.scrollWidth}x${e.scrollHeight} in ${e.clientWidth}x${e.clientHeight}`);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    const fixed = (e: Element) => !!e.closest('.nav-item, nav, .banner, [role=dialog]') ; if (fixed(a.e) !== fixed(b.e)) continue; if (ox > 3 && oy > 0.35 * Math.min(a.b - a.t, b.b - b.t)) issues.push(`OVERLAP ${label(a.e)} "${a.e.textContent!.trim().slice(0, 20)}" x ${label(b.e)} "${b.e.textContent!.trim().slice(0, 20)}" ${Math.round(ox)}x${Math.round(oy)}`);
  }
  if (document.documentElement.scrollWidth > vw) issues.push(`HSCROLL ${document.documentElement.scrollWidth - vw}px`);
  const c = document.querySelector('canvas');
  if (c) { const r = c.getBoundingClientRect(); if (r.bottom > innerHeight + 2 || r.top < -2) issues.push(`CANVAS not fully in view: ${Math.round(r.width)}x${Math.round(r.height)} top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} vh=${innerHeight}`); if (r.width < 280) issues.push(`CANVAS small ${Math.round(r.width)}x${Math.round(r.height)}`); }
  return [...new Set(issues)].slice(0, 12);
}

mkdirSync(OUT, { recursive: true });
for (const lang of LANGS) for (const [vp, w, h] of VPS) for (const [name, url] of ROUTES) {
  test(`${lang} ${vp} ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.addInitScript((l) => {
      sessionStorage.setItem('araw:v1:booted', '1');
      localStorage.setItem('araw:v1:language', JSON.stringify(l));
      localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10']));
      localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(GAMES));
    }, lang);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/#${url}?seed=audit`);
    await page.waitForTimeout(900);
    await page.evaluate(() => document.fonts.ready);
    const check = async (st: string) => {
      const issues = await page.evaluate(detect);
      if (!issues.length) return;
      const file = `${lang}_${vp}_${name.replace(/\W+/g, '-')}_${st}.png`;
      await page.screenshot({ path: `${OUT}/${file}` });
      appendFileSync(`${OUT}/report.txt`, [file, ...issues.map((i) => `  ${i}`), ''].join('\n'));
    };
    await check('start');
    if (name.startsWith('g-')) {
      if (await page.locator('.briefing').count()) { await page.locator('.briefing__actions > button').first().click(); await page.waitForTimeout(500); await check('intro'); }
      const btn = page.locator('.game-card__actions button').first();
      if (await btn.isVisible().catch(() => false)) { await btn.click(); await page.waitForTimeout(1200); await check('play'); }
    }
  });
}
