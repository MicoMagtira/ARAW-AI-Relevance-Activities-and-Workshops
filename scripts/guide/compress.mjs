// Shrinks the guide screenshots for the app: public/guide/*.png -> *.webp (lossy, quality 0.85) and points the manifest
// at them. The PNG originals move to scripts/guide/out/png/ (gitignored), where build-pdf.mjs picks them up: Chromium
// re-encodes WebP inside a PDF badly (5x larger), so the printable guide keeps the crisp PNGs.
// Order: capture -> node scripts/guide/compress.mjs -> node scripts/guide/build-pdf.mjs
// Uses Playwright's Chromium to encode WebP, so no extra image library is needed.
import { mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const DIR = 'public/guide';
const MANIFEST = 'scripts/guide/out/manifest.json';
const QUALITY = 0.85;
const KEEP = 'scripts/guide/out/png';
mkdirSync(KEEP, { recursive: true });

const pngs = readdirSync(DIR).filter((f) => f.endsWith('.png'));
if (pngs.length === 0) {
  console.log('guide images: nothing to compress');
  process.exit(0);
}
const browser = await chromium.launch();
const page = await browser.newPage();
let before = 0;
let after = 0;
for (const name of pngs) {
  const src = join(DIR, name);
  const png = readFileSync(src);
  const webp = await page.evaluate(
    async ({ b64, q }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', q).split(',')[1];
    },
    { b64: png.toString('base64'), q: QUALITY },
  );
  const out = src.replace(/\.png$/, '.webp');
  writeFileSync(out, Buffer.from(webp, 'base64'));
  before += png.length;
  after += statSync(out).size;
  renameSync(src, join(KEEP, name));
}
await browser.close();

const manifest = readFileSync(MANIFEST, 'utf8').replace(/(guide\/[^"]+)\.png"/g, '$1.webp"');
writeFileSync(MANIFEST, manifest);
console.log(`guide images: ${pngs.length} files, ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB (WebP q${QUALITY * 100})`);
