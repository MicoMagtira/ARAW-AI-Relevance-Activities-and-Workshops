// Route entry for Fact or Fake: the game's code (and the item bank) only downloads when the player opens it.
import { useEffect, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import type { FofItem } from '../../content/factOrFake/schema';
import { Button } from '../../ui/kit';
import { isFormId } from './forms';

type Loaded = typeof import('./FactOrFake').FactOrFake;
type Props = { mode: 'free' | 'assess'; form?: string; seed?: string };

export function LazyFactOrFake(props: Props) {
  const [loaded, setLoaded] = useState<{ Game: Loaded; assessItems?: readonly FofItem[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setFailed(false);
    const { mode, form } = props;
    // The test forms are their own chunk: only the assessment route ever asks for it.
    const items = mode === 'assess' && isFormId(form ?? '') ? import('./assessRound').then((m) => m.formRound(form as 'form_A' | 'form_B')) : Promise.resolve(undefined);
    Promise.all([import('./FactOrFake'), items]).then(
      ([m, assessItems]) => live && setLoaded({ Game: m.FactOrFake, assessItems }),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [attempt, props.mode, props.form]);

  if (loaded) return <loaded.Game {...props} assessItems={loaded.assessItems} />;
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
