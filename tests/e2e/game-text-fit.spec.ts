// Text-fit tour for the canvas games, in every language. Run with its own config (see game-text-fit.config.ts).
// An init script watches the 2D context: every fillRect/strokeRect is a box, a full-canvas clearRect starts a frame, and
// every fillText is measured (after translation, with maxWidth compression). Text whose ink leaves the smallest box drawn
// before it that holds its anchor (and is tall enough to be its container), or leaves the canvas, is a violation.
// Each game is then played generically for a while (keys, taps, the shell's buttons) so intro, play, feedback and
// results frames all render. Findings: tests/e2e/out/game-text-fit-canvas.json.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

const GAMES = ['takbo-data', 'feed-mo-to', 'luto-ni-ara', 'sino-to', 'lamok-lamay', 'tawid-lola', 'hati-tayo'] as const;
const LANGS = ['en', 'fil', 'ceb', 'ilo', 'hil'] as const;
const PLAY_MS = Number(process.env.FIT_PLAY_MS ?? 40_000);
/** Optional filter, e.g. FIT_GAMES=luto-ni-ara,sino-to */
const ONLY = process.env.FIT_GAMES?.split(',').filter(Boolean);
/** Character, customer and user names drawn on the canvas (proper names are never translated). */
const NAMES = /^(?:TAKBO, DATA!|FEED MO 'TO|LUTO NI ARA|SINO 'TO\?|LAMOK LAMAY|TAWID LOLA!|HATI TAYO!)$/i;
/** Per game: words that are proper names (customers, users, callers, places), matched whole and case-insensitively. */
const NAMES_BY_GAME: Record<string, readonly string[]> = {
  'takbo-data': ['SARI'], // the SARI-SARI store sign
  'feed-mo-to': [],
  'luto-ni-ara': ['NENA', 'TONYO', 'JOY', 'BEN', 'CORA', 'LITO', 'BEBE'],
  'sino-to': ['MAMA', 'PAPA', 'LOLA', 'NENA', 'ATE', 'LIZA', 'KUYA', 'BEN', 'TITO', 'RAUL', 'DR', 'ALCANTARA', 'BANKO', 'LIWANAG', 'PisoPay', 'Kikay', 'Tagpi', 'Bibingka', 'Kidlat', 'Santan', 'San', 'Isidro', 'Norte', 'Masagana', 'District', 'General', 'Hospital', 'Barangay', 'Health', 'Center', 'Clinic'],
  'lamok-lamay': [],
  'tawid-lola': [],
  'hati-tayo': [],
};

const OUT = fileURLToPath(new URL('./out', import.meta.url));
const PORT = process.env.FIT_PORT ?? '4182';
const PARTS = `${OUT}/game-text-fit`;

interface Violation {
  text: string;
  font: string;
  /** Text ink and the box it should stay in, in logical pixels: [left, top, right, bottom]. */
  ink: number[];
  box: number[] | 'canvas';
  /** How far the ink spills on each side (logical px). */
  over: { left: number; top: number; right: number; bottom: number };
}

interface FitReport {
  frames: number;
  texts: number;
  violations: Violation[];
  /** Strings drawn exactly as given while a language pack is active (tx found nothing for them). */
  unchanged: string[];
  /** draw.ts log of text that had to shrink or squeeze to fit. */
  fitted: Array<{ text: string; size: number; px: number; squeezed: boolean }>;
}

/** Runs in the page before the app. Keeps everything on window.__fit. */
function instrument(): void {
  type Rect = [number, number, number, number];
  const P = CanvasRenderingContext2D.prototype;
  const native = { fillRect: P.fillRect, strokeRect: P.strokeRect, clearRect: P.clearRect, fillText: P.fillText, measureText: P.measureText };
  const boxes = new WeakMap<HTMLCanvasElement, Rect[]>();
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  const STABLE_FRAMES = 4;
  const report: FitReport = { frames: 0, texts: 0, violations: [], unchanged: [], fitted: [] };
  (window as unknown as { __fit: FitReport }).__fit = report;
  (window as unknown as { __arawFit: unknown[] }).__arawFit = report.fitted;
  const unchanged = new Set<string>();
  let original: string | null = null;

  const toDevice = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): Rect => {
    const m = ctx.getTransform();
    const xs = [m.a * x + m.e, m.a * (x + w) + m.e];
    const ys = [m.d * y + m.f, m.d * (y + h) + m.f];
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  const list = (ctx: CanvasRenderingContext2D): Rect[] => {
    let l = boxes.get(ctx.canvas);
    if (!l) boxes.set(ctx.canvas, (l = []));
    return l;
  };
  const addBox = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const r = toDevice(ctx, x, y, w, h);
    if (r[2] - r[0] >= 1 && r[3] - r[1] >= 1) list(ctx).push(r);
  };

  P.clearRect = function (x, y, w, h) {
    const r = toDevice(this, x, y, w, h);
    if (r[0] <= 0 && r[1] <= 0 && r[2] >= this.canvas.width && r[3] >= this.canvas.height) {
      boxes.set(this.canvas, []);
      report.frames++;
    }
    return native.clearRect.call(this, x, y, w, h);
  };
  P.fillRect = function (x, y, w, h) {
    addBox(this, x, y, w, h);
    return native.fillRect.call(this, x, y, w, h);
  };
  P.strokeRect = function (x, y, w, h) {
    addBox(this, x, y, w, h);
    return native.strokeRect.call(this, x, y, w, h);
  };
  P.fillText = function (value: string, x: number, y: number, maxWidth?: number) {
    const s = String(value);
    if (s.trim() !== '' && this.canvas instanceof HTMLCanvasElement) {
      report.texts++;
      if ((original ?? s) === s && !unchanged.has(s) && unchanged.size < 2000) {
        unchanged.add(s);
        report.unchanged.push(s);
      }
      const m = native.measureText.call(this, s);
      const squeeze = maxWidth !== undefined && m.width > maxWidth ? maxWidth / m.width : 1;
      const t = this.getTransform();
      const k = t.a; // device px per logical px
      const ink: Rect = [
        t.a * (x - m.actualBoundingBoxLeft * squeeze) + t.e,
        t.d * (y - m.actualBoundingBoxAscent) + t.f,
        t.a * (x + m.actualBoundingBoxRight * squeeze) + t.e,
        t.d * (y + m.actualBoundingBoxDescent) + t.f,
      ];
      const tol = k + 0.01; // measured ink carries about 1px of antialiasing margin
      const align = this.textAlign;
      const px = align === 'center' ? (ink[0] + ink[2]) / 2 : align === 'right' || align === 'end' ? ink[2] - k : ink[0] + k;
      const py = (ink[1] + ink[3]) / 2;
      const tall = (ink[3] - ink[1]) * 0.9;
      // the container: the latest box under the anchor that is tall and wide enough to hold a line of text (sprite
      // pixels and 1px scanlines are not containers; the latest one, so a neighbour drawn earlier does not count)
      let best: Rect | null = null;
      const boxesNow = list(this);
      for (let i = boxesNow.length - 1; i >= 0; i--) {
        const b = boxesNow[i] as Rect;
        if (px < b[0] || px > b[2] || py < b[1] || py > b[3]) continue;
        if (b[3] - b[1] < tall || b[2] - b[0] < 12 * k) continue;
        best = b;
        break;
      }
      const W = this.canvas.width;
      const H = this.canvas.height;
      const check = (c: Rect): Violation['over'] | null => {
        const o = { left: c[0] - ink[0], top: c[1] - ink[1], right: ink[2] - c[2], bottom: ink[3] - c[3] };
        return o.left > tol || o.top > tol || o.right > tol || o.bottom > tol ? o : null;
      };
      const lg = (r: Rect) => r.map((v, i) => Math.round(((v - (i % 2 === 0 ? t.e : t.f)) / k) * 10) / 10);
      const flag = (c: Rect | 'canvas', o: Violation['over']) => {
        // only text that stays put against its box for a few frames: moving or scrolling things change position,
        // so they are judged by where they sit in their own box (and never by the canvas edge they scroll past)
        const rel = c === 'canvas' ? `canvas|${lg(ink).join(',')}` : `${lg(ink).map((v, i) => Math.round(v - (lg(c)[i % 2] as number))).join(',')}|${Math.round((c[2] - c[0]) / k)}x${Math.round((c[3] - c[1]) / k)}`;
        const key = `${s}|${rel}`;
        const n = (counts.get(key) ?? 0) + 1;
        counts.set(key, n);
        if (n < STABLE_FRAMES || seen.has(key)) return;
        seen.add(key);
        const r = (v: number) => Math.round((Math.max(0, v) / k) * 10) / 10;
        report.violations.push({ text: s, font: this.font, ink: lg(ink), box: c === 'canvas' ? 'canvas' : lg(c), over: { left: r(o.left), top: r(o.top), right: r(o.right), bottom: r(o.bottom) } });
      };
      const visible = ink[2] > 0 && ink[0] < W && ink[3] > 0 && ink[1] < H;
      const off = visible ? check([0, 0, W, H]) : null;
      if (!visible) {
        /* waiting off screen: not seen */
      } else if (off && !(best && (best[0] < 0 || best[1] < 0 || best[2] > W || best[3] > H))) flag('canvas', off);
      else if (best) {
        const o = check(best);
        if (o) flag(best, o);
      }
    }
    return maxWidth === undefined ? native.fillText.call(this, s, x, y) : native.fillText.call(this, s, x, y, maxWidth);
  };
  // src/i18n/dom.ts wraps fillText with tx(); catch that wrapper so the string before translation is known too
  const inner = P.fillText;
  let current = inner;
  Object.defineProperty(P, 'fillText', {
    configurable: true,
    get: () => current,
    set(fn: typeof inner) {
      current = function (this: CanvasRenderingContext2D, value: string, x: number, y: number, maxWidth?: number) {
        original = typeof value === 'string' ? value : null;
        try {
          return maxWidth === undefined ? fn.call(this, value, x, y) : fn.call(this, value, x, y, maxWidth);
        } finally {
          original = null;
        }
      };
    },
  });
}

// ---- untranslated canvas text ---------------------------------------------------------------------------------------
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const escapeRe = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** English catalog values (src/app/i18n.ts), read as text: the module itself needs Vite. */
function catalog(): string[] {
  const src = readFileSync(`${ROOT}/src/app/i18n.ts`, 'utf8');
  const out: string[] = [];
  for (const m of src.matchAll(/^\s*'[\w.-]+':\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`([^`]*)`),?\s*$/gm)) {
    out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\\(['"\\])/g, '$1'));
  }
  return out;
}

/** Proper names and symbols that stay as they are in every language. */
const KEEP = new Set(['ARAW', 'ARA', 'AI']);

/**
 * Text drawn in English while a pack is active, that does not come from the catalog or the content packs: a literal
 * the translation extractor never saw. Catalog strings still waiting for their translation are listed apart.
 */
function untranslated(slug: string, lang: string, drawn: readonly string[]): { literals: string[]; pending: string[] } {
  const names = new Set((NAMES_BY_GAME[slug] ?? []).map((n) => n.toUpperCase()));
  if (lang === 'en') return { literals: [], pending: [] };
  const pack = JSON.parse(readFileSync(`${ROOT}/src/i18n/packs/${lang}.json`, 'utf8')) as Record<string, string>;
  const values = Object.values(pack).map((v) => v.toUpperCase());
  const chunkWords = new Set(values.filter((v) => v.includes('{')).flatMap((v) => v.replace(/\{\w+\}/g, ' ').match(/[A-ZÀ-ɏ]{2,}/g) ?? []));
  // one-word translations filled into a template (a form of address, a name of a thing)
  const wholeValues = new Set(values.filter((v) => !/\s/.test(v.trim())).map((v) => v.replace(/[^A-ZÀ-ɏ'-]/g, '')).filter((v) => v.length >= 2));
  const chunkPrefix =(w: string) => [...chunkWords].some((c) => c.startsWith(w));
  const cat = catalog();
  // templates need words of their own: '{who}' alone would match anything
  const templates = cat
    .filter((v) => /[A-Za-z]{2,}/.test(v.replace(/\{\w+\}/g, '')))
    .map((v) => ({ v, up: v.toUpperCase(), re: new RegExp(`^${escapeRe(v).replace(/\\\{\w+\\\}/g, '.+?')}$`, 'i') }));
  const matches = (t: (typeof templates)[number], s: string) => t.re.test(s) || t.v.includes(s) || t.up.includes(s);
  const wordsOf = (v: string) => v.replace(/\{\w+\}/g, ' ').toUpperCase().match(/[A-Z]{2,}/g) ?? [];
  const vocab = new Set(values.flatMap(wordsOf));
  const waiting = new Set(templates.filter((t) => !Object.hasOwn(pack, t.v)).flatMap((t) => wordsOf(t.v)));
  const known = (w: string, last: boolean) =>
    vocab.has(w) || waiting.has(w) || names.has(w) || KEEP.has(w) || (last && ([...vocab].some((c) => c.startsWith(w)) || [...waiting].some((c) => c.startsWith(w))));
  const literals: string[] = [];
  const pending: string[] = [];
  const shapes = new Set<string>();
  for (const s of drawn) {
    // one entry per shape: "SCORE 12" and "SCORE 13" are the same literal
    const shape = s.replace(/\d+/g, '#');
    if (shapes.has(shape)) continue;
    shapes.add(shape);
    const words = s.match(/[A-Za-z]{2,}/g);
    if (!words || Object.hasOwn(pack, s)) continue;
    // pending: a catalog string it comes from still waits for its translation (checked first, so an English catalog
    // word that some translation happens to keep, like "SHIELD", is still reported)
    if (templates.some((t) => !Object.hasOwn(pack, t.v) && matches(t, s))) {
      pending.push(s);
      continue;
    }
    if (values.some((v) => v.includes(s.toUpperCase()))) continue; // a line of a translation (maybe upper-cased)
    // a line of a translated template with its {blanks} filled in: every word sits in the template's own words
    // (the last one may be cut short by a typewriter reveal), or is a name
    if (words.every((w, i) => chunkWords.has(w.toUpperCase()) || wholeValues.has(w.toUpperCase()) || names.has(w.toUpperCase()) || KEEP.has(w.toUpperCase()) || (i === words.length - 1 && chunkPrefix(w.toUpperCase())))) continue;
    // a wrapped line of composed text (translated parts joined by a template): with two or more words, judge word by
    // word against the translations and the catalog strings still waiting for theirs (single words stay strict)
    if (words.length >= 2 && words.every((w, i) => known(w.toUpperCase(), i === words.length - 1))) {
      if (words.some((w) => !vocab.has(w.toUpperCase()) && !names.has(w.toUpperCase()) && !KEEP.has(w.toUpperCase()))) pending.push(s);
    } else if (words.some((w) => !KEEP.has(w.toUpperCase()) && !names.has(w.toUpperCase())) && !NAMES.test(s)) literals.push(s);
  }
  return { literals, pending };
}

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'] as const;

/** Play for a while with keys, taps and the shell's own buttons. */
async function drive(page: Page, rng: () => number, ms: number): Promise<void> {
  const canvas = page.locator('canvas.game-canvas');
  const card = page.locator('.game-card');
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await card.isVisible()) {
      // intro, pause or game over: see the frame behind it for a moment, then start or resume
      await page.waitForTimeout(600);
      await card.locator('.game-card__actions button').first().click();
      continue;
    }
    if (await page.locator('[role="dialog"]').isVisible()) {
      await page.keyboard.press('Escape');
      continue;
    }
    const roll = rng();
    if (roll < 0.4) {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press(KEYS[Math.floor(rng() * KEYS.length)] as string);
    } else if (roll < 0.85) {
      const box = await canvas.boundingBox();
      if (box) await page.mouse.click(box.x + box.width * (0.02 + rng() * 0.96), box.y + box.height * (0.02 + rng() * 0.96));
    } else {
      await page.waitForTimeout(400 + rng() * 900);
    }
    await page.waitForTimeout(80 + rng() * 200);
  }
}

function writeMerged(): void {
  const all: Record<string, unknown> = {};
  for (const f of readdirSync(PARTS).sort()) all[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(`${PARTS}/${f}`, 'utf8'));
  writeFileSync(`${OUT}/game-text-fit-canvas.json`, `${JSON.stringify(all, null, 1)}\n`);
}

test.describe('canvas game text fits its boxes', () => {
  test.skip(({ baseURL }) => !baseURL?.includes(`:${PORT}`), 'run with -c tests/e2e/game-text-fit.config.ts');

  for (const slug of GAMES.filter((g) => !ONLY || ONLY.includes(g))) {
    for (const [li, lang] of LANGS.entries()) {
      test(`${slug} · ${lang}`, async ({ page }) => {
        await page.addInitScript(instrument);
        await page.addInitScript(
          ({ lang: code, games }) => {
            localStorage.setItem('araw:v1:language', JSON.stringify(code));
            localStorage.setItem('araw:v1:briefingsSeen', JSON.stringify(games));
            // Hati Tayo! unlocks after Module 6
            localStorage.setItem('araw:v1:modulesDone', JSON.stringify(['m01', 'm02', 'm03', 'm04', 'm05', 'm06']));
          },
          { lang, games: [...GAMES] },
        );
        await page.goto(`/#/arcade/${slug}?seed=fit-${lang}`);
        await expect(page.locator('.game-card__actions button').first()).toBeVisible({ timeout: 20_000 });
        await page.evaluate(() => document.fonts.ready);
        await drive(page, seeded(GAMES.indexOf(slug) * 10 + li + 1), PLAY_MS);
        const report = await page.evaluate(() => (window as unknown as { __fit: FitReport }).__fit);
        const { literals, pending } = untranslated(slug, lang, report.unchanged);
        // English must keep its layout: nothing shrinks or squeezes there
        const englishFitted = lang === 'en' ? [...new Set(report.fitted.map((f) => `${f.text} ${f.size}->${f.px}${f.squeezed ? ' squeezed' : ''}`))] : [];
        const fitted = [...new Set(report.fitted.map((f) => `${f.text} ${f.size}->${f.px}${f.squeezed ? ' squeezed' : ''}`))];
        mkdirSync(PARTS, { recursive: true });
        writeFileSync(`${PARTS}/${slug}.${lang}.json`, JSON.stringify({ frames: report.frames, texts: report.texts, violations: report.violations, literals, pending, fitted }));
        writeMerged();
        expect(report.texts, 'the game drew text').toBeGreaterThan(0);
        expect(report.violations.map((v) => `${v.text} [${v.font}] over ${JSON.stringify(v.over)} box ${JSON.stringify(v.box)}`)).toEqual([]);
        expect(literals, 'English literals that never reach the translation packs').toEqual([]);
        expect(englishFitted, 'English text that had to shrink').toEqual([]);
      });
    }
  }
});
