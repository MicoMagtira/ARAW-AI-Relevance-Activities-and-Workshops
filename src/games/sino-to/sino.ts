// Sino 'To? (deepfakes and voice-clone scams): a phone switchboard game (docs/SPEC.md section 5).
// A call or voice note comes in as a transcript on a caller card. Verify it with the family secret question, a call back to the
// saved number, another relative or the official hotline, then HELP THEM or HANG UP + REPORT. Some callers are AI voice clones.
// Calls come only from the seeded generator and never depend on the player's choices, so the Daily Challenge matches.
import { t, type StringKey } from '../../app/i18n';
import { tx } from '../../i18n/runtime';
import { PALETTE, box, text, type Block } from '../engine/draw';
import type { InputFrame } from '../engine/input';
import { createRng, type Rng } from '../engine/rng';
import type { Cue, GameDef, GameInstance, GameStats } from '../engine/types';
import { silent } from '../engine/cues';
import { drawPerson, type Face } from '../feed-mo-to/art';
import {
  HANGUP_SLOT,
  HEAD_X,
  H,
  HELP_SLOT,
  W,
  drawBubble,
  drawCheckTile,
  drawDecisionTile,
  drawLesson,
  drawLog,
  drawStamp,
  drawStrip,
  drawWave,
  measureBubble,
  measureLesson,
  moveSlot,
  slotAt,
} from './art';
import {
  CHECKS,
  CHECK_INFO,
  HEARTS,
  createCallGenerator,
  evidence,
  fill,
  judge,
  multiplierFor,
  type Call,
  type CheckId,
  type CheckResult,
  type Choice,
  type Judgement,
} from './calls';

const RING_MS = 600;
/** Transcript speed: characters per second. Any press or tap shows all of it. */
const TYPE_CPS = 90;
const GOOD_RESULT_MS = 4200;
const BAD_RESULT_MS = 5600;
/** The reveal can be skipped with a press or tap after this long. */
const SKIP_AFTER_MS = 1100;

type Phase = 'call' | 'result';

export interface RunSummary {
  calls: number;
  /** Fakes you hung up on. */
  stopped: number;
  /** Real calls you helped. */
  helped: number;
  /** Fakes you helped (money or codes sent). */
  paid: number;
  /** Real calls you hung up on. */
  hungUp: number;
  /** Decisions made without proof from a check. */
  guesses: number;
  bestStreak: number;
}

/** The headline and sub-line of the reveal, in the player's language (each fits beside the stamp; long ones shrink). */
export function headlineFor(j: Judgement): [string, string] {
  const points = t('g.sino.h.points', { n: j.total, mult: j.multiplier });
  const lucky: [string, string] = [t('g.sino.h.lucky'), t('g.sino.h.checkNext', { n: j.total })];
  if (j.result === 'stopped') return j.verified ? [t('g.sino.h.stopped'), points] : lucky;
  if (j.result === 'helped') return j.verified ? [t('g.sino.h.helped'), points] : lucky;
  if (j.result === 'paid') return [t('g.sino.h.paid'), t('g.sino.h.lostHeart')];
  return [t('g.sino.h.hungUp'), t('g.sino.h.lostHeart')];
}

/** What a check found, in the player's language. */
export const resultText = (r: CheckResult): string => t(r.key, r.vars);

/** The transcript in the player's language: the story's translated text with the same blanks filled in. */
export const transcript = (call: Call): string =>
  fill(tx(call.story.text), Object.fromEntries(Object.entries(call.values).map(([k, v]) => [k, tx(v)])));

const CHANNEL: Record<string, StringKey> = { CALL: 'g.sino.ch.call', 'VOICE NOTE': 'g.sino.ch.voice' };
const TAG: Record<string, StringKey> = { UNKNOWN: 'g.sino.tag.unknown', 'NEW NO.': 'g.sino.tag.new', SAVED: 'g.sino.tag.saved' };
const TAG_SAID: Record<string, StringKey> = { UNKNOWN: 'g.sino.d.unknown', 'NEW NO.': 'g.sino.d.newNumber', SAVED: 'g.sino.d.saved' };
const label = (keys: Record<string, StringKey>, code: string): string => (keys[code] ? t(keys[code]) : code);

/** The strip under the bubble, in parts: "CALL" ": " "MAMA" ", " "SAVED". */
const stripFor = (call: Call): string[] => [label(CHANNEL, call.channel), ': ', call.callerName, ', ', label(TAG, call.tag)];

const plain = (call: Call): string =>
  t(call.channel === 'CALL' ? 'g.sino.d.call' : 'g.sino.d.voice', { name: call.callerName.toLowerCase(), tag: label(TAG_SAID, call.tag) });

function createSino({ rng, cue = silent }: { seed: string; rng: Rng; cue?: Cue }): GameInstance {
  const calls = createCallGenerator(createRng(`${rng()}:sino-calls`));

  let index = 0;
  let call: Call = calls.next(0);
  let phase: Phase = 'call';
  let phaseMs = 0;
  let used: CheckId[] = [];
  let sel = 0;
  let hearts = HEARTS;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let judgement: Judgement | null = null;
  let over = false;
  let tick = 0;
  let tickMs = 0;
  let lastPointer = '';
  const counts = { stopped: 0, helped: 0, paid: 0, hungUp: 0, guesses: 0 };
  let ringing = true; // the phone rings once as each call starts (on the next step)
  // the transcript as shown: translated, then laid out once per call
  let said = transcript(call);
  let bubble: Block = measureBubble(said);
  let lesson: Block | null = null;

  const fullMs = () => RING_MS + ([...said].length / TYPE_CPS) * 1000;

  function nextCall() {
    index += 1;
    call = calls.next(index);
    said = transcript(call);
    bubble = measureBubble(said);
    lesson = null;
    phase = 'call';
    phaseMs = 0;
    used = [];
    judgement = null;
    ringing = true;
  }

  function decide(choice: Choice) {
    const j = judge(call, choice, used, streak);
    judgement = j;
    score += j.total;
    streak = j.streak;
    bestStreak = Math.max(bestStreak, streak);
    counts[j.result] += 1;
    if (!j.verified) counts.guesses += 1;
    if (j.heartLost) hearts -= 1;
    if (j.result === 'stopped') cue('scamCaught');
    else if (j.result === 'helped') cue('correct', Math.max(0, Math.min(5, streak - 1)));
    else if (j.result === 'paid') cue('wrong');
    else cue('hangUp');
    phase = 'result';
    phaseMs = 0;
  }

  function activate(slot: number) {
    if (slot === HELP_SLOT) decide('help');
    else if (slot === HANGUP_SLOT) decide('hangup');
    else {
      const id = CHECKS[slot];
      if (id && !used.includes(id)) {
        used = [...used, id];
        cue('verify');
      }
    }
  }

  const face = (): Face => {
    if (phase === 'result') return judgement?.heartLost ? 'worried' : 'happy';
    return call.story.urgent ? 'worried' : 'happy';
  };

  return {
    step(dtMs, input: InputFrame) {
      if (over) return;
      tickMs += dtMs;
      if (tickMs >= 150) {
        tickMs -= 150;
        tick += 1;
      }
      phaseMs += dtMs;
      if (ringing) {
        ringing = false;
        cue('ring');
      }
      const pressed = input.actions.length > 0 || input.taps.length > 0;

      if (phase === 'result') {
        const good = judgement ? !judgement.heartLost : true;
        if (phaseMs >= (good ? GOOD_RESULT_MS : BAD_RESULT_MS) || (phaseMs >= SKIP_AFTER_MS && pressed)) {
          if (hearts <= 0) over = true;
          else nextCall();
        }
        return;
      }

      // any press also shows the whole transcript at once
      if (pressed) phaseMs = Math.max(phaseMs, fullMs());
      for (const action of input.actions) {
        if (action === 'act') activate(sel);
        else sel = moveSlot(sel, action);
        if (phase !== 'call') return;
      }
      const p = input.pointer;
      const key = p && !p.down ? `${Math.round(p.x)},${Math.round(p.y)}` : '';
      if (p && !p.down && key !== lastPointer) {
        const hover = slotAt(p.x, p.y);
        if (hover >= 0) sel = hover;
      }
      lastPointer = key;
      for (const tap of input.taps) {
        const slot = slotAt(tap.x, tap.y);
        if (slot < 0) continue;
        sel = slot;
        activate(slot);
        if (phase !== 'call') return;
      }
    },

    draw(ctx) {
      box(ctx, PALETTE.cream, 0, 0, W, H);
      const shake = phase === 'call' && phaseMs < RING_MS ? (tick % 2 === 0 ? -1 : 1) : 0;
      drawPerson(ctx, 6 + shake, 6, call.look, face());
      const revealed = phase === 'result';
      drawWave(ctx, tick, revealed ? (call.scam ? 'fake' : 'real') : phaseMs < RING_MS ? 'quiet' : 'live');
      const typed = Math.floor(Math.max(0, phaseMs - RING_MS) * (TYPE_CPS / 1000));
      drawBubble(ctx, bubble, revealed ? Infinity : typed, !revealed && phaseMs < RING_MS, tick);

      drawStrip(ctx, stripFor(call));
      if (revealed && judgement) {
        const j = judgement;
        const [head, sub] = headlineFor(j);
        drawStamp(ctx, call.scam);
        const color = j.heartLost ? PALETTE.fake : PALETTE.fact;
        text(ctx, head, HEAD_X, 76, { size: 8, color });
        text(ctx, sub, HEAD_X, 86, { size: 8, color: PALETTE.ink });
        lesson ??= measureLesson(call.story.lesson);
        drawLesson(ctx, lesson);
      } else {
        drawLog(ctx, used.map((c) => ({ verdict: call.results[c].verdict, text: resultText(call.results[c]) })));
      }

      const locked = phase !== 'call';
      CHECKS.forEach((c, s) => {
        const verdict = used.includes(c) ? call.results[c].verdict : null;
        drawCheckTile(ctx, s, { selected: sel === s && !locked, verdict, locked });
      });
      drawDecisionTile(ctx, HELP_SLOT, { selected: sel === HELP_SLOT && !locked, locked });
      drawDecisionTile(ctx, HANGUP_SLOT, { selected: sel === HANGUP_SLOT && !locked, locked });
    },

    stats(): GameStats {
      const base = t('g.sino.d.base', { score, hearts, max: HEARTS, streak, n: index + 1, caller: plain(call), text: said });
      const found = used.map((c) => resultText(call.results[c])).join(' ');
      let description: string;
      if (over) {
        description = `${base} ${t('g.sino.d.over')}`;
      } else if (phase === 'result' && judgement) {
        const j = judgement;
        const outcome =
          j.result === 'stopped'
            ? t(j.verified ? 'g.sino.d.stoppedVerified' : 'g.sino.d.stoppedGuess', { n: j.total })
            : j.result === 'helped'
              ? t(j.verified ? 'g.sino.d.helpedVerified' : 'g.sino.d.helpedGuess', { n: j.total })
              : j.result === 'paid'
                ? t('g.sino.d.paid')
                : t('g.sino.d.hungUp');
        const stamp = t(call.scam ? 'g.sino.d.stampFake' : 'g.sino.d.stampReal');
        description = `${base} ${outcome} ${stamp} ${tx(call.story.lesson)}`;
      } else {
        const left = CHECKS.filter((c) => !used.includes(c)).map((c) => tx(CHECK_INFO[c].name));
        const slotName =
          sel === HELP_SLOT
            ? t('g.sino.d.slotHelp')
            : sel === HANGUP_SLOT
              ? t('g.sino.d.slotHangup')
              : t('g.sino.d.slotCheck', { check: CHECK_INFO[CHECKS[sel] as CheckId].name });
        const made = t('g.sino.d.checksMade', { found: used.length === 0 ? t('g.sino.d.noneYet') : found });
        const settles = evidence(call, used) === 'unclear' ? '' : ` ${t('g.sino.d.settles')}`;
        const checksLeft = t('g.sino.d.checksLeft', { left: left.length > 0 ? left.join(', ') : t('g.sino.d.none') });
        description = `${base} ${made}${settles} ${checksLeft} ${t('g.sino.d.highlighted', { slot: slotName })} ${t('g.sino.d.howTo')}`;
      }
      return {
        score,
        over,
        hud: [
          { id: 'score', label: t('g.sino.hud.score'), value: String(score) },
          { id: 'hearts', label: t('g.sino.hud.hearts'), value: t('g.sino.hud.heartsValue', { n: hearts, max: HEARTS }), hearts: { n: hearts, max: HEARTS } },
          { id: 'streak', label: t('g.sino.hud.streak'), value: streak > 0 ? t('g.sino.hud.streakValue', { n: streak, mult: multiplierFor(streak) }) : '0' },
        ],
        description,
        recap: over ? buildRecap({ calls: index + 1, ...counts, bestStreak }) : [],
      };
    },
  };
}

/** The game-over recap: what happened, then how voice clones work and how to verify a call. */
export function buildRecap(run: RunSummary): string[] {
  const plural = (n: number, one: StringKey, many: StringKey) => t(n === 1 ? one : many, { n });
  const scams = (n: number) => plural(n, 'g.sino.n.scam.one', 'g.sino.n.scam.many');
  const realCalls = (n: number) => plural(n, 'g.sino.n.realCall.one', 'g.sino.n.realCall.many');
  return [
    t('g.sino.recap.took', {
      calls: plural(run.calls, 'g.sino.n.call.one', 'g.sino.n.call.many'),
      stopped: scams(run.stopped),
      helped: realCalls(run.helped),
      paid: scams(run.paid),
      hungUp: realCalls(run.hungUp),
      best: run.bestStreak,
    }),
    run.guesses > 0 ? t('g.sino.recap.guesses', { times: plural(run.guesses, 'g.sino.n.time.one', 'g.sino.n.time.many') }) : t('g.sino.recap.proof'),
    t('g.sino.recap.how'),
    t('g.sino.recap.verify'),
    t('g.sino.recap.otp'),
    t('g.sino.recap.tip'),
  ];
}

const sinoTo: GameDef = {
  slug: 'sino-to',
  name: "Sino 'To?",
  width: W,
  height: H,
  goodRun: 1200,
  howTo: [
    'Calls and voice notes come in as transcripts. Some are real, and some are AI voice clones. Read, check, then decide.',
    'Tap or click a check to make it (or use the arrow keys, then Space or Enter): the family secret question, a call back to the saved number, ask another relative, or the official hotline.',
    'Then choose HELP THEM or HANG UP + REPORT. Helping a scam, or hanging up on a real emergency, costs a heart. You have 3 hearts.',
    'A decision backed by proof scores 100 points, plus up to 60 for using few checks. Verified calls in a row raise your multiplier up to x2. A guess without proof scores only 20.',
    'Some checks cannot settle a call (the phone rings out, the line is busy). Try another one. Later calls leave fewer checks that settle it.',
  ],
  briefing: [
    { title: 'Ring ring! Who is this?', text: 'A call comes in: "It is me, I am in the hospital, send money now!" Is it really your family? Your job at the switchboard is to find out.', mood: 'wow' },
    { title: 'AI can copy a voice', text: 'A scammer needs only a short clip to make an AI copy of a voice. It can sound just like your mother, your doctor or your bank.', mood: 'think' },
    { title: 'How to play', text: 'Tap a check to verify the caller: secret question, call back, ask a relative, or the hotline. Then help them or hang up and report.', mood: 'idle' },
    { title: 'Hurry is the red flag', text: 'Scammers fake hospital emergencies to rush you. Real emergencies can wait two minutes for a check.', mood: 'happy' },
    { title: 'When should I trust it?', text: 'Trust a call after you verify it through a number or a person you already know.', mood: 'happy' },
  ],
  takeaway: 'When should I trust it? After I verify the call through a number or a person I already know, never the voice alone.',
  create: createSino,
};

export default sinoTo;
