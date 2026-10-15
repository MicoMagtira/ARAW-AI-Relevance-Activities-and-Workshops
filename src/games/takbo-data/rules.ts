// Pure rules for Takbo, Data!: speed, scoring, the Privacy Shield and the seeded spawn rules. No drawing here.
import { rngInt, rngPick, shuffle, type Rng } from '../engine/rng';
import { DATA_TRAPS, SAFE_OFFERS, type DataKind, type SafeKind } from './offers';

export const LANES = 3;
export const SHIELD_MAX = 100;
export const SAFE_REFILL = 5;
export const BUMP_COST = 10;
export const SAFE_POINTS = 10;
/** Road pixels per metre of distance score. */
export const PX_PER_M = 16;

export const SPEED_START = 90;
export const SPEED_MAX = 230;
/** Pixels per second gained for every second of running. */
export const SPEED_RAMP = 1.8;

export const speedAt = (seconds: number): number => Math.min(SPEED_MAX, SPEED_START + SPEED_RAMP * Math.max(0, seconds));

export const distanceMetres = (px: number): number => Math.floor(px / PX_PER_M);

/** Distance plus 10 per safe pickup. */
export const scoreOf = (px: number, safeGrabs: number): number => distanceMetres(px) + SAFE_POINTS * safeGrabs;

export const refill = (shield: number): number => Math.min(SHIELD_MAX, shield + SAFE_REFILL);
export const drain = (shield: number, cost: number): number => Math.max(0, shield - cost);

// Spawn rules ---------------------------------------------------------------------------------------------------

export type ObstacleKind = 'puddle' | 'chicken' | 'pothole';
export const OBSTACLES: readonly ObstacleKind[] = ['puddle', 'chicken', 'pothole'];

export type Cell = { type: 'obstacle'; kind: ObstacleKind } | { type: 'safe'; kind: SafeKind } | { type: 'trap'; kind: DataKind } | null;
export type Cells = [Cell, Cell, Cell];

export interface Row {
  index: number;
  cells: Cells;
  /** Road pixels from this row to the next one. */
  gap: number;
}

/** Seconds of running between two rows, so there is always time to react and land a jump. */
export const REACTION_SECONDS = 0.9;
export const MIN_GAP_BASE = 70;
export const MAX_EXTRA_GAP = 70;
/** Rows before data traps may share a row (two bad lanes at once). */
export const HARD_FROM_ROW = 6;
/** A safe pickup shows up at least this often (in rows). */
export const SAFE_EVERY = 4;

export const minGap = (speed: number): number => Math.round(MIN_GAP_BASE + speed * REACTION_SECONDS);

/** A lane is blocked when it holds an obstacle or a data trap. */
export const isBad = (cell: Cell): boolean => cell !== null && cell.type !== 'safe';

export interface Spawner {
  /** The next row of the road, with the gap that follows it at the current speed. */
  next(speed: number): Row;
}

export function createSpawner(rng: Rng): Spawner {
  let index = 0;
  let sinceSafe = 0;

  const place = (cells: Cells, lanes: number[], make: () => Cell): void => {
    const lane = lanes.pop();
    if (lane !== undefined) cells[lane] = make();
  };
  const safe = (): Cell => ({ type: 'safe', kind: rngPick(SAFE_OFFERS, rng).kind });
  const trap = (): Cell => ({ type: 'trap', kind: rngPick(DATA_TRAPS, rng).kind });
  const obstacle = (): Cell => ({ type: 'obstacle', kind: rngPick(OBSTACLES, rng) });

  return {
    next(speed) {
      const cells: Cells = [null, null, null];
      const lanes = shuffle([0, 1, 2], rng);
      const hard = index >= HARD_FROM_ROW;
      if (index < 2) {
        place(cells, lanes, safe); // a gentle start: two safe freebies
      } else if (index === 2) {
        place(cells, lanes, obstacle);
      } else {
        const roll = rng();
        if (roll < 0.3) {
          place(cells, lanes, obstacle);
          if (hard && rng() < 0.4) place(cells, lanes, obstacle);
          if (lanes.length > 0 && rng() < 0.35) place(cells, lanes, safe);
        } else if (roll < 0.7) {
          place(cells, lanes, safe);
          place(cells, lanes, trap);
          if (hard && rng() < 0.5) place(cells, lanes, trap);
        } else if (roll < 0.85) {
          place(cells, lanes, safe);
          if (rng() < 0.4) place(cells, lanes, safe);
        } else {
          place(cells, lanes, obstacle);
          place(cells, lanes, hard ? trap : safe); // an obstacle and a trap together only in the hard rows
        }
      }
      // never let a long stretch pass without a safe pickup to refill the Shield
      if (sinceSafe >= SAFE_EVERY - 1 && !cells.some((c) => c?.type === 'safe')) {
        const free = cells.findIndex((c) => c === null);
        if (free >= 0) cells[free] = safe();
      }
      sinceSafe = cells.some((c) => c?.type === 'safe') ? 0 : sinceSafe + 1;
      const gap = minGap(speed) + rngInt(rng, 0, MAX_EXTRA_GAP + 1);
      return { index: index++, cells, gap };
    },
  };
}
