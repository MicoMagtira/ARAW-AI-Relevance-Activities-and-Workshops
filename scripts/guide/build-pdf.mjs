// Builds the printable user guide: public/guide/ARAW-User-Guide.pdf (A4).
//
//   node scripts/guide/build-pdf.mjs            (after the capture run: see capture.config.ts)
//   node scripts/guide/build-pdf.mjs --pages    (also saves a PNG of every page to scripts/guide/out/pdf/ for a quick look)
//
// Same words as the in-app Guide (src/content/guide.ts) and the same callout maths (src/screens/guide/callouts.ts),
// loaded straight from TypeScript by Node's type stripping (Node 22.18+ / 23.6+). The print HTML is written to
// scripts/guide/out/pdf/guide.html and printed with Playwright's Chromium. No server and no port are needed.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'out', 'pdf');
const PDF = join(ROOT, 'public', 'guide', 'ARAW-User-Guide.pdf');
mkdirSync(OUT, { recursive: true });

const { GUIDE_COVER, GUIDE_QUICKSTART, GUIDE_SECTIONS } = await import(pathToFileURL(join(ROOT, 'src', 'content', 'guide.ts')).href);
const { placeCallouts } = await import(pathToFileURL(join(ROOT, 'src', 'screens', 'guide', 'callouts.ts')).href);
const manifest = JSON.parse(readFileSync(join(HERE, 'out', 'manifest.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fileUrl = (p) => pathToFileURL(p).href;
const font = (pkg, file) => fileUrl(join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file));

/* ---------- pictures ---------- */
/** Phone pictures are the default; a very tall phone picture gives way to the desktop one (legend below it). */
function pictureFor(step) {
  const entry = step.shot ? manifest.shots[step.shot] : undefined;
  if (!entry) return null;
  const phone = entry.phone;
  const desktop = entry.desktop;
  if (phone && (phone.h / phone.w <= 2.7 || !desktop)) return { ...phone, variant: 'phone' };
  if (desktop) return { ...desktop, variant: 'desktop' };
  return null;
}

function figure(step, pic) {
  const targets = (step.callouts ?? []).map((c) => c.target);
  const markers = placeCallouts(targets, pic.boxes, pic.w, pic.h, { marker: pic.variant === 'phone' ? 40 : 64 });
  const original = join(HERE, 'out', 'png', pic.file.replace(/^guide\//, '').replace(/\.webp$/, '.png'));
  const src = existsSync(original) ? original : join(ROOT, 'public', pic.file); // crisp PNG originals (see compress.mjs)
  if (!existsSync(src)) return '';
  return `<div class="shot shot--${pic.variant}" style="aspect-ratio:${pic.w}/${pic.h}">
    <img src="${fileUrl(src)}" alt="${esc(step.alt ?? '')}">
    ${markers.map((m) => `<span class="marker" style="left:${m.left}%;top:${m.top}%">${m.n}</span>`).join('')}
  </div>`;
}

function legend(step) {
  if (!step.callouts?.length) return '';
  return `<ol class="legend">${step.callouts.map((c, i) => `<li><span class="n">${i + 1}</span><span>${esc(c.text)}</span></li>`).join('')}</ol>`;
}

function stepText(step, n) {
  return `<h3 class="step-title"><span class="step-n">${n}</span><span>${esc(step.title)}</span></h3>
    <p class="lead">${esc(step.text)}</p>
    ${step.list ? `<ol class="list">${step.list.map((li) => `<li>${esc(li)}</li>`).join('')}</ol>` : ''}
    ${step.tip ? `<p class="tip"><b>Tip:</b> ${esc(step.tip)}</p>` : ''}`;
}

/* ---------- page plan ---------- */
// Every step with a picture gets its own page. Steps without one are packed two to a page.
const pages = []; // { kind, html(pageNo) , section? }
const tocEntries = [];

function sectionHead(section, index, first) {
  return first
    ? `<header class="sec-head"><span class="kicker">${index + 1} · ${esc(section.label)}</span><h2>${esc(section.title)}</h2><p>${esc(section.intro)}</p></header>`
    : `<header class="sec-head sec-head--small"><span class="kicker">${index + 1} · ${esc(section.label)}</span><span class="sec-name">${esc(section.title)}</span></header>`;
}

GUIDE_SECTIONS.forEach((section, si) => {
  let first = true;
  let pending = [];
  const flushText = () => {
    if (!pending.length) return;
    const group = pending;
    const isFirst = first;
    pending = [];
    first = false;
    pages.push({ section: section.id, first: isFirst, html: () => `${sectionHead(section, si, isFirst)}<div class="text-steps">${group.map(([s, n]) => `<article class="text-step">${stepText(s, n)}</article>`).join('')}</div>` });
  };
  section.steps.forEach((step, i) => {
    const pic = pictureFor(step);
    if (!pic) {
      pending.push([step, i + 1]);
      if (pending.length === 2) flushText();
      return;
    }
    flushText();
    const isFirst = first;
    first = false;
    pages.push({
      section: section.id,
      first: isFirst,
      html: () => `${sectionHead(section, si, isFirst)}
        <article class="step step--${pic.variant}">
          <div class="step-text">${stepText(step, i + 1)}</div>
          <div class="step-body">${figure(step, pic)}${legend(step)}</div>
        </article>`,
    });
  });
  flushText();
});

// numbering: 1 cover, 2 contents, then the topic pages, then the quick-start sheet
const FIRST_TOPIC_PAGE = 3;
GUIDE_SECTIONS.forEach((section, si) => {
  const at = pages.findIndex((p) => p.section === section.id);
  tocEntries.push({ n: si + 1, title: section.title, page: FIRST_TOPIC_PAGE + at });
});
const quickPage = FIRST_TOPIC_PAGE + pages.length;
const totalPages = quickPage;

/* ---------- pixel art ---------- */
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
const cloud = (cls) =>
  `<svg class="cloud ${cls}" viewBox="0 0 14 4" shape-rendering="crispEdges" aria-hidden="true"><path fill="#FFFFFF" d="M4 0h4v1H4zM2 1h8v1H2zM0 2h14v1H0zM0 3h14v1H0z"/></svg>`;

/* ---------- pages ---------- */
const footer = (n) => `<footer class="foot"><span>ARAW User Guide</span><span class="pg">${n} / ${totalPages}</span></footer>`;

const cover = `<section class="page cover">
  <div class="sky">${cloud('c1')}${cloud('c2')}
    <div class="title-box">
      <p class="wordmark">${esc(GUIDE_COVER.wordmark)}</p>
      <p class="cover-name">${esc(GUIDE_COVER.name)}</p>
      <p class="cover-sub">${esc(GUIDE_COVER.subtitle)}</p>
      <p class="cover-tag">${esc(GUIDE_COVER.tagline)}</p>
    </div>
    <div class="bands"><i></i><i></i><i></i><i></i></div>
    ${sunSvg('cover-sun')}
  </div>
  <div class="ground">
    <p class="cover-project">${esc(GUIDE_COVER.project)}</p>
    <p class="cover-credit">${esc(GUIDE_COVER.credit)}</p>
  </div>
</section>`;

const contents = `<section class="page contents">
  <h1 class="page-title">Contents</h1>
  <p class="lead">Each topic starts on a new page. Numbers on the pictures match the numbered notes beside them.</p>
  <ol class="toc">
    ${tocEntries.map((e) => `<li><span class="toc-n">${e.n}</span><span class="toc-t">${esc(e.title)}</span><span class="toc-dots"></span><span class="toc-p">${e.page}</span></li>`).join('')}
    <li><span class="toc-n">★</span><span class="toc-t">Quick-start sheet (to photocopy)</span><span class="toc-dots"></span><span class="toc-p">${quickPage}</span></li>
  </ol>
  <div class="how">
    <p class="how-title">How to read the pictures</p>
    <div class="how-row"><span class="marker marker--static">1</span><p>A number on a picture points at a button or a part of the screen. The note with the same number tells you what it does.</p></div>
  </div>
  ${footer(2)}
</section>`;

const topicPages = pages.map((p, i) => `<section class="page topic">${p.html()}${footer(FIRST_TOPIC_PAGE + i)}</section>`).join('\n');

const quick = `<section class="page quick">
  <header class="quick-head">${sunSvg('quick-sun')}<div><h1>${esc(GUIDE_QUICKSTART.title)}</h1><p>${esc(GUIDE_QUICKSTART.subtitle)}</p></div></header>
  <ol class="quick-steps">
    ${GUIDE_QUICKSTART.steps.map((s, i) => `<li><span class="qn">${i + 1}</span><div><p class="qt">${esc(s.title)}</p><p>${esc(s.text)}</p></div></li>`).join('')}
  </ol>
  <p class="quick-foot">${esc(GUIDE_QUICKSTART.footer)}</p>
  <p class="quick-credit">${esc(GUIDE_COVER.project)}</p>
  ${footer(quickPage)}
</section>`;

const css = `
@font-face { font-family: 'Press Start 2P'; src: url(${font('press-start-2p', 'press-start-2p-latin-400-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Baloo 2'; font-weight: 700; src: url(${font('baloo-2', 'baloo-2-latin-700-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Baloo 2'; font-weight: 800; src: url(${font('baloo-2', 'baloo-2-latin-800-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 400; src: url(${font('nunito', 'nunito-latin-400-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 700; src: url(${font('nunito', 'nunito-latin-700-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 800; src: url(${font('nunito', 'nunito-latin-800-normal.woff2')}) format('woff2'); }
:root { --cream:#FFF8EC; --gold:#F5D89E; --gold-deep:#E8B84A; --navy:#35408E; --ink:#1F2550; --muted:#4A4F6A; --coral:#FF7A59; --soft:#F3ECDD; --line:#EADFC8; --peach:#FFC48A; --pixel:'Press Start 2P', monospace; --head:'Baloo 2', sans-serif; --body:'Nunito', sans-serif; }
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #ccc; }
body { font: 400 13.5pt/1.5 var(--body); color: var(--ink); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; width: 210mm; height: 297mm; overflow: hidden; background: var(--cream); padding: 16mm 16mm 20mm; break-after: page; margin: 0 auto 6mm; display: flex; flex-direction: column; gap: 5mm; }
@media print { html, body { background: none; } .page { margin: 0; } }
p { margin: 0; }
.lead { font-size: 14pt; line-height: 1.5; }
.foot { position: absolute; left: 16mm; right: 16mm; bottom: 8mm; display: flex; justify-content: space-between; align-items: center; border-top: 1mm solid var(--ink); padding-top: 2.5mm; font: 7.5pt/1 var(--pixel); color: var(--navy); text-transform: uppercase; }
.page-title { margin: 0; font: 20pt/1.3 var(--pixel); color: var(--navy); text-transform: uppercase; }

/* cover */
.cover { padding: 0; gap: 0; }
.cover .sky { position: relative; flex: 1; background: var(--cream); }
.cover .bands { position: absolute; left: 0; right: 0; bottom: 0; height: 44%; display: grid; grid-template-rows: repeat(4, 1fr); }
.cover .bands i:nth-child(1) { background: #FFF1D6; } .cover .bands i:nth-child(2) { background: var(--gold); }
.cover .bands i:nth-child(3) { background: var(--peach); } .cover .bands i:nth-child(4) { background: #FFB08F; }
.cover-sun { position: absolute; left: 50%; bottom: 0; width: 148mm; transform: translateX(-50%); z-index: 1; image-rendering: pixelated; }
.cloud { position: absolute; width: 42mm; z-index: 1; } .cloud.c1 { left: 12mm; top: 20mm; } .cloud.c2 { right: 14mm; top: 104mm; width: 30mm; }
.title-box { position: relative; z-index: 2; margin: 34mm 18mm 0; background: #fff; border: 1.6mm solid var(--ink); box-shadow: 2.4mm 2.4mm 0 var(--ink); padding: 11mm 10mm 10mm; text-align: center; display: grid; gap: 4mm; }
.wordmark { font: 46pt/1.1 var(--pixel); color: var(--navy); letter-spacing: 1mm; }
.cover-name { font: 800 19pt/1.2 var(--head); color: var(--navy); }
.cover-sub { justify-self: center; font: 15pt/1.4 var(--pixel); color: var(--ink); background: var(--gold-deep); padding: 3mm 6mm; box-shadow: 1.2mm 1.2mm 0 var(--ink); text-transform: uppercase; margin-top: 2mm; }
.cover-tag { font-size: 13pt; color: var(--muted); }
.ground { background: var(--navy); color: #fff; padding: 12mm 16mm 16mm; text-align: center; display: grid; gap: 4mm; border-top: 1.6mm solid var(--ink); box-shadow: inset 0 3mm 0 #5560A8; }
.cover-project { font: 9pt/1.6 var(--pixel); text-transform: uppercase; color: var(--gold); padding-top: 3mm; }
.cover-credit { font: 700 12pt/1.5 var(--body); }

/* contents */
.toc { list-style: none; margin: 2mm 0 0; padding: 0; display: grid; gap: 3.2mm; }
.toc li { display: flex; align-items: baseline; gap: 4mm; font: 800 15pt/1.3 var(--head); }
.toc-n { flex: none; width: 11mm; height: 11mm; display: inline-grid; place-items: center; background: var(--gold); border: 0.8mm solid var(--ink); font: 10pt/1 var(--pixel); align-self: center; }
.toc-dots { flex: 1; border-bottom: 0.7mm dotted var(--muted); transform: translateY(-1.2mm); }
.toc-p { font: 11pt/1 var(--pixel); color: var(--navy); }
.how { margin-top: auto; margin-bottom: 8mm; background: #fff; border: 1mm solid var(--ink); box-shadow: 1.6mm 1.6mm 0 var(--ink); padding: 6mm; display: grid; gap: 3mm; }
.how-title { font: 9pt/1.4 var(--pixel); text-transform: uppercase; color: var(--muted); }
.how-row { display: flex; gap: 5mm; align-items: center; font-size: 13.5pt; }

/* topic pages */
.sec-head { display: grid; gap: 2mm; border-bottom: 1mm solid var(--line); padding-bottom: 4mm; }
.sec-head h2 { margin: 0; font: 800 24pt/1.15 var(--head); color: var(--ink); }
.sec-head p { font-size: 13.5pt; color: var(--muted); }
.sec-head--small { display: flex; align-items: center; gap: 4mm; padding-bottom: 3mm; }
.kicker { justify-self: start; font: 8.5pt/1.4 var(--pixel); text-transform: uppercase; background: var(--gold); color: var(--ink); padding: 1.6mm 3mm; box-shadow: 0.8mm 0.8mm 0 var(--ink); border: 0.6mm solid var(--ink); }
.sec-name { font: 800 13pt/1.2 var(--head); color: var(--muted); }
.step { display: flex; flex-direction: column; gap: 5mm; flex: 1; min-height: 0; }
.step-title { margin: 0; display: flex; gap: 4mm; align-items: center; font: 800 19pt/1.2 var(--head); color: var(--navy); }
.step-n { flex: none; min-width: 11mm; height: 11mm; display: inline-grid; place-items: center; background: var(--navy); color: #fff; font: 11pt/1 var(--pixel); box-shadow: 0.9mm 0.9mm 0 var(--ink); }
.step-text { display: grid; gap: 3mm; }
.list { margin: 0; padding-left: 7mm; display: grid; gap: 2mm; font-size: 13.5pt; }
.tip { background: var(--soft); border-left: 1.6mm solid var(--gold-deep); padding: 3mm 4mm; font-size: 12.5pt; }
.step-body { flex: 1; min-height: 0; display: flex; gap: 7mm; align-items: flex-start; }
.step--desktop .step-body { flex-direction: column; align-items: stretch; }
.shot { position: relative; flex: none; border: 1mm solid var(--ink); box-shadow: 1.6mm 1.6mm 0 var(--ink); background: #fff; }
.shot img { display: block; width: 100%; height: 100%; }
.step--phone .shot { height: min(100%, 175mm); max-width: 88mm; }
.step--desktop .shot { width: 100%; max-height: 130mm; align-self: center; }
.marker { position: absolute; transform: translate(-50%, -50%); width: 9mm; height: 9mm; display: grid; place-items: center; background: var(--coral); color: var(--ink); border: 0.8mm solid var(--ink); box-shadow: 0.6mm 0.6mm 0 var(--ink); font: 10pt/1 var(--pixel); }
.marker--static { position: static; transform: none; flex: none; }
.legend { list-style: none; margin: 0; padding: 0; display: grid; gap: 4mm; flex: 1; min-width: 0; }
.step--desktop .legend { flex: none; grid-template-columns: 1fr 1fr; align-content: start; gap: 4mm 7mm; }
.legend li { display: flex; gap: 3.5mm; align-items: flex-start; font-size: 13.5pt; line-height: 1.4; }
.legend .n { flex: none; width: 9mm; height: 9mm; display: inline-grid; place-items: center; background: var(--coral); border: 0.8mm solid var(--ink); font: 10pt/1 var(--pixel); }
.text-steps { display: grid; gap: 6mm; }
.text-step { background: #fff; border: 1mm solid var(--ink); box-shadow: 1.6mm 1.6mm 0 var(--ink); padding: 5mm 7mm; display: grid; gap: 2.6mm; }

/* quick start */
.quick { border: 2.4mm dashed var(--line); gap: 4mm; padding-top: 13mm; }
.quick-head { display: flex; align-items: center; gap: 6mm; background: var(--gold); border: 1.2mm solid var(--ink); box-shadow: 1.8mm 1.8mm 0 var(--ink); padding: 5mm 7mm; }
.quick-head h1 { margin: 0; font: 17pt/1.3 var(--pixel); color: var(--navy); text-transform: uppercase; }
.quick-head p { font: 700 13pt/1.4 var(--body); }
.quick-sun { width: 30mm; flex: none; }
.quick-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 3mm; }
.quick-steps li { display: flex; gap: 5mm; align-items: flex-start; background: #fff; border: 0.9mm solid var(--ink); padding: 2.8mm 5mm; }
.qn { flex: none; width: 13mm; height: 13mm; display: grid; place-items: center; background: var(--navy); color: #fff; font: 13pt/1 var(--pixel); }
.qt { font: 800 16pt/1.2 var(--head); color: var(--navy); }
.quick-steps p { font-size: 14pt; line-height: 1.4; }
.quick-foot { font: 800 14pt/1.4 var(--head); text-align: center; }
.quick-credit { font: 7.5pt/1.5 var(--pixel); text-align: center; color: var(--muted); text-transform: uppercase; }
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ARAW User Guide</title><style>${css}</style></head>
<body>${cover}${contents}${topicPages}${quick}</body></html>`;
const htmlPath = join(OUT, 'guide.html');
writeFileSync(htmlPath, html);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  await page.goto(fileUrl(htmlPath), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // a quick overflow check: content must end above the footer on every page
  const overflowing = await page.evaluate(() =>
    [...document.querySelectorAll('.page')]
      .map((p, i) => {
        const foot = p.querySelector('.foot');
        const limit = foot ? foot.getBoundingClientRect().top : p.getBoundingClientRect().bottom;
        const bottom = Math.max(...[...p.children].filter((c) => c !== foot).map((c) => c.getBoundingClientRect().bottom));
        const inner = [...p.querySelectorAll('.legend, .text-steps, .step-text, .quick-steps, .toc')].map((c) => c.getBoundingClientRect().bottom);
        return { page: i + 1, over: Math.round(Math.max(bottom, ...inner) - limit) };
      })
      .filter((x) => x.over > 0),
  );
  for (const o of overflowing) console.log(`OVERFLOW page ${o.page}: ${o.over}px below the footer line`);
  await page.pdf({ path: PDF, format: 'A4', printBackground: true, preferCSSPageSize: true });
  if (process.argv.includes('--pages')) {
    const els = await page.locator('.page').all();
    for (const [i, el] of els.entries()) await el.screenshot({ path: join(OUT, `page-${String(i + 1).padStart(2, '0')}.png`) });
  }
} finally {
  await browser.close();
}
const count = (readFileSync(PDF, 'latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
console.log(`guide PDF: ${count} pages, ${(statSync(PDF).size / 1024 / 1024).toFixed(1)} MB -> public/guide/ARAW-User-Guide.pdf (expected ${totalPages})`);
