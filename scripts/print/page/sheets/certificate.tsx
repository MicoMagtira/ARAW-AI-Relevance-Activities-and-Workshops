// Blank completion certificate, A4 landscape: the in-app certificate art (border, sunrise, Ara, star seal) with blank
// lines to fill in by hand: name, date, place and the facilitator's signature.
import { t } from '../../../../src/app/i18n';
import { tx } from '../../../../src/i18n/runtime';
import { CERT_CELL, CERT_H, CERT_W, drawCertificate, loadCertificateFonts } from '../../../../src/screens/certificate/certificateArt';
import type { SheetContext, SheetMeta } from '../kit';

export const meta: SheetMeta = { id: 'certificate', title: 'Certificate', landscape: true };

const P = CERT_CELL;
const W = CERT_W / P; // 232 grid cells
const H = CERT_H / P; // 164
const pctX = (x: number) => `${(x / W) * 100}%`;
const pctY = (y: number) => `${(y / H) * 100}%`;

const CSS = `
.pp { background: var(--surface); }
.ce { flex: 1; min-height: 0; display: grid; place-items: center; }
.ce__art { position: relative; height: 100%; aspect-ratio: ${W} / ${H}; container-type: inline-size; }
.ce__art img { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
.ce__t { position: absolute; left: 0; right: 0; text-align: center; color: var(--ink); }
.ce__certifies { font: 600 1.72cqw/1.2 var(--font-body); color: var(--muted); }
.ce__completed { font: 800 2.7cqw/1.2 var(--font-head); }
.ce__learned { font: 600 1.72cqw/1.2 var(--font-body); }
.ce__line { position: absolute; border-top: 0.45mm solid var(--ink); }
.ce__name { border-top-width: 0.7mm; border-top-color: var(--gold-deep); }
.ce__lab { position: absolute; transform: translateX(-50%); width: max-content; max-width: 30%; text-align: center; font: 800 1.45cqw/1.15 var(--font-body); color: var(--navy); }
`;

/** The certificate art with its personal middle (name, date, badge medals) painted out, so only the frame is left. */
async function art(): Promise<string> {
  await loadCertificateFonts();
  const canvas = document.createElement('canvas');
  canvas.width = CERT_W;
  canvas.height = CERT_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawCertificate(ctx, { name: '', date: '', earned: 0, total: 0, medals: [] });
  // clear everything between Ara and the star seal, from just under the subtitle to just above the credit line
  ctx.fillStyle = '#fff8ec'; // the certificate's own paper colour (PALETTE.cream)
  ctx.fillRect(31 * P, 68 * P, 172 * P, 72 * P);
  return canvas.toDataURL('image/png');
}

export default async function build(_ctx: SheetContext) {
  const src = await art();
  const line = (cls: string, x1: number, x2: number, y: number) => <span class={`ce__line ${cls}`} style={{ left: pctX(x1), width: pctX(x2 - x1), top: pctY(y) }} />;
  const lab = (text: string, x: number, y: number) => (
    <span class="ce__lab" style={{ left: pctX(x), top: pctY(y) }}>
      {text}
    </span>
  );
  return [
    <>
      <style>{CSS}</style>
      <div class="ce">
        <div class="ce__art">
          <img src={src} alt="" />
          <p class="ce__t ce__certifies" style={{ top: pctY(69) }}>
            {t('cert.c.certifies')}
          </p>
          {line('ce__name', 38, 194, 86)}
          {lab(tx('Name'), W / 2, 87.5)}
          <p class="ce__t ce__completed" style={{ top: pctY(94) }}>
            {t('cert.c.completed')}
          </p>
          <p class="ce__t ce__learned" style={{ top: pctY(103) }}>
            {t('cert.c.learned')}
          </p>
          {line('', 36, 86, 126)}
          {lab(tx('Date'), 61, 127.5)}
          {line('', 91, 141, 126)}
          {lab(tx('Place'), 116, 127.5)}
          {line('', 146, 200, 126)}
          {lab(tx('Facilitator signature'), 173, 127.5)}
        </div>
      </div>
    </>,
  ];
}
