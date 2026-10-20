// First-visit boot screen: the 8-bit sunrise (design/mockup/Main.dc.html, redrawn desktop-first).
import { useEffect, useState } from 'preact/hooks';
import { MUSIC_AFTER_START_MS, finishSplash } from '../app/boot';
import { holdMusic } from '../app/sound';
import { t } from '../app/i18n';
import { Icon } from '../ui/Icon';
import { Ara, useReducedMotion } from '../ui/Ara';
import { Button } from '../ui/kit';
import { PartnerLogos } from '../ui/PartnerLogos';
import { SoundSwitches } from '../ui/SoundControls';

const SEGMENTS = 10;
const SEGMENT_MS = 500;

/** Rows of a half disc (`radius` in cells, centre column `cx`), bottom row first, as [x, y, w]. */
function halfDisc(radius: number, cx: number, baseY: number): Array<[number, number, number]> {
  const rows: Array<[number, number, number]> = [];
  for (let k = 0; k < Math.ceil(radius); k++) {
    const half = Math.floor(Math.sqrt(radius * radius - (k + 0.5) ** 2));
    rows.push([cx - half, baseY - 1 - k, 2 * half + 1]);
  }
  return rows;
}
const rectPath = (rows: Array<[number, number, number]>): string => rows.map(([x, y, w]) => `M${x} ${y}h${w}v1h-${w}z`).join('');

const SUN_W = 37;
const SUN_H = 18;
const BODY_ROWS = halfDisc(12.5, 18, SUN_H);
// ink outline: every body row one cell wider each side, plus a cap row above each row
const SUN_OUTLINE = rectPath(BODY_ROWS.flatMap(([x, y, w]): Array<[number, number, number]> => [[x - 1, y, w + 2], [x, y - 1, w]]));
const SUN_BODY = rectPath(BODY_ROWS);
const SUN_CORE = rectPath(halfDisc(8.5, 18, SUN_H));
const SUN_RAYS = 'M18 0h1v3h-1zM6 5h2v2H6zM29 5h2v2h-2zM2 11h3v1H2zM32 11h3v1h-3zM1 17h4v1H1zM32 17h4v1h-4z';

export function Sun({ class: className = 'splash__sun' }: { class?: string }) {
  return (
    <svg class={className} viewBox={`0 0 ${SUN_W} ${SUN_H}`} shape-rendering="crispEdges" aria-hidden="true" focusable="false">
      <path fill="var(--gold-deep)" d={SUN_RAYS} />
      <path fill="var(--ink)" d={SUN_OUTLINE} />
      <path fill="var(--gold-deep)" d={SUN_BODY} />
      <path fill="var(--gold)" d={SUN_CORE} />
    </svg>
  );
}

const CLOUD = 'M4 0h4v1H4zM2 1h8v1H2zM0 2h14v1H0zM0 3h14v1H0zM12 1h2v1h-2z';
export function Cloud({ class: className }: { class: string }) {
  return (
    <svg class={`splash__cloud ${className}`} viewBox="0 0 14 4" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
      <path fill="var(--surface)" d={CLOUD} />
    </svg>
  );
}

/** Fake boot progress: fills one segment at a time. Reduced motion (or a short wait) shows it complete. */
function useBootProgress(): number {
  const reduced = useReducedMotion();
  const [filled, setFilled] = useState(reduced ? SEGMENTS : 0);
  useEffect(() => {
    if (reduced) {
      setFilled(SEGMENTS);
      return;
    }
    const timer = setInterval(() => {
      setFilled((n) => {
        if (n + 1 >= SEGMENTS) clearInterval(timer);
        return Math.min(SEGMENTS, n + 1);
      });
    }, SEGMENT_MS);
    return () => clearInterval(timer);
  }, [reduced]);
  return filled;
}

export function Splash() {
  const filled = useBootProgress();
  const percent = Math.round((filled / SEGMENTS) * 100);

  return (
    <main class="splash" id="splash" aria-labelledby="splash-title" tabIndex={-1}>
      <Button href="#/" class="skip-link" variant="gold" data-sfx="none" onClick={skip}>
        {t('splash.skip')}
      </Button>

      <div class="splash__sky">
        <Cloud class="splash__cloud--a" />
        <Cloud class="splash__cloud--b" />
        <div class="px-box splash__title">
          <h1 class="splash__wordmark" id="splash-title">
            {t('app.name')}
          </h1>
          <p class="splash__tagline">{t('app.tagline')}</p>
          <p class="splash__blurb">{t('splash.blurb')}</p>
          <SplashPartners />
        </div>
        <div class="splash__scene" aria-hidden="true">
          <Sun />
          <Ara mood="happy" scale={4} decorative class="splash__ara" />
        </div>
      </div>

      <div class="splash__ground">
        <div class="splash__go">
          <div class="splash__loader" aria-hidden="true">
            <div class="splash__bar">
              {Array.from({ length: SEGMENTS }, (_, i) => (
                <span key={i} class={`splash__seg${i < filled ? ' is-on' : ''}`} />
              ))}
            </div>
            <p class="splash__loading">
              {t('splash.loading')} {percent}%
            </p>
          </div>
          <Button large variant="gold" class="splash__start" disabled={filled < SEGMENTS} data-sfx="none" onPointerDown={quietMusic} onKeyDown={quietMusic} onClick={finishSplash}>
            {t('splash.start')}
            <Icon name="play" />
          </Button>
          <SoundSwitches />
        </div>
        <p class="splash__credit">{t('app.createdBy')}</p>
      </div>
    </main>
  );
}

/** "An AIKasalig project" and the partner logos, at the foot of the white title panel (splash and language landing). */
export function SplashPartners() {
  return (
    <div class="splash__partners">
      <p class="splash__partners-label">{t('brand.project')}</p>
      <PartnerLogos variant="strip" />
    </div>
  );
}

/** The first press unlocks audio: keep the morning theme back so the START chime and the sunrise jingle ring out alone. */
function quietMusic(): void {
  holdMusic(MUSIC_AFTER_START_MS);
}

function skip(e: MouseEvent): void {
  e.preventDefault(); // the link is for keyboard and screen-reader users; the hash is set by finishSplash
  finishSplash();
}
