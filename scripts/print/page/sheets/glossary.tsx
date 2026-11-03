// Ara's Dictionary on paper: every term with its plain meaning, a funny everyday example and the module it is seen in.
// Sorted A to Z in the printed language, two columns, three pages.
import { Ara } from '../../../../src/ui/Ara';
import { t } from '../../../../src/app/i18n';
import { tx, activeLanguage } from '../../../../src/i18n/runtime';
import { GLOSSARY, type GlossaryTerm } from '../../../../src/content/library/glossary';
import { MODULES } from '../../../../src/content/modules';
import { Banner, Fit, Sunrise, type SheetContext, type SheetMeta } from '../kit';

export const meta: SheetMeta = { id: 'glossary', title: "Ara's Dictionary" };

const PAGES = 3;

const CSS = `
.pp { background: var(--surface); }
.gl__cols { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.gl__col { padding: 0 1mm; }
.gl__list { display: grid; gap: 3.2mm; }
.gl__item { padding-bottom: 2.6mm; border-bottom: 0.35mm dashed var(--ink); }
.gl__item:last-child { border-bottom: 0; }
.gl__head { display: flex; align-items: center; gap: 2.4mm; margin-bottom: 0.8mm; }
.gl__head .k-chip { min-width: 7mm; height: 7mm; font-size: 11pt; background: var(--banner-tint); box-shadow: 0.6mm 0.6mm 0 var(--ink); }
.gl__chip-gap { display: inline-block; width: 7mm; flex: none; }
.gl__term { font: 800 14pt/1.15 var(--font-head); color: var(--navy); }
.gl__meaning { font: 700 12pt/1.25 var(--font-body); color: var(--ink); }
.gl__example { margin-top: 0.8mm; font: 400 11.5pt/1.25 var(--font-body); color: var(--muted); }
.gl__seen { margin-top: 0.8mm; font: 800 9.5pt/1.2 var(--font-body); color: var(--navy); }
`;

interface Entry {
  g: GlossaryTerm;
  term: string;
  /** Shows the A to Z chip: first term of its letter. */
  first: boolean;
}

const initial = (s: string) => (s.trim()[0] ?? '#').toLocaleUpperCase();

export default function build(_ctx: SheetContext) {
  const lang = activeLanguage();
  const sorted = GLOSSARY.map((g) => ({ g, term: tx(g.term) })).sort((a, b) => a.term.localeCompare(b.term, lang, { sensitivity: 'base' }));
  const entries: Entry[] = sorted.map((e, i) => ({ ...e, first: i === 0 || initial((sorted[i - 1] as { term: string }).term) !== initial(e.term) }));
  const perPage = Math.ceil(entries.length / PAGES);
  const perCol = Math.ceil(perPage / 2);

  const item = (e: Entry) => {
    const mod = MODULES.find((m) => m.id === e.g.module);
    return (
      <li key={e.g.id} class="gl__item">
        <div class="gl__head">
          {e.first ? <span class="k-chip">{initial(e.term)}</span> : <span class="gl__chip-gap" />}
          <h2 class="gl__term">{e.term}</h2>
        </div>
        <p class="gl__meaning">{tx(e.g.meaning)}</p>
        <p class="gl__example">{tx(e.g.example)}</p>
        {mod ? <p class="gl__seen">{t('glossary.seen', { n: mod.n, title: tx(mod.short) })}</p> : null}
      </li>
    );
  };

  return Array.from({ length: PAGES }, (_, p) => {
    const slice = entries.slice(p * perPage, (p + 1) * perPage);
    const column = (from: number, to: number) => (
      <Fit group={`gl-${p}`} min={0.72} class="gl__col">
        <ul class="gl__list">{slice.slice(from, to).map(item)}</ul>
      </Fit>
    );
    return (
      <>
        <style>{CSS}</style>
        <Banner title={t('glossary.title')} sub={t('glossary.intro')} left={<Ara scale={3} mood="happy" animate={false} decorative />} right={<Sunrise width={22} />} />
        <div class="gl__cols">
          {column(0, perCol)}
          {column(perCol, perPage)}
        </div>
      </>
    );
  });
}
