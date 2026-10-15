// Library > Ara's Diksyunaryo: search, A to Z index and term cards (docs/DESIGN.md section 11.9).
import { useId, useMemo, useState } from 'preact/hooks';
import { ALPHABET, filterGlossary, groupByLetter } from '../../app/library';
import { t } from '../../app/i18n';
import { hrefFor } from '../../app/router';
import { GLOSSARY } from '../../content/library/glossary';
import { MODULES } from '../../content/modules';
import { Ara } from '../../ui/Ara';
import { Panel } from '../../ui/kit';

function jumpTo(letter: string): void {
  const el = document.getElementById(`gl-${letter}`);
  el?.scrollIntoView?.({ block: 'start' });
  el?.focus({ preventScroll: true });
}

export function Glossary() {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const groups = useMemo(() => groupByLetter(filterGlossary(GLOSSARY, query)), [query]);
  const total = groups.reduce((n, g) => n + g.terms.length, 0);
  const have = new Set(groups.map((g) => g.letter));

  return (
    <div class="lib-split lib-split--glossary">
      <Panel class="lib-filters" aria-labelledby="glossary-h">
        <div class="stack">
          <div>
            <h2 id="glossary-h">{t('glossary.title')}</h2>
            <p class="px-text-muted">{t('glossary.intro')}</p>
          </div>
          <div class="lib-search">
            <label class="panel-title" for={searchId}>
              {t('glossary.search')}
            </label>
            <input id={searchId} class="px-input" type="search" value={query} placeholder={t('glossary.searchHint')} autocomplete="off" onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
          </div>
          <nav aria-label={t('glossary.index')}>
            <ul class="az">
              {ALPHABET.map((letter) => (
                <li key={letter}>
                  <button type="button" class="az__btn" disabled={!have.has(letter)} aria-label={t('glossary.jump', { letter })} onClick={() => jumpTo(letter)}>
                    {letter}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Panel>

      <div class="lib-results">
        <p class="px-text-muted lib-count" role="status">
          {total === 1 ? t('glossary.countOne') : t('glossary.count', { n: total })}
        </p>
        {total === 0 ? (
          <Panel class="lib-empty" as="div">
            <Ara mood="think" scale={4} />
            <p>{t('glossary.empty')}</p>
          </Panel>
        ) : (
          groups.map((g) => (
            <section key={g.letter} class="gl-group" aria-labelledby={`gl-${g.letter}`}>
              <h3 class="gl-letter px-box" id={`gl-${g.letter}`} tabIndex={-1}>
                {g.letter}
              </h3>
              <ul class="lib-grid">
                {g.terms.map((term) => {
                  const mod = MODULES.find((m) => m.id === term.module);
                  return (
                    <li key={term.id}>
                      <article class="gl-card px-box">
                        <h4 class="gl-card__term">{term.term}</h4>
                        <p>{term.meaning}</p>
                        <p class="gl-card__example">{term.example}</p>
                        {mod && (
                          <a class="text-link" href={hrefFor('/learn')}>
                            {t('glossary.seen', { n: mod.n, title: mod.short })}
                          </a>
                        )}
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
