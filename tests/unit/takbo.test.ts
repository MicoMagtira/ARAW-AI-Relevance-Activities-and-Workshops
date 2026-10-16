import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/games/engine/rng';
import type { InputFrame } from '../../src/games/engine/input';
import takbo, { buildRecap } from '../../src/games/takbo-data/takbo';
import { DATA_TRAPS, PRIVACY_TIPS, SAFE_OFFERS, trapByKind } from '../../src/games/takbo-data/offers';
import {
  BUMP_COST,
  HARD_FROM_ROW,
  SAFE_EVERY,
  SAFE_REFILL,
  SHIELD_MAX,
  SPEED_MAX,
  SPEED_START,
  createSpawner,
  distanceMetres,
  drain,
  isBad,
  minGap,
  refill,
  scoreOf,
  speedAt,
  type Row,
} from '../../src/games/takbo-data/rules';
import { STEP_MS } from '../../src/games/engine/loop';

const NO_INPUT: InputFrame = { actions: [], held: new Set(), taps: [], pointer: null };
const make = (seed: string) => takbo.create({ seed, rng: createRng(seed) });

function rows(seed: string, count: number, speedOf: (i: number) => number = () => SPEED_START): Row[] {
  const spawner = createSpawner(createRng(seed));
  return Array.from({ length: count }, (_, i) => spawner.next(speedOf(i)));
}

describe('speed and scoring', () => {
  it('speeds up over time and stops at the cap', () => {
    expect(speedAt(0)).toBe(SPEED_START);
    expect(speedAt(30)).toBeGreaterThan(speedAt(10));
    expect(speedAt(10_000)).toBe(SPEED_MAX);
    expect(speedAt(-5)).toBe(SPEED_START);
  });

  it('scores distance plus 10 per safe pickup', () => {
    expect(distanceMetres(0)).toBe(0);
    expect(scoreOf(1600, 0)).toBe(100);
    expect(scoreOf(1600, 3)).toBe(130);
    expect(scoreOf(15, 2)).toBe(20);
  });

  it('refills 5 on safe pickups (capped at 100) and drains by cost (never below 0)', () => {
    expect(SAFE_REFILL).toBe(5);
    expect(BUMP_COST).toBe(10);
    expect(refill(50)).toBe(55);
    expect(refill(SHIELD_MAX - 2)).toBe(SHIELD_MAX);
    expect(drain(50, 30)).toBe(20);
    expect(drain(10, 30)).toBe(0);
  });
});

describe('offers', () => {
  it('has the five data traps and three safe freebies, with readable short signs', () => {
    expect(DATA_TRAPS.map((t) => t.kind).sort()).toEqual(['birthday', 'contacts', 'idphoto', 'name', 'philhealth']);
    expect(SAFE_OFFERS).toHaveLength(3);
    for (const o of [...DATA_TRAPS.flatMap((t) => [t.lure, t.ask]), ...SAFE_OFFERS.flatMap((s) => [s.lure, s.line])]) {
      expect(o.length).toBeLessThanOrEqual(10);
    }
  });

  it('costs 15 to 30 by sensitivity, with the ID photo and PhilHealth number costing most', () => {
    for (const t of DATA_TRAPS) expect(t.cost).toBeGreaterThanOrEqual(15);
    for (const t of DATA_TRAPS) expect(t.cost).toBeLessThanOrEqual(30);
    const most = Math.max(...DATA_TRAPS.map((t) => t.cost));
    expect(trapByKind('idphoto').cost).toBe(most);
    expect(trapByKind('philhealth').cost).toBe(most);
    expect(trapByKind('name').cost).toBeLessThan(most);
  });
});

describe('spawn rules', () => {
  it('is the same for the same seed and different for another', () => {
    expect(rows('ARAW-2026-10-15', 60)).toEqual(rows('ARAW-2026-10-15', 60));
    expect(rows('ARAW-2026-10-15', 60)).not.toEqual(rows('ARAW-2026-10-16', 60));
  });

  it('always leaves one lane free (an empty lane or a safe pickup)', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      for (const row of rows(seed, 400)) {
        expect(row.cells.filter(isBad).length).toBeLessThanOrEqual(2);
        expect(row.cells.some((c) => !isBad(c))).toBe(true);
      }
    }
  });

  it('leaves time to react: the gap is at least the minimum for the speed it was made at', () => {
    const speedOf = (i: number) => speedAt(i * 2);
    for (const seed of ['x', 'y', 'z']) {
      rows(seed, 300, speedOf).forEach((row, i) => {
        expect(row.gap).toBeGreaterThanOrEqual(minGap(speedOf(i)));
      });
    }
    expect(minGap(SPEED_MAX)).toBeGreaterThan(minGap(SPEED_START));
  });

  it('starts gently: two safe freebies, then one obstacle, and no double traps before the hard rows', () => {
    for (const seed of ['p', 'q', 'r', 's']) {
      const r = rows(seed, 40);
      expect(r[0]?.cells.filter((c) => c?.type === 'safe')).toHaveLength(1);
      expect(r[1]?.cells.filter((c) => c?.type === 'safe')).toHaveLength(1);
      expect(r[0]?.cells.some(isBad)).toBe(false);
      expect(r[1]?.cells.some(isBad)).toBe(false);
      expect(r[2]?.cells.filter((c) => c?.type === 'obstacle')).toHaveLength(1);
      expect(r[2]?.cells.filter((c) => c?.type === 'trap')).toHaveLength(0);
      for (const row of r.slice(0, HARD_FROM_ROW)) expect(row.cells.filter(isBad).length).toBeLessThanOrEqual(1);
    }
  });

  it('never goes more than a few rows without a safe pickup, and mixes in every kind over time', () => {
    for (const seed of ['m', 'n', 'o']) {
      const list = rows(seed, 500);
      let since = 0;
      for (const row of list) {
        since = row.cells.some((c) => c?.type === 'safe') ? 0 : since + 1;
        expect(since).toBeLessThan(SAFE_EVERY);
      }
      const traps = new Set(list.flatMap((r) => r.cells.flatMap((c) => (c?.type === 'trap' ? [c.kind] : []))));
      const obstacles = new Set(list.flatMap((r) => r.cells.flatMap((c) => (c?.type === 'obstacle' ? [c.kind] : []))));
      const safes = new Set(list.flatMap((r) => r.cells.flatMap((c) => (c?.type === 'safe' ? [c.kind] : []))));
      expect(traps.size).toBe(5);
      expect(obstacles.size).toBe(3);
      expect(safes.size).toBe(3);
    }
  });
});

describe('Takbo, Data! run', () => {
  const play = (seed: string, input: (step: number) => InputFrame, maxSteps = 60 * 600) => {
    const game = make(seed);
    let steps = 0;
    while (!game.stats().over && steps < maxSteps) {
      game.step(STEP_MS, input(steps));
      steps += 1;
    }
    return { game, steps };
  };

  it('has the definition the shell needs: five briefing pages, how to play, takeaway', () => {
    expect(takbo.slug).toBe('takbo-data');
    expect(takbo.briefing).toHaveLength(5);
    expect(takbo.briefing[0]?.title).toBe('Wow, freebies everywhere!');
    expect(takbo.briefing[4]?.title).toBe('When should I trust it?');
    expect(takbo.takeaway).toMatch(/^When should I trust it\?/);
    expect(takbo.width / takbo.height).toBeCloseTo(16 / 9, 2);
  });

  it('starts with a full Shield and an honest description', () => {
    const stats = make('start').stats();
    expect(stats.over).toBe(false);
    expect(stats.score).toBe(0);
    expect(stats.hud.find((h) => h.id === 'shield')).toMatchObject({ value: '100%', meter: 100 });
    expect(stats.description).toMatch(/^Takbo, Data! Score 0\. Privacy Shield at 100 percent\. Ara is in the middle lane/);
  });

  it('plays the same for the same seed and inputs', () => {
    const a = play('same', () => NO_INPUT);
    const b = play('same', () => NO_INPUT);
    expect(a.steps).toBe(b.steps);
    expect(a.game.stats()).toEqual(b.game.stats());
  });

  it('ends when the Shield hits 0, with a recap that teaches three privacy tips', () => {
    const { game, steps } = play('idle', () => NO_INPUT);
    const stats = game.stats();
    expect(stats.over).toBe(true);
    expect(steps).toBeLessThan(60 * 600);
    expect(stats.hud.find((h) => h.id === 'shield')?.meter).toBe(0);
    const tips = stats.recap.filter((l) => l.startsWith('Privacy tip'));
    expect(tips).toHaveLength(3);
    expect(stats.recap[0]).toMatch(/^You ran \d+ metres/);
  });

  it('keeps the score going up and never changes after game over', () => {
    const game = make('score');
    let last = 0;
    for (let i = 0; i < 600; i++) {
      game.step(STEP_MS, NO_INPUT);
      const { score } = game.stats();
      expect(score).toBeGreaterThanOrEqual(last);
      last = score;
    }
    const { game: done } = play('score-2', () => NO_INPUT);
    const before = done.stats();
    for (let i = 0; i < 120; i++) done.step(STEP_MS, NO_INPUT);
    expect(done.stats()).toEqual(before);
  });

  it('accepts jumps, lane changes and taps without breaking', () => {
    const keys: InputFrame[] = [
      { ...NO_INPUT, actions: ['up'] },
      { ...NO_INPUT, actions: ['down', 'act'] },
      { ...NO_INPUT, taps: [{ x: 10, y: 10 }] },
      { ...NO_INPUT, actions: ['left', 'right'] },
    ];
    const { game } = play('busy', (i) => (i % 20 === 0 ? (keys[(i / 20) % keys.length] as InputFrame) : NO_INPUT));
    expect(game.stats().over).toBe(true);
  });

  it('does not let the road depend on what the player does', () => {
    // the layout ahead is the same whether Ara stands still or jumps: compare descriptions after the same time
    const a = make('road');
    const b = make('road');
    for (let i = 0; i < 300; i++) {
      a.step(STEP_MS, NO_INPUT);
      b.step(STEP_MS, i % 30 === 0 ? { ...NO_INPUT, actions: ['act'] } : NO_INPUT);
    }
    const ahead = (d: string) => d.slice(d.indexOf('Ahead'));
    expect(ahead(a.stats().description)).toBe(ahead(b.stats().description));
  });
});

describe('recap', () => {
  it('lists the data given away, most sensitive first, and why it matters', () => {
    const lines = buildRecap(250, 3, 1, new Map([['birthday', 2], ['philhealth', 1]]));
    expect(lines[0]).toBe('You ran 250 metres, grabbed 3 safe freebies and bumped into 1 obstacle.');
    expect(lines[1]).toBe('You gave away your PhilHealth number, your birthday (2 times).');
    expect(lines[2]).toContain('Why it matters: Your PhilHealth number');
    expect(lines.slice(-3)).toEqual(PRIVACY_TIPS.map((tip, i) => `Privacy tip ${i + 1}: ${tip}`));
  });

  it('praises a run that gave nothing away and uses singular words', () => {
    const lines = buildRecap(1, 1, 0, new Map());
    expect(lines[0]).toBe('You ran 1 metre, grabbed 1 safe freebie and bumped into 0 obstacles.');
    expect(lines[1]).toBe('You did not give away any data. Great job!');
    expect(lines).toHaveLength(5);
  });
});
