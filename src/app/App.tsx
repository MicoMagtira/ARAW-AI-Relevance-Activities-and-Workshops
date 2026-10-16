import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { Landing } from '../screens/Landing';
import { Splash } from '../screens/Splash';
import { Shell } from './Shell';
import { introStep, splashVisible } from './boot';

/** Boot flow: on the first visit of a session, the language landing, then the sunrise splash, then the app shell. */
export function App() {
  const showSplash = splashVisible.value;
  const step = introStep.value;
  const wasSplash = useRef(showSplash);
  const lastStep = useRef(step);

  // Leaving the splash: put focus on the content so keyboard and screen-reader users start there.
  useEffect(() => {
    if (wasSplash.current && !showSplash) document.getElementById('main')?.focus({ preventScroll: true });
    wasSplash.current = showSplash;
  }, [showSplash]);

  // Landing -> sunrise: the Select button is gone, so start keyboard and screen-reader users at the top of the splash.
  // A layout effect runs in the same task as the render, so a quick Tab press can't land before the focus move.
  useLayoutEffect(() => {
    const entered = showSplash && step === 'sunrise' && lastStep.current === 'language';
    lastStep.current = step;
    if (!entered) return;
    window.scrollTo(0, 0); // the Select button may sit below the fold on small screens; the sunrise starts at the top
    document.getElementById('splash')?.focus({ preventScroll: true });
  }, [showSplash, step]);

  if (!showSplash) return <Shell />;
  return step === 'language' ? <Landing /> : <Splash />;
}
