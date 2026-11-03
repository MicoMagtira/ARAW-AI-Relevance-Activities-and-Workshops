// Records the silent module lecture videos: the real lesson screen, 1920x1080 output (the 1280x720 desktop layout enlarged 1.5x with CSS zoom), driven by one generic driver, once per language.
//   node scripts/lectures/record.mjs m01 --langs=en,fil            builds into dist-lecture/, serves it on port 4182, records
//   node scripts/lectures/record.mjs m01 --langs=en --no-build     reuse an earlier dist-lecture/ build
//   (debugging only: --hold-scale=0.2 shortens every hold; never for a real render)
// Capture: CDP Page.startScreencast (lossless PNG frames with timestamps, acked one by one), encoded ONCE with ffmpeg-static
// (concat demuxer, real frame durations: a static hold is one long frame) as H.264 High / yuv420p / 30 fps / faststart, no audio.
// Output per module and language in lecture-out/<lang>/: mNN.mp4, mNN.vtt, mNN.srt (one cue per beat), mNN-script.md
// (a table of beats with times, what is on screen and a narration to read aloud). Frames are deleted afterwards.
// Bridge lines (src/content/lectures.ts) fall back to English until a language pack has them; they are listed at the end.
// The driver is scripts/lectures/driver.mjs; a module that needs its game played adds scripts/lectures/overrides/<mNN>.mjs.
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, helpers, prepareContext, translator } from '../tutorials/lib.mjs';
import { playLecture } from './driver.mjs';
import {
  ALL_LANGS, BASE, ROOT, VIEWPORT, ZOOM_CSS,
  buildApp, encodeFrames, holdFor, loadLectureSources, showCard, slowCursor, startCapture, startServer, stopServer, wordCount, writeCaptions, writeScript,
} from './lib.mjs';

// ---------- arguments ----------
const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const langs = flag('langs') ? flag('langs').split('=')[1].split(',') : ['en'];
const scale = flag('hold-scale') ? Number(flag('hold-scale').split('=')[1]) : 1;
const moduleId = argv.find((a) => !a.startsWith('--'));
if (!moduleId || !/^m\d\d$/.test(moduleId)) throw new Error('usage: node scripts/lectures/record.mjs mNN --langs=en,fil [--no-build]');
for (const l of langs) if (!ALL_LANGS.includes(l)) throw new Error(`unknown language "${l}"`);

const src = await loadLectureSources(moduleId);
const OUT = join(ROOT, 'lecture-out');

// ---------- one lecture in one language ----------
async function record(browser, lang) {
  const missing = new Set();
  const t = translator(src, lang, missing);
  const L = Object.fromEntries(Object.entries(src.LECTURE_CAPTIONS).map(([k, v]) => [k, t(v)]));
  const bridgeMissing = new Set(Object.values(src.LECTURE_CAPTIONS).filter((v) => missing.has(v)));

  const dir = join(OUT, lang);
  const frameDir = join(dir, `.frames-${moduleId}`);
  rmSync(frameDir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await prepareContext(context, { storage: {}, splash: false }, lang);
  const page = await context.newPage();
  const h = helpers(page, t, lang);
  slowCursor(page, h);
  const cues = [];
  let cap = null;
  try {
    const seed = src.override?.seed ? `?seed=${src.override.seed}` : '';
    await page.goto(`${BASE}#/learn/${moduleId}${seed}`);
    await page.addStyleTag({ content: ZOOM_CSS });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.lesson-card').waitFor({ state: 'visible', timeout: 20_000 });
    // the title card is the first frame (and the poster); it is up before the capture starts
    await showCard(page, { kicker: t('learn.dialogTitle', { n: src.info.n }), heading: t(src.info.title), line: t(src.info.topic) });
    await page.waitForTimeout(400);
    cap = await startCapture(context, page, frameDir);
    const now = () => (Date.now() - cap.t0) / 1000;

    // one beat: run the action, then hold while the page shows what is to be read (hold = max(min, words / 100 wpm + 3 s))
    const beat = async ({ screen, narr, read, run, min = 8000, fixed }) => {
      const cue = { start: now() };
      if (run) await run();
      const val = async (v) => (typeof v === 'function' ? await v() : (v ?? ''));
      cue.screen = await val(screen);
      cue.narr = (await val(narr)).replace(/\s+/g, ' ').trim();
      await page.waitForTimeout((fixed ?? holdFor(wordCount(await val(read)), min)) * scale);
      cue.end = now();
      cues.push(cue);
    };
    await playLecture({ page, h, t, L, info: src.info, content: src.content, url: src.LECTURE_URL, override: src.override, beat });
    await page.waitForTimeout(1000); // a last second of the closing card
    const total = now();
    cues[cues.length - 1].end = total;
    for (let i = 0; i + 1 < cues.length; i++) cues[i].end = cues[i + 1].start; // a cue lasts until the next one begins
    const frames = await cap.finish();
    await encodeFrames(frames, frameDir, join(dir, `${moduleId}.mp4`), total);
    writeCaptions(dir, moduleId, cues);
    writeScript(dir, moduleId, { title: `Module ${src.info.n}: ${t(src.info.title)}`, lang, total, cues });
    rmSync(frameDir, { recursive: true, force: true });
    return { total, frameCount: frames.length, bridgeMissing, contentMissing: [...missing].filter((m) => !bridgeMissing.has(m)) };
  } catch (err) {
    await page.screenshot({ path: join(ROOT, 'shots-out/lectures', `FAILED-${moduleId}-${lang}.png`) }).catch(() => {});
    rmSync(frameDir, { recursive: true, force: true });
    throw err;
  } finally {
    await context.close();
  }
}

// ---------- main ----------
let server = null;
let browser = null;
const results = [];
try {
  mkdirSync(join(ROOT, 'shots-out/lectures'), { recursive: true });
  if (!flag('no-build')) await buildApp();
  server = await startServer();
  browser = await chromium.launch();
  for (const lang of langs) {
    const r = await record(browser, lang);
    results.push({ lang, ...r });
    console.log(`${moduleId}/${lang}: ${r.total.toFixed(1)} s, ${r.frameCount} frames -> lecture-out/${lang}/${moduleId}.mp4`);
  }
} finally {
  await browser?.close();
  stopServer(server);
}
for (const r of results) {
  if (r.lang === 'en') continue;
  if (r.bridgeMissing.size > 0) console.log(`\n${r.lang}: bridge lines not translated yet (shown in English):\n- ${[...r.bridgeMissing].join('\n- ')}`);
  if (r.contentMissing.length > 0) console.log(`\n${r.lang}: ${r.contentMissing.length} app strings missing from the pack (shown in English), first 5:\n- ${r.contentMissing.slice(0, 5).join('\n- ')}`);
}
