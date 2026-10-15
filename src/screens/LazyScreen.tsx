// Route entry for a screen whose code only downloads when it is opened (the Daily Challenge, the certificate).
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { t } from '../app/i18n';
import { Button } from '../ui/kit';

type Loader = () => Promise<{ default: ComponentType }>;

/** Kept after the first load, so coming back to a screen does not flash the loading text. */
const cache = new WeakMap<Loader, ComponentType>();

export function LazyScreen({ load }: { load: Loader }) {
  const [Screen, setScreen] = useState<{ C: ComponentType } | null>(() => {
    const C = cache.get(load);
    return C ? { C } : null;
  });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setFailed(false);
    load().then(
      (m) => {
        cache.set(load, m.default);
        if (live) setScreen({ C: m.default });
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [load, attempt]);

  if (Screen) return <Screen.C />;
  if (failed) {
    return (
      <div class="stack">
        <p>{t('screen.error')}</p>
        <div>
          <Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>
            {t('screen.retry')}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <p class="lesson-loading" role="status">
      {t('screen.loading')}
    </p>
  );
}
