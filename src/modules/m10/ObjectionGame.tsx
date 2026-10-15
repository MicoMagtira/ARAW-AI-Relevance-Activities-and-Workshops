// "OBJECTION!": the Module 10 game. Three cases (a leak, a flagged claim, a chatbot), one of each. Three strikes adjourn the
// hearing, but Finish always completes the module. Stars come from cases won and strikes taken.
import { useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { location$ } from '../../app/router';
import { randomSeed } from '../../games/engine/rng';
import { Objection } from '../../games/objection/Objection';
import { Button } from '../../ui/kit';
import type { ModuleGameProps } from '../types';

export default function ObjectionGame({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the cases repeatable (e2e); every replay gets a fresh one.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  return (
    <Objection
      mode="module"
      seed={seed}
      endActions={(r) => (
        <Button variant="gold" large onClick={() => onComplete(r.stars)}>
          {t('objection.finish')}
        </Button>
      )}
    />
  );
}
