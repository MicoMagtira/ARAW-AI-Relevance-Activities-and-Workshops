// The player's app language, picked on the landing screen and changeable later in Me > Settings.
// AIKasalig's five languages. A language shows on the pickers once its translation pack exists (src/i18n/packs/<code>.json);
// English is the source and always available.
import { effect } from '@preact/signals';
import { hasPack, loadPack } from '../i18n/runtime';
import { persisted } from './store';

export interface LanguageDef {
  code: string;
  /** The language's name in its own language (shown on the picker card). */
  name: string;
  /** Short tag on the card. */
  tag: string;
  /** "Choose your language" in this language, shown under the landing heading. */
  prompt: string;
}

export const ALL_LANGUAGES = [
  { code: 'en', name: 'English', tag: 'EN', prompt: 'Choose your language' },
  { code: 'fil', name: 'Filipino', tag: 'FIL', prompt: 'Piliin ang iyong wika' },
  { code: 'ceb', name: 'Cebuano', tag: 'CEB', prompt: 'Pilia ang imong pinulongan' },
  { code: 'ilo', name: 'Ilokano', tag: 'ILO', prompt: 'Pilien ti pagsasaom' },
  { code: 'hil', name: 'Hiligaynon', tag: 'HIL', prompt: 'Pilia ang imo lenggwahe' },
] as const satisfies readonly LanguageDef[];

export type LanguageCode = (typeof ALL_LANGUAGES)[number]['code'];

/** The languages this build can show (English plus every language with a pack). */
export const LANGUAGES: readonly LanguageDef[] = ALL_LANGUAGES.filter((l) => hasPack(l.code));

export const isLanguageCode = (v: unknown): v is LanguageCode => LANGUAGES.some((l) => l.code === v);

/** null until the player picks one on the landing screen. */
export const language = persisted<LanguageCode | null>('language', null, (v): v is LanguageCode | null => v === null || isLanguageCode(v));

/**
 * Save the choice and switch to it. From Me the app remounts in the new language once its pack has loaded; the landing
 * passes remount=false because nothing translated is on screen yet (and a remount would undo its focus handling).
 */
export function setLanguage(code: LanguageCode, remount = true): Promise<void> {
  language.value = code;
  return loadPack(code, remount);
}

/** Keep <html lang> in step with the choice (screen readers pick their voice from it). Returns a stop function. */
export function initLanguage(root: HTMLElement = document.documentElement): () => void {
  return effect(() => {
    root.lang = language.value ?? 'en';
  });
}
