// Performance budget check, run after `vite build` (part of `npm run verify`).
//  - initial JS (entry script + modulepreloads referenced by index.html) <= 200 KB gzip
//  - initial CSS <= 40 KB gzip
//  - games and modules are lazy: none of their chunks is part of the initial load
//  - every image / SVG in dist stays small (single file and total)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = process.argv[2] ?? 'dist';
const KB = 1024;
const LIMITS = { initialJs: 200 * KB, initialCss: 40 * KB, image: 24 * KB, imagesTotal: 120 * KB };

const gz = (file) => gzipSync(readFileSync(join(DIST, file)), { level: 9 }).length;
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const refs = (re) => [...html.matchAll(re)].map((m) => m[1].replace(/^\.\//, ''));
const initialJs = [...new Set([...refs(/<script[^>]+src="([^"]+\.js)"/g), ...refs(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g)])];
const initialCss = [...new Set(refs(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/g))];

const failures = [];
const sum = (files) => files.reduce((total, file) => total + gz(file), 0);
const jsSize = sum(initialJs);
const cssSize = sum(initialCss);
if (initialJs.length === 0) failures.push('no entry script found in index.html');
if (jsSize > LIMITS.initialJs) failures.push(`initial JS ${(jsSize / KB).toFixed(1)} KB gzip > ${LIMITS.initialJs / KB} KB`);
if (cssSize > LIMITS.initialCss) failures.push(`initial CSS ${(cssSize / KB).toFixed(1)} KB gzip > ${LIMITS.initialCss / KB} KB`);

const assets = readdirSync(join(DIST, 'assets'));
const lazyNames = /^(m\d\d|takbo|hati|tawid|lamok|sino|feed|luto|tulog|Sapatos|Objection|TitasGc|Studio|Tulog|TuruanSiAi|TanongKayChatbot|AiOrNot|SpotTheTactic|LibraryScreen|DailyScreen|CertificateScreen|GameShell)-/;
const eager = initialJs.map((f) => f.replace(/^assets\//, '')).filter((f) => lazyNames.test(f));
if (eager.length > 0) failures.push(`lazy chunks loaded up front: ${eager.join(', ')}`);
if (!assets.some((f) => /^m10-/.test(f)) || !assets.some((f) => /^takbo-/.test(f))) failures.push('module and game chunks are missing: code splitting broke');

const images = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== 'guide') walk(path); // the user guide's screenshots load only on #/guide, one section at a time
    }
    else if (['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extname(name))) images.push({ path, size: statSync(path).size });
  }
};
walk(DIST);
for (const img of images) if (img.size > LIMITS.image) failures.push(`${img.path} is ${(img.size / KB).toFixed(1)} KB > ${LIMITS.image / KB} KB`);
const imagesTotal = images.reduce((total, img) => total + img.size, 0);
if (imagesTotal > LIMITS.imagesTotal) failures.push(`images total ${(imagesTotal / KB).toFixed(1)} KB > ${LIMITS.imagesTotal / KB} KB`);

console.log(`budget: initial JS ${(jsSize / KB).toFixed(1)} KB gzip (${initialJs.length} files), CSS ${(cssSize / KB).toFixed(1)} KB gzip, ${images.length} images ${(imagesTotal / KB).toFixed(1)} KB`);
if (failures.length > 0) {
  console.error(`budget FAILED:\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
