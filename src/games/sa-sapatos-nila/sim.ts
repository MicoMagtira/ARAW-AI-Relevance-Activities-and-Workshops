// Sa Sapatos Nila rules with no drawing in them, so they are all unit-tested: who visits next (seeded), which barriers a set of
// installed fixes leaves, what a try at the kiosk does, fix points, the assisted counter's queue, stars and points, and when the
// run ends. Turn-based on purpose: no clock, so nothing here is timed.
import { createRng, shuffle, type Rng } from '../engine/rng';
import { BARRIERS, CORE_IDS, FIXES, HARD_IDS, MORE_IDS, STEP_COUNT, fixById, personaById, type BarrierId, type FixId, type Persona, type StepId } from './data';

export type Mode = 'module' | 'arcade';

/** Fix points a new visitor brings, and the most the health center can keep. */
export const FP_PER_VISIT = 2;
export const FP_CAP = 5;
/** Failed tries before a visitor gives up and leaves. */
export const MAX_FAILS = 3;
/** The run ends when this many people have left without help. */
export const LEAVE_LIMIT = 3;
/** The counter can only help while fewer than this many people are waiting there. */
export const QUEUE_MAX = 3;
/** Visitors in the Module 9 game. */
export const MODULE_VISITS = 5;
/** Points for a good run (+20 XP). About ten people served well. */
export const GOOD_RUN = 1000;
/** Points by satisfaction stars (index = stars). */
export const STAR_POINTS: readonly number[] = [0, 30, 70, 150];
/** Extra points when the person was served without a single stumble: the fixes were ready in advance. */
export const READY_BONUS = 30;
/** Extra points for each earlier-installed fix that helps this person too. */
export const SHARED_BONUS = 25;
/** From this visit on, a software update now and then switches one fix off (Arcade only). */
export const UPDATE_FROM = 7;
export const UPDATE_EVERY = 4;

export interface Outcome {
  kind: 'served' | 'left';
  via: 'kiosk' | 'counter' | 'none';
  stars: number;
  points: number;
  ready: boolean;
  /** Fixes that had already helped someone else and helped again (each earns the shared bonus). */
  shared: readonly FixId[];
  /** Why a person left: too many stumbles, let go, or the counter was too busy. */
  why?: 'fails' | 'let-go' | 'queue';
}

export interface Game {
  seed: string;
  mode: Mode;
  /** 1-based number of the current visitor (0 before the first). */
  visit: number;
  /** Which screen of the kiosk the visitor is on. */
  step: StepId;
  /** Times the current visitor got stuck. */
  fails: number;
  installed: readonly FixId[];
  /** How many different people each fix has helped. */
  helped: Readonly<Partial<Record<FixId, number>>>;
  fp: number;
  /** People waiting at the assisted counter. */
  queue: number;
  score: number;
  served: number;
  left: number;
  /** Total stars given by served people. */
  stars: number;
  /** The fix a software update switched off when this visitor arrived. */
  broke: FixId | null;
  /** How the current visit ended (null while it goes on). */
  last: Outcome | null;
}

export const newGame = (seed: string, mode: Mode): Game => ({
  seed,
  mode,
  visit: 0,
  step: 0,
  fails: 0,
  installed: [],
  helped: {},
  fp: 0,
  queue: 0,
  score: 0,
  served: 0,
  left: 0,
  stars: 0,
  broke: null,
  last: null,
});

/** A made-up look-alike of a text, for "unfamiliar language": same shape, letters moved around, punctuation kept. */
export function scramble(text: string): string {
  const vowels = 'aeiou';
  const consonants = 'bcdfghjklmnpqrstvwxyz';
  return text.replace(/[a-z]/gi, (ch) => {
    const lower = ch.toLowerCase();
    const v = vowels.indexOf(lower);
    const out = v >= 0 ? (vowels[(v + 2) % vowels.length] as string) : (consonants[(consonants.indexOf(lower) + 7) % consonants.length] as string);
    return ch === lower ? out : out.toUpperCase();
  });
}

// ---------- who comes next ----------

/** The visitor for visit `n` (1-based). Same seed and number, same person. A person never comes twice in a row. */
export function visitorFor(seed: string, n: number, mode: Mode): Persona {
  const first = personaById(CORE_IDS[0] as string);
  if (mode === 'module') {
    const rest = shuffle(CORE_IDS.slice(1), createRng(`${seed}:sapatos:module`));
    return personaById(n <= 1 ? first.id : (rest[(n - 2) % rest.length] as string));
  }
  let prev = first.id;
  for (let i = 2; i <= n; i++) {
    const rng: Rng = createRng(`${seed}:sapatos:${i}`);
    const pool = (i <= 3 ? CORE_IDS : i <= 7 ? [...CORE_IDS, ...MORE_IDS] : [...CORE_IDS, ...MORE_IDS, ...HARD_IDS, ...HARD_IDS]).filter((id) => id !== prev);
    prev = pool[Math.floor(rng() * pool.length)] as string;
  }
  return personaById(n <= 1 ? first.id : prev);
}

/** The fix a software update switches off at this visit, or null. */
export function updateBreaks(seed: string, visit: number, installed: readonly FixId[], mode: Mode): FixId | null {
  if (mode !== 'arcade' || visit < UPDATE_FROM || (visit - UPDATE_FROM) % UPDATE_EVERY !== 0) return null;
  const candidates = installed.filter((f) => f !== 'counter');
  if (candidates.length === 0) return null;
  return candidates[Math.floor(createRng(`${seed}:sapatos:update:${visit}`)() * candidates.length)] as FixId;
}

/** Bring in the next visitor: +fix points, maybe a software update, a fresh visit. */
export function beginVisit(game: Game): Game {
  const visit = game.visit + 1;
  const broke = updateBreaks(game.seed, visit, game.installed, game.mode);
  return {
    ...game,
    visit,
    step: 0,
    fails: 0,
    fp: Math.min(FP_CAP, game.fp + FP_PER_VISIT),
    installed: broke ? game.installed.filter((f) => f !== broke) : game.installed,
    broke,
    last: null,
  };
}

// ---------- barriers and fixes ----------

/** True when an installed fix removes this barrier. The assisted counter is a different route, not a kiosk fix. */
export const isResolved = (barrier: BarrierId, installed: readonly FixId[]): boolean => (BARRIERS[barrier]?.fixes ?? []).some((f) => installed.includes(f));

/** The person's barriers that no installed fix removes yet. */
export const unmetBarriers = (persona: Persona, installed: readonly FixId[]): BarrierId[] => persona.barriers.filter((b) => !isResolved(b, installed));

/** Barriers that stop the person on this screen. */
export const blockersAt = (persona: Persona, installed: readonly FixId[], step: StepId): BarrierId[] => unmetBarriers(persona, installed).filter((b) => BARRIERS[b].step === step);

/** Fixes a person needs (the first one that works for each barrier), cheapest first: used by hints and the bots in tests. */
export const cheapestFixes = (persona: Persona, installed: readonly FixId[]): FixId[] => {
  const picks: FixId[] = [];
  for (const b of unmetBarriers(persona, installed)) {
    const options = BARRIERS[b].fixes.map(fixById).sort((a, c) => a.cost - c.cost);
    if (options[0] && !picks.includes(options[0].id)) picks.push(options[0].id);
  }
  return picks;
};

/** The barriers a fix removes, for the "Helps:" line. */
export const barriersHelpedBy = (fix: FixId): BarrierId[] => (Object.keys(BARRIERS) as BarrierId[]).filter((b) => BARRIERS[b].fixes.includes(fix));

/** Spend fix points on a fix. Returns the same game when it is already installed or too dear. */
export function install(game: Game, id: FixId): Game {
  const fix = fixById(id);
  if (game.installed.includes(id) || game.fp < fix.cost || !FIXES.some((f) => f.id === id)) return game;
  return { ...game, installed: [...game.installed, id], fp: game.fp - fix.cost };
}

// ---------- a visit ----------

export interface TryResult {
  game: Game;
  /** The screen was passed. */
  ok: boolean;
  /** The task is done (the last screen was passed). */
  done: boolean;
  /** What stopped them (empty when ok). */
  blockers: BarrierId[];
  /** The person gave up because this was their last allowed try. */
  gaveUp: boolean;
}

/** Press the button on the current screen. A barrier with no fix makes the person stumble. */
export function tryStep(game: Game, persona: Persona): TryResult {
  const blockers = blockersAt(persona, game.installed, game.step);
  if (blockers.length === 0) {
    const step = Math.min(STEP_COUNT, game.step + 1) as StepId;
    return { game: { ...game, step }, ok: true, done: game.step + 1 >= STEP_COUNT, blockers, gaveUp: false };
  }
  const fails = game.fails + 1;
  return { game: { ...game, fails }, ok: false, done: false, blockers, gaveUp: fails >= MAX_FAILS };
}

/** Whether the counter can take another person right now. */
export const counterFree = (game: Game): boolean => game.installed.includes('counter') && game.queue < QUEUE_MAX;

/** Satisfaction: 3 stars when the kiosk (or, for a person with no smartphone, the counter) fits; 2 for a counter fallback; one less after 2+ stumbles. */
export function starsFor(via: 'kiosk' | 'counter', persona: Persona, fails: number): number {
  const base = via === 'kiosk' || persona.barriers.includes('phone') ? 3 : 2;
  return Math.max(1, base - (fails >= 2 ? 1 : 0));
}

/** The fixes that did the work for this person (each earlier-installed one that already helped someone earns the shared bonus). */
export function usedFixes(persona: Persona, installed: readonly FixId[], via: 'kiosk' | 'counter'): FixId[] {
  if (via === 'counter') return ['counter'];
  return installed.filter((f) => persona.barriers.some((b) => BARRIERS[b].fixes.includes(f)));
}

function serve(game: Game, persona: Persona, via: 'kiosk' | 'counter'): Game {
  const stars = starsFor(via, persona, game.fails);
  const used = usedFixes(persona, game.installed, via);
  const shared = used.filter((f) => (game.helped[f] ?? 0) >= 1);
  const ready = via === 'kiosk' && game.fails === 0;
  const points = (STAR_POINTS[stars] ?? 0) + (ready ? READY_BONUS : 0) + shared.length * SHARED_BONUS;
  const helped = { ...game.helped };
  for (const f of used) helped[f] = (helped[f] ?? 0) + 1;
  return {
    ...game,
    helped,
    score: game.score + points,
    served: game.served + 1,
    stars: game.stars + stars,
    // the kiosk frees the counter's line; the counter fills it
    queue: via === 'counter' ? game.queue + 1 : Math.max(0, game.queue - 1),
    last: { kind: 'served', via, stars, points, ready, shared },
  };
}

/** The kiosk task is done. */
export const serveAtKiosk = (game: Game, persona: Persona): Game => serve(game, persona, 'kiosk');

/** Go to the assisted counter. Fails (a stumble, no leaving) while the line is too long. */
export function takeCounter(game: Game, persona: Persona): { game: Game; ok: boolean; busy: boolean; gaveUp: boolean } {
  if (!game.installed.includes('counter')) return { game, ok: false, busy: false, gaveUp: false };
  if (game.queue >= QUEUE_MAX) {
    const fails = game.fails + 1;
    return { game: { ...game, fails }, ok: false, busy: true, gaveUp: fails >= MAX_FAILS };
  }
  return { game: serve(game, persona, 'counter'), ok: true, busy: false, gaveUp: false };
}

/** The person leaves without help. */
export const leave = (game: Game, why: 'fails' | 'let-go' | 'queue'): Game => ({
  ...game,
  left: game.left + 1,
  last: { kind: 'left', via: 'none', stars: 0, points: 0, ready: false, shared: [], why },
});

/** The run is over: too many people left. */
export const isOver = (game: Game): boolean => game.left >= LEAVE_LIMIT;

/** The Module 9 game is over after its five visitors, or too many leaves. */
export const moduleDone = (game: Game): boolean => isOver(game) || (game.visit >= MODULE_VISITS && game.last !== null);

/** Module stars: everyone served 3, at least three people served 2, otherwise 1. */
export const moduleStars = (served: number, visits: number): 1 | 2 | 3 => (served >= visits && visits > 0 ? 3 : served >= 3 ? 2 : 1);
