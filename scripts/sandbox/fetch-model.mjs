// Download the Chatbot Sandbox model into public/models/ for offline app builds (VITE_MODEL_SOURCE=local npm run build).
// The website does not need this: it loads the same pinned file from Hugging Face. public/models/ is git-ignored.
//   node scripts/sandbox/fetch-model.mjs            (the default model)
//   node scripts/sandbox/fetch-model.mjs gemma3-1b  (a bake-off candidate)
// The file is checked against Hugging Face's SHA-256 (its LFS etag) before it is kept.
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { DEFAULT_MODEL_ID, MODELS, modelUrl } from '../../src/sandbox/model.ts';

const id = process.argv[2] ?? DEFAULT_MODEL_ID;
const model = MODELS[id];
if (!model) {
  console.error(`Unknown model "${id}". Choose one of: ${Object.keys(MODELS).join(', ')}`);
  process.exit(1);
}

const dir = join('public', 'models');
const target = join(dir, model.file);
const url = modelUrl(model, 'hf', 'https://example.invalid/');
mkdirSync(dir, { recursive: true });

const head = await fetch(url, { method: 'HEAD', redirect: 'manual' });
const sha = (head.headers.get('x-linked-etag') ?? '').replace(/"/g, '');
const size = Number(head.headers.get('x-linked-size') ?? 0);

if (existsSync(target) && size > 0 && statSync(target).size === size) {
  console.log(`${target} is already here (${(size / 1048576).toFixed(0)} MB).`);
  process.exit(0);
}

console.log(`Downloading ${model.label} (${model.sizeMB} MB) from ${url}`);
const res = await fetch(url);
if (!res.ok || !res.body) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}
const total = Number(res.headers.get('content-length') ?? size);
const hash = createHash('sha256');
let done = 0;
let shown = -1;
const body = Readable.fromWeb(res.body);
body.on('data', (chunk) => {
  hash.update(chunk);
  done += chunk.length;
  const pct = total ? Math.floor((done / total) * 100) : 0;
  if (pct !== shown && pct % 5 === 0) {
    shown = pct;
    process.stdout.write(`\r${pct}% of ${(total / 1048576).toFixed(0)} MB`);
  }
});
const partial = `${target}.part`;
await pipeline(body, createWriteStream(partial));
process.stdout.write('\n');

const digest = hash.digest('hex');
if (sha && digest !== sha) {
  rmSync(partial, { force: true });
  console.error(`Checksum mismatch: expected ${sha}, got ${digest}. Nothing was kept.`);
  process.exit(1);
}
renameSync(partial, target);
console.log(`Saved ${target}${sha ? ' (SHA-256 checked)' : ''}.`);
