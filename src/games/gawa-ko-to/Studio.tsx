// "Gawa Ko 'To!": the poster studio, shared by the Module 7 game (three briefs, no timer, always completes) and the Arcade
// (endless briefs, a pausable timer, three hearts). One brief at a time: pick a picture, a slogan and a health fact, add the
// honest steps (label, ask permission, credit), then Publish. The reveal checks the poster and may say "Reported!".
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { AraSays } from '../../ui/AraBubble';
import { Icon } from '../../ui/Icon';
import { Button, Chip, ProgressBar } from '../../ui/kit';
import '../../styles/gawa.css';
import { ARTIST, PICTURES, topicById, type PictureId } from './parts';
import { PosterSvg, describePoster } from './Poster';
import {
  EMPTY_POSTER,
  HEARTS,
  REQUIREMENT_TEXT,
  buildBrief,
  buildModuleBriefs,
  evaluate,
  replyFor,
  starsFor,
  type Brief,
  type CheckId,
  type Evaluation,
  type Poster,
} from './rules';

export interface StudioResult {
  /** Points (arcade). */
  score: number;
  /** Posters published without a "Reported!". */
  honest: number;
  posters: number;
  hearts: number;
  stars: 1 | 2 | 3;
}

export interface StudioProps {
  mode: 'module' | 'arcade';
  seed: string;
  /** Shown on the intro (the daily challenge badge). */
  daily?: boolean;
  /** The actions under the final summary (Finish, Play again...). Called with the result. */
  endActions: (result: StudioResult) => ComponentChildren;
}

interface Done {
  brief: Brief;
  poster: Poster;
  ev: Evaluation;
  timedOut: boolean;
}

type Phase = 'intro' | 'build' | 'reveal' | 'end';

const MODULE_POSTERS = 3;
const CHECK_NAME: Readonly<Record<CheckId, string>> = {
  label: t('gawa.check.label'),
  consent: t('gawa.check.consent'),
  credit: t('gawa.check.credit'),
  fact: t('gawa.check.fact'),
  brief: t('gawa.check.brief'),
};

const formatScore = (n: number): string => n.toLocaleString('en-US');

function Options({ legend, name, value, onPick, items }: { legend: string; name: string; value: string | null; onPick: (id: string) => void; items: readonly { id: string; title: string; sub?: string; tag?: string }[] }) {
  return (
    <fieldset class="gawa-group">
      <legend class="gawa-legend">{legend}</legend>
      <div class="gawa-options">
        {items.map((it) => (
          <label key={it.id} class={`gawa-opt px-box${value === it.id ? ' is-on' : ''}`}>
            <input type="radio" class="sr-only" name={name} checked={value === it.id} onChange={() => onPick(it.id)} aria-labelledby={`${name}-${it.id}-t`} aria-describedby={it.sub ? `${name}-${it.id}-s` : undefined} />
            <span class="gawa-opt__title" id={`${name}-${it.id}-t`}>
              {it.title}
            </span>
            {it.tag && <Chip>{it.tag}</Chip>}
            {it.sub && (
              <span class="gawa-opt__sub" id={`${name}-${it.id}-s`}>
                {it.sub}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Hearts({ n }: { n: number }) {
  return (
    <span class="gawa-hearts" role="img" aria-label={t('gawa.hearts', { n, max: HEARTS })}>
      {Array.from({ length: HEARTS }, (_, i) => (
        <Icon key={i} name={i < n ? 'heart-solid' : 'heart'} size={24} class={i < n ? 'gawa-heart' : 'gawa-heart gawa-heart--lost'} />
      ))}
    </span>
  );
}

export function Studio({ mode, seed, daily, endActions }: StudioProps) {
  const arcade = mode === 'arcade';
  const moduleBriefs = useMemo(() => (arcade ? [] : buildModuleBriefs(seed)), [arcade, seed]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [n, setN] = useState(1);
  const [poster, setPoster] = useState<Poster>(EMPTY_POSTER);
  const [done, setDone] = useState<Done[]>([]);
  const [score, setScore] = useState(0);
  const [hearts, setHearts] = useState(HEARTS);
  const [left, setLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const posterRef = useRef(poster);
  posterRef.current = poster;
  const leftRef = useRef(left);
  leftRef.current = left;

  const brief = useMemo<Brief>(() => (arcade ? buildBrief(seed, n) : (moduleBriefs[n - 1] as Brief)), [arcade, seed, n, moduleBriefs]);
  const topic = topicById(brief.topic);
  const last = done[done.length - 1];
  const asking = replyFor(poster.picture, brief);
  const complete = poster.picture !== null && poster.slogan !== null && poster.fact !== null;

  // Moving between screens puts focus on the new heading.
  const focusKey = `${phase}:${n}`;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    rootRef.current?.querySelector<HTMLElement>('[data-gawa-focus]')?.focus({ preventScroll: true });
  }, [focusKey]);

  const publish = (timedOut = false) => {
    const p = posterRef.current;
    const ev = evaluate(p, brief, timedOut ? 0 : leftRef.current);
    setDone((d) => [...d, { brief, poster: p, ev, timedOut }]);
    setScore((s) => s + ev.points);
    if (arcade && ev.reported) setHearts((h) => Math.max(0, h - 1));
    setPhase('reveal');
  };
  const publishRef = useRef(publish);
  publishRef.current = publish;

  // The arcade clock: one tick a second while building, stoppable with Pause. At zero the poster goes out as it is.
  useEffect(() => {
    if (!arcade || phase !== 'build' || paused) return;
    const id = window.setInterval(() => {
      const next = leftRef.current - 1;
      leftRef.current = next;
      setLeft(Math.max(0, next));
      if (next <= 0) {
        window.clearInterval(id);
        publishRef.current(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [arcade, phase, paused, n]);

  const startBrief = (k: number) => {
    setN(k);
    setPoster(EMPTY_POSTER);
    setPaused(false);
    setLeft(arcade ? (buildBrief(seed, k).seconds ?? 0) : 0);
    setPhase('build');
  };

  const afterReveal = () => {
    const over = arcade ? hearts <= 0 : n >= MODULE_POSTERS;
    if (over) setPhase('end');
    else startBrief(n + 1);
  };

  const pick = (key: 'slogan' | 'fact', id: string) => setPoster((p) => ({ ...p, [key]: id }));
  const pickPicture = (id: string) => setPoster((p) => ({ ...p, picture: id as PictureId, asked: false }));
  const toggle = (key: 'label' | 'credit') => setPoster((p) => ({ ...p, [key]: !p[key] }));

  const result: StudioResult = {
    score,
    honest: done.filter((d) => !d.ev.reported).length,
    posters: done.length,
    hearts,
    stars: starsFor(done.filter((d) => !d.ev.reported).length, arcade ? done.length : MODULE_POSTERS),
  };

  if (phase === 'intro') {
    return (
      <div class="gawa" ref={rootRef}>
        <section class="gawa-card px-box" aria-labelledby="gawa-intro-title">
          <h3 class="gawa-title" id="gawa-intro-title" tabIndex={-1} data-gawa-focus>
            {t('gawa.introTitle')}
          </h3>
          {daily && <Chip kind="streak">{t('game.daily')}</Chip>}
          <p>{t(arcade ? 'gawa.introArcade' : 'gawa.introModule')}</p>
          <div>
            <Button variant="gold" large onClick={() => startBrief(1)}>
              {t('gawa.start')}
              <Icon name="arrow-right" />
            </Button>
          </div>
          <details>
            <summary>{t('gawa.how.title')}</summary>
            <ul class="gawa-how">
              <li>{t('gawa.how.parts')}</li>
              <li>{t('gawa.how.label')}</li>
              <li>{t('gawa.how.consent')}</li>
              <li>{t('gawa.how.credit')}</li>
              <li>{t('gawa.how.fact')}</li>
              <li>{t(arcade ? 'gawa.how.arcade' : 'gawa.how.module')}</li>
            </ul>
          </details>
        </section>
      </div>
    );
  }

  if (phase === 'end') {
    return (
      <div class="gawa" ref={rootRef}>
        <section class="gawa-card px-box" aria-labelledby="gawa-end-title">
          <h3 class="gawa-title" id="gawa-end-title" tabIndex={-1} data-gawa-focus>
            {t(arcade ? 'gawa.overTitle' : 'gawa.endTitle')}
          </h3>
          <AraSays mood={result.honest === result.posters ? 'wow' : 'happy'}>
            <p>{t(result.honest === result.posters ? 'gawa.end.great' : result.honest > 0 ? 'gawa.end.good' : 'gawa.end.some')}</p>
          </AraSays>
          <p>{t('gawa.endScore', { honest: result.honest, total: result.posters })}</p>
          {arcade && <p>{t('gawa.endPoints', { n: formatScore(score) })}</p>}
          <h4>{t('gawa.end.posters')}</h4>
          <ul class="gawa-list">
            {done.map((d, i) => (
              <li key={i} class="gawa-list__item px-box">
                <strong>{t('gawa.end.poster', { n: i + 1, title: topicById(d.brief.topic).title, result: d.ev.reported ? t('gawa.reported') : t('gawa.published') })}</strong>
                <span class="px-text-muted">{d.ev.reported ? (d.ev.checks.find((c) => c.report)?.report ?? '') : t('gawa.honestLine')}</span>
              </li>
            ))}
          </ul>
          <p>{t('gawa.end.lesson')}</p>
          <div class="gawa-actions">{endActions(result)}</div>
        </section>
      </div>
    );
  }

  const first = brief.requirements.length > 0;
  const lowTime = arcade && left <= 10;

  const hud = (
    <div class="gawa-hud">
      {arcade ? (
        <>
          <span class="gawa-stat">{t('gawa.posterN', { n })}</span>
          <span class="gawa-stat">{t('gawa.score', { n: formatScore(score) })}</span>
          <Hearts n={hearts} />
          {phase === 'build' && (
            <>
              <span class={`gawa-stat gawa-time${lowTime ? ' is-low' : ''}`} role="timer" aria-live="off">
                {t('gawa.time', { n: left })}
              </span>
              <Button variant="secondary" aria-pressed={paused} onClick={() => setPaused(!paused)}>
                {paused ? t('gawa.resume') : t('gawa.pause')}
              </Button>
            </>
          )}
        </>
      ) : (
        <ProgressBar value={n - 1 + (phase === 'reveal' ? 1 : 0)} max={MODULE_POSTERS} text={t('gawa.posterOf', { n, total: MODULE_POSTERS })} label={t('gawa.progress')} />
      )}
    </div>
  );

  if (phase === 'reveal' && last) {
    const { ev } = last;
    const lastOne = arcade ? hearts <= 0 : n >= MODULE_POSTERS;
    const failing = ev.checks.find((c) => c.report);
    return (
      <div class="gawa" ref={rootRef}>
        {hud}
        <div class="gawa-grid">
          <div class="gawa-preview">
            <PosterSvg poster={last.poster} brief={last.brief} id={`poster-${n}`} reported={ev.reported} fake={ev.fake} />
          </div>
          <section class={`gawa-reveal px-box gawa-reveal--${ev.reported ? 'bad' : 'good'}`} aria-labelledby="gawa-rev-title" role="status">
            <h3 class="gawa-title" id="gawa-rev-title" tabIndex={-1} data-gawa-focus>
              {ev.reported ? t('gawa.reportedTitle') : t('gawa.publishedTitle')}
            </h3>
            {last.timedOut && <p>{t('gawa.timedOut')}</p>}
            <p>{ev.reported ? (failing?.report ?? '') : t('gawa.honestLine')}</p>
            <ul class="gawa-checks">
              {ev.checks.map((c) => (
                <li key={c.id} class={`gawa-check gawa-check--${c.status}`}>
                  <span class="gawa-check__head">
                    <Chip kind={c.status === 'pass' ? 'fact' : c.status === 'fail' ? 'fake' : undefined}>
                      {c.status === 'pass' ? t('gawa.pass') : c.status === 'fail' ? t('gawa.fail') : t('gawa.na')}
                    </Chip>
                    <strong>{CHECK_NAME[c.id]}</strong>
                  </span>
                  <span>{c.note}</span>
                </li>
              ))}
            </ul>
            <p class="gawa-points">{t('gawa.points', { n: ev.points })}</p>
            <p class="px-text-muted">{t('gawa.basis', { basis: topic.basis })}</p>
            <div>
              <Button variant="gold" onClick={afterReveal}>
                {lastOne ? t('gawa.seeResult') : t('gawa.next')}
                <Icon name="arrow-right" />
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const picItems = PICTURES.map((p) => ({ id: p.id, title: p.name, sub: p.hint, tag: p.id === 'ai' || p.id === 'ai-doctor' ? t('gawa.tagAi') : undefined }));
  const sloganItems = topic.slogans.map((s) => ({ id: s.id, title: s.text, tag: s.ai ? t('gawa.tagAiWritten') : undefined }));
  const factItems = topic.facts.map((f) => ({ id: f.id, title: f.text }));
  const person = poster.picture === 'neighbor' || poster.picture === 'ai-doctor';

  return (
    <div class="gawa" ref={rootRef}>
      {hud}
      <section class="gawa-brief px-box" aria-labelledby="gawa-brief-title">
        <h3 class="gawa-title" id="gawa-brief-title" tabIndex={-1} data-gawa-focus>
          {t('gawa.brief', { n })}
        </h3>
        <p>{t('gawa.briefText', { ask: topic.ask })}</p>
        {first && (
          <ul class="gawa-reqs">
            {brief.requirements.map((r) => (
              <li key={r}>{REQUIREMENT_TEXT[r]}</li>
            ))}
          </ul>
        )}
      </section>
      <div class="gawa-grid">
        <div class="gawa-preview">
          <PosterSvg poster={poster} brief={brief} id={`poster-${n}`} />
          <p class="sr-only" aria-live="polite">
            {describePoster(poster, brief)}
          </p>
        </div>
        <div class="gawa-steps">
          <Options legend={t('gawa.step.picture')} name="pic" value={poster.picture} onPick={pickPicture} items={picItems} />
          <Options legend={t('gawa.step.slogan')} name="slogan" value={poster.slogan} onPick={(id) => pick('slogan', id)} items={sloganItems} />
          <Options legend={t('gawa.step.fact')} name="fact" value={poster.fact} onPick={(id) => pick('fact', id)} items={factItems} />
          <fieldset class="gawa-group">
            <legend class="gawa-legend">{t('gawa.step.honest')}</legend>
            <div class="gawa-honest">
              <Button variant="secondary" aria-pressed={poster.label} onClick={() => toggle('label')}>
                <Icon name={poster.label ? 'check' : 'info'} size={20} />
                {t('gawa.label')}
              </Button>
              <Button variant="secondary" aria-pressed={poster.credit} onClick={() => toggle('credit')}>
                <Icon name={poster.credit ? 'check' : 'brush'} size={20} />
                {t('gawa.credit', { name: ARTIST })}
              </Button>
              <Button variant="secondary" disabled={!person || poster.asked} onClick={() => setPoster((p) => ({ ...p, asked: true }))}>
                <Icon name="chat" size={20} />
                {poster.asked ? t('gawa.asked') : t('gawa.ask')}
              </Button>
            </div>
            {!person && <p class="gawa-hint px-text-muted">{t('gawa.askHint')}</p>}
            {poster.asked && asking && (
              <div class="gawa-reply" role="status">
                <Chip kind={asking.yes ? 'fact' : 'fake'}>{asking.name}</Chip>
                <span>{asking.text}</span>
              </div>
            )}
          </fieldset>
          <div class="gawa-publish">
            <Button variant="gold" large disabled={!complete} onClick={() => publish(false)}>
              {t('gawa.publish')}
              <Icon name="arrow-right" />
            </Button>
            {!complete && <p class="gawa-hint px-text-muted">{t('gawa.publishHint')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
