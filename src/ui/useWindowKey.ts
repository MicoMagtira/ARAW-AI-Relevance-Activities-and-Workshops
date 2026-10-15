import { useEffect, useRef } from 'preact/hooks';

/**
 * Listen for keydown on the window. The listener is added once and always calls the latest `handler`, so a key
 * pressed right after a render never runs against stale state (effects flush a moment after the render).
 */
export function useWindowKey(handler: (e: KeyboardEvent) => void): void {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => latest.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
