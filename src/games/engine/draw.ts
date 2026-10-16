// Pixel drawing helpers in the ARAW palette. Canvas cannot read CSS variables cheaply every frame, so the palette is
// mirrored here from src/styles/tokens.css (a unit test keeps the two in step). Games draw in logical units.
//
// Text fits itself (translations run 20-60% longer than English): every box()/frame() drawn in the current frame is
// remembered, and text() fits into the innermost box under its anchor (or the canvas): it steps the font size down to
// MIN_TEXT_SIZE, then lets the canvas squeeze it as a last resort. Containers drawn before their text (bubbles, signs,
// tiles, banners) size themselves with measureBlock()/measureLine() first. All text is translated (tx) BEFORE it is
// measured or wrapped, so wrapped lines are pieces of the translation, never of the English.
import { tx } from '../../i18n/runtime';

export const PALETTE = {
  cream: '#fff8ec',
  surface: '#ffffff',
  gold: '#f5d89e',
  goldDeep: '#e8b84a',
  navy: '#35408e',
  navyDark: '#283276',
  navyTint: '#e3e6f5',
  ink: '#1f2550',
  muted: '#4a4f6a',
  coral: '#ff7a59',
  fact: '#1e7d50',
  factTint: '#e3f4ea',
  fake: '#c4323a',
  fakeTint: '#fde7e8',
  line: '#eadfc8',
  soft: '#f3ecdd',
} as const;

export type PaletteName = keyof typeof PALETTE;

// ---- boxes of the current frame (the containers text fits into) ---------------------------------------------------
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Smaller boxes are sprite pixels or rules, not text containers (and are not worth remembering). */
const MIN_CONTAINER_W = 12;
const MIN_CONTAINER_H = 6;
let frameCtx: CanvasRenderingContext2D | null = null;
let frameBoxes: Rect[] = [];
let resetQueued = false;

/**
 * Remember a rectangle as a possible text container for the rest of this frame. A frame is drawn in one synchronous
 * task, so the list empties itself on the next microtask. box() and frame() call this; call it yourself for containers
 * drawn some other way (a sprite or a disc).
 */
export function container(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  if (w < MIN_CONTAINER_W || h < MIN_CONTAINER_H) return;
  if (ctx !== frameCtx) {
    frameCtx = ctx;
    frameBoxes = [];
  }
  frameBoxes.push({ x, y, w, h });
  if (!resetQueued) {
    resetQueued = true;
    queueMicrotask(() => {
      resetQueued = false;
      frameBoxes = [];
      frameCtx = null;
    });
  }
}

/** Fill a rectangle on whole logical pixels. */
export function box(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  const r = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  ctx.fillRect(r.x, r.y, r.w, r.h);
  container(ctx, r.x, r.y, r.w, r.h);
}

/** Pixel border (inside the rectangle). */
export function frame(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number, thickness = 1): void {
  container(ctx, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  box(ctx, color, x, y, w, thickness);
  box(ctx, color, x, y + h - thickness, w, thickness);
  box(ctx, color, x, y, thickness, h);
  box(ctx, color, x + w - thickness, y, thickness, h);
}

/** A sprite as rows of characters: '.' is empty, any other character looks up a colour in `colors`. */
export type SpriteRows = readonly string[];

export function sprite(ctx: CanvasRenderingContext2D, rows: SpriteRows, colors: Readonly<Record<string, string>>, x: number, y: number, scale = 1, flip = false): void {
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const key = row[rx] as string;
      const color = key === '.' ? undefined : colors[key];
      if (!color) continue;
      box(ctx, color, x + (flip ? row.length - 1 - rx : rx) * scale, y + ry * scale, scale, scale);
    }
  });
}

/** Filled disc made of whole-pixel scanlines, so the edge stays stepped. */
export function disc(ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, r: number): void {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    box(ctx, color, cx - half, cy + dy, half * 2, 1);
  }
}

const HEART: SpriteRows = ['.aa.aa.', 'aaaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'];

/** A row of hearts: filled ones in coral, lost ones as soft outlines. */
export function hearts(ctx: CanvasRenderingContext2D, n: number, max: number, x: number, y: number, scale = 2): void {
  for (let i = 0; i < max; i++) {
    sprite(ctx, HEART, { a: i < n ? PALETTE.coral : PALETTE.line }, x + i * (8 * scale), y, scale);
  }
}

export const PIXEL_FONT = '"Press Start 2P", ui-monospace, monospace';

/** Smallest font size text may shrink to (logical px). Press Start 2P stays readable down to here on the scaled canvas. */
export const MIN_TEXT_SIZE = 6;

/** Width of already translated text in the pixel font: it is monospaced, every glyph advances exactly `size`. */
export const lineWidth = (value: string, size = 8): number => [...value].length * size;

/** The size (from `size` down to `minSize`) at which already translated text fits `maxWidth`. */
export function fitSize(value: string, maxWidth: number, size = 8, minSize = MIN_TEXT_SIZE): number {
  let px = Math.round(size);
  const floor = Math.min(px, Math.round(minSize));
  while (px > floor && lineWidth(value, px) > maxWidth) px -= 1;
  return px;
}

export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  /**
   * Width the text must stay inside. Without it, the text fits the innermost box drawn under its anchor this frame
   * (or the canvas). It shrinks to `minSize`, then the canvas squeezes it.
   */
  maxWidth?: number;
  minSize?: number;
  /** False for text that may run past boxes on purpose (it still stays inside the canvas). */
  fit?: boolean;
}

/** Room for one line at (x, y): from the anchor to the edges of the innermost fitting container, or of the canvas. */
function roomAt(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, align: CanvasTextAlign, useBoxes: boolean): number {
  const span = (left: number, right: number): number =>
    align === 'center' ? 2 * Math.min(x - left, right - x) : align === 'right' || align === 'end' ? x - left : right - x;
  if (useBoxes && ctx === frameCtx) {
    const ax = align === 'center' ? x : align === 'right' || align === 'end' ? x - 1 : x + 1;
    const ay = y + size / 2;
    for (let i = frameBoxes.length - 1; i >= 0; i--) {
      const b = frameBoxes[i] as Rect;
      if (ax < b.x || ax > b.x + b.w || ay < b.y || ay > b.y + b.h || b.h < size - 1) continue;
      const room = span(b.x, b.x + b.w);
      if (room >= 2 * size) return room;
    }
  }
  const t = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null;
  const width = t && t.a > 0 && ctx.canvas ? ctx.canvas.width / t.a : Infinity;
  return Number.isFinite(width) ? span(0, width) : Infinity;
}

/** Test hook: when the page defines `__arawFit` as an array, every text that had to shrink or squeeze is logged there. */
function logFit(value: string, size: number, px: number, squeezed: boolean): void {
  const log = (globalThis as { __arawFit?: unknown }).__arawFit;
  if (Array.isArray(log) && log.length < 2000) log.push({ text: value, size, px, squeezed });
}

/**
 * Pixel-font text. `size` is in logical pixels (8 is the font's native grid). The text is translated first, then fitted
 * (see TextOptions.maxWidth). Returns the width drawn.
 */
export function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, { size = 8, color = PALETTE.ink, align = 'left', maxWidth, minSize = MIN_TEXT_SIZE, fit = true }: TextOptions = {}): number {
  const s = tx(value);
  const room = maxWidth ?? roomAt(ctx, Math.round(x), Math.round(y), size, align, fit);
  const px = fitSize(s, room, size, minSize);
  const width = lineWidth(s, px);
  const squeeze = room > 0 && width > room + 0.5;
  if (px !== size || squeeze) logFit(s, size, px, squeeze);
  ctx.font = `${px}px ${PIXEL_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  // a smaller size stays centred on the line it was meant for
  const ty = Math.round(y) + Math.floor((size - px) / 2);
  if (squeeze) ctx.fillText(s, Math.round(x), ty, Math.max(1, Math.floor(room)));
  else ctx.fillText(s, Math.round(x), ty);
  return squeeze ? Math.floor(room) : width;
}

/** Split already translated text into lines no wider than `maxWidth` at `size`, breaking at spaces. */
function wrapWords(value: string, maxWidth: number, size: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    if (word === '') continue;
    if (line === '') line = word;
    else if (lineWidth(`${line} ${word}`, size) <= maxWidth) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  return lines.length > 0 ? lines : [''];
}

/** Translate, then wrap into lines of at most `maxWidth` logical px at `size` (no shrinking). */
export const wrapLines = (value: string, maxWidth: number, size = 8): string[] => wrapWords(tx(value), maxWidth, size);

export interface Block {
  /** Translated lines. */
  lines: string[];
  size: number;
  lineHeight: number;
  /** Widest line and the block height (top of the first line to the bottom of the last), in logical px. */
  width: number;
  height: number;
}

export interface BlockOptions {
  size?: number;
  minSize?: number;
  /** Line pitch at `size` (scaled down with the font). Defaults to size + 2. */
  lineHeight?: number;
  maxLines?: number;
  maxHeight?: number;
}

/**
 * Measure a wrapped text block before drawing anything: translate, wrap to `maxWidth`, and step the size down until the
 * block also fits `maxLines`/`maxHeight`. At the floor the last allowed line ends in "..." (and over-long words are
 * squeezed when drawn). Containers use the returned width and height to size themselves.
 */
export function measureBlock(value: string, maxWidth: number, { size = 8, minSize = MIN_TEXT_SIZE, lineHeight, maxLines, maxHeight }: BlockOptions = {}): Block {
  const s = tx(value);
  const base = Math.round(size);
  const floor = Math.min(base, Math.round(minSize));
  const pitch = (px: number) => (lineHeight === undefined ? px + 2 : Math.max(px + 1, Math.round((lineHeight * px) / base)));
  const allowed = (px: number) => Math.min(maxLines ?? Infinity, maxHeight === undefined ? Infinity : Math.max(1, Math.floor((maxHeight - px) / pitch(px)) + 1));
  const make = (lines: string[], px: number): Block => ({
    lines,
    size: px,
    lineHeight: pitch(px),
    width: Math.min(maxWidth, Math.max(0, ...lines.map((l) => lineWidth(l, px)))),
    height: (lines.length - 1) * pitch(px) + px,
  });
  for (let px = base; px > floor; px--) {
    const lines = wrapWords(s, maxWidth, px);
    if (lines.length <= allowed(px) && lines.every((l) => lineWidth(l, px) <= maxWidth)) return make(lines, px);
  }
  let lines = wrapWords(s, maxWidth, floor);
  const max = allowed(floor);
  if (lines.length > max) {
    lines = lines.slice(0, max);
    let last = lines[max - 1] as string;
    while (last.length > 0 && lineWidth(`${last}...`, floor) > maxWidth) last = last.slice(0, -1).trimEnd();
    lines[max - 1] = `${last}...`;
  }
  return make(lines, floor);
}

/** Size and width of one line that must fit `maxWidth` (shrinking to `minSize`): for signs and chips sized to their text. */
export function measureLine(value: string, maxWidth = Infinity, size = 8, minSize = MIN_TEXT_SIZE): { text: string; size: number; width: number } {
  const s = tx(value);
  const px = fitSize(s, maxWidth, size, minSize);
  return { text: s, size: px, width: Math.min(maxWidth, lineWidth(s, px)) };
}

/** Draw a measured block with its top-left (or top-centre / top-right, by `align`) at (x, y). */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  x: number,
  y: number,
  { color = PALETTE.ink, align = 'left', maxWidth }: { color?: string; align?: CanvasTextAlign; maxWidth?: number } = {},
): void {
  block.lines.forEach((line, i) => {
    text(ctx, line, x, y + i * block.lineHeight, { size: block.size, minSize: block.size, color, align, maxWidth: maxWidth ?? Math.max(block.width, 1) });
  });
}

/** Measure and draw a wrapped block in one go. Returns the block (its height tells where the next thing goes). */
export function textBlock(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  options: BlockOptions & { color?: string; align?: CanvasTextAlign } = {},
): Block {
  const block = measureBlock(value, maxWidth, options);
  drawBlock(ctx, block, x, y, { color: options.color, align: options.align, maxWidth });
  return block;
}

/** Eight-bit sunrise backdrop: cream sky, gold and coral bands, navy ground. */
export function sunrise(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const bands: Array<[number, PaletteName]> = [
    [0.45, 'cream'],
    [0.6, 'gold'],
    [0.72, 'goldDeep'],
    [0.8, 'coral'],
    [1, 'navy'],
  ];
  let top = 0;
  for (const [end, color] of bands) {
    const bottom = Math.round(h * end);
    box(ctx, PALETTE[color], 0, top, w, bottom - top);
    top = bottom;
  }
}

/** Ask the browser to have the pixel font ready for canvas text (it is self-hosted, so this is quick). */
export function loadPixelFont(): Promise<unknown> {
  return typeof document !== 'undefined' && document.fonts ? document.fonts.load(`8px ${PIXEL_FONT}`).catch(() => undefined) : Promise.resolve();
}
