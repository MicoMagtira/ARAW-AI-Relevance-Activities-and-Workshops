import { describe, expect, it } from 'vitest';
import { STEP_MS } from '../../src/games/engine/loop';
import type { Action, InputFrame } from '../../src/games/engine/input';
import { createRng } from '../../src/games/engine/rng';
import type { GameInstance } from '../../src/games/engine/types';
import {
  BUBBLE_CHARS,
  BUBBLE_LINES,
  COOK_SLOT,
  DROP,
  RESULT_CHARS,
  SLOTS,
  chipAt,
  chipRect,
  inside,
  moveSlot,
  slotAt,
  slotRect,
  wrapText,
} from '../../src/games/luto-ni-ara/art';
import luto, { buildRecap } from '../../src/games/luto-ni-ara/luto';
import {
  AUDIENCES,
  FORMATS,
  INGREDIENTS,
  INGREDIENT_INFO,
  LANGUAGES,
  LENGTHS,
  ROLES,
  TASKS,
  cook,
  createOrderGenerator,
  extraPartsFor,
  isServed,
  patienceMs,
  payFor,
  type Ingredient,
  type Order,
} from '../../src/games/luto-ni-ara/orders';

const NONE: InputFrame = { actions: [], held: new Set(), taps: [], pointer: null };
const press = (...actions: Action[]): InputFrame => ({ ...NONE, actions });
const tapAt = (x: number, y: number): InputFrame => ({ ...NONE, taps: [{ x, y }] });
const center = (slot: number) => {
  const r = slotRect(slot);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};
const make = (seed: string): GameInstance => luto.create({ seed, rng: createRng(seed) });

function run(game: GameInstance, ms: number, input: InputFrame = NONE) {
  for (let t = 0; t < ms; t += STEP_MS) game.step(STEP_MS, t === 0 ? input : NONE);
}

/** The orders a game made from this seed (same derivation as the game uses). */
function ordersOf(seed: string, count: number): Order[] {
  const rng = createRng(seed);
  const gen = createOrderGenerator(createRng(`${rng()}:luto-orders`));
  return Array.from({ length: count }, (_, i) => gen.next(i));
}

function fakeContext(): CanvasRenderingContext2D {
  const noop = () => undefined;
  return new Proxy({}, { get: (_t, prop) => (prop === 'measureText' ? () => ({ width: 8 }) : noop), set: () => true }) as unknown as CanvasRenderingContext2D;
}

/** Add each ingredient by tapping its tile. */
function fill(game: GameInstance, ids: readonly Ingredient[]) {
  for (const id of ids) {
    const c = center(INGREDIENTS.indexOf(id));
    run(game, STEP_MS, tapAt(c.x, c.y));
  }
}
const cookNow = (game: GameInstance) => {
  const c = center(COOK_SLOT);
  run(game, STEP_MS, tapAt(c.x, c.y));
};

describe('order generator', () => {
  it('gives the same orders for the same seed and different orders for another', () => {
    expect(ordersOf('s1', 30).map((o) => o.text)).toEqual(ordersOf('s1', 30).map((o) => o.text));
    expect(ordersOf('s1', 30).map((o) => o.text)).not.toEqual(ordersOf('s2', 30).map((o) => o.text));
  });

  it('never repeats an order, even over a very long run', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const orders = ordersOf(seed, 600);
      expect(new Set(orders.map((o) => o.key)).size).toBe(600);
      expect(new Set(orders.map((o) => o.text)).size).toBe(600);
    }
  });

  it('starts gently: no health questions in the first two orders, and 2 ingredients at the very start', () => {
    for (const seed of ['a', 'b', 'c', 'x', 'y', 'z']) {
      const [first, second] = ordersOf(seed, 2) as [Order, Order];
      expect(first.health).toBe(false);
      expect(second.health).toBe(false);
      expect(first.needs).toHaveLength(2);
    }
  });

  it('every spoken part is a needed ingredient, and health questions also need sources and honesty', () => {
    for (const o of ordersOf('needs', 200)) {
      expect(o.needs).toContain('audience');
      expect(o.needs.includes('language')).toBe(o.language !== null);
      expect(o.needs.includes('length')).toBe(o.length !== null);
      expect(o.needs.includes('format')).toBe(o.format !== null);
      expect(o.needs.includes('role')).toBe(o.role !== null);
      expect(o.needs.includes('cite')).toBe(o.health);
      expect(o.needs.includes('unsure')).toBe(o.health);
      for (const part of [o.audience, o.language, o.length, o.format, o.role]) if (part) expect(o.text).toContain(part.text);
      expect(o.task.health).toBe(o.health);
    }
  });

  it('orders grow richer, and the customer waits less for each order', () => {
    expect(extraPartsFor(0)).toBe(1);
    expect(extraPartsFor(3)).toBe(2);
    expect(extraPartsFor(100)).toBe(4);
    expect(patienceMs(0, 3)).toBe(26_000);
    expect(patienceMs(10, 3)).toBeLessThan(patienceMs(0, 3));
    expect(patienceMs(100, 3)).toBe(13_000);
    expect(patienceMs(5, 6)).toBeGreaterThan(patienceMs(5, 3));
    const late = ordersOf('late', 60).slice(40);
    expect(late.every((o) => o.needs.filter((i) => i !== 'cite' && i !== 'unsure').length === 5)).toBe(true);
  });

  it('never has the same customer twice in a row', () => {
    const orders = ordersOf('who', 200);
    for (let i = 1; i < orders.length; i++) expect((orders[i] as Order).customer.id).not.toBe((orders[i - 1] as Order).customer.id);
  });

  it('every possible order text fits the order bubble', () => {
    const longest = (list: ReadonlyArray<{ text: string }>) => list.reduce((a, b) => (b.text.length > a.text.length ? b : a)).text;
    for (const task of TASKS) {
      const text = `${task.text} ${longest(AUDIENCES)} ${longest(LANGUAGES)}. ${longest(LENGTHS)} ${longest(FORMATS)} ${longest(ROLES)}`;
      expect(wrapText(text, BUBBLE_CHARS).length).toBeLessThanOrEqual(BUBBLE_LINES);
    }
    for (const o of ordersOf('fit', 300)) expect(wrapText(o.text, BUBBLE_CHARS).length).toBeLessThanOrEqual(BUBBLE_LINES);
  });

  it('keeps health tasks general: no dosing and no diagnosis', () => {
    for (const task of TASKS.filter((t) => t.health)) expect(task.text).not.toMatch(/\b(dose|dosage|mg|take|cure|diagnos|treat)/i);
  });

  it('uses shelf text that fits the tiles (8 characters, then 7 beside the check mark)', () => {
    for (const id of INGREDIENTS) {
      const info = INGREDIENT_INFO[id];
      expect(info.line1.length).toBeLessThanOrEqual(8);
      expect(info.line2.length).toBeLessThanOrEqual(7);
      expect(info.line1.length).toBeLessThanOrEqual(8);
      expect(info.chip.length).toBeLessThanOrEqual(8);
    }
  });
});

describe('cooking', () => {
  const [first] = ordersOf('cook', 1) as [Order];
  const needs = first.needs;

  it('a pot with exactly the needed ingredients serves a perfect dish', () => {
    const dish = cook(first, needs);
    expect(dish.quality).toBe('perfect');
    expect(isServed(dish)).toBe(true);
    expect(dish.missing).toEqual([]);
  });

  it('is the same whatever order the ingredients went in', () => {
    expect(cook(first, [...needs].reverse())).toEqual(cook(first, needs));
  });

  it('a missing ingredient serves a funny wrong dish with a one-line lesson, for every ingredient', () => {
    const health = ordersOf('h', 100).find((o) => o.health && o.needs.length === 7) as Order;
    expect(health).toBeDefined();
    const names = new Set<string>();
    for (const id of INGREDIENTS) {
      const dish = cook(health, health.needs.filter((i) => i !== id));
      expect(dish.quality).toBe('missing');
      expect(dish.missing).toEqual([id]);
      expect(wrapText(dish.name.toUpperCase(), RESULT_CHARS).length).toBeLessThanOrEqual(2);
      expect(wrapText(dish.lesson.toUpperCase(), RESULT_CHARS).length).toBeLessThanOrEqual(3);
      names.add(dish.name);
    }
    expect(names.size).toBe(7);
  });

  it('the first missing ingredient picks the dish, and an empty pot is also wrong', () => {
    const health = ordersOf('h', 100).find((o) => o.health && o.needs.length === 7) as Order;
    const dish = cook(health, ['role', 'cite']);
    expect(dish.missing).toEqual(['audience', 'language', 'length', 'format', 'unsure']);
    expect(dish.name).toBe(cook(health, health.needs.filter((i) => i !== 'audience')).name);
    expect(cook(health, []).quality).toBe('missing');
  });

  it('one or two unneeded ingredients clutter the dish; three muddle it', () => {
    const spare = INGREDIENTS.filter((i) => !needs.includes(i));
    expect(spare.length).toBeGreaterThanOrEqual(3);
    expect(cook(first, [...needs, spare[0] as Ingredient]).quality).toBe('cluttered');
    expect(cook(first, [...needs, ...spare.slice(0, 2)]).quality).toBe('cluttered');
    const muddled = cook(first, [...needs, ...spare.slice(0, 3)]);
    expect(muddled.quality).toBe('muddled');
    expect(isServed(muddled)).toBe(false);
    expect(muddled.extra).toHaveLength(3);
  });

  it('every dish name and lesson fits the result panel', () => {
    for (const o of ordersOf('names', 300)) {
      for (const pot of [o.needs, [...o.needs, ...INGREDIENTS.filter((i) => !o.needs.includes(i)).slice(0, 1)]]) {
        const dish = cook(o, pot);
        expect(wrapText(dish.name.toUpperCase(), RESULT_CHARS).length).toBeLessThanOrEqual(2);
        expect(wrapText(dish.lesson.toUpperCase(), RESULT_CHARS).length).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe('scoring', () => {
  const order = ordersOf('pay', 100).find((o) => o.health) as Order;
  const plain = ordersOf('pay', 100).find((o) => !o.health) as Order;

  it('pays base plus speed, and tips on served health orders', () => {
    expect(payFor(cook(plain, plain.needs), plain, 1)).toEqual({ base: 100, speed: 60, tips: 0, total: 160 });
    expect(payFor(cook(plain, plain.needs), plain, 0.5)).toMatchObject({ speed: 30, total: 130 });
    expect(payFor(cook(order, order.needs), order, 0)).toEqual({ base: 100, speed: 0, tips: 50, total: 150 });
  });

  it('a cluttered dish pays 60% of the base; wrong dishes pay nothing', () => {
    const spare = INGREDIENTS.find((i) => !plain.needs.includes(i)) as Ingredient;
    expect(payFor(cook(plain, [...plain.needs, spare]), plain, 0).base).toBe(60);
    expect(payFor(cook(plain, []), plain, 1).total).toBe(0);
  });

  it('clamps the time fraction', () => {
    expect(payFor(cook(plain, plain.needs), plain, 5).speed).toBe(60);
    expect(payFor(cook(plain, plain.needs), plain, -2).speed).toBe(0);
  });
});

describe('layout', () => {
  it('has 7 ingredient tiles and a COOK button on 8 slots that never overlap or leave the canvas', () => {
    expect(SLOTS).toBe(8);
    const rects = Array.from({ length: SLOTS }, (_, s) => slotRect(s));
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(320);
      expect(r.y + r.h).toBeLessThanOrEqual(180);
    }
    for (let a = 0; a < rects.length; a++) {
      for (let b = a + 1; b < rects.length; b++) {
        const p = rects[a] as ReturnType<typeof slotRect>;
        const q = rects[b] as ReturnType<typeof slotRect>;
        expect(p.x + p.w <= q.x || q.x + q.w <= p.x || p.y + p.h <= q.y || q.y + q.h <= p.y).toBe(true);
      }
    }
    for (let s = 0; s < SLOTS; s++) expect(slotAt(center(s).x, center(s).y)).toBe(s);
    expect(slotAt(1, 100)).toBe(-1);
  });

  it('moves the highlight over the grid and stays on real slots', () => {
    expect(moveSlot(0, 'left')).toBe(0);
    expect(moveSlot(0, 'right')).toBe(1);
    expect(moveSlot(0, 'down')).toBe(4);
    expect(moveSlot(4, 'up')).toBe(0);
    expect(moveSlot(3, 'down')).toBe(COOK_SLOT);
    expect(moveSlot(COOK_SLOT, 'right')).toBe(COOK_SLOT);
    expect(moveSlot(COOK_SLOT, 'down')).toBe(COOK_SLOT);
  });

  it('pot chips fit beside the pot and can be hit', () => {
    const pot = [...INGREDIENTS];
    pot.forEach((id, k) => {
      const r = chipRect(k, id);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(320);
      expect(r.y + r.h).toBeLessThanOrEqual(slotRect(0).y);
      expect(chipAt(pot, r.x + 2, r.y + 2)).toBe(k);
      // chips stay clear of the drop zone, so the pot is always free to drop on
      expect(r.x + r.w <= DROP.x || r.x >= DROP.x + DROP.w).toBe(true);
    });
    expect(chipAt(pot, 160, 100)).toBe(-1);
  });

  it('wraps text at word breaks', () => {
    expect(wrapText('ONE TWO THREE', 7)).toEqual(['ONE TWO', 'THREE']);
    expect(wrapText('', 7)).toEqual([]);
  });
});

describe('the game', () => {
  const seed = 'unit-a';
  const first = ordersOf(seed, 1)[0] as Order;

  const hud = (g: GameInstance, id: string) => g.stats().hud.find((s) => s.id === id)?.value;

  it('starts at once with 3 hearts, the order in the description and nothing in the pot', () => {
    const g = make(seed);
    const stats = g.stats();
    expect(stats.score).toBe(0);
    expect(stats.over).toBe(false);
    expect(hud(g, 'hearts')).toBe('3 of 3');
    expect(stats.description).toContain(first.text);
    expect(stats.description).toContain('In the pot: nothing yet.');
    expect(stats.hud.find((s) => s.id === 'hearts')?.hearts).toEqual({ n: 3, max: 3 });
  });

  it('taps put ingredients in the pot and take them out again', () => {
    const g = make(seed);
    fill(g, ['audience', 'role']);
    expect(g.stats().description).toContain('In the pot: audience, role.');
    fill(g, ['audience']);
    expect(g.stats().description).toContain('In the pot: role.');
    // tapping the chip in the pot also removes it
    const chip = chipRect(0, 'role');
    run(g, STEP_MS, tapAt(chip.x + 3, chip.y + 3));
    expect(g.stats().description).toContain('In the pot: nothing yet.');
  });

  it('keyboard: arrows move the highlight, Enter adds, and Cook is the last slot', () => {
    const g = make(seed);
    expect(g.stats().description).toContain('Highlighted: audience ingredient.');
    run(g, STEP_MS, press('right'));
    run(g, STEP_MS, press('act'));
    expect(g.stats().description).toContain('In the pot: language.');
    run(g, STEP_MS, press('down'));
    expect(g.stats().description).toContain('Highlighted: cite sources ingredient.');
    for (let i = 0; i < 4; i++) run(g, STEP_MS, press('right'));
    expect(g.stats().description).toContain('Highlighted: the Cook button.');
    run(g, STEP_MS, press('act'));
    run(g, 1000);
    expect(g.stats().description).toContain('You served:');
  });

  it('Cook does nothing with an empty pot', () => {
    const g = make(seed);
    cookNow(g);
    run(g, 1500);
    expect(g.stats().description).not.toContain('You served');
    expect(hud(g, 'hearts')).toBe('3 of 3');
  });

  it('a perfect pot serves a good dish: points, tips and no heart lost, then the next order', () => {
    const g = make(seed);
    fill(g, first.needs);
    cookNow(g);
    run(g, 1000);
    const d = g.stats().description;
    expect(d).toMatch(/You served: .+\. Good dish, \d+ points\./);
    expect(g.stats().score).toBeGreaterThanOrEqual(100);
    expect(hud(g, 'hearts')).toBe('3 of 3');
    expect(hud(g, 'served')).toBe('1');
    run(g, 2600);
    const second = ordersOf(seed, 2)[1] as Order;
    expect(g.stats().description).toContain(`Order 2 from ${second.customer.name.toLowerCase()}: "${second.text}"`);
    expect(g.stats().description).toContain('In the pot: nothing yet.');
  });

  it('a missing ingredient serves a wrong dish and costs a heart', () => {
    const g = make(seed);
    fill(g, first.needs.slice(1));
    cookNow(g);
    run(g, 1000);
    expect(g.stats().description).toContain('Wrong dish, you lost a heart.');
    expect(hud(g, 'hearts')).toBe('2 of 3');
    expect(g.stats().score).toBe(0);
  });

  it('a press right after the result starts is ignored, a later one skips it', () => {
    const g = make(seed);
    fill(g, first.needs.slice(1));
    cookNow(g);
    run(g, 850);
    run(g, STEP_MS, press('act'));
    expect(g.stats().description).toContain('You served');
    run(g, 1000);
    run(g, STEP_MS, press('act'));
    expect(g.stats().description).toContain('Order 2 from');
  });

  it('running out of time costs a heart; three lost hearts end the run with a recap', () => {
    const g = make(seed);
    run(g, 25_000);
    expect(g.stats().description).toContain('Too slow');
    expect(hud(g, 'hearts')).toBe('2 of 3');
    for (let i = 0; i < 40 && !g.stats().over; i++) run(g, 20_000);
    const end = g.stats();
    expect(end.over).toBe(true);
    expect(hud(g, 'hearts')).toBe('0 of 3');
    expect(end.recap.length).toBeGreaterThan(3);
    expect(end.recap[0]).toMatch(/^You cooked for 3 orders: 0 good dishes, 0 wrong dishes and 3 customers who gave up waiting\./);
    const before = end.score;
    run(g, 1000, press('act'));
    expect(g.stats().score).toBe(before);
  });

  it('plays the same for the same seed (the Daily Challenge) whatever the player does', () => {
    const a = make('daily-1');
    const b = make('daily-1');
    const firstDaily = ordersOf('daily-1', 1)[0] as Order;
    fill(b, ['role']);
    expect(a.stats().description.split('Ingredients')[0]).toBe(b.stats().description.split('Ingredients')[0]);
    fill(a, firstDaily.needs);
    fill(b, firstDaily.needs);
    expect(make('daily-1').stats().description).toContain(firstDaily.text);
  });

  it('drag: dropping a shelf ingredient on the pot adds it; dropping elsewhere does not', () => {
    const g = make(seed);
    const from = center(1);
    const move = (x: number, y: number, down: boolean): InputFrame => ({ ...NONE, pointer: { x, y, down } });
    run(g, STEP_MS, move(from.x, from.y, true));
    run(g, STEP_MS, move(from.x + 10, from.y - 20, true));
    run(g, STEP_MS, move(160, 100, true));
    // let go over the pot: the browser also reports the end of the press as a tap at that spot
    run(g, STEP_MS, { ...NONE, taps: [{ x: 160, y: 100 }], pointer: { x: 160, y: 100, down: false } });
    expect(g.stats().description).toContain('In the pot: language.');

    // a drag that ends back on the shelf adds nothing, and does not toggle the tile it ends on
    const other = center(2);
    run(g, STEP_MS, move(other.x, other.y, true));
    run(g, STEP_MS, move(other.x + 4, other.y - 40, true));
    run(g, STEP_MS, move(40, 20, true));
    run(g, STEP_MS, { ...NONE, taps: [{ x: 40, y: 20 }], pointer: { x: 40, y: 20, down: false } });
    expect(g.stats().description).toContain('In the pot: language.');
  });

  it('a still press on a tile is a tap, not a drag', () => {
    const g = make(seed);
    const c = center(0);
    run(g, STEP_MS, { ...NONE, pointer: { x: c.x, y: c.y, down: true } });
    run(g, STEP_MS, { ...NONE, taps: [{ x: c.x, y: c.y }], pointer: { x: c.x, y: c.y, down: false } });
    expect(g.stats().description).toContain('In the pot: audience.');
  });

  it('draws every phase without throwing', () => {
    const g = make(seed);
    const ctx = fakeContext();
    g.draw(ctx);
    fill(g, first.needs);
    g.draw(ctx);
    cookNow(g);
    run(g, 400);
    g.draw(ctx);
    run(g, 600);
    g.draw(ctx);
    run(g, 3000);
    g.draw(ctx);
    run(g, 40_000);
    g.draw(ctx);
    expect(inside(DROP, 160, 100)).toBe(true);
  });

  it('describes the order text and the lesson for screen readers after cooking', () => {
    const g = make(seed);
    fill(g, first.needs);
    cookNow(g);
    run(g, 1000);
    expect(g.stats().description).toContain(cook(first, first.needs).lesson);
  });
});

describe('recap and definition', () => {
  it('names the most missed ingredient and explains prompts, sources and checking', () => {
    const lines = buildRecap({ orders: 6, served: 3, wrong: 2, timeouts: 1, missed: { cite: 2, role: 1 } });
    expect(lines[0]).toBe('You cooked for 6 orders: 3 good dishes, 2 wrong dishes and 1 customer who gave up waiting.');
    expect(lines[1]).toBe('The ingredient you missed most: cite sources (2 times).');
    expect(lines.join(' ')).toMatch(/cite sources and to say if it is unsure/);
    expect(lines.join(' ')).toMatch(/health worker/);
    expect(buildRecap({ orders: 1, served: 0, wrong: 0, timeouts: 1, missed: {} })).toHaveLength(5);
  });

  it('is a complete game definition with a five-page briefing that ends on When should I trust it?', () => {
    expect(luto.slug).toBe('luto-ni-ara');
    expect(luto.briefing).toHaveLength(5);
    expect(luto.briefing[0]?.title).toBe('Welcome to my kitchen!');
    expect(luto.briefing[4]?.title).toBe('When should I trust it?');
    expect(luto.takeaway.startsWith('When should I trust it?')).toBe(true);
    expect(luto.howTo.length).toBeGreaterThanOrEqual(4);
    expect(luto.goodRun).toBeGreaterThan(0);
  });
});
