// The print app: renders every page of one sheet in one language, then flags itself ready for Playwright.
//   index.html?sheet=<id>&lang=<code>&appUrl=<public app url>
// Without ?sheet it only publishes the sheet list (window.__sheets), which scripts/print/build.mjs reads.
import { render } from 'preact';
import '../../../src/styles/tokens.css';
import '../../../src/styles/ara.css';
import '../../../src/styles/brand.css';
import './print.css';
import { loadPack } from '../../../src/i18n/runtime';
import { Page, fitAll, type SheetBuilder, type SheetMeta } from './kit';

// Sheets are discovered here, so a new sheet is one new file and no shared registry changes.
const metas = import.meta.glob<SheetMeta>('./sheets/*.tsx', { eager: true, import: 'meta' });
const loaders = import.meta.glob<{ default: SheetBuilder }>('./sheets/*.tsx');
const byId = (id: string) => Object.keys(metas).find((k) => metas[k]?.id === id);

declare global {
  interface Window {
    __sheets: SheetMeta[];
  }
}
window.__sheets = Object.values(metas);

async function main() {
  const params = new URLSearchParams(location.search);
  const id = params.get('sheet') ?? '';
  const lang = params.get('lang') ?? 'en';
  const appUrl = params.get('appUrl') ?? '';
  document.documentElement.lang = lang;
  const root = document.getElementById('app');
  const key = byId(id);
  const meta = key ? metas[key] : undefined;
  const load = key ? loaders[key] : undefined;
  if (root && meta && load) {
    await loadPack(lang, false);
    const pages = await (await load()).default({ lang, appUrl });
    render(
      <>
        {pages.map((p, i) => (
          <Page key={i} n={i + 1} total={pages.length} title={meta.title} lang={lang} landscape={meta.landscape}>
            {p}
          </Page>
        ))}
      </>,
      root,
    );
    if (meta.landscape) document.head.append(Object.assign(document.createElement('style'), { textContent: '@page { size: A4 landscape; margin: 0; }' }));
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
    fitAll();
    await document.fonts.ready;
  }
  document.body.dataset.ready = '1';
}

void main();
