// Lamok Lamay rules: the water containers (scans), what floats in them, what the "AI camera" boxes, how a tap is judged and
// how precision and catch rate are worked out. Everything here is pure and seeded: a scan depends only on the seed and its
// number, never on what the player did, so the Daily Challenge is the same for everyone.
import { rngInt, rngPick, shuffle, type Rng } from '../engine/rng';

export type ContainerKind = 'drum' | 'tire' | 'pot' | 'can';
export type ObjectKind = 'larva' | 'seed' | 'leaf' | 'raisin';
export type Tool = 'whack' | 'reject';

export const CONTAINERS: Readonly<Record<ContainerKind, { name: string; plain: string; tip: readonly [string, string] }>> = {
  drum: { name: 'BLUE DRUM', plain: 'a blue water drum', tip: ['COVER DRUMS AND PAILS TIGHTLY.', 'SCRUB THE WALLS EVERY WEEK.'] },
  tire: { name: 'OLD TIRE', plain: 'an old tire', tip: ['KEEP TIRES UNDER A ROOF, OR', 'TIP THE WATER OUT OF THEM.'] },
  pot: { name: 'FLOWER POT PLATE', plain: 'a flower pot plate', tip: ['EMPTY THE POT PLATE EVERY WEEK.', 'NO STANDING WATER.'] },
  can: { name: 'OLD CAN', plain: 'an old can', tip: ['BIN OR CRUSH OLD CANS.', 'TURN BUCKETS UPSIDE DOWN.'] },
};
export const CONTAINER_KINDS: readonly ContainerKind[] = ['drum', 'tire', 'pot', 'can'];

/** What each object looks like, in plain words (the text alternative: larvae wriggle, the look-alikes lie still). */
export const OBJECTS: Readonly<Record<ObjectKind, { name: string; look: string }>> = {
  larva: { name: 'larva', look: 'a wriggling, comma-shaped larva' },
  seed: { name: 'seed', look: 'a still, brown, oval seed' },
  leaf: { name: 'leaf bit', look: 'a still, green, flat leaf bit' },
  raisin: { name: 'raisin', look: 'a still, dark, wrinkled raisin' },
};
const DECOYS: readonly ObjectKind[] = ['seed', 'leaf', 'raisin'];

// ---- layout (logical pixels; shared with the art) -----------------------------------------------------------------
export const WATER = { x: 12, y: 24, w: 296, h: 82 };
export const COLS = 4;
export const ROWS = 2;
const CELL_W = WATER.w / COLS;
const CELL_H = WATER.h / ROWS;
/** An AI box around an object, and how far from its centre a tap still counts. */
export const BOX = { w: 26, h: 18 };
export const HIT_RADIUS = 14;

// ---- pacing -------------------------------------------------------------------------------------------------------
export const HEARTS = 5;
export const MAX_ITEMS = 7;
/** Objects in the nth container: 4 at first, up to 7. */
export const itemCount = (index: number): number => Math.min(MAX_ITEMS, 4 + Math.floor(index / 2));
/** Seconds you get for the nth container, in ms: 18 s at first, 9 s at the quickest. */
export const scanTimeMs = (index: number): number => Math.max(9000, 18000 - 750 * index);
/** How fast things bob in the water, 1 at first and up to 2. */
export const driftSpeed = (index: number): number => Math.min(2, 1 + index * 0.08);

export interface ScanItem {
  id: number;
  kind: ObjectKind;
  /** Resting centre, in logical pixels. */
  x: number;
  y: number;
  /** The AI drew a box around it. */
  boxed: boolean;
  /** The AI's confidence, 0 to 100 (0 when it drew no box). */
  confidence: number;
  /** Bobbing offset so objects do not move in step. */
  phase: number;
}

export interface Scan {
  index: number;
  container: ContainerKind;
  items: readonly ScanItem[];
  timeMs: number;
}

export const isLarva = (item: ScanItem): boolean => item.kind === 'larva';
export const larvaeIn = (scan: Scan): number => scan.items.filter(isLarva).length;
/** The AI's two kinds of mistake in one scan: boxes around things that are not larvae, and larvae with no box. */
export const falseBoxesIn = (scan: Scan): number => scan.items.filter((i) => i.boxed && !isLarva(i)).length;
export const missesIn = (scan: Scan): number => scan.items.filter((i) => !i.boxed && isLarva(i)).length;

export interface ScanGenerator {
  /** The nth scan. Call in order from 0: the generator keeps its own random state. */
  next(index: number): Scan;
}

const LARVA_BOX_CHANCE = 0.78;
const DECOY_BOX_CHANCE = 0.5;

export function createScanGenerator(rng: Rng): ScanGenerator {
  let lastKind: ContainerKind | null = null;
  let lastEmpty = false;
  return {
    next(index) {
      const n = itemCount(index);
      const container = rngPick(
        CONTAINER_KINDS.filter((k) => k !== lastKind),
        rng,
      );
      lastKind = container;
      // an occasional container with no larvae at all (never the first two): the AI may still box something
      const empty = index >= 2 && !lastEmpty && rng() < 0.15;
      lastEmpty = empty;
      const larvae = empty ? 0 : index === 0 ? 2 : 1 + rngInt(rng, 0, Math.ceil(n * 0.6));
      const kinds: ObjectKind[] = shuffle([...Array<ObjectKind>(larvae).fill('larva'), ...Array.from({ length: n - larvae }, () => rngPick(DECOYS, rng))], rng);
      const cells = shuffle(Array.from({ length: COLS * ROWS }, (_, i) => i), rng).slice(0, n);
      // the first container always shows both kinds of AI mistake, so the briefing's promise is visible at once
      let larvaSeen = 0;
      let decoySeen = 0;
      const items = kinds.map((kind, id): ScanItem => {
        const cell = cells[id] as number;
        const x = WATER.x + (cell % COLS) * CELL_W + CELL_W / 2 + rngInt(rng, -6, 7);
        const y = WATER.y + Math.floor(cell / COLS) * CELL_H + CELL_H / 2 + rngInt(rng, -5, 6);
        const phase = rng() * Math.PI * 2;
        const lucky = rng();
        let boxed: boolean;
        if (kind === 'larva') boxed = index === 0 ? larvaSeen++ === 0 : lucky < LARVA_BOX_CHANCE;
        else boxed = index === 0 ? decoySeen++ === 0 : lucky < DECOY_BOX_CHANCE;
        // true boxes tend to read higher than false ones, but the ranges overlap: a high number is still not proof
        const confidence = boxed ? (kind === 'larva' ? rngInt(rng, 62, 98) : rngInt(rng, 48, 90)) : 0;
        return { id, kind, x: Math.round(x), y: Math.round(y), boxed, confidence, phase };
      });
      return { index, container, items, timeMs: scanTimeMs(index) };
    },
  };
}

/** Where an item is drawn `ms` into a scan: a small bob around its resting spot. */
export function itemPos(item: ScanItem, ms: number, speed: number): { x: number; y: number } {
  const t = (ms / 1000) * speed;
  return { x: item.x + Math.round(Math.sin(t * 1.7 + item.phase) * 2), y: item.y + Math.round(Math.cos(t * 2.1 + item.phase) * 1.5) };
}

/** The live item nearest to a point, within the tap radius, or null. */
export function itemAt(items: readonly ScanItem[], pos: (item: ScanItem) => { x: number; y: number }, x: number, y: number): ScanItem | null {
  let best: ScanItem | null = null;
  let bestD = HIT_RADIUS * HIT_RADIUS + 1;
  for (const item of items) {
    const p = pos(item);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bestD) {
      best = item;
      bestD = d;
    }
  }
  return best;
}

// ---- judging a tap ------------------------------------------------------------------------------------------------
export type TapResult =
  /** WHACK on a box around a real larva. */
  | 'whack'
  /** WHACK on a real larva the AI missed: you add it. */
  | 'add'
  /** REJECT on a box around something that is not a larva. */
  | 'reject'
  /** REJECT on a box around a real larva: you threw out a good box. */
  | 'bad-reject'
  /** WHACK on something that is not a larva. */
  | 'bad-swat'
  /** REJECT on something with no box. */
  | 'no-box'
  /** A tap on empty water. */
  | 'splash';

export const POINTS: Readonly<Record<'whack' | 'add' | 'reject', number>> = { whack: 50, add: 80, reject: 60 };
export const MISTAKE_POINTS = 20;
/** Bonus points per second left when you finish a container early with no larva escaping. */
export const TIME_BONUS_PER_SECOND = 5;

export function judgeTap(item: ScanItem | null, tool: Tool): TapResult {
  if (!item) return 'splash';
  if (tool === 'whack') return isLarva(item) ? (item.boxed ? 'whack' : 'add') : 'bad-swat';
  if (!item.boxed) return 'no-box';
  return isLarva(item) ? 'bad-reject' : 'reject';
}

export const isCorrect = (r: TapResult): r is 'whack' | 'add' | 'reject' => r === 'whack' || r === 'add' || r === 'reject';
export const isMistake = (r: TapResult): boolean => r === 'bad-reject' || r === 'bad-swat';

/** Streak multiplier: x1, plus 0.1 for every right action in a row, up to x2. */
export const multiplierFor = (streak: number): number => Math.min(2, Math.round((1 + 0.1 * streak) * 10) / 10);

/** The line shown after a tap (38 characters at most). */
export function feedback(result: TapResult, item: ScanItem | null, points: number): string {
  const what = item ? OBJECTS[item.kind].name.toUpperCase() : '';
  switch (result) {
    case 'whack':
      return `WHACK! LARVA CAUGHT. +${points}`;
    case 'add':
      return `GOOD EYES! AI MISSED IT. +${points}`;
    case 'reject':
      return `RIGHT! THAT WAS A ${what}. +${points}`;
    case 'bad-reject':
      return `OOPS! THAT WAS A REAL LARVA. -${MISTAKE_POINTS}`;
    case 'bad-swat':
      return `OOPS! THAT IS ONLY A ${what}. -${MISTAKE_POINTS}`;
    case 'no-box':
      return 'NO BOX THERE: NOTHING TO REJECT.';
    default:
      return 'SPLASH! NOTHING THERE.';
  }
}

// ---- the AI's report card -----------------------------------------------------------------------------------------
export interface AiTally {
  /** Boxes that really were larvae. */
  tp: number;
  /** Boxes that were not larvae (false alarms). */
  fp: number;
  /** Real larvae with no box (misses). */
  fn: number;
}

/** Of the AI's boxes, how many were right (0 to 100). With no boxes yet there is nothing to doubt, so it reads 100. */
export const precisionOf = ({ tp, fp }: AiTally): number => (tp + fp === 0 ? 100 : Math.round((tp / (tp + fp)) * 100));
/** Of the real larvae, how many the AI found (0 to 100). */
export const catchRateOf = ({ tp, fn }: AiTally): number => (tp + fn === 0 ? 100 : Math.round((tp / (tp + fn)) * 100));

export interface Settlement {
  /** Real larvae left in the water: they become mosquitoes. */
  escaped: number;
  /** Larvae left that the AI had boxed (so its box was right, but nobody whacked it). */
  boxedLarvae: number;
  /** Boxes on non-larvae nobody rejected. */
  falseLeft: number;
  /** Larvae the AI missed and nobody added. */
  missedLeft: number;
}

/** What is left in the water when a container's time is up (or you press DONE). */
/** `live` holds the ids still in play: not whacked and not rejected. */
export function settle(scan: Scan, live: ReadonlySet<number>): Settlement {
  let boxedLarvae = 0;
  let falseLeft = 0;
  let missedLeft = 0;
  for (const item of scan.items) {
    if (!live.has(item.id)) continue;
    if (isLarva(item)) {
      if (item.boxed) boxedLarvae += 1;
      else missedLeft += 1;
    } else if (item.boxed) falseLeft += 1;
  }
  return { escaped: boxedLarvae + missedLeft, boxedLarvae, falseLeft, missedLeft };
}
