import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import manifestJson from '../../scripts/guide/out/manifest.json';
import { GUIDE_COVER, GUIDE_META, GUIDE_QUICKSTART, GUIDE_SECTIONS } from '../../src/content/guide';
import type { GuideManifest } from '../../src/screens/guide/callouts';
import Guide from '../../src/screens/guide/Guide';

const manifest = manifestJson as unknown as GuideManifest;
const steps = GUIDE_SECTIONS.flatMap((s) => s.steps.map((step) => ({ section: s.id, step })));

describe('guide content', () => {
  it('has the sections the guide promises, with unique ids', () => {
    expect(GUIDE_SECTIONS.map((s) => s.id)).toEqual(['start', 'home', 'learn', 'fof', 'arcade', 'daily', 'library', 'me', 'report', 'facilitators']);
  });

  it('gives every screenshot alt text and every step some words', () => {
    for (const { step } of steps) {
      expect(step.text.length, step.title).toBeGreaterThan(10);
      if (step.shot) expect(step.alt?.length ?? 0, step.title).toBeGreaterThan(20);
    }
  });

  it('only points at screenshots the capture pipeline makes, and the manifest boxes are sane', () => {
    for (const { step } of steps) {
      if (!step.shot) continue;
      const entry = manifest.shots[step.shot];
      expect(entry, `shot ${step.shot}`).toBeDefined();
      for (const shot of Object.values(entry ?? {})) {
        expect(shot.file).toMatch(/^guide\/[a-z-]+-(phone|desktop)\.webp$/); // WebP in the app (scripts/guide/compress.mjs)
        for (const box of Object.values(shot.boxes)) {
          expect(box.x + box.w).toBeLessThanOrEqual(shot.w + 1);
          expect(box.y + box.h).toBeLessThanOrEqual(shot.h + 1);
        }
      }
    }
  });

  it('never shows the hidden test forms', () => {
    expect(Object.keys(manifest.shots).some((id) => id.includes('assess'))).toBe(false);
  });

  it('keeps plain writing: no em dashes outside the credit line', () => {
    const words = JSON.stringify([GUIDE_META, GUIDE_SECTIONS, GUIDE_QUICKSTART, { ...GUIDE_COVER, credit: '' }]);
    expect(words).not.toContain('—');
  });
});

describe('Guide screen', () => {
  it('renders the contents, every section, numbered legends and the PDF link', () => {
    render(<Guide />);
    expect(screen.getByRole('heading', { level: 2, name: 'How to use ARAW' })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Contents' });
    expect(nav.querySelectorAll('button')).toHaveLength(GUIDE_SECTIONS.length);
    for (const s of GUIDE_SECTIONS) expect(screen.getByRole('heading', { level: 2, name: s.title })).toBeTruthy();
    const pdf = screen.getByRole('link', { name: 'Download the printable guide (PDF)' });
    expect(pdf.getAttribute('href')).toBe('./guide/ARAW-User-Guide.pdf');
    // no in-page #anchors: the hash belongs to the router
    for (const a of Array.from(document.querySelectorAll('a'))) expect(a.getAttribute('href')?.startsWith('#')).toBe(false);
    const imgs = Array.from(document.querySelectorAll('img'));
    expect(imgs.length).toBeGreaterThan(20);
    for (const img of imgs) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('alt')?.length ?? 0).toBeGreaterThan(20);
    }
    expect(document.querySelectorAll('.guide-marker').length).toBeGreaterThan(40);
  });
});
