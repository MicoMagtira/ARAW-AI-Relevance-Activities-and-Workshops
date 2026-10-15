// A kiosk visitor as a pixel-art SVG portrait (80 x 90 units). Hair, skin and shirt colours are design tokens from `Look`; the
// accessory (glasses, hat, cane, wheelchair) tells who they are. The spoken description is the `label`.
import type { Look } from './data';

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
/** The legs are replaced by a seat when a wheelchair is drawn. */
const SEATED = BODY.slice(0, 13);

const FACE: readonly string[] = ['..#......#..', '............', '...#....#...', '....####....'];
const GLASSES: readonly string[] = ['.###....###.', '.#.#....#.#.', '.###....###.'];
const HAT: readonly string[] = ['....####....', '..########..', '############'];
const WHEEL: readonly string[] = ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'];
const SEAT: readonly string[] = ['##########', '.#......kk.'];

const S = 5;

interface Props {
  look: Look;
  label: string;
}

export function Person({ look, label }: Props) {
  const wheelchair = look.acc === 'wheelchair';
  const rows = wheelchair ? SEATED : BODY;
  return (
    <svg class="sapatos-person" viewBox="0 0 80 100" role="img" aria-label={label} shape-rendering="crispEdges">
      <rect width="80" height="100" fill="var(--cream)" />
      <rect y="92" width="80" height="8" fill="var(--soft)" />
      <rect y="92" width="80" height="3" fill="var(--line)" />
      <g transform="translate(10 8)">
        {(
          [
            ['h', look.hair],
            ['s', look.skin],
            ['c', look.shirt],
            ['p', 'var(--navy-tint)'],
            ['k', 'var(--ink)'],
          ] as const
        ).map(([ch, fill]) => (
          <path key={ch} d={bitsPath(rows.map((r) => r.replace(/./g, (c) => (c === ch ? '#' : '.'))), 0, 0, S)} fill={fill} />
        ))}
        <path d={bitsPath(FACE, 0, 4 * S, S)} fill="var(--ink)" />
        {look.acc === 'glasses' && <path d={bitsPath(GLASSES, 0, 3 * S, S)} fill="var(--ink)" />}
        {look.acc === 'hat' && <path d={bitsPath(HAT, 0, 0, S)} fill="var(--gold)" stroke="var(--ink)" stroke-width="1" />}
        {look.acc === 'cane' && <rect x={12 * S - 2} y={6 * S} width="3" height={9 * S + 2} fill="var(--ink)" />}
        {wheelchair && (
          <>
            <path d={bitsPath(SEAT, S, 13 * S, S)} fill="var(--ink)" />
            <path d={bitsPath(WHEEL, 2 * S, 11 * S, S)} fill="var(--ink)" />
          </>
        )}
      </g>
    </svg>
  );
}
