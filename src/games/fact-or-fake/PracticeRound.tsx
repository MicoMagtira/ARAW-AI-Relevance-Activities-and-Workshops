// The module mini Fact or Fake round (slot in the module runner): practice items tagged for the module, balanced and seeded.
// Module 4 plays ten items and shows the Truth Radar before the reward.
import { useMemo, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import type { PracticeRoundProps } from '../../modules/types';
import { Button } from '../../ui/kit';
import { randomSeed } from '../engine/rng';
import { FofRound, type RoundAnswer } from './FofRound';
import { buildRound } from './rounds';
import { recordRound, scoreAnswers } from './results';
import { TruthRadar } from './TruthRadar';

export default function PracticeRound({ moduleId, count, onAnswer, onDone }: PracticeRoundProps) {
  const items = useMemo(() => buildRound({ size: count, seed: randomSeed(), module: moduleId }), [moduleId, count]);
  const [finished, setFinished] = useState<RoundAnswer[] | null>(null);
  const showRadar = moduleId === 'm04';

  if (items.length === 0) {
    // No items at all: never block the player.
    return (
      <div class="stack">
        <p>{t('practice.empty')}</p>
        <Button variant="gold" onClick={() => onDone({ correct: 0, total: 0 })}>
          {t('practice.finish')}
        </Button>
      </div>
    );
  }

  const done = (answers: RoundAnswer[]) => onDone({ correct: answers.filter((a) => a.correct).length, total: answers.length });

  if (finished) {
    const score = scoreAnswers(finished);
    return (
      <div class="stack">
        <h2 class="card__title">{t('radar.title')}</h2>
        <TruthRadar score={score} />
        <div>
          <Button variant="gold" large onClick={() => done(finished)}>
            {t('practice.finish')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FofRound
      items={items}
      mode="module"
      compact
      finishLabel={showRadar ? t('fof.seeRadar') : t('practice.finish')}
      onAnswer={(a) => onAnswer(a.item.id, a.correct)}
      onFinish={(answers) => {
        if (!showRadar) return done(answers);
        recordRound(scoreAnswers(answers));
        setFinished(answers);
      }}
    />
  );
}
