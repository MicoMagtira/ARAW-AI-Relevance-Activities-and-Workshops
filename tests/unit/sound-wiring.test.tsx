// Sound wiring: the music per area, the Me sound controls, and the silence of the assessment forms.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';

const sound = vi.hoisted(() => ({ sfx: vi.fn(), araSay: vi.fn(), setMusic: vi.fn(), holdMusic: vi.fn(), sfxAfter: vi.fn(() => () => undefined) }));
vi.mock('../../src/app/sound/index', async (orig) => ({ ...(await orig<typeof import('../../src/app/sound/index')>()), ...sound }));

import { ROUTES } from '../../src/app/routes';
import { trackFor } from '../../src/app/sound/music';
import { DEFAULT_SOUND, soundPrefs } from '../../src/app/sound/prefs';
import { resetAll } from '../../src/app/store';
import { FOF_ITEMS } from '../../src/content/factOrFake/items';
import type { FofItem } from '../../src/content/factOrFake/schema';
import { FofRound, comboLevel } from '../../src/games/fact-or-fake/FofRound';
import { timerCue } from '../../src/games/engine/cues';
import { rewardCues } from '../../src/screens/Lesson';
import { Me } from '../../src/screens/Me';

beforeEach(() => {
  window.localStorage.clear();
  resetAll();
  soundPrefs.value = DEFAULT_SOUND;
  Object.values(sound).forEach((f) => f.mockClear());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('music per area', () => {
  it('maps every route to its track', () => {
    const expected: Record<string, string> = {
      home: 'umaga',
      learn: 'umaga',
      library: 'umaga',
      me: 'umaga',
      daily: 'umaga',
      about: 'umaga',
      guide: 'umaga',
      report: 'umaga',
      notFound: 'umaga',
      lesson: 'aral',
      fof: 'aral',
      assess: 'aral',
      arcade: 'laro',
      game: 'laro',
      certificate: 'panalo',
    };
    for (const r of ROUTES) expect(trackFor(r.name), r.name).toBe(expected[r.name]);
    expect(trackFor('notFound')).toBe('umaga');
  });

  it('plays the morning theme on the splash, whatever the hash says', () => {
    expect(trackFor('game', true)).toBe('umaga');
    expect(trackFor('certificate', true)).toBe('umaga');
  });
});

describe('Me: sound controls', () => {
  const slider = (name: RegExp) => screen.getByRole('slider', { name }) as HTMLInputElement;

  it('shows Music and Sound effects on by default (TALA: 25 and 65), each with a labelled volume', () => {
    render(<Me />);
    expect(screen.getByRole('switch', { name: 'Music' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('switch', { name: 'Sound effects' }).getAttribute('aria-checked')).toBe('true');
    expect(slider(/^Music volume/).value).toBe('25');
    expect(slider(/^Sound effects volume/).value).toBe('65');
    expect(slider(/^Music volume/).getAttribute('aria-valuetext')).toBe('25%');
  });

  it('turning a channel off disables its slider and saves', () => {
    render(<Me />);
    fireEvent.click(screen.getByRole('switch', { name: 'Music' }));
    expect(screen.getByRole('switch', { name: 'Music' }).getAttribute('aria-checked')).toBe('false');
    expect(slider(/^Music volume/).disabled).toBe(true);
    expect(slider(/^Sound effects volume/).disabled).toBe(false);
    fireEvent.click(screen.getByRole('switch', { name: 'Sound effects' }));
    expect(slider(/^Sound effects volume/).disabled).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('araw:v1:sound') ?? '{}')).toMatchObject({ musicOn: false, sfxOn: false });
  });

  it('switches carry their up and down blips, and turning effects back on confirms with one', () => {
    render(<Me />);
    const fx = screen.getByRole('switch', { name: 'Sound effects' });
    expect(fx.dataset.sfx).toBe('toggleOff');
    fireEvent.click(fx);
    expect(fx.dataset.sfx).toBe('toggleOn');
    fireEvent.click(fx);
    expect(sound.sfx).toHaveBeenCalledWith('toggleOn');
  });

  it('volume sliders save, and releasing the effects slider plays a short preview', () => {
    render(<Me />);
    fireEvent.input(slider(/^Music volume/), { target: { value: '60' } });
    fireEvent.input(slider(/^Sound effects volume/), { target: { value: '30' } });
    fireEvent.change(slider(/^Sound effects volume/));
    expect(soundPrefs.value).toMatchObject({ musicVolume: 60, sfxVolume: 30 });
    expect(JSON.parse(window.localStorage.getItem('araw:v1:sound') ?? '{}')).toMatchObject({ musicVolume: 60, sfxVolume: 30 });
    expect(sound.sfx).toHaveBeenCalledWith('tap');
  });
});

describe('answer sounds', () => {
  const FAKE = FOF_ITEMS.find((i) => i.id === 'fof-p-001') as FofItem;
  const FACT = FOF_ITEMS.find((i) => i.id === 'fof-p-002') as FofItem;

  it('practice: the stamp of the truth first, then the verdict and Ara a beat later', () => {
    vi.useFakeTimers();
    render(<FofRound items={[FAKE, FACT]} mode="free" finishLabel="Done" onFinish={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fake' }));
    expect(sound.sfx.mock.calls).toEqual([['stampFake']]);
    vi.advanceTimersByTime(2000);
    expect(sound.sfx).toHaveBeenLastCalledWith('correct', 0);
    expect(sound.araSay).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Fake' }).dataset.sfx).toBe('none');
  });

  it('assessment forms make no feedback sound at all', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    render(<FofRound items={[FAKE, FACT]} mode="assess" finishLabel="Done" onFinish={onFinish} />);
    fireEvent.click(screen.getByRole('button', { name: 'Fact' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fact' }));
    vi.advanceTimersByTime(5000);
    expect(onFinish).toHaveBeenCalled();
    expect(sound.sfx).not.toHaveBeenCalled();
    expect(sound.araSay).not.toHaveBeenCalled();
  });

  it('combo level: plain first, brighter in a row, capped at 5', () => {
    expect([1, 2, 3, 6, 9].map(comboLevel)).toEqual([0, 1, 2, 5, 5]);
    expect(comboLevel(0)).toBe(0);
  });
});

describe('sequences and timers', () => {
  it('module reward: jingle, badge, XP tally, unlock (replays only the jingle)', () => {
    expect(rewardCues({ firstTime: true, newBadges: ['module-m01'] }).map(([, n]) => n)).toEqual(['complete', 'badge', 'tally', 'unlock']);
    expect(rewardCues({ firstTime: true, newBadges: [] }).map(([, n]) => n)).toEqual(['complete', 'tally', 'unlock']);
    expect(rewardCues({ firstTime: false, newBadges: [] })).toEqual([[0, 'complete']]);
  });

  it('ticks once per whole second in the last 5, with a hurry at 3', () => {
    const seen: string[] = [];
    for (let ms = 8000; ms > 0; ms -= 16) {
      const c = timerCue(ms, ms - 16);
      if (c) seen.push(c);
    }
    expect(seen).toEqual(['tick', 'tick', 'hurry', 'tick', 'tick']);
    expect(timerCue(2000, 9000)).toBeNull(); // a reset upwards is silent
  });
});
