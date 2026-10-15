import { afterEach, describe, expect, it } from 'vitest';
import { RUN_XP_MAX, bestScores, briefingsSeen, markBriefingSeen, recordRun, runXp } from '../../src/app/scores';
import { resetAll } from '../../src/app/store';
import { xp } from '../../src/app/state';

afterEach(() => resetAll());

describe('run XP', () => {
  it('pays 10 base, +20 for a good run, +20 for a new best, at most 50', () => {
    expect(runXp(3, 10, false)).toBe(10);
    expect(runXp(10, 10, false)).toBe(30);
    expect(runXp(3, 10, true)).toBe(30);
    expect(runXp(10, 10, true)).toBe(50);
    expect(runXp(10, 10, true)).toBeLessThanOrEqual(RUN_XP_MAX);
  });
});

describe('recording a run', () => {
  it('saves the personal best, flags a new best once and pays XP', () => {
    const first = recordRun('demo', 8, 5);
    expect(first).toMatchObject({ score: 8, previousBest: 0, best: 8, newBest: true, goodRun: true, xp: 50 });
    expect(bestScores.value.demo).toBe(8);
    expect(xp.value).toBe(50);

    const worse = recordRun('demo', 4, 5);
    expect(worse).toMatchObject({ previousBest: 8, best: 8, newBest: false, goodRun: false, xp: 10 });
    expect(bestScores.value.demo).toBe(8);
    expect(xp.value).toBe(60);

    expect(recordRun('demo', 8, 5).newBest).toBe(false); // equal is not a new best
  });

  it('never saves a zero score as a best and cleans odd scores', () => {
    expect(recordRun('demo', 0, 5).newBest).toBe(false);
    expect(bestScores.value.demo).toBeUndefined();
    expect(recordRun('demo', Number.NaN, 5).score).toBe(0);
    expect(recordRun('demo', 7.9, 5).score).toBe(7);
  });

  it('keeps bests per game', () => {
    recordRun('a', 5, 100);
    recordRun('b', 9, 100);
    expect(bestScores.value).toEqual({ a: 5, b: 9 });
  });
});

describe('briefings seen', () => {
  it('remembers each game once', () => {
    expect(briefingsSeen.value).toEqual([]);
    markBriefingSeen('demo');
    markBriefingSeen('demo');
    expect(briefingsSeen.value).toEqual(['demo']);
  });
});
