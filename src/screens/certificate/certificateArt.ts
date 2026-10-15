// The certificate, drawn on a canvas (docs/SPEC.md section 9). A4 landscape on a 232 x 164 pixel grid, 7 canvas pixels per cell:
// pixel sunrise, stepped border, Ara and badge medals. Text is drawn at full size so it stays sharp when printed or saved.
import { PALETTE, box, sprite } from '../../games/engine/draw';
import { t } from '../../app/i18n';
import { PALETTE as ARA_PALETTE, getFrame } from '../../ui/ara/frames';

export const CERT_CELL = 7;
export const CERT_W = 232 * CERT_CELL;
export const CERT_H = 164 * CERT_CELL;

const FONT_PIXEL = '"Press Start 2P", ui-monospace, monospace';
const FONT_HEAD = '"Baloo 2", system-ui, sans-serif';
const FONT_BODY = '"Nunito", system-ui, sans-serif';

export interface CertificateData {
  /** Typed by the player; used for this drawing only and never stored. */
  name: string;
  /** Long date, e.g. "16 October 2026". */
  date: string;
  earned: number;
  total: number;
  /** For each badge (in cabinet order) whether it is earned. */
  medals: readonly boolean[];
}

const MEDAL = ['..KKKK..', '.KGGGGK.', 'KGGGGGGK', 'KGGGGGGK', 'KGGGGGGK', 'KGGGGGGK', '.KGGGGK.', '..KKKK..'];
const STAR = ['...KK...', '...KK...', '.KKGGKK.', 'KGGGGGGK', '.KGGGGK.', '.KGGGGK.', 'KGGK.GGK', '.KK...KK'];

/** Load the three fonts the certificate uses, so canvas text never falls back to a system font. */
export function loadCertificateFonts(): Promise<unknown> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  return Promise.all([
    document.fonts.load(`48px ${FONT_PIXEL}`, 'ARAW'),
    document.fonts.load(`800 48px ${FONT_HEAD}`, 'Aa'),
    document.fonts.load(`600 24px ${FONT_BODY}`, 'Aa'),
    document.fonts.load(`700 24px ${FONT_BODY}`, 'Aa'),
  ]).catch(() => undefined);
}

function outline(ctx: CanvasRenderingContext2D, color: string, inset: number, thickness: number): void {
  const w = CERT_W - inset * 2;
  const h = CERT_H - inset * 2;
  box(ctx, color, inset, inset, w, thickness);
  box(ctx, color, inset, inset + h - thickness, w, thickness);
  box(ctx, color, inset, inset, thickness, h);
  box(ctx, color, inset + w - thickness, inset, thickness, h);
}

interface TextStyle {
  font: string;
  color: string;
  y: number;
}

function line(ctx: CanvasRenderingContext2D, value: string, { font, color, y }: TextStyle): void {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(value, CERT_W / 2, y);
}

/** The biggest Baloo 2 size (stepping down by 4px) at which the name fits `maxWidth`. */
function fitName(ctx: CanvasRenderingContext2D, name: string, maxWidth: number): string {
  for (let size = 96; size > 32; size -= 4) {
    const font = `800 ${size}px ${FONT_HEAD}`;
    ctx.font = font;
    if (ctx.measureText(name).width <= maxWidth) return font;
  }
  return `800 32px ${FONT_HEAD}`;
}

export function drawCertificate(ctx: CanvasRenderingContext2D, data: CertificateData): void {
  const P = CERT_CELL;
  ctx.imageSmoothingEnabled = false;
  box(ctx, PALETTE.cream, 0, 0, CERT_W, CERT_H);

  // stepped border: navy, gold band, deep gold line, thin navy line, with coral corner blocks
  outline(ctx, PALETTE.navy, 0, 2 * P);
  outline(ctx, PALETTE.gold, 3 * P, 3 * P);
  outline(ctx, PALETTE.goldDeep, 6 * P, P);
  outline(ctx, PALETTE.navy, 7 * P, P);
  for (const [x, y] of [
    [3, 3],
    [CERT_W / P - 7, 3],
    [3, CERT_H / P - 7],
    [CERT_W / P - 7, CERT_H / P - 7],
  ] as const) {
    box(ctx, PALETTE.navy, x * P, y * P, 4 * P, 4 * P);
    box(ctx, PALETTE.coral, (x + 1) * P, (y + 1) * P, 2 * P, 2 * P);
  }

  // sunrise: half sun on three stripes
  const sun = ['.....XXXXXX.....', '...XXXXXXXXXX...', '..XXXXXXXXXXXX..', '.XXXXXXXXXXXXXX.', 'XXXXXXXXXXXXXXXX', 'XXXXXXXXXXXXXXXX'];
  const sunCell = 2 * P;
  const sunX = (CERT_W - 16 * sunCell) / 2;
  sprite(ctx, sun, { X: PALETTE.goldDeep }, sunX, 11 * P, sunCell);
  const stripes: Array<[string, number]> = [
    [PALETTE.gold, 0],
    [PALETTE.goldDeep, 1],
    [PALETTE.coral, 2],
  ];
  for (const [color, i] of stripes) box(ctx, color, sunX - 4 * P, (11 + 12 + i) * P, 16 * sunCell + 8 * P, P);

  line(ctx, t('app.name'), { font: `40px ${FONT_PIXEL}`, color: PALETTE.navy, y: 35 * P });
  line(ctx, t('app.tagline'), { font: `700 30px ${FONT_BODY}`, color: PALETTE.muted, y: 43 * P });
  line(ctx, t('cert.c.title'), { font: `48px ${FONT_PIXEL}`, color: PALETTE.ink, y: 51 * P });
  line(ctx, t('cert.c.sub'), { font: `24px ${FONT_PIXEL}`, color: PALETTE.navy, y: 60 * P });
  line(ctx, t('cert.c.certifies'), { font: `600 28px ${FONT_BODY}`, color: PALETTE.muted, y: 69 * P });

  // the name, with a pixel underline
  const name = data.name.trim();
  const shown = name || t('cert.c.blank');
  line(ctx, shown, { font: fitName(ctx, shown, 150 * P), color: name ? PALETTE.navy : PALETTE.line, y: 75 * P });
  box(ctx, PALETTE.goldDeep, 38 * P, 94 * P, 156 * P, P);

  line(ctx, t('cert.c.completed'), { font: `800 44px ${FONT_HEAD}`, color: PALETTE.ink, y: 98 * P });
  line(ctx, t('cert.c.learned'), { font: `600 28px ${FONT_BODY}`, color: PALETTE.ink, y: 108 * P });
  line(ctx, t('cert.c.on', { date: data.date }), { font: `700 28px ${FONT_BODY}`, color: PALETTE.muted, y: 114 * P });

  // badge medals
  line(ctx, t('cert.c.badges', { n: data.earned, total: data.total }), { font: `700 24px ${FONT_BODY}`, color: PALETTE.ink, y: 123 * P });
  const medalCell = 5;
  const gap = 12;
  const rowW = data.medals.length * 8 * medalCell + (data.medals.length - 1) * gap;
  data.medals.forEach((got, i) => {
    const colors = got ? { K: PALETTE.ink, G: PALETTE.goldDeep } : { K: PALETTE.line, G: PALETTE.soft };
    sprite(ctx, MEDAL, colors, (CERT_W - rowW) / 2 + i * (8 * medalCell + gap), 129 * P, medalCell);
  });

  // Ara, and a gold star seal
  sprite(ctx, getFrame('happy'), ARA_PALETTE, 12 * P, 126 * P, 5);
  sprite(ctx, STAR, { K: PALETTE.ink, G: PALETTE.goldDeep }, CERT_W - 12 * P - 8 * 12, 128 * P, 12);

  line(ctx, t('app.credit'), { font: `700 22px ${FONT_BODY}`, color: PALETTE.ink, y: 141 * P });
  line(ctx, t('cert.c.notAdvice'), { font: `600 20px ${FONT_BODY}`, color: PALETTE.muted, y: 147 * P });
}
