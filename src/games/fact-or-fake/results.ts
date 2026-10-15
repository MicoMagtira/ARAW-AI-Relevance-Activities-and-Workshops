// What a finished Fact or Fake round changes: XP, the best Truth Radar and the Timbang na Radar badge.
import { addXp } from '../../app/state';
import { bestRadar, earnBadge } from '../../app/progress';
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
  if (score.total < MIN_ITEMS_FOR_RADAR) return { counted: false, newBest: false, badge: false };
  const best = bestRadar.value;
  const newBest = !best || score.dPrime > best.dPrime;
  if (newBest) bestRadar.value = { dPrime: score.dPrime, c: score.c, total: score.total };
  const badge = radarFor(score).earnsBadge && earnBadge('radar');
  return { counted: true, newBest, badge };
}

/** Pay a free-play correct answer straight away (replays pay every time). */
export function payCorrect(): number {
  addXp(XP_PER_CORRECT);
  return XP_PER_CORRECT;
}
