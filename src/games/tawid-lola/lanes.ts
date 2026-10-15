// Tawid, Lola! logic (no drawing): the seeded streets, where the traffic is at any moment, the AI guide's advice and how the
// Trust Meter judges a decision. Traffic is a pure function of the lane and the trip clock, so the same seed always plays
// the same streets and the guide always knows exactly what it is (wrongly) saying.
import { rngInt, rngPick, type Rng } from '../engine/rng';

export const COLS = 20;
export const COL_W = 16;
export const VIEW_W = COLS * COL_W;
export const HEARTS = 3;
export const TRUST_START = 50;
/** The guide judges "safe" over the next stretch of time: a step in, plus the step out. */
export const LOOK_MS = 700;
/** Lola's body inside her 16 px column. */
const BODY = { from: 3, to: 13 };

export type VehicleId = 'motor' | 'trike' | 'car' | 'jeep' | 'bus';
export interface Vehicle {
  id: VehicleId;
  name: string;
  /** Width in logical pixels. */
  w: number;
  /** Speed factor: motorbikes are quick, buses are slow. */
  pace: number;
}

export const VEHICLES: Readonly<Record<VehicleId, Vehicle>> = {
  motor: { id: 'motor', name: 'Motorbike', w: 12, pace: 1.25 },
  trike: { id: 'trike', name: 'Tricycle', w: 18, pace: 1 },
  car: { id: 'car', name: 'Car', w: 24, pace: 1.1 },
  jeep: { id: 'jeep', name: 'Jeepney', w: 34, pace: 0.9 },
  bus: { id: 'bus', name: 'Bus', w: 44, pace: 0.8 },
};
const VEHICLE_IDS = Object.keys(VEHICLES) as VehicleId[];

export type LaneKind = 'start' | 'grass' | 'road' | 'clinic';

export interface Lane {
  kind: LaneKind;
  /** Roads only: the vehicle on this lane, its heading (1 = right), speed (px per second) and spacing (px between vehicles). */
  vehicle: VehicleId;
  dir: 1 | -1;
  speed: number;
  period: number;
  phase: number;
  /** Roads only: when true the AI guide says the opposite of the truth on this lane. */
  wrong: boolean;
  /** Roads only: how sure the guide sounds, in percent. */
  confidence: number;
  /** Roads only: which "GO" sentence the guide uses. */
  line: number;
}

export interface Trip {
  no: number;
  /** Lane 0 is the start, the last lane is the health center. */
  lanes: readonly Lane[];
}

export const roadsInTrip = (no: number): number => Math.min(4 + no, 9);
/** Chance that the guide is wrong on a road lane (the first trip is scripted). */
export const wrongChance = (no: number): number => Math.min(0.18 + 0.03 * no, 0.35);
const baseSpeed = (no: number): number => 34 + no * 5;

const IDLE = { vehicle: 'trike', dir: 1, speed: 0, period: 0, phase: 0, wrong: false, confidence: 0, line: 0 } as const satisfies Omit<Lane, 'kind'>;
const rest = (kind: LaneKind): Lane => ({ kind, ...IDLE });

function makeRoad(no: number, wrong: boolean, rng: Rng): Lane {
  const vehicle = VEHICLES[rngPick(VEHICLE_IDS, rng)];
  const speed = Math.min(112, Math.round((baseSpeed(no) + rng() * 12) * vehicle.pace));
  // always leave a gap that lasts longer than the guide's look-ahead, so a safe moment exists
  const period = Math.round(vehicle.w + 16 + speed * (1.5 + rng() * 1.4));
  return {
    kind: 'road',
    vehicle: vehicle.id,
    dir: rng() < 0.5 ? 1 : -1,
    speed,
    period,
    phase: Math.floor(rng() * period),
    wrong,
    confidence: wrong ? rngInt(rng, 88, 100) : rngInt(rng, 80, 100),
    line: rngInt(rng, 0, GO_LINES.length),
  };
}

/** Which road lanes (0-based among the roads) the guide gets wrong. Never two in a row, never the first, and at least one. */
export function wrongRoads(no: number, roads: number, rng: Rng): boolean[] {
  const flags: boolean[] = [];
  for (let i = 0; i < roads; i++) {
    if (no === 0) flags.push(i === 1);
    else flags.push(i > 0 && !flags[i - 1] && rng() < wrongChance(no));
  }
  if (!flags.includes(true)) flags[1 + Math.floor(rng() * (roads - 1))] = true;
  return flags;
}

function buildTrip(no: number, rng: Rng): Trip {
  const roads = roadsInTrip(no);
  const wrong = wrongRoads(no, roads, rng);
  const lanes: Lane[] = [rest('start')];
  let sinceRest = 0;
  for (let r = 0; r < roads; r++) {
    // a strip of grass to catch your breath after every three roads, if two or more roads remain
    if (sinceRest === 3 && roads - r >= 2) {
      lanes.push(rest('grass'));
      sinceRest = 0;
    }
    lanes.push(makeRoad(no, wrong[r] === true, rng));
    sinceRest += 1;
  }
  lanes.push(rest('clinic'));
  return { no, lanes };
}

export interface TripGenerator {
  trip(no: number): Trip;
}

/** Trips are built in order and remembered, so what you do never changes the streets that come later. */
export function createTripGenerator(rng: Rng): TripGenerator {
  const cache: Trip[] = [];
  return {
    trip(no) {
      while (cache.length <= no) cache.push(buildTrip(cache.length, rng));
      return cache[no] as Trip;
    },
  };
}

// ---- traffic ----------------------------------------------------------------------------------------------------
/** Left edges of the vehicles of a road lane that are on (or just off) the screen, `tMs` into the trip. */
export function carsAt(lane: Lane, tMs: number): number[] {
  if (lane.kind !== 'road') return [];
  const w = VEHICLES[lane.vehicle].w;
  const moved = lane.phase + (lane.dir * lane.speed * tMs) / 1000;
  const base = ((moved % lane.period) + lane.period) % lane.period;
  const out: number[] = [];
  for (let x = base - lane.period; x < VIEW_W; x += lane.period) if (x + w > 0) out.push(x);
  return out;
}

/** Is Lola, standing in column `col`, hit by a vehicle of this lane at this moment? */
export function hitsAt(lane: Lane, col: number, tMs: number): boolean {
  if (lane.kind !== 'road') return false;
  const w = VEHICLES[lane.vehicle].w;
  const left = col * COL_W + BODY.from;
  const right = col * COL_W + BODY.to;
  return carsAt(lane, tMs).some((x) => x < right && x + w > left);
}

/** Seconds until a vehicle reaches column `col` (0 if one is there now), or null if none does within `maxMs`. */
export function secondsToHit(lane: Lane, col: number, tMs: number, maxMs = 3000): number | null {
  for (let dt = 0; dt <= maxMs; dt += 50) if (hitsAt(lane, col, tMs + dt)) return dt / 1000;
  return null;
}

/** Would a step into this lane now stay clear of traffic for the look-ahead time? Grass is always safe. */
export function isSafe(lane: Lane, col: number, tMs: number, lookMs = LOOK_MS): boolean {
  return secondsToHit(lane, col, tMs, lookMs) === null;
}

// ---- the AI guide ------------------------------------------------------------------------------------------------
export interface Advice {
  go: boolean;
  /** True when the guide is telling the truth about this lane. */
  correct: boolean;
  confidence: number;
  /** "GO!" or "WAIT!" */
  headline: string;
  /** One short sentence (34 characters at most). */
  reason: string;
}

export const GO_LINES = ['Looks clear. Step now.', 'Gap ahead. You can go.', 'No traffic. Safe to go.'] as const;

/** What the guide says about stepping into `next` from column `col`. Returns null for grass and the health center. */
export function adviceFor(next: Lane | undefined, col: number, tMs: number): Advice | null {
  if (!next || next.kind !== 'road') return null;
  const truth = isSafe(next, col, tMs);
  // a "wrong" lane flips the truth, and the guide sounds just as sure
  const go = next.wrong ? !truth : truth;
  return {
    go,
    correct: !next.wrong,
    confidence: next.confidence,
    headline: go ? 'GO!' : 'WAIT!',
    reason: go ? (GO_LINES[next.line] as string) : `${VEHICLES[next.vehicle].name} coming. Hold on.`,
  };
}

/** What the guide says when the next row is grass or the health center. */
export const calmLine = (next: Lane | undefined): string => (next?.kind === 'clinic' ? 'The health center is ahead!' : 'Grass ahead. No traffic here.');

// ---- the Trust Meter ----------------------------------------------------------------------------------------------
export type Decision = 'go' | 'wait';
/** trust-right: you followed it and it was right. trust-wrong: you followed it and it was wrong.
 *  override-right: you went against it and it was wrong. override-wrong: you went against it and it was right. */
export type Verdict = 'trust-right' | 'trust-wrong' | 'override-right' | 'override-wrong';

export interface Assessment {
  verdict: Verdict;
  /** Change to the Trust Meter. */
  delta: number;
  /** Extra points for a good override. */
  bonus: number;
  /** For the status strip (25 characters at most). */
  message: string;
  good: boolean;
}

export const OVERRIDE_BONUS = 30;

export function verdictFor(advice: Pick<Advice, 'go' | 'correct'>, decision: Decision): Verdict {
  const followed = (decision === 'go') === advice.go;
  if (followed) return advice.correct ? 'trust-right' : 'trust-wrong';
  return advice.correct ? 'override-wrong' : 'override-right';
}

/** Following a right guide and overriding a wrong one raise the meter; blind trust in a wrong one costs most. */
export function assess(advice: Pick<Advice, 'go' | 'correct'>, decision: Decision): Assessment {
  const verdict = verdictFor(advice, decision);
  const delta = {
    'trust-right': 8,
    'trust-wrong': decision === 'go' ? -12 : -6,
    'override-right': 14,
    'override-wrong': decision === 'go' ? -8 : -3,
  }[verdict];
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const message = {
    'trust-right': `AI WAS RIGHT ${sign(delta)}`,
    'trust-wrong': `AI WAS WRONG! ${sign(delta)}`,
    'override-right': `GOOD CALL! ${sign(delta)}`,
    'override-wrong': decision === 'go' ? `AI SAID WAIT ${sign(delta)}` : `AI SAID GO ${sign(delta)}`,
  }[verdict];
  return { verdict, delta, bonus: verdict === 'override-right' ? OVERRIDE_BONUS : 0, message, good: delta > 0 };
}

export const clampTrust = (n: number): number => Math.max(0, Math.min(100, n));
/** Score multiplier from the meter: x1.0 at 0 to x2.0 at 100, in steps of 0.1. */
export const multiplierFor = (trust: number): number => 1 + Math.floor(clampTrust(trust) / 10) / 10;

export const LANE_POINTS = 10;
export const TRIP_POINTS = 100;
