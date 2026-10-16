import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '../app/i18n';
import { location$ } from '../app/router';
import {
  APP_VERSION,
  MAX_DETAILS,
  REPORT_CATEGORIES,
  REPORT_EMAIL,
  REPORT_ENDPOINT,
  buildGmailUrl,
  buildMailto,
  buildReportText,
  cleanField,
  describeDevice,
  sendReport,
  type ReportCategoryId,
  type ReportInput,
} from '../app/report';
import { AraSays } from '../ui/AraBubble';
import { Button, Panel, SrHint, srDescribedBy } from '../ui/kit';
import { Icon } from '../ui/Icon';

type SendStatus = 'idle' | 'sending' | 'sent' | 'failed' | 'unavailable';
type CopyStatus = 'idle' | 'copied' | 'manual';

/** Route component: uses the build-time relay URL (VITE_REPORT_ENDPOINT). */
export function Report() {
  return <ReportView endpoint={REPORT_ENDPOINT} />;
}

interface ReportViewProps {
  /** Relay URL; empty hides the Send button and leaves the fallbacks. */
  endpoint: string;
}

export function ReportView({ endpoint }: ReportViewProps) {
  const [category, setCategory] = useState<ReportCategoryId>('bug');
  const [details, setDetails] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<SendStatus>('idle');
  const [copy, setCopy] = useState<CopyStatus>('idle');
  const sentHeading = useRef<HTMLHeadingElement>(null);
  const copyBox = useRef<HTMLTextAreaElement>(null);

  const query = location$.value.query;
  const screen = cleanField(query.screen) || 'home';
  const item = cleanField(query.item) || undefined;
  const device = describeDevice(navigator.userAgent);
  const input: ReportInput = { category, screen, item, details, device };
  const canSend = endpoint.trim() !== '';

  useEffect(() => {
    if (status === 'sent') sentHeading.current?.focus();
  }, [status]);

  useEffect(() => {
    if (copy !== 'manual' || !copyBox.current) return;
    copyBox.current.focus();
    copyBox.current.select();
  }, [copy]);

  const onSend = async (e: Event) => {
    e.preventDefault();
    if (!canSend || status === 'sending') return;
    setStatus('sending');
    setStatus(await sendReport(input, { endpoint, honeypot }));
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText(input));
      setCopy('copied');
    } catch {
      setCopy('manual');
    }
  };

  const reset = () => {
    setDetails('');
    setCopy('idle');
    setStatus('idle');
  };

  const statusText =
    status === 'sending' ? t('report.sending') : status === 'failed' ? t('report.failed') : status === 'unavailable' ? t('report.offline') : '';
  const copyText =
    copy === 'copied' ? t('report.copied', { email: REPORT_EMAIL }) : copy === 'manual' ? t('report.copyManual', { email: REPORT_EMAIL }) : '';

  const auto = (
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
  );

  if (status === 'sent') {
    return (
      <div class="grid-12 report-grid">
        <Panel class="span-7" aria-labelledby="report-sent-h">
          <div class="stack">
            <h2 id="report-sent-h" tabIndex={-1} ref={sentHeading}>
              {t('report.sentTitle')}
            </h2>
            <AraSays mood="happy" scale={3} live>
              <p>{t('report.sentText')}</p>
            </AraSays>
            <div class="report-actions">
              <Button variant="gold" onClick={reset}>
                <Icon name="flag" />
                {t('report.another')}
              </Button>
              <Button href="#/" variant="secondary">
                <Icon name="home" />
                {t('report.home')}
              </Button>
            </div>
          </div>
        </Panel>
        <div class="span-5 stack">{auto}</div>
      </div>
    );
  }

  return (
    <div class="grid-12 report-grid">
      <Panel class="span-7" aria-labelledby="report-h">
        <div class="stack">
          <form class="stack" onSubmit={onSend} noValidate>
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
                maxLength={MAX_DETAILS}
                aria-describedby="report-details-hint"
                value={details}
                onInput={(e) => setDetails((e.target as HTMLTextAreaElement).value)}
              />
              <p class="px-text-muted" id="report-details-hint">
                {t('report.detailsHint')}
              </p>
            </div>
            {/* Honeypot: hidden from people and screen readers; the relay rejects reports where a bot filled it in. */}
            <div class="report-hp" aria-hidden="true" inert>
              <label for="report-website">{t('report.honeypot')}</label>
              <input
                id="report-website"
                name="website"
                type="text"
                tabIndex={-1}
                autocomplete="off"
                value={honeypot}
                onInput={(e) => setHoneypot((e.target as HTMLInputElement).value)}
              />
            </div>
            <p class="px-text-muted">{t('report.privacy')}</p>
            {canSend ? (
              <div>
                <Button type="submit" variant="gold" large disabled={status === 'sending'}>
                  <Icon name="mail" />
                  {status === 'sending' ? t('report.sending') : t('report.send')}
                </Button>
              </div>
            ) : (
              <p class="report-note">{t('report.noRelay', { email: REPORT_EMAIL })}</p>
            )}
            <p class={statusText && status !== 'sending' ? 'report-note report-note--warn' : 'report-status'} role="status" aria-live="polite">
              {statusText}
            </p>
          </form>
          <section class="stack report-ways" aria-labelledby="report-ways-h">
            <h3 class="panel-title" id="report-ways-h">
              {canSend ? t('report.otherWays') : t('report.ways')}
            </h3>
            <div class="report-actions">
              <Button href={buildGmailUrl(input)} variant="secondary" target="_blank" rel="noopener noreferrer">
                <Icon name="mail" />
                {t('report.gmail')}
                <span class="sr-only"> {t('report.newTab')}</span>
              </Button>
              <Button href={buildMailto(input)} variant="secondary">
                <Icon name="mail" />
                {t('report.mailApp')}
              </Button>
              <Button variant="secondary" onClick={onCopy}>
                <Icon name="article" />
                {t('report.copy')}
              </Button>
            </div>
            <p class={copyText ? 'px-text-muted' : 'report-status'} role="status" aria-live="polite">
              {copyText}
            </p>
            {copy === 'manual' && (
              <textarea ref={copyBox} class="px-input report-copybox" readOnly aria-label={t('report.copyBox')} value={buildReportText(input)} />
            )}
            <p class="report-address">
              {t('report.address')} <span class="report-email">{REPORT_EMAIL}</span>
            </p>
            <p class="px-text-muted">{t('report.emailNote')}</p>
          </section>
        </div>
      </Panel>
      <div class="span-5 stack">
        {auto}
        <AraSays mood="happy" scale={3}>
          <p>{t('report.thanks')}</p>
        </AraSays>
      </div>
    </div>
  );
}
