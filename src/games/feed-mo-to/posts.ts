// Posts for Feed Mo 'To, generated from templates. Scary and miracle-cure posts are fake (the game stamps them
// "ARAW GAME · FAKE" when revealed); the health center tips are curated true facts and are never generated.
// Each post has a short headline for the canvas card (an optional kicker line such as "URGENT!" and the card text, wrapped
// to the card width after translation) and a full text for the screen-reader panel. The words live in src/app/i18n.ts
// (g.feed.*) so every language pack translates them; a post is built in the active language.
import { t, type StringKey } from '../../app/i18n';
import { rngPick, shuffle, type Rng } from '../engine/rng';
import { LIKEABLE, type TopicId } from './rules';
import type { Persona } from './users';
import type { ContentReview } from '../../content/review';

export interface Post {
  /** Template and slot choice, so the same post is not offered twice in a row. */
  key: string;
  topic: TopicId;
  /** One short line above the card text (an alarm word), or none. */
  kicker?: string;
  /** The card headline, wrapped to the card when drawn (about 11 characters a line in English, 4 lines at most). */
  card: string;
  text: string;
  /** True for the generated scary and miracle posts (they get the FAKE stamp). */
  fake: boolean;
}

interface Made {
  key: string;
  kicker?: string;
  card: string;
  text: string;
}
type Template = (rng: Rng) => Made;

interface Slot {
  /** Short id, part of the post key. */
  s: string;
  /** The long words used in the full text. */
  l: StringKey;
}

const ALARMS: readonly StringKey[] = ['g.feed.alarm.urgent', 'g.feed.alarm.warning', 'g.feed.alarm.shocking', 'g.feed.alarm.breaking'];
const PLACES: ReadonlyArray<Slot & { card: StringKey }> = [
  { s: 'MARKET', l: 'g.feed.place.market', card: 'g.feed.card.fever.market' },
  { s: 'CANTEEN', l: 'g.feed.place.canteen', card: 'g.feed.card.fever.canteen' },
  { s: 'TERMINAL', l: 'g.feed.place.terminal', card: 'g.feed.card.fever.terminal' },
  { s: 'BARANGAY', l: 'g.feed.place.barangay', card: 'g.feed.card.fever.barangay' },
];
const FOODS_AT_RISK: ReadonlyArray<Slot & { card: StringKey }> = [
  { s: 'FISH', l: 'g.feed.food.fish', card: 'g.feed.card.poison.fish' },
  { s: 'RICE', l: 'g.feed.food.rice', card: 'g.feed.card.poison.rice' },
  { s: 'WATER', l: 'g.feed.food.water', card: 'g.feed.card.poison.water' },
];
const HERBS: ReadonlyArray<Slot & { card: StringKey }> = [
  { s: 'LEAF TEA', l: 'g.feed.herb.leaf', card: 'g.feed.card.herb.leaf' },
  { s: 'ROOT JUICE', l: 'g.feed.herb.root', card: 'g.feed.card.herb.root' },
  { s: 'BERRY MIX', l: 'g.feed.herb.berry', card: 'g.feed.card.herb.berry' },
];
const DISHES: ReadonlyArray<Slot & { recipe: StringKey; twist: StringKey }> = [
  { s: 'ADOBO', l: 'g.feed.dish.adobo', recipe: 'g.feed.card.recipe.adobo', twist: 'g.feed.card.twist.adobo' },
  { s: 'SINIGANG', l: 'g.feed.dish.sinigang', recipe: 'g.feed.card.recipe.sinigang', twist: 'g.feed.card.twist.sinigang' },
  { s: 'LECHE FLAN', l: 'g.feed.dish.lecheFlan', recipe: 'g.feed.card.recipe.lecheFlan', twist: 'g.feed.card.twist.lecheFlan' },
  { s: 'PANCIT', l: 'g.feed.dish.pancit', recipe: 'g.feed.card.recipe.pancit', twist: 'g.feed.card.twist.pancit' },
];

/** A post with a fixed headline and text (no slots). */
const fixed = (key: string, card: StringKey, text: StringKey): Template => () => ({ key, card: t(card), text: t(text) });

const SCARE: readonly Template[] = [
  (rng) => {
    const alarm = t(rngPick(ALARMS, rng));
    const place = rngPick(PLACES, rng);
    return { key: `scare-fever-${place.s}`, kicker: alarm, card: t(place.card), text: t('g.feed.text.fever', { alarm, place: t(place.l) }) };
  },
  (rng) => {
    const alarm = t(rngPick(ALARMS, rng));
    const food = rngPick(FOODS_AT_RISK, rng);
    return { key: `scare-poison-${food.s}`, kicker: alarm, card: t(food.card), text: t('g.feed.text.poison', { alarm, food: t(food.l) }) };
  },
  (rng) => {
    const alarm = t(rngPick(ALARMS, rng));
    return { key: `scare-hidden-${alarm}`, kicker: alarm, card: t('g.feed.card.hidden'), text: t('g.feed.text.hidden', { alarm }) };
  },
];

const MIRACLE: readonly Template[] = [
  (rng) => {
    const herb = rngPick(HERBS, rng);
    return { key: `miracle-herb-${herb.s}`, card: t(herb.card), text: t('g.feed.text.herb', { herb: t(herb.l) }) };
  },
  fixed('miracle-germs', 'g.feed.card.germs', 'g.feed.text.germs'),
  fixed('miracle-never-sick', 'g.feed.card.neverSick', 'g.feed.text.neverSick'),
];

const FOOD: readonly Template[] = [
  (rng) => {
    const dish = rngPick(DISHES, rng);
    return { key: `food-recipe-${dish.s}`, card: t(dish.recipe), text: t('g.feed.text.recipe', { dish: t(dish.l) }) };
  },
  (rng) => {
    const dish = rngPick(DISHES, rng);
    return { key: `food-twist-${dish.s}`, card: t(dish.twist), text: t('g.feed.text.twist', { dish: t(dish.l) }) };
  },
];

const FAMILY: readonly Template[] = [
  fixed('family-school', 'g.feed.card.school', 'g.feed.text.school'),
  fixed('family-lola', 'g.feed.card.lola', 'g.feed.text.lola'),
  fixed('family-party', 'g.feed.card.party', 'g.feed.text.party'),
];

const SHOWBIZ: readonly Template[] = [
  fixed('showbiz-finale', 'g.feed.card.finale', 'g.feed.text.finale'),
  fixed('showbiz-singing', 'g.feed.card.singing', 'g.feed.text.singing'),
  fixed('showbiz-fiesta', 'g.feed.card.fiestaSinger', 'g.feed.text.fiestaSinger'),
];

const SPORTS: readonly Template[] = [
  fixed('sports-league', 'g.feed.card.league', 'g.feed.text.league'),
  fixed('sports-highlights', 'g.feed.card.highlights', 'g.feed.text.highlights'),
  fixed('sports-zumba', 'g.feed.card.zumba', 'g.feed.text.zumba'),
];

const NEWS: readonly Template[] = [
  fixed('news-fiesta', 'g.feed.card.fiestaSchedule', 'g.feed.text.fiestaSchedule'),
  fixed('news-road', 'g.feed.card.road', 'g.feed.text.road'),
  fixed('news-cleanup', 'g.feed.card.cleanup', 'g.feed.text.cleanup'),
];

/** Curated true tips (basic, well-established public health advice). Never generated. */
const CLINIC: readonly Template[] = [
  fixed('clinic-hands', 'g.feed.card.hands', 'g.feed.text.hands'),
  fixed('clinic-water', 'g.feed.card.water', 'g.feed.text.water'),
  fixed('clinic-unsure', 'g.feed.card.unsure', 'g.feed.text.unsure'),
  fixed('clinic-vaccines', 'g.feed.card.vaccines', 'g.feed.text.vaccines'),
  fixed('clinic-share', 'g.feed.card.share', 'g.feed.text.share'),
];

export const TEMPLATES: Readonly<Record<TopicId, readonly Template[]>> = {
  scare: SCARE,
  miracle: MIRACLE,
  food: FOOD,
  family: FAMILY,
  showbiz: SHOWBIZ,
  sports: SPORTS,
  news: NEWS,
  clinic: CLINIC,
};

/** A post on `topic`. Tries a few times to avoid the keys in `avoid`. */
export function buildPost(topic: TopicId, rng: Rng, avoid: ReadonlySet<string> = new Set()): Post {
  const templates = TEMPLATES[topic];
  let made = rngPick(templates, rng)(rng);
  for (let i = 0; i < 6 && avoid.has(made.key); i++) made = rngPick(templates, rng)(rng);
  return { ...made, topic, fake: topic === 'scare' || topic === 'miracle' };
}

export interface CandidateOptions {
  user: Persona;
  userIndex: number;
  rng: Rng;
  /** Keys shown in the last few rounds. */
  recent: ReadonlySet<string>;
}

/**
 * Three candidates on three different topics: one sensational post, one the user likes, and a third that is a trusted
 * health center tip about 45% of the time (from the 4th user on, a second sensational post 25% of the time), otherwise
 * something else. The result depends only on the seeded `rng`, never on what the player picked.
 */
export function makeCandidates({ user, userIndex, rng, recent }: CandidateOptions): Post[] {
  const first: TopicId = rng() < 0.55 ? 'scare' : 'miracle';
  const liked = rngPick(user.interests, rng);
  const roll = rng();
  let third: TopicId;
  if (userIndex >= 3 && roll < 0.25) third = first === 'scare' ? 'miracle' : 'scare';
  else if (roll < 0.7) third = 'clinic';
  else third = rngPick(LIKEABLE, rng);
  if (third === liked || third === first) third = rngPick(LIKEABLE.filter((t) => t !== liked), rng);
  const used = new Set(recent);
  const posts = [first, liked, third].map((topic) => {
    const post = buildPost(topic, rng, used);
    used.add(post.key);
    return post;
  });
  return shuffle(posts, rng);
}

/** Every line in this file is unreviewed teaching content (CONTENT_GUIDE 7). */
export const CONTENT_REVIEW: ContentReview = {
  basis: 'CONTENT_GUIDE: fake posts are generated and stamped ARAW GAME · FAKE; health center tips come from the curated DOH/WHO-level pool',
  review_status: 'unreviewed',
};
