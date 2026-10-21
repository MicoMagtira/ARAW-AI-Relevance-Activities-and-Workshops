// "Tanong kay Chatbot": the Module 3 game. Bea asks a chat assistant health questions and the player rules on each scripted answer:
// Tama (usable), Mali (wrong) or Magpatingin (see a health worker). One round is a privacy scenario about app permissions.
// It always completes after eight rounds: there is no fail state, and there is no live AI here.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t, type StringKey } from '../../app/i18n';
import { hrefFor, location$ } from '../../app/router';
import { sfx } from '../../app/sound';
import type { ChatRound, PrivacyScenario, Ruling } from '../../content/chatbot';
import { randomSeed } from '../../games/engine/rng';
import { Icon } from '../../ui/Icon';
import { Button, Chip, ProgressBar, Stamp, SwitchRow } from '../../ui/kit';
import '../../styles/chatbot.css';
import type { ModuleGameProps } from '../types';
import { buildRounds, checkPermissions, isRulingRight, needsRedFlagWarning, ROUND_TOTAL, RULING_POINTS, scoreFor, starsFor } from './chatbotLogic';

const RULING_KEY: Record<Ruling, { name: StringKey; hint: StringKey; label: StringKey }> = {
  tama: { name: 'cb.tama', hint: 'cb.tama.hint', label: 'cb.tama.label' },
  mali: { name: 'cb.mali', hint: 'cb.mali.hint', label: 'cb.mali.label' },
  magpatingin: { name: 'cb.magpatingin', hint: 'cb.magpatingin.hint', label: 'cb.magpatingin.label' },
};

const VARIANT: Record<Ruling, 'fact' | 'fake' | 'gold'> = { tama: 'fact', mali: 'fake', magpatingin: 'gold' };

function StarRow({ n }: { n: number }) {
  return (
    <span class="stars" role="img" aria-label={t('lesson.stars', { n })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="xp-star" size={32} class={i <= n ? 'star star--on' : 'star'} />
      ))}
    </span>
  );
}

/** Link to the Chatbot Sandbox (#/sandbox), where a real small AI model runs on the player's device. */
function SandboxCard() {
  return (
    <section class="cb-sandbox px-box" aria-labelledby="cb-sandbox-title">
      <div class="cb-sandbox__head">
        <h4 class="cb-sandbox__title" id="cb-sandbox-title">
          {t('cb.sandbox.title')}
        </h4>
        <Chip>{t('cb.sandbox.chip')}</Chip>
      </div>
      <p>{t('cb.sandbox.text')}</p>
      <Button variant="secondary" href={hrefFor('/sandbox')}>
        <Icon name="robot" />
        {t('cb.sandbox.button')}
      </Button>
    </section>
  );
}

function ChatBubbles({ question, answer, stamped }: { question: string; answer: string; stamped: boolean }) {
  return (
    <div class="cb-chat px-box" role="group" aria-label={t('cb.chatLabel')}>
      <div class="cb-msg cb-msg--bea">
        <span class="cb-msg__who">{t('cb.bea')}</span>
        <p class="cb-bubble cb-bubble--bea">{question}</p>
      </div>
      <div class="cb-msg cb-msg--bot">
        <span class="cb-msg__who">
          <Icon name="chat" size={16} />
          {t('cb.bot')}
        </span>
        <p class="cb-bubble cb-bubble--bot">{answer}</p>
        {stamped && <Stamp>{t('cb.stamp')}</Stamp>}
      </div>
      <p class="cb-scripted">{t('cb.scripted')}</p>
    </div>
  );
}

interface QaRoundProps {
  round: ChatRound;
  ruled: Ruling | null;
  onRule: (ruling: Ruling) => void;
  /** The Next button, shown under the feedback. */
  action: preact.ComponentChildren;
}

function QaRound({ round, ruled, onRule, action }: QaRoundProps) {
  const right = ruled !== null && isRulingRight(round, ruled);
  const warn = ruled !== null && needsRedFlagWarning(round, ruled);
  return (
    <div class="cb-round">
      <div class="cb-round__chat">
        <ChatBubbles question={round.question} answer={round.answer} stamped={ruled !== null && round.ruling !== 'tama'} />
      </div>
      <div class="cb-round__side" aria-live="polite">
        {ruled === null ? (
          <section class="stack" aria-labelledby="cb-ask">
            <h4 class="cb-question" id="cb-ask" tabIndex={-1}>
              {t('cb.ask')}
            </h4>
            <div class="cb-rulings">
              {(Object.keys(RULING_KEY) as Ruling[]).map((r) => (
                <Button key={r} variant={VARIANT[r]} large class="cb-rule" aria-label={t(RULING_KEY[r].label)} data-sfx="none" onClick={() => onRule(r)}>
                  <span class="cb-rule__name">{t(RULING_KEY[r].name)}</span>
                  <span class="cb-rule__hint">{t(RULING_KEY[r].hint)}</span>
                </Button>
              ))}
            </div>
            <p class="px-text-muted cb-hint">{t('cb.hint')}</p>
          </section>
        ) : (
          <Feedback right={right} points={right ? RULING_POINTS : 0}>
            <p>
              <strong>{t('cb.answerWas', { ruling: t(RULING_KEY[round.ruling].label) })}</strong>
            </p>
            <p>{round.why}</p>
            <p>
              <strong>{t('cb.goodAnswer')}</strong> {round.good}
            </p>
            {warn && (
              <p class="cb-warn" role="alert">
                <Icon name="warning" size={20} />
                <span>{t('cb.redFlagWarning')}</span>
              </p>
            )}
          </Feedback>
        )}
        {ruled !== null && action}
      </div>
    </div>
  );
}

function Feedback({ right, points, children }: { right: boolean; points: number; children: preact.ComponentChildren }) {
  return (
    <section class={`cb-feedback px-box ${right ? 'cb-feedback--right' : 'cb-feedback--wrong'}`} aria-label={t('cb.feedback')}>
      <h4 class="cb-feedback__head">{right ? t('lesson.correct') : t('lesson.almost')}</h4>
      {children}
      <p class="cb-feedback__points">{points > 0 ? t('cb.points', { n: points }) : t('cb.noPoints')}</p>
    </section>
  );
}

interface PrivacyRoundProps {
  scenario: PrivacyScenario;
  /** Set after the player pressed Decide: the permissions they had switched on. */
  decided: ReadonlySet<string> | null;
  onDecide: (allowed: ReadonlySet<string>) => void;
  action: preact.ComponentChildren;
}

function PrivacyRound({ scenario, decided, onDecide, action }: PrivacyRoundProps) {
  const [allowed, setAllowed] = useState<ReadonlySet<string>>(new Set());
  const shown = decided ?? allowed;
  const result = decided ? checkPermissions(scenario, decided) : null;
  const toggle = (id: string, on: boolean) => {
    const next = new Set(allowed);
    if (on) next.add(id);
    else next.delete(id);
    setAllowed(next);
  };
  return (
    <div class="cb-round">
      <div class="cb-round__chat">
        <section class="cb-app px-box" aria-labelledby="cb-app-title">
          <p class="panel-title">{t('cb.privacy.kicker')}</p>
          <h4 class="cb-app__title" id="cb-app-title">
            {t('cb.privacy.title', { app: scenario.app })}
          </h4>
          <p>{scenario.job}</p>
          <p>{t('cb.privacy.asks', { app: scenario.app })}</p>
          <ul class="cb-perms" aria-label={t('cb.privacy.list')}>
            {scenario.permissions.map((p) => {
              const check = result?.checks.find((c) => c.id === p.id);
              return (
                <li key={p.id} class={`cb-perm${check ? (check.right ? ' cb-perm--right' : ' cb-perm--wrong') : ''}`}>
                  {decided ? (
                    <div class="cb-perm__static">
                      <strong>{p.label}</strong>
                      <span>{p.detail}</span>
                      <span class="cb-perm__you">{shown.has(p.id) ? t('cb.privacy.youAllowed') : t('cb.privacy.youDenied')}</span>
                    </div>
                  ) : (
                    <SwitchRow label={p.label} hint={p.detail} checked={shown.has(p.id)} onChange={(on) => toggle(p.id, on)} />
                  )}
                  {check && (
                    <p class="cb-perm__why">
                      <Icon name={check.right ? 'check' : 'close'} size={18} />
                      <span>{p.why}</span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <div class="cb-round__side" aria-live="polite">
        {!result ? (
          <section class="stack" aria-labelledby="cb-ask">
            <h4 class="cb-question" id="cb-ask" tabIndex={-1}>
              {t('cb.privacy.ask')}
            </h4>
            <div>
              <Button variant="gold" large data-sfx="none" onClick={() => onDecide(allowed)}>
                {t('cb.privacy.decide')}
              </Button>
            </div>
            <p class="px-text-muted cb-hint">{t('cb.privacy.hint')}</p>
          </section>
        ) : (
          <Feedback right={result.allRight} points={result.allRight ? RULING_POINTS : 0}>
            <p>{result.allRight ? t('cb.privacy.right') : t('cb.privacy.wrong')}</p>
            <p>{t('cb.privacy.lesson')}</p>
          </Feedback>
        )}
        {result && action}
      </div>
    </div>
  );
}

/** What the player did in one round, kept to build the end screen and to score. */
type Played = { correct: boolean };

export default function TanongKayChatbot({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the rounds repeatable (e2e); every replay gets a fresh draw.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  const rounds = useMemo(() => buildRounds(seed), [seed]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [played, setPlayed] = useState<Played[]>([]);
  const [ruled, setRuled] = useState<Ruling | null>(null);
  const [decided, setDecided] = useState<ReadonlySet<string> | null>(null);
  const [finished, setFinished] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const current = rounds[index];
  const answered = ruled !== null || decided !== null;
  const correct = played.filter((p) => p.correct).length;
  const isLast = index + 1 >= rounds.length;

  // Moving between screens (intro, rounds, summary) puts focus on the new heading; a ruling puts it on the Next button.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (answered) stageRef.current?.querySelector<HTMLButtonElement>('.cb-next')?.focus({ preventScroll: true });
    else if (finished || !started) headingRef.current?.focus({ preventScroll: true });
    else stageRef.current?.querySelector<HTMLElement>('.cb-question')?.focus({ preventScroll: true });
  }, [answered, index, started, finished]);

  if (!started) {
    return (
      <div class="cb">
        <section class="cb-intro px-box" aria-labelledby="cb-intro-title">
          <h3 class="cb-title" id="cb-intro-title" tabIndex={-1} ref={headingRef}>
            {t('cb.introTitle')}
          </h3>
          <p>{t('cb.introText')}</p>
          <ul class="cb-legend">
            {(Object.keys(RULING_KEY) as Ruling[]).map((r) => (
              <li key={r}>
                <strong>{t(RULING_KEY[r].name)}</strong> {t(RULING_KEY[r].hint)}
              </li>
            ))}
          </ul>
          <div>
            <Button variant="gold" large onClick={() => setStarted(true)}>
              {t('cb.start')}
              <Icon name="arrow-right" />
            </Button>
          </div>
        </section>
        <SandboxCard />
      </div>
    );
  }

  if (finished) {
    const stars = starsFor(correct);
    return (
      <div class="cb">
        <section class="cb-intro px-box" aria-labelledby="cb-end-title">
          <h3 class="cb-title" id="cb-end-title" tabIndex={-1} ref={headingRef}>
            {t('cb.endTitle')}
          </h3>
          <div class="cb-final" role="status">
            <StarRow n={stars} />
            <p>{t('cb.endScore', { right: correct, total: ROUND_TOTAL, score: scoreFor(correct) })}</p>
            <p>{t(stars === 3 ? 'cb.end.great' : stars === 2 ? 'cb.end.good' : 'cb.end.some')}</p>
          </div>
          <div>
            <Button variant="gold" large onClick={() => onComplete(stars)}>
              {t('cb.finish')}
              <Icon name="arrow-right" />
            </Button>
          </div>
        </section>
        <SandboxCard />
      </div>
    );
  }

  const next = () => {
    if (isLast) {
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
    setRuled(null);
    setDecided(null);
  };

  const action = (
    <div>
      <Button variant="gold" large class="cb-next" onClick={next}>
        {isLast ? t('cb.seeResult') : t('cb.next')}
        <Icon name="arrow-right" />
      </Button>
    </div>
  );

  const record = (correctNow: boolean) => {
    if (correctNow) {
      let inARow = 1;
      for (let i = played.length - 1; i >= 0 && played[i]?.correct; i--) inARow++;
      sfx('correct', Math.min(5, inARow - 1));
    } else sfx('wrong');
    setPlayed([...played, { correct: correctNow }]);
  };

  return (
    <div class="cb" ref={stageRef}>
      <div class="cb-hud">
        <ProgressBar value={index + (answered ? 1 : 0)} max={rounds.length} text={t('cb.roundOf', { n: index + 1, total: rounds.length })} label={t('cb.progress')} />
        <Chip kind="xp">{t('cb.score', { score: scoreFor(correct) })}</Chip>
      </div>
      {current?.kind === 'privacy' ? (
        <PrivacyRound
          key={index}
          scenario={current.scenario}
          decided={decided}
          action={action}
          onDecide={(allowed) => {
            setDecided(allowed);
            record(checkPermissions(current.scenario, allowed).allRight);
          }}
        />
      ) : current ? (
        <QaRound
          key={index}
          round={current.round}
          ruled={ruled}
          action={action}
          onRule={(r) => {
            setRuled(r);
            record(isRulingRight(current.round, r));
          }}
        />
      ) : null}
    </div>
  );
}
