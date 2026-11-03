// One A4 poster per module: title, topic, 3 to 5 key ideas (lesson card titles), the takeaway, the game and a QR.
import { Ara } from '../../../../src/ui/Ara';
import { Icon } from '../../../../src/ui/Icon';
import { t } from '../../../../src/app/i18n';
import { tx } from '../../../../src/i18n/runtime';
import { MODULES, type ModuleInfo } from '../../../../src/content/modules';
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
import { Banner, Panel, Qr, Sunrise, appLink, type SheetContext, type SheetMeta } from '../kit';

export const meta: SheetMeta = { id: 'module-posters', title: 'Module posters' };

const CONTENT: readonly ModuleContent[] = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10];
const MAX_IDEAS = 5;
const MIN_IDEAS = 3;

interface Idea {
  title: string;
  /** One short line that says what the idea means (the card's own words). */
  note: string;
}

/** The body if it is short, else its first sentence (split after ". ", "? " or "! "). */
function shorten(text: string): string {
  if (text.length <= 160) return text;
  return /^(.+?[.?!])\s/.exec(text)?.[1] ?? text;
}

/**
 * The lesson's info-card titles with their bodies; modules with fewer than three also lend their reveal and sort cards,
 * explained by their tile labels or bin labels (a reveal prompt such as "Tap each one" says nothing on a wall).
 */
function keyIdeas(content: ModuleContent): Idea[] {
  const ideas: Idea[] = content.cards.flatMap((c): Idea[] => (c.type === 'info' ? [{ title: c.title, note: c.body }] : []));
  if (ideas.length < MIN_IDEAS) {
    for (const c of content.cards) {
      if (ideas.length >= MAX_IDEAS) break;
      if (c.type === 'reveal') ideas.push({ title: c.title, note: c.tiles.map((x) => tx(x.label)).join(' · ') });
      else if (c.type === 'swipe-sort') ideas.push({ title: c.title, note: c.bins.map((x) => tx(x.label)).join(' · ') });
    }
  }
  return ideas.slice(0, MAX_IDEAS);
}

function poster(info: ModuleInfo, content: ModuleContent, ctx: SheetContext) {
  const ideas = keyIdeas(content);
  return (
    <>
      <Banner
        title={tx(info.title)}
        sub={`${t('learn.dialogTitle', { n: info.n })} · ${tx(info.topic)}`}
        left={<Ara scale={3} mood="happy" animate={false} decorative />}
        right={<Sunrise width={24} />}
      />
      <div class="mp__ideas">
        <h2 class="k-title mp__label">{tx('Key ideas')}</h2>
        <ol class="mp__list" data-check-overflow>
          {ideas.map((idea, i) => (
            <li key={idea.title} class="k-panel mp__idea">
              <span class="k-chip">{i + 1}</span>
              <div>
                <p class="mp__idea-text">{tx(idea.title)}</p>
                <p class="mp__idea-note">{shorten(tx(idea.note))}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <Panel class="mp__trust">
        <h2 class="k-title mp__label">{t('lesson.takeawayTitle')}</h2>
        <ul class="k-bullets mp__bullets">
          {content.takeaway.bullets.map((b) => (
            <li key={b}>{tx(b)}</li>
          ))}
        </ul>
      </Panel>
      <div class="mp__foot">
        <Panel class="mp__game">
          <Icon name="arcade" size={48} />
          <div>
            <p class="mp__game-label">{tx('Play the game')}</p>
            <p class="mp__game-name">{info.game}</p>
          </div>
        </Panel>
        <Qr url={appLink(ctx, `/learn/${info.id}`)} caption={tx('Scan to learn this module')} size={22} />
      </div>
    </>
  );
}

export default function build(ctx: SheetContext) {
  return MODULES.map((info, i) => poster(info, CONTENT[i] as ModuleContent, ctx));
}
