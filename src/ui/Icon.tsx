import { iconData, type IconName } from './icons';

interface IconProps {
  name: IconName;
  /** Render size in px. Integer multiples of 24 stay crisp (24, 48). */
  size?: number;
  /** Provide for meaningful icons; decorative icons stay aria-hidden. */
  label?: string;
  class?: string;
}

export function Icon({ name, size = 24, label, class: className }: IconProps) {
  const { paths, evenOdd } = iconData(name);
  return (
    <svg
      class={`px-icon${className ? ' ' + className : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      shape-rendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {paths.map((d) => (
        <path key={d} d={d} fill-rule={evenOdd ? 'evenodd' : undefined} />
      ))}
    </svg>
  );
}
