// Learning progress: modules, lesson cards and badges. Modules, games and streaks write to these in later tasks.
import { MODULES, type ModuleInfo } from '../content/modules';
import { ARCADE_GAMES } from '../content/games';
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

/** Arcade games that are playable: the open ones plus those whose module is finished. */
export function arcadeReady(done: readonly string[]): number {
  return ARCADE_GAMES.filter((g) => g.module === null || done.includes(g.module)).length;
}
