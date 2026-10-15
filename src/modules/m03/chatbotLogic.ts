// "Tanong kay Chatbot" round building and scoring (docs/SPEC.md section 4, Module 3). No UI in here, so it is all unit-tested.
import { CHAT_ROUNDS, PRIVACY_SCENARIO, RULINGS, type ChatRound, type PrivacyScenario, type Ruling } from '../../content/chatbot';
import { createRng, shuffle } from '../../games/engine/rng';

export const ROUND_TOTAL = 8;
/** Points for every correct ruling (and for a fully right permission choice). */
export const RULING_POINTS = 10;
/** How many of each ruling a play is guaranteed, so every play teaches all three. */
const PER_RULING = 2;

export type GameRound = { kind: 'qa'; round: ChatRound } | { kind: 'privacy'; scenario: PrivacyScenario };

/**
 * Eight rounds for one play: the privacy scenario plus seven chat questions (two of each ruling and one more),
 * drawn from the pool with the seed, in a seeded order. The privacy round never comes first.
 */
export function buildRounds(seed: string, pool: readonly ChatRound[] = CHAT_ROUNDS): GameRound[] {
  const rng = createRng(seed);
  const chosen: ChatRound[] = [];
  const rest: ChatRound[] = [];
  for (const ruling of RULINGS) {
    const group = shuffle(
      pool.filter((r) => r.ruling === ruling),
      rng,
    );
    chosen.push(...group.slice(0, PER_RULING));
    rest.push(...group.slice(PER_RULING));
  }
  const extra = ROUND_TOTAL - 1 - chosen.length;
  chosen.push(...shuffle(rest, rng).slice(0, extra));
  const rounds: GameRound[] = shuffle(chosen, rng).map((round) => ({ kind: 'qa', round }));
  const at = 1 + Math.floor(rng() * rounds.length);
  rounds.splice(at, 0, { kind: 'privacy', scenario: PRIVACY_SCENARIO });
  return rounds;
}

/** A ruling is right when it matches the round's ruling. */
export const isRulingRight = (round: ChatRound, ruling: Ruling): boolean => round.ruling === ruling;

/** A red-flag round ruled anything but Magpatingin earns the extra gentle warning. */
export const needsRedFlagWarning = (round: ChatRound, ruling: Ruling): boolean => round.redFlag && ruling !== 'magpatingin';

export interface PermissionCheck {
  id: string;
  allowed: boolean;
  right: boolean;
}

/** Check the player's choices against what the app needs. `allowed` holds the ids the player switched on. */
export function checkPermissions(scenario: PrivacyScenario, allowed: ReadonlySet<string>): { checks: PermissionCheck[]; allRight: boolean } {
  const checks = scenario.permissions.map((p) => ({ id: p.id, allowed: allowed.has(p.id), right: allowed.has(p.id) === p.needed }));
  return { checks, allRight: checks.every((c) => c.right) };
}

export const scoreFor = (correct: number): number => correct * RULING_POINTS;

/** Stars by right rounds out of eight: 3 at 7 or more, 2 at 5 or more, else 1. */
export const starsFor = (correct: number): 1 | 2 | 3 => (correct >= 7 ? 3 : correct >= 5 ? 2 : 1);
