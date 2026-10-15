// Fact or Fake scoring (docs/SPEC.md section 6): d-prime for discernment, c for lean, with "fake" as the signal.
// Pure maths, no UI. Every number the player sees comes from here.
import type { Truth } from '../../content/factOrFake/schema';

export interface Answered {
  truth: Truth;
  answer: Truth;
}

/**
 * Inverse of the standard normal CDF (Acklam's rational approximation, relative error below 1.2e-9).
 * `p` must be inside (0, 1); anything else returns +/-Infinity, so callers correct rates first.
 */
export function zInv(p: number): number {
  if (!(p > 0)) return p === 0 ? -Infinity : NaN;
  if (!(p < 1)) return p === 1 ? Infinity : NaN;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  const at = (arr: number[], i: number): number => arr[i] as number;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((at(c, 0) * q + at(c, 1)) * q + at(c, 2)) * q + at(c, 3)) * q + at(c, 4)) * q + at(c, 5)) / ((((at(d, 0) * q + at(d, 1)) * q + at(d, 2)) * q + at(d, 3)) * q + 1);
  }
  if (p > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((at(c, 0) * q + at(c, 1)) * q + at(c, 2)) * q + at(c, 3)) * q + at(c, 4)) * q + at(c, 5)) / ((((at(d, 0) * q + at(d, 1)) * q + at(d, 2)) * q + at(d, 3)) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((at(a, 0) * r + at(a, 1)) * r + at(a, 2)) * r + at(a, 3)) * r + at(a, 4)) * r + at(a, 5)) * q) / (((((at(b, 0) * r + at(b, 1)) * r + at(b, 2)) * r + at(b, 3)) * r + at(b, 4)) * r + 1);
}

export interface Counts {
  /** Fakes answered "fake". */
  hits: number;
  /** Facts answered "fake". */
  falseAlarms: number;
  nFake: number;
  nFact: number;
}

export function countAnswers(answers: readonly Answered[]): Counts {
  const counts: Counts = { hits: 0, falseAlarms: 0, nFake: 0, nFact: 0 };
  for (const a of answers) {
    if (a.truth === 'fake') {
      counts.nFake++;
      if (a.answer === 'fake') counts.hits++;
    } else {
      counts.nFact++;
      if (a.answer === 'fake') counts.falseAlarms++;
    }
  }
  return counts;
}

/** Log-linear correction so 0% and 100% rates stay finite: (x + 0.5) / (n + 1). With no items the rate is 0.5. */
export const correctedRate = (events: number, n: number): number => (events + 0.5) / (n + 1);

export interface RoundScore {
  total: number;
  correct: number;
  counts: Counts;
  /** Corrected hit rate P(says fake | fake). */
  hitRate: number;
  /** Corrected false-alarm rate P(says fake | fact). */
  falseAlarmRate: number;
  /** Discernment. 0 = guessing, higher is better. */
  dPrime: number;
  /** Bias. Above 0 leans trusting (says "fake" too rarely), below 0 leans doubtful. */
  c: number;
}

export function scoreRound(answers: readonly Answered[]): RoundScore {
  const counts = countAnswers(answers);
  const hitRate = correctedRate(counts.hits, counts.nFake);
  const falseAlarmRate = correctedRate(counts.falseAlarms, counts.nFact);
  const zH = zInv(hitRate);
  const zF = zInv(falseAlarmRate);
  return {
    total: answers.length,
    correct: counts.hits + (counts.nFact - counts.falseAlarms),
    counts,
    hitRate,
    falseAlarmRate,
    dPrime: zH - zF,
    // `0 - x` keeps +0 when both z are zero (a plain `-x` would give -0)
    c: 0 - (zH + zF) / 2,
  };
}

/* ---------- Truth Radar (what the player sees) ---------- */

export const D_PRIME_MAX = 3;
export const LEAN_LIMIT = 1;
/** |c| at or below this counts as balanced (the green zone). */
export const BALANCED_C = 0.25;
/** Rounds shorter than this show the Radar as a "rough read". */
export const MIN_ITEMS_FOR_RADAR = 10;
/** The Timbang na Radar badge needs d-prime at or above this. */
export const BADGE_D_PRIME = 1.5;

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Meter 1: d-prime clamped to 0..3, shown as 0..100. */
export const accuracyPercent = (dPrime: number): number => Math.round((clamp(Number.isFinite(dPrime) ? dPrime : 0, 0, D_PRIME_MAX) / D_PRIME_MAX) * 100);

export type AccuracyLabel = 'start' | 'getting' | 'sharp' | 'pro';

export function accuracyLabel(dPrime: number): AccuracyLabel {
  if (dPrime < 0.5) return 'start';
  if (dPrime < 1.5) return 'getting';
  if (dPrime <= 2.5) return 'sharp';
  return 'pro';
}

/** Meter 2: c clamped to -1..1 and mapped to 0..100 on a two-sided slider (0 = doubtful end, 100 = trusting end). */
export const leanPosition = (c: number): number => Math.round(((clamp(Number.isFinite(c) ? c : 0, -LEAN_LIMIT, LEAN_LIMIT) + LEAN_LIMIT) / (2 * LEAN_LIMIT)) * 100);

export type Lean = 'balanced' | 'trusting' | 'doubtful';

export function leanOf(c: number): Lean {
  if (c > BALANCED_C) return 'trusting';
  if (c < -BALANCED_C) return 'doubtful';
  return 'balanced';
}

export interface Radar {
  accuracy: number;
  accuracyLabel: AccuracyLabel;
  /** 0 (doubtful end) to 100 (trusting end). */
  leanPosition: number;
  lean: Lean;
  /** True for rounds under 10 items. */
  rough: boolean;
  /** True when the round qualifies for the Timbang na Radar badge. */
  earnsBadge: boolean;
}

export function radarFor(score: Pick<RoundScore, 'total' | 'dPrime' | 'c'>): Radar {
  const lean = leanOf(score.c);
  const rough = score.total < MIN_ITEMS_FOR_RADAR;
  return {
    accuracy: accuracyPercent(score.dPrime),
    accuracyLabel: accuracyLabel(score.dPrime),
    leanPosition: leanPosition(score.c),
    lean,
    rough,
    earnsBadge: !rough && score.dPrime >= BADGE_D_PRIME && lean === 'balanced',
  };
}
