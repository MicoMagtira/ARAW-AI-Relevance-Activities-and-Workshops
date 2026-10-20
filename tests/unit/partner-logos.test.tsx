import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/preact';
import { PartnerLogos, opticalFactor } from '../../src/ui/PartnerLogos';
import sizes from '../../src/assets/logos/logos.json';

afterEach(cleanup);

describe('opticalFactor', () => {
  it('shrinks wide wordmarks and grows square seals, within bounds', () => {
    const wide = opticalFactor(3);
    const square = opticalFactor(1);
    expect(wide).toBeLessThan(1);
    expect(square).toBeGreaterThan(1);
    expect(opticalFactor(50)).toBeCloseTo(0.62);
    expect(opticalFactor(0.2)).toBeCloseTo(1.15 * 1.2);
  });

  it('lifts the faint RDC-NLPHA map', () => {
    expect(opticalFactor(1.9, '05_nicer_rdc_nlpha')).toBeCloseTo(opticalFactor(1.9) * 1.3);
  });
});

describe('PartnerLogos', () => {
  it('lists the six partners in the project order, with alt text and intrinsic sizes', () => {
    render(<PartnerLogos variant="wall" />);
    const list = screen.getByRole('list', { name: 'Project partners' });
    const logos = [...list.querySelectorAll('img')];
    expect(logos.map((img) => img.alt)).toEqual([
      'Department of Science and Technology (DOST)',
      'DOST Philippine Council for Health Research and Development (DOST-PCHRD)',
      'National University',
      'DOST Niche Centers in the Regions for R&D (NICER)',
      'Research and Development Center on Natural Language Processing for Health Applications (RDC-NLPHA)',
      'AIKasalig',
    ]);
    for (const img of logos) {
      expect(img.getAttribute('src')).toMatch(/\.webp/);
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBe(128);
    }
  });

  it('ships every logo small enough for the image budget', () => {
    for (const s of Object.values(sizes)) expect(s.bytes).toBeLessThanOrEqual(24 * 1024);
  });
});
