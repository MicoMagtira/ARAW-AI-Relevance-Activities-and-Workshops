// "Tita's GC" rules: which scenarios a play draws, scoring, the family ripple and the scenario graph validator.
// No UI in here, so it is all unit-tested (tests/unit/gc.test.tsx).
import {
  GC_SCENARIOS,
  MEMBERS,
  type EndingTier,
  type GcChoice,
  type GcEnding,
  type GcScenario,
  type GcTurn,
  type Ripple,
  type RippleChange,
  type RippleState,
} from '../../content/gc';
import { createRng, shuffle } from '../../games/engine/rng';

/** Scenarios in one play. */
export const PLAY_SIZE = 3;
/** Most points a single choice can earn: Accuracy 2 plus Kindness 2. */
export const MAX_PER_CHOICE = 4;

/**
 * One play: the true forward always comes along (calibrated trust: not every forward is fake), plus fakes drawn with the seed,
 * all in a seeded order.
 */
export function buildPlay(seed: string, pool: readonly GcScenario[] = GC_SCENARIOS): GcScenario[] {
  const rng = createRng(seed);
  const legit = shuffle(
    pool.filter((s) => s.legit),
    rng,
  ).slice(0, 1);
  const fakes = shuffle(
    pool.filter((s) => !s.legit),
    rng,
  ).slice(0, PLAY_SIZE - legit.length);
  return shuffle([...legit, ...fakes], rng);
}

export const turnById = (s: GcScenario, id: string): GcTurn | undefined => s.turns.find((t) => t.id === id);
export const endingById = (s: GcScenario, id: string): GcEnding | undefined => s.endings.find((e) => e.id === id);
export const isEnding = (s: GcScenario, id: string): boolean => s.endings.some((e) => e.id === id);

/** The choices in a seeded order, so a replay does not put the good answer in the same place. */
export const orderedChoices = (turn: GcTurn, seed: string): GcChoice[] => shuffle(turn.choices, createRng(`${seed}:${turn.id}`));

/* ---------- ripple ---------- */

/** Apply a choice's ripple change on top of the current ripple. */
export function applyRipple(ripple: Ripple, change: RippleChange | undefined): Ripple {
  if (!change) return ripple;
  const next = { ...ripple } as Record<(typeof MEMBERS)[number], RippleState>;
  for (const m of MEMBERS) {
    const c = change[m];
    if (c) next[m] = { ...ripple[m], ...c };
  }
  return next;
}

export interface RippleCounts {
  believed: number;
  checked: number;
  hurt: number;
}

/** How many of the family believed it, checked it and felt hurt (the player counts as family). */
export function rippleCounts(ripple: Ripple): RippleCounts {
  const counts: RippleCounts = { believed: 0, checked: 0, hurt: 0 };
  for (const m of MEMBERS) {
    const r = ripple[m];
    if (r.believed) counts.believed += 1;
    if (r.checked) counts.checked += 1;
    if (r.hurt) counts.hurt += 1;
  }
  return counts;
}

/* ---------- scoring ---------- */

export interface Tally {
  accuracy: number;
  kindness: number;
  /** Choices made. */
  turns: number;
}

export const EMPTY_TALLY: Tally = { accuracy: 0, kindness: 0, turns: 0 };

export const addChoice = (tally: Tally, choice: Pick<GcChoice, 'accuracy' | 'kindness'>): Tally => ({
  accuracy: tally.accuracy + choice.accuracy,
  kindness: tally.kindness + choice.kindness,
  turns: tally.turns + 1,
});

export const addTally = (a: Tally, b: Tally): Tally => ({ accuracy: a.accuracy + b.accuracy, kindness: a.kindness + b.kindness, turns: a.turns + b.turns });

/** A meter from 0 to 100: points over the most that these choices could earn (2 each). */
export const meterPercent = (points: number, turns: number): number => (turns > 0 ? Math.round((points / (turns * 2)) * 100) : 0);

/** Share of all points earned, 0 to 1. */
export const totalShare = (t: Tally): number => (t.turns > 0 ? (t.accuracy + t.kindness) / (t.turns * MAX_PER_CHOICE) : 0);

/** Stars by total over the play: 3 at 80% or more, 2 at 50% or more, else 1 (docs/SPEC.md). */
export function starsFor(t: Tally): 1 | 2 | 3 {
  const share = totalShare(t);
  return share >= 0.8 ? 3 : share >= 0.5 ? 2 : 1;
}

/* ---------- graph: paths and validation ---------- */

export interface GcPath {
  choices: GcChoice[];
  ending: GcEnding;
  accuracy: number;
  kindness: number;
}

/** Every route from the first turn to an ending. Throws on a cycle or an unknown id, so call `validateScenario` first for data you do not trust. */
export function enumeratePaths(s: GcScenario): GcPath[] {
  const out: GcPath[] = [];
  const walk = (id: string, taken: GcChoice[], seen: readonly string[]): void => {
    const ending = endingById(s, id);
    if (ending) {
      out.push({ choices: taken, ending, accuracy: taken.reduce((n, c) => n + c.accuracy, 0), kindness: taken.reduce((n, c) => n + c.kindness, 0) });
      return;
    }
    const turn = turnById(s, id);
    if (!turn) throw new Error(`${s.id}: unknown id "${id}"`);
    if (seen.includes(id)) throw new Error(`${s.id}: cycle at "${id}"`);
    for (const c of turn.choices) walk(c.next, [...taken, c], [...seen, id]);
  };
  walk(s.first, [], []);
  return out;
}

const TIERS: readonly EndingTier[] = ['light', 'mixed', 'rough'];
const KINDS = ['react', 'verify', 'reply', 'forward'];

/** Words in a chat line. */
const words = (text: string): number => text.trim().split(/\s+/).length;

/**
 * Check a scenario's graph and rules. Returns a list of problems (empty when it is sound):
 * no dead ends, no cycles, every turn and ending reachable, every path takes 2 or more choices, three tiers of ending,
 * forwarding an unchecked fake scores 0 accuracy,
 * the best-scoring route earns the good ending and the worst-scoring one the rough ending.
 */
export function validateScenario(s: GcScenario): string[] {
  const problems: string[] = [];
  const bad = (msg: string) => problems.push(`${s.id}: ${msg}`);
  const ids = [...s.turns.map((t) => t.id), ...s.endings.map((e) => e.id)];
  if (new Set(ids).size !== ids.length) bad('turn and ending ids must be unique');
  if (!turnById(s, s.first)) bad(`first turn "${s.first}" does not exist`);

  if (s.endings.length < 3) bad('needs at least 3 endings');
  for (const tier of TIERS) if (!s.endings.some((e) => e.tier === tier)) bad(`no "${tier}" ending`);
  if (s.turns.length < 3) bad('needs at least 2 branch points on a path (3 or more turns in all)');

  const reachedTurns = new Set<string>();
  const reachedEndings = new Set<string>();
  const choiceIds = new Set<string>();
  for (const turn of s.turns) {
    if (turn.choices.length < 2) bad(`turn "${turn.id}" needs at least 2 choices (a dead end otherwise)`);
    if (!turn.prompt.trim()) bad(`turn "${turn.id}" has no prompt`);
    if (turn.messages.length === 0) bad(`turn "${turn.id}" has no messages`);
    for (const m of turn.messages) if (words(m.text) > 45) bad(`a message in "${turn.id}" is over 45 words`);
    for (const c of turn.choices) {
      if (choiceIds.has(c.id)) bad(`choice id "${c.id}" is used twice`);
      choiceIds.add(c.id);
      if (!KINDS.includes(c.kind)) bad(`choice "${c.id}" has an unknown kind`);
      if (!c.label.trim() || !c.say.trim() || !c.why.trim()) bad(`choice "${c.id}" needs a label, a chat line and a why`);
      if (words(c.why) > 40) bad(`why of "${c.id}" is over 40 words`);
      if (![0, 1, 2].includes(c.accuracy) || ![0, 1, 2].includes(c.kindness)) bad(`choice "${c.id}" scores must be 0, 1 or 2`);
      if (c.kind === 'verify' && !c.check) bad(`verify choice "${c.id}" needs a check`);
      if (c.kind !== 'verify' && c.check) bad(`only verify choices open a check ("${c.id}")`);
      if (!turnById(s, c.next) && !endingById(s, c.next)) bad(`choice "${c.id}" leads to unknown "${c.next}"`);
    }
  }

  // Walk the graph without throwing, so every problem is reported.
  const visit = (id: string, depth: number, trail: readonly string[], verified: boolean): void => {
    if (endingById(s, id)) {
      reachedEndings.add(id);
      if (depth < 2) bad(`a path reaches "${id}" after only ${depth} choice(s); every path needs 2 or more`);
      return;
    }
    const turn = turnById(s, id);
    if (!turn || trail.includes(id)) {
      if (turn) bad(`cycle through "${id}"`);
      return;
    }
    reachedTurns.add(id);
    for (const c of turn.choices) {
      const msg = `forwarding an unchecked fake ("${c.id}") must score 0 accuracy`;
      if (c.kind === 'forward' && !s.legit && !verified && c.accuracy !== 0 && !problems.includes(`${s.id}: ${msg}`)) bad(msg);
      visit(c.next, depth + 1, [...trail, id], verified || c.kind === 'verify');
    }
  };
  visit(s.first, 0, [], false);
  for (const t of s.turns) if (!reachedTurns.has(t.id)) bad(`turn "${t.id}" can never be reached`);
  for (const e of s.endings) {
    if (!reachedEndings.has(e.id)) bad(`ending "${e.id}" can never be reached`);
    if (e.messages.length === 0 || !e.text.trim() || !e.title.trim() || !e.ara.trim()) bad(`ending "${e.id}" is incomplete`);
  }

  if (problems.length === 0) {
    const paths = enumeratePaths(s);
    const total = (p: GcPath) => p.accuracy + p.kindness;
    const best = Math.max(...paths.map(total));
    const worst = Math.min(...paths.map(total));
    for (const p of paths) {
      if (total(p) === best && p.ending.tier !== 'light') bad(`a best-scoring route ends in "${p.ending.id}", not a good ending`);
      if (total(p) === worst && p.ending.tier !== 'rough') bad(`a worst-scoring route ends in "${p.ending.id}", not a rough ending`);
    }
  }
  return problems;
}
