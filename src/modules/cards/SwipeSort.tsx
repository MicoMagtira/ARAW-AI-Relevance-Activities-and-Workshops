// Swipe-sort card: mini-cards go into two bins. Swipe or drag on touch and mouse, buttons everywhere, left and right arrow keys.
import type { CSSProperties } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/kit';
import { useWindowKey } from '../../ui/useWindowKey';
import { sfx } from '../../app/sound';
import { placeSortItem, type PlaceResult } from '../engine';
import type { SwipeSortCard } from '../types';
import type { CardProps } from './Cards';

/** Horizontal drag (px) that counts as a swipe. */
export const SWIPE_DISTANCE = 64;

export function SwipeSort({ card, onReady, onReact }: CardProps<SwipeSortCard>) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [last, setLast] = useState<(PlaceResult & { text: string }) | null>(null);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; id: number } | null>(null);
  // Mirrors index and score so two quick placements in a row never read stale state.
  const live = useRef({ index: 0, score: 0 });
  const total = card.items.length;
  const item = card.items[index];
  const finished = index >= total;

  const place = (binIndex: 0 | 1) => {
    const { index: at, score: sofar } = live.current;
    if (at >= total) return;
    const result = placeSortItem(card, at, binIndex);
    if (!result) return;
    const correct = sofar + (result.correct ? 1 : 0);
    sfx(result.correct ? 'correct' : 'wrong');
    live.current = { index: at + 1, score: correct };
    setScore(correct);
    setLast({ ...result, text: card.items[at]?.text ?? '' });
    setIndex(at + 1);
    setDx(0);
    if (at + 1 >= total) {
      onReady();
      onReact({ mood: correct === total ? 'happy' : 'wink', line: card.ara?.done ?? t('lesson.ara.sortDone', { score: correct, total }) });
    } else {
      onReact(result.correct ? { mood: 'happy', line: t('lesson.ara.right') } : { mood: 'think', line: t('lesson.ara.almost') });
    }
  };

  useWindowKey((e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft') place(0);
    else if (e.key === 'ArrowRight') place(1);
    else return;
    e.preventDefault();
  });

  const onDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (start.current?.id === e.pointerId) setDx(Math.max(-120, Math.min(120, e.clientX - start.current.x)));
  };
  const onUp = (e: PointerEvent) => {
    if (start.current?.id !== e.pointerId) return;
    const moved = e.clientX - start.current.x;
    start.current = null;
    if (moved <= -SWIPE_DISTANCE) place(0);
    else if (moved >= SWIPE_DISTANCE) place(1);
    else setDx(0);
  };

  const [left, right] = card.bins;
  return (
    <div class="card card--sort stack">
      <h2 class="card__title">{card.title}</h2>
      <p class="px-text-muted">{t('lesson.sortHow', { left: left.label, right: right.label })}</p>
      <p class="px-text-muted" aria-live="polite">
        {t('lesson.sortCount', { done: Math.min(index, total), total })}
      </p>

      <div class="sort-stage">
        {item ? (
          <div
            class="sort-card px-box"
            style={{ '--dx': `${dx}px` } as CSSProperties}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <span class="sort-card__text">{item.text}</span>
          </div>
        ) : (
          <p class="sort-done px-box">
            <Icon name="check" size={24} /> {t('lesson.sortScore', { score, total })}
          </p>
        )}
      </div>

      <div class="sort-bins">
        <Button variant="secondary" data-sfx="none" onClick={() => place(0)} disabled={finished} aria-keyshortcuts="ArrowLeft">
          <Icon name="arrow-left" />
          {left.label}
        </Button>
        <Button variant="secondary" data-sfx="none" onClick={() => place(1)} disabled={finished} aria-keyshortcuts="ArrowRight">
          {right.label}
          <Icon name="arrow-right" />
        </Button>
      </div>

      <div class="feedback" role="status" aria-live="polite">
        {last && (
          <p class={`feedback__box ${last.correct ? 'feedback__box--fact' : 'feedback__box--almost'}`}>
            <strong>{last.correct ? t('lesson.correct') : t('lesson.almost')}</strong> {last.text}: {last.why}
          </p>
        )}
      </div>
    </div>
  );
}
