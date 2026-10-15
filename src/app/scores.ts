// Arcade results: personal bests, first-run briefings seen, and the XP a finished run pays (docs/SPEC.md section 5).
import { addXp } from './state';
import { persisted } from './store';

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Best score per game slug. */
export const bestScores = persisted<Record<string, number>>(
  'bestScores',
  {},
  (v): v is Record<string, number> =>
    typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0),
);

/** Slugs of games whose first-run briefing the player has seen or skipped. */
export const briefingsSeen = persisted<string[]>('briefingsSeen', [], isStringArray);

export function markBriefingSeen(slug: string): void {
  if (!briefingsSeen.value.includes(slug)) briefingsSeen.value = [...briefingsSeen.value, slug];
}

export const RUN_XP_BASE = 10;
export const RUN_XP_GOOD = 20;
export const RUN_XP_BEST = 20;
export const RUN_XP_MAX = 50;

/** 10 base + 20 for a good run + 20 for a new personal best, at most 50. */
export function runXp(score: number, goodRun: number, newBest: boolean): number {
  return Math.min(RUN_XP_MAX, RUN_XP_BASE + (score >= goodRun ? RUN_XP_GOOD : 0) + (newBest ? RUN_XP_BEST : 0));
}

export interface RunResult {
  score: number;
  /** Best before this run (0 when there was none). */
  previousBest: number;
  best: number;
  newBest: boolean;
  goodRun: boolean;
  xp: number;
}

/** Save a finished run: update the personal best and pay the run XP. */
export function recordRun(slug: string, score: number, goodRun: number): RunResult {
  const safe = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const previousBest = bestScores.value[slug] ?? 0;
  const newBest = safe > previousBest;
  if (newBest) bestScores.value = { ...bestScores.value, [slug]: safe };
  const xp = runXp(safe, goodRun, newBest);
  addXp(xp);
  return { score: safe, previousBest, best: Math.max(previousBest, safe), newBest, goodRun: safe >= goodRun, xp };
}
