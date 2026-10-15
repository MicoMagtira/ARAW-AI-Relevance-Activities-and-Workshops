// Layout and pixel art for Tawid, Lola!: the AI guide's bubble, the Trust Meter strip, the street, Lola, the vehicles, the
// health center and the four control tiles. Everything is drawn from whole-pixel boxes and sprites.
import { PALETTE, box, sprite, text, type SpriteRows } from '../engine/draw';
import { COLS, COL_W, VEHICLES, type Advice, type LaneKind, type VehicleId } from './lanes';

export const W = 320;
export const H = 180;

// ---- layout (logical pixels) ------------------------------------------------------------------------------------
export const BUBBLE = { x: 32, y: 2, w: 286, h: 30 };
export const BUBBLE_CHARS = 33;
export const STATUS_Y = 35;
export const METER = { x: 50, y: 37, w: 56, h: 7 };
export const MSG_X = 112;
export const MSG_CHARS = 25;
export const FIELD_Y = 46;
export const ROW_H = 16;
export const ROWS = 6;
/** Lola stands in this row of the view (0 is the top), so the lanes ahead are visible. */
export const LOLA_ROW = 4;
export const TILE = { y: 147, h: 31 };

export type Command = 'left' | 'back' | 'go' | 'right' | 'wait';
/** The four control tiles, left to right. */
export const TILES: ReadonlyArray<{ command: Command; label: string; x: number; w: number }> = [
  { command: 'left', label: '', x: 3, w: 40 },
  { command: 'wait', label: 'WAIT', x: 47, w: 110 },
  { command: 'go', label: 'GO', x: 161, w: 110 },
  { command: 'right', label: '', x: 275, w: 42 },
];

export const tileAt = (x: number, y: number): number => (y < TILE.y || y >= TILE.y + TILE.h ? -1 : TILES.findIndex((t) => x >= t.x && x < t.x + t.w));

/** What a tap or click at a logical point means: a tile, or (in the street) a direction from Lola's feet. */
export function commandAt(x: number, y: number, lola: { x: number; y: number }): Command | null {
  const tile = tileAt(x, y);
  if (tile >= 0) return (TILES[tile] as (typeof TILES)[number]).command;
  if (y < FIELD_Y || y >= FIELD_Y + ROWS * ROW_H) return null;
  const dx = x - (lola.x + COL_W / 2);
  const dy = y - (lola.y + ROW_H / 2);
  if (Math.abs(dx) <= COL_W / 2 && Math.abs(dy) <= ROW_H / 2) return 'wait';
  if (Math.abs(dx) > Math.abs(dy) * 1.5) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'go' : 'back';
}

/** Screen y of the top of a lane, `rel` lanes ahead of the camera lane (the one Lola's row shows). */
export const rowY = (rel: number): number => Math.round(FIELD_Y + (LOLA_ROW - rel) * ROW_H);

/** Split text into lines of at most `max` characters, breaking at spaces. */
export function wrapText(value: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(' ')) {
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

// ---- the street -------------------------------------------------------------------------------------------------
export function drawLane(ctx: CanvasRenderingContext2D, kind: LaneKind, y: number): void {
  if (kind === 'road') {
    box(ctx, PALETTE.muted, 0, y, W, ROW_H);
    box(ctx, PALETTE.ink, 0, y, W, 1);
    box(ctx, PALETTE.ink, 0, y + ROW_H - 1, W, 1);
    for (let x = 6; x < W; x += 24) box(ctx, PALETTE.cream, x, y + 7, 10, 2);
    return;
  }
  box(ctx, PALETTE.factTint, 0, y, W, ROW_H);
  // little tufts, the same on every redraw
  for (let x = 5; x < W; x += 19) box(ctx, PALETTE.fact, x + ((y >> 4) % 3) * 4, y + 3 + ((x >> 3) % 3) * 4, 2, 1);
  if (kind === 'start') {
    box(ctx, PALETTE.ink, 6, y + 2, 46, 12);
    box(ctx, PALETTE.goldDeep, 7, y + 3, 44, 10);
    text(ctx, 'START', 10, y + 4, { size: 8, color: PALETTE.ink });
  }
}

const COLORS: Record<VehicleId, { body: string; stripe: string }> = {
  motor: { body: PALETTE.ink, stripe: PALETTE.coral },
  trike: { body: PALETTE.coral, stripe: PALETTE.ink },
  car: { body: PALETTE.fact, stripe: PALETTE.factTint },
  jeep: { body: PALETTE.goldDeep, stripe: PALETTE.navy },
  bus: { body: PALETTE.navy, stripe: PALETTE.gold },
};

/** A vehicle seen from the side. `dir` is where it is heading; the lights are at the front. */
export function drawVehicle(ctx: CanvasRenderingContext2D, id: VehicleId, x: number, y: number, dir: 1 | -1): void {
  const { w } = VEHICLES[id];
  const c = COLORS[id];
  const top = y + (id === 'motor' ? 6 : 3);
  const h = id === 'motor' ? 7 : 10;
  box(ctx, PALETTE.ink, x, top, w, h);
  box(ctx, c.body, x + 1, top + 1, w - 2, h - 2);
  if (id !== 'motor') {
    for (let wx = x + 3; wx + 4 <= x + w - 3; wx += 7) box(ctx, PALETTE.surface, wx, top + 2, 4, 3);
    box(ctx, c.stripe, x + 1, top + h - 4, w - 2, 1);
  } else {
    box(ctx, c.stripe, x + 3, top + 1, 4, 2);
  }
  const front = dir > 0 ? x + w - 2 : x;
  box(ctx, PALETTE.surface, front, top + 2, 2, 2);
  box(ctx, PALETTE.ink, x + 2, top + h, 3, 2);
  box(ctx, PALETTE.ink, x + w - 5, top + h, 3, 2);
}

// ---- Lola and the health center ----------------------------------------------------------------------------------
const LOLA: SpriteRows = ['..HHHH....', '.HHHHHH...', '.HSSSSH...', '.SKSSKS...', '..SSSS....', '.GGGGGG...', 'GGGGGGGG..', 'GGGGGGGG.C', 'GGGGGGGG.C', '.DDDDDD..C', '.DDDDDD..C', '.DDDDDD..C', '..K..K....', '..K..K....'];
const LOLA_COLORS = { H: '#c9c9d6', S: '#e2a77e', K: PALETTE.ink, G: PALETTE.fact, D: PALETTE.navy, C: '#8a5a2b' };

/** Lola (grandmother) with a shawl and a cane. `lift` raises her for the hop. */
export function drawLola(ctx: CanvasRenderingContext2D, x: number, y: number, lift: number, bumped: boolean): void {
  box(ctx, PALETTE.ink, x + 3, y + ROW_H - 2, 10, 1); // shadow line on the ground
  sprite(ctx, LOLA, bumped ? { ...LOLA_COLORS, G: PALETTE.coral } : LOLA_COLORS, x + 3, y + 1 - lift);
}

/** The health center: a white building with a navy roof, a sign and a red cross, standing on the last lane. */
export function drawClinic(ctx: CanvasRenderingContext2D, y: number): void {
  const x = 96;
  box(ctx, PALETTE.ink, x - 1, y - 21, 130, 38);
  box(ctx, PALETTE.navy, x, y - 20, 128, 10);
  text(ctx, 'HEALTH CENTER', x + 12, y - 18, { size: 8, color: PALETTE.cream });
  box(ctx, PALETTE.surface, x, y - 10, 128, 26);
  box(ctx, PALETTE.fake, x + 12, y - 8, 12, 4);
  box(ctx, PALETTE.fake, x + 16, y - 12 + 2, 4, 12);
  box(ctx, PALETTE.gold, x + 52, y - 4, 24, 20);
  box(ctx, PALETTE.ink, x + 52, y - 4, 24, 1);
  box(ctx, PALETTE.ink, x + 63, y - 4, 2, 20);
  box(ctx, PALETTE.navyTint, x + 90, y - 6, 12, 8);
  box(ctx, PALETTE.navyTint, x + 108, y - 6, 12, 8);
}

// ---- the AI guide ------------------------------------------------------------------------------------------------
const ROBOT: SpriteRows = ['.....KK.....', '.....NN.....', '..NNNNNNNN..', '.NNNNNNNNNN.', '.NWWWWWWWWN.', '.NWKWWWWKWN.', '.NWWWWWWWWN.', '.NWWKKKKWWN.', '.NNNNNNNNNN.', '..NNNNNNNN..', '..N......N..'];

/** The guide's face in the corner of the bubble. */
export function drawRobot(ctx: CanvasRenderingContext2D, tick: number): void {
  const blink = tick % 16 === 0;
  sprite(ctx, ROBOT, { K: PALETTE.ink, N: PALETTE.navy, W: blink ? PALETTE.navyTint : PALETTE.cream }, 4, 5, 2);
}

export function drawBubble(ctx: CanvasRenderingContext2D, advice: Advice | null, calm: string, tick: number): void {
  const { x, y, w, h } = BUBBLE;
  box(ctx, PALETTE.ink, x, y + 1, w + 2, h); // hard drop shadow
  box(ctx, PALETTE.ink, x - 1, y - 1, w + 2, h + 2);
  box(ctx, PALETTE.surface, x, y, w, h);
  // the pointer toward the robot
  box(ctx, PALETTE.ink, x - 4, y + 12, 4, 6);
  box(ctx, PALETTE.surface, x - 3, y + 13, 4, 4);
  text(ctx, 'AI GUIDE', x + 6, y + 3, { size: 8, color: PALETTE.muted });
  if (advice) {
    const color = advice.go ? PALETTE.fact : PALETTE.fake;
    const label = advice.headline;
    const chipW = label.length * 8 + 6;
    box(ctx, color, x + 78, y + 1, chipW, 11);
    text(ctx, label, x + 81, y + 3, { size: 8, color: PALETTE.surface });
    text(ctx, `${advice.confidence}% SURE`, x + 78 + chipW + 6, y + 3, { size: 8, color: PALETTE.ink });
    text(ctx, advice.reason, x + 6, y + 17, { size: 8, color: PALETTE.ink });
  } else {
    box(ctx, PALETTE.fact, x + 78, y + 1, 30, 11);
    text(ctx, 'GO!', x + 81, y + 3, { size: 8, color: PALETTE.surface });
    text(ctx, calm, x + 6, y + 17, { size: 8, color: PALETTE.ink });
  }
  drawRobot(ctx, tick);
}

// ---- status strip and tiles ---------------------------------------------------------------------------------------
export const meterColor = (value: number): string => (value >= 60 ? PALETTE.fact : value >= 30 ? PALETTE.goldDeep : PALETTE.fake);

export function drawStatus(ctx: CanvasRenderingContext2D, trust: number, multiplier: number, message: { text: string; good: boolean } | null): void {
  box(ctx, PALETTE.gold, 0, STATUS_Y, W, 11);
  box(ctx, PALETTE.goldDeep, 0, STATUS_Y + 10, W, 1);
  text(ctx, 'TRUST', 3, STATUS_Y + 2, { size: 8, color: PALETTE.navy });
  const { x, y, w, h } = METER;
  box(ctx, PALETTE.ink, x, y, w, h);
  box(ctx, PALETTE.surface, x + 1, y + 1, w - 2, h - 2);
  const fill = Math.round(((w - 2) * trust) / 100);
  box(ctx, meterColor(trust), x + 1, y + 1, fill, h - 2);
  for (let sx = x + 4; sx < x + 1 + fill; sx += 6) box(ctx, PALETTE.surface, sx, y + 1, 1, h - 2);
  if (message) text(ctx, message.text, MSG_X, STATUS_Y + 2, { size: 8, color: message.good ? PALETTE.fact : PALETTE.fake });
  else text(ctx, `X${multiplier.toFixed(1)} SCORE`, MSG_X, STATUS_Y + 2, { size: 8, color: PALETTE.navy });
}

function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: 'left' | 'right' | 'up', color: string): void {
  for (let i = 0; i < 5; i++) {
    const half = i;
    if (dir === 'up') box(ctx, color, cx - half, cy - 4 + i, half * 2 + 1, 1);
    else box(ctx, color, dir === 'left' ? cx - 4 + i : cx + 4 - i, cy - half, 1, half * 2 + 1);
  }
}

export function drawTile(ctx: CanvasRenderingContext2D, slot: number, pressed: boolean): void {
  const t = TILES[slot] as (typeof TILES)[number];
  const isGo = t.command === 'go';
  const isWait = t.command === 'wait';
  box(ctx, PALETTE.ink, t.x + 2, TILE.y + 3, t.w, TILE.h - 1); // hard shadow
  const lift = pressed ? 2 : 0;
  const y = TILE.y + lift;
  box(ctx, PALETTE.ink, t.x, y, t.w, TILE.h - 2);
  box(ctx, isGo ? PALETTE.fact : isWait ? PALETTE.goldDeep : PALETTE.surface, t.x + 2, y + 2, t.w - 4, TILE.h - 6);
  const fg = isGo ? PALETTE.surface : PALETTE.ink;
  if (t.label) text(ctx, t.label, t.x + t.w / 2, y + 11, { size: 8, color: fg, align: 'center' });
  if (isGo) drawArrow(ctx, t.x + 18, y + 14, 'up', fg);
  else if (isWait) {
    box(ctx, fg, t.x + 14, y + 9, 3, 9);
    box(ctx, fg, t.x + 20, y + 9, 3, 9);
  }
  else drawArrow(ctx, t.x + t.w / 2, y + 14, t.command === 'left' ? 'left' : 'right', fg);
}

/** A banner across the street (trip finished, run over). */
export function drawBanner(ctx: CanvasRenderingContext2D, lines: readonly string[], tone: 'good' | 'bad'): void {
  const h = 8 + lines.length * 11;
  const y = FIELD_Y + Math.round((ROWS * ROW_H - h) / 2);
  box(ctx, PALETTE.ink, 20, y + 3, W - 36, h);
  box(ctx, PALETTE.ink, 17, y - 1, W - 34, h + 2);
  box(ctx, tone === 'good' ? PALETTE.gold : PALETTE.fakeTint, 18, y, W - 36, h);
  lines.forEach((line, i) => text(ctx, line, W / 2, y + 5 + i * 11, { size: 8, color: i === 0 ? (tone === 'good' ? PALETTE.navy : PALETTE.fake) : PALETTE.ink, align: 'center' }));
}

export const COLUMN_X = (col: number): number => col * COL_W;
export const MAX_COL = COLS - 1;
