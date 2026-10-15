// Building Fact or Fake rounds: balanced, seeded, no repeats. Practice rounds never contain form_A / form_B items.
import { FOF_PRACTICE } from '../../content/factOrFake/practice';
import type { FofItem, Truth } from '../../content/factOrFake/schema';
import { createRng, dailySeed, shuffle, type Rng } from '../engine/rng';

export const FREE_PLAY_SIZE = 10;

/** The practice pool: the only items mini rounds, free play and the daily challenge may use. */
export const practicePool = (items: readonly FofItem[] = FOF_PRACTICE): FofItem[] => items.filter((i) => i.set === 'practice');

export interface RoundOptions {
  size: number;
  seed: string | number;
  /** Prefer items tagged for this module; the rest of the pool tops the round up. */
  module?: string;
  /** Defaults to the seed bank. */
  items?: readonly FofItem[];
}

/** Take up to `n` items of one truth: module items first, then the rest, each group shuffled. */
function take(pool: readonly FofItem[], truth: Truth, n: number, module: string | undefined, rng: Rng): FofItem[] {
  const ofTruth = pool.filter((i) => i.truth === truth);
  const tagged = module ? ofTruth.filter((i) => i.module === module) : [];
  const rest = ofTruth.filter((i) => !tagged.includes(i));
  return [...shuffle(tagged, rng), ...shuffle(rest, rng)].slice(0, n);
}

/**
 * A balanced practice round: half facts, half fakes (odd sizes differ by one, the extra side is picked by the seed),
 * drawn without repeats. When the pool is too small the round shrinks but stays balanced.
 */
export function buildRound({ size, seed, module, items }: RoundOptions): FofItem[] {
  const pool = practicePool(items);
  const rng = createRng(seed);
  const facts = pool.filter((i) => i.truth === 'fact').length;
  const fakes = pool.length - facts;
  const want = Math.max(0, Math.floor(size));
  const each = Math.min(Math.floor(want / 2), facts, fakes);
  let nFake = each;
  let nFact = each;
  if (want % 2 === 1 && want > 2 * each) {
    // odd size: one extra item from a side that still has some left (the seed picks when both do)
    const fakeFirst = rng() < 0.5;
    const canFake = fakes > each;
    const canFact = facts > each;
    if (canFake && (fakeFirst || !canFact)) nFake++;
    else if (canFact) nFact++;
  }
  const picked = [...take(pool, 'fake', nFake, module, rng), ...take(pool, 'fact', nFact, module, rng)];
  return shuffle(picked, rng);
}

/** Today's Daily Challenge items: 3 practice items drawn by the date seed, so everyone gets the same (at least one fact, one fake). */
export const dailyItems = (date: string, items?: readonly FofItem[]): FofItem[] => buildRound({ size: 3, seed: dailySeed(date), items });

/** Which Fact or Fake modes exist. Assessment is reachable by route only. */
export type FofMode = 'module' | 'free' | 'assess';
