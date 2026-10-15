// Pixel art for Feed Mo 'To: the person scrolling, post cards, the meters and the topic bubble.
import { PALETTE, box, frame, sprite, text, type SpriteRows } from '../engine/draw';
import type { Post } from './posts';
import { TOPICS, topicById, type TopicId } from './rules';
import type { Look } from './users';

export const W = 320;
export const H = 180;

// ---- layout (logical pixels) ------------------------------------------------------------------------------------
export const CARD_Y = 82;
export const CARD_W = 100;
export const CARD_H = 68;
export const CARD_X = [6, 110, 214] as const;
const PANEL = { x: 150, y: 36, w: 164, h: 42 };

/** Index of the card under a logical point, or -1. */
export function cardAt(x: number, y: number): number {
  if (y < CARD_Y || y > CARD_Y + CARD_H) return -1;
  return CARD_X.findIndex((cx) => x >= cx - 2 && x <= cx + CARD_W + 2);
}

// ---- the person -------------------------------------------------------------------------------------------------
export type Face = 'happy' | 'bored' | 'worried';

const FACE_TOP: SpriteRows = ['..HHHHHHHH..', '.HHHHHHHHHH.', '.HHSSSSSSHH.', '.HSSSSSSSSH.', '.HSKSSSSKSH.', '.SSSSSSSSSS.'];
const FACE_MOUTH: Record<Face, SpriteRows> = {
  happy: ['..SMSSSSMS..', '..SSMMMMSS..'],
  bored: ['..SSMMMMSS..', '..SSSSSSSS..'],
  worried: ['..SSMMMMSS..', '..SMSSSSMS..'],
};
const BODY: SpriteRows = ['...TTTTTT...', '.TTTTTTTTTT.', '.TTTTTTTTTT.', '.TTTTTTTTTT.'];
const GLASSES_ROW = '.HKKSSSSKKH.';

export function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, look: Look, face: Face): void {
  const colors = { H: look.hair, S: look.skin, K: PALETTE.ink, M: PALETTE.ink, T: look.shirt };
  const top = FACE_TOP.map((row, i) => (look.glasses && i === 4 ? GLASSES_ROW : row));
  const rows = [...top, ...FACE_MOUTH[face], ...BODY];
  box(ctx, PALETTE.ink, x - 1, y - 1, 38, 38);
  box(ctx, PALETTE.cream, x, y, 36, 36);
  sprite(ctx, rows, colors, x, y, 3);
}

// ---- meters -----------------------------------------------------------------------------------------------------
/** Retro barber-pole bar. */
export function drawMeter(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, value: number, color: string): void {
  text(ctx, label, x, y, { size: 8, color: PALETTE.ink });
  box(ctx, PALETTE.ink, x, y + 10, w, 10);
  box(ctx, PALETTE.surface, x + 2, y + 12, w - 4, 6);
  const fill = Math.round(((w - 4) * value) / 100);
  box(ctx, color, x + 2, y + 12, fill, 6);
  for (let sx = x + 5; sx < x + 2 + fill; sx += 7) box(ctx, PALETTE.surface, sx, y + 12, 2, 6);
  // the "danger" line at 25%
  box(ctx, PALETTE.fake, x + 2 + Math.round((w - 4) * 0.25), y + 9, 1, 2);
  text(ctx, `${Math.round(value)}`, x + w, y, { size: 8, color: value <= 25 ? PALETTE.fake : PALETTE.muted, align: 'right' });
}

export const meterColor = (value: number): string => (value > 50 ? PALETTE.fact : value > 25 ? PALETTE.goldDeep : PALETTE.fake);

// ---- chips and the bubble -----------------------------------------------------------------------------------------
const CHIP_H = 12;
export const chipWidth = (id: TopicId): number => topicById(id).chip.length * 8 + 6;

interface ChipLook {
  fill: string;
  edge: string;
  ink: string;
}

function chipLook(id: TopicId, liked: boolean): ChipLook {
  if (id === 'scare') return { fill: PALETTE.fakeTint, edge: PALETTE.fake, ink: PALETTE.fake };
  if (id === 'miracle') return { fill: PALETTE.gold, edge: PALETTE.coral, ink: PALETTE.ink };
  if (id === 'clinic') return { fill: PALETTE.factTint, edge: PALETTE.fact, ink: PALETTE.fact };
  return liked ? { fill: PALETTE.gold, edge: PALETTE.ink, ink: PALETTE.ink } : { fill: PALETTE.surface, edge: PALETTE.muted, ink: PALETTE.muted };
}

export function drawChip(ctx: CanvasRenderingContext2D, id: TopicId, x: number, y: number, liked: boolean, dead: boolean): void {
  const look = chipLook(id, liked);
  const w = chipWidth(id);
  ctx.globalAlpha = dead ? 0.4 : 1;
  box(ctx, look.fill, x, y, w, CHIP_H);
  frame(ctx, look.edge, x, y, w, CHIP_H, 1);
  text(ctx, topicById(id).chip, x + w / 2, y + 2, { size: 8, color: look.ink, align: 'center' });
  if (dead) box(ctx, PALETTE.ink, x + 1, y + 5, w - 2, 1);
  ctx.globalAlpha = 1;
}

export interface Pos {
  x: number;
  y: number;
}

/** Centre `ids` in the bubble panel, wrapping into rows of at most 150px. Also returns the block size. */
export function layoutChips(ids: readonly TopicId[]): { pos: Map<TopicId, Pos>; w: number; h: number } {
  const rows: TopicId[][] = [[]];
  let rowW = 0;
  for (const id of ids) {
    const w = chipWidth(id) + 4;
    if (rowW + w > 154 && (rows[rows.length - 1] as TopicId[]).length > 0) {
      rows.push([]);
      rowW = 0;
    }
    (rows[rows.length - 1] as TopicId[]).push(id);
    rowW += w;
  }
  const pos = new Map<TopicId, Pos>();
  const blockH = rows.length * (CHIP_H + 2) - 2;
  const top = PANEL.y + Math.round((PANEL.h - blockH) / 2);
  let maxW = 0;
  rows.forEach((row, r) => {
    const width = row.reduce((sum, id) => sum + chipWidth(id) + 4, -4);
    maxW = Math.max(maxW, width);
    let x = PANEL.x + Math.round((PANEL.w - width) / 2);
    for (const id of row) {
      pos.set(id, { x, y: top + r * (CHIP_H + 2) });
      x += chipWidth(id) + 4;
    }
  });
  return { pos, w: maxW, h: blockH };
}

export const ALL_TOPICS: readonly TopicId[] = TOPICS.map((t) => t.id);
export const GRID = layoutChips(ALL_TOPICS).pos;

/** Radii of a bubble that just fits the chips (the ellipse around a rectangle). */
export function bubbleRadii(w: number, h: number): { rx: number; ry: number } {
  return { rx: Math.round((w / 2) * 1.41) + 6, ry: Math.round((h / 2) * 1.41) + 4 };
}

function ellipse(ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, rx: number, ry: number): void {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
    box(ctx, color, cx - half, cy + dy, half * 2, 1);
  }
}

/**
 * The bubble panel: a sunken strip with the bubble (a stepped ellipse, clipped to the strip) drawn inside it.
 * `paintOutside` paints the chips that were squeezed out (the bubble covers them where it overlaps); `paintInside` paints the chips still in.
 */
export function drawBubble(ctx: CanvasRenderingContext2D, rx: number, ry: number, tight: boolean, paintOutside: () => void, paintInside: () => void): void {
  box(ctx, PALETTE.ink, PANEL.x - 2, PANEL.y - 2, PANEL.w + 4, PANEL.h + 4);
  box(ctx, PALETTE.soft, PANEL.x, PANEL.y, PANEL.w, PANEL.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
  ctx.clip();
  const cx = PANEL.x + PANEL.w / 2;
  const cy = PANEL.y + PANEL.h / 2;
  paintOutside();
  ellipse(ctx, tight ? PALETTE.fake : PALETTE.navy, cx, cy, rx, ry);
  ellipse(ctx, tight ? PALETTE.fakeTint : PALETTE.navyTint, cx, cy, Math.max(1, rx - 2), Math.max(1, ry - 2));
  paintInside();
  ctx.restore();
}

export const PANEL_LABEL = { x: PANEL.x, y: 26 };

// ---- cards ------------------------------------------------------------------------------------------------------
function topicBar(id: TopicId): { fill: string; ink: string } {
  if (id === 'scare') return { fill: PALETTE.fake, ink: PALETTE.surface };
  if (id === 'miracle') return { fill: PALETTE.coral, ink: PALETTE.ink };
  if (id === 'clinic') return { fill: PALETTE.fact, ink: PALETTE.surface };
  return { fill: PALETTE.navy, ink: PALETTE.surface };
}

export interface CardState {
  selected: boolean;
  /** The post was revealed: stamp fakes, mark trusted tips. */
  revealed: boolean;
  /** Dim this card (a revealed card that was not picked). */
  dim: boolean;
  /** Predicted clicks, 1 to 3. */
  pips: number;
}

export function drawCard(ctx: CanvasRenderingContext2D, x: number, post: Post, state: CardState): void {
  const y = CARD_Y;
  box(ctx, PALETTE.line, x + 3, y + 3, CARD_W, CARD_H);
  box(ctx, state.selected ? PALETTE.gold : PALETTE.surface, x, y, CARD_W, CARD_H);
  frame(ctx, state.selected ? PALETTE.navy : PALETTE.ink, x, y, CARD_W, CARD_H, state.selected ? 3 : 2);
  const bar = topicBar(post.topic);
  const inset = state.selected ? 3 : 2;
  box(ctx, bar.fill, x + inset, y + inset, CARD_W - inset * 2, 10);
  text(ctx, topicById(post.topic).chip, x + CARD_W / 2, y + inset + 1, { size: 8, color: bar.ink, align: 'center' });
  post.lines.forEach((line, i) => text(ctx, line, x + CARD_W / 2, y + 17 + i * 10, { size: 8, color: PALETTE.ink, align: 'center' }));

  const py = y + CARD_H - 11;
  text(ctx, 'CLICKS', x + 6, py - 1, { size: 8, color: PALETTE.muted });
  for (let i = 0; i < 3; i++) box(ctx, i < state.pips ? PALETTE.goldDeep : PALETTE.line, x + CARD_W - 36 + i * 11, py, 9, 6);

  if (state.revealed) {
    if (post.fake) {
      box(ctx, PALETTE.fakeTint, x + 6, y + 28, CARD_W - 12, 26);
      frame(ctx, PALETTE.fake, x + 6, y + 28, CARD_W - 12, 26, 2);
      text(ctx, 'ARAW GAME', x + CARD_W / 2, y + 33, { size: 8, color: PALETTE.fake, align: 'center' });
      text(ctx, '· FAKE ·', x + CARD_W / 2, y + 43, { size: 8, color: PALETTE.fake, align: 'center' });
    } else if (post.topic === 'clinic') {
      box(ctx, PALETTE.factTint, x + 6, y + 28, CARD_W - 12, 26);
      frame(ctx, PALETTE.fact, x + 6, y + 28, CARD_W - 12, 26, 2);
      text(ctx, 'TRUSTED', x + CARD_W / 2, y + 33, { size: 8, color: PALETTE.fact, align: 'center' });
      text(ctx, 'HEALTH TIP', x + CARD_W / 2, y + 43, { size: 8, color: PALETTE.fact, align: 'center' });
    }
  }
  if (state.dim) {
    ctx.globalAlpha = 0.55;
    box(ctx, PALETTE.cream, x, y, CARD_W + 3, CARD_H + 3);
    ctx.globalAlpha = 1;
  }
}

/** A banner panel over the cards (new user, summary, crash). */
export function drawBanner(ctx: CanvasRenderingContext2D, lines: ReadonlyArray<{ text: string; color?: string }>, tone: 'navy' | 'fake' = 'navy'): void {
  const x = 6;
  const w = W - 12;
  box(ctx, PALETTE.line, x + 3, CARD_Y + 3, w, CARD_H);
  box(ctx, PALETTE.surface, x, CARD_Y, w, CARD_H);
  frame(ctx, tone === 'fake' ? PALETTE.fake : PALETTE.navy, x, CARD_Y, w, CARD_H, 3);
  const lineH = 12;
  const top = CARD_Y + Math.round((CARD_H - lines.length * lineH + 4) / 2);
  lines.forEach((line, i) => text(ctx, line.text, W / 2, top + i * lineH, { size: 8, color: line.color ?? PALETTE.ink, align: 'center' }));
}
