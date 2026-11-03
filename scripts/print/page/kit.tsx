// Shared pieces of every print sheet: the page frame with its footer, panels, QR codes, the FAKE stamp, the sunrise
// motif and the auto-fit helper (regional languages run longer: text shrinks to its box, it never spills out).
import type { ComponentChildren, VNode } from 'preact';
import QRCode from 'qrcode';
import { tx } from '../../../src/i18n/runtime';

/** What every sheet builder receives. */
export interface SheetContext {
  lang: string;
  /** Public app URL (PRINT_APP_URL), empty when not set. */
  appUrl: string;
}

/** Each sheet module exports `meta` and a default builder that returns one VNode per printed page. */
export interface SheetMeta {
  id: string;
  /** English sheet name: footer text, translated at print time. */
  title: string;
  /** Test sheets (Forms A and B, answer key): written to print-out/facilitator/, never to public/. */
  facilitatorOnly?: boolean;
  landscape?: boolean;
}
export type SheetBuilder = (ctx: SheetContext) => VNode[] | Promise<VNode[]>;

export const KIT_VERSION = '1.0 (2026-11)';
/** Language names are proper names: shown in their own language in every pack. */
export const LANG_NAMES: Readonly<Record<string, string>> = { en: 'English', fil: 'Filipino', ceb: 'Cebuano', ilo: 'Ilokano', hil: 'Hiligaynon' };

/** A link into the app, e.g. appLink(ctx, '/learn/m01'). Empty when no app URL is set. */
export function appLink(ctx: SheetContext, route: string): string {
  if (!ctx.appUrl) return '';
  return `${ctx.appUrl.replace(/#.*$/, '')}#${route}`;
}

interface PageProps {
  n: number;
  total: number;
  title: string;
  lang: string;
  landscape?: boolean;
  class?: string;
  children: ComponentChildren;
}

/** One printed sheet page: A4 box, 12 mm margins, footer with the sheet name, language, version and page n / N. */
export function Page({ n, total, title, lang, landscape, class: className, children }: PageProps) {
  return (
    <section class={`pp${landscape ? ' pp--landscape' : ''}${className ? ` ${className}` : ''}`}>
      {children}
      <footer class="pp__foot">
        <span>
          <b>ARAW</b> · AI Relevance Activities and Workshops · {tx(title)} · {LANG_NAMES[lang] ?? lang} · {KIT_VERSION}
        </span>
        <span class="pp__foot-pg">
          {n} / {total}
        </span>
      </footer>
    </section>
  );
}

export function Panel({ class: className, children }: { class?: string; children: ComponentChildren }) {
  return <div class={`k-panel${className ? ` ${className}` : ''}`}>{children}</div>;
}

/** Gold-tint banner: pixel title and an optional line, with art on the left and right. */
export function Banner({ title, sub, left, right }: { title: string; sub?: string; left?: ComponentChildren; right?: ComponentChildren }) {
  return (
    <header class="k-banner">
      {left}
      <div class="k-banner__text">
        <h1 class="k-title">{title}</h1>
        {sub ? <p class="k-banner__sub">{sub}</p> : null}
      </div>
      {right}
    </header>
  );
}

/** Text that must fit its box: wrap it in <Fit>; fitAll() shrinks it (never below `min`) until nothing overflows. */
export function Fit({ min = 0.72, group, class: className, children }: { min?: number; group?: string; class?: string; children: ComponentChildren }) {
  return (
    <div class={`k-fit${className ? ` ${className}` : ''}`} data-fit-min={min} data-fit-group={group}>
      <div class="k-fit__in">{children}</div>
    </div>
  );
}

/**
 * Shrink every <Fit> box until its content fits. Boxes that share a `group` get the smallest scale of the group, so
 * sibling panels keep one type size. Boxes still overflowing at their minimum are marked data-fit-over (the build warns).
 */
export function fitAll(root: ParentNode = document): void {
  const boxes = [...root.querySelectorAll<HTMLElement>('.k-fit')];
  // measured in visual px (getBoundingClientRect), because scrollHeight is in zoomed units inside a zoomed box
  const overflows = (el: HTMLElement) => {
    const inner = (el.firstElementChild as HTMLElement).getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return inner.height > box.height + 1 || el.scrollWidth > el.clientWidth + 1;
  };
  const scales = new Map<HTMLElement, number>();
  for (const box of boxes) {
    const inner = box.firstElementChild as HTMLElement;
    const min = Number(box.dataset.fitMin ?? 0.72);
    let s = 1;
    inner.style.zoom = '1';
    while (overflows(box) && s > min) {
      s = Math.max(min, Math.round((s - 0.02) * 100) / 100);
      inner.style.zoom = String(s);
    }
    scales.set(box, s);
  }
  const groupMin = new Map<string, number>();
  for (const box of boxes) {
    const g = box.dataset.fitGroup;
    if (g) groupMin.set(g, Math.min(groupMin.get(g) ?? 1, scales.get(box) ?? 1));
  }
  for (const box of boxes) {
    const inner = box.firstElementChild as HTMLElement;
    const g = box.dataset.fitGroup;
    const s = g ? (groupMin.get(g) ?? 1) : (scales.get(box) ?? 1);
    inner.style.zoom = String(s);
    box.dataset.fitScale = String(s);
    if (overflows(box)) box.dataset.fitOver = '1';
  }
}

/** QR code as inline SVG (qrcode package, error correction M). Empty url: a labelled placeholder box. */
export function Qr({ url, caption, size = 24 }: { url: string; caption?: string; size?: number }) {
  const style = { '--qr': `${Math.max(22, size)}mm` };
  if (!url) {
    return (
      <div class="k-qr" style={style}>
        <div class="k-qr__box k-qr__box--empty">QR: set PRINT_APP_URL</div>
        {caption ? <p class="k-qr__cap">{caption}</p> : null}
      </div>
    );
  }
  const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const n = modules.size;
  const quiet = 3;
  let d = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  const side = n + quiet * 2;
  return (
    <div class="k-qr" style={style}>
      <div class="k-qr__box" role="img" aria-label={url}>
        <svg viewBox={`0 0 ${side} ${side}`} shape-rendering="crispEdges" aria-hidden="true">
          <path d={d} fill="currentColor" />
        </svg>
      </div>
      {caption ? <p class="k-qr__cap">{caption}</p> : null}
    </div>
  );
}

/** The "ARAW GAME · FAKE" stamp that marks a generated fake post once revealed (CLAUDE.md). Proper name, never translated. */
export function FakeStamp() {
  return <span class="k-stamp">ARAW GAME · FAKE</span>;
}

/* ---------- sunrise motif (same pixel geometry as the guide cover) ---------- */
type Row = [number, number, number];
function halfDisc(radius: number, cx: number, baseY: number): Row[] {
  const rows: Row[] = [];
  for (let k = 0; k < Math.ceil(radius); k++) {
    const half = Math.floor(Math.sqrt(radius * radius - (k + 0.5) ** 2));
    rows.push([cx - half, baseY - 1 - k, 2 * half + 1]);
  }
  return rows;
}
const rectPath = (rows: Row[]) => rows.map(([x, y, w]) => `M${x} ${y}h${w}v1h-${w}z`).join('');

const BODY = halfDisc(12.5, 18, 18);
const OUTLINE = rectPath(BODY.flatMap(([x, y, w]): Row[] => [[x - 1, y, w + 2], [x, y - 1, w]]));
const BODY_PATH = rectPath(BODY);
const CORE_PATH = rectPath(halfDisc(8.5, 18, 18));

/** A pixel sunrise: half sun with rays. `width` in mm. */
export function Sunrise({ width = 26 }: { width?: number }) {
  return (
    <svg class="k-sun" style={{ '--sun': `${width}mm` }} viewBox="0 0 37 18" shape-rendering="crispEdges" aria-hidden="true">
      <path class="k-sun__ray" d="M18 0h1v3h-1zM6 5h2v2H6zM29 5h2v2h-2zM2 11h3v1H2zM32 11h3v1h-3zM1 17h4v1H1zM32 17h4v1h-4z" />
      <path class="k-sun__line" d={OUTLINE} />
      <path class="k-sun__body" d={BODY_PATH} />
      <path class="k-sun__core" d={CORE_PATH} />
    </svg>
  );
}
