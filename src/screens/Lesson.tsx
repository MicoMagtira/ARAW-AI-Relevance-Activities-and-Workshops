// Module runner (focus mode, docs/DESIGN.md section 11.4): hook -> cards -> module game -> takeaway -> mini Fact or Fake -> reward.
import type { ComponentChildren, ComponentType } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../app/i18n';
import { cardsDone, isUnlocked, modulesDone } from '../app/progress';
import { hrefFor } from '../app/router';
import { BADGES } from '../content/badges';
import { MODULES, moduleById, type ModuleInfo } from '../content/modules';
import { CardView, type Reaction } from '../modules/cards/Cards';
import {
  answerPractice,
  buildSteps,
  completeCard,
  completeGame,
  countedSteps,
  finishModule,
  practiceCount,
  startIndex,
  tallyFor,
  XP,
  type FinishResult,
  type Step,
} from '../modules/engine';
import { hasContent, loadContent, loadPracticeRound } from '../modules/registry';
import type { ModuleContent, ModuleGameDef, PracticeRoundProps } from '../modules/types';
import { AraSays } from '../ui/AraBubble';
import { Medal } from '../ui/Badge';
import { Confetti } from '../ui/Confetti';
import { Icon } from '../ui/Icon';
import { Button, Panel, ProgressBar, pushToast } from '../ui/kit';
import { useMediaQuery } from '../ui/useMediaQuery';
import { useWindowKey } from '../ui/useWindowKey';

/** Top bar shared by every runner state: Close, title, progress, Report flag. */
function Frame({ title, itemId, progress, children }: { title: string; itemId: string; progress?: { value: number; max: number }; children: ComponentChildren }) {
  return (
    <div class="lesson">
      <header class="lesson-bar">
        <Button href={hrefFor('/learn')} icon variant="secondary" aria-label={t('lesson.close')}>
          <Icon name="close" />
        </Button>
        <p class="lesson-bar__title" title={title}>
          {title}
        </p>
        {progress && (
          <ProgressBar
            value={progress.value}
            max={progress.max}
            label={t('lesson.progress')}
            text={t('lesson.step', { n: Math.min(progress.value + 1, progress.max), total: progress.max })}
          />
        )}
        <Button href={hrefFor('/report', { screen: 'lesson', item: itemId })} icon variant="secondary" aria-label={t('lesson.report', { id: itemId })}>
          <Icon name="flag" />
        </Button>
      </header>
      <main class="lesson-main" id="main" tabIndex={-1}>
        <h1 class="sr-only">{title}</h1>
        {children}
        <footer class="lesson-beta">{t('app.betaNote')}</footer>
      </main>
    </div>
  );
}

function Notice({ info, title, text }: { info?: ModuleInfo; title: string; text: string }) {
  return (
    <Frame title={info?.title ?? t('title.lesson')} itemId={info?.id ?? 'lesson'}>
      <Panel class="lesson-notice" aria-labelledby="lesson-notice-h">
        <div class="stack">
          <h2 id="lesson-notice-h">{title}</h2>
          <p>{text}</p>
          <div>
            <Button href={hrefFor('/learn')} variant="gold">
              {t('lesson.backToPath')}
            </Button>
          </div>
        </div>
      </Panel>
    </Frame>
  );
}

/** Route screen: checks the module exists and is unlocked, then loads its content. */
export function Lesson({ id }: { id: string }) {
  const info = moduleById(id);
  const [content, setContent] = useState<ModuleContent | null | undefined>(undefined);
  const unlocked = info ? isUnlocked(info, modulesDone.value) : false;

  useEffect(() => {
    let live = true;
    setContent(undefined);
    if (info && unlocked && hasContent(info.id)) {
      loadContent(info.id).then(
        (c) => live && setContent(c),
        () => live && setContent(null),
      );
    } else setContent(null);
    return () => {
      live = false;
    };
  }, [id, unlocked]);

  if (!info) return <Notice title={t('lesson.unknown')} text={t('lesson.unknownText')} />;
  if (!unlocked) {
    const prev = MODULES[info.n - 2];
    return <Notice info={info} title={t('lesson.locked')} text={t('lesson.lockedText', { n: prev?.n ?? 1 })} />;
  }
  if (content === undefined) {
    return (
      <Frame title={info.title} itemId={`${info.id}-loading`}>
        <p class="lesson-loading" role="status">
          {t('lesson.loading')}
        </p>
      </Frame>
    );
  }
  if (!content) return <Notice info={info} title={t('lesson.soon')} text={t('lesson.soonText')} />;
  return <Runner key={info.id} info={info} content={content} />;
}

const INTRO_KEY = {
  'story-hook': 'lesson.ara.story',
  info: 'lesson.ara.info',
  reveal: 'lesson.ara.reveal',
  choice: 'lesson.ara.choice',
  'swipe-sort': 'lesson.ara.sort',
  poll: 'lesson.ara.poll.intro',
  takeaway: 'lesson.ara.takeaway',
} as const;

function introLine(step: Step): Reaction {
  switch (step.kind) {
    case 'card':
      return { mood: step.card.type === 'story-hook' ? 'wink' : 'idle', line: step.card.ara?.intro ?? t(INTRO_KEY[step.card.type]) };
    case 'takeaway':
      return { mood: 'happy', line: t(INTRO_KEY.takeaway) };
    case 'game':
      return { mood: 'wink', line: t('lesson.ara.game') };
    case 'practice':
      return { mood: 'think', line: t('lesson.ara.practice') };
    case 'reward':
      return { mood: 'wow', line: t('lesson.ara.reward') };
  }
}

function Runner({ info, content }: { info: ModuleInfo; content: ModuleContent }) {
  const steps = useMemo(() => buildSteps(content), [content]);
  const total = countedSteps(steps);
  const [index, setIndex] = useState(() => startIndex(info, cardsDone.value, modulesDone.value));
  const [ready, setReady] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [gain, setGain] = useState('');
  const wide = useMediaQuery('(min-width: 1024px)');
  const cardRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const gainTimer = useRef<number | undefined>(undefined);
  const step = steps[Math.min(index, steps.length - 1)] as Step;

  const showGain = (xp: number) => {
    if (xp <= 0) return;
    setGain(t('lesson.gain', { n: xp }));
    window.clearTimeout(gainTimer.current);
    gainTimer.current = window.setTimeout(() => setGain(''), 2400);
  };
  useEffect(() => () => window.clearTimeout(gainTimer.current), []);

  // New step: scroll up and move focus to the card so screen readers start there.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.scrollTo(0, 0);
    cardRef.current?.focus({ preventScroll: true });
  }, [step.id]);

  // Reward: Ara goes "wow", then "happy" (badge ceremony is under 1.6s).
  useEffect(() => {
    if (step.kind !== 'reward') return;
    setReaction({ mood: 'wow', line: t('lesson.ara.reward') });
    const timer = window.setTimeout(() => setReaction({ mood: 'happy', line: t('lesson.ara.rewardDone') }), 900);
    return () => window.clearTimeout(timer);
  }, [step.kind]);

  // Reset in the same update as the step change: cards call onReady() from their own mount effect.
  const goTo = (i: number) => {
    setReady(false);
    setReaction(null);
    setIndex(i);
  };
  const advance = () => {
    if (!ready) return;
    if (step.kind === 'card') showGain(completeCard(info, step.id, step.index));
    goTo(index + 1);
  };

  // Enter or Space moves on when nothing else has focus (docs/DESIGN.md section 11.4).
  useWindowKey((e) => {
    if (e.key !== 'Enter' || e.defaultPrevented || !ready || step.kind === 'practice' || step.kind === 'reward') return;
    const target = e.target as HTMLElement | null;
    if (target && target !== document.body && target !== cardRef.current) return;
    e.preventDefault();
    advance();
  });

  const line = reaction ?? introLine(step);
  const hasNext = step.kind === 'card' || step.kind === 'game' || step.kind === 'takeaway';
  const nextLabel = step.kind === 'takeaway' ? t('lesson.nextPractice') : t('lesson.next');

  let body: ComponentChildren;
  switch (step.kind) {
    case 'card':
      body = <CardView key={step.id} card={step.card} onReady={() => setReady(true)} onReact={setReaction} />;
      break;
    case 'takeaway':
      body = <CardView key={step.id} card={step.card} onReady={() => setReady(true)} onReact={setReaction} />;
      break;
    case 'game':
      body = (
        <GameStage
          game={content.game}
          moduleId={info.id}
          onComplete={(stars) => {
            showGain(completeGame(info, stars));
            setReady(true);
          }}
        />
      );
      break;
    case 'practice':
      body = (
        <PracticeStage
          moduleId={info.id}
          count={practiceCount(info.id)}
          onAnswer={(itemId, correct) => showGain(answerPractice(info, itemId, correct))}
          onDone={() => goTo(index + 1)}
        />
      );
      break;
    case 'reward':
      body = <RewardStage info={info} />;
      break;
  }

  return (
    <Frame title={info.title} itemId={step.id} progress={{ value: step.kind === 'reward' ? total : index, max: total }}>
      <div class={`lesson-stage lesson-stage--${step.kind}`}>
        <div class="lesson-ara">
          <AraSays mood={line.mood} scale={wide ? 4 : 2} side={wide ? 'top' : 'left'} revert={reaction !== null && step.kind !== 'reward'}>
            <p>{line.line}</p>
          </AraSays>
        </div>
        <div class="lesson-card px-box" ref={cardRef} tabIndex={-1} key={step.id}>
          {body}
        </div>
        <div class={`lesson-actions${hasNext ? '' : ' lesson-actions--bare'}`}>
          <span class="lesson-id" aria-hidden="true">
            {step.id}
          </span>
          <span class="lesson-gain" role="status">
            {gain}
          </span>
          {hasNext && (
            <Button variant="gold" large onClick={advance} disabled={!ready}>
              {nextLabel}
              <Icon name="arrow-right" />
            </Button>
          )}
        </div>
      </div>
    </Frame>
  );
}

/** Loads a lazy component and shows a calm loading line (or an error with retry). */
function useLazy<P>(load: () => Promise<{ default: ComponentType<P> }>, attempt: number) {
  const [state, setState] = useState<{ Comp?: ComponentType<P>; error?: boolean }>({});
  useEffect(() => {
    let live = true;
    setState({});
    load().then(
      (m) => live && setState({ Comp: m.default }),
      () => live && setState({ error: true }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  return state;
}

function Stars({ value }: { value: number }) {
  return (
    <span class="stars" role="img" aria-label={t('lesson.stars', { n: value })}>
      {[1, 2, 3].map((n) => (
        <Icon key={n} name="xp-star" size={32} class={n <= value ? 'star star--on' : 'star'} />
      ))}
    </span>
  );
}

function GameStage({ game, moduleId, onComplete }: { game: ModuleGameDef; moduleId: string; onComplete: (stars: 1 | 2 | 3) => void }) {
  const [attempt, setAttempt] = useState(0);
  const [stars, setStars] = useState<number | null>(null);
  const { Comp, error } = useLazy(game.load, attempt);

  return (
    <div class="card card--game stack">
      <p class="panel-title">{t('lesson.gameKicker')}</p>
      <h2 class="card__title">{game.name}</h2>
      {error && (
        <div class="stack">
          <p>{t('lesson.gameError')}</p>
          <div>
            <Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>
              {t('lesson.retry')}
            </Button>
          </div>
        </div>
      )}
      {!Comp && !error && <p role="status">{t('lesson.loading')}</p>}
      {Comp && stars === null && (
        <Comp
          key={attempt}
          moduleId={moduleId}
          onComplete={(s) => {
            setStars(s);
            onComplete(s);
          }}
        />
      )}
      {stars !== null && (
        <div class="stack game-result">
          <Stars value={stars} />
          <p>
            <strong>{t('lesson.gameDone')}</strong> {t('lesson.gameXp', { n: XP.game })}
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => {
                setStars(null);
                setAttempt(attempt + 1);
              }}
            >
              {t('lesson.gameAgain')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PracticeStage(props: Omit<PracticeRoundProps, 'onDone'> & { onDone: () => void }) {
  const { Comp, error } = useLazy<PracticeRoundProps>(loadPracticeRound, 0);
  if (error) {
    return (
      <div class="stack">
        <p>{t('lesson.gameError')}</p>
        <div>
          <Button variant="gold" onClick={props.onDone}>
            {t('lesson.skip')}
          </Button>
        </div>
      </div>
    );
  }
  if (!Comp) return <p role="status">{t('lesson.loading')}</p>;
  return <Comp {...props} />;
}

function RewardStage({ info }: { info: ModuleInfo }) {
  const [result, setResult] = useState<FinishResult | null>(null);

  useEffect(() => {
    const r = finishModule(info);
    setResult(r);
    if (r.newBadges.length > 0) {
      const badge = BADGES.find((b) => b.id === r.badgeId);
      pushToast({ kind: 'badge', title: t('lesson.badgeToast', { name: badge?.name ?? '' }), text: badge?.english });
    }
  }, [info.id]);

  const badge = BADGES.find((b) => b.id === `module-${info.id}`);
  const tally = tallyFor(info.id);
  const rows: Array<[string, number]> = [
    [t('lesson.tallyCards'), tally.cards],
    [t('lesson.tallyGame'), tally.game],
    [t('lesson.tallyPractice'), tally.practice],
    [t('lesson.tallyModule'), tally.module],
  ];
  const next = result?.unlocked ?? null;

  return (
    <div class="card card--reward stack" aria-labelledby="reward-h" role="region">
      {result?.firstTime !== false && <Confetti />}
      <p class="panel-title">{t('lesson.rewardKicker', { n: info.n })}</p>
      <h2 class="card__title" id="reward-h">
        {result?.firstTime === false ? t('lesson.rewardAgain') : t('lesson.rewardTitle')}
      </h2>
      <div class="reward-badge">
        <Medal earned size={96} />
        <p>
          <strong class="reward-badge__name">{badge?.name}</strong>
          <br />
          <span class="px-text-muted">{badge?.english}</span>
        </p>
      </div>
      {result?.firstTime === false ? (
        <p>{t('lesson.rewardReplay')}</p>
      ) : (
        <dl class="tally">
          {rows.map(([label, n]) => (
            <div key={label} class="tally__row">
              <dt>{label}</dt>
              <dd>{`+${n} XP`}</dd>
            </div>
          ))}
          <div class="tally__row tally__row--total">
            <dt>{t('lesson.tallyTotal')}</dt>
            <dd>{`+${tally.total} XP`}</dd>
          </div>
        </dl>
      )}
      {result?.firstTime && (
        <p class="unlocked" role="status">
          <Icon name="lock" size={24} />
          <span>
            <strong>{t('lesson.unlocked')}</strong>{' '}
            {next ? t('lesson.unlockedNext', { n: next.n, title: next.title }) : t('lesson.unlockedAll')}
            {result.komiks ? ` · ${t('lesson.unlockedKomiks', { n: result.komiks })}` : ''}
          </span>
        </p>
      )}
      <div class="reward-actions">
        <Button href={hrefFor('/learn')} variant="gold" large>
          {t('lesson.backToPath')}
        </Button>
        {next && hasContent(next.id) && (
          <Button href={hrefFor(`/learn/${next.id}`)} variant="primary" large>
            {t('lesson.nextModule')}
          </Button>
        )}
      </div>
    </div>
  );
}
