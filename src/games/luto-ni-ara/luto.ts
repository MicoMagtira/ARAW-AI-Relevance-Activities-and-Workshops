// Luto ni Ara (prompting AI well): a kitchen time-management game (docs/SPEC.md section 5).
// A customer orders an answer. Tap or drag prompt ingredients into the pot before the customer's patience runs out, then COOK.
// The dish is "the AI's answer": the right ingredients serve a good dish, missing ones serve a funny wrong dish with a lesson.
// Orders come only from the seeded generator and never depend on the player's choices, so the Daily Challenge matches.
import { t } from '../../app/i18n';
import { PALETTE, box, drawBlock, measureBlock, text } from '../engine/draw';
import type { InputFrame } from '../engine/input';
import { createRng, type Rng } from '../engine/rng';
import type { Cue, GameDef, GameInstance, GameStats } from '../engine/types';
import { silent, timerCue } from '../engine/cues';
import { drawPerson, type Face } from '../feed-mo-to/art';
import {
  COOK_SLOT,
  DROP,
  H,
  RESULT_CHARS,
  W,
  chipAt,
  chipRect,
  chipWidth,
  drawBubble,
  drawChip,
  drawCookButton,
  drawDish,
  drawKindChip,
  drawPot,
  drawTile,
  drawTimer,
  inside,
  moveSlot,
  slotAt,
} from './art';
import {
  HEARTS,
  INGREDIENTS,
  cook,
  createOrderGenerator,
  isServed,
  orderText,
  patienceMs,
  payFor,
  type Dish,
  type Ingredient,
  type Order,
  type Pay,
} from './orders';

const TIMER_TEXT_X = 6;
const POT_LABEL_X = 160;
const COOK_MS = 800;
const GOOD_RESULT_MS = 2400;
const BAD_RESULT_MS = 3600;
/** The result can be skipped with a press or tap after this long. */
const SKIP_AFTER_MS = 900;
/** A press that moves further than this (logical px) is a drag, not a tap. */
const DRAG_MIN = 6;

type Phase = 'choose' | 'cooking' | 'result';

interface Outcome {
  /** Null when the customer's patience ran out. */
  dish: Dish | null;
  pay: Pay;
  heartLost: boolean;
}

export interface RunSummary {
  orders: number;
  served: number;
  wrong: number;
  timeouts: number;
  /** Ingredients that were missing from wrong dishes, with how often. */
  missed: Readonly<Partial<Record<Ingredient, number>>>;
}

/** An ingredient's plain-words name in the active language (the screen-reader description and the recap). */
const ingName = (id: Ingredient): string => t(`g.luto.ing.${id}`);
const list = (ids: readonly Ingredient[]): string => (ids.length > 0 ? ids.map(ingName).join(', ') : t('g.luto.desc.nothing'));
/** Result text area right of the dish: x 76 to 312, y 76 down to the shelf rule at 122. */
const RESULT = { x: 76, y: 76, w: RESULT_CHARS * 8 + 4, bottom: 122 };

function createLuto({ rng, cue = silent }: { seed: string; rng: Rng; cue?: Cue }): GameInstance {
  const orders = createOrderGenerator(createRng(`${rng()}:luto-orders`));

  let index = 0;
  let order: Order = orders.next(0);
  let patience = patienceMs(0, order.needs.length);
  let timeLeft = patience;
  let phase: Phase = 'choose';
  let phaseMs = 0;
  let pot: Ingredient[] = [];
  let sel = 0;
  let hearts = HEARTS;
  let score = 0;
  let outcome: Outcome | null = null;
  let over = false;
  let tick = 0;
  let tickMs = 0;
  let lastPointer = '';
  const counts = { served: 0, wrong: 0, timeouts: 0 };
  const missed: Partial<Record<Ingredient, number>> = {};

  // drag from the shelf into the pot
  let dragging: { id: Ingredient; fromX: number; fromY: number; x: number; y: number; moved: boolean } | null = null;

  function nextOrder() {
    index += 1;
    order = orders.next(index);
    patience = patienceMs(index, order.needs.length);
    timeLeft = patience;
    pot = [];
    phase = 'choose';
    phaseMs = 0;
    outcome = null;
    dragging = null;
  }

  function toggle(id: Ingredient) {
    const adding = !pot.includes(id);
    pot = adding ? [...pot, id] : pot.filter((i) => i !== id);
    cue(adding ? 'plop' : 'whiff');
  }

  function startCooking() {
    if (pot.length === 0 || phase !== 'choose') return;
    phase = 'cooking';
    phaseMs = 0;
    dragging = null;
    cue('sizzle');
  }

  function serve() {
    const dish = cook(order, pot);
    const pay = payFor(dish, order, timeLeft / patience);
    const served = isServed(dish);
    score += pay.total;
    if (served) counts.served += 1;
    else {
      counts.wrong += 1;
      hearts -= 1;
      for (const id of dish.missing) missed[id] = (missed[id] ?? 0) + 1;
    }
    outcome = { dish, pay, heartLost: !served };
    cue(served ? 'served' : 'funnyDish');
    phase = 'result';
    phaseMs = 0;
  }

  function timeout() {
    counts.timeouts += 1;
    hearts -= 1;
    outcome = { dish: null, pay: { base: 0, speed: 0, tips: 0, total: 0 }, heartLost: true };
    cue('wrong');
    phase = 'result';
    phaseMs = 0;
    dragging = null;
  }

  /** Let go of a drag: a real drag that ends over the pot adds the ingredient. Returns true when it was a real drag. */
  function endDrag(): boolean {
    const d = dragging;
    dragging = null;
    if (!d?.moved) return false;
    if (inside(DROP, d.x, d.y) && !pot.includes(d.id)) {
      pot = [...pot, d.id];
      cue('plop');
    }
    return true;
  }

  const face = (): Face => {
    if (phase === 'result') return outcome?.dish && isServed(outcome.dish) ? 'happy' : 'bored';
    return timeLeft / patience < 0.3 ? 'worried' : 'happy';
  };

  function choose(dtMs: number, input: InputFrame) {
    // drag: press on a shelf tile, move, and let go over the pot
    const p = input.pointer;
    let dragEnded = false;
    if (p?.down) {
      if (!dragging) {
        const slot = slotAt(p.x, p.y);
        const id = slot >= 0 && slot < COOK_SLOT ? INGREDIENTS[slot] : undefined;
        if (id) dragging = { id, fromX: p.x, fromY: p.y, x: p.x, y: p.y, moved: false };
      } else {
        dragging.x = p.x;
        dragging.y = p.y;
        if (Math.hypot(p.x - dragging.fromX, p.y - dragging.fromY) > DRAG_MIN) dragging.moved = true;
      }
    } else if (dragging) {
      dragEnded = endDrag();
    }
    // swipes made while dragging, and the tap that ends a drag, were already used by the drag
    const dragUsed = dragEnded || dragging?.moved === true;

    for (const action of input.actions) {
      if (dragUsed) break;
      if (action === 'act') {
        if (sel === COOK_SLOT) startCooking();
        else toggle(INGREDIENTS[sel] as Ingredient);
        if (phase !== 'choose') return;
      } else {
        sel = moveSlot(sel, action);
      }
    }

    const key = p && !p.down ? `${Math.round(p.x)},${Math.round(p.y)}` : '';
    if (p && !p.down && key !== lastPointer) {
      const hover = slotAt(p.x, p.y);
      if (hover >= 0) sel = hover;
    }
    lastPointer = key;

    for (const tap of dragUsed ? [] : input.taps) {
      const chip = chipAt(pot, tap.x, tap.y);
      if (chip >= 0) {
        pot = pot.filter((_, k) => k !== chip);
        cue('whiff');
        continue;
      }
      const slot = slotAt(tap.x, tap.y);
      if (slot < 0) continue;
      sel = slot;
      if (slot === COOK_SLOT) startCooking();
      else toggle(INGREDIENTS[slot] as Ingredient);
      if (phase !== 'choose') return;
    }

    const tick = timerCue(timeLeft, timeLeft - dtMs);
    timeLeft -= dtMs;
    if (timeLeft <= 0) timeout();
    else if (tick) cue(tick);
  }

  return {
    step(dtMs, input) {
      if (over) return;
      tickMs += dtMs;
      if (tickMs >= 150) {
        tickMs -= 150;
        tick += 1;
      }
      phaseMs += dtMs;
      const pressed = input.actions.includes('act') || input.taps.length > 0;

      if (phase === 'cooking') {
        if (phaseMs >= COOK_MS) serve();
        return;
      }
      if (phase === 'result') {
        const good = outcome?.dish ? isServed(outcome.dish) : false;
        if (phaseMs >= (good ? GOOD_RESULT_MS : BAD_RESULT_MS) || (phaseMs >= SKIP_AFTER_MS && pressed)) {
          if (hearts <= 0) over = true;
          else nextOrder();
        }
        return;
      }
      choose(dtMs, input);
    },

    draw(ctx) {
      box(ctx, PALETTE.cream, 0, 0, W, H);
      box(ctx, PALETTE.gold, 0, 72, W, 52);
      box(ctx, PALETTE.goldDeep, 0, 72, W, 2);
      box(ctx, PALETTE.ink, 0, 122, W, 2);
      drawPerson(ctx, 6, 6, order.customer.look, face());
      text(ctx, order.customer.name, 24, 47, { size: 8, color: PALETTE.navy, align: 'center', maxWidth: 46 });
      drawBubble(ctx, orderText(order));
      drawKindChip(ctx, order.health);

      const locked = phase !== 'choose';
      if (phase === 'result' && outcome) {
        const dish = outcome.dish;
        const pay = outcome.pay;
        // the result line runs up to the kind chip (it starts at x 248 at the most)
        const line = { size: 8, maxWidth: 248 - TIMER_TEXT_X };
        if (!dish) text(ctx, t('g.luto.tooSlow'), TIMER_TEXT_X, 62, { ...line, color: PALETTE.fake });
        else if (isServed(dish)) text(ctx, pay.tips > 0 ? t('g.luto.payTips', { total: pay.total, base: pay.base, speed: pay.speed, tips: pay.tips }) : t('g.luto.pay', { total: pay.total, base: pay.base, speed: pay.speed }), TIMER_TEXT_X, 62, { ...line, color: PALETTE.fact });
        else text(ctx, t('g.luto.wrongDish'), TIMER_TEXT_X, 62, { ...line, color: PALETTE.fake });
        drawDish(ctx, dish?.quality ?? 'none', 6, 88, tick);
        // dish names and lessons are already in the active language: upper-case after translating
        const good = dish ? isServed(dish) : false;
        const name = measureBlock(dish ? dish.name.toUpperCase() : t('g.luto.noDish'), RESULT.w, { size: 8, lineHeight: 9, maxLines: 2 });
        drawBlock(ctx, name, RESULT.x, RESULT.y, { color: good ? PALETTE.fact : PALETTE.fake, maxWidth: RESULT.w });
        const lessonTop = RESULT.y + Math.max(17, name.height) + 3;
        const lesson = measureBlock(dish ? dish.lesson.toUpperCase() : t('g.luto.noDishLesson'), RESULT.w, { size: 8, lineHeight: 9, maxHeight: RESULT.bottom - lessonTop });
        drawBlock(ctx, lesson, RESULT.x, lessonTop, { color: PALETTE.ink, maxWidth: RESULT.w });
      } else {
        drawTimer(ctx, timeLeft / patience);
        drawPot(ctx, pot.length, tick, phase === 'cooking', dragging?.moved === true && inside(DROP, dragging.x, dragging.y));
        pot.forEach((id, k) => drawChip(ctx, chipRect(k, id), id));
        if (pot.length === 0 && phase === 'choose') text(ctx, t('g.luto.emptyPot'), POT_LABEL_X, 108, { size: 8, color: PALETTE.muted, align: 'center', maxWidth: 100 });
      }

      for (let s = 0; s < INGREDIENTS.length; s++) {
        drawTile(ctx, s, { selected: sel === s && !locked, inPot: pot.includes(INGREDIENTS[s] as Ingredient), locked });
      }
      drawCookButton(ctx, { selected: sel === COOK_SLOT && !locked, ready: pot.length > 0 && !locked });
      if (dragging?.moved) drawChip(ctx, { x: dragging.x - 24, y: dragging.y - 6, w: chipWidth(dragging.id), h: 11 }, dragging.id, true);
    },

    stats(): GameStats {
      const shown = orderText(order);
      const base = [
        t('g.luto.desc.base', { score, hearts, max: HEARTS, n: index + 1, name: order.customer.name.toLowerCase(), order: shown }),
        ...(order.health ? [t('g.luto.desc.healthAsk')] : []),
      ].join(' ');
      let parts: string[];
      if (over) {
        parts = [t('g.luto.desc.closed')];
      } else if (phase === 'cooking') {
        parts = [t('g.luto.desc.cooking', { list: list(pot) })];
      } else if (phase === 'result' && outcome) {
        const dish = outcome.dish;
        parts = dish
          ? [t('g.luto.desc.served', { dish: dish.name }), isServed(dish) ? t('g.luto.desc.good', { points: outcome.pay.total }) : t('g.luto.desc.wrong'), dish.lesson]
          : [t('g.luto.desc.tooSlow')];
      } else {
        const slotName = sel === COOK_SLOT ? t('g.luto.desc.slotCook') : t('g.luto.desc.slotIngredient', { name: ingName(INGREDIENTS[sel] as Ingredient) });
        parts = [t('g.luto.desc.choose', { shelf: list(INGREDIENTS), pot: list(pot), slot: slotName })];
      }
      const description = [base, ...parts].join(' ');
      return {
        score,
        over,
        hud: [
          { id: 'score', label: t('g.luto.hud.score'), value: String(score) },
          { id: 'hearts', label: t('g.luto.hud.hearts'), value: t('g.luto.hud.heartsValue', { n: hearts, max: HEARTS }), hearts: { n: hearts, max: HEARTS } },
          { id: 'served', label: t('g.luto.hud.served'), value: String(counts.served) },
        ],
        description,
        recap: over ? buildRecap({ orders: index + 1, ...counts, missed }) : [],
      };
    },
  };
}

/** The game-over recap: what happened, then how a good prompt works and how to ask health questions. */
export function buildRecap(run: RunSummary): string[] {
  const lines = [
    t('g.luto.recap.cooked', {
      orders: t(run.orders === 1 ? 'g.luto.recap.order' : 'g.luto.recap.orders', { n: run.orders }),
      served: t(run.served === 1 ? 'g.luto.recap.goodDish' : 'g.luto.recap.goodDishes', { n: run.served }),
      wrong: t(run.wrong === 1 ? 'g.luto.recap.wrongDish' : 'g.luto.recap.wrongDishes', { n: run.wrong }),
      timeouts: t(run.timeouts === 1 ? 'g.luto.recap.customer' : 'g.luto.recap.customers', { n: run.timeouts }),
    }),
  ];
  const top = (Object.entries(run.missed) as Array<[Ingredient, number]>).sort((a, b) => b[1] - a[1] || INGREDIENTS.indexOf(a[0]) - INGREDIENTS.indexOf(b[0]))[0];
  if (top) lines.push(t('g.luto.recap.missed', { name: ingName(top[0]), times: t(top[1] === 1 ? 'g.luto.recap.time' : 'g.luto.recap.times', { n: top[1] }) }));
  lines.push(t('g.luto.recap.how'), t('g.luto.recap.health'), t('g.luto.recap.wrongToo'), t('g.luto.recap.tip'));
  return lines;
}

const lutoNiAra: GameDef = {
  slug: 'luto-ni-ara',
  name: 'Luto ni Ara',
  width: W,
  height: H,
  goodRun: 1200,
  howTo: [
    'A customer orders an answer. Add the prompt ingredients the order asks for, then press COOK before the timer ends.',
    'Tap or click an ingredient to put it in the pot (tap it again to take it out), or drag it into the pot. With the keyboard use the arrow keys, then Space or Enter.',
    'Each part the customer names needs its ingredient: audience, language, length, format and role. Health questions also need Cite sources and Say if unsure.',
    'Missing ingredients serve a funny wrong dish and cost a heart. Adding things nobody asked for clutters the dish.',
    'Faster cooking earns a speed bonus, and health orders earn tips. You have 3 hearts, and orders get quicker and never repeat.',
  ],
  briefing: [
    { title: 'Welcome to my kitchen!', text: 'Customers order answers from an AI chatbot, and you cook up the prompt. Do not worry, nobody gets food poisoning. Just funny dishes.', mood: 'wow' },
    { title: 'A good prompt is a good recipe', text: 'Say who the answer is for, which language, how long, what format and what role. A clear recipe makes a clear dish.', mood: 'happy' },
    { title: 'How to play', text: 'Tap or drag ingredients into the pot, then press COOK before the timer ends. On a keyboard, use the arrows and Enter.', mood: 'idle' },
    { title: 'Health questions need extras', text: 'For health questions, ask the AI to cite sources and to say when it is unsure. Both go in the pot.', mood: 'think' },
    { title: 'When should I trust it?', text: 'Trust answers that show their sources, and check them with a health worker.', mood: 'happy' },
  ],
  takeaway: 'When should I trust it? When an answer shows its sources and admits when it is unsure, and I still check it with a health worker.',
  create: createLuto,
};

export default lutoNiAra;
