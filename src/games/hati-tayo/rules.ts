// Hati Tayo! rules with no drawing in them, so they are all unit-tested: how a placement is judged, how a day is built
// (seeded, never repeating), how hard day n is, and the stars for the module version.
import { createRng, shuffle } from '../engine/rng';
import { tasksFor, type Lane, type Setting, type Task } from './tasks';

/** good: right lane. slow: a person did a job AI does in a blink (done, but it ate worker time). fail: AI on a people job. */
export type Verdict = 'good' | 'slow' | 'fail';

export interface Judgement {
  verdict: Verdict;
  points: number;
  /** Change to the Service meter. */
  service: number;
}

export const SERVICE_MAX = 100;
export const POINTS = { ai: 10, human: 16, slow: 3, speedMax: 5 } as const;
export const SERVICE = { good: 2, fail: -14, expired: -10, overflow: -8, nightRest: 12 } as const;

/** How a task placed in `lane` turns out. `patienceLeft` (0 to 1) is how much of its patience the task had left. */
export function judge(task: Task, lane: Lane, patienceLeft = 0): Judgement {
  const speed = Math.round(POINTS.speedMax * Math.min(1, Math.max(0, patienceLeft)));
  if (task.needs === lane) return { verdict: 'good', points: (lane === 'ai' ? POINTS.ai : POINTS.human) + speed, service: SERVICE.good };
  if (lane === 'human') return { verdict: 'slow', points: POINTS.slow, service: 0 };
  return { verdict: 'fail', points: 0, service: SERVICE.fail };
}

/** The meter for a verdict, for the module game's one-task-at-a-time play (no time pressure, no speed bonus). */
export const splitScore = (verdicts: readonly Verdict[]): number => verdicts.reduce((sum, v) => sum + (v === 'good' ? 1 : v === 'slow' ? 0.5 : 0), 0);

/** Stars for the module game: 3 at 80% or more, 2 at 50% or more, else 1 (docs/SPEC.md section 3). */
export function starsFor(verdicts: readonly Verdict[]): 1 | 2 | 3 {
  if (verdicts.length === 0) return 1;
  const share = splitScore(verdicts) / verdicts.length;
  return share >= 0.8 ? 3 : share >= 0.5 ? 2 : 1;
}

export interface DayParams {
  /** Tasks that arrive during the day. */
  tasks: number;
  /** Time between arrivals (ms). */
  gapMs: number;
  /** How long a task waits before it is dropped (ms). */
  patienceMs: number;
  /** Multiplier on how long the human worker takes (1 is normal). */
  workScale: number;
}

export const QUEUE_CAP = 5;
/** Tasks a person can hold at once: the one in hand plus two waiting. */
export const HUMAN_CAP = 3;
export const HUMAN_MS = { care: 3800, slow: 4800 } as const;

/** Day 1 is gentle; every day after brings more tasks, faster arrivals and shorter patience. Day 1 is `day = 1`. */
export function dayParams(day: number): DayParams {
  const d = Math.max(1, Math.floor(day));
  return {
    tasks: Math.min(8 + d, 14),
    gapMs: Math.max(2600, 5600 - 330 * (d - 1)),
    patienceMs: Math.max(12000, 24000 - 900 * (d - 1)),
    workScale: Math.max(0.7, 1 - 0.04 * (d - 1)),
  };
}

/** Share of people-jobs per day: the mix changes from day to day. */
const HUMAN_SHARE = [0.4, 0.5, 0.6, 0.45, 0.55] as const;

export interface PlannedTask {
  task: Task;
  /** When it arrives, in ms from the start of the day. */
  at: number;
}

/**
 * The tasks of one day. The same seed and day always give the same plan, and a new day gives a new mix.
 * Day 1 starts with a task for AI and then a task for a person, so the two lanes teach themselves.
 */
export function buildDay(setting: Setting, day: number, seed: string): PlannedTask[] {
  const rng = createRng(`${seed}:hati-day:${day}`);
  const p = dayParams(day);
  const ai = shuffle(tasksFor(setting, 'ai'), rng);
  const people = shuffle(tasksFor(setting, 'human'), rng);
  const share = HUMAN_SHARE[(day - 1) % HUMAN_SHARE.length] as number;
  const humanN = Math.min(people.length, Math.max(p.tasks - ai.length, Math.min(p.tasks - 2, Math.max(2, Math.round(p.tasks * share)))));
  const picked = shuffle([...ai.slice(0, p.tasks - humanN), ...people.slice(0, humanN)], rng);
  if (day === 1) {
    const a = picked.findIndex((t) => t.needs === 'ai');
    [picked[0], picked[a]] = [picked[a] as Task, picked[0] as Task];
    const h = picked.findIndex((t) => t.needs === 'human');
    [picked[1], picked[h]] = [picked[h] as Task, picked[1] as Task];
  }
  return picked.map((task, i) => ({ task, at: 600 + i * p.gapMs }));
}

/** The setting a run plays in, from the run's seeded random numbers. */
export const pickSetting = (rng: () => number): Setting => (rng() < 0.5 ? 'bhw' : 'store');

/** The eight tasks of the module version (Kuya Jun's first day): stock and comfort first, then a seeded mix of 3 and 3. */
export function buildModulePlay(seed: string): Task[] {
  const rng = createRng(`${seed}:hati-module`);
  const ai = shuffle(tasksFor('bhw', 'ai').filter((t) => t.id !== 'bhw-stock'), rng).slice(0, 3);
  const people = shuffle(tasksFor('bhw', 'human').filter((t) => t.id !== 'bhw-comfort'), rng).slice(0, 3);
  const stock = tasksFor('bhw', 'ai').find((t) => t.id === 'bhw-stock') as Task;
  const comfort = tasksFor('bhw', 'human').find((t) => t.id === 'bhw-comfort') as Task;
  return [stock, comfort, ...shuffle([...ai, ...people], rng)];
}
