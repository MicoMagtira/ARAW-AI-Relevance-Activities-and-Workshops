// Pure helpers for the Library screens: search and filters, A to Z grouping, Komiks unlocking and navigation.
import type { GlossaryTerm } from '../content/library/glossary';
import type { KomiksEpisode } from '../content/library/komiks';
import type { Myth, MythTopic } from '../content/library/myths';
import type { VillainId } from '../content/tactics';

export const LIBRARY_TABS = ['myths', 'glossary', 'komiks', 'videos'] as const;
export type LibraryTab = (typeof LIBRARY_TABS)[number];

/** `#/library/<tab>`; anything unknown (or no tab) opens Myths. */
export function parseTab(segment: string | undefined): LibraryTab {
  return LIBRARY_TABS.find((tab) => tab === segment) ?? 'myths';
}

/** `#/library/komiks/<n>`: the episode number, or null when the segment is not a whole number from 1 up. */
export function parseEpisode(segment: string | undefined): number | null {
  if (segment === undefined || !/^\d{1,3}$/.test(segment)) return null;
  const n = Number(segment);
  return n >= 1 ? n : null;
}

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Every word the player typed must appear somewhere in the text (accents and case ignored). */
export function matchesQuery(query: string, ...fields: readonly string[]): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = norm(fields.join(' '));
  return words.every((w) => haystack.includes(w));
}

export interface MythFilter {
  query: string;
  topic: MythTopic | 'all';
  villain: VillainId | 'all';
}

export function filterMyths(myths: readonly Myth[], f: MythFilter): Myth[] {
  return myths.filter(
    (m) => (f.topic === 'all' || m.topic === f.topic) && (f.villain === 'all' || m.villain === f.villain) && matchesQuery(f.query, m.myth, m.fact, m.why, m.check),
  );
}

export function filterGlossary(terms: readonly GlossaryTerm[], query: string): GlossaryTerm[] {
  return terms.filter((g) => matchesQuery(query, g.term, g.meaning, g.example));
}

export interface LetterGroup {
  letter: string;
  terms: GlossaryTerm[];
}

/** Terms sorted A to Z and grouped under their first letter. */
export function groupByLetter(terms: readonly GlossaryTerm[]): LetterGroup[] {
  const sorted = [...terms].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const groups: LetterGroup[] = [];
  for (const term of sorted) {
    const letter = (term.term[0] ?? '#').toUpperCase();
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.terms.push(term);
    else groups.push({ letter, terms: [term] });
  }
  return groups;
}

export const ALPHABET: readonly string[] = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

/** Episode N opens when its module is finished. */
export const episodeUnlocked = (ep: KomiksEpisode, done: readonly string[]): boolean => done.includes(ep.module);

/** Panel index after a step, kept inside the episode. */
export const stepPanel = (index: number, delta: number, count: number): number => Math.max(0, Math.min(count - 1, index + delta));

/** A horizontal swipe of at least `min` px (and clearly more sideways than up or down): 1 = next, -1 = back, 0 = none. */
export function swipeStep(dx: number, dy: number, min = 48): -1 | 0 | 1 {
  if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}
