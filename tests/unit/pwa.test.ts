import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pwaPlugin } from '../../scripts/pwa-plugin.ts';

const file = (path: string) => resolve(process.cwd(), path);
const read = (path: string) => readFileSync(file(path), 'utf8');

describe('web app manifest', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
    start_url: string;
    scope: string;
    theme_color: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };

  it('is relative (static hosting) and installable', () => {
    expect(manifest.start_url.startsWith('./')).toBe(true);
    expect(manifest.scope).toBe('./');
    expect(manifest.theme_color).toBe('#F5D89E');
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('points at icon files that exist', () => {
    for (const icon of manifest.icons) expect(existsSync(file(`public/${icon.src}`)), icon.src).toBe(true);
    expect(existsSync(file('public/icons/apple-touch-icon.png'))).toBe(true);
  });

  it('icon PNGs are real PNG files', () => {
    const header = readFileSync(file('public/icons/icon-512.png')).subarray(0, 8);
    expect([...header]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});

describe('service worker build step', () => {
  it('emits sw.js with the precache list, skipping the .woff fallbacks', () => {
    const emitted: { fileName: string; source: string }[] = [];
    const plugin = pwaPlugin('9.9.9');
    const generate = plugin.generateBundle as unknown as (this: { emitFile: (f: { fileName: string; source: string }) => void }, o: object, b: Record<string, object>) => void;
    generate.call({ emitFile: (f) => emitted.push(f) }, {}, { 'assets/index-a.js': {}, 'assets/nunito-latin-400-normal-x.woff2': {}, 'assets/nunito-latin-400-normal-y.woff': {} });
    const sw = emitted[0];
    expect(sw?.fileName).toBe('sw.js');
    expect(sw?.source).toContain('assets/index-a.js');
    expect(sw?.source).toContain('"index.html"');
    expect(sw?.source).toContain('assets/nunito-latin-400-normal-x.woff2');
    expect(sw?.source).not.toContain('.woff"');
    expect(sw?.source).toMatch(/const CACHE = 'araw-9\.9\.9-[0-9a-f]{8}'/);
    expect(sw?.source).not.toContain('__PRECACHE__');
    // how-to videos stream from the network: never cached for offline (range requests, a few MB each)
    expect(sw?.source).toContain("url.pathname.includes('/videos/')");
  });
});
