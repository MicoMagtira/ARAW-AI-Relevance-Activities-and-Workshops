// A villain's pixel portrait as an inline SVG (see ./villainSprites.ts). Locked cards show a flat silhouette.
import { villainById, type VillainId } from '../content/tactics';
import { SPRITE_PALETTE, SPRITE_SIZE, spritePaths } from './villainSprites';

interface VillainPortraitProps {
  id: VillainId;
  /** Rendered edge in px; multiples of 16 keep every pixel crisp. */
  size?: number;
  /** A silhouette, for a card not yet won. */
  locked?: boolean;
  /** Decorative when the name is shown next to it. */
  decorative?: boolean;
  class?: string;
}

export function VillainPortrait({ id, size = 96, locked, decorative, class: className }: VillainPortraitProps) {
  const v = villainById(id);
  const label = locked ? `${v.name}, not beaten yet` : `${v.name}, a pixel-art cartoon villain`;
  return (
    <svg
      class={`villain-art${locked ? ' villain-art--locked' : ''}${className ? ' ' + className : ''}`}
      width={size}
      height={size}
      viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
      shape-rendering="crispEdges"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? 'true' : undefined}
      focusable="false"
    >
      {spritePaths(id).map(([char, d]) => (
        <path key={char} d={d} fill={locked ? (char === 'o' ? 'var(--muted)' : 'var(--line)') : SPRITE_PALETTE[char]} />
      ))}
    </svg>
  );
}
