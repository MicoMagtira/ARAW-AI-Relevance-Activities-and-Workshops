// Bea, her phone and the part of the day, as a pixel-art SVG (160 x 112 units). Her face follows how she feels, the phone
// buzzes when it is calling her, and the sky follows the part of the day. Colours are CSS tokens (see tulog.css for text).
import type { SlotId } from './moments';
import type { Feeling } from './sim';

/** Path data for a bitmap (one rectangle per run of "#"), at `s` units a pixel. */
function bitsPath(rows: readonly string[], x: number, y: number, s: number): string {
  let d = '';
  rows.forEach((row, r) => {
    for (const run of row.matchAll(/#+/g)) d += `M${x + (run.index ?? 0) * s} ${y + r * s}h${run[0].length * s}v${s}h-${run[0].length * s}z`;
  });
  return d;
}

const BODY: readonly string[] = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '.hhhhhhhhhh.',
  '.hssssssssh.',
  '.hssssssssh.',
  '.hssssssssh.',
  '.hssssssssh.',
  '..ssssssss..',
  '..cccccccc..',
  '.cccccccccc.',
  's.cccccccc.s',
  '..cccccccc..',
  '..pppppppp..',
  '..pp....pp..',
  '..kk....kk..',
];

/** Rows 4 to 7 of the face, drawn over the body in ink. */
const FACE: Readonly<Record<Feeling, readonly string[]>> = {
  happy: ['..#......#..', '............', '...#....#...', '....####....'],
  okay: ['..#......#..', '..#......#..', '............', '....####....'],
  sleepy: ['............', '..##....##..', '............', '....##......'],
  sad: ['..#......#..', '..#......#..', '....####....', '...#....#...'],
  worried: ['.##......##.', '..#......#..', '............', '....####....'],
};

const SUN: readonly string[] = ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'];
const MOON: readonly string[] = ['..####..', '.###....', '###.....', '###.....', '###.....', '####....', '.#######', '..#####.'];
const PHONE: readonly string[] = ['.####.', '#....#', '#.##.#', '#.##.#', '#....#', '#....#', '#.##.#', '.####.'];

const SKY: Readonly<Record<SlotId, string>> = {
  morning: 'var(--cream)',
  school: 'var(--navy-tint)',
  afternoon: 'var(--cream)',
  dinner: 'var(--gold)',
  evening: 'var(--navy)',
  night: 'var(--navy)',
};

const STARS: readonly (readonly [number, number])[] = [
  [16, 12],
  [44, 28],
  [76, 8],
  [100, 24],
  [128, 14],
];

interface Props {
  slot: SlotId;
  feeling: Feeling;
  /** The phone is calling Bea right now. */
  buzzing: boolean;
  /** Spoken description of Bea, her phone and the time. */
  label: string;
}

export function BeaScene({ slot, feeling, buzzing, label }: Props) {
  const night = slot === 'night' || slot === 'evening';
  const dark = night;
  return (
    <svg class="bea-scene" viewBox="0 0 160 112" role="img" aria-label={label} shape-rendering="crispEdges">
      <rect width="160" height="112" fill={SKY[slot]} />
      {dark && STARS.map(([x, y]) => <rect key={`${x}-${y}`} class="bea-star" x={x} y={y} width="4" height="4" fill="var(--cream)" />)}
      <path d={bitsPath(night ? MOON : SUN, 124, 8, 4)} fill={night ? 'var(--cream)' : 'var(--coral)'} />
      <rect y="92" width="160" height="20" fill={dark ? 'var(--ink)' : 'var(--soft)'} />
      <rect y="92" width="160" height="4" fill={dark ? 'var(--navy-tint)' : 'var(--line)'} />
      <g transform="translate(40 24)">
        {(
          [
            ['h', 'var(--ink)'],
            ['s', 'var(--gold-deep)'],
            ['c', 'var(--coral)'],
            ['p', 'var(--navy-tint)'],
            ['k', 'var(--ink)'],
          ] as const
        ).map(([ch, fill]) => (
          <path key={ch} d={bitsPath(BODY.map((r) => r.replace(/./g, (c) => (c === ch ? '#' : '.'))), 0, 0, 5)} fill={fill} />
        ))}
        <path d={bitsPath(FACE[feeling], 0, 20, 5)} fill="var(--ink)" />
        {feeling === 'sleepy' && (
          <text class="bea-zzz" x="62" y="12">
            Z z
          </text>
        )}
      </g>
      <g class={buzzing ? 'bea-phone is-buzzing' : 'bea-phone'} transform="translate(112 56)">
        <path d={bitsPath(PHONE, 0, 0, 4)} fill="var(--ink)" />
        <path d={bitsPath(['......', '.####.', '.#..#.', '.#..#.', '.####.', '......', '......', '......'], 0, 0, 4)} fill={buzzing ? 'var(--coral)' : 'var(--surface)'} />
        {buzzing && (
          <>
            <rect x="-8" y="8" width="4" height="12" fill="var(--coral)" />
            <rect x="28" y="8" width="4" height="12" fill="var(--coral)" />
          </>
        )}
      </g>
    </svg>
  );
}
