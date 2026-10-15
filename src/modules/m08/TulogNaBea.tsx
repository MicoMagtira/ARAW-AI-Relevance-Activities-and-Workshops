// "Tulog na, Bea!": the Module 8 game. Three days in the shared life sim, no timer. A "reset day" is a lesson, not a fail state:
// Finish always completes the module. Stars come from how many days were good.
import { useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { location$ } from '../../app/router';
import { randomSeed } from '../../games/engine/rng';
import { Tulog } from '../../games/tulog-na-bea/Tulog';
import { Button } from '../../ui/kit';
import type { ModuleGameProps } from '../types';

export default function TulogNaBea({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the days repeatable (e2e); every replay gets a fresh one.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  return (
    <Tulog
      mode="module"
      seed={seed}
      endActions={(r) => (
        <Button variant="gold" large onClick={() => onComplete(r.stars)}>
          {t('tulog.finish')}
        </Button>
      )}
    />
  );
}
