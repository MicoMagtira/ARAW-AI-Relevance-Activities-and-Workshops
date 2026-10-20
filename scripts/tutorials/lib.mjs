// Shared parts of the how-to video tools (record.mjs, probe.mjs): strings and packs, the preview server, the in-page
// overlay (pixel cursor, key caps, title cards), the board helpers, and the game clock that makes canvas runs repeatable.
import { spawn } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const BOARDS = join(ROOT, 'scripts/tutorials/boards');
export const PORT = 4173;
export const BASE = `http://localhost:${PORT}/`;
export const ALL_LANGS = ['en', 'fil', 'ceb', 'ilo', 'hil'];
/** Game clock tick (ms): the recorder advances the page's fake clock by this much, paced to real time. */
export const TICK = 40;

export const boardIds = () => readdirSync(BOARDS).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));
export const loadBoard = async (id) => (await import(pathToFileURL(join(BOARDS, `${id}.mjs`)).href)).default;

// ---------- strings ----------
/** The app's English catalog, the tutorial list and the language packs (loaded through Vite, like scripts/i18n). */
export async function loadStrings() {
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
  try {
    const { EN_STRINGS } = await vite.ssrLoadModule('/src/app/i18n.ts');
    const { tutorialById } = await vite.ssrLoadModule('/src/content/tutorials.ts');
    const packs = Object.fromEntries(
      ALL_LANGS.filter((l) => l !== 'en').map((l) => [l, JSON.parse(readFileSync(join(ROOT, `src/i18n/packs/${l}.json`), 'utf8'))]),
    );
    return { EN_STRINGS, tutorialById, packs };
  } finally {
    await vite.close();
  }
}

/**
 * Like the app's t() for one language: a catalog key or an English text, {name} placeholders filled (string values are
 * translated too). Anything the pack lacks is collected in `missing` (and shown in English).
 */
export function translator({ EN_STRINGS, packs }, lang, missing = new Set()) {
  const tx = (s) => (lang === 'en' ? s : (packs[lang][s] ?? null));
  const tr = (s) => {
    const hit = tx(s);
    if (hit === null) missing.add(s);
    return hit ?? s;
  };
  return (keyOrText, vars) => {
    const raw = tr(EN_STRINGS[keyOrText] ?? keyOrText);
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? (typeof vars[k] === 'string' ? (tx(vars[k]) ?? vars[k]) : String(vars[k])) : m));
  };
}

// ---------- preview server ----------
export async function startPreview() {
  const server = spawn(`npx vite preview --port ${PORT} --strictPort`, { cwd: ROOT, stdio: 'ignore', shell: true });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return server;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  stopPreview(server);
  throw new Error(`no preview server on ${BASE}`);
}

export function stopPreview(server) {
  if (!server) return;
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
  else server.kill();
}

// ---------- the page ----------
/** Saved state every clip starts from (on top: the board's own `storage`). */
export function storageFor(board, lang) {
  return {
    language: lang,
    settings: { largeText: false, highContrast: false, xlButtons: false, srHints: false, reduceMotion: false },
    sound: { musicOn: false, musicVolume: 25, sfxOn: false, sfxVolume: 65 },
    ...(board.storage ?? {}),
  };
}

export async function prepareContext(context, board, lang) {
  await context.addInitScript(({ storage, booted }) => {
    try {
      if (!sessionStorage.getItem('rec:init')) {
        sessionStorage.setItem('rec:init', '1');
        for (const [k, v] of Object.entries(storage)) localStorage.setItem(`araw:v1:${k}`, JSON.stringify(v));
        if (booted) sessionStorage.setItem('araw:v1:booted', '1');
      }
    } catch {
      /* storage blocked: nothing to set */
    }
  }, { storage: storageFor(board, lang), booted: board.splash !== true });
  await context.addInitScript(OVERLAY);
}

/** The pixel cursor, key caps and title cards are drawn into the page, so they are part of the recorded picture. */
const OVERLAY = () => {
  const css = `
    #rec-cursor{position:fixed;z-index:2147483647;left:0;top:0;width:28px;height:28px;pointer-events:none;transform:translate(-200px,-200px);
      background:no-repeat url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath fill='%231F2550' d='M0 0h2v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v2H7v1h1v2H6v-2H5v-1H4v1H3v1H2v1H0z'/%3E%3Cpath fill='%23fff' d='M1 2h1v1h1v1h1v1h1v1h1v1h1v1h1v1H6v2H5v-1H4v-1H3v1H2v1H1z'/%3E%3C/svg%3E") 0 0 / 100% 100%;
      filter:drop-shadow(2px 2px 0 rgba(31,37,80,.35))}
    #rec-cursor.down::after{content:'';position:absolute;left:-14px;top:-14px;width:28px;height:28px;border:4px solid #E8B84A;animation:rec-ping .4s steps(4) forwards}
    @keyframes rec-ping{to{transform:scale(1.8);opacity:0}}
    #rec-keys{position:fixed;z-index:2147483646;left:24px;bottom:24px;display:flex;gap:10px;pointer-events:none}
    .rec-key{min-width:56px;padding:12px 14px;font:16px/1 'Press Start 2P',monospace;color:#1F2550;background:#fff;border:4px solid #1F2550;box-shadow:4px 4px 0 #1F2550;text-align:center}
    #rec-card{position:fixed;z-index:2147483645;inset:0;display:grid;place-content:center;gap:28px;padding:48px;text-align:center;pointer-events:none;
      background:linear-gradient(to bottom,#FFF8EC 0 40%,#FFEFD2 40% 56%,#FFE2B0 56% 70%,#FFD08F 70% 84%,#FFB892 84% 100%)}
    #rec-card .k{justify-self:center;padding:10px 16px;font:16px/1.5 'Press Start 2P',monospace;color:#35408E;background:#fff;border:4px solid #1F2550;box-shadow:4px 4px 0 #1F2550;text-transform:uppercase}
    #rec-card .h{margin:0;max-width:22ch;font:40px/1.4 'Press Start 2P',monospace;color:#35408E;text-shadow:4px 4px 0 #E8B84A}
    #rec-card .s{margin:0;font:700 26px/1.4 Nunito,sans-serif;color:#1F2550}`;
  const boot = () => {
    if (document.getElementById('rec-cursor')) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    const cursor = Object.assign(document.createElement('div'), { id: 'rec-cursor' });
    const keys = Object.assign(document.createElement('div'), { id: 'rec-keys' });
    document.body.append(cursor, keys);
    addEventListener('mousemove', (e) => (cursor.style.transform = `translate(${e.clientX - 2}px,${e.clientY - 2}px)`), true);
    addEventListener('mousedown', () => {
      cursor.classList.remove('down');
      void cursor.offsetWidth;
      cursor.classList.add('down');
    }, true);
  };
  if (document.body) boot();
  else addEventListener('DOMContentLoaded', boot);
};

// ---------- game clock ----------
/**
 * Install Playwright's fake clock and stop it: an installed clock still follows real time until it is paused, and only a
 * paused clock moves just when the ticker says so. Today's date is kept (the daily challenge and streaks read it).
 */
export async function installPausedClock(page) {
  const start = Date.now();
  await page.clock.install({ time: start });
  await page.clock.pauseAt(start + 1000);
}

/**
 * Owns the page's fake clock (board.clock: true). Advances it TICK ms at a time, paced to real time (or as fast as possible
 * for probes), and runs scheduled actions between ticks, so a key press always lands on the same game moment.
 */
export function createTicker(page, { paced: pacedAtStart = true } = {}) {
  let paced = pacedAtStart;
  let now = 0;
  let running = false;
  let loop = null;
  const queue = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tick = async () => {
    while (running) {
      const started = Date.now();
      while (queue.length > 0 && queue[0].due <= now) {
        const item = queue.shift();
        try {
          await item.fn();
          item.done();
        } catch (err) {
          item.fail(err);
        }
      }
      await page.clock.runFor(TICK);
      now += TICK;
      if (paced) await sleep(Math.max(0, TICK - (Date.now() - started)));
    }
  };
  return {
    get now() {
      return now;
    },
    /** false: run the clock as fast as the page allows (probes). */
    setPaced(value) {
      paced = value;
    },
    start() {
      if (running) return;
      running = true;
      loop = tick();
    },
    async stop() {
      running = false;
      await loop;
    },
    /** Run fn when the game clock reaches `due` (ms); the clock waits for it. */
    at(due, fn) {
      return new Promise((done, fail) => {
        queue.push({ due, fn, done, fail });
        queue.sort((a, b) => a.due - b.due);
      });
    },
  };
}

// ---------- board helpers ----------
export function helpers(page, t, lang) {
  const sleep = (ms) => page.waitForTimeout(ms);
  const h = {
    page,
    lang,
    t,
    sleep,
    /** Glide the cursor to a point. */
    async move(x, y, steps = 18) {
      await page.mouse.move(x, y, { steps });
    },
    /** Glide to an element, then click it (fails loudly if it does not show up). */
    async click(locator, { hold = 250, steps = 18 } = {}) {
      await locator.waitFor({ state: 'visible', timeout: 20_000 });
      await locator.scrollIntoViewIfNeeded();
      const box = await locator.boundingBox();
      if (!box) throw new Error(`no box for ${locator}`);
      await h.move(box.x + box.width / 2, box.y + box.height / 2, steps);
      if (hold > 0) await sleep(hold);
      await page.mouse.down();
      await page.mouse.up();
    },
    /** Point at an element without clicking. */
    async point(locator, steps = 18) {
      await locator.waitFor({ state: 'visible', timeout: 20_000 });
      const box = await locator.boundingBox();
      if (box) await h.move(box.x + box.width / 2, box.y + box.height / 2, steps);
    },
    /** Show a key cap in the corner (label: what to draw, e.g. "SPACE" or "↑") and press the key. */
    async press(key, label = key) {
      await h.showKey(label);
      await page.keyboard.press(key);
    },
    async showKey(label) {
      await page.evaluate((l) => {
        const box = document.getElementById('rec-keys');
        if (!box) return;
        const cap = Object.assign(document.createElement('span'), { className: 'rec-key', textContent: l });
        box.append(cap);
        setTimeout(() => cap.remove(), 650);
      }, label);
    },
    /** A full-screen title card (kicker, heading, optional line) for `ms`. */
    async card({ kicker = '', heading, line = '' }, ms = 2000) {
      await page.evaluate(({ kicker, heading, line }) => {
        document.getElementById('rec-card')?.remove();
        const card = Object.assign(document.createElement('div'), { id: 'rec-card' });
        const add = (cls, text) => text && card.append(Object.assign(document.createElement(cls === 'h' ? 'h2' : 'p'), { className: cls, textContent: text }));
        add('k', kicker);
        add('h', heading);
        add('s', line);
        document.body.append(card);
      }, { kicker, heading, line });
      await sleep(ms);
      await page.evaluate(() => document.getElementById('rec-card')?.remove());
    },
    /** Scroll the page smoothly by dy pixels. */
    async scroll(dy, ms = 900) {
      const steps = 12;
      for (let i = 0; i < steps; i++) {
        await page.mouse.wheel(0, dy / steps);
        await sleep(ms / steps);
      }
    },
    /** The game's live text description and HUD (canvas games), for probes and checks. */
    async state() {
      return page.evaluate(() => ({
        text: document.querySelector('.game-state p')?.textContent ?? '',
        hud: [...document.querySelectorAll('.game-hud__item')].map((li) => li.textContent?.replace(/\s+/g, ' ').trim()).join(' | '),
      }));
    },
  };
  return h;
}

/** A timeline step's key press: "Space" -> SPACE, arrows -> pixel arrows. */
export const KEY_LABEL = { ' ': 'SPACE', Space: 'SPACE', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'ENTER' };
