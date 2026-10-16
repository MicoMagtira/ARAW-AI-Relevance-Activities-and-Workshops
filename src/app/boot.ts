import { signal } from '@preact/signals';
import { navigate } from './router';
import { holdMusic, sfx, sfxAfter } from './sound';

/** sessionStorage (not localStorage): the splash plays once per browser session. */
export const BOOT_KEY = 'araw:v1:booted';

let bootedInMemory = false; // fallback when sessionStorage is blocked

export function hasBooted(): boolean {
  try {
    return window.sessionStorage.getItem(BOOT_KEY) === '1';
  } catch {
    return bootedInMemory;
  }
}

export function markBooted(): void {
  bootedInMemory = true;
  try {
    window.sessionStorage.setItem(BOOT_KEY, '1');
  } catch {
    /* blocked: the in-memory flag still covers this page load */
  }
}

/** True while the intro (language landing, then the sunrise splash) is on screen instead of the shell. */
export const splashVisible = signal(false);

/**
 * Which intro screen shows: the language landing first (its tap also unlocks audio, so the music is already playing when
 * the sunrise starts), then the sunrise splash with its loading bar and START.
 */
export type IntroStep = 'language' | 'sunrise';
export const introStep = signal<IntroStep>('language');

/** The splash is the first-visit screen of a session. Deep links (any route but Home) skip it. */
export function initBoot(path: string): void {
  if (hasBooted() || path !== '/') {
    markBooted();
    splashVisible.value = false;
    return;
  }
  introStep.value = 'language';
  splashVisible.value = true;
}

/** Landing screen Select: on to the sunrise splash (the language itself is saved by the caller). */
export function finishLanguage(): void {
  introStep.value = 'sunrise';
}

/** The START chime, the sunrise jingle a beat later, then the morning theme comes in once the jingle has rung out. */
export const SUNRISE_AT_MS = 300;
export const MUSIC_AFTER_START_MS = 2200;

/** START / Skip intro: remember it for this session and land on Home. */
export function finishSplash(): void {
  holdMusic(MUSIC_AFTER_START_MS);
  sfx('start');
  sfxAfter(SUNRISE_AT_MS, 'sunrise');
  markBooted();
  navigate('/');
  splashVisible.value = false;
}
