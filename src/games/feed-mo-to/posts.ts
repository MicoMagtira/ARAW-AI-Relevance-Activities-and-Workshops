// Posts for Feed Mo 'To, generated from templates. Scary and miracle-cure posts are fake (the game stamps them
// "ARAW GAME · FAKE" when revealed); the health center tips are curated true facts and are never generated.
// Each post has up to 4 short lines (11 characters at most) for the canvas card and a full text for the screen-reader panel.
import { rngPick, shuffle, type Rng } from '../engine/rng';
import { LIKEABLE, type TopicId } from './rules';
import type { Persona } from './users';
import type { ContentReview } from '../../content/review';

export interface Post {
  /** Template and slot choice, so the same post is not offered twice in a row. */
  key: string;
  topic: TopicId;
  lines: readonly string[];
  text: string;
  /** True for the generated scary and miracle posts (they get the FAKE stamp). */
  fake: boolean;
}

interface Made {
  key: string;
  lines: readonly string[];
  text: string;
}
type Template = (rng: Rng) => Made;

interface Slot {
  s: string;
  l: string;
}

const ALARMS = ['URGENT!', 'WARNING!', 'SHOCKING!', 'BREAKING!'] as const;
const PLACES: readonly Slot[] = [
  { s: 'MARKET', l: 'wet market' },
  { s: 'CANTEEN', l: 'school canteen' },
  { s: 'TERMINAL', l: 'jeepney terminal' },
  { s: 'BARANGAY', l: 'barangay' },
];
const FOODS_AT_RISK: readonly Slot[] = [
  { s: 'FISH', l: 'market fish' },
  { s: 'RICE', l: 'canteen rice' },
  { s: 'WATER', l: 'refill station water' },
];
const HERBS: readonly Slot[] = [
  { s: 'LEAF TEA', l: 'Magic leaf tea' },
  { s: 'ROOT JUICE', l: 'Secret root juice' },
  { s: 'BERRY MIX', l: 'Super berry powder' },
];
const DISHES: readonly Slot[] = [
  { s: 'ADOBO', l: 'adobo' },
  { s: 'SINIGANG', l: 'sinigang' },
  { s: 'LECHE FLAN', l: 'leche flan' },
  { s: 'PANCIT', l: 'pancit' },
];

const SCARE: readonly Template[] = [
  (rng) => {
    const alarm = rngPick(ALARMS, rng);
    const place = rngPick(PLACES, rng);
    return {
      key: `scare-fever-${place.s}`,
      lines: [alarm, 'FEVER AT', place.s],
      text: `${alarm} A deadly new fever is spreading at the ${place.l}! Share before they delete this!`,
    };
  },
  (rng) => {
    const alarm = rngPick(ALARMS, rng);
    const food = rngPick(FOODS_AT_RISK, rng);
    return {
      key: `scare-poison-${food.s}`,
      lines: [alarm, 'POISON IN', food.s],
      text: `${alarm} Hidden poison found in ${food.l}! The doctors will not tell you. Send to 10 people!`,
    };
  },
  (rng) => {
    const alarm = rngPick(ALARMS, rng);
    return {
      key: `scare-hidden-${alarm}`,
      lines: [alarm, 'HIDDEN', 'ILLNESS!'],
      text: `${alarm} The health center is hiding a scary new illness. Everyone must see this!`,
    };
  },
];

const MIRACLE: readonly Template[] = [
  (rng) => {
    const herb = rngPick(HERBS, rng);
    return {
      key: `miracle-herb-${herb.s}`,
      lines: ['MIRACLE', herb.s, 'CURES ALL!'],
      text: `${herb.l} cures every illness in 3 days! Doctors hate it. Share if you love your family!`,
    };
  },
  () => ({
    key: 'miracle-germs',
    lines: ['ONE TRICK', 'KILLS ALL', 'GERMS!'],
    text: 'One weird trick kills all germs in 1 minute. No doctor and no medicine needed!',
  }),
  () => ({
    key: 'miracle-never-sick',
    lines: ['NEVER GET', 'SICK AGAIN!', 'DRINK THIS'],
    text: 'Drink this every morning and you will never get sick again. No checkups needed!',
  }),
];

const FOOD: readonly Template[] = [
  (rng) => {
    const dish = rngPick(DISHES, rng);
    return { key: `food-recipe-${dish.s}`, lines: ['EASY', dish.s, 'RECIPE'], text: `Easy ${dish.l} recipe for a busy weeknight, ready in 30 minutes.` };
  },
  (rng) => {
    const dish = rngPick(DISHES, rng);
    return { key: `food-twist-${dish.s}`, lines: ['TRY THIS', 'TWIST ON', dish.s], text: `Try this fun twist on ${dish.l}: the whole family will ask for seconds.` };
  },
];

const FAMILY: readonly Template[] = [
  () => ({ key: 'family-school', lines: ['CUTE KIDS', 'FIRST DAY', 'OF SCHOOL'], text: 'Cute photos from the first day of school. Look how big they are now!' }),
  () => ({ key: 'family-lola', lines: ['LOLA TELLS', 'OLD STORIES', 'AT HOME'], text: 'Lola tells old family stories at the dinner table. So heartwarming.' }),
  () => ({ key: 'family-party', lines: ['BIRTHDAY', 'PARTY IDEAS', 'FOR KIDS'], text: 'Ten easy birthday party ideas for kids, with games that cost almost nothing.' }),
];

const SHOWBIZ: readonly Template[] = [
  () => ({ key: 'showbiz-finale', lines: ['TELESERYE', 'FINALE', 'TONIGHT!'], text: 'The big teleserye finale airs tonight. Will the two sisters finally make up?' }),
  () => ({ key: 'showbiz-singing', lines: ['SINGING', 'CONTEST', 'WINNER!'], text: 'Who won the town singing contest? The crowd went wild!' }),
  () => ({ key: 'showbiz-fiesta', lines: ['SINGER AT', 'THE FIESTA', 'SURPRISE!'], text: 'A famous singer surprised the fiesta crowd with a free show.' }),
];

const SPORTS: readonly Template[] = [
  () => ({ key: 'sports-league', lines: ['BARANGAY', 'LEAGUE:', 'WE WON!'], text: 'Barangay league final: our team won by two points in the last second!' }),
  () => ({ key: 'sports-highlights', lines: ['BASKETBALL', 'HIGHLIGHTS', 'OF THE WEEK'], text: 'Basketball highlights of the week from the town court.' }),
  () => ({ key: 'sports-zumba', lines: ['MORNING', 'ZUMBA', 'AT COURT'], text: 'Morning zumba at the barangay court. Everyone is welcome, bring a towel!' }),
];

const NEWS: readonly Template[] = [
  () => ({ key: 'news-fiesta', lines: ['FIESTA', 'SCHEDULE', 'IS OUT'], text: 'The barangay fiesta schedule is out. See the full list of events and times.' }),
  () => ({ key: 'news-road', lines: ['ROAD WORK', 'THIS WEEK', 'GO SLOW'], text: 'Road repair this week near the plaza. Please drive slowly and use the side street.' }),
  () => ({ key: 'news-cleanup', lines: ['CLEAN-UP', 'DRIVE ON', 'SATURDAY'], text: 'Barangay clean-up drive this Saturday morning. Bring gloves and a sack.' }),
];

/** Curated true tips (basic, well-established public health advice). Never generated. */
const CLINIC: readonly Template[] = [
  () => ({
    key: 'clinic-hands',
    lines: ['WASH HANDS', 'WITH SOAP', '20 SECONDS'],
    text: 'Wash your hands with soap and water for at least 20 seconds. It helps stop many infections.',
  }),
  () => ({
    key: 'clinic-water',
    lines: ['COVER OR', 'EMPTY WATER', 'CONTAINERS'],
    text: 'Cover, clean or empty containers that hold water. Dengue mosquitoes breed in standing water.',
  }),
  () => ({
    key: 'clinic-unsure',
    lines: ['NOT SURE?', 'ASK YOUR', 'HEALTH', 'WORKER'],
    text: 'Not sure about a health claim? Ask your barangay health worker or your health center.',
  }),
  () => ({
    key: 'clinic-vaccines',
    lines: ['VACCINES', 'ARE TESTED', 'FOR SAFETY'],
    text: 'Vaccines are tested for safety before they are used. Ask your health center which ones you need.',
  }),
  () => ({
    key: 'clinic-share',
    lines: ['SHARE ONLY', 'WHAT YOU', 'CHECKED'],
    text: 'Before you share a health post, check who wrote it, and ask a health worker if you are unsure.',
  }),
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
