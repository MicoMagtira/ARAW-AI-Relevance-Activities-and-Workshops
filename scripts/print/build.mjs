// Builds the ARAW print kit (docs/PRINT-KIT-PLAN.md): one A4 PDF per sheet x language.
//
//   node scripts/print/build.mjs                          every sheet, all five languages -> public/print/<lang>/<id>.pdf
//   node scripts/print/build.mjs --only=trust-guide,module-posters --langs=en,fil
//   node scripts/print/build.mjs --pages                  also saves a PNG per page to scripts/print/out/png/<lang>/<id>-<n>.png
//   node scripts/print/build.mjs --out=<dir>              PDF folder (default public/print)
//   node scripts/print/build.mjs --app-url=https://...    public app URL for the QR codes (or env PRINT_APP_URL)
//
// The print app (scripts/print/page/, Vite + Preact) is built into scripts/print/out/site/ and opened in Playwright's
// Chromium without any server: the folder is served through page.route() from disk. Sheets marked facilitatorOnly (the
// paper tests and their answer key) always go to print-out/facilitator/<lang>/, never to public/.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { build } from 'vite';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SITE = join(HERE, 'out', 'site');
const PNG_DIR = join(HERE, 'out', 'png');
const FACILITATOR_DIR = join(ROOT, 'print-out', 'facilitator');
const MANIFEST = join(ROOT, 'src', 'content', 'printManifest.json');
const ALL_LANGS = ['en', 'fil', 'ceb', 'ilo', 'hil'];
const MAX_BYTES = 2 * 1024 * 1024;
// the live app; QR codes point here unless --app-url or PRINT_APP_URL says otherwise
const DEFAULT_APP_URL = 'https://dost-nicer-araw.mjmagtira.workers.dev/';
const ORIGIN = 'http://araw.print';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const list = (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : []);
const only = list(args.only);
const langs = list(args.langs).length ? list(args.langs) : ALL_LANGS;
const appUrl = typeof args['app-url'] === 'string' ? args['app-url'] : (process.env.PRINT_APP_URL || DEFAULT_APP_URL);
const customOut = typeof args.out === 'string';
const outDir = customOut ? join(ROOT, args.out) : join(ROOT, 'public', 'print');
for (const l of langs) if (!ALL_LANGS.includes(l)) throw new Error(`unknown language "${l}" (use ${ALL_LANGS.join(', ')})`);
console.log(`QR codes point to ${appUrl}`);

await build({ configFile: join(HERE, 'page', 'vite.config.ts') });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' };

const browser = await chromium.launch();
const rows = [];
const warnings = [];
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
  await context.route(`${ORIGIN}/**`, async (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = join(SITE, path === '/' ? 'index.html' : path);
    if (!file.startsWith(SITE) || !existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ body: readFileSync(file), contentType: TYPES[extname(file)] ?? 'application/octet-stream' });
  });

  const ready = async (page, url) => {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.dataset.ready === '1', undefined, { timeout: 60_000 });
  };

  const index = await context.newPage();
  await ready(index, `${ORIGIN}/index.html`);
  const sheets = await index.evaluate(() => window.__sheets);
  await index.close();
  const wanted = only.length ? sheets.filter((s) => only.includes(s.id)) : sheets;
  for (const id of only) if (!sheets.some((s) => s.id === id)) throw new Error(`no sheet "${id}" (have ${sheets.map((s) => s.id).join(', ')})`);

  for (const lang of langs) {
    for (const sheet of wanted) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const q = new URLSearchParams({ sheet: sheet.id, lang, appUrl });
      await ready(page, `${ORIGIN}/index.html?${q}`);
      for (const e of errors) warnings.push(`${lang}/${sheet.id}: page error: ${e}`);

      // layout checks: text boxes that still overflow at their smallest size, content running into the footer
      const problems = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('.pp').forEach((pp, i) => {
          const foot = pp.querySelector('.pp__foot');
          const limit = foot ? foot.getBoundingClientRect().top : pp.getBoundingClientRect().bottom;
          for (const c of pp.children) {
            if (c === foot) continue;
            const over = Math.round(c.getBoundingClientRect().bottom - limit);
            if (over > 0) out.push(`page ${i + 1}: content ${over}px below the footer line`);
          }
          if (pp.scrollWidth > pp.clientWidth + 1) out.push(`page ${i + 1}: wider than the page`);
          pp.querySelectorAll('[data-check-overflow]').forEach((el) => {
            if (el.scrollHeight > el.clientHeight + 1) out.push(`page ${i + 1}: a list is ${el.scrollHeight - el.clientHeight}px taller than its box`);
          });
          pp.querySelectorAll('[data-fit-over]').forEach((el) => out.push(`page ${i + 1}: text still overflows at scale ${el.dataset.fitScale}`));
        });
        const scales = [...document.querySelectorAll('[data-fit-scale]')].map((el) => Number(el.dataset.fitScale));
        return { out, minScale: scales.length ? Math.min(...scales) : 1, pages: document.querySelectorAll('.pp').length };
      });
      for (const p of problems.out) warnings.push(`${lang}/${sheet.id}: ${p}`);

      const dir = sheet.facilitatorOnly ? join(FACILITATOR_DIR, lang) : join(outDir, lang);
      mkdirSync(dir, { recursive: true });
      const pdf = join(dir, `${sheet.id}.pdf`);
      await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true });
      const bytes = statSync(pdf).size;
      const pdfPages = (readFileSync(pdf, 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
      if (pdfPages !== problems.pages) warnings.push(`${lang}/${sheet.id}: ${problems.pages} page boxes but the PDF has ${pdfPages} pages`);
      if (bytes > MAX_BYTES) warnings.push(`${lang}/${sheet.id}: PDF is ${(bytes / 1024 / 1024).toFixed(1)} MB (limit 2 MB)`);

      if (args.pages) {
        const pngDir = join(PNG_DIR, lang);
        mkdirSync(pngDir, { recursive: true });
        const boxes = await page.locator('.pp').all();
        for (const [i, el] of boxes.entries()) await el.screenshot({ path: join(pngDir, `${sheet.id}-${i + 1}.png`) });
      }
      rows.push({ id: sheet.id, lang, pages: pdfPages, bytes, facilitator: !!sheet.facilitatorOnly, minScale: problems.minScale });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

// manifest of the public sheets (merged, so a partial --only run keeps the other entries)
const publicRows = rows.filter((r) => !r.facilitator);
if (publicRows.length && !customOut) {
  let entries = [];
  try {
    entries = JSON.parse(readFileSync(MANIFEST, 'utf8')).entries ?? [];
  } catch {
    /* first run */
  }
  for (const r of publicRows) {
    entries = entries.filter((e) => !(e.id === r.id && e.lang === r.lang));
    entries.push({ id: r.id, lang: r.lang, pages: r.pages, bytes: r.bytes });
  }
  entries.sort((a, b) => a.id.localeCompare(b.id) || ALL_LANGS.indexOf(a.lang) - ALL_LANGS.indexOf(b.lang));
  writeFileSync(MANIFEST, `${JSON.stringify({ entries }, null, 2)}\n`);
} else if (publicRows.length) {
  console.log('Custom --out: src/content/printManifest.json left alone.');
}

console.log('\nsheet'.padEnd(26) + 'lang'.padEnd(6) + 'pages'.padEnd(7) + 'size'.padEnd(12) + 'smallest text scale');
for (const r of rows) {
  console.log(`${(r.facilitator ? '[facilitator] ' : '') + r.id}`.padEnd(25) + ` ${r.lang.padEnd(5)} ${String(r.pages).padEnd(6)} ${`${(r.bytes / 1024).toFixed(0)} KB`.padEnd(11)} ${r.minScale.toFixed(2)}`);
}
for (const w of warnings) console.log(`WARNING ${w}`);
if (warnings.length) process.exitCode = 1;
