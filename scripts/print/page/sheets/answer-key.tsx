// Answer key for Forms A and B: Fact or Fake with icon and word, the trick, the why and how to check; fakes carry the stamp.
import { Ara } from '../../../../src/ui/Ara';
import { Icon } from '../../../../src/ui/Icon';
import { t } from '../../../../src/app/i18n';
import { tx } from '../../../../src/i18n/runtime';
import { Banner, Fit, Panel, type SheetMeta } from '../kit';
import { KeyRow, P2Css, chunk, formItems } from '../p2c';

export const meta: SheetMeta = { id: 'answer-key', title: 'Answer key (Forms A and B)', facilitatorOnly: true };

const PER_PAGE = 7;
const FORMS = [
  { set: 'form_A', label: 'Form A' },
  { set: 'form_B', label: 'Form B' },
] as const;

export default function build() {
  const summary = (
    <>
      <P2Css />
      <Banner title={tx('Answer key')} sub={tx('For facilitators only. Forms A and B.')} left={<Ara scale={3} mood="happy" animate={false} decorative />} />
      <Panel class="ak__score">
        <h2 class="p2-h2">{tx('Scoring')}</h2>
        <ul class="k-bullets ak__bullets">
          <li>{tx('One point for each correct answer. The best score is 20 on each form.')}</li>
          <li>{tx('Give Form A before the lessons and Form B after the last lesson, then compare the two scores.')}</li>
          <li>{tx('Keep this key and both forms for facilitators only. Do not show them to learners before the test.')}</li>
          <li>{tx('After the test, go through the answers kindly. Mock the trick, never the person.')}</li>
        </ul>
      </Panel>
      {FORMS.map(({ set, label }) => (
        <Panel key={set} class="ak__quick">
          <h2 class="p2-h2">{`${tx(label)} · ${tx('Quick key')}`}</h2>
          <ul class="ak__grid">
            {formItems(set).map((item, i) => (
              <li key={item.id}>
                <b>{i + 1}</b>
                <Icon name={item.truth === 'fact' ? 'check' : 'close'} size={24} />
                <span>{t(item.truth === 'fact' ? 'fof.truth.fact' : 'fof.truth.fake')}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </>
  );
  const rows = FORMS.flatMap(({ set, label }) =>
    chunk(formItems(set), PER_PAGE).map((group, gi) => (
      <>
        <P2Css />
        <div class="ak__bar">
          <span class="p2-lbl">{`${tx(label)} · ${tx('Answer key')}`}</span>
          <span class="ak__range">{`${gi * PER_PAGE + 1}–${gi * PER_PAGE + group.length}`}</span>
        </div>
        <Fit group="ak" min={0.8} class="ak__fit">
          <ul class="ak__rows">
            {group.map((item, i) => (
              <KeyRow key={item.id} item={item} n={gi * PER_PAGE + i + 1} />
            ))}
          </ul>
        </Fit>
      </>
    )),
  );
  return [summary, ...rows];
}
