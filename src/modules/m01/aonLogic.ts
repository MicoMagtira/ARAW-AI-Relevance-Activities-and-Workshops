// "AI or Not?" logic: deck building, scoring and stars (docs/SPEC.md section 4, Module 1). No UI in here, so it is all unit-tested.
import { AON_POOL, answerFor, type AonAnswer, type AonItem } from '../../content/aiOrNot';
import { createRng, shuffle } from '../../games/engine/rng';

/** Cards per round. */
export const DECK_SIZE = 12;
/** How many of the 12 come from each kind: 5 AI, 5 Not AI, 2 hype (hype also counts as Not AI). */
export const DECK_MIX = { ai: 5, 'not-ai': 5, hype: 2 } as const;

export const POINTS = { correct: 10, streakBonus: 5, streakEvery: 3 } as const;

/** A seeded deck of 12 cards: the same seed always gives the same cards in the same order, and no card repeats. */
export function buildDeck(seed: string | number, pool: readonly AonItem[] = AON_POOL): AonItem[] {
  const rng = createRng(seed);
  const deck: AonItem[] = [];
  for (const kind of ['ai', 'not-ai', 'hype'] as const) {
    deck.push(...shuffle(pool.filter((i) => i.kind === kind), rng).slice(0, DECK_MIX[kind]));
  }
  // A small pool tops up from whatever is left, so a deck is as full as the pool allows.
  if (deck.length < DECK_SIZE) {
    const used = new Set(deck.map((i) => i.id));
    deck.push(...shuffle(pool.filter((i) => !used.has(i.id)), rng).slice(0, DECK_SIZE - deck.length));
  }
  return shuffle(deck, rng).slice(0, DECK_SIZE);
}

export interface RoundState {
  correct: number;
  /** Current run of right answers. */
  streak: number;
  best: number;
  score: number;
  answered: number;
}

export const newRound = (): RoundState => ({ correct: 0, streak: 0, best: 0, score: 0, answered: 0 });

export interface AnswerResult {
  state: RoundState;
  right: boolean;
  /** True when this answer completed a run of three (+5 bonus). */
  bonus: boolean;
  /** Points this answer earned, bonus included. */
  points: number;
}

/** Score one answer: +10 when right, +5 more for every third right answer in a row. A wrong answer resets the run. */
export function scoreAnswer(state: RoundState, item: AonItem, answer: AonAnswer): AnswerResult {
  const right = answerFor(item) === answer;
  const streak = right ? state.streak + 1 : 0;
  const bonus = right && streak % POINTS.streakEvery === 0;
  const points = right ? POINTS.correct + (bonus ? POINTS.streakBonus : 0) : 0;
  return {
    right,
    bonus,
    points,
    state: { correct: state.correct + (right ? 1 : 0), streak, best: Math.max(state.best, streak), score: state.score + points, answered: state.answered + 1 },
  };
}

/** 3 stars at 11 or more right, 2 at 8 or more, otherwise 1. */
export function starsForScore(correct: number): 1 | 2 | 3 {
  return correct >= 11 ? 3 : correct >= 8 ? 2 : 1;
}

/** The best possible score for a deck of `n` cards. */
export const maxScore = (n: number = DECK_SIZE): number => n * POINTS.correct + Math.floor(n / POINTS.streakEvery) * POINTS.streakBonus;
