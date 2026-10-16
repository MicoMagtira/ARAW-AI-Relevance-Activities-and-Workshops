// Collects every player-facing English string into scripts/i18n/source.json, the master list the language packs translate.
//   node scripts/i18n/extract.mjs
// Sources: the UI catalog (src/app/i18n.ts) and every exported value of the content, module and game files, loaded through
// Vite (so TypeScript and imports just work) and walked deeply. Ids, file names and other code-like strings are skipped.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createServer } from 'vite';

const ROOTS = ['src/content', 'src/modules', 'src/games', 'src/screens', 'src/ui'];
const SKIP_FILE = /(\.test\.|\.d\.ts$|\.css$)/;

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(name) && !SKIP_FILE.test(name)) files.push(p.split(sep).join('/'));
  }
};
ROOTS.forEach(walk);

/** Human text, not code: has a letter, and either a space, a capital, or sentence punctuation. */
const isText = (s) => {
  if (s.length < 2 || !/[A-Za-z]/.test(s)) return false;
  if (/^(https?:|#\/|\.\/|data:|var\(|[a-z]+\/[a-z])/.test(s)) return false; // urls, routes, paths, css
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return false; // colours
  if (/^[a-z0-9_.:-]+$/.test(s)) return false; // ids, slugs, keys, file names
  if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(s)) return false; // camelCase keys (sfxVolume)
  if (/^[a-z]+(\.[a-zA-Z0-9]+)+$/.test(s)) return false; // i18n keys stored in data (g.tawid.tileGo)
  if (/^[A-Z0-9_]+$/.test(s) && s.length <= 3) return false; // tiny codes (EN, OK) stay
  if (/^[MmHhVvLlZz0-9 .,-]+$/.test(s) && /\d/.test(s)) return false; // svg paths
  if (/^[.KYGSsNnWC]+$/.test(s)) return false; // sprite rows
  return true;
};

const found = new Map(); // text -> Set(sources)
const add = (text, src) => {
  if (!isText(text)) return;
  if (!found.has(text)) found.set(text, new Set());
  found.get(text).add(src);
};

const seen = new WeakSet();
const deep = (v, src, depth = 0) => {
  if (depth > 12 || v == null) return;
  if (typeof v === 'string') return add(v, src);
  if (typeof v !== 'object') return;
  if (seen.has(v)) return;
  seen.add(v);
  if (Array.isArray(v)) return v.forEach((x) => deep(x, src, depth + 1));
  if (v instanceof Map) return v.forEach((x) => deep(x, src, depth + 1));
  if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) return; // class instances, DOM
  for (const x of Object.values(v)) deep(x, src, depth + 1);
};

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
let failed = 0;
try {
  const ui = await server.ssrLoadModule('/src/app/i18n.ts');
  for (const [key, text] of Object.entries(ui.EN_STRINGS)) add(text, `ui:${key}`);
  for (const f of files) {
    try {
      const mod = await server.ssrLoadModule('/' + f);
      for (const [name, v] of Object.entries(mod)) if (typeof v !== 'function') deep(v, `${relative('src', f)}#${name}`);
    } catch {
      failed++;
    }
  }
} finally {
  await server.close();
}

const list = [...found].map(([text, srcs]) => ({ text, src: [...srcs].slice(0, 3) })).sort((a, b) => (a.src[0] < b.src[0] ? -1 : 1));
writeFileSync('scripts/i18n/source.json', JSON.stringify(list, null, 1));
const chars = list.reduce((n, e) => n + e.text.length, 0);
console.log(`source.json: ${list.length} strings, ${chars} characters (~${Math.round(chars / 4)} tokens), ${files.length} files read, ${failed} skipped`);
