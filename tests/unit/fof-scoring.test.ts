import { describe, expect, it } from 'vitest';
import type { Truth } from '../../src/content/factOrFake/schema';
import {
  BADGE_D_PRIME,
  accuracyLabel,
  accuracyPercent,
  correctedRate,
  countAnswers,
  leanOf,
  leanPosition,
  radarFor,
  scoreRound,
  zInv,
  type Answered,
} from '../../src/games/fact-or-fake/scoring';

/** `fake`/`fact` truths with the given answers: hits of nFake, falseAlarms of nFact. */
function round(nFake: number, hits: number, nFact: number, falseAlarms: number): Answered[] {
  const list: Answered[] = [];
  for (let i = 0; i < nFake; i++) list.push({ truth: 'fake', answer: i < hits ? 'fake' : 'fact' });
  for (let i = 0; i < nFact; i++) list.push({ truth: 'fact', answer: i < falseAlarms ? 'fake' : 'fact' });
  return list;
}

describe('zInv (inverse normal CDF)', () => {
  it('matches known quantiles', () => {
    expect(zInv(0.5)).toBeCloseTo(0, 9);
    expect(zInv(0.975)).toBeCloseTo(1.959964, 5);
    expect(zInv(0.8413447)).toBeCloseTo(1, 5);
    expect(zInv(0.99)).toBeCloseTo(2.326348, 5);
    expect(zInv(0.9999)).toBeCloseTo(3.719016, 4);
    expect(zInv(1e-10)).toBeCloseTo(-6.361341, 4);
  });

  it('is antisymmetric and increasing across all three regions', () => {
    let prev = -Infinity;
    for (const p of [0.001, 0.02, 0.03, 0.2, 0.5, 0.8, 0.97, 0.98, 0.999]) {
      const z = zInv(p);
      expect(z).toBeGreaterThan(prev);
      expect(z).toBeCloseTo(-zInv(1 - p), 9);
      prev = z;
    }
  });

  it('is infinite at 0 and 1 and NaN outside the range', () => {
    expect(zInv(0)).toBe(-Infinity);
    expect(zInv(1)).toBe(Infinity);
    expect(zInv(-0.1)).toBeNaN();
    expect(zInv(1.1)).toBeNaN();
    expect(zInv(NaN)).toBeNaN();
  });
});

describe('counts and corrected rates', () => {
  it('counts hits and false alarms with fake as the signal', () => {
    const answers: Answered[] = [
      { truth: 'fake', answer: 'fake' }, // hit
      { truth: 'fake', answer: 'fact' }, // miss
      { truth: 'fact', answer: 'fake' }, // false alarm
      { truth: 'fact', answer: 'fact' }, // correct rejection
      { truth: 'fact', answer: 'fact' },
    ];
    expect(countAnswers(answers)).toEqual({ hits: 1, falseAlarms: 1, nFake: 2, nFact: 3 });
  });

  it('applies the log-linear correction (x + 0.5) / (n + 1)', () => {
    expect(correctedRate(0, 5)).toBeCloseTo(0.5 / 6, 12);
    expect(correctedRate(5, 5)).toBeCloseTo(5.5 / 6, 12);
    expect(correctedRate(3, 10)).toBeCloseTo(3.5 / 11, 12);
    expect(correctedRate(0, 0)).toBe(0.5);
  });
});

describe('scoreRound: d-prime and c', () => {
  const z = zInv(5.5 / 6);

  it('a perfect 5 + 5 round gives a high d-prime and no bias', () => {
    const s = scoreRound(round(5, 5, 5, 0));
    expect(s.correct).toBe(10);
    expect(s.total).toBe(10);
    expect(s.hitRate).toBeCloseTo(5.5 / 6, 12);
    expect(s.falseAlarmRate).toBeCloseTo(0.5 / 6, 12);
    expect(s.dPrime).toBeCloseTo(2 * z, 9);
    expect(s.c).toBeCloseTo(0, 9);
  });

  it('a perfectly wrong round gives the opposite d-prime and no bias', () => {
    const s = scoreRound(round(5, 0, 5, 5));
    expect(s.correct).toBe(0);
    expect(s.dPrime).toBeCloseTo(-2 * z, 9);
    expect(s.c).toBeCloseTo(0, 9);
  });

  it('always saying "fake" has no discernment and leans doubtful (c < 0)', () => {
    const s = scoreRound(round(5, 5, 5, 5));
    expect(s.dPrime).toBeCloseTo(0, 9);
    expect(s.c).toBeCloseTo(-z, 9);
    expect(s.c).toBeLessThan(0);
    expect(s.correct).toBe(5);
  });

  it('always saying "fact" has no discernment and leans trusting (c > 0)', () => {
    const s = scoreRound(round(5, 0, 5, 0));
    expect(s.dPrime).toBeCloseTo(0, 9);
    expect(s.c).toBeCloseTo(z, 9);
    expect(s.c).toBeGreaterThan(0);
  });

  it('computes mixed rounds from the formulas', () => {
    // 4 of 5 fakes caught, 1 of 5 facts called fake
    const s = scoreRound(round(5, 4, 5, 1));
    const zH = zInv(4.5 / 6);
    const zF = zInv(1.5 / 6);
    expect(s.dPrime).toBeCloseTo(zH - zF, 9);
    expect(s.c).toBeCloseTo(-(zH + zF) / 2, 9);
    expect(s.correct).toBe(8);
  });

  it('stays finite at 0% and 100% rates, including one-sided rounds', () => {
    const cases = [round(5, 5, 5, 0), round(5, 0, 5, 5), round(5, 5, 0, 0), round(0, 0, 5, 5), round(1, 1, 0, 0), round(0, 0, 1, 0)];
    for (const answers of cases) {
      const s = scoreRound(answers);
      expect(Number.isFinite(s.dPrime)).toBe(true);
      expect(Number.isFinite(s.c)).toBe(true);
    }
  });

  it('an empty round is neutral and never negative zero', () => {
    const s = scoreRound([]);
    expect(s.total).toBe(0);
    expect(s.dPrime).toBe(0);
    expect(Object.is(s.c, 0)).toBe(true);
  });

  it('a longer perfect round scores higher than a shorter one (the correction fades)', () => {
    expect(scoreRound(round(10, 10, 10, 0)).dPrime).toBeGreaterThan(scoreRound(round(5, 5, 5, 0)).dPrime);
  });

  it('swapping which answers are given flips the sign of c only for the lean', () => {
    const trusting = scoreRound(round(5, 2, 5, 0));
    const doubtful = scoreRound(round(5, 5, 5, 3));
    expect(trusting.c).toBeGreaterThan(0.25);
    expect(doubtful.c).toBeLessThan(-0.25);
  });
});

describe('Truth Radar mapping', () => {
  it('maps d-prime 0..3 to 0..100 and clamps outside it', () => {
    expect(accuracyPercent(0)).toBe(0);
    expect(accuracyPercent(1.5)).toBe(50);
    expect(accuracyPercent(3)).toBe(100);
    expect(accuracyPercent(-2)).toBe(0);
    expect(accuracyPercent(7)).toBe(100);
    expect(accuracyPercent(NaN)).toBe(0);
    expect(accuracyPercent(Infinity)).toBe(0);
  });

  it('labels the d-prime bands at their boundaries', () => {
    expect(accuracyLabel(-1)).toBe('start');
    expect(accuracyLabel(0.49)).toBe('start');
    expect(accuracyLabel(0.5)).toBe('getting');
    expect(accuracyLabel(1.49)).toBe('getting');
    expect(accuracyLabel(1.5)).toBe('sharp');
    expect(accuracyLabel(2.5)).toBe('sharp');
    expect(accuracyLabel(2.51)).toBe('pro');
  });

  it('maps c -1..1 to a 0..100 slider (right = trusting) and clamps', () => {
    expect(leanPosition(0)).toBe(50);
    expect(leanPosition(1)).toBe(100);
    expect(leanPosition(-1)).toBe(0);
    expect(leanPosition(0.5)).toBe(75);
    expect(leanPosition(4)).toBe(100);
    expect(leanPosition(-4)).toBe(0);
    expect(leanPosition(NaN)).toBe(50);
  });

  it('calls |c| <= 0.25 balanced, above leans trusting, below leans doubtful', () => {
    expect(leanOf(0)).toBe('balanced');
    expect(leanOf(0.25)).toBe('balanced');
    expect(leanOf(-0.25)).toBe('balanced');
    expect(leanOf(0.2501)).toBe('trusting');
    expect(leanOf(-0.2501)).toBe('doubtful');
  });

  it('marks rounds under 10 items as a rough read', () => {
    expect(radarFor({ total: 9, dPrime: 2, c: 0 }).rough).toBe(true);
    expect(radarFor({ total: 10, dPrime: 2, c: 0 }).rough).toBe(false);
  });

  it('awards the badge only for 10+ items, d-prime >= 1.5 and a balanced lean', () => {
    expect(BADGE_D_PRIME).toBe(1.5);
    expect(radarFor({ total: 10, dPrime: 1.5, c: 0.25 }).earnsBadge).toBe(true);
    expect(radarFor({ total: 9, dPrime: 3, c: 0 }).earnsBadge).toBe(false);
    expect(radarFor({ total: 10, dPrime: 1.49, c: 0 }).earnsBadge).toBe(false);
    expect(radarFor({ total: 10, dPrime: 3, c: 0.26 }).earnsBadge).toBe(false);
    expect(radarFor({ total: 10, dPrime: 3, c: -0.26 }).earnsBadge).toBe(false);
  });

  it('a perfect 10-item round gets the full radar and the badge', () => {
    const score = scoreRound(round(5, 5, 5, 0));
    const radar = radarFor(score);
    expect(radar.accuracy).toBe(Math.round((Math.min(score.dPrime, 3) / 3) * 100));
    expect(radar.accuracyLabel).toBe('pro');
    expect(radar.lean).toBe('balanced');
    expect(radar.leanPosition).toBe(50);
    expect(radar.earnsBadge).toBe(true);
  });

  it('compiles with the Truth type used by callers', () => {
    const t: Truth = 'fake';
    expect(scoreRound([{ truth: t, answer: t }]).correct).toBe(1);
  });
});
