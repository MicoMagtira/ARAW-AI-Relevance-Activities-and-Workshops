// Arcade (docs/SPEC.md sections 5 and 7, DESIGN section 11): today's featured game, the 11 endless games with a
// details panel (a bottom sheet on phones and tablets), and the Practice row. Each game opens on its own route.
import { useRef, useState } from 'preact/hooks';
import { dailyGame, manilaDate } from '../app/daily';
import { t } from '../app/i18n';
import { arcadeReady, modulesDone } from '../app/progress';
import { hrefFor } from '../app/router';
import { bestScores } from '../app/scores';
import { ARCADE_GAMES, type GameInfo } from '../content/games';
import { MODULES } from '../content/modules';
import { hasContent } from '../modules/registry';
import { AraSays } from '../ui/AraBubble';
import { Icon } from '../ui/Icon';
import { Button, Chip, Dialog, Panel } from '../ui/kit';
import { useMediaQuery } from '../ui/useMediaQuery';
import '../styles/arcade.css';

type Status = 'ready' | 'locked' | 'soon';

const moduleNumber = (id: string | null): number => MODULES.find((m) => m.id === id)?.n ?? 0;
const moduleShort = (id: string | null): string => MODULES.find((m) => m.id === id)?.short ?? '';

function statusOf(g: GameInfo, done: readonly string[]): Status {
  if (g.module && !done.includes(g.module)) return 'locked';
  return g.playable ? 'ready' : 'soon';
}

const score = (n: number): string => n.toLocaleString('en-US');

/** Short status shown on a tile: best score, "New", the unlocking module, or "Coming soon". */
function statusText(g: GameInfo, status: Status): string {
  if (status === 'locked') return t('arcade.afterNamed', { n: moduleNumber(g.module), name: moduleShort(g.module) });
  if (status === 'soon') return t('arcade.soon');
  const best = bestScores.value[g.slug] ?? 0;
  return best > 0 ? t('arcade.best', { n: score(best) }) : t('arcade.new');
}

function Featured({ game, status, stacked }: { game: GameInfo; status: Status; stacked: boolean }) {
  // A locked module game that has shipped can still be tried once a day from here ("Trial run").
  const trial = status === 'locked' && game.playable;
  return (
    <Panel class="arcade-featured span-12" aria-labelledby="arcade-featured-h">
      <AraSays mood="happy" scale={stacked ? 3 : 4} side={stacked ? 'top' : 'left'} class="arcade-featured__ara">
        <p class="panel-title">{t('arcade.featured')}</p>
        <h2 id="arcade-featured-h">{game.name}</h2>
        <p>{game.topic}</p>
        <p class="px-text-muted">{trial ? t('arcade.trialNote', { n: moduleNumber(game.module) }) : t('arcade.featuredText')}</p>
        <div>
          {game.playable ? (
            <Button href={hrefFor(`/arcade/${game.slug}`, { seed: 'daily' })} variant="gold" large>
              <Icon name="play" />
              {trial ? t('arcade.trial') : t('arcade.playDaily')}
            </Button>
          ) : (
            <Chip>{t('arcade.soon')}</Chip>
          )}
        </div>
      </AraSays>
    </Panel>
  );
}

function Tile({ game, status, selected, wide, onPick }: { game: GameInfo; status: Status; selected: boolean; wide: boolean; onPick: () => void }) {
  const label = statusText(game, status);
  return (
    <li>
      <button
        type="button"
        class={`arcade-tile px-box${selected ? ' is-selected' : ''}${status === 'ready' ? '' : ' is-quiet'}`}
        aria-pressed={wide ? selected : undefined}
        aria-haspopup={wide ? undefined : 'dialog'}
        aria-label={t('arcade.tileLabel', { name: game.name, topic: game.topic, status: label })}
        data-sfx={status === 'locked' ? 'locked' : wide ? 'select' : 'none'}
        onClick={onPick}
      >
        <span class="arcade-tile__icon" aria-hidden="true">
          <Icon name={status === 'locked' ? 'lock' : game.icon} size={48} />
        </span>
        <span class="arcade-tile__text">
          <span class="arcade-tile__name">{game.name}</span>
          <span class="arcade-tile__topic">{game.topic}</span>
        </span>
        <span class={`arcade-tile__status${status === 'ready' ? ' is-ready' : ''}`} aria-hidden="true">
          {label}
        </span>
      </button>
    </li>
  );
}

function Details({ game, headingId }: { game: GameInfo; headingId: string }) {
  const status = statusOf(game, modulesDone.value);
  const best = bestScores.value[game.slug] ?? 0;
  return (
    <div class="stack details arcade-details">
      <Chip kind={status === 'ready' ? 'fact' : undefined}>{status === 'ready' ? t('arcade.kicker') : statusText(game, status)}</Chip>
      <h3 id={headingId} class="details__title">
        {game.name}
      </h3>
      <p>
        <span class="panel-title">{t('arcade.topic')}</span>
        <br />
        {game.topic}
      </p>
      <p>{game.how}</p>
      {status === 'ready' && (
        <>
          {best > 0 && <p class="arcade-details__best">{t('arcade.best', { n: score(best) })}</p>}
          <div class="arcade-details__ara">
            <AraSays mood="happy" scale={2}>
              <p>{t('arcade.briefing')}</p>
            </AraSays>
          </div>
          <div>
            <Button href={hrefFor(`/arcade/${game.slug}`)} variant="gold" large>
              <Icon name="play" />
              {t('arcade.play')}
            </Button>
          </div>
        </>
      )}
      {status === 'locked' && (
        <p class="details__locked" role="status">
          <Icon name="lock" size={24} /> {t('arcade.lockedText', { n: moduleNumber(game.module) })}
        </p>
      )}
      {status === 'soon' && <p class="px-text-muted">{t('arcade.soonText')}</p>}
    </div>
  );
}

function Practice() {
  const done = modulesDone.value;
  return (
    <Panel class="arcade-practice" aria-labelledby="arcade-practice-h">
      <div class="stack">
        <h2 id="arcade-practice-h">{t('arcade.practice')}</h2>
        <p>{t('arcade.practiceText')}</p>
        <div class="arcade-fof">
          <div class="stack">
            <h3>{t('arcade.fof')}</h3>
            <p>{t('arcade.fofText')}</p>
          </div>
          <div>
            <Button href={hrefFor('/play/fact-or-fake')} variant="gold">
              {t('arcade.fofPlay')}
            </Button>
          </div>
        </div>
        <ul class="arcade-replays" aria-label={t('arcade.replays')}>
          {MODULES.filter((m) => m.group === 'core').map((m) => {
            const open = done.includes(m.id) && hasContent(m.id);
            return (
              <li key={m.id} class="arcade-replay">
                <span class="arcade-replay__name">{m.game}</span>
                {open ? (
                  <a class="text-link" href={hrefFor(`/learn/${m.id}`)}>
                    {t('arcade.replay', { n: m.n, game: m.game })}
                  </a>
                ) : (
                  <span class="px-text-muted arcade-replay__lock">
                    <Icon name="lock" size={24} /> {t('arcade.after', { n: m.n })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}

export function Arcade() {
  const done = modulesDone.value;
  const wide = useMediaQuery('(min-width: 1024px)');
  const sheet = useMediaQuery('(max-width: 599px)');
  const featured = dailyGame(manilaDate());
  const [picked, setPicked] = useState<string | null>(null);
  const lastPicked = useRef<string | null>(null);
  if (picked) lastPicked.current = picked;

  // Wide screens always show a game in the side panel (today's featured one until the player picks another).
  const shownSlug = picked ?? (wide ? featured.slug : lastPicked.current);
  const shown = ARCADE_GAMES.find((g) => g.slug === shownSlug) ?? null;
  const ready = arcadeReady(done);

  return (
    <div class="grid-12 arcade">
      <Featured game={featured} status={statusOf(featured, done)} stacked={sheet} />

      <div class="arcade__main span-8">
        <Panel class="arcade-games" aria-labelledby="arcade-h">
          <div class="arcade-games__head">
            <div class="stack">
              <h2 id="arcade-h">{t('arcade.heading')}</h2>
              <p>{t('arcade.sub')}</p>
            </div>
            <Chip>{t('arcade.ready', { ready, total: ARCADE_GAMES.length })}</Chip>
          </div>
          <ul class="arcade-grid">
            {ARCADE_GAMES.map((g) => (
              <Tile key={g.slug} game={g} status={statusOf(g, done)} selected={shownSlug === g.slug} wide={wide} onPick={() => setPicked(g.slug)} />
            ))}
          </ul>
        </Panel>
        <Practice />
      </div>

      {wide ? (
        <Panel class="arcade__details span-4" aria-labelledby="arcade-details-h">
          {shown && <Details game={shown} headingId="arcade-details-h" />}
        </Panel>
      ) : (
        <Dialog open={picked !== null} title={t('arcade.dialogTitle')} onClose={() => setPicked(null)} class={sheet ? 'px-dialog--sheet' : undefined}>
          {shown && <Details game={shown} headingId="arcade-dialog-h" />}
        </Dialog>
      )}
    </div>
  );
}
