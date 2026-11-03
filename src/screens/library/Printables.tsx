// Library > Printables: the PDF print kit (posters, cards, guides) as real download links, one language at a time.
// The files live in public/print/<lang>/ and are fetched only when tapped (never precached, like the videos).
import { useState } from 'preact/hooks';
import { t, type StringKey } from '../../app/i18n';
import { ALL_LANGUAGES, language } from '../../app/language';
import { defaultPrintLang, formatBytes, printLangs, printSheets } from '../../app/printables';
import { Icon } from '../../ui/Icon';
import { Button, Panel } from '../../ui/kit';

export function Printables() {
  const langs = ALL_LANGUAGES.filter((l) => printLangs().includes(l.code));
  const [lang, setLang] = useState<string>(defaultPrintLang(language.value) ?? 'en');
  const sheets = printSheets(lang);
  return (
    <div class="stack printables">
      <Panel class="printables__intro" aria-labelledby="printables-h">
        <div class="stack">
          <h2 id="printables-h">{t('library.printables.title')}</h2>
          <p>{sheets.length > 0 ? t('library.printables.text') : t('library.printables.none')}</p>
        </div>
      </Panel>
      {sheets.length > 0 && (
        <>
          <div class="printables__langs" role="group" aria-label={t('library.printables.lang')}>
            {langs.map((l) => (
              <button key={l.code} type="button" class="printables__lang px-box" aria-pressed={l.code === lang} onClick={() => setLang(l.code)}>
                {l.name}
              </button>
            ))}
          </div>
          <ul class="printables__grid" aria-labelledby="printables-h">
            {sheets.map((s) => {
              const title = t(`print.title.${s.id}` as StringKey);
              return (
                <li key={s.id}>
                  <article class="printables__card px-box">
                    <span class="printables__icon" aria-hidden="true">
                      <Icon name={s.id === 'komiks' || s.id === 'glossary' ? 'article' : 'print'} size={24} />
                    </span>
                    <h3 class="printables__title">{title}</h3>
                    <p class="printables__desc">{t(`print.desc.${s.id}` as StringKey)}</p>
                    <p class="printables__meta">
                      <span>{s.pages === 1 ? t('library.printables.page1') : t('library.printables.pages', { n: s.pages })}</span>
                      <span>{formatBytes(s.bytes)}</span>
                      {s.lang !== lang && <span>{t('library.printables.fallback')}</span>}
                    </p>
                    <Button href={s.href} download={`ARAW-${s.id}-${s.lang}.pdf`} aria-label={t('library.printables.get', { title })} variant="gold">
                      <Icon name="download" size={24} />
                      {t('library.printables.download')}
                    </Button>
                  </article>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
