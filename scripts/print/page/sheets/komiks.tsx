// Ara's Comics, Season 1: one episode per A4 page. Each panel is its pixel scene (the real KomiksScene) with its
// caption, any on-screen post and the speech bubbles written out as text beside it, large enough to read on paper.
import { t } from '../../../../src/app/i18n';
import { tx } from '../../../../src/i18n/runtime';
import { KOMIKS, KOMIKS_CAST_NAMES, KOMIKS_SEASON_TITLE, type KomiksEpisode, type KomiksPanel } from '../../../../src/content/library/komiks';
import { KomiksScene } from '../../../../src/ui/komiks/Scene';
import { FakeStamp, Fit, type SheetContext, type SheetMeta } from '../kit';

export const meta: SheetMeta = { id: 'komiks', title: "Ara's Comics" };

const CSS = `
.pp { background: var(--surface); gap: 3mm; }
.kx__head { flex: none; display: flex; align-items: center; gap: 4mm; padding: 2mm 4mm; background: var(--banner-tint); border: var(--bw) solid var(--ink); box-shadow: var(--sh) var(--sh) 0 var(--ink); }
.kx__head .k-chip { min-width: 11mm; height: 11mm; background: var(--gold); }
.kx__season { font: 700 9.5pt/1.2 var(--font-body); color: var(--muted); }
.kx__title { font: 800 18pt/1.1 var(--font-head); color: var(--navy); }
.kx__panels { flex: 1; min-height: 0; display: grid; gap: 3mm; padding-right: 1.4mm; padding-bottom: 1.4mm; }
.kx__row { min-height: 0; display: flex; gap: 3.5mm; align-items: stretch; }
.kx__art { position: relative; flex: none; align-self: flex-start; height: 100%; aspect-ratio: 8 / 5; max-width: 52%; border: var(--bw) solid var(--ink); box-shadow: 0.9mm 0.9mm 0 var(--ink); background: var(--surface); }
.kx__art svg { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
.kx__num { position: absolute; left: 0; top: 0; z-index: 1; display: grid; place-items: center; width: 6.5mm; height: 6.5mm; font: 9pt/1 var(--font-pixel); color: var(--ink); background: var(--gold); border-right: 0.6mm solid var(--ink); border-bottom: 0.6mm solid var(--ink); }
.kx__words { flex: 1; min-width: 0; }
.kx__words .k-fit__in { display: grid; gap: 1.8mm; align-content: start; }
.kx__cap { font: 800 10.5pt/1.25 var(--font-body); color: var(--navy); padding: 1mm 2mm; background: var(--soft); border-left: 1.2mm solid var(--ink); }
.kx__screen { display: grid; gap: 0.6mm; padding: 1.6mm 2.4mm; border: 0.5mm solid var(--ink); background: var(--surface); }
.kx__screen-label { font: 800 8.5pt/1.1 var(--font-body); color: var(--muted); text-transform: uppercase; }
.kx__screen-by { font: 800 11pt/1.2 var(--font-body); color: var(--navy); }
.kx__screen-text { font: 400 11.5pt/1.25 var(--font-body); color: var(--ink); }
.kx__screen .k-stamp { justify-self: start; margin-top: 1mm; font-size: 8pt; padding: 0.8mm 1.8mm; border-width: 0.5mm; }
.kx__bub { display: grid; gap: 0.4mm; padding: 1.8mm 3mm; background: var(--surface); border: 0.5mm solid var(--ink); border-radius: 2mm; box-shadow: 0.7mm 0.7mm 0 var(--ink); }
.kx__bub--think { border-style: dashed; background: var(--soft); }
.kx__who { font: 800 9.5pt/1.1 var(--font-body); color: var(--navy); text-transform: uppercase; }
.kx__say { font: 700 12.5pt/1.25 var(--font-body); color: var(--ink); }
.kx__bub--think .kx__say { font-style: italic; font-weight: 600; }
`;

function panelRow(p: KomiksPanel, i: number, ep: number) {
  return (
    <div class="kx__row" key={i}>
      <div class="kx__art">
        <span class="kx__num" aria-hidden="true">
          {i + 1}
        </span>
        <KomiksScene panel={p} />
      </div>
      <Fit group={`kx-${ep}`} min={0.55} class="kx__words">
        {p.caption ? <p class="kx__cap">{tx(p.caption)}</p> : null}
        {p.screen ? (
          <div class="kx__screen">
            <p class="kx__screen-label">{t('komiks.screen')}</p>
            <p class="kx__screen-by">{tx(p.screen.author)}</p>
            <p class="kx__screen-text">{tx(p.screen.text)}</p>
            {p.screen.fake ? <FakeStamp /> : null}
          </div>
        ) : null}
        {p.bubbles.map((b, j) => (
          <div key={j} class={`kx__bub kx__bub--${b.kind}`}>
            <span class="kx__who">
              {KOMIKS_CAST_NAMES[b.speaker]}
              {b.kind === 'think' ? ` ${t('komiks.thinks')}` : ''}
            </span>
            <span class="kx__say">{tx(b.text)}</span>
          </div>
        ))}
      </Fit>
    </div>
  );
}

/** Rows with more words get more height, so the text keeps one readable size across the page. */
const weight = (p: KomiksPanel) => 2 + (p.caption?.length ?? 0) / 90 + (p.screen ? (p.screen.author.length + p.screen.text.length) / 60 + 1 : 0) + p.bubbles.reduce((n, b) => n + 0.6 + b.text.length / 90, 0);

function episode(ep: KomiksEpisode) {
  return (
    <>
      <style>{CSS}</style>
      <header class="kx__head">
        <span class="k-chip">{ep.n}</span>
        <div>
          <p class="kx__season">{tx(KOMIKS_SEASON_TITLE)}</p>
          <h1 class="kx__title">
            {t('komiks.episode', { n: ep.n })}: {tx(ep.title)}
          </h1>
        </div>
      </header>
      <div class="kx__panels" style={{ gridTemplateRows: ep.panels.map((p) => `minmax(0, ${weight(p).toFixed(2)}fr)`).join(' ') }}>
        {ep.panels.map((p, i) => panelRow(p, i, ep.n))}
      </div>
    </>
  );
}

export default function build(_ctx: SheetContext) {
  return KOMIKS.map(episode);
}
