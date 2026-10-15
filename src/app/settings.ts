import { effect } from '@preact/signals';
import { persisted } from './store';

export interface Settings {
  largeText: boolean;
  highContrast: boolean;
  xlButtons: boolean;
  srHints: boolean;
  reduceMotion: boolean;
}

export type SettingKey = keyof Settings;

/** Root class applied to <html> for each setting (all OFF by default). */
export const SETTING_CLASSES: Record<SettingKey, string> = {
  largeText: 'a11y-large-text',
  highContrast: 'a11y-high-contrast',
  xlButtons: 'a11y-xl-buttons',
  srHints: 'a11y-sr-hints',
  reduceMotion: 'a11y-reduce-motion',
};

export const SETTING_KEYS = Object.keys(SETTING_CLASSES) as SettingKey[];

export const DEFAULT_SETTINGS: Settings = {
  largeText: false,
  highContrast: false,
  xlButtons: false,
  srHints: false,
  reduceMotion: false,
};

function isSettings(v: unknown): v is Settings {
  return typeof v === 'object' && v !== null && SETTING_KEYS.every((k) => typeof (v as Record<string, unknown>)[k] === 'boolean');
}

export const settings = persisted<Settings>('settings', DEFAULT_SETTINGS, isSettings);

export function setSetting(key: SettingKey, value: boolean): void {
  settings.value = { ...settings.value, [key]: value };
}

export function applySettings(root: HTMLElement, s: Settings): void {
  for (const key of SETTING_KEYS) root.classList.toggle(SETTING_CLASSES[key], s[key]);
}

/** Keep the root classes in sync with the settings signal. Returns a stop function. */
export function initSettings(root: HTMLElement = document.documentElement): () => void {
  return effect(() => applySettings(root, settings.value));
}
