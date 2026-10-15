import { describe, expect, it } from 'vitest';
import { STEP_MS } from '../../src/games/engine/loop';
import type { Action, InputFrame } from '../../src/games/engine/input';
import { createRng } from '../../src/games/engine/rng';
import type { GameInstance } from '../../src/games/engine/types';
import { DONE_SLOT, H, LINE_CHARS, PANEL, PANEL_CHARS, REJECT_SLOT, SLOTS, W, WHACK_SLOT, slotAt, slotRect } from '../../src/games/lamok-lamay/art';
import lamok, { READY_MS, buildRecap, resultLines } from '../../src/games/lamok-lamay/lamok';
import {
  CONTAINERS,
  CONTAINER_KINDS,
  COLS,
  HEARTS,
  MAX_ITEMS,
  MISTAKE_POINTS,
  POINTS,
  WATER,
  catchRateOf,
  createScanGenerator,
  driftSpeed,
  falseBoxesIn,
  feedback,
  isCorrect,
  isMistake,
  itemAt,
  itemCount,
  itemPos,
  judgeTap,
  larvaeIn,
  missesIn,
  multiplierFor,
  precisionOf,
  scanTimeMs,
  settle,
  type Scan,
  type ScanItem,
  type TapResult,
} from '../../src/games/lamok-lamay/scans';

const NONE: InputFrame = { actions: [], held: new Set(), taps: [], pointer: null };
const press = (...actions: Action[]): InputFrame => ({ ...NONE, actions });
const tapAt = (x: number, y: number): InputFrame => ({ ...NONE, taps: [{ x, y }] });
const make = (seed: string): GameInstance => lamok.create({ seed, rng: createRng(seed) });

function run(game: GameInstance, ms: number, input: InputFrame = NONE) {
  for (let t = 0; t < ms; t += STEP_MS) game.step(STEP_MS, t === 0 ? input : NONE);
}
const tapItem = (game: GameInstance, item: ScanItem) => run(game, STEP_MS, tapAt(item.x, item.y));
const tapSlot = (game: GameInstance, slot: number) => {
  const r = slotRect(slot);
  run(game, STEP_MS, tapAt(r.x + r.w / 2, r.y + r.h / 2));
};
const ready = (game: GameInstance) => run(game, READY_MS + 100);

/** The scans a game makes from this seed (same derivation as the game uses). */
function scansOf(seed: string, count: number): Scan[] {
  const rng = createRng(seed);
  const gen = createScanGenerator(createRng(`${rng()}:lamok-scans`));
  return Array.from({ length: count }, (_, i) => gen.next(i));
}

function fakeContext(): CanvasRenderingContext2D {
  const noop = () => undefined;
  return new Proxy({}, { get: (_t, prop) => (prop === 'measureText' ? () => ({ width: 8 }) : noop), set: () => true }) as unknown as CanvasRenderingContext2D;
}

describe('scan generator', () => {
  it('gives the same scans for the same seed and different ones for another', () => {
    expect(scansOf('s1', 30)).toEqual(scansOf('s1', 30));
    expect(scansOf('s1', 30)).not.toEqual(scansOf('s2', 30));
  });

  it('fills the pacing table: more objects, less time, faster bobbing', () => {
    expect([0, 1, 2, 3, 4, 6, 20].map(itemCount)).toEqual([4, 4, 5, 5, 6, 7, MAX_ITEMS]);
    expect(scanTimeMs(0)).toBe(18000);
    expect(scanTimeMs(4)).toBe(15000);
    expect(scanTimeMs(50)).toBe(9000);
    expect(driftSpeed(0)).toBe(1);
    expect(driftSpeed(50)).toBe(2);
  });

  it('lays every object on its own spot inside the water, with sane boxes and confidences', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      for (const scan of scansOf(seed, 40)) {
        expect(scan.items).toHaveLength(itemCount(scan.index));
        expect(scan.timeMs).toBe(scanTimeMs(scan.index));
        expect(new Set(scan.items.map((i) => i.id)).size).toBe(scan.items.length);
        for (const item of scan.items) {
          expect(item.x).toBeGreaterThan(WATER.x + 14);
          expect(item.x).toBeLessThan(WATER.x + WATER.w - 14);
          expect(item.y).toBeGreaterThan(WATER.y + 9);
          expect(item.y).toBeLessThan(WATER.y + WATER.h - 9);
          if (item.boxed) {
            expect(item.confidence).toBeGreaterThanOrEqual(48);
            expect(item.confidence).toBeLessThanOrEqual(98);
          } else {
            expect(item.confidence).toBe(0);
          }
        }
        // no two objects close enough to be tapped by mistake
        for (const a of scan.items) {
          for (const b of scan.items) if (a.id < b.id) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(30);
        }
      }
    }
  });

  it('the first container shows both AI mistakes: a false box and a miss, with larvae the AI did find', () => {
    for (const seed of ['a', 'b', 'c', 'x1', 'x2']) {
      const first = scansOf(seed, 1)[0] as Scan;
      expect(larvaeIn(first)).toBe(2);
      expect(falseBoxesIn(first)).toBe(1);
      expect(missesIn(first)).toBe(1);
      expect(first.items.filter((i) => i.kind === 'larva' && i.boxed)).toHaveLength(1);
    }
  });

  it('never repeats a container twice in a row, and an empty container is rare, never first or second, never twice running', () => {
    let empties = 0;
    let total = 0;
    for (const seed of ['p', 'q', 'r', 'u']) {
      const scans = scansOf(seed, 120);
      scans.forEach((scan, i) => {
        if (i > 0) expect(scan.container).not.toBe((scans[i - 1] as Scan).container);
        expect(CONTAINER_KINDS).toContain(scan.container);
        total += 1;
        if (larvaeIn(scan) === 0) {
          empties += 1;
          expect(i).toBeGreaterThanOrEqual(2);
          expect(larvaeIn(scans[i - 1] as Scan)).toBeGreaterThan(0);
        }
      });
    }
    expect(empties).toBeGreaterThan(total * 0.05);
    expect(empties).toBeLessThan(total * 0.25);
  });

  it('the AI is imperfect in both ways, and its confidence is no proof: false boxes can read as high as real ones', () => {
    const items = ['m', 'n', 'o'].flatMap((seed) => scansOf(seed, 100).flatMap((s) => s.items));
    const larvae = items.filter((i) => i.kind === 'larva');
    const decoys = items.filter((i) => i.kind !== 'larva');
    const missRate = larvae.filter((i) => !i.boxed).length / larvae.length;
    const falseRate = decoys.filter((i) => i.boxed).length / decoys.length;
    expect(missRate).toBeGreaterThan(0.12);
    expect(missRate).toBeLessThan(0.35);
    expect(falseRate).toBeGreaterThan(0.35);
    expect(falseRate).toBeLessThan(0.65);
    expect(Math.max(...decoys.map((i) => i.confidence))).toBeGreaterThanOrEqual(80);
    expect(Math.min(...larvae.filter((i) => i.boxed).map((i) => i.confidence))).toBeLessThanOrEqual(70);
    for (const kind of ['seed', 'leaf', 'raisin'] as const) expect(decoys.some((i) => i.kind === kind)).toBe(true);
  });
});

describe('taps and scoring', () => {
  const larvaBoxed: ScanItem = { id: 0, kind: 'larva', x: 50, y: 50, boxed: true, confidence: 90, phase: 0 };
  const larvaMissed: ScanItem = { ...larvaBoxed, id: 1, boxed: false, confidence: 0 };
  const seedBoxed: ScanItem = { ...larvaBoxed, id: 2, kind: 'seed', confidence: 70 };
  const leafPlain: ScanItem = { ...seedBoxed, id: 3, kind: 'leaf', boxed: false, confidence: 0 };

  it('judges every tool on every kind of object', () => {
    const table: Array<[ScanItem | null, 'whack' | 'reject', TapResult]> = [
      [larvaBoxed, 'whack', 'whack'],
      [larvaMissed, 'whack', 'add'],
      [seedBoxed, 'whack', 'bad-swat'],
      [leafPlain, 'whack', 'bad-swat'],
      [seedBoxed, 'reject', 'reject'],
      [larvaBoxed, 'reject', 'bad-reject'],
      [larvaMissed, 'reject', 'no-box'],
      [leafPlain, 'reject', 'no-box'],
      [null, 'whack', 'splash'],
      [null, 'reject', 'splash'],
    ];
    for (const [item, tool, expected] of table) expect(judgeTap(item, tool)).toBe(expected);
    expect(isCorrect('add') && isCorrect('whack') && isCorrect('reject')).toBe(true);
    expect(isMistake('bad-swat') && isMistake('bad-reject')).toBe(true);
    expect(isMistake('splash') || isMistake('no-box') || isCorrect('splash')).toBe(false);
  });

  it('the streak multiplier goes x1 to x2 in tenths', () => {
    expect([0, 1, 5, 10, 30].map(multiplierFor)).toEqual([1, 1.1, 1.5, 2, 2]);
  });

  it('writes a short line for every result, that fits the screen', () => {
    const results: TapResult[] = ['whack', 'add', 'reject', 'bad-reject', 'bad-swat', 'no-box', 'splash'];
    for (const r of results) {
      for (const item of [seedBoxed, { ...seedBoxed, kind: 'leaf' as const }, { ...seedBoxed, kind: 'raisin' as const }, larvaBoxed]) {
        expect(feedback(r, item, 160).length).toBeLessThanOrEqual(LINE_CHARS);
      }
    }
    expect(feedback('reject', seedBoxed, 60)).toBe('RIGHT! THAT WAS A SEED. +60');
    expect(feedback('bad-swat', leafPlain, 0)).toBe(`OOPS! THAT IS ONLY A LEAF BIT. -${MISTAKE_POINTS}`);
  });

  it('finds the nearest object within reach of a tap, and nothing in empty water', () => {
    const pos = (i: ScanItem) => ({ x: i.x, y: i.y });
    const other: ScanItem = { ...larvaBoxed, id: 9, x: 90, y: 50 };
    expect(itemAt([larvaBoxed, other], pos, 52, 52)?.id).toBe(0);
    expect(itemAt([larvaBoxed, other], pos, 88, 48)?.id).toBe(9);
    expect(itemAt([larvaBoxed, other], pos, 70, 50)).toBeNull();
    expect(itemAt([], pos, 1, 1)).toBeNull();
  });

  it('objects only bob a couple of pixels around where they rest', () => {
    for (let ms = 0; ms < 5000; ms += 137) {
      const p = itemPos(larvaBoxed, ms, 2);
      expect(Math.abs(p.x - 50)).toBeLessThanOrEqual(2);
      expect(Math.abs(p.y - 50)).toBeLessThanOrEqual(2);
    }
  });
});

describe('precision and catch rate', () => {
  it('start full, then count false boxes and misses', () => {
    expect(precisionOf({ tp: 0, fp: 0, fn: 0 })).toBe(100);
    expect(catchRateOf({ tp: 0, fp: 0, fn: 0 })).toBe(100);
    expect(precisionOf({ tp: 3, fp: 1, fn: 5 })).toBe(75);
    expect(catchRateOf({ tp: 3, fp: 1, fn: 1 })).toBe(75);
    expect(precisionOf({ tp: 0, fp: 2, fn: 0 })).toBe(0);
    expect(catchRateOf({ tp: 0, fp: 0, fn: 2 })).toBe(0);
  });

  it('a false alarm only hurts precision, a miss only hurts catch rate', () => {
    const base = { tp: 4, fp: 0, fn: 0 };
    expect(precisionOf({ ...base, fn: 3 })).toBe(100);
    expect(catchRateOf({ ...base, fp: 3 })).toBe(100);
  });

  it('settle leaves the unwhacked larvae as escapes, and names the AI errors left behind', () => {
    const scan: Scan = {
      index: 0,
      container: 'drum',
      timeMs: 18000,
      items: [
        { id: 0, kind: 'larva', x: 40, y: 40, boxed: true, confidence: 90, phase: 0 },
        { id: 1, kind: 'larva', x: 80, y: 40, boxed: false, confidence: 0, phase: 0 },
        { id: 2, kind: 'seed', x: 120, y: 40, boxed: true, confidence: 60, phase: 0 },
        { id: 3, kind: 'leaf', x: 160, y: 40, boxed: false, confidence: 0, phase: 0 },
      ],
    };
    expect(settle(scan, new Set([0, 1, 2, 3]))).toEqual({ escaped: 2, boxedLarvae: 1, falseLeft: 1, missedLeft: 1 });
    expect(settle(scan, new Set([3]))).toEqual({ escaped: 0, boxedLarvae: 0, falseLeft: 0, missedLeft: 0 });
    expect(settle(scan, new Set([1]))).toEqual({ escaped: 1, boxedLarvae: 0, falseLeft: 0, missedLeft: 1 });
  });
});

describe('result panel and layout', () => {
  it('every result line fits the panel for every container and outcome', () => {
    for (const seed of ['t1', 't2']) {
      for (const scan of scansOf(seed, 60)) {
        const all = new Set(scan.items.map((i) => i.id));
        for (const live of [all, new Set<number>()]) {
          for (const bonus of [0, 45, 90]) {
            const { lines, good } = resultLines(scan, settle(scan, live), bonus);
            expect(good).toBe(live.size === 0 || larvaeIn(scan) === 0);
            expect(lines).toHaveLength(4);
            for (const line of lines) expect(line.length).toBeLessThanOrEqual(PANEL_CHARS);
          }
        }
      }
    }
    expect(PANEL_CHARS * 8 + 16).toBeLessThanOrEqual(PANEL.w);
  });

  it('names the AI mistakes and teaches one dengue step per container', () => {
    const scan = scansOf('names', 1)[0] as Scan;
    const { lines } = resultLines(scan, settle(scan, new Set(scan.items.map((i) => i.id))), 0);
    expect(lines[1]).toBe('AI: 1 FALSE BOX, 1 MISS');
    expect(lines[0]).toBe('2 LARVAE ESCAPED AS MOSQUITOES!');
    expect(lines.slice(2)).toEqual([...CONTAINERS[scan.container].tip]);
    for (const kind of CONTAINER_KINDS) expect(CONTAINERS[kind].tip.join(' ')).toMatch(/COVER|TIRES|EMPTY|CANS/);
  });

  it('puts the three tool tiles inside the canvas and finds them from taps', () => {
    for (let s = 0; s < SLOTS; s++) {
      const r = slotRect(s);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(W);
      expect(r.y + r.h).toBeLessThanOrEqual(H);
      expect(slotAt(r.x + r.w / 2, r.y + r.h / 2)).toBe(s);
    }
    expect(slotAt(1, 160)).toBe(WHACK_SLOT);
    expect(slotAt(109, 148)).toBe(REJECT_SLOT);
    expect(slotAt(319, 179)).toBe(DONE_SLOT);
    expect(slotAt(160, 100)).toBe(-1);
  });

  it('the meter lines fit the canvas at full width', () => {
    expect(`PRECISION 100%: BOXES THAT ARE REAL`.length * 8).toBeLessThanOrEqual(W - 8);
    expect(`CATCH RATE 100%: LARVAE THE AI FOUND`.length * 8).toBeLessThanOrEqual(W - 8);
  });
});

describe('the game', () => {
  const SEED = 'lamok-a';
  const first = scansOf(SEED, 1)[0] as Scan;
  const boxedLarva = first.items.find((i) => i.kind === 'larva' && i.boxed) as ScanItem;
  const missedLarva = first.items.find((i) => i.kind === 'larva' && !i.boxed) as ScanItem;
  const falseBox = first.items.find((i) => i.kind !== 'larva' && i.boxed) as ScanItem;
  const plain = first.items.find((i) => i.kind !== 'larva' && !i.boxed) as ScanItem;

  it('starts with 5 hearts, full meters and the AI camera scanning, and ignores taps until the boxes are up', () => {
    const game = make(SEED);
    const s = game.stats();
    expect(s.score).toBe(0);
    expect(s.over).toBe(false);
    expect(s.hud.map((h) => h.id)).toEqual(['score', 'hearts', 'precision', 'catch']);
    expect(s.hud[1]?.hearts).toEqual({ n: HEARTS, max: HEARTS });
    expect(s.hud[2]?.meter).toBe(100);
    expect(s.description).toContain('scanning');
    run(game, 300, tapAt(boxedLarva.x, boxedLarva.y));
    ready(game);
    expect(game.stats().score).toBe(0);
    expect(game.stats().description).toContain(`1, `);
  });

  it('whacks a boxed larva, adds a missed one and rejects a wrong box, with a growing streak', () => {
    const game = make(SEED);
    ready(game);
    tapItem(game, boxedLarva);
    expect(game.stats().score).toBe(50);
    tapItem(game, missedLarva);
    expect(game.stats().score).toBe(50 + Math.round(POINTS.add * 1.1));
    tapSlot(game, REJECT_SLOT);
    tapItem(game, falseBox);
    expect(game.stats().score).toBe(50 + 88 + Math.round(POINTS.reject * 1.2));
    const hud = game.stats().hud;
    // the false box was found: precision is 1 right of 2 boxes; the miss was found: catch rate is 1 of 2 larvae
    expect(hud.find((h) => h.id === 'precision')?.meter).toBe(50);
    expect(hud.find((h) => h.id === 'catch')?.meter).toBe(50);
    // gone from the water
    expect(game.stats().description).not.toContain('boxed by the AI as larvae ' + boxedLarva.confidence);
  });

  it('a wrong whack or reject costs points and the streak, but never goes below zero', () => {
    const game = make(SEED);
    ready(game);
    tapItem(game, falseBox); // whack tool on a false box: wrong
    expect(game.stats().score).toBe(0);
    tapItem(game, boxedLarva);
    expect(game.stats().score).toBe(50);
    tapItem(game, plain); // wrong again: -20 and the streak resets
    expect(game.stats().score).toBe(30);
    tapItem(game, missedLarva);
    expect(game.stats().score).toBe(30 + POINTS.add);
    tapSlot(game, REJECT_SLOT);
    run(game, STEP_MS, tapAt(10, 40)); // empty water: nothing
    expect(game.stats().score).toBe(30 + POINTS.add);
  });

  it('rejecting a real larva box is a mistake and the larva stays', () => {
    const game = make(SEED);
    ready(game);
    tapSlot(game, REJECT_SLOT);
    tapItem(game, boxedLarva);
    expect(game.stats().score).toBe(0);
    expect(game.stats().description).toContain(`larvae ${boxedLarva.confidence}%`);
  });

  it('DONE with nothing left gives a time bonus and keeps all hearts', () => {
    const game = make(SEED);
    ready(game);
    tapItem(game, boxedLarva);
    tapItem(game, missedLarva);
    tapSlot(game, REJECT_SLOT);
    tapItem(game, falseBox);
    const before = game.stats().score;
    tapSlot(game, DONE_SLOT);
    const s = game.stats();
    expect(s.score).toBeGreaterThan(before + 60);
    expect(s.hud[1]?.hearts?.n).toBe(HEARTS);
    expect(s.description).toContain('You caught every larva.');
    expect(s.description).toContain('Tip:');
    // the next container pops up after the result
    run(game, 6000);
    expect(game.stats().description).toContain('Scan 2');
  });

  it('DONE with a larva left, or running out of time, turns it into a mosquito and costs a heart', () => {
    const game = make(SEED);
    ready(game);
    tapItem(game, boxedLarva);
    tapSlot(game, DONE_SLOT);
    const s = game.stats();
    expect(s.hud[1]?.hearts?.n).toBe(HEARTS - 1);
    expect(s.score).toBe(50); // no time bonus with a larva left
    expect(s.description).toContain('1 larva left in the water became a mosquito');

    const idle = make(SEED);
    run(idle, READY_MS + first.timeMs + 200);
    expect(idle.stats().hud[1]?.hearts?.n).toBe(HEARTS - 2);
    expect(idle.stats().description).toContain('2 larvae left in the water became mosquitoes');
    expect(idle.stats().description).toContain('1 wrong box stayed up');
  });

  it('counts the AI mistakes nobody fixed in the meters when a container ends', () => {
    const game = make(SEED);
    run(game, READY_MS + first.timeMs + 200);
    const hud = game.stats().hud;
    // boxed larva (right) 1, false box 1 => precision 50; boxed larva found, missed larva 1 => catch rate 50
    expect(hud.find((h) => h.id === 'precision')?.meter).toBe(50);
    expect(hud.find((h) => h.id === 'catch')?.meter).toBe(50);
  });

  it('five escaped larvae end the game, and the recap explains the AI and dengue prevention', () => {
    const game = make(SEED);
    let guard = 0;
    while (!game.stats().over && guard++ < 300) run(game, 1000);
    const s = game.stats();
    expect(s.over).toBe(true);
    expect(s.hud[1]?.hearts?.n).toBeLessThanOrEqual(0);
    expect(s.recap).toHaveLength(5);
    expect(s.recap.join(' ')).toMatch(/precision was \d+%/);
    expect(s.recap.join(' ')).toMatch(/catch rate was \d+%/);
    expect(s.recap.join(' ')).toMatch(/Cover, clean and empty/);
    expect(s.recap.join(' ')).toMatch(/final call|people still check/);
    // frozen once over
    const score = s.score;
    run(game, 3000, tapAt(boxedLarva.x, boxedLarva.y));
    expect(game.stats().score).toBe(score);
  });

  it('works from the keyboard: arrows pick an object, up and down pick the tool, Enter uses it', () => {
    const game = make(SEED);
    ready(game);
    expect(game.stats().description).toContain('Tool: Whack');
    run(game, STEP_MS, press('down'));
    expect(game.stats().description).toContain('Tool: Reject');
    run(game, STEP_MS, press('up'));
    expect(game.stats().description).toContain('Tool: Whack');
    const leftmost = [...first.items].sort((a, b) => a.x - b.x || a.y - b.y)[0] as ScanItem;
    const expected = judgeTap(leftmost, 'whack');
    run(game, STEP_MS, press('act'));
    expect(game.stats().score).toBe(isCorrect(expected) ? POINTS[expected] : 0);
    // walking right past the last object lands on DONE
    for (let i = 0; i < 6; i++) run(game, STEP_MS, press('right'));
    expect(game.stats().description).toContain('Highlighted: the Done button.');
    run(game, STEP_MS, press('act'));
    expect(game.stats().description).toContain('Tip:');
  });

  it('describes every object in words, so the canvas is not the only way to play', () => {
    const game = make(SEED);
    ready(game);
    const d = game.stats().description;
    expect(d).toContain('wriggling, comma-shaped larva');
    expect(d).toMatch(/still, (brown, oval seed|green, flat leaf bit|dark, wrinkled raisin)/);
    expect(d).toContain(`boxed by the AI as larvae ${boxedLarva.confidence}%`);
    expect(d).toContain('no box');
    expect(d).toMatch(/Precision 100%\. Catch rate 100%/);
  });

  it('draws every phase without throwing', () => {
    const ctx = fakeContext();
    const game = make(SEED);
    game.draw(ctx);
    run(game, 500);
    game.draw(ctx);
    ready(game);
    game.draw(ctx);
    run(game, STEP_MS, press('right'));
    game.draw(ctx);
    tapItem(game, boxedLarva);
    game.draw(ctx);
    tapSlot(game, DONE_SLOT);
    game.draw(ctx);
    run(game, 1600);
    game.draw(ctx);
  });

  it('the Daily Challenge is the same for everyone: the same seed gives the same first containers', () => {
    expect(scansOf('ARAW-2026-10-15', 5)).toEqual(scansOf('ARAW-2026-10-15', 5));
  });
});

describe('recap and definition', () => {
  it('builds a plain recap without data too', () => {
    const lines = buildRecap({ scans: 1, whacked: 0, added: 0, rejected: 0, mistakes: 0, escaped: 5, bestStreak: 0, tally: { tp: 0, fp: 0, fn: 0 }, topWrongConfidence: 0 });
    expect(lines[0]).toContain('1 container');
    expect(lines[1]).toContain('too few boxes');
    expect(lines[2]).toContain('not proof');
  });

  it('has the five briefing pages, a takeaway and a canvas that matches the other games', () => {
    expect(lamok.slug).toBe('lamok-lamay');
    expect(lamok.briefing.map((b) => b.title)).toEqual(['Bantay lamok time!', 'AI makes two mistakes', 'How to play', 'Clean water, new mosquitoes', 'Kailan ako magtitiwala?']);
    expect(lamok.takeaway).toMatch(/^Kailan ako magtitiwala\?/);
    expect(lamok.width / lamok.height).toBeCloseTo(16 / 9, 2);
    expect(lamok.howTo.length).toBeGreaterThanOrEqual(4);
    expect(COLS * 2).toBeGreaterThanOrEqual(MAX_ITEMS);
  });
});
