// Learn: the ten modules on a winding pixel road (docs/DESIGN.md section 11.3). Pick a module to see its details.
import { useState } from 'preact/hooks';
import { t, type StringKey } from '../app/i18n';
import { cardsDone, isUnlocked, modulesDone, moduleStars, nextModule, nodeState, type NodeState } from '../app/progress';
import { hrefFor } from '../app/router';
import { BADGES } from '../content/badges';
import { MODULES, MODULE_COUNT, type ModuleInfo } from '../content/modules';
import { hasContent } from '../modules/registry';
import { Ara } from '../ui/Ara';
import { Medal } from '../ui/Badge';
import { Icon } from '../ui/Icon';
import { Button, Chip, Dialog, Panel, ProgressBar } from '../ui/kit';
import { useMediaQuery } from '../ui/useMediaQuery';

const STATE_KEY = { done: 'learn.state.done', current: 'learn.state.current', locked: 'learn.state.locked' } as const satisfies Record<NodeState, StringKey>;

/** Row geometry shared with learn.css: node centres sit at these x positions (percent) and y offsets (px). */
const COLUMNS = 5;
const H_STEP = 56; // every second node drops by this much on the horizontal road
const H_TOP = 40; // node centre inside its row (4px padding + half the 64px tile + margin)
const V_ROW = 128; // row height of the vertical (phone) road
const V_TOP = 40;

type Pt = { x: number; y: number };

/** Stepped (right-angle) road through points: along one axis to the midpoint, across, then on. */
export function roadPath(points: readonly Pt[], axis: 'x' | 'y'): string {
  const [first, ...rest] = points;
  if (!first) return '';
  let d = `M${first.x} ${first.y}`;
  let prev = first;
  for (const p of rest) {
    d +=
      axis === 'x'
        ? ` H${(prev.x + p.x) / 2} V${p.y} H${p.x}`
        : ` V${(prev.y + p.y) / 2} H${p.x} V${p.y}`;
    prev = p;
  }
  return d;
}

function Road({ count, vertical }: { count: number; vertical: boolean }) {
  const slot = 100 / COLUMNS;
  const points: Pt[] = Array.from({ length: count }, (_, i) =>
    vertical ? { x: i % 2 === 0 ? 25 : 75, y: V_TOP + V_ROW * i } : { x: slot * i + slot / 2, y: H_TOP + (i % 2 === 0 ? 0 : H_STEP) },
  );
  const height = vertical ? V_ROW * count : H_TOP + H_STEP + 8;
  return (
    <svg class="road" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false" style={{ height: `${height}px` }}>
      <path d={roadPath(points, vertical ? 'y' : 'x')} />
    </svg>
  );
}

interface NodeProps {
  m: ModuleInfo;
  state: NodeState;
  selected: boolean;
  onPick: (id: string) => void;
}

function Node({ m, state, selected, onPick }: NodeProps) {
  return (
    <li class={`road-item road-item--${state}`}>
      <button
        type="button"
        class={`road-node road-node--${state}`}
        aria-pressed={selected}
        aria-current={state === 'current' ? 'step' : undefined}
        aria-label={t('learn.node', { n: m.n, title: m.title, state: t(STATE_KEY[state]) })}
        onClick={() => onPick(m.id)}
      >
        {state === 'current' && <Ara mood="wink" scale={2} decorative class="road-node__ara" />}
        <span class="road-node__tile" aria-hidden="true">
          {state === 'done' ? <Icon name="check" size={32} /> : state === 'locked' ? <Icon name="lock" size={32} /> : m.n}
        </span>
        <span class="road-node__label" aria-hidden="true">
          {m.short}
        </span>
      </button>
    </li>
  );
}

function Row({ group, selected, onPick }: { group: 'core' | 'more'; selected: string | null; onPick: (id: string) => void }) {
  const done = modulesDone.value;
  const mods = MODULES.filter((m) => m.group === group);
  const vertical = useMediaQuery('(max-width: 599px)');
  const headingId = `learn-${group}-h`;
  return (
    <section class="road-row" aria-labelledby={headingId}>
      <h3 class="panel-title" id={headingId}>
        {t(group === 'core' ? 'learn.core' : 'learn.more')}
      </h3>
      <div class={`road-wrap${mods.some((m) => nodeState(m, done) === 'current') ? ' road-wrap--ara' : ''}`}>
        <Road count={mods.length} vertical={vertical} />
        <ol class="road-list">
          {mods.map((m) => (
            <Node key={m.id} m={m} state={nodeState(m, done)} selected={selected === m.id} onPick={onPick} />
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Details for one module: status, topic, game, time, objectives, badge and the main action. */
function Details({ m, headingId }: { m: ModuleInfo; headingId: string }) {
  const done = modulesDone.value;
  const state = nodeState(m, done);
  const cards = Math.min(cardsDone.value[m.id] ?? 0, m.cards);
  const badge = BADGES.find((b) => b.id === `module-${m.id}`);
  const stars = moduleStars.value[m.id] ?? 0;
  const prev = MODULES[m.n - 2];
  const playable = hasContent(m.id);
  const cta = state === 'done' ? t('learn.replay') : cards > 0 ? t('home.continue') : t('home.start');
  return (
    <div class="stack details">
      <Chip kind={state === 'done' ? 'fact' : undefined}>{t('learn.kicker', { n: m.n, state: t(STATE_KEY[state]) })}</Chip>
      <h3 id={headingId} class="details__title">
        {m.title}
      </h3>
      <p>{m.topic}</p>
      <dl class="facts">
        <div>
          <dt>{t('learn.game')}</dt>
          <dd>
            <Icon name="arcade" size={24} /> {m.game}
          </dd>
        </div>
        <div>
          <dt>{t('learn.time')}</dt>
          <dd>{t('learn.minutes')}</dd>
        </div>
        {stars > 0 && (
          <div>
            <dt>{t('learn.bestStars')}</dt>
            <dd>{t('lesson.stars', { n: stars })}</dd>
          </div>
        )}
      </dl>
      <div>
        <p class="panel-title">{t('learn.objectives')}</p>
        <ul class="objectives">
          {m.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </div>
      {badge && (
        <div class="details__badge">
          <Medal earned={state === 'done'} size={64} />
          <p>
            <span class="panel-title">{t('learn.badge')}</span>
            <br />
            <strong>{badge.name}</strong> <span class="px-text-muted">({badge.english})</span>
          </p>
        </div>
      )}
      {state === 'current' && cards > 0 && (
        <ProgressBar value={cards} max={m.cards} label={t('home.cards')} text={t('home.cardsText', { done: cards, total: m.cards })} />
      )}
      {state === 'locked' ? (
        <p class="details__locked" role="status">
          <Icon name="lock" size={24} /> {t('learn.lockedText', { n: prev?.n ?? 1 })}
        </p>
      ) : playable ? (
        <div>
          <Button href={hrefFor(`/learn/${m.id}`)} variant="gold" large>
            {cta}
          </Button>
        </div>
      ) : (
        <p class="px-text-muted">{t('learn.soon')}</p>
      )}
    </div>
  );
}

export function Learn() {
  const done = modulesDone.value;
  const current = nextModule(done);
  const wide = useMediaQuery('(min-width: 1024px)');
  const sheet = useMediaQuery('(max-width: 599px)');
  const [picked, setPicked] = useState<string | null>(null);

  // Wide screens always show a module in the side panel (the current one until the player picks another).
  const shownId = picked ?? (wide ? (current ?? MODULES[MODULES.length - 1])?.id : null) ?? null;
  const shown = MODULES.find((m) => m.id === shownId) ?? null;
  const pick = (id: string) => setPicked(id);
  const unlocked = MODULES.filter((m) => isUnlocked(m, done)).length;

  return (
    <div class="grid-12 learn">
      <Panel class="learn__path span-8" aria-labelledby="learn-h">
        <div class="learn__head">
          <div class="stack">
            <h2 id="learn-h">{t('learn.heading')}</h2>
            <p>{t('learn.intro')}</p>
          </div>
          <Chip>{t('learn.doneCount', { done: done.length, total: MODULE_COUNT })}</Chip>
        </div>
        <p class="px-text-muted learn__hint">{t('learn.rule', { n: unlocked })}</p>
        <Row group="core" selected={shownId} onPick={pick} />
        <Row group="more" selected={shownId} onPick={pick} />
      </Panel>

      {wide ? (
        <Panel class="learn__details span-4" aria-labelledby="learn-details-h">
          {shown && <Details m={shown} headingId="learn-details-h" />}
        </Panel>
      ) : (
        <Dialog
          open={picked !== null}
          title={shown ? t('learn.dialogTitle', { n: shown.n }) : ''}
          onClose={() => setPicked(null)}
          class={sheet ? 'px-dialog--sheet' : undefined}
        >
          {shown && <Details m={shown} headingId="learn-dialog-h" />}
        </Dialog>
      )}
    </div>
  );
}
