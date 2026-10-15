// Layout and pixel art for Hati Tayo!: the queue tiles, the task card, the message strip and the two lanes.
import { PALETTE, box, frame, sprite, text, type SpriteRows } from '../engine/draw';
import { wrapText } from '../luto-ni-ara/art';
import { QUEUE_CAP } from './rules';
import type { Flash, Job, Waiting } from './sim';
import type { Lane, Setting, Task } from './tasks';

export const W = 320;
export const H = 180;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const inside = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

// ---- layout (logical pixels) ------------------------------------------------------------------------------------
export const HEADER_Y = 2;
export const TILE = { x: 6, y: 14, w: 60, h: 28, gap: 2 };
export const CARD: Rect = { x: 4, y: 44, w: 312, h: 44 };
export const STRIP: Rect = { x: 4, y: 90, w: 312, h: 34 };
export const LANE_RECT: Readonly<Record<Lane, Rect>> = {
  ai: { x: 4, y: 124, w: 154, h: 54 },
  human: { x: 162, y: 124, w: 154, h: 54 },
};
/** A drag counts as dropped on a lane anywhere below this line, on that lane's half of the screen. */
export const DROP_Y = 90;
/** Characters per line on the task card and in the message strip (the pixel font is 8 px wide). */
export const CARD_CHARS = 36;
export const CARD_LINES = 3;
export const STRIP_CHARS = 36;
export const STRIP_LINES = 2;

export const tileRect = (i: number): Rect => ({ x: TILE.x + i * (TILE.w + TILE.gap), y: TILE.y, w: TILE.w, h: TILE.h });

/** Queue tile under a logical point (the gaps count, to make small screens easier to tap), or -1. */
export function tileAt(x: number, y: number): number {
  if (y < TILE.y || y >= TILE.y + TILE.h) return -1;
  const i = Math.floor((x - TILE.x + TILE.gap / 2) / (TILE.w + TILE.gap));
  return i >= 0 && i < QUEUE_CAP ? i : -1;
}

/** The lane a point drops on (or taps), or null above the lanes. */
export const laneAt = (x: number, y: number): Lane | null => (y < DROP_Y ? null : x < W / 2 ? 'ai' : 'human');

// ---- sprites ------------------------------------------------------------------------------------------------------
const ROBOT: SpriteRows = ['....cc....', '..bbbbbb..', '.bbbbbbbb.', '.bwwbbwwb.', '.bwkbbwkb.', '.bbbbbbbb.', '.bdddddbb.', '..bbbbbb..', '.bbbbbbbb.'];
const WORKER: SpriteRows = ['..hhhhhh..', '.hhhhhhhh.', '.hssssssh.', '.ssksskss.', '.ssssssss.', '..ssmmss..', '.tttttttt.', 'tttttttttt', 'tttttttttt'];

const patienceColor = (left: number): string => (left > 0.5 ? PALETTE.fact : left > 0.25 ? PALETTE.goldDeep : PALETTE.fake);

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, share: number, color: string): void {
  box(ctx, PALETTE.ink, x, y, w, h);
  box(ctx, PALETTE.soft, x + 1, y + 1, w - 2, h - 2);
  box(ctx, color, x + 1, y + 1, Math.round((w - 2) * Math.min(1, Math.max(0, share))), h - 2);
}

export function drawHeader(ctx: CanvasRenderingContext2D, header: string, day: number, left: number, total: number): void {
  text(ctx, header, 6, HEADER_Y, { size: 8, color: PALETTE.navy });
  text(ctx, `DAY ${day}  ${total - left}/${total}`, W - 6, HEADER_Y, { size: 8, color: PALETTE.ink, align: 'right' });
}

export function drawTile(ctx: CanvasRenderingContext2D, i: number, waiting: Waiting | undefined, selected: boolean): void {
  const r = tileRect(i);
  if (!waiting) {
    frame(ctx, PALETTE.line, r.x, r.y, r.w, r.h, 1);
    return;
  }
  const left = 1 - waiting.waitedMs / waiting.patienceMs;
  box(ctx, selected ? PALETTE.ink : PALETTE.navy, r.x, r.y, r.w, r.h);
  box(ctx, selected ? PALETTE.gold : PALETTE.surface, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  text(ctx, waiting.task.short, r.x + r.w / 2, r.y + 6, { size: 8, color: PALETTE.ink, align: 'center' });
  bar(ctx, r.x + 6, r.y + 18, r.w - 12, 6, left, patienceColor(left));
}

export function drawCard(ctx: CanvasRenderingContext2D, waiting: Waiting | undefined, idleText: string): void {
  box(ctx, PALETTE.ink, CARD.x, CARD.y, CARD.w, CARD.h);
  box(ctx, PALETTE.surface, CARD.x + 2, CARD.y + 2, CARD.w - 4, CARD.h - 4);
  if (!waiting) {
    text(ctx, idleText, CARD.x + CARD.w / 2, CARD.y + 18, { size: 8, color: PALETTE.muted, align: 'center' });
    return;
  }
  wrapText(waiting.task.text, CARD_CHARS)
    .slice(0, CARD_LINES)
    .forEach((line, i) => text(ctx, line, CARD.x + 8, CARD.y + 6 + i * 10, { size: 8, color: PALETTE.ink }));
  const left = 1 - waiting.waitedMs / waiting.patienceMs;
  bar(ctx, CARD.x + 8, CARD.y + CARD.h - 9, CARD.w - 16, 5, left, patienceColor(left));
}

const FLASH_COLORS: Record<Flash['kind'], { fill: string; edge: string; ink: string }> = {
  good: { fill: PALETTE.factTint, edge: PALETTE.fact, ink: PALETTE.fact },
  fail: { fill: PALETTE.fakeTint, edge: PALETTE.fake, ink: PALETTE.fake },
  slow: { fill: PALETTE.soft, edge: PALETTE.goldDeep, ink: PALETTE.navy },
  missed: { fill: PALETTE.fakeTint, edge: PALETTE.fake, ink: PALETTE.fake },
  full: { fill: PALETTE.fakeTint, edge: PALETTE.fake, ink: PALETTE.fake },
  busy: { fill: PALETTE.soft, edge: PALETTE.goldDeep, ink: PALETTE.navy },
};

export function drawStrip(ctx: CanvasRenderingContext2D, flash: Flash | null, hint: string): void {
  const c = flash ? FLASH_COLORS[flash.kind] : { fill: PALETTE.cream, edge: PALETTE.line, ink: PALETTE.muted };
  box(ctx, c.edge, STRIP.x, STRIP.y, STRIP.w, STRIP.h);
  box(ctx, c.fill, STRIP.x + 2, STRIP.y + 2, STRIP.w - 4, STRIP.h - 4);
  if (!flash) {
    wrapText(hint, STRIP_CHARS)
      .slice(0, 3)
      .forEach((line, i) => text(ctx, line, STRIP.x + 8, STRIP.y + 4 + i * 8, { size: 8, color: PALETTE.muted }));
    return;
  }
  text(ctx, flash.head, STRIP.x + 8, STRIP.y + 4, { size: 8, color: c.ink });
  wrapText(flash.line, STRIP_CHARS)
    .slice(0, STRIP_LINES)
    .forEach((line, i) => text(ctx, line, STRIP.x + 8, STRIP.y + 14 + i * 9, { size: 8, color: PALETTE.ink }));
}

export interface LaneState {
  hover: boolean;
  /** The AI lane: ms left of its work animation, and the task it is on. */
  aiMs: number;
  aiTask: Task | null;
  /** The person's jobs, the first one in hand. */
  jobs: readonly Job[];
  setting: Setting;
  /** Animation frame counter (steps of 150 ms). */
  tick: number;
}

export function drawLane(ctx: CanvasRenderingContext2D, lane: Lane, s: LaneState): void {
  const r = LANE_RECT[lane];
  box(ctx, PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, s.hover ? PALETTE.gold : PALETTE.surface, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  const bob = s.tick % 2 === 0 ? 0 : 1;
  if (lane === 'ai') {
    const working = s.aiMs > 0;
    sprite(ctx, ROBOT, { c: PALETTE.coral, b: PALETTE.navy, w: PALETTE.cream, k: PALETTE.ink, d: PALETTE.goldDeep }, r.x + 8, r.y + 10 + (working ? bob : 0), 3);
    text(ctx, 'AI HELPER', r.x + 44, r.y + 6, { size: 8, color: PALETTE.navy });
    text(ctx, 'LEFT KEY', r.x + 44, r.y + 18, { size: 8, color: PALETTE.muted });
    text(ctx, working && s.aiTask ? `DONE: ${s.aiTask.short}` : 'READY', r.x + 44, r.y + 30, { size: 8, color: working ? PALETTE.fact : PALETTE.ink });
    text(ctx, 'INSTANT', r.x + 44, r.y + 42, { size: 8, color: PALETTE.muted });
    return;
  }
  const shirt = s.setting === 'bhw' ? PALETTE.fact : PALETTE.coral;
  const job = s.jobs[0];
  sprite(ctx, WORKER, { h: PALETTE.ink, s: '#d99a6c', k: PALETTE.ink, m: PALETTE.fake, t: shirt }, r.x + 8, r.y + 10 + (job ? bob : 0), 3);
  text(ctx, 'PERSON', r.x + 44, r.y + 6, { size: 8, color: PALETTE.navy });
  text(ctx, 'RIGHT KEY', r.x + 44, r.y + 18, { size: 8, color: PALETTE.muted });
  text(ctx, job ? job.task.short : 'FREE', r.x + 44, r.y + 30, { size: 8, color: job ? PALETTE.ink : PALETTE.fact });
  if (job) {
    bar(ctx, r.x + 44, r.y + 43, 62, 6, 1 - job.remainingMs / job.totalMs, job.slow ? PALETTE.goldDeep : PALETTE.fact);
    for (let i = 1; i < s.jobs.length; i++) box(ctx, PALETTE.navy, r.x + 108 + (i - 1) * 10, r.y + 43, 8, 6);
  } else {
    text(ctx, 'SLOW, CARING', r.x + 44, r.y + 42, { size: 8, color: PALETTE.muted });
  }
}

/** A card-sized ghost that follows the pointer while dragging a task. */
export function drawGhost(ctx: CanvasRenderingContext2D, task: Task, x: number, y: number): void {
  box(ctx, PALETTE.ink, x - 30, y - 15, TILE.w, TILE.h);
  box(ctx, PALETTE.gold, x - 28, y - 13, TILE.w - 4, TILE.h - 4);
  text(ctx, task.short, x, y - 9, { size: 8, color: PALETTE.ink, align: 'center' });
}

export interface PanelRow {
  text: string;
  color?: string;
}

/** A centred panel for the day intro, the day-end report and the game-over screen. */
export function drawPanel(ctx: CanvasRenderingContext2D, title: string, rows: readonly PanelRow[], footer: string): void {
  const r: Rect = { x: 12, y: 14, w: 296, h: 152 };
  box(ctx, PALETTE.ink, r.x + 4, r.y + 4, r.w, r.h);
  box(ctx, PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, PALETTE.cream, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  box(ctx, PALETTE.gold, r.x + 2, r.y + 2, r.w - 4, 16);
  text(ctx, title, r.x + r.w / 2, r.y + 6, { size: 8, color: PALETTE.navy, align: 'center' });
  rows.forEach((row, i) => text(ctx, row.text, r.x + 10, r.y + 24 + i * 10, { size: 8, color: row.color ?? PALETTE.ink }));
  text(ctx, footer, r.x + r.w / 2, r.y + r.h - 12, { size: 8, color: PALETTE.navy, align: 'center' });
}
