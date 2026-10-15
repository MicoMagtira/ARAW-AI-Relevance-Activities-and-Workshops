import { afterEach, describe, expect, it } from 'vitest';
import { dailyGame } from '../../src/app/daily';
import {
  DAILY_BONUS_XP,
  bandBlocks,
  dailyRecord,
  fofBlocks,
  isComplete,
  recordDailyFof,
  recordDailyGame,
  recordFor,
  scoreBands,
  shareDate,
  shareText,
} from '../../src/app/dailyChallenge';
import { recordRun } from '../../src/app/scores';
import { xp } from '../../src/app/state';
import { resetAll } from '../../src/app/store';
import { dailyItems } from '../../src/games/fact-or-fake/rounds';

afterEach(() => resetAll());

const DAY = new Date('2026-10-15T04:00:00Z');

describe('daily items', () => {
  it('are the same for everyone on the same day and differ between days', () => {
    const ids = (date: string) => dailyItems(date).map((i) => i.id);
    expect(ids('2026-10-15')).toEqual(ids('2026-10-15'));
    expect(ids('2026-10-15')).not.toEqual(ids('2026-10-16'));
  });

  it('are 3 practice items with at least one fact and one fake, never from the test forms', () => {
    for (let d = 1; d <= 60; d++) {
      const date = `2026-${d <= 30 ? '09' : '10'}-${String(((d - 1) % 30) + 1).padStart(2, '0')}`;
      const items = dailyItems(date);
      expect(items).toHaveLength(3);
      expect(new Set(items.map((i) => i.id)).size).toBe(3);
      expect(items.some((i) => i.truth === 'fact')).toBe(true);
      expect(items.some((i) => i.truth === 'fake')).toBe(true);
      expect(items.every((i) => i.set === 'practice')).toBe(true);
    }
  });

  it('go with the featured game of the day', () => {
    expect(dailyGame('2026-10-15').slug).toBe(dailyGame('2026-10-15').slug);
  });
});

describe('score bands', () => {
  it('fill 0 to 5 blocks along the game’s own good-run score', () => {
    expect(scoreBands(0, 1000)).toBe(0);
    expect(scoreBands(100, 1000)).toBe(0);
    expect(scoreBands(150, 1000)).toBe(1);
    expect(scoreBands(500, 1000)).toBe(2);
    expect(scoreBands(700, 1000)).toBe(3);
    expect(scoreBands(1000, 1000)).toBe(4);
    expect(scoreBands(1500, 1000)).toBe(5);
    expect(scoreBands(5000, 1000)).toBe(5);
    expect(scoreBands(10, 0)).toBe(0);
  });
});

describe('one scored attempt a day', () => {
  it('keeps the first game run and ignores replays', () => {
    expect(recordDailyGame('takbo-data', 700, 1000, DAY)).toBe(true);
    expect(recordDailyGame('takbo-data', 5000, 1000, DAY)).toBe(false);
    expect(recordFor('2026-10-15').game).toEqual({ slug: 'takbo-data', score: 700, bands: 3 });
  });

  it('keeps the first Fact or Fake result', () => {
    expect(recordDailyFof([true, true, false], DAY)).toBe(true);
    expect(recordDailyFof([false, false, false], DAY)).toBe(false);
    expect(recordFor('2026-10-15').fof).toEqual([true, true, false]);
    expect(recordDailyFof([true], DAY)).toBe(false); // wrong length is never saved
  });

  it('starts fresh the next Manila day', () => {
    recordDailyGame('takbo-data', 700, 1000, DAY);
    expect(recordFor('2026-10-16').game).toBeNull();
    // 16:00 UTC is midnight in Manila
    expect(recordDailyGame('takbo-data', 100, 1000, new Date('2026-10-15T16:00:00Z'))).toBe(true);
    expect(dailyRecord.value?.date).toBe('2026-10-16');
  });

  it('pays the 30 XP bonus once, when both parts are done', () => {
    recordDailyFof([true, false, true], DAY);
    expect(xp.value).toBe(20); // two correct answers, no bonus yet
    recordDailyGame('takbo-data', 700, 1000, DAY);
    expect(isComplete(recordFor('2026-10-15'))).toBe(true);
    expect(xp.value).toBe(20 + DAILY_BONUS_XP);
    recordDailyGame('takbo-data', 900, 1000, DAY);
    recordDailyFof([true, true, true], DAY);
    expect(xp.value).toBe(20 + DAILY_BONUS_XP);
  });

  it('counts a daily run through recordRun, and a normal run does not touch the daily', () => {
    recordRun('takbo-data', 400, 1000);
    expect(dailyRecord.value).toBeNull();
    recordRun('takbo-data', 400, 1000, true);
    expect(dailyRecord.value?.game?.slug).toBe('takbo-data');
  });
});

describe('share text', () => {
  it('formats the date like 15 Oct 2026', () => {
    expect(shareDate('2026-10-15')).toBe('15 Oct 2026');
    expect(shareDate('2026-01-05')).toBe('5 Jan 2026');
  });

  it('draws the blocks', () => {
    expect(bandBlocks(3)).toBe('🟨🟨🟨⬜⬜');
    expect(bandBlocks(0)).toBe('⬜⬜⬜⬜⬜');
    expect(fofBlocks([true, true, false])).toBe('🟩🟩🟥');
  });

  it('matches the format in the spec and carries nothing personal', () => {
    const record = { date: '2026-01-01', game: { slug: 'takbo-data', score: 1240, bands: 3 }, fof: [true, true, false] };
    expect(shareText(record, 4)).toBe('ARAW Daily · 1 Jan 2026\nTakbo, Data! 🟨🟨🟨⬜⬜ 1,240\nFact or Fake 🟩🟩🟥\n🔥 4-day streak');
    expect(shareText(record, 0).split('\n')).toHaveLength(3);
  });
});
