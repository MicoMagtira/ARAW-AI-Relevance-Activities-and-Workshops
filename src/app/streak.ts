// Streak rules (docs/SPEC.md section 9), pure so they are easy to test. Days are Asia/Manila dates (YYYY-MM-DD).
import { daysSinceEpoch } from './daily';
import type { Streak } from './state';

/** The streak badges and the streak length that earns each one. */
export const STREAK_BADGES: ReadonlyArray<readonly [number, string]> = [
  [3, 'streak-3'],
  [7, 'streak-7'],
  [30, 'streak-30'],
];

export const EMPTY_STREAK: Streak = { current: 0, best: 0, lastDay: null, freezeWeek: null };

/** A YYYY-MM-DD date moved by `n` days (calendar arithmetic in UTC, so no time zone or DST surprises). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}

/** The Monday of the week (Monday to Sunday) a date falls in. */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export const daysBetween = (from: string, to: string): number => daysSinceEpoch(to) - daysSinceEpoch(from);

/** The one-day gap `lastDay` to `today` can be bridged: the missed day's week has no freeze used yet. */
export function freezeAvailable(s: Streak, today: string): boolean {
  if (s.lastDay === null || daysBetween(s.lastDay, today) !== 2) return false;
  return s.freezeWeek !== weekStart(addDays(s.lastDay, 1));
}

export type StreakEvent =
  /** First active day ever. */
  | 'first'
  /** Already counted today. */
  | 'same'
  /** Yesterday was active too: the streak grows. */
  | 'next'
  /** One day was missed and this week's freeze covered it. */
  | 'freeze'
  /** More than one missed day (or the freeze was used): a new start at 1. */
  | 'restart';

export interface StreakStep {
  streak: Streak;
  event: StreakEvent;
  /** Streak badge ids the new streak length reaches (the caller adds the ones not yet earned). */
  badges: string[];
}

export const badgesForStreak = (current: number): string[] => STREAK_BADGES.filter(([n]) => current >= n).map(([, id]) => id);

/** Count `today` as an active day. A clock that moved backwards changes nothing. */
export function advanceStreak(s: Streak, today: string): StreakStep {
  const keep = (event: StreakEvent): StreakStep => ({ streak: s, event, badges: badgesForStreak(s.current) });
  if (s.lastDay === null) return finish({ ...s, current: 1, lastDay: today }, 'first');
  const gap = daysBetween(s.lastDay, today);
  if (gap <= 0) return keep('same');
  if (gap === 1) return finish({ ...s, current: s.current + 1, lastDay: today }, 'next');
  if (freezeAvailable(s, today)) {
    return finish({ ...s, current: s.current + 1, lastDay: today, freezeWeek: weekStart(addDays(s.lastDay, 1)) }, 'freeze');
  }
  return finish({ ...s, current: 1, lastDay: today }, 'restart');
}

function finish(next: Streak, event: StreakEvent): StreakStep {
  const streak = { ...next, best: Math.max(next.best, next.current) };
  return { streak, event, badges: badgesForStreak(streak.current) };
}

/**
 * The streak to show today: it still stands when yesterday was active, or when exactly one day was missed and a freeze can
 * cover it. Otherwise it has lapsed and shows 0 until the next active day starts a new one.
 */
export function activeStreak(s: Streak, today: string): number {
  if (s.lastDay === null) return 0;
  const gap = daysBetween(s.lastDay, today);
  if (gap <= 1) return s.current;
  return freezeAvailable(s, today) ? s.current : 0;
}

export interface WeekDay {
  date: string;
  /** Monday is 0. */
  index: number;
  /** The day counts toward the running streak. */
  on: boolean;
  today: boolean;
}

/** The Monday to Sunday week of `today`, with the days of the running streak marked (a bridged freeze day counts as kept). */
export function weekDays(s: Streak, today: string): WeekDay[] {
  const run = activeStreak(s, today);
  const first = s.lastDay === null || run === 0 ? null : addDays(s.lastDay, -(run - 1));
  const start = weekStart(today);
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    return { date, index, on: first !== null && s.lastDay !== null && date >= first && date <= s.lastDay, today: date === today };
  });
}
