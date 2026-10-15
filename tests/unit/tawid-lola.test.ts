import { describe, expect, it } from 'vitest';
import { STEP_MS } from '../../src/games/engine/loop';
import type { Action, InputFrame } from '../../src/games/engine/input';
import { createRng } from '../../src/games/engine/rng';
import type { GameInstance } from '../../src/games/engine/types';
import { BUBBLE, FIELD_Y, H, MSG_CHARS, ROWS, ROW_H, TILES, W, commandAt, rowY, tileAt } from '../../src/games/tawid-lola/art';
import {
  COLS,
  COL_W,
  GO_LINES,
  HEARTS,
  LOOK_MS,
  VEHICLES,
  adviceFor,
  assess,
  calmLine,
  carsAt,
  clampTrust,
  createTripGenerator,
  hitsAt,
  isSafe,
  multiplierFor,
  roadsInTrip,
  secondsToHit,
  verdictFor,
  type Decision,
  type Trip,
  type Verdict,
} from '../../src/games/tawid-lola/lanes';
import tawid, { IDLE_WAIT_MS, buildRecap, restLane } from '../../src/games/tawid-lola/tawid';

const NONE: InputFrame = { actions: [], held: new Set(), taps: [], pointer: null };
const press = (...actions: Action[]): InputFrame => ({ ...NONE, actions });
const tapAt = (x: number, y: number): InputFrame => ({ ...NONE, taps: [{ x, y }] });
const make = (seed: string): GameInstance => tawid.create({ seed, rng: createRng(seed) });

function run(game: GameInstance, ms: number, input: InputFrame = NONE) {
  for (let t = 0; t < ms; t += STEP_MS) game.step(STEP_MS, t === 0 ? input : NONE);
}
/** Step until the description contains `needle` (at most `maxMs`); returns whether it did. */
function runUntil(game: GameInstance, needle: string, maxMs = 20_000): boolean {
  for (let t = 0; t < maxMs; t += STEP_MS) {
    if (game.stats().description.includes(needle)) return true;
    game.step(STEP_MS, NONE);
  }
  return false;
}
const hud = (game: GameInstance, id: string) => game.stats().hud.find((h) => h.id === id);

function tripsOf(seed: string, count: number): Trip[] {
  const gen = createTripGenerator(createRng(`${createRng(seed)()}:tawid-lanes`));
  return Array.from({ length: count }, (_, i) => gen.trip(i));
}

function fakeContext(): CanvasRenderingContext2D {
  const noop = () => undefined;
  return new Proxy({}, { get: (_t, prop) => (prop === 'measureText' ? () => ({ width: 8 }) : noop), set: () => true }) as unknown as CanvasRenderingContext2D;
}

describe('trip generator', () => {
  it('gives the same streets for the same seed and different ones for another', () => {
    expect(tripsOf('s1', 8)).toEqual(tripsOf('s1', 8));
    expect(tripsOf('s1', 8)).not.toEqual(tripsOf('s2', 8));
  });

  it('builds a start, the roads (with grass after every three) and the health center', () => {
    expect([0, 1, 2, 5, 9].map(roadsInTrip)).toEqual([4, 5, 6, 9, 9]);
    for (const trip of tripsOf('layout', 12)) {
      const kinds = trip.lanes.map((l) => l.kind);
      expect(kinds[0]).toBe('start');
      expect(kinds.at(-1)).toBe('clinic');
      expect(kinds.filter((k) => k === 'road')).toHaveLength(roadsInTrip(trip.no));
      // never grass next to grass, and never more than four roads in a row
      expect(kinds.join(',')).not.toMatch(/grass,grass|(road,){5}/);
    }
  });

  it('scripts the first street: the guide is right on the first road and wrong on the second', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const roads = (tripsOf(seed, 1)[0] as Trip).lanes.filter((l) => l.kind === 'road');
      expect(roads[0]?.wrong).toBe(false);
      expect(roads[1]?.wrong).toBe(true);
    }
  });

  it('makes the guide wrong at least once per street, never on the first road and never twice in a row', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      for (const trip of tripsOf(seed, 20)) {
        const roads = trip.lanes.filter((l) => l.kind === 'road');
        const flags = roads.map((l) => l.wrong);
        expect(flags.some(Boolean)).toBe(true);
        expect(flags[0]).toBe(false);
        for (let i = 1; i < flags.length; i++) expect(flags[i] && flags[i - 1]).toBeFalsy();
      }
    }
  });

  it('makes the guide sound at least as sure when it is wrong', () => {
    for (const trip of tripsOf('conf', 20)) {
      for (const l of trip.lanes.filter((x) => x.kind === 'road')) {
        expect(l.confidence).toBeGreaterThanOrEqual(l.wrong ? 88 : 80);
        expect(l.confidence).toBeLessThanOrEqual(99);
      }
    }
  });

  it('gets busier but stays crossable: speed is capped and every column has a gap longer than the look-ahead', () => {
    const first = tripsOf('pace', 1)[0] as Trip;
    const late = tripsOf('pace', 15)[14] as Trip;
    const mean = (t: Trip) => t.lanes.filter((l) => l.kind === 'road').reduce((s, l) => s + l.speed, 0) / roadsInTrip(t.no);
    expect(mean(late)).toBeGreaterThan(mean(first));
    for (const trip of tripsOf('gaps', 15)) {
      for (const l of trip.lanes.filter((x) => x.kind === 'road')) {
        expect(l.speed).toBeLessThanOrEqual(112);
        for (const col of [0, 9, COLS - 1]) {
          let safe = false;
          for (let t = 0; t < 40_000 && !safe; t += 100) safe = isSafe(l, col, t);
          expect(safe).toBe(true);
        }
      }
    }
  });
});

describe('traffic', () => {
  const road = (tripsOf('traffic', 1)[0] as Trip).lanes[1]!;

  it('moves vehicles in the lane direction and repeats every period', () => {
    const w = VEHICLES[road.vehicle].w;
    const at = (t: number) => carsAt(road, t);
    expect(at(0).length).toBeGreaterThan(0);
    const dt = 100;
    const dx = (road.dir * road.speed * dt) / 1000;
    const a = at(0).filter((x) => x + w > 0 && x < W);
    const b = at(dt);
    // a vehicle that is mid-screen at both times has moved by speed x time
    const mid = a.find((x) => x > 20 && x < W - 60 - Math.abs(dx));
    if (mid !== undefined) expect(b.some((x) => Math.abs(x - (mid + dx)) < 1e-6)).toBe(true);
    const period = (road.period * 1000) / road.speed;
    expect(at(period).map((x) => Math.round(x))).toEqual(at(0).map((x) => Math.round(x)));
  });

  it('only road lanes have vehicles', () => {
    for (const l of (tripsOf('traffic', 1)[0] as Trip).lanes) if (l.kind !== 'road') expect(carsAt(l, 1234)).toEqual([]);
  });

  it('hits, secondsToHit and isSafe agree', () => {
    for (let col = 0; col < COLS; col += 3) {
      for (let t = 0; t < 6000; t += 130) {
        const sec = secondsToHit(road, col, t, LOOK_MS);
        expect(isSafe(road, col, t)).toBe(sec === null);
        if (hitsAt(road, col, t)) expect(secondsToHit(road, col, t)).toBe(0);
      }
    }
  });

  it('puts a vehicle on Lola when its box overlaps her body, and not when it only touches her column edge', () => {
    const w = VEHICLES[road.vehicle].w;
    // find a moment when a vehicle's left edge is exactly known, then test around column 10
    const x0 = carsAt(road, 0).find((x) => x > 0) as number;
    expect(x0).toBeDefined();
    const col = Math.floor(x0 / COL_W);
    expect(hitsAt(road, col, 0)).toBe(true);
    // a column entirely to the right of the vehicle's right edge is clear
    const clear = Math.floor((x0 + w) / COL_W) + 2;
    if (clear < COLS) expect(carsAt(road, 0).some((x) => x < clear * COL_W + 13 && x + w > clear * COL_W + 3)).toBe(hitsAt(road, clear, 0));
  });
});

describe('the AI guide', () => {
  const trip = tripsOf('guide', 1)[0] as Trip;

  it('says nothing about grass and the health center', () => {
    expect(adviceFor(trip.lanes[0], 5, 0)).toBeNull();
    expect(adviceFor(trip.lanes.at(-1), 5, 0)).toBeNull();
    expect(adviceFor(undefined, 5, 0)).toBeNull();
    expect(calmLine(trip.lanes.at(-1))).toBe('The health center is ahead!');
    expect(calmLine(trip.lanes[0])).toBe('Grass ahead. No traffic here.');
  });

  it('tells the truth on a right lane and the opposite on a wrong one, with the same confidence', () => {
    const right = trip.lanes[1]!;
    const wrong = trip.lanes[2]!;
    expect(right.wrong).toBe(false);
    expect(wrong.wrong).toBe(true);
    for (let col = 0; col < COLS; col += 2) {
      for (let t = 0; t < 8000; t += 170) {
        const a = adviceFor(right, col, t)!;
        expect(a.go).toBe(isSafe(right, col, t));
        expect(a.correct).toBe(true);
        const b = adviceFor(wrong, col, t)!;
        expect(b.go).toBe(!isSafe(wrong, col, t));
        expect(b.correct).toBe(false);
        expect(b.confidence).toBe(wrong.confidence);
        expect(b.headline).toBe(b.go ? 'GO!' : 'WAIT!');
      }
    }
  });

  it('uses short sentences that fit the bubble', () => {
    for (const line of GO_LINES) expect(line.length).toBeLessThanOrEqual(33);
    for (const v of Object.values(VEHICLES)) expect(`${v.name} coming. Hold on.`.length).toBeLessThanOrEqual(33);
    expect(BUBBLE.w).toBeGreaterThan(33 * 8);
  });
});

describe('the Trust Meter', () => {
  const cases: Array<[boolean, boolean, Decision, Verdict, number]> = [
    // [guide says go, guide is right, decision, verdict, delta]
    [true, true, 'go', 'trust-right', 8],
    [false, true, 'wait', 'trust-right', 8],
    [true, false, 'go', 'trust-wrong', -12],
    [false, false, 'wait', 'trust-wrong', -6],
    [false, false, 'go', 'override-right', 14],
    [true, false, 'wait', 'override-right', 14],
    [false, true, 'go', 'override-wrong', -8],
    [true, true, 'wait', 'override-wrong', -3],
  ];

  it.each(cases)('guide go=%s right=%s, you %s: %s (%i)', (go, correct, decision, verdict, delta) => {
    const a = assess({ go, correct }, decision);
    expect(verdictFor({ go, correct }, decision)).toBe(verdict);
    expect(a.verdict).toBe(verdict);
    expect(a.delta).toBe(delta);
    expect(a.good).toBe(delta > 0);
    expect(a.bonus).toBe(verdict === 'override-right' ? 30 : 0);
    expect(a.message.length).toBeLessThanOrEqual(MSG_CHARS);
    expect(a.message).toContain(delta > 0 ? `+${delta}` : `${delta}`);
  });

  it('rewards catching a wrong call most and punishes blind trust most', () => {
    const deltas = cases.map((c) => c[4]);
    expect(Math.max(...deltas)).toBe(14);
    expect(Math.min(...deltas)).toBe(-12);
  });

  it('keeps the meter between 0 and 100 and maps it to a multiplier from x1 to x2', () => {
    expect(clampTrust(-5)).toBe(0);
    expect(clampTrust(140)).toBe(100);
    expect([0, 9, 10, 50, 58, 99, 100].map(multiplierFor)).toEqual([1, 1, 1.1, 1.5, 1.5, 1.9, 2]);
  });
});

describe('the screen', () => {
  const lola = { x: 160, y: rowY(0) };

  it('keeps the street, strips and tiles inside the canvas without overlap', () => {
    expect(FIELD_Y + ROWS * ROW_H).toBeLessThanOrEqual(TILES.length > 0 ? 147 : H);
    expect(BUBBLE.y + BUBBLE.h).toBeLessThan(35);
    const last = TILES.at(-1)!;
    expect(last.x + last.w).toBeLessThanOrEqual(W);
    for (let i = 1; i < TILES.length; i++) expect(TILES[i]!.x).toBeGreaterThan(TILES[i - 1]!.x + TILES[i - 1]!.w);
  });

  it('turns taps on the tiles into commands', () => {
    expect(TILES.map((t) => t.command)).toEqual(['left', 'wait', 'go', 'right']);
    TILES.forEach((t, i) => {
      expect(tileAt(t.x + t.w / 2, 160)).toBe(i);
      expect(commandAt(t.x + t.w / 2, 160, lola)).toBe(t.command);
    });
    expect(tileAt(160, 100)).toBe(-1);
  });

  it('turns taps in the street into commands from Lola\'s point of view', () => {
    const cx = lola.x + 8;
    const cy = lola.y + 8;
    expect(commandAt(cx, cy, lola)).toBe('wait');
    expect(commandAt(cx, cy - 30, lola)).toBe('go');
    expect(commandAt(cx, cy + 14, lola)).toBe('back');
    expect(commandAt(cx - 60, cy, lola)).toBe('left');
    expect(commandAt(cx + 60, cy, lola)).toBe('right');
    expect(commandAt(cx, 10, lola)).toBeNull();
  });
});

describe('restLane', () => {
  it('steps back to the nearest grass or the start', () => {
    const trip = tripsOf('rest', 3)[2] as Trip; // 6 roads: start, R R R, grass, R R R, clinic
    const grass = trip.lanes.findIndex((l) => l.kind === 'grass');
    expect(grass).toBeGreaterThan(0);
    expect(restLane(trip.lanes, grass + 2)).toBe(grass);
    expect(restLane(trip.lanes, grass - 1)).toBe(0);
    expect(restLane(trip.lanes, 0)).toBe(0);
  });
});

describe('Tawid, Lola! game', () => {
  it('starts with full hearts, a neutral Trust Meter and the guide speaking', () => {
    const g = make('start');
    const s = g.stats();
    expect(s.over).toBe(false);
    expect(hud(g, 'hearts')?.hearts).toEqual({ n: HEARTS, max: HEARTS });
    expect(hud(g, 'trust')).toMatchObject({ value: '50%', meter: 50 });
    expect(hud(g, 'trip')?.value).toBe('1');
    expect(s.description).toContain('The AI guide says');
    expect(s.description).toContain('Your own view of the next lane');
    expect(s.recap).toEqual([]);
  });

  it('plays the same run for the same seed', () => {
    const a = make('same');
    const b = make('same');
    for (let i = 0; i < 400; i++) {
      const input = i % 20 === 0 ? press('up') : i % 33 === 0 ? press('left') : NONE;
      a.step(STEP_MS, input);
      b.step(STEP_MS, input);
    }
    expect(a.stats()).toEqual(b.stats());
  });

  /** A seed whose first moment already shows `needle`, so no idle WAIT can be judged before the player acts. */
  const seedShowing = (needle: string): string => {
    for (let i = 0; i < 200; i++) if (make(`first-${i}`).stats().description.includes(needle)) return `first-${i}`;
    throw new Error(`no seed shows ${needle}`);
  };

  it('rewards following a right GO: +8 trust, then the lane points at the new multiplier', () => {
    const g = make(seedShowing('The AI guide says GO'));
    run(g, STEP_MS, press('up'));
    expect(hud(g, 'trust')?.value).toBe('58%');
    expect(hud(g, 'score')?.value).toBe('15'); // 10 x 1.5
    expect(g.stats().description).toContain('Last: AI WAS RIGHT +8.');
    expect(g.stats().description).toContain('lane 1 of');
  });

  it('rewards following a right WAIT with the Space key, once per lane', () => {
    const g = make(seedShowing('The AI guide says WAIT'));
    run(g, STEP_MS, press('act'));
    expect(hud(g, 'trust')?.value).toBe('58%');
    expect(hud(g, 'score')?.value).toBe('0');
    run(g, STEP_MS, press('act'));
    expect(hud(g, 'trust')?.value).toBe('58%');
  });

  it('counts standing still in front of a road as a WAIT, once', () => {
    const g = make('idle');
    run(g, IDLE_WAIT_MS + 200);
    const after = hud(g, 'trust')?.meter;
    expect(after).not.toBe(50);
    run(g, IDLE_WAIT_MS * 3);
    expect(hud(g, 'trust')?.meter).toBe(after);
  });

  it('moves with arrows, steps back with down, and never leaves the street sideways', () => {
    const g = make('move');
    const col = () => /column (\d+) of/.exec(g.stats().description)?.[1];
    expect(col()).toBe('11');
    run(g, 200, press('left'));
    expect(col()).toBe('10');
    for (let i = 0; i < 30; i++) run(g, 150, press('left'));
    expect(col()).toBe('1');
    for (let i = 0; i < 30; i++) run(g, 150, press('right'));
    expect(col()).toBe(String(COLS));
    run(g, 200, press('down')); // already at the start: stays
    expect(g.stats().description).toContain('lane 0 of');
  });

  it('understands taps above Lola (go), on her (wait) and on the tiles', () => {
    const g = make('taps');
    const y = rowY(4 - 4); // the row Lola stands in
    expect(runUntil(g, 'The AI guide says GO')).toBe(true);
    run(g, STEP_MS, tapAt(10 * COL_W + 8, y - 30));
    expect(g.stats().description).toContain('lane 1 of');
    const before = hud(g, 'trust')?.meter;
    run(g, STEP_MS, tapAt(TILES[1]!.x + 20, 160));
    expect(hud(g, 'trust')?.meter).not.toBe(before);
  });

  it('ends after three horns and the recap explains automation bias', () => {
    const g = make('spam');
    let over = false;
    for (let t = 0; t < 900_000 && !over; t += STEP_MS) {
      g.step(STEP_MS, Math.round(t / STEP_MS) % 9 === 0 ? press('up') : NONE);
      over = g.stats().over;
    }
    expect(over).toBe(true);
    const s = g.stats();
    expect(hud(g, 'hearts')?.hearts?.n).toBe(0);
    expect(s.recap.join(' ')).toContain('The horn beeped 3 times.');
    expect(s.recap.join(' ')).toMatch(/automation bias/);
    expect(s.description).toContain('run is over');
    // the game stays over
    g.step(STEP_MS, press('up'));
    expect(g.stats().score).toBe(s.score);
  });

  it('can reach the health center and starts a busier second street', () => {
    // a careful player: steps only when this lane and the next are clear for the look-ahead time
    const trip = tripsOf('arrive', 1)[0] as Trip;
    const g = make('arrive');
    let t = 0;
    let sawArrival = false;
    for (; t < 300_000 && !sawArrival; t += STEP_MS) {
      const d = g.stats().description;
      if (d.includes('Lola reached the health center')) {
        sawArrival = true;
        break;
      }
      const lane = Number(/lane (\d+) of/.exec(d)?.[1]);
      const col = Number(/column (\d+) of/.exec(d)?.[1]) - 1;
      const clear = isSafe(trip.lanes[lane]!, col, t) && isSafe(trip.lanes[lane + 1]!, col, t);
      g.step(STEP_MS, clear ? press('up') : NONE);
    }
    expect(sawArrival).toBe(true);
    expect(hud(g, 'hearts')?.hearts?.n).toBe(HEARTS);
    expect(g.stats().description).toContain('The next street is busier!');
    expect(Number(hud(g, 'score')?.value)).toBeGreaterThan(100);
    run(g, 800);
    run(g, STEP_MS, press('act')); // a press skips the banner once it has been up a moment
    expect(g.stats().description).toContain('Trip 2:');
    expect(hud(g, 'trip')?.value).toBe('2');
  });

  it('draws every phase without throwing', () => {
    const g = make('draw');
    const ctx = fakeContext();
    g.draw(ctx);
    run(g, 500, press('up'));
    g.draw(ctx);
  });
});

describe('recap', () => {
  const base = { trips: 2, lanes: 9, horns: 3, trustRight: 4, trustWrong: 0, overrideRight: 2, overrideWrong: 0, aiWrong: 3 };

  it('says what happened and praises never following a wrong call', () => {
    const lines = buildRecap(base);
    expect(lines[0]).toBe('You made 2 trips to the health center and crossed 9 lanes. The AI guide was wrong on 3 lanes you decided on, and you overrode it 2 times when your own eyes disagreed. The horn beeped 3 times.');
    expect(lines[1]).toBe('You never followed a wrong call. Your own eyes stayed in charge.');
    expect(lines.join(' ')).not.toContain('Doubting everything');
  });

  it('warns about blind trust and about doubting everything, in singular and plural', () => {
    const lines = buildRecap({ ...base, trips: 1, lanes: 1, horns: 1, trustWrong: 1, overrideWrong: 2, overrideRight: 1, aiWrong: 1 });
    expect(lines[0]).toContain('1 trip to the health center and crossed 1 lane.');
    expect(lines[0]).toContain('The horn beeped 1 time.');
    expect(lines[1]).toContain('You followed a wrong call 1 time.');
    expect(lines[2]).toContain('You went against the guide 2 times when it was right. Doubting everything');
    expect(lines.at(-1)).toMatch(/^Tip: .*health worker/);
  });

  it('keeps the health framing and no medical advice', () => {
    const text = buildRecap(base).join(' ');
    expect(text).toMatch(/health worker/);
    expect(text).not.toMatch(/\bmg\b|dose|diagnos/i);
  });
});
