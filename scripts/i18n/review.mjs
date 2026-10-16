// Accuracy review of the health-critical lines of a pack:  node scripts/i18n/review.mjs <code> [size]
// Picks the lines where a wrong word could mislead about health (myths, Fact or Fake items and test forms, lessons,
// chatbot and group-chat rounds, misinformation tactics, glossary) and writes review batches with the English and the
// current translation: scripts/i18n/work/<code>/review/in/rNNN.json = [{"i":1,"text":"...","tr":"..."}, ...].
// The reviewer writes review/out/rNNN.json with ONLY the lines that need fixing ({"7": "corrected"}; {} if none).
// pack.mjs applies the corrections. Re-running only adds lines not yet queued for review.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [code, sizeArg] = process.argv.slice(2);
if (!code) throw new Error('usage: node scripts/i18n/review.mjs <code> [size]');
const SIZE = Number(sizeArg ?? 120);
const HEALTH = /(library[\\/]myths|factOrFake[\\/]|chatbot|gc\.ts|tactics|modules[\\/]m\d\d|library[\\/]glossary)/;
const DIR = join('scripts', 'i18n', 'work', code, 'review');
mkdirSync(join(DIR, 'in'), { recursive: true });
mkdirSync(join(DIR, 'out'), { recursive: true });

const pack = JSON.parse(readFileSync(join('src', 'i18n', 'packs', `${code}.json`), 'utf8'));
const source = JSON.parse(readFileSync('scripts/i18n/source.json', 'utf8'));
const queued = new Set();
let last = 0;
for (const name of readdirSync(join(DIR, 'in')).filter((f) => /^r\d+\.json$/.test(f))) {
  last = Math.max(last, Number(name.slice(1, -5)));
  for (const e of JSON.parse(readFileSync(join(DIR, 'in', name), 'utf8'))) queued.add(e.text);
}
const lines = source.filter((e) => e.src.some((s) => HEALTH.test(s)) && pack[e.text] && pack[e.text] !== e.text && !queued.has(e.text));
let made = 0;
for (let i = 0; i < lines.length; i += SIZE) {
  const batch = lines.slice(i, i + SIZE).map((e, k) => ({ i: k + 1, text: e.text, tr: pack[e.text] }));
  writeFileSync(join(DIR, 'in', `r${String(++last).padStart(3, '0')}.json`), `[\n${batch.map((e) => JSON.stringify(e)).join(',\n')}\n]\n`);
  made++;
}
const all = readdirSync(join(DIR, 'in')).filter((f) => /^r\d+\.json$/.test(f));
console.log(`${code} review: ${made} new batches (${lines.length} lines); ${all.filter((f) => existsSync(join(DIR, 'out', f))).length}/${all.length} reviewed`);
