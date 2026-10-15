// Route entry for the Library: its code (myths, glossary, Komiks and the panel art) only downloads when it is opened.
import { useEffect, useState } from 'preact/hooks';
import { t } from '../app/i18n';
import { Button } from '../ui/kit';

type Loaded = typeof import('./library/LibraryScreen').LibraryScreen;

/** Kept after the first load, so coming back to the Library does not flash the loading text. */
let cached: { C: Loaded } | null = null;

export function Library() {
  const [Screen, setScreen] = useState<{ C: Loaded } | null>(cached);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setFailed(false);
    import('./library/LibraryScreen').then(
      (m) => {
        cached = { C: m.LibraryScreen };
        if (live) setScreen(cached);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (Screen) return <Screen.C />;
  if (failed) {
    return (
      <div class="stack">
        <p>{t('library.error')}</p>
        <div>
          <Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>
            {t('library.retry')}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <p class="lesson-loading" role="status">
      {t('library.loading')}
    </p>
  );
}
