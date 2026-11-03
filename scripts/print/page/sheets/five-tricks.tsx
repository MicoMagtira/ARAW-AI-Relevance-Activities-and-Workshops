// The five misinformation villains on A4: portrait, name, trick, tell-tale signs and the counter-move.
// Two pages (3 + 2 villains and a QR panel) so every language keeps its body text at 12 pt or larger.
import { Ara } from '../../../../src/ui/Ara';
import { VillainPortrait } from '../../../../src/ui/VillainPortrait';
import { tx } from '../../../../src/i18n/runtime';
import { MODULES } from '../../../../src/content/modules';
import { VILLAINS, type Villain } from '../../../../src/content/tactics';
import { Banner, Panel, Qr, Sunrise, appLink, type SheetContext, type SheetMeta } from '../kit';
import './p2a.css';

export const meta: SheetMeta = { id: 'five-tricks', title: 'The five tricks' };

const INFO = MODULES[3] as (typeof MODULES)[number]; // Module 4: Tricks of Health Misinformation

function villainCard(v: Villain, i: number) {
  return (
    <Panel class="ft__card" key={v.id}>
      <div class="ft__art">
        <div class="ft__portrait">
          <VillainPortrait id={v.id} size={112} decorative />
        </div>
        <span class="ft__no">{i + 1}</span>
      </div>
      <div class="ft__body">
        {/* the villain's name is a proper name: never translated */}
        <h2 class="ft__name">{v.name}</h2>
        <p class="ft__trick">{tx(v.trick)}</p>
        <p class="ft__tagline">{tx(v.tagline)}</p>
        <div class="ft__cols">
          <div>
            <span class="ft__label">{tx('Watch for')}</span>
            <ul class="k-bullets ft__tells">
              {v.tells.map((tell) => (
                <li key={tell}>{tx(tell)}</li>
              ))}
            </ul>
          </div>
          <div>
            <span class="ft__label">{tx('What to do')}</span>
            <p class="ft__counter">{tx(v.counter)}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export default function build(ctx: SheetContext) {
  const banner = (
    <Banner
      title={tx(INFO.title)}
      left={<Ara scale={3} mood="happy" animate={false} decorative />}
      right={<Sunrise width={22} />}
    />
  );
  return [
    <div class="p2a" key="1">
      {banner}
      <div class="ft__list">{VILLAINS.slice(0, 3).map(villainCard)}</div>
    </div>,
    <div class="p2a" key="2">
      {banner}
      <div class="ft__list">
        {VILLAINS.slice(3).map((v, i) => villainCard(v, i + 3))}
        <Panel class="ft__ara">
          <div class="ft__ara-top">
            <Ara scale={4} mood="think" animate={false} decorative />
            <div>
              <p class="ft__ara-text">{tx('Play the game')}</p>
              <p class="ft__ara-game">{INFO.game}</p>
            </div>
          </div>
          <div class="ft__ara-qr">
            <Qr url={appLink(ctx, `/learn/${INFO.id}`)} size={26} />
            <p class="ft__ara-text">{tx('Scan to learn this module')}</p>
          </div>
        </Panel>
      </div>
    </div>,
  ];
}
