// About the project: ARAW as AIKasalig's AI literacy app. The partner logo wall, the project story, quick facts and credits,
// then the app's own licences and version.
import { t, type StringKey } from '../app/i18n';
import { APP_VERSION } from '../app/report';
import { hrefFor } from '../app/router';
import { Panel } from '../ui/kit';
import { PartnerLogos } from '../ui/PartnerLogos';

const GLANCE: ReadonlyArray<[StringKey, StringKey]> = [
  ['about.glance.agency', 'about.glance.agencyValue'],
  ['about.glance.program', 'about.glance.programValue'],
  ['about.glance.project', 'about.glance.projectValue'],
  ['about.glance.duration', 'about.glance.durationValue'],
];

const SISTERS: readonly StringKey[] = ['about.sister.healthph', 'about.sister.advocaid', 'about.sister.bantay', 'about.sister.tala'];

const CREDITS: ReadonlyArray<[StringKey, StringKey]> = [
  ['about.credit.leader', 'about.credit.leaderValue'],
  ['about.credit.dev', 'about.credit.devValue'],
];

function Facts({ items }: { items: ReadonlyArray<[StringKey, StringKey]> }) {
  return (
    <dl class="about-facts">
      {items.map(([term, value]) => (
        <div key={term}>
          <dt>{t(term)}</dt>
          <dd>{t(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function About() {
  return (
    <div class="grid-12 about">
      <Panel class="span-12 about-head" aria-labelledby="about-h">
        <div class="card-band px-sunrise" aria-hidden="true" />
        <div class="stack">
          <span class="px-chip px-notch about-head__chip">{t('about.kicker')}</span>
          <h2 id="about-h" class="about-head__title">
            {t('about.heading')}
          </h2>
          <p class="about-head__lead">{t('about.lead')}</p>
          <PartnerLogos variant="wall" />
        </div>
      </Panel>

      <Panel class="span-8 about-story" aria-labelledby="about-aik-h">
        <div class="stack prose">
          <h3 id="about-aik-h">{t('about.aikasalig.title')}</h3>
          <p>{t('about.aikasalig.p1')}</p>
          <p>{t('about.aikasalig.p2')}</p>
          <p>{t('about.aikasalig.p3')}</p>
          <h3>{t('about.program.title')}</h3>
          <p>{t('about.program.p1')}</p>
          <h3>{t('about.araw.title')}</h3>
          <p>{t('about.araw.p1')}</p>
          <p>{t('about.araw.p2')}</p>
        </div>
      </Panel>

      <div class="span-4 about-side">
        <Panel class="about-card" aria-labelledby="about-glance-h">
          <div class="stack">
            <h3 class="panel-title" id="about-glance-h">
              {t('about.glance')}
            </h3>
            <Facts items={GLANCE} />
          </div>
        </Panel>
        <Panel class="about-card" aria-labelledby="about-sisters-h">
          <div class="stack">
            <h3 class="panel-title" id="about-sisters-h">
              {t('about.sisters')}
            </h3>
            <ul class="about-list">
              {SISTERS.map((key) => (
                <li key={key}>{t(key)}</li>
              ))}
            </ul>
          </div>
        </Panel>
        <Panel class="about-card" aria-labelledby="about-credits-h">
          <div class="stack">
            <h3 class="panel-title" id="about-credits-h">
              {t('about.credits')}
            </h3>
            <Facts items={CREDITS} />
          </div>
        </Panel>
      </div>

      <Panel class="span-8 about-app" aria-labelledby="about-app-h">
        <div class="stack prose">
          <h3 id="about-app-h">{t('about.app')}</h3>
          <p>{t('about.text')}</p>
          <p>
            <a href={hrefFor('/guide')}>{t('about.guide')}</a>
          </p>
          <h4 id="licences-h">{t('about.licences')}</h4>
          <ul class="licence-list" aria-labelledby="licences-h">
            <li>{t('about.licenceCode')}</li>
            <li>{t('about.licenceContent')}</li>
            <li>{t('about.licenceFonts')}</li>
            <li>{t('about.licenceIcons')}</li>
          </ul>
          <p>{t('about.fictional')}</p>
          <p class="px-text-muted">
            {t('about.version')}: ARAW {APP_VERSION}
          </p>
        </div>
      </Panel>
    </div>
  );
}
