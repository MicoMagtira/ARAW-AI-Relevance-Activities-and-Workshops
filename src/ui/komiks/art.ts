// Pixel art for the Komiks panels: scenes, props and faces as rect lists on a 96x60 grid (docs/DESIGN.md section 12).
// Like Ara's frames and the avatars, these are sprite data, so raw hexes are allowed here and nowhere else in the reader.
import { AVATARS, avatarRects, type AvatarSpec } from '../avatars';
import type { AraMood } from '../ara/frames';
import type { KomiksCastId, KomiksExpression, KomiksProp, KomiksSetting, KomiksTime } from '../../content/library/komiks';

export type Rect = readonly [x: number, y: number, w: number, h: number, fill: string];
export interface Layer {
  rects: readonly Rect[];
  opacity?: number;
}

export const SCENE_W = 96;
export const SCENE_H = 60;

const r = (x: number, y: number, w: number, h: number, fill: string): Rect => [x, y, w, h, fill];

const INK = '#1F2550';
const WHITE = '#FFFFFF';
const GOLD = '#F5D89E';
const GOLD2 = '#E8B84A';
const NAVY = '#35408E';
const BLUE = '#4A56A8';
const CORAL = '#FF7A59';
const GREEN = '#2FA36B';
const RED = '#C4323A';
const WOOD = '#B8864F';
const WOOD2 = '#8A5F36';
const GREY = '#8A8FA8';
const PALE = '#E3E6F5';
const LINE = '#B6BDD8';

const SKY: Record<KomiksTime, string> = { morning: '#FFD9A8', day: '#9ED8F5', evening: '#FF9F7A', night: '#26306E' };

/** Tint laid over the background (never the characters) to show the time of day. */
function tint(time: KomiksTime): Layer | null {
  if (time === 'evening') return { rects: [r(0, 0, SCENE_W, SCENE_H, CORAL)], opacity: 0.18 };
  if (time === 'night') return { rects: [r(0, 0, SCENE_W, SCENE_H, INK)], opacity: 0.45 };
  return null;
}

const windowAt = (x: number, y: number, w: number, h: number, sky: string): Rect[] => [
  r(x, y, w, h, WHITE),
  r(x + 2, y + 2, w - 4, h - 4, sky),
  r(x + Math.floor(w / 2) - 1, y + 2, 2, h - 4, WHITE),
];

interface Backdrop {
  back: Rect[];
  /** Drawn in front of the characters (a table top, for example). */
  front?: Rect[];
}

function backdrop(setting: KomiksSetting, sky: string): Backdrop {
  switch (setting) {
    case 'sala':
      return {
        back: [
          r(0, 0, 96, 42, '#F6E3C8'), r(0, 42, 96, 18, '#C79A6B'), r(0, 42, 96, 2, WOOD2),
          ...windowAt(6, 6, 24, 20, sky),
          r(56, 8, 18, 12, WHITE), r(58, 10, 14, 8, GOLD), r(63, 12, 4, 4, CORAL),
          r(40, 22, 52, 16, BLUE), r(38, 32, 56, 12, NAVY), r(38, 26, 4, 18, NAVY), r(90, 26, 4, 18, NAVY),
        ],
      };
    case 'kitchen':
      return {
        back: [
          r(0, 0, 96, 60, '#DDEBF0'), r(0, 8, 96, 1, '#C5D9E0'), r(0, 16, 96, 1, '#C5D9E0'), r(0, 24, 96, 1, '#C5D9E0'), r(0, 32, 96, 1, '#C5D9E0'),
          r(0, 36, 96, 24, WOOD), r(0, 34, 96, 4, '#E8D4B0'),
          ...windowAt(62, 6, 26, 18, sky),
          r(6, 14, 34, 2, WOOD2), r(8, 8, 6, 6, RED), r(16, 9, 6, 5, GOLD2), r(24, 8, 6, 6, GREEN),
          r(48, 4, 1, 6, GREY), r(44, 10, 9, 5, GREY), r(43, 9, 11, 1, INK),
        ],
      };
    case 'bea_room':
      return {
        back: [
          r(0, 0, 96, 44, '#E4DDF4'), r(0, 44, 96, 16, '#C9B8A0'), r(0, 44, 96, 2, WOOD2),
          r(8, 6, 16, 20, NAVY), r(10, 8, 12, 16, GOLD), r(13, 13, 6, 5, CORAL), r(11, 20, 10, 1, NAVY),
          ...windowAt(36, 6, 20, 16, sky),
          r(60, 30, 36, 18, CORAL), r(60, 28, 36, 4, WHITE), r(62, 24, 12, 6, WHITE),
          r(0, 36, 32, 3, WOOD), r(2, 39, 3, 8, WOOD2), r(27, 39, 3, 8, WOOD2),
        ],
      };
    case 'phone_screen':
      return {
        back: [
          r(0, 0, 96, 60, '#DCE3F7'), r(0, 0, 96, 8, NAVY), r(4, 3, 20, 2, GOLD),
          r(6, 11, 42, 10, WHITE), r(9, 14, 30, 1, LINE), r(9, 17, 22, 1, LINE),
          r(50, 24, 40, 10, '#CDEFD9'), r(53, 27, 30, 1, LINE), r(53, 30, 18, 1, LINE),
          r(6, 37, 36, 10, WHITE), r(9, 40, 26, 1, LINE), r(9, 43, 16, 1, LINE),
          r(56, 48, 34, 10, '#CDEFD9'), r(59, 51, 24, 1, LINE), r(59, 54, 14, 1, LINE),
        ],
      };
    case 'health_center':
      return {
        back: [
          r(0, 0, 96, 44, '#DDF0E6'), r(0, 44, 96, 16, '#CFD8D0'),
          r(36, 4, 24, 16, WHITE), r(46, 6, 4, 12, RED), r(42, 10, 12, 4, RED),
          r(4, 30, 30, 3, WOOD), r(4, 22, 30, 2, WOOD), r(6, 33, 3, 10, WOOD2), r(29, 33, 3, 10, WOOD2),
          r(66, 28, 30, 18, WHITE), r(66, 26, 30, 3, PALE), r(70, 16, 12, 8, GOLD), r(72, 18, 8, 1, WOOD2), r(72, 21, 6, 1, WOOD2),
        ],
      };
    case 'barangay_hall':
      return {
        back: [
          r(0, 0, 96, 42, '#F3E6B0'), r(0, 42, 96, 18, '#B8B2A0'),
          r(16, 4, 64, 8, NAVY), r(16, 4, 64, 2, GOLD2), r(16, 10, 64, 2, GOLD2),
          r(4, 16, 24, 18, WOOD), r(6, 18, 20, 14, '#D9B98A'), r(8, 20, 6, 8, WHITE), r(16, 20, 8, 5, GOLD), r(16, 27, 6, 4, PALE),
          r(66, 18, 14, 14, WHITE), r(68, 20, 10, 10, PALE), r(72, 22, 1, 5, INK), r(72, 26, 4, 1, INK),
          r(58, 34, 38, 4, WOOD), r(60, 38, 3, 8, WOOD2), r(91, 38, 3, 8, WOOD2),
        ],
      };
    case 'sari_sari': {
      const awning: Rect[] = Array.from({ length: 12 }, (_, i) => r(i * 8, 0, 8, 10, i % 2 === 0 ? RED : WHITE));
      const boxes = [CORAL, GOLD2, GREEN, BLUE, RED, GOLD, CORAL, GREEN, NAVY, GOLD2, RED, BLUE];
      return {
        back: [
          r(0, 0, 96, 60, '#F6E3C8'), ...awning, r(0, 10, 96, 2, WOOD2),
          r(0, 22, 96, 2, WOOD), r(0, 34, 96, 2, WOOD),
          ...boxes.map((c, i) => r(2 + i * 8, i % 2 === 0 ? 15 : 16, 6, i % 2 === 0 ? 7 : 6, c)),
          ...boxes.map((c, i) => r(3 + i * 8, i % 3 === 0 ? 27 : 28, 5, i % 3 === 0 ? 7 : 6, boxes[(i + 5) % boxes.length] ?? c)),
          r(0, 40, 96, 20, WOOD), r(0, 38, 96, 4, '#E8D4B0'),
        ],
      };
    }
    case 'street':
      return {
        back: [
          r(0, 0, 96, 40, sky), r(0, 40, 96, 4, '#CFC8B8'), r(0, 44, 96, 16, '#6B7090'),
          ...[0, 12, 24, 36, 48, 60, 72, 84].map((x) => r(x, 46 + (x % 5), 6, 1, WHITE)),
          r(0, 14, 22, 26, '#F6E3C8'), r(3, 18, 6, 6, GOLD), r(13, 18, 6, 6, GOLD), r(8, 30, 7, 10, WOOD2),
          r(26, 8, 24, 32, CORAL), r(30, 12, 6, 6, WHITE), r(40, 12, 6, 6, WHITE), r(30, 24, 6, 6, WHITE), r(40, 26, 6, 14, WOOD2),
          r(78, 22, 4, 18, WOOD2), r(70, 8, 20, 16, GREEN), r(74, 4, 12, 6, GREEN),
        ],
      };
    case 'dinner_table':
      return {
        back: [
          r(0, 0, 96, 60, '#F6E3C8'), r(0, 40, 96, 20, '#C79A6B'),
          r(46, 0, 2, 8, INK), r(38, 8, 18, 6, GOLD2), r(40, 14, 14, 2, GOLD),
          ...windowAt(4, 8, 22, 18, sky), ...windowAt(70, 8, 22, 18, sky),
        ],
        front: [
          r(0, 44, 96, 4, WOOD), r(0, 48, 96, 12, WOOD2),
          r(8, 42, 12, 2, WHITE), r(40, 38, 12, 6, WHITE), r(42, 36, 8, 3, '#FFF8EC'), r(70, 42, 16, 2, WHITE), r(72, 40, 12, 2, CORAL),
        ],
      };
  }
}

/** The scene's layers back to front: behind the characters, and in front of them. */
export function sceneLayers(setting: KomiksSetting, time: KomiksTime): { back: Layer[]; front: Layer[] } {
  const b = backdrop(setting, SKY[time]);
  const overlay = tint(time);
  return {
    back: [{ rects: b.back }, ...(overlay ? [overlay] : [])],
    front: b.front ? [{ rects: b.front }] : [],
  };
}

// ---------- props ----------

interface PropArt {
  w: number;
  h: number;
  rects: readonly Rect[];
  /** Fixed spot on the wall or in the sky instead of the floor row. */
  at?: readonly [x: number, y: number];
}

const PROPS: Record<KomiksProp, PropArt> = {
  phone: { w: 10, h: 16, rects: [r(0, 0, 10, 16, INK), r(1, 2, 8, 11, PALE), r(2, 4, 6, 1, LINE), r(2, 7, 4, 1, LINE), r(7, 3, 2, 2, CORAL), r(4, 14, 2, 1, GREY)] },
  tea_box: { w: 12, h: 16, rects: [r(0, 0, 12, 16, GREEN), r(0, 0, 12, 2, '#1E7D50'), r(2, 4, 8, 7, GOLD), r(4, 6, 4, 3, WOOD2), r(0, 14, 12, 2, '#1E7D50')] },
  pill_box: { w: 22, h: 8, rects: [r(0, 0, 22, 8, WHITE), r(0, 0, 22, 1, INK), r(0, 7, 22, 1, INK), ...[0, 1, 2, 3, 4, 5, 6].map((i) => r(1 + i * 3, 2, 2, 4, [CORAL, GOLD2, BLUE][i % 3] as string))] },
  laptop: { w: 22, h: 14, rects: [r(2, 0, 18, 11, INK), r(3, 1, 16, 9, PALE), r(5, 3, 12, 1, LINE), r(5, 6, 8, 1, LINE), r(0, 11, 22, 3, GREY)] },
  leaflets: { w: 18, h: 12, rects: [r(0, 4, 12, 8, WHITE), r(0, 4, 12, 1, INK), r(2, 0, 12, 8, GOLD), r(4, 2, 8, 1, WOOD2), r(4, 5, 5, 1, WOOD2), r(4, 8, 14, 4, WHITE), r(5, 9, 8, 1, LINE)] },
  poster: { w: 14, h: 18, at: [4, 6], rects: [r(0, 0, 14, 18, INK), r(1, 1, 12, 16, GOLD), r(4, 4, 6, 3, CORAL), r(3, 7, 8, 2, CORAL), r(3, 11, 8, 1, NAVY), r(3, 14, 6, 1, NAVY)] },
  moon: { w: 10, h: 10, at: [82, 4], rects: [r(3, 0, 4, 10, '#FFF3C4'), r(1, 1, 8, 8, '#FFF3C4'), r(0, 3, 10, 4, '#FFF3C4'), r(3, 2, 2, 2, '#E8D9A0'), r(5, 6, 2, 2, '#E8D9A0')] },
  kiosk: { w: 14, h: 24, rects: [r(1, 0, 12, 22, NAVY), r(3, 2, 8, 9, PALE), r(4, 4, 6, 1, LINE), r(4, 7, 4, 1, LINE), r(3, 13, 3, 2, GOLD), r(8, 13, 3, 2, CORAL), r(4, 17, 6, 1, INK), r(0, 22, 14, 2, INK)] },
  bp_cuff: { w: 20, h: 12, rects: [r(0, 2, 12, 8, CORAL), r(2, 2, 1, 8, WHITE), r(12, 5, 5, 1, INK), r(16, 3, 4, 6, RED), r(5, 0, 6, 3, WHITE), r(7, 1, 2, 1, INK)] },
  phone_basket: { w: 18, h: 14, rects: [r(2, 0, 4, 7, INK), r(3, 1, 2, 4, PALE), r(7, 1, 4, 6, INK), r(8, 2, 2, 3, PALE), r(12, 0, 4, 7, INK), r(13, 1, 2, 4, PALE), r(0, 5, 18, 9, WOOD), r(0, 8, 18, 1, WOOD2), r(0, 11, 18, 1, WOOD2)] },
  feedback_form: { w: 12, h: 16, rects: [r(0, 0, 12, 16, WOOD), r(1, 2, 10, 13, WHITE), r(4, 0, 4, 3, INK), r(3, 5, 6, 1, LINE), r(3, 8, 6, 1, LINE), r(3, 11, 3, 2, GREEN)] },
  villain_cards: { w: 22, h: 16, rects: [r(0, 4, 9, 12, INK), r(1, 5, 7, 10, RED), r(7, 2, 9, 12, INK), r(8, 3, 7, 10, GOLD2), r(13, 0, 9, 12, INK), r(14, 1, 7, 10, BLUE), r(16, 3, 3, 3, WHITE)] },
  merienda: { w: 24, h: 10, rects: [r(0, 7, 24, 3, WHITE), r(3, 2, 7, 6, GOLD2), r(4, 3, 3, 1, GOLD), r(12, 2, 7, 6, GOLD2), r(13, 3, 3, 1, GOLD), r(20, 4, 4, 4, CORAL)] },
};

/** Props placed on the floor row fill these x positions in order (edges first, so characters stay clear). */
const SLOT_X = [2, 74, 28, 52] as const;

/** Wall and sky props (poster, moon) sit behind the cast; floor props sit in front of it. */
export function propRects(props: readonly KomiksProp[]): { behind: Rect[]; front: Rect[] } {
  const behind: Rect[] = [];
  const front: Rect[] = [];
  let slot = 0;
  for (const p of props) {
    const art = PROPS[p];
    let [x, y] = art.at ?? [0, 0];
    if (!art.at) {
      const sx = SLOT_X[slot++ % SLOT_X.length] as number;
      x = Math.min(sx, SCENE_W - art.w - 2);
      y = SCENE_H - art.h - 1;
    }
    for (const [rx, ry, rw, rh, fill] of art.rects) (art.at ? behind : front).push([x + rx, y + ry, rw, rh, fill]);
  }
  return { behind, front };
}

// ---------- cast ----------

const avatar = (id: string): AvatarSpec => AVATARS.find((a) => a.id === id) ?? (AVATARS[0] as AvatarSpec);

/** The family and neighbours as avatar specs, drawn in Ara's style (docs/CONTENT_GUIDE.md: synthetic people only). */
export const CAST_SPECS: Record<Exclude<KomiksCastId, 'ara'>, AvatarSpec> = {
  lola_nena: avatar('lola'),
  tita_baby: avatar('tita'),
  kuya_jun: { ...avatar('young-man'), shirt: BLUE },
  bea: { ...avatar('young-woman'), shirt: '#8E5BB5' },
  aling_nena: { id: 'aling', label: 'Aling Nena', skin: '#C98E66', hair: 'bun', hairColor: '#5A3A22', shirt: GOLD2 },
};

/** Which of Ara's six sprite moods fits each Komiks expression. */
export const ARA_MOOD_FOR: Record<KomiksExpression, AraMood> = {
  happy: 'happy',
  proud: 'happy',
  laughing: 'happy',
  calm: 'idle',
  curious: 'think',
  thinking: 'think',
  surprised: 'wow',
  worried: 'sad',
  sleepy: 'idle',
  wink: 'wink',
};

const MOUTH = '#8A3B2E';
const CHEEK = '#FF7A59';
const SWEAT = '#8EC5F0';

/** Eyes, brows and mouth for each expression on the avatar's 16x16 face (eyes row 7, mouth row 9). */
function face(expression: KomiksExpression): Rect[] {
  const eyes = [r(6, 7, 1, 1, INK), r(9, 7, 1, 1, INK)];
  const closed = [r(5, 7, 2, 1, INK), r(9, 7, 2, 1, INK)];
  const browsFlat = [r(5, 5, 2, 1, INK), r(9, 5, 2, 1, INK)];
  const smile = [r(6, 9, 1, 1, MOUTH), r(7, 10, 2, 1, MOUTH), r(9, 9, 1, 1, MOUTH)];
  switch (expression) {
    case 'happy':
      return [...eyes, ...smile];
    case 'proud':
      return [...eyes, ...smile, r(5, 8, 1, 1, CHEEK), r(10, 8, 1, 1, CHEEK)];
    case 'laughing':
      return [...closed, r(6, 9, 4, 1, MOUTH), r(7, 10, 2, 1, CHEEK)];
    case 'calm':
      return [...eyes, r(7, 9, 2, 1, MOUTH)];
    case 'curious':
      return [...eyes, r(9, 5, 2, 1, INK), r(8, 9, 1, 1, MOUTH)];
    case 'thinking':
      return [...eyes, ...browsFlat, r(8, 9, 2, 1, MOUTH)];
    case 'surprised':
      return [r(6, 6, 1, 2, INK), r(9, 6, 1, 2, INK), r(5, 4, 2, 1, INK), r(9, 4, 2, 1, INK), r(7, 9, 2, 2, MOUTH)];
    case 'worried':
      return [...eyes, ...browsFlat, r(6, 10, 1, 1, MOUTH), r(7, 9, 2, 1, MOUTH), r(9, 10, 1, 1, MOUTH), r(11, 5, 1, 2, SWEAT)];
    case 'sleepy':
      return [...closed, r(8, 9, 1, 1, MOUTH)];
    case 'wink':
      return [r(6, 7, 1, 1, INK), r(9, 7, 2, 1, INK), ...smile];
  }
}

const sameBox = (a: Rect, b: Rect): boolean => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
/** The avatar's default eyes and mouth (colours do not matter, only the boxes). */
const DEFAULT_FACE: readonly Rect[] = [r(6, 7, 1, 1, ''), r(9, 7, 1, 1, ''), r(7, 9, 2, 1, '')];

/** A cast member's 16x16 sprite showing an expression (the avatar's default eyes and mouth are swapped out). */
export function castRects(who: Exclude<KomiksCastId, 'ara'>, expression: KomiksExpression): Rect[] {
  const base = avatarRects(CAST_SPECS[who]).filter((rect) => !DEFAULT_FACE.some((f) => sameBox(f, rect)));
  return [...base, ...face(expression)];
}

/** Rects grouped by colour as SVG path data (one path per colour keeps the DOM small). */
export function rectPaths(rects: readonly Rect[]): Array<{ fill: string; d: string }> {
  const byFill = new Map<string, string>();
  for (const [x, y, w, h, fill] of rects) byFill.set(fill, `${byFill.get(fill) ?? ''}M${x} ${y}h${w}v${h}h${-w}z`);
  return [...byFill].map(([fill, d]) => ({ fill, d }));
}

/** Character size in scene units by how many share the panel (a 16x16 sprite scales by an integer). */
export const charSize = (count: number): number => (count <= 1 ? 48 : count === 2 ? 40 : 32);
