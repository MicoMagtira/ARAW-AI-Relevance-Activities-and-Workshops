// Library > Myths (Kwentong Kalusugan): flip cards, filter by topic and trick, search (docs/DESIGN.md section 11.9).
import { useEffect, useId, useMemo, useState } from 'preact/hooks';
import { filterMyths } from '../../app/library';
import { t } from '../../app/i18n';
import { hrefFor, location$ } from '../../app/router';
import { MYTHS, MYTH_TOPICS, MYTH_TOPIC_LABELS, type Myth, type MythTopic } from '../../content/library/myths';
import { MODULES } from '../../content/modules';
import { VILLAINS, villainById, type VillainId } from '../../content/tactics';
import { Ara } from '../../ui/Ara';
import { Chip, Panel, SrHint, srDescribedBy } from '../../ui/kit';

interface ChoiceProps<T extends string> {
  label: string;
  allLabel: string;
  value: T | 'all';
  options: ReadonlyArray<{ id: T; label: string }>;
  onPick: (v: T | 'all') => void;
}

/** A group of toggle chips with one choice at a time; "All" clears it. */
function Choice<T extends string>({ label, allLabel, value, options, onPick }: ChoiceProps<T>) {
  const id = useId();
  return (
    <div class="lib-choice" role="group" aria-labelledby={id}>
      <p class="panel-title" id={id}>
        {label}
      </p>
      <div class="lib-choice__chips">
        <button type="button" class="lib-chip" aria-pressed={value === 'all'} onClick={() => onPick('all')}>
          {allLabel}
        </button>
        {options.map((o) => (
          <button key={o.id} type="button" class="lib-chip" aria-pressed={value === o.id} onClick={() => onPick(value === o.id ? 'all' : o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MythCard({ myth, flipped, onFlip }: { myth: Myth; flipped: boolean; onFlip: () => void }) {
  const mod = MODULES.find((m) => m.id === myth.module);
  const villain = villainById(myth.villain);
  const backId = `myth-back-${myth.id}`;
  return (
    <article class={`myth-flip px-box${flipped ? ' myth-flip--back' : ''}`} id={`myth-${myth.id}`}>
      <button
        type="button"
        class="myth-flip__front"
        aria-expanded={flipped}
        aria-controls={backId}
        aria-describedby={srDescribedBy('sr-myth-flip')}
        onClick={onFlip}
      >
        <Chip kind={flipped ? 'fact' : 'fake'}>{flipped ? t('myths.fact') : t('myths.front')}</Chip>
        <span class="card-title">{flipped ? `${t('myths.front')}: ${myth.myth}` : myth.myth}</span>
        <span class="px-text-muted">{flipped ? t('myths.flipBack') : t('myths.flip')}</span>
      </button>
      <div class="myth-flip__back" id={backId} hidden={!flipped}>
        {flipped && (
          <div class="stack myth-flip__flip">
            <p class="myth-flip__fact">{myth.fact}</p>
            <div>
              <p class="panel-title">{t('myths.why')}</p>
              <p>{myth.why}</p>
            </div>
            <div>
              <p class="panel-title">{t('myths.check')}</p>
              <p>{myth.check}</p>
            </div>
            <div class="myth-flip__meta">
              <Chip>{t('myths.trick', { name: villain.name })}</Chip>
              {mod && (
                <a class="text-link" href={hrefFor('/learn')}>
                  {t('myths.module', { n: mod.n, title: mod.short })}
                </a>
              )}
            </div>
            <p class="px-text-muted myth-flip__basis">{t('myths.basis', { basis: myth.basis })}</p>
          </div>
        )}
      </div>
    </article>
  );
}

export function Myths() {
  const linked = location$.value.query.myth;
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<MythTopic | 'all'>('all');
  const [villain, setVillain] = useState<VillainId | 'all'>('all');
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(() => new Set(linked && MYTHS.some((m) => m.id === linked) ? [linked] : []));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchId = useId();
  const bodyId = useId();

  const shown = useMemo(() => filterMyths(MYTHS, { query, topic, villain }), [query, topic, villain]);
  const active = (topic !== 'all' ? 1 : 0) + (villain !== 'all' ? 1 : 0);

  // Arriving from "Myth of the day": bring that card into view.
  useEffect(() => {
    if (linked) document.getElementById(`myth-${linked}`)?.scrollIntoView?.({ block: 'center' });
  }, [linked]);

  const toggle = (id: string) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const clear = () => {
    setQuery('');
    setTopic('all');
    setVillain('all');
  };
  const count = shown.length === 1 ? t('myths.countOne') : t('myths.count', { n: shown.length });

  return (
    <div class="lib-split">
      <Panel class="lib-filters" aria-labelledby="myths-h">
        <div class="stack">
          <div>
            <h2 id="myths-h">{t('myths.title')}</h2>
            <p class="px-text-muted">{t('myths.intro')}</p>
          </div>
          <div class="lib-search">
            <label class="panel-title" for={searchId}>
              {t('myths.search')}
            </label>
            <input id={searchId} class="px-input" type="search" value={query} placeholder={t('myths.searchHint')} autocomplete="off" onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
          </div>
          <button type="button" class="lib-filters__toggle px-btn px-btn--secondary px-notch" aria-expanded={filtersOpen} aria-controls={bodyId} onClick={() => setFiltersOpen(!filtersOpen)}>
            {active > 0 ? t('myths.filtersCount', { n: active }) : t('myths.filters')}
          </button>
          <div class={`lib-filters__body${filtersOpen ? ' lib-filters__body--open' : ''}`} id={bodyId}>
            <Choice
              label={t('myths.topic')}
              allLabel={t('myths.topicAll')}
              value={topic}
              options={MYTH_TOPICS.map((id) => ({ id, label: MYTH_TOPIC_LABELS[id] }))}
              onPick={setTopic}
            />
            <Choice label={t('myths.villain')} allLabel={t('myths.villainAll')} value={villain} options={VILLAINS.map((v) => ({ id: v.id, label: v.name }))} onPick={setVillain} />
            {(active > 0 || query) && (
              <div>
                <button type="button" class="lib-chip lib-chip--clear" onClick={clear}>
                  {t('myths.clear')}
                </button>
              </div>
            )}
          </div>
        </div>
      </Panel>

      <div class="lib-results">
        <p class="px-text-muted lib-count" role="status">
          {count}
        </p>
        {shown.length === 0 ? (
          <Panel class="lib-empty" as="div">
            <Ara mood="think" scale={4} />
            <p>{t('myths.empty')}</p>
          </Panel>
        ) : (
          <ul class="lib-grid" aria-label={t('myths.title')}>
            {shown.map((m) => (
              <li key={m.id}>
                <MythCard myth={m} flipped={flipped.has(m.id)} onFlip={() => toggle(m.id)} />
              </li>
            ))}
          </ul>
        )}
        <SrHint id="sr-myth-flip">{t('myths.sr.flip')}</SrHint>
      </div>
    </div>
  );
}
