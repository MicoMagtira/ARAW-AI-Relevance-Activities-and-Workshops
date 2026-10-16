// Layout and pixel art for Luto ni Ara: the order bubble, the pot, the ingredient shelf and the dishes.
import { t } from '../../app/i18n';
import { tx } from '../../i18n/runtime';
import { MIN_TEXT_SIZE, PALETTE, box, drawBlock, frame, lineWidth, measureBlock, measureLine, sprite, text, wrapLines, type SpriteRows } from '../engine/draw';
import { INGREDIENTS, INGREDIENT_INFO, type Ingredient, type Quality } from './orders';

export const W = 320;
export const H = 180;

// ---- layout (logical pixels) ------------------------------------------------------------------------------------
export const BUBBLE = { x: 48, y: 4, w: 266, h: 54 };
/** The bubble may grow to here (the timer and the kind chip start at y 60). */
const BUBBLE_MAX_H = 56;
/** Characters per line in the order bubble and in the result text. */
export const BUBBLE_CHARS = 31;
export const BUBBLE_LINES = 5;
export const RESULT_CHARS = 29;
export const TIMER = { x: 6, y: 62, w: 240, h: 8 };
export const POT = { x: 120, y: 78, w: 80, h: 40 };
/** The drop zone for dragging: the pot and the space around it. */
export const DROP = { x: 108, y: 72, w: 104, h: 50 };
export const TILE = { w: 76, h: 25, gap: 4, x: 2, y: 124 };
/** Slot index of the COOK button (the ingredient tiles are slots 0 to 6). */
export const COOK_SLOT = INGREDIENTS.length;
export const SLOTS = INGREDIENTS.length + 1;
export const COLUMNS = 4;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inside = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export function slotRect(slot: number): Rect {
  const col = slot % COLUMNS;
  const row = Math.floor(slot / COLUMNS);
  return { x: TILE.x + col * (TILE.w + TILE.gap), y: TILE.y + row * (TILE.h + TILE.gap), w: TILE.w, h: TILE.h };
}

/** Slot under a logical point (0 to 6 ingredients, 7 COOK), or -1. The gaps between tiles count, to make small screens easier to tap. */
export function slotAt(x: number, y: number): number {
  const half = TILE.gap / 2;
  const col = Math.floor((x - TILE.x + half) / (TILE.w + TILE.gap));
  const row = Math.floor((y - TILE.y + half) / (TILE.h + TILE.gap));
  if (col < 0 || col >= COLUMNS || row < 0 || row > 1) return -1;
  const slot = row * COLUMNS + col;
  return slot < SLOTS ? slot : -1;
}

/** Move the keyboard highlight over the 4-column grid; it stays on a real slot. */
export function moveSlot(slot: number, action: 'left' | 'right' | 'up' | 'down'): number {
  const next = action === 'left' ? slot - 1 : action === 'right' ? slot + 1 : action === 'up' ? slot - COLUMNS : slot + COLUMNS;
  return next < 0 || next >= SLOTS ? slot : next;
}

/** Widest chip text: a chip beside the pot must not reach the pot (chips sit at x 6 or end at W - 6). */
const CHIP_TEXT_MAX = 104;
/** The chip's label in the active language, fitted to the chip. */
const chipLabel = (id: Ingredient) => measureLine(INGREDIENT_INFO[id].chip, CHIP_TEXT_MAX);
export const chipWidth = (id: Ingredient): number => chipLabel(id).width + 8;
const CHIP_H = 11;

/** Where the chip of the k-th ingredient in the pot sits: they alternate left and right of the pot. */
export function chipRect(k: number, id: Ingredient): Rect {
  const w = chipWidth(id);
  const y = 74 + Math.floor(k / 2) * 12;
  return { x: k % 2 === 0 ? 6 : W - 6 - w, y, w, h: CHIP_H };
}

/** The pot ingredient under a point, or -1 (index into the pot list). */
export function chipAt(pot: readonly Ingredient[], x: number, y: number): number {
  return pot.findIndex((id, k) => inside(chipRect(k, id), x, y));
}

/** Split text into lines of at most `max` characters, breaking at spaces. The text is translated first. */
export function wrapText(value: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of tx(value).split(' ')) {
    if (line === '') line = word;
    else if (line.length + 1 + word.length <= max) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== '') lines.push(line);
  return lines;
}

// ---- the order bubble and timer ---------------------------------------------------------------------------------
/** The order bubble: the whole order is measured first (translated, wrapped), and the bubble grows or the font steps down to hold it. */
export function drawBubble(ctx: CanvasRenderingContext2D, order: string): void {
  const block = measureBlock(order, BUBBLE.w - 12, { size: 8, lineHeight: 10, maxHeight: BUBBLE_MAX_H - 8 });
  const h = Math.min(BUBBLE_MAX_H, Math.max(BUBBLE.h, block.height + 8));
  box(ctx, PALETTE.ink, BUBBLE.x - 4, BUBBLE.y + 22, 4, 8);
  box(ctx, PALETTE.surface, BUBBLE.x - 2, BUBBLE.y + 24, 3, 4);
  box(ctx, PALETTE.ink, BUBBLE.x, BUBBLE.y, BUBBLE.w, h);
  box(ctx, PALETTE.surface, BUBBLE.x + 2, BUBBLE.y + 2, BUBBLE.w - 4, h - 4);
  drawBlock(ctx, block, BUBBLE.x + 6, BUBBLE.y + 5, { color: PALETTE.ink, maxWidth: BUBBLE.w - 12 });
}

export function drawTimer(ctx: CanvasRenderingContext2D, fraction: number): void {
  const f = Math.min(1, Math.max(0, fraction));
  box(ctx, PALETTE.ink, TIMER.x, TIMER.y, TIMER.w, TIMER.h);
  box(ctx, PALETTE.surface, TIMER.x + 2, TIMER.y + 2, TIMER.w - 4, TIMER.h - 4);
  const fill = Math.round((TIMER.w - 4) * f);
  box(ctx, f > 0.5 ? PALETTE.fact : f > 0.25 ? PALETTE.goldDeep : PALETTE.fake, TIMER.x + 2, TIMER.y + 2, fill, TIMER.h - 4);
  for (let sx = TIMER.x + 5; sx < TIMER.x + 2 + fill; sx += 7) box(ctx, PALETTE.surface, sx, TIMER.y + 2, 2, TIMER.h - 4);
}

/** The kind chip right of the timer: 62 wide, wider for a longer label (up to 66, then the label shrinks). */
export function drawKindChip(ctx: CanvasRenderingContext2D, health: boolean): void {
  const label = measureLine(health ? t('g.luto.health') : t('g.luto.anyAsk'), 58);
  const w = Math.max(62, label.width + 8);
  const x = 314 - w;
  box(ctx, health ? PALETTE.fake : PALETTE.muted, x, 60, w, 12);
  box(ctx, health ? PALETTE.fakeTint : PALETTE.soft, x + 2, 62, w - 4, 8);
  text(ctx, label.text, x + w / 2, 62, { size: 8, minSize: label.size, maxWidth: w - 4, color: health ? PALETTE.fake : PALETTE.muted, align: 'center' });
}

// ---- the pot ------------------------------------------------------------------------------------------------------
const row = (edge: number, body: string, fill: number): string => '.'.repeat(edge) + body.repeat(fill) + '.'.repeat(edge);
const POT_ROWS: SpriteRows = [
  row(2, 'I', 16),
  `.I${'Y'.repeat(16)}I.`,
  'I'.repeat(20),
  `I${'N'.repeat(18)}I`,
  `I${'NNNnn'}${'N'.repeat(13)}I`,
  `I${'NNNnn'}${'N'.repeat(13)}I`,
  `I${'N'.repeat(18)}I`,
  `.I${'N'.repeat(16)}I.`,
  `..II${'N'.repeat(12)}II..`,
  row(4, 'I', 12),
];
const POT_COLORS = { I: PALETTE.ink, Y: PALETTE.gold, N: PALETTE.navy, n: PALETTE.navyTint };

/** `shake` nudges the pot while it cooks; `tick` animates the steam in whole steps. */
export function drawPot(ctx: CanvasRenderingContext2D, count: number, tick: number, shake: boolean, hot: boolean): void {
  const dx = shake ? (tick % 2 === 0 ? -2 : 2) : 0;
  if (hot) frame(ctx, PALETTE.goldDeep, DROP.x, DROP.y, DROP.w, DROP.h, 2);
  sprite(ctx, POT_ROWS, POT_COLORS, POT.x + dx, POT.y, 4);
  // bubbles on the soup grow with what is in the pot
  for (let i = 0; i < Math.min(count, 5); i++) box(ctx, PALETTE.goldDeep, POT.x + dx + 12 + i * 12 + ((tick + i) % 2) * 2, POT.y + 8 - ((tick + i) % 3), 4, 4);
  const steam = shake ? 3 : count > 0 ? 2 : 1;
  for (let i = 0; i < steam; i++) {
    const phase = (tick + i * 3) % 6;
    box(ctx, PALETTE.line, POT.x + 22 + i * 18, POT.y - 6 - phase * 2, 4, 4);
  }
}

// ---- tiles --------------------------------------------------------------------------------------------------------
const STRIPE: Record<Ingredient, string> = {
  audience: PALETTE.navy,
  language: PALETTE.coral,
  length: PALETTE.goldDeep,
  format: PALETTE.muted,
  role: PALETTE.navyDark,
  cite: PALETTE.fact,
  unsure: PALETTE.fake,
};
const CHECK: SpriteRows = ['.....X', '....XX', 'X..XX.', 'XXXX..', '.XX...'];

export function drawTile(ctx: CanvasRenderingContext2D, slot: number, state: { selected: boolean; inPot: boolean; locked: boolean }): void {
  const id = INGREDIENTS[slot];
  if (!id) return;
  const r = slotRect(slot);
  box(ctx, state.selected ? PALETTE.navy : PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, state.inPot ? PALETTE.factTint : state.selected ? PALETTE.gold : PALETTE.surface, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  box(ctx, STRIPE[id], r.x + 2, r.y + 2, 4, r.h - 4);
  const ink = state.locked ? PALETTE.muted : PALETTE.ink;
  const label = tileLabel(id, r.w);
  label.rows.forEach((row, i) => {
    text(ctx, row.text, r.x + label.x, r.y + label.top + i * label.pitch, { size: label.size, minSize: label.size, maxWidth: label.width, color: row.first ? ink : PALETTE.muted });
  });
  if (state.inPot) {
    // beside the second line; a tile that needed small text has its check over the stripe instead
    if (label.size === 8) sprite(ctx, CHECK, { X: PALETTE.fact }, r.x + r.w - 9, r.y + 15, 1);
    else sprite(ctx, CHECK, { X: PALETTE.fact }, r.x + 1, r.y + r.h - 8, 1);
  }
  if (state.selected) frame(ctx, PALETTE.surface, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 1);
}

interface TileLabel {
  rows: Array<{ text: string; first: boolean }>;
  size: number;
  pitch: number;
  /** Text start and width inside the tile, and the first row's top. */
  x: number;
  width: number;
  top: number;
}

/**
 * The shelf tile's two labels in the active language. In English (or any language where they fit) they keep the
 * classic layout: two 8px lines, the second beside the check mark. Otherwise each label may wrap and the size steps
 * down until all rows fit the tile (at 6px three rows fit), with the text starting right after the colour stripe.
 */
export function tileLabel(id: Ingredient, tileW = TILE.w): TileLabel {
  const info = INGREDIENT_INFO[id];
  const line1 = tx(info.line1);
  const line2 = tx(info.line2);
  if (lineWidth(line1, 8) <= tileW - 12 && lineWidth(line2, 8) <= tileW - 20) {
    return { rows: [{ text: line1, first: true }, { text: line2, first: false }], size: 8, pitch: 10, x: 10, width: tileW - 12, top: 4 };
  }
  const width = tileW - 10;
  const inner = TILE.h - 4;
  for (let px = 7; px >= MIN_TEXT_SIZE; px--) {
    const pitch = px + 1;
    const rows = [...wrapLines(line1, width, px).map((text) => ({ text, first: true })), ...wrapLines(line2, width, px).map((text) => ({ text, first: false }))];
    const height = (rows.length - 1) * pitch + px;
    if ((height <= inner && rows.every((row) => lineWidth(row.text, px) <= width)) || px === MIN_TEXT_SIZE) {
      const shown = rows.slice(0, Math.floor((inner - px) / pitch) + 1);
      const used = (shown.length - 1) * pitch + px;
      return { rows: shown, size: px, pitch, x: 8, width, top: 2 + Math.floor((inner - used) / 2) };
    }
  }
  return { rows: [], size: MIN_TEXT_SIZE, pitch: MIN_TEXT_SIZE + 1, x: 8, width, top: 2 };
}

export function drawCookButton(ctx: CanvasRenderingContext2D, state: { selected: boolean; ready: boolean }): void {
  const r = slotRect(COOK_SLOT);
  box(ctx, PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, state.ready ? PALETTE.coral : PALETTE.soft, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  box(ctx, state.ready ? PALETTE.ink : PALETTE.line, r.x + 2, r.y + r.h - 5, r.w - 4, 3);
  text(ctx, t('g.luto.cook'), r.x + r.w / 2, r.y + 6, { size: 8, color: state.ready ? PALETTE.ink : PALETTE.muted, align: 'center', maxWidth: r.w - 6 });
  if (state.selected) frame(ctx, state.ready ? PALETTE.navy : PALETTE.muted, r.x, r.y, r.w, r.h, 2);
}

export function drawChip(ctx: CanvasRenderingContext2D, rect: Rect, id: Ingredient, lifted = false): void {
  box(ctx, PALETTE.ink, rect.x, rect.y, rect.w, rect.h);
  box(ctx, lifted ? PALETTE.gold : PALETTE.surface, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  box(ctx, STRIPE[id], rect.x + 1, rect.y + 1, 3, rect.h - 2);
  const label = chipLabel(id);
  text(ctx, label.text, rect.x + 6, rect.y + 2, { size: 8, minSize: label.size, maxWidth: rect.w - 6, color: PALETTE.ink });
}

// ---- dishes -------------------------------------------------------------------------------------------------------
const DISH_ROWS: SpriteRows = [
  '.....FFFFFF.....',
  '...FFFFFFFFFF...',
  '..FFFfFFFFfFFF..',
  '.FFFFFFFFFFFFFF.',
  'PPPPPPPPPPPPPPPP',
  '.PPPPPPPPPPPPPP.',
  '..PPPPPPPPPPPP..',
];
const WRONG_ROWS: SpriteRows = [
  '.....FFFFFF.....',
  '...FFFFFFFFFF...',
  '..FFEFFFFFEFFF..',
  '.FFFFFFFFFFFFFF.',
  'PPPPPPPPPPPPPPPP',
  '.PPPPPPPPPPPPPP.',
  '..PPPPPPPPPPPP..',
];

export function drawDish(ctx: CanvasRenderingContext2D, quality: Quality | 'none', x: number, y: number, tick: number): void {
  const good = quality === 'perfect' || quality === 'cluttered';
  const rows = good ? DISH_ROWS : WRONG_ROWS;
  const food = quality === 'perfect' ? PALETTE.goldDeep : quality === 'cluttered' ? PALETTE.gold : quality === 'none' ? PALETTE.line : PALETTE.fake;
  sprite(ctx, rows, { F: food, f: PALETTE.fact, E: PALETTE.ink, P: PALETTE.surface }, x, y, 4);
  if (quality === 'perfect') {
    for (const [sx, sy] of [[2, -4], [58, 2], [30, -10]] as const) {
      const on = (tick + sx) % 4 < 3;
      if (on) box(ctx, PALETTE.goldDeep, x + sx, y + sy, 4, 4);
    }
  } else if (!good) {
    const rise = tick % 4;
    box(ctx, PALETTE.muted, x + 24, y - 6 - rise * 2, 4, 4);
    box(ctx, PALETTE.muted, x + 36, y - 10 - ((tick + 2) % 4) * 2, 4, 4);
  }
}
