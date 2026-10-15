// The seeded order generator for Luto ni Ara: customers, what they ask for, and which prompt ingredients it needs.
// An order is built from parts (task, audience, language, length, format, role). Each part that the customer says out loud
// is an ingredient the pot must contain; health questions also need "cite sources" and "say if unsure".
// All customers are fictional. Health tasks are general education only: no dosing, no diagnosis.
import { rngInt, rngPick, shuffle, type Rng } from '../engine/rng';
import type { Look } from '../feed-mo-to/users';

export type Ingredient = 'role' | 'audience' | 'language' | 'length' | 'format' | 'cite' | 'unsure';

/** Shelf order, also the priority used to pick the wrong dish when several ingredients are missing. */
export const INGREDIENTS: readonly Ingredient[] = ['audience', 'language', 'length', 'format', 'role', 'cite', 'unsure'];

export interface IngredientInfo {
  id: Ingredient;
  /** Shelf tile text: the first line has at most 8 characters, the second at most 7 (a check mark sits beside it). */
  line1: string;
  line2: string;
  /** Short name drawn in the pot (8 characters at most). */
  chip: string;
  /** Plain-words name for the screen-reader description. */
  name: string;
}

export const INGREDIENT_INFO: Readonly<Record<Ingredient, IngredientInfo>> = {
  audience: { id: 'audience', line1: 'AUDIENCE', line2: 'WHO FOR', chip: 'AUDIENCE', name: 'audience' },
  language: { id: 'language', line1: 'LANGUAGE', line2: 'SPEAK', chip: 'LANGUAGE', name: 'language' },
  length: { id: 'length', line1: 'LENGTH', line2: 'SIZE', chip: 'LENGTH', name: 'length' },
  format: { id: 'format', line1: 'FORMAT', line2: 'SHAPE', chip: 'FORMAT', name: 'format' },
  role: { id: 'role', line1: 'ROLE', line2: 'ITS JOB', chip: 'ROLE', name: 'role' },
  cite: { id: 'cite', line1: 'CITE', line2: 'SOURCES', chip: 'SOURCES', name: 'cite sources' },
  unsure: { id: 'unsure', line1: 'SAY IF', line2: 'UNSURE', chip: 'UNSURE', name: 'say if unsure' },
};

export interface Customer {
  id: string;
  /** Upper case, 5 characters at most (drawn under the face). */
  name: string;
  look: Look;
}

export const CUSTOMERS: readonly Customer[] = [
  { id: 'nena', name: 'NENA', look: { hair: '#c9c9d6', skin: '#e2a77e', shirt: '#1e7d50', glasses: true } },
  { id: 'tonyo', name: 'TONYO', look: { hair: '#1f2550', skin: '#c98a5e', shirt: '#35408e' } },
  { id: 'joy', name: 'JOY', look: { hair: '#4a2c1a', skin: '#e8b48c', shirt: '#ff7a59' } },
  { id: 'ben', name: 'BEN', look: { hair: '#1f2550', skin: '#d99a6c', shirt: '#e8b84a' } },
  { id: 'cora', name: 'CORA', look: { hair: '#6b6f8a', skin: '#e2a77e', shirt: '#c4323a', glasses: true } },
  { id: 'lito', name: 'LITO', look: { hair: '#4a2c1a', skin: '#c98a5e', shirt: '#1e7d50' } },
  { id: 'bebe', name: 'BEBE', look: { hair: '#1f2550', skin: '#e8b48c', shirt: '#35408e' } },
];

export interface Task {
  /** The ask, as the customer says it (starts a sentence, no full stop). */
  text: string;
  health: boolean;
  /** Short subject for dish names, e.g. "dengue" (lower case). */
  subject: string;
}

export const TASKS: readonly Task[] = [
  { text: 'Explain how dengue spreads', health: true, subject: 'dengue' },
  { text: 'Explain what a vaccine does', health: true, subject: 'vaccines' },
  { text: 'Explain why we wash hands', health: true, subject: 'handwashing' },
  { text: 'Explain high blood pressure', health: true, subject: 'blood pressure' },
  { text: 'Explain safe drinking water', health: true, subject: 'safe water' },
  { text: 'Explain what diabetes is', health: true, subject: 'diabetes' },
  { text: 'Explain why we cover drums', health: true, subject: 'mosquito spots' },
  { text: 'Explain why we get flu shots', health: true, subject: 'flu shots' },
  { text: 'Write a birthday greeting', health: false, subject: 'a greeting' },
  { text: 'Write a thank-you note', health: false, subject: 'a thank-you note' },
  { text: 'Explain how email works', health: false, subject: 'email' },
  { text: 'Explain what a rainbow is', health: false, subject: 'rainbows' },
  { text: 'Plan a school project', health: false, subject: 'a project plan' },
  { text: 'Explain online bill payment', health: false, subject: 'online bills' },
  { text: 'Write a polite reminder', health: false, subject: 'a polite text' },
  { text: 'Explain how typhoons form', health: false, subject: 'typhoons' },
];

export interface Phrase {
  /** What the customer says. */
  text: string;
  /** Short word for dish names ("Lola", "Tagalog", "short" ...). */
  word: string;
}

export const AUDIENCES: readonly Phrase[] = [
  { text: 'for Lola', word: 'Lola' },
  { text: 'for Lolo', word: 'Lolo' },
  { text: 'for a Grade 4 kid', word: 'a Grade 4 kid' },
  { text: 'for a busy nanay', word: 'a busy nanay' },
  { text: 'for a health aide', word: 'a health aide' },
  { text: 'for a teen', word: 'a teen' },
];
export const LANGUAGES: readonly Phrase[] = [
  { text: 'in simple Tagalog', word: 'Tagalog' },
  { text: 'in Taglish', word: 'Taglish' },
  { text: 'in plain English', word: 'plain English' },
];
export const LENGTHS: readonly Phrase[] = [
  { text: 'Keep it short.', word: 'short' },
  { text: 'Max 3 sentences.', word: '3 sentences' },
  { text: 'One paragraph.', word: 'one paragraph' },
];
export const FORMATS: readonly Phrase[] = [
  { text: 'Give 3 steps.', word: '3 steps' },
  { text: 'Use a list.', word: 'a list' },
  { text: 'Make a table.', word: 'a table' },
];
export const ROLES: readonly Phrase[] = [
  { text: 'Talk like a nurse.', word: 'a nurse' },
  { text: 'Talk like a teacher.', word: 'a teacher' },
  { text: 'Talk like a health worker.', word: 'a health worker' },
];

export interface Order {
  /** Unique key of the whole order, used for the never-repeat rule. */
  key: string;
  customer: Customer;
  /** The full order as shown to the player. */
  text: string;
  task: Task;
  health: boolean;
  /** Ingredients the pot must contain. */
  needs: readonly Ingredient[];
  audience: Phrase;
  language: Phrase | null;
  length: Phrase | null;
  format: Phrase | null;
  role: Phrase | null;
}

/** Every order names an audience. How many extra parts it also names grows every 3 orders, up to all of them. */
export const extraPartsFor = (index: number): number => Math.min(4, 1 + Math.floor(index / 3));

/** Chance that an order is a health question. The first 2 orders never are (a gentle start). */
export const healthChance = (index: number): number => (index < 2 ? 0 : 0.6);

/** Seconds the customer waits: shrinks with every order, with extra time for every ingredient needed. */
export const BASE_PATIENCE_S = 20;
export const MIN_BASE_PATIENCE_S = 7;
export const PATIENCE_STEP_S = 0.8;
export const PER_INGREDIENT_S = 2;

export const patienceMs = (index: number, needs: number): number =>
  Math.round((Math.max(MIN_BASE_PATIENCE_S, BASE_PATIENCE_S - PATIENCE_STEP_S * index) + PER_INGREDIENT_S * needs) * 1000);

export interface OrderGenerator {
  /** The next order. Never returns the same order twice; the same seed gives the same orders. */
  next(index: number): Order;
}

export function createOrderGenerator(rng: Rng): OrderGenerator {
  const seen = new Set<string>();
  let lastCustomer = '';
  return {
    next(index) {
      for (let attempt = 0; ; attempt++) {
        const health = rng() < healthChance(index);
        const task = rngPick(
          TASKS.filter((t) => t.health === health),
          rng,
        );
        const audience = rngPick(AUDIENCES, rng);
        const optional = shuffle<'language' | 'length' | 'format' | 'role'>(['language', 'length', 'format', 'role'], rng).slice(0, extraPartsFor(index));
        const language = optional.includes('language') ? rngPick(LANGUAGES, rng) : null;
        const length = optional.includes('length') ? rngPick(LENGTHS, rng) : null;
        const format = optional.includes('format') ? rngPick(FORMATS, rng) : null;
        const role = optional.includes('role') ? rngPick(ROLES, rng) : null;
        const key = [task.text, audience.text, language?.text, length?.text, format?.text, role?.text].join('|');
        // the space is far bigger than any run; after many retries just take the next task so the loop always ends
        if (seen.has(key) && attempt < 200) continue;
        const finalKey = seen.has(key) ? `${key}#${index}` : key;
        seen.add(finalKey);
        const needs: Ingredient[] = INGREDIENTS.filter((i) => {
          if (i === 'audience') return true;
          if (i === 'cite' || i === 'unsure') return health;
          return ({ language, length, format, role } as const)[i] !== null;
        });
        const parts = [`${task.text} ${audience.text}${language ? ` ${language.text}` : ''}.`, length?.text, format?.text, role?.text];
        let customer = rngPick(CUSTOMERS, rng);
        if (customer.id === lastCustomer) customer = CUSTOMERS[(CUSTOMERS.indexOf(customer) + 1 + rngInt(rng, 0, 2)) % CUSTOMERS.length] as Customer;
        lastCustomer = customer.id;
        return { key: finalKey, customer, text: parts.filter(Boolean).join(' '), task, health, needs, audience, language, length, format, role };
      }
    },
  };
}

// Dishes ---------------------------------------------------------------------------------------------------------

export type Quality = 'perfect' | 'cluttered' | 'missing' | 'muddled';

export interface Dish {
  quality: Quality;
  /** Dish name, upper case friendly, 62 characters at most. */
  name: string;
  /** One-line lesson, 90 characters at most. */
  lesson: string;
  /** Ingredients the pot lacked, in shelf priority order. */
  missing: readonly Ingredient[];
  /** Ingredients in the pot that the order did not ask for. */
  extra: readonly Ingredient[];
}

/** Three or more unneeded ingredients muddle the answer. */
export const MUDDLED_EXTRAS = 3;

/** The funny wrong dish for the first missing ingredient. */
function wrongDish(order: Order, first: Ingredient): { name: string; lesson: string } {
  const who = order.audience.word;
  const lang = order.language?.word ?? 'the right language';
  switch (first) {
    case 'audience':
      return { name: `A doctor's lecture on ${order.task.subject}, full of big words`, lesson: 'Say who the answer is for, so it matches their level.' };
    case 'language':
      return { name: `Deep English soup, but ${who} asked for ${lang}`, lesson: 'Name the language you want, or the AI will pick one for you.' };
    case 'length':
      return { name: `A 3-page essay on ${order.task.subject} nobody had time to read`, lesson: 'Say how long: short, 3 sentences, one paragraph.' };
    case 'format':
      return { name: 'A wall-of-text spaghetti, with no steps or list', lesson: 'Ask for a format, like 3 steps, a list or a table.' };
    case 'role':
      return { name: 'A robot with no job: a bland, same-for-everyone answer', lesson: 'Give it a role, like nurse or teacher, to set the tone.' };
    case 'cite':
      return { name: 'Mystery meat: a health claim from nowhere', lesson: 'For health questions, ask it to cite sources you can check.' };
    case 'unsure':
      return { name: 'Overconfident adobo: very sure, very made up', lesson: 'Ask it to say if it is unsure, so guesses do not sound like facts.' };
  }
}

/** What the AI "cooks" from the pot. Pure: the same order and pot always give the same dish. */
export function cook(order: Order, pot: readonly Ingredient[]): Dish {
  const inPot = new Set(pot);
  const missing = INGREDIENTS.filter((i) => order.needs.includes(i) && !inPot.has(i));
  const extra = INGREDIENTS.filter((i) => inPot.has(i) && !order.needs.includes(i));
  if (missing.length > 0) {
    const first = missing[0] as Ingredient;
    const wrong = wrongDish(order, first);
    return { quality: 'missing', name: wrong.name, lesson: wrong.lesson, missing, extra };
  }
  if (extra.length >= MUDDLED_EXTRAS) {
    return { quality: 'muddled', name: 'Kitchen-sink soup: too many orders at once', lesson: 'Only add what the customer asked for. Extra rules confuse the AI.', missing, extra };
  }
  const name = `${order.task.subject.charAt(0).toUpperCase()}${order.task.subject.slice(1)} for ${order.audience.word}${order.language ? `, ${order.language.word}` : ''}`;
  if (extra.length > 0) {
    return { quality: 'cluttered', name, lesson: 'Served, but extra instructions nobody asked for slow the answer down.', missing, extra };
  }
  return {
    quality: 'perfect',
    name,
    lesson: order.health ? 'A clear prompt, with sources and honesty, still needs a check with a health worker.' : 'A good prompt is a good recipe: clear parts, clear dish.',
    missing,
    extra,
  };
}

export const isServed = (d: Dish): boolean => d.quality === 'perfect' || d.quality === 'cluttered';

// Scoring --------------------------------------------------------------------------------------------------------
export const BASE_POINTS = 100;
export const CLUTTER_FACTOR = 0.6;
export const SPEED_POINTS = 60;
/** Tip per health ingredient ("cite sources", "say if unsure") on a served health order. */
export const TIP_POINTS = 25;

export interface Pay {
  base: number;
  speed: number;
  tips: number;
  total: number;
}

/** Points for a served dish. `timeFraction` is the share of the customer's patience still left (0 to 1). */
export function payFor(dish: Dish, order: Order, timeFraction: number): Pay {
  if (!isServed(dish)) return { base: 0, speed: 0, tips: 0, total: 0 };
  const base = Math.round(BASE_POINTS * (dish.quality === 'perfect' ? 1 : CLUTTER_FACTOR));
  const speed = Math.round(SPEED_POINTS * Math.min(1, Math.max(0, timeFraction)));
  const tips = order.health ? TIP_POINTS * (order.needs.includes('cite') ? 1 : 0) + TIP_POINTS * (order.needs.includes('unsure') ? 1 : 0) : 0;
  return { base, speed, tips, total: base + speed + tips };
}

export const HEARTS = 3;
