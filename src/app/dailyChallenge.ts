// The Daily Challenge (docs/SPEC.md section 7): today's result is saved once (one scored attempt a day), pays +30 XP when both
// parts are done, and turns into Wordle-style share text. Which game and which items are today's lives in daily.ts and rounds.ts.
import { ARCADE_GAMES } from '../content/games';
import { dailyGame, manilaDate } from './daily';
import { claimXp, recordActivity } from './progress';
import { addXp } from './state';
import { persisted } from './store';

export const DAILY_BONUS_XP = 30;
/** Same 10 XP per correct answer as every Fact or Fake round (docs/SPEC.md section 6). */
export const FOF_XP_PER_CORRECT = 10;
export const DAILY_ITEM_COUNT = 3;
export const BAND_COUNT = 5;

export interface DailyGameResult {
  slug: string;
  score: number;
  /** How many of the 5 blocks are filled (0 to 5). */
  bands: number;
}

export interface DailyRecord {
  /** Asia/Manila date (YYYY-MM-DD) these results are for. */
  date: string;
  game: DailyGameResult | null;
  /** One entry per Fact or Fake item: true when answered correctly. */
  fof: boolean[] | null;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isRecord(v: unknown): v is DailyRecord | null {
  if (v === null) return true;
  if (!isObject(v) || typeof v.date !== 'string') return false;
  const game = v.game;
  const gameOk =
    game === null ||
    (isObject(game) && typeof game.slug === 'string' && typeof game.score === 'number' && typeof game.bands === 'number' && game.bands >= 0 && game.bands <= BAND_COUNT);
  const fofOk = v.fof === null || (Array.isArray(v.fof) && v.fof.length === DAILY_ITEM_COUNT && v.fof.every((x) => typeof x === 'boolean'));
  return gameOk && fofOk;
}

/** Only the latest day is kept; an older record is simply "nothing done today". */
export const dailyRecord = persisted<DailyRecord | null>('daily', null, isRecord);

/** Today's results (an empty record when nothing is saved for this date). */
export function recordFor(date: string = manilaDate(), saved: DailyRecord | null = dailyRecord.value): DailyRecord {
  return saved && saved.date === date ? saved : { date, game: null, fof: null };
}

export const isComplete = (r: DailyRecord): boolean => r.game !== null && r.fof !== null;

/**
 * Filled blocks (0 to 5) for a score. The bands scale with the game's own "good run" score: 15%, 35%, 60%, 100% and 150% of it,
 * so a good run fills four blocks and a great one all five.
 */
export function scoreBands(score: number, goodRun: number): number {
  if (!(goodRun > 0) || !(score > 0)) return 0;
  return [0.15, 0.35, 0.6, 1, 1.5].filter((f) => score >= goodRun * f).length;
}

/** Pay the +30 once, the moment both parts are done. Returns the XP given. */
function payIfComplete(r: DailyRecord): number {
  return isComplete(r) ? claimXp(`daily:${r.date}`, DAILY_BONUS_XP) : 0;
}

/**
 * Save today's featured-game run. Only the first daily run of the day counts: replays are for fun and change nothing.
 * Returns true when this run became today's result.
 */
export function recordDailyGame(slug: string, score: number, goodRun: number, now: Date = new Date()): boolean {
  const date = manilaDate(now);
  const today = recordFor(date);
  if (today.game) return false;
  const next: DailyRecord = { ...today, game: { slug, score, bands: scoreBands(score, goodRun) } };
  dailyRecord.value = next;
  recordActivity(now);
  payIfComplete(next);
  return true;
}

/** Save today's Fact or Fake answers (true = correct). Counted once; returns true when saved. */
export function recordDailyFof(correct: readonly boolean[], now: Date = new Date()): boolean {
  const date = manilaDate(now);
  const today = recordFor(date);
  if (today.fof || correct.length !== DAILY_ITEM_COUNT) return false;
  const next: DailyRecord = { ...today, fof: [...correct] };
  dailyRecord.value = next;
  addXp(correct.filter(Boolean).length * FOF_XP_PER_CORRECT);
  recordActivity(now);
  payIfComplete(next);
  return true;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-15" as "15 Oct 2026". */
export function shareDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1] ?? ''} ${y}`;
}

export const bandBlocks = (bands: number): string => '🟨'.repeat(bands) + '⬜'.repeat(BAND_COUNT - bands);
export const fofBlocks = (correct: readonly boolean[]): string => correct.map((c) => (c ? '🟩' : '🟥')).join('');

/**
 * The shareable result, e.g.
 *   ARAW Daily · 15 Oct 2026
 *   Takbo Data! 🟨🟨🟨⬜⬜ 1,240
 *   Fact or Fake 🟩🟩🟥
 *   🔥 4-day streak
 * Holds nothing personal: no name, only the day, the scores and the streak length.
 */
export function shareText(record: DailyRecord, streakDays: number): string {
  const name = ARCADE_GAMES.find((g) => g.slug === record.game?.slug)?.name ?? dailyGame(record.date).name;
  const lines = [`ARAW Daily · ${shareDate(record.date)}`];
  if (record.game) lines.push(`${name} ${bandBlocks(record.game.bands)} ${record.game.score.toLocaleString('en-US')}`);
  if (record.fof) lines.push(`Fact or Fake ${fofBlocks(record.fof)}`);
  if (streakDays > 0) lines.push(`🔥 ${streakDays}-day streak`);
  return lines.join('\n');
}
