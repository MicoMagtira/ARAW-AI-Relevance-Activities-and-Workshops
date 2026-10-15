// Seeded random numbers shared by the games and the round builders. Same seed, same sequence.

/** Hash a string seed (e.g. "ARAW-2026-10-15") to an unsigned 32-bit integer (FNV-1a). */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Rng = () => number;

/** mulberry32: a small, fast generator. Returns floats in [0, 1). */
export function createRng(seed: string | number): Rng {
  let a = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new, non-deterministic seed string for rounds that should differ every time. */
export const randomSeed = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/** The Daily Challenge seed for a Manila date ("2026-10-15" gives "ARAW-2026-10-15"). Same for everyone that day. */
export const dailySeed = (date: string): string => `ARAW-${date}`;

/** Whole number in [min, max). */
export const rngInt = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min));

/** One random item of a non-empty list. */
export const rngPick = <T,>(items: readonly T[], rng: Rng): T => items[Math.floor(rng() * items.length)] as T;

/** Fisher-Yates shuffle; returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}
