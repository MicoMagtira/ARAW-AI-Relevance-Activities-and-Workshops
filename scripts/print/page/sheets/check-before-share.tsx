// Module 5's three-step checking habit and the kind reply, compiled from its lesson cards (nothing invented).
import { Ara } from '../../../../src/ui/Ara';
import { tx } from '../../../../src/i18n/runtime';
import { MODULES } from '../../../../src/content/modules';
import m05 from '../../../../src/modules/m05';
import { Banner, Panel, Qr, appLink, type SheetContext, type SheetMeta } from '../kit';
import './p2a.css';

export const meta: SheetMeta = { id: 'check-before-share', title: 'Check before you share' };

const INFO = MODULES[4] as (typeof MODULES)[number];

/** "Step 1: Pause" -> "Pause" (works in every language: the pack keeps the colon). */
const afterColon = (s: string): string => s.replace(/^[^:：]*[:：]\s*/, '');

export default function build(ctx: SheetContext) {
  const [pause, who, source, , reply] = m05.cards;
  if (pause?.type !== 'info' || who?.type !== 'reveal' || source?.type !== 'choice' || reply?.type !== 'choice') {
    throw new Error('Module 5 cards changed: check-before-share needs info, reveal, choice, choice in positions 1 to 5');
  }
  const goodSource = source.options[source.correct];
  const goodReply = reply.options[reply.correct];
  const bullets = m05.takeaway.bullets;
  if (!goodSource || !goodReply) throw new Error('Module 5 choice options missing');

  const step = (n: number, head: string, body: unknown) => (
    <Panel class="cs__step">
      <span class="cs__num">{n}</span>
      <div class="cs__what">
        <h2 class="cs__head">{head}</h2>
        {body}
      </div>
    </Panel>
  );

  return [
    <div class="p2a">
      <Banner
        title={tx(INFO.title)}
        left={<Ara scale={3} mood="happy" animate={false} decorative />}
        right={<Qr url={appLink(ctx, `/learn/${INFO.id}`)} caption={tx('Scan to learn this module')} size={22} />}
      />
      <div class="cs__steps">
        {step(1, tx(afterColon(pause.title)), <p class="cs__text">{tx(pause.body)}</p>)}
        {step(
          2,
          tx(afterColon(who.title)),
          <div class="cs__tiles">
            {who.tiles.map((tile) => (
              <div class="cs__tile" key={tile.label}>
                <b>{tx(tile.label)}</b>
                <span>{tx(tile.detail)}</span>
              </div>
            ))}
          </div>,
        )}
        {step(
          3,
          tx('Find another source'),
          <>
            <p class="cs__text">
              <b>{tx(goodSource.text)}</b>
            </p>
          </>,
        )}
        <Panel class="cs__kind">
          <div class="cs__kind-main">
            <h2 class="cs__head">{tx('Reply kindly')}</h2>
            <p class="cs__quote">{tx(goodReply.text)}</p>
            <p class="cs__text">{tx(bullets[1] as string)}</p>
          </div>
        </Panel>
      </div>
    </div>,
  ];
}
