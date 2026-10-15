// Badge medallion (docs/DESIGN.md section 5.4): an 8-sided pixel octagon. Earned = gold with a trophy, locked = soft silhouette.
import type { CSSProperties } from 'preact';
import { Icon } from './Icon';

interface MedalProps {
  earned: boolean;
  /** Edge length in px (multiples of 8 keep the steps crisp). */
  size?: number;
}

/** The medallion artwork only. The label and state are text next to it, so it is hidden from assistive tech. */
export function Medal({ earned, size = 72 }: MedalProps) {
  return (
    <span class={`badge-medal${earned ? ' badge-medal--earned' : ''}`} style={{ '--medal': `${size}px` } as CSSProperties} aria-hidden="true">
      <span class="badge-medal__ring" />
      <span class="badge-medal__face">
        <Icon name={earned ? 'trophy' : 'lock'} size={size >= 64 ? 32 : 24} />
      </span>
    </span>
  );
}
