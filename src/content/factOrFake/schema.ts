// Fact or Fake item schema and validator (docs/SPEC.md section 6, docs/CONTENT_GUIDE.md section 6).
// All people, pages and brands in items are fictional. Fakes are shown with the "ARAW GAME · FAKE" stamp when revealed.

export const FORMATS = ['text', 'gc_screenshot', 'image', 'chatbot_answer'] as const;
export const DOMAINS = ['health_misinfo', 'ai_in_health_claim', 'ai_generated_health_content'] as const;
export const TRUTHS = ['fact', 'fake'] as const;
export const TRICKS = ['dr_fake', 'miracle_mike', 'fear_monger', 'conspiracy_kuya', 'kwento_kim', 'none'] as const;
export const SETS = ['practice', 'form_A', 'form_B'] as const;
export const REVIEW_STATUSES = ['unreviewed', 'in_review', 'reviewed'] as const;
export const SCENES = ['bottle', 'portrait', 'tea', 'clinic'] as const;
export const MODULE_TAGS = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'] as const;

export type Format = (typeof FORMATS)[number];
export type Domain = (typeof DOMAINS)[number];
export type Truth = (typeof TRUTHS)[number];
export type Trick = (typeof TRICKS)[number];
export type ItemSet = (typeof SETS)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type SceneId = (typeof SCENES)[number];
export type ModuleTag = (typeof MODULE_TAGS)[number];
export type Difficulty = 1 | 2 | 3;

/** SVG scene descriptor: a hand-made pixel scene (synthetic only, never a real photo or person). */
export interface SceneDescriptor {
  scene: SceneId;
  /** Alt text for screen readers. */
  alt: string;
  /** Small label drawn over the picture, e.g. "FDA APPROVED". */
  badge?: string;
}

export interface FofItem {
  /** `fof-p-001` (practice), `fof-a-01` (form A), `fof-b-01` (form B). */
  id: string;
  format: Format;
  domain: Domain;
  truth: Truth;
  /** Facts use `none`; every fake has one of the five tricks. */
  trick: Trick;
  difficulty: Difficulty;
  module: ModuleTag;
  set: ItemSet;
  /** Links a matched form_A and form_B item. */
  pair_id?: string;
  /** Fictional page, person or bot name shown on the post. */
  author: string;
  /**
   * Line under the author, e.g. "Sponsored · 2h" or "Forwarded many times".
   * For `chatbot_answer` it is the question the player is shown above the answer.
   */
  meta: string;
  /** The post, message or chatbot answer. */
  text: string;
  /** Required for `image` items. */
  image?: SceneDescriptor;
  /** Why it is fact or fake. */
  explanation: string;
  /** One concrete step. */
  how_to_check: string;
  /** Source or rationale, e.g. "WHO dengue fact sheet; DOH 4S". */
  basis: string;
  myth_id?: string;
  review_status: ReviewStatus;
}

const ID_PATTERN: Record<ItemSet, RegExp> = {
  practice: /^fof-p-\d{3}$/,
  form_A: /^fof-a-\d{2}$/,
  form_B: /^fof-b-\d{2}$/,
};

const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);
const filled = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Problems with a single item (empty list = valid). Takes `unknown` so imported JSON can be checked too. */
export function validateItem(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null) return ['item is not an object'];
  const i = raw as Record<string, unknown>;
  const id = typeof i.id === 'string' ? i.id : '(no id)';
  const errors: string[] = [];
  const bad = (msg: string) => errors.push(`${id}: ${msg}`);

  if (!filled(i.id)) bad('id is missing');
  if (!isOneOf(FORMATS, i.format)) bad(`invalid format "${String(i.format)}"`);
  if (!isOneOf(DOMAINS, i.domain)) bad(`invalid domain "${String(i.domain)}"`);
  if (!isOneOf(TRUTHS, i.truth)) bad(`invalid truth "${String(i.truth)}"`);
  if (!isOneOf(TRICKS, i.trick)) bad(`invalid trick "${String(i.trick)}"`);
  if (i.difficulty !== 1 && i.difficulty !== 2 && i.difficulty !== 3) bad('difficulty must be 1, 2 or 3');
  if (!isOneOf(MODULE_TAGS, i.module)) bad(`invalid module "${String(i.module)}"`);
  if (!isOneOf(SETS, i.set)) bad(`invalid set "${String(i.set)}"`);
  if (!isOneOf(REVIEW_STATUSES, i.review_status)) bad('invalid review_status');
  for (const field of ['author', 'meta', 'text', 'explanation', 'how_to_check', 'basis'] as const) {
    if (!filled(i[field])) bad(`${field} is empty`);
  }

  if (isOneOf(SETS, i.set) && typeof i.id === 'string' && !ID_PATTERN[i.set].test(i.id)) bad(`id does not match the ${i.set} pattern`);
  if (i.truth === 'fact' && i.trick !== 'none') bad('facts must use trick "none"');
  if (i.truth === 'fake' && i.trick === 'none') bad('fakes need a trick');
  if (isOneOf(SETS, i.set) && i.set !== 'practice' && !filled(i.pair_id)) bad('form items need a pair_id');

  if (i.format === 'image' && i.image === undefined) bad('image items need an image descriptor');
  if (i.image !== undefined) {
    const img = i.image as Record<string, unknown> | null;
    if (typeof img !== 'object' || img === null) bad('image must be an object');
    else {
      if (!isOneOf(SCENES, img.scene)) bad(`unknown scene "${String(img.scene)}"`);
      if (!filled(img.alt)) bad('image needs alt text');
      if (img.badge !== undefined && !filled(img.badge)) bad('image badge is empty');
    }
  }
  return errors;
}

export interface BankOptions {
  /** Also require each form to hold exactly 20 items (10 fact, 10 fake). Off while the bank is being written. */
  requireCompleteForms?: boolean;
}

/** Problems across a whole bank: each item, unique ids, form balance and A/B pair matching. */
export function validateBank(items: readonly FofItem[], options: BankOptions = {}): string[] {
  const errors = items.flatMap((i) => validateItem(i));
  const seen = new Set<string>();
  for (const i of items) {
    if (seen.has(i.id)) errors.push(`${i.id}: duplicate id`);
    seen.add(i.id);
  }

  const inSet = (set: ItemSet) => items.filter((i) => i.set === set);
  for (const set of ['form_A', 'form_B'] as const) {
    const list = inSet(set);
    const facts = list.filter((i) => i.truth === 'fact').length;
    const fakes = list.length - facts;
    if (options.requireCompleteForms) {
      if (list.length !== 20 || facts !== 10 || fakes !== 10) errors.push(`${set}: needs 20 items, 10 fact and 10 fake (has ${facts} + ${fakes})`);
    } else if (facts !== fakes) errors.push(`${set}: not balanced (${facts} fact, ${fakes} fake)`);
  }

  const a = inSet('form_A');
  const b = inSet('form_B');
  const pairKeys = new Set([...a, ...b].map((i) => i.pair_id).filter(filled));
  for (const key of pairKeys) {
    const left = a.filter((i) => i.pair_id === key);
    const right = b.filter((i) => i.pair_id === key);
    if (left.length !== 1 || right.length !== 1) {
      errors.push(`${key}: needs exactly one item in form_A and one in form_B`);
      continue;
    }
    const [x, y] = [left[0] as FofItem, right[0] as FofItem];
    for (const field of ['truth', 'domain', 'format', 'trick', 'difficulty'] as const) {
      if (x[field] !== y[field]) errors.push(`${key}: ${x.id} and ${y.id} differ in ${field}`);
    }
  }
  return errors;
}
