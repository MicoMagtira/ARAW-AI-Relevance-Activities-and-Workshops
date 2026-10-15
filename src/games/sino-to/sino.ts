// Sino 'To? (deepfakes and voice-clone scams): a phone switchboard game (docs/SPEC.md section 5).
// A call or voice note comes in as a transcript on a caller card. Verify it with the family secret question, a call back to the
// saved number, another relative or the official hotline, then HELP THEM or HANG UP + REPORT. Some callers are AI voice clones.
// Calls come only from the seeded generator and never depend on the player's choices, so the Daily Challenge matches.
import { PALETTE, box, text } from '../engine/draw';
import type { InputFrame } from '../engine/input';
import { createRng, type Rng } from '../engine/rng';
import type { GameDef, GameInstance, GameStats } from '../engine/types';
import { drawPerson, type Face } from '../feed-mo-to/art';
import {
  BUBBLE_CHARS,
  HANGUP_SLOT,
  HEAD_CHARS,
  HEAD_X,
  H,
  HELP_SLOT,
  LESSON_LINES,
  LESSON_Y,
  LINE_CHARS,
  LINE_H,
  W,
  drawBubble,
  drawCheckTile,
  drawDecisionTile,
  drawLog,
  drawStamp,
  drawStrip,
  drawWave,
  moveSlot,
  slotAt,
  wrapText,
} from './art';
import {
  CHECKS,
  CHECK_INFO,
  HEARTS,
  createCallGenerator,
  evidence,
  judge,
  multiplierFor,
  type Call,
  type CheckId,
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

/** The headline and sub-line of the reveal (21 characters at most each). */
export function headlineFor(j: Judgement): [string, string] {
  if (j.result === 'stopped') return j.verified ? ['SCAM STOPPED!', `+${j.total} (X${j.multiplier})`] : ['LUCKY GUESS!', `+${j.total}. CHECK NEXT TIME`.slice(0, HEAD_CHARS)];
  if (j.result === 'helped') return j.verified ? ['REAL CALL HELPED!', `+${j.total} (X${j.multiplier})`] : ['LUCKY GUESS!', `+${j.total}. CHECK NEXT TIME`.slice(0, HEAD_CHARS)];
  if (j.result === 'paid') return ['YOU HELPED A SCAM!', 'LOST A HEART'];
  return ['THAT WAS A REAL CALL', 'LOST A HEART'];
}

const plain = (call: Call): string => `${call.channel === 'CALL' ? 'a call' : 'a voice note'} from ${call.callerName.toLowerCase()} (${call.tag === 'NEW NO.' ? 'new number' : call.tag === 'SAVED' ? 'saved contact' : 'unknown number'})`;

function createSino({ rng }: { seed: string; rng: Rng }): GameInstance {
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

  const fullMs = () => RING_MS + (call.text.length / TYPE_CPS) * 1000;

  function nextCall() {
    index += 1;
    call = calls.next(index);
    phase = 'call';
    phaseMs = 0;
    used = [];
    judgement = null;
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
    phase = 'result';
    phaseMs = 0;
  }

  function activate(slot: number) {
    if (slot === HELP_SLOT) decide('help');
    else if (slot === HANGUP_SLOT) decide('hangup');
    else {
      const id = CHECKS[slot];
      if (id && !used.includes(id)) used = [...used, id];
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
      drawBubble(ctx, wrapText(call.text, BUBBLE_CHARS), revealed ? call.text.length : typed, !revealed && phaseMs < RING_MS, tick);

      if (revealed && judgement) {
        const j = judgement;
        const [head, sub] = headlineFor(j);
        drawStrip(ctx, `${call.channel}: ${call.callerName}, ${call.tag}`);
        drawStamp(ctx, call.scam);
        const color = j.heartLost ? PALETTE.fake : PALETTE.fact;
        text(ctx, head, HEAD_X, 76, { size: 8, color });
        text(ctx, sub, HEAD_X, 86, { size: 8, color: PALETTE.ink });
        wrapText(call.story.lesson, LINE_CHARS)
          .slice(0, LESSON_LINES)
          .forEach((line, i) => text(ctx, line, 6, LESSON_Y + i * LINE_H, { size: 8, color: PALETTE.ink }));
      } else {
        drawStrip(ctx, `${call.channel}: ${call.callerName}, ${call.tag}`);
        drawLog(ctx, used.map((c) => call.results[c]));
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
      const base = `Sino 'To?. Score ${score}. Hearts ${hearts} of ${HEARTS}. Streak ${streak}. Call ${index + 1}, ${plain(call)}: "${call.text}"`;
      const found = `${used.map((c) => call.results[c].text).join(' ')}`;
      let description: string;
      if (over) {
        description = `${base} The switchboard is closed: no hearts left.`;
      } else if (phase === 'result' && judgement) {
        const j = judgement;
        const outcome =
          j.result === 'stopped'
            ? `You hung up and reported it. ${j.verified ? `Scam stopped, ${j.total} points.` : `A lucky guess, ${j.total} points.`}`
            : j.result === 'helped'
              ? `You helped. ${j.verified ? `Real call helped, ${j.total} points.` : `A lucky guess, ${j.total} points.`}`
              : j.result === 'paid'
                ? 'You helped a scammer and lost a heart.'
                : 'You hung up on a real call and lost a heart.';
        const stamp = call.scam ? 'ARAW GAME FAKE stamp: this was an AI voice-clone scam.' : 'Genuine call stamp: this call was real.';
        description = `${base} ${outcome} ${stamp} ${call.story.lesson}`;
      } else {
        const left = CHECKS.filter((c) => !used.includes(c)).map((c) => CHECK_INFO[c].name);
        const slotName = sel === HELP_SLOT ? 'the Help them button' : sel === HANGUP_SLOT ? 'the Hang up and report button' : `the check to ${CHECK_INFO[CHECKS[sel] as CheckId].name}`;
        description = `${base} Checks made: ${used.length === 0 ? 'none yet.' : found}${evidence(call, used) === 'unclear' ? '' : ' That settles it.'} Checks left: ${left.length > 0 ? left.join(', ') : 'none'}. Highlighted: ${slotName}. Press Enter on a check to make it, then choose Help them or Hang up and report.`;
      }
      return {
        score,
        over,
        hud: [
          { id: 'score', label: 'Score', value: String(score) },
          { id: 'hearts', label: 'Hearts', value: `${hearts} of ${HEARTS}`, hearts: { n: hearts, max: HEARTS } },
          { id: 'streak', label: 'Streak', value: streak > 0 ? `${streak} (x${multiplierFor(streak)})` : '0' },
        ],
        description,
        recap: over ? buildRecap({ calls: index + 1, ...counts, bestStreak }) : [],
      };
    },
  };
}

/** The game-over recap: what happened, then how voice clones work and how to verify a call. */
export function buildRecap(run: RunSummary): string[] {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const lines = [
    `You took ${plural(run.calls, 'call', 'calls')}: ${plural(run.stopped, 'scam', 'scams')} stopped, ${plural(run.helped, 'real call', 'real calls')} helped, ${plural(run.paid, 'scam', 'scams')} you helped and ${plural(run.hungUp, 'real call', 'real calls')} you hung up on. Best streak: ${run.bestStreak}.`,
    run.guesses > 0
      ? `You decided ${plural(run.guesses, 'time', 'times')} without proof from a check. A guess can be right, but it is still a guess: a clone sounds just like family.`
      : 'Every decision had proof from a check. That is the habit that protects you.',
    'How it works: AI can copy a voice from a short clip, so a voice that sounds like family is not proof. Scammers fake hospital emergencies, a doctor or a bank to rush you.',
    'Verify through a number or a person you already know: call back the saved number, ask another relative, use the official hotline. Never use a number the caller gives you.',
    'Never share an OTP or PIN, and never stop prescribed medicine because of a call or an ad. Real emergencies can wait for a two-minute check, and real family will understand.',
    'Tip: set up a family secret question today. Only your family should know the answer.',
  ];
  return lines;
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
    { title: "Ring ring! Sino 'to?", text: 'A call comes in: "Anak, I am in the hospital, send money now!" Is it really your family? Your job at the switchboard is to find out.', mood: 'wow' },
    { title: 'AI can copy a voice', text: 'A scammer needs only a short clip to make an AI copy of a voice. It can sound just like your mother, your doctor or your bank.', mood: 'think' },
    { title: 'How to play', text: 'Tap a check to verify the caller: secret question, call back, ask a relative, or the hotline. Then help them or hang up and report.', mood: 'idle' },
    { title: 'Hurry is the red flag', text: 'Scammers fake hospital emergencies to rush you. Real emergencies can wait two minutes for a check.', mood: 'happy' },
    { title: 'Kailan ako magtitiwala?', text: 'Trust a call after you verify it through a number or a person you already know.', mood: 'happy' },
  ],
  takeaway: 'Kailan ako magtitiwala? After I verify the call through a number or a person I already know, never the voice alone.',
  create: createSino,
};

export default sinoTo;
