// Pixel confetti physics (docs/DESIGN.md section 9): at most 60 square particles, gravity, 1.2s. Pure so it can be tested.
export const CONFETTI_MAX = 60;
export const CONFETTI_MS = 1200;
export const CONFETTI_COLOURS = ['--gold', '--gold-deep', '--coral', '--navy', '--fact'] as const;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 4 or 8 px squares. */
  size: 4 | 8;
  /** Index into CONFETTI_COLOURS. */
  colour: number;
}

/** Spawn particles in a burst from the top centre. `rand` returns 0..1 (inject a seeded one in tests). */
export function makeParticles(count: number, width: number, rand: () => number = Math.random): Particle[] {
  const n = Math.max(0, Math.min(CONFETTI_MAX, Math.floor(count)));
  return Array.from({ length: n }, () => ({
    x: width / 2 + (rand() - 0.5) * width * 0.3,
    y: -8,
    vx: (rand() - 0.5) * 520,
    vy: 120 + rand() * 260,
    size: rand() < 0.5 ? 4 : 8,
    colour: Math.floor(rand() * CONFETTI_COLOURS.length),
  }));
}

const GRAVITY = 900;

/** Advance one particle by `dt` seconds. Positions snap to whole pixels when drawn. */
export function stepParticle(p: Particle, dt: number): Particle {
  return { ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt, vy: p.vy + GRAVITY * dt };
}
