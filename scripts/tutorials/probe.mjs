// Plan a canvas game's key timeline: runs a storyboard in English without recording, as fast as the page allows, and
// prints the game's own text description and HUD every few hundred ms of game time (with the board's key presses applied).
//   npm run build && node scripts/tutorials/probe.mjs takbo-data [--every=250] [--until=30000] [--shots]
// Runs are seeded and the clock is fake, so what the probe prints is exactly what the recording will show.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BASE, KEY_LABEL, ROOT, chromium, createTicker, helpers, installPausedClock, loadBoard, loadStrings, prepareContext, startPreview, stopPreview, translator } from './lib.mjs';

const argv = process.argv.slice(2);
const num = (name, fallback) => Number(argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const id = argv.find((a) => !a.startsWith('--'));
if (!id) throw new Error('usage: node scripts/tutorials/probe.mjs <board> [--every=250] [--until=30000] [--shots]');
const every = num('every', 250);
const shots = argv.includes('--shots');
const external = argv.includes('--no-server');

const board = await loadBoard(id);
if (!board.clock) throw new Error(`${id} has no game clock (clock: true); probe only works for canvas games`);
const until = num('until', board.end ?? 30000);
const strings = await loadStrings();
const server = external ? null : await startPreview();
const browser = await chromium.launch();
try {
  const viewport = board.viewport ?? { width: 1280, height: 720 };
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await prepareContext(context, board, 'en');
  const page = await context.newPage();
  const h = helpers(page, translator(strings, 'en'), 'en');
  const ticker = createTicker(page);
  await installPausedClock(page);
  await page.goto(BASE + (board.url ?? ''));
  ticker.start();
  if (board.ready) await board.ready(page, h);
  for (const beat of board.beats ?? []) if (beat.run) await beat.run(page, h);
  ticker.setPaced(false);
  const base = ticker.now;
  const log = [];
  for (const step of board.timeline ?? []) {
    void ticker.at(base + step.at, async () => {
      if (step.caption) log.push(`${String(step.at).padStart(6)}  [caption] ${step.caption.slice(0, 70)}`);
      if (step.key) {
        log.push(`${String(step.at).padStart(6)}  [key] ${KEY_LABEL[step.key] ?? step.key}`);
        await page.keyboard.press(step.key);
      }
      if (step.run) await step.run(page, h);
    });
  }
  if (shots) mkdirSync(join(ROOT, 'shots-out/tutorials'), { recursive: true });
  for (let ms = 0; ms <= until; ms += every) {
    await ticker.at(base + ms, async () => {
      for (const line of log.splice(0)) console.log(line);
      const s = await h.state();
      console.log(`${String(ms).padStart(6)}  ${s.hud}\n        ${s.text}`);
      if (shots && ms % 1000 === 0) await page.screenshot({ path: join(ROOT, `shots-out/tutorials/probe-${id}-${String(ms).padStart(6, '0')}.png`) });
    });
  }
  await ticker.stop();
  await context.close();
} finally {
  await browser.close();
  stopPreview(server);
}
