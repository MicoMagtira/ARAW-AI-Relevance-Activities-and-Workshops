import { describe, expect, it } from 'vitest';
import { daysSinceEpoch, dailyGame, greetingKey, manilaDate, manilaDayLabel, mythOfTheDay } from '../../src/app/daily';
import { arcadeReady, nextModule, nodeState } from '../../src/app/progress';
import { ARCADE_GAMES } from '../../src/content/games';
import { MODULES } from '../../src/content/modules';
import { BADGES, BADGE_TOTAL } from '../../src/content/badges';
import { MYTH_SEEDS } from '../../src/content/myths';

describe('Manila dates', () => {
  it('rolls over at midnight in Manila (UTC+8), not UTC', () => {
    expect(manilaDate(new Date('2026-10-15T15:59:00Z'))).toBe('2026-10-15');
    expect(manilaDate(new Date('2026-10-15T16:00:00Z'))).toBe('2026-10-16');
    expect(manilaDayLabel(new Date('2026-10-15T04:00:00Z'))).toBe('OCT 15');
  });

  it('counts days from 2026-01-01', () => {
    expect(daysSinceEpoch('2026-01-01')).toBe(0);
    expect(daysSinceEpoch('2026-01-12')).toBe(11);
    expect(daysSinceEpoch('2025-12-31')).toBe(-1);
  });
});

describe('daily rotations', () => {
  it('features the games in the fixed order, wrapping after 11', () => {
    expect(ARCADE_GAMES).toHaveLength(11);
    expect(dailyGame('2026-01-01').slug).toBe('takbo-data');
    expect(dailyGame('2026-01-02').slug).toBe('feed-mo-to');
    expect(dailyGame('2026-01-11').slug).toBe('objection');
    expect(dailyGame('2026-01-12').slug).toBe('takbo-data');
    expect(dailyGame('2025-12-31').slug).toBe('objection');
  });

  it('is the same for everyone on the same day and picks a myth from the bank', () => {
    expect(mythOfTheDay('2026-10-15')).toBe(mythOfTheDay('2026-10-15'));
    expect(MYTH_SEEDS).toContain(mythOfTheDay('2026-10-15'));
    expect(mythOfTheDay('2026-10-15').id).not.toBe(mythOfTheDay('2026-10-16').id);
  });

  it('greets by time of day', () => {
    expect(greetingKey(5)).toBe('home.greeting.morning');
    expect(greetingKey(11)).toBe('home.greeting.morning');
    expect(greetingKey(12)).toBe('home.greeting.noon');
    expect(greetingKey(15)).toBe('home.greeting.afternoon');
    expect(greetingKey(18)).toBe('home.greeting.evening');
    expect(greetingKey(2)).toBe('home.greeting.evening');
  });
});

describe('module path', () => {
  it('points Continue at the first unfinished module', () => {
    expect(nextModule([])?.id).toBe('m01');
    expect(nextModule(['m01', 'm02'])?.id).toBe('m03');
    expect(nextModule(MODULES.map((m) => m.id))).toBeNull();
  });

  it('marks nodes done, current or locked', () => {
    const done = ['m01', 'm02'];
    expect(MODULES.map((m) => nodeState(m, done)).join(' ')).toBe('done done current locked locked locked locked locked locked locked');
  });

  it('opens module games in the arcade as their module is finished', () => {
    expect(arcadeReady([])).toBe(6);
    expect(arcadeReady(['m06', 'm10'])).toBe(8);
    expect(arcadeReady(MODULES.map((m) => m.id))).toBe(11);
  });
});

describe('content banks', () => {
  it('has 20 unique badges and every entry is unreviewed', () => {
    expect(BADGE_TOTAL).toBe(20);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(20);
    expect(BADGES.every((b) => b.name && b.howTo && b.review_status === 'unreviewed')).toBe(true);
  });

  it('keeps myths short and unreviewed', () => {
    expect(MYTH_SEEDS.every((m) => m.review_status === 'unreviewed' && m.myth.length < 70 && m.fact.length < 120)).toBe(true);
  });
});
