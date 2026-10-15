import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/preact';
import { Ara, ARA_REACTION_MS, araLabel, araScale, araSize } from '../../src/ui/Ara';
import { AraBubble, AraSays } from '../../src/ui/AraBubble';
import { ARA_MOODS, GRID, PALETTE, getFrame, pathFor, runsByColour } from '../../src/ui/ara/frames';
import { DEFAULT_SETTINGS, settings } from '../../src/app/settings';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  settings.value = DEFAULT_SETTINGS;
});

describe('Ara frames', () => {
  it.each(ARA_MOODS)('%s is a 32x32 grid using only palette colours', (mood) => {
    for (const opts of [{}, { bob: true }, { blink: true }]) {
      const rows = getFrame(mood, opts);
      expect(rows).toHaveLength(GRID);
      for (const row of rows) {
        expect(row).toHaveLength(GRID);
        for (const ch of row) expect(ch === '.' || ch in PALETTE).toBe(true);
      }
    }
  });

  it('every mood is a different picture', () => {
    const pictures = new Set(ARA_MOODS.map((m) => getFrame(m).join('\n')));
    expect(pictures.size).toBe(ARA_MOODS.length);
  });

  it('the feet are the same in every mood', () => {
    for (const mood of ARA_MOODS) expect(getFrame(mood)[31]).toBe(getFrame('idle')[31]);
  });

  it('the bob frame lowers the head one cell and keeps the feet planted', () => {
    const a = getFrame('idle');
    const b = getFrame('idle', { bob: true });
    expect(b[0]).toBe('.'.repeat(GRID));
    expect(b.slice(1, 20)).toEqual(a.slice(0, 19));
    expect(b.slice(21)).toEqual(a.slice(21));
  });

  it('blink closes the eyes (idle only)', () => {
    const open = getFrame('idle');
    const shut = getFrame('idle', { blink: true });
    expect(shut[12]).not.toBe(open[12]);
    expect(shut[13]).toBe(open[13]);
    expect(getFrame('happy', { blink: true })).toEqual(getFrame('happy'));
  });

  it('merges horizontal runs per colour and reproduces every cell', () => {
    const rows = getFrame('happy');
    const rebuilt = rows.map(() => Array<string>(GRID).fill('.'));
    for (const [ch, runs] of runsByColour(rows)) for (const { x, y, w } of runs) for (let i = 0; i < w; i++) (rebuilt[y] as string[])[x + i] = ch;
    expect(rebuilt.map((r) => r.join(''))).toEqual([...rows]);
    expect(pathFor([{ x: 1, y: 2, w: 3 }])).toBe('M1 2h3v1h-3z');
  });
});

describe('Ara props', () => {
  it('scale is a whole number between 1 and 12, defaulting to 2', () => {
    expect(araScale(undefined)).toBe(2);
    expect(araScale(Number.NaN)).toBe(2);
    expect(araScale(3)).toBe(3);
    expect(araScale(2.6)).toBe(3);
    expect(araScale(0)).toBe(1);
    expect(araScale(99)).toBe(12);
    expect(araSize(8)).toBe(256);
  });

  it('renders a crisp svg at the integer scale with an accessible label', () => {
    render(<Ara mood="happy" scale={3} />);
    const svg = screen.getByRole('img', { name: 'Ara, your guide, looking happy' });
    expect(svg.getAttribute('width')).toBe('96');
    expect(svg.getAttribute('height')).toBe('96');
    expect(svg.getAttribute('viewBox')).toBe('0 0 32 32');
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
  });

  it('describes every mood, and a custom label wins', () => {
    for (const mood of ARA_MOODS) expect(araLabel(mood)).toMatch(/^Ara, your guide, looking \w+/);
    render(<Ara label="Ara waves hello" />);
    expect(screen.getByRole('img', { name: 'Ara waves hello' })).toBeTruthy();
  });

  it('decorative Ara is hidden from assistive tech', () => {
    const { container } = render(<Ara decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('swaps frames with the mood prop', () => {
    const { container, rerender } = render(<Ara mood="idle" animate={false} />);
    expect(container.querySelector('.ara')?.getAttribute('data-mood')).toBe('idle');
    rerender(<Ara mood="think" animate={false} />);
    expect(container.querySelector('.ara')?.getAttribute('data-mood')).toBe('think');
  });
});

describe('Ara animation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const pathData = (c: Element) =>
    [...c.querySelectorAll('path')]
      .map((p) => p.getAttribute('d'))
      .join('|');

  it('bobs every 600ms', () => {
    const { container } = render(<Ara />);
    const before = pathData(container);
    act(() => void vi.advanceTimersByTime(600));
    expect(pathData(container)).not.toBe(before);
    act(() => void vi.advanceTimersByTime(600));
    expect(pathData(container)).toBe(before);
  });

  it('stays still with the in-app Reduce motion setting', () => {
    settings.value = { ...DEFAULT_SETTINGS, reduceMotion: true };
    const { container } = render(<Ara />);
    const before = pathData(container);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(pathData(container)).toBe(before);
  });

  it('stays still with animate={false}', () => {
    const { container } = render(<Ara animate={false} />);
    const before = pathData(container);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(pathData(container)).toBe(before);
  });

  it('a reaction holds the mood for 900ms then returns to idle; happy hops unless motion is reduced', () => {
    const { container, unmount } = render(<Ara mood="happy" revert />);
    const ara = () => container.querySelector('.ara') as HTMLElement;
    expect(ara().getAttribute('data-mood')).toBe('happy');
    expect(ara().classList.contains('ara--hop')).toBe(true);
    act(() => void vi.advanceTimersByTime(ARA_REACTION_MS));
    expect(ara().getAttribute('data-mood')).toBe('idle');
    unmount();

    settings.value = { ...DEFAULT_SETTINGS, reduceMotion: true };
    const reduced = render(<Ara mood="wow" revert />);
    const el = reduced.container.querySelector('.ara') as HTMLElement;
    expect(el.getAttribute('data-mood')).toBe('wow'); // the frame still changes: that is information
    expect(el.classList.contains('ara--hop')).toBe(false);
  });
});

describe('AraBubble', () => {
  it('renders the text with a decorative tail on the chosen side', () => {
    const { container } = render(<AraBubble side="right">Kaya mo ito!</AraBubble>);
    expect(screen.getByText('Kaya mo ito!')).toBeTruthy();
    expect(container.querySelector('.px-bubble--right')).toBeTruthy();
    expect(container.querySelector('.px-bubble__tail')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[aria-live]')).toBeNull();
  });

  it('is a polite live region only when asked to be', () => {
    render(<AraBubble live>Muntik na!</AraBubble>);
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
  });

  it('AraSays puts Ara on the requested side and hides her sprite from screen readers', () => {
    const { container } = render(<AraSays side="right">Hello</AraSays>);
    expect(container.firstElementChild?.lastElementChild?.classList.contains('ara')).toBe(true);
    expect(screen.queryByRole('img')).toBeNull();
  });
});
