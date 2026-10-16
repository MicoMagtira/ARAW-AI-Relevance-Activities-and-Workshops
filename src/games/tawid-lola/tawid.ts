// Tawid, Lola! (automation bias and human oversight): a Crossy Road-style street game (docs/SPEC.md section 5).
// Help Lola cross the lanes to the health center. An AI guide says GO or WAIT for the next lane. It is usually right and
// sometimes confidently wrong, so the player checks the traffic with their own eyes. The Trust Meter rewards following the
// guide when it is right and overriding it when it is wrong. The streets come only from the seeded generator.
import { t, type StringKey } from '../../app/i18n';
import { tx } from '../../i18n/runtime';
import { PALETTE, box } from '../engine/draw';
import type { InputFrame } from '../engine/input';
import { createRng, type Rng } from '../engine/rng';
import type { Cue, GameDef, GameInstance, GameStats } from '../engine/types';
import { silent } from '../engine/cues';
import {
  COLUMN_X,
  FIELD_Y,
  H,
  MAX_COL,
  ROWS,
  ROW_H,
  TILES,
  W,
  commandAt,
  drawBanner,
  drawBubble,
  drawClinic,
  drawHorn,
  drawLane,
  drawLola,
  drawStatus,
  drawTile,
  drawVehicle,
  rowY,
  type Command,
} from './art';
import {
  COL_W,
  HEARTS,
  LANE_POINTS,
  TRIP_POINTS,
  TRUST_START,
  VEHICLES,
  adviceFor,
  assess,
  calmLine,
  carsAt,
  clampTrust,
  createTripGenerator,
  hitsAt,
  multiplierFor,
  roadsInTrip,
  secondsToHit,
  type Advice,
  type Decision,
  type Lane,
  type Trip,
  type Verdict,
} from './lanes';

/** One hop takes this long; the next command waits for it. */
export const HOP_MS = 110;
/** Standing still this long in front of a road counts as choosing to WAIT. */
export const IDLE_WAIT_MS = 1200;
const ADVICE_EVERY_MS = 100;
const INVULNERABLE_MS = 1500;
const MESSAGE_MS = 2400;
const ARRIVED_MS = 3600;
const ARRIVED_SKIP_MS = 700;
const ENDING_MS = 1600;
const HORN_MS = 900;
const START_COL = 10;

type Phase = 'play' | 'arrived' | 'ending';

export interface RunSummary {
  /** Trips that reached the health center. */
  trips: number;
  lanes: number;
  horns: number;
  trustRight: number;
  trustWrong: number;
  overrideRight: number;
  overrideWrong: number;
  /** Lanes where you made a decision while the guide was wrong. */
  aiWrong: number;
}

const TIPS: readonly StringKey[] = ['g.tawid.tip1', 'g.tawid.tip2', 'g.tawid.tip3', 'g.tawid.tip4'];

const COMMAND_OF = { left: 'left', right: 'right', up: 'go', down: 'back', act: 'wait' } as const;

/** The nearest lane at or below `lane` where Lola can stand without traffic. */
export const restLane = (lanes: readonly Lane[], lane: number): number => {
  for (let i = Math.min(lane, lanes.length - 1); i > 0; i--) if ((lanes[i] as Lane).kind !== 'road') return i;
  return 0;
};

function createTawid({ rng, cue = silent }: { seed: string; rng: Rng; cue?: Cue }): GameInstance {
  const gen = createTripGenerator(createRng(`${rng()}:tawid-lanes`));

  let tripNo = 0;
  let trip: Trip = gen.trip(0);
  let tMs = 0;
  let lane = 0;
  let col = START_COL;
  let from = { lane: 0, col: START_COL };
  let hopMs = HOP_MS;
  let cooldown = 0;
  let cam = 0;
  let bestLane = 0;
  let pending: Command[] = [];
  let hearts = HEARTS;
  let trust = TRUST_START;
  let score = 0;
  let phase: Phase = 'play';
  let phaseMs = 0;
  let over = false;
  let invuln = 0;
  let idleMs = 0;
  let adviceMs = ADVICE_EVERY_MS;
  let advice: Advice | null = null;
  let message: { text: string; good: boolean; ms: number } | null = null;
  let horn: { lane: number; x: number; ms: number } | null = null;
  let pressed: { slot: number; ms: number } | null = null;
  let arrivedLines: string[] = [];
  let tick = 0;
  let tickMs = 0;
  const assessed = new Set<string>();
  const wrongSeen = new Set<string>();
  const counts = { trips: 0, lanes: 0, horns: 0, trustRight: 0, trustWrong: 0, overrideRight: 0, overrideWrong: 0, aiWrong: 0 };
  const tally: Record<Verdict, 'trustRight' | 'trustWrong' | 'overrideRight' | 'overrideWrong'> = {
    'trust-right': 'trustRight',
    'trust-wrong': 'trustWrong',
    'override-right': 'overrideRight',
    'override-wrong': 'overrideWrong',
  };

  const laneAt = (i: number): Lane | undefined => trip.lanes[i];
  const next = (): Lane | undefined => laneAt(lane + 1);
  const mult = () => multiplierFor(trust);
  const say = (text: string, good: boolean) => {
    message = { text, good, ms: MESSAGE_MS };
  };
  let spoken = ''; // the guide's last GO / WAIT: its voice only plays when the advice changes
  const refreshAdvice = () => {
    adviceMs = 0;
    advice = adviceFor(next(), col, tMs);
    const said = advice?.headline ?? '';
    if (said && said !== spoken) cue('aiVoice');
    spoken = said;
  };
  refreshAdvice();

  function hop() {
    cooldown = HOP_MS;
    hopMs = 0;
    cue('step');
  }

  /** Judge a GO or WAIT against the guide, once per lane and decision. */
  function decide(decision: Decision) {
    const ahead = next();
    if (!advice || !ahead || ahead.kind !== 'road') return;
    const key = `${lane + 1}:${decision}`;
    if (assessed.has(key)) return;
    assessed.add(key);
    const a = assess(advice, decision);
    trust = clampTrust(trust + a.delta);
    score += a.bonus;
    counts[tally[a.verdict]] += 1;
    if (!advice.correct && !wrongSeen.has(String(lane + 1))) {
      wrongSeen.add(String(lane + 1));
      counts.aiWrong += 1;
    }
    say(a.message, a.good);
  }

  function arrive() {
    phase = 'arrived';
    phaseMs = 0;
    counts.trips += 1;
    const points = Math.round(TRIP_POINTS * mult());
    score += points;
    cue('arrive');
    arrivedLines = [t('g.tawid.madeIt'), t('g.tawid.tripDone', { points, trip: tripNo + 1 }), t('g.tawid.busier'), t(TIPS[tripNo % TIPS.length] as StringKey)];
    message = null;
  }

  function nextTrip() {
    tripNo += 1;
    trip = gen.trip(tripNo);
    tMs = 0;
    lane = 0;
    from = { lane: 0, col };
    hopMs = HOP_MS;
    cam = 0;
    bestLane = 0;
    phase = 'play';
    phaseMs = 0;
    invuln = 1000;
    pending = [];
    assessed.clear();
    wrongSeen.clear();
    refreshAdvice();
  }

  function bump() {
    hearts -= 1;
    counts.horns += 1;
    horn = { lane, x: COLUMN_X(col), ms: HORN_MS };
    cue('honk');
    lane = restLane(trip.lanes, lane);
    from = { lane, col };
    hopMs = HOP_MS;
    invuln = INVULNERABLE_MS;
    pending = [];
    assessed.clear();
    say(t('g.tawid.beepLost'), false);
    if (hearts <= 0) {
      phase = 'ending';
      phaseMs = 0;
    } else refreshAdvice();
  }

  function apply(command: Command) {
    idleMs = 0;
    if (command === 'wait') {
      decide('wait');
      return;
    }
    if (command === 'left' || command === 'right') {
      const nextCol = Math.max(0, Math.min(MAX_COL, col + (command === 'left' ? -1 : 1)));
      if (nextCol === col) return;
      from = { lane, col };
      col = nextCol;
      hop();
    } else if (command === 'go') {
      if (!next()) return;
      decide('go');
      from = { lane, col };
      lane += 1;
      hop();
      if (lane > bestLane) {
        bestLane = lane;
        counts.lanes += 1;
        score += Math.round(LANE_POINTS * mult());
      }
      if ((laneAt(lane) as Lane).kind === 'clinic') {
        arrive();
        return;
      }
    } else {
      if (lane === 0) return;
      from = { lane, col };
      lane -= 1;
      hop();
    }
    refreshAdvice();
  }

  const lolaPos = () => ({ x: COLUMN_X(col), y: rowY(lane - cam) });

  return {
    step(dtMs, input: InputFrame) {
      if (over) return;
      tickMs += dtMs;
      if (tickMs >= 150) {
        tickMs -= 150;
        tick += 1;
      }
      tMs += dtMs;
      phaseMs += dtMs;
      if (message && (message.ms -= dtMs) <= 0) message = null;
      if (horn && (horn.ms -= dtMs) <= 0) horn = null;
      if (pressed && (pressed.ms -= dtMs) <= 0) pressed = null;
      cam += (lane - cam) * 0.3;
      if (Math.abs(lane - cam) < 0.02) cam = lane;
      hopMs = Math.min(HOP_MS, hopMs + dtMs);

      const commands: Command[] = input.actions.map((a) => COMMAND_OF[a]);
      for (const tap of input.taps) {
        const c = commandAt(tap.x, tap.y, lolaPos());
        if (c) commands.push(c);
      }
      for (const c of commands) {
        const slot = TILES.findIndex((t) => t.command === c);
        if (slot >= 0) pressed = { slot, ms: 140 };
      }

      if (phase === 'ending') {
        if (phaseMs >= ENDING_MS) over = true;
        return;
      }
      if (phase === 'arrived') {
        if (phaseMs >= ARRIVED_MS || (phaseMs >= ARRIVED_SKIP_MS && commands.length > 0)) nextTrip();
        return;
      }

      invuln = Math.max(0, invuln - dtMs);
      cooldown = Math.max(0, cooldown - dtMs);
      pending = [...pending, ...commands].slice(-2);
      while (pending.length > 0 && (cooldown <= 0 || pending[0] === 'wait')) {
        apply(pending.shift() as Command);
        if (phase !== 'play') return;
      }

      adviceMs += dtMs;
      if (adviceMs >= ADVICE_EVERY_MS) refreshAdvice();

      // standing in front of a road for a moment is a decision to WAIT
      if (commands.length === 0 && cooldown <= 0 && advice) {
        idleMs += dtMs;
        if (idleMs >= IDLE_WAIT_MS) {
          idleMs = 0;
          decide('wait');
        }
      } else idleMs = 0;

      const here = laneAt(lane);
      if (invuln <= 0 && here && hitsAt(here, col, tMs)) bump();
    },

    draw(ctx) {
      box(ctx, PALETTE.cream, 0, 0, W, H);
      const top = Math.floor(cam) - 2;
      const visible = (y: number) => y + ROW_H > FIELD_Y && y < FIELD_Y + ROWS * ROW_H;
      // far lanes first, so the health center's roof sits behind the nearer rows
      for (let i = top + ROWS + 3; i >= top; i--) {
        const y = rowY(i - cam);
        const l = laneAt(i);
        const kind = l ? l.kind : 'grass';
        if (!visible(y) && kind !== 'clinic') continue;
        drawLane(ctx, kind, y);
        if (kind === 'clinic') drawClinic(ctx, y);
        if (l && l.kind === 'road') for (const x of carsAt(l, tMs)) drawVehicle(ctx, l.vehicle, x, y, l.dir);
      }
      if (horn) drawHorn(ctx, horn.x - 14, rowY(horn.lane - cam) + 4);

      if (phase !== 'ending' || tick % 2 === 0) {
        const p = Math.min(1, hopMs / HOP_MS);
        const vl = lane - (1 - p) * (lane - from.lane);
        const vc = col - (1 - p) * (col - from.col);
        const lift = p < 1 ? Math.round(Math.sin(p * Math.PI) * 4) : 0;
        const blink = invuln > 0 && tick % 2 === 0;
        if (!blink) drawLola(ctx, Math.round(vc * COL_W), rowY(vl - cam), lift, invuln > INVULNERABLE_MS - 400);
      }

      // the strips go over the street, so anything that scrolls under them is hidden
      box(ctx, PALETTE.cream, 0, 0, W, FIELD_Y);
      box(ctx, PALETTE.cream, 0, FIELD_Y + ROWS * ROW_H, W, H - FIELD_Y - ROWS * ROW_H);
      drawBubble(ctx, advice, calmLine(next()), tick);
      drawStatus(ctx, trust, mult(), message);
      TILES.forEach((_, slot) => drawTile(ctx, slot, pressed?.slot === slot));
      if (phase === 'arrived') drawBanner(ctx, arrivedLines, 'good');
      if (phase === 'ending') drawBanner(ctx, [t('g.tawid.noHearts'), t('g.tawid.araWalks')], 'bad');
    },

    stats(): GameStats {
      const ahead = next();
      const l = laneAt(lane) as Lane;
      const road = roadsInTrip(tripNo);
      const where = t(l.kind === 'road' ? 'g.tawid.d.onRoad' : l.kind === 'clinic' ? 'g.tawid.d.atClinic' : 'g.tawid.d.onGrass');
      const base = t('g.tawid.d.base', { score, hearts, max: HEARTS, trust, mult: mult().toFixed(1), trip: tripNo + 1, where, lane, lanes: trip.lanes.length - 1, col: col + 1, cols: MAX_COL + 1 });
      let description: string;
      if (over) description = t('g.tawid.d.over', { base });
      else if (phase === 'arrived') description = t('g.tawid.d.arrived', { base, lines: arrivedLines.slice(1).join(' ') });
      else if (phase === 'ending') description = t('g.tawid.d.ending', { base });
      else {
        let eyes: string;
        if (ahead && ahead.kind === 'road') {
          const secs = secondsToHit(ahead, col, tMs);
          const vehicle = tx(VEHICLES[ahead.vehicle].name).toLowerCase(); // translated, then lower-cased
          const n = Math.max(1, Math.round(secs ?? 0));
          const when =
            secs === null ? t('g.tawid.d.noneSoon') : secs === 0 ? t('g.tawid.d.inColumn', { vehicle }) : t(n > 1 ? 'g.tawid.d.reaches.many' : 'g.tawid.d.reaches.one', { vehicle, n });
          eyes = t('g.tawid.d.eyes', { vehicle, dir: t(ahead.dir > 0 ? 'g.tawid.d.right' : 'g.tawid.d.left'), when });
        } else eyes = t(ahead ? 'g.tawid.d.noTraffic' : 'g.tawid.d.nothing');
        const guide = advice
          ? t('g.tawid.d.guide', { headline: t(advice.go ? 'g.tawid.tileGo' : 'g.tawid.tileWait'), n: advice.confidence, reason: advice.reason })
          : t('g.tawid.d.guideCalm', { line: calmLine(ahead) });
        const last = message ? ` ${t('g.tawid.d.last', { message: message.text })}` : '';
        description = t('g.tawid.d.play', { base, guide, eyes, last, road });
      }
      return {
        score,
        over,
        hud: [
          { id: 'score', label: t('g.tawid.hud.score'), value: String(score) },
          { id: 'hearts', label: t('g.tawid.hud.hearts'), value: t('g.tawid.hud.heartsValue', { n: hearts, max: HEARTS }), hearts: { n: hearts, max: HEARTS } },
          { id: 'trust', label: t('g.tawid.hud.trust'), value: `${trust}%`, meter: trust },
          { id: 'trip', label: t('g.tawid.hud.trip'), value: String(tripNo + 1) },
        ],
        description,
        recap: over ? buildRecap({ ...counts, trust }) : [],
      };
    },
  };
}

/** The game-over recap: what happened, then automation bias and keeping human judgment. */
export function buildRecap(run: RunSummary & { trust?: number }): string[] {
  const trips = (n: number) => t(n === 1 ? 'g.tawid.r.trip.one' : 'g.tawid.r.trip.many', { n });
  const lanes = (n: number) => t(n === 1 ? 'g.tawid.r.lane.one' : 'g.tawid.r.lane.many', { n });
  const times = (n: number) => t(n === 1 ? 'g.tawid.r.time.one' : 'g.tawid.r.time.many', { n });
  const lines = [
    t('g.tawid.r.summary', { trips: trips(run.trips), lanes: lanes(run.lanes), wrong: lanes(run.aiWrong), overrides: times(run.overrideRight), horns: times(run.horns) }),
  ];
  if (run.trustWrong > 0) lines.push(t('g.tawid.r.trustWrong', { times: times(run.trustWrong) }));
  else lines.push(t('g.tawid.r.neverWrong'));
  if (run.overrideWrong > 0) lines.push(t('g.tawid.r.overrideWrong', { times: times(run.overrideWrong) }));
  lines.push(t('g.tawid.r.how'), t('g.tawid.r.data'), t('g.tawid.r.apps'), t('g.tawid.r.tip'));
  return lines;
}

const tawidLola: GameDef = {
  slug: 'tawid-lola',
  name: 'Tawid, Lola!',
  width: W,
  height: H,
  goodRun: 1000,
  howTo: [
    'Help Lola cross the street to the health center. An AI guide says GO or WAIT for the next lane. It is usually right, and sometimes confidently wrong.',
    'Step forward with the GO tile, the Up arrow or W, or tap above Lola. Wait with WAIT, Space or Enter, or tap Lola. Move sideways with the Left and Right arrows or A and D. Down steps back.',
    'Use your own eyes on the traffic. If a vehicle is about to reach Lola, the horn beeps, Lola steps back to the last grass and you lose a heart. You have 3 hearts.',
    'The Trust Meter goes up when you follow the guide and it was right, and when you override it and it was wrong. It goes down when you follow a wrong call or ignore a right one. A higher meter gives a higher score multiplier, up to x2.',
    'Standing still for a moment in front of a road counts as choosing to wait. Each new lane scores 10 points and each trip to the health center 100. The next street is busier.',
  ],
  briefing: [
    { title: 'Come on, Lola, to the health center!', text: 'Lola needs to cross a busy street to reach the health center. You will guide her, with a little help from an AI voice.', mood: 'happy' },
    { title: 'The AI guide is helpful but not perfect', text: 'The guide says GO or WAIT for each lane, and it is usually right. Sometimes it is sure and wrong, and it sounds the same either way.', mood: 'think' },
    { title: 'How to play', text: 'Tap GO or WAIT, or use the arrow keys. Watch the traffic yourself. The Trust Meter rises when you follow a right call and when you catch a wrong one.', mood: 'idle' },
    { title: 'Your eyes count', text: 'Health apps help, but your eyes and your health worker know your situation. Do not let a confident voice do all your looking.', mood: 'wow' },
    { title: 'When should I trust it?', text: 'Trust the app when it matches what you see. Speak up, and check, when it does not.', mood: 'happy' },
  ],
  takeaway: 'When should I trust it? When the app matches what I see. When it does not, I stop and check with a person.',
  create: createTawid,
};

export default tawidLola;
