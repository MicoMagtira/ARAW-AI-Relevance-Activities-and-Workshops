// Lamok Lamay (how AI "sees": computer-vision errors): a whack-a-mole with an AI camera overlay (docs/SPEC.md section 5).
// Water containers pop up. The AI camera boxes "larvae" with a confidence, but it makes two kinds of mistakes: boxes around
// seeds and leaf bits (false alarms), and larvae with no box (misses). WHACK real larvae, REJECT wrong boxes, and tap a
// larva with no box to add it. Whatever is left when the time is up becomes a mosquito. Scans come only from the seeded
// generator and never depend on the player, so the Daily Challenge is the same for everyone.
import { t } from '../../app/i18n';
import { tx } from '../../i18n/runtime';
import { PALETTE, box, measureLine, text } from '../engine/draw';
import type { InputFrame } from '../engine/input';
import { createRng, type Rng } from '../engine/rng';
import type { Cue, GameDef, GameInstance, GameStats } from '../engine/types';
import { silent, timerCue } from '../engine/cues';
import {
  DONE_SLOT,
  H,
  MSG_Y,
  REJECT_SLOT,
  VIEW,
  W,
  WHACK_SLOT,
  drawAiBox,
  drawBurst,
  drawContainer,
  drawCursor,
  drawHeader,
  drawMeterRow,
  drawMosquito,
  drawObject,
  drawPanel,
  drawToolTile,
  drawWater,
  slotAt,
} from './art';
import {
  CONTAINERS,
  COLS,
  HEARTS,
  MISTAKE_POINTS,
  OBJECTS,
  POINTS,
  TIME_BONUS_PER_SECOND,
  WATER,
  catchRateOf,
  createScanGenerator,
  driftSpeed,
  falseBoxesIn,
  feedback,
  isCorrect,
  isLarva,
  isMistake,
  itemAt,
  itemPos,
  judgeTap,
  larvaeIn,
  missesIn,
  multiplierFor,
  precisionOf,
  settle,
  type AiTally,
  type Scan,
  type ScanItem,
  type Settlement,
  type TapResult,
  type Tool,
} from './scans';

/** The container slides up, then the AI camera sweeps across the water and draws its boxes. */
export const POP_MS = 400;
export const SCAN_MS = 800;
export const READY_MS = POP_MS + SCAN_MS;
/** After the time is up the truth shows (mosquitoes, wrong boxes), then the result panel. */
const REVEAL_MS = 1400;
const GOOD_RESULT_MS = 3200;
const BAD_RESULT_MS = 4200;
const FX_MS = 700;
/** Score popups float up, but no higher than just inside the container's rim. */
const POPUP_TOP = 26;

type Phase = 'live' | 'result';

export interface RunSummary {
  scans: number;
  /** Larvae whacked in an AI box. */
  whacked: number;
  /** Larvae the AI missed that you added. */
  added: number;
  /** Wrong boxes you rejected. */
  rejected: number;
  mistakes: number;
  /** Larvae that grew into mosquitoes. */
  escaped: number;
  bestStreak: number;
  tally: AiTally;
  /** The highest confidence on a wrong box the AI drew, or 0 if it drew none. */
  topWrongConfidence: number;
}

type PluralKey = 'container' | 'larva' | 'wrongBox';
const plural = (n: number, key: PluralKey): string => t(n === 1 ? `g.lamok.n.${key}.one` : `g.lamok.n.${key}.many`, { n });

/** The result panel text: a headline, the AI's mistakes in this container, then the dengue tip (each line fits the panel). */
export function resultLines(scan: Scan, s: Settlement, bonus: number): { lines: string[]; good: boolean } {
  const good = s.escaped === 0;
  const headline = good
    ? larvaeIn(scan) === 0
      ? t('g.lamok.res.empty')
      : bonus > 0
        ? t('g.lamok.res.allBonus', { n: bonus })
        : t('g.lamok.res.all')
    : t(s.escaped === 1 ? 'g.lamok.res.escaped.one' : 'g.lamok.res.escaped.many', { n: s.escaped });
  const fp = falseBoxesIn(scan);
  const fn = missesIn(scan);
  const ai =
    fp + fn === 0
      ? t('g.lamok.res.aiClean')
      : t('g.lamok.res.ai', { boxes: t(fp === 1 ? 'g.lamok.res.falseBox.one' : 'g.lamok.res.falseBox.many', { n: fp }), misses: t(fn === 1 ? 'g.lamok.res.miss.one' : 'g.lamok.res.miss.many', { n: fn }) });
  return { lines: [headline, ai, ...CONTAINERS[scan.container].tip.map(tx)], good };
}

/** The AI's mistakes in a container, as a sentence for the text description. */
function aiSentence(scan: Scan): string {
  const fp = falseBoxesIn(scan);
  const fn = missesIn(scan);
  if (fp + fn === 0) return t('g.lamok.desc.aiClean');
  return t('g.lamok.desc.ai', { boxes: t(fp === 1 ? 'g.lamok.desc.falseBox.one' : 'g.lamok.desc.falseBox.many', { n: fp }), misses: t(fn === 1 ? 'g.lamok.desc.miss.one' : 'g.lamok.desc.miss.many', { n: fn }) });
}

/** Where an item sits in the water, in words, for the text description. */
function where(item: ScanItem): string {
  const col = Math.min(COLS - 1, Math.max(0, Math.floor(((item.x - WATER.x) / WATER.w) * COLS)));
  const cols = ['g.lamok.desc.farLeft', 'g.lamok.desc.left', 'g.lamok.desc.right', 'g.lamok.desc.farRight'] as const;
  return t('g.lamok.desc.where', { col: t(cols[col] ?? 'g.lamok.desc.left'), row: t(item.y < WATER.y + WATER.h / 2 ? 'g.lamok.desc.top' : 'g.lamok.desc.bottom') });
}

function createLamok({ rng, cue = silent }: { seed: string; rng: Rng; cue?: Cue }): GameInstance {
  const scans = createScanGenerator(createRng(`${rng()}:lamok-scans`));

  let index = 0;
  let scan: Scan = scans.next(0);
  let live = new Set<number>(scan.items.map((i) => i.id));
  let phase: Phase = 'live';
  let phaseMs = 0;
  let tool: Tool = 'whack';
  /** The highlighted target: an index into `targets()`, where the last slot is the DONE tile. */
  let cur = 0;
  let showCursor = false;
  let hearts = HEARTS;
  let score = 0;
  let streak = 0;
  let bestStreak = 0;
  let over = false;
  let tick = 0;
  let tickMs = 0;
  let lastPointer = '';
  let message = { text: t('g.lamok.msg.start'), tone: 'plain' as 'plain' | 'good' | 'bad' };
  let fx: Array<{ x: number; y: number; ms: number; label: string; color: string; burst: boolean }> = [];
  let tally: AiTally = { tp: 0, fp: 0, fn: 0 };
  let topWrong = 0;
  let settlement: Settlement | null = null;
  let panel: { lines: string[]; good: boolean } | null = null;
  const counts = { scans: 0, whacked: 0, added: 0, rejected: 0, mistakes: 0, escaped: 0 };
  let swept = false; // the camera sweep sound plays once per container

  const ready = () => phaseMs >= READY_MS;
  const limit = () => scan.timeMs;
  const timeLeft = () => Math.max(0, limit() - Math.max(0, phaseMs - READY_MS));
  const pos = (item: ScanItem) => itemPos(item, phaseMs, driftSpeed(index));
  const liveItems = () => scan.items.filter((i) => live.has(i.id));
  /** Items the keyboard can step through, left to right. */
  const targets = () => liveItems().sort((a, b) => a.x - b.x || a.y - b.y);
  const clampCur = () => {
    cur = Math.min(Math.max(0, cur), targets().length);
  };

  function startScan(next: number) {
    index = next;
    scan = scans.next(index);
    live = new Set(scan.items.map((i) => i.id));
    phase = 'live';
    phaseMs = 0;
    cur = 0;
    fx = [];
    settlement = null;
    panel = null;
    swept = false;
    message = { text: t('g.lamok.msg.start'), tone: 'plain' };
  }

  function finish(early: boolean) {
    const s = settle(scan, live);
    const leftBoxedWrong = scan.items.filter((i) => live.has(i.id) && i.boxed && !isLarva(i));
    tally = { tp: tally.tp + s.boxedLarvae, fp: tally.fp + s.falseLeft, fn: tally.fn + s.missedLeft };
    for (const item of leftBoxedWrong) topWrong = Math.max(topWrong, item.confidence);
    hearts -= s.escaped;
    counts.escaped += s.escaped;
    counts.scans += 1;
    const bonus = early && s.escaped === 0 ? Math.floor((timeLeft() / 1000) * TIME_BONUS_PER_SECOND) : 0;
    score += bonus;
    settlement = s;
    panel = resultLines(scan, s, bonus);
    if (s.escaped > 0) streak = 0;
    cue(s.escaped > 0 ? 'wrong' : 'correct');
    phase = 'result';
    phaseMs = 0;
  }

  function apply(item: ScanItem | null, x: number, y: number) {
    const result: TapResult = judgeTap(item, tool);
    let points = 0;
    if (isCorrect(result)) {
      points = Math.round(POINTS[result] * multiplierFor(streak));
      score += points;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else if (isMistake(result)) {
      score = Math.max(0, score - MISTAKE_POINTS);
      streak = 0;
      counts.mistakes += 1;
    }
    if (item && (result === 'whack' || result === 'add')) {
      live.delete(item.id);
      if (result === 'whack') {
        counts.whacked += 1;
        tally = { ...tally, tp: tally.tp + 1 };
      } else {
        counts.added += 1;
        tally = { ...tally, fn: tally.fn + 1 };
      }
    } else if (item && result === 'reject') {
      live.delete(item.id);
      counts.rejected += 1;
      tally = { ...tally, fp: tally.fp + 1 };
      topWrong = Math.max(topWrong, item.confidence);
    }
    message = { text: feedback(result, item, points), tone: isCorrect(result) ? 'good' : isMistake(result) ? 'bad' : 'plain' };
    if (isMistake(result)) cue('whiff');
    else if (result === 'whack') cue('whack');
    else if (isCorrect(result)) cue('fixAI'); // a wrong box rejected or a missed larva added: you fixed the AI
    if (isCorrect(result) || isMistake(result)) {
      const good = isCorrect(result);
      fx.push({ x, y, ms: 0, label: good ? `+${points}` : `-${MISTAKE_POINTS}`, color: good ? PALETTE.fact : PALETTE.fake, burst: good });
    }
    clampCur();
  }

  function activateTarget(i: number) {
    const list = targets();
    const item = list[i];
    if (!item) return finish(true);
    const p = pos(item);
    apply(item, p.x, p.y);
  }

  return {
    step(dtMs, input: InputFrame) {
      if (over) return;
      tickMs += dtMs;
      if (tickMs >= 150) {
        tickMs -= 150;
        tick += 1;
      }
      const leftBefore = timeLeft();
      phaseMs += dtMs;
      fx = fx.map((f) => ({ ...f, ms: f.ms + dtMs })).filter((f) => f.ms < FX_MS);
      const pressed = input.actions.length > 0 || input.taps.length > 0;

      if (phase === 'result') {
        const reveal = settlement && settlement.escaped + settlement.falseLeft > 0 ? REVEAL_MS : 0;
        const bad = settlement ? settlement.escaped > 0 : false;
        if (phaseMs >= reveal + (bad ? BAD_RESULT_MS : GOOD_RESULT_MS) || (phaseMs >= reveal + 600 && pressed)) {
          if (hearts <= 0) over = true;
          else startScan(index + 1);
        }
        return;
      }

      // the first press only skips the pop-up and the camera sweep
      if (!swept && phaseMs >= POP_MS) {
        swept = true;
        cue('aiScan');
      }
      if (!ready()) {
        if (pressed) phaseMs = READY_MS;
        return;
      }
      if (timeLeft() <= 0) return finish(false);
      const tk = timerCue(leftBefore, timeLeft());
      if (tk) cue(tk);

      for (const action of input.actions) {
        if (action === 'act') activateTarget(cur);
        else if (action === 'up') tool = 'whack';
        else if (action === 'down') tool = 'reject';
        else cur += action === 'left' ? -1 : 1;
        showCursor = true;
        clampCur();
        if (phase !== 'live') return;
      }
      const p = input.pointer;
      const key = p && !p.down ? `${Math.round(p.x)},${Math.round(p.y)}` : '';
      if (p && !p.down && key !== lastPointer) {
        const hover = itemAt(targets(), pos, p.x, p.y);
        if (hover) {
          cur = targets().findIndex((i) => i.id === hover.id);
          showCursor = true;
        } else if (slotAt(p.x, p.y) === DONE_SLOT) {
          cur = targets().length;
          showCursor = true;
        }
      }
      lastPointer = key;
      for (const tap of input.taps) {
        showCursor = input.pointer !== null;
        const slot = slotAt(tap.x, tap.y);
        if (slot === WHACK_SLOT) tool = 'whack';
        else if (slot === REJECT_SLOT) tool = 'reject';
        else if (slot === DONE_SLOT) finish(true);
        else if (tap.y >= VIEW.y && tap.y < VIEW.y + VIEW.h) apply(itemAt(targets(), pos, tap.x, tap.y), tap.x, tap.y);
        if (phase !== 'live') return;
      }
    },

    draw(ctx) {
      box(ctx, PALETTE.cream, 0, 0, W, H);
      const list = targets();
      const secs = Math.ceil(timeLeft() / 1000);
      drawHeader(ctx, CONTAINERS[scan.container].name, index + 1, ready() && phase === 'live' ? secs : null, phase === 'live' ? timeLeft() / limit() : 0);

      // the container pops up in four steps, then everything in it is drawn inside the clipped window
      const lift = phase === 'live' ? Math.ceil((1 - Math.min(1, phaseMs / POP_MS)) * 4) * 24 : 0;
      ctx.save();
      ctx.beginPath();
      ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      ctx.clip();
      ctx.translate(0, lift);
      drawContainer(ctx, scan.container);
      drawWater(ctx, tick);
      const sweepX = WATER.x + Math.min(1, Math.max(0, (phaseMs - POP_MS) / SCAN_MS)) * WATER.w;
      const revealing = phase === 'result' && settlement !== null;
      for (const item of scan.items) {
        if (!live.has(item.id)) continue;
        const p = pos(item);
        if (revealing && isLarva(item)) {
          // a larva nobody whacked has grown wings
          drawMosquito(ctx, p.x, p.y - Math.floor((phaseMs / 1000) * 24), tick);
          continue;
        }
        drawObject(ctx, item.kind, p.x, p.y, tick);
      }
      for (const item of scan.items) {
        if (!live.has(item.id)) continue;
        const p = pos(item);
        if (revealing) {
          if (phaseMs < REVEAL_MS) {
            if (item.boxed && !isLarva(item)) drawAiBox(ctx, p.x, p.y, item.confidence, 'wrong');
          }
        } else if (item.boxed && (ready() || sweepX >= item.x)) {
          drawAiBox(ctx, p.x, p.y, item.confidence, 'ai');
        }
      }
      if (phase === 'live' && showCursor && ready()) {
        const target = list[cur];
        if (target) {
          const p = pos(target);
          drawCursor(ctx, p.x, p.y);
        }
      }
      if (phase === 'live' && phaseMs >= POP_MS && !ready()) box(ctx, PALETTE.navy, sweepX, WATER.y, 2, WATER.h);
      for (const f of fx) {
        if (f.burst) drawBurst(ctx, f.x, f.y, Math.min(2, Math.floor(f.ms / 120)), PALETTE.coral);
        // on its own little card, so it reads over the water, the objects and the AI's tabs alike
        const label = measureLine(f.label, W - 8);
        const ly = Math.max(POPUP_TOP, f.y - 22 - Math.floor(f.ms / 100) * 2);
        const lx = Math.max(4 + label.width / 2, Math.min(W - 4 - label.width / 2, f.x));
        box(ctx, PALETTE.surface, lx - label.width / 2 - 1, ly - 1, label.width + 2, label.size + 2);
        text(ctx, label.text, lx, ly, { size: label.size, color: f.color, align: 'center', maxWidth: label.width });
      }
      ctx.restore();

      const p = precisionOf(tally);
      const c = catchRateOf(tally);
      drawMeterRow(ctx, 0, t('g.lamok.meter.precision', { p }), p);
      drawMeterRow(ctx, 1, t('g.lamok.meter.catch', { c }), c);
      const scanning = phase === 'live' && !ready();
      text(ctx, scanning ? t('g.lamok.msg.scanning') : message.text, 4, MSG_Y, { maxWidth: W - 8, size: 8, color: scanning ? PALETTE.navy : message.tone === 'good' ? PALETTE.fact : message.tone === 'bad' ? PALETTE.fake : PALETTE.muted });

      const locked = phase !== 'live' || !ready();
      drawToolTile(ctx, WHACK_SLOT, { active: tool === 'whack', cursor: false, locked });
      drawToolTile(ctx, REJECT_SLOT, { active: tool === 'reject', cursor: false, locked });
      drawToolTile(ctx, DONE_SLOT, { active: false, cursor: showCursor && cur === list.length, locked });

      if (phase === 'result' && panel && phaseMs >= (settlement && settlement.escaped + settlement.falseLeft > 0 ? REVEAL_MS : 0)) {
        drawPanel(ctx, panel.lines, panel.good ? 'good' : 'bad');
      }
    },

    stats(): GameStats {
      const p = precisionOf(tally);
      const c = catchRateOf(tally);
      const kind = CONTAINERS[scan.container];
      const base = t('g.lamok.desc.base', { score, hearts, max: HEARTS, p, c, n: index + 1, kind: kind.plain });
      let description: string;
      if (over) {
        description = `${base} ${t('g.lamok.desc.over')}`;
      } else if (phase === 'result' && settlement && panel) {
        const n = settlement.escaped;
        const left = n > 0 ? t(n === 1 ? 'g.lamok.desc.left.one' : 'g.lamok.desc.left.many', { n }) : t('g.lamok.desc.caughtAll');
        const w = settlement.falseLeft;
        const wrong = w > 0 ? ` ${t(w === 1 ? 'g.lamok.desc.wrong.one' : 'g.lamok.desc.wrong.many', { n: w })}` : '';
        description = `${base} ${left}${wrong} ${aiSentence(scan)}. ${t('g.lamok.desc.tip', { tip: kind.tip.map(tx).join(' ').toLowerCase() })}`;
      } else if (!ready()) {
        description = `${base} ${t('g.lamok.desc.scanning')}`;
      } else {
        const list = targets();
        const items = list
          .map((item, i) => {
            const box = item.boxed ? t('g.lamok.desc.boxed', { c: item.confidence }) : t('g.lamok.desc.noBox');
            return t('g.lamok.desc.item', { n: i + 1, where: where(item), look: OBJECTS[item.kind].look, box });
          })
          .join('; ');
        const spot = list[cur];
        const highlight = !showCursor ? '' : spot ? ` ${t('g.lamok.desc.highlightObject', { n: cur + 1 })}` : ` ${t('g.lamok.desc.highlightDone')}`;
        const low = timeLeft() <= 5000 ? ` ${t('g.lamok.desc.low')}` : '';
        const toolName = t(tool === 'whack' ? 'g.lamok.desc.toolWhack' : 'g.lamok.desc.toolReject');
        description = `${base} ${t('g.lamok.desc.tool', { tool: toolName })}${low} ${t('g.lamok.desc.objects', { items: items === '' ? t('g.lamok.desc.noneLeft') : items })}${highlight} ${t('g.lamok.desc.help')}`;
      }
      return {
        score,
        over,
        hud: [
          { id: 'score', label: t('g.lamok.hud.score'), value: String(score) },
          { id: 'hearts', label: t('g.lamok.hud.hearts'), value: t('g.lamok.hud.heartsValue', { n: hearts, max: HEARTS }), hearts: { n: hearts, max: HEARTS } },
          { id: 'precision', label: t('g.lamok.hud.precision'), value: `${p}%`, meter: p },
          { id: 'catch', label: t('g.lamok.hud.catch'), value: `${c}%`, meter: c },
        ],
        description,
        recap: over ? buildRecap({ ...counts, bestStreak, tally, topWrongConfidence: topWrong }) : [],
      };
    },
  };
}

/** The game-over recap: what happened, the AI's report card, then dengue prevention and when to trust the camera. */
export function buildRecap(run: RunSummary): string[] {
  const p = precisionOf(run.tally);
  const c = catchRateOf(run.tally);
  const seen = run.tally.tp + run.tally.fp + run.tally.fn > 0;
  return [
    t('g.lamok.recap.run', {
      containers: plural(run.scans, 'container'),
      larvae: plural(run.whacked + run.added, 'larva'),
      added: run.added,
      wrong: plural(run.rejected, 'wrongBox'),
      escaped: plural(run.escaped, 'larva'),
      streak: run.bestStreak,
    }),
    seen ? t('g.lamok.recap.grade', { p, c }) : t('g.lamok.recap.ungraded'),
    run.topWrongConfidence > 0 ? t('g.lamok.recap.topWrong', { n: run.topWrongConfidence }) : t('g.lamok.recap.confidence'),
    t('g.lamok.recap.dengue'),
    t('g.lamok.recap.help'),
  ];
}

const lamokLamay: GameDef = {
  slug: 'lamok-lamay',
  name: 'Lamok Lamay',
  width: W,
  height: H,
  goodRun: 2000,
  howTo: [
    'Water containers pop up. The AI camera draws a box on what it thinks is a larva, with how sure it is (a percentage). Real larvae wriggle. Seeds, leaf bits and raisins lie still.',
    'With WHACK chosen, tap a boxed larva to whack it, or tap a larva with no box to add it. With REJECT chosen, tap a box around something that is not a larva. Keyboard: arrows pick an object, up chooses Whack, down chooses Reject, Space or Enter uses it.',
    'Tap DONE when you have fixed everything. Finishing early with no larva left gives a time bonus. A wrong whack or reject costs 20 points and your streak.',
    'Every larva left in the water when time is up grows into a mosquito and costs a heart. You have 5 hearts, and each new container is quicker than the last.',
    'The two meters grade the AI. Precision: of its boxes, how many were right. Catch rate: of the real larvae, how many got a box.',
  ],
  briefing: [
    { title: 'Mosquito watch time!', text: 'Dengue mosquitoes grow from larvae in standing water. Today the AI camera helps you find them in drums, tires and cans.', mood: 'wow' },
    { title: 'AI makes two mistakes', text: 'AI cameras can spot larvae, but they make two kinds of mistakes: a box around a seed, and a larva with no box at all.', mood: 'think' },
    { title: 'How to play', text: 'Whack real larvae, reject wrong boxes, and tap a larva the AI missed to add it. Watch the precision and catch rate meters.', mood: 'idle' },
    { title: 'Clean water, new mosquitoes', text: 'Dengue mosquitoes breed in clean standing water. Cover, clean and empty your containers every week.', mood: 'happy' },
    { title: 'When should I trust it?', text: 'Trust the AI camera as a helper. Your own eyes make the final call.', mood: 'happy' },
  ],
  takeaway: 'When should I trust it? I trust the AI camera as a helper, and my own eyes make the final call.',
  create: createLamok,
};

export default lamokLamay;
