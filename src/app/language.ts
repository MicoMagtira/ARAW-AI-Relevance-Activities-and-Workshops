// The player's app language, picked on the landing screen and changeable later in Me > Settings.
// Only English exists today. AIKasalig's other languages (Filipino, Cebuano, Ilocano, Hiligaynon) join LANGUAGES as
// their string catalogs land in src/app/i18n.ts.
import { effect } from '@preact/signals';
import { persisted } from './store';

export interface LanguageDef {
  code: string;
  /** The language's name in its own language (shown on the picker card). */
  name: string;
  /** Short tag on the card. */
  tag: string;
}

export const LANGUAGES = [{ code: 'en', name: 'English', tag: 'EN' }] as const satisfies readonly LanguageDef[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const isLanguageCode = (v: unknown): v is LanguageCode => LANGUAGES.some((l) => l.code === v);

/** null until the player picks one on the landing screen. */
export const language = persisted<LanguageCode | null>('language', null, (v): v is LanguageCode | null => v === null || isLanguageCode(v));

export function setLanguage(code: LanguageCode): void {
  language.value = code;
}

/** Keep <html lang> in step with the choice (screen readers pick their voice from it). Returns a stop function. */
export function initLanguage(root: HTMLElement = document.documentElement): () => void {
  return effect(() => {
    root.lang = language.value ?? 'en';
  });
}
