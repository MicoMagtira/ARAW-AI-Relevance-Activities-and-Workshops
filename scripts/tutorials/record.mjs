// Records the captioned how-to videos: the app driven by Playwright, once per language, from a storyboard per clip.
//   npm run build                                         (the recorder serves dist/ with vite preview on port 4173)
//   node scripts/tutorials/record.mjs                     every clip, every language
//   node scripts/tutorials/record.mjs takbo-data tour     some clips
//   node scripts/tutorials/record.mjs --langs=en,fil      some languages      --shots  also save one PNG per caption
// Output: public/videos/<id>/<lang>.webm (VP9, no sound) and <lang>.vtt (one caption cue per beat, in that language), and
// src/content/tutorialManifest.json (length and size of every clip: what turns the Watch buttons on).
// --dry writes to shots-out/tutorials/dry/ instead (for testing a storyboard); --no-server uses a preview already on 4173.
// Storyboards: scripts/tutorials/boards/<id>.mjs (see boards/README.md). A step that cannot find its element fails the
// clip loudly: no video is written, and a screenshot of the failure lands in shots-out/tutorials/.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALL_LANGS,
  BASE,
  KEY_LABEL,
  ROOT,
  boardIds,
  chromium,
  createTicker,
  helpers,
  installPausedClock,
  loadBoard,
  loadStrings,
  prepareContext,
  startPreview,
  stopPreview,
  translator,
} from './lib.mjs';

const OUT = join(ROOT, 'public/videos');
const RAW = join(ROOT, 'shots-out/tutorials/raw');
const SHOTS = join(ROOT, 'shots-out/tutorials');
const MANIFEST = join(ROOT, 'src/content/tutorialManifest.json');
const MAX_KB = { tour: 2800, game: 900 }; // per file; the encoder gets harsher until a clip fits

// ---------- arguments ----------
const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const langs = flag('langs') ? flag('langs').split('=')[1].split(',') : ALL_LANGS;
const shots = !!flag('shots');
const external = !!flag('no-server'); // a preview server is already running on 4173
const dry = !!flag('dry'); // storyboard test: write to shots-out/tutorials/dry/, leave public/ and the manifest alone
const keepRaw = !!flag('keep-raw'); // keep Playwright's original recording in shots-out/tutorials/raw (encoder tests)
const all = boardIds();
const wanted = argv.filter((a) => !a.startsWith('--'));
const ids = wanted.length > 0 ? wanted : all;
for (const id of ids) if (!all.includes(id)) throw new Error(`no storyboard for "${id}" (have: ${all.join(', ')})`);
for (const l of langs) if (!ALL_LANGS.includes(l)) throw new Error(`unknown language "${l}"`);
if (!existsSync(join(ROOT, 'dist/index.html'))) throw new Error('dist/ is missing: run npm run build first');

const strings = await loadStrings();

// ---------- encoding ----------
const ffmpegPath = () => {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const base = join(process.env.LOCALAPPDATA ?? join(process.env.HOME ?? '', '.cache'), 'ms-playwright');
  const dir = existsSync(base) ? readdirSync(base).find((d) => d.startsWith('ffmpeg')) : undefined;
  const exe = dir && readdirSync(join(base, dir)).find((f) => f.startsWith('ffmpeg'));
  if (!exe) throw new Error("Playwright's ffmpeg not found: run npx playwright install ffmpeg, or set FFMPEG_PATH");
  return join(base, dir, exe);
};

const run = (cmd, args) =>
  new Promise((ok, fail) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exited ${code}\n${err.slice(-1500)}`))));
  });

/** VP9, no sound. Starts gentle and gets harsher (then smaller) until the file fits its budget. */
async function encode(raw, dest, startSec, durationSec, limitKb, width) {
  const tries = [
    { crf: 44, scale: null },
    { crf: 48, scale: null },
    { crf: 48, scale: Math.round((width * 0.8) / 2) * 2 },
  ];
  let kb = 0;
  for (const { crf, scale } of tries) {
    const vf = scale ? ['-vf', `scale=${scale}:-2:flags=neighbor`] : [];
    await run(ffmpegPath(), ['-y', '-ss', startSec.toFixed(2), '-i', raw, '-t', durationSec.toFixed(2), ...vf,
      '-r', '20', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', String(crf), '-deadline', 'good', '-cpu-used', '2', '-row-mt', '1', '-an', dest]);
    kb = Math.round(statSync(dest).size / 1024);
    if (kb <= limitKb) return kb;
    console.warn(`  ${kb} KB > ${limitKb} KB at crf ${crf}${scale ? ` and ${scale}px` : ''}, trying harder`);
  }
  return kb;
}

const vttTime = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
};

function writeVtt(path, cues) {
  const body = cues.map((c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}`).join('\n\n');
  writeFileSync(path, `WEBVTT\n\n${body}\n`, 'utf8');
}

// ---------- one clip in one language ----------
async function recordClip(browser, id, board, lang) {
  const missing = new Set();
  const t = translator(strings, lang, missing);
  const viewport = board.viewport ?? { width: 1280, height: 720 };
  mkdirSync(RAW, { recursive: true });
  mkdirSync(SHOTS, { recursive: true });
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, recordVideo: { dir: RAW, size: viewport }, reducedMotion: 'no-preference' });
  await prepareContext(context, board, lang);
  const page = await context.newPage();
  const t0 = Date.now();
  const h = helpers(page, t, lang);
  const ticker = board.clock ? createTicker(page) : null;
  const at = () => (Date.now() - t0) / 1000;
  const cues = [];
  let trim = 0;
  let shot = 0;
  const caption = async (text, vars) => {
    cues.push({ start: at() - trim, text: t(text, vars) });
    if (shots && cues.length > 1) {
      const n = ++shot;
      setTimeout(() => page.screenshot({ path: join(SHOTS, `${id}-${lang}-${String(n).padStart(2, '0')}.png`) }).catch(() => {}), 1800);
    }
  };
  try {
    if (ticker) await installPausedClock(page);
    await page.goto(BASE + (board.url ?? ''));
    ticker?.start();
    await page.evaluate(() => document.fonts.ready);
    if (board.ready) await board.ready(page, h);
    // the title card opens every clip: it is the first frame (the poster) and the first caption
    const tut = strings.tutorialById(id);
    const heading = tut.kind === 'tour' ? t('tutorial.tourTitle') : t('tutorial.gameTitle', { game: tut.game });
    trim = at();
    cues.push({ start: 0, text: heading });
    await h.card({ kicker: 'ARAW', heading }, board.cardMs ?? 2200);
    // real-time beats: a caption, an action, then wait out the hold
    for (const beat of board.beats ?? []) {
      const begin = Date.now();
      if (beat.caption) await caption(beat.caption, beat.vars);
      if (beat.run) await beat.run(page, h);
      const left = (beat.hold ?? 0) - (Date.now() - begin);
      if (left > 0) await h.sleep(left);
    }
    // game-time steps (board.clock): each lands on the same game moment in every language
    if (board.timeline) {
      if (!ticker) throw new Error(`${id}: a timeline needs clock: true`);
      const base = ticker.now;
      const steps = board.timeline.map((step) =>
        ticker.at(base + step.at, async () => {
          if (step.caption) await caption(step.caption, step.vars);
          if (step.key) await h.press(step.key, step.label ?? KEY_LABEL[step.key] ?? step.key);
          if (step.run) await step.run(page, h);
        }),
      );
      await Promise.all(steps);
      const end = base + (board.end ?? Math.max(...board.timeline.map((s) => s.at)) + 2500);
      await ticker.at(end, async () => {});
    }
    await h.sleep(board.tailMs ?? 500);
  } catch (err) {
    await ticker?.stop().catch(() => {});
    await page.screenshot({ path: join(SHOTS, `FAILED-${id}-${lang}.png`) }).catch(() => {});
    const video = page.video();
    await context.close();
    if (video) rmSync(await video.path(), { force: true });
    throw err;
  }
  await ticker?.stop();
  const end = at();
  const video = page.video();
  await context.close();
  const raw = await video.path();
  if (missing.size > 0) {
    rmSync(raw, { force: true });
    throw new Error(`captions missing from the ${lang} pack:\n    ${[...missing].join('\n    ')}`);
  }
  const duration = end - trim;
  for (const [i, c] of cues.entries()) c.end = i + 1 < cues.length ? cues[i + 1].start : duration;
  const dir = dry ? join(SHOTS, 'dry', id) : join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const kb = await encode(raw, join(dir, `${lang}.webm`), trim, duration, MAX_KB[strings.tutorialById(id).kind], viewport.width);
  writeVtt(join(dir, `${lang}.vtt`), cues.filter((c) => c.end - c.start > 0.3));
  if (keepRaw) console.log(`  raw: ${raw} (trim ${trim.toFixed(2)} s)`);
  else rmSync(raw, { force: true });
  return { s: Math.round(duration), kb };
}

// ---------- main ----------
const server = external ? null : await startPreview();
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const failures = [];
let browser = null;
try {
  browser = await chromium.launch();
  for (const id of ids) {
    const board = await loadBoard(id);
    for (const lang of langs) {
      const label = `${id}/${lang}`;
      let done = null;
      for (let attempt = 1; attempt <= 2 && !done; attempt++) {
        try {
          done = await recordClip(browser, id, board, lang);
        } catch (err) {
          const message = String(err?.message ?? err);
          if (attempt === 2 || message.includes('missing from')) {
            failures.push(`${label}: ${message}`);
            break;
          }
          console.warn(`  ${label}: retrying after: ${message.split('\n')[0]}`);
        }
      }
      if (!done) continue;
      console.log(`${label.padEnd(22)} ${String(done.s).padStart(3)} s ${String(done.kb).padStart(5)} KB${dry ? ' (dry run)' : ''}`);
      if (dry) continue;
      manifest[id] = { ...(manifest[id] ?? {}), [lang]: done };
      writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 1)}\n`);
    }
  }
} finally {
  await browser?.close();
  stopPreview(server);
}
if (failures.length > 0) {
  console.error(`\n${failures.length} clip(s) failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
