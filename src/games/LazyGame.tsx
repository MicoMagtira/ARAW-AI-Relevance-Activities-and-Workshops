// Route entry for an arcade game (`#/arcade/<slug>`): the shell and the game only download when the player opens it.
import type { ComponentChildren, ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { manilaDate } from '../app/daily';
import { t } from '../app/i18n';
import { modulesDone } from '../app/progress';
import { hrefFor } from '../app/router';
import { ARCADE_GAMES } from '../content/games';
import { MODULES } from '../content/modules';
import { Icon } from '../ui/Icon';
import { Button, Panel } from '../ui/kit';
import { dailySeed } from './engine/rng';
import type { GameDef } from './engine/types';
import { DOM_GAME_LOADERS, GAME_LOADERS, hasGame, type DomGameProps } from './registry';

type Shell = typeof import('./engine/GameShell').GameShell;

interface Props {
  slug: string;
  /** Query `seed`: "daily" for today's seed, or any text for a fixed seed. */
  seed?: string;
  /** Query `break`: seconds of play before the break overlay. Only the test game honours it. */
  breakSeconds?: string;
}

function Frame({ title, daily, children }: { title: string; daily?: boolean; children: ComponentChildren }) {
  return (
    <div class="lesson game-frame">
      <header class="lesson-bar">
        <Button href={hrefFor(daily ? '/daily' : '/arcade')} icon variant="secondary" aria-label={daily ? t('game.closeDaily') : t('game.close')}>
          <Icon name="close" />
        </Button>
        <p class="lesson-bar__title" title={title}>
          {title}
        </p>
        <Button href={hrefFor('/report', { screen: 'arcade' })} icon variant="secondary" aria-label={t('report.flag')}>
          <Icon name="flag" />
        </Button>
      </header>
      <main class="lesson-main" id="main" tabIndex={-1}>
        <h1 class="sr-only">{title}</h1>
        {children}
      </main>
    </div>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <Frame title={title}>
      <Panel class="lesson-notice" aria-labelledby="game-notice-h">
        <div class="stack">
          <h2 id="game-notice-h">{title}</h2>
          <p>{text}</p>
          <div>
            <Button href={hrefFor('/arcade')} variant="gold">
              {t('game.quit')}
            </Button>
          </div>
        </div>
      </Panel>
    </Frame>
  );
}

export function LazyGame({ slug, seed, breakSeconds }: Props) {
  const info = ARCADE_GAMES.find((g) => g.slug === slug);
  const daily = seed === 'daily';
  const locked = !!info?.module && !modulesDone.value.includes(info.module) && !daily;
  const runnable = hasGame(slug) && (info === undefined || info.playable) && !locked;
  const [loaded, setLoaded] = useState<{ Shell: Shell; game: GameDef } | null>(null);
  const [dom, setDom] = useState<{ slug: string; View: ComponentType<DomGameProps> } | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!runnable) return;
    let live = true;
    setFailed(false);
    const domLoader = DOM_GAME_LOADERS[slug];
    if (domLoader) {
      domLoader().then(
        (mod) => live && setDom({ slug, View: mod.default }),
        () => live && setFailed(true),
      );
      return () => {
        live = false;
      };
    }
    const loader = GAME_LOADERS[slug];
    if (!loader) return;
    Promise.all([import('./engine/GameShell'), loader()]).then(
      ([shell, mod]) => live && setLoaded({ Shell: shell.GameShell, game: mod.default }),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [slug, runnable, attempt]);

  if (!info && !hasGame(slug)) return <Notice title={t('game.unknown')} text={t('game.unknownText')} />;
  if (locked && info?.module) {
    const mod = MODULES.find((m) => m.id === info.module);
    return <Notice title={info.name} text={t('game.locked', { n: mod?.n ?? 0 })} />;
  }
  if (!runnable) return <Notice title={info?.name ?? t('game.unknown')} text={t('game.soonText')} />;

  if (dom && dom.slug === slug) {
    return (
      <Frame title={info?.name ?? slug} daily={daily}>
        <dom.View seed={daily ? dailySeed(manilaDate()) : seed || undefined} daily={daily} />
      </Frame>
    );
  }
  if (loaded && loaded.game.slug === slug) {
    const fixedSeed = daily ? dailySeed(manilaDate()) : seed || undefined;
    const breakAfterMs = slug === 'demo' && breakSeconds && Number(breakSeconds) > 0 ? Number(breakSeconds) * 1000 : undefined;
    return <loaded.Shell game={loaded.game} seed={fixedSeed} daily={daily} breakAfterMs={breakAfterMs} />;
  }
  const title = info?.name ?? slug;
  return (
    <Frame title={title} daily={daily}>
      {failed ? (
        <div class="stack">
          <p>{t('lesson.gameError')}</p>
          <div>
            <Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>
              {t('lesson.retry')}
            </Button>
          </div>
        </div>
      ) : (
        <p class="lesson-loading" role="status">
          {t('lesson.loading')}
        </p>
      )}
    </Frame>
  );
}
