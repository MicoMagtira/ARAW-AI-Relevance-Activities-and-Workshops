// Layout and pixel art for Lamok Lamay: the pop-up containers, the water, larvae and look-alikes, the AI camera's boxes,
// the two meters, the three tool tiles and the result panel. Everything is drawn from whole-pixel boxes and sprites.
import { PALETTE, box, frame, sprite, text, type SpriteRows } from '../engine/draw';
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
const TILE_LABELS = [
  ['WHACK', 'A LARVA'],
  ['REJECT', 'WRONG BOX'],
  ['DONE', 'NEXT ONE'],
] as const;

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
  const label = style === 'ai' ? `${confidence}%` : style === 'wrong' ? 'WRONG' : 'MISSED';
  const tabW = label.length * 8 + 2;
  box(ctx, color, x - tabW / 2, top - 9, tabW, 9);
  text(ctx, label, x, top - 8, { size: 8, color: PALETTE.surface, align: 'center' });
}

/** The keyboard or mouse highlight: a gold corner frame around an object. */
export function drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  frame(ctx, PALETTE.goldDeep, x - BOX.w / 2 - 3, y - BOX.h / 2 - 3, BOX.w + 6, BOX.h + 6, 2);
}

// ---- header, time and meters ------------------------------------------------------------------------------------
export function drawHeader(ctx: CanvasRenderingContext2D, name: string, scanNo: number, secondsLeft: number | null, timeFrac: number): void {
  box(ctx, PALETTE.gold, 0, 0, W, HEADER_H);
  box(ctx, PALETTE.goldDeep, 0, HEADER_H - 1, W, 1);
  text(ctx, name, 4, 2, { size: 8, color: PALETTE.navy });
  text(ctx, secondsLeft === null ? `SCAN ${scanNo}` : `SCAN ${scanNo}  ${secondsLeft}S`, W - 4, 2, { size: 8, color: PALETTE.navy, align: 'right' });
  box(ctx, PALETTE.line, 0, TIMEBAR.y, W, TIMEBAR.h);
  const fill = Math.max(0, Math.min(1, timeFrac));
  box(ctx, fill > 0.5 ? PALETTE.fact : fill > 0.25 ? PALETTE.goldDeep : PALETTE.fake, 0, TIMEBAR.y, W * fill, TIMEBAR.h);
}

/** One meter row: a plain-words label and a bar. */
export function drawMeterRow(ctx: CanvasRenderingContext2D, row: 0 | 1, label: string, value: number): void {
  const y = METER_Y[row];
  text(ctx, label, 4, y, { size: 8, color: PALETTE.ink });
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
  const [line1, line2] = TILE_LABELS[slot] as readonly [string, string];
  const fill = state.locked ? PALETTE.soft : slot === WHACK_SLOT ? PALETTE.coral : slot === REJECT_SLOT ? PALETTE.navy : PALETTE.factTint;
  const ink = state.locked ? PALETTE.muted : slot === REJECT_SLOT ? PALETTE.surface : PALETTE.ink;
  box(ctx, PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, fill, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  box(ctx, state.locked ? PALETTE.line : PALETTE.ink, r.x + 2, r.y + r.h - 5, r.w - 4, 3);
  sprite(ctx, TILE_ICONS[slot] as SpriteRows, { X: ink }, r.x + 7, r.y + 6, 1);
  text(ctx, line1, r.x + 20, r.y + 4, { size: 8, color: ink });
  text(ctx, line2, r.x + 20, r.y + 13, { size: 8, color: ink });
  // the chosen tool is marked with a white inner frame; the keyboard or mouse highlight is gold
  if (state.active && !state.locked) frame(ctx, PALETTE.surface, r.x + 3, r.y + 3, r.w - 6, r.h - 8, 1);
  if (state.cursor && !state.locked) frame(ctx, PALETTE.goldDeep, r.x, r.y, r.w, r.h, 2);
}

// ---- the result panel -------------------------------------------------------------------------------------------
export function drawPanel(ctx: CanvasRenderingContext2D, lines: readonly string[], tone: 'good' | 'bad'): void {
  box(ctx, PALETTE.ink, PANEL.x - 3, PANEL.y - 3, PANEL.w + 6, PANEL.h + 6);
  box(ctx, PALETTE.surface, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
  box(ctx, tone === 'good' ? PALETTE.fact : PALETTE.fake, PANEL.x, PANEL.y, PANEL.w, 3);
  lines.forEach((line, i) => text(ctx, line, PANEL.x + 8, PANEL.y + 8 + i * 10 + (i > 1 ? 3 : 0), { size: 8, color: i === 0 ? (tone === 'good' ? PALETTE.fact : PALETTE.fake) : i > 1 ? PALETTE.navy : PALETTE.ink }));
}
