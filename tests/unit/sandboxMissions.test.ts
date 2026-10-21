// "Catch the AI" missions: each pays XP once, and the count reflects what is done.
import { beforeEach, describe, expect, it } from 'vitest';
import { xpClaims } from '../../src/app/progress';
import { xp } from '../../src/app/state';
import { completeMission, isMissionDone, MISSION_XP, MISSIONS, missionKey, missionsDone } from '../../src/sandbox/missions';

describe('sandbox missions', () => {
  beforeEach(() => {
    xpClaims.value = [];
    xp.value = 0;
  });

  it('has five missions with unique ids, two of them finished by the app', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(5);
    expect(MISSIONS.filter((m) => m.auto).map((m) => m.id)).toEqual(['ask', 'rate']);
  });

  it('pays XP once per mission', () => {
    expect(completeMission('date')).toBe(MISSION_XP);
    expect(completeMission('date')).toBe(0);
    expect(xp.value).toBe(MISSION_XP);
    expect(isMissionDone('date')).toBe(true);
    expect(xpClaims.value).toContain(missionKey('date'));
  });

  it('counts the missions done', () => {
    expect(missionsDone()).toBe(0);
    for (const m of MISSIONS) completeMission(m.id);
    expect(missionsDone()).toBe(MISSIONS.length);
    expect(xp.value).toBe(MISSION_XP * MISSIONS.length);
  });
});
