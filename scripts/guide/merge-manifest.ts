// Playwright globalTeardown for capture.config.ts: merges the per-shot parts (out/parts/*.json) into out/manifest.json.
// It starts from the existing manifest, so a partial run (`-g home`) still leaves a complete one. out/parts/ is gitignored;
// out/manifest.json is committed (the in-app Guide imports it).
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GuideManifest, ShotEntry, ShotVariant } from '../../src/screens/guide/callouts';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');

interface Part extends ShotEntry {
  id: string;
  variant: ShotVariant;
}

export default function mergeManifest(): void {
  const partsDir = join(OUT, 'parts');
  mkdirSync(partsDir, { recursive: true });
  const file = join(OUT, 'manifest.json');
  const previous = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as GuideManifest) : null;
  const manifest: GuideManifest = { generatedAt: new Date().toISOString(), shots: previous?.shots ?? {} };
  for (const name of readdirSync(partsDir).filter((f) => f.endsWith('.json')).sort()) {
    const { id, variant, ...entry } = JSON.parse(readFileSync(join(partsDir, name), 'utf8')) as Part;
    (manifest.shots[id] ??= {})[variant] = entry;
  }
  writeFileSync(file, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`guide manifest: ${Object.keys(manifest.shots).length} shots -> scripts/guide/out/manifest.json`);
}
