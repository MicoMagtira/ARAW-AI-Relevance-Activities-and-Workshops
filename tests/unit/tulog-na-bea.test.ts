// Tulog na, Bea! (T23): the content, the meters, the boundaries, the seeded days, scoring and the reset-day ending.
import { describe, expect, it } from 'vitest';
import { BOUNDARIES, LIFE, METERS, PULLS_POOL, SLOTS, boundaryById, type BoundaryId, type Fx, type Moment, type MomentOption } from '../../src/games/tulog-na-bea/moments';
import {
  BASE_DRIFT,
  GOOD_DAY_BONUS,
  MODULE_DAYS,
  START,
  applyFx,
  balancePoints,
  buildDay,
  choose,
  driftFor,
  endDay,
  feelingOf,
  isGoodDay,
  newGame,
  pullChance,
  starsFor,
  toggleBoundary,
  type Game,
  type Meters,
} from '../../src/games/tulog-na-bea/sim';

const total = (fx: Fx): number => fx.reduce((a, b) => a + b, 0);
const metersOf = (sleep: number, mood: number, study: number, social: number): Meters => ({ sleep, mood, study, social });

describe('moments content', () => {
  it('has life moments and pull moments for every part of the day', () => {
    for (const slot of SLOTS) {
      expect(LIFE.filter((m) => m.slot === slot).length, `life ${slot}`).toBeGreaterThanOrEqual(1);
      expect(PULLS_POOL.filter((m) => m.slot === slot).length, `pull ${slot}`).toBeGreaterThanOrEqual(2);
    }
    expect(new Set([...LIFE, ...PULLS_POOL].map((m) => m.id)).size).toBe(LIFE.length + PULLS_POOL.length);
  });

  it('gives every moment three options a, b and c, each with a lesson', () => {
    for (const m of [...LIFE, ...PULLS_POOL]) {
      expect(m.options.map((o) => o.id), m.id).toEqual(['a', 'b', 'c']);
      for (const o of m.options) {
        expect(o.lesson.length, `${m.id}/${o.id}`).toBeGreaterThan(20);
        expect(o.fx).toHaveLength(4);
      }
    }
  });

  it('marks exactly one option of each pull moment as giving in, and none on life moments', () => {
    for (const m of PULLS_POOL) {
      expect(m.source, m.id).not.toBeNull();
      expect(m.options.filter((o) => o.pull)).toHaveLength(1);
      expect(m.options[0]?.pull, m.id).toBe(true);
    }
    for (const m of LIFE) {
      expect(m.source).toBeNull();
      expect(m.options.some((o) => o.pull)).toBe(false);
    }
  });

  it('makes giving in worse than the best other choice, even when it feels good', () => {
    for (const m of PULLS_POOL) {
      const gave = m.options.find((o) => o.pull) as MomentOption;
      const others = m.options.filter((o) => !o.pull);
      expect(Math.max(...others.map((o) => total(o.fx))), m.id).toBeGreaterThan(total(gave.fx));
      // the pull is tempting: it lifts Mood or Social right now
      expect(gave.fx[1] >= 2 || gave.fx[3] > 0, m.id).toBe(true);
    }
  });

  it('puts the companion in the story: "I will miss you" pulls and a chatbot-as-tool moment', () => {
    const text = PULLS_POOL.filter((m) => m.source === 'companion').map((m) => m.title + m.text).join(' ');
    expect(text).toMatch(/I will miss you/);
    expect(LIFE.some((m) => /chatbot/i.test(m.text) && m.options.some((o) => /own words|check/i.test(o.text)))).toBe(true);
    expect(PULLS_POOL.some((m) => m.source === 'companion' && m.slot === 'night')).toBe(true);
  });

  it('has the four boundaries with a plain-words cost and a real set-up cost', () => {
    expect(BOUNDARIES.map((b) => b.id)).toEqual(['focus', 'dinner', 'bedtime', 'mute']);
    for (const b of BOUNDARIES) {
      expect(b.costs.length).toBeGreaterThan(20);
      expect(total(b.setCost)).toBeLessThan(0);
      expect(total(b.upkeep)).toBeLessThan(0);
      expect(b.slots.length + b.blocks.length).toBeGreaterThan(0);
    }
  });
});

describe('meters', () => {
  it('starts with four meters at 70', () => {
    expect(START).toEqual({ sleep: 70, mood: 70, study: 70, social: 70 });
    expect(METERS).toEqual(['sleep', 'mood', 'study', 'social']);
  });

  it('clamps changes to 0..100', () => {
    expect(applyFx(metersOf(95, 5, 50, 50), [20, -20, 3, -3])).toEqual(metersOf(100, 0, 53, 47));
  });

  it('scores balance by the lowest meter', () => {
    expect(balancePoints(metersOf(80, 70, 60, 90))).toBe(20);
    expect(balancePoints(metersOf(80, 45, 60, 90))).toBe(10);
    expect(balancePoints(metersOf(80, 25, 60, 90))).toBe(4);
    expect(balancePoints(metersOf(80, 10, 60, 90))).toBe(0);
  });

  it('calls a day good only when all four meters are above 50', () => {
    expect(isGoodDay(metersOf(51, 51, 51, 51))).toBe(true);
    expect(isGoodDay(metersOf(51, 50, 51, 51))).toBe(false);
  });

  it('shows how Bea feels from her lowest meter', () => {
    expect(feelingOf(metersOf(20, 90, 90, 90))).toBe('sleepy');
    expect(feelingOf(metersOf(90, 20, 90, 90))).toBe('sad');
    expect(feelingOf(metersOf(90, 90, 20, 90))).toBe('worried');
    expect(feelingOf(metersOf(90, 90, 90, 20))).toBe('sad');
    expect(feelingOf(metersOf(70, 70, 70, 70))).toBe('happy');
    expect(feelingOf(metersOf(45, 70, 70, 70))).toBe('okay');
  });
});

describe('boundaries', () => {
  it('cost a little when switched on, nothing to switch off, and keep a fixed order', () => {
    let g = newGame('b');
    g = toggleBoundary(g, 'mute');
    expect(g.boundaries).toEqual(['mute']);
    expect(g.meters.social).toBe(64);
    g = toggleBoundary(g, 'focus');
    expect(g.boundaries).toEqual(['focus', 'mute']);
    expect(g.meters.social).toBe(58);
    const off = toggleBoundary(g, 'mute');
    expect(off.boundaries).toEqual(['focus']);
    expect(off.meters).toEqual(g.meters);
  });

  it('can never take a meter to zero by themselves', () => {
    let g: Game = { ...newGame('b'), meters: metersOf(70, 3, 70, 3) };
    for (const b of BOUNDARIES) g = toggleBoundary(g, b.id);
    for (const m of METERS) expect(g.meters[m]).toBeGreaterThanOrEqual(1);
    expect(g.reset).toBeNull();
  });

  it('leave a fifth of the pulls in the part of the day they cover', () => {
    expect(pullChance(1, 'dinner', [])).toBeCloseTo(0.5);
    expect(pullChance(1, 'dinner', ['dinner'])).toBeCloseTo(0.1);
    expect(pullChance(1, 'school', ['dinner'])).toBeCloseTo(0.55);
    expect(pullChance(1, 'school', ['focus'])).toBeCloseTo(0.11);
    expect(pullChance(1, 'night', ['bedtime'])).toBeCloseTo(0.14);
  });

  it('really do make pulls rarer across many seeded days', () => {
    const pulls = (bounds: BoundaryId[]) => {
      let n = 0;
      for (let d = 1; d <= 200; d++) n += buildDay('rate', d, bounds).filter((m) => m.source !== null).length;
      return n;
    };
    const none = pulls([]);
    const all = pulls(['focus', 'dinner', 'bedtime', 'mute']);
    expect(none).toBeGreaterThan(400);
    expect(all).toBeLessThan(none * 0.5);
  });

  it('mute group chats removes every group-chat pull', () => {
    for (let d = 1; d <= 60; d++) expect(buildDay('mute', d, ['mute']).some((m) => m.source === 'groupchat')).toBe(false);
    let seen = false;
    for (let d = 1; d <= 60; d++) seen ||= buildDay('mute', d, []).some((m) => m.source === 'groupchat');
    expect(seen).toBe(true);
  });

  it('upkeep is added to the daily drift', () => {
    expect(driftFor(1, [])).toEqual(BASE_DRIFT);
    expect(driftFor(1, ['bedtime', 'dinner'])).toEqual([-20, -3 - 2 - 1, -5, -5]);
    expect(driftFor(1, ['focus', 'mute'])[3]).toBe(-9);
    expect(boundaryById('focus').slots).toEqual(['school', 'afternoon']);
  });

  it('keeps the same ordinary moment whatever boundaries are set, so only the pulls change', () => {
    const a = buildDay('same', 3, []);
    const b = buildDay('same', 3, ['focus', 'dinner', 'bedtime', 'mute']);
    a.forEach((m, i) => {
      if (m.source === null) expect(b[i]?.id).toBe(m.id);
    });
  });
});

describe('days', () => {
  it('has six moments, one per part of the day, in order', () => {
    const day = buildDay('d', 1, []);
    expect(day.map((m) => m.slot)).toEqual([...SLOTS]);
  });

  it('is the same for the same seed and different for a different seed or day', () => {
    const ids = (seed: string, day: number) => buildDay(seed, day, []).map((m) => m.id).join();
    expect(ids('s', 2)).toBe(ids('s', 2));
    const days = new Set(Array.from({ length: 12 }, (_, i) => ids('s', i + 1)));
    expect(days.size).toBeGreaterThanOrEqual(10);
    const seeds = new Set(Array.from({ length: 12 }, (_, i) => ids(`seed${i}`, 1)));
    expect(seeds.size).toBeGreaterThanOrEqual(8);
  });

  it('pulls more often as the days go by, up to a cap', () => {
    expect(pullChance(1, 'evening', [])).toBeCloseTo(0.65);
    expect(pullChance(5, 'evening', [])).toBeGreaterThan(pullChance(1, 'evening', []));
    expect(pullChance(50, 'night', [])).toBe(0.9);
  });

  it('makes the drift heavier every five days, up to three more', () => {
    expect(driftFor(5, [])[2]).toBe(-5);
    expect(driftFor(6, [])[2]).toBe(-6);
    expect(driftFor(100, [])).toEqual([-20, -6, -8, -8]);
  });
});

describe('choices and the end of the day', () => {
  const moment = (slot: number, day = 1) => buildDay('c', day, [])[slot] as Moment;

  it('moves on to the next part, scores balance and counts what Bea did with the pull', () => {
    const m = PULLS_POOL.find((x) => x.source === 'notification') as Moment;
    const g0 = newGame('c');
    const gave = choose(g0, m, m.options[0] as MomentOption);
    expect(gave.gaveIn).toBe(true);
    expect(gave.game.slot).toBe(1);
    expect(gave.game.gaveIn).toBe(1);
    expect(gave.game.resisted).toBe(0);
    expect(gave.points).toBe(balancePoints(gave.game.meters));
    expect(gave.game.score).toBe(gave.points);
    const held = choose(g0, m, m.options[1] as MomentOption);
    expect(held.gaveIn).toBe(false);
    expect(held.game.resisted).toBe(1);
    expect(total(held.change)).toBeGreaterThan(total(gave.change));
  });

  it('does not count an ordinary moment as a pull', () => {
    const m = LIFE[0] as Moment;
    const out = choose(newGame('c'), m, m.options[0] as MomentOption);
    expect(out.game.gaveIn + out.game.resisted).toBe(0);
  });

  it('reports the change that really happened after clamping', () => {
    const m = LIFE.find((x) => x.id === 'l-bed') as Moment;
    const g: Game = { ...newGame('c'), slot: 5, meters: metersOf(90, 70, 70, 70) };
    const out = choose(g, m, m.options[0] as MomentOption);
    expect(out.game.meters.sleep).toBe(100);
    expect(out.change[0]).toBe(10);
  });

  it('ends the run, kindly, when a meter hits zero', () => {
    const m = PULLS_POOL.find((x) => x.id === 'p-eve-lumi') as Moment;
    const g: Game = { ...newGame('c'), slot: 4, meters: metersOf(70, 70, 70, 5) };
    const out = choose(g, m, m.options[0] as MomentOption);
    expect(out.game.reset).toBe('social');
    expect(choose(g, m, m.options[1] as MomentOption).game.reset).toBeNull();
  });

  it('closes a good day with the bonus, then the drift, then a new morning', () => {
    const g: Game = { ...newGame('c'), slot: 6, meters: metersOf(80, 80, 80, 80), score: 40 };
    const out = endDay(g);
    expect(out.good).toBe(true);
    expect(out.bonus).toBe(GOOD_DAY_BONUS);
    expect(out.game.score).toBe(40 + GOOD_DAY_BONUS);
    expect(out.game.goodDays).toBe(1);
    expect(out.game.day).toBe(2);
    expect(out.game.slot).toBe(0);
    expect(out.game.meters).toEqual(metersOf(60, 77, 75, 75));
    expect(out.drift).toEqual([-20, -3, -5, -5]);
  });

  it('gives no bonus when any meter is at half or less', () => {
    const out = endDay({ ...newGame('c'), slot: 6, meters: metersOf(80, 80, 50, 80) });
    expect(out.good).toBe(false);
    expect(out.bonus).toBe(0);
    expect(out.game.goodDays).toBe(0);
  });

  it('can end the run overnight when the drift empties a meter', () => {
    const out = endDay({ ...newGame('c'), slot: 6, meters: metersOf(15, 80, 80, 80) });
    expect(out.game.reset).toBe('sleep');
  });

  it('uses the boundaries on the day to work out the drift', () => {
    let g = toggleBoundary(newGame('c'), 'bedtime');
    g = { ...g, slot: 6, meters: metersOf(80, 80, 80, 80) };
    expect(endDay(g).game.meters.mood).toBe(75);
    expect(moment(0)).toBeDefined();
  });
});

describe('stars', () => {
  it('give one star for a reset day, else by good days', () => {
    expect(starsFor(3, 'sleep')).toBe(1);
    expect(starsFor(0, null)).toBe(1);
    expect(starsFor(1, null)).toBe(2);
    expect(starsFor(2, null)).toBe(3);
    expect(MODULE_DAYS).toBe(3);
  });
});

/** Play whole runs with a simple policy, as a balance check. */
function run(seed: string, policy: 'wise' | 'greedy' | 'mixed', boundaries: boolean, maxDays: number): Game {
  let g = newGame(seed);
  if (boundaries) for (const b of BOUNDARIES) g = toggleBoundary(g, b.id);
  while (!g.reset && g.day <= maxDays) {
    for (const m of buildDay(seed, g.day, g.boundaries)) {
      const weights = METERS.map((k) => Math.max(0.2, (80 - g.meters[k]) / 30));
      const value = (o: MomentOption) => o.fx.reduce((a, f, i) => a + Math.min(f, 100 - g.meters[METERS[i] as (typeof METERS)[number]]) * (weights[i] ?? 1), 0);
      let pick = m.options.reduce((a, b) => (value(b) > value(a) ? b : a));
      if (policy === 'greedy') pick = m.options.find((o) => o.pull) ?? m.options[0] as MomentOption;
      if (policy === 'mixed' && m.source && g.day % 2 === 0) pick = m.options.find((o) => o.pull) ?? pick;
      g = choose(g, m, pick).game;
      if (g.reset) break;
    }
    if (g.reset) break;
    g = endDay(g).game;
  }
  return g;
}

describe('balance', () => {
  const seeds = Array.from({ length: 8 }, (_, i) => `bal${i}`);

  it('a player who always gives in to the phone has a reset day within a week', () => {
    for (const s of seeds) {
      const g = run(s, 'greedy', false, 60);
      expect(g.reset, s).not.toBeNull();
      expect(g.day, s).toBeLessThanOrEqual(7);
    }
  });

  it('a player who balances well, with boundaries, is still going after 30 days', () => {
    for (const s of seeds) {
      const g = run(s, 'wise', true, 30);
      expect(g.reset, s).toBeNull();
      expect(g.goodDays, s).toBeGreaterThanOrEqual(25);
    }
  });

  it('boundaries help a player who gives in every other day', () => {
    const days = (b: boolean) => seeds.reduce((a, s) => a + run(s, 'mixed', b, 40).day, 0);
    expect(days(true)).toBeGreaterThan(days(false) * 1.5);
  });

  it('a good run score (1500) takes a good week, not a few days', () => {
    const g = run('score', 'wise', true, 5);
    expect(g.score).toBeLessThan(1500);
    expect(run('score', 'wise', true, 10).score).toBeGreaterThan(1500);
  });
});
