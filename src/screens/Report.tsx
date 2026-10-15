import { useState } from 'preact/hooks';
import { t } from '../app/i18n';
import { location$ } from '../app/router';
import { APP_VERSION, REPORT_CATEGORIES, REPORT_EMAIL, buildMailto, cleanField, describeDevice, type ReportCategoryId } from '../app/report';
import { AraSays } from '../ui/AraBubble';
import { Button, Panel, SrHint, srDescribedBy } from '../ui/kit';
import { Icon } from '../ui/Icon';

export function Report() {
  const [category, setCategory] = useState<ReportCategoryId>('bug');
  const [details, setDetails] = useState('');
  const query = location$.value.query;
  const screen = cleanField(query.screen) || 'home';
  const item = cleanField(query.item) || undefined;
  const device = describeDevice(navigator.userAgent);
  const href = buildMailto({ category, screen, item, details, device });

  return (
    <div class="grid-12 report-grid">
      <Panel class="span-7" aria-labelledby="report-h">
        <div class="stack">
          <h2 id="report-h">{t('report.title')}</h2>
          <SrHint id="sr-category">{t('sr.category')}</SrHint>
          <div class="report-cats" role="group" aria-labelledby="report-h" aria-describedby={srDescribedBy('sr-category')}>
            {REPORT_CATEGORIES.map((c) => (
              <Button key={c.id} variant="secondary" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                {t(c.labelKey)}
              </Button>
            ))}
          </div>
          <div class="field">
            <label class="px-label" for="report-details">
              {t('report.details')}
            </label>
            <textarea
              id="report-details"
              class="px-input"
              maxLength={1000}
              aria-describedby="report-details-hint"
              value={details}
              onInput={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
            />
            <p class="px-text-muted" id="report-details-hint">
              {t('report.detailsHint')}
            </p>
          </div>
          <p class="px-text-muted">{t('report.privacy')}</p>
          <div>
            <Button href={href} variant="gold" large>
              <Icon name="mail" />
              {t('report.send')}
            </Button>
          </div>
          <p class="px-text-muted">{t('report.noMail', { email: REPORT_EMAIL })}</p>
        </div>
      </Panel>
      <div class="span-5 stack">
        <Panel aria-labelledby="auto-h">
          <div class="stack">
            <h3 class="panel-title" id="auto-h">
              {t('report.auto')}
            </h3>
            <dl class="preview-list">
              <dt>{t('report.screen')}</dt>
              <dd>{screen}</dd>
              <dt>{t('report.item')}</dt>
              <dd>{item || t('report.none')}</dd>
              <dt>{t('report.app')}</dt>
              <dd>ARAW {APP_VERSION}</dd>
              <dt>{t('report.device')}</dt>
              <dd>{device}</dd>
            </dl>
          </div>
        </Panel>
        <AraSays mood="happy" scale={3}>
          <p>{t('report.thanks')}</p>
        </AraSays>
      </div>
    </div>
  );
}
