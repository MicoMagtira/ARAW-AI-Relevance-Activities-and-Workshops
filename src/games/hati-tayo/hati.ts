// Hati Tayo! (AI and jobs): a task-splitting tycoon (docs/SPEC.md sections 4 and 5). Tasks arrive on a queue in Kuya Jun's
// clinic work or Aling Nena's sari-sari store. Send each one to the AI lane or to the person: AI is instant at repeat jobs
// but fails at empathy and judgement, and the person is slow and busy. Days go on until the Service meter is empty.
// Every day comes from the run's seed alone, never from the player's choices, so the Daily Challenge matches.
import { PALETTE, box } from '../engine/draw';
import type { InputFrame } from '../engine/input';
import { createRng, type Rng } from '../engine/rng';
import type { GameDef, GameInstance, GameStats } from '../engine/types';
import { CARD, H, W, drawCard, drawGhost, drawHeader, drawLane, drawPanel, drawStrip, drawTile, inside, laneAt, tileAt, type PanelRow } from './art';
import { wrapText } from '../luto-ni-ara/art';
import { QUEUE_CAP, pickSetting } from './rules';
import { createSim, type Sim, type Totals } from './sim';
import { SETTINGS, TRAIT_NAME, type Lane, type Trait } from './tasks';

/** A press that moves further than this (logical px) is a drag, not a tap. */
const DRAG_MIN = 6;
/** The report and intro can be skipped with a press after this long. */
const SKIP_AFTER_MS = 700;
const PANEL_CHARS = 34;
const HINT = 'Tap a task, then a lane. Or drag it, or use the arrow keys.';

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

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The game-over recap: what happened, then how AI at work really behaves. */
export function buildRecap(run: RunSummary): string[] {
  const { good, slow, fail, missed, failTraits } = run.totals;
  const lines = [
    `You kept ${SETTINGS[run.setting].place} going for ${plural(run.days, 'day', 'days')}: ${plural(good, 'good split', 'good splits')}, ${plural(slow, 'job', 'jobs')} done slowly by hand, ${plural(fail, 'AI slip-up', 'AI slip-ups')} and ${plural(missed, 'missed task', 'missed tasks')}.`,
  ];
  const top = (Object.entries(failTraits) as Array<[Trait, number]>).sort((a, b) => b[1] - a[1])[0];
  if (top) lines.push(`The AI slipped most on ${TRAIT_NAME[top[0]]} (${plural(top[1], 'time', 'times')}).`);
  lines.push(
    'How it works: AI is fast and never tired at repeat jobs such as counting, sorting, drafting and scheduling. It has no feelings, and it does not know your neighbours.',
    'Human in the loop: read and check what AI drafts, like a translated leaflet, before it goes out. A person keeps the final say.',
    'Someone is always responsible. If AI gets it wrong at work, the people who chose and used it answer for it.',
    'Tip: give the repeat jobs to AI, so you have time for people. Keep care, decisions and health advice with a person or a health worker.',
  );
  return lines;
}

function createHati({ rng }: { seed: string; rng: Rng }): GameInstance {
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
    if (sim.place(index, lane)) clampSel();
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
    const pad = (label: string, value: string) => `${label}${' '.repeat(Math.max(1, PANEL_CHARS - label.length - value.length))}${value}`;
    return [
      { text: pad('GOOD SPLITS', String(r.good)), color: PALETTE.fact },
      { text: pad('SLOW HAND-WORK', String(r.slow)) },
      { text: pad('AI SLIP-UPS', String(r.fail)), color: r.fail > 0 ? PALETTE.fake : PALETTE.ink },
      { text: pad('MISSED TASKS', String(r.missed)), color: r.missed > 0 ? PALETTE.fake : PALETTE.ink },
      { text: pad('POINTS TODAY', String(r.points)) },
      { text: pad('CLEAR BONUS', `+${r.clearBonus}`), color: r.clearBonus > 0 ? PALETTE.fact : PALETTE.muted },
      { text: pad('SERVICE AFTER REST', `${r.service}%`) },
      { text: '' },
      ...wrapText(r.lesson, PANEL_CHARS).map((line) => ({ text: line, color: PALETTE.navy })),
    ];
  };

  const introRows = (): PanelRow[] => {
    const p = sim.params;
    const gap = (p.gapMs / 1000).toFixed(1);
    if (sim.day === 1) {
      return [
        { text: `${p.tasks} TASKS TODAY.` },
        { text: 'SEND EACH ONE TO AI OR TO A PERSON.' },
        { text: '' },
        { text: 'AI: FAST AT REPEAT JOBS.', color: PALETTE.navy },
        { text: 'PERSON: SLOW, BUT KIND AND WISE.', color: PALETTE.navy },
        { text: 'AI FAILS AT CARE AND JUDGEMENT.', color: PALETTE.fake },
      ];
    }
    return [
      { text: `${p.tasks} TASKS, A NEW MIX.` },
      { text: `A NEW TASK EVERY ${gap} SECONDS.` },
      { text: `EACH ONE WAITS ${Math.round(p.patienceMs / 1000)} SECONDS.` },
      { text: '' },
      { text: 'KEEP SERVICE ABOVE ZERO.', color: PALETTE.navy },
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
      }
    },

    draw(ctx) {
      box(ctx, PALETTE.cream, 0, 0, W, H);
      drawHeader(ctx, SETTINGS[setting].header, sim.day, sim.left, sim.dayTotal);
      const showQueue = sim.phase === 'play' || sim.phase === 'over';
      for (let i = 0; i < QUEUE_CAP; i++) drawTile(ctx, i, showQueue ? sim.queue[i] : undefined, showQueue && i === sel && sim.queue.length > 0);
      drawCard(ctx, showQueue ? sim.queue[sel] : undefined, sim.phase === 'play' ? 'WAITING FOR THE NEXT TASK...' : '');
      drawStrip(ctx, sim.flash, HINT);
      const state = { aiMs: sim.aiMs, aiTask: sim.aiTask, jobs: sim.jobs, setting, tick };
      drawLane(ctx, 'ai', { ...state, hover: hover === 'ai' });
      drawLane(ctx, 'human', { ...state, hover: hover === 'human' });
      const dragged = dragging?.moved ? sim.queue[dragging.index] : undefined;
      if (dragging && dragged) drawGhost(ctx, dragged.task, dragging.x, dragging.y);

      if (sim.phase === 'intro') drawPanel(ctx, `DAY ${sim.day}`, introRows(), 'GET READY...');
      else if (sim.phase === 'report' && sim.report) drawPanel(ctx, `DAY ${sim.day} REPORT`, reportRows(), sim.phaseMs >= SKIP_AFTER_MS ? `TAP FOR DAY ${sim.day + 1}` : '');
      else if (sim.phase === 'over') drawPanel(ctx, 'SERVICE HAS COLLAPSED', [{ text: 'TOO MANY TASKS WENT WRONG.' }, { text: `YOU SURVIVED ${sim.day - 1} DAYS.` }], 'SEE YOUR RECAP');
    },

    stats(): GameStats {
      const over = sim.phase === 'over';
      const place = SETTINGS[setting].place;
      const base = `Hati Tayo, ${place}. Day ${sim.day}. Score ${sim.score}. Service ${sim.service} percent.`;
      let description: string;
      if (over) {
        description = `${base} The service has collapsed. You survived ${sim.day - 1} ${sim.day - 1 === 1 ? 'day' : 'days'}.`;
      } else if (sim.phase === 'intro') {
        description = `${base} A new day starts with ${sim.params.tasks} tasks. Send each task to the AI lane (left) or to the person (right).`;
      } else if (sim.phase === 'report' && sim.report) {
        const r = sim.report;
        description = `${base} Day ${r.day} report: ${r.good} good splits, ${r.slow} jobs done slowly by hand, ${r.fail} AI slip-ups, ${r.missed} missed tasks, clear bonus ${r.clearBonus}. ${r.lesson} Press Enter or tap for the next day.`;
      } else {
        const queue = sim.queue.length > 0 ? sim.queue.map((w, i) => `${i + 1}: ${w.task.text}${i === sel ? ' (selected)' : ''}`).join(' ') : 'No task is waiting.';
        const job = sim.jobs[0];
        const person = job ? `The person is busy with ${job.task.short.toLowerCase()}, ${sim.jobs.length} of 3 places taken.` : 'The person is free.';
        const flash = sim.flash ? ` Last result: ${sim.flash.head}. ${sim.flash.line}` : '';
        description = `${base} ${sim.left} tasks left today. Waiting tasks, oldest first. ${queue} ${person}${flash} Up and Down choose a task. Left sends it to the AI, Right sends it to the person.`;
      }
      return {
        score: sim.score,
        over,
        hud: [
          { id: 'score', label: 'Score', value: String(sim.score) },
          { id: 'service', label: 'Service', value: `${sim.service} percent`, meter: sim.service },
          { id: 'day', label: 'Day', value: String(sim.day) },
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
    { title: 'Salamat, you are here!', text: "Welcome to a busy day. Tasks pile up fast, and you decide who does each one: the AI helper or a person.", mood: 'wow' },
    { title: 'AI is a fast helper', text: 'AI is quick and never tired at repeat jobs: counting stock, sorting lists, drafting, scheduling. Send those to the AI lane.', mood: 'happy' },
    { title: 'People do the caring', text: 'Comforting a worried mother, a referral, a tricky decision: these need a person. AI fails here, sometimes in funny ways.', mood: 'think' },
    { title: 'How to play', text: 'Tap a task and then a lane, or drag it there. On a keyboard, use Up and Down, then Left for AI and Right for the person.', mood: 'idle' },
    { title: 'Kailan ako magtitiwala?', text: 'Trust AI with repeat drafts you can check. Keep people for care and decisions.', mood: 'happy' },
  ],
  takeaway: 'Kailan ako magtitiwala? With repeat drafts I can check. I keep care and decisions for people, and someone is always responsible.',
  create: createHati,
};

export default hatiTayo;
