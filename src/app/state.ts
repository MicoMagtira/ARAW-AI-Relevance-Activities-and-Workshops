import { persisted } from './store';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface Profile {
  nickname: string;
  /** Index into the avatar set (picker comes later). */
  avatar: number;
}

export const DEFAULT_NICKNAME = 'Kaibigan';

export const profile = persisted<Profile>(
  'profile',
  { nickname: DEFAULT_NICKNAME, avatar: 0 },
  (v): v is Profile => isObject(v) && typeof v.nickname === 'string' && v.nickname.length <= 20 && typeof v.avatar === 'number',
);

export const xp = persisted<number>('xp', 0, (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);

export interface Streak {
  current: number;
  best: number;
  /** Asia/Manila date (YYYY-MM-DD) of the last active day, or null. */
  lastDay: string | null;
}

export const streak = persisted<Streak>(
  'streak',
  { current: 0, best: 0, lastDay: null },
  (v): v is Streak =>
    isObject(v) &&
    typeof v.current === 'number' &&
    typeof v.best === 'number' &&
    (v.lastDay === null || typeof v.lastDay === 'string'),
);

export function addXp(amount: number): void {
  if (amount > 0) xp.value = xp.value + Math.floor(amount);
}
