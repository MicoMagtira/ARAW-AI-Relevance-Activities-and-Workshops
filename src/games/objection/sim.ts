// OBJECTION! rules with no drawing in them, so they are all unit-tested: which case comes next (seeded, built from the templates in
// data.ts), what a hearing contains, what an objection does (right statement + right evidence wins; anything else is a strike),
// points, and when the run ends. Turn-based on purpose: nothing here is timed.
import { createRng, rngInt, shuffle, type Rng } from '../engine/rng';
import { BOTS, COMPLAINANTS, EVIDENCE, TEMPLATES, TEMPLATE_IDS, evidenceCount, statementCount, type Evidence, type Lie, type TemplateId } from './data';

export type Mode = 'module' | 'arcade';

/** Wrong objections allowed in a whole run. The third one ends it. */
export const STRIKE_LIMIT = 3;
/** Cases in the Module 10 game: one of each incident. */
export const MODULE_CASES = 3;
/** Points for winning a case: the base grows a little with every case. */
export const CASE_BASE = 100;
export const CASE_STEP = 20;
/** Extra points for winning a case without a wrong objection. */
export const CLEAN_BONUS = 50;
/** Points for a good run (+20 XP): about five clean cases. */
export const GOOD_RUN = 800;

export interface Line {
  text: string;
  /** What the witness says when pressed. */
  press: string;
  /** For a true statement: why it is true. For the false one: why it is false. */
  why: string;
}

export interface Case {
  /** 1-based number in the run. */
  no: number;
  template: TemplateId;
  title: string;
  brief: string;
  witness: string;
  harm: string;
  who: string;
  org: string;
  statements: readonly Line[];
  /** Index of the false statement. */
  lieIndex: number;
  /** The evidence card that exposes it. */
  proofId: string;
  /** The "Remember:" line, shown at case closed. */
  lesson: string;
  /** Evidence cards in the court record (slots filled in), shuffled. */
  evidence: readonly Evidence[];
}

const fillWith = (slots: Readonly<Record<string, string>>) => (text: string): string => text.replace(/\{(\w+)\}/g, (m, k: string) => slots[k] ?? m);

/** The order the three incidents come in: fixed for the module, shuffled per seed in the Arcade. */
function templateOrder(seed: string, mode: Mode): readonly TemplateId[] {
  return mode === 'module' ? TEMPLATE_IDS : shuffle(TEMPLATE_IDS, createRng(`${seed}:order`));
}

/** The false statements of one template in a seeded order, so a run does not repeat one until it has used them all. */
function lieOrder(seed: string, id: TemplateId): number[] {
  return shuffle(
    TEMPLATES[id].lies.map((_, i) => i),
    createRng(`${seed}:lies:${id}`),
  );
}

export function buildCase(seed: string, mode: Mode, no: number): Case {
  const order = templateOrder(seed, mode);
  const id = order[(no - 1) % order.length] as TemplateId;
  const tpl = TEMPLATES[id];
  const round = Math.floor((no - 1) / order.length);
  const lies = lieOrder(seed, id);
  const lie = tpl.lies[lies[round % lies.length] as number] as Lie;
  const rng: Rng = createRng(`${seed}:case:${no}`);
  const people = shuffle(COMPLAINANTS, rng);
  const who = people[0] as string;
  const org = tpl.orgs[rngInt(rng, 0, tpl.orgs.length)] as string;
  const thing = tpl.things[rngInt(rng, 0, tpl.things.length)] as string;
  const bot = BOTS[rngInt(rng, 0, BOTS.length)] as string;
  const fill = fillWith({ who, org, thing, bot });

  const count = statementCount(no);
  const truths = shuffle(tpl.truths, rng)
    .slice(0, count - 1)
    .map((t): Line => ({ text: fill(t.text), press: fill(t.press), why: fill(t.why) }));
  const lieIndex = rngInt(rng, 0, count);
  const statements = [...truths.slice(0, lieIndex), { text: fill(lie.text), press: fill(lie.press), why: fill(lie.why) }, ...truths.slice(lieIndex)];

  const want = evidenceCount(no) - 1;
  const ids = [lie.proof, ...shuffle(lie.decoys, rng).slice(0, want)];
  const evidence = shuffle(ids, rng).map((eid): Evidence => {
    const e = EVIDENCE[eid] as Evidence;
    return { ...e, title: fill(e.title), shows: fill(e.shows) };
  });

  return {
    no,
    template: id,
    title: fill(tpl.title),
    brief: fill(tpl.brief),
    witness: fill(tpl.witness),
    harm: fill(tpl.harm),
    who,
    org,
    statements,
    lieIndex,
    proofId: lie.proof,
    lesson: fill(lie.lesson),
    evidence,
  };
}

export interface Game {
  seed: string;
  mode: Mode;
  /** 1-based number of the current case (0 before the first). */
  caseNo: number;
  /** Wrong objections so far, in the whole run. */
  strikes: number;
  /** Wrong objections in the current case (a clean case has none). */
  caseStrikes: number;
  /** Statements already ruled true in this case (they cannot be objected to again). */
  checked: readonly number[];
  score: number;
  /** Cases won. */
  won: number;
  /** Cases won without a wrong objection. */
  clean: number;
  /** The current case is won. */
  closed: boolean;
}

export const newGame = (seed: string, mode: Mode): Game => ({ seed, mode, caseNo: 0, strikes: 0, caseStrikes: 0, checked: [], score: 0, won: 0, clean: 0, closed: false });

/** Next case. */
export const beginCase = (g: Game): Game => ({ ...g, caseNo: g.caseNo + 1, caseStrikes: 0, checked: [], closed: false });

export const casePoints = (no: number, clean: boolean): number => CASE_BASE + CASE_STEP * (no - 1) + (clean ? CLEAN_BONUS : 0);

export type Ruling =
  /** The false statement, the right card: the case is won. */
  | { kind: 'won'; game: Game; points: number; clean: boolean }
  /** An objection to a true statement: overruled, a strike. */
  | { kind: 'true-statement'; game: Game }
  /** The false statement, but a card that does not prove it: a strike. */
  | { kind: 'wrong-evidence'; game: Game };

/** Statement `index` is challenged with evidence card `evidenceId`. */
export function objection(g: Game, c: Case, index: number, evidenceId: string): Ruling {
  if (index === c.lieIndex && evidenceId === c.proofId) {
    const clean = g.caseStrikes === 0;
    const points = casePoints(c.no, clean);
    return { kind: 'won', points, clean, game: { ...g, score: g.score + points, won: g.won + 1, clean: g.clean + (clean ? 1 : 0), closed: true } };
  }
  const struck: Game = { ...g, strikes: g.strikes + 1, caseStrikes: g.caseStrikes + 1 };
  if (index === c.lieIndex) return { kind: 'wrong-evidence', game: struck };
  return { kind: 'true-statement', game: { ...struck, checked: g.checked.includes(index) ? g.checked : [...g.checked, index] } };
}

export const isOver = (g: Game): boolean => g.strikes >= STRIKE_LIMIT;

/** The run is finished: three strikes, or (Module 10) all the cases are won. */
export const finished = (g: Game): boolean => isOver(g) || (g.mode === 'module' && g.won >= MODULE_CASES);

/** Module stars: all three cases with at most one strike 3, two cases 2, otherwise 1. */
export const moduleStars = (won: number, strikes: number): 1 | 2 | 3 => (won >= MODULE_CASES && strikes <= 1 ? 3 : won >= 2 ? 2 : 1);
