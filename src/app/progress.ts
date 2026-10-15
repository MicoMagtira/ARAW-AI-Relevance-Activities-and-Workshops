// Learning progress: modules, lesson cards and badges. Modules, games and streaks write to these in later tasks.
import { MODULES, type ModuleInfo } from '../content/modules';
import { ARCADE_GAMES, type GameInfo } from '../content/games';
import { addXp } from './state';
import { persisted } from './store';

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** Ids of finished modules ("m01"). */
export const modulesDone = persisted<string[]>('modulesDone', [], isStringArray);

/** Lesson cards finished per module, so a module resumes where the player left it. */
export const cardsDone = persisted<Record<string, number>>(
  'cardsDone',
  {},
  (v): v is Record<string, number> =>
    typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0),
);

/** Ids of earned badges (see src/content/badges.ts). */
export const badgesEarned = persisted<string[]>('badges', [], isStringArray);

/** The module the Continue card points at: the first one not finished (modules unlock in order). */
export function nextModule(done: readonly string[]): ModuleInfo | null {
  return MODULES.find((m) => !done.includes(m.id)) ?? null;
}

export type NodeState = 'done' | 'current' | 'locked';

export function nodeState(m: ModuleInfo, done: readonly string[]): NodeState {
  if (done.includes(m.id)) return 'done';
  return nextModule(done)?.id === m.id ? 'current' : 'locked';
}

/** Arcade games that can really be played: shipped, and open from the start or unlocked by a finished module. */
export function arcadeReady(done: readonly string[], games: readonly GameInfo[] = ARCADE_GAMES): number {
  return games.filter((g) => g.playable && (g.module === null || done.includes(g.module))).length;
}

/** Unlock rule: modules open one after another. A module is open when it is done or is the next one. */
export function isUnlocked(m: ModuleInfo, done: readonly string[]): boolean {
  return nodeState(m, done) !== 'locked';
}

/** Best module-game stars (1 to 3) per module. */
export const moduleStars = persisted<Record<string, number>>(
  'moduleStars',
  {},
  (v): v is Record<string, number> =>
    typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((n) => n === 1 || n === 2 || n === 3),
);

/** Keys of XP rewards already paid ("m01:card:m01-c1", "m01:game"), so nothing is paid twice, even on replay. */
export const xpClaims = persisted<string[]>('xpClaims', [], isStringArray);

/** Pay `amount` XP once per key. Returns the XP given (0 when the key was already claimed). */
export function claimXp(key: string, amount: number): number {
  if (xpClaims.value.includes(key) || !(amount > 0)) return 0;
  xpClaims.value = [...xpClaims.value, key];
  addXp(amount);
  return Math.floor(amount);
}

/** Remember how far a module got: `completed` card steps (never goes backwards). */
export function saveCardProgress(m: ModuleInfo, completed: number): void {
  const next = Math.max(0, Math.min(m.cards, Math.floor(completed)));
  if (next > (cardsDone.value[m.id] ?? 0)) cardsDone.value = { ...cardsDone.value, [m.id]: next };
}

/** Add a badge once. Returns true when it was new. */
export function earnBadge(id: string): boolean {
  if (badgesEarned.value.includes(id)) return false;
  badgesEarned.value = [...badgesEarned.value, id];
  return true;
}

/** The best Truth Radar read from a full round (10+ items), kept by discernment (d-prime). */
export interface BestRadar {
  dPrime: number;
  c: number;
  total: number;
}

export const bestRadar = persisted<BestRadar | null>(
  'bestRadar',
  null,
  (v): v is BestRadar | null =>
    v === null ||
    (typeof v === 'object' &&
      !Array.isArray(v) &&
      Number.isFinite((v as BestRadar).dPrime) &&
      Number.isFinite((v as BestRadar).c) &&
      Number.isFinite((v as BestRadar).total)),
);

/** Spot the Tactic: correct picks in a row per villain id (a miss on that trick resets it). Three beat the villain. */
export const tacticStreaks = persisted<Record<string, number>>(
  'tacticStreaks',
  {},
  (v): v is Record<string, number> =>
    typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0),
);

/** Villain ids whose card is collected (beaten in Spot the Tactic). */
export const villainCards = persisted<string[]>('villainCards', [], isStringArray);

/** Collect a villain's card and its badge once. Returns true when the card was new. */
export function collectVillain(id: string, badgeId: string): boolean {
  if (villainCards.value.includes(id)) return false;
  villainCards.value = [...villainCards.value, id];
  earnBadge(badgeId);
  return true;
}
