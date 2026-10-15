// Hand-made pixel scenes for image items (32x16 grid). Synthetic only: no photos, no real people, no real logos.
import type { SceneDescriptor, SceneId } from '../../content/factOrFake/schema';

/** Palette keys map to design tokens, so scenes follow the theme and never hard-code hexes. */
const FILL = {
  i: 'var(--ink)',
  n: 'var(--navy)',
  w: 'var(--surface)',
  g: 'var(--gold)',
  G: 'var(--gold-deep)',
  c: 'var(--coral)',
  f: 'var(--fact)',
  r: 'var(--fake)',
  s: 'var(--soft)',
} as const;

type Key = keyof typeof FILL;
/** colour, x, y, width, height */
type Rect = readonly [Key, number, number, number, number];

export const SCENE_WIDTH = 32;
export const SCENE_HEIGHT = 16;

export const SCENE_RECTS: Readonly<Record<SceneId, readonly Rect[]>> = {
  // a supplement bottle on a shelf, with capsules and sparkles
  bottle: [
    ['i', 2, 14, 28, 2],
    ['i', 11, 1, 10, 3],
    ['n', 12, 2, 8, 1],
    ['i', 11, 4, 10, 10],
    ['w', 12, 5, 8, 9],
    ['c', 12, 7, 8, 4],
    ['g', 15, 8, 2, 2],
    ['i', 23, 11, 6, 3],
    ['c', 24, 12, 2, 1],
    ['w', 26, 12, 2, 1],
    ['G', 4, 4, 1, 3],
    ['G', 3, 5, 3, 1],
    ['G', 26, 3, 1, 3],
    ['G', 25, 4, 3, 1],
  ],
  // a made-up "doctor" persona in a white coat holding a bottle
  portrait: [
    ['i', 12, 1, 8, 2],
    ['i', 11, 2, 10, 7],
    ['g', 12, 3, 8, 5],
    ['i', 12, 3, 8, 1],
    ['i', 14, 5, 1, 1],
    ['i', 17, 5, 1, 1],
    ['r', 15, 7, 2, 1],
    ['g', 14, 9, 4, 1],
    ['i', 6, 10, 20, 6],
    ['w', 7, 11, 18, 5],
    ['n', 14, 10, 4, 2],
    ['n', 10, 11, 1, 4],
    ['n', 11, 14, 3, 1],
    ['i', 21, 11, 4, 1],
    ['c', 21, 12, 4, 4],
  ],
  // a cup of herbal tea with leaves and steam
  tea: [
    ['G', 12, 1, 1, 2],
    ['G', 19, 0, 1, 3],
    ['f', 13, 3, 2, 2],
    ['f', 17, 2, 2, 3],
    ['f', 15, 4, 2, 1],
    ['i', 9, 6, 14, 9],
    ['w', 10, 7, 12, 7],
    ['f', 10, 7, 12, 2],
    ['i', 23, 8, 4, 1],
    ['i', 26, 8, 1, 5],
    ['i', 23, 12, 4, 1],
    ['i', 6, 15, 20, 1],
  ],
  // a health center with a green cross under a gold sun
  clinic: [
    ['g', 24, 1, 5, 5],
    ['n', 5, 3, 20, 2],
    ['i', 6, 5, 18, 11],
    ['w', 7, 6, 16, 10],
    ['f', 14, 6, 2, 4],
    ['f', 13, 7, 4, 2],
    ['s', 9, 8, 3, 3],
    ['s', 19, 8, 3, 3],
    ['n', 13, 11, 4, 5],
  ],
};

export function SceneArt({ image }: { image: SceneDescriptor }) {
  return (
    <div class={`fof-scene fof-scene--${image.scene}`}>
      <svg
        class="fof-scene__svg"
        viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}
        shape-rendering="crispEdges"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={image.alt}
      >
        {SCENE_RECTS[image.scene].map(([key, x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} fill={FILL[key]} />
        ))}
      </svg>
      {image.badge && <span class="fof-scene__badge">{image.badge}</span>}
    </div>
  );
}
