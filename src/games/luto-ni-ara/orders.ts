// The seeded order generator for Luto ni Ara: customers, what they ask for, and which prompt ingredients it needs.
// An order is built from parts (task, audience, language, length, format, role). Each part that the customer says out loud
// is an ingredient the pot must contain; health questions also need "cite sources" and "say if unsure".
// All customers are fictional. Health tasks are general education only: no dosing, no diagnosis.
import { t } from '../../app/i18n';
import { tx } from '../../i18n/runtime';
import { rngInt, rngPick, shuffle, type Rng } from '../engine/rng';
import type { Look } from '../feed-mo-to/users';
import type { ContentReview } from '../../content/review';

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
  { text: 'for a busy mom', word: 'a busy mom' },
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

/** The order as the customer says it, in the active language: every part is translated on its own, then joined. */
export function orderText(order: Order): string {
  const ask = order.language
    ? t('g.luto.order.askLang', { task: order.task.text, audience: order.audience.text, language: order.language.text })
    : t('g.luto.order.ask', { task: order.task.text, audience: order.audience.text });
  return [ask, order.length?.text, order.format?.text, order.role?.text]
    .filter((part): part is string => !!part)
    .map((part, i) => (i === 0 ? part : tx(part)))
    .join(' ');
}

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

/** The funny wrong dish for the first missing ingredient (in the active language: t() also translates the inserted words). */
function wrongDish(order: Order, first: Ingredient): { name: string; lesson: string } {
  const subject = order.task.subject;
  const who = order.audience.word;
  const language = order.language?.word ?? t('g.luto.rightLanguage');
  switch (first) {
    case 'audience':
      return { name: t('g.luto.dish.audience', { subject }), lesson: t('g.luto.lesson.audience') };
    case 'language':
      return { name: t('g.luto.dish.language', { who, language }), lesson: t('g.luto.lesson.language') };
    case 'length':
      return { name: t('g.luto.dish.length', { subject }), lesson: t('g.luto.lesson.length') };
    case 'format':
      return { name: t('g.luto.dish.format'), lesson: t('g.luto.lesson.format') };
    case 'role':
      return { name: t('g.luto.dish.role'), lesson: t('g.luto.lesson.role') };
    case 'cite':
      return { name: t('g.luto.dish.cite'), lesson: t('g.luto.lesson.cite') };
    case 'unsure':
      return { name: t('g.luto.dish.unsure'), lesson: t('g.luto.lesson.unsure') };
  }
}

const capitalize = (v: string): string => `${v.charAt(0).toUpperCase()}${v.slice(1)}`;

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
    return { quality: 'muddled', name: t('g.luto.dish.muddled'), lesson: t('g.luto.lesson.muddled'), missing, extra };
  }
  const vars = { subject: order.task.subject, audience: order.audience.word };
  const name = capitalize(order.language ? t('g.luto.dish.goodLang', { ...vars, language: order.language.word }) : t('g.luto.dish.good', vars));
  if (extra.length > 0) {
    return { quality: 'cluttered', name, lesson: t('g.luto.lesson.cluttered'), missing, extra };
  }
  return {
    quality: 'perfect',
    name,
    lesson: order.health ? t('g.luto.lesson.perfectHealth') : t('g.luto.lesson.perfect'),
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

/** Every line in this file is unreviewed teaching content (CONTENT_GUIDE 7). */
export const CONTENT_REVIEW: ContentReview = {
  basis: 'CONTENT_GUIDE: prompting basics; health questions ask the AI to cite sources and say when unsure; no dosing or diagnosis',
  review_status: 'unreviewed',
};
