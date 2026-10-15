// The Fact or Fake round: one item at a time, FACT / FAKE buttons, swipe on touch, keys, feedback card.
// Used by the module mini round (compact), free play and the hidden assessment (no feedback until the end).
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { hrefFor } from '../../app/router';
import type { FofItem, Truth } from '../../content/factOrFake/schema';
import { AraSays } from '../../ui/AraBubble';
import { Icon } from '../../ui/Icon';
import { Button, Chip } from '../../ui/kit';
import { useWindowKey } from '../../ui/useWindowKey';
import { ItemCard } from './ItemCard';
import type { FofMode } from './rounds';

export interface RoundAnswer {
  item: FofItem;
  answer: Truth;
  correct: boolean;
}

interface FofRoundProps {
  items: readonly FofItem[];
  mode: FofMode;
  /** Single column inside a lesson card (no side column). */
  compact?: boolean;
  /** Label of the Next button on the last item. */
  finishLabel: string;
  /** Called right after every answer (XP is paid here). */
  onAnswer?: (answer: RoundAnswer) => void;
  onFinish: (answers: RoundAnswer[]) => void;
}

/** Drag distance in px that counts as a swipe. */
export const SWIPE_DISTANCE = 70;

const isTypingTarget = (el: EventTarget | null): boolean => el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

export function FofRound({ items, mode, compact, finishLabel, onAnswer, onFinish }: FofRoundProps) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Truth | null>(null);
  const [answers, setAnswers] = useState<RoundAnswer[]>([]);
  const locked = useRef(false);
  const finished = useRef(false);
  const swipeStart = useRef<number | null>(null);
  const swipeEl = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const firstIndex = useRef(true);

  const assess = mode === 'assess';
  const item = items[index] as FofItem;
  const last = index + 1 >= items.length;
  const lastAnswer = answers[answers.length - 1];

  const setDrag = (dx: number) => {
    const el = swipeEl.current;
    if (!el) return;
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--rot', `${dx / 24}deg`);
    el.dataset.dir = dx > 24 ? 'fact' : dx < -24 ? 'fake' : '';
  };

  const advance = (list: RoundAnswer[]) => {
    if (last) {
      if (!finished.current) onFinish(list);
      finished.current = true;
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    locked.current = false;
  };

  const pick = (choice: Truth) => {
    if (locked.current) return;
    locked.current = true;
    setDrag(0);
    const a: RoundAnswer = { item, answer: choice, correct: choice === item.truth };
    const list = [...answers, a];
    setAnswers(list);
    onAnswer?.(a);
    if (assess) advance(list);
    else setPicked(choice);
  };

  const next = () => {
    if (!picked) return;
    advance(answers);
  };

  // Keys: right or L = Fact, left or A = Fake; Enter moves on after feedback.
  useWindowKey((e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
    const key = e.key.toLowerCase();
    if (!picked) {
      if (key === 'arrowright' || key === 'l') {
        e.preventDefault();
        pick('fact');
      } else if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        pick('fake');
      }
    } else if (key === 'enter') {
      const target = e.target;
      // a focused button or link handles Enter itself
      if (target instanceof HTMLElement && target !== document.body && !target.classList.contains('fof-swipe')) return;
      e.preventDefault();
      next();
    }
  });

  // After an answer the Next button gets focus; a new item puts focus on the card so screen readers start there.
  useEffect(() => {
    if (picked) slotRef.current?.querySelector('button')?.focus();
  }, [picked]);
  useEffect(() => {
    if (firstIndex.current) {
      firstIndex.current = false;
      return;
    }
    swipeEl.current?.focus({ preventScroll: true });
  }, [index]);

  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || locked.current) return;
    swipeStart.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* synthetic or already released pointer: dragging still works through bubbling */
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (swipeStart.current === null) return;
    setDrag(Math.max(-160, Math.min(160, e.clientX - swipeStart.current)));
  };
  const onPointerUp = (e: PointerEvent) => {
    if (swipeStart.current === null) return;
    const dx = e.clientX - swipeStart.current;
    swipeStart.current = null;
    setDrag(0);
    if (Math.abs(dx) >= SWIPE_DISTANCE) pick(dx > 0 ? 'fact' : 'fake');
  };
  const onPointerCancel = () => {
    swipeStart.current = null;
    setDrag(0);
  };

  const feedback = picked && !assess && lastAnswer;
  const right = !!lastAnswer && lastAnswer.correct;
  const araLine = !feedback ? t('fof.ara.start') : right ? t('fof.ara.right') : t('fof.ara.wrong');

  return (
    <div class={`fof fof--${mode}${compact ? ' fof--compact' : ''}${picked ? ' fof--answered' : ''}`}>
      <aside class="fof-side">
        <ol class="fof-dots" aria-label={t('fof.dots')}>
          {items.map((it, i) => {
            const a = answers[i];
            const state = !a ? 'todo' : assess ? 'done' : a.correct ? 'right' : 'wrong';
            return (
              <li key={it.id} class={`fof-dot fof-dot--${state}${i === index ? ' fof-dot--now' : ''}`} aria-current={i === index ? 'step' : undefined}>
                <span class="fof-dot__mark" aria-hidden="true">
                  {state === 'right' ? <Icon name="check" size={16} /> : state === 'wrong' ? <Icon name="close" size={16} /> : i + 1}
                </span>
                <span class="sr-only">{t(`fof.dot.${state}` as const, { n: i + 1 })}</span>
              </li>
            );
          })}
        </ol>
        <AraSays mood={!feedback ? 'idle' : right ? 'happy' : 'think'} scale={4} side="top" class="fof-side__ara" revert={!!feedback}>
          <p>{araLine}</p>
        </AraSays>
      </aside>

      <section class="fof-stage" aria-labelledby="fof-q">
        <div class="fof-kicker">
          <p class="panel-title">
            {t('practice.kicker', { n: index + 1, total: items.length })}
            <span class="fof-kicker__format"> · {t(`fof.format.${item.format}` as const)}</span>
          </p>
          {!assess && (
            <a class="fof-report" href={hrefFor('/report', { screen: 'fact-or-fake', item: item.id })} aria-label={t('fof.report', { id: item.id })}>
              <Icon name="flag" size={16} />
              {t('fof.reportShort')}
            </a>
          )}
        </div>

        <div
          class="fof-swipe"
          ref={swipeEl}
          tabIndex={-1}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <span class="fof-swipe__tag fof-swipe__tag--fact" aria-hidden="true">
            {t('practice.fact')}
          </span>
          <span class="fof-swipe__tag fof-swipe__tag--fake" aria-hidden="true">
            {t('practice.fake')}
          </span>
          <ItemCard key={item.id} item={item} revealed={!!picked && !assess} />
        </div>

        <h2 class="fof-question" id="fof-q">
          {t('fof.question')}
        </h2>
        <div class="fof-buttons">
          <Button variant="fake" large class={picked === 'fake' ? 'is-chosen' : undefined} aria-disabled={picked ? 'true' : undefined} onClick={() => pick('fake')}>
            <Icon name="close" />
            {t('practice.fake')}
          </Button>
          <Button variant="fact" large class={picked === 'fact' ? 'is-chosen' : undefined} aria-disabled={picked ? 'true' : undefined} onClick={() => pick('fact')}>
            <Icon name="check" />
            {t('practice.fact')}
          </Button>
        </div>
        <p class="fof-hint">
          <span class="fof-hint__touch">{t('fof.swipeHint')}</span>
          <span class="fof-hint__keys">{t('fof.keyHint')}</span>
          {assess && <span class="fof-hint__assess"> {t('assess.hint')}</span>}
        </p>
      </section>

      <div class="fof-feedback-slot" ref={slotRef} role="status" aria-live="polite">
        {feedback && (
          <section class={`fof-feedback px-box ${right ? 'fof-feedback--right' : 'fof-feedback--wrong'}`} aria-label={t('fof.feedback')}>
            <h3 class="fof-feedback__head">{t(right ? 'fof.headRight' : 'fof.headWrong', { truth: t(`fof.truth.${item.truth}` as const) })}</h3>
            {item.truth === 'fake' && item.trick !== 'none' && <Chip class="fof-trick">{t('fof.trick', { name: t(`trick.${item.trick}` as const) })}</Chip>}
            <p>
              <strong>{t('fof.why')}:</strong> {item.explanation}
            </p>
            <p>
              <strong>{t('fof.check')}:</strong> {item.how_to_check}
            </p>
            <p class="fof-feedback__basis">{t('fof.basis', { basis: item.basis })}</p>
            <div class="fof-feedback__actions">
              <span class="fof-feedback__id">{item.id}</span>
              <Button variant="gold" large onClick={next}>
                {last ? finishLabel : t('lesson.next')}
                <Icon name="arrow-right" />
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
