import { describe, expect, it } from 'vitest';
import { MIN_TEXT_SIZE, box, fitSize, lineWidth, measureBlock, measureLine, text, textBlock } from '../../src/games/engine/draw';

/** A 2D context stand-in that records fonts and fillText calls (canvas 320x180 logical at scale 2). */
function recorder() {
  const calls: Array<{ font: string; text: string; x: number; y: number; maxWidth?: number }> = [];
  const ctx = {
    font: '',
    fillStyle: '',
    textAlign: 'left',
    textBaseline: 'top',
    canvas: { width: 640, height: 360 },
    getTransform: () => ({ a: 2, d: 2, e: 0, f: 0 }),
    fillRect: () => undefined,
    fillText(this: { font: string }, value: string, x: number, y: number, maxWidth?: number) {
      calls.push({ font: this.font, text: value, x, y, maxWidth });
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const sizeOf = (font: string) => Number(/^(\d+)px/.exec(font)?.[1]);

describe('pixel text fitting', () => {
  it('measures the monospaced pixel font', () => {
    expect(lineWidth('ABC', 8)).toBe(24);
    expect(fitSize('ABCDEFGHIJ', 80)).toBe(8);
    expect(fitSize('ABCDEFGHIJ', 70)).toBe(7);
    expect(fitSize('ABCDEFGHIJKLMNOPQRST', 10)).toBe(MIN_TEXT_SIZE);
    expect(measureLine('HELLO', 32)).toEqual({ text: 'HELLO', size: 6, width: 30 });
  });

  it('wraps a block, then steps the size down to fit the allowed lines', () => {
    const roomy = measureBlock('ONE TWO THREE FOUR', 80);
    expect(roomy.lines).toEqual(['ONE TWO', 'THREE FOUR']);
    expect(roomy).toMatchObject({ size: 8, lineHeight: 10, height: 18, width: 80 });
    const tight = measureBlock('ONE TWO THREE FOUR FIVE SIX', 80, { maxLines: 2 });
    expect(tight.lines.length).toBeLessThanOrEqual(2);
    expect(tight.size).toBeLessThan(8);
    const cut = measureBlock('A VERY LONG SENTENCE THAT CANNOT POSSIBLY FIT IN ONE SHORT LINE', 48, { maxLines: 1 });
    expect(cut.lines).toHaveLength(1);
    expect(cut.lines[0]).toMatch(/\.\.\.$/);
    expect(lineWidth(cut.lines[0] as string, cut.size)).toBeLessThanOrEqual(48);
  });

  it('fits text into the box drawn under it, and leaves English that fits alone', async () => {
    const { ctx, calls } = recorder();
    box(ctx, '#fff', 10, 10, 60, 12);
    text(ctx, 'SHORT', 12, 12);
    text(ctx, 'MUCH LONGER LABEL', 12, 12);
    text(ctx, 'FREE TEXT ON THE CANVAS', 4, 100);
    expect(sizeOf(calls[0]?.font ?? '')).toBe(8);
    expect(calls[0]?.maxWidth).toBeUndefined();
    // 17 glyphs into 58px: smallest size, then squeezed by the canvas
    expect(sizeOf(calls[1]?.font ?? '')).toBe(MIN_TEXT_SIZE);
    expect(calls[1]?.maxWidth).toBe(58);
    expect(sizeOf(calls[2]?.font ?? '')).toBe(8);
    // the frame's boxes are forgotten on the next microtask
    await Promise.resolve();
    text(ctx, 'MUCH LONGER LABEL', 12, 12);
    expect(sizeOf(calls[3]?.font ?? '')).toBe(8);
  });

  it('draws a measured block line by line', () => {
    const { ctx, calls } = recorder();
    const block = textBlock(ctx, 'ONE TWO THREE FOUR', 20, 30, 80, { align: 'left' });
    expect(calls.map((c) => [c.text, c.y])).toEqual([
      ['ONE TWO', 30],
      ['THREE FOUR', 40],
    ]);
    expect(block.height).toBe(18);
  });
});
