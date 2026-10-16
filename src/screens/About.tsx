import { t } from '../app/i18n';
import { APP_VERSION } from '../app/report';
import { hrefFor } from '../app/router';
import { Panel } from '../ui/kit';

export function About() {
  return (
    <div class="grid-12">
      <Panel class="span-8" aria-labelledby="about-h">
        <div class="stack prose">
          <h2 id="about-h">{t('about.title')}</h2>
          <p>{t('app.tagline')}</p>
          <p>{t('about.text')}</p>
          <p>
            <a href={hrefFor('/guide')}>{t('about.guide')}</a>
          </p>
          <h3 id="licences-h">{t('about.licences')}</h3>
          <ul class="licence-list" aria-labelledby="licences-h">
            <li>{t('about.licenceCode')}</li>
            <li>{t('about.licenceContent')}</li>
            <li>{t('about.licenceFonts')}</li>
            <li>{t('about.licenceIcons')}</li>
          </ul>
          <p>{t('about.fictional')}</p>
          <p class="px-text-muted">{t('app.credit')}</p>
          <p class="px-text-muted">{t('app.createdBy')}</p>
          <p class="px-text-muted">ARAW {APP_VERSION}</p>
        </div>
      </Panel>
    </div>
  );
}
