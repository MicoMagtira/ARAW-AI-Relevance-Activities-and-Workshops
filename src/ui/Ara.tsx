// Ara, the pixel-art sun-spirit guide (docs/DESIGN.md section 7). Sprite data lives in ./ara/frames.ts.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { t, type StringKey } from '../app/i18n';
import { settings } from '../app/settings';
import { GRID, PALETTE, getFrame, pathFor, runsByColour, type AraMood } from './ara/frames';

export type { AraMood } from './ara/frames';

export const ARA_MIN_SCALE = 1;
export const ARA_MAX_SCALE = 12;
export const ARA_DEFAULT_SCALE = 2;
/** How long a reaction (`revert`) shows before Ara returns to idle. */
export const ARA_REACTION_MS = 900;
const BOB_MS = 600;

/** Integer scale of the 32x32 grid (so every sprite pixel is a whole number of screen pixels). */
export function araScale(scale: number | undefined): number {
  if (scale === undefined || !Number.isFinite(scale)) return ARA_DEFAULT_SCALE;
  return Math.min(ARA_MAX_SCALE, Math.max(ARA_MIN_SCALE, Math.round(scale)));
}

/** Rendered edge length in px for a scale. */
export const araSize = (scale: number | undefined): number => GRID * araScale(scale);

const MOOD_KEY: Record<AraMood, StringKey> = {
  idle: 'ara.mood.idle',
  happy: 'ara.mood.happy',
  wow: 'ara.mood.wow',
  wink: 'ara.mood.wink',
  sad: 'ara.mood.sad',
  think: 'ara.mood.think',
};

export const araLabel = (mood: AraMood): string => t('ara.label', { mood: t(MOOD_KEY[mood]) });

/** OS preference OR the in-app Reduce motion setting. */
export function useReducedMotion(): boolean {
  const inApp = settings.value.reduceMotion;
  const [os, setOs] = useState(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setOs(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return inApp || os;
}

export interface AraProps {
  mood?: AraMood;
  /** Integer multiple of the 32x32 grid: 2 = 64px (inline), 3 = 96px (bubbles), 4 = 128px, 6 = 192px, 8 = 256px. */
  scale?: number;
  /** Overrides the default "Ara, your guide, looking <mood>" label. */
  label?: string;
  /** Purely decorative instance: hidden from assistive tech. */
  decorative?: boolean;
  /** Set false for a still sprite (no bob, no blink, no hop). */
  animate?: boolean;
  /** Show `mood` as a reaction: hold it for 900ms, then return to idle (happy and wow also hop). */
  revert?: boolean;
  class?: string;
}

export function Ara({ mood = 'idle', scale, label, decorative, animate = true, revert, class: className }: AraProps) {
  const reduced = useReducedMotion();
  const moving = animate && !reduced;
  const [shown, setShown] = useState<AraMood>(mood);
  const [bob, setBob] = useState(false);
  const [blink, setBlink] = useState(false);
  const [hop, setHop] = useState(false);

  // Frames always change (that is information); only the hop is motion.
  useEffect(() => {
    setShown(mood);
    if (!revert || mood === 'idle') return;
    if (moving && (mood === 'happy' || mood === 'wow')) setHop(true);
    const timer = setTimeout(() => setShown('idle'), ARA_REACTION_MS);
    return () => clearTimeout(timer);
  }, [mood, revert, moving]);

  // Idle bob (A/B every 600ms).
  useEffect(() => {
    if (!moving) {
      setBob(false);
      return;
    }
    const timer = setInterval(() => setBob((b) => !b), BOB_MS);
    return () => clearInterval(timer);
  }, [moving]);

  // Blink for 120ms at random 3.5-5s intervals.
  useEffect(() => {
    if (!moving) {
      setBlink(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 120);
      }, 3500 + Math.random() * 1500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [moving]);

  const s = araScale(scale);
  const size = GRID * s;
  const idle = shown === 'idle';
  const paths = useMemo(() => {
    const rows = getFrame(shown, { bob: idle && bob, blink: idle && blink });
    return [...runsByColour(rows)].map(([key, runs]) => ({ key, d: pathFor(runs), fill: PALETTE[key] }));
  }, [shown, idle, bob, blink]);

  return (
    <span
      class={`ara${hop && moving ? ' ara--hop' : ''}${className ? ' ' + className : ''}`}
      style={{ '--cell': `${s}px`, width: `${size}px`, height: `${size}px` }}
      data-mood={shown}
      data-scale={s}
      onAnimationEnd={() => setHop(false)}
    >
      <svg
        class="ara__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${GRID} ${GRID}`}
        shape-rendering="crispEdges"
        role={decorative ? undefined : 'img'}
        aria-label={decorative ? undefined : (label ?? araLabel(shown))}
        aria-hidden={decorative ? 'true' : undefined}
        focusable="false"
      >
        {paths.map((p) => (
          <path key={p.key} d={p.d} fill={p.fill} />
        ))}
      </svg>
    </span>
  );
}
