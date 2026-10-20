// Layout and pixel art for Sino 'To?: the caller card, the transcript bubble, the check log, the verification tiles and the stamps.
import { t } from '../../app/i18n';
import { PALETTE, box, drawBlock, frame, lineWidth, measureBlock, measureLine, sprite, text, textBlock, type Block, type SpriteRows } from '../engine/draw';
import { CHECKS, CHECK_INFO, type CheckId, type Verdict } from './calls';

export const W = 320;
export const H = 180;

// ---- layout (logical pixels) ------------------------------------------------------------------------------------
export const BUBBLE = { x: 48, y: 3, w: 266, h: 59 };
export const LOG_LINES = 5;
/** The reveal: stamp at the left, headline at HEAD_X (to the canvas edge), then the lesson. */
export const HEAD_X = 150;
export const LESSON_Y = 95;
export const STRIP_Y = 64;
export const LOG_Y = 76;
export const LINE_H = 9;
export const TILE = { w: 76, h: 25, gap: 4, x: 2, y: 124 };
/** Where the transcript goes inside the bubble (six 8px lines in English; longer translations get a smaller font). */
// one pixel up and one taller than before, so a sixth line with a descender ("you like.") clears the bubble's border
export const BUBBLE_TEXT = { x: BUBBLE.x + 6, y: BUBBLE.y + 3, w: BUBBLE.w - 12, h: BUBBLE.h - 5 };
/** The lesson on the reveal: full width, down to just above the tiles. */
export const LESSON = { x: 6, y: LESSON_Y, w: W - 12, h: TILE.y - 2 - LESSON_Y };
export { lineWidth };
/** Widest a stamp may be, so it never reaches the headline. */
const STAMP_MAX = HEAD_X - 6 - 4;
/** Slots: 0 to 3 are the checks, 4 is HELP, 5 is HANG UP. */
export const HELP_SLOT = CHECKS.length;
export const HANGUP_SLOT = CHECKS.length + 1;
export const SLOTS = CHECKS.length + 2;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inside = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export function slotRect(slot: number): Rect {
  if (slot < CHECKS.length) return { x: TILE.x + slot * (TILE.w + TILE.gap), y: TILE.y, w: TILE.w, h: TILE.h };
  const w = (W - TILE.x * 2 - TILE.gap) / 2;
  return { x: TILE.x + (slot - CHECKS.length) * (w + TILE.gap), y: TILE.y + TILE.h + TILE.gap, w, h: TILE.h };
}

/** Slot under a logical point, or -1. The gaps between tiles count, to make small screens easier to tap. */
export function slotAt(x: number, y: number): number {
  const half = TILE.gap / 2;
  if (y < TILE.y - half || y >= TILE.y + 2 * TILE.h + TILE.gap + half || x < 0 || x >= W) return -1;
  if (y < TILE.y + TILE.h + half) {
    const col = Math.floor((x - TILE.x + half) / (TILE.w + TILE.gap));
    return col >= 0 && col < CHECKS.length ? col : -1;
  }
  return x < W / 2 ? HELP_SLOT : HANGUP_SLOT;
}

/** Move the keyboard highlight: four checks on the top row, the two decisions below; it stays on a real slot. */
export function moveSlot(slot: number, action: 'left' | 'right' | 'up' | 'down'): number {
  if (action === 'left') return slot === 0 || slot === HELP_SLOT ? slot : slot - 1;
  if (action === 'right') return slot === CHECKS.length - 1 || slot === HANGUP_SLOT ? slot : slot + 1;
  if (action === 'up') return slot >= HELP_SLOT ? (slot - HELP_SLOT) * 2 + 1 : slot;
  return slot < HELP_SLOT ? (slot < 2 ? HELP_SLOT : HANGUP_SLOT) : slot;
}

/** The transcript laid out for the bubble (already translated text is fine: it passes through). */
export const measureBubble = (value: string): Block => measureBlock(value, BUBBLE_TEXT.w, { lineHeight: LINE_H, maxHeight: BUBBLE_TEXT.h });

/** The lesson laid out for the reveal. */
export const measureLesson = (value: string): Block => measureBlock(value, LESSON.w, { lineHeight: LINE_H, maxHeight: LESSON.h });

export function drawLesson(ctx: CanvasRenderingContext2D, block: Block): void {
  drawBlock(ctx, block, LESSON.x, LESSON.y, { color: PALETTE.ink, maxWidth: LESSON.w });
}

// ---- the caller card --------------------------------------------------------------------------------------------
const WAVE_HEIGHTS = [
  [3, 7, 5, 9, 4, 6],
  [6, 4, 9, 5, 8, 3],
  [4, 9, 6, 3, 7, 5],
  [8, 5, 4, 8, 3, 9],
];

/** The voice "wave" under the caller's face: it dances while the call is live, turns red on a clone and green on a real caller. */
export function drawWave(ctx: CanvasRenderingContext2D, tick: number, mode: 'live' | 'fake' | 'real' | 'quiet'): void {
  const x = 6;
  const baseline = 58;
  box(ctx, PALETTE.ink, x - 1, 45, 38, 15);
  box(ctx, PALETTE.surface, x, 46, 36, 13);
  const frameHeights = WAVE_HEIGHTS[tick % WAVE_HEIGHTS.length] as number[];
  const color = mode === 'fake' ? PALETTE.fake : mode === 'real' ? PALETTE.fact : PALETTE.navy;
  frameHeights.forEach((h, i) => {
    const height = mode === 'quiet' ? 2 : mode === 'fake' ? (i % 2 === 0 ? 9 : 3) : mode === 'real' ? 5 : h;
    box(ctx, color, x + 3 + i * 5, baseline - height, 3, height);
  });
}

/**
 * The strip under the bubble: what is calling and how ("CALL: MAMA, SAVED"). The parts are drawn one after another, each
 * translated on its own, at one shared size that fits the whole line.
 */
export function drawStrip(ctx: CanvasRenderingContext2D, parts: readonly string[]): void {
  box(ctx, PALETTE.gold, 0, STRIP_Y - 2, W, 11);
  box(ctx, PALETTE.goldDeep, 0, STRIP_Y - 2, W, 1);
  const shown = parts.map((p) => measureLine(p).text);
  const room = W - 12;
  const line = measureLine(shown.join(''), room);
  const squeeze = Math.min(1, room / lineWidth(shown.join(''), line.size));
  let x = 6;
  for (const part of shown) {
    const w = lineWidth(part, line.size) * squeeze;
    if (part.trim() !== '') text(ctx, part, x, STRIP_Y, { size: 8, minSize: line.size, maxWidth: w + 0.4, color: PALETTE.navy });
    x += w;
  }
}

/** The speech bubble with the first `typed` characters of the transcript block (see measureBubble). */
export function drawBubble(ctx: CanvasRenderingContext2D, block: Block, typed: number, ringing: boolean, tick: number): void {
  box(ctx, PALETTE.ink, BUBBLE.x - 4, BUBBLE.y + 22, 4, 8);
  box(ctx, PALETTE.surface, BUBBLE.x - 2, BUBBLE.y + 24, 3, 4);
  box(ctx, PALETTE.ink, BUBBLE.x, BUBBLE.y, BUBBLE.w, BUBBLE.h);
  box(ctx, PALETTE.surface, BUBBLE.x + 2, BUBBLE.y + 2, BUBBLE.w - 4, BUBBLE.h - 4);
  if (ringing) {
    text(ctx, t(tick % 4 < 2 ? 'g.sino.ring1' : 'g.sino.ring2'), BUBBLE.x + BUBBLE.w / 2, BUBBLE.y + 24, { size: 8, color: PALETTE.navy, align: 'center' });
    return;
  }
  let left = typed;
  const shown: string[] = [];
  for (const line of block.lines) {
    if (left <= 0) break;
    shown.push([...line].slice(0, left).join(''));
    left -= [...line].length + 1;
  }
  drawBlock(ctx, { ...block, lines: shown }, BUBBLE_TEXT.x, BUBBLE_TEXT.y, { color: PALETTE.ink, maxWidth: BUBBLE_TEXT.w });
}

// ---- the check log ----------------------------------------------------------------------------------------------
const MARK: Record<Verdict, string> = { pass: PALETTE.fact, fail: PALETTE.fake, unclear: PALETTE.muted };

/** One line per check used so far: a coloured mark, then what it found out. */
export function drawLog(ctx: CanvasRenderingContext2D, rows: ReadonlyArray<{ verdict: Verdict; text: string }>): void {
  if (rows.length === 0) {
    // 300 wide: the English breaks after "BELOW," like before; translations wrap and shrink as they need
    textBlock(ctx, t('g.sino.verifyFirst'), 6, LOG_Y + 8, 300, { lineHeight: LINE_H, maxHeight: TILE.y - 2 - (LOG_Y + 8), color: PALETTE.muted });
    return;
  }
  rows.slice(-LOG_LINES).forEach((row, i) => {
    const y = LOG_Y + i * LINE_H;
    box(ctx, MARK[row.verdict], 3, y, 3, 8);
    text(ctx, row.text, 9, y, { size: 8, color: row.verdict === 'unclear' ? PALETTE.muted : MARK[row.verdict] });
  });
}

// ---- tiles ------------------------------------------------------------------------------------------------------
const STRIPE: Record<CheckId, string> = { secret: PALETTE.navy, callback: PALETTE.coral, relative: PALETTE.goldDeep, hotline: PALETTE.navyDark };
const TICK: SpriteRows = ['.....X', '....XX', 'X..XX.', 'XXXX..', '.XX...'];
const CROSS: SpriteRows = ['X...X', '.X.X.', '..X..', '.X.X.', 'X...X'];
const QUERY: SpriteRows = ['.XXX.', 'X...X', '...X.', '..X..', '.....', '..X..'];
const VERDICT_SPRITE: Record<Verdict, SpriteRows> = { pass: TICK, fail: CROSS, unclear: QUERY };

export function drawCheckTile(ctx: CanvasRenderingContext2D, slot: number, state: { selected: boolean; verdict: Verdict | null; locked: boolean }): void {
  const id = CHECKS[slot];
  if (!id) return;
  const r = slotRect(slot);
  const info = CHECK_INFO[id];
  const tint = state.verdict === 'pass' ? PALETTE.factTint : state.verdict === 'fail' ? PALETTE.fakeTint : state.verdict === 'unclear' ? PALETTE.soft : PALETTE.surface;
  box(ctx, state.selected ? PALETTE.navy : PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, state.selected && state.verdict === null ? PALETTE.gold : tint, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  box(ctx, STRIPE[id], r.x + 2, r.y + 2, 3, r.h - 4);
  // the labels stop short of the verdict mark at the right edge (it used to cover the last letter: "OFFICIAC")
  const room = r.w - 8 - 13;
  text(ctx, info.line1, r.x + 8, r.y + 4, { size: 8, color: state.locked ? PALETTE.muted : PALETTE.ink, maxWidth: room });
  text(ctx, info.line2, r.x + 8, r.y + 14, { size: 8, color: PALETTE.muted, maxWidth: room });
  if (state.verdict) sprite(ctx, VERDICT_SPRITE[state.verdict], { X: MARK[state.verdict] }, r.x + r.w - 10, r.y + 4, 1);
  if (state.selected) frame(ctx, PALETTE.surface, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 1);
}

export function drawDecisionTile(ctx: CanvasRenderingContext2D, slot: number, state: { selected: boolean; locked: boolean }): void {
  const r = slotRect(slot);
  const help = slot === HELP_SLOT;
  box(ctx, PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, state.locked ? PALETTE.soft : help ? PALETTE.coral : PALETTE.navy, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  box(ctx, state.locked ? PALETTE.line : PALETTE.ink, r.x + 2, r.y + r.h - 5, r.w - 4, 3);
  text(ctx, t(help ? 'g.sino.help' : 'g.sino.hangup'), r.x + r.w / 2, r.y + 6, { size: 8, color: state.locked ? PALETTE.muted : help ? PALETTE.ink : PALETTE.surface, align: 'center' });
  if (state.selected) frame(ctx, state.locked ? PALETTE.muted : PALETTE.gold, r.x, r.y, r.w, r.h, 2);
}

// ---- the stamp --------------------------------------------------------------------------------------------------
/** "ARAW GAME · FAKE" on a revealed scam, "GENUINE CALL" on a real one. */
export function drawStamp(ctx: CanvasRenderingContext2D, scam: boolean): void {
  const label = measureLine(t(scam ? 'g.sino.stampFake' : 'g.sino.stampReal'), STAMP_MAX - 10);
  const w = label.width + 10;
  const color = scam ? PALETTE.fake : PALETTE.fact;
  box(ctx, color, 6, STRIP_Y + 12, w, 14);
  box(ctx, scam ? PALETTE.fakeTint : PALETTE.factTint, 8, STRIP_Y + 14, w - 4, 10);
  text(ctx, label.text, 6 + w / 2, STRIP_Y + 15, { size: 8, color, align: 'center', maxWidth: label.width });
}
