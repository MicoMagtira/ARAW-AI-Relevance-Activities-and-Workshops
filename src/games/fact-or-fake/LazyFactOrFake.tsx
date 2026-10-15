// Route entry for Fact or Fake: the game's code (and the item bank) only downloads when the player opens it.
import { useEffect, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { Button } from '../../ui/kit';

type Loaded = typeof import('./FactOrFake').FactOrFake;
type Props = { mode: 'free' | 'assess'; form?: string; seed?: string };

export function LazyFactOrFake(props: Props) {
  const [loaded, setLoaded] = useState<{ Game: Loaded } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setFailed(false);
    import('./FactOrFake').then(
      (m) => live && setLoaded({ Game: m.FactOrFake }),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (loaded) return <loaded.Game {...props} />;
  return (
    <div class="lesson">
      <main class="lesson-main" id="main" tabIndex={-1}>
        <h1 class="sr-only">{t('fof.title')}</h1>
        {failed ? (
          <div class="stack">
            <p>{t('lesson.gameError')}</p>
            <div>
              <Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>
                {t('lesson.retry')}
              </Button>
            </div>
          </div>
        ) : (
          <p class="lesson-loading" role="status">
            {t('lesson.loading')}
          </p>
        )}
      </main>
    </div>
  );
}
