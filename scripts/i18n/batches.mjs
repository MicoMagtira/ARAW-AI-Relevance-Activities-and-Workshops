// Splits what a language still lacks into translation batches:  node scripts/i18n/batches.mjs <code> [size]
// Input:  scripts/i18n/source.json (run extract.mjs first).
// Output: scripts/i18n/work/<code>/in/bNNN.json  = [{ "i": 1, "text": "...", "where": "content/library/myths.ts#MYTHS" }, ...]
// A translator writes scripts/i18n/work/<code>/out/bNNN.json = { "1": "...", "2": "..." } for each in-file.
// Re-running is safe: strings already translated (in any out-file) or already waiting in an in-file are skipped, and
// only new strings go into new batches, so content added later is picked up without redoing anything.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [code, sizeArg] = process.argv.slice(2);
if (!code) throw new Error('usage: node scripts/i18n/batches.mjs <code> [size]');
const SIZE = Number(sizeArg ?? 150);
const WORK = join('scripts', 'i18n', 'work', code);
const IN = join(WORK, 'in');
const OUT = join(WORK, 'out');
mkdirSync(IN, { recursive: true });
mkdirSync(OUT, { recursive: true });

const source = JSON.parse(readFileSync('scripts/i18n/source.json', 'utf8'));
const covered = new Set();
let last = 0;
for (const name of readdirSync(IN).filter((f) => /^b\d+\.json$/.test(f))) {
  last = Math.max(last, Number(name.slice(1, -5)));
  for (const e of JSON.parse(readFileSync(join(IN, name), 'utf8'))) covered.add(e.text);
}
const pending = source.filter((e) => !covered.has(e.text));

let made = 0;
for (let i = 0; i < pending.length; i += SIZE) {
  const batch = pending.slice(i, i + SIZE).map((e, k) => ({ i: k + 1, text: e.text, where: e.src[0].replaceAll('\\', '/') }));
  const name = `b${String(++last).padStart(3, '0')}.json`;
  // one entry per line: compact for the translator to read, still easy to diff
  writeFileSync(join(IN, name), `[\n${batch.map((e) => JSON.stringify(e)).join(',\n')}\n]\n`);
  made++;
}
const all = readdirSync(IN).filter((f) => /^b\d+\.json$/.test(f));
const done = all.filter((f) => existsSync(join(OUT, f)));
console.log(`${code}: ${made} new batches (${pending.length} strings); ${done.length}/${all.length} batches translated so far`);
