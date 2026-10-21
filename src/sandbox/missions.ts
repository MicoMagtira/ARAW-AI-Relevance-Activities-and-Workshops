// "Catch the AI" missions in the Chatbot Sandbox: small tasks that show where a chatbot goes wrong. Two finish on their
// own (the first answer, three ratings); the rest are ticked by the player. Each pays XP once (claimXp keys "sandbox:<id>").
import { claimXp, xpClaims } from '../app/progress';
import type { StringKey } from '../app/i18n';

export type MissionId = 'ask' | 'date' | 'source' | 'language' | 'rate';

export interface Mission {
  id: MissionId;
  title: StringKey;
  hint: StringKey;
  /** Finished by the app (true) or ticked by the player (false). */
  auto: boolean;
}

export const MISSIONS: readonly Mission[] = [
  { id: 'ask', title: 'sb.m.ask', hint: 'sb.m.ask.hint', auto: true },
  { id: 'date', title: 'sb.m.date', hint: 'sb.m.date.hint', auto: false },
  { id: 'source', title: 'sb.m.source', hint: 'sb.m.source.hint', auto: false },
  { id: 'language', title: 'sb.m.language', hint: 'sb.m.language.hint', auto: false },
  { id: 'rate', title: 'sb.m.rate', hint: 'sb.m.rate.hint', auto: true },
];

export const MISSION_XP = 10;
/** Ratings needed for the "rate" mission. */
export const RATINGS_NEEDED = 3;

export const missionKey = (id: MissionId): string => `sandbox:${id}`;

export function isMissionDone(id: MissionId, claims: readonly string[] = xpClaims.value): boolean {
  return claims.includes(missionKey(id));
}

/** Mark a mission done; returns the XP paid (0 if it was already done). */
export function completeMission(id: MissionId): number {
  return claimXp(missionKey(id), MISSION_XP);
}

export function missionsDone(claims: readonly string[] = xpClaims.value): number {
  return MISSIONS.filter((m) => isMissionDone(m.id, claims)).length;
}
