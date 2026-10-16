// The Hati Tayo! day simulation: the queue, the AI lane, the human worker, the Service meter and the day-end report.
// No input and no drawing here: the game feeds it `tick` and `place`, and reads its state.
import { t } from '../../app/i18n';
import { HUMAN_CAP, HUMAN_MS, QUEUE_CAP, SERVICE, SERVICE_MAX, buildDay, dayParams, judge, type DayParams, type PlannedTask, type Verdict } from './rules';
import { TRAIT_NAME, type Lane, type Setting, type Task, type Trait } from './tasks';

export type Phase = 'intro' | 'play' | 'report' | 'over';

export const INTRO_MS = 1800;
/** How long the AI lane shows its work. */
export const AI_WORK_MS = 500;

export interface Waiting {
  task: Task;
  waitedMs: number;
  patienceMs: number;
}

export interface Job {
  task: Task;
  remainingMs: number;
  totalMs: number;
  /** True when the person is doing a job AI would have done in a blink. */
  slow: boolean;
}

export type FlashKind = Verdict | 'missed' | 'busy' | 'full';

/** The message strip under the task card. */
export interface Flash {
  kind: FlashKind;
  head: string;
  line: string;
}

export interface DayTally {
  tasks: number;
  good: number;
  slow: number;
  fail: number;
  missed: number;
  points: number;
}

export interface Report extends DayTally {
  day: number;
  clearBonus: number;
  /** Service meter after the night's rest. */
  service: number;
  lesson: string;
}

const emptyTally = (): DayTally => ({ tasks: 0, good: 0, slow: 0, fail: 0, missed: 0, points: 0 });

export interface Totals {
  good: number;
  slow: number;
  fail: number;
  missed: number;
  /** AI slip-ups by the reason the task needed a person. */
  failTraits: Partial<Record<Trait, number>>;
}

export interface Sim {
  readonly setting: Setting;
  readonly phase: Phase;
  readonly phaseMs: number;
  readonly day: number;
  readonly params: DayParams;
  readonly score: number;
  readonly service: number;
  readonly queue: readonly Waiting[];
  readonly jobs: readonly Job[];
  /** Ms left of the AI lane's work animation, and the task it is on. */
  readonly aiMs: number;
  readonly aiTask: Task | null;
  readonly flash: Flash | null;
  readonly report: Report | null;
  readonly totals: Totals;
  /** Tasks of today that have not yet been resolved (waiting, in a lane, or still to arrive). */
  readonly left: number;
  readonly dayTotal: number;
  tick(dtMs: number): void;
  /** Send the queued task at `index` to a lane. Returns false when nothing happened (no such task, or the worker is full). */
  place(index: number, lane: Lane): boolean;
  /** Leave the intro early, or start the next day from the report. */
  advance(): void;
}

/** The lesson line under a day's report: the most useful thing that day showed. */
export function dayLesson(tally: DayTally, failTraits: readonly Trait[]): string {
  if (tally.fail > 0) {
    const counts = new Map<Trait, number>();
    for (const t of failTraits) counts.set(t, (counts.get(t) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return t('g.hati.lesson.slipped', { trait: top ? TRAIT_NAME[top[0]] : t('g.hati.lesson.peopleJobs') });
  }
  if (tally.missed > 0) return t('g.hati.lesson.missed');
  if (tally.slow > 0) return t('g.hati.lesson.slow');
  return t('g.hati.lesson.perfect');
}

export function createSim(seed: string, setting: Setting): Sim {
  let phase: Phase = 'intro';
  let phaseMs = 0;
  let day = 1;
  let params = dayParams(1);
  let plan: PlannedTask[] = buildDay(setting, 1, seed);
  let nextIdx = 0;
  let clock = 0;
  let queue: Waiting[] = [];
  let jobs: Job[] = [];
  let aiMs = 0;
  let aiTask: Task | null = null;
  let flash: Flash | null = null;
  let report: Report | null = null;
  let score = 0;
  let service = SERVICE_MAX;
  let today = emptyTally();
  let dayFailTraits: Trait[] = [];
  const totals: Totals = { good: 0, slow: 0, fail: 0, missed: 0, failTraits: {} };

  const startDay = (n: number) => {
    day = n;
    params = dayParams(n);
    plan = buildDay(setting, n, seed);
    nextIdx = 0;
    clock = 0;
    queue = [];
    jobs = [];
    aiMs = 0;
    aiTask = null;
    flash = null;
    report = null;
    today = { ...emptyTally(), tasks: plan.length };
    dayFailTraits = [];
    phase = 'intro';
    phaseMs = 0;
  };

  /** True once the Service meter has emptied. A function, so the type checker does not remember an older phase. */
  const isOver = (): boolean => phase === 'over';

  const changeService = (delta: number) => {
    service = Math.min(SERVICE_MAX, Math.max(0, service + delta));
    if (service <= 0) phase = 'over';
  };

  const missed = (kind: 'full' | 'missed', head: string, line: string, delta: number) => {
    today.missed += 1;
    totals.missed += 1;
    flash = { kind, head, line };
    changeService(delta);
  };

  const endDay = () => {
    const clearBonus = today.missed === 0 ? 20 + 5 * day : 0;
    score += clearBonus;
    today.points += clearBonus;
    service = Math.min(SERVICE_MAX, service + SERVICE.nightRest);
    report = { ...today, day, clearBonus, service, lesson: dayLesson(today, dayFailTraits) };
    phase = 'report';
    phaseMs = 0;
  };

  startDay(1);

  return {
    setting,
    get phase() {
      return phase;
    },
    get phaseMs() {
      return phaseMs;
    },
    get day() {
      return day;
    },
    get params() {
      return params;
    },
    get score() {
      return score;
    },
    get service() {
      return service;
    },
    get queue() {
      return queue;
    },
    get jobs() {
      return jobs;
    },
    get aiMs() {
      return aiMs;
    },
    get aiTask() {
      return aiTask;
    },
    get flash() {
      return flash;
    },
    get report() {
      return report;
    },
    totals,
    get left() {
      return plan.length - nextIdx + queue.length + jobs.length;
    },
    get dayTotal() {
      return plan.length;
    },

    tick(dtMs) {
      phaseMs += dtMs;
      if (phase === 'intro') {
        if (phaseMs >= INTRO_MS) {
          phase = 'play';
          phaseMs = 0;
        }
        return;
      }
      if (phase !== 'play') return;
      clock += dtMs;
      if (aiMs > 0) aiMs = Math.max(0, aiMs - dtMs);

      // the person works on the first job in hand
      const job = jobs[0];
      if (job) {
        job.remainingMs -= dtMs;
        if (job.remainingMs <= 0) jobs = jobs.slice(1);
      }

      // patience runs out
      for (const w of queue) w.waitedMs += dtMs;
      const gone = queue.filter((w) => w.waitedMs >= w.patienceMs);
      if (gone.length > 0) {
        queue = queue.filter((w) => w.waitedMs < w.patienceMs);
        for (const w of gone) {
          if (isOver()) break;
          missed('missed', t('g.hati.flash.tooSlow'), t('g.hati.flash.dropped', { task: w.task.short }), SERVICE.expired);
        }
        if (isOver()) return;
      }

      // new tasks arrive
      while (nextIdx < plan.length && (plan[nextIdx] as PlannedTask).at <= clock) {
        const { task } = plan[nextIdx] as PlannedTask;
        nextIdx += 1;
        if (queue.length >= QUEUE_CAP) {
          missed('full', t('g.hati.flash.queueFull'), t('g.hati.flash.lost', { task: task.short }), SERVICE.overflow);
          if (isOver()) return;
        } else {
          queue = [...queue, { task, waitedMs: 0, patienceMs: params.patienceMs }];
        }
      }

      if (nextIdx >= plan.length && queue.length === 0 && jobs.length === 0) endDay();
    },

    place(index, lane) {
      if (phase !== 'play') return false;
      const w = queue[index];
      if (!w) return false;
      if (lane === 'human' && jobs.length >= HUMAN_CAP) {
        flash = { kind: 'busy', head: t('g.hati.flash.workerFull'), line: t('g.hati.flash.waitPerson') };
        return false;
      }
      const task = w.task;
      const result = judge(task, lane, 1 - w.waitedMs / w.patienceMs);
      queue = queue.filter((_, i) => i !== index);
      score += result.points;
      today.points += result.points;
      today[result.verdict] += 1;
      totals[result.verdict] += 1;
      if (result.verdict === 'fail') {
        dayFailTraits.push(task.trait);
        totals.failTraits[task.trait] = (totals.failTraits[task.trait] ?? 0) + 1;
      }
      if (lane === 'ai') {
        aiMs = AI_WORK_MS;
        aiTask = task;
      } else {
        const slow = result.verdict === 'slow';
        const total = Math.round((slow ? HUMAN_MS.slow : HUMAN_MS.care) * params.workScale);
        jobs = [...jobs, { task, remainingMs: total, totalMs: total, slow }];
      }
      const head = result.verdict === 'good' ? t('g.hati.flash.good', { n: result.points }) : result.verdict === 'slow' ? t('g.hati.flash.slow', { n: result.points }) : t('g.hati.flash.fail');
      flash = { kind: result.verdict, head, line: result.verdict === 'good' ? task.why : task.wrong };
      changeService(result.service);
      if (!isOver() && nextIdx >= plan.length && queue.length === 0 && jobs.length === 0) endDay();
      return true;
    },

    advance() {
      if (phase === 'intro') {
        phase = 'play';
        phaseMs = 0;
      } else if (phase === 'report') {
        startDay(day + 1);
      }
    },
  };
}
