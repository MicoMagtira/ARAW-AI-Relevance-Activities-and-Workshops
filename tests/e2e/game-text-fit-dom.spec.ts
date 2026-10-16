// Text-fit tour for DOM games, module games and lesson cards: drives each route generically in every language and
// reports clipped text, text spilling out of its bordered parent, overlapping sibling text and page overflow.
// Run: npx vite build --outDir dist-dom && npx playwright test -c tests/e2e/game-text-fit-dom.config.ts
import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LANGS = (process.env.TF_LANGS ?? 'en,fil,ceb,ilo,hil').split(',');
const ONLY = process.env.TF_ROUTES?.split(',');
const MAX_STEPS = Number(process.env.TF_STEPS ?? 150);
const ROUTES = [
  '/arcade/takbo-data',
  '/arcade/luto-ni-ara',
  '/arcade/gawa-ko-to',
  '/arcade/tulog-na-bea',
  '/arcade/sa-sapatos-nila',
  '/arcade/objection',
  '/play/fact-or-fake',
  '/daily',
  ...Array.from({ length: 10 }, (_, i) => `/learn/m${String(i + 1).padStart(2, '0')}`),
].filter((r) => !ONLY || ONLY.some((o) => r.includes(o)));

const OUT = fileURLToPath(new URL('./out', import.meta.url));

interface Violation {
  kind: 'clipped' | 'spill' | 'overlap' | 'page';
  selector: string;
  text: string;
  sizes: string;
}

/** Runs in the page. Returns de-duplicated violations. */
function detect(): Violation[] {
  const out: Violation[] = [];
  const seen = new Set<string>();
  const root = document.querySelector('#main') ?? document.body;
  const sel = (el: Element): string => {
    const parts: string[] = [];
    let cur: Element | null = el;
    for (let i = 0; cur && cur !== document.body && i < 4; i++, cur = cur.parentElement) {
      const cls = [...cur.classList].slice(0, 2).join('.');
      parts.unshift(cur.tagName.toLowerCase() + (cls ? '.' + cls : ''));
    }
    return parts.join(' > ');
  };
  const visible = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    // content of a closed <details> is not rendered (only its summary)
    for (let d = el.closest('details:not([open])'); d; d = d.parentElement?.closest('details:not([open])') ?? null) {
      if (!(el.closest('summary') && el.closest('summary')?.parentElement === d)) return false;
    }
    for (let c: Element | null = el; c && c !== document.body; c = c.parentElement) {
      const s = getComputedStyle(c);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    }
    return true;
  };
  const directText = (el: Element): string =>
    [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent ?? '')
      .join('')
      .trim();
  const textRect = (el: Element): DOMRect | null => {
    const rg = document.createRange();
    let any = false;
    let l = Infinity,
      t = Infinity,
      r = -Infinity,
      b = -Infinity;
    for (const n of el.childNodes) {
      if (n.nodeType !== 3 || !(n.textContent ?? '').trim()) continue;
      rg.selectNodeContents(n);
      for (const q of rg.getClientRects()) {
        if (q.width < 1) continue;
        any = true;
        l = Math.min(l, q.left);
        t = Math.min(t, q.top);
        r = Math.max(r, q.right);
        b = Math.max(b, q.bottom);
      }
    }
    return any ? new DOMRect(l, t, r - l, b - t) : null;
  };
  const push = (kind: Violation['kind'], el: Element, sizes: string) => {
    const key = kind + sel(el);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      kind,
      selector: sel(el),
      text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 50),
      sizes,
    });
  };
  const all = [root, ...root.querySelectorAll('*')].filter((e) => !e.closest('svg') || e.tagName.toLowerCase() === 'svg');
  for (const el of all) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    if (el.classList.contains('sr-only') || cs.clip.startsWith('rect(0')) continue;
    const hasText = (el.textContent ?? '').trim().length > 0;
    // 1. clipped
    if (hasText && el.tagName.toLowerCase() !== 'svg') {
      const hx = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
      const hy = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
      if (hx && el.scrollWidth > el.clientWidth + 1) push('clipped', el, `sw${el.scrollWidth}>cw${el.clientWidth}`);
      else if (hy && el.scrollHeight > el.clientHeight + 1) push('clipped', el, `sh${el.scrollHeight}>ch${el.clientHeight}`);
    }
    // 2. spill out of the nearest bordered ancestor (or self if bordered)
    const own = directText(el);
    if (own) {
      const tr = textRect(el);
      let anc: Element | null = el;
      while (anc && anc !== document.body && anc !== root) {
        const s = getComputedStyle(anc);
        const bordered =
          parseFloat(s.borderTopWidth) > 0 ||
          parseFloat(s.borderLeftWidth) > 0 ||
          s.boxShadow !== 'none' ||
          s.backgroundColor !== 'rgba(0, 0, 0, 0)';
        if (bordered) break;
        anc = anc.parentElement;
      }
      if (tr && anc && anc !== document.body && anc !== root) {
        const a = anc.getBoundingClientRect();
        const s = getComputedStyle(anc);
        const bl = parseFloat(s.borderLeftWidth),
          br = parseFloat(s.borderRightWidth),
          bt = parseFloat(s.borderTopWidth),
          bb = parseFloat(s.borderBottomWidth);
        let scroller = false;
        for (let c: Element | null = el; c && c !== anc.parentElement; c = c.parentElement) {
          const cc = getComputedStyle(c);
          if (/(auto|scroll)/.test(cc.overflowX + cc.overflowY)) scroller = true;
        }
        const tol = 1.5;
        if (
          !scroller &&
          (tr.left < a.left + bl - tol || tr.right > a.right - br + tol || tr.top < a.top + bt - tol || tr.bottom > a.bottom - bb + tol)
        ) {
          push(
            'spill',
            el,
            `text[${Math.round(tr.left)},${Math.round(tr.top)},${Math.round(tr.right)},${Math.round(tr.bottom)}] box[${Math.round(a.left)},${Math.round(a.top)},${Math.round(a.right)},${Math.round(a.bottom)}] ${sel(anc)}`,
          );
        }
      }
    }
    // 3. overlap with a sibling
    if (own && el.parentElement) {
      const tr = textRect(el);
      const pos = cs.position;
      if (tr && pos !== 'absolute' && pos !== 'fixed' && cs.display !== 'inline') {
        for (const sib of el.parentElement.children) {
          if (sib === el || !visible(sib)) continue;
          const ss = getComputedStyle(sib);
          if (ss.position === 'absolute' || ss.position === 'fixed') continue;
          const sr = sib.tagName.toLowerCase() === 'svg' ? null : directText(sib) ? textRect(sib) : null;
          if (!sr) continue;
          const ox = Math.min(tr.right, sr.right) - Math.max(tr.left, sr.left);
          const oy = Math.min(tr.bottom, sr.bottom) - Math.max(tr.top, sr.top);
          if (ox > 2 && oy > 5) push('overlap', el, `with ${sel(sib)} ${Math.round(ox)}x${Math.round(oy)}`);
        }
      }
    }
  }
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1)
    out.push({
      kind: 'page',
      selector: 'html',
      text: '',
      sizes: `sw${de.scrollWidth}>cw${de.clientWidth}`,
    });
  return out;
}

/** Runs in the page: tag the next button to press and return its label, or null. */
function pickNext(done: string[]): string | null {
  const main = document.querySelector('#main');
  if (!main) return null;
  const dialogs = [...document.querySelectorAll('dialog[open],[role=dialog]')];
  const scope: Element[] = dialogs.length ? dialogs : [main];
  const cands: HTMLElement[] = [];
  for (const sc of scope) {
    for (const b of sc.querySelectorAll<HTMLElement>('button, input[type=radio], [role=radio], [role=button]')) {
      const r = b.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if ((b as HTMLButtonElement).disabled || b.getAttribute('aria-disabled') === 'true') continue;
      const st = getComputedStyle(b);
      if (st.visibility === 'hidden' || st.display === 'none' || st.pointerEvents === 'none') continue;
      cands.push(b);
    }
  }
  const txt = main.textContent ?? '';
  let h = 0;
  for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) | 0;
  const sig = `${h}:${document.querySelectorAll('[aria-pressed=true],[aria-checked=true],input:checked').length}`;
  const label = (b: HTMLElement) =>
    sig +
    '#' +
    (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) +
    '|' +
    (b.className || '').toString().slice(0, 40);
  const fresh = cands.filter((b) => !done.includes(label(b)));
  if (!fresh.length) return null;
  const rank = (b: HTMLElement) => (b.matches('.px-btn:not(.px-btn--secondary)') ? 0 : 1);
  fresh.sort((a, b) => rank(a) - rank(b));
  const pick = fresh[0]!;
  document.querySelectorAll('[data-tf-pick]').forEach((e) => e.removeAttribute('data-tf-pick'));
  pick.setAttribute('data-tf-pick', '1');
  return label(pick);
}

// a long tour with its own build and port: skipped in `npm run verify`, run with -c tests/e2e/game-text-fit-dom.config.ts
test.skip(({ baseURL }) => !baseURL?.includes(':4183'), 'run with -c tests/e2e/game-text-fit-dom.config.ts');

for (const language of LANGS) {
  test(`dom text fit tour ${language}`, async ({ page }, info) => {
    const vp = info.project.name;
    const results: Array<
      Violation & {
        route: string;
        step: string;
        language: string;
        viewport: string;
      }
    > = [];
    fs.mkdirSync(path.join(OUT, 'parts'), { recursive: true });
    {
      await page.addInitScript((l) => {
        try {
          localStorage.setItem(
            'araw:v1:modulesDone',
            JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10']),
          );
          localStorage.setItem(
            'araw:v1:cardsDone',
            JSON.stringify({
              m01: 12,
              m02: 12,
              m03: 12,
              m04: 12,
              m05: 12,
              m06: 12,
              m07: 12,
              m08: 12,
              m09: 12,
              m10: 12,
            }),
          );
          localStorage.setItem('araw:v1:language', JSON.stringify(l));
          sessionStorage.setItem('araw:v1:booted', '1');
        } catch {
          /* ignore */
        }
      }, language);
      for (const route of ROUTES) {
        await page.goto('/#' + route);
        await page.reload();
        await page.waitForSelector('#main', { timeout: 15000 });
        await page.waitForTimeout(300);
        const done: string[] = [];
        const cover = () => console.log(`cover ${vp} ${language} ${route} steps=${done.length}`);
        for (let step = 0; step <= MAX_STEPS; step++) {
          const vs = await page.evaluate(detect);
          for (const v of vs)
            results.push({
              ...v,
              route,
              step: `${step}:${done[done.length - 1] ?? 'initial'}`,
              language,
              viewport: vp,
            });
          const lab = await page.evaluate(pickNext, done);
          if (!lab) {
            cover();
            break;
          }
          done.push(lab);
          try {
            await page.locator('[data-tf-pick]').first().click({ timeout: 2000, force: true });
          } catch {
            try {
              await page
                .locator('[data-tf-pick]')
                .first()
                .evaluate((e) => (e as HTMLElement).click());
            } catch {
              /* skip */
            }
          }
          await page.waitForTimeout(150);
          if (!page.url().includes('#' + route)) {
            await page.goto('/#' + route);
            break;
          }
        }
      }
    }
    fs.writeFileSync(path.join(OUT, 'parts', `${vp}-${language}.json`), JSON.stringify(results));
    const merged = fs.readdirSync(path.join(OUT, 'parts')).flatMap((f) => JSON.parse(fs.readFileSync(path.join(OUT, 'parts', f), 'utf8')));
    fs.writeFileSync(path.join(OUT, 'game-text-fit-dom.json'), JSON.stringify(merged, null, 1));
    console.log(`${vp} ${language}: ${results.length} violations`);
  });
}
