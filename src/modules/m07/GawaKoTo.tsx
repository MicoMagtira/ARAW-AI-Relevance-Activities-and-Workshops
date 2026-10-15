// "Gawa Ko 'To!": the Module 7 game. Three poster briefs in the shared studio, no timer, never a fail state: a "Reported!"
// poster is a lesson, and Finish always completes the module. Stars come from how many posters were honest.
import { useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { location$ } from '../../app/router';
import { randomSeed } from '../../games/engine/rng';
import { Studio } from '../../games/gawa-ko-to/Studio';
import { Button } from '../../ui/kit';
import type { ModuleGameProps } from '../types';

export default function GawaKoTo({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the briefs repeatable (e2e); every replay gets a fresh one.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  return (
    <Studio
      mode="module"
      seed={seed}
      endActions={(r) => (
        <Button variant="gold" large onClick={() => onComplete(r.stars)}>
          {t('gawa.finish')}
        </Button>
      )}
    />
  );
}
