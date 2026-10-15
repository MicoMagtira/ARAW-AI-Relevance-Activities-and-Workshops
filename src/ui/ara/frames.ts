// Ara's sprite: 32x32 pixel grids (docs/DESIGN.md section 7). The idle grid is hand-drawn; every other
// mood is a small patch on top of it, so the silhouette and ray positions stay identical across frames.

export const ARA_MOODS = ['idle', 'happy', 'wow', 'wink', 'sad', 'think'] as const;
export type AraMood = (typeof ARA_MOODS)[number];

export const GRID = 32;

/** Sprite-only palette (the one place raw hexes are allowed). */
export const PALETTE: Record<string, string> = {
  K: '#1F2550', // ink: outline, eyes, mouth, shoes
  Y: '#F5D89E', // gold: hair
  G: '#E8B84A', // deep gold: hair shading, rays, hem
  S: '#E2A77E', // skin
  s: '#C98A62', // skin shade
  N: '#35408E', // navy outfit
  n: '#283276', // navy shade
  W: '#FFFFFF', // highlights, collar
  C: '#FF7A59', // cheeks, sun emblem, open mouth
};

const IDLE = [
  '...............GG...............',
  '....G..........GG..........G....',
  '.....G...KKKKKKKKKKKKKK...G.....',
  '......G.KYYYYYYYYYYYYYYK.G......',
  '.......KYYYYYYYYYYYYYYYYK.......',
  '......KYYYGYYYYYYYYYYGYYYK......',
  '.....KYYYGYYYYYYYYYYYYGYYYK.....',
  '.....KYYGYYYYYYYYYYYYYYGYYK.....',
  '....KYYYGYYYGYYYYYYGYYYGYYYK....',
  '....KYYGYYGGGGGGGGGGGGYYGYYK....',
  '....KYYGYYSSSSSSSSSSSSYYGYYK....',
  'GGG.KYYGYSSSSSSSSSSSSSSYGYYK.GGG',
  '....KYYGYSSWKSSSSSSWKSSYGYYK....',
  '....KYYGYSSKKSSSSSSKKSSYGYYK....',
  '....KYYGYSSKKSSSSSSKKSSYGYYK....',
  '....KYYGYSCCSSSSSSSSCCSYGYYK....',
  '.....KYGYSSSSKSSSSKSSSSYGYK.....',
  '.....KYGGSSSSSKKKKSSSSSGGYK.....',
  '....G.KYYGsSSSSSSSSSSsGYYK.G....',
  '...G...KYYKKKKKKKKKKKKYYK...G...',
  '..G....KYK...KSSSSK...KYK....G..',
  '........KKKKKWWSSWWKKKKK........',
  '.......KNNNNNNWWWWNNNNNNK.......',
  '......KNKNNNNNNCCNNNNNNKNK......',
  '......KNKNNNNNNCCNNNNNNKNK......',
  '......KNKNNNNNNNNNNNNNNKNK......',
  '......KSKNNNNNNNNNNNNNNKSK......',
  '.......KnnnnnnnnnnnnnnnnK.......',
  '.......KGGGGGGGGGGGGGGGGK.......',
  '........KKKKKKKKKKKKKKKK........',
  '..........KSK......KSK..........',
  '.........KKKK......KKKK.........',
];

/** The outermost ray cell on each of the eight arms; the sad frame dims them. */
const RAY_TIPS: ReadonlyArray<readonly [row: number, col: number]> = [
  [0, 15], [0, 16], [1, 4], [1, 27], [11, 0], [11, 31], [20, 2], [20, 29],
];

type Grid = string[][];

/** One row of the grid (the grid is always 32 rows, so the index is in range). */
const cells = (g: Grid, row: number): string[] => g[row] as string[];
const clone = (rows: readonly string[]): Grid => rows.map((r) => r.split(''));

/** Write `text` at (row, col); a space leaves the cell alone. */
function put(g: Grid, row: number, col: number, text: string): void {
  const line = cells(g, row);
  for (const [i, ch] of [...text].entries()) if (ch !== ' ') line[col + i] = ch;
}
/** Same, plus the mirror image on the right side of the sprite. */
function putBoth(g: Grid, row: number, col: number, text: string): void {
  put(g, row, col, text);
  put(g, row, GRID - col - text.length, [...text].reverse().join(''));
}
function set(g: Grid, at: ReadonlyArray<readonly [number, number]>, ch: string): void {
  for (const [r, c] of at) cells(g, r)[c] = ch;
}

const EYE_COLS = [11, 12, 19, 20] as const;
/** Wipe the standard eyes (rows 12-14) back to skin. */
function clearEyes(g: Grid): void {
  for (const r of [12, 13, 14]) for (const c of EYE_COLS) cells(g, r)[c] = 'S';
}
/** Wipe the smile (rows 16-17). */
function clearMouth(g: Grid): void {
  put(g, 16, 13, 'S    S');
  put(g, 17, 14, 'SSSS');
}

const PATCHES: Record<Exclude<AraMood, 'idle'>, (g: Grid) => void> = {
  happy(g) {
    clearEyes(g);
    putBoth(g, 13, 11, 'KK'); // eyes become ^ arcs
    set(g, [[14, 10], [14, 13], [14, 18], [14, 21]], 'K');
    put(g, 16, 13, 'KKKKKK'); // open smile
    put(g, 17, 13, 'KCCCCK');
    put(g, 18, 14, 'KKKK');
    // arms raised: the hanging arms go, hands rise beside the hair
    for (const r of [25, 26]) putBoth(g, r, 6, '..');
    putBoth(g, 24, 6, 'KK');
    putBoth(g, 22, 6, 'KN');
    putBoth(g, 21, 5, 'KNK');
    putBoth(g, 20, 4, 'KSK');
    putBoth(g, 19, 4, 'KSK');
    putBoth(g, 18, 5, 'K');
  },
  wow(g) {
    clearEyes(g);
    for (const r of [12, 13, 14]) {
      put(g, r, 10, 'KKK');
      put(g, r, 19, 'KKK');
    }
    put(g, 12, 10, 'W');
    put(g, 12, 19, 'W');
    clearMouth(g); // small "O" mouth
    put(g, 16, 15, 'KK');
    put(g, 17, 14, 'KCCK');
    put(g, 18, 15, 'KK');
    // every ray one cell longer, as far as the 32x32 grid allows
    set(g, [[0, 3], [0, 28], [0, 14], [0, 17], [21, 1], [21, 30], [10, 0], [12, 0], [10, 31], [12, 31]], 'G');
  },
  wink(g) {
    for (const r of [12, 13, 14]) put(g, r, 11, 'SS'); // left eye closed...
    put(g, 13, 10, 'KKK'); // ...as a single line
    for (const r of [17, 18, 19]) put(g, r, 24, 'SS'); // right hand raised by the face
    put(g, 20, 24, 'KK');
    put(g, 19, 26, 'K');
  },
  sad(g) {
    clearEyes(g);
    for (const c of [11, 19]) {
      put(g, 13, c, 'WK');
      put(g, 14, c, 'KK');
      put(g, 15, c, 'KK');
    }
    set(g, [[10, 11], [11, 10], [10, 20], [11, 21]], 'K'); // worried brows
    clearMouth(g);
    put(g, 16, 14, 'KKKK'); // inverted mouth
    put(g, 17, 13, 'K    K');
    set(g, RAY_TIPS, 'Y'); // dimmer rays
  },
  think(g) {
    clearEyes(g);
    for (const c of [10, 18]) {
      put(g, 11, c, 'WK'); // eyes look up-left
      put(g, 12, c, 'KK');
    }
    clearMouth(g);
    put(g, 17, 15, 'KK'); // flat mouth
    put(g, 19, 17, 'SS'); // one hand at the chin
    put(g, 20, 17, 'SS');
    put(g, 21, 17, 'NN');
    put(g, 0, 25, '.KKKKK.'); // three-dot thought bubble
    put(g, 1, 25, 'KWWWWWK');
    put(g, 2, 25, 'KCWCWCK');
    put(g, 3, 25, 'KWWWWWK');
    put(g, 4, 25, '.KKKKK.');
  },
};

/** Closed eyes for the blink: the eye cells of rows 12 and 14 become skin, row 13 stays. */
function blinkEyes(g: Grid): void {
  for (const r of [12, 14]) for (const c of EYE_COLS) cells(g, r)[c] = 'S';
}

/**
 * Bob frame B: the head sinks one cell onto the shoulders (rows 0-19 move down, covering the
 * neck row) so the feet stay planted and nothing is clipped by the 32x32 box.
 */
function sink(g: Grid): Grid {
  return [Array<string>(GRID).fill('.'), ...g.slice(0, 20), ...g.slice(21)];
}

export interface FrameOptions {
  /** Bob frame B (head one cell lower). */
  bob?: boolean;
  /** Eyes closed; only applies to the idle mood. */
  blink?: boolean;
}

const cache = new Map<string, readonly string[]>();

/** The 32 row strings for a mood (cached; never mutate the result). */
export function getFrame(mood: AraMood, { bob = false, blink = false }: FrameOptions = {}): readonly string[] {
  const blinking = blink && mood === 'idle';
  const key = `${mood}|${bob ? 1 : 0}|${blinking ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let g = clone(IDLE);
  if (mood !== 'idle') PATCHES[mood](g);
  else if (blinking) blinkEyes(g);
  if (bob) g = sink(g);
  const rows = g.map((r) => r.join(''));
  cache.set(key, rows);
  return rows;
}

export interface Run {
  x: number;
  y: number;
  w: number;
}

/** Merge horizontal runs of the same colour per row, grouped by palette key. */
export function runsByColour(rows: readonly string[]): Map<string, Run[]> {
  const out = new Map<string, Run[]>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x] as string;
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      if (ch !== '.') {
        const list = out.get(ch) ?? [];
        list.push({ x, y, w });
        out.set(ch, list);
      }
      x += w;
    }
  });
  return out;
}

/** SVG path data for one colour: one rect per run. */
export const pathFor = (runs: readonly Run[]): string => runs.map((r) => `M${r.x} ${r.y}h${r.w}v1h-${r.w}z`).join('');
