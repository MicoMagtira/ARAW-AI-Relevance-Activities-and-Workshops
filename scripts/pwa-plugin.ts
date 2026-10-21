import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/** Emits `sw.js` with the list of every built file worth caching (old `.woff` fallbacks are skipped: all modern browsers take woff2). */
export function pwaPlugin(version: string): Plugin {
  return {
    name: 'araw-pwa',
    apply: 'build',
    generateBundle(_options, bundle) {
      // language packs (src/i18n/packs) are left out: only the chosen one is fetched, then kept by the runtime cache
      const isPack = (name: string): boolean => {
        const chunk = bundle[name];
        return !!chunk && chunk.type === 'chunk' && !!chunk.facadeModuleId && /[\/]i18n[\/]packs[\/]/.test(chunk.facadeModuleId);
      };
      // the Chatbot Sandbox AI engine (wllama scripts and its ~25 MB of .wasm) is left out too: it is cached on first use,
      // so players who never open the sandbox never download it
      const isAiEngine = (name: string): boolean => {
        const item = bundle[name];
        if (!item) return false;
        if (item.type === 'asset') return name.endsWith('.wasm');
        return (item.moduleIds ?? []).some((id) => /[\/]@wllama[\/]|[\/]src[\/]sandbox[\/](wllama|fake)/.test(id));
      };
      const files = Object.keys(bundle).filter((name) => !name.endsWith('.woff') && !isPack(name) && !isAiEngine(name));
      // index.html is added by hand: Vite emits it after this hook runs, so it is not in the bundle yet
      const precache = ['./', 'index.html', ...files, 'favicon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/icon.svg', 'icons/apple-touch-icon.png'];
      const list = JSON.stringify([...new Set(precache)]);
      // the cache name changes whenever any hashed file changes, so old caches are dropped on activate
      const id = `${version}-${createHash('sha1').update(list).digest('hex').slice(0, 8)}`;
      const template = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'sw-template.js'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', id).replace('__PRECACHE__', list),
      });
    },
  };
}
