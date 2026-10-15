import { afterEach, describe, expect, it } from 'vitest';
import { badgesEarned, recordActivity, streakNotice } from '../../src/app/progress';
import { streak } from '../../src/app/state';
import { resetAll } from '../../src/app/store';
import { EMPTY_STREAK, activeStreak, addDays, advanceStreak, badgesForStreak, freezeAvailable, weekStart } from '../../src/app/streak';

afterEach(() => {
  resetAll();
  streakNotice.value = null;
});

// 2026-10-12 is a Monday, 2026-10-18 the Sunday after it.
describe('weeks and dates', () => {
  it('finds the Monday of a week (Monday to Sunday)', () => {
    expect(weekStart('2026-10-12')).toBe('2026-10-12');
    expect(weekStart('2026-10-15')).toBe('2026-10-12');
    expect(weekStart('2026-10-18')).toBe('2026-10-12');
    expect(weekStart('2026-10-19')).toBe('2026-10-19');
    expect(weekStart('2026-01-01')).toBe('2025-12-29');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('streak rules', () => {
  const on = (current: number, lastDay: string, freezeWeek: string | null = null) => ({ current, best: current, lastDay, freezeWeek });

  it('starts at 1 on the first active day', () => {
    const step = advanceStreak(EMPTY_STREAK, '2026-10-15');
    expect(step.event).toBe('first');
    expect(step.streak).toMatchObject({ current: 1, best: 1, lastDay: '2026-10-15' });
  });

  it('counts a day once', () => {
    const s = on(4, '2026-10-15');
    const step = advanceStreak(s, '2026-10-15');
    expect(step.event).toBe('same');
    expect(step.streak).toBe(s);
  });

  it('grows on consecutive days and keeps the best', () => {
    const step = advanceStreak({ current: 4, best: 9, lastDay: '2026-10-15', freezeWeek: null }, '2026-10-16');
    expect(step.event).toBe('next');
    expect(step.streak).toMatchObject({ current: 5, best: 9 });
    expect(advanceStreak({ current: 9, best: 9, lastDay: '2026-10-15', freezeWeek: null }, '2026-10-16').streak.best).toBe(10);
  });

  it('uses the weekly freeze when exactly one day was missed', () => {
    // Tue active, Wed missed, Thu back: Wednesday's week has its freeze
    const step = advanceStreak(on(4, '2026-10-13'), '2026-10-15');
    expect(step.event).toBe('freeze');
    expect(step.streak).toMatchObject({ current: 5, lastDay: '2026-10-15', freezeWeek: '2026-10-12' });
  });

  it('restarts at 1 when the freeze of that week is already used', () => {
    const step = advanceStreak(on(6, '2026-10-16', '2026-10-12'), '2026-10-18');
    expect(step.event).toBe('restart');
    expect(step.streak).toMatchObject({ current: 1, best: 6 });
  });

  it('gives a fresh freeze in the next week', () => {
    // freeze used in the week of Oct 12; Sunday Oct 18 missed would be that week, but Oct 19 (Mon) missed is a new week
    expect(freezeAvailable(on(6, '2026-10-18', '2026-10-12'), '2026-10-20')).toBe(true);
    expect(advanceStreak(on(6, '2026-10-18', '2026-10-12'), '2026-10-20').event).toBe('freeze');
  });

  it('restarts after two or more missed days', () => {
    const step = advanceStreak(on(12, '2026-10-10'), '2026-10-13');
    expect(step.event).toBe('restart');
    expect(step.streak.current).toBe(1);
    expect(step.streak.best).toBe(12);
  });

  it('ignores a clock that moved backwards', () => {
    expect(advanceStreak(on(3, '2026-10-15'), '2026-10-14').event).toBe('same');
  });

  it('shows 0 once the streak has lapsed, and keeps it while a freeze can still cover the gap', () => {
    expect(activeStreak(EMPTY_STREAK, '2026-10-15')).toBe(0);
    expect(activeStreak(on(5, '2026-10-15'), '2026-10-16')).toBe(5);
    expect(activeStreak(on(5, '2026-10-15'), '2026-10-17')).toBe(5);
    expect(activeStreak(on(5, '2026-10-15', '2026-10-12'), '2026-10-17')).toBe(0);
    expect(activeStreak(on(5, '2026-10-15'), '2026-10-18')).toBe(0);
  });

  it('maps streak lengths to badges', () => {
    expect(badgesForStreak(2)).toEqual([]);
    expect(badgesForStreak(3)).toEqual(['streak-3']);
    expect(badgesForStreak(7)).toEqual(['streak-3', 'streak-7']);
    expect(badgesForStreak(30)).toEqual(['streak-3', 'streak-7', 'streak-30']);
  });
});

describe('recording activity', () => {
  it('counts the day once and awards the 3-day badge with a notice', () => {
    streak.value = { current: 2, best: 2, lastDay: '2026-10-14', freezeWeek: null };
    expect(recordActivity(new Date('2026-10-15T04:00:00Z'))).toBe('next');
    expect(streak.value).toMatchObject({ current: 3, lastDay: '2026-10-15' });
    expect(badgesEarned.value).toContain('streak-3');
    expect(streakNotice.value).toMatchObject({ badges: ['streak-3'], current: 3 });
    expect(recordActivity(new Date('2026-10-15T10:00:00Z'))).toBe('same');
    expect(streak.value.current).toBe(3);
  });

  it('uses the Manila date, not the UTC date', () => {
    // 16:30 UTC on Oct 14 is already Oct 15 in Manila
    recordActivity(new Date('2026-10-14T16:30:00Z'));
    expect(streak.value.lastDay).toBe('2026-10-15');
  });

  it('tells the player when the freeze was used and when a new start begins', () => {
    streak.value = { current: 4, best: 4, lastDay: '2026-10-13', freezeWeek: null };
    recordActivity(new Date('2026-10-15T04:00:00Z'));
    expect(streakNotice.value).toMatchObject({ event: 'freeze', current: 5 });
    streakNotice.value = null;
    recordActivity(new Date('2026-10-25T04:00:00Z'));
    expect(streakNotice.value).toMatchObject({ event: 'restart', current: 1 });
  });
});
