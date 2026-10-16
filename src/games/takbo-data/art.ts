// Pixel art for Takbo, Data!: Ara the runner, road obstacles, offer signs and the barangay backdrop.
import { t } from '../../app/i18n';
import { PALETTE, box, disc, frame, lineWidth, sprite, text, type SpriteRows } from '../engine/draw';
import { tx } from '../../i18n/runtime';
import type { DataTrap, SafeOffer } from './offers';
import type { ObstacleKind } from './rules';

export const W = 320;
export const H = 180;
export const ARA_X = 56;
/** Feet line of each lane, top lane first. */
export const LANE_Y = [94, 130, 166] as const;
/** Narrowest sign (every English offer fits it); a longer translation widens the sign up to SIGN_MAX_W. */
export const SIGN_W = 88;
export const SIGN_MAX_W = 140;
export const SIGN_H = 26;
export const ROAD_TOP = 62;

const ARA_COLORS: Record<string, string> = {
  K: PALETTE.ink,
  Y: PALETTE.gold,
  G: PALETTE.goldDeep,
  S: '#e2a77e',
  C: PALETTE.coral,
  N: PALETTE.navy,
};
const ARA_HEAD: SpriteRows = [
  'G..KKKKKK..G',
  '..KYYYYYYK..',
  '.KYYYYYYYYK.',
  '.KYSSSSSSYK.',
  '.KYSKSSKSYK.',
  '.KYSSCCSSYK.',
  '..KSSSSSSK..',
  '..KNNNNNNK..',
  '.KNNNCCNNNK.',
  '.KNNNCCNNNK.',
  '..KNNNNNNK..',
];
const ARA_LEGS: readonly SpriteRows[] = [
  ['..KNK..KNK..', '..KK....KK..'],
  ['...KNKKNK...', '...KK..KK...'],
];

export function drawAra(ctx: CanvasRenderingContext2D, x: number, feetY: number, stride: number): void {
  const legs = ARA_LEGS[stride % 2] as SpriteRows;
  const top = feetY - (ARA_HEAD.length + legs.length) * 2;
  sprite(ctx, ARA_HEAD, ARA_COLORS, x - 12, top, 2);
  sprite(ctx, legs, ARA_COLORS, x - 12, top + ARA_HEAD.length * 2, 2);
}

export const ARA_HEIGHT = (ARA_HEAD.length + 2) * 2;

const CHICKEN: SpriteRows = ['...C......', '..GGG.....', '.GGKGO....', '..GGG.....', '..GGGGGGG.', '.GGGGGGGGG', '.GGGGGGGG.', '..GGGGGG..', '...K..K...'];
const CHICKEN_COLORS: Record<string, string> = { C: PALETTE.fake, G: PALETTE.goldDeep, K: PALETTE.ink, O: PALETTE.coral };

/** Width and clearance height (how high Ara must be to pass over) of each obstacle. */
export const OBSTACLE_SIZE: Record<ObstacleKind, { w: number; clear: number }> = {
  puddle: { w: 26, clear: 4 },
  chicken: { w: 20, clear: 14 },
  pothole: { w: 24, clear: 4 },
};

export function drawObstacle(ctx: CanvasRenderingContext2D, kind: ObstacleKind, x: number, feetY: number): void {
  if (kind === 'chicken') {
    sprite(ctx, CHICKEN, CHICKEN_COLORS, x, feetY - 18, 2, true);
  } else if (kind === 'puddle') {
    box(ctx, PALETTE.navy, x + 2, feetY - 5, 22, 5);
    box(ctx, PALETTE.navy, x, feetY - 3, 26, 3);
    box(ctx, PALETTE.navyTint, x + 4, feetY - 4, 18, 3);
    box(ctx, PALETTE.surface, x + 7, feetY - 4, 4, 1);
  } else {
    box(ctx, PALETTE.ink, x + 3, feetY - 6, 18, 6);
    box(ctx, PALETTE.ink, x, feetY - 4, 24, 3);
    box(ctx, PALETTE.muted, x + 5, feetY - 5, 14, 2);
  }
}

const signLine = (offer: SafeOffer | DataTrap): string => ('ask' in offer ? offer.ask : offer.line);

/** Width of an offer's sign: wide enough for its translated lines at full size, between SIGN_W and SIGN_MAX_W. */
export function signWidth(offer: SafeOffer | DataTrap): number {
  const widest = Math.max(lineWidth(tx(offer.lure)), lineWidth(tx(signLine(offer))));
  return Math.min(SIGN_MAX_W, Math.max(SIGN_W, widest + 8));
}

/** An offer sign on two posts. Data traps carry a form field with what they ask for; safe offers do not. */
export function drawSign(ctx: CanvasRenderingContext2D, x: number, feetY: number, offer: SafeOffer | DataTrap, trap: boolean): void {
  const top = feetY - SIGN_H - 4;
  const w = signWidth(offer);
  const inner = w - 8; // past the 2px frame, with 2px to spare on each side
  box(ctx, PALETTE.ink, x + 8, top + SIGN_H, 3, 4);
  box(ctx, PALETTE.ink, x + w - 11, top + SIGN_H, 3, 4);
  box(ctx, PALETTE.surface, x, top, w, SIGN_H);
  frame(ctx, PALETTE.ink, x, top, w, SIGN_H, 2);
  text(ctx, offer.lure, x + w / 2, top + 4, { size: 8, color: PALETTE.navy, align: 'center', maxWidth: inner });
  if (trap) {
    box(ctx, PALETTE.fakeTint, x + 4, top + 14, inner, 9);
    frame(ctx, PALETTE.fake, x + 4, top + 14, inner, 9, 1);
    text(ctx, signLine(offer), x + w / 2, top + 15, { size: 8, color: PALETTE.fake, align: 'center', maxWidth: inner });
  } else {
    text(ctx, signLine(offer), x + w / 2, top + 15, { size: 8, color: PALETTE.fact, align: 'center', maxWidth: inner });
  }
}

export type BuildingKind = 'store' | 'jeepney' | 'health';
export const BUILDINGS: readonly BuildingKind[] = ['store', 'jeepney', 'health', 'store', 'health', 'jeepney'];
export const BUILDING_W: Record<BuildingKind, number> = { store: 80, jeepney: 76, health: 76 };

export function drawBuilding(ctx: CanvasRenderingContext2D, kind: BuildingKind, x: number, bottom: number): void {
  if (kind === 'store') {
    const y = bottom - 34;
    box(ctx, PALETTE.surface, x, y, 80, 34);
    frame(ctx, PALETTE.ink, x, y, 80, 34, 2);
    box(ctx, PALETTE.navy, x + 2, y + 2, 76, 10);
    text(ctx, 'SARI-SARI', x + 40, y + 3, { size: 8, color: PALETTE.gold, align: 'center' });
    for (let i = 0; i < 10; i++) box(ctx, i % 2 ? PALETTE.surface : PALETTE.coral, x + 2 + i * 7.6, y + 12, 7.6, 7);
    box(ctx, PALETTE.gold, x + 6, y + 22, 68, 10);
    for (let i = 0; i < 8; i++) box(ctx, [PALETTE.coral, PALETTE.fact, PALETTE.navy][i % 3] as string, x + 9 + i * 8, y + 25, 5, 5);
  } else if (kind === 'jeepney') {
    const y = bottom - 26;
    box(ctx, PALETTE.navy, x + 8, y, 56, 5);
    box(ctx, PALETTE.goldDeep, x + 2, y + 5, 72, 15);
    frame(ctx, PALETTE.ink, x + 2, y + 5, 72, 15, 1);
    for (let i = 0; i < 4; i++) box(ctx, PALETTE.navyTint, x + 8 + i * 15, y + 8, 11, 7);
    box(ctx, PALETTE.navy, x + 3, y + 17, 70, 2);
    box(ctx, PALETTE.coral, x + 70, y + 8, 4, 8);
    disc(ctx, PALETTE.ink, x + 18, y + 22, 4);
    disc(ctx, PALETTE.ink, x + 58, y + 22, 4);
    box(ctx, PALETTE.ink, x + 78, y - 6, 2, 32);
    box(ctx, PALETTE.fact, x + 74, y - 8, 10, 6);
  } else {
    const y = bottom - 34;
    box(ctx, PALETTE.surface, x, y, 76, 34);
    frame(ctx, PALETTE.ink, x, y, 76, 34, 2);
    box(ctx, PALETTE.fact, x + 2, y + 2, 72, 5);
    box(ctx, PALETTE.fact, x + 30, y + 12, 16, 6);
    box(ctx, PALETTE.fact, x + 35, y + 8, 6, 14);
    box(ctx, PALETTE.navyTint, x + 6, y + 20, 16, 10);
    box(ctx, PALETTE.navyTint, x + 54, y + 20, 16, 10);
    box(ctx, PALETTE.navy, x + 32, y + 22, 12, 12);
  }
}

export function drawBackdrop(ctx: CanvasRenderingContext2D, scroll: number): void {
  box(ctx, PALETTE.cream, 0, 0, W, 40);
  box(ctx, PALETTE.gold, 0, 40, W, ROAD_TOP - 40);
  disc(ctx, PALETTE.goldDeep, 270, 30, 14);
  disc(ctx, PALETTE.gold, 270, 30, 10);
  box(ctx, PALETTE.ink, 0, ROAD_TOP - 4, W, 4);
  box(ctx, PALETTE.line, 0, ROAD_TOP, W, H - ROAD_TOP);
  box(ctx, PALETTE.soft, 0, ROAD_TOP + 4, W, H - ROAD_TOP - 4);
  // lane dashes move with the road
  const offset = -(Math.floor(scroll) % 32);
  for (const y of [112, 148]) for (let x = offset; x < W; x += 32) box(ctx, PALETTE.line, x, y, 16, 2);
  box(ctx, PALETTE.navy, 0, H - 4, W, 4);
}

export function drawShieldBar(ctx: CanvasRenderingContext2D, shield: number): void {
  text(ctx, t('g.takbo.shield'), 6, 4, { size: 8, color: PALETTE.ink, maxWidth: 102 });
  box(ctx, PALETTE.ink, 6, 14, 102, 10);
  box(ctx, PALETTE.surface, 8, 16, 98, 6);
  const color = shield > 50 ? PALETTE.fact : shield > 25 ? PALETTE.goldDeep : PALETTE.fake;
  // barber-pole stripe: whole-pixel steps of 7
  const w = Math.round((shield / 100) * 98);
  box(ctx, color, 8, 16, w, 6);
  for (let x = 8 + 3; x < 8 + w; x += 7) box(ctx, PALETTE.surface, x, 16, 2, 6);
}
