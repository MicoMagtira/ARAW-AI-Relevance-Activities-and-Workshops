// Module runner logic: steps, resume point, scoring and completion. No UI in here, so it is all unit-tested.
import { MODULES, type ModuleInfo } from '../content/modules';
import { claimXp, earnBadge, modulesDone, moduleStars, saveCardProgress, xpClaims } from '../app/progress';
import type { Card, ChoiceCard, ModuleContent, SwipeSortCard } from './types';

/** XP per docs/SPEC.md section 9. */
export const XP = { card: 5, game: 50, practiceItem: 10, module: 100 } as const;

export type Step =
  | { kind: 'card'; id: string; card: Card; index: number }
  | { kind: 'game'; id: string }
  | { kind: 'takeaway'; id: string; card: ModuleContent['takeaway'] }
  | { kind: 'practice'; id: string }
  | { kind: 'reward'; id: string };

/** hook -> lesson cards -> module game -> "When should I trust it?" -> mini Fact or Fake -> reward. */
export function buildSteps(content: ModuleContent): Step[] {
  const cards: Card[] = [content.hook, ...content.cards];
  return [
    ...cards.map((card, index): Step => ({ kind: 'card', id: card.id, card, index })),
    { kind: 'game', id: `${content.id}-game` },
    { kind: 'takeaway', id: content.takeaway.id, card: content.takeaway },
    { kind: 'practice', id: `${content.id}-practice` },
    { kind: 'reward', id: `${content.id}-reward` },
  ];
}

/** Steps that count towards the progress bar (everything before the reward). */
export const countedSteps = (steps: readonly Step[]): number => steps.filter((s) => s.kind !== 'reward').length;

/** Where to start: the saved card, or the start when the module is finished (replay). */
export function startIndex(m: ModuleInfo, cardsDone: Readonly<Record<string, number>>, done: readonly string[]): number {
  if (done.includes(m.id)) return 0;
  return Math.max(0, Math.min(m.cards, Math.floor(cardsDone[m.id] ?? 0)));
}

/** Mini Fact or Fake length: 5 items, 10 in Module 4 (which also shows the Truth Radar). */
export const practiceCount = (moduleId: string): number => (moduleId === 'm04' ? 10 : 5);

/** Komiks episode N unlocks with module N. */
export const komiksEpisode = (m: ModuleInfo): number => m.n;

export const nextModuleAfter = (m: ModuleInfo): ModuleInfo | undefined => MODULES[m.n];

/* ---------- Cards ---------- */

export interface ChoiceResult {
  correct: boolean;
  feedback: string;
}

export function checkChoice(card: ChoiceCard, picked: number): ChoiceResult {
  const option = card.options[picked];
  return { correct: picked === card.correct, feedback: option?.feedback ?? '' };
}

export interface PlaceResult {
  correct: boolean;
  why: string;
}

/** Place the next swipe-sort item in a bin (`binIndex` 0 = left, 1 = right). */
export function placeSortItem(card: SwipeSortCard, itemIndex: number, binIndex: 0 | 1): PlaceResult | null {
  const item = card.items[itemIndex];
  const bin = card.bins[binIndex];
  if (!item || !bin) return null;
  return { correct: item.bin === bin.id, why: item.why };
}

/** 3 stars for a perfect score, 2 for at least two thirds, else 1. */
export function starsFor(correct: number, total: number): 1 | 2 | 3 {
  if (total <= 0) return 1;
  if (correct >= total) return 3;
  return correct / total >= 2 / 3 ? 2 : 1;
}

/* ---------- Progress and rewards ---------- */

/** A lesson card step was finished: save progress and pay its XP once. Returns XP given. */
export function completeCard(m: ModuleInfo, cardId: string, index: number): number {
  saveCardProgress(m, index + 1);
  return claimXp(`${m.id}:card:${cardId}`, XP.card);
}

/** The module game was completed (any result counts). Keeps the best stars. Returns XP given. */
export function completeGame(m: ModuleInfo, stars: 1 | 2 | 3): number {
  if (stars > (moduleStars.value[m.id] ?? 0)) moduleStars.value = { ...moduleStars.value, [m.id]: stars };
  return claimXp(`${m.id}:game`, XP.game);
}

/** One mini Fact or Fake answer. Correct answers pay once per item per module. Returns XP given. */
export function answerPractice(m: ModuleInfo, itemId: string, correct: boolean): number {
  return correct ? claimXp(`${m.id}:fof:${itemId}`, XP.practiceItem) : 0;
}

export interface FinishResult {
  /** False on a replay: nothing new is earned. */
  firstTime: boolean;
  badgeId: string;
  newBadges: string[];
  unlocked: ModuleInfo | null;
  komiks: number | null;
  /** XP given by finishing (the module bonus). */
  xp: number;
}

/** The player reached the reward step: mark the module done, pay the bonus, award badges. */
export function finishModule(m: ModuleInfo): FinishResult {
  const badgeId = `module-${m.id}`;
  const firstTime = !modulesDone.value.includes(m.id);
  if (!firstTime) return { firstTime, badgeId, newBadges: [], unlocked: null, komiks: null, xp: 0 };

  modulesDone.value = [...modulesDone.value, m.id];
  saveCardProgress(m, m.cards);
  const xp = claimXp(`${m.id}:module`, XP.module);
  const newBadges: string[] = [];
  if (earnBadge(badgeId)) newBadges.push(badgeId);
  if (MODULES.every((x) => modulesDone.value.includes(x.id)) && earnBadge('finale')) newBadges.push('finale');
  return { firstTime, badgeId, newBadges, unlocked: nextModuleAfter(m) ?? null, komiks: komiksEpisode(m), xp };
}

export interface XpTally {
  cards: number;
  game: number;
  practice: number;
  module: number;
  total: number;
}

/** What a module has paid so far, read back from the claim keys (so a resumed run still adds up). */
export function tallyFor(moduleId: string, claims: readonly string[] = xpClaims.value): XpTally {
  const mine = claims.filter((k) => k.startsWith(`${moduleId}:`));
  const count = (part: string) => mine.filter((k) => k.split(':')[1] === part).length;
  const tally = {
    cards: count('card') * XP.card,
    game: count('game') * XP.game,
    practice: count('fof') * XP.practiceItem,
    module: count('module') * XP.module,
  };
  return { ...tally, total: tally.cards + tally.game + tally.practice + tally.module };
}
