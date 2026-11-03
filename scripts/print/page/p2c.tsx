// Shared helpers of the session-guides, Form A, Form B and answer-key sheets (builder 2c). Kept outside sheets/ because
// every file in sheets/ must export `meta`. The styles live here too, so print.css stays untouched.
import type { ComponentChildren } from 'preact';
import { Icon } from '../../../src/ui/Icon';
import { t } from '../../../src/app/i18n';
import type { StringKey } from '../../../src/app/i18n';
import { tx } from '../../../src/i18n/runtime';
import { FOF_ASSESSMENT } from '../../../src/content/factOrFake/assessment';
import type { FofItem } from '../../../src/content/factOrFake/schema';
import { Ara } from '../../../src/ui/Ara';
import { Banner, FakeStamp, Fit } from './kit';

export const formItems = (set: 'form_A' | 'form_B'): FofItem[] => FOF_ASSESSMENT.filter((i) => i.set === set);

export function chunk<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export const trickName = (item: FofItem): string => t(`trick.${item.trick}` as StringKey);

/** Fact / Fake as icon + word, never colour alone. */
export function TruthTag({ truth }: { truth: FofItem['truth'] }) {
  return (
    <span class={`p2-truth p2-truth--${truth}`}>
      <Icon name={truth === 'fact' ? 'check' : 'close'} size={24} />
      {t(truth === 'fact' ? 'fof.truth.fact' : 'fof.truth.fake')}
    </span>
  );
}

/** A post as a plain printable card: author, meta line, text, and for picture posts a framed picture description. No answer. */
export function PostCard({ item, n, children }: { item: FofItem; n: number; children?: ComponentChildren }) {
  const format = t(`fof.format.${item.format}` as StringKey);
  const head =
    item.format === 'gc_screenshot' ? (
      <div class="p2-post__gc">
        <Icon name="chat" size={24} />
        <span>{tx(item.meta)}</span>
      </div>
    ) : item.format === 'chatbot_answer' ? (
      <div class="p2-post__ask">
        <b>{t('fof.you')}:</b> {tx(item.meta)}
      </div>
    ) : (
      <div class="p2-post__who">
        <b>{tx(item.author)}</b>
        <span>{tx(item.meta)}</span>
      </div>
    );
  return (
    <article class="p2-post">
      <header class="p2-post__top">
        <span class="k-chip p2-post__n">{n}</span>
        <div class="p2-post__id">{head}</div>
        <span class="p2-post__fmt">{format}</span>
      </header>
      {item.format === 'gc_screenshot' || item.format === 'chatbot_answer' ? <p class="p2-post__from">{tx(item.author)}</p> : null}
      <p class="p2-post__text">{tx(item.text)}</p>
      {item.image ? (
        <div class="p2-pic">
          {item.image.badge ? <span class="p2-pic__badge">{tx(item.image.badge)}</span> : null}
          <span class="p2-pic__alt">{tx(item.image.alt)}</span>
        </div>
      ) : null}
      {children}
    </article>
  );
}

/** One answer-key row: number, Fact/Fake, trick and stamp on the left; why and how to check on the right. */
export function KeyRow({ item, n }: { item: FofItem; n: number }) {
  return (
    <li class="p2-key">
      <div class="p2-key__left">
        <div class="p2-key__id">
          <span class="k-chip p2-key__n">{n}</span>
          <TruthTag truth={item.truth} />
        </div>
        {item.truth === 'fake' ? (
          <>
            <p class="p2-key__trick">{t('fof.trick', { name: trickName(item) })}</p>
            <FakeStamp />
          </>
        ) : null}
      </div>
      <div class="p2-key__right">
        <p>{tx(item.explanation)}</p>
        <p>
          <b>{t('fof.check')}:</b> {tx(item.how_to_check)}
        </p>
      </div>
    </li>
  );
}

const CSS = `
.p2-sheet { display: contents; }
.p2-h2 { font: 800 14pt/1.15 var(--font-head); color: var(--navy); }
.p2-lbl { font: 11pt/1.4 var(--font-pixel); color: var(--navy); text-transform: uppercase; }
.p2-truth { display: inline-flex; align-items: center; gap: 1.6mm; font: 12pt/1 var(--font-pixel); color: var(--ink); padding: 1.2mm 2.4mm; border: 0.6mm solid var(--ink); background: var(--surface); }
.p2-truth--fake { background: var(--fake-tint); }
.p2-truth--fact { background: var(--fact-tint); }
.p2-truth .px-icon { width: 5mm; height: 5mm; }
.p2-post { display: flex; flex-direction: column; gap: 1.6mm; padding: 2.4mm 3.4mm; background: var(--surface); border: 0.6mm solid var(--ink); }
.p2-post__top { display: flex; align-items: center; gap: 3mm; }
.p2-post__n { min-width: 8mm; height: 8mm; font-size: 12pt; flex: none; }
.p2-post__id { flex: 1; min-width: 0; }
.p2-post__who { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 3mm; font-size: 13pt; line-height: 1.25; }
.p2-post__who span { color: var(--muted); font-size: 12pt; }
.p2-post__gc, .p2-post__ask { display: flex; align-items: center; gap: 2mm; font: 700 12.5pt/1.25 var(--font-body); }
.p2-post__gc .px-icon { width: 5mm; height: 5mm; flex: none; }
.p2-post__fmt { flex: none; font: 700 10.5pt/1.2 var(--font-body); color: var(--muted); }
.p2-post__from { font: 800 12.5pt/1.2 var(--font-body); }
.p2-post__text { font-size: 13pt; line-height: 1.32; }
.p2-pic { display: flex; align-items: center; gap: 3mm; padding: 1.6mm 3mm; border: 0.5mm dashed var(--ink); background: var(--soft); }
.p2-pic__badge { flex: none; font: 11pt/1.3 var(--font-pixel); color: var(--navy); padding: 0.8mm 2mm; border: 0.5mm solid var(--ink); background: var(--surface); }
.p2-pic__alt { font-size: 12pt; line-height: 1.25; font-style: italic; }
.p2-key { display: grid; grid-template-columns: 84mm 1fr; gap: 4mm; padding: 2mm 3mm; background: var(--surface); border: 0.5mm solid var(--ink); min-height: 0; }
.p2-key__left { display: flex; flex-direction: column; align-items: flex-start; gap: 1.4mm; }
.p2-key__id { display: flex; align-items: center; gap: 2.4mm; }
.p2-key__n { min-width: 8mm; height: 8mm; font-size: 12pt; }
.p2-key__trick { font: 800 12pt/1.15 var(--font-body); }
.p2-key__right { display: grid; gap: 1.2mm; align-content: start; font-size: 12pt; line-height: 1.28; }
.pp .k-banner .k-title { font-size: 12pt; }
.pp .k-stamp { white-space: nowrap; }
.p2-form { display: grid; grid-template-columns: 1.5fr 0.8fr 1fr; gap: 6mm; }
.p2-form__f { display: flex; align-items: flex-end; min-height: 10mm; border-bottom: 0.6mm solid var(--ink); font: 700 12pt/1 var(--font-body); }
.p2-rules { font-size: 12.5pt; line-height: 1.3; gap: 1mm; }
.p2-slim { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; padding-bottom: 1mm; }
.p2-slim__name { flex: 0 0 80mm; border-bottom: 0.6mm solid var(--ink); font: 700 12pt/1.2 var(--font-body); }
.p2-list { padding-bottom: 1mm; }
.p2-posts { display: grid; gap: 3.4mm; }
.ak__score { display: grid; gap: 2mm; }
.ak__bullets { font-size: 12.5pt; line-height: 1.3; }
.ak__quick { display: grid; gap: 2.4mm; }
.ak__grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.8mm; }
.ak__grid li { display: flex; align-items: center; gap: 1.6mm; padding: 1.2mm 2mm; border: 0.5mm solid var(--ink); font: 800 12pt/1 var(--font-body); }
.ak__grid .px-icon { width: 5mm; height: 5mm; flex: none; }
.ak__bar { display: flex; justify-content: space-between; align-items: center; }
.ak__range { font: 12pt/1 var(--font-pixel); }
.ak__fit { padding-bottom: 1mm; }
.ak__rows { display: grid; gap: 2.2mm; }
.p2-tick { display: flex; gap: 12mm; padding-top: 1mm; }
.p2-tick__opt { display: inline-flex; align-items: center; gap: 2.6mm; font: 12pt/1 var(--font-pixel); }
.p2-tick__box { width: 7.5mm; height: 7.5mm; border: 0.8mm solid var(--ink); background: var(--surface); }
`;

/** Inject the shared styles once per page (a <style> in the page box is harmless to the PDF). */
export function P2Css() {
  return <style>{CSS}</style>;
}

const PER_PAGE = 4;

/** The paper test: 20 posts, four to a page, Fact / Fake tick boxes. No answers, stamps or explanations. */
export function testPages(set: 'form_A' | 'form_B', title: string) {
  const groups = chunk(formItems(set), PER_PAGE);
  return groups.map((group, gi) => (
    <>
      <P2Css />
      {gi === 0 ? (
        <>
          <Banner title={tx(title)} sub={tx('Read each post. Is it a Fact or a Fake?')} left={<Ara scale={3} mood="happy" animate={false} decorative />} />
          <div class="p2-form">
            {[tx('Name'), tx('Date'), tx('Site')].map((l) => (
              <p key={l} class="p2-form__f">
                <span>{l}</span>
              </p>
            ))}
          </div>
          <ul class="k-bullets p2-rules">
            <li>{tx('Tick one box for each post: Fact or Fake.')}</li>
            <li>{tx('Work on your own, and do not look anything up.')}</li>
            <li>{tx('All people, pages and products here are made up.')}</li>
          </ul>
        </>
      ) : (
        <div class="p2-slim">
          <span class="p2-lbl">{tx(title)}</span>
          <span class="p2-slim__name">{tx('Name')}</span>
        </div>
      )}
      <Fit group="p2-test" min={0.8} class="p2-list">
        <div class="p2-posts">
          {group.map((item, i) => (
            <PostCard key={item.id} item={item} n={gi * PER_PAGE + i + 1}>
              <div class="p2-tick">
                {(['fact', 'fake'] as const).map((truth) => (
                  <span key={truth} class="p2-tick__opt">
                    <span class="p2-tick__box" />
                    {t(truth === 'fact' ? 'fof.truth.fact' : 'fof.truth.fake')}
                  </span>
                ))}
              </div>
            </PostCard>
          ))}
        </div>
      </Fit>
    </>
  ));
}
