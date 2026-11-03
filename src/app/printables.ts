// Library > Printables: which PDF sheets the print kit built (scripts/print/build.mjs writes printManifest.json), grouped by
// sheet for one language. Facilitator-only sheets (the Fact or Fake test forms and their key) are never in the manifest and
// are filtered here too, so they can never be listed or linked.
import manifestJson from '../content/printManifest.json';
import { ALL_LANGUAGES, language, type LanguageCode } from './language';

export interface PrintEntry {
  id: string;
  lang: string;
  pages: number;
  bytes: number;
}

/** Sheets that stay with the facilitator (test sets): never public. */
export const FACILITATOR_ONLY: ReadonlySet<string> = new Set(['pretest-form-a', 'posttest-form-b', 'answer-key']);

/** Display order: the one-page guides first, then cards, reference sheets and the facilitator guide. */
export const SHEET_ORDER = ['trust-guide', 'module-posters', 'five-tricks', 'check-before-share', 'red-flags', 'myth-cards', 'glossary', 'komiks', 'session-guides', 'certificate'] as const;

export interface PrintSheet {
  id: string;
  /** The language the file is really in (English when the chosen language has no copy of this sheet). */
  lang: string;
  pages: number;
  bytes: number;
  /** Relative to the page, so it works under any static-host base path. */
  href: string;
}

let entries: readonly PrintEntry[] = (manifestJson as { entries: PrintEntry[] }).entries;

/** Tests swap in a manifest of their own. */
export function setPrintManifest(next: readonly PrintEntry[]): void {
  entries = next;
}

const isPublic = (e: PrintEntry): boolean => !FACILITATOR_ONLY.has(e.id);

export const printHref = (id: string, lang: string): string => `print/${lang}/${id}.pdf`;

/** The languages that have at least one public sheet, in picker order. */
export function printLangs(): LanguageCode[] {
  const have = new Set(entries.filter(isPublic).map((e) => e.lang));
  return ALL_LANGUAGES.map((l) => l.code).filter((code) => have.has(code));
}

/** The app's language when sheets exist in it, else English, else the first language that has sheets. */
export function defaultPrintLang(appLang: LanguageCode | null = language.value): LanguageCode | null {
  const langs = printLangs();
  if (appLang && langs.includes(appLang)) return appLang;
  if (langs.includes('en')) return 'en';
  return langs[0] ?? null;
}

/** One row per public sheet for `lang` (a missing copy falls back to English), in display order. */
export function printSheets(lang: string): PrintSheet[] {
  const pub = entries.filter(isPublic);
  const ids = [...new Set(pub.map((e) => e.id))];
  const rank = (id: string): number => {
    const i = (SHEET_ORDER as readonly string[]).indexOf(id);
    return i < 0 ? SHEET_ORDER.length : i;
  };
  ids.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const rows: PrintSheet[] = [];
  for (const id of ids) {
    const hit = pub.find((e) => e.id === id && e.lang === lang) ?? pub.find((e) => e.id === id && e.lang === 'en');
    if (hit) rows.push({ id, lang: hit.lang, pages: hit.pages, bytes: hit.bytes, href: printHref(id, hit.lang) });
  }
  return rows;
}

/** 531_000 -> "519 KB", 2_000_000 -> "1.9 MB". */
export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
