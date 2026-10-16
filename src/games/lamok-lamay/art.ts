// Layout and pixel art for Lamok Lamay: the pop-up containers, the water, larvae and look-alikes, the AI camera's boxes,
// the two meters, the three tool tiles and the result panel. Everything is drawn from whole-pixel boxes and sprites.
import { t, type StringKey } from '../../app/i18n';
import { MIN_TEXT_SIZE, PALETTE, box, drawBlock, frame, measureBlock, measureLine, sprite, text, type Block, type SpriteRows } from '../engine/draw';
import { BOX, WATER, type ContainerKind, type ObjectKind } from './scans';

export const W = 320;
export const H = 180;

// ---- layout (logical pixels) ------------------------------------------------------------------------------------
export const HEADER_H = 12;
export const TIMEBAR = { y: 13, h: 3 };
/** The pop-up window the container slides up into. */
export const VIEW = { x: 0, y: 17, w: W, h: 96 };
export const METER_Y = [115, 127] as const;
export const MSG_Y = 140;
/** Characters that fit on one full-width line of 8 px text. */
export const LINE_CHARS = 38;
/** The result panel sits over the water; its lines hold this many characters. */
export const PANEL = { x: 20, y: 29, w: 280, h: 74 };
export const PANEL_CHARS = 33;
export const TILE = { y: 150, h: 27, w: 102, gap: 4, x: 3 };
/** Slots: 0 is WHACK, 1 is REJECT, 2 is DONE. */
export const WHACK_SLOT = 0;
export const REJECT_SLOT = 1;
export const DONE_SLOT = 2;
export const SLOTS = 3;
/** The widest a box's tab ("WRONG", "MISSED" or the confidence) may get. */
const TAB_MAX_W = 72;
const TILE_LABELS = [
  ['g.lamok.tile.whack1', 'g.lamok.tile.whack2'],
  ['g.lamok.tile.reject1', 'g.lamok.tile.reject2'],
  ['g.lamok.tile.done1', 'g.lamok.tile.done2'],
] as const satisfies ReadonlyArray<readonly [StringKey, StringKey]>;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const slotRect = (slot: number): Rect => ({ x: TILE.x + slot * (TILE.w + TILE.gap), y: TILE.y, w: TILE.w, h: TILE.h });

/** Tool tile under a logical point, or -1. The gaps between tiles count, and so does the strip above them. */
export function slotAt(x: number, y: number): number {
  if (y < TILE.y - 3 || y >= H || x < 0 || x >= W) return -1;
  return Math.min(SLOTS - 1, Math.max(0, Math.floor((x - TILE.x + TILE.gap / 2) / (TILE.w + TILE.gap))));
}

// ---- colours that only this scene uses (the palette has no water or terracotta) ---------------------------------
const SCENE = {
  water: '#bfe6f2',
  waterDeep: '#9bd3e6',
  ripple: '#e4f6fb',
  terracotta: '#c8693f',
  terracottaLight: '#e08a5c',
  tin: '#aab0c4',
  seed: '#8a5a2b',
  raisin: '#5b2a4e',
  raisinLight: '#8c5a80',
} as const;

// ---- containers -------------------------------------------------------------------------------------------------
/** The container around the water, in its own look: a drum, a tire, a flower-pot plate or a can. */
export function drawContainer(ctx: CanvasRenderingContext2D, kind: ContainerKind): void {
  const outer = { x: 4, y: 19, w: 312, h: 92 };
  box(ctx, PALETTE.ink, outer.x, outer.y, outer.w, outer.h);
  const body = kind === 'drum' ? PALETTE.navy : kind === 'tire' ? PALETTE.muted : kind === 'pot' ? SCENE.terracotta : SCENE.tin;
  box(ctx, body, outer.x + 2, outer.y + 2, outer.w - 4, outer.h - 4);
  const mark = kind === 'drum' ? PALETTE.goldDeep : kind === 'tire' ? PALETTE.ink : kind === 'pot' ? SCENE.terracottaLight : PALETTE.coral;
  for (let x = 8; x < W - 8; x += 12) {
    if (kind === 'tire') {
      box(ctx, mark, x, 21, 6, 2);
      box(ctx, mark, x + 6, 107, 6, 2);
    } else if (kind === 'can') {
      box(ctx, mark, x, 21, 12, 1);
      box(ctx, mark, x, 108, 12, 1);
    }
  }
  if (kind === 'drum' || kind === 'pot') {
    box(ctx, mark, 6, 21, 308, 1);
    box(ctx, mark, 6, 108, 308, 1);
    for (let y = 30; y < 100; y += 14) {
      box(ctx, mark, 6, y, 4, 2);
      box(ctx, mark, 310, y, 4, 2);
    }
  }
  if (kind === 'can') for (let y = 30; y < 100; y += 14) box(ctx, mark, 6, y, 4, 6);
  box(ctx, PALETTE.ink, WATER.x - 2, WATER.y - 2, WATER.w + 4, WATER.h + 4);
}

/** The water surface: two blues with ripples that step along. */
export function drawWater(ctx: CanvasRenderingContext2D, tick: number): void {
  box(ctx, SCENE.water, WATER.x, WATER.y, WATER.w, WATER.h);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 7; col++) {
      const x = WATER.x + 8 + col * 42 + ((row * 17 + tick) % 9) * (row % 2 === 0 ? 1 : -1) + (row % 2) * 20;
      const y = WATER.y + 8 + row * 16;
      if (x < WATER.x + 2 || x > WATER.x + WATER.w - 14) continue;
      box(ctx, (row + col) % 2 === 0 ? SCENE.ripple : SCENE.waterDeep, x, y, 8, 1);
    }
  }
}

// ---- what floats in the water -----------------------------------------------------------------------------------
const SEED: SpriteRows = ['.BBBBB.', 'BHBBBBB', 'BBBBBBB', '.BBBBB.'];
const LEAF: SpriteRows = ['......GG.', '..GGGGGGG', 'GGGVGGGG.', '.GGGG....'];
const RAISIN: SpriteRows = ['..RRRR.', '.RLRRRR', 'RRRRLRR', 'RLRRRRR', '.RRRRR.'];
const SPRITES: Partial<Record<ObjectKind, { rows: SpriteRows; colors: Record<string, string> }>> = {
  seed: { rows: SEED, colors: { B: SCENE.seed, H: PALETTE.gold } },
  leaf: { rows: LEAF, colors: { G: PALETTE.fact, V: PALETTE.factTint } },
  raisin: { rows: RAISIN, colors: { R: SCENE.raisin, L: SCENE.raisinLight } },
};

/** A wriggler: six body segments on a sine wave, a bigger head with an eye. */
function drawLarva(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number): void {
  const wave = (i: number) => Math.round(Math.sin(tick * 0.8 + i * 0.9) * 2);
  for (let i = 0; i < 6; i++) box(ctx, PALETTE.ink, x - 11 + i * 3, y - 1 + wave(i), 3, i === 0 ? 3 : 4);
  const head = wave(6);
  box(ctx, PALETTE.ink, x + 7, y - 3 + head, 5, 7);
  box(ctx, PALETTE.surface, x + 9, y - 2 + head, 2, 2);
}

export function drawObject(ctx: CanvasRenderingContext2D, kind: ObjectKind, x: number, y: number, tick: number): void {
  if (kind === 'larva') return drawLarva(ctx, x, y, tick);
  const s = SPRITES[kind];
  if (!s) return;
  const w = (s.rows[0] as string).length;
  sprite(ctx, s.rows, s.colors, x - w, y - s.rows.length, 2);
}

/** A mosquito that got away, flying up out of the water. */
export function drawMosquito(ctx: CanvasRenderingContext2D, x: number, y: number, tick: number): void {
  const flap = tick % 2 === 0;
  box(ctx, PALETTE.ink, x - 1, y - 2, 3, 6);
  box(ctx, PALETTE.ink, x, y + 4, 1, 3);
  box(ctx, PALETTE.surface, x - 6, y - (flap ? 4 : 1), 5, 3);
  box(ctx, PALETTE.surface, x + 2, y - (flap ? 4 : 1), 5, 3);
  frame(ctx, PALETTE.ink, x - 6, y - (flap ? 4 : 1), 5, 3);
  frame(ctx, PALETTE.ink, x + 2, y - (flap ? 4 : 1), 5, 3);
}

/** A star burst where a larva was whacked or a box was rejected. */
export function drawBurst(ctx: CanvasRenderingContext2D, x: number, y: number, step: number, color: string): void {
  const r = 3 + step * 3;
  for (const [dx, dy] of [
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
    [r - 1, r - 1],
    [-(r - 1), r - 1],
    [r - 1, -(r - 1)],
    [-(r - 1), -(r - 1)],
  ] as const) {
    box(ctx, color, x + dx - 1, y + dy - 1, 3, 3);
  }
}

// ---- the AI camera's boxes --------------------------------------------------------------------------------------
export type BoxStyle = 'ai' | 'wrong' | 'missed';

/** The AI's box with its confidence tab, or (in the result) a red box showing a mistake nobody fixed. */
export function drawAiBox(ctx: CanvasRenderingContext2D, x: number, y: number, confidence: number, style: BoxStyle): void {
  const color = style === 'ai' ? PALETTE.navy : PALETTE.fake;
  const left = x - BOX.w / 2;
  const top = y - BOX.h / 2;
  if (style === 'missed') {
    // dashed: the AI drew nothing here
    for (let i = 0; i < BOX.w; i += 4) {
      box(ctx, color, left + i, top, 2, 1);
      box(ctx, color, left + i, top + BOX.h - 1, 2, 1);
    }
    for (let i = 0; i < BOX.h; i += 4) {
      box(ctx, color, left, top + i, 1, 2);
      box(ctx, color, left + BOX.w - 1, top + i, 1, 2);
    }
  } else {
    frame(ctx, color, left, top, BOX.w, BOX.h, 1);
    box(ctx, color, left - 1, top - 1, 3, 3);
    box(ctx, color, left + BOX.w - 2, top - 1, 3, 3);
    box(ctx, color, left - 1, top + BOX.h - 2, 3, 3);
    box(ctx, color, left + BOX.w - 2, top + BOX.h - 2, 3, 3);
  }
  const label = measureLine(style === 'ai' ? `${confidence}%` : style === 'wrong' ? t('g.lamok.tab.wrong') : t('g.lamok.tab.missed'), TAB_MAX_W);
  const tabW = label.width + 2;
  box(ctx, color, x - tabW / 2, top - 9, tabW, 9);
  text(ctx, label.text, x, top - 8, { size: label.size, color: PALETTE.surface, align: 'center', maxWidth: label.width });
}

/** The keyboard or mouse highlight: a gold corner frame around an object. */
export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  frame(ctx, PALETTE.goldDeep, x - BOX.w / 2 - 3, y - BOX.h / 2 - 3, BOX.w + 6, BOX.h + 6, 2);
}

// ---- header, time and meters ------------------------------------------------------------------------------------
export function drawHeader(ctx: CanvasRenderingContext2D, name: string, scanNo: number, secondsLeft: number | null, timeFrac: number): void {
  box(ctx, PALETTE.gold, 0, 0, W, HEADER_H);
  box(ctx, PALETTE.goldDeep, 0, HEADER_H - 1, W, 1);
  const scan = measureLine(secondsLeft === null ? t('g.lamok.header.scan', { n: scanNo }) : t('g.lamok.header.scanTime', { n: scanNo, s: secondsLeft }), W / 2 - 8);
  text(ctx, scan.text, W - 4, 2, { size: scan.size, color: PALETTE.navy, align: 'right', maxWidth: scan.width });
  text(ctx, name, 4, 2, { size: 8, color: PALETTE.navy, maxWidth: W - 16 - scan.width });
  box(ctx, PALETTE.line, 0, TIMEBAR.y, W, TIMEBAR.h);
  const fill = Math.max(0, Math.min(1, timeFrac));
  box(ctx, fill > 0.5 ? PALETTE.fact : fill > 0.25 ? PALETTE.goldDeep : PALETTE.fake, 0, TIMEBAR.y, W * fill, TIMEBAR.h);
}

/** One meter row: a plain-words label and a bar. */
export function drawMeterRow(ctx: CanvasRenderingContext2D, row: 0 | 1, label: string, value: number): void {
  const y = METER_Y[row];
  text(ctx, label, 4, y, { size: 8, color: PALETTE.ink, maxWidth: W - 8 });
  box(ctx, PALETTE.line, 4, y + 9, W - 8, 2);
  box(ctx, value > 60 ? PALETTE.fact : value > 30 ? PALETTE.goldDeep : PALETTE.fake, 4, y + 9, ((W - 8) * value) / 100, 2);
}

// ---- tool tiles -------------------------------------------------------------------------------------------------
const HAMMER: SpriteRows = ['.XXXXX.', '.XXXXX.', '..XXX..', '...X...', '...X...', '...X...'];
const CROSS: SpriteRows = ['X.....X', '.X...X.', '..X.X..', '...X...', '..X.X..', '.X...X.', 'X.....X'];
const TICK: SpriteRows = ['......X', '.....XX', 'X...XX.', 'XX.XX..', '.XXX...', '..X....'];
const TILE_ICONS: readonly SpriteRows[] = [HAMMER, CROSS, TICK];

export function drawToolTile(ctx: CanvasRenderingContext2D, slot: number, state: { active: boolean; cursor: boolean; locked: boolean }): void {
  const r = slotRect(slot);
  const [key1, key2] = TILE_LABELS[slot] as readonly [StringKey, StringKey];
  const line1 = t(key1);
  const line2 = t(key2);
  const fill = state.locked ? PALETTE.soft : slot === WHACK_SLOT ? PALETTE.coral : slot === REJECT_SLOT ? PALETTE.navy : PALETTE.factTint;
  const ink = state.locked ? PALETTE.muted : slot === REJECT_SLOT ? PALETTE.surface : PALETTE.ink;
  box(ctx, PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, fill, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  box(ctx, state.locked ? PALETTE.line : PALETTE.ink, r.x + 2, r.y + r.h - 5, r.w - 4, 3);
  sprite(ctx, TILE_ICONS[slot] as SpriteRows, { X: ink }, r.x + 7, r.y + 6, 1);
  text(ctx, line1, r.x + 20, r.y + 4, { size: 8, color: ink, maxWidth: r.w - 23 });
  text(ctx, line2, r.x + 20, r.y + 13, { size: 8, color: ink, maxWidth: r.w - 23 });
  // the chosen tool is marked with a white inner frame; the keyboard or mouse highlight is gold
  if (state.active && !state.locked) frame(ctx, PALETTE.surface, r.x + 3, r.y + 3, r.w - 6, r.h - 8, 1);
  if (state.cursor && !state.locked) frame(ctx, PALETTE.goldDeep, r.x, r.y, r.w, r.h, 2);
}

// ---- the result panel -------------------------------------------------------------------------------------------
/** The panel may grow to this inner height (its 3px border stays inside the water view). */
const PANEL_MAX_H = VIEW.h - 10;

/**
 * Lay out the result lines: each wraps to the panel width, the tip lines sit 3px lower, and the whole text steps down a
 * size until it fits the tallest panel. Returns the blocks, their offsets and the panel's inner height.
 */
export function layoutPanel(lines: readonly string[]): { blocks: Block[]; offsets: number[]; h: number } {
  const width = PANEL.w - 16;
  let out = { blocks: [] as Block[], offsets: [] as number[], h: PANEL.h };
  for (let size = 8; size >= MIN_TEXT_SIZE; size--) {
    const blocks = lines.map((line) => measureBlock(line, width, { size, minSize: size }));
    const offsets: number[] = [];
    let y = 8;
    blocks.forEach((b, i) => {
      if (i === 2) y += 3;
      offsets.push(y);
      y += b.height + (b.lineHeight - b.size);
    });
    out = { blocks, offsets, h: Math.max(PANEL.h, y + 6) };
    if (out.h <= PANEL_MAX_H) break;
  }
  out.h = Math.min(out.h, PANEL_MAX_H);
  return out;
}

export function drawPanel(ctx: CanvasRenderingContext2D, lines: readonly string[], tone: 'good' | 'bad'): void {
  const { blocks, offsets, h } = layoutPanel(lines);
  // a taller panel stays centred on the usual one, but never leaves the water view
  const y = Math.max(VIEW.y + 5, Math.min(PANEL.y - Math.floor((h - PANEL.h) / 2), VIEW.y + VIEW.h - 5 - h));
  box(ctx, PALETTE.ink, PANEL.x - 3, y - 3, PANEL.w + 6, h + 6);
  box(ctx, PALETTE.surface, PANEL.x, y, PANEL.w, h);
  box(ctx, tone === 'good' ? PALETTE.fact : PALETTE.fake, PANEL.x, y, PANEL.w, 3);
  blocks.forEach((b, i) => drawBlock(ctx, b, PANEL.x + 8, y + (offsets[i] as number), { color: i === 0 ? (tone === 'good' ? PALETTE.fact : PALETTE.fake) : i > 1 ? PALETTE.navy : PALETTE.ink, maxWidth: PANEL.w - 16 }));
}
