// Pure helpers for dates (Asia/Manila), greetings and the daily rotations on Home.
import { ARCADE_GAMES, type GameInfo } from '../content/games';
import { MYTH_SEEDS, type MythSeed } from '../content/myths';
import type { StringKey } from './i18n';

export const MANILA_TZ = 'Asia/Manila';
const DAILY_EPOCH = Date.UTC(2026, 0, 1);

function manilaParts(now: Date, options: Intl.DateTimeFormatOptions): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: MANILA_TZ, ...options }).formatToParts(now);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** Today's date in Asia/Manila as YYYY-MM-DD. */
export function manilaDate(now: Date = new Date()): string {
  const p = manilaParts(now, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

/** Short label such as "OCT 15" for the Manila day. */
export function manilaDayLabel(now: Date = new Date()): string {
  const p = manilaParts(now, { month: 'short', day: 'numeric' });
  return `${p.month} ${p.day}`.toUpperCase();
}

/** Long label such as "16 October 2026" for the Manila day (used on the certificate). */
export function manilaLongDate(now: Date = new Date()): string {
  const p = manilaParts(now, { day: 'numeric', month: 'long', year: 'numeric' });
  return `${p.day} ${p.month} ${p.year}`;
}

/** Whole days from 2026-01-01 to a YYYY-MM-DD date (negative before the epoch). */
export function daysSinceEpoch(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round((Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1) - DAILY_EPOCH) / 86_400_000);
}

const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** The Daily Challenge's featured game: (days since 2026-01-01) mod 11. */
export function dailyGame(date: string): GameInfo {
  return ARCADE_GAMES[mod(daysSinceEpoch(date), ARCADE_GAMES.length)] as GameInfo;
}

/** Myth of the day: rotates through the starter myths by Manila day. */
export function mythOfTheDay(date: string): MythSeed {
  return MYTH_SEEDS[mod(daysSinceEpoch(date), MYTH_SEEDS.length)] as MythSeed;
}

/** Greeting string key for an hour (0 to 23) on the player's own clock. */
export function greetingKey(hour: number): StringKey {
  if (hour >= 5 && hour < 12) return 'home.greeting.morning';
  if (hour >= 12 && hour < 13) return 'home.greeting.noon';
  if (hour >= 13 && hour < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}
