// Lesson card views. Each card calls onReady() when the player may continue and onReact() to make Ara respond.
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import type { AraMood } from '../../ui/Ara';
import { Icon } from '../../ui/Icon';
import { useWindowKey } from '../../ui/useWindowKey';
import { checkChoice } from '../engine';
import type { Card, ChoiceCard, InfoCard, PollCard, RevealCard, StoryHookCard, TakeawayCard } from '../types';
import { SwipeSort } from './SwipeSort';

export interface Reaction {
  mood: AraMood;
  line: string;
}

export interface CardProps<C extends Card = Card> {
  card: C;
  onReady: () => void;
  onReact: (r: Reaction) => void;
}

/** Cards that need no action are ready as soon as they show. */
function useReadyOnMount(onReady: () => void) {
  useEffect(onReady, []);
}

export function StoryHook({ card, onReady }: CardProps<StoryHookCard>) {
  useReadyOnMount(onReady);
  return (
    <div class="card card--story">
      <div class="card__scene px-sunrise" role="img" aria-label={card.scene}>
        <Icon name={card.icon ?? 'sun'} size={48} />
      </div>
      <div class="stack">
        <p class="panel-title">{card.scene}</p>
        <blockquote class="card__quote">
          <p>{`"${card.line}"`}</p>
          <footer>{card.speaker}</footer>
        </blockquote>
      </div>
    </div>
  );
}

export function Info({ card, onReady }: CardProps<InfoCard>) {
  useReadyOnMount(onReady);
  return (
    <div class="card card--info">
      <div class="card__art" aria-hidden="true">
        <Icon name={card.icon ?? 'info'} size={72} />
      </div>
      <div class="stack">
        <h2 class="card__title">{card.title}</h2>
        <p>{card.body}</p>
      </div>
    </div>
  );
}

export function Reveal({ card, onReady, onReact }: CardProps<RevealCard>) {
  const [open, setOpen] = useState<readonly number[]>([]);
  const toggle = (i: number) => {
    if (open.includes(i)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === card.tiles.length) {
      onReady();
      onReact({ mood: 'happy', line: card.ara?.done ?? t('lesson.ara.revealDone') });
    } else {
      onReact({ mood: 'wow', line: t('lesson.ara.revealMore', { n: card.tiles.length - next.length }) });
    }
  };
  return (
    <div class="card card--reveal stack">
      <h2 class="card__title">{card.title}</h2>
      <p>{card.prompt}</p>
      <p class="px-text-muted" aria-live="polite">
        {t('lesson.revealCount', { done: open.length, total: card.tiles.length })}
      </p>
      <ul class="tiles">
        {card.tiles.map((tile, i) => {
          const shown = open.includes(i);
          return (
            <li key={tile.label}>
              <button type="button" class={`tile px-box${shown ? ' tile--open' : ''}`} aria-expanded={shown} onClick={() => toggle(i)}>
                <span class="tile__label">{tile.label}</span>
                <span class="tile__detail" hidden={!shown}>
                  {tile.detail}
                </span>
                {!shown && <span class="tile__hint">{t('lesson.tapToReveal')}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Choice({ card, onReady, onReact }: CardProps<ChoiceCard>) {
  const [tried, setTried] = useState<readonly number[]>([]);
  const live = useRef<readonly number[]>([]); // mirrors `tried` so quick key presses never read stale state
  const solved = tried.includes(card.correct);
  const last = tried[tried.length - 1];

  const pick = (i: number) => {
    const before = live.current;
    if (before.includes(card.correct) || before.includes(i)) return;
    const result = checkChoice(card, i);
    live.current = [...before, i];
    setTried(live.current);
    if (result.correct) {
      onReady();
      onReact({ mood: 'happy', line: card.ara?.done ?? t('lesson.ara.right') });
    } else {
      onReact({ mood: 'think', line: t('lesson.ara.almost') });
    }
  };

  // 1 to 4 pick an option (docs/DESIGN.md section 11.4).
  useWindowKey((e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= card.options.length) pick(n - 1);
  });

  const lastResult = last === undefined ? null : checkChoice(card, last);
  return (
    <div class="card card--choice stack">
      <h2 class="card__title">{card.question}</h2>
      <ul class="options">
        {card.options.map((o, i) => {
          const wrong = tried.includes(i) && i !== card.correct;
          const right = solved && i === card.correct;
          return (
            <li key={o.text}>
              <button
                type="button"
                class={`option px-box${right ? ' option--right' : ''}${wrong ? ' option--wrong' : ''}`}
                aria-disabled={solved || wrong ? 'true' : undefined}
                onClick={() => pick(i)}
              >
                <span class="option__key" aria-hidden="true">
                  {i + 1}
                </span>
                <span class="option__text">{o.text}</span>
                {(right || wrong) && (
                  <span class="option__mark">
                    <Icon name={right ? 'check' : 'close'} size={24} />
                    <span class="sr-only">{right ? t('lesson.correct') : t('lesson.notThis')}</span>
                  </span>
                )}
                {solved && i !== card.correct && <span class="option__why">{o.feedback}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div class="feedback" role="status" aria-live="polite">
        {lastResult && (
          <p class={`feedback__box ${lastResult.correct ? 'feedback__box--fact' : 'feedback__box--almost'}`}>
            <strong>{lastResult.correct ? t('lesson.correct') : t('lesson.almost')}</strong> {lastResult.feedback}
            {!lastResult.correct && ` ${t('lesson.tryAgain')}`}
          </p>
        )}
      </div>
    </div>
  );
}

export function Poll({ card, onReady, onReact }: CardProps<PollCard>) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    onReady();
    onReact({ mood: 'wink', line: card.ara?.done ?? t('lesson.ara.poll') });
  };
  return (
    <div class="card card--poll stack">
      <p class="panel-title">{t('lesson.pollKicker')}</p>
      <h2 class="card__title">{card.question}</h2>
      <ul class="options">
        {card.options.map((o, i) => (
          <li key={o}>
            <button type="button" class="option px-box" aria-pressed={picked === i} aria-disabled={picked !== null && picked !== i ? 'true' : undefined} onClick={() => pick(i)}>
              <span class="option__key" aria-hidden="true">
                {i + 1}
              </span>
              <span class="option__text">{o}</span>
            </button>
          </li>
        ))}
      </ul>
      <div class="feedback" role="status" aria-live="polite">
        {picked !== null && <p class="feedback__box feedback__box--soft">{card.reflection}</p>}
      </div>
    </div>
  );
}

export function Takeaway({ card, onReady }: CardProps<TakeawayCard>) {
  useReadyOnMount(onReady);
  return (
    <div class="card card--takeaway stack">
      <p class="panel-title">{t('lesson.takeawayKicker')}</p>
      <h2 class="card__title">{t('lesson.takeawayTitle')}</h2>
      <ol class="bullets">
        {card.bullets.map((b, i) => (
          <li key={b}>
            <span class="bullets__n" aria-hidden="true">
              {i + 1}
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Renders any card by its type. */
export function CardView(props: CardProps) {
  const { card } = props;
  switch (card.type) {
    case 'story-hook':
      return <StoryHook {...(props as CardProps<StoryHookCard>)} />;
    case 'info':
      return <Info {...(props as CardProps<InfoCard>)} />;
    case 'reveal':
      return <Reveal {...(props as CardProps<RevealCard>)} />;
    case 'choice':
      return <Choice {...(props as CardProps<ChoiceCard>)} />;
    case 'swipe-sort':
      return <SwipeSort {...(props as CardProps<Extract<Card, { type: 'swipe-sort' }>>)} />;
    case 'poll':
      return <Poll {...(props as CardProps<PollCard>)} />;
    case 'takeaway':
      return <Takeaway {...(props as CardProps<TakeawayCard>)} />;
  }
}
