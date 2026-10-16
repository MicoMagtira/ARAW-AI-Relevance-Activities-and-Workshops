// Fact or Fake screens in focus mode (docs/DESIGN.md section 11.5): free play (`#/play/fact-or-fake`) and the hidden
// assessment forms (`#/assess/form_A|form_B`, never linked in the UI). The module mini round lives in PracticeRound.tsx.
import type { ComponentChildren } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { hrefFor, navigate } from '../../app/router';
import type { FofItem } from '../../content/factOrFake/schema';
import { Ara } from '../../ui/Ara';
import { Confetti } from '../../ui/Confetti';
import { Icon } from '../../ui/Icon';
import { Button, Chip, Dialog, Panel, pushToast } from '../../ui/kit';
import { randomSeed } from '../engine/rng';
import { FofRound, type RoundAnswer } from './FofRound';
import { FREE_PLAY_SIZE, buildRound, type FofMode } from './rounds';
import { payCorrect, recordRound, scoreAnswers, xpForRound, type RoundOutcome } from './results';
import type { RoundScore } from './scoring';
import { TruthRadar } from './TruthRadar';

interface FrameProps {
  title: string;
  closeHref: string;
  /** Ask before leaving while a round is under way. */
  confirmClose: boolean;
  children: ComponentChildren;
}

function Frame({ title, closeHref, confirmClose, children }: FrameProps) {
  const [asking, setAsking] = useState(false);
  const close = () => (confirmClose ? setAsking(true) : navigate(closeHref.replace(/^#/, '')));
  return (
    <div class="lesson fof-frame">
      <header class="lesson-bar">
        <Button icon variant="secondary" aria-label={t('fof.close')} data-sfx={confirmClose ? 'none' : 'back'} onClick={close}>
          <Icon name="close" />
        </Button>
        <p class="lesson-bar__title" title={title}>
          {title}
        </p>
      </header>
      <main class="lesson-main fof-main" id="main" tabIndex={-1}>
        <h1 class="sr-only">{title}</h1>
        {children}
      </main>
      <Dialog
        open={asking}
        title={t('fof.quitTitle')}
        onClose={() => setAsking(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAsking(false)}>
              {t('fof.keepPlaying')}
            </Button>
            <Button variant="gold" href={closeHref}>
              {t('fof.quit')}
            </Button>
          </>
        }
      >
        <p>{t('fof.quitText')}</p>
      </Dialog>
    </div>
  );
}

function Notice({ title, text, closeHref }: { title: string; text: string; closeHref: string }) {
  return (
    <Frame title={t('fof.title')} closeHref={closeHref} confirmClose={false}>
      <Panel class="lesson-notice" aria-labelledby="fof-notice-h">
        <div class="stack">
          <h2 id="fof-notice-h">{title}</h2>
          <p>{text}</p>
          <div>
            <Button href={closeHref} variant="gold">
              {t('fof.done')}
            </Button>
          </div>
        </div>
      </Panel>
    </Frame>
  );
}

interface ResultsProps {
  mode: FofMode;
  answers: readonly RoundAnswer[];
  score: RoundScore;
  xp: number;
  outcome: RoundOutcome | null;
  onAgain?: () => void;
  doneHref: string;
}

function Results({ mode, answers, score, xp, outcome, onAgain, doneHref }: ResultsProps) {
  const pct = answers.length ? score.correct / answers.length : 0;
  const assess = mode === 'assess';
  const title = assess ? t('assess.complete') : pct >= 0.8 ? t('fof.result.great') : pct >= 0.5 ? t('fof.result.good') : t('fof.result.try');
  return (
    <div class="fof-results">
      {!assess && pct >= 0.8 && <Confetti />}
      <Panel class="fof-results__sum" aria-labelledby="fof-results-h">
        <div class="stack">
          <Ara mood={pct >= 0.5 ? 'wow' : 'think'} scale={6} decorative class="fof-results__ara" />
          <h2 id="fof-results-h">{title}</h2>
          <p class="fof-results__score">{t('fof.score', { correct: score.correct, total: answers.length })}</p>
          {!assess && (
            <Chip kind="xp">
              <Icon name="xp-star" size={16} />
              {t('fof.xp', { n: xp })}
            </Chip>
          )}
          {outcome?.badge && <p class="fof-results__badge">{t('radar.badge')}</p>}
          {assess && <p>{t('assess.note')}</p>}
          <div class="fof-results__actions">
            {onAgain && (
              <Button variant="secondary" large onClick={onAgain}>
                {t('fof.again')}
              </Button>
            )}
            <Button variant="gold" large href={doneHref}>
              {t('fof.done')}
            </Button>
          </div>
        </div>
      </Panel>
      <Panel class="fof-results__radar" aria-labelledby="fof-radar-h">
        <h2 class="panel-title" id="fof-radar-h">
          {t('radar.title')}
        </h2>
        {/* no sound in assessment mode; after a new radar badge the sweep waits for the badge fanfare */}
        <TruthRadar score={score} soundAfterMs={assess ? undefined : outcome?.badge ? 1500 : 0} />
      </Panel>
    </div>
  );
}

interface FactOrFakeProps {
  mode: 'free' | 'assess';
  /** `form_A` or `form_B` in assessment mode. */
  form?: string;
  /** Optional fixed seed (`?seed=` in the URL) so a round can be replayed. */
  seed?: string;
  /** The loaded items of the assessment form (supplied by LazyFactOrFake, which fetches them only on the assess route). */
  assessItems?: readonly FofItem[];
}

export function FactOrFake({ mode, form, seed, assessItems }: FactOrFakeProps) {
  const assess = mode === 'assess';
  const closeHref = hrefFor(assess ? '/' : '/arcade');
  const [round, setRound] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [xp, setXp] = useState(0);
  const [finished, setFinished] = useState<{ answers: RoundAnswer[]; score: RoundScore; outcome: RoundOutcome | null } | null>(null);

  const items = useMemo(() => {
    if (assess) return assessItems ? [...assessItems] : [];
    return buildRound({ size: FREE_PLAY_SIZE, seed: round === 0 && seed ? seed : randomSeed() });
  }, [assess, assessItems, seed, round]);

  if (items.length === 0) {
    return <Notice title={assess ? t('assess.unknown') : t('fof.emptyTitle')} text={assess ? t('assess.unknownText') : t('fof.empty')} closeHref={closeHref} />;
  }
  const title = assess ? t('assess.title', { form: form === 'form_B' ? 'B' : 'A' }) : t('fof.title');

  const onAnswer = (a: RoundAnswer) => {
    setAnswered((n) => n + 1);
    if (!assess && a.correct) {
      payCorrect();
      setXp((n) => n + xpForRound(1));
    }
  };
  const onFinish = (answers: RoundAnswer[]) => {
    const score = scoreAnswers(answers);
    const outcome = assess ? null : recordRound(score);
    if (outcome?.badge) pushToast({ kind: 'badge', title: t('radar.badge'), text: t('radar.badgeText') });
    setFinished({ answers, score, outcome });
  };
  const again = () => {
    setFinished(null);
    setAnswered(0);
    setXp(0);
    setRound(round + 1);
  };

  return (
    <Frame title={title} closeHref={closeHref} confirmClose={!finished && answered > 0}>
      {finished ? (
        <Results
          mode={mode}
          answers={finished.answers}
          score={finished.score}
          xp={xp}
          outcome={finished.outcome}
          onAgain={assess ? undefined : again}
          doneHref={closeHref}
        />
      ) : (
        <FofRound key={`${round}:${form ?? ''}`} items={items} mode={mode} finishLabel={t('fof.seeRadar')} onAnswer={onAnswer} onFinish={onFinish} />
      )}
    </Frame>
  );
}
