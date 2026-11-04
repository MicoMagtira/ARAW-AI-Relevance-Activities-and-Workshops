// Helpers for the module lecture recorder (record.mjs): content and language packs, the build and preview server on its
// own port, a slow pixel-cursor glide, full-screen cards, pacing, the screencast frame encoder and the caption/script
// writers. The tutorial clips keep using scripts/tutorials/lib.mjs untouched; only its overlay and translator are reused.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, statfsSync, writeFileSync } from 'node:fs';
import { createServer as createNetServer } from 'node:net';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { createServer } from 'vite';
import { ALL_LANGS, ROOT } from '../tutorials/lib.mjs';

export { ALL_LANGS, ROOT };
/** The preview server's port: 4182, else the first free one of 4183-4189 (see pickPort); BASE follows it. */
export const net = { port: 4182 };
export const baseUrl = () => `http://localhost:${net.port}/`;
export const OUT_DIR = 'dist-lecture';
/**
 * The CDP screencast ignores deviceScaleFactor (it always delivers CSS pixels), so the page is 1920x1080 at scale 1 and the
 * app is enlarged with CSS zoom (ZOOM, applied to #app and the title cards): the layout is the 1280x720 desktop design,
 * drawn at 1080p, with crisp text, instead of a small lesson column in a big empty frame.
 */
export const VIEWPORT = { width: 1920, height: 1080 };
export const ZOOM = 1.5;
export const OUT_SIZE = { width: 1920, height: 1080 };
export const FFMPEG = createRequire(import.meta.url)('ffmpeg-static');

// ---------- content ----------
/** Everything a lecture needs from the app: catalog, packs, module info, lesson content, bridge lines, and the vite server (for overrides). */
export async function loadLectureSources(moduleId) {
  const vite = await createServer({ root: ROOT, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
  try {
    const { EN_STRINGS } = await vite.ssrLoadModule('/src/app/i18n.ts');
    const { moduleById } = await vite.ssrLoadModule('/src/content/modules.ts');
    const { LECTURE_CAPTIONS, LECTURE_URL } = await vite.ssrLoadModule('/src/content/lectures.ts');
    const info = moduleById(moduleId);
    if (!info) throw new Error(`unknown module "${moduleId}"`);
    const content = (await vite.ssrLoadModule(`/src/modules/${moduleId}/index.ts`)).default;
    const packs = Object.fromEntries(
      ALL_LANGS.filter((l) => l !== 'en').map((l) => [l, JSON.parse(readFileSync(join(ROOT, `src/i18n/packs/${l}.json`), 'utf8'))]),
    );
    return { EN_STRINGS, packs, info, content, LECTURE_CAPTIONS, LECTURE_URL };
  } finally {
    await vite.close();
  }
}

// ---------- child processes (killed together on a watchdog timeout or a crash) ----------
const children = new Set();
export function killTree(p) {
  if (!p?.pid) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(p.pid), '/t', '/f'], { stdio: 'ignore' });
  else p.kill('SIGKILL');
}
export const killChildren = () => {
  for (const p of children) killTree(p);
  children.clear();
};
const track = (p) => {
  children.add(p);
  p.on('close', () => children.delete(p));
  return p;
};

// ---------- build and preview server ----------
const sh = (cmd) => new Promise((ok, fail) => {
  const p = track(spawn(cmd, { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'], shell: true }));
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}\n${err.slice(-1500)}`))));
});

export const buildApp = () => sh(`npx vite build --outDir ${OUT_DIR} --emptyOutDir`);

/** 4182, else 4183-4189: the first port nothing listens on. */
export async function pickPort() {
  for (let port = 4182; port <= 4189; port++) {
    const free = await new Promise((ok) => {
      const s = createNetServer();
      s.once('error', () => ok(false));
      s.listen(port, () => s.close(() => ok(true)));
    });
    if (free) return port;
  }
  throw new Error('no free port in 4182-4189');
}

export async function serverAlive() {
  try {
    return (await fetch(baseUrl(), { signal: AbortSignal.timeout(5000) })).ok;
  } catch {
    return false;
  }
}

export async function startServer() {
  net.port = await pickPort();
  const server = spawn(`npx vite preview --outDir ${OUT_DIR} --port ${net.port} --strictPort`, { cwd: ROOT, stdio: 'ignore', shell: true });
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(baseUrl())).ok) return server;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  stopServer(server);
  throw new Error(`no preview server on ${baseUrl()}`);
}

export function stopServer(server) {
  killTree(server);
}

// ---------- the page: slow cursor, cards ----------
const ease = (x) => x * x * (3 - 2 * x);

/** Replace h.move with a slower, eased glide (about 0.8 s) so the cursor is easy to follow; h.click and h.point use it. */
export function slowCursor(page, h) {
  let pos = { x: 1500, y: 950 };
  h.move = async (x, y) => {
    const from = pos;
    const steps = 32;
    for (let i = 1; i <= steps; i++) {
      const k = ease(i / steps);
      await page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k);
      await page.waitForTimeout(24);
    }
    pos = { x, y };
  };
  /** Click, then move the cursor out of the way so it never covers the text being read. */
  h.tap = async (locator) => {
    await h.click(locator);
    await page.waitForTimeout(350);
    await h.move(1800, 1020);
  };
}

export const ZOOM_CSS = `#app{zoom:${ZOOM}} html,body{overflow:hidden} #rec-cursor{width:40px;height:40px}`;

const CARD_CSS = `
  #rec-card{justify-items:center;zoom:${ZOOM}}
  #rec-card .l{margin:0;padding:0;list-style:none;display:grid;gap:14px;width:min(900px,90vw);text-align:left}
  #rec-card .l li{padding:14px 20px;font:700 24px/1.4 Nunito,sans-serif;color:#1F2550;background:#fff;border:4px solid #1F2550;box-shadow:4px 4px 0 #1F2550}
  #rec-card .u{margin:0;padding:14px 22px;font:20px/1.4 'Press Start 2P',monospace;color:#1F2550;background:#F5D89E;border:4px solid #1F2550;box-shadow:4px 4px 0 #1F2550}
  #rec-card .h.sm{font-size:28px;max-width:30ch}`;

/** A full-screen card that stays until hideCard (same look as the tutorial cards; optional list and link line). */
export async function showCard(page, { kicker = '', heading = '', line = '', items = [], link = '' }) {
  await page.evaluate(({ kicker, heading, line, items, link, css }) => {
    if (!document.getElementById('lec-css')) {
      const s = Object.assign(document.createElement('style'), { id: 'lec-css', textContent: css });
      document.head.append(s);
    }
    document.getElementById('rec-card')?.remove();
    document.getElementById('rec-cursor')?.style.setProperty('visibility', 'hidden'); // no pointer over a title card
    const card = Object.assign(document.createElement('div'), { id: 'rec-card' });
    const add = (tag, cls, text) => {
      const el = Object.assign(document.createElement(tag), { className: cls, textContent: text });
      card.append(el);
      return el;
    };
    if (kicker) add('p', 'k', kicker);
    if (heading) add('h2', items.length ? 'h sm' : 'h', heading);
    if (line) add('p', 's', line);
    if (items.length) {
      const ul = add('ul', 'l', '');
      for (const text of items) ul.append(Object.assign(document.createElement('li'), { textContent: text }));
    }
    if (link) add('p', 'u', link);
    document.body.append(card);
  }, { kicker, heading, line, items, link, css: CARD_CSS });
}

export const hideCard = (page) =>
  page.evaluate(() => {
    document.getElementById('rec-card')?.remove();
    document.getElementById('rec-cursor')?.style.removeProperty('visibility');
  });

// ---------- pacing ----------
export const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;
/** Reading hold in ms: max(min, words at ~120 wpm + 2 s of breathing room). Reveal tiles pass a shorter min. */
export const holdFor = (words, min = 6000) => Math.max(min, Math.round((words / 120) * 60000 + 2000));

// ---------- screencast capture ----------
/** CDP screencast: every frame saved with its timestamp and acknowledged; `finish` returns the frame list. */
export async function startCapture(context, page, dir) {
  mkdirSync(dir, { recursive: true });
  const cdp = await context.newCDPSession(page);
  const frames = [];
  let writing = Promise.resolve();
  cdp.on('Page.screencastFrame', (ev) => {
    const name = `f${String(frames.length).padStart(6, '0')}.png`;
    frames.push({ name, ts: ev.metadata.timestamp, wall: Date.now() });
    const buf = Buffer.from(ev.data, 'base64');
    writing = writing.then(() => writeFileSync(join(dir, name), buf));
    cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'png', maxWidth: OUT_SIZE.width, maxHeight: OUT_SIZE.height, everyNthFrame: 1 });
  // the first frame is the title card; wait for it, nudging the page if the browser saw no change
  for (let i = 0; i < 40 && frames.length === 0; i++) {
    if (i === 10) await page.mouse.move(1501, 951);
    await new Promise((r) => setTimeout(r, 100));
  }
  if (frames.length === 0) throw new Error('screencast produced no frames (fall back to recordVideo)');
  return {
    frames,
    /** Wall-clock ms of the first frame: the video's time zero. */
    get t0() {
      return frames[0].wall;
    },
    async finish() {
      await cdp.send('Page.stopScreencast').catch(() => {});
      await writing;
      return frames;
    },
  };
}

const run = (cmd, args, cwd) =>
  new Promise((ok, fail) => {
    const p = track(spawn(cmd, args, { cwd, stdio: ['ignore', 'ignore', 'pipe'] }));
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}\n${err.slice(-1500)}`))));
  });

/**
 * Encode once: the concat demuxer gets each frame with its real duration (a static hold is one long frame), the last frame
 * is held until `totalSec`. H.264 High, yuv420p, 30 fps, BT.709 tagged, faststart, no audio.
 */
export async function encodeFrames(frames, dir, dest, totalSec) {
  const lines = [];
  const base = frames[0].ts;
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].ts : base + totalSec;
    lines.push(`file '${f.name}'`, `duration ${Math.max(0.001, next - f.ts).toFixed(6)}`);
  });
  lines.push(`file '${frames[frames.length - 1].name}'`); // the concat demuxer ignores the last duration without this
  writeFileSync(join(dir, 'list.txt'), `${lines.join('\n')}\n`);
  await run(FFMPEG, [
    '-y', '-f', 'concat', '-safe', '0', '-i', 'list.txt',
    '-vf', 'scale=in_range=full:out_range=limited:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '30', '-tune', 'animation', '-crf', '20', '-preset', 'slow',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', '-an', '-t', totalSec.toFixed(3), dest,
  ], dir);
}

// ---------- narration script ----------
const p2 = (n) => String(n).padStart(2, '0');
export const mmss = (s) => `${p2(Math.floor(s / 60))}:${p2(Math.floor(s) % 60)}`;

export function writeScript(dir, name, { title, lang, total, cues }) {
  const cell = (s) => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const rows = cues.map((c, i) => `| ${i + 1} | ${mmss(c.start)}-${mmss(c.end)} | ${cell(c.screen)} | ${cell(c.narr)} |`);
  const md = [
    `# ${title}`,
    '',
    `Language: ${lang} · Total length: ${mmss(total)} (${Math.round(total)} s) · Silent video for voiceover: ${name}.mp4`,
    '',
    '| # | Time | On screen | Suggested narration |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
  writeFileSync(join(dir, `${name}-script.md`), md, 'utf8');
}

// ---------- ffmpeg: probe, encoders, contact sheet; disk ----------
/** Run ffmpeg and return its stderr (ffmpeg-static has no ffprobe; `ffmpeg -i` prints the stream info and exits 1). */
const ffText = (args) => new Promise((ok) => {
  const p = track(spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] }));
  let err = '';
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => ok({ code, err }));
  p.on('error', (e) => ok({ code: -1, err: String(e) }));
});

export async function hasLibx264() {
  const { err } = await new Promise((ok) => {
    const p = spawn(FFMPEG, ['-hide_banner', '-encoders'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('close', () => ok({ err: out }));
    p.on('error', () => ok({ err: '' }));
  });
  return /libx264/.test(err);
}

/** { codec, pix, width, height, duration (s), size (bytes) } of an MP4, or throws. */
export async function probeVideo(file) {
  const { err } = await ffText(['-hide_banner', '-i', file]);
  const dur = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(err);
  const vid = /Video: (\w+)[^\n]*?, (yuv\w+)[^\n]*?, (\d+)x(\d+)/.exec(err);
  if (!dur || !vid) throw new Error(`cannot read ${file}: ${err.slice(-300)}`);
  return {
    codec: vid[1], pix: vid[2], width: Number(vid[3]), height: Number(vid[4]),
    duration: Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]),
    size: statSync(file).size,
  };
}

/** A 3x2 grid of frames at evenly spaced times, about 1200 px wide, as a JPEG. */
export async function contactSheet(mp4, dest, duration) {
  mkdirSync(join(dest, '..'), { recursive: true });
  const step = duration / 6;
  const { code, err } = await ffText([
    '-y', '-ss', (step / 2).toFixed(2), '-i', mp4, '-vf', `fps=1/${step.toFixed(3)},scale=400:225,tile=3x2`, '-frames:v', '1', '-q:v', '4', dest,
  ]);
  if (code !== 0) throw new Error(`contact sheet failed: ${err.slice(-300)}`);
}

/** Free disk space in GB on the drive holding `path`. */
export const freeGb = (path) => {
  const s = statfsSync(path);
  return (s.bavail * s.bsize) / 1024 ** 3;
};
