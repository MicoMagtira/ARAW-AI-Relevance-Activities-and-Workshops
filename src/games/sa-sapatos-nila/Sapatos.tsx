// "Sa Sapatos Nila": the kiosk simulator, shared by the Module 9 game (five visitors, never fails) and the Arcade (endless, ends
// when three people have left). Turn-based: a visitor arrives, you try the kiosk through their eyes, and when they get stuck you
// spend fix points until they can be served. DOM, not canvas, so every barrier is also written out for screen readers.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { araSay, sfx } from '../../app/sound';
import { useLater } from '../../app/sound/useLater';
import { AraSays } from '../../ui/AraBubble';
import { Icon } from '../../ui/Icon';
import { Button, Chip, ProgressBar } from '../../ui/kit';
import { WatchButton } from '../../ui/tutorial/Tutorial';
import '../../styles/sapatos.css';
import { FIXES, LANGS, barrierById, fixById, type BarrierId, type Fix, type FixId, type Persona } from './data';
import { FeelList, Kiosk } from './Kiosk';
import { Person } from './Person';
import {
  FP_CAP,
  LEAVE_LIMIT,
  MAX_FAILS,
  MODULE_VISITS,
  READY_BONUS,
  SHARED_BONUS,
  STAR_POINTS,
  barriersHelpedBy,
  beginVisit,
  install,
  isOver,
  leave,
  moduleDone,
  moduleStars,
  newGame,
  serveAtKiosk,
  tryStep,
  unmetBarriers,
  takeCounter,
  visitorFor,
  type Game,
  type Mode,
} from './sim';

export interface SapatosResult {
  score: number;
  served: number;
  left: number;
  /** Visitors who came (served or left). */
  visits: number;
  fixes: number;
  stars: 1 | 2 | 3;
}

export interface SapatosProps {
  mode: Mode;
  seed: string;
  /** Shown on the intro (the daily challenge badge). */
  daily?: boolean;
  /** The actions under the final summary (Finish, Play again...). Called with the result. */
  endActions: (result: SapatosResult) => ComponentChildren;
}

type Phase = 'intro' | 'arrive' | 'try' | 'fix' | 'result' | 'end';

const formatScore = (n: number): string => n.toLocaleString('en-US');
const fill = (text: string, name: string): string => text.replaceAll('{name}', name);

/** "Helps: blurry view, hard to read" for a fix. */
const helpsLine = (fix: Fix): string => {
  const names = barriersHelpedBy(fix.id).map((b) => barrierById(b).filter.toLowerCase());
  return fix.id === 'counter' ? t('sapatos.fix.helpsCounter') : t('sapatos.fix.helps', { list: [...new Set(names)].join(', ') });
};

function Stars({ n }: { n: number }) {
  return (
    <span class="sapatos-stars" role="img" aria-label={t('sapatos.stars', { n })}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="xp-star" size={28} class={i <= n ? 'is-on' : 'is-off'} />
      ))}
    </span>
  );
}

export function Sapatos({ mode, seed, daily, endActions }: SapatosProps) {
  const arcade = mode === 'arcade';
  const [game, setGame] = useState<Game>(() => newGame(seed, mode));
  const [phase, setPhase] = useState<Phase>('intro');
  const [stuck, setStuck] = useState<BarrierId[]>([]);
  /** The counter had a long line the last time it was tried. */
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const persona: Persona = visitorFor(seed, Math.max(1, game.visit), mode);
  const unmet = unmetBarriers(persona, game.installed);

  // Moving between screens puts focus on the new heading (or, at the kiosk, on its button).
  const focusKey = `${phase}:${game.visit}`;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    rootRef.current?.querySelector<HTMLElement>(phase === 'try' ? '[data-kiosk-press]' : '[data-sapatos-focus]')?.focus({ preventScroll: true });
  }, [focusKey]);

  const result = (): SapatosResult => ({
    score: game.score,
    served: game.served,
    left: game.left,
    visits: game.served + game.left,
    fixes: game.installed.length,
    stars: moduleStars(game.served, MODULE_VISITS),
  });

  const finished = (g: Game): boolean => isOver(g) || (!arcade && moduleDone(g));
  const later = useLater();

  // Ara's closing line (the one in her bubble), spoken after the end jingle.
  useEffect(() => {
    if (phase !== 'end') return;
    const r = result();
    const line = rootRef.current?.querySelector('.ara-says__bubble p')?.textContent ?? '';
    later(1400, () => araSay(line, r.served >= 3 ? (r.stars === 3 ? 'wow' : 'happy') : r.left === 0 ? 'happy' : 'sad'));
  }, [phase]);

  const resolveLeft = (g: Game, why: 'fails' | 'let-go' | 'queue') => {
    if (why !== 'let-go') later(250, () => sfx('wrong'));
    setGame(leave(g, why));
    setPhase('result');
  };

  const press = () => {
    if (phase !== 'try' && phase !== 'fix') return;
    const r = tryStep(game, persona);
    if (r.ok && !r.done) {
      setGame(r.game);
      setPhase('try');
    } else if (r.ok) {
      later(250, () => sfx('correct')); // after the kiosk beep
      setGame(serveAtKiosk(r.game, persona));
      setPhase('result');
    } else if (r.gaveUp) resolveLeft(r.game, 'fails');
    else {
      later(250, () => sfx('wrong'));
      setGame(r.game);
      setStuck(r.blockers);
      setBusy(false);
      setPhase('fix');
    }
  };

  const goCounter = () => {
    const r = takeCounter(game, persona);
    if (r.ok) {
      sfx('correct');
      setGame(r.game);
      setPhase('result');
    } else if (r.gaveUp) resolveLeft(r.game, 'queue');
    else {
      setGame(r.game);
      setStuck([]);
      setBusy(true);
      setPhase('fix');
    }
  };

  const next = () => {
    if (finished(game)) setPhase('end');
    else {
      sfx('persona'); // the next visitor walks up
      setGame(beginVisit(game));
      setPhase('arrive');
    }
  };

  const hud = (
    <div class="sapatos-hud">
      {arcade ? (
        <>
          <span class="sapatos-stat">{t('sapatos.hud.visitor', { n: Math.max(1, game.visit) })}</span>
          <span class="sapatos-stat">{t('sapatos.hud.score', { n: formatScore(game.score) })}</span>
          <Button variant="secondary" onClick={() => setPhase('end')}>
            {t('sapatos.finishRun')}
          </Button>
        </>
      ) : (
        <>
          <ProgressBar value={Math.min(MODULE_VISITS, game.served + game.left)} max={MODULE_VISITS} text={t('sapatos.visitorOf', { n: Math.min(Math.max(1, game.visit), MODULE_VISITS), total: MODULE_VISITS })} label={t('sapatos.progress')} />
          <span class="sapatos-stat">{t('sapatos.hud.score', { n: formatScore(game.score) })}</span>
        </>
      )}
    </div>
  );

  if (phase === 'intro') {
    return (
      <div class="sapatos" ref={rootRef}>
        <section class="sapatos-card px-box" aria-labelledby="sapatos-intro-title">
          <h3 class="sapatos-title" id="sapatos-intro-title" tabIndex={-1} data-sapatos-focus>
            {t('sapatos.introTitle')}
          </h3>
          {daily && <Chip kind="streak">{t('game.daily')}</Chip>}
          <p>{t(arcade ? 'sapatos.introArcade' : 'sapatos.introModule')}</p>
          <div class="intro-actions">
            <Button
              variant="gold"
              large
              onClick={() => {
                setGame(beginVisit(game));
                setPhase('arrive');
              }}
            >
              {t('sapatos.start')}
              <Icon name="arrow-right" />
            </Button>
            <WatchButton id="sa-sapatos-nila" />
          </div>
          <details>
            <summary>{t('sapatos.how.title')}</summary>
            <ul class="sapatos-how">
              <li>{t('sapatos.how.eyes')}</li>
              <li>{t('sapatos.how.fix')}</li>
              <li>{t('sapatos.how.points')}</li>
              <li>{t('sapatos.how.counter')}</li>
              <li>{t(arcade ? 'sapatos.how.arcade' : 'sapatos.how.module')}</li>
              <li>{t('sapatos.how.safe')}</li>
            </ul>
          </details>
        </section>
      </div>
    );
  }

  if (phase === 'end') {
    const r = result();
    const lines: string[] = [];
    if (r.served >= MODULE_VISITS && !arcade) lines.push(t('sapatos.end.great'));
    else if (r.served >= 3) lines.push(t('sapatos.end.good'));
    else if (r.left === 0) lines.push(t('sapatos.end.short')); // a short run: no one was turned away
    else lines.push(t('sapatos.end.some'));
    return (
      <div class="sapatos" ref={rootRef}>
        <section class="sapatos-card px-box" aria-labelledby="sapatos-end-title">
          <h3 class="sapatos-title" id="sapatos-end-title" tabIndex={-1} data-sapatos-focus>
            {t(isOver(game) ? 'sapatos.end.closed' : arcade ? 'sapatos.end.arcade' : 'sapatos.end.module')}
          </h3>
          <AraSays mood={r.served >= 3 ? (r.stars === 3 ? 'wow' : 'happy') : r.left === 0 ? 'happy' : 'sad'}>
            <p>{lines[0]}</p>
          </AraSays>
          <ul class="sapatos-stats">
            <li>{t('sapatos.end.served', { n: r.served })}</li>
            <li>{t('sapatos.end.left', { n: r.left })}</li>
            <li>{t('sapatos.end.fixes', { n: r.fixes })}</li>
            {arcade && <li>{t('sapatos.end.points', { n: formatScore(r.score) })}</li>}
          </ul>
          <p>{t('sapatos.end.lesson')}</p>
          <div class="sapatos-actions">{endActions(r)}</div>
        </section>
      </div>
    );
  }

  const last = game.last;
  const side = (
    <aside class="sapatos-side" aria-label={t('sapatos.side')}>
      <Person look={persona.look} label={t('sapatos.person.label', { who: persona.who })} />
      <div class="sapatos-who">
        <p class="sapatos-name">{persona.name}</p>
        <p>{persona.who}</p>
        <p class="px-text-muted">{t('sapatos.task', { task: persona.task })}</p>
      </div>
      <div class="sapatos-meters">
        <Chip kind="xp">{t('sapatos.fp', { n: game.fp, max: FP_CAP })}</Chip>
        <Chip kind={game.left > 0 ? 'fake' : undefined}>{t('sapatos.leaves', { n: game.left, max: LEAVE_LIMIT })}</Chip>
      </div>
      <div class="sapatos-installed">
        <h4>{t('sapatos.installed')}</h4>
        {game.installed.length === 0 ? (
          <p class="px-text-muted">{t('sapatos.noneYet')}</p>
        ) : (
          <ul>
            {game.installed.map((id) => (
              <li key={id}>
                <Chip kind="fact">
                  {fixById(id).name}
                  {' · '}
                  {t('sapatos.helped', { n: game.helped[id] ?? 0 })}
                </Chip>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );

  let main: ComponentChildren = null;

  if (phase === 'arrive') {
    main = (
      <section class="sapatos-card px-box" aria-labelledby="sapatos-arrive-title">
        <p class="sapatos-when">{t('sapatos.arrives', { n: game.visit })}</p>
        <h3 class="sapatos-title" id="sapatos-arrive-title" tabIndex={-1} data-sapatos-focus>
          {t('sapatos.arriveTitle', { name: persona.name })}
        </h3>
        <p>{persona.who}</p>
        <p>{t('sapatos.task', { task: persona.task })}</p>
        {game.broke && (
          <p class="sapatos-update" role="status">
            <Icon name="warning" size={20} /> {t('sapatos.update', { fix: fixById(game.broke).name })}
          </p>
        )}
        <p class="sapatos-gain">{t('sapatos.gain', { n: Math.min(FP_CAP, game.fp) })}</p>
        <p>{t('sapatos.eyes', { name: persona.name })}</p>
        <div>
          <Button variant="gold" large onClick={() => setPhase('try')}>
            {t('sapatos.tryKiosk', { name: persona.name })}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
    );
  } else if (phase === 'try' || phase === 'fix') {
    const kiosk = <Kiosk persona={persona} installed={game.installed} step={game.step} onPress={press} onCounter={game.installed.includes('counter') ? goCounter : undefined} />;
    const reason = stuck.length > 0 ? fill(barrierById(stuck[0] as BarrierId).stuck, persona.name) : '';
    const voiceNote = stuck.some((b) => b.startsWith('lang-')) && game.installed.includes('voice');
    main = (
      <>
        <section class="sapatos-card px-box" aria-labelledby="sapatos-kiosk-title">
          <h3 class="sapatos-title" id="sapatos-kiosk-title">
            {t('sapatos.kioskTitle', { name: persona.name })}
          </h3>
          <p class="px-text-muted">{t('sapatos.filterNote')}</p>
          {kiosk}
          <FeelList persona={persona} installed={game.installed} />
        </section>
        {phase === 'fix' && (
          <section class="sapatos-card px-box sapatos-reveal sapatos-reveal--bad" aria-labelledby="sapatos-fix-title" role="status">
            <h3 class="sapatos-title" id="sapatos-fix-title" tabIndex={-1} data-sapatos-focus>
              {t('sapatos.stuckTitle', { name: persona.name })}
            </h3>
            {busy ? <p>{t('sapatos.busy', { name: persona.name })}</p> : <p>{reason}</p>}
            {voiceNote && <p>{t('sapatos.voiceNote')}</p>}
            <p class="sapatos-tries">{t('sapatos.tries', { n: game.fails, max: MAX_FAILS })}</p>
            <p>{t('sapatos.fixIntro', { n: game.fp })}</p>
            <FixGrid game={game} unmet={unmet} name={persona.name} onInstall={(id) => {
                sfx('fixApplied');
                setGame(install(game, id));
              }} />
            <div class="sapatos-actions">
              <Button variant="gold" data-sfx="kiosk" onClick={press}>
                {t('sapatos.tryAgain')}
                <Icon name="arrow-right" />
              </Button>
              <Button variant="secondary" onClick={() => resolveLeft(game, 'let-go')}>
                {t('sapatos.letGo', { name: persona.name })}
              </Button>
            </div>
          </section>
        )}
      </>
    );
  } else if (phase === 'result' && last) {
    const served = last.kind === 'served';
    const lessons = [...new Set(persona.barriers)].map((b) => barrierById(b).lesson);
    main = (
      <section class={`sapatos-card px-box sapatos-reveal sapatos-reveal--${served ? 'good' : 'bad'}`} aria-labelledby="sapatos-result-title" role="status">
        <h3 class="sapatos-title" id="sapatos-result-title" tabIndex={-1} data-sapatos-focus>
          {served ? t('sapatos.served', { name: persona.name }) : t('sapatos.leftTitle', { name: persona.name })}
        </h3>
        <p>{served ? persona.thanks : persona.left}</p>
        {served ? (
          <>
            <Stars n={last.stars} />
            <ul class="sapatos-points">
              <li>{t(last.via === 'counter' ? 'sapatos.pts.counter' : 'sapatos.pts.kiosk', { n: STAR_POINTS[last.stars] ?? 0 })}</li>
              {last.ready && <li>{t('sapatos.pts.ready', { n: READY_BONUS })}</li>}
              {last.shared.map((f) => (
                <li key={f}>{t('sapatos.pts.shared', { n: SHARED_BONUS, fix: fixById(f).name })}</li>
              ))}
            </ul>
            {last.via === 'counter' && <p>{t('sapatos.counterNote')}</p>}
          </>
        ) : (
          <p>{t(last.why === 'queue' ? 'sapatos.whyQueue' : last.why === 'fails' ? 'sapatos.whyFails' : 'sapatos.whyLetGo')}</p>
        )}
        <div>
          <p class="sapatos-lesson-title">{t('sapatos.lesson')}</p>
          <ul class="sapatos-lessons">
            {lessons.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <div>
          <Button variant="gold" data-sfx="none" onClick={next}>
            {finished(game) ? t('sapatos.seeResult') : t('sapatos.nextVisitor')}
            <Icon name="arrow-right" />
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div class="sapatos" ref={rootRef}>
      {hud}
      <div class="sapatos-grid">
        {side}
        <div class="sapatos-main">{main}</div>
      </div>
    </div>
  );
}

interface FixGridProps {
  game: Game;
  unmet: readonly BarrierId[];
  name: string;
  onInstall: (id: FixId) => void;
}

/** The fixes the player can install, in two groups: kiosk fixes and languages. Installed ones show their state as text. */
function FixGrid({ game, unmet, name, onInstall }: FixGridProps) {
  const card = (fix: Fix) => {
    const on = game.installed.includes(fix.id);
    const affordable = game.fp >= fix.cost;
    // the counter is the human fallback for anyone still stuck
    const useful = fix.id === 'counter' ? unmet.length > 0 : unmet.some((b) => barrierById(b).fixes.includes(fix.id));
    const status = on ? t('sapatos.fix.installed') : affordable ? t('sapatos.fix.install', { n: fix.cost }) : t('sapatos.fix.short', { n: fix.cost, have: game.fp });
    return (
      <li key={fix.id}>
        <button
          type="button"
          class={`sapatos-fix px-box${on ? ' is-on' : ''}${useful && !on ? ' is-useful' : ''}`}
          aria-disabled={on || !affordable}
          data-sfx="none"
          onClick={() => {
            if (!on && affordable) onInstall(fix.id);
          }}
        >
          <span class="sapatos-fix__head">
            <Icon name={on ? 'check' : fix.icon} size={20} />
            <span class="sapatos-fix__name">{fix.name}</span>
          </span>
          <span>{fix.what}</span>
          <span class="sapatos-fix__helps">{helpsLine(fix)}</span>
          <span class="sapatos-fix__status">
            {status}
            {useful && !on && ` · ${t('sapatos.fix.wouldHelp', { name })}`}
          </span>
        </button>
      </li>
    );
  };
  const core = FIXES.filter((f) => !f.id.startsWith('lang-'));
  const langs = FIXES.filter((f) => f.id.startsWith('lang-'));
  return (
    <div class="sapatos-fixes">
      <ul class="sapatos-fixlist">{core.map(card)}</ul>
      <h4 class="sapatos-fixgroup">{t('sapatos.fix.langs', { n: LANGS.length })}</h4>
      <ul class="sapatos-fixlist">{langs.map(card)}</ul>
    </div>
  );
}
