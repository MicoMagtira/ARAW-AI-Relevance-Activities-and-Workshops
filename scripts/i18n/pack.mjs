// Builds the app's language pack from the translated batches:  node scripts/i18n/pack.mjs <code>
// Reads scripts/i18n/work/<code>/in + out, checks each translation, and writes src/i18n/packs/<code>.json
// ({ english: translation }). Problems are listed in scripts/i18n/work/<code>/report.txt; bad entries are left out
// (those strings simply stay in English) so a broken line can never break a screen.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [code] = process.argv.slice(2);
if (!code) throw new Error('usage: node scripts/i18n/pack.mjs <code>');
const WORK = join('scripts', 'i18n', 'work', code);
const source = new Set(JSON.parse(readFileSync('scripts/i18n/source.json', 'utf8')).map((e) => e.text));

const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const pack = {};
const problems = [];
let batches = 0;
let pendingBatches = 0;
for (const name of readdirSync(join(WORK, 'in')).filter((f) => /^b\d+\.json$/.test(f)).sort()) {
  const outPath = join(WORK, 'out', name);
  if (!existsSync(outPath)) {
    pendingBatches++;
    continue;
  }
  batches++;
  const input = JSON.parse(readFileSync(join(WORK, 'in', name), 'utf8'));
  let out;
  try {
    out = JSON.parse(readFileSync(outPath, 'utf8'));
  } catch (err) {
    problems.push(`${name}: unreadable JSON (${err.message})`);
    continue;
  }
  for (const { i, text } of input) {
    const tr = out[String(i)];
    if (typeof tr !== 'string' || !tr.trim()) {
      problems.push(`${name}#${i} missing: ${text.slice(0, 60)}`);
      continue;
    }
    if (holes(tr) !== holes(text)) {
      problems.push(`${name}#${i} placeholders differ: "${text.slice(0, 50)}" -> "${tr.slice(0, 50)}"`);
      continue;
    }
    if (!source.has(text)) continue; // text no longer in the app
    pack[text] = tr; // kept even when unchanged (names, loanwords), so the QA sweep knows it was reviewed
  }
}

// Hand-made additions for words the extractor cannot see (e.g. the default nickname): work/<code>/extra.json
const extraPath = join(WORK, 'extra.json');
if (existsSync(extraPath)) Object.assign(pack, JSON.parse(readFileSync(extraPath, 'utf8')));

// Harmonize: a translation that still contains an English phrase which has its own translation (a module or game title
// left in English inside a longer line) gets that phrase swapped in, so titles read the same everywhere.
const phrases = Object.keys(pack)
  .filter((s) => s.length >= 10 && s.includes(' ') && pack[s] !== s)
  .sort((a, b) => b.length - a.length);
let harmonized = 0;
for (const [text, tr] of Object.entries(pack)) {
  let next = tr;
  for (const p of phrases) if (p !== text && next.includes(p)) next = next.split(p).join(pack[p]);
  if (next !== tr) {
    pack[text] = next;
    harmonized++;
  }
}
if (harmonized) problems.push(`(info) harmonized ${harmonized} lines that kept an English title or phrase`);

mkdirSync('src/i18n/packs', { recursive: true });
const total = source.size;
const n = Object.keys(pack).length;
if (n > 0) writeFileSync(join('src', 'i18n', 'packs', `${code}.json`), JSON.stringify(pack));
writeFileSync(join(WORK, 'report.txt'), [`${code}: ${n} of ${total} strings translated (${batches} batches done, ${pendingBatches} pending)`, ...problems].join('\n') + '\n');
console.log(`${code}: ${n}/${total} strings (${Math.round((n / total) * 100)}%), ${batches} batches done, ${pendingBatches} pending, ${problems.length} problems (see ${join(WORK, 'report.txt')})`);
