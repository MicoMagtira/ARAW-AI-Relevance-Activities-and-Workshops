import { useEffect, useRef } from 'preact/hooks';
import { Splash } from '../screens/Splash';
import { Shell } from './Shell';
import { splashVisible } from './boot';

/** Boot flow: the sunrise splash on the first visit of a session, then the app shell. */
export function App() {
  const showSplash = splashVisible.value;
  const wasSplash = useRef(showSplash);

  // Leaving the splash: put focus on the content so keyboard and screen-reader users start there.
  useEffect(() => {
    if (wasSplash.current && !showSplash) document.getElementById('main')?.focus({ preventScroll: true });
    wasSplash.current = showSplash;
  }, [showSplash]);

  return showSplash ? <Splash /> : <Shell />;
}
