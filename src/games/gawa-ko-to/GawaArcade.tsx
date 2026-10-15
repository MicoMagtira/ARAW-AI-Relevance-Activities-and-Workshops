// Gawa Ko 'To! in the Arcade: the same studio, endless and timed. It is a DOM game (the poster is an SVG, and every part is a
// real button), so it has its own route entry instead of the canvas shell. A finished run is saved like any other game.
import { useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { recordRun } from '../../app/scores';
import { hrefFor } from '../../app/router';
import { Chip, Button } from '../../ui/kit';
import { randomSeed } from '../engine/rng';
import { Studio, type StudioResult } from './Studio';
import { GOOD_RUN } from './rules';
import type { DomGameProps } from '../registry';

function ArcadeEnd({ result, daily, onAgain }: { result: StudioResult; daily?: boolean; onAgain: () => void }) {
  // saved once, when the end screen first shows
  const [run] = useState(() => recordRun('gawa-ko-to', result.score, GOOD_RUN, daily));
  return (
    <>
      <p>
        {run.newBest && <Chip kind="streak">{t('game.newBest')}</Chip>} <Chip kind="xp">{t('game.xp', { n: run.xp })}</Chip> <span>{t('game.bestLine', { n: run.best.toLocaleString('en-US') })}</span>
      </p>
      <Button variant="gold" large onClick={onAgain}>
        {t('game.again')}
      </Button>
      <Button variant="secondary" href={hrefFor(daily ? '/daily' : '/arcade')}>
        {daily ? t('game.quitDaily') : t('game.quit')}
      </Button>
    </>
  );
}

export default function GawaArcade({ seed, daily }: DomGameProps) {
  const [run, setRun] = useState({ key: 0, seed: seed || randomSeed() });
  const again = () => setRun({ key: run.key + 1, seed: seed || randomSeed() });
  return <Studio key={run.key} mode="arcade" seed={run.seed} daily={daily} endActions={(r) => <ArcadeEnd result={r} daily={daily} onAgain={again} />} />;
}
