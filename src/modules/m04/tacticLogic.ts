// "Spot the Tactic" post drawing, villain hearts and scoring (docs/SPEC.md section 4, Module 4). No UI in here, so it is all unit-tested.
import { LEGIT_POSTS, postsFor, VILLAIN_IDS, type TacticPick, type TacticPost, type VillainId } from '../../content/tactics';
import { createRng, shuffle } from '../../games/engine/rng';

/** Posts per villain and legit posts in one play. */
export const PER_VILLAIN = 2;
export const LEGIT_PER_PLAY = 2;
export const POST_TOTAL = VILLAIN_IDS.length * PER_VILLAIN + LEGIT_PER_PLAY;
export const POST_POINTS = 10;
/** Correct picks in a row on one villain's trick that beat that villain: its hearts. */
export const HITS_TO_DEFEAT = 3;

/** One play: two posts per villain plus two true posts, drawn with the seed, in a seeded order. */
export function buildPosts(seed: string, pool?: { byVillain: (id: VillainId) => readonly TacticPost[]; legit: readonly TacticPost[] }): TacticPost[] {
  const rng = createRng(seed);
  const byVillain = pool?.byVillain ?? postsFor;
  const legit = pool?.legit ?? LEGIT_POSTS;
  const chosen: TacticPost[] = [];
  for (const id of VILLAIN_IDS) chosen.push(...shuffle(byVillain(id), rng).slice(0, PER_VILLAIN));
  chosen.push(...shuffle(legit, rng).slice(0, LEGIT_PER_PLAY));
  return shuffle(chosen, rng);
}

/** A pick is right when it names the post's trick, or `none` for a legit post. */
export const isPickRight = (post: TacticPost, pick: TacticPick): boolean => post.trick === pick;

export type Streaks = Readonly<Record<string, number>>;

export interface PickOutcome {
  correct: boolean;
  /** The streaks after this pick. */
  streaks: Streaks;
  /** The villain whose trick the post used (null for a legit post). */
  villain: VillainId | null;
  /** True when this pick took a heart from the villain. */
  hit: boolean;
  /** True when this pick broke a streak (a trick post missed). */
  reset: boolean;
  /** Set when this pick beat the villain for the first time. */
  defeatedNow: VillainId | null;
}

/**
 * Apply one pick. A right pick on a trick post takes a heart from that villain; three in a row beat it.
 * A miss on a trick post gives the hearts back. Legit posts never touch a villain. A beaten villain stays beaten.
 */
export function applyPick(streaks: Streaks, beaten: readonly string[], post: TacticPost, pick: TacticPick): PickOutcome {
  const correct = isPickRight(post, pick);
  const villain = post.trick === 'none' ? null : post.trick;
  const base: PickOutcome = { correct, streaks, villain, hit: false, reset: false, defeatedNow: null };
  if (!villain || beaten.includes(villain)) return base;
  const before = streaks[villain] ?? 0;
  if (!correct) return { ...base, streaks: { ...streaks, [villain]: 0 }, reset: before > 0 };
  const after = Math.min(HITS_TO_DEFEAT, before + 1);
  return { ...base, streaks: { ...streaks, [villain]: after }, hit: true, defeatedNow: after >= HITS_TO_DEFEAT ? villain : null };
}

/** Hearts a villain has left: all of them at the start, none once beaten. */
export function heartsLeft(streak: number, beaten: boolean): number {
  return beaten ? 0 : Math.max(0, HITS_TO_DEFEAT - Math.max(0, streak));
}

export const scoreFor = (correct: number): number => correct * POST_POINTS;

/** Stars by right picks: 3 at 90% or more, 2 at 60% or more, else 1 (SPEC: 9/10 and 6/10, scaled to 12 posts). */
export function starsFor(correct: number, total: number = POST_TOTAL): 1 | 2 | 3 {
  if (total <= 0) return 1;
  const share = correct / total;
  return share >= 0.9 ? 3 : share >= 0.6 ? 2 : 1;
}
