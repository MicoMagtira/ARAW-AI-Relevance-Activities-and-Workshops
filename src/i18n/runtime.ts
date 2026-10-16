// Translation runtime. A language pack maps an English source string to its translation (src/i18n/packs/<code>.json,
// built by scripts/i18n/pack.mjs). English needs no pack. Strings missing from a pack stay in English, so a partly
// translated language never breaks the app. Packs are lazy chunks: only the chosen language downloads.
import { signal } from '@preact/signals';

type Pack = Record<string, string>;

const LOADERS = import.meta.glob<{ default: Pack }>('./packs/*.json');
const loaderFor = (code: string) => LOADERS[`./packs/${code}.json`];

/** Languages with a pack in this build (English is always available). */
export const hasPack = (code: string): boolean => code === 'en' || !!loaderFor(code);

let dict: Map<string, string> | null = null;
let known: Set<string> | null = null; // every translation, so an already translated string is not reported as missing
let activeCode = 'en';

/** Bumps every time the active pack changes, so the app can remount in the new language. */
export const packVersion = signal(0);

/** Translate one English source string (exact match); anything unknown passes through unchanged. */
export function tx(s: string): string {
  if (!dict) return s;
  const hit = dict.get(s);
  if (hit !== undefined) return hit;
  // a line the screen wraps in quotation marks ("...") is still the same sentence inside
  const quoted = /^(["“'])([\s\S]+)(["”'])$/.exec(s);
  if (quoted) {
    const inner = dict.get(quoted[2] as string);
    if (inner !== undefined) return `${quoted[1]}${inner}${quoted[3]}`;
  }
  // report only text that still reads as English (sentences built from translated parts are fine)
  if (missing && !known?.has(s) && /\b(the|and|you|your|to|of|is|are|with|for|this|that|what|how|it|finish|play)\b/i.test(s)) missing.add(s);
  return s;
}

export const activeLanguage = (): string => activeCode;

/**
 * Load and switch to a language (English clears the pack). Never throws: on failure the app stays in English.
 * `remount` bumps packVersion so screens already on show re-render in the new language (not needed before first paint).
 */
export async function loadPack(code: string | null | undefined, remount = true): Promise<void> {
  const next = code ?? 'en';
  if (next === activeCode && (next === 'en' || dict)) return;
  const loader = next === 'en' ? null : loaderFor(next);
  try {
    const pack = loader ? (await loader()).default : null;
    dict = pack ? new Map(Object.entries(pack)) : null;
    known = pack ? new Set(Object.values(pack)) : null;
    activeCode = pack ? next : 'en';
  } catch {
    dict = null;
    known = null;
    activeCode = 'en';
  }
  if (remount) packVersion.value++;
}

/**
 * QA aid: with `?i18n-missing` in the URL (or in tests), English-looking strings that had no translation are collected
 * in `window.__arawMissing`, so a sweep can list what a pack still lacks.
 */
let missing: Set<string> | null = null;
if (typeof window !== 'undefined' && /[?&]i18n-missing\b/.test(window.location.search)) {
  missing = new Set();
  (window as unknown as { __arawMissing: Set<string> }).__arawMissing = missing;
}
