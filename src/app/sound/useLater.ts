// Timed sounds inside a component (a stamp, then the verdict, then Ara's line): every pending timer is dropped
// when the component goes away or `clear()` is called, so no sound plays after the player has left the screen.
import { useEffect, useMemo } from 'preact/hooks';

export interface Later {
  /** Run `fn` after `ms` milliseconds (0 runs it on the next tick). */
  (ms: number, fn: () => void): void;
  /** Cancel everything still waiting. */
  clear(): void;
}

export function useLater(): Later {
  const later = useMemo(() => {
    const ids = new Set<ReturnType<typeof setTimeout>>();
    const run = ((ms: number, fn: () => void) => {
      const id = setTimeout(() => {
        ids.delete(id);
        fn();
      }, ms);
      ids.add(id);
    }) as Later;
    run.clear = () => {
      ids.forEach((id) => clearTimeout(id));
      ids.clear();
    };
    return run;
  }, []);
  useEffect(() => () => later.clear(), [later]);
  return later;
}
