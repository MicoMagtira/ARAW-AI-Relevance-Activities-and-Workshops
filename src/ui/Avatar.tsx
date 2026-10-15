import { useMemo } from 'preact/hooks';
import { AVATARS, avatarPaths, safeAvatarIndex } from './avatars';

interface AvatarProps {
  index: number;
  /** Render size in px; multiples of 16 keep every pixel crisp. */
  size?: number;
  /** Provide for a meaningful avatar; decorative ones stay aria-hidden. */
  label?: string;
  class?: string;
}

export function Avatar({ index, size = 64, label, class: className }: AvatarProps) {
  const i = safeAvatarIndex(index);
  const paths = useMemo(() => avatarPaths(AVATARS[i] as (typeof AVATARS)[number]), [i]);
  return (
    <svg
      class={`px-avatar${className ? ' ' + className : ''}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shape-rendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {paths.map((p) => (
        <path key={p.colour} d={p.d} fill={p.colour} />
      ))}
    </svg>
  );
}
