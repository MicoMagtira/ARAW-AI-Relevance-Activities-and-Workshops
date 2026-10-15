import { t } from '../app/i18n';
import { profile, streak, xp } from '../app/state';
import { Chip, Panel, ProgressBar } from '../ui/kit';

export function Home() {
  return (
    <div class="grid-12">
      <Panel class="span-8" aria-labelledby="home-h">
        <div class="soon__band px-sunrise" aria-hidden="true" />
        <div class="stack">
          <Chip>{t('soon.kicker')}</Chip>
          <h2 id="home-h">{t('home.greeting', { name: profile.value.nickname })}</h2>
          <p>{t('home.intro')}</p>
          <p class="px-text-muted">{t('home.soon')}</p>
        </div>
      </Panel>
      <Panel class="span-4" aria-labelledby="stats-h">
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
              <dt>{t('home.badges')}</dt>
              <dd>0 / 20</dd>
            </div>
          </dl>
          <ProgressBar value={0} max={10} label={t('home.modules')} text={t('home.modulesText', { done: 0, total: 10 })} />
        </div>
      </Panel>
    </div>
  );
}
