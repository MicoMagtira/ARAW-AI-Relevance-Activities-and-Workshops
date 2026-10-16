// Sa Sapatos Nila in the Arcade: the same kiosk, endless visitors. It is a DOM game (every barrier, fix and result is real text),
// so it has its own route entry instead of the canvas shell. A finished run is saved like any other game.
import { useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { hrefFor } from '../../app/router';
import { recordRun } from '../../app/scores';
import { Button, Chip } from '../../ui/kit';
import { randomSeed } from '../engine/rng';
import type { DomGameProps } from '../registry';
import { useRunEndSound } from '../engine/useRunEnd';
import { Sapatos, type SapatosResult } from './Sapatos';
import { GOOD_RUN } from './sim';

function ArcadeEnd({ result, daily, onAgain }: { result: SapatosResult; daily?: boolean; onAgain: () => void }) {
  // saved once, when the end screen first shows
  const [run] = useState(() => recordRun('sa-sapatos-nila', result.score, GOOD_RUN, daily));
  useRunEndSound(run.goodRun);
  return (
    <>
      <p>
        {run.newBest && <Chip kind="streak">{t('game.newBest')}</Chip>} <Chip kind="xp">{t('game.xp', { n: run.xp })}</Chip> <span>{t('game.bestLine', { n: run.best.toLocaleString('en-US') })}</span>
      </p>
      <Button variant="gold" large data-sfx="start" onClick={onAgain}>
        {t('game.again')}
      </Button>
      <Button variant="secondary" href={hrefFor(daily ? '/daily' : '/arcade')}>
        {daily ? t('game.quitDaily') : t('game.quit')}
      </Button>
    </>
  );
}

export default function SapatosArcade({ seed, daily }: DomGameProps) {
  const [run, setRun] = useState({ key: 0, seed: seed || randomSeed() });
  const again = () => setRun({ key: run.key + 1, seed: seed || randomSeed() });
  return <Sapatos key={run.key} mode="arcade" seed={run.seed} daily={daily} endActions={(r) => <ArcadeEnd result={r} daily={daily} onAgain={again} />} />;
}
