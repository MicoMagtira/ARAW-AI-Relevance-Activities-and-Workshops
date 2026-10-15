import { describe, expect, it } from 'vitest';
import type { Action, InputFrame } from '../../src/games/engine/input';
import { STEP_MS } from '../../src/games/engine/loop';
import { createRng } from '../../src/games/engine/rng';
import type { GameInstance } from '../../src/games/engine/types';
import { CARD_CHARS, CARD_LINES, H, LANE_RECT, STRIP_CHARS, STRIP_LINES, W, laneAt, tileAt, tileRect } from '../../src/games/hati-tayo/art';
import hati, { buildRecap } from '../../src/games/hati-tayo/hati';
import {
  HUMAN_CAP,
  POINTS,
  QUEUE_CAP,
  SERVICE,
  buildDay,
  buildModulePlay,
  dayParams,
  judge,
  pickSetting,
  splitScore,
  starsFor,
} from '../../src/games/hati-tayo/rules';
import { INTRO_MS, createSim, dayLesson, type Sim } from '../../src/games/hati-tayo/sim';
import { SETTINGS, TASKS, TRAIT_NAME, taskById, tasksFor, type Lane, type Setting, type Task } from '../../src/games/hati-tayo/tasks';
import { wrapText } from '../../src/games/luto-ni-ara/art';
import { GAME_LOADERS } from '../../src/games/registry';
import { ARCADE_GAMES } from '../../src/content/games';

const NONE: InputFrame = { actions: [], held: new Set(), taps: [], pointer: null };
const press = (...actions: Action[]): InputFrame => ({ ...NONE, actions });
const tapAt = (x: number, y: number): InputFrame => ({ ...NONE, taps: [{ x, y }] });
const make = (seed: string): GameInstance => hati.create({ seed, rng: createRng(seed) });

function run(game: GameInstance, ms: number, input: InputFrame = NONE) {
  for (let t = 0; t < ms; t += STEP_MS) game.step(STEP_MS, t === 0 ? input : NONE);
}
const runSim = (sim: Sim, ms: number) => {
  for (let t = 0; t < ms; t += 100) sim.tick(100);
};
const hud = (game: GameInstance, id: string) => game.stats().hud.find((h) => h.id === id);

function fakeContext(): CanvasRenderingContext2D {
  const noop = () => undefined;
  return new Proxy({}, { get: (_t, prop) => (prop === 'measureText' ? () => ({ width: 8 }) : noop), set: () => true }) as unknown as CanvasRenderingContext2D;
}

/** Start a sim and move it to the first moment a task is waiting. */
function started(seed = 'seed', setting: Setting = 'bhw'): Sim {
  const sim = createSim(seed, setting);
  sim.tick(INTRO_MS);
  sim.tick(700);
  return sim;
}

/** Play a sim with a policy until `done`, ticking 100 ms at a time. Returns how many ticks it took. */
function play(sim: Sim, lane: (t: Task) => Lane, done: (s: Sim) => boolean, limit = 6000): number {
  for (let i = 0; i < limit; i++) {
    if (done(sim)) return i;
    if (sim.phase === 'intro' || (sim.phase === 'report' && sim.phaseMs >= 700)) sim.advance();
    const first = sim.queue[0];
    if (sim.phase === 'play' && first) sim.place(0, lane(first.task));
    sim.tick(100);
  }
  return limit;
}
const right = (t: Task): Lane => t.needs;

describe('task bank', () => {
  it('has nine AI tasks and nine people tasks in each workplace, with unique ids', () => {
    expect(new Set(TASKS.map((t) => t.id)).size).toBe(TASKS.length);
    for (const setting of ['bhw', 'store'] as const) {
      expect(tasksFor(setting, 'ai')).toHaveLength(9);
      expect(tasksFor(setting, 'human')).toHaveLength(9);
    }
    expect(taskById('bhw-comfort')?.wrong).toBe("The AI told the worried mother 'Error 404: comfort not found'.");
    expect(taskById('nope')).toBeUndefined();
  });

  it('fits the canvas: short labels, three-line tasks and two-line messages', () => {
    for (const t of TASKS) {
      expect(t.short.length, t.id).toBeLessThanOrEqual(7);
      expect(t.short, t.id).toBe(t.short.toUpperCase());
      expect(wrapText(t.text, CARD_CHARS).length, `${t.id} text`).toBeLessThanOrEqual(CARD_LINES);
      expect(wrapText(t.why, STRIP_CHARS).length, `${t.id} why`).toBeLessThanOrEqual(STRIP_LINES);
      expect(wrapText(t.wrong, STRIP_CHARS).length, `${t.id} wrong`).toBeLessThanOrEqual(STRIP_LINES);
      expect(Math.max(...t.text.split(' ').map((w) => w.length))).toBeLessThanOrEqual(CARD_CHARS);
    }
  });

  it('matches the lesson: repeat jobs are AI tasks, care and judgement need a person', () => {
    for (const t of TASKS) expect(t.needs === 'ai', t.id).toBe(t.trait === 'repeat');
    const people = TASKS.filter((t) => t.needs === 'human').map((t) => t.trait);
    expect(new Set(people)).toEqual(new Set(['empathy', 'judgement', 'context', 'accountability']));
  });

  it('never gives dosing or a diagnosis, and keeps names fictional', () => {
    const all = TASKS.map((t) => `${t.text} ${t.why} ${t.wrong}`).join(' ');
    expect(all).not.toMatch(/\b\d+\s?(mg|ml)\b|\bdose\b|\btablets?\b|diagnos/i);
    expect(taskById('store-medicine')?.why).toMatch(/health worker/);
    expect(taskById('bhw-refer')?.why).toMatch(/trained worker/);
  });

  it('names both workplaces and every trait', () => {
    expect(SETTINGS.bhw.boss).toBe('Kuya Jun');
    expect(SETTINGS.store.boss).toBe('Aling Nena');
    expect(SETTINGS.bhw.header.length).toBeLessThanOrEqual(20);
    expect(SETTINGS.store.header.length).toBeLessThanOrEqual(20);
    expect(Object.keys(TRAIT_NAME)).toHaveLength(5);
  });
});

describe('rules', () => {
  const stock = taskById('bhw-stock') as Task;
  const comfort = taskById('bhw-comfort') as Task;

  it('judges a placement: right lane, slow hand-work, or an AI slip-up', () => {
    expect(judge(stock, 'ai', 1)).toEqual({ verdict: 'good', points: POINTS.ai + POINTS.speedMax, service: SERVICE.good });
    expect(judge(comfort, 'human', 0)).toEqual({ verdict: 'good', points: POINTS.human, service: SERVICE.good });
    expect(judge(stock, 'human', 1)).toEqual({ verdict: 'slow', points: POINTS.slow, service: 0 });
    expect(judge(comfort, 'ai', 1)).toEqual({ verdict: 'fail', points: 0, service: SERVICE.fail });
    expect(judge(stock, 'ai', 5).points).toBe(POINTS.ai + POINTS.speedMax);
    expect(judge(stock, 'ai', -1).points).toBe(POINTS.ai);
    expect(POINTS.human).toBeGreaterThan(POINTS.ai);
  });

  it('scores the module version in stars: 3 at 80%, 2 at 50%, else 1', () => {
    expect(splitScore(['good', 'slow', 'fail'])).toBe(1.5);
    expect(starsFor([])).toBe(1);
    expect(starsFor(Array(8).fill('good'))).toBe(3);
    expect(starsFor(['good', 'good', 'good', 'good', 'good', 'good', 'slow', 'fail'])).toBe(3);
    expect(starsFor(['good', 'good', 'good', 'good', 'fail', 'fail', 'fail', 'fail'])).toBe(2);
    expect(starsFor(['good', 'good', 'good', 'fail', 'fail', 'fail', 'fail', 'fail'])).toBe(1);
  });

  it('makes every day harder: more tasks, faster arrivals, less patience, a quicker worker', () => {
    const [d1, d2, d5, d30] = [1, 2, 5, 30].map(dayParams) as [ReturnType<typeof dayParams>, ReturnType<typeof dayParams>, ReturnType<typeof dayParams>, ReturnType<typeof dayParams>];
    expect(d1.tasks).toBe(9);
    expect(d2.tasks).toBeGreaterThan(d1.tasks);
    expect(d5.gapMs).toBeLessThan(d2.gapMs);
    expect(d5.patienceMs).toBeLessThan(d2.patienceMs);
    expect(d5.workScale).toBeLessThan(d2.workScale);
    // and it levels off, so the game stays playable
    expect(d30).toEqual({ tasks: 14, gapMs: 2600, patienceMs: 12000, workScale: 0.7 });
    expect(dayParams(0)).toEqual(d1);
  });

  it('builds the same day from the same seed, and a new mix for a new day or seed', () => {
    const ids = (setting: Setting, day: number, seed: string) => buildDay(setting, day, seed).map((p) => p.task.id);
    expect(ids('bhw', 3, 'a')).toEqual(ids('bhw', 3, 'a'));
    expect(ids('bhw', 3, 'a')).not.toEqual(ids('bhw', 3, 'b'));
    expect(ids('bhw', 2, 'a')).not.toEqual(ids('bhw', 3, 'a'));
    expect(new Set(Array.from({ length: 20 }, (_, i) => ids('store', 2, `seed-${i}`).join())).size).toBeGreaterThan(15);
  });

  it('gives every day a fair mix from one workplace with no repeats, at least two of each kind', () => {
    for (const setting of ['bhw', 'store'] as const) {
      for (let day = 1; day <= 12; day++) {
        const plan = buildDay(setting, day, 'mix');
        const p = dayParams(day);
        expect(plan).toHaveLength(p.tasks);
        expect(new Set(plan.map((x) => x.task.id)).size).toBe(plan.length);
        expect(plan.every((x) => x.task.setting === setting)).toBe(true);
        const people = plan.filter((x) => x.task.needs === 'human').length;
        expect(people, `${setting} day ${day}`).toBeGreaterThanOrEqual(2);
        expect(plan.length - people, `${setting} day ${day}`).toBeGreaterThanOrEqual(2);
        plan.forEach((x, i) => expect(x.at).toBe(600 + i * p.gapMs));
      }
    }
  });

  it('starts day 1 with a task for AI and then a task for a person', () => {
    for (let i = 0; i < 12; i++) {
      const plan = buildDay(i % 2 ? 'bhw' : 'store', 1, `open-${i}`);
      expect(plan[0]?.task.needs).toBe('ai');
      expect(plan[1]?.task.needs).toBe('human');
    }
  });

  it('picks a workplace from the random numbers, and both can come up', () => {
    expect(pickSetting(() => 0.1)).toBe('bhw');
    expect(pickSetting(() => 0.9)).toBe('store');
    const seen = new Set(Array.from({ length: 30 }, (_, i) => pickSetting(createRng(`s${i}`))));
    expect(seen).toEqual(new Set(['bhw', 'store']));
  });

  it('builds the eight-task module play: stock and comfort first, then a seeded mix of 3 and 3', () => {
    const play = buildModulePlay('x');
    expect(play).toHaveLength(8);
    expect(play[0]?.id).toBe('bhw-stock');
    expect(play[1]?.id).toBe('bhw-comfort');
    expect(play.filter((t) => t.needs === 'ai')).toHaveLength(4);
    expect(play.filter((t) => t.needs === 'human')).toHaveLength(4);
    expect(new Set(play.map((t) => t.id)).size).toBe(8);
    expect(play.every((t) => t.setting === 'bhw')).toBe(true);
    expect(buildModulePlay('x').map((t) => t.id)).toEqual(play.map((t) => t.id));
    expect(buildModulePlay('y').map((t) => t.id)).not.toEqual(play.map((t) => t.id));
  });
});

describe('day simulation', () => {
  it('opens with an intro, then play, and tasks arrive on the plan', () => {
    const sim = createSim('seed', 'bhw');
    expect(sim.phase).toBe('intro');
    expect(sim.dayTotal).toBe(9);
    sim.tick(INTRO_MS - 100);
    expect(sim.phase).toBe('intro');
    sim.tick(100);
    expect(sim.phase).toBe('play');
    expect(sim.queue).toHaveLength(0);
    sim.tick(700);
    expect(sim.queue).toHaveLength(1);
    expect(sim.queue[0]?.task.needs).toBe('ai');
    expect(sim.left).toBe(9);
    runSim(sim, sim.params.gapMs);
    expect(sim.queue).toHaveLength(2);
  });

  it('lets the intro be skipped', () => {
    const sim = createSim('seed', 'store');
    sim.advance();
    expect(sim.phase).toBe('play');
  });

  it('pays the right lane: AI is instant, the person takes time', () => {
    const sim = started();
    expect(sim.place(0, 'ai')).toBe(true);
    expect(sim.score).toBeGreaterThanOrEqual(POINTS.ai);
    expect(sim.flash?.kind).toBe('good');
    expect(sim.flash?.head).toMatch(/^GOOD SPLIT! \+1\d$/);
    expect(sim.aiMs).toBeGreaterThan(0);
    expect(sim.aiTask?.id).toBeTruthy();
    expect(sim.service).toBe(100);
    runSim(sim, 600);
    expect(sim.aiMs).toBe(0);

    runSim(sim, sim.params.gapMs);
    const before = sim.score;
    expect(sim.queue[0]?.task.needs).toBe('human');
    expect(sim.place(0, 'human')).toBe(true);
    expect(sim.score).toBeGreaterThanOrEqual(before + POINTS.human);
    expect(sim.jobs).toHaveLength(1);
    const job = sim.jobs[0];
    expect(job?.slow).toBe(false);
    expect(job?.totalMs).toBe(3800);
    runSim(sim, 4000);
    expect(sim.jobs).toHaveLength(0);
  });

  it('fails the AI on a people job: no points, a funny line and a hit to Service', () => {
    const sim = started();
    sim.place(0, 'ai');
    runSim(sim, sim.params.gapMs);
    const task = sim.queue[0]?.task as Task;
    const score = sim.score;
    sim.place(0, 'ai');
    expect(sim.score).toBe(score);
    expect(sim.service).toBe(100 + SERVICE.fail > 100 ? 100 : 100 + SERVICE.fail);
    expect(sim.flash).toEqual({ kind: 'fail', head: 'AI SLIP-UP!', line: task.wrong });
    expect(sim.totals.fail).toBe(1);
    expect(sim.totals.failTraits[task.trait]).toBe(1);
  });

  it('counts a person doing an AI job as slow: a little credit, more worker time', () => {
    const sim = started();
    const score = sim.score;
    sim.place(0, 'human');
    expect(sim.score - score).toBe(POINTS.slow);
    expect(sim.flash?.kind).toBe('slow');
    expect(sim.jobs[0]?.slow).toBe(true);
    expect(sim.jobs[0]?.totalMs).toBe(4800);
    expect(sim.service).toBe(100);
    expect(sim.totals.slow).toBe(1);
  });

  it('refuses a fourth job for the person and leaves the task waiting', () => {
    const sim = started();
    const dense = createSim('dense', 'store');
    dense.advance();
    // crowd the queue by waiting, then fill the worker
    runSim(dense, 600 + 3 * dense.params.gapMs);
    expect(dense.queue.length).toBeGreaterThanOrEqual(HUMAN_CAP + 1);
    for (let i = 0; i < HUMAN_CAP; i++) expect(dense.place(0, 'human')).toBe(true);
    const waiting = dense.queue.length;
    expect(dense.place(0, 'human')).toBe(false);
    expect(dense.queue).toHaveLength(waiting);
    expect(dense.flash?.kind).toBe('busy');
    expect(dense.jobs).toHaveLength(HUMAN_CAP);
    // the AI lane is never full
    expect(dense.place(0, 'ai')).toBe(true);
    expect(sim.place(5, 'ai')).toBe(false);
  });

  it('drops a task that waits too long, and costs Service', () => {
    const sim = started();
    runSim(sim, sim.params.patienceMs + 200);
    expect(sim.totals.missed).toBeGreaterThanOrEqual(1);
    expect(sim.service).toBeLessThan(100);
    expect(sim.flash?.kind === 'missed' || sim.flash?.kind === 'full').toBe(true);
    expect(sim.flash?.head).toBe('TOO SLOW!');
  });

  it('loses a task that arrives when the queue is full (busy late days)', () => {
    const sim = createSim('crowd', 'bhw');
    play(sim, right, (s) => s.day === 10 && s.phase === 'play');
    expect(sim.day).toBe(10);
    expect(sim.service).toBe(100);
    let sawFull = false;
    for (let t = 0; t < sim.params.patienceMs && !sawFull; t += 100) {
      sim.tick(100);
      expect(sim.queue.length).toBeLessThanOrEqual(QUEUE_CAP);
      sawFull = sim.flash?.kind === 'full';
    }
    expect(sawFull).toBe(true);
    expect(sim.flash?.head).toBe('QUEUE FULL!');
    expect(sim.service).toBe(100 + SERVICE.overflow);
    expect(sim.totals.missed).toBe(1);
  });

  it('finishes a perfect day with a clear bonus, a night of rest and a report', () => {
    const sim = createSim('perfect', 'bhw');
    play(sim, right, (s) => s.phase === 'report');
    const r = sim.report;
    expect(r).not.toBeNull();
    expect(r).toMatchObject({ day: 1, tasks: 9, good: 9, slow: 0, fail: 0, missed: 0, clearBonus: 25, service: 100 });
    expect(r?.points).toBe(sim.score);
    expect(r?.lesson).toMatch(/perfect split/);
    expect(sim.left).toBe(0);
    sim.tick(5000);
    expect(sim.phase).toBe('report');
    sim.advance();
    expect(sim.phase).toBe('intro');
    expect(sim.day).toBe(2);
    expect(sim.dayTotal).toBe(10);
    expect(sim.report).toBeNull();
    expect(sim.queue).toHaveLength(0);
  });

  it('gives no clear bonus when something was missed, and recovers Service overnight', () => {
    const sim = createSim('messy', 'bhw');
    sim.advance();
    runSim(sim, 600);
    // ignore the first task until it is dropped, then play right
    runSim(sim, sim.params.patienceMs + 100);
    play(sim, right, (s) => s.phase === 'report');
    expect(sim.report?.missed).toBeGreaterThanOrEqual(1);
    expect(sim.report?.clearBonus).toBe(0);
    expect(sim.report?.service).toBeGreaterThan(SERVICE.expired + 100 - 40);
  });

  it('ends the game when Service is empty, after a lot of AI slip-ups', () => {
    const sim = createSim('doomed', 'store');
    play(sim, () => 'ai', (s) => s.phase === 'over');
    expect(sim.phase).toBe('over');
    expect(sim.service).toBe(0);
    expect(sim.totals.fail).toBeGreaterThanOrEqual(7);
    expect(sim.place(0, 'ai')).toBe(false);
    const score = sim.score;
    sim.tick(10_000);
    expect(sim.score).toBe(score);
    sim.advance();
    expect(sim.phase).toBe('over');
  });

  it('writes the day lesson from what happened', () => {
    const base = { tasks: 9, good: 9, slow: 0, fail: 0, missed: 0, points: 0 };
    expect(dayLesson({ ...base, fail: 2 }, ['empathy', 'empathy', 'judgement'])).toBe('AI slipped on comforting people. Keep care and decisions for people.');
    expect(dayLesson({ ...base, fail: 1 }, [])).toMatch(/people jobs/);
    expect(dayLesson({ ...base, missed: 1 }, [])).toMatch(/waited too long/);
    expect(dayLesson({ ...base, slow: 1 }, [])).toMatch(/AI could have done/);
    expect(dayLesson(base, [])).toMatch(/perfect split/);
  });

  it('never depends on the player: the same seed plans the same days however you play', () => {
    const a = createSim('same', 'store');
    const b = createSim('same', 'store');
    play(a, right, (s) => s.phase === 'report');
    play(b, () => 'human', (s) => s.phase === 'report');
    a.advance();
    b.advance();
    expect(a.dayTotal).toBe(b.dayTotal);
    a.tick(INTRO_MS);
    b.tick(INTRO_MS);
    runSim(a, 700);
    runSim(b, 700);
    expect(a.queue[0]?.task.id).toBe(b.queue[0]?.task.id);
  });
});

describe('layout helpers', () => {
  it('maps points to queue tiles and lanes', () => {
    for (let i = 0; i < QUEUE_CAP; i++) {
      const r = tileRect(i);
      expect(tileAt(r.x + r.w / 2, r.y + r.h / 2)).toBe(i);
      expect(r.x + r.w).toBeLessThanOrEqual(W);
    }
    expect(tileAt(5, 20)).toBe(0);
    expect(tileAt(100, 2)).toBe(-1);
    expect(tileAt(100, 80)).toBe(-1);
    expect(laneAt(10, 150)).toBe('ai');
    expect(laneAt(300, 150)).toBe('human');
    expect(laneAt(300, 100)).toBe('human');
    expect(laneAt(10, 50)).toBeNull();
    expect(LANE_RECT.human.y + LANE_RECT.human.h).toBeLessThanOrEqual(H);
  });
});

describe('Hati Tayo! game', () => {
  /** A fresh game, past the intro, with the first task waiting. */
  function ready(seed = 'g1'): GameInstance {
    const game = make(seed);
    run(game, INTRO_MS + 1000);
    return game;
  }

  it('is registered for the Arcade and describes the game', () => {
    expect(hati.slug).toBe('hati-tayo');
    expect(hati.name).toBe('Hati Tayo!');
    expect(hati.briefing).toHaveLength(5);
    expect(hati.howTo.length).toBeGreaterThanOrEqual(4);
    expect(hati.takeaway).toMatch(/^Kailan ako magtitiwala\?/);
    expect(GAME_LOADERS['hati-tayo']).toBeTypeOf('function');
    const info = ARCADE_GAMES.find((g) => g.slug === 'hati-tayo');
    expect(info).toMatchObject({ module: 'm06', playable: true });
  });

  it('starts with a day intro, then shows the first task and the plain-words state', () => {
    const game = make('g0');
    expect(game.stats().description).toMatch(/A new day starts with 9 tasks/);
    expect(hud(game, 'service')).toMatchObject({ value: '100 percent', meter: 100 });
    expect(hud(game, 'day')?.value).toBe('1');
    run(game, INTRO_MS + 1000);
    const d = game.stats().description;
    expect(d).toMatch(/Day 1/);
    expect(d).toMatch(/9 tasks left today/);
    expect(d).toMatch(/1: .* \(selected\)/);
    expect(d).toMatch(/The person is free/);
    expect(d).toMatch(/Left sends it to the AI/);
  });

  it('sends the selected task to AI with the Left key, and the next task to the person with Right', () => {
    const game = ready();
    run(game, 100, press('left'));
    expect(game.stats().description).toMatch(/Last result: GOOD SPLIT! \+1\d/);
    expect(game.stats().score).toBeGreaterThanOrEqual(10);
    run(game, 5800);
    run(game, 100, press('right'));
    expect(game.stats().description).toMatch(/Last result: GOOD SPLIT! \+\d+/);
    expect(game.stats().description).toMatch(/The person is busy with/);
  });

  it('fails the AI on a task that needs care and shows the slip-up', () => {
    const game = ready();
    run(game, 100, press('left'));
    run(game, 5800);
    run(game, 100, press('left'));
    const d = game.stats().description;
    expect(d).toMatch(/Last result: AI SLIP-UP!/);
    expect(hud(game, 'service')?.meter).toBe(100 + SERVICE.fail);
  });

  it('chooses a task with Up and Down, Space cycles, and a tap on a tile selects it', () => {
    const game = ready();
    run(game, 12_000);
    const sel = () => /(\d): (?:(?!\d: )[^()])*\(selected\)/.exec(game.stats().description)?.[1];
    expect(game.stats().description).toMatch(/Waiting tasks/);
    expect(sel()).toBe('1');
    run(game, 100, press('down'));
    expect(sel()).toBe('2');
    run(game, 100, press('up'));
    expect(sel()).toBe('1');
    run(game, 100, press('act'));
    expect(sel()).toBe('2');
    run(game, 100, tapAt(tileRect(0).x + 5, tileRect(0).y + 5));
    expect(sel()).toBe('1');
  });

  it('sends the selected task when a lane is tapped', () => {
    const game = ready();
    run(game, 100, tapAt(LANE_RECT.ai.x + 20, LANE_RECT.ai.y + 20));
    expect(game.stats().description).toMatch(/Last result: GOOD SPLIT!/);
  });

  it('drags a task onto a lane, and a swipe made by the drag does not also send it', () => {
    const game = ready();
    const tile = tileRect(0);
    const from = { x: tile.x + 10, y: tile.y + 10 };
    game.step(STEP_MS, { ...NONE, pointer: { ...from, down: true } });
    game.step(STEP_MS, { ...NONE, pointer: { x: 150, y: 90, down: true }, actions: ['right'] });
    game.step(STEP_MS, { ...NONE, pointer: { x: 40, y: 150, down: true }, actions: ['left'] });
    // nothing is sent until the finger lifts
    expect(game.stats().description).not.toMatch(/Last result/);
    game.step(STEP_MS, NONE);
    expect(game.stats().description).toMatch(/Last result: GOOD SPLIT!/);
    expect(game.stats().description).toMatch(/The person is free/);
  });

  it('treats a drag that ends above the lanes as nothing', () => {
    const game = ready();
    const tile = tileRect(0);
    game.step(STEP_MS, { ...NONE, pointer: { x: tile.x + 10, y: tile.y + 10, down: true } });
    game.step(STEP_MS, { ...NONE, pointer: { x: 200, y: 60, down: true } });
    game.step(STEP_MS, NONE);
    expect(game.stats().description).not.toMatch(/Last result/);
    expect(game.stats().description).toMatch(/Waiting tasks/);
  });

  it('shows the day report, and a press moves on to the next day', () => {
    const game = make('g-report');
    let guard = 0;
    while (!/report:/.test(game.stats().description) && guard++ < 4000) {
      const d = game.stats().description;
      const first = /1: ([^()]*?)(?: \(selected\))? (?:2:|The person|No task)/.exec(d)?.[1] ?? '';
      const people = TASKS.find((t) => t.text === first.trim())?.needs;
      game.step(STEP_MS, /Waiting tasks, oldest first\. 1:/.test(d) && people ? press(people === 'ai' ? 'left' : 'right') : press('act'));
    }
    expect(game.stats().description).toMatch(/Day 1 report: 9 good splits, 0 jobs done slowly by hand, 0 AI slip-ups, 0 missed tasks, clear bonus 25/);
    run(game, 800);
    run(game, 100, press('act'));
    expect(game.stats().description).toMatch(/Day 2/);
    expect(game.stats().description).toMatch(/10 tasks/);
    expect(hud(game, 'day')?.value).toBe('2');
  });

  it('ends with a recap when Service is empty', () => {
    const game = make('g-over');
    let guard = 0;
    while (!game.stats().over && guard++ < 20_000) game.step(STEP_MS, press('left', 'act'));
    const s = game.stats();
    expect(s.over).toBe(true);
    expect(s.description).toMatch(/The service has collapsed/);
    expect(s.recap.length).toBeGreaterThanOrEqual(5);
    expect(s.recap[0]).toMatch(/going for \d+ days?: \d+ good splits?/);
    expect(s.recap.join(' ')).toMatch(/Human in the loop/);
    expect(s.recap.join(' ')).toMatch(/responsible/);
    expect(s.score).toBeGreaterThan(0);
    // stepping on after game over changes nothing
    const score = s.score;
    run(game, 3000, press('left'));
    expect(game.stats().score).toBe(score);
  });

  it('plays the same days for the same seed', () => {
    const a = ready('same');
    const b = ready('same');
    expect(a.stats().description).toBe(b.stats().description);
    expect(ready('other').stats().description).not.toBe(a.stats().description);
  });

  it('draws every phase without throwing', () => {
    const ctx = fakeContext();
    const game = make('draw');
    game.draw(ctx);
    run(game, INTRO_MS + 1000);
    game.draw(ctx);
    run(game, 100, press('left'));
    game.draw(ctx);
    const tile = tileRect(0);
    run(game, 6000);
    game.step(STEP_MS, { ...NONE, pointer: { x: tile.x + 10, y: tile.y + 10, down: true } });
    game.step(STEP_MS, { ...NONE, pointer: { x: 250, y: 150, down: true } });
    game.draw(ctx);
    game.step(STEP_MS, NONE);
    let guard = 0;
    while (!game.stats().over && guard++ < 20_000) game.step(STEP_MS, press('left', 'act'));
    game.draw(ctx);
    const drawn = make('draw2');
    run(drawn, INTRO_MS + 400);
    for (let i = 0; i < 400 && !/report:/.test(drawn.stats().description); i++) drawn.step(STEP_MS, press(i % 3 === 0 ? 'right' : 'left'));
    drawn.draw(ctx);
    expect(true).toBe(true);
  });
});

describe('recap', () => {
  const totals = { good: 12, slow: 2, fail: 3, missed: 1, failTraits: { empathy: 2, judgement: 1 } as const };

  it('says what happened and what it means', () => {
    const lines = buildRecap({ setting: 'bhw', days: 2, totals });
    expect(lines[0]).toBe("You kept Kuya Jun's barangay health work going for 2 days: 12 good splits, 2 jobs done slowly by hand, 3 AI slip-ups and 1 missed task.");
    expect(lines[1]).toBe('The AI slipped most on comforting people (2 times).');
    expect(lines).toHaveLength(6);
    expect(lines.join(' ')).toMatch(/health worker/);
  });

  it('skips the slip-up line when the AI never failed, and uses singular words', () => {
    const lines = buildRecap({ setting: 'store', days: 1, totals: { good: 1, slow: 1, fail: 0, missed: 0, failTraits: {} } });
    expect(lines[0]).toBe("You kept Aling Nena's sari-sari store going for 1 day: 1 good split, 1 job done slowly by hand, 0 AI slip-ups and 0 missed tasks.");
    expect(lines).toHaveLength(5);
  });
});
