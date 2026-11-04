// Records the silent module lecture videos: the real lesson screen, 1920x1080 output (the 1280x720 desktop layout enlarged
// 1.5x with CSS zoom), one generic driver (driver.mjs), once per module and language, strictly one video at a time.
//
// OVERNIGHT RUN (unattended, nothing is committed):
//   node scripts/lectures/record.mjs all --langs=en,fil,ceb,ilo,hil     all 10 modules x 5 languages = 50 videos
//   powershell -File scripts\lectures\run-overnight.ps1                   the same, restarted up to 3 times after a crash
//   Other flags: mNN or mNN,mNN instead of "all" | --no-build (reuse dist-lecture/) | --force (redo finished videos)
//                --plan (only compute and print the planned length of every video; no recording)
//                --out=DIR (default lecture-out) | --hold-scale=0.05 (DEBUG ONLY: shortens every hold, for dry runs)
// Output per video in lecture-out/<lang>/: mNN.mp4 (H.264 High, yuv420p, 30 fps, 1920x1080, no audio, no subtitles),
//   mNN-script.md (beats, times, narration) and mNN.done.json (the finished-marker: probe result, length, attempts, time).
// Pacing: ~120 wpm on the on-screen words plus breathing room, computed into a timeline first; if the total is outside
//   6:00-10:00 every hold is scaled evenly to land inside it (the planned length is printed per video).
// Fail-safes: preflight (>= 10 GB free, libx264, Chromium, free port 4182-4189, one build into dist-lecture/); per video a
//   fresh browser, a watchdog (plan x 1.5 + 5 min), up to 3 attempts, temp file then rename, MP4 validation; resume skips
//   videos with a valid done marker; preview server health check; frames deleted after each video; stops cleanly under 3 GB
//   free; a Windows keep-awake (no power settings are changed); SIGINT/SIGTERM/crash write the summary first.
// Exit codes: 0 all fine | 5 finished but some videos failed | 3 stopped on low disk | 4 preflight failed | 130 stopped by
//   signal | 1 crash (run-overnight.ps1 restarts only on 1).
// MORNING: read lecture-out/SUMMARY.md (or summary.json), then lecture-out/run.log; contact sheets are in lecture-out/contact/
//   (<lang>-mNN.jpg, a 3x2 grid); failures have a screenshot and the error in lecture-out/failed/. Rerun the same command
//   to finish whatever is missing.
// Test hooks (env, off by default): LECTURE_FAIL_ONCE=m02 throws on the first attempt of that module; LECTURE_WATCHDOG_MS=3000
//   replaces the watchdog timeout.
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { chromium, helpers, prepareContext, translator } from '../tutorials/lib.mjs';
import { playLecture } from './driver.mjs';
import {
  ALL_LANGS, ROOT, VIEWPORT, ZOOM_CSS,
  buildApp, baseUrl, contactSheet, encodeFrames, freeGb, hasLibx264, holdFor, killChildren, killTree, loadLectureSources, mmss, probeVideo,
  serverAlive, showCard, slowCursor, startCapture, startServer, stopServer, wordCount, writeScript,
} from './lib.mjs';

// ---------- arguments ----------
const argv = process.argv.slice(2);
const flagVal = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const hasFlag = (name) => argv.includes(`--${name}`);
const target = argv.find((a) => !a.startsWith('--')) ?? '';
const allIds = Array.from({ length: 10 }, (_, i) => `m${String(i + 1).padStart(2, '0')}`);
const moduleIds = target === 'all' ? allIds : target.split(',').filter(Boolean);
const langs = (flagVal('langs') ?? 'en').split(',');
const scale = flagVal('hold-scale') ? Number(flagVal('hold-scale')) : 1;
const PLAN_ONLY = hasFlag('plan');
const FORCE = hasFlag('force');
const OUT = resolve(ROOT, flagVal('out') ?? 'lecture-out');
if (!moduleIds.length || moduleIds.some((m) => !allIds.includes(m))) throw new Error('usage: node scripts/lectures/record.mjs all|mNN[,mNN] --langs=en,fil,ceb,ilo,hil [--no-build] [--force] [--plan] [--out=DIR]');
for (const l of langs) if (!ALL_LANGS.includes(l)) throw new Error(`unknown language "${l}"`);

const MIN_S = 360;
const MAX_S = 600;
const MAX_ATTEMPTS = 3;
const DEBUG_SCALE = scale !== 1;

// ---------- log and summary ----------
mkdirSync(OUT, { recursive: true });
const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
const log = (msg) => {
  const line = `[${stamp()}] ${msg}`;
  console.log(line);
  try {
    appendFileSync(join(OUT, 'run.log'), `${line}\n`);
  } catch {
    /* the log must never stop the run */
  }
};
const startedAt = new Date();
let stopReason = '';
/** One row per video, in run order. */
const rows = moduleIds.flatMap((module) => langs.map((lang) => ({ module, lang, status: 'pending', plannedS: null, lengthS: null, sizeMB: null, attempts: 0, error: '' })));

function writeSummary() {
  const done = rows.filter((r) => r.status === 'ok' || r.status === 'skipped');
  const failed = rows.filter((r) => r.status === 'failed');
  const totalS = done.reduce((a, r) => a + (r.lengthS ?? 0), 0);
  const data = { start: startedAt.toISOString(), end: new Date().toISOString(), stopReason, totals: { videos: rows.length, ok: done.length, failed: failed.length, pending: rows.length - done.length - failed.length, totalHours: +(totalS / 3600).toFixed(2) }, videos: rows };
  const md = [
    '# Lecture recording summary',
    '',
    `Started ${data.start} · last update ${data.end}${stopReason ? ` · STOPPED: ${stopReason}` : ''}`,
    `Videos ${data.totals.ok}/${rows.length} OK · ${data.totals.failed} failed · ${data.totals.pending} not done · ${data.totals.totalHours} h of video`,
    '',
    '| Module | Lang | Status | Planned | Length | Size MB | Attempts | Error |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${r.module} | ${r.lang} | ${r.status} | ${r.plannedS ? mmss(r.plannedS) : ''} | ${r.lengthS ? mmss(r.lengthS) : ''} | ${r.sizeMB ?? ''} | ${r.attempts} | ${r.error.replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 160)} |`),
    '',
  ].join('\n');
  try {
    writeFileSync(join(OUT, 'SUMMARY.md'), md, 'utf8');
    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(data, null, 2), 'utf8');
  } catch {
    /* ignore */
  }
}

// ---------- keep-awake (Windows): ES_CONTINUOUS | ES_SYSTEM_REQUIRED held by a child that ends with this process ----------
let awake = null;
function keepAwake() {
  if (process.platform !== 'win32') return;
  const ps = `$s='[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
Add-Type -MemberDefinition $s -Name Pw -Namespace K
while (Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue) { [K.Pw]::SetThreadExecutionState(2147483649) | Out-Null; Start-Sleep -Seconds 20 }`;
  awake = spawn('powershell', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(ps, 'utf16le').toString('base64')], { stdio: 'ignore' });
  awake.on('error', () => log('keep-awake could not start (continuing)'));
  log('keep-awake on (no power settings changed)');
}

// ---------- shutdown ----------
let server = null;
const live = { browser: null };
let closing = false;
function shutdown(reason, code) {
  if (closing) return;
  closing = true;
  stopReason ||= reason;
  log(`shutdown: ${reason}`);
  try {
    killChildren();
    killTree(awake);
    live.browser?.close().catch(() => {});
    stopServer(server);
  } catch {
    /* best effort */
  }
  writeSummary();
  process.exit(code);
}
process.on('uncaughtException', (e) => {
  log(`uncaught exception: ${e?.stack ?? e}`);
  shutdown('uncaught exception', 1);
});
process.on('unhandledRejection', (e) => {
  log(`unhandled rejection: ${e?.stack ?? e}`);
  shutdown('unhandled rejection', 1);
});
process.on('SIGINT', () => shutdown('SIGINT', 130));
process.on('SIGTERM', () => shutdown('SIGTERM', 130));

// ---------- the page ----------
const sources = new Map();
async function getSources(moduleId) {
  if (!sources.has(moduleId)) sources.set(moduleId, await loadLectureSources(moduleId));
  return sources.get(moduleId);
}

/** A fresh context on the lesson screen with the title card up. `fast` skips the slow cursor (planning only). */
async function openLesson(browser, src, lang, fast) {
  const missing = new Set();
  const t = translator(src, lang, missing);
  const L = Object.fromEntries(Object.entries(src.LECTURE_CAPTIONS).map(([k, v]) => [k, t(v)]));
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await prepareContext(context, { storage: { modulesDone: allIds.slice(0, src.info.n - 1) }, splash: false }, lang); // earlier modules done, so this one is unlocked
  const page = await context.newPage();
  const h = helpers(page, t, lang);
  if (fast) {
    h.move = (x, y) => page.mouse.move(x, y);
    h.tap = (loc) => h.click(loc, { hold: 0, steps: 1 });
    h.sleep = (ms) => page.waitForTimeout(Math.min(ms, 300));
  } else {
    slowCursor(page, h);
  }
  await page.goto(`${baseUrl()}#/learn/${src.info.id}`);
  await page.addStyleTag({ content: ZOOM_CSS });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.lesson-card').waitFor({ state: 'visible', timeout: 20_000 });
  await showCard(page, { kicker: t('learn.dialogTitle', { n: src.info.n }), heading: t(src.info.title), line: t(src.info.topic) });
  await page.waitForTimeout(400);
  const bridgeMissing = Object.values(src.LECTURE_CAPTIONS).filter((v) => missing.has(v));
  return { context, page, h, t, L, bridgeMissing };
}

const val = async (v) => (typeof v === 'function' ? await v() : (v ?? ''));
const clean = (s) => s.replace(/\s+/g, ' ').trim();
/** Allowance for the on-screen action (cursor glide and click) that runs at the start of a beat. */
const ACTION_MS = 3000;

/** Planning pass: plays the lecture without holding, collecting each beat's base hold and texts. */
async function planPass(browser, src, lang) {
  const lesson = await openLesson(browser, src, lang, true);
  const beats = [];
  const beat = async ({ screen, narr, read, run, min = 6000, fixed }) => {
    if (run) await run();
    const text = await val(read);
    beats.push({ base: (fixed ?? holdFor(wordCount(text), min)) + (run ? ACTION_MS : 0), screen: await val(screen), narr: clean(await val(narr)) });
  };
  try {
    await playLecture({ ...lesson, info: src.info, content: src.content, url: src.LECTURE_URL, beat });
  } finally {
    await lesson.context.close();
  }
  const naturalS = beats.reduce((a, b) => a + b.base, 0) / 1000;
  // clamp the total (holds plus the last second of the closing card) to 6:00-10:00 by scaling every hold evenly
  let k = 1;
  if (DEBUG_SCALE) k = scale;
  else if (naturalS + 1 < MIN_S) k = (MIN_S + 3 - 1) / naturalS;
  else if (naturalS + 1 > MAX_S) k = (MAX_S - 10 - 1) / naturalS;
  return { beats, naturalS, k, plannedS: naturalS * k + 1, bridgeMissing: lesson.bridgeMissing };
}

// ---------- one attempt at one video ----------
async function recordPass(browser, src, lang, plan, dir, name, failShot) {
  const frameDir = join(dir, `.frames-${name}`);
  rmSync(frameDir, { recursive: true, force: true });
  const lesson = await openLesson(browser, src, lang, DEBUG_SCALE); // dry runs skip the slow cursor
  const { page } = lesson;
  failShot.page = page;
  const cues = [];
  try {
    const cap = await startCapture(lesson.context, page, frameDir);
    const now = () => (Date.now() - cap.t0) / 1000;
    let i = 0;
    let endAt = 0; // cumulative planned end of the current beat, so overruns correct themselves
    const beat = async ({ screen, narr, run }) => {
      const p = plan.beats[i++];
      if (!p) throw new Error('lecture has more beats than its plan');
      const cue = { start: now() };
      if (run) await run();
      cue.screen = await val(screen);
      cue.narr = clean(await val(narr));
      endAt += (p.base * plan.k) / 1000;
      const wait = (endAt - now()) * 1000;
      if (wait > 0) await page.waitForTimeout(wait);
      cue.end = now();
      cues.push(cue);
    };
    await playLecture({ ...lesson, info: src.info, content: src.content, url: src.LECTURE_URL, beat });
    if (i !== plan.beats.length) throw new Error(`plan has ${plan.beats.length} beats, recording ${i}`);
    await page.waitForTimeout(1000); // a last second of the closing card
    const total = now();
    cues[cues.length - 1].end = total;
    for (let n = 0; n + 1 < cues.length; n++) cues[n].end = cues[n + 1].start;
    const frames = await cap.finish();
    const tmp = join(dir, `${name}.tmp.mp4`);
    rmSync(tmp, { force: true });
    await encodeFrames(frames, frameDir, tmp, total);
    return { tmp, total, cues, frameCount: frames.length };
  } finally {
    await lesson.context.close().catch(() => {});
    rmSync(frameDir, { recursive: true, force: true });
  }
}

function validate(info, expectedS) {
  const bad = [];
  if (info.codec !== 'h264') bad.push(`codec ${info.codec}`);
  if (info.pix !== 'yuv420p') bad.push(`pix_fmt ${info.pix}`);
  if (info.width !== 1920 || info.height !== 1080) bad.push(`size ${info.width}x${info.height}`);
  if (Math.abs(info.duration - expectedS) > Math.max(3, expectedS * 0.03)) bad.push(`duration ${info.duration.toFixed(1)} s vs ${expectedS.toFixed(1)} s`);
  if (info.size <= (DEBUG_SCALE ? 20_000 : 1_000_000)) bad.push(`file only ${info.size} bytes`);
  if (bad.length) throw new Error(`invalid MP4: ${bad.join(', ')}`);
}

const doneFile = (r) => join(OUT, r.lang, `${r.module}.done.json`);
function isDone(r) {
  try {
    const m = JSON.parse(readFileSync(doneFile(r), 'utf8'));
    const mp4 = join(OUT, r.lang, `${r.module}.mp4`);
    return existsSync(mp4) && statSync(mp4).size === m.probe.size && m.holdScale === scale ? m : null;
  } catch {
    return null;
  }
}

async function ensureServer() {
  if (await serverAlive()) return;
  log('preview server not answering: restarting it');
  stopServer(server);
  server = await startServer();
  log(`preview server on ${baseUrl()}`);
}

async function doVideo(r) {
  const name = r.module;
  const dir = join(OUT, r.lang);
  mkdirSync(dir, { recursive: true });
  let plan = null;
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    r.attempts = n;
    const failShot = { page: null };
    let timer = null;
    let rejectWatch = () => {};
    const watch = new Promise((_, rej) => (rejectWatch = rej));
    watch.catch(() => {});
    const arm = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        killChildren();
        live.browser?.close().catch(() => {});
        rejectWatch(new Error(`watchdog timeout after ${Math.round(ms / 1000)} s`));
      }, Number(process.env.LECTURE_WATCHDOG_MS) || ms);
    };
    let browser = null;
    const work = (async () => {
      await ensureServer();
      arm(15 * 60_000); // planning budget
      const src = await getSources(name);
      browser = live.browser = await chromium.launch();
      if (process.env.LECTURE_FAIL_ONCE === name && n === 1) throw new Error(`forced failure (LECTURE_FAIL_ONCE=${name})`);
      plan ??= await planPass(browser, src, r.lang);
      r.plannedS = +plan.plannedS.toFixed(1);
      arm(plan.plannedS * 1.5 * 1000 + 5 * 60_000);
      const rec = await recordPass(browser, src, r.lang, plan, dir, name, failShot);
      const info = await probeVideo(rec.tmp);
      validate(info, DEBUG_SCALE ? rec.total : plan.plannedS);
      const mp4 = join(dir, `${name}.mp4`);
      rmSync(mp4, { force: true });
      renameSync(rec.tmp, mp4);
      writeScript(dir, name, { title: `Module ${src.info.n}: ${translator(src, r.lang)(src.info.title)}`, lang: r.lang, total: rec.total, cues: rec.cues });
      writeFileSync(doneFile(r), JSON.stringify({ module: name, lang: r.lang, probe: info, plannedS: r.plannedS, lengthS: +rec.total.toFixed(1), attempts: n, holdScale: scale, finished: new Date().toISOString() }, null, 2));
      r.lengthS = +rec.total.toFixed(1);
      r.sizeMB = +(info.size / 1048576).toFixed(1);
      return rec;
    })();
    work.catch(() => {});
    try {
      const rec = await Promise.race([work, watch]);
      clearTimeout(timer);
      await browser?.close().catch(() => {});
      live.browser = null;
      r.status = 'ok';
      r.error = '';
      log(`OK ${r.lang}/${name}: ${mmss(rec.total)} (plan ${mmss(r.plannedS)}), ${r.sizeMB} MB, attempt ${n}`);
      try {
        await contactSheet(join(dir, `${name}.mp4`), join(OUT, 'contact', `${r.lang}-${name}.jpg`), rec.total);
      } catch (e) {
        log(`contact sheet failed for ${r.lang}/${name}: ${e.message}`);
      }
      return;
    } catch (e) {
      clearTimeout(timer);
      r.error = String(e?.message ?? e).slice(0, 400);
      log(`attempt ${n}/${MAX_ATTEMPTS} failed for ${r.lang}/${name}: ${r.error.split('\n')[0]}`);
      const fdir = join(OUT, 'failed');
      mkdirSync(fdir, { recursive: true });
      await failShot.page?.screenshot({ path: join(fdir, `${r.lang}-${name}.png`), timeout: 5000 }).catch(() => {});
      writeFileSync(join(fdir, `${r.lang}-${name}.txt`), `attempt ${n}\n${e?.stack ?? e}\n`);
      killChildren(); // an ffmpeg left behind by a timeout
      await browser?.close().catch(() => {});
      live.browser = null;
      rmSync(join(dir, `${name}.tmp.mp4`), { force: true });
      rmSync(join(dir, `.frames-${name}`), { recursive: true, force: true });
    }
  }
  r.status = 'failed';
  log(`FAILED ${r.lang}/${name} after ${MAX_ATTEMPTS} attempts (see ${join(OUT, 'failed')})`);
}

// ---------- main ----------
async function preflight() {
  const gb = freeGb(OUT);
  if (gb < 10) throw new Error(`only ${gb.toFixed(1)} GB free, need 10 GB`);
  if (!(await hasLibx264())) throw new Error('ffmpeg-static has no libx264');
  const b = await chromium.launch();
  await b.close();
  log(`preflight ok: ${gb.toFixed(0)} GB free, libx264, Chromium`);
}

log(`start: ${moduleIds.join(',')} x ${langs.join(',')}${PLAN_ONLY ? ' (plan only)' : ''}${DEBUG_SCALE ? ` (hold-scale ${scale})` : ''} -> ${OUT}`);
writeSummary();
try {
  if (!PLAN_ONLY) await preflight();
  if (!hasFlag('no-build')) {
    log('building into dist-lecture/ ...');
    await buildApp();
  }
  server = await startServer();
  log(`preview server on ${baseUrl()}`);
} catch (e) {
  log(`preflight failed: ${e.message}`);
  shutdown(`preflight failed: ${e.message}`, 4);
}
if (!PLAN_ONLY) keepAwake();

if (PLAN_ONLY) {
  const browser = await chromium.launch();
  live.browser = browser;
  let sum = 0;
  for (const r of rows) {
    const src = await getSources(r.module);
    const p = await planPass(browser, src, r.lang);
    sum += p.plannedS;
    const ok = p.plannedS >= MIN_S && p.plannedS <= MAX_S;
    r.plannedS = +p.plannedS.toFixed(1);
    console.log(`PLAN ${r.module}/${r.lang}: natural ${mmss(p.naturalS)} -> planned ${mmss(p.plannedS)} (x${p.k.toFixed(2)}, ${p.beats.length} beats)${ok ? '' : '  OUT OF RANGE'}`);
  }
  writeFileSync(join(OUT, 'plan.json'), JSON.stringify(rows.map(({ module, lang, plannedS }) => ({ module, lang, plannedS })), null, 2));
  console.log(`PLAN total ${mmss(sum)} = ${(sum / 3600).toFixed(2)} h`);
  await browser.close();
  stopServer(server);
  process.exit(0);
}

for (const r of rows) {
  const m = !FORCE && isDone(r);
  if (m) {
    r.status = 'skipped';
    r.lengthS = m.lengthS;
    r.plannedS = m.plannedS;
    r.sizeMB = +(m.probe.size / 1048576).toFixed(1);
    r.attempts = m.attempts;
    log(`skip ${r.lang}/${r.module}: done marker found`);
    continue;
  }
  const gb = freeGb(OUT);
  if (gb < 3) {
    stopReason = `low disk space (${gb.toFixed(1)} GB free)`;
    log(`stopping: ${stopReason}`);
    break;
  }
  log(`recording ${r.lang}/${r.module} (${rows.indexOf(r) + 1}/${rows.length}), ${gb.toFixed(0)} GB free`);
  await doVideo(r);
  writeSummary();
}
writeSummary();
const failed = rows.filter((r) => r.status === 'failed').length;
const pending = rows.filter((r) => r.status === 'pending').length;
log(`finished: ${rows.filter((r) => r.status === 'ok' || r.status === 'skipped').length}/${rows.length} OK, ${failed} failed, ${pending} not done`);
const code = stopReason ? 3 : failed ? 5 : 0;
closing = true;
killChildren();
killTree(awake);
stopServer(server);
process.exit(code);
