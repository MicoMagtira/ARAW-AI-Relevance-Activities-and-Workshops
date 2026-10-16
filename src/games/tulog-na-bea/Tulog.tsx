// "Tulog na, Bea!": the life sim, shared by the Module 8 game (three days, never fails) and the Arcade (endless days, ends on
// a "reset day"). Turn-based: each day has six parts, each part one moment with three choices; the player first sets the
// day's boundaries in a morning plan. It is DOM, not canvas, so every meter, choice and result is real text for screen readers.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { araSay, sfx } from '../../app/sound';
import { useLater } from '../../app/sound/useLater';
import { AraSays } from '../../ui/AraBubble';
import { Icon } from '../../ui/Icon';
import { Button, Chip, Meter, ProgressBar } from '../../ui/kit';
import '../../styles/tulog.css';
import { BeaScene } from './Bea';
import { BOUNDARIES, METERS, METER_NAME, PULLS, SLOTS, SLOT_NAME, SLOT_TIME, boundaryById, type Fx, type MeterId, type Moment, type MomentOption } from './moments';
import { MODULE_DAYS, RESET_TEXT, buildDay, choose, endDay, feelingOf, newGame, starsFor, toggleBoundary, sumChange, type ChoiceOutcome, type DayEnd, type Game } from './sim';

export interface TulogResult {
  score: number;
  /** Days Bea lived through to bedtime. */
  days: number;
  goodDays: number;
  gaveIn: number;
  resisted: number;
  reset: MeterId | null;
  stars: 1 | 2 | 3;
}

export interface TulogProps {
  mode: 'module' | 'arcade';
  seed: string;
  /** Shown on the intro (the daily challenge badge). */
  daily?: boolean;
  /** The actions under the final summary (Finish, Play again...). Called with the result. */
  endActions: (result: TulogResult) => ComponentChildren;
}

type Phase = 'intro' | 'plan' | 'moment' | 'feedback' | 'summary' | 'end';

const formatScore = (n: number): string => n.toLocaleString('en-US');
/** Below this a meter is low (Bea looks sleepy, worried or sad: sim.ts feelingOf). */
const LOW_METER = 35;
const signed = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/** Chips for what a choice (or the night's drift) did to each meter. */
function FxChips({ change }: { change: Fx }) {
  const shown = METERS.map((m, i) => ({ m, n: change[i] ?? 0 })).filter((x) => x.n !== 0);
  return (
    <span class="tulog-fx">
      {shown.length === 0 && <Chip>{t('tulog.noChange')}</Chip>}
      {shown.map(({ m, n }) => (
        <Chip key={m} kind={n > 0 ? 'fact' : 'fake'}>
          {`${METER_NAME[m]} ${signed(n)}`}
        </Chip>
      ))}
    </span>
  );
}

export function Tulog({ mode, seed, daily, endActions }: TulogProps) {
  const arcade = mode === 'arcade';
  const [game, setGame] = useState<Game>(() => newGame(seed));
  const [phase, setPhase] = useState<Phase>('intro');
  const [today, setToday] = useState<Moment[]>([]);
  const [last, setLast] = useState<{ moment: Moment; option: MomentOption; out: ChoiceOutcome } | null>(null);
  const [dayEnded, setDayEnded] = useState<DayEnd | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const slotId = SLOTS[Math.min(game.slot, SLOTS.length - 1)] ?? 'morning';
  const moment = today[game.slot];
  const feeling = feelingOf(game.meters);
  /** Days Bea lived through to bedtime (`endDay` already moved the day counter on). */
  const daysDone = game.day - 1;
  const later = useLater();
  const wasLow = useRef(false);

  // The phone buzzes when a moment comes with a pull (the buzzing phone is drawn next to Bea).
  useEffect(() => {
    if (phase === 'moment' && moment?.source) sfx('buzz');
  }, [phase, game.day, game.slot]);

  // A warning hum only as a meter first drops into the low zone (Bea's face changes with it).
  const low = METERS.some((m) => game.meters[m] < LOW_METER);
  useEffect(() => {
    if (low && !wasLow.current) later(500, () => sfx('meterWarn'));
    wasLow.current = low;
  }, [low]);

  // Moving between screens puts focus on the new heading.
  const focusKey = `${phase}:${game.day}:${game.slot}`;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    rootRef.current?.querySelector<HTMLElement>('[data-tulog-focus]')?.focus({ preventScroll: true });
  }, [focusKey]);

  const result = (): TulogResult => ({
    score: game.score,
    days: daysDone,
    goodDays: game.goodDays,
    gaveIn: game.gaveIn,
    resisted: game.resisted,
    reset: game.reset,
    stars: starsFor(game.goodDays, game.reset),
  });

  const startDay = () => {
    setToday(buildDay(seed, game.day, game.boundaries));
    setPhase('moment');
  };

  const pick = (m: Moment, id: string) => {
    const o = m.options.find((x) => x.id === id);
    if (!o) return;
    const out = choose(game, m, o);
    if (m.source) sfx(out.gaveIn ? 'wrong' : 'correct');
    setGame(out.game);
    setLast({ moment: m, option: o, out });
    setPhase('feedback');
  };

  const afterFeedback = () => {
    if (game.reset) setPhase('end');
    else if (game.slot >= SLOTS.length) {
      const d = endDay(game);
      sfx('lullaby');
      setDayEnded(d);
      setGame(d.game);
      setPhase('summary');
    } else setPhase('moment');
  };

  // Ara's closing line, spoken after the end jingle.
  useEffect(() => {
    if (phase !== 'end') return;
    const r = result();
    const line = r.reset ? RESET_TEXT[r.reset] : t(r.stars === 3 ? 'tulog.end.great' : r.stars === 2 ? 'tulog.end.good' : 'tulog.end.some');
    later(1400, () => araSay(line, r.reset ? 'sad' : r.stars === 3 ? 'wow' : 'happy'));
  }, [phase]);

  const afterSummary = () => {
    const over = game.reset !== null || (!arcade && game.day > MODULE_DAYS);
    if (over) setPhase('end');
    else setPhase('plan');
  };

  const label = t('tulog.bea.label', { feeling: t(`tulog.feeling.${feeling}`), part: SLOT_NAME[slotId], time: SLOT_TIME[slotId] });

  const side = (
    <aside class="tulog-side" aria-label={t('tulog.side')}>
      <BeaScene slot={slotId} feeling={feeling} buzzing={phase === 'moment' && !!moment?.source} label={label} />
      <div class="tulog-meters">
        {METERS.map((m) => (
          <Meter key={m} value={game.meters[m]} label={METER_NAME[m]} />
        ))}
      </div>
    </aside>
  );

  if (phase === 'intro') {
    return (
      <div class="tulog" ref={rootRef}>
        <section class="tulog-card px-box" aria-labelledby="tulog-intro-title">
          <h3 class="tulog-title" id="tulog-intro-title" tabIndex={-1} data-tulog-focus>
            {t('tulog.introTitle')}
          </h3>
          {daily && <Chip kind="streak">{t('game.daily')}</Chip>}
          <p>{t(arcade ? 'tulog.introArcade' : 'tulog.introModule')}</p>
          <div>
            <Button variant="gold" large onClick={() => setPhase('plan')}>
              {t('tulog.start')}
              <Icon name="arrow-right" />
            </Button>
          </div>
          <details>
            <summary>{t('tulog.how.title')}</summary>
            <ul class="tulog-how">
              <li>{t('tulog.how.meters')}</li>
              <li>{t('tulog.how.moments')}</li>
              <li>{t('tulog.how.boundaries')}</li>
              <li>{t('tulog.how.score')}</li>
              <li>{t(arcade ? 'tulog.how.arcade' : 'tulog.how.module')}</li>
            </ul>
          </details>
        </section>
      </div>
    );
  }

  if (phase === 'end') {
    const r = result();
    return (
      <div class="tulog" ref={rootRef}>
        <section class="tulog-card px-box" aria-labelledby="tulog-end-title">
          <h3 class="tulog-title" id="tulog-end-title" tabIndex={-1} data-tulog-focus>
            {t(r.reset ? 'tulog.end.reset' : arcade ? 'tulog.end.arcade' : 'tulog.end.module')}
          </h3>
          <AraSays mood={r.reset ? 'sad' : r.stars === 3 ? 'wow' : 'happy'}>
            <p>{r.reset ? RESET_TEXT[r.reset] : t(r.stars === 3 ? 'tulog.end.great' : r.stars === 2 ? 'tulog.end.good' : 'tulog.end.some')}</p>
          </AraSays>
          <ul class="tulog-stats">
            <li>{t('tulog.end.days', { n: r.days })}</li>
            <li>{t('tulog.end.goodDays', { n: r.goodDays })}</li>
            <li>{t('tulog.end.resisted', { n: r.resisted, total: r.resisted + r.gaveIn })}</li>
            {arcade && <li>{t('tulog.end.points', { n: formatScore(r.score) })}</li>}
          </ul>
          <p>{t('tulog.end.lesson')}</p>
          <p class="px-text-muted">{t('tulog.end.help')}</p>
          <div class="tulog-actions">{endActions(r)}</div>
        </section>
      </div>
    );
  }

  const hud = (
    <div class="tulog-hud">
      {arcade ? (
        <>
          <span class="tulog-stat">{t('tulog.hud.day', { n: game.day })}</span>
          <span class="tulog-stat">{t('tulog.hud.score', { n: formatScore(game.score) })}</span>
          <Button variant="secondary" onClick={() => setPhase('end')}>
            {t('tulog.finishRun')}
          </Button>
        </>
      ) : (
        <>
          <ProgressBar value={Math.min(MODULE_DAYS, daysDone)} max={MODULE_DAYS} text={t('tulog.dayOf', { n: Math.min(game.day, MODULE_DAYS), total: MODULE_DAYS })} label={t('tulog.progress')} />
          <span class="tulog-stat">{t('tulog.hud.score', { n: formatScore(game.score) })}</span>
        </>
      )}
    </div>
  );

  let main: ComponentChildren = null;

  if (phase === 'plan') {
    main = (
      <section class="tulog-card px-box" aria-labelledby="tulog-plan-title">
        <h3 class="tulog-title" id="tulog-plan-title" tabIndex={-1} data-tulog-focus>
          {t('tulog.planTitle', { n: game.day })}
        </h3>
        <p>{t('tulog.planText')}</p>
        <ul class="tulog-bounds">
          {BOUNDARIES.map((b) => {
            const on = game.boundaries.includes(b.id);
            return (
              <li key={b.id}>
                <button type="button" class={`tulog-bound px-box${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => setGame(toggleBoundary(game, b.id))}>
                  <span class="tulog-bound__head">
                    <Icon name={b.icon} size={24} />
                    <span class="tulog-bound__name">{b.name}</span>
                    <Chip kind={on ? 'fact' : undefined}>{t(on ? 'tulog.on' : 'tulog.off')}</Chip>
                  </span>
                  <span>{b.helps}</span>
                  <span class="tulog-bound__cost">{b.costs}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div>
          <Button variant="gold" large onClick={startDay}>
            {t('tulog.startDay', { n: game.day })}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
    );
  } else if (phase === 'moment' && moment) {
    const covering = game.boundaries.filter((b) => boundaryById(b).slots.includes(moment.slot));
    main = (
      <section class="tulog-card px-box" aria-labelledby="tulog-moment-title">
        <p class="tulog-when">
          {t('tulog.when', { part: SLOT_NAME[moment.slot], time: SLOT_TIME[moment.slot], n: game.slot + 1, total: SLOTS.length })}
        </p>
        <h3 class="tulog-title" id="tulog-moment-title" tabIndex={-1} data-tulog-focus>
          {moment.title}
        </h3>
        {moment.source && (
          <p>
            <Chip>
              <Icon name={PULLS[moment.source].icon} size={16} /> {t('tulog.phoneCalling')}
            </Chip>
          </p>
        )}
        <p>{moment.text}</p>
        {!moment.source && covering.length > 0 && <p class="tulog-quiet px-text-muted">{t('tulog.quiet', { name: covering.map((b) => boundaryById(b).name).join(', ') })}</p>}
        <div class="tulog-options" role="group" aria-label={t('tulog.choose')}>
          {moment.options.map((o) => (
            <button key={o.id} type="button" class="tulog-opt px-box" data-sfx={moment.source ? 'none' : 'select'} onClick={() => pick(moment, o.id)}>
              {o.text}
            </button>
          ))}
        </div>
      </section>
    );
  } else if (phase === 'feedback' && last) {
    const { moment: m, option, out } = last;
    const pull = m.source ? PULLS[m.source] : null;
    const good = sumChange(out.change) >= 0 && !out.gaveIn;
    main = (
      <section class={`tulog-card px-box tulog-reveal tulog-reveal--${good ? 'good' : 'bad'}`} aria-labelledby="tulog-fb-title" role="status">
        <h3 class="tulog-title" id="tulog-fb-title" tabIndex={-1} data-tulog-focus>
          {out.gaveIn ? t('tulog.fb.gaveIn') : m.source ? t('tulog.fb.held') : t('tulog.fb.done')}
        </h3>
        <p class="tulog-chosen">{t('tulog.fb.chose', { text: option.text })}</p>
        <p>{option.lesson}</p>
        <FxChips change={out.change} />
        {pull && (
          <p class="tulog-trick">
            <strong>{t('tulog.fb.trick', { name: pull.name })}</strong> {pull.trick}
          </p>
        )}
        <p class="tulog-points">{t('tulog.fb.points', { n: out.points })}</p>
        <div>
          <Button variant="gold" onClick={afterFeedback}>
            {game.reset ? t('tulog.seeResult') : game.slot >= SLOTS.length ? t('tulog.goSleep') : t('tulog.next')}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
    );
  } else if (phase === 'summary' && dayEnded) {
    const finished = game.reset !== null || (!arcade && game.day > MODULE_DAYS);
    main = (
      <section class={`tulog-card px-box tulog-reveal tulog-reveal--${dayEnded.good ? 'good' : 'bad'}`} aria-labelledby="tulog-sum-title" role="status">
        <h3 class="tulog-title" id="tulog-sum-title" tabIndex={-1} data-tulog-focus>
          {t(dayEnded.good ? 'tulog.sum.good' : 'tulog.sum.plain', { n: game.day - 1 })}
        </h3>
        <p>{t(dayEnded.good ? 'tulog.sum.goodText' : 'tulog.sum.plainText')}</p>
        {dayEnded.good && <p class="tulog-points">{t('tulog.sum.bonus', { n: dayEnded.bonus })}</p>}
        <p>{t('tulog.sum.drift')}</p>
        <FxChips change={dayEnded.drift} />
        <div>
          <Button variant="gold" onClick={afterSummary}>
            {finished ? t('tulog.seeResult') : t('tulog.planNext', { n: game.day })}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div class="tulog" ref={rootRef}>
      {hud}
      <div class="tulog-grid">
        {side}
        <div class="tulog-main">{main}</div>
      </div>
    </div>
  );
}
