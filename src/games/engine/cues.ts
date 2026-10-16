// Small helpers for game sounds. Games call `cue` only when their state changes (an edge), never once per frame.
import type { Cue } from './types';

/** A cue that does nothing (tests and silent runs). */
export const silent: Cue = () => undefined;

/**
 * The countdown sound for a timer that went from `prevMs` to `nextMs` left: a tick as each of the last 5 whole seconds
 * starts, a "hurry" double beep at 3 seconds, nothing otherwise (and nothing when the timer is reset upwards).
 */
export function timerCue(prevMs: number, nextMs: number): 'tick' | 'hurry' | null {
  const before = Math.ceil(prevMs / 1000);
  const now = Math.ceil(nextMs / 1000);
  if (now >= before || now <= 0 || now > 5) return null;
  return now === 3 ? 'hurry' : 'tick';
}
