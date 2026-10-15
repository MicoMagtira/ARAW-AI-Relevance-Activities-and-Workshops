// Ara's speech bubble (docs/DESIGN.md section 5.13) and the Ara-plus-bubble pair used across the app.
import type { ComponentChildren } from 'preact';
import { Ara, type AraMood } from './Ara';

/** Which side of the bubble Ara stands on. */
export type AraSide = 'left' | 'right' | 'top';

interface AraBubbleProps {
  children: ComponentChildren;
  /** Where Ara is relative to the bubble; the tail points at her. */
  side?: AraSide;
  /** Announce changes politely; only for bubbles that change in response to an answer. */
  live?: boolean;
  class?: string;
}

export function AraBubble({ children, side = 'left', live, class: className }: AraBubbleProps) {
  return (
    <div
      class={`px-box px-bubble px-bubble--${side}${className ? ' ' + className : ''}`}
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
    >
      <svg class="px-bubble__tail" width="12" height="12" viewBox="0 0 3 3" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
        <path fill="var(--ink)" d="M1 0h1v1H1zM0 1h1v1H0zM1 2h1v1H1z" />
        <path fill="var(--surface)" d="M2 0h1v3H2zM1 1h1v1H1z" />
      </svg>
      {children}
    </div>
  );
}

interface AraSaysProps extends Omit<AraBubbleProps, 'side'> {
  mood?: AraMood;
  scale?: number;
  side?: AraSide;
  /** React once (hold the mood, then return to idle). */
  revert?: boolean;
}

/** Ara next to her bubble. The sprite is decorative: the bubble text carries the message. */
export function AraSays({ mood, scale = 3, side = 'left', revert, children, live, class: className }: AraSaysProps) {
  const ara = <Ara mood={mood} scale={scale} revert={revert} decorative class="ara-says__ara" />;
  return (
    <div class={`ara-says ara-says--${side}${className ? ' ' + className : ''}`}>
      {side !== 'right' && ara}
      <AraBubble side={side} live={live} class="ara-says__bubble">
        {children}
      </AraBubble>
      {side === 'right' && ara}
    </div>
  );
}
