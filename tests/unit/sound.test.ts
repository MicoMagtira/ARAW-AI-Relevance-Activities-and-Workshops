import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const synthMock = vi.hoisted(() => ({
  playSfx: vi.fn(),
  say: vi.fn(),
  setGains: vi.fn(),
  setTrack: vi.fn(),
  resume: vi.fn(),
  suspend: vi.fn(),
  tryAutoplay: vi.fn(() => false),
}));
vi.mock('../../src/app/sound/synth', async (orig) => ({ ...(await orig<typeof import('../../src/app/sound/synth')>()), ...synthMock }));

import { DEFAULT_SOUND, effectiveGains, isSoundPrefs, setSound, sliderToGain, soundPrefs } from '../../src/app/sound/prefs';
import { N, SFX, SONGS, parseTrack } from '../../src/app/sound/synth';
import { initSound, setMusic, sfx } from '../../src/app/sound';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('sound prefs', () => {
  it('default like TALA: music on at 25, effects on at 65', () => {
    expect(DEFAULT_SOUND).toEqual({ musicOn: true, musicVolume: 25, sfxOn: true, sfxVolume: 65 });
  });

  it('validates saved prefs', () => {
    expect(isSoundPrefs(DEFAULT_SOUND)).toBe(true);
    expect(isSoundPrefs({ ...DEFAULT_SOUND, musicVolume: 140 })).toBe(false);
    expect(isSoundPrefs({ ...DEFAULT_SOUND, sfxOn: 'yes' })).toBe(false);
    expect(isSoundPrefs(null)).toBe(false);
  });

  it('maps sliders to gains, and a switched-off channel is silent', () => {
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(100)).toBe(1);
    expect(sliderToGain(50)).toBeGreaterThan(0.25);
    expect(sliderToGain(50)).toBeLessThan(0.5);
    expect(effectiveGains({ ...DEFAULT_SOUND, musicOn: false }).music).toBe(0);
    expect(effectiveGains({ ...DEFAULT_SOUND, sfxOn: false }).sfx).toBe(0);
  });
});

describe('synth helpers', () => {
  it('turns note names into frequencies', () => {
    expect(N('A4')).toBeCloseTo(440);
    expect(N('C5')).toBeCloseTo(523.25, 1);
    expect(N('Bb3')).toBeCloseTo(N('A#3'));
    expect(() => N('H2')).toThrow();
  });

  it('parses tracks with holds and rests', () => {
    const { total, by } = parseTrack('C5 - - . E5 - G5+B5 .');
    expect(total).toBe(8);
    expect(by.get(0)).toMatchObject({ n: 'C5', len: 3 });
    expect(by.get(4)).toMatchObject({ n: 'E5', len: 2 });
    expect(by.get(6)).toMatchObject({ n: 'G5+B5', len: 1 });
  });

  it('every song has whole bars and valid notes', () => {
    for (const s of Object.values(SONGS)) {
      for (const tr of s.tracks) {
        const toks = tr.pat.trim().split(/\s+/);
        expect(toks.length % 8).toBe(0);
        for (const tk of toks) if (tk !== '-' && tk !== '.') tk.split('+').forEach((n) => expect(() => N(n)).not.toThrow());
      }
    }
  });

  it('runs every effect safely without Web Audio (jsdom)', () => {
    for (const fn of Object.values(SFX)) expect(() => (fn as () => void)()).not.toThrow();
  });
});

describe('sound controller', () => {
  let stop: () => void = () => undefined;
  beforeEach(() => {
    Object.values(synthMock).forEach((f) => f.mockClear());
    synthMock.tryAutoplay.mockReturnValue(false);
    soundPrefs.value = DEFAULT_SOUND;
    stop = initSound(document);
  });
  afterEach(() => stop());

  it('falls back to the first interaction when the browser blocks autoplay', async () => {
    sfx('correct');
    await flush();
    expect(synthMock.playSfx).not.toHaveBeenCalled();
    expect(synthMock.tryAutoplay).toHaveBeenCalled();
    const b = document.createElement('button');
    document.body.append(b);
    b.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    b.click();
    await flush();
    expect(synthMock.resume).toHaveBeenCalled();
    expect(synthMock.playSfx).toHaveBeenCalledWith('tap', undefined);
    b.remove();
  });

  it('starts music without a gesture when the browser allows autoplay', async () => {
    stop();
    synthMock.tryAutoplay.mockReturnValue(true);
    stop = initSound(document);
    setMusic('umaga');
    await flush();
    expect(synthMock.setTrack).toHaveBeenLastCalledWith('umaga');
    expect(synthMock.resume).not.toHaveBeenCalled();
  });

  it('does not attempt autoplay when both saved sound channels are muted', async () => {
    stop();
    soundPrefs.value = { ...DEFAULT_SOUND, musicOn: false, sfxOn: false };
    synthMock.tryAutoplay.mockClear();
    stop = initSound(document);
    await flush();
    expect(synthMock.tryAutoplay).not.toHaveBeenCalled();
    expect(synthMock.setTrack).toHaveBeenLastCalledWith(null);
  });

  it('honours data-sfx and the effects switch', async () => {
    document.dispatchEvent(new Event('pointerdown'));
    await flush();
    const own = document.createElement('button');
    own.dataset.sfx = 'select';
    const quiet = document.createElement('button');
    quiet.dataset.sfx = 'none';
    document.body.append(own, quiet);
    own.click();
    quiet.click();
    await flush();
    expect(synthMock.playSfx.mock.calls.map((c) => c[0])).toEqual(['select']);
    setSound('sfxOn', false);
    own.click();
    await flush();
    expect(synthMock.playSfx).toHaveBeenCalledTimes(1);
    own.remove();
    quiet.remove();
  });

  it('plays the screen track only while music is on', async () => {
    document.dispatchEvent(new Event('pointerdown'));
    setMusic('umaga');
    await flush();
    expect(synthMock.setTrack).toHaveBeenLastCalledWith('umaga');
    setSound('musicOn', false);
    await flush();
    expect(synthMock.setTrack).toHaveBeenLastCalledWith(null);
    setSound('musicOn', true);
    setMusic('laro');
    await flush();
    expect(synthMock.setTrack).toHaveBeenLastCalledWith('laro');
  });
});
