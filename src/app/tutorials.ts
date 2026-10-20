// How-to videos: which clips exist (the recorder's manifest), which language to play, and the one shared video dialog.
// Any screen calls openTutorial(id); the TutorialHost in the shell shows the player (its code loads on first use).
import { signal } from '@preact/signals';
import { ALL_LANGUAGES, language, type LanguageCode } from './language';
import { persisted } from './store';
import manifestJson from '../content/tutorialManifest.json';
import type { TutorialId } from '../content/tutorials';

/** One recorded clip: its length in seconds and its size in KB. */
export interface ClipInfo {
  s: number;
  kb: number;
}

type Manifest = Partial<Record<TutorialId, Partial<Record<LanguageCode, ClipInfo>>>>;

let manifest: Manifest = manifestJson as Manifest;

/** Tests swap in a manifest of their own. */
export function setTutorialManifest(next: Manifest): void {
  manifest = next;
}

/** The languages a clip was recorded in, in picker order. */
export function tutorialLangs(id: TutorialId): LanguageCode[] {
  const clips = manifest[id] ?? {};
  return ALL_LANGUAGES.map((l) => l.code).filter((code) => clips[code] !== undefined);
}

export const hasTutorial = (id: TutorialId): boolean => tutorialLangs(id).length > 0;

/** The app's language when the clip has it, else English, else whatever exists. */
export function defaultTutorialLang(id: TutorialId, appLang: LanguageCode | null = language.value): LanguageCode | null {
  const langs = tutorialLangs(id);
  if (appLang && langs.includes(appLang)) return appLang;
  if (langs.includes('en')) return 'en';
  return langs[0] ?? null;
}

export const clipInfo = (id: TutorialId, lang: LanguageCode): ClipInfo | undefined => manifest[id]?.[lang];

/** Relative to the page, so it works under any static-host base path. */
export const videoSrc = (id: TutorialId, lang: LanguageCode): string => `videos/${id}/${lang}.webm`;
export const captionSrc = (id: TutorialId, lang: LanguageCode): string => `videos/${id}/${lang}.vtt`;

/** 25 -> "0:25", 72 -> "1:12". */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 840 -> "0.8", 2600 -> "2.5" (MB, one decimal). */
export const formatMb = (kb: number): string => Math.max(0.1, kb / 1024).toFixed(1);

/** Captions under the video: on by default, remembered. */
export const captionsOn = persisted<boolean>('tutorialCaptions', true, (v): v is boolean => typeof v === 'boolean');

/** The clip in the shared video dialog, or null when it is closed. */
export const tutorialOpen = signal<TutorialId | null>(null);

export function openTutorial(id: TutorialId): void {
  if (hasTutorial(id)) tutorialOpen.value = id;
}

export function closeTutorial(): void {
  tutorialOpen.value = null;
}

/** The caption lines of a WebVTT file, in order (the transcript under the player). Cue tags such as <b> are dropped. */
export function parseVtt(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.split('\n'))
    .map((lines) => {
      const timing = lines.findIndex((line) => line.includes('-->'));
      return timing < 0 ? '' : lines.slice(timing + 1).join(' ').replace(/<[^>]+>/g, '').trim();
    })
    .filter((line) => line.length > 0);
}
