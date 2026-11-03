// Myth front / fact back cut-out cards, 8 to an A4 page, for double-sided printing (long-edge flip).
// Pages come in pairs: a page of fronts, then a page of backs with each row mirrored, so every back lands behind its front.
import type { VNode } from 'preact';
import { Icon } from '../../../../src/ui/Icon';
import { t } from '../../../../src/app/i18n';
import { tx } from '../../../../src/i18n/runtime';
import { MYTHS, MYTH_TOPIC_LABELS, type Myth } from '../../../../src/content/library/myths';
import { Fit, type SheetContext, type SheetMeta } from '../kit';

export const meta: SheetMeta = { id: 'myth-cards', title: 'Myth cards' };

const PER_PAGE = 8;
const COLS = 2;

// Own styles (shared print.css is not edited): white page, dashed cut lines, card faces.
const CSS = `
.mc__note { flex: none; font: 700 10pt/1.2 var(--font-body); color: var(--muted); text-align: center; }
.mc__grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(${COLS}, 1fr); grid-auto-rows: 1fr; border-top: 0.35mm dashed var(--ink); border-left: 0.35mm dashed var(--ink); }
.mc__card { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 1.6mm; padding: 2.4mm 4mm; overflow: hidden; border-right: 0.35mm dashed var(--ink); border-bottom: 0.35mm dashed var(--ink); }
.mc__card--empty { visibility: hidden; }
.mc__top { flex: none; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.4mm 2mm; }
.mc__tag { display: inline-flex; align-items: center; gap: 1.6mm; padding: 1.2mm 2.4mm; font: 12pt/1.2 var(--font-pixel); color: var(--ink); border: 0.7mm solid var(--ink); box-shadow: 0.8mm 0.8mm 0 var(--ink); white-space: nowrap; }
.mc__tag--myth { background: var(--fake-tint); }
.mc__tag--fact { background: var(--fact-tint); }
.mc__topic { max-width: 100%; font: 700 9.5pt/1.15 var(--font-body); color: var(--ink); padding: 0.8mm 2mm; border: 0.4mm solid var(--ink); text-align: right; }
.mc__card .k-fit { flex: 1; }
.mc__help { flex: none; padding-top: 1.2mm; border-top: 0.3mm solid var(--line); }
.mc__help .mc__lab { margin-top: 0; font-size: 9pt; }
.mc__help .mc__txt { font-size: 10.5pt; line-height: 1.2; }
.mc__myth { display: flex; align-items: center; min-height: 100%; font: 800 17pt/1.18 var(--font-head); color: var(--ink); }
.mc__fact { font: 800 12.5pt/1.2 var(--font-head); color: var(--ink); }
.mc__lab { margin-top: 1.4mm; font: 800 9.5pt/1.1 var(--font-body); color: var(--navy); text-transform: uppercase; letter-spacing: 0.02em; }
.mc__txt { margin-top: 0.3mm; font: 400 11.5pt/1.22 var(--font-body); color: var(--ink); }
`;

function front(m: Myth | undefined, key: number): VNode {
  if (!m) return <div key={key} class="mc__card mc__card--empty" />;
  return (
    <div key={m.id} class="mc__card">
      <div class="mc__top">
        <span class="mc__tag mc__tag--myth">
          <Icon name="close" size={20} />
          {t('myths.front').toUpperCase()}
        </span>
        <span class="mc__topic">{tx(MYTH_TOPIC_LABELS[m.topic])}</span>
      </div>
      <Fit group="mc-front" min={0.65}>
        <p class="mc__myth">{tx(m.myth)}</p>
      </Fit>
      <div class="mc__help">
        <p class="mc__lab">{tx('Who can help')}</p>
        <p class="mc__txt">{t('g.feed.text.unsure')}</p>
      </div>
    </div>
  );
}

function back(m: Myth | undefined, key: number): VNode {
  if (!m) return <div key={key} class="mc__card mc__card--empty" />;
  return (
    <div key={m.id} class="mc__card">
      <div class="mc__top">
        <span class="mc__tag mc__tag--fact">
          <Icon name="check" size={20} />
          {t('myths.fact').toUpperCase()}
        </span>
      </div>
      <Fit min={0.6}>
        <p class="mc__fact">{tx(m.fact)}</p>
        <p class="mc__lab">{t('myths.why')}</p>
        <p class="mc__txt">{tx(m.why)}</p>
      </Fit>
    </div>
  );
}

/** Swap the two columns of every row: the page flips on its long edge, so left becomes right. */
function mirror<T>(cells: readonly T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < cells.length; i += COLS) out.push(...cells.slice(i, i + COLS).reverse());
  return out;
}

export default function build(_ctx: SheetContext) {
  const pages: VNode[][] = [];
  for (let i = 0; i < MYTHS.length; i += PER_PAGE) {
    const group: (Myth | undefined)[] = MYTHS.slice(i, i + PER_PAGE);
    while (group.length < PER_PAGE) group.push(undefined);
    pages.push(group.map(front));
    pages.push(mirror(group).map(back));
  }
  const note = tx('Cut along the dashed lines. Print double-sided and flip on the long edge.');
  return pages.map((cells, i) => (
    <>
      <style>{CSS}</style>
      <p class="mc__note">{note}</p>
      <div class="mc__grid" data-side={i % 2 === 0 ? 'front' : 'back'}>
        {cells}
      </div>
    </>
  ));
}
