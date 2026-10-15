// "AI or Not?": the Module 1 game. A deck of 12 everyday things, swiped (or tapped, or keyed) into AI or Not AI,
// with a one-line why after every card. It always completes after 12 cards: there is no fail state.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { location$ } from '../../app/router';
import { answerFor, type AonAnswer, type AonItem } from '../../content/aiOrNot';
import { randomSeed } from '../../games/engine/rng';
import { Icon } from '../../ui/Icon';
import { Button, Chip } from '../../ui/kit';
import { useWindowKey } from '../../ui/useWindowKey';
import '../../styles/aon.css';
import { buildDeck, DECK_SIZE, maxScore, newRound, POINTS, scoreAnswer, starsForScore, type AnswerResult, type RoundState } from './aonLogic';
import type { ModuleGameProps } from '../types';

/** Drag distance in px that counts as a swipe. */
export const AON_SWIPE_DISTANCE = 70;

interface Played {
  item: AonItem;
  answer: AonAnswer;
  result: AnswerResult;
}

/** The "why" line. Hype cards open with a highlighted "Hype alert!". */
function Why({ item }: { item: AonItem }) {
  if (item.kind !== 'hype') return <>{item.why}</>;
  const rest = item.why.replace(/^Hype alert!\s*/, '');
  return (
    <>
      <strong class="aon-hype">{t('aon.hype')}</strong> {rest}
    </>
  );
}

function StarRow({ n }: { n: number }) {
  return (
    <span class="stars" role="img" aria-label={t('lesson.stars', { n })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="xp-star" size={32} class={i <= n ? 'star star--on' : 'star'} />
      ))}
    </span>
  );
}

export default function AiOrNot({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the deck repeatable (e2e); every replay gets a fresh deck.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  const deck = useMemo(() => buildDeck(seed), [seed]);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState<RoundState>(newRound);
  const [played, setPlayed] = useState<Played[]>([]);
  const [done, setDone] = useState(false);
  const locked = useRef(false);
  const dragStart = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const firstCard = useRef(true);

  const item = deck[index] as AonItem;
  const last = played[played.length - 1];
  const answered = played.length > index; // the current card has an answer, feedback is showing
  const isLast = index + 1 >= deck.length;

  const setDrag = (dx: number) => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--rot', `${dx / 24}deg`);
    el.dataset.dir = dx > 24 ? 'ai' : dx < -24 ? 'not-ai' : '';
  };

  const answer = (choice: AonAnswer) => {
    if (locked.current || done) return;
    locked.current = true;
    setDrag(0);
    const result = scoreAnswer(round, item, choice);
    setRound(result.state);
    setPlayed([...played, { item, answer: choice, result }]);
  };

  const next = () => {
    if (!answered) return;
    if (isLast) {
      setDone(true);
      return;
    }
    setIndex(index + 1);
    locked.current = false;
  };

  // Keys: left arrow = Not AI, right arrow = AI; Enter moves on after the feedback.
  useWindowKey((e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (answered || done) return;
      e.preventDefault();
      answer(e.key === 'ArrowRight' ? 'ai' : 'not-ai');
    } else if (e.key === 'Enter' && answered && !done) {
      const target = e.target;
      // a focused button or link handles Enter itself
      if (target instanceof HTMLElement && target !== document.body && target !== cardRef.current) return;
      e.preventDefault();
      next();
    }
  });

  // After an answer the Next button gets focus; a new card puts focus on the card so screen readers start there.
  useEffect(() => {
    if (!answered) return;
    feedbackRef.current?.querySelector('button')?.focus({ preventScroll: true });
    // on a narrow screen the feedback sits below the card: bring it into view without hiding the card
    feedbackRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [answered, index]);
  useEffect(() => {
    if (firstCard.current) {
      firstCard.current = false;
      return;
    }
    if (!done) cardRef.current?.focus({ preventScroll: true });
  }, [index, done]);

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || locked.current) return;
    dragStart.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already released pointer: dragging still works through bubbling */
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragStart.current !== null) setDrag(Math.max(-160, Math.min(160, e.clientX - dragStart.current)));
  };
  const onPointerUp = (e: PointerEvent) => {
    if (dragStart.current === null) return;
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    setDrag(0);
    if (Math.abs(dx) >= AON_SWIPE_DISTANCE) answer(dx > 0 ? 'ai' : 'not-ai');
  };
  const onPointerCancel = () => {
    dragStart.current = null;
    setDrag(0);
  };

  if (done) {
    const stars = starsForScore(round.correct);
    const misses = played.filter((p) => !p.result.right);
    return (
      <div class="aon aon--done stack">
        <h3 class="aon-done__title">{t('aon.doneTitle')}</h3>
        <div class="aon-done__grid">
          <StarRow n={stars} />
          <p class="aon-done__score">
            <strong>{t('aon.finalScore', { score: round.score, max: maxScore(deck.length) })}</strong>
          </p>
          <p>{t('aon.finalRight', { correct: round.correct, total: deck.length })}</p>
          <p>{t('aon.finalStreak', { n: round.best })}</p>
        </div>
        {misses.length > 0 ? (
          <section class="stack" aria-labelledby="aon-misses">
            <h4 class="aon-misses__title" id="aon-misses">
              {t('aon.misses')}
            </h4>
            <ul class="aon-misses">
              {misses.map((p) => (
                <li key={p.item.id} class="aon-miss">
                  <strong>{p.item.name}:</strong> {answerFor(p.item) === 'ai' ? t('aon.isAi') : t('aon.isNotAi')} <Why item={p.item} />
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p class="aon-perfect">{t('aon.perfect')}</p>
        )}
        <div>
          <Button variant="gold" large onClick={() => onComplete(stars)}>
            {t('aon.finish')}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </div>
    );
  }

  const right = !!last && answered && last.result.right;
  const streakToBonus = round.streak % POINTS.streakEvery;

  return (
    <div class={`aon${answered ? ' aon--answered' : ''}`}>
      <div class="aon-hud">
        <p class="panel-title">{t('aon.card', { n: index + 1, total: DECK_SIZE })}</p>
        <ol class="aon-dots" aria-label={t('aon.dots')}>
          {deck.map((d, i) => {
            const p = played[i];
            const state = !p ? 'todo' : p.result.right ? 'right' : 'wrong';
            return (
              <li key={d.id} class={`aon-dot aon-dot--${state}${i === index ? ' aon-dot--now' : ''}`} aria-current={i === index ? 'step' : undefined}>
                {state === 'right' && <Icon name="check" size={12} />}
                {state === 'wrong' && <Icon name="close" size={12} />}
                <span class="sr-only">{t(`fof.dot.${state}` as const, { n: i + 1 })}</span>
              </li>
            );
          })}
        </ol>
        <p class="aon-score">
          <Chip kind="xp">{t('aon.score', { score: round.score })}</Chip>
          <Chip kind="streak">{t('aon.streak', { n: streakToBonus, goal: POINTS.streakEvery })}</Chip>
        </p>
      </div>

      <section class="aon-stage" aria-label={t('aon.stage')}>
        <div
          class="aon-swipe"
          ref={cardRef}
          tabIndex={-1}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <span class="aon-swipe__tag aon-swipe__tag--not" aria-hidden="true">
            {t('aon.notAi')}
          </span>
          <span class="aon-swipe__tag aon-swipe__tag--ai" aria-hidden="true">
            {t('aon.ai')}
          </span>
          <article class="aon-card px-box" key={item.id}>
            {item.sticker && (
              <span class="aon-card__sticker" aria-label={t('aon.sticker', { text: item.sticker })}>
                {item.sticker}
              </span>
            )}
            <h3 class="aon-card__name">{item.name}</h3>
            <p class="aon-card__detail">{item.detail}</p>
          </article>
        </div>

        <h4 class="aon-question">{t('aon.question')}</h4>
        <div class="aon-buttons">
          <Button variant="secondary" large aria-disabled={answered ? 'true' : undefined} aria-keyshortcuts="ArrowLeft" class={last?.answer === 'not-ai' && answered ? 'is-chosen' : undefined} onClick={() => answer('not-ai')}>
            <Icon name="arrow-left" />
            {t('aon.notAi')}
          </Button>
          <Button variant="gold" large aria-disabled={answered ? 'true' : undefined} aria-keyshortcuts="ArrowRight" class={last?.answer === 'ai' && answered ? 'is-chosen' : undefined} onClick={() => answer('ai')}>
            {t('aon.ai')}
            <Icon name="arrow-right" />
          </Button>
        </div>
        <p class="aon-hint">
          <span class="aon-hint__touch">{t('aon.swipeHint')}</span>
          <span class="aon-hint__keys">{t('aon.keyHint')}</span>
        </p>
      </section>

      <div class="aon-feedback-slot" ref={feedbackRef} role="status" aria-live="polite">
        {answered && last ? (
          <section class={`aon-feedback px-box ${right ? 'aon-feedback--right' : 'aon-feedback--wrong'}`} aria-label={t('aon.feedback')}>
            <h4 class="aon-feedback__head">{right ? t('lesson.correct') : t('lesson.almost')}</h4>
            <p>
              <strong>{answerFor(item) === 'ai' ? t('aon.isAi') : t('aon.isNotAi')}</strong> <Why item={item} />
            </p>
            <p class="aon-feedback__points">
              {right
                ? last.result.bonus
                  ? t('aon.pointsBonus', { n: last.result.points, bonus: POINTS.streakBonus })
                  : t('aon.points', { n: last.result.points })
                : t('aon.noPoints')}
            </p>
            <div class="aon-feedback__actions">
              <Button variant="gold" large onClick={next}>
                {isLast ? t('aon.seeScore') : t('aon.nextCard')}
                <Icon name="arrow-right" />
              </Button>
            </div>
          </section>
        ) : (
          <p class="aon-feedback-empty px-text-muted">{t('aon.waiting')}</p>
        )}
      </div>
    </div>
  );
}
