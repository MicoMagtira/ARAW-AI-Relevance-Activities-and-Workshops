import { describe, expect, it } from 'vitest';
import { anchorPoint, isUsableBox, pickShot, placeCallouts, type GuideManifest } from '../../src/screens/guide/callouts';

describe('guide callout placement', () => {
  it('turns a box into percentages of the image, centred on its top-left corner', () => {
    const [m] = placeCallouts(['a'], { a: { x: 100, y: 200, w: 100, h: 50 } }, 400, 800);
    expect(m).toEqual({ n: 1, target: 'a', left: 25, top: 25 });
  });

  it('numbers by target order and skips missing or empty boxes without renumbering', () => {
    const boxes = { a: { x: 10, y: 10, w: 50, h: 50 }, c: { x: 200, y: 300, w: 50, h: 50 }, d: { x: 5, y: 5, w: 0, h: 10 } };
    const ms = placeCallouts(['a', 'b', 'c', 'd'], boxes, 400, 800);
    expect(ms.map((m) => [m.n, m.target])).toEqual([
      [1, 'a'],
      [3, 'c'],
    ]);
  });

  it('keeps markers fully inside the image', () => {
    const [m] = placeCallouts(['a'], { a: { x: 395, y: 795, w: 40, h: 40 } }, 400, 800, { marker: 40 });
    expect(m!.left).toBe(95); // (400 - 20) / 400
    expect(m!.top).toBe(97.5); // (800 - 20) / 800
  });

  it('nudges a marker that would cover an earlier one', () => {
    const box = { x: 100, y: 100, w: 200, h: 200 };
    const [a, b] = placeCallouts(['a', 'b'], { a: box, b: { ...box } }, 400, 800);
    expect(a!.top).not.toBe(b!.top);
    const dy = Math.abs(a!.top - b!.top) * 8; // back to pixels
    expect(dy).toBeGreaterThanOrEqual(28);
  });

  it('supports centre and left anchors', () => {
    const box = { x: 0, y: 0, w: 100, h: 60 };
    expect(anchorPoint(box, 'center')).toEqual({ x: 50, y: 30 });
    expect(anchorPoint(box, 'left', 20)).toEqual({ x: 10, y: 30 });
    expect(anchorPoint({ x: 30, y: 40, w: 10, h: 10 })).toEqual({ x: 30, y: 40 });
  });

  it('rejects boxes outside the image or with bad numbers', () => {
    expect(isUsableBox(undefined, 10, 10)).toBe(false);
    expect(isUsableBox({ x: 20, y: 0, w: 5, h: 5 }, 10, 10)).toBe(false);
    expect(isUsableBox({ x: Number.NaN, y: 0, w: 5, h: 5 }, 10, 10)).toBe(false);
    expect(isUsableBox({ x: 2, y: 2, w: 5, h: 5 }, 10, 10)).toBe(true);
  });

  it('picks the wanted variant and falls back to the other', () => {
    const entry = { file: 'guide/x.png', w: 1, h: 1, scale: 1, boxes: {} };
    const m: GuideManifest = { generatedAt: '', shots: { only: { phone: entry } } };
    expect(pickShot(m, 'only', 'desktop')).toBe(entry);
    expect(pickShot(m, 'nope', 'phone')).toBeUndefined();
  });
});
