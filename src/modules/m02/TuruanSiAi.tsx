// "Turuan si AI": the Module 2 game. The player labels example posts and a real tiny naive Bayes detector learns from them,
// then fails on Taglish and Cebuano fakes, shows the words it relied on, and improves once local examples are added.
// It always completes after the retest: there is no fail state.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t, type StringKey } from '../../app/i18n';
import { sfx } from '../../app/sound';
import { LOCAL_POSTS, TEST_POSTS, TRAIN_POSTS, type PostLang, type TuruanPost } from '../../content/turuan';
import { Icon } from '../../ui/Icon';
import { Button, Chip, Meter, Stamp } from '../../ui/kit';
import '../../styles/turuan.css';
import type { ModuleGameProps } from '../types';
import { percent, reliedOn, toToken, train, WORD_SPLIT, type Label, type Prediction } from './naiveBayes';
import { LABEL_POINTS, labelScore, labelsRight, localFakes, missedLocalFakes, playerExamples, runTest, starsForAccuracy, type TestResult } from './turuanLogic';

type Phase = 'train' | 'test1' | 'fix' | 'test2';

const STEPS: ReadonlyArray<{ phase: Phase; key: StringKey }> = [
  { phase: 'train', key: 'tu.step.train' },
  { phase: 'test1', key: 'tu.step.test' },
  { phase: 'fix', key: 'tu.step.fix' },
  { phase: 'test2', key: 'tu.step.retest' },
];

const labelName = (label: Label): string => (label === 'fake' ? t('tu.fake') : t('tu.real'));
const langName = (lang: PostLang): string => t(`tu.lang.${lang}` as const);

function StarRow({ n }: { n: number }) {
  return (
    <span class="stars" role="img" aria-label={t('lesson.stars', { n })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="xp-star" size={32} class={i <= n ? 'star star--on' : 'star'} />
      ))}
    </span>
  );
}

function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean);
  return ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
}

/** The post text. With a prediction, the words the detector relied on are marked and the words it never saw are dotted. */
function PostText({ post, prediction }: { post: TuruanPost; prediction?: Prediction }) {
  if (!prediction) return <p class="tu-post__text">{post.text}</p>;
  const relied = new Map(reliedOn(prediction).map((w) => [w.token, w] as const));
  const known = new Map(prediction.words.map((w) => [w.token, w.known] as const));
  return (
    <p class="tu-post__text">
      {post.text.split(WORD_SPLIT).map((part, i) => {
        if (i % 2 === 0) return part;
        const token = toToken(part);
        const mark = token ? relied.get(token) : undefined;
        if (mark) {
          const lean = mark.weight > 0 ? 'fake' : 'real';
          return (
            <mark key={i} class={`tu-mark tu-mark--${lean}`}>
              {part}
              <span class="sr-only"> ({t(`tu.leans.${lean}` as const)})</span>
            </mark>
          );
        }
        if (token && known.get(token) === false)
          return (
            <span key={i} class="tu-unknown">
              {part}
            </span>
          );
        return part;
      })}
    </p>
  );
}

/** One post as a social card: fictional page, text, and the FAKE stamp once the truth is revealed. */
function PostCard({
  post,
  revealed,
  prediction,
  children,
}: {
  post: TuruanPost;
  revealed?: boolean;
  prediction?: Prediction;
  children?: preact.ComponentChildren;
}) {
  return (
    <article class={`tu-post px-box${revealed && post.label === 'fake' ? ' tu-post--fake' : ''}`} aria-label={t('tu.postLabel', { author: post.author })}>
      <header class="tu-post__head">
        <span class="tu-avatar" aria-hidden="true">
          {initials(post.author)}
        </span>
        <div class="tu-post__who">
          <strong class="tu-post__author">{post.author}</strong>
          <span class="tu-post__meta">{langName(post.lang)}</span>
        </div>
      </header>
      <PostText post={post} prediction={prediction} />
      {children}
      {revealed && post.label === 'fake' && <Stamp />}
    </article>
  );
}

function ResultCard({ result, index }: { result: TestResult; index: number }) {
  const [open, setOpen] = useState(false);
  const { post, prediction, right } = result;
  const reliedWords = reliedOn(prediction);
  const whyId = `tu-why-${index}`;
  return (
    <li class="tu-result">
      <PostCard post={post} revealed prediction={open ? prediction : undefined}>
        <div class={`tu-verdict ${right ? 'tu-verdict--right' : 'tu-verdict--wrong'}`}>
          <Icon name={right ? 'check' : 'close'} size={20} />
          <p>
            <strong>{t('tu.verdict', { label: labelName(prediction.label) })}</strong> · {t('tu.sure', { n: percent(prediction.confidence) })}
            <br />
            {right ? t('tu.verdictRight') : t('tu.verdictWrong', { label: labelName(post.label) })}
          </p>
        </div>
        <p class="tu-truth">{post.why}</p>
        <Button variant="secondary" aria-expanded={open} aria-controls={whyId} onClick={() => setOpen(!open)}>
          {open ? t('tu.whyHide') : t('tu.why')}
        </Button>
        <div id={whyId} class="tu-why" hidden={!open}>
          <h5 class="tu-why__title">{t('tu.whyTitle')}</h5>
          {reliedWords.length > 0 ? (
            <p>
              {t('tu.whyReliedOn')}{' '}
              {reliedWords.map((w, i) => (
                <span key={w.token}>
                  {i > 0 && ', '}
                  <strong>{w.word}</strong> ({t(`tu.leans.${w.weight > 0 ? 'fake' : 'real'}` as const)})
                </span>
              ))}
              .
            </p>
          ) : (
            <p>{t('tu.whyNone')}</p>
          )}
          <p>
            {t('tu.whyUnknown', {
              n: prediction.unknown,
              total: prediction.words.length,
            })}
          </p>
          <p class="tu-why__legend px-text-muted">{t('tu.whyLegend')}</p>
        </div>
      </PostCard>
    </li>
  );
}

export default function TuruanSiAi({ onComplete }: ModuleGameProps) {
  const [phase, setPhase] = useState<Phase>('train');
  const [trainLabels, setTrainLabels] = useState<Label[]>([]);
  const [localLabels, setLocalLabels] = useState<Label[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // The detector is trained again from scratch from the player's labels each time it is needed.
  const examples1 = useMemo(() => playerExamples(TRAIN_POSTS, trainLabels), [trainLabels]);
  const model1 = useMemo(() => train(examples1), [examples1]);
  const model2 = useMemo(() => train([...examples1, ...playerExamples(LOCAL_POSTS, localLabels)]), [examples1, localLabels]);
  const before = useMemo(() => runTest(model1, TEST_POSTS), [model1]);
  const after = useMemo(() => runTest(model2, TEST_POSTS), [model2]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView?.({ block: 'start' });
  }, [phase]);

  const score = labelScore(TRAIN_POSTS, trainLabels) + labelScore(LOCAL_POSTS, localLabels);
  const learned = examples1.length + (phase === 'test2' || phase === 'fix' ? localLabels.length : 0);
  const stepNo = STEPS.findIndex((s) => s.phase === phase);

  const hud = (
    <div class="tu-hud">
      <ol class="tu-steps" aria-label={t('tu.steps')}>
        {STEPS.map((s, i) => (
          <li
            key={s.phase}
            class={`tu-step${i === stepNo ? ' tu-step--now' : i < stepNo ? ' tu-step--done' : ''}`}
            aria-current={i === stepNo ? 'step' : undefined}
          >
            <span class="tu-step__n">{i < stepNo ? <Icon name="check" size={14} /> : i + 1}</span>
            <span class="tu-step__label">{t(s.key)}</span>
          </li>
        ))}
      </ol>
      <p class="tu-chips">
        <Chip kind="xp">{t('tu.score', { score })}</Chip>
        <Chip>{t('tu.learned', { n: learned })}</Chip>
      </p>
    </div>
  );

  if (phase === 'train' || phase === 'fix') {
    return (
      <LabelPhase
        key={phase}
        phase={phase}
        hud={hud}
        headingRef={headingRef}
        trainLabels={trainLabels}
        localLabels={localLabels}
        setTrainLabels={setTrainLabels}
        setLocalLabels={setLocalLabels}
        setPhase={setPhase}
      />
    );
  }

  const final = phase === 'test2';
  const results = final ? after : before;
  const accBefore = before.filter((r) => r.right).length / before.length;
  const accNow = results.filter((r) => r.right).length / results.length;
  const stars = starsForAccuracy(accNow);
  const caught = localFakes(results) - missedLocalFakes(results);

  return (
    <div class="tu tu--test">
      {hud}
      <div class="tu-test">
        <section class="tu-summary px-box" aria-labelledby="tu-test-title">
          <h3 class="tu-title" id="tu-test-title" tabIndex={-1} ref={headingRef}>
            {t(final ? 'tu.retestTitle' : 'tu.testTitle')}
          </h3>
          <p>{t(final ? 'tu.retestIntro' : 'tu.testIntro')}</p>
          <div class="tu-bars">
            <Meter value={percent(accBefore)} label={t(final ? 'tu.bar.before' : 'tu.bar.now')} segments={8} />
            {final && <Meter value={percent(accNow)} label={t('tu.bar.after')} segments={8} />}
          </div>
          <p class="tu-summary__count">
            {t('tu.accuracyText', {
              right: results.filter((r) => r.right).length,
              total: results.length,
            })}
          </p>
          {final ? (
            <>
              <div class="tu-final" role="status">
                <StarRow n={stars} />
                <p>{t(accNow >= 0.85 ? 'tu.final.great' : 'tu.final.some')}</p>
                <p>
                  {t('tu.labelling', {
                    right: labelsRight(TRAIN_POSTS, trainLabels) + labelsRight(LOCAL_POSTS, localLabels),
                    total: TRAIN_POSTS.length + LOCAL_POSTS.length,
                    score,
                  })}
                </p>
              </div>
              <Button variant="gold" large onClick={() => onComplete(stars)}>
                {t('tu.finish')}
                <Icon name="arrow-right" />
              </Button>
            </>
          ) : (
            <>
              <p class="tu-missed" role="status">
                {t('tu.missed', { caught, total: localFakes(results) })}
              </p>
              <Button variant="gold" large onClick={() => setPhase('fix')}>
                {t('tu.fixCta')}
                <Icon name="arrow-right" />
              </Button>
            </>
          )}
        </section>
        <ol class="tu-results" aria-label={t('tu.results')}>
          {results.map((r, i) => (
            <ResultCard key={`${phase}-${r.post.id}`} result={r} index={i} />
          ))}
        </ol>
      </div>
    </div>
  );
}

interface LabelPhaseProps {
  phase: 'train' | 'fix';
  hud: preact.ComponentChildren;
  headingRef: preact.RefObject<HTMLHeadingElement | null>;
  trainLabels: Label[];
  localLabels: Label[];
  setTrainLabels: (l: Label[]) => void;
  setLocalLabels: (l: Label[]) => void;
  setPhase: (p: Phase) => void;
}

/**
 * The two labelling steps share one screen. `shown` is how many posts the player has moved past, so a post with a label
 * but not yet moved past is showing its feedback.
 */
function LabelPhase({ phase, hud, headingRef, trainLabels, localLabels, setTrainLabels, setLocalLabels, setPhase }: LabelPhaseProps) {
  const train = phase === 'train';
  const posts = train ? TRAIN_POSTS : LOCAL_POSTS;
  const labels = train ? trainLabels : localLabels;
  const setLabels = train ? setTrainLabels : setLocalLabels;
  const [moved, setMoved] = useState(0);
  const answered = labels.length > moved;
  const index = moved;
  const post = posts[index] as TuruanPost;
  const mine = labels[index];
  const right = answered && mine === post.label;
  const isLast = index + 1 >= posts.length;
  const sideRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);

  // After a label the Next button takes focus; a new post puts focus on its question so keyboard and screen-reader users start there.
  useEffect(() => {
    if (answered) sideRef.current?.querySelector('button')?.focus({ preventScroll: true });
    else if (index > 0) questionRef.current?.focus({ preventScroll: true });
  }, [answered, index]);

  const give = (label: Label) => {
    if (answered) return;
    sfx(label === post.label ? 'correct' : 'wrong');
    setLabels([...labels, label]);
  };

  const next = () => {
    if (!isLast) setMoved(moved + 1);
    else setPhase(train ? 'test1' : 'test2');
  };

  return (
    <div class="tu">
      {hud}
      <section class="tu-intro px-box" aria-labelledby="tu-label-title">
        <h3 class="tu-title" id="tu-label-title" tabIndex={-1} ref={headingRef}>
          {t(train ? 'tu.trainTitle' : 'tu.fixTitle')}
        </h3>
        <p>{t(train ? 'tu.trainIntro' : 'tu.fixIntro')}</p>
      </section>
      <div class="tu-label">
        <div class="tu-label__post">
          <p class="panel-title">{t('tu.postOf', { n: index + 1, total: posts.length })}</p>
          <PostCard key={post.id} post={post} revealed={answered} />
        </div>
        <div class="tu-label__side" ref={sideRef} role="status" aria-live="polite">
          {!answered ? (
            <section class="stack">
              <h4 class="tu-question" tabIndex={-1} ref={questionRef}>
                {t('tu.question')}
              </h4>
              <div class="tu-buttons">
                <Button variant="fake" large data-sfx="none" onClick={() => give('fake')}>
                  {t('tu.fake')}
                </Button>
                <Button variant="fact" large data-sfx="none" onClick={() => give('real')}>
                  {t('tu.real')}
                </Button>
              </div>
              <p class="tu-hint px-text-muted">{t(train ? 'tu.trainHint' : 'tu.fixHint')}</p>
            </section>
          ) : (
            <section class={`tu-feedback px-box ${right ? 'tu-feedback--right' : 'tu-feedback--wrong'}`} aria-label={t('tu.feedback')}>
              <h4 class="tu-feedback__head">{right ? t('lesson.correct') : t('lesson.almost')}</h4>
              <p>{right ? t('tu.labelRight', { label: labelName(post.label) }) : t('tu.labelWrong', { label: labelName(post.label) })}</p>
              <p>{post.why}</p>
              <p class="tu-feedback__points">{right ? t('tu.points', { n: LABEL_POINTS }) : t('tu.noPoints')}</p>
              <div>
                <Button variant="gold" large onClick={next}>
                  {isLast ? t(train ? 'tu.trainDone' : 'tu.retrain') : t('tu.nextPost')}
                  <Icon name="arrow-right" />
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
