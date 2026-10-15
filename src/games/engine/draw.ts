// Pixel drawing helpers in the ARAW palette. Canvas cannot read CSS variables cheaply every frame, so the palette is
// mirrored here from src/styles/tokens.css (a unit test keeps the two in step). Games draw in logical units.

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

/** Fill a rectangle on whole logical pixels. */
export function box(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Pixel border (inside the rectangle). */
export function frame(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number, thickness = 1): void {
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

export interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
}

export const PIXEL_FONT = '"Press Start 2P", ui-monospace, monospace';

/** Pixel-font text. `size` is in logical pixels (8 is the font's native grid). */
export function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, { size = 8, color = PALETTE.ink, align = 'left' }: TextOptions = {}): void {
  ctx.font = `${size}px ${PIXEL_FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(value, Math.round(x), Math.round(y));
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
