// OBJECTION!: a barangay-hall hearing, shared by the Module 10 game (three cases, never blocks) and the Arcade (endless, three
// strikes). The witness's statements come one at a time and scroll into the record. Press one for more detail; on the false one
// shout OBJECTION! and present the right evidence card. Turn-based, no clock. DOM, not canvas, so the whole hearing is real text.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { araSay, sfx } from '../../app/sound';
import { useLater } from '../../app/sound/useLater';
import { AraSays } from '../../ui/AraBubble';
import { Icon } from '../../ui/Icon';
import type { IconName } from '../../ui/icons';
import { Button, Chip, ProgressBar } from '../../ui/kit';
import { WatchButton } from '../../ui/tutorial/Tutorial';
import '../../styles/objection.css';
import type { Evidence, EvidenceKind } from './data';
import { Hall } from './Hall';
import {
  CLEAN_BONUS,
  MODULE_CASES,
  STRIKE_LIMIT,
  beginCase,
  buildCase,
  finished,
  isOver,
  moduleStars,
  newGame,
  objection,
  type Case,
  type Game,
  type Mode,
  type Ruling,
} from './sim';

export interface ObjectionResult {
  score: number;
  won: number;
  clean: number;
  strikes: number;
  stars: 1 | 2 | 3;
}

export interface ObjectionProps {
  mode: Mode;
  seed: string;
  /** Shown on the intro (the daily challenge badge). */
  daily?: boolean;
  /** The actions under the final summary (Finish, Play again...). Called with the result. */
  endActions: (result: ObjectionResult) => ComponentChildren;
}

type Phase = 'intro' | 'brief' | 'hearing' | 'present' | 'overruled' | 'closed' | 'end';

interface Verdict {
  ruling: Ruling;
  index: number;
  card: Evidence;
}

const formatScore = (n: number): string => n.toLocaleString('en-US');

const KIND_ICON: Readonly<Record<EvidenceKind, IconName>> = { document: 'article', screenshot: 'ai-scan', right: 'scale' };
const kindLabel = (k: EvidenceKind): string => t(`objection.kind.${k}` as const);

function Hearts({ strikes }: { strikes: number }) {
  return (
    <span class="objection-hearts" aria-hidden="true">
      {Array.from({ length: STRIKE_LIMIT }, (_, i) => (
        <Icon key={i} name={i < STRIKE_LIMIT - strikes ? 'heart-solid' : 'heart'} size={20} />
      ))}
    </span>
  );
}

function Card({ card, onPick }: { card: Evidence; onPick?: () => void }) {
  const inner = (
    <>
      <span class="objection-card__head">
        <Icon name={KIND_ICON[card.kind]} size={20} />
        <span class="objection-card__kind">{kindLabel(card.kind)}</span>
      </span>
      <span class="objection-card__title">{card.title}</span>
      <span class="objection-card__shows">{card.shows}</span>
    </>
  );
  return onPick ? (
    <button type="button" class="objection-card objection-card--pick px-box" data-sfx="none" onClick={onPick}>
      {inner}
    </button>
  ) : (
    <div class="objection-card px-box">{inner}</div>
  );
}

export function Objection({ mode, seed, daily, endActions }: ObjectionProps) {
  const arcade = mode === 'arcade';
  const [game, setGame] = useState<Game>(() => newGame(seed, mode));
  const [phase, setPhase] = useState<Phase>('intro');
  const [cursor, setCursor] = useState(0);
  /** The press reply showing for the current statement. */
  const [pressed, setPressed] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const c: Case | null = useMemo(() => (game.caseNo > 0 ? buildCase(seed, mode, game.caseNo) : null), [seed, mode, game.caseNo]);

  // Moving between screens puts focus on the new heading (inside the hearing: on the statement).
  const focusKey = `${phase}:${game.caseNo}`;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    rootRef.current?.querySelector<HTMLElement>('[data-objection-focus]')?.focus({ preventScroll: true });
  }, [focusKey]);

  const result = (): ObjectionResult => ({ score: game.score, won: game.won, clean: game.clean, strikes: game.strikes, stars: moduleStars(game.won, game.strikes) });

  const later = useLater();

  // Ara's closing line (the one in her bubble), spoken after the end jingle.
  useEffect(() => {
    if (phase !== 'end') return;
    const r = result();
    const line = rootRef.current?.querySelector('.ara-says__bubble p')?.textContent ?? '';
    later(1400, () => araSay(line, r.won >= MODULE_CASES || (arcade && r.won >= 3) ? 'wow' : r.won >= 1 ? 'happy' : 'sad'));
  }, [phase]);

  const openCase = (g: Game) => {
    setGame(beginCase(g));
    setCursor(0);
    setPressed(false);
    setVerdict(null);
    setPhase('brief');
  };

  const move = (to: number) => {
    setCursor(to);
    setPressed(false);
  };

  const present = (card: Evidence) => {
    if (!c) return;
    const ruling = objection(game, c, cursor, card.id);
    setGame(ruling.game);
    setVerdict({ ruling, index: cursor, card });
    // the card slides onto the bench, then the judge rules
    sfx('evidence');
    later(600, () => sfx(ruling.kind === 'won' ? 'verdict' : 'gavel'));
    setPhase(ruling.kind === 'won' ? 'closed' : 'overruled');
  };

  const hud = (
    <div class="objection-hud">
      {arcade ? (
        <>
          <span class="objection-stat">{t('objection.hud.case', { n: Math.max(1, game.caseNo) })}</span>
          <span class="objection-stat">{t('objection.hud.score', { n: formatScore(game.score) })}</span>
        </>
      ) : (
        <ProgressBar value={game.won} max={MODULE_CASES} text={t('objection.caseOf', { n: Math.min(Math.max(1, game.caseNo), MODULE_CASES), total: MODULE_CASES })} label={t('objection.progress')} />
      )}
      <span class="objection-stat objection-strikes">
        <Hearts strikes={game.strikes} />
        {t('objection.strikes', { n: game.strikes, max: STRIKE_LIMIT })}
      </span>
      {arcade && game.caseNo > 0 && phase !== 'end' && (
        <Button variant="secondary" onClick={() => setPhase('end')}>
          {t('objection.finishRun')}
        </Button>
      )}
    </div>
  );

  if (phase === 'intro') {
    return (
      <div class="objection" ref={rootRef}>
        <section class="objection-panel px-box" aria-labelledby="objection-intro-title">
          <h3 class="objection-title" id="objection-intro-title" tabIndex={-1} data-objection-focus>
            {t('objection.introTitle')}
          </h3>
          {daily && <Chip kind="streak">{t('game.daily')}</Chip>}
          <p>{t(arcade ? 'objection.introArcade' : 'objection.introModule')}</p>
          <div class="intro-actions">
            <Button variant="gold" large onClick={() => openCase(game)}>
              {t('objection.start')}
              <Icon name="arrow-right" />
            </Button>
            <WatchButton id="objection" />
          </div>
          <details>
            <summary>{t('objection.how.title')}</summary>
            <ul class="objection-list">
              <li>{t('objection.how.listen')}</li>
              <li>{t('objection.how.press')}</li>
              <li>{t('objection.how.objection')}</li>
              <li>{t('objection.how.strikes')}</li>
              <li>{t(arcade ? 'objection.how.arcade' : 'objection.how.module')}</li>
              <li>{t('objection.how.fiction')}</li>
            </ul>
          </details>
          <Hall label={t('objection.hall')} />
        </section>
      </div>
    );
  }

  if (phase === 'end') {
    const r = result();
    const over = isOver(game);
    // A hearing that was lost or abandoned shows what the false statement was.
    const open = c && !game.closed ? c : null;
    return (
      <div class="objection" ref={rootRef}>
        <section class="objection-panel px-box" aria-labelledby="objection-end-title">
          <h3 class="objection-title" id="objection-end-title" tabIndex={-1} data-objection-focus>
            {t(over ? 'objection.end.over' : arcade ? 'objection.end.arcade' : 'objection.end.module')}
          </h3>
          <AraSays mood={r.won >= MODULE_CASES || (arcade && r.won >= 3) ? 'wow' : r.won >= 1 ? 'happy' : 'sad'}>
            <p>{t(r.won >= MODULE_CASES ? 'objection.end.great' : r.won >= 1 ? 'objection.end.good' : 'objection.end.some')}</p>
          </AraSays>
          <ul class="objection-list">
            <li>{t('objection.end.won', { n: r.won })}</li>
            <li>{t('objection.end.clean', { n: r.clean })}</li>
            <li>{t('objection.end.strikes', { n: r.strikes, max: STRIKE_LIMIT })}</li>
            {arcade && <li>{t('objection.end.points', { n: formatScore(r.score) })}</li>}
          </ul>
          {open && (
            <div class="px-box objection-panel objection-reveal objection-reveal--bad">
              <p class="objection-label">{t('objection.end.reopened')}</p>
              <p>
                <q>{open.statements[open.lieIndex]?.text}</q>
              </p>
              <p>{open.statements[open.lieIndex]?.why}</p>
            </div>
          )}
          <p>{t('objection.end.lesson')}</p>
          <p class="objection-note">{t('objection.notAdvice')}</p>
          <div class="objection-actions">{endActions(r)}</div>
        </section>
      </div>
    );
  }

  const side = c && (
    <aside class="objection-side" aria-label={t('objection.side')}>
      <Hall label={t('objection.hall')} bang={phase === 'overruled' || phase === 'closed'} />
      <div class="objection-who">
        <p class="objection-label">{t('objection.hud.case', { n: c.no })}</p>
        <p class="objection-name">{c.title}</p>
        <p>{t('objection.witness', { who: c.witness })}</p>
        <p class="px-text-muted">{t('objection.client', { who: c.who })}</p>
      </div>
    </aside>
  );

  let main: ComponentChildren = null;

  if (c && phase === 'brief') {
    main = (
      <section class="objection-panel px-box" aria-labelledby="objection-brief-title">
        <p class="objection-label">{t('objection.caseFile', { n: c.no })}</p>
        <h3 class="objection-title" id="objection-brief-title" tabIndex={-1} data-objection-focus>
          {c.title}
        </h3>
        <p>{c.brief}</p>
        <p>{t('objection.briefTask', { who: c.who, witness: c.witness })}</p>
        <div>
          <Button variant="gold" large onClick={() => setPhase('hearing')}>
            {t('objection.begin')}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
    );
  } else if (c && (phase === 'hearing' || phase === 'present')) {
    const line = c.statements[cursor];
    const total = c.statements.length;
    const checked = game.checked.includes(cursor);
    const presenting = phase === 'present';
    main = (
      <>
        <section class="objection-panel px-box" aria-labelledby="objection-testimony-title">
          <h3 class="objection-title" id="objection-testimony-title">
            {t('objection.testimony', { witness: c.witness })}
          </h3>
          <div class="objection-bubble px-box" key={cursor} role="group" aria-label={t('objection.statementOf', { n: cursor + 1, total })} data-objection-focus={presenting ? undefined : ''} tabIndex={-1}>
            <p class="objection-label">{t('objection.statementOf', { n: cursor + 1, total })}</p>
            <p class="objection-speech">
              <q>{line?.text}</q>
            </p>
            {checked && <Chip kind="fact">{t('objection.ruledTrue')}</Chip>}
          </div>
          {pressed && (
            <div class="objection-press" role="status">
              <p class="objection-label">{t('objection.pressReply')}</p>
              <p>
                <q>{line?.press}</q>
              </p>
            </div>
          )}
          {!presenting && (
            <div class="objection-actions">
              <Button variant="secondary" disabled={cursor === 0} onClick={() => move(cursor - 1)}>
                <Icon name="arrow-left" />
                {t('objection.prev')}
              </Button>
              <Button variant="secondary" onClick={() => move(cursor + 1 < total ? cursor + 1 : 0)}>
                {cursor + 1 < total ? t('objection.next') : t('objection.again')}
                <Icon name="arrow-right" />
              </Button>
              <Button variant="gold" onClick={() => setPressed(true)}>
                {t('objection.press')}
              </Button>
              <Button variant="fake" class="objection-shout-btn" aria-disabled={checked} data-sfx="objection" onClick={() => !checked && setPhase('present')}>
                {t('objection.objection')}
              </Button>
            </div>
          )}
          <details class="objection-heard">
            <summary>{t('objection.heard')}</summary>
            <ol>
              {c.statements.map((s, i) => (
                <li key={i}>
                  <button type="button" class="objection-jump" aria-current={i === cursor ? 'step' : undefined} onClick={() => !presenting && move(i)} aria-disabled={presenting}>
                    {s.text}
                    {game.checked.includes(i) && ` (${t('objection.ruledTrue')})`}
                  </button>
                </li>
              ))}
            </ol>
          </details>
        </section>
        {presenting ? (
          <section class="objection-panel px-box objection-present" aria-labelledby="objection-present-title">
            <p class="objection-shout" aria-hidden="true">
              {t('objection.objection')}
            </p>
            <h3 class="objection-title" id="objection-present-title" tabIndex={-1} data-objection-focus>
              {t('objection.presentTitle', { n: cursor + 1 })}
            </h3>
            <p>{t('objection.presentHelp')}</p>
            <ul class="objection-cards">
              {c.evidence.map((e) => (
                <li key={e.id}>
                  <Card card={e} onPick={() => present(e)} />
                </li>
              ))}
            </ul>
            <div class="objection-actions">
              <Button variant="secondary" onClick={() => setPhase('hearing')}>
                {t('objection.takeBack')}
              </Button>
            </div>
          </section>
        ) : (
          <section class="objection-panel px-box" aria-labelledby="objection-record-title">
            <h3 class="objection-title" id="objection-record-title">
              {t('objection.record')}
            </h3>
            <p class="px-text-muted">{t('objection.recordHelp', { n: c.evidence.length })}</p>
            <ul class="objection-cards">
              {c.evidence.map((e) => (
                <li key={e.id}>
                  <Card card={e} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  } else if (c && phase === 'overruled' && verdict) {
    const { ruling, index, card } = verdict;
    const over = isOver(game);
    const truth = ruling.kind === 'true-statement';
    main = (
      <section class="objection-panel px-box objection-reveal objection-reveal--bad" aria-labelledby="objection-overruled-title" role="status">
        <p class="objection-shout" aria-hidden="true">
          {t('objection.objection')}
        </p>
        <h3 class="objection-title" id="objection-overruled-title" tabIndex={-1} data-objection-focus>
          {t(truth ? 'objection.overruled' : 'objection.notEnough')}
        </h3>
        <p>
          <q>{c.statements[index]?.text}</q>
        </p>
        {truth ? <p>{c.statements[index]?.why}</p> : <p>{t('objection.wrongCard', { card: card.title, shows: card.shows })}</p>}
        <p class="objection-label">{t('objection.strikeLine', { n: game.strikes, max: STRIKE_LIMIT })}</p>
        <div>
          <Button variant="gold" onClick={() => setPhase(over ? 'end' : 'hearing')}>
            {over ? t('objection.seeVerdict') : t('objection.backToTestimony')}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
    );
  } else if (c && phase === 'closed' && verdict && verdict.ruling.kind === 'won') {
    const { points, clean } = verdict.ruling;
    const line = c.statements[c.lieIndex];
    const done = finished(game);
    main = (
      <section class="objection-panel px-box objection-reveal objection-reveal--good" aria-labelledby="objection-closed-title" role="status">
        <p class="objection-shout objection-shout--good" aria-hidden="true">
          {t('objection.objection')}
        </p>
        <h3 class="objection-title" id="objection-closed-title" tabIndex={-1} data-objection-focus>
          {t('objection.closed')}
        </h3>
        <p class="objection-label">{t('objection.falseWas')}</p>
        <p>
          <q>{line?.text}</q>
        </p>
        <p>{t('objection.provedBy', { card: verdict.card.title })}</p>
        <p>{line?.why}</p>
        <ul class="objection-list">
          <li>{t('objection.pts.case', { n: points - (clean ? CLEAN_BONUS : 0) })}</li>
          {clean && <li>{t('objection.pts.clean', { n: CLEAN_BONUS })}</li>}
        </ul>
        <div>
          <p class="objection-label">{t('objection.remember')}</p>
          <p>{c.lesson}</p>
        </div>
        <p>{t('objection.realLife')}</p>
        <div>
          <Button variant="gold" onClick={() => (done ? setPhase('end') : openCase(game))}>
            {done ? t('objection.seeResult') : t('objection.nextCase')}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div class="objection" ref={rootRef}>
      {hud}
      <div class="objection-grid">
        {side}
        <div class="objection-main">{main}</div>
      </div>
    </div>
  );
}
