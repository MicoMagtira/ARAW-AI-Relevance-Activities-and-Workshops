import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PALETTE, sprite } from '../../src/games/engine/draw';
import { createInput, keyAction, swipeAction } from '../../src/games/engine/input';
import { MAX_FRAME_MS, STEP_MS, advanceClock, createLoop } from '../../src/games/engine/loop';
import { createRng, dailySeed, hashSeed, rngInt, rngPick, shuffle } from '../../src/games/engine/rng';
import { fitCanvas, toLogical } from '../../src/games/engine/scale';
import { PlayClock } from '../../src/games/engine/session';
import demo from '../../src/games/demo/demo';
import type { InputFrame } from '../../src/games/engine/input';

const take = (seed: string | number, n: number): number[] => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng());
};

const idle: InputFrame = { actions: [], held: new Set(), taps: [], pointer: null };

describe('seeded RNG', () => {
  it('gives the same sequence for the same seed and a different one for another seed', () => {
    expect(take('ARAW-2026-10-15', 20)).toEqual(take('ARAW-2026-10-15', 20));
    expect(take('ARAW-2026-10-15', 5)).not.toEqual(take('ARAW-2026-10-16', 5));
    expect(take(42, 5)).toEqual(take(42, 5));
  });

  it('stays in [0, 1) and spreads out', () => {
    const values = take('spread', 2000);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('hashes strings to stable unsigned 32-bit numbers (FNV-1a)', () => {
    expect(hashSeed('')).toBe(0x811c9dc5);
    expect(hashSeed('a')).toBe(0xe40c292c);
    expect(hashSeed('ARAW')).toBeGreaterThanOrEqual(0);
    expect(hashSeed('ARAW')).toBeLessThan(2 ** 32);
  });

  it('builds the daily seed from the Manila date and helpers stay deterministic', () => {
    expect(dailySeed('2026-10-15')).toBe('ARAW-2026-10-15');
    const a = createRng(dailySeed('2026-10-15'));
    const b = createRng(dailySeed('2026-10-15'));
    expect([rngInt(a, 3, 9), rngPick(['x', 'y', 'z'], a)]).toEqual([rngInt(b, 3, 9), rngPick(['x', 'y', 'z'], b)]);
    const n = rngInt(createRng('i'), 3, 9);
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThan(9);
    expect(shuffle([1, 2, 3, 4, 5], createRng('s'))).toEqual(shuffle([1, 2, 3, 4, 5], createRng('s')));
  });
});

describe('fixed-timestep clock', () => {
  it('runs whole steps and keeps the remainder', () => {
    expect(advanceClock(0, STEP_MS * 3 + 1).steps).toBe(3);
    const half = advanceClock(0, STEP_MS / 2);
    expect(half.steps).toBe(0);
    expect(advanceClock(half.acc, STEP_MS / 2).steps).toBe(1);
  });

  it('gives the same number of steps whatever the frame rate', () => {
    const run = (frameMs: number) => {
      let acc = 0;
      let steps = 0;
      for (let t = 0; t < 10_000; t += frameMs) {
        const next = advanceClock(acc, frameMs);
        acc = next.acc;
        steps += next.steps;
      }
      return steps;
    };
    // 10 seconds at 60 steps per second, within one step of rounding, at 30, 60, 144 and 240 Hz
    for (const hz of [30, 60, 144, 240]) expect(Math.abs(run(1000 / hz) - 600)).toBeLessThanOrEqual(1);
  });

  it('cuts a very long frame (hidden tab) so the game does not catch up in a burst', () => {
    const { steps } = advanceClock(0, 60_000);
    expect(steps).toBe(15); // 250 ms of 16.7 ms steps
    expect(MAX_FRAME_MS).toBe(250);
    expect(advanceClock(0, -5).steps).toBe(0);
    expect(advanceClock(0, Number.NaN).steps).toBe(0);
  });
});

describe('createLoop', () => {
  function fakeFrames() {
    let cb: ((time: number) => void) | null = null;
    return {
      schedule: (fn: (time: number) => void) => {
        cb = fn;
        return 1;
      },
      cancel: () => {
        cb = null;
      },
      tick: (time: number) => {
        const fn = cb;
        cb = null;
        fn?.(time);
      },
      pending: () => cb !== null,
    };
  }

  it('updates in fixed steps, renders once per frame and ignores the very first frame time', () => {
    const f = fakeFrames();
    const update = vi.fn();
    const render = vi.fn();
    const loop = createLoop({ update, render, schedule: f.schedule, cancel: f.cancel });
    loop.start();
    expect(loop.running).toBe(true);
    f.tick(5000); // first frame only sets the clock
    expect(update).toHaveBeenCalledTimes(0);
    expect(render).toHaveBeenCalledTimes(1);
    f.tick(5000 + STEP_MS * 2 + 1);
    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledWith(STEP_MS);
    expect(render).toHaveBeenCalledTimes(2);
    const alpha = render.mock.calls[1]?.[0] as number;
    expect(alpha).toBeGreaterThanOrEqual(0);
    expect(alpha).toBeLessThan(1);
  });

  it('stops cleanly: from outside and from inside an update', () => {
    const f = fakeFrames();
    const loop = createLoop({ update: () => loop.stop(), render: vi.fn(), schedule: f.schedule, cancel: f.cancel });
    loop.start();
    f.tick(0);
    f.tick(STEP_MS * 5);
    expect(loop.running).toBe(false);
    expect(f.pending()).toBe(false);

    const g = fakeFrames();
    const other = createLoop({ update: vi.fn(), render: vi.fn(), schedule: g.schedule, cancel: g.cancel });
    other.start();
    other.stop();
    expect(g.pending()).toBe(false);
    other.start(); // can start again, and starting twice does nothing
    other.start();
    expect(g.pending()).toBe(true);
  });
});

describe('canvas scaling', () => {
  it('letterboxes: fits the width or the height, whichever is tighter', () => {
    const wide = fitCanvas(1000, 300, 320, 180, 1, false);
    expect(Math.abs(wide.cssHeight - 300)).toBeLessThan(1);
    expect(Math.abs(wide.cssWidth - (300 / 180) * 320)).toBeLessThan(1);
    const tall = fitCanvas(300, 1000, 320, 180, 1, false);
    expect(Math.abs(tall.cssWidth - 300)).toBeLessThan(1);
    expect(Math.abs(tall.cssHeight - (300 / 320) * 180)).toBeLessThan(1);
  });

  it('uses whole device pixels per logical pixel when that fills the box well (crisp pixel art)', () => {
    const f = fitCanvas(660, 372, 320, 180, 1); // 2.06x
    expect(f.scale).toBe(2);
    expect(f.pixelWidth).toBe(640);
    expect(f.pixelHeight).toBe(360);
    expect(f.cssWidth).toBe(640);
  });

  it('draws one whole step bigger and shows at the exact fit when a whole number would leave big bars', () => {
    const f = fitCanvas(860, 480, 320, 180, 1); // 2.68x: 2x would fill only 75%
    expect(f.scale).toBe(3);
    expect(f.pixelWidth).toBe(960);
    expect(f.cssWidth).toBeLessThanOrEqual(860);
    expect(f.cssWidth).toBeGreaterThan(850); // fills the height (2.67x), nearly the whole box
    expect(f.cssHeight).toBeLessThanOrEqual(480);
  });

  it('backs the canvas with devicePixelRatio times more pixels for the same CSS size', () => {
    const f1 = fitCanvas(850, 478, 320, 180, 1);
    const f2 = fitCanvas(850, 478, 320, 180, 2);
    expect(f2.cssWidth).toBeLessThanOrEqual(850);
    expect(f1.cssWidth).toBeLessThanOrEqual(850);
    expect(f2.pixelWidth).toBeGreaterThan(f1.pixelWidth);
    expect(f2.pixelWidth).toBeGreaterThanOrEqual(Math.floor(f2.cssWidth * 2));
    expect(f2.scale).toBe(5); // 5.3x on device pixels: 5 fills 94%
  });

  it('scales down smoothly on a small box and never returns an empty canvas', () => {
    const small = fitCanvas(160, 90, 320, 180, 1);
    expect(small.scale).toBeCloseTo(0.5);
    expect(small.cssWidth).toBeCloseTo(160);
    const empty = fitCanvas(0, 0, 320, 180, 1);
    expect(empty.pixelWidth).toBeGreaterThanOrEqual(1);
    expect(empty.pixelHeight).toBeGreaterThanOrEqual(1);
    expect(fitCanvas(100, 100, 320, 180, 0).dpr).toBe(1);
  });

  it('maps pointer positions to logical units', () => {
    const rect = { left: 100, top: 50, width: 640, height: 360 };
    expect(toLogical(100, 50, rect, 320, 180)).toEqual({ x: 0, y: 0 });
    expect(toLogical(740, 410, rect, 320, 180)).toEqual({ x: 320, y: 180 });
    expect(toLogical(420, 230, rect, 320, 180)).toEqual({ x: 160, y: 90 });
    expect(toLogical(1, 1, { left: 0, top: 0, width: 0, height: 0 }, 320, 180)).toEqual({ x: 0, y: 0 });
  });
});

describe('unified input', () => {
  let stop: (() => void) | null = null;
  afterEach(() => {
    stop?.();
    stop = null;
    document.body.innerHTML = '';
  });

  const setup = () => {
    const target = document.createElement('div');
    document.body.append(target);
    const input = createInput(target, (x, y) => ({ x, y }));
    stop = () => input.destroy();
    return { target, input };
  };

  it('maps arrow keys, WASD, Space and Enter to actions', () => {
    expect(keyAction('ArrowLeft')).toBe('left');
    expect(keyAction('d')).toBe('right');
    expect(keyAction('W')).toBe('up');
    expect(keyAction('ArrowDown')).toBe('down');
    expect(keyAction(' ')).toBe('act');
    expect(keyAction('Enter')).toBe('act');
    expect(keyAction('q')).toBeNull();
  });

  it('reads swipes from the dominant direction and ignores short drags', () => {
    expect(swipeAction(-60, 10)).toBe('left');
    expect(swipeAction(60, -10)).toBe('right');
    expect(swipeAction(5, -80)).toBe('up');
    expect(swipeAction(5, 80)).toBe('down');
    expect(swipeAction(10, 10)).toBeNull();
  });

  it('queues key presses once (no key repeat), tracks held keys and clears after frame()', () => {
    const { input } = setup();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    const first = input.frame();
    expect(first.actions).toEqual(['left', 'act']);
    expect([...first.held].sort()).toEqual(['act', 'left']);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
    const second = input.frame();
    expect(second.actions).toEqual([]);
    expect([...second.held]).toEqual(['act']);
  });

  it('turns a short press into a tap and a long drag into a swipe', () => {
    const { target, input } = setup();
    const ptr = (type: string, x: number, y: number) => {
      const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
      Object.defineProperty(e, 'pointerId', { value: 1 });
      Object.defineProperty(e, 'pointerType', { value: 'touch' });
      target.dispatchEvent(e);
    };
    ptr('pointerdown', 10, 10);
    ptr('pointerup', 12, 11);
    expect(input.frame().taps).toEqual([{ x: 12, y: 11 }]);
    ptr('pointerdown', 10, 10);
    ptr('pointermove', 80, 12);
    ptr('pointerup', 80, 12);
    const swipe = input.frame();
    expect(swipe.actions).toEqual(['right']);
    expect(swipe.taps).toEqual([]);
  });

  it('ignores input while disabled and does not steal Space from a focused button', () => {
    const { input } = setup();
    input.setEnabled(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(input.frame().actions).toEqual([]);
    input.setEnabled(true);
    const button = document.createElement('button');
    document.body.append(button);
    const e = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    button.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(input.frame().actions).toEqual([]);
    const arrow = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
    button.dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(true);
    expect(input.frame().actions).toEqual(['up']);
  });
});

describe('Break-time clock', () => {
  it('is due after 10 minutes of cumulative play and stays due until reset', () => {
    const clock = new PlayClock();
    expect(clock.add(9 * 60_000 + 59_000)).toBe(false);
    expect(clock.add(1000)).toBe(true);
    expect(clock.due).toBe(true);
    expect(clock.minutes).toBe(10);
    clock.reset();
    expect(clock.due).toBe(false);
    expect(clock.add(-5)).toBe(false);
    expect(clock.add(Number.NaN)).toBe(false);
    expect(new PlayClock(1000).add(1000)).toBe(true);
  });
});

describe('pixel drawing', () => {
  it('keeps the canvas palette in step with the CSS tokens', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
    const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css)?.[1]?.toLowerCase();
    const pairs: Array<[keyof typeof PALETTE, string]> = [
      ['cream', 'cream'],
      ['gold', 'gold'],
      ['goldDeep', 'gold-deep'],
      ['navy', 'navy'],
      ['ink', 'ink'],
      ['coral', 'coral'],
      ['fact', 'fact'],
      ['fake', 'fake'],
      ['soft', 'soft'],
      ['line', 'line'],
    ];
    for (const [key, name] of pairs) expect(PALETTE[key], name).toBe(token(name));
  });

  it('draws a sprite as one rect per filled cell, skipping "." and unknown letters, and can flip it', () => {
    const calls: Array<[number, number, number, number]> = [];
    const ctx = { fillStyle: '', fillRect: (x: number, y: number, w: number, h: number) => calls.push([x, y, w, h]) } as unknown as CanvasRenderingContext2D;
    sprite(ctx, ['a.b', '.zz'], { a: '#111111', b: '#222222' }, 10, 20, 2);
    expect(calls).toEqual([
      [10, 20, 2, 2],
      [14, 20, 2, 2],
    ]);
    calls.length = 0;
    sprite(ctx, ['a.b'], { a: '#111111', b: '#222222' }, 0, 0, 1, true);
    expect(calls).toEqual([
      [2, 0, 1, 1],
      [0, 0, 1, 1],
    ]);
  });
});

describe('demo game', () => {
  it('is deterministic for a seed and ends after three missed glows', () => {
    const run = (seed: string) => {
      const game = demo.create({ seed, rng: createRng(seed) });
      let steps = 0;
      while (!game.stats().over && steps < 60 * 30) {
        game.step(STEP_MS, idle);
        steps++;
      }
      return steps;
    };
    expect(run('seed-a')).toBe(run('seed-a'));
    expect(run('seed-a')).toBeGreaterThan(60); // more than a second
    expect(run('seed-a')).toBeLessThan(60 * 10);
  });

  it('scores each tap or key and tells screen readers what is going on', () => {
    const game = demo.create({ seed: 'x', rng: createRng('x') });
    game.step(STEP_MS, { ...idle, actions: ['act', 'left'], taps: [{ x: 1, y: 1 }] });
    const stats = game.stats();
    expect(stats.score).toBe(3);
    expect(stats.description).toMatch(/Score 3/);
    expect(stats.description).toMatch(/3 of 3 hearts/);
    expect(stats.hud.map((s) => s.id)).toEqual(['score', 'hearts', 'glow']);
  });
});
