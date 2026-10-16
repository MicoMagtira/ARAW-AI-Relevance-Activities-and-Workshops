// Sound controller (main bundle, tiny). The synth itself is a lazy chunk that loads on the first tap.
// Like TALA: music and sound effects each have a switch and a volume; music starts after the first interaction
// (browsers block audio before that), and every button gives a short click unless it asks for its own sound.
import { effect } from '@preact/signals';
import { effectiveGains, soundPrefs } from './prefs';
import type { Mood, SfxName, TrackId } from './synth';

export type { Mood, SfxName, TrackId } from './synth';

type Synth = typeof import('./synth');
let synth: Synth | null = null;
let loading: Promise<Synth | null> | null = null;
let unlocked = false;
let wanted: TrackId | null = null;
let held: ReturnType<typeof setTimeout> | null = null;

function load(): Promise<Synth | null> {
  loading ??= import('./synth').then(
    (m) => {
      synth = m;
      return m;
    },
    () => null,
  );
  return loading;
}

function sync(m: Synth): void {
  const { sfx, music } = effectiveGains(soundPrefs.value);
  m.setGains(sfx, music);
  m.setTrack(unlocked && music > 0 && !held ? wanted : null);
}

/** Play a sound effect (does nothing while effects are off). */
export function sfx(name: SfxName, arg?: number): void {
  const p = soundPrefs.value;
  if (!p.sfxOn || p.sfxVolume === 0 || !unlocked) return;
  if (synth) synth.playSfx(name, arg);
  else void load().then((m) => m?.playSfx(name, arg));
}

/** Ara's blip voice for a short line (the first 60 characters at most). Idle Ara stays quiet. */
export function araSay(text: string, mood: Mood | 'idle'): void {
  const p = soundPrefs.value;
  if (mood === 'idle' || !p.sfxOn || p.sfxVolume === 0 || !unlocked || !text) return;
  const line = text.length > 60 ? text.slice(0, 60) : text;
  void load().then((m) => m?.say(line, mood));
}

/** Choose the background track for the current screen (null for silence). */
export function setMusic(id: TrackId | null): void {
  wanted = id;
  if (synth) sync(synth);
}

/**
 * Keep the music quiet for `ms` (a jingle such as the sunrise or the certificate fanfare plays alone), then let the
 * screen's track come back in from its first bar.
 */
export function holdMusic(ms: number): void {
  if (held) clearTimeout(held);
  held = setTimeout(() => {
    held = null;
    if (synth) sync(synth);
  }, ms);
  if (synth) sync(synth);
}

/** Play an effect after a short delay (sequenced celebrations). Returns a cancel function. */
export function sfxAfter(ms: number, name: SfxName, arg?: number): () => void {
  const id = setTimeout(() => sfx(name, arg), ms);
  return () => clearTimeout(id);
}

/** Call from inside a user gesture (a tap or key press): browsers only allow audio to start then. */
export function unlockAudio(): void {
  unlocked = true;
  void load().then((m) => {
    if (!m) return;
    m.resume();
    sync(m);
  });
}

const CLICKABLE = 'button, a.px-btn, a.nav-item, a.tab-item, a[data-sfx], [role="button"], [role="tab"], [role="switch"]';

/** Wire the app-wide listeners once at boot. Returns a stop function (for tests). */
export function initSound(doc: Document = document): () => void {
  const onFirst = (): void => unlockAudio();
  doc.addEventListener('pointerdown', onFirst, { capture: true, once: true });
  doc.addEventListener('keydown', onFirst, { capture: true, once: true });

  // A generic click for every button and nav item. Elements choose another sound with data-sfx="select|back|tab|..."
  // or opt out with data-sfx="none" (when the screen plays its own sound, such as an answer or a stamp).
  const onClick = (e: MouseEvent): void => {
    const el = e.target instanceof Element ? e.target.closest<HTMLElement>(CLICKABLE) : null;
    if (!el || el.matches(':disabled, [aria-disabled="true"]')) return;
    const own = el.closest<HTMLElement>('[data-sfx]')?.dataset.sfx;
    if (own === 'none') return;
    if (own) sfx(own as SfxName);
    else if (el.matches('a.nav-item, a.tab-item, [role="tab"]')) sfx('tab');
    else sfx('tap');
  };
  doc.addEventListener('click', onClick, { capture: true });

  // Pause everything while the app is in the background; carry on when it comes back.
  const onVisible = (): void => {
    if (!synth) return;
    if (doc.visibilityState === 'hidden') synth.suspend();
    else if (unlocked) synth.resume();
  };
  doc.addEventListener('visibilitychange', onVisible);

  const stopEffect = effect(() => {
    void soundPrefs.value;
    if (synth) sync(synth);
  });

  return () => {
    doc.removeEventListener('pointerdown', onFirst, { capture: true });
    doc.removeEventListener('keydown', onFirst, { capture: true });
    doc.removeEventListener('click', onClick, { capture: true });
    doc.removeEventListener('visibilitychange', onVisible);
    stopEffect();
  };
}
