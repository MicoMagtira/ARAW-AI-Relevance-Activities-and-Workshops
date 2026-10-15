// Certificate (docs/SPEC.md section 9), in focus mode: type a name, see the preview, then Print (A4 landscape) or download a PNG.
// The name only lives in this component's state: it is never saved, put in the URL or sent anywhere.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { manilaLongDate } from '../../app/daily';
import { t } from '../../app/i18n';
import { badgesEarned, modulesDone } from '../../app/progress';
import { hrefFor } from '../../app/router';
import { BADGES, BADGE_TOTAL } from '../../content/badges';
import { MODULES } from '../../content/modules';
import { Icon } from '../../ui/Icon';
import { Button, Panel, pushToast } from '../../ui/kit';
import '../../styles/certificate.css';
import { CERT_H, CERT_W, drawCertificate, loadCertificateFonts } from './certificateArt';

const NAME_MAX = 40;

function Frame({ children }: { children: ComponentChildren }) {
  return (
    <div class="lesson cert-frame">
      <header class="lesson-bar">
        <Button href={hrefFor('/me')} icon variant="secondary" aria-label={t('cert.close')}>
          <Icon name="close" />
        </Button>
        <p class="lesson-bar__title">{t('title.certificate')}</p>
      </header>
      <main class="lesson-main cert-main" id="main" tabIndex={-1}>
        <h1 class="sr-only">{t('title.certificate')}</h1>
        {children}
        <footer class="lesson-beta">{t('app.betaNote')}</footer>
      </main>
    </div>
  );
}

export default function CertificateScreen() {
  const done = modulesDone.value;
  const unlocked = MODULES.every((m) => done.includes(m.id));
  const [name, setName] = useState('');
  const [fontsReady, setFontsReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const date = useMemo(() => manilaLongDate(), []);
  const earned = badgesEarned.value;
  const medals = BADGES.map((b) => earned.includes(b.id));
  const earnedCount = medals.filter(Boolean).length;
  const typed = name.trim();

  useEffect(() => {
    let live = true;
    loadCertificateFonts().then(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !unlocked) return;
    drawCertificate(ctx, { name, date, earned: earnedCount, total: BADGE_TOTAL, medals });
  }, [name, date, earnedCount, unlocked, fontsReady]);

  if (!unlocked) {
    return (
      <Frame>
        <Panel class="lesson-notice" aria-labelledby="cert-locked-h">
          <div class="stack">
            <h2 id="cert-locked-h">{t('cert.lockedTitle')}</h2>
            <p>{t('cert.lockedText', { n: done.filter((id) => MODULES.some((m) => m.id === id)).length })}</p>
            <div>
              <Button variant="gold" href={hrefFor('/learn')}>
                {t('cert.toLearn')}
              </Button>
            </div>
          </div>
        </Panel>
      </Frame>
    );
  }

  const download = () => {
    canvas.current?.toBlob((blob) => {
      if (!blob) {
        pushToast({ kind: 'success', title: t('cert.pngFail') });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ARAW-certificate.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      pushToast({ kind: 'success', title: t('cert.pngDone') });
    }, 'image/png');
  };

  return (
    <Frame>
      <div class="cert-layout">
        <Panel class="cert-controls" aria-labelledby="cert-controls-h">
          <div class="stack">
            <h2 id="cert-controls-h">{t('cert.title')}</h2>
            <p>{t('cert.intro')}</p>
            <div class="field">
              <label class="px-label" for="cert-name">
                {t('cert.nameLabel')}
              </label>
              <input
                id="cert-name"
                class="px-input"
                type="text"
                maxLength={NAME_MAX}
                autoComplete="off"
                spellcheck={false}
                placeholder={t('cert.namePlaceholder')}
                aria-describedby="cert-name-hint"
                value={name}
                onInput={(e) => setName((e.target as HTMLInputElement).value)}
              />
            </div>
            <p class="px-text-muted" id="cert-name-hint">
              {t('cert.nameHint')}
            </p>
            <div class="cert-actions">
              <Button variant="gold" large onClick={() => window.print()} disabled={!typed}>
                <Icon name="print" />
                {t('cert.print')}
              </Button>
              <Button variant="secondary" large onClick={download} disabled={!typed}>
                <Icon name="download" />
                {t('cert.png')}
              </Button>
            </div>
            {!typed && <p class="px-text-muted">{t('cert.needName')}</p>}
            <div>
              <Button variant="secondary" href={hrefFor('/me')}>
                {t('cert.done')}
              </Button>
            </div>
          </div>
        </Panel>

        <div class="cert-print">
          <canvas
            ref={canvas}
            class="cert-canvas"
            width={CERT_W}
            height={CERT_H}
            role="img"
            aria-label={t('cert.alt', { name: typed || t('cert.c.blank'), date, n: earnedCount, total: BADGE_TOTAL })}
          />
        </div>
      </div>
    </Frame>
  );
}
