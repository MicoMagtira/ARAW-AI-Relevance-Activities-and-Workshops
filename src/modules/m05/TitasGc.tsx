// "Tita's GC": the Module 5 game. A mock family group chat where the player reacts, verifies, replies or forwards.
// Every move is scored on Accuracy and Kindness, and the family ripple shows who believed it, who checked and who felt hurt.
// Three chats per play (the true forward always comes along). It always completes after the last chat.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { location$ } from '../../app/router';
import { profile } from '../../app/state';
import { CAST, memberInfo, type ChoiceKind, type GcCheck, type GcChoice, type GcMessage, type GcScenario, type Member, type Ripple } from '../../content/gc';
import { randomSeed } from '../../games/engine/rng';
import { AraSays } from '../../ui/AraBubble';
import { Avatar } from '../../ui/Avatar';
import { Confetti } from '../../ui/Confetti';
import { Icon } from '../../ui/Icon';
import { Button, Chip, Meter, ProgressBar, Stamp } from '../../ui/kit';
import '../../styles/gc.css';
import type { ModuleGameProps } from '../types';
import {
  addChoice,
  addTally,
  applyRipple,
  buildPlay,
  EMPTY_TALLY,
  endingById,
  MAX_PER_CHOICE,
  meterPercent,
  orderedChoices,
  rippleCounts,
  starsFor,
  turnById,
  type Tally,
} from './gcLogic';

type Item = { kind: 'msg'; msg: GcMessage } | { kind: 'check'; check: GcCheck };

/** One chat (scenario) in progress. */
interface Run {
  turnId: string;
  thread: Item[];
  ripple: Ripple;
  tally: Tally;
  /** The choice just made, while its feedback is on screen. */
  picked: GcChoice | null;
  endingId: string | null;
  /** True once the player has checked or the chat has ended: the forward shows its FAKE stamp or Legit chip. */
  revealed: boolean;
}

interface ChatResult {
  scenario: GcScenario;
  endingId: string;
  tally: Tally;
  ripple: Ripple;
}

const toItems = (messages: readonly GcMessage[]): Item[] => messages.map((msg) => ({ kind: 'msg', msg }));

function startRun(s: GcScenario): Run {
  const first = turnById(s, s.first);
  return { turnId: s.first, thread: toItems(first?.messages ?? []), ripple: s.start, tally: EMPTY_TALLY, picked: null, endingId: null, revealed: false };
}

const KIND_ICON = { react: 'thumbs-up', verify: 'search', reply: 'reply', forward: 'forward' } as const satisfies Record<ChoiceKind, string>;

function StarRow({ n }: { n: number }) {
  return (
    <span class="stars" role="img" aria-label={t('lesson.stars', { n })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="xp-star" size={32} class={i <= n ? 'star star--on' : 'star'} />
      ))}
    </span>
  );
}

/** Two pixel pips: how many of 2 points a choice earned. */
function Pips({ name, value }: { name: string; value: number }) {
  return (
    <span class="gc-pips">
      <span class="gc-pips__name">{name}</span>
      <span class="gc-pips__dots" role="img" aria-label={t('gc.pips', { name, n: value })}>
        {[0, 1].map((i) => (
          <i key={i} class={i < value ? 'on' : ''} />
        ))}
      </span>
    </span>
  );
}

function MemberAvatar({ id, size = 32 }: { id: Member; size?: number }) {
  const mine = profile.value.avatar;
  return <Avatar index={id === 'you' ? mine : memberInfo(id).avatar} size={size} />;
}

function CheckCard({ check }: { check: GcCheck }) {
  return (
    <section class="gc-check px-box" aria-label={t('gc.check')}>
      <h4 class="gc-check__title">
        <Icon name="search" size={20} />
        {check.title}
      </h4>
      <dl class="gc-check__rows">
        {check.rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p class="gc-check__verdict">
        <strong>{t('gc.check.verdict')}</strong> {check.verdict}
      </p>
    </section>
  );
}

function Bubble({ msg, revealed, legit }: { msg: GcMessage; revealed: boolean; legit: boolean }) {
  const name = memberInfo(msg.from).name;
  const mine = msg.from === 'you';
  return (
    <li class={`gc-msg${mine ? ' gc-msg--you' : ''}`}>
      <MemberAvatar id={msg.from} />
      <div class={`gc-bubble px-box${msg.forwarded ? ' gc-bubble--fwd' : ''}`}>
        <p class="gc-bubble__name">{mine ? t('gc.you') : name}</p>
        {msg.forwarded && !mine && (
          <p class="gc-bubble__fwd">
            <Icon name="forward" size={16} />
            {t('gc.forwarded')}
          </p>
        )}
        <p class="gc-bubble__text">
          <span class="sr-only">{t('gc.said', { name: mine ? t('gc.you') : name })} </span>
          {msg.text}
        </p>
        {msg.forwarded && !mine && revealed && (legit ? <Chip kind="fact">{t('gc.legit')}</Chip> : <Stamp>{t('gc.stamp')}</Stamp>)}
      </div>
    </li>
  );
}

function Thread({ run, scenario }: { run: Run; scenario: GcScenario }) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep the newest line in view.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run.thread.length]);
  return (
    <section class="gc-phone px-box" aria-label={t('gc.chat')}>
      <header class="gc-phone__head">
        <span class="gc-phone__avatars" aria-hidden="true">
          {CAST.slice(0, 4).map((m) => (
            <MemberAvatar key={m.id} id={m.id} size={32} />
          ))}
        </span>
        <span>
          <span class="gc-phone__title">{t('gc.chatHead')}</span>
          <span class="gc-phone__sub">{t('gc.members')}</span>
        </span>
      </header>
      <div class="gc-thread" ref={ref} role="log" tabIndex={0} aria-label={t('gc.chat')}>
        <ul class="gc-list">
          {run.thread.map((item, i) =>
            item.kind === 'msg' ? (
              <Bubble key={i} msg={item.msg} revealed={run.revealed} legit={scenario.legit} />
            ) : (
              <li key={i} class="gc-list__check">
                <CheckCard check={item.check} />
              </li>
            ),
          )}
        </ul>
      </div>
    </section>
  );
}

/** The family ripple: who believed it, who checked it, who felt hurt. Text and icons, never colour alone. */
function RipplePanel({ ripple }: { ripple: Ripple }) {
  const counts = rippleCounts(ripple);
  return (
    <section class="gc-ripple" aria-labelledby="gc-ripple-title">
      <h4 class="gc-ripple__title" id="gc-ripple-title">
        {t('gc.ripple')}
      </h4>
      <ul class="gc-ripple__list">
        {CAST.map((m) => {
          const r = ripple[m.id];
          const none = !r.believed && !r.checked && !r.hurt;
          return (
            <li key={m.id} class="gc-ripple__item">
              <MemberAvatar id={m.id} />
              <span class="gc-ripple__who">
                <span class="gc-ripple__name">{m.id === 'you' ? t('gc.you') : m.name}</span>
                <span class="gc-ripple__chips">
                  {r.believed && <Chip kind="streak">{t('gc.ripple.believed')}</Chip>}
                  {r.checked && <Chip kind="fact">{t('gc.ripple.checked')}</Chip>}
                  {r.hurt && <Chip kind="fake">{t('gc.ripple.hurt')}</Chip>}
                  {none && <span class="gc-ripple__none">{t('gc.ripple.quiet')}</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p class="sr-only">{t('gc.ripple.summary', { ...counts })}</p>
    </section>
  );
}

function Hud({ index, total, tally }: { index: number; total: number; tally: Tally }) {
  return (
    <div class="gc-hud">
      <ProgressBar value={index} max={total} text={t('gc.scenarioOf', { n: Math.min(index + 1, total), total })} label={t('gc.progress')} />
      <div class="gc-hud__meters">
        <Meter value={meterPercent(tally.accuracy, tally.turns)} label={t('gc.accuracy')} segments={8} />
        <Meter value={meterPercent(tally.kindness, tally.turns)} label={t('gc.kindness')} segments={8} />
      </div>
    </div>
  );
}

function Choices({ choices, onPick, prompt }: { choices: GcChoice[]; onPick: (c: GcChoice) => void; prompt: string }) {
  return (
    <section class="stack" aria-labelledby="gc-prompt">
      <h4 class="gc-prompt" id="gc-prompt" tabIndex={-1} data-gc-focus>
        {prompt}
      </h4>
      <div class="gc-choices">
        {choices.map((c) => (
          <button key={c.id} type="button" class="gc-choice px-btn px-notch px-btn--secondary" onClick={() => onPick(c)}>
            <span class="gc-choice__kind">
              <Icon name={KIND_ICON[c.kind]} size={20} />
              {t(`gc.kind.${c.kind}`)}
            </span>
            <span class="gc-choice__label">{c.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function Feedback({ choice, onContinue }: { choice: GcChoice; onContinue: () => void }) {
  const total = choice.accuracy + choice.kindness;
  const good = total >= 3;
  return (
    <div class="stack" aria-live="polite">
      <section class={`gc-feedback px-box ${good ? 'gc-feedback--right' : 'gc-feedback--wrong'}`} aria-label={t('gc.feedback')}>
        <h4 class="gc-feedback__head">{good ? t('lesson.correct') : t('lesson.almost')}</h4>
        <div class="gc-feedback__pips">
          <Pips name={t('gc.accuracy')} value={choice.accuracy} />
          <Pips name={t('gc.kindness')} value={choice.kindness} />
        </div>
        <p>{choice.why}</p>
      </section>
      <AraSays mood={total >= 4 ? 'happy' : total >= 3 ? 'wink' : 'think'} scale={3} revert live>
        {total >= 4 ? t('gc.araSays.great') : total >= 3 ? t('gc.araSays.ok') : t('gc.araSays.low')}
      </AraSays>
      <div>
        <Button variant="gold" large onClick={onContinue} data-gc-focus>
          {t('gc.continue')}
          <Icon name="arrow-right" />
        </Button>
      </div>
    </div>
  );
}

function EndingPanel({ run, scenario, last, onNext }: { run: Run; scenario: GcScenario; last: boolean; onNext: () => void }) {
  const ending = endingById(scenario, run.endingId ?? '');
  if (!ending) return null;
  const counts = rippleCounts(run.ripple);
  return (
    <div class="stack">
      <section class={`gc-ending px-box gc-ending--${ending.tier}`} aria-labelledby="gc-ending-title">
        {ending.tier === 'light' && <Confetti count={40} />}
        <Chip kind={ending.tier === 'light' ? 'fact' : ending.tier === 'rough' ? 'fake' : 'streak'}>{t(`gc.ending.${ending.tier}`)}</Chip>
        <h4 class="gc-ending__title" id="gc-ending-title" tabIndex={-1} data-gc-focus>
          {t('gc.ending', { title: ending.title })}
        </h4>
        <p>{ending.text}</p>
        <p class="gc-ending__sum">{t('gc.ripple.summary', { ...counts })}</p>
        <div class="gc-ending__meters">
          <Meter value={meterPercent(run.tally.accuracy, run.tally.turns)} label={t('gc.accuracy')} segments={8} />
          <Meter value={meterPercent(run.tally.kindness, run.tally.turns)} label={t('gc.kindness')} segments={8} />
        </div>
        <p class="px-text-muted">{t('gc.ending.score', { a: run.tally.accuracy, k: run.tally.kindness, max: run.tally.turns * 2 })}</p>
        <p>
          <strong>{t('gc.ending.what')}:</strong> {scenario.lesson}
        </p>
      </section>
      <AraSays mood={ending.tier === 'light' ? 'happy' : ending.tier === 'mixed' ? 'wink' : 'think'} scale={3} revert live>
        {ending.ara}
      </AraSays>
      <div>
        <Button variant="gold" large onClick={onNext}>
          {last ? t('gc.seeResult') : t('gc.next')}
          <Icon name="arrow-right" />
        </Button>
      </div>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div class="gc">
      <section class="gc-intro px-box" aria-labelledby="gc-intro-title">
        <h3 class="gc-title" id="gc-intro-title" tabIndex={-1} data-gc-focus>
          {t('gc.introTitle')}
        </h3>
        <p>{t('gc.introText')}</p>
        <ul class="gc-how">
          <li>{t('gc.how.accuracy')}</li>
          <li>{t('gc.how.kindness')}</li>
          <li>{t('gc.how.ripple')}</li>
        </ul>
        <div>
          <Button variant="gold" large onClick={onStart}>
            {t('gc.start')}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
      <section class="gc-cast" aria-labelledby="gc-cast-title">
        <h4 class="gc-ripple__title" id="gc-cast-title">
          {t('gc.cast')}
        </h4>
        <ul class="gc-cast__list">
          {CAST.filter((m) => m.id !== 'you').map((m) => (
            <li key={m.id} class="gc-cast__item px-box">
              <MemberAvatar id={m.id} size={48} />
              <span>
                <strong>{m.name}</strong>
                <br />
                <span class="px-text-muted">{m.role}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Result({ results, total, onFinish }: { results: ChatResult[]; total: Tally; onFinish: () => void }) {
  const stars = starsFor(total);
  const points = total.accuracy + total.kindness;
  return (
    <div class="gc">
      <section class="gc-intro px-box" aria-labelledby="gc-end-title">
        <h3 class="gc-title" id="gc-end-title" tabIndex={-1} data-gc-focus>
          {t('gc.endTitle')}
        </h3>
        <div class="gc-final" role="status">
          <StarRow n={stars} />
          <p>{t('gc.endScore', { turns: total.turns, points, max: total.turns * MAX_PER_CHOICE })}</p>
          <p>{t(stars === 3 ? 'gc.end.great' : stars === 2 ? 'gc.end.good' : 'gc.end.some')}</p>
        </div>
        <div class="gc-ending__meters">
          <Meter value={meterPercent(total.accuracy, total.turns)} label={t('gc.accuracy')} segments={10} />
          <Meter value={meterPercent(total.kindness, total.turns)} label={t('gc.kindness')} segments={10} />
        </div>
        <div>
          <Button variant="gold" large onClick={onFinish}>
            {t('gc.finish')}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
      <section class="stack" aria-labelledby="gc-chats-title">
        <h4 class="gc-ripple__title" id="gc-chats-title">
          {t('gc.end.chats')}
        </h4>
        <ul class="gc-results">
          {results.map((r) => {
            const e = endingById(r.scenario, r.endingId);
            const counts = rippleCounts(r.ripple);
            return (
              <li key={r.scenario.id} class="gc-results__item px-box">
                <p>
                  <strong>{t('gc.end.chat', { title: r.scenario.title, ending: e?.title ?? '' })}</strong>
                </p>
                <p>{r.scenario.legit ? t('gc.end.legit') : t('gc.end.fake')}</p>
                <p class="px-text-muted">{t('gc.ripple.summary', { ...counts })}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default function TitasGc({ onComplete }: ModuleGameProps) {
  // `?seed=` makes the draw and the choice order repeatable (e2e); every replay gets a fresh one.
  const [seed] = useState(() => location$.value.query.seed || randomSeed());
  const scenarios = useMemo(() => buildPlay(seed), [seed]);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState<Run>(() => startRun(scenarios[0] as GcScenario));
  const [results, setResults] = useState<ChatResult[]>([]);
  const [finished, setFinished] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const scenario = scenarios[index] as GcScenario;
  const turn = turnById(scenario, run.turnId);
  const choices = useMemo(() => (turn ? orderedChoices(turn, `${seed}:${scenario.id}`) : []), [turn, seed, scenario.id]);
  const total = results.reduce((sum, r) => addTally(sum, r.tally), EMPTY_TALLY);

  // Moving between screens puts focus on the new heading; a pick puts it on the Continue button.
  const focusKey = `${started}:${finished}:${index}:${run.turnId}:${run.picked?.id ?? ''}:${run.endingId ?? ''}`;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    rootRef.current?.querySelector<HTMLElement>('[data-gc-focus]')?.focus({ preventScroll: true });
  }, [focusKey]);

  if (!started) return <Intro onStart={() => setStarted(true)} />;
  if (finished) return <Result results={results} total={total} onFinish={() => onComplete(starsFor(total))} />;

  const choose = (c: GcChoice) => {
    if (run.picked) return;
    const thread: Item[] = [...run.thread, { kind: 'msg', msg: { from: 'you', text: c.say } }];
    if (c.check) thread.push({ kind: 'check', check: c.check });
    setRun({ ...run, thread, ripple: applyRipple(run.ripple, c.ripple), tally: addChoice(run.tally, c), picked: c, revealed: run.revealed || c.kind === 'verify' });
  };

  const proceed = () => {
    const c = run.picked;
    if (!c) return;
    const ending = endingById(scenario, c.next);
    if (ending) {
      setRun({ ...run, thread: [...run.thread, ...toItems(ending.messages)], picked: null, endingId: ending.id, revealed: true });
      return;
    }
    const next = turnById(scenario, c.next);
    if (next) setRun({ ...run, thread: [...run.thread, ...toItems(next.messages)], picked: null, turnId: next.id });
  };

  const nextChat = () => {
    if (!run.endingId) return;
    setResults([...results, { scenario, endingId: run.endingId, tally: run.tally, ripple: run.ripple }]);
    if (index + 1 >= scenarios.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setRun(startRun(scenarios[index + 1] as GcScenario));
  };

  const running = addTally(total, run.tally);
  const last = index + 1 >= scenarios.length;
  return (
    <div class="gc" ref={rootRef}>
      <Hud index={index} total={scenarios.length} tally={running} />
      <p class="gc-scene">{t('gc.scene', { title: scenario.title, scene: scenario.scene })}</p>
      <div class="gc-round" key={scenario.id}>
        <div class="gc-round__chat">
          <Thread run={run} scenario={scenario} />
        </div>
        <div class="gc-round__side">
          {run.endingId ? (
            <EndingPanel run={run} scenario={scenario} last={last} onNext={nextChat} />
          ) : run.picked ? (
            <Feedback choice={run.picked} onContinue={proceed} />
          ) : (
            turn && <Choices choices={choices} onPick={choose} prompt={turn.prompt} />
          )}
          <RipplePanel ripple={run.ripple} />
        </div>
      </div>
    </div>
  );
}
