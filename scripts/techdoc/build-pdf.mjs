// Builds the technical documentation PDF: ARAW V1.0-Technical-Documentation.pdf (A4, repository root).
//
//   node scripts/techdoc/build-pdf.mjs            (or: npm run techdoc)
//   node scripts/techdoc/build-pdf.mjs --pages    (also saves a PNG of every page to scripts/techdoc/out/ for a quick look)
//
// docs/TECHNICAL.md is the only source. It is rendered with `marked` to A4 HTML in the ARAW look (self-hosted Fontsource
// fonts, design-token colours, Press Start 2P only for the cover title), written to scripts/techdoc/out/technical.html and
// printed with Playwright's Chromium from file://. No server and no port are needed.
//   - Every numbered section (and appendix) starts on a new page. The table of contents gets its page numbers by printing
//     each section on its own once (same engine, same CSS), so the numbers are exact, not estimated.
//   - The footer "page n / N" is a CSS page margin box (counter(page), counter(pages)); the cover has none.
//   - A markdown block "<!-- figure:name -->" followed by a ```text diagram is replaced by an SVG figure from FIGURES below
//     (the text version stays readable on GitHub); a figure must exist for every marker, or the build stops.
//   - --pages needs Chromium's built-in PDF viewer; if that is not available the previews are skipped with a message.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { marked } from 'marked';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'out');
const SOURCE = join(ROOT, 'docs', 'TECHNICAL.md');
const PDF = join(ROOT, 'ARAW V1.0-Technical-Documentation.pdf');
mkdirSync(OUT, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fileUrl = (p) => pathToFileURL(p).href;
const font = (pkg, file) => fileUrl(join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file));

/* ---------- colours (src/styles/tokens.css) ---------- */
const C = { ink: '#1F2550', navy: '#35408E', gold: '#F5D89E', deep: '#E8B84A', cream: '#FFF8EC', soft: '#F3ECDD', white: '#FFFFFF', line: '#EADFC8', fact: '#E3F4EA', fake: '#FDE7E8', tint: '#E3E6F5', muted: '#4A4F6A' };

/* ---------- SVG figure kit ---------- */
const warnings = [];
/** A pixel-style box: hard 3px offset shadow, ink border, bold title and up to a few lines of text. */
function box(figure, { x, y, w, h, fill = C.white, title, lines = [], tsize = 12.5, lsize = 10.5, tcolor = C.navy, shadow = true }) {
  const cx = x + w / 2;
  const total = tsize + lines.length * (lsize + 3);
  let ty = y + (h - total) / 2 + tsize * 0.85;
  const parts = [];
  if (shadow) parts.push(`<rect x="${x + 3}" y="${y + 3}" width="${w}" height="${h}" fill="${C.ink}"/>`);
  parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${C.ink}" stroke-width="2"/>`);
  const fit = (text, size, weight) => {
    if (text.length * size * (weight === 800 ? 0.56 : 0.5) > w - 8) warnings.push(`figure "${figure}": "${text}" may not fit its box (${w}px)`);
  };
  fit(title, tsize, 800);
  parts.push(`<text x="${cx}" y="${ty}" text-anchor="middle" font-family="Baloo 2" font-weight="800" font-size="${tsize}" fill="${tcolor}">${esc(title)}</text>`);
  for (const line of lines) {
    ty += lsize + 3;
    fit(line, lsize, 600);
    parts.push(`<text x="${cx}" y="${ty + (lines.indexOf(line) === 0 ? 1 : 0)}" text-anchor="middle" font-family="Nunito" font-weight="700" font-size="${lsize}" fill="${C.ink}">${esc(line)}</text>`);
  }
  return parts.join('');
}
/** A container: dashed outline with a small label, no shadow. */
function frame({ x, y, w, h, label, fill = C.cream }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${C.ink}" stroke-width="2" stroke-dasharray="7 4"/>
    <text x="${x + 12}" y="${y + 20}" font-family="Baloo 2" font-weight="800" font-size="13" fill="${C.navy}">${esc(label)}</text>`;
}
function arrow(id, x1, y1, x2, y2, { label, lx, ly, dashed = false, anchor = 'middle' } = {}) {
  const text = label ? `<text x="${lx ?? (x1 + x2) / 2}" y="${ly ?? (y1 + y2) / 2 - 5}" text-anchor="${anchor}" font-family="Nunito" font-weight="700" font-size="10" fill="${C.muted}">${esc(label)}</text>` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${C.ink}" stroke-width="2"${dashed ? ' stroke-dasharray="5 3"' : ''} marker-end="url(#${id})"/>${text}`;
}
const svg = (id, w, h, body) => `<svg class="fig-svg" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="${id}-t" xmlns="http://www.w3.org/2000/svg">
  <defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0 0L9 4.5L0 9z" fill="${C.ink}"/></marker></defs>
  <title id="${id}-t">__TITLE__</title>${body}</svg>`;

const FIGURES = {
  architecture: {
    caption: 'Figure 1. System architecture. ARAW is a client-only static app: everything runs on the learner\'s device; the network is used only for files, the optional model download and the optional report.',
    alt: 'Architecture diagram: the learner\'s browser holds the ARAW web app (shell, modules, games, chatbot sandbox, content, language packs, service worker) and local storage; a static host sends the app files, Hugging Face sends the model file, and an optional Google Apps Script relay receives report text.',
    draw() {
      const f = 'architecture';
      const a = 'a1';
      let s = frame({ x: 10, y: 24, w: 470, h: 478, label: 'Learner\'s device (browser)' });
      s += `<rect x="24" y="62" width="442" height="246" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/>`;
      s += `<text x="38" y="84" font-family="Baloo 2" font-weight="800" font-size="12.5" fill="${C.ink}">ARAW web app: Vite build, Preact, hash router</text>`;
      const blocks = [['App shell', 'router, store', 'settings, language', C.gold], ['Learn', '10 modules', 'lesson engine', C.tint], ['Arcade', '11 games', 'Canvas 2D engine', C.tint], ['Sandbox', 'chatbot, wllama', 'safety guard', C.tint]];
      blocks.forEach(([t, l1, l2, fill], i) => (s += box(f, { x: 34 + i * 108, y: 96, w: 100, h: 78, title: t, lines: [l1, l2], fill, tsize: 12, lsize: 10 })));
      s += box(f, { x: 36, y: 188, w: 206, h: 46, title: 'Content banks', lines: ['typed and validated'], fill: C.soft, shadow: false, tsize: 12, lsize: 10 });
      s += box(f, { x: 250, y: 188, w: 206, h: 46, title: 'Language packs (lazy)', lines: ['fil, ceb, ilo, hil'], fill: C.soft, shadow: false, tsize: 12, lsize: 10 });
      s += box(f, { x: 34, y: 248, w: 422, h: 44, title: 'Service worker', lines: ['offline app shell after the first visit'], fill: C.soft, shadow: false, tsize: 12, lsize: 10 });
      s += `<rect x="24" y="322" width="442" height="166" fill="${C.white}" stroke="${C.ink}" stroke-width="2"/>`;
      s += `<text x="38" y="344" font-family="Baloo 2" font-weight="800" font-size="12.5" fill="${C.ink}">Stored on the device only</text>`;
      const store = [['localStorage', 'araw:v1:* keys', 'progress, settings'], ['OPFS', 'chatbot model file', '(wllama model cache)'], ['Cache Storage', 'app files', '(service worker)']];
      store.forEach(([t, l1, l2], i) => (s += box(f, { x: 34 + i * 144, y: 360, w: 134, h: 112, title: t, lines: [l1, l2], fill: C.gold, tsize: 12, lsize: 10 })));
      // right column
      s += box(f, { x: 548, y: 40, w: 202, h: 124, title: 'Static host', lines: ['Cloudflare (live site)', 'index.html, hashed JS and CSS,', 'fonts, sw.js, media in public/', '_headers: cache, COOP, COEP'], fill: C.white, tsize: 13, lsize: 10 });
      s += box(f, { x: 548, y: 214, w: 202, h: 96, title: 'Hugging Face', lines: ['pinned commit, one GGUF file', 'only for the Chatbot Sandbox'], fill: C.white, tsize: 13, lsize: 10 });
      s += box(f, { x: 548, y: 366, w: 202, h: 112, title: 'Report relay (optional)', lines: ['Google Apps Script web app', 'e-mail to AIKasalig + log sheet', 'text the player chose to send'], fill: C.white, tsize: 13, lsize: 10 });
      s += arrow(a, 546, 102, 484, 102, { label: 'app files', lx: 515, ly: 94 });
      s += arrow(a, 546, 262, 484, 262, { label: 'model', lx: 515, ly: 254 });
      s += arrow(a, 484, 422, 546, 422, { label: 'report', lx: 515, ly: 414 });
      return svg(a, 760, 512, s);
    },
    size: [760, 512],
  },
  sandbox: {
    caption: 'Figure 2. Chatbot Sandbox: the path of one message. Safety checks run before the model; the dose filter runs on the streamed answer.',
    alt: 'Flow diagram: player input goes to guard.ts, then prompt.ts, then engine.ts and the wllama worker; the answer streams through the dose filter and tidyAnswer into the chat bubble. The guard branches to a hotline card for self-harm, a Magpatingin agad card for red flags and a privacy nudge for personal data.',
    draw() {
      const f = 'sandbox';
      const a = 'a2';
      let s = '';
      const row1 = [['Player input', ['up to 500 characters'], C.white], ['guard.ts', ['safety checks first'], C.gold], ['prompt.ts', ['system prompt and', 'the newest chat turns'], C.white], ['engine.ts', ['state machine,', 'device checks'], C.white]];
      row1.forEach(([t, l, fill], i) => (s += box(f, { x: 20 + i * 183, y: 14, w: 150, h: 78, title: t, lines: l, fill })));
      for (let i = 0; i < 3; i++) s += arrow(a, 172 + i * 183, 53, 201 + i * 183, 53);
      // guard branches
      s += `<path d="M278 94V114M101 114H455" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
      const br = [['Self-harm words', ['hotline 1553; the message', 'never reaches the model'], C.fake], ['Red flags', ['"Magpatingin agad" card:', 'health facility or 911'], C.fake], ['Personal data', ['privacy nudge:', 'Edit or Send anyway'], C.fact]];
      br.forEach(([t, l, fill], i) => {
        s += box(f, { x: 20 + i * 177, y: 134, w: 162, h: 78, title: t, lines: l, fill, tsize: 12, lsize: 10 });
        s += arrow(a, 101 + i * 177, 114, 101 + i * 177, 132);
      });
      s += arrow(a, 644, 94, 644, 238, { label: 'model call', lx: 650, ly: 170, anchor: 'start' });
      const row2 = [['Chat bubble', ['"can be wrong" label,', 'rating and Ara\'s tip'], C.white], ['tidyAnswer()', ['plain text for', 'the bubble'], C.white], ['Dose filter', ['hides any sentence with', 'a dose, as it streams'], C.gold], ['wllama worker', ['llama.cpp in WebAssembly,', 'model read from OPFS'], C.white]];
      row2.forEach(([t, l, fill], i) => (s += box(f, { x: 20 + i * 183, y: 240, w: 150, h: 78, title: t, lines: l, fill })));
      for (let i = 0; i < 3; i++) s += arrow(a, 569 - i * 183, 279, 538 - i * 183, 279, i === 0 ? { label: 'streamed tokens', lx: 553, ly: 336 } : {});
      s += `<text x="20" y="352" font-family="Nunito" font-weight="700" font-size="11" fill="${C.muted}">Chats stay in memory. No server, no API key: the model runs on the learner's device.</text>`;
      return svg(a, 760, 366, s);
    },
    size: [760, 366],
  },
  pipelines: {
    caption: 'Figure 3. Build and media pipelines. Everything is compiled from the app\'s own typed content; test forms are printed for facilitators only.',
    alt: 'Table-like diagram with three columns: sources, pipelines and outputs, for translation packs, how-to videos, lecture videos, the user guide, public print sheets, facilitator-only test sheets and this document.',
    draw() {
      const f = 'pipelines';
      const a = 'a3';
      let s = '';
      const heads = [['Sources', 10, 220], ['Pipelines', 272, 246], ['Outputs', 570, 180]];
      heads.forEach(([t, x, w]) => (s += `<text x="${x + w / 2}" y="16" text-anchor="middle" font-family="Press Start 2P" font-size="9" fill="${C.navy}">${t.toUpperCase()}</text>`));
      const rows = [
        [['UI strings, content,', 'modules and games'], ['Translation pipeline', 'extract, batches, translate, pack'], ['Language packs', 'fil, ceb, ilo, hil (lazy)'], C.white],
        [['The built app', 'dist/ on a temporary preview'], ['How-to recorder', 'Playwright, VP9, paused game clock'], ['public/videos', '65 WebM + VTT files'], C.white],
        [['Real lesson screens', 'one module, one language'], ['Lecture recorder', 'CDP screencast + ffmpeg-static'], ['lecture-out/', 'MP4, VTT, SRT (git-ignored)'], C.white],
        [['Built app + guide.ts', 'screens at phone and desktop'], ['Guide pipeline', 'capture, compress, build PDF'], ['public/guide', 'WebP pictures + user guide PDF'], C.white],
        [['Typed content', 'and the print app'], ['Print build', 'Playwright prints from disk'], ['public/print', '50 public PDFs'], C.white],
        [['Test forms A and B', 'and the answer key'], ['Same print build', 'sheets marked facilitatorOnly'], ['print-out/facilitator', 'git-ignored, never in the app'], C.fake],
        [['docs/TECHNICAL.md', 'single source'], ['This builder', 'marked + Playwright print'], ['Technical PDF', 'repository root'], C.gold],
      ];
      rows.forEach(([src, pipe, out, fill], i) => {
        const y = 28 + i * 52;
        s += box(f, { x: 10, y, w: 220, h: 42, title: src[0], lines: [src[1]], fill: C.white, tsize: 11.5, lsize: 9.5 });
        s += box(f, { x: 272, y, w: 246, h: 42, title: pipe[0], lines: [pipe[1]], fill: C.tint, tsize: 11.5, lsize: 9.5 });
        s += box(f, { x: 570, y, w: 180, h: 42, title: out[0], lines: [out[1]], fill, tsize: 11.5, lsize: 9.5 });
        s += arrow(a, 232, y + 21, 268, y + 21) + arrow(a, 520, y + 21, 566, y + 21);
      });
      return svg(a, 760, 28 + rows.length * 52, s);
    },
    size: [760, 392],
  },
};

/* ---------- partner logos (same files, order and optical sizing as src/ui/PartnerLogos.tsx and the user guide) ---------- */
function opticalFactor(aspect, slug) {
  let factor = Math.max(0.62, Math.min(1.15, aspect ** -0.38));
  if (aspect < 1.3) factor *= 1.2;
  return factor * (slug === '05_nicer_rdc_nlpha' ? 1.3 : 1);
}
const logoDir = join(ROOT, 'src', 'assets', 'logos');
const logoSizes = existsSync(join(logoDir, 'logos.json')) ? JSON.parse(readFileSync(join(logoDir, 'logos.json'), 'utf8')) : {};
const PARTNERS = [
  ['01_dost', 'Department of Science and Technology (DOST)'],
  ['02_dost_pchrd', 'DOST-PCHRD'],
  ['03_national_university', 'National University'],
  ['04_nicer_dost', 'NICER'],
  ['05_nicer_rdc_nlpha', 'RDC-NLPHA'],
  ['06_aikasalig', 'AIKasalig'],
].filter(([slug]) => existsSync(join(logoDir, `${slug}.webp`)) && logoSizes[slug]);
const logosHtml = PARTNERS.map(([slug, name]) => {
  const { w, h } = logoSizes[slug];
  return `<img src="${fileUrl(join(logoDir, `${slug}.webp`))}" alt="${esc(name)}" style="height:${(9 * opticalFactor(w / h, slug)).toFixed(2)}mm">`;
}).join('');

/* ---------- pixel sun (same drawing as the user guide cover) ---------- */
function halfDisc(radius, cx, baseY) {
  const rows = [];
  for (let k = 0; k < Math.ceil(radius); k++) {
    const half = Math.floor(Math.sqrt(radius * radius - (k + 0.5) ** 2));
    rows.push([cx - half, baseY - 1 - k, 2 * half + 1]);
  }
  return rows;
}
const rectPath = (rows) => rows.map(([x, y, w]) => `M${x} ${y}h${w}v1h-${w}z`).join('');
function sunSvg(cls) {
  const body = halfDisc(12.5, 18, 18);
  const outline = rectPath(body.flatMap(([x, y, w]) => [[x - 1, y, w + 2], [x, y - 1, w]]));
  return `<svg class="${cls}" viewBox="0 0 37 18" shape-rendering="crispEdges" aria-hidden="true">
    <path fill="#E8B84A" d="M18 0h1v3h-1zM6 5h2v2H6zM29 5h2v2h-2zM2 11h3v1H2zM32 11h3v1h-3zM1 17h4v1H1zM32 17h4v1h-4z"/>
    <path fill="#1F2550" d="${outline}"/><path fill="#E8B84A" d="${rectPath(body)}"/><path fill="#F5D89E" d="${rectPath(halfDisc(8.5, 18, 18))}"/></svg>`;
}
const cloud = (cls) => `<svg class="cloud ${cls}" viewBox="0 0 14 4" shape-rendering="crispEdges" aria-hidden="true"><path fill="#FFFFFF" d="M4 0h4v1H4zM2 1h8v1H2zM0 2h14v1H0zM0 3h14v1H0z"/></svg>`;

/* ---------- markdown to sections ---------- */
let md = readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n');
const figureNames = [];
md = md.replace(/<!-- figure:(\w+) -->\s*```text\n[\s\S]*?\n```/g, (_, name) => {
  if (!FIGURES[name]) throw new Error(`no SVG figure called "${name}" in scripts/techdoc/build-pdf.mjs`);
  figureNames.push(name);
  return `\n\n<div class="fig" data-fig="${name}"></div>\n\n`;
});
let html = marked.parse(md, { gfm: true, async: false });
html = html.replace(/<h1>[\s\S]*?<\/h1>\s*/, '');
const firstRule = html.indexOf('<hr>');
const front = firstRule > 0 ? html.slice(0, firstRule) : '';
const rest = firstRule > 0 ? html.slice(firstRule + 4) : html;

const strip = (s) => s.replace(/<[^>]+>/g, '');
const sections = rest
  .split(/(?=<h2>)/)
  .filter((s) => s.trim().startsWith('<h2>'))
  .map((raw, i) => {
    const heading = /<h2>([\s\S]*?)<\/h2>/.exec(raw);
    const title = strip(heading[1]);
    const num = /^(\d+)\.\s+(.*)$/.exec(title);
    const app = /^Appendix ([A-Z])\.\s+(.*)$/.exec(title);
    const label = num ? String(num[1]) : app ? app[1] : '';
    const kicker = num ? `Section ${num[1]}` : app ? `Appendix ${app[1]}` : '';
    const name = num ? num[2] : app ? app[2] : title;
    let body = raw.replace(heading[0], '').replace(/<hr>\s*/g, '');
    // soft break points after slashes, so file paths wrap at a folder name instead of in the middle of a word
    body = body.replace(/<code>([^<]*)<\/code>/g, (_, t) => `<code>${t.replace(/\//g, '/<wbr>')}</code>`);
    body = body.replace(/<table>/g, '<div class="tw"><table>').replace(/<\/table>/g, '</table></div>');
    body = body.replace(/<div class="fig" data-fig="(\w+)"><\/div>/g, (_, n) => {
      const fig = FIGURES[n];
      const drawn = fig.draw().replace('__TITLE__', esc(fig.alt));
      return `<figure class="figure">${drawn}<figcaption>${esc(fig.caption)}</figcaption></figure>`;
    });
    return { id: `s${i + 1}`, label, kicker, name, body };
  });
if (sections.length === 0) throw new Error('no sections found in docs/TECHNICAL.md');
for (const name of Object.keys(FIGURES)) if (!figureNames.includes(name)) console.log(`note: figure "${name}" is not used in the document`);

/* ---------- pages ---------- */
const cover = `<section class="cover" data-block="cover">
  <div class="sky">${cloud('c1')}${cloud('c2')}
    <div class="title-box">
      <p class="wordmark">ARAW</p>
      <p class="cover-name">Technical Documentation</p>
      <p class="cover-sub">V1.0</p>
      <p class="cover-tag">Architecture, content, games, languages, offline use, the Chatbot Sandbox, pipelines, security, testing and maintenance</p>
      <div class="cover-partners">
        <p class="cover-partners-label">Project partners</p>
        <div class="cover-logos">${logosHtml}</div>
      </div>
    </div>
    <div class="bands"><i></i><i></i><i></i><i></i></div>
    ${sunSvg('cover-sun')}
  </div>
  <div class="ground">
    <p class="cover-project">An AIKasalig project · DOST-PCHRD · National University</p>
    <p class="cover-credit">AI Relevance Activities and Workshops · 3 November 2026</p>
  </div>
</section>`;

const frontBlock = (pageOf) => `<section class="front" data-block="front">
  <h1 class="page-title">Contents</h1>
  <ol class="toc">
    ${sections.map((s) => `<li><span class="toc-n">${esc(s.label)}</span><span class="toc-t">${esc(s.name)}</span><span class="toc-dots"></span><span class="toc-p">${pageOf ? pageOf[s.id] : '?'}</span></li>`).join('')}
  </ol>
  <div class="docinfo">${front}</div>
</section>`;

const sectionBlock = (s) => `<section class="sec" id="${s.id}" data-block="${s.id}"><header class="sec-head"><span class="kicker">${esc(s.kicker)}</span><h2>${s.name}</h2></header>${s.body}</section>`;

const css = `
@font-face { font-family: 'Press Start 2P'; src: url(${font('press-start-2p', 'press-start-2p-latin-400-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Baloo 2'; font-weight: 700; src: url(${font('baloo-2', 'baloo-2-latin-700-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Baloo 2'; font-weight: 800; src: url(${font('baloo-2', 'baloo-2-latin-800-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 400; src: url(${font('nunito', 'nunito-latin-400-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 600; src: url(${font('nunito', 'nunito-latin-600-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 700; src: url(${font('nunito', 'nunito-latin-700-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 800; src: url(${font('nunito', 'nunito-latin-800-normal.woff2')}) format('woff2'); }
:root { --cream:#FFF8EC; --gold:#F5D89E; --gold-deep:#E8B84A; --navy:#35408E; --ink:#1F2550; --muted:#4A4F6A; --coral:#FF7A59; --soft:#F3ECDD; --line:#EADFC8; --peach:#FFC48A; --fact:#E3F4EA; --fake:#FDE7E8; --tint:#E3E6F5;
  --pixel:'Press Start 2P', monospace; --head:'Baloo 2', sans-serif; --body:'Nunito', sans-serif; --mono: ui-monospace, 'Cascadia Mono', Consolas, 'Courier New', monospace; }
@page { size: A4; margin: 17mm 16mm 20mm;
  @bottom-left { content: 'ARAW Technical Documentation'; font: 700 7.5pt var(--body); color: #35408E; vertical-align: top; padding-top: 4mm; }
  @bottom-right { content: 'Page ' counter(page) ' / ' counter(pages); font: 700 7.5pt var(--body); color: #35408E; vertical-align: top; padding-top: 4mm; } }
@page :first { margin: 0; @bottom-left { content: none; } @bottom-right { content: none; } }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font: 400 10pt/1.5 var(--body); color: var(--ink); background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
p { margin: 0 0 2.6mm; orphans: 3; widows: 3; }
a { color: var(--navy); text-decoration: underline; overflow-wrap: anywhere; }
strong { font-weight: 800; }
code { font: 0.88em var(--mono); background: var(--soft); border: 0.2mm solid var(--line); padding: 0 0.9mm; color: var(--ink); overflow-wrap: break-word; }
pre { margin: 0 0 3.5mm; padding: 2.6mm 3.2mm; background: var(--soft); border: 0.5mm solid var(--ink); box-shadow: 0.9mm 0.9mm 0 var(--ink); font: 7.4pt/1.38 var(--mono); white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
pre code { background: none; border: 0; padding: 0; font: inherit; }
hr { display: none; }

/* cover */
.cover { position: relative; width: 210mm; height: 296.4mm; overflow: hidden; display: flex; flex-direction: column; break-after: page; }
.cover .sky { position: relative; flex: 1; background: var(--cream); }
.cover .bands { position: absolute; left: 0; right: 0; bottom: 0; height: 44%; display: grid; grid-template-rows: repeat(4, 1fr); }
.cover .bands i:nth-child(1) { background: #FFF1D6; } .cover .bands i:nth-child(2) { background: var(--gold); }
.cover .bands i:nth-child(3) { background: var(--peach); } .cover .bands i:nth-child(4) { background: #FFB08F; }
.cover-sun { position: absolute; left: 50%; bottom: 0; width: 148mm; transform: translateX(-50%); z-index: 1; image-rendering: pixelated; }
.cloud { position: absolute; width: 42mm; z-index: 1; } .cloud.c1 { left: 12mm; top: 20mm; } .cloud.c2 { right: 14mm; top: 150mm; width: 30mm; }
.title-box { position: relative; z-index: 2; margin: 34mm 18mm 0; background: #fff; border: 1.6mm solid var(--ink); box-shadow: 2.4mm 2.4mm 0 var(--ink); padding: 11mm 10mm 10mm; text-align: center; display: grid; gap: 4mm; }
.wordmark { margin: 0; font: 46pt/1.1 var(--pixel); color: var(--navy); letter-spacing: 1mm; }
.cover-name { margin: 0; font: 800 24pt/1.2 var(--head); color: var(--navy); }
.cover-sub { margin: 2mm 0 0; justify-self: center; font: 15pt/1.4 var(--body); font-weight: 800; color: var(--ink); background: var(--gold-deep); padding: 2mm 8mm; box-shadow: 1.2mm 1.2mm 0 var(--ink); letter-spacing: 0.5mm; }
.cover-tag { margin: 0; font-size: 12pt; color: var(--muted); }
.cover-partners { display: grid; gap: 3mm; margin-top: 3mm; padding-top: 4mm; border-top: 1mm dashed var(--line); }
.cover-partners-label { margin: 0; font: 800 9pt/1.5 var(--head); text-transform: uppercase; letter-spacing: 0.4mm; color: var(--muted); }
.cover-logos { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 3mm 6mm; }
.cover-logos img { display: block; width: auto; }
.ground { background: var(--navy); color: #fff; padding: 11mm 16mm 14mm; text-align: center; display: grid; gap: 3mm; border-top: 1.6mm solid var(--ink); box-shadow: inset 0 3mm 0 #5560A8; }
.cover-project { margin: 0; padding-top: 2mm; font: 800 11pt/1.5 var(--head); text-transform: uppercase; letter-spacing: 0.3mm; color: var(--gold); }
.cover-credit { margin: 0; font: 700 11pt/1.5 var(--body); }

/* contents */
.front { break-after: page; }
.page-title { margin: 0 0 3mm; font: 800 24pt/1.2 var(--head); color: var(--navy); }
.toc { list-style: none; margin: 0 0 4mm; padding: 0; display: grid; gap: 0.7mm; }
.toc li { display: flex; align-items: baseline; gap: 3mm; font: 700 10.5pt/1.3 var(--body); }
.toc-n { flex: none; min-width: 7mm; height: 6.4mm; padding: 0 1.2mm; display: inline-grid; place-items: center; background: var(--gold); border: 0.4mm solid var(--ink); font: 800 8.5pt/1 var(--head); align-self: center; }
.toc-dots { flex: 1; border-bottom: 0.5mm dotted var(--muted); transform: translateY(-1mm); }
.toc-p { font: 800 10pt/1 var(--head); color: var(--navy); min-width: 6mm; text-align: right; }
.docinfo { font-size: 8.4pt; line-height: 1.4; }
.docinfo table { font-size: 7.8pt; margin-bottom: 3mm; }
.docinfo td { padding: 0.8mm 2mm; }
.docinfo p { margin-bottom: 2mm; }

/* sections */
.sec { break-before: page; }
.sec-head { display: grid; gap: 1.6mm; margin: 0 0 4mm; padding-bottom: 3mm; border-bottom: 0.9mm solid var(--line); break-after: avoid; }
.kicker { justify-self: start; font: 800 8pt/1.4 var(--head); text-transform: uppercase; letter-spacing: 0.4mm; background: var(--gold); color: var(--ink); padding: 0.8mm 2.6mm; border: 0.4mm solid var(--ink); box-shadow: 0.6mm 0.6mm 0 var(--ink); }
.sec-head h2 { margin: 0; font: 800 22pt/1.15 var(--head); color: var(--ink); }
h3 { margin: 6mm 0 2.4mm; font: 800 13pt/1.25 var(--head); color: var(--navy); break-after: avoid; }
h4 { margin: 4mm 0 2mm; font: 800 11pt/1.25 var(--head); color: var(--ink); break-after: avoid; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin-bottom: 1.2mm; }
li p { margin: 0 0 1mm; }

/* tables */
.tw { margin: 1mm 0 4mm; }
table { width: 100%; border-collapse: collapse; font-size: 8.3pt; line-height: 1.32; border: 0.5mm solid var(--ink); }
thead { display: table-header-group; }
th { background: var(--navy); color: #fff; text-align: left; font: 800 8.3pt/1.25 var(--head); padding: 1.5mm 2mm; border: 0.3mm solid var(--ink); vertical-align: bottom; }
td { padding: 1.3mm 2mm; border: 0.25mm solid var(--line); vertical-align: top; overflow-wrap: break-word; }
tr { break-inside: avoid; }
tbody tr:nth-child(even) td { background: #FBF6EA; }
td code, th code { font-size: 0.9em; }
td:first-child > code { white-space: nowrap; }
/* a table whose header row is empty (the document-information table) */
th:empty { display: none; }
thead:has(th:empty) { display: none; }

/* figures */
.figure { margin: 2mm 0 5mm; break-inside: avoid; border: 0.6mm solid var(--ink); background: var(--cream); padding: 3mm; }
.fig-svg { display: block; width: 100%; height: auto; }
figcaption { margin-top: 2mm; font: 700 8.6pt/1.4 var(--body); color: var(--muted); }
`;

const doc = (body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ARAW Technical Documentation</title><style>${css}</style></head><body>${body}</body></html>`;
const htmlPath = join(OUT, 'technical.html');
const countPages = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  const load = async (body) => {
    writeFileSync(htmlPath, doc(body));
    await page.goto(fileUrl(htmlPath), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
  };
  const print = (opts = {}) => page.pdf({ printBackground: true, preferCSSPageSize: true, ...opts });
  const all = (pageOf) => `${cover}${frontBlock(pageOf)}${sections.map(sectionBlock).join('\n')}`;

  // pass 1: find where each section starts by printing the pieces on their own (the cover keeps the first-page rule in place)
  await load(all(null));
  const measure = async (keep) => {
    await page.evaluate((ids) => document.querySelectorAll('[data-block]').forEach((el) => (el.style.display = ids.includes(el.dataset.block) ? '' : 'none')), keep);
    return countPages(await print());
  };
  const frontPages = (await measure(['cover', 'front'])) - 1;
  const pageOf = {};
  let next = 1 + frontPages + 1;
  const spans = {};
  for (const s of sections) {
    const n = (await measure(['cover', s.id])) - 1;
    pageOf[s.id] = next;
    spans[s.id] = n;
    next += n;
  }
  const expected = next - 1;

  // pass 2: the real document, now with page numbers in the contents
  await load(all(pageOf));
  // a table wider than the text column would be cut off in the PDF: check at the printed column width (210 mm less margins)
  await page.setViewportSize({ width: 673, height: 1200 });
  const wide = await page.evaluate(() => [...document.querySelectorAll('.tw')].filter((w) => w.scrollWidth > w.clientWidth + 1).map((w) => (w.previousElementSibling?.textContent ?? w.querySelector('th')?.textContent ?? 'table').slice(0, 40)));
  for (const w of wide) console.log(`WARNING: table wider than the page near: ${w}`);
  const pdf = await print({ path: PDF });
  const total = countPages(pdf);
  if (total !== expected) console.log(`WARNING: the PDF has ${total} pages but the contents expect ${expected}`);
  for (const w of [...new Set(warnings)]) console.log(`WARNING: ${w}`);
  console.log(`technical PDF: ${total} pages, ${(statSync(PDF).size / 1024 / 1024).toFixed(2)} MB -> ARAW V1.0-Technical-Documentation.pdf`);
  console.log(`sections start at: ${sections.map((s) => `${s.label || '-'}:${pageOf[s.id]}(${spans[s.id]}p)`).join(' ')}`);

  if (process.argv.includes('--pages')) await previews(browser, total);
} finally {
  await browser.close();
}

/** One PNG per page, taken from Chromium's own PDF viewer (the only renderer this project already has). */
async function previews(_unused, total) {
  const viewer = await chromium.launch({ channel: 'chromium', headless: true }).catch(() => null);
  if (!viewer) {
    console.log('previews skipped: no full Chromium available for the PDF viewer');
    return;
  }
  try {
    const p = await viewer.newPage({ viewport: { width: 900, height: 1150 } });
    let saved = 0;
    for (let n = 1; n <= total; n++) {
      await p.goto(`${fileUrl(PDF)}?p=${n}#page=${n}&zoom=page-fit&toolbar=0&navpanes=0&scrollbar=0`);
      await p.waitForTimeout(700);
      await p.screenshot({ path: join(OUT, `page-${String(n).padStart(2, '0')}.png`) });
      saved++;
    }
    console.log(`previews: ${saved} PNG files in scripts/techdoc/out/`);
  } finally {
    await viewer.close();
  }
}
