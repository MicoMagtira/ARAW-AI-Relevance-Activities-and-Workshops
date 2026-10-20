// What a finished Fact or Fake round changes: XP, the best Truth Radar and the Balanced Radar badge.
import { addXp } from '../../app/state';
import { bestRadar, earnBadge, recordActivity } from '../../app/progress';
import type { RoundAnswer } from './FofRound';
import { MIN_ITEMS_FOR_RADAR, radarFor, scoreRound, type RoundScore } from './scoring';

/** Score of a finished round from its answers. */
export const scoreAnswers = (answers: readonly RoundAnswer[]): RoundScore => scoreRound(answers.map((a) => ({ truth: a.item.truth, answer: a.answer })));

/** 10 XP per correct answer (SPEC section 6). Not used in assessment mode. */
export const XP_PER_CORRECT = 10;

export const xpForRound = (correct: number): number => Math.max(0, Math.floor(correct)) * XP_PER_CORRECT;

export interface RoundOutcome {
  /** Round was long enough to count for "best Truth Radar". */
  counted: boolean;
  newBest: boolean;
  badge: boolean;
}

/** Save the radar of a finished free-play (or Module 4) round. Short rounds are a rough read and are not saved. */
export function recordRound(score: RoundScore): RoundOutcome {
  recordActivity();
  if (score.total < MIN_ITEMS_FOR_RADAR) return { counted: false, newBest: false, badge: false };
  const best = bestRadar.value;
  const newBest = !best || score.dPrime > best.dPrime;
  if (newBest) bestRadar.value = { dPrime: score.dPrime, c: score.c, total: score.total };
  const badge = radarFor(score).earnsBadge && earnBadge('radar');
  return { counted: true, newBest, badge };
}

/** Pay a free-play correct answer straight away (replays pay every time). */
export function payCorrect(): number {
  recordActivity();
  addXp(XP_PER_CORRECT);
  return XP_PER_CORRECT;
}

/**
 * The public sources behind an item, for the "Based on" line: WHO, DOH, FDA, laws. The internal writing rules
 * (CONTENT_GUIDE, SPEC) stay in the data for reviewers but are not shown to players. Null when nothing public is left.
 */
export function publicBasis(basis: string): string | null {
  const parts = basis
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/^(CONTENT_GUIDE|SPEC)\b/i.test(part));
  return parts.length > 0 ? parts.join('; ') : null;
}
