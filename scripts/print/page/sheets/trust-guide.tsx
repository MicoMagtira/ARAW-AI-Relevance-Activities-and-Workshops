// "When should I trust it?": the ten module takeaways on one A4 page, with Ara, the sunrise, a QR and the partner logos.
import { Ara } from '../../../../src/ui/Ara';
import { PartnerLogos } from '../../../../src/ui/PartnerLogos';
import { t } from '../../../../src/app/i18n';
import { tx } from '../../../../src/i18n/runtime';
import { MODULES } from '../../../../src/content/modules';
import type { ModuleContent } from '../../../../src/modules/types';
import m01 from '../../../../src/modules/m01';
import m02 from '../../../../src/modules/m02';
import m03 from '../../../../src/modules/m03';
import m04 from '../../../../src/modules/m04';
import m05 from '../../../../src/modules/m05';
import m06 from '../../../../src/modules/m06';
import m07 from '../../../../src/modules/m07';
import m08 from '../../../../src/modules/m08';
import m09 from '../../../../src/modules/m09';
import m10 from '../../../../src/modules/m10';
import { Banner, Fit, Panel, Qr, appLink, type SheetContext, type SheetMeta } from '../kit';

export const meta: SheetMeta = { id: 'trust-guide', title: 'When should I trust it?' };

const CONTENT: readonly ModuleContent[] = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10];

export default function build(ctx: SheetContext) {
  const card = (i: number) => {
    const info = MODULES[i];
    const bullets = CONTENT[i]?.takeaway.bullets ?? [];
    if (!info) return null;
    return (
      <Panel class="tg__card" key={info.id}>
        <header class="tg__head">
          <span class="k-chip">{info.n}</span>
          <h2 class="k-h2">{tx(info.short)}</h2>
        </header>
        <ul class="k-bullets tg__bullets">
          {bullets.slice(0, 1).map((b) => (
            <li key={b}>{tx(b)}</li>
          ))}
        </ul>
      </Panel>
    );
  };
  return [
    <>
      <Banner
        title={t('lesson.takeawayTitle')}
        sub={tx('Scan the code to open ARAW on your phone.')}
        left={<Ara scale={3} mood="happy" animate={false} decorative />}
        right={<Qr url={appLink(ctx, '/learn')} size={22} />}
      />
      <div class="tg__grid">
        {/* one fit group: both columns share one type size, shrunk only as far as the longer column needs */}
        <Fit group="tg" min={0.83} class="tg__col">
          <div class="tg__stack">{[0, 1, 2, 3, 4].map(card)}</div>
        </Fit>
        <Fit group="tg" min={0.83} class="tg__col">
          <div class="tg__stack">{[5, 6, 7, 8, 9].map(card)}</div>
        </Fit>
      </div>
      <div class="tg__foot">
        <div class="k-logos">
          <PartnerLogos variant="strip" />
        </div>
      </div>
    </>,
  ];
}
