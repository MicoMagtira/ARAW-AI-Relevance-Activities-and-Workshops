// Tulog na, Bea! rules with no drawing in them, so they are all unit-tested: which moment comes in each part of the day
// (seeded, so days never repeat), how a choice changes the four meters, what boundaries cost and save, scoring and the
// "reset day" ending. Turn-based on purpose: no clock to beat, so nothing here is timed.
import { createRng, rngPick, type Rng } from '../engine/rng';
import { BOUNDARIES, LIFE, METERS, PULLS_POOL, SLOTS, boundaryById, type BoundaryId, type Fx, type MeterId, type Moment, type MomentOption, type SlotId } from './moments';

export type Meters = Readonly<Record<MeterId, number>>;

export const START: Meters = { sleep: 70, mood: 70, study: 70, social: 70 };
export const METER_MAX = 100;
/** Points for a good day (all four meters above 50 at bedtime). */
export const GOOD_DAY_BONUS = 100;
export const GOOD_DAY_LINE = 50;
/** Score that counts as a "good run" (+20 XP). About seven good days. */
export const GOOD_RUN = 1500;
/** Days in the Module 8 game. */
export const MODULE_DAYS = 3;

/** Every day, the meters drift down a little. It grows slowly as days go by (busier school, more apps). */
export const BASE_DRIFT: Fx = [-20, -3, -5, -5];

export interface Game {
  seed: string;
  /** 1-based day number. */
  day: number;
  /** Index into SLOTS; SLOTS.length means the day is over and waits for `endDay`. */
  slot: number;
  meters: Meters;
  boundaries: readonly BoundaryId[];
  score: number;
  /** Days that ended with all four meters above 50. */
  goodDays: number;
  /** Times Bea gave in to a pull. */
  gaveIn: number;
  /** Times she met a pull and chose something else. */
  resisted: number;
  /** The meter that hit zero. Ends the run: "Bea needs a reset day". */
  reset: MeterId | null;
}

export const newGame = (seed: string): Game => ({ seed, day: 1, slot: 0, meters: START, boundaries: [], score: 0, goodDays: 0, gaveIn: 0, resisted: 0, reset: null });

const clamp = (n: number): number => Math.max(0, Math.min(METER_MAX, n));

/** Apply a change to the meters (clamped to 0..100). */
export function applyFx(meters: Meters, fx: Fx): Meters {
  const next = { ...meters };
  METERS.forEach((m, i) => {
    next[m] = clamp(meters[m] + (fx[i] ?? 0));
  });
  return next;
}

/** The change a move really made after clamping, so the chips match what the meters did. */
export function actualFx(before: Meters, after: Meters): Fx {
  return METERS.map((m) => after[m] - before[m]) as unknown as Fx;
}

const sumFx = (list: readonly Fx[]): Fx => METERS.map((_, i) => list.reduce((a, f) => a + (f[i] ?? 0), 0)) as unknown as Fx;

/** The day's drift: the base plus upkeep for each boundary that is on. */
export function driftFor(day: number, boundaries: readonly BoundaryId[]): Fx {
  const extra = Math.min(3, Math.floor((day - 1) / 5));
  const base: Fx = [BASE_DRIFT[0], BASE_DRIFT[1] - extra, BASE_DRIFT[2] - extra, BASE_DRIFT[3] - extra];
  return sumFx([base, ...boundaries.map((b) => boundaryById(b).upkeep)]);
}

const BASE_PULL: Readonly<Record<SlotId, number>> = { morning: 0.45, school: 0.55, afternoon: 0.55, dinner: 0.5, evening: 0.65, night: 0.7 };
/** A boundary that covers a part of the day leaves only this share of the pulls. */
const BOUNDARY_PULL_LEFT = 0.2;

/** Chance that this part of the day is a pull rather than an ordinary moment. Grows with the days; capped at 0.9. */
export function pullChance(day: number, slot: SlotId, boundaries: readonly BoundaryId[]): number {
  const raw = Math.min(0.9, BASE_PULL[slot] + 0.03 * (day - 1));
  return boundaries.some((b) => boundaryById(b).slots.includes(slot)) ? raw * BOUNDARY_PULL_LEFT : raw;
}

/** The six moments of a day. Same seed, day and boundaries give the same moments; a new day gives new ones. */
export function buildDay(seed: string, day: number, boundaries: readonly BoundaryId[]): Moment[] {
  const rng: Rng = createRng(`${seed}:tulog:${day}`);
  const blocked = new Set(boundaries.flatMap((b) => boundaryById(b).blocks));
  return SLOTS.map((slot) => {
    const lifeHere = LIFE.filter((m) => m.slot === slot);
    const pullsHere = PULLS_POOL.filter((m) => m.slot === slot && !(m.source && blocked.has(m.source)));
    // draw both, so one boundary does not change which ordinary moment comes
    const chance = rng();
    const pulled = rngPick(pullsHere.length > 0 ? pullsHere : lifeHere, rng);
    const ordinary = rngPick(lifeHere, rng);
    return pullsHere.length > 0 && chance < pullChance(day, slot, boundaries) ? pulled : ordinary;
  });
}

/** How balanced Bea is after a choice: points for each part of the day. */
export function balancePoints(meters: Meters): number {
  const low = Math.min(...METERS.map((m) => meters[m]));
  return low >= 60 ? 20 : low >= 40 ? 10 : low >= 20 ? 4 : 0;
}

export const isGoodDay = (meters: Meters): boolean => METERS.every((m) => meters[m] > GOOD_DAY_LINE);

const zero = (meters: Meters): MeterId | null => METERS.find((m) => meters[m] <= 0) ?? null;

/** Switch a boundary on or off. Switching on costs a little now; switching off is free. Never ends the run. */
export function toggleBoundary(game: Game, id: BoundaryId): Game {
  if (game.boundaries.includes(id)) return { ...game, boundaries: game.boundaries.filter((b) => b !== id) };
  const meters = { ...applyFx(game.meters, boundaryById(id).setCost) };
  // a set-up cost never takes a meter to zero: only the day's choices can end the run
  for (const m of METERS) if (meters[m] < 1) meters[m] = Math.min(1, game.meters[m]);
  return { ...game, meters, boundaries: BOUNDARIES.map((b) => b.id).filter((b) => b === id || game.boundaries.includes(b)) };
}

export interface ChoiceOutcome {
  game: Game;
  /** What each meter really changed by. */
  change: Fx;
  points: number;
  /** Bea gave in to the pull. */
  gaveIn: boolean;
}

/** Pick an option of the current moment. Moves on to the next part of the day. */
export function choose(game: Game, moment: Moment, option: MomentOption): ChoiceOutcome {
  const meters = applyFx(game.meters, option.fx);
  const points = balancePoints(meters);
  const gaveIn = moment.source !== null && option.pull === true;
  const next: Game = {
    ...game,
    meters,
    slot: game.slot + 1,
    score: game.score + points,
    gaveIn: game.gaveIn + (gaveIn ? 1 : 0),
    resisted: game.resisted + (moment.source !== null && !gaveIn ? 1 : 0),
    reset: zero(meters),
  };
  return { game: next, change: actualFx(game.meters, meters), points, gaveIn };
}

export interface DayEnd {
  game: Game;
  /** What the day's drift took off each meter. */
  drift: Fx;
  good: boolean;
  bonus: number;
}

/** Close the day at bedtime: the good-day bonus, then the drift, then the next morning. */
export function endDay(game: Game): DayEnd {
  const good = isGoodDay(game.meters);
  const bonus = good ? GOOD_DAY_BONUS : 0;
  const meters = applyFx(game.meters, driftFor(game.day, game.boundaries));
  const next: Game = {
    ...game,
    meters,
    day: game.day + 1,
    slot: 0,
    score: game.score + bonus,
    goodDays: game.goodDays + (good ? 1 : 0),
    reset: game.reset ?? zero(meters),
  };
  return { game: next, drift: actualFx(game.meters, meters), good, bonus };
}

/** Module stars: a reset day is one star; otherwise two or more good days are three, one is two. */
export function starsFor(goodDays: number, reset: MeterId | null): 1 | 2 | 3 {
  if (reset) return 1;
  return goodDays >= 2 ? 3 : goodDays >= 1 ? 2 : 1;
}

export type Feeling = 'happy' | 'okay' | 'sleepy' | 'sad' | 'worried';

/** How Bea looks: her lowest meter decides when it is low, otherwise she is okay or happy. */
export function feelingOf(meters: Meters): Feeling {
  const low = METERS.reduce((a, m) => (meters[m] < meters[a] ? m : a), METERS[0] as MeterId);
  if (meters[low] < 35) return low === 'sleep' ? 'sleepy' : low === 'study' ? 'worried' : 'sad';
  return meters[low] >= 55 ? 'happy' : 'okay';
}

/** Why the run ended, said kindly. */
export const RESET_TEXT: Readonly<Record<MeterId, string>> = {
  sleep: 'Bea ran out of sleep. Tired bodies cannot think or feel their best. A reset day of rest will help.',
  mood: 'Bea’s mood ran out. Everyone needs rest, fun and people who care. A reset day will help.',
  study: 'Bea fell too far behind in school. Tomorrow is a reset day: a plan and a little help from her teacher.',
  social: 'Bea lost touch with her friends and family. A reset day with the people she loves will help.',
};

export const sumChange = (change: Fx): number => change.reduce((a, b) => a + b, 0);
