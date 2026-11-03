// "Magpatingin agad" red-flag cut-out cards: four identical cards per A4 with dashed cut lines.
// The heading and the 911 / 1553 facts come from the app (sb.rf.title, sb.sh.text); the signs are CONTENT_GUIDE section 3.
import { t } from '../../../../src/app/i18n';
import { tx } from '../../../../src/i18n/runtime';
import { Fit, Panel, type SheetMeta } from '../kit';
import './p2a.css';

export const meta: SheetMeta = { id: 'red-flags', title: 'Red-flag cards' };

/** The red flags that always mean "go to a health facility now" (CONTENT_GUIDE section 3). Self-harm has its own hotline box. */
const SIGNS = [
  'Chest pain or pressure',
  'Trouble breathing',
  'Face drooping, arm weakness or slurred speech',
  'Dengue warning signs: bad belly pain, vomiting, bleeding',
  'Fainting or seizures',
  'Severe bleeding',
  'A child with very little urine, no tears or very sleepy',
  'High fever in a young baby',
  'An animal bite or scratch',
] as const;

function card() {
  // "Magpatingin agad: get help now" -> pixel heading + plain line (the pack keeps the colon)
  const title = t('sb.rf.title');
  const cut = title.search(/[:：]/);
  const head = cut > 0 ? title.slice(0, cut) : title;
  return (
    <div class="rf__cell">
      <Panel class="rf__card">
        <div class="rf__head">
          <h2 class="rf__title">{head}</h2>
        </div>
        <div class="rf__go">
          <p>{tx('Go to the nearest health facility or call 911 now.')}</p>
          <span class="rf__big">911</span>
        </div>
        <Fit class="rf__fit" min={0.72} group="rf">
          <ul class="k-bullets rf__signs">
            {SIGNS.map((s) => (
              <li key={s}>{tx(s)}</li>
            ))}
          </ul>
        </Fit>
        <div class="rf__nums">
          <div class="rf__num">
            <span class="rf__big">1553</span>
            <p>{tx('DOH-NCMH crisis hotline (free, any time)')}</p>
          </div>
        </div>
        <p class="rf__fine">{tx('Thinking of hurting yourself? Talk to someone you trust now.')}</p>
      </Panel>
    </div>
  );
}

export default function build() {
  return [
    <div class="p2a">
      <div class="rf__sheet">{[0, 1, 2, 3].map((i) => <div key={i} style="display:contents">{card()}</div>)}</div>
    </div>,
  ];
}
