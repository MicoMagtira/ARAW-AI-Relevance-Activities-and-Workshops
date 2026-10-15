import { describe, expect, it } from 'vitest';
import { BADGES } from '../../src/content/badges';
import { CERT_H, CERT_W, drawCertificate } from '../../src/screens/certificate/certificateArt';

/** A canvas context that only records the text drawn and the sprite pixels filled. */
function recorder() {
  const texts: string[] = [];
  let fills = 0;
  const ctx = {
    set font(_v: string) {},
    get font() {
      return '';
    },
    measureText: (s: string) => ({ width: s.length * 40 }),
    fillText: (s: string) => texts.push(s),
    fillRect: () => (fills += 1),
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    imageSmoothingEnabled: true,
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, fills: () => fills };
}

const data = { name: 'Maria Santos', date: '16 October 2026', earned: 3, total: BADGES.length, medals: BADGES.map((_, i) => i < 3) };

describe('certificate drawing', () => {
  it('is A4 landscape', () => {
    expect(CERT_W / CERT_H).toBeCloseTo(297 / 210, 2);
  });

  it('writes the name, the date, the badge count, the credit line and the not-medical-advice note', () => {
    const { ctx, texts, fills } = recorder();
    drawCertificate(ctx, data);
    expect(texts).toContain('Maria Santos');
    expect(texts).toContain('completed all 10 ARAW modules');
    expect(texts).toContain('on 16 October 2026');
    expect(texts).toContain('Badges earned: 3 of 20');
    expect(texts).toContain('An AIKasalig project · DOST-PCHRD · National University');
    expect(texts).toContain('Educational, not medical advice');
    expect(fills()).toBeGreaterThan(500); // border, sunrise, Ara and the medals are drawn
  });

  it('shows a placeholder, not an empty line, while no name is typed', () => {
    const { ctx, texts } = recorder();
    drawCertificate(ctx, { ...data, name: '   ' });
    expect(texts).toContain('(your name)');
  });
});
