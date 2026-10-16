import { AVATAR_COUNT } from '../ui/avatars';
import { persisted } from './store';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface Profile {
  nickname: string;
  /** Index into the avatar set (src/ui/avatars.ts). */
  avatar: number;
}

export const DEFAULT_NICKNAME = 'Friend';

export const profile = persisted<Profile>(
  'profile',
  { nickname: DEFAULT_NICKNAME, avatar: 0 },
  (v): v is Profile =>
    isObject(v) &&
    typeof v.nickname === 'string' &&
    v.nickname.length <= 20 &&
    typeof v.avatar === 'number' &&
    Number.isInteger(v.avatar) &&
    v.avatar >= 0 &&
    v.avatar < AVATAR_COUNT,
);

export const NICKNAME_MAX = 20;

/** What to show for the player: the nickname, or the default when it is empty. */
export const displayName = (p: Profile = profile.value): string => p.nickname.trim() || DEFAULT_NICKNAME;

export function setNickname(nickname: string): void {
  profile.value = { ...profile.value, nickname: nickname.slice(0, NICKNAME_MAX) };
}

export function setAvatar(avatar: number): void {
  if (Number.isInteger(avatar) && avatar >= 0 && avatar < AVATAR_COUNT) profile.value = { ...profile.value, avatar };
}

export const xp = persisted<number>('xp', 0, (v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);

export interface Streak {
  current: number;
  best: number;
  /** Asia/Manila date (YYYY-MM-DD) of the last active day, or null. */
  lastDay: string | null;
  /** Monday (YYYY-MM-DD) of the week whose one streak freeze has been used. */
  freezeWeek?: string | null;
}

export const streak = persisted<Streak>(
  'streak',
  { current: 0, best: 0, lastDay: null, freezeWeek: null },
  (v): v is Streak =>
    isObject(v) &&
    typeof v.current === 'number' &&
    typeof v.best === 'number' &&
    (v.lastDay === null || typeof v.lastDay === 'string') &&
    (v.freezeWeek === undefined || v.freezeWeek === null || typeof v.freezeWeek === 'string'),
);

export function addXp(amount: number): void {
  if (amount > 0) xp.value = xp.value + Math.floor(amount);
}
