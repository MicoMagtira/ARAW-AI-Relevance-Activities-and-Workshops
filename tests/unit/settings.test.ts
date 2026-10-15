import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, SETTING_CLASSES, SETTING_KEYS, applySettings, initSettings, setSetting, settings } from '../../src/app/settings';

describe('settings', () => {
  it('are all off by default', () => {
    expect(Object.values(DEFAULT_SETTINGS).every((v) => v === false)).toBe(true);
    expect(SETTING_KEYS).toHaveLength(5);
  });

  it('applySettings toggles one root class per setting', () => {
    const root = document.createElement('html');
    applySettings(root, { ...DEFAULT_SETTINGS, largeText: true, reduceMotion: true });
    expect(root.classList.contains('a11y-large-text')).toBe(true);
    expect(root.classList.contains('a11y-reduce-motion')).toBe(true);
    expect(root.classList.contains('a11y-high-contrast')).toBe(false);
    applySettings(root, DEFAULT_SETTINGS);
    expect(root.className).toBe('');
  });

  it('initSettings keeps the root in sync with the signal and persists', () => {
    const root = document.createElement('html');
    const stop = initSettings(root);
    setSetting('highContrast', true);
    expect(root.classList.contains(SETTING_CLASSES.highContrast)).toBe(true);
    expect(window.localStorage.getItem('araw:v1:settings')).toContain('"highContrast":true');
    setSetting('highContrast', false);
    expect(root.classList.contains(SETTING_CLASSES.highContrast)).toBe(false);
    stop();
    setSetting('xlButtons', true);
    expect(root.classList.contains(SETTING_CLASSES.xlButtons)).toBe(false);
    setSetting('xlButtons', false);
    expect(settings.value.xlButtons).toBe(false);
  });
});
