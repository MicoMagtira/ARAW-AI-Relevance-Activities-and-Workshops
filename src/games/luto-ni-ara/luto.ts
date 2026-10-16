// Luto ni Ara (prompting AI well): a kitchen time-management game (docs/SPEC.md section 5).
// A customer orders an answer. Tap or drag prompt ingredients into the pot before the customer's patience runs out, then COOK.
// The dish is "the AI's answer": the right ingredients serve a good dish, missing ones serve a funny wrong dish with a lesson.
// Orders come only from the seeded generator and never depend on the player's choices, so the Daily Challenge matches.
import { PALETTE, box, text } from '../engine/draw';
import type { InputFrame } from '../engine/input';
import { createRng, type Rng } from '../engine/rng';
import type { Cue, GameDef, GameInstance, GameStats } from '../engine/types';
import { silent, timerCue } from '../engine/cues';
import { drawPerson, type Face } from '../feed-mo-to/art';
import {
  BUBBLE_CHARS,
  COOK_SLOT,
  DROP,
  H,
  RESULT_CHARS,
  W,
  chipAt,
  chipRect,
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
  wrapText,
} from './art';
import {
  HEARTS,
  INGREDIENTS,
  INGREDIENT_INFO,
  cook,
  createOrderGenerator,
  isServed,
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

const list = (ids: readonly Ingredient[]): string => (ids.length > 0 ? ids.map((i) => INGREDIENT_INFO[i].name).join(', ') : 'nothing yet');

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
      text(ctx, order.customer.name, 24, 47, { size: 8, color: PALETTE.navy, align: 'center' });
      drawBubble(ctx, wrapText(order.text, BUBBLE_CHARS));
      drawKindChip(ctx, order.health);

      const locked = phase !== 'choose';
      if (phase === 'result' && outcome) {
        const dish = outcome.dish;
        const pay = outcome.pay;
        if (!dish) text(ctx, 'TOO SLOW! LOST A HEART.', TIMER_TEXT_X, 62, { size: 8, color: PALETTE.fake });
        else if (isServed(dish)) text(ctx, `+${pay.total}  BASE ${pay.base} SPEED ${pay.speed}${pay.tips > 0 ? ` TIPS ${pay.tips}` : ''}`, TIMER_TEXT_X, 62, { size: 8, color: PALETTE.fact });
        else text(ctx, 'WRONG DISH! LOST A HEART.', TIMER_TEXT_X, 62, { size: 8, color: PALETTE.fake });
        drawDish(ctx, dish?.quality ?? 'none', 6, 88, tick);
        const name = wrapText(dish ? dish.name.toUpperCase() : 'NO DISH: THE CUSTOMER LEFT HUNGRY', RESULT_CHARS);
        const lesson = wrapText(dish ? dish.lesson.toUpperCase() : 'THINK OF THE PARTS FIRST: WHO, LANGUAGE, LENGTH, FORMAT.', RESULT_CHARS);
        const good = dish ? isServed(dish) : false;
        name.slice(0, 2).forEach((line, i) => text(ctx, line, 76, 76 + i * 9, { size: 8, color: good ? PALETTE.fact : PALETTE.fake }));
        lesson.slice(0, 3).forEach((line, i) => text(ctx, line, 76, 96 + i * 9, { size: 8, color: PALETTE.ink }));
      } else {
        drawTimer(ctx, timeLeft / patience);
        drawPot(ctx, pot.length, tick, phase === 'cooking', dragging?.moved === true && inside(DROP, dragging.x, dragging.y));
        pot.forEach((id, k) => drawChip(ctx, chipRect(k, id), id));
        if (pot.length === 0 && phase === 'choose') text(ctx, 'EMPTY POT', POT_LABEL_X, 108, { size: 8, color: PALETTE.muted, align: 'center' });
      }

      for (let s = 0; s < INGREDIENTS.length; s++) {
        drawTile(ctx, s, { selected: sel === s && !locked, inPot: pot.includes(INGREDIENTS[s] as Ingredient), locked });
      }
      drawCookButton(ctx, { selected: sel === COOK_SLOT && !locked, ready: pot.length > 0 && !locked });
      if (dragging?.moved) drawChip(ctx, { x: dragging.x - 24, y: dragging.y - 6, w: INGREDIENT_INFO[dragging.id].chip.length * 8 + 8, h: 11 }, dragging.id, true);
    },

    stats(): GameStats {
      const base = `Luto ni Ara. Score ${score}. Hearts ${hearts} of ${HEARTS}. Order ${index + 1} from ${order.customer.name.toLowerCase()}: "${order.text}"${order.health ? ' This is a health question.' : ''}`;
      let description: string;
      if (over) {
        description = `${base} The kitchen is closed: no hearts left.`;
      } else if (phase === 'cooking') {
        description = `${base} Cooking with: ${list(pot)}.`;
      } else if (phase === 'result' && outcome) {
        const dish = outcome.dish;
        description = dish
          ? `${base} You served: ${dish.name}. ${isServed(dish) ? `Good dish, ${outcome.pay.total} points.` : 'Wrong dish, you lost a heart.'} ${dish.lesson}`
          : `${base} Too slow: the customer left hungry and you lost a heart.`;
      } else {
        const slotName = sel === COOK_SLOT ? 'the Cook button' : `${INGREDIENT_INFO[INGREDIENTS[sel] as Ingredient].name} ingredient`;
        description = `${base} Ingredients on the shelf: ${list(INGREDIENTS)}. In the pot: ${list(pot)}. Highlighted: ${slotName}. Press Enter on an ingredient to add or remove it, then on Cook.`;
      }
      return {
        score,
        over,
        hud: [
          { id: 'score', label: 'Score', value: String(score) },
          { id: 'hearts', label: 'Hearts', value: `${hearts} of ${HEARTS}`, hearts: { n: hearts, max: HEARTS } },
          { id: 'served', label: 'Served', value: String(counts.served) },
        ],
        description,
        recap: over ? buildRecap({ orders: index + 1, ...counts, missed }) : [],
      };
    },
  };
}

/** The game-over recap: what happened, then how a good prompt works and how to ask health questions. */
export function buildRecap(run: RunSummary): string[] {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const lines = [
    `You cooked for ${plural(run.orders, 'order', 'orders')}: ${plural(run.served, 'good dish', 'good dishes')}, ${plural(run.wrong, 'wrong dish', 'wrong dishes')} and ${plural(run.timeouts, 'customer', 'customers')} who gave up waiting.`,
  ];
  const top = (Object.entries(run.missed) as Array<[Ingredient, number]>).sort((a, b) => b[1] - a[1] || INGREDIENTS.indexOf(a[0]) - INGREDIENTS.indexOf(b[0]))[0];
  if (top) lines.push(`The ingredient you missed most: ${INGREDIENT_INFO[top[0]].name} (${plural(top[1], 'time', 'times')}).`);
  lines.push(
    'How it works: an AI chatbot answers exactly what you ask. A clearer prompt (who it is for, which language, how long, what format, what role) gets a clearer answer.',
    'For health questions, ask it to cite sources and to say if it is unsure. That makes its answer easier to check.',
    'A chatbot can still be wrong, even when it sounds sure, and the sources it names can be made up. Always check them.',
    'Tip: take health answers from a chatbot to a health worker or your health center before you act on them.',
  );
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
