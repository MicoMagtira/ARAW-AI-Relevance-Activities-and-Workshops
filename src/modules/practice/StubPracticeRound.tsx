// Stub for the mini Fact or Fake slot (T05 swaps in the real round). Same props, same XP flow.
import { useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { AraSays } from '../../ui/AraBubble';
import { Button, Stamp, Watermark } from '../../ui/kit';
import type { PracticeRoundProps } from '../types';
import { stubItemsFor } from './stubItems';

export default function StubPracticeRound({ moduleId, count, onAnswer, onDone }: PracticeRoundProps) {
  const [items] = useState(() => stubItemsFor(moduleId, count));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<'fact' | 'fake' | null>(null);
  const [correct, setCorrect] = useState(0);
  const item = items[index];

  if (!item) {
    // No items for this module: never block the player.
    return (
      <div class="stack">
        <p>{t('practice.empty')}</p>
        <Button variant="gold" onClick={() => onDone({ correct: 0, total: 0 })}>
          {t('practice.finish')}
        </Button>
      </div>
    );
  }

  const pick = (choice: 'fact' | 'fake') => {
    if (answer) return;
    const right = choice === item.truth;
    setAnswer(choice);
    if (right) setCorrect(correct + 1);
    onAnswer(item.id, right);
  };
  const last = index + 1 >= items.length;
  const next = () => {
    if (last) onDone({ correct, total: items.length });
    else {
      setIndex(index + 1);
      setAnswer(null);
    }
  };
  const right = answer === item.truth;

  return (
    <div class="card card--practice stack">
      <p class="panel-title">{t('practice.kicker', { n: index + 1, total: items.length })}</p>
      <h2 class="card__title">{t('practice.question')}</h2>
      <div class="post px-box">
        <Watermark />
        <p class="post__text">{item.text}</p>
        {answer && item.truth === 'fake' && <Stamp />}
      </div>
      <div class="practice-buttons">
        <Button variant="fake" large onClick={() => pick('fake')} aria-disabled={answer ? 'true' : undefined}>
          {t('practice.fake')}
        </Button>
        <Button variant="fact" large onClick={() => pick('fact')} aria-disabled={answer ? 'true' : undefined}>
          {t('practice.fact')}
        </Button>
      </div>
      <div class="feedback" role="status" aria-live="polite">
        {answer && (
          <>
            <AraSays mood={right ? 'happy' : 'think'} scale={2} class="practice-ara">
              <p>
                <strong>{right ? t('lesson.correct') : t('lesson.almost')}</strong> {item.explanation}
              </p>
            </AraSays>
            <div>
              <Button variant="gold" onClick={next}>
                {last ? t('practice.finish') : t('lesson.next')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
