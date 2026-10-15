import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { Arcade } from '../../src/screens/Arcade';
import { Briefing } from '../../src/games/engine/Briefing';
import { GameShell } from '../../src/games/engine/GameShell';
import { sessionClock } from '../../src/games/engine/session';
import demo from '../../src/games/demo/demo';
import { modulesDone } from '../../src/app/progress';
import { briefingsSeen, markBriefingSeen } from '../../src/app/scores';
import { resetAll } from '../../src/app/store';

beforeEach(() => {
  // jsdom has no canvas: the shell must cope with a missing 2D context
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  resetAll();
  sessionClock.reset();
  vi.restoreAllMocks();
});

describe('Briefing', () => {
  it('pages through five pages, can go back, and ends with Start', () => {
    const onStart = vi.fn();
    const onSkip = vi.fn();
    render(<Briefing pages={demo.briefing} onStart={onStart} onSkip={onSkip} />);
    expect(screen.getAllByText('Page 1 of 5').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Kailan ako magtitiwala?' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Why it matters' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('can be skipped on any page', () => {
    const onSkip = vi.fn();
    render(<Briefing pages={demo.briefing} onStart={() => {}} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('pages with the arrow keys', () => {
    render(<Briefing pages={demo.briefing} onStart={() => {}} onSkip={() => {}} />);
    const body = screen.getByRole('heading', { name: 'Hello, test pilot!' });
    fireEvent.keyDown(body, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: 'The idea' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('heading', { name: 'The idea' }), { key: 'ArrowLeft' });
    expect(screen.getByRole('heading', { name: 'Hello, test pilot!' })).toBeTruthy();
  });
});

describe('GameShell', () => {
  it('shows the briefing on the first run, then the start card once it is skipped', () => {
    render(<GameShell game={demo} />);
    expect(screen.getByRole('heading', { name: 'Hello, test pilot!' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(briefingsSeen.value).toContain('demo');
    expect(screen.getByRole('heading', { name: 'Sun Tap', level: 2 })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('goes straight to the start card when the briefing was seen, and plays, pauses and resumes', () => {
    markBriefingSeen('demo');
    render(<GameShell game={demo} seed="unit-seed" />);
    expect(screen.queryByRole('heading', { name: 'Hello, test pilot!' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    // HUD and a text description of the state
    const hud = screen.getByRole('list', { name: 'Game status' });
    expect(within(hud).getByText('Score')).toBeTruthy();
    expect(screen.getByRole('img', { name: /Sun Tap/ })).toBeTruthy();
    expect(screen.getByText(/Score 0\. 3 of 3 hearts left/)).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Pause' })[0] as HTMLElement);
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Resume' })[0] as HTMLElement);
    expect(screen.queryByRole('heading', { name: 'Paused' })).toBeNull();
  });

  it('pauses by itself when the tab is hidden', () => {
    markBriefingSeen('demo');
    render(<GameShell game={demo} seed="unit-seed" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy();
  });

  it('pauses with Escape and opens How to play with the controls and a briefing replay', () => {
    markBriefingSeen('demo');
    render(<GameShell game={demo} seed="unit-seed" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'How to play' })[0] as HTMLElement);
    expect(screen.getByText('Tap, click or press Space to keep the sun glowing.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: "Watch Ara's briefing again" }));
    expect(screen.getByRole('heading', { name: 'Hello, test pilot!' })).toBeTruthy();
  });

  it('shows the break overlay once the session clock is due', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
    try {
      markBriefingSeen('demo');
      render(<GameShell game={demo} seed="unit-seed" breakAfterMs={200} />);
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('heading', { name: 'Pahinga muna!' })).toBeTruthy();
      expect(screen.getByText(/Stand up, roll your shoulders/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }));
      expect(screen.queryByRole('heading', { name: 'Pahinga muna!' })).toBeNull();
      expect(sessionClock.due).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Arcade tiles', () => {
  it('has a tile per game with its unlock rule in the label', () => {
    render(<Arcade />);
    const tiles = screen.getAllByRole('button').filter((b) => b.classList.contains('arcade-tile'));
    expect(tiles).toHaveLength(11);
    const locked = tiles.filter((b) => /After Module \d+/.test(b.getAttribute('aria-label') ?? ''));
    expect(locked).toHaveLength(5);
    expect(tiles[0]?.getAttribute('aria-label')).toBe('Takbo, Data!, Data privacy, New');
    expect(tiles[1]?.getAttribute('aria-label')).toBe("Feed Mo 'To, Algorithms and filter bubbles, New");
    expect(tiles[2]?.getAttribute('aria-label')).toBe('Luto ni Ara, Prompting AI well, New');
    expect(tiles[3]?.getAttribute('aria-label')).toBe("Sino 'To?, Voice-clone scams, New");
    expect(screen.getByRole('link', { name: 'Play Fact or Fake' }).getAttribute('href')).toBe('#/play/fact-or-fake');
  });

  it('unlocks a module game tile when its module is done', () => {
    modulesDone.value = ['m06'];
    render(<Arcade />);
    const hati = screen.getByRole('button', { name: /^Hati Tayo!/ });
    expect(hati.getAttribute('aria-label')).toBe('Hati Tayo!, AI and jobs, Coming soon');
  });
});
