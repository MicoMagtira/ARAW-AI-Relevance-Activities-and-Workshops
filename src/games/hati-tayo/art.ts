// Layout and pixel art for Hati Tayo!: the queue tiles, the task card, the message strip and the two lanes.
import { t } from '../../app/i18n';
import { PALETTE, box, drawBlock, frame, measureBlock, sprite, text, wrapLines, type SpriteRows } from '../engine/draw';
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
/** Characters per line on the task card and in the message strip at the 8 px font (translations wrap, then shrink). */
export const CARD_CHARS = 36;
export const CARD_LINES = 3;
export const STRIP_CHARS = 36;
export const STRIP_LINES = 2;
const LINE_W = CARD_CHARS * 8;

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
  // the day counter keeps its size; the place name gets the rest of the line
  const used = text(ctx, t('g.hati.header.day', { day, done: total - left, total }), W - 6, HEADER_Y, { size: 8, color: PALETTE.ink, align: 'right' });
  text(ctx, header, 6, HEADER_Y, { size: 8, color: PALETTE.navy, maxWidth: W - 12 - used - 8 });
}

/**
 * A task's short name on a tile-sized card whose top is `top`, above its patience bar: one line at 8 px (or 7), else
 * two lines at 6 px. Only a single over-long word is squeezed.
 */
function drawShort(ctx: CanvasRenderingContext2D, short: string, cx: number, top: number, width: number): void {
  const block = measureBlock(short, width, { maxHeight: 14 });
  const y = block.lines.length === 1 ? top + 6 + Math.floor((8 - block.size) / 2) : top + 3;
  drawBlock(ctx, block, cx, y, { color: PALETTE.ink, align: 'center', maxWidth: width });
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
  drawShort(ctx, waiting.task.short, r.x + r.w / 2, r.y, r.w - 4);
  bar(ctx, r.x + 6, r.y + 18, r.w - 12, 6, left, patienceColor(left));
}

export function drawCard(ctx: CanvasRenderingContext2D, waiting: Waiting | undefined, idleText: string): void {
  box(ctx, PALETTE.ink, CARD.x, CARD.y, CARD.w, CARD.h);
  box(ctx, PALETTE.surface, CARD.x + 2, CARD.y + 2, CARD.w - 4, CARD.h - 4);
  if (!waiting) {
    text(ctx, idleText, CARD.x + CARD.w / 2, CARD.y + 18, { size: 8, color: PALETTE.muted, align: 'center' });
    return;
  }
  // up to three lines between the top edge and the patience bar
  const block = measureBlock(waiting.task.text, LINE_W, { lineHeight: 10, maxLines: CARD_LINES, maxHeight: CARD.h - 16 });
  drawBlock(ctx, block, CARD.x + 8, CARD.y + 6, { color: PALETTE.ink });
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
    drawBlock(ctx, measureBlock(hint, LINE_W, { lineHeight: 10, maxLines: 3, maxHeight: STRIP.h - 6 }), STRIP.x + 8, STRIP.y + 4, { color: PALETTE.muted });
    return;
  }
  // head and line shrink together until the whole line fits under the head (2 lines at 8 px, 3 at 6 px)
  for (const size of [8, 7, 6]) {
    const top = size === 8 ? 4 : 3;
    const linesTop = top + size + 2;
    const pitch = size === 8 ? 9 : size + 1;
    const width = size === 8 ? LINE_W : STRIP.w - 16;
    const block = measureBlock(flash.line, width, { size, minSize: size, lineHeight: pitch, maxHeight: STRIP.h - 2 - linesTop });
    const whole = block.lines.join(' ') === wrapLines(flash.line, width, size).join(' ');
    if (!whole && size > 6) continue;
    text(ctx, flash.head, STRIP.x + 8, STRIP.y + top, { size, color: c.ink, maxWidth: STRIP.w - 16 });
    drawBlock(ctx, block, STRIP.x + 8, STRIP.y + linesTop, { color: PALETTE.ink, maxWidth: width });
    return;
  }
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
    text(ctx, t('g.hati.lane.ai'), r.x + 44, r.y + 6, { size: 8, color: PALETTE.navy });
    text(ctx, t('g.hati.lane.leftKey'), r.x + 44, r.y + 18, { size: 8, color: PALETTE.muted });
    text(ctx, working && s.aiTask ? t('g.hati.lane.done', { task: s.aiTask.short }) : t('g.hati.lane.ready'), r.x + 44, r.y + 30, { size: 8, color: working ? PALETTE.fact : PALETTE.ink });
    text(ctx, t('g.hati.lane.instant'), r.x + 44, r.y + 42, { size: 8, color: PALETTE.muted });
    return;
  }
  const shirt = s.setting === 'bhw' ? PALETTE.fact : PALETTE.coral;
  const job = s.jobs[0];
  sprite(ctx, WORKER, { h: PALETTE.ink, s: '#d99a6c', k: PALETTE.ink, m: PALETTE.fake, t: shirt }, r.x + 8, r.y + 10 + (job ? bob : 0), 3);
  text(ctx, t('g.hati.lane.person'), r.x + 44, r.y + 6, { size: 8, color: PALETTE.navy });
  text(ctx, t('g.hati.lane.rightKey'), r.x + 44, r.y + 18, { size: 8, color: PALETTE.muted });
  text(ctx, job ? job.task.short : t('g.hati.lane.free'), r.x + 44, r.y + 30, { size: 8, color: job ? PALETTE.ink : PALETTE.fact });
  if (job) {
    bar(ctx, r.x + 44, r.y + 43, 62, 6, 1 - job.remainingMs / job.totalMs, job.slow ? PALETTE.goldDeep : PALETTE.fact);
    for (let i = 1; i < s.jobs.length; i++) box(ctx, PALETTE.navy, r.x + 108 + (i - 1) * 10, r.y + 43, 8, 6);
  } else {
    text(ctx, t('g.hati.lane.slowCaring'), r.x + 44, r.y + 42, { size: 8, color: PALETTE.muted });
  }
}

/** A card-sized ghost that follows the pointer while dragging a task. */
export function drawGhost(ctx: CanvasRenderingContext2D, task: Task, x: number, y: number): void {
  box(ctx, PALETTE.ink, x - 30, y - 15, TILE.w, TILE.h);
  box(ctx, PALETTE.gold, x - 28, y - 13, TILE.w - 4, TILE.h - 4);
  drawShort(ctx, task.short, x, y - 15, TILE.w - 4);
}

export interface PanelRow {
  text: string;
  color?: string;
  /** A number shown right-aligned on the same line (the text is then a label and stays on one line). */
  value?: string;
  /** Wrap width for this row (logical px); rows wrap onto more lines when a translation is long. */
  width?: number;
}

const PANEL: Rect = { x: 12, y: 14, w: 296, h: 152 };
const PANEL_ROW_W = PANEL.w - 16;
const PANEL_TOP = 24;
/** Rows stay above the footer line. */
const PANEL_ROOM = PANEL.h - 12 - PANEL_TOP - 2;

interface LaidRow {
  row: PanelRow;
  lines: number;
  block: ReturnType<typeof measureBlock> | null;
}

/** Lay the rows out at one size for all of them, the largest (from 8 px down) at which they fit above the footer. */
function layRows(rows: readonly PanelRow[]): { size: number; pitch: number; laid: LaidRow[] } {
  let best: { size: number; pitch: number; laid: LaidRow[] } | null = null;
  for (const size of [8, 7, 6]) {
    const pitch = size + 2;
    const laid = rows.map((row): LaidRow => {
      if (row.text === '' || row.value !== undefined) return { row, lines: 1, block: null };
      const block = measureBlock(row.text, row.width ?? PANEL_ROW_W, { size, minSize: size, lineHeight: pitch });
      return { row, lines: block.lines.length, block };
    });
    best = { size, pitch, laid };
    const height = laid.reduce((sum, l) => sum + l.lines, 0) * pitch;
    if (height - 2 <= PANEL_ROOM) break;
  }
  return best as { size: number; pitch: number; laid: LaidRow[] };
}

/** A centred panel for the day intro, the day-end report and the game-over screen. */
export function drawPanel(ctx: CanvasRenderingContext2D, title: string, rows: readonly PanelRow[], footer: string): void {
  const r = PANEL;
  box(ctx, PALETTE.ink, r.x + 4, r.y + 4, r.w, r.h);
  box(ctx, PALETTE.ink, r.x, r.y, r.w, r.h);
  box(ctx, PALETTE.cream, r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  box(ctx, PALETTE.gold, r.x + 2, r.y + 2, r.w - 4, 16);
  text(ctx, title, r.x + r.w / 2, r.y + 6, { size: 8, color: PALETTE.navy, align: 'center', maxWidth: r.w - 12 });
  const { size, pitch, laid } = layRows(rows);
  const left = r.x + 10;
  const right = r.x + r.w - 14;
  let y = r.y + PANEL_TOP;
  for (const { row, lines, block } of laid) {
    const color = row.color ?? PALETTE.ink;
    if (row.value !== undefined) {
      const used = text(ctx, row.value, right, y, { size, color, align: 'right' });
      text(ctx, row.text, left, y, { size, color, maxWidth: right - left - used - 8 });
    } else if (block) drawBlock(ctx, block, left, y, { color });
    y += lines * pitch;
  }
  text(ctx, footer, r.x + r.w / 2, r.y + r.h - 12, { size: 8, color: PALETTE.navy, align: 'center', maxWidth: r.w - 12 });
}
