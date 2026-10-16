// Hati Tayo! (AI and jobs): a task-splitting tycoon (docs/SPEC.md sections 4 and 5). Tasks arrive on a queue in Kuya Jun's
// clinic work or Aling Nena's sari-sari store. Send each one to the AI lane or to the person: AI is instant at repeat jobs
// but fails at empathy and judgement, and the person is slow and busy. Days go on until the Service meter is empty.
// Every day comes from the run's seed alone, never from the player's choices, so the Daily Challenge matches.
import { t, type StringKey } from '../../app/i18n';
import { tx } from '../../i18n/runtime';
import { PALETTE, box } from '../engine/draw';
import type { InputFrame } from '../engine/input';
import { createRng, type Rng } from '../engine/rng';
import type { Cue, GameDef, GameInstance, GameStats } from '../engine/types';
import { silent } from '../engine/cues';
import { CARD, H, W, drawCard, drawGhost, drawHeader, drawLane, drawPanel, drawStrip, drawTile, inside, laneAt, tileAt, type PanelRow } from './art';
import { QUEUE_CAP, pickSetting } from './rules';
import { createSim, type Sim, type Totals } from './sim';
import { SETTINGS, TRAIT_NAME, type Lane, type Trait } from './tasks';

/** A press that moves further than this (logical px) is a drag, not a tap. */
const DRAG_MIN = 6;
/** The report and intro can be skipped with a press after this long. */
const SKIP_AFTER_MS = 700;
/** Wrap width of the lesson under the day report (34 characters of the 8 px font). */
const LESSON_W = 34 * 8;

interface Drag {
  index: number;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  moved: boolean;
}

export interface RunSummary {
  setting: 'bhw' | 'store';
  /** Days finished. */
  days: number;
  totals: Totals;
}

/** "1 day" or "3 days": a catalog pair `<key>.one` / `<key>.many`, each with {n}. */
const plural = (n: number, key: string): string => t(`${key}.${n === 1 ? 'one' : 'many'}` as StringKey, { n });

/** The game-over recap: what happened, then how AI at work really behaves. */
export function buildRecap(run: RunSummary): string[] {
  const { good, slow, fail, missed, failTraits } = run.totals;
  const lines = [
    t('g.hati.recap.kept', {
      place: SETTINGS[run.setting].place,
      days: plural(run.days, 'g.hati.n.day'),
      good: plural(good, 'g.hati.n.goodSplit'),
      slow: plural(slow, 'g.hati.n.job'),
      fail: plural(fail, 'g.hati.n.slip'),
      missed: plural(missed, 'g.hati.n.missed'),
    }),
  ];
  const top = (Object.entries(failTraits) as Array<[Trait, number]>).sort((a, b) => b[1] - a[1])[0];
  if (top) lines.push(t('g.hati.recap.slippedMost', { trait: TRAIT_NAME[top[0]], times: plural(top[1], 'g.hati.n.time') }));
  lines.push(t('g.hati.recap.how'), t('g.hati.recap.loop'), t('g.hati.recap.responsible'), t('g.hati.recap.tip'));
  return lines;
}

function createHati({ rng, cue = silent }: { seed: string; rng: Rng; cue?: Cue }): GameInstance {
  const seed = `${rng()}:hati-days`;
  const setting = pickSetting(createRng(`${seed}:setting`));
  const sim: Sim = createSim(seed, setting);

  let sel = 0;
  let dragging: Drag | null = null;
  let hover: Lane | null = null;
  let tick = 0;
  let tickMs = 0;

  const clampSel = () => {
    sel = Math.max(0, Math.min(sel, sim.queue.length - 1));
  };

  const send = (index: number, lane: Lane) => {
    if (!sim.place(index, lane)) return;
    cue(lane === 'ai' ? 'toAI' : 'toPerson');
    clampSel();
  };

  function play(input: InputFrame) {
    const p = input.pointer;
    let dragEnded = false;
    if (p?.down) {
      if (!dragging) {
        const i = tileAt(p.x, p.y);
        const onCard = inside(CARD, p.x, p.y) && sim.queue.length > 0;
        const index = i >= 0 ? i : onCard ? sel : -1;
        if (index >= 0 && index < sim.queue.length) dragging = { index, x: p.x, y: p.y, fromX: p.x, fromY: p.y, moved: false };
      } else {
        dragging.x = p.x;
        dragging.y = p.y;
        if (Math.hypot(p.x - dragging.fromX, p.y - dragging.fromY) > DRAG_MIN) dragging.moved = true;
      }
      hover = dragging?.moved ? laneAt(dragging.x, dragging.y) : null;
    } else if (dragging) {
      const d = dragging;
      dragging = null;
      hover = null;
      if (d.moved) {
        dragEnded = true;
        sel = d.index;
        const lane = laneAt(d.x, d.y);
        if (lane) send(d.index, lane);
      }
    } else {
      hover = p && !p.down ? laneAt(p.x, p.y) : null;
    }
    // swipes made while dragging, and the tap that ends a drag, were already used by the drag
    const dragUsed = dragEnded || dragging?.moved === true;

    for (const action of dragUsed ? [] : input.actions) {
      if (action === 'left') send(sel, 'ai');
      else if (action === 'right') send(sel, 'human');
      else if (action === 'up') sel = Math.max(0, sel - 1);
      else if (action === 'down') sel = Math.min(sim.queue.length - 1, sel + 1);
      else if (sim.queue.length > 0) sel = (sel + 1) % sim.queue.length;
    }

    for (const tap of dragUsed ? [] : input.taps) {
      const i = tileAt(tap.x, tap.y);
      if (i >= 0) {
        if (i < sim.queue.length) sel = i;
        continue;
      }
      const lane = laneAt(tap.x, tap.y);
      if (lane) send(sel, lane);
    }
    clampSel();
  }

  const reportRows = (): PanelRow[] => {
    const r = sim.report;
    if (!r) return [];
    return [
      { text: t('g.hati.report.good'), value: String(r.good), color: PALETTE.fact },
      { text: t('g.hati.report.slow'), value: String(r.slow) },
      { text: t('g.hati.report.fail'), value: String(r.fail), color: r.fail > 0 ? PALETTE.fake : PALETTE.ink },
      { text: t('g.hati.report.missed'), value: String(r.missed), color: r.missed > 0 ? PALETTE.fake : PALETTE.ink },
      { text: t('g.hati.report.points'), value: String(r.points) },
      { text: t('g.hati.report.bonus'), value: `+${r.clearBonus}`, color: r.clearBonus > 0 ? PALETTE.fact : PALETTE.muted },
      { text: t('g.hati.report.service'), value: `${r.service}%` },
      { text: '' },
      { text: r.lesson, color: PALETTE.navy, width: LESSON_W },
    ];
  };

  const introRows = (): PanelRow[] => {
    const p = sim.params;
    const gap = (p.gapMs / 1000).toFixed(1);
    if (sim.day === 1) {
      return [
        { text: t('g.hati.intro.tasksToday', { n: p.tasks }) },
        { text: t('g.hati.intro.send') },
        { text: '' },
        { text: t('g.hati.intro.ai'), color: PALETTE.navy },
        { text: t('g.hati.intro.person'), color: PALETTE.navy },
        { text: t('g.hati.intro.fails'), color: PALETTE.fake },
      ];
    }
    return [
      { text: t('g.hati.intro.newMix', { n: p.tasks }) },
      { text: t('g.hati.intro.every', { s: gap }) },
      { text: t('g.hati.intro.waits', { s: Math.round(p.patienceMs / 1000) }) },
      { text: '' },
      { text: t('g.hati.intro.keep'), color: PALETTE.navy },
    ];
  };

  return {
    step(dtMs, input) {
      tickMs += dtMs;
      if (tickMs >= 150) {
        tickMs -= 150;
        tick += 1;
      }
      const pressed = input.actions.includes('act') || input.taps.length > 0;
      if (sim.phase === 'intro' || sim.phase === 'report') {
        dragging = null;
        hover = null;
        if (pressed && sim.phaseMs >= SKIP_AFTER_MS) {
          sim.advance();
          sel = 0;
        } else sim.tick(dtMs);
        return;
      }
      if (sim.phase === 'play') {
        play(input);
        sim.tick(dtMs);
        clampSel();
        // the day just ended: the report card comes up (a getter, so read it again after the tick)
        if ((sim.phase as Sim['phase']) === 'report') cue('dayDone');
      }
    },

    draw(ctx) {
      box(ctx, PALETTE.cream, 0, 0, W, H);
      drawHeader(ctx, SETTINGS[setting].header, sim.day, sim.left, sim.dayTotal);
      const showQueue = sim.phase === 'play' || sim.phase === 'over';
      for (let i = 0; i < QUEUE_CAP; i++) drawTile(ctx, i, showQueue ? sim.queue[i] : undefined, showQueue && i === sel && sim.queue.length > 0);
      drawCard(ctx, showQueue ? sim.queue[sel] : undefined, sim.phase === 'play' ? t('g.hati.card.waiting') : '');
      drawStrip(ctx, sim.flash, t('g.hati.hint'));
      const state = { aiMs: sim.aiMs, aiTask: sim.aiTask, jobs: sim.jobs, setting, tick };
      drawLane(ctx, 'ai', { ...state, hover: hover === 'ai' });
      drawLane(ctx, 'human', { ...state, hover: hover === 'human' });
      const dragged = dragging?.moved ? sim.queue[dragging.index] : undefined;
      if (dragging && dragged) drawGhost(ctx, dragged.task, dragging.x, dragging.y);

      if (sim.phase === 'intro') drawPanel(ctx, t('g.hati.panel.day', { day: sim.day }), introRows(), t('g.hati.panel.ready'));
      else if (sim.phase === 'report' && sim.report) drawPanel(ctx, t('g.hati.panel.report', { day: sim.day }), reportRows(), sim.phaseMs >= SKIP_AFTER_MS ? t('g.hati.panel.next', { day: sim.day + 1 }) : '');
      else if (sim.phase === 'over') {
        const survived = sim.day - 1;
        drawPanel(ctx, t('g.hati.panel.collapsed'), [{ text: t('g.hati.panel.wrong') }, { text: t(survived === 1 ? 'g.hati.panel.survived.one' : 'g.hati.panel.survived.many', { n: survived }) }], t('g.hati.panel.recap'));
      }
    },

    stats(): GameStats {
      const over = sim.phase === 'over';
      const place = SETTINGS[setting].place;
      const base = t('g.hati.d.base', { place, day: sim.day, score: sim.score, service: sim.service });
      let description: string;
      if (over) {
        description = t(sim.day - 1 === 1 ? 'g.hati.d.over.one' : 'g.hati.d.over.many', { base, n: sim.day - 1 });
      } else if (sim.phase === 'intro') {
        description = t('g.hati.d.intro', { base, n: sim.params.tasks });
      } else if (sim.phase === 'report' && sim.report) {
        const r = sim.report;
        description = t('g.hati.d.report', { base, day: r.day, good: r.good, slow: r.slow, fail: r.fail, missed: r.missed, bonus: r.clearBonus, lesson: r.lesson });
      } else {
        const queue =
          sim.queue.length > 0
            ? sim.queue.map((w, i) => t(i === sel ? 'g.hati.d.queueSelected' : 'g.hati.d.queueItem', { n: i + 1, task: w.task.text })).join(' ')
            : t('g.hati.d.noTask');
        const job = sim.jobs[0];
        const person = job ? t('g.hati.d.busy', { task: tx(job.task.short).toLowerCase(), n: sim.jobs.length }) : t('g.hati.d.free');
        const flash = sim.flash ? ` ${t('g.hati.d.last', { head: sim.flash.head, line: sim.flash.line })}` : '';
        description = t('g.hati.d.play', { base, left: sim.left, queue, person, flash });
      }
      return {
        score: sim.score,
        over,
        hud: [
          { id: 'score', label: t('g.hati.hud.score'), value: String(sim.score) },
          { id: 'service', label: t('g.hati.hud.service'), value: t('g.hati.hud.percent', { n: sim.service }), meter: sim.service },
          { id: 'day', label: t('g.hati.hud.day'), value: String(sim.day) },
        ],
        description,
        recap: over ? buildRecap({ setting, days: sim.day - 1, totals: sim.totals }) : [],
      };
    },
  };
}

const hatiTayo: GameDef = {
  slug: 'hati-tayo',
  name: 'Hati Tayo!',
  width: W,
  height: H,
  goodRun: 500,
  howTo: [
    'Tasks arrive in a queue at the top. Send each one to the AI lane (left) or to the person (right) before it waits too long.',
    'Tap a task, then tap a lane. Or drag the task onto a lane. With the keyboard: Up and Down choose a task, Left sends it to the AI, Right sends it to the person.',
    'AI is instant at repeat jobs such as counting, sorting, translating a draft and scheduling. It fails at comforting people and at judgement calls.',
    'The person is slow and can hold only three jobs. Giving them a repeat job works, but it wastes the time you need for care.',
    'The Service meter drops when AI fails, when a task waits too long, or when the queue is full. It is empty at zero. Each new day is faster, with a new mix.',
  ],
  briefing: [
    { title: 'Thank goodness you are here!', text: "Welcome to a busy day. Tasks pile up fast, and you decide who does each one: the AI helper or a person.", mood: 'wow' },
    { title: 'AI is a fast helper', text: 'AI is quick and never tired at repeat jobs: counting stock, sorting lists, drafting, scheduling. Send those to the AI lane.', mood: 'happy' },
    { title: 'People do the caring', text: 'Comforting a worried mother, a referral, a tricky decision: these need a person. AI fails here, sometimes in funny ways.', mood: 'think' },
    { title: 'How to play', text: 'Tap a task and then a lane, or drag it there. On a keyboard, use Up and Down, then Left for AI and Right for the person.', mood: 'idle' },
    { title: 'When should I trust it?', text: 'Trust AI with repeat drafts you can check. Keep people for care and decisions.', mood: 'happy' },
  ],
  takeaway: 'When should I trust it? With repeat drafts I can check. I keep care and decisions for people, and someone is always responsible.',
  create: createHati,
};

export default hatiTayo;
