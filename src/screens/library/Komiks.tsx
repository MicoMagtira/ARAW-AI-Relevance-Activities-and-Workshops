// Library > Komiks: episode list (locked until its module is done) and the panel reader (docs/DESIGN.md section 11.9).
// Panels are pixel SVG scenes drawn from the content descriptors; every word is real text and there is a full transcript.
import { useEffect, useRef, useState } from 'preact/hooks';
import { episodeUnlocked, parseEpisode, stepPanel, swipeStep } from '../../app/library';
import { t } from '../../app/i18n';
import { komiksRead, markKomiksRead, modulesDone } from '../../app/progress';
import { hrefFor, location$ } from '../../app/router';
import { KOMIKS, KOMIKS_CAST_NAMES, KOMIKS_SEASON_TITLE, type KomiksEpisode, type KomiksPanel } from '../../content/library/komiks';
import { MODULES } from '../../content/modules';
import { Ara } from '../../ui/Ara';
import { Icon } from '../../ui/Icon';
import { KomiksScene } from '../../ui/komiks/Scene';
import { Button, Chip, Panel, SrHint, Stamp, srDescribedBy } from '../../ui/kit';
import { useWindowKey } from '../../ui/useWindowKey';

const moduleOf = (ep: KomiksEpisode) => MODULES.find((m) => m.id === ep.module);

/* ---------- one panel ---------- */
function PanelView({ panel }: { panel: KomiksPanel }) {
  return (
    <figure class="kpanel">
      {panel.caption && <figcaption class="kpanel__caption">{panel.caption}</figcaption>}
      <div class="kpanel__art px-box">
        <KomiksScene panel={panel} />
      </div>
      {(panel.screen || panel.bubbles.length > 0) && (
        <div class="kpanel__words">
          {panel.screen && (
            <div class="kscreen px-box" role="group" aria-label={t('komiks.screen')}>
              <p class="kscreen__author">{panel.screen.author}</p>
              <p class="kscreen__text">{panel.screen.text}</p>
              {panel.screen.fake && <Stamp />}
            </div>
          )}
          {panel.bubbles.length > 0 && (
            <ul class="kbubbles">
              {panel.bubbles.map((b, i) => (
                <li key={i} class={`kbubble kbubble--${b.kind}`}>
                  <span class="kbubble__who">
                    {KOMIKS_CAST_NAMES[b.speaker]}
                    {b.kind === 'think' && ` ${t('komiks.thinks')}`}
                  </span>
                  <span class="kbubble__text">{b.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </figure>
  );
}

/* ---------- the reader ---------- */
function Reader({ ep }: { ep: KomiksEpisode }) {
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const total = ep.panels.length;
  const panel = ep.panels[index] as KomiksPanel;
  const last = index === total - 1;
  const done = modulesDone.value;
  const next = KOMIKS.find((e) => e.n === ep.n + 1);
  const nextOpen = next ? episodeUnlocked(next, done) : false;

  const go = (delta: number) => setIndex((i) => stepPanel(i, delta, total));

  useEffect(() => {
    if (last) markKomiksRead(ep.id);
  }, [last, ep.id]);

  useWindowKey((e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    // Arrow keys already mean something inside the tab strip and form fields.
    if (e.target instanceof Element && e.target.closest('input, textarea, select, [role="tablist"]')) return;
    go(e.key === 'ArrowRight' ? 1 : -1);
    e.preventDefault();
  });

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    touch.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const step = swipeStep(e.clientX - start.x, e.clientY - start.y);
    if (step !== 0) go(step);
  };

  return (
    <Panel class="reader" aria-labelledby="reader-h">
      <div class="stack">
        <header class="reader__head">
          <a class="text-link reader__back" href={hrefFor('/library/komiks')}>
            <Icon name="arrow-left" size={16} /> {t('komiks.backToList')}
          </a>
          <p class="panel-title">{t('komiks.episode', { n: ep.n })}</p>
          <h2 id="reader-h" tabIndex={-1}>
            {ep.title}
          </h2>
        </header>

        <div class="reader__stage" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (touch.current = null)} aria-describedby={srDescribedBy('sr-reader')}>
          <PanelView panel={panel} key={index} />
        </div>
        <SrHint id="sr-reader">{t('komiks.sr.reader')}</SrHint>
        <p class="sr-only" role="status">
          {t('komiks.panel', { n: index + 1, total })}
        </p>

        <div class="reader__nav">
          <Button variant="secondary" onClick={() => go(-1)} aria-disabled={index === 0}>
            <Icon name="arrow-left" size={16} /> {t('komiks.prev')}
          </Button>
          <ol class="reader__steps" aria-label={t('komiks.panels.nav')}>
            {ep.panels.map((_, i) => (
              <li key={i}>
                <button type="button" class="reader__step" aria-label={t('komiks.goTo', { n: i + 1 })} aria-current={i === index ? 'step' : undefined} onClick={() => setIndex(i)}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>
          <Button variant="gold" onClick={() => go(1)} aria-disabled={last}>
            {t('komiks.next')} <Icon name="arrow-right" size={16} />
          </Button>
        </div>
        <p class="px-text-muted reader__hint">
          {t('komiks.panel', { n: index + 1, total })} · {t('komiks.hint')}
        </p>

        {last && (
          <div class="reader__end px-box">
            <Ara mood="happy" scale={3} />
            <div class="stack">
              <p class="card-title">{t('komiks.end', { n: ep.n })}</p>
              {next && nextOpen ? (
                <div>
                  <Button href={hrefFor(`/library/komiks/${next.n}`)} variant="gold">
                    {t('komiks.nextEp')}: {next.title}
                  </Button>
                </div>
              ) : next ? (
                <p>{t('komiks.endLocked', { n: next.n })}</p>
              ) : null}
              <div>
                <Button href={hrefFor('/library/komiks')} variant="secondary">
                  {t('komiks.backToList')}
                </Button>
              </div>
            </div>
          </div>
        )}

        <details class="reader__transcript">
          <summary>{t('komiks.transcript')}</summary>
          <ol>
            {ep.panels.map((p, i) => (
              <li key={i}>
                <p class="panel-title">{t('komiks.panel', { n: i + 1, total })}</p>
                <p>{p.alt}</p>
                {p.caption && (
                  <p>
                    <strong>{t('komiks.caption')}:</strong> {p.caption}
                  </p>
                )}
                {p.screen && (
                  <p>
                    <strong>{t('komiks.screen')}</strong> ({p.screen.author}): {p.screen.text}
                    {p.screen.fake && ' [ARAW GAME · FAKE]'}
                  </p>
                )}
                {p.bubbles.map((b, j) => (
                  <p key={j}>
                    <strong>
                      {KOMIKS_CAST_NAMES[b.speaker]} {b.kind === 'think' ? t('komiks.thinks') : t('komiks.says')}:
                    </strong>{' '}
                    {b.text}
                  </p>
                ))}
              </li>
            ))}
          </ol>
        </details>
      </div>
    </Panel>
  );
}

/* ---------- the list ---------- */
function EpisodeCard({ ep, unlocked, read, selected }: { ep: KomiksEpisode; unlocked: boolean; read: boolean; selected: boolean }) {
  const mod = moduleOf(ep);
  const body = (
    <>
      <span class="ep-card__tile" aria-hidden="true">
        {unlocked ? ep.n : <Icon name="lock" />}
      </span>
      <span class="ep-card__text">
        <span class="panel-title">{t('komiks.episode', { n: ep.n })}</span>
        <span class="ep-card__title">{ep.title}</span>
        <span class="px-text-muted">{unlocked ? ep.summary : t('komiks.locked', { n: mod?.n ?? ep.n })}</span>
        <span class="ep-card__chip">
          {unlocked ? (
            read ? (
              <Chip kind="fact">{t('komiks.read')}</Chip>
            ) : (
              <Chip kind="fake">{t('komiks.new')}</Chip>
            )
          ) : (
            <Chip>
              <Icon name="lock" size={16} />
              <span class="sr-only">{t('komiks.locked', { n: mod?.n ?? ep.n })}</span>
            </Chip>
          )}
        </span>
      </span>
    </>
  );
  return unlocked ? (
    <a class={`ep-card px-box${selected ? ' ep-card--selected' : ''}`} href={hrefFor(`/library/komiks/${ep.n}`)} aria-current={selected ? 'page' : undefined}>
      {body}
    </a>
  ) : (
    <div class="ep-card ep-card--locked px-box">{body}</div>
  );
}

export function Komiks() {
  const segment = location$.value.segments[2];
  const n = parseEpisode(segment);
  const ep = n === null ? undefined : KOMIKS.find((e) => e.n === n);
  const done = modulesDone.value;
  const read = komiksRead.value;
  const unlockedCount = KOMIKS.filter((e) => episodeUnlocked(e, done)).length;
  const reading = segment !== undefined;
  const lockedMod = ep && !episodeUnlocked(ep, done) ? moduleOf(ep) : undefined;
  const headRef = useRef<HTMLDivElement>(null);

  // Opening an episode moves focus to it, so keyboard and screen reader users land on the reader.
  useEffect(() => {
    if (reading) headRef.current?.querySelector<HTMLElement>('h2')?.focus();
  }, [segment]);

  return (
    <div class={`komiks${reading ? ' komiks--reading' : ''}`}>
      <Panel class="komiks__list" aria-labelledby="komiks-h">
        <div class="stack">
          <div>
            <h2 id="komiks-h">{KOMIKS_SEASON_TITLE}</h2>
            <p class="px-text-muted">{t('komiks.intro')}</p>
            <p class="panel-title">{t('komiks.unlockedCount', { done: unlockedCount, total: KOMIKS.length })}</p>
          </div>
          <nav aria-label={t('komiks.list')}>
            <ol class="ep-list">
              {KOMIKS.map((e) => (
                <li key={e.id}>
                  <EpisodeCard ep={e} unlocked={episodeUnlocked(e, done)} read={read.includes(e.id)} selected={ep?.id === e.id} />
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </Panel>

      <div class="komiks__reader" ref={headRef} role="region" aria-label={t('komiks.reader')}>
        {ep && !lockedMod ? (
          <Reader ep={ep} key={ep.id} />
        ) : (
          <Panel class="komiks__note" aria-labelledby="komiks-note-h">
            <div class="stack">
              <a class="text-link reader__back" href={hrefFor('/library/komiks')}>
                <Icon name="arrow-left" size={16} /> {t('komiks.backToList')}
              </a>
              <Ara mood={lockedMod ? 'think' : 'happy'} scale={4} />
              {lockedMod && ep ? (
                <>
                  <h2 id="komiks-note-h" tabIndex={-1}>
                    {t('komiks.lockedTitle', { n: ep.n })}
                  </h2>
                  <p>{t('komiks.lockedText', { n: lockedMod.n, title: lockedMod.title })}</p>
                  <div>
                    <Button href={hrefFor('/learn')} variant="gold">
                      {t('komiks.goLearn')}
                    </Button>
                  </div>
                </>
              ) : segment !== undefined ? (
                <>
                  <h2 id="komiks-note-h" tabIndex={-1}>
                    {t('komiks.missing')}
                  </h2>
                </>
              ) : (
                <>
                  <h2 id="komiks-note-h">{t('komiks.pick')}</h2>
                  <p>{unlockedCount === 0 ? t('komiks.pickLocked') : t('komiks.pickText')}</p>
                </>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
