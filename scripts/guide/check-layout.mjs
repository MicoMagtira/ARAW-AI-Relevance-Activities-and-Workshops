// Layout check for the Guide screen before it is routed in the app:
//   npx vite build -c scripts/guide/preview/vite.config.ts && node scripts/guide/check-layout.mjs
// Serves the preview on port 4180, then at 320 to 1920px wide reports horizontal overflow, targets under 44px and broken
// images, and saves screenshots to scripts/guide/out/layout/.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'layout');
mkdirSync(OUT, { recursive: true });
const URL_ = 'http://localhost:4180/';

// run vite's own CLI with node (no shell), so killing this one process frees the port
const server = spawn(process.execPath, [join(HERE, '..', '..', 'node_modules', 'vite', 'bin', 'vite.js'), 'preview', '-c', 'scripts/guide/preview/vite.config.ts', '--port', '4180', '--strictPort'], {
  cwd: join(HERE, '..', '..'),
  stdio: 'ignore',
});
let failed = false;
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(URL_)).ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  const browser = await chromium.launch();
  for (const [w, h] of [[320, 640], [360, 740], [820, 1180], [1366, 768], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await page.goto(URL_);
    await page.waitForSelector('.guide-step');
    // load every lazy image so sizes are final
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll('img')) img.loading = 'eager';
      await Promise.all([...document.images].filter((i) => i.offsetParent).map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    });
    const r = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const small = [...document.querySelectorAll('.guide a, .guide button')]
        .filter((el) => el.offsetParent)
        .map((el) => ({ t: el.textContent.trim().slice(0, 30), h: el.getBoundingClientRect().height }))
        .filter((x) => x.h < 44);
      const broken = [...document.images].filter((i) => i.offsetParent && i.complete && i.naturalWidth === 0).map((i) => i.src);
      return { overflow, small, broken, shown: [...document.images].filter((i) => i.offsetParent).length };
    });
    console.log(`${w}x${h}: overflow ${r.overflow}, images shown ${r.shown}, broken ${r.broken.length}, small targets ${r.small.length}`);
    if (r.overflow > 0 || r.broken.length || r.small.length) {
      failed = true;
      console.log(JSON.stringify({ small: r.small.slice(0, 5), broken: r.broken.slice(0, 3) }));
    }
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `guide-${w}-top.png`) });
    await page.evaluate(() => document.getElementById('guide-learn-h')?.scrollIntoView());
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `guide-${w}-learn.png`) });
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
process.exitCode = failed ? 1 : 0;
