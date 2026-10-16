// The standard frame around every arcade game (docs/SPEC.md section 5): top bar, canvas stage, HUD, pause,
// How to play, first-run briefing, "Pahinga muna!" break, game over with Ara's recap and XP, and a text description
// of the game state. A game only supplies a GameDef; the shell owns the loop, the canvas and the input.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../../app/i18n';
import { hrefFor } from '../../app/router';
import { bestScores, briefingsSeen, markBriefingSeen, recordRun, type RunResult } from '../../app/scores';
import { settings } from '../../app/settings';
import { araSay, sfx } from '../../app/sound';
import { useLater } from '../../app/sound/useLater';
import { Ara } from '../../ui/Ara';
import { Confetti } from '../../ui/Confetti';
import { Icon } from '../../ui/Icon';
import { Button, Chip, Dialog, Meter, Panel } from '../../ui/kit';
import '../../styles/game.css';
import { Briefing } from './Briefing';
import { PALETTE, loadPixelFont, sunrise, text } from './draw';
import { createInput, type InputController } from './input';
import { createLoop, type Loop } from './loop';
import { createRng, randomSeed } from './rng';
import { attachCanvas, toLogical, type CanvasFit } from './scale';
import { BREAK_AFTER_MS, sessionClock } from './session';
import type { GameDef, GameInstance, GameStats, HudStat } from './types';

type Phase = 'briefing' | 'intro' | 'playing' | 'paused' | 'break' | 'over';

interface Props {
  game: GameDef;
  /** Fixed seed for every run (the Daily Challenge). Without it each run gets its own random seed. */
  seed?: string;
  /** True for today's featured game: shows a "same for everyone" note. */
  daily?: boolean;
  /** Test hook: play time (ms) before the break overlay. Defaults to 10 minutes. */
  breakAfterMs?: number;
}

interface View {
  hud: readonly HudStat[];
  description: string;
  recap: readonly string[];
  score: number;
}

const EMPTY_VIEW: View = { hud: [], description: '', recap: [], score: 0 };
/** How often the loop reads the game's stats for the HUD, game-over and description checks. */
const STATS_EVERY_MS = 100;
/** The text description only changes this often, so screen readers are not flooded. */
const DESCRIBE_EVERY_MS = 1000;

const formatScore = (n: number): string => n.toLocaleString('en-US');

export function GameShell({ game, seed: fixedSeed, daily, breakAfterMs }: Props) {
  const [phase, setPhaseState] = useState<Phase>(() => (briefingsSeen.value.includes(game.slug) ? 'intro' : 'briefing'));
  const [view, setView] = useState<View>(EMPTY_VIEW);
  const [result, setResult] = useState<RunResult | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [quitAsk, setQuitAsk] = useState(false);
  const [status, setStatus] = useState('');

  const phaseRef = useRef<Phase>(phase);
  const returnTo = useRef<Phase>('intro');
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<GameInstance | null>(null);
  const inputRef = useRef<InputController | null>(null);
  const loopRef = useRef<Loop | null>(null);
  const seedRef = useRef('');
  const howOpenRef = useRef(false);
  const lastDescribe = useRef({ at: 0, text: '' });
  const lastHud = useRef('');
  const later = useLater();

  const setPhase = (next: Phase) => {
    phaseRef.current = next;
    inputRef.current?.setEnabled(next === 'playing'); // right away, so no key press right after Start is lost
    setPhaseState(next);
  };
  const openHow = (open: boolean) => {
    howOpenRef.current = open;
    setHowOpen(open);
  };

  /** Draw the current frame (or the title backdrop when no run exists). Safe to call any time. */
  const paint = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, game.width, game.height);
    if (instanceRef.current) {
      instanceRef.current.draw(ctx);
    } else {
      sunrise(ctx, game.width, game.height);
      text(ctx, game.name.toUpperCase(), game.width / 2, game.height * 0.3, { size: Math.max(8, Math.round(game.width / 24)), color: PALETTE.navy, align: 'center' });
    }
  };

  /** Copy the game's stats into the view. The description is throttled unless `force`. */
  const refresh = (force: boolean): GameStats | null => {
    const inst = instanceRef.current;
    if (!inst) return null;
    const stats = inst.stats();
    const hudKey = stats.hud.map((s) => s.value).join('|');
    const now = performance.now();
    const describe = force || (stats.description !== lastDescribe.current.text && now - lastDescribe.current.at >= DESCRIBE_EVERY_MS);
    if (!force && !describe && hudKey === lastHud.current) return stats;
    lastHud.current = hudKey;
    if (describe) lastDescribe.current = { at: now, text: stats.description };
    setView((v) => ({ hud: stats.hud, description: describe ? stats.description : v.description, recap: stats.over ? stats.recap : v.recap, score: stats.score }));
    return stats;
  };

  const start = () => {
    const seed = fixedSeed ?? randomSeed();
    seedRef.current = seed;
    instanceRef.current = game.create({ seed, rng: createRng(seed), cue: sfx });
    lastDescribe.current = { at: 0, text: '' };
    lastHud.current = '';
    inputRef.current?.clear();
    setResult(null);
    later.clear();
    refresh(true);
    setStatus(t('game.announce.started', { name: game.name }));
    setPhase('playing');
  };

  /** `quiet` when a dialog opens right after (it plays its own sound). */
  const pause = (quiet = false) => {
    if (phaseRef.current !== 'playing') return;
    if (!quiet) sfx('close');
    setStatus(t('game.announce.paused'));
    setPhase('paused');
  };
  const resume = () => {
    if (phaseRef.current !== 'paused' && phaseRef.current !== 'break') return;
    sfx('open');
    setStatus(t('game.announce.resumed'));
    setPhase('playing');
  };

  // Canvas fit and input live as long as the shell does
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    sessionClock.limitMs = breakAfterMs ?? BREAK_AFTER_MS;
    const fit: CanvasFit = attachCanvas(canvas, stage, game.width, game.height, () => paint());
    const input = createInput(canvas, (cx, cy) => toLogical(cx, cy, canvas.getBoundingClientRect(), game.width, game.height));
    inputRef.current = input;
    input.setEnabled(phaseRef.current === 'playing');
    let alive = true;
    void loadPixelFont().then(() => alive && paint()); // redraw once the pixel font is ready
    paint();

    const onVisibility = () => {
      if (document.hidden) pause(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || howOpenRef.current) return;
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (phaseRef.current === 'playing') pause();
        else if (phaseRef.current === 'paused') resume();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onKey);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKey);
      loopRef.current?.stop();
      input.destroy();
      inputRef.current = null;
      fit.destroy();
      sessionClock.limitMs = BREAK_AFTER_MS;
    };
  }, [game, breakAfterMs]);

  // The loop runs only while playing
  useEffect(() => {
    inputRef.current?.setEnabled(phase === 'playing');
    if (phase !== 'playing') {
      paint();
      return;
    }
    const inst = instanceRef.current;
    const input = inputRef.current;
    if (!inst || !input) return;
    let lastStats = 0;
    const loop: Loop = createLoop({
      update(ms) {
        inst.step(ms, input.frame());
        if (sessionClock.add(ms)) {
          loop.stop();
          refresh(true);
          setStatus(t('game.announce.break'));
          setPhase('break');
        }
      },
      render() {
        paint();
        const now = performance.now();
        if (now - lastStats < STATS_EVERY_MS) return;
        lastStats = now;
        const stats = refresh(false);
        if (stats?.over) {
          loop.stop();
          const run = recordRun(game.slug, stats.score, game.goodRun, !!daily);
          sfx(run.goodRun ? 'complete' : 'xp');
          later(run.goodRun ? 1400 : 600, () => araSay(run.goodRun ? t('game.goodRun') : t('game.over'), run.goodRun ? 'wow' : 'think'));
          refresh(true);
          setResult(run);
          setStatus(t('game.announce.over', { score: formatScore(run.score) }));
          setPhase('over');
        }
      },
    });
    loopRef.current = loop;
    loop.start();
    return () => {
      loop.stop();
      if (loopRef.current === loop) loopRef.current = null;
    };
  }, [phase]);

  const breakMinutes = Math.max(1, sessionClock.minutes);
  const best = bestScores.value[game.slug] ?? 0;
  const closeHref = hrefFor(daily ? '/daily' : '/arcade');
  const quitLabel = daily ? t('game.quitDaily') : t('game.quit');
  const playing = phase === 'playing';
  const overlay = phase !== 'playing';

  const askQuit = () => {
    if (phaseRef.current === 'playing') pause(true);
    if (phaseRef.current === 'paused' || phaseRef.current === 'break') setQuitAsk(true);
    else {
      sfx('back');
      window.location.hash = closeHref;
    }
  };

  const openHowToPlay = () => {
    if (phaseRef.current === 'playing') pause(true);
    openHow(true);
  };

  const watchBriefing = () => {
    openHow(false);
    returnTo.current = phaseRef.current === 'briefing' ? 'intro' : phaseRef.current;
    setPhase('briefing');
  };

  const finishBriefing = (startNow: boolean) => {
    markBriefingSeen(game.slug);
    if (startNow && returnTo.current !== 'paused' && returnTo.current !== 'break') start();
    else setPhase(returnTo.current === 'briefing' ? 'intro' : returnTo.current);
    returnTo.current = 'intro';
  };

  const keepPlaying = () => {
    sessionClock.reset();
    resume();
  };

  return (
    <div class="lesson game-frame">
      <header class="lesson-bar">
        <Button icon variant="secondary" aria-label={t('game.close')} data-sfx="none" onClick={askQuit}>
          <Icon name="close" />
        </Button>
        <p class="lesson-bar__title" title={game.name}>
          {game.name}
        </p>
        <Button href={hrefFor('/report', { screen: 'game', item: game.slug })} icon variant="secondary" aria-label={t('game.report', { name: game.name })}>
          <Icon name="flag" />
        </Button>
      </header>

      <main class="lesson-main game-main" id="main" tabIndex={-1}>
        <h1 class="sr-only">{game.name}</h1>
        <div class="game-layout">
          <div class="game-stage-wrap">
            <div
              class="game-stage px-box"
              ref={stageRef}
              style={{ '--ar': `${game.width} / ${game.height}`, '--arw': game.width, '--arh': game.height } as Record<string, string | number>}
              data-overlay={overlay ? phase : undefined}
            >
              <canvas
                ref={canvasRef}
                class="game-canvas"
                role="img"
                aria-label={playing && view.description ? view.description : t('game.canvas', { name: game.name })}
              />
              {phase === 'briefing' && (
                <Overlay>
                  <Briefing
                    pages={game.briefing}
                    onStart={() => finishBriefing(true)}
                    onSkip={() => finishBriefing(false)}
                    startLabel={returnTo.current === 'paused' || returnTo.current === 'break' ? t('game.resume') : undefined}
                  />
                </Overlay>
              )}
              {phase === 'intro' && (
                <Overlay>
                  <Panel class="game-card" aria-labelledby="game-card-h">
                    <Ara mood="happy" scale={5} decorative />
                    <h2 id="game-card-h">{game.name}</h2>
                    {daily && <Chip kind="streak">{t('game.daily')}</Chip>}
                    {best > 0 ? <p class="px-text-muted">{t('game.bestLine', { n: formatScore(best) })}</p> : <p class="px-text-muted">{t('game.noBest')}</p>}
                    <div class="game-card__actions">
                      <Button variant="gold" large data-autofocus data-sfx="start" onClick={start}>
                        <Icon name="play" />
                        {t('game.start')}
                      </Button>
                      <Button variant="secondary" onClick={openHowToPlay}>
                        {t('game.howTo')}
                      </Button>
                    </div>
                  </Panel>
                </Overlay>
              )}
              {phase === 'paused' && (
                <Overlay>
                  <Panel class="game-card" aria-labelledby="game-card-h">
                    <h2 id="game-card-h">{t('game.paused')}</h2>
                    <div class="game-card__actions game-card__actions--col">
                      <Button variant="gold" large data-autofocus data-sfx="none" onClick={resume}>
                        <Icon name="play" />
                        {t('game.resume')}
                      </Button>
                      <Button variant="secondary" onClick={openHowToPlay}>
                        {t('game.howTo')}
                      </Button>
                      <Button variant="secondary" data-sfx="start" onClick={start}>
                        {t('game.restart')}
                      </Button>
                      <Button variant="secondary" href={closeHref}>
                        {quitLabel}
                      </Button>
                    </div>
                  </Panel>
                </Overlay>
              )}
              {phase === 'break' && (
                <Overlay>
                  <Panel class="game-card game-card--break" aria-labelledby="game-card-h">
                    <Ara mood="happy" scale={5} decorative />
                    <h2 id="game-card-h">{t('game.break.title')}</h2>
                    <p>{t('game.break.recap', { min: breakMinutes, score: formatScore(view.score) })}</p>
                    <p>{t('game.break.stretch')}</p>
                    <div class="game-card__actions">
                      <Button variant="gold" large data-autofocus data-sfx="none" onClick={keepPlaying}>
                        {t('game.break.continue')}
                      </Button>
                      <Button variant="secondary" href={closeHref} onClick={() => sessionClock.reset()}>
                        {t('game.break.done')}
                      </Button>
                    </div>
                  </Panel>
                </Overlay>
              )}
              {phase === 'over' && result && (
                <Overlay>
                  {result.newBest && <Confetti />}
                  <Panel class="game-card game-card--over" aria-labelledby="game-card-h">
                    <Ara mood={result.goodRun ? 'wow' : 'think'} scale={4} decorative />
                    <h2 id="game-card-h">{result.goodRun ? t('game.goodRun') : t('game.over')}</h2>
                    <p class="game-card__score">
                      <span class="px-label">{t('game.score')}</span> {formatScore(result.score)}
                    </p>
                    <p class="game-card__chips">
                      <Chip kind="xp">
                        <Icon name="xp-star" size={16} />
                        {t('game.xp', { n: result.xp })}
                      </Chip>
                      {result.newBest ? <Chip kind="fact">{t('game.newBest')}</Chip> : <Chip>{t('game.bestLine', { n: formatScore(result.best) })}</Chip>}
                    </p>
                    <section class="game-recap" aria-labelledby="game-recap-h">
                      <h3 id="game-recap-h">{t('game.recap')}</h3>
                      <ul>
                        {view.recap.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      <p class="game-trust">{game.takeaway}</p>
                    </section>
                    <div class="game-card__actions">
                      <Button variant="gold" large data-autofocus data-sfx="start" onClick={start}>
                        {t('game.again')}
                      </Button>
                      <Button variant="secondary" href={closeHref}>
                        {quitLabel}
                      </Button>
                    </div>
                  </Panel>
                </Overlay>
              )}
            </div>
          </div>

          <aside class="game-side" aria-label={t('game.panel')}>
            {view.hud.length > 0 && <Hud stats={view.hud} />}
            <div class="game-side__buttons">
              <Button variant="secondary" data-sfx="none" disabled={phase !== 'playing' && phase !== 'paused'} onClick={phase === 'paused' ? resume : () => pause()}>
                <Icon name={phase === 'paused' ? 'play' : 'clock'} />
                {phase === 'paused' ? t('game.resume') : t('game.pause')}
              </Button>
              <Button variant="secondary" onClick={openHowToPlay}>
                <Icon name="info" />
                {t('game.howTo')}
              </Button>
            </div>
            <p class="px-text-muted game-side__keys">
              <span class="game-keys--kb">{t('game.keys')}</span>
              <span class="game-keys--touch">{t('game.touch')}</span>
            </p>
            <section class="game-state" aria-labelledby="game-state-h">
              <h2 id="game-state-h" class="px-label">
                {t('game.state')}
              </h2>
              <p>{view.description || t('game.stateIdle')}</p>
              <Button variant="secondary" onClick={() => setStatus(view.description || t('game.stateIdle'))}>
                {t('game.read')}
              </Button>
            </section>
          </aside>
        </div>
        <p class="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </main>

      <Dialog
        open={howOpen}
        title={t('game.howTo')}
        onClose={() => openHow(false)}
        actions={
          <>
            <Button variant="secondary" onClick={watchBriefing}>
              {t('game.briefing.replay')}
            </Button>
            <Button variant="gold" onClick={() => openHow(false)}>
              {t('dialog.close')}
            </Button>
          </>
        }
      >
        <ul class="game-howto">
          {game.howTo.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p class="px-text-muted">
          <span class="game-keys--kb">{t('game.keys')}</span>
          <span class="game-keys--touch">{t('game.touch')}</span>
        </p>
        {settings.value.srHints && <p class="sr-hint">{t('game.srHint')}</p>}
      </Dialog>

      <Dialog
        open={quitAsk}
        title={t('game.quitTitle')}
        onClose={() => setQuitAsk(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setQuitAsk(false)}>
              {t('game.keepPlaying')}
            </Button>
            <Button variant="gold" href={closeHref}>
              {quitLabel}
            </Button>
          </>
        }
      >
        <p>{t('game.quitText')}</p>
      </Dialog>
    </div>
  );
}

/** Covers the stage; moves focus to the panel's main button (marked data-autofocus) when it appears. */
function Overlay({ children }: { children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const target = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>('h2');
    target?.focus({ preventScroll: true });
  }, []);
  return (
    <div class="game-overlay" ref={ref}>
      {children}
    </div>
  );
}

function Hud({ stats }: { stats: readonly HudStat[] }) {
  return (
    <ul class="game-hud px-box" aria-label={t('game.hud')}>
      {stats.map((s) => (
        <li key={s.id} class="game-hud__item">
          {s.meter !== undefined ? (
            <Meter value={s.meter} label={s.label} />
          ) : s.hearts ? (
            <>
              <span class="game-hud__label px-label">{s.label}</span>
              <span class="game-hud__hearts" role="img" aria-label={`${s.label}: ${s.value}`}>
                {Array.from({ length: s.hearts.max }, (_, i) => (
                  <Icon key={i} name={i < (s.hearts?.n ?? 0) ? 'heart-solid' : 'heart'} size={24} class={i < (s.hearts?.n ?? 0) ? '' : 'is-lost'} />
                ))}
              </span>
            </>
          ) : (
            <>
              <span class="game-hud__label px-label">{s.label}</span>
              <span class="game-hud__value">{s.value}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
