// "Spot the Tactic": the Module 4 game. A post appears and the player picks which villain's trick it uses, or "No trick, it is legit".
// Three right picks in a row on one trick beat that villain and win its card and badge. It always completes after the last post.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { collectVillain, tacticStreaks, villainCards } from '../../app/progress';
import { location$ } from '../../app/router';
import { sfx } from '../../app/sound';
import { useLater } from '../../app/sound/useLater';
import { BADGES } from '../../content/badges';
import { villainById, VILLAINS, type TacticPick, type TacticPost, type VillainId } from '../../content/tactics';
import { randomSeed } from '../../games/engine/rng';
import { AraSays } from '../../ui/AraBubble';
import { Confetti } from '../../ui/Confetti';
import { Icon } from '../../ui/Icon';
import { Button, Chip, ProgressBar, pushToast, Stamp } from '../../ui/kit';
import { VillainPortrait } from '../../ui/VillainPortrait';
import '../../styles/tactic.css';
import type { ModuleGameProps } from '../types';
import { Hearts, VillainCollection } from './VillainCollection';
import { applyPick, buildPosts, heartsLeft, POST_POINTS, scoreFor, starsFor, type PickOutcome } from './tacticLogic';

function StarRow({ n }: { n: number }) {
  return (
    <span class="stars" role="img" aria-label={t('lesson.stars', { n })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="xp-star" size={32} class={i <= n ? 'star star--on' : 'star'} />
      ))}
    </span>
  );
}

/** The post text with its marks (tell-tale or good signs) highlighted. Marks are exact substrings of the text. */
function MarkedText({ text, marks, good }: { text: string; marks: readonly string[]; good: boolean }) {
  const ranges: Array<[number, number]> = [];
  for (const m of marks) {
    const at = text.indexOf(m);
    if (at >= 0) ranges.push([at, at + m.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const parts: preact.ComponentChildren[] = [];
  let pos = 0;
  for (const [from, to] of ranges) {
    if (from < pos) continue;
    if (from > pos) parts.push(text.slice(pos, from));
    parts.push(
      <mark key={from} class={`tt-mark${good ? ' tt-mark--good' : ''}`}>
        {text.slice(from, to)}
      </mark>,
    );
    pos = to;
  }
  if (pos < text.length) parts.push(text.slice(pos));
  return <p class="tt-post__text">{parts}</p>;
}

function PostCard({ post, revealed }: { post: TacticPost; revealed: boolean }) {
  const fake = post.trick !== 'none';
  return (
    <article class="tt-post px-box" aria-label={t('tt.postLabel')}>
      <header class="tt-post__head">
        <span class="tt-post__avatar" aria-hidden="true">
          <Icon name="me" size={24} />
        </span>
        <div>
          <p class="tt-post__author">{post.author}</p>
          <p class="tt-post__meta">{post.meta}</p>
        </div>
      </header>
      {revealed ? <MarkedText text={post.text} marks={post.marks} good={!fake} /> : <p class="tt-post__text">{post.text}</p>}
      {revealed && (fake ? <Stamp>{t('tt.stamp')}</Stamp> : <Chip kind="fact">{t('tt.legitChip')}</Chip>)}
    </article>
  );
}

interface PickButtonsProps {
  onPick: (pick: TacticPick) => void;
}

function PickButtons({ onPick }: PickButtonsProps) {
  const streaks = tacticStreaks.value;
  const beaten = villainCards.value;
  return (
    <section class="stack" aria-labelledby="tt-ask">
      <h4 class="tt-question" id="tt-ask" tabIndex={-1}>
        {t('tt.ask')}
      </h4>
      <div class="tt-picks">
        {VILLAINS.map((v) => (
          <button
            key={v.id}
            type="button"
            class="tt-pick px-btn px-notch px-btn--secondary"
            aria-label={t('tt.pickLabel', { name: v.name, trick: v.trick })}
            data-sfx="none"
            onClick={() => onPick(v.id)}
          >
            <VillainPortrait id={v.id} size={48} locked={false} decorative />
            <span class="tt-pick__text">
              <span class="tt-pick__name">{v.name}</span>
              <span class="tt-pick__trick">{v.trick}</span>
            </span>
            <Hearts name={v.name} left={heartsLeft(streaks[v.id] ?? 0, beaten.includes(v.id))} size={16} />
          </button>
        ))}
        <Button variant="fact" large class="tt-pick tt-pick--none" data-sfx="none" onClick={() => onPick('none')}>
          <Icon name="check" size={24} />
          <span class="tt-pick__text">
            <span class="tt-pick__name">{t('tt.none')}</span>
            <span class="tt-pick__trick">{t('tt.noneHint')}</span>
          </span>
        </Button>
      </div>
      <p class="px-text-muted tt-hint">{t('tt.hint')}</p>
    </section>
  );
}

interface FeedbackProps {
  post: TacticPost;
  outcome: PickOutcome;
  /** The Next button. */
  action: preact.ComponentChildren;
}

function Feedback({ post, outcome, action }: FeedbackProps) {
  const v = post.trick === 'none' ? null : villainById(post.trick);
  const { correct } = outcome;
  const left = v ? heartsLeft(outcome.streaks[v.id] ?? 0, villainCards.value.includes(v.id)) : 0;
  let heartLine = '';
  if (v) {
    if (outcome.defeatedNow) heartLine = t('tt.hearts.beaten', { name: v.name });
    else if (outcome.hit) heartLine = t('tt.hearts.left', { name: v.name, n: left });
    else if (outcome.reset) heartLine = t('tt.hearts.reset', { name: v.name });
    else if (villainCards.value.includes(v.id)) heartLine = t('tt.hearts.already', { name: v.name });
    else heartLine = t('tt.hearts.same', { name: v.name, n: left });
  }
  const ara = correct ? (v ? v.ara : t('tt.legit.cheer')) : v ? t('tt.almost.trick') : t('tt.almost.legit');
  return (
    <div class="stack" aria-live="polite">
      <section class={`tt-feedback px-box ${correct ? 'tt-feedback--right' : 'tt-feedback--wrong'}`} aria-label={t('tt.feedback')}>
        <h4 class="tt-feedback__head">{correct ? t('lesson.correct') : t('lesson.almost')}</h4>
        {v ? (
          <div class="tt-foe">
            <VillainPortrait id={v.id} size={64} decorative class={outcome.hit ? 'tt-hit' : outcome.reset ? 'tt-wince' : ''} />
            <div class="tt-foe__text">
              <p>
                <strong>{t('tt.theTrick', { name: v.name, trick: v.trick })}</strong>
              </p>
              <Hearts name={v.name} left={left} size={20} />
              <p>{heartLine}</p>
            </div>
          </div>
        ) : (
          <p>
            <strong>{t('tt.noTrick')}</strong>
          </p>
        )}
        <p>
          <strong>{t('tt.why')}</strong> {post.why}
        </p>
        <p>
          <strong>{t('tt.check')}</strong> {post.check}
        </p>
        <p class="px-text-muted">{t('tt.signs')}</p>
        <p class="tt-feedback__points">{correct ? t('tt.points', { n: POST_POINTS }) : t('tt.noPoints')}</p>
      </section>
      <AraSays mood={correct ? 'happy' : 'think'} scale={3} revert live>
        {ara}
      </AraSays>
      {outcome.defeatedNow && <NewCard id={outcome.defeatedNow} />}
      {action}
    </div>
  );
}

/** "New card unlocked": shown when a villain was just beaten. */
function NewCard({ id }: { id: VillainId }) {
  const v = villainById(id);
  const badge = BADGES.find((b) => b.id === v.badgeId);
  return (
    <section class="tt-new px-box" aria-label={t('tt.newCard')}>
      <Confetti count={40} />
      <VillainPortrait id={v.id} size={64} decorative />
      <div>
        <h4 class="tt-new__title">{t('tt.newCard')}</h4>
        <p>{t('tt.newCardText', { name: v.name, badge: badge?.name ?? '' })}</p>
      </div>
    </section>
  );
}

export default function SpotTheTactic({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the posts repeatable (e2e); every replay gets a fresh draw.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  const posts = useMemo(() => buildPosts(seed), [seed]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<PickOutcome | null>(null);
  const [correct, setCorrect] = useState(0);
  const [fresh, setFresh] = useState<VillainId[]>([]);
  const [finished, setFinished] = useState(false);
  const later = useLater();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const post = posts[index];
  const answered = outcome !== null;
  const isLast = index + 1 >= posts.length;

  // Moving between screens puts focus on the new heading; a pick puts it on the Next button.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (answered) stageRef.current?.querySelector<HTMLButtonElement>('.tt-next')?.focus({ preventScroll: true });
    else if (finished || !started) headingRef.current?.focus({ preventScroll: true });
    else stageRef.current?.querySelector<HTMLElement>('.tt-question')?.focus({ preventScroll: true });
  }, [answered, index, started, finished]);

  if (!started) {
    return (
      <div class="tt">
        <section class="tt-intro px-box" aria-labelledby="tt-intro-title">
          <h3 class="tt-title" id="tt-intro-title" tabIndex={-1} ref={headingRef}>
            {t('tt.introTitle')}
          </h3>
          <p>{t('tt.introText')}</p>
          <div>
            <Button variant="gold" large onClick={() => setStarted(true)}>
              {t('tt.start')}
              <Icon name="arrow-right" />
            </Button>
          </div>
        </section>
        <VillainCollection />
      </div>
    );
  }

  if (finished) {
    const stars = starsFor(correct, posts.length);
    return (
      <div class="tt">
        <section class="tt-intro px-box" aria-labelledby="tt-end-title">
          <h3 class="tt-title" id="tt-end-title" tabIndex={-1} ref={headingRef}>
            {t('tt.endTitle')}
          </h3>
          <div class="tt-final" role="status">
            <StarRow n={stars} />
            <p>{t('tt.endScore', { right: correct, total: posts.length, score: scoreFor(correct) })}</p>
            <p>{t(stars === 3 ? 'tt.end.great' : stars === 2 ? 'tt.end.good' : 'tt.end.some')}</p>
          </div>
          <div>
            <Button variant="gold" large onClick={() => onComplete(stars)}>
              {t('tt.finish')}
              <Icon name="arrow-right" />
            </Button>
          </div>
        </section>
        <VillainCollection fresh={fresh} />
      </div>
    );
  }

  const pick = (choice: TacticPick) => {
    if (!post || answered) return;
    const result = applyPick(tacticStreaks.value, villainCards.value, post, choice);
    tacticStreaks.value = result.streaks;
    const inARow = result.villain ? (result.streaks[result.villain] ?? 0) : 0;
    if (result.correct) sfx('correct', Math.max(0, Math.min(5, inARow - 1)));
    else sfx('wrong');
    if (result.defeatedNow) {
      const v = villainById(result.defeatedNow);
      if (collectVillain(v.id, v.badgeId)) {
        setFresh([...fresh, v.id]);
        // the villain card's fanfare follows the answer sound instead of ringing over it
        pushToast({ kind: 'badge', title: t('lesson.badgeToast', { name: BADGES.find((b) => b.id === v.badgeId)?.name ?? v.name }), text: t('tt.hearts.beaten', { name: v.name }) }, { quiet: true });
        later(700, () => sfx('badge'));
      }
    }
    if (result.correct) setCorrect(correct + 1);
    setOutcome(result);
  };

  const next = () => {
    if (isLast) setFinished(true);
    else setIndex(index + 1);
    setOutcome(null);
  };

  const action = (
    <div>
      <Button variant="gold" large class="tt-next" onClick={next}>
        {isLast ? t('tt.seeResult') : t('tt.next')}
        <Icon name="arrow-right" />
      </Button>
    </div>
  );

  return (
    <div class="tt" ref={stageRef}>
      <div class="tt-hud">
        <ProgressBar value={index + (answered ? 1 : 0)} max={posts.length} text={t('tt.postOf', { n: index + 1, total: posts.length })} label={t('tt.progress')} />
        <Chip kind="xp">{t('tt.score', { score: scoreFor(correct) })}</Chip>
      </div>
      {post && (
        <div class="tt-round" key={index}>
          <div class="tt-round__post">
            <PostCard post={post} revealed={answered} />
          </div>
          <div class="tt-round__side">{outcome ? <Feedback post={post} outcome={outcome} action={action} /> : <PickButtons onPick={pick} />}</div>
        </div>
      )}
    </div>
  );
}

