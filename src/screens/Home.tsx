import { useState } from 'preact/hooks';
import { dailyGame, greetingKey, manilaDate, manilaDayLabel, mythOfTheDay } from '../app/daily';
import { t, type StringKey } from '../app/i18n';
import { arcadeReady, badgesEarned, cardsDone, modulesDone, nextModule, nodeState, type NodeState } from '../app/progress';
import { hrefFor } from '../app/router';
import { displayName, streak, xp } from '../app/state';
import { BADGES, BADGE_TOTAL } from '../content/badges';
import { ARCADE_GAMES } from '../content/games';
import { MODULES, MODULE_COUNT } from '../content/modules';
import { hasContent } from '../modules/registry';
import { AraSays } from '../ui/AraBubble';
import { Medal } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Button, Panel, ProgressBar, SrHint, srDescribedBy } from '../ui/kit';

const STATE_KEY = { done: 'home.pathDone', current: 'home.pathCurrent', locked: 'home.pathLocked' } as const satisfies Record<NodeState, StringKey>;

function Hero() {
  const done = modulesDone.value;
  const next = nextModule(done);
  const cards = next ? Math.min(cardsDone.value[next.id] ?? 0, next.cards) : 0;
  const now = new Date();
  const intro = !next ? t('home.intro.done') : done.length === 0 && cards === 0 ? t('home.intro.start') : t('home.intro.next', { n: next.n });

  return (
    <Panel class="home-hero" aria-labelledby="home-h">
      <AraSays mood="happy" scale={6} class="home-hero__ara">
        <h2 id="home-h">{t(greetingKey(now.getHours()), { name: displayName() })}</h2>
        <p>{intro}</p>
      </AraSays>
      <div class="continue">
        {next ? (
          <>
            <p class="panel-title">{t('home.continueKicker', { n: next.n, total: MODULE_COUNT })}</p>
            <h3 class="continue__title">{next.title}</h3>
            <ProgressBar value={cards} max={next.cards} label={t('home.cards')} text={t('home.cardsText', { done: cards, total: next.cards })} />
            <div>
              <Button href={hrefFor(hasContent(next.id) ? `/learn/${next.id}` : '/learn')} variant="gold" large aria-describedby={srDescribedBy('sr-continue')}>
                {cards > 0 ? t('home.continue') : t('home.start')}
              </Button>
              <SrHint id="sr-continue">{t('sr.continue')}</SrHint>
            </div>
          </>
        ) : (
          <>
            <p class="panel-title">{t('home.allDoneKicker')}</p>
            <h3 class="continue__title">{t('home.intro.done')}</h3>
            <div>
              <Button href={hrefFor('/learn')} variant="gold" large>
                {t('home.replay')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}

function Stats() {
  const done = modulesDone.value.length;
  return (
    <Panel class="home-stats" aria-labelledby="stats-h">
      <div class="stack">
        <h3 class="panel-title" id="stats-h">
          {t('home.stats')}
        </h3>
        <dl class="stat-list">
          <div>
            <dt>{t('hud.xp')}</dt>
            <dd>{xp.value}</dd>
          </div>
          <div>
            <dt>{t('home.streak')}</dt>
            <dd>{streak.value.current}</dd>
          </div>
          <div>
            <dt>{t('home.streakBest')}</dt>
            <dd>{streak.value.best}</dd>
          </div>
          <div>
            <dt>{t('home.badges')}</dt>
            <dd>{t('home.badgesText', { n: badgesEarned.value.length, total: BADGE_TOTAL })}</dd>
          </div>
        </dl>
        <ProgressBar value={done} max={MODULE_COUNT} label={t('home.modules')} text={t('home.modulesText', { done, total: MODULE_COUNT })} />
      </div>
    </Panel>
  );
}

function Daily({ now }: { now: Date }) {
  const game = dailyGame(manilaDate(now));
  return (
    <Panel class="home-daily" aria-labelledby="daily-h">
      <div class="card-band px-sunrise" aria-hidden="true" />
      <div class="stack">
        <h3 class="panel-title" id="daily-h">
          {t('home.daily', { date: manilaDayLabel(now) })}
        </h3>
        <p class="card-title">{t('home.dailyGame', { game: game.name })}</p>
        <p class="px-text-muted">{t('home.dailySoon')}</p>
        <div>
          <span class="px-chip px-notch daily-soon">{t('home.dailySoonChip')}</span>
        </div>
      </div>
    </Panel>
  );
}

function Myth({ now }: { now: Date }) {
  const myth = mythOfTheDay(manilaDate(now));
  const [flipped, setFlipped] = useState(false);
  const [flips, setFlips] = useState(0);
  const flip = () => {
    setFlipped((f) => !f);
    setFlips((n) => n + 1);
  };
  return (
    <section class="home-myth" aria-labelledby="myth-h">
      <button
        type="button"
        class={`myth-card px-box${flipped ? ' myth-card--back' : ''}`}
        aria-pressed={flipped}
        aria-describedby={srDescribedBy('sr-myth')}
        onClick={flip}
      >
        <span class="panel-title" id="myth-h">
          {t('home.myth')}
        </span>
        <span class={`myth-card__faces${flips > 0 ? ' myth-card__faces--flip' : ''}`} key={flips}>
          <span class="myth-card__face" hidden={flipped} aria-hidden={flipped ? 'true' : undefined}>
            <span class="px-chip px-chip--fake px-notch">{t('home.mythLabel')}</span>
            <span class="card-title">{myth.myth}</span>
          </span>
          <span class="myth-card__face" hidden={!flipped} aria-hidden={flipped ? undefined : 'true'}>
            <span class="px-chip px-chip--fact px-notch">{t('home.mythFact')}</span>
            <span class="myth-card__fact">{myth.fact}</span>
          </span>
        </span>
        <span class="px-text-muted">{t('home.mythFlip')}</span>
      </button>
      <SrHint id="sr-myth">{t('sr.mythCard')}</SrHint>
      <a class="text-link" href={hrefFor('/library/myths', { myth: myth.id })}>
        {t('home.mythMore')}
      </a>
    </section>
  );
}

function ArcadeCard() {
  const ready = arcadeReady(modulesDone.value);
  return (
    <Panel class="home-arcade" aria-labelledby="arcade-h">
      <div class="stack">
        <h3 class="panel-title" id="arcade-h">
          {t('home.arcade')}
        </h3>
        <p class="card-title">{ready > 0 ? t('home.arcadeReady', { ready, total: ARCADE_GAMES.length }) : t('home.arcadeSoon', { total: ARCADE_GAMES.length })}</p>
        <p class="px-text-muted">{t('home.arcadeText')}</p>
        <div>
          <Button href={hrefFor('/arcade')} variant="secondary">
            {t('home.arcadeOpen')}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function Path() {
  const done = modulesDone.value;
  return (
    <Panel class="home-path" aria-labelledby="path-h">
      <div class="home-path__head">
        <h3 id="path-h">{t('home.path')}</h3>
        <a class="text-link" href={hrefFor('/learn')}>
          {t('home.pathAll')}
        </a>
      </div>
      <ol class="path">
        {MODULES.map((m) => {
          const state = nodeState(m, done);
          return (
            <li key={m.id}>
              <a class={`path-node path-node--${state}`} href={hrefFor('/learn')} aria-current={state === 'current' ? 'step' : undefined}>
                <span class="path-node__tile" aria-hidden="true">
                  {state === 'done' ? <Icon name="check" /> : state === 'locked' ? <Icon name="lock" /> : m.n}
                </span>
                <span class="sr-only">{t('home.pathNode', { n: m.n, state: t(STATE_KEY[state]) })}</span>
                <span class="path-node__label">{m.short}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

function BadgeStrip() {
  const earned = badgesEarned.value;
  const latest = BADGES.filter((b) => earned.includes(b.id)).reverse().slice(0, 6);
  const upcoming = BADGES.filter((b) => !earned.includes(b.id)).slice(0, 4);
  const shown = latest.length > 0 ? latest : upcoming;
  return (
    <Panel class="home-badges" aria-labelledby="badges-h">
      <div class="home-path__head">
        <h3 id="badges-h">{t('home.badgeStrip')}</h3>
        <a class="text-link" href={hrefFor('/me')}>
          {t('home.badgeSeeAll')}
        </a>
      </div>
      {latest.length === 0 && <p class="px-text-muted">{t('home.badgeNone')}</p>}
      <ul class="badge-strip" aria-label={latest.length > 0 ? t('home.badgeLatest') : t('home.badgeNext')}>
        {shown.map((b) => {
          const has = earned.includes(b.id);
          return (
            <li key={b.id} class="badge-strip__item">
              <Medal earned={has} size={64} />
              <span class="badge-strip__name">{b.name}</span>
              <span class="sr-only">{has ? t('me.badgeEarned') : t('me.badgeLocked')}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function Home() {
  const now = new Date();
  return (
    <div class="home-grid">
      <Hero />
      <Stats />
      <Daily now={now} />
      <Myth now={now} />
      <ArcadeCard />
      <Path />
      <BadgeStrip />
    </div>
  );
}
