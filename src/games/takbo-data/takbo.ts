// Takbo, Data! (data privacy): an endless runner through a procedurally generated barangay (docs/SPEC.md section 5).
// Ara runs in three lanes. Safe freebies refill the Privacy Shield; data traps and bumps drain it. The road is a pure
// function of the seed (the layout never depends on what the player does), so the Daily Challenge is the same for everyone.
import { PALETTE, box, text } from '../engine/draw';
import { createRng, rngInt, rngPick, type Rng } from '../engine/rng';
import type { Cue, GameDef, GameInstance, GameStats } from '../engine/types';
import { silent } from '../engine/cues';
import {
  ARA_HEIGHT,
  ARA_X,
  BUILDINGS,
  BUILDING_W,
  H,
  LANE_Y,
  OBSTACLE_SIZE,
  SIGN_W,
  W,
  drawAra,
  drawBackdrop,
  drawBuilding,
  drawObstacle,
  drawShieldBar,
  drawSign,
  type BuildingKind,
} from './art';
import { PRIVACY_TIPS, safeByKind, trapByKind, type DataKind } from './offers';
import { BUMP_COST, LANES, SAFE_POINTS, SHIELD_MAX, createSpawner, distanceMetres, drain, refill, scoreOf, speedAt, type Cell } from './rules';

/** Jump physics in logical pixels per second: about 0.7 s in the air, 32 px high. */
const JUMP_SPEED = 190;
const GRAVITY = 560;
/** Above this height Ara passes over a sign without touching it. */
const SIGN_CLEAR = 8;
const LANE_SPEED = 14;
const INVULNERABLE_MS = 1000;
const SPAWN_AHEAD = W + 60;
const FIRST_ROW_X = 380;
const POP_MS = 900;
const BACKDROP_PARALLAX = 0.5;
const LANE_NAMES = ['top', 'middle', 'bottom'] as const;

interface Item {
  x: number;
  lane: number;
  cell: NonNullable<Cell>;
  decided: boolean;
}
interface Pop {
  text: string;
  color: string;
  age: number;
}
interface Building {
  kind: BuildingKind;
  x: number;
}

function describeItem(cell: NonNullable<Cell>): string {
  if (cell.type === 'safe') return `${safeByKind(cell.kind).say} (safe)`;
  if (cell.type === 'trap') return `${trapByKind(cell.kind).say} (data trap)`;
  return `a ${cell.kind}`;
}

function createTakbo({ seed, rng, cue = silent }: { seed: string; rng: Rng; cue?: Cue }): GameInstance {
  const spawner = createSpawner(rng);
  const sceneryRng = createRng(`${seed}:barangay`);

  let timeMs = 0;
  let scroll = 0;
  let shield = SHIELD_MAX;
  let safeGrabs = 0;
  let bumps = 0;
  let over = false;
  let laneF = 1;
  let targetLane = 1;
  let height = 0;
  let vy = 0;
  let invulnerable = 0;
  let rowX = FIRST_ROW_X;
  let sceneryX = 10;
  const items: Item[] = [];
  const buildings: Building[] = [];
  const pops: Pop[] = [];
  const gave = new Map<DataKind, number>();

  const lane = () => Math.round(laneF);
  const pop = (value: string, color: string) => pops.push({ text: value, color, age: 0 });

  function spawn(speed: number) {
    while (rowX - scroll < SPAWN_AHEAD) {
      const row = spawner.next(speed);
      row.cells.forEach((cell, l) => cell && items.push({ x: rowX, lane: l, cell, decided: false }));
      rowX += row.gap;
    }
    while (sceneryX - scroll * BACKDROP_PARALLAX < W + 20) {
      const kind = rngPick(BUILDINGS, sceneryRng);
      buildings.push({ kind, x: sceneryX });
      sceneryX += BUILDING_W[kind] + rngInt(sceneryRng, 24, 70);
    }
  }

  function resolve(item: Item) {
    const { cell } = item;
    item.decided = true;
    if (cell.type === 'safe') {
      const before = shield;
      shield = refill(shield);
      cue(before < SHIELD_MAX && shield >= SHIELD_MAX ? 'shield' : 'freebie');
      safeGrabs += 1;
      pop(`+${SAFE_POINTS} SAFE`, PALETTE.fact);
    } else if (cell.type === 'trap') {
      const trap = trapByKind(cell.kind);
      shield = drain(shield, trap.cost);
      cue('leak');
      gave.set(cell.kind, (gave.get(cell.kind) ?? 0) + 1);
      pop(`-${trap.cost} ${trap.ask.replace('?', '')}`, PALETTE.fake);
    }
  }

  return {
    step(dtMs, input) {
      if (over) return;
      const dt = dtMs / 1000;
      timeMs += dtMs;
      const speed = speedAt(timeMs / 1000);
      scroll += speed * dt;

      const grounded = height === 0 && vy === 0;
      for (const action of input.actions) {
        if (action === 'up') targetLane = Math.max(0, targetLane - 1);
        else if (action === 'down') targetLane = Math.min(LANES - 1, targetLane + 1);
        else if (action === 'act' && height === 0) vy = JUMP_SPEED;
      }
      if (input.taps.length > 0 && height === 0) vy = JUMP_SPEED;
      if (grounded && vy === JUMP_SPEED) cue('jump');

      if (vy !== 0 || height > 0) {
        height += vy * dt;
        vy -= GRAVITY * dt;
        if (height <= 0) {
          height = 0;
          vy = 0;
        }
      }
      const move = LANE_SPEED * dt;
      laneF = laneF < targetLane ? Math.min(targetLane, laneF + move) : Math.max(targetLane, laneF - move);
      invulnerable = Math.max(0, invulnerable - dtMs);

      spawn(speed);

      for (const item of items) {
        if (item.decided) continue;
        const sx = item.x - scroll;
        if (item.cell.type === 'obstacle') {
          const { w, clear } = OBSTACLE_SIZE[item.cell.kind];
          if (item.lane === lane() && sx < ARA_X + 6 && sx + w > ARA_X - 6 && height < clear) {
            item.decided = true;
            if (invulnerable === 0) {
              shield = drain(shield, BUMP_COST);
              bumps += 1;
              cue('whack');
              invulnerable = INVULNERABLE_MS;
              pop(`-${BUMP_COST} BUMP`, PALETTE.fake);
            }
          }
        } else if (sx <= ARA_X + 4) {
          // first contact decides: in this lane and on the ground takes the offer, in the air or in another lane passes it
          if (item.lane === lane() && height < SIGN_CLEAR) resolve(item);
          else item.decided = true;
        }
      }
      while (items.length > 0 && (items[0] as Item).x - scroll < -SIGN_W - 20) items.shift();
      while (buildings.length > 0 && (buildings[0] as Building).x - scroll * BACKDROP_PARALLAX < -100) buildings.shift();

      for (const p of pops) p.age += dtMs;
      while (pops.length > 0 && (pops[0] as Pop).age > POP_MS) pops.shift();

      if (shield <= 0) {
        shield = 0;
        over = true;
      }
    },

    draw(ctx) {
      drawBackdrop(ctx, scroll);
      for (const b of buildings) drawBuilding(ctx, b.kind, Math.round(b.x - scroll * BACKDROP_PARALLAX), 58);
      const feet = LANE_Y[0] + (LANE_Y[2] - LANE_Y[0]) * (laneF / (LANES - 1));
      const blink = invulnerable > 0 && Math.floor(invulnerable / 200) % 2 === 1;
      for (let l = 0; l < LANES; l++) {
        const y = LANE_Y[l] as number;
        for (const item of items) {
          if (item.lane !== l) continue;
          const sx = Math.round(item.x - scroll);
          if (sx > W || sx < -SIGN_W) continue;
          const { cell } = item;
          if (cell.type === 'obstacle') drawObstacle(ctx, cell.kind, sx, y);
          else if (cell.type === 'safe') drawSign(ctx, sx, y, safeByKind(cell.kind), false);
          else drawSign(ctx, sx, y, trapByKind(cell.kind), true);
        }
        if (lane() === l) {
          ctx.globalAlpha = 0.25;
          box(ctx, PALETTE.ink, ARA_X - 11, feet - 1, 22, 2);
          ctx.globalAlpha = 1;
          if (!blink) drawAra(ctx, ARA_X, Math.round(feet - height), height > 0 ? 0 : Math.floor(scroll / 12));
        }
      }
      for (const p of pops) {
        const rise = Math.round((p.age / POP_MS) * 14);
        const y = Math.round(feet - height - ARA_HEIGHT - 12 - rise);
        text(ctx, p.text, ARA_X + 1, y + 1, { size: 8, color: PALETTE.surface, align: 'center' });
        text(ctx, p.text, ARA_X, y, { size: 8, color: p.color, align: 'center' });
      }
      drawShieldBar(ctx, shield);
      text(ctx, `SCORE ${scoreOf(scroll, safeGrabs)}`, W - 6, 4, { size: 8, color: PALETTE.ink, align: 'right' });
      text(ctx, `${distanceMetres(scroll)} m`, W - 6, 14, { size: 8, color: PALETTE.muted, align: 'right' });
      if (over) {
        box(ctx, PALETTE.ink, 0, H / 2 - 14, W, 28);
        text(ctx, 'SHIELD DOWN!', W / 2, H / 2 - 4, { size: 8, color: PALETTE.gold, align: 'center' });
      }
    },

    stats(): GameStats {
      const score = scoreOf(scroll, safeGrabs);
      const pct = Math.round(shield);
      const ahead = items
        .filter((i) => !i.decided && i.x - scroll > ARA_X - 10 && i.x - scroll < W)
        .sort((a, b) => a.x - b.x)
        .slice(0, 3)
        .map((i) => `${describeItem(i.cell)} in the ${LANE_NAMES[i.lane]} lane`);
      const stats: GameStats = {
        score,
        over,
        hud: [
          { id: 'score', label: 'Score', value: String(score) },
          { id: 'shield', label: 'Privacy Shield', value: `${pct}%`, meter: pct },
          { id: 'safe', label: 'Safe grabs', value: String(safeGrabs) },
        ],
        description: `Takbo, Data! Score ${score}. Privacy Shield at ${pct} percent. Ara is in the ${LANE_NAMES[lane()]} lane${height > 0 ? ' and jumping' : ''}. ${ahead.length > 0 ? `Ahead: ${ahead.join('; ')}.` : 'The road ahead is clear.'}`,
        recap: [],
      };
      if (over) stats.recap = buildRecap(distanceMetres(scroll), safeGrabs, bumps, gave);
      return stats;
    },
  };
}

/** The game-over recap: what happened, the data given away and why it matters, then the 3 privacy tips. */
export function buildRecap(metres: number, safeGrabs: number, bumps: number, gave: ReadonlyMap<DataKind, number>): string[] {
  const lines = [`You ran ${metres} ${metres === 1 ? 'metre' : 'metres'}, grabbed ${safeGrabs} safe ${safeGrabs === 1 ? 'freebie' : 'freebies'} and bumped into ${bumps} ${bumps === 1 ? 'obstacle' : 'obstacles'}.`];
  const given = [...gave.entries()].map(([kind, n]) => ({ trap: trapByKind(kind), n })).sort((a, b) => b.trap.cost - a.trap.cost);
  if (given.length === 0) {
    lines.push('You did not give away any data. Great job!');
  } else {
    lines.push(`You gave away ${given.map(({ trap, n }) => (n > 1 ? `${trap.gave} (${n} times)` : trap.gave)).join(', ')}.`);
    for (const { trap } of given.slice(0, 2)) lines.push(`Why it matters: ${trap.why}`);
  }
  PRIVACY_TIPS.forEach((tip, i) => lines.push(`Privacy tip ${i + 1}: ${tip}`));
  return lines;
}

const takbo: GameDef = {
  slug: 'takbo-data',
  name: 'Takbo, Data!',
  width: W,
  height: H,
  goodRun: 400,
  howTo: [
    'Press Space, tap or click to jump over puddles, chickens and potholes.',
    'Press the up and down arrows (or W and S), or swipe up and down, to change lane.',
    'Safe freebies (water, clinic flyers, verified badges) ask for nothing and refill your Privacy Shield.',
    'Data traps ask for your birthday, ID photo, PhilHealth number or contacts. Steer around them or jump over them.',
    'The run ends when the Privacy Shield hits 0. You run faster the longer you last.',
  ],
  briefing: [
    { title: 'Wow, freebies everywhere!', text: 'Free load, free phones, free everything! Come, run through the barangay with me.', mood: 'wow' },
    { title: 'Some "free" things cost your data', text: 'Grab the freebies that ask for nothing. Dodge the ones that ask for your details.', mood: 'happy' },
    { title: 'How to play', text: 'Space or tap to jump. Up and down (or swipe) to change lane. Keep your Privacy Shield above zero.', mood: 'idle' },
    { title: 'Why it matters', text: 'Your PhilHealth number and health records are valuable. Scammers want them more than you want free load.', mood: 'think' },
    { title: 'When should I trust it?', text: "Trust offers that don't ask for more than they need.", mood: 'happy' },
  ],
  takeaway: "When should I trust it? When an offer doesn't ask for more of my data than it needs.",
  create: createTakbo,
};

export default takbo;
