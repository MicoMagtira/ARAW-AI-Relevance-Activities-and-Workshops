// "Sa Sapatos Nila": the Module 9 game. Five visitors at the kiosk, no timer. A person who leaves is a lesson, not a fail state:
// Finish always completes the module. Stars come from how many people were served.
import { useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { location$ } from '../../app/router';
import { randomSeed } from '../../games/engine/rng';
import { Sapatos } from '../../games/sa-sapatos-nila/Sapatos';
import { Button } from '../../ui/kit';
import type { ModuleGameProps } from '../types';

export default function SaSapatosNila({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the visitors repeatable (e2e); every replay gets a fresh one.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  return (
    <Sapatos
      mode="module"
      seed={seed}
      endActions={(r) => (
        <Button variant="gold" large onClick={() => onComplete(r.stars)}>
          {t('sapatos.finish')}
        </Button>
      )}
    />
  );
}
