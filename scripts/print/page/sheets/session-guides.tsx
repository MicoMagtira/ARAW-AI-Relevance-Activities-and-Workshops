// Facilitator guide: how to run a 45-minute ARAW session (2 pages), then one page per module built from the real lesson content.
import { Ara } from '../../../../src/ui/Ara';
import { Icon } from '../../../../src/ui/Icon';
import { PartnerLogos } from '../../../../src/ui/PartnerLogos';
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
import { Banner, Fit, Panel, Qr, Sunrise, appLink, type SheetContext, type SheetMeta } from '../kit';
import { P2Css } from '../p2c';

export const meta: SheetMeta = { id: 'session-guides', title: 'Session guide' };

const CONTENT: readonly ModuleContent[] = [m01, m02, m03, m04, m05, m06, m07, m08, m09, m10];

/** Minutes of the 45-minute session; the timing strip and the flow list both read this. */
const FLOW = [
  { label: 'Hook', min: 5, how: 'Read the story line aloud. Ask: what would you do?' },
  { label: 'Key ideas', min: 15, how: 'Go through the lesson cards together, one idea at a time.' },
  { label: 'Activity', min: 15, how: 'Play the module game, or use the paper activity.' },
  { label: 'Discuss and takeaway', min: 10, how: 'Talk through the prompts, then read the takeaway aloud.' },
] as const;

/** A paper way to run each module's activity with the print kit, for sessions without phones. */
const PAPER: Readonly<Record<string, string>> = {
  m01: 'Each person names one thing they use every day. The group votes: AI or not?',
  m02: 'Give the group a few examples and ask what a learner would guess. Then show lopsided examples and ask what goes wrong.',
  m03: 'Read the red-flag card aloud. For each flag, the group says: go to a health facility now.',
  m04: 'Use the five-tricks poster. Read a post aloud and the group names the trick.',
  m05: 'Use the check-before-share card. Practise the three steps, then a kind reply.',
  m06: 'List tasks at work. The group sorts them: AI can help, or a person must decide.',
  m07: 'Describe a picture or video. The group says: made by AI? What label should it have?',
  m08: 'Each person shares one habit that keeps them scrolling and one simple boundary.',
  m09: 'Name who could be left out of a health app. The group suggests one fix for each.',
  m10: 'Read the data rights aloud. Practise who to complain to, step by step.',
};

const CSS = `
.sg__two { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; align-items: stretch; }
.sg__list { font-size: 12.5pt; line-height: 1.3; gap: 1.6mm; }
.sg__panel { display: grid; gap: 2mm; align-content: start; }
.sg__flow { display: grid; gap: 1.6mm; font-size: 12.5pt; line-height: 1.3; }
.sg__flow li { display: grid; grid-template-columns: 30mm 1fr; gap: 2.4mm; align-items: baseline; }
.sg__flow b { font: 800 12.5pt/1.2 var(--font-head); color: var(--navy); }
.sg__strip { display: flex; gap: 1mm; }
.sg__seg { flex: var(--min) 1 0; min-width: 32mm; padding: 1.4mm 2mm; border: 0.6mm solid var(--ink); background: var(--surface); font: 700 12pt/1.15 var(--font-body); text-align: center; display: grid; gap: 0.6mm; align-content: center; }
.sg__seg:nth-child(odd) { background: var(--banner-tint); }
.sg__seg span { white-space: nowrap; font: 12pt/1.2 var(--font-pixel); color: var(--navy); }
.sg__core { background: var(--banner-tint); font-size: 13.5pt; line-height: 1.32; }
.sg__core strong { display: block; margin-top: 1.4mm; font: 12pt/1.4 var(--font-pixel); color: var(--navy); text-transform: uppercase; }
.sg__cover { display: flex; align-items: center; justify-content: space-between; gap: 4mm; }
.sg__cover .k-logos { flex: 1; }
.sg__cover .k-logos .partners { --logo-h: 6.4mm; }
.sg__quote { font: 700 13pt/1.3 var(--font-body); }
.sg__quote small { display: block; font: 700 12pt/1.3 var(--font-body); color: var(--muted); margin-bottom: 1mm; }
.sg__quote cite { display: block; margin-top: 1mm; font: 800 12pt/1.2 var(--font-head); font-style: normal; color: var(--navy); }
.sg__nums { display: grid; gap: 2mm; font-size: 12.5pt; line-height: 1.28; counter-reset: q; }
.sg__nums li { position: relative; padding-left: 8mm; }
.sg__nums li::before { counter-increment: q; content: counter(q); position: absolute; left: 0; top: 0; width: 5.6mm; height: 5.6mm; display: grid; place-items: center; font: 10pt/1 var(--font-pixel); background: var(--gold); border: 0.5mm solid var(--ink); }
.sg__act { display: grid; grid-template-columns: 1fr 1.5fr; gap: 4mm; }
.sg__game { display: flex; align-items: center; gap: 3mm; }
.sg__game .px-icon { flex: none; width: 10mm; height: 10mm; }
.sg__game-name { font: 12pt/1.4 var(--font-pixel); color: var(--navy); }
.sg__trust { background: var(--banner-tint); }
.sg__bullets { font-size: 13pt; line-height: 1.3; gap: 1.6mm; }
.sg__topic { font: 700 12.5pt/1.3 var(--font-body); }
.sg__body { display: grid; gap: 3.6mm; }
`;

const FlowStrip = () => (
  <div class="sg__strip" role="list">
    {FLOW.map((f) => (
      <div key={f.label} class="sg__seg" role="listitem" style={{ '--min': f.min }}>
        <span>{`${f.min} ${tx('min')}`}</span>
        {tx(f.label)}
      </div>
    ))}
  </div>
);

const Bullets = ({ items }: { items: readonly string[] }) => (
  <ul class="k-bullets sg__list">
    {items.map((s) => (
      <li key={s}>{tx(s)}</li>
    ))}
  </ul>
);

/** Two to three prompts from the module's own poll and choice cards (polls first: they have no wrong answer). */
function prompts(content: ModuleContent): string[] {
  const polls = content.cards.flatMap((c) => (c.type === 'poll' ? [c.question] : []));
  const choices = content.cards.flatMap((c) => (c.type === 'choice' ? [c.question] : []));
  return [...polls, ...choices].slice(0, 3);
}

/** Lesson card titles, as on the module poster. */
function keyIdeas(content: ModuleContent): string[] {
  const titled = (types: readonly string[]) => content.cards.flatMap((c) => (types.includes(c.type) && 'title' in c ? [c.title] : []));
  const ideas = titled(['info']);
  if (ideas.length < 3) for (const title of titled(['reveal', 'swipe-sort'])) if (ideas.length < 5 && !ideas.includes(title)) ideas.push(title);
  return ideas.slice(0, 5);
}

function intro(ctx: SheetContext) {
  return [
    <>
      <style>{CSS}</style>
      <P2Css />
      <Banner
        title={tx('How to run an ARAW session')}
        sub={tx('A short guide for facilitators: teachers, health workers and community leaders.')}
        left={<Ara scale={3} mood="happy" animate={false} decorative />}
        right={<Qr url={appLink(ctx, '/learn')} caption={tx('Scan the code to open ARAW on your phone.')} size={22} />}
      />
      <div class="sg__two">
        <Panel class="sg__panel">
          <h2 class="k-h2">{tx('Before the session')}</h2>
          <Bullets
            items={[
              'Read the module page for the day. Play the lesson once yourself.',
              'Pick a quiet, well-lit place and charge the phones.',
              'Print the pages you need from this kit.',
              'Know your nearest health center, so you can point people to it.',
            ]}
          />
        </Panel>
        <Panel class="sg__panel">
          <h2 class="k-h2">{tx('What you need')}</h2>
          <Bullets
            items={[
              'This print kit: this guide, the module posters and the cards.',
              'Phones with ARAW open, or one projector for the whole group.',
              'Pens and paper for the paper activities.',
            ]}
          />
        </Panel>
      </div>
      <Panel class="sg__panel">
        <h2 class="k-h2">{tx('The 45-minute flow')}</h2>
        <FlowStrip />
        <ul class="sg__flow">
          {FLOW.map((f) => (
            <li key={f.label}>
              <b>{tx(f.label)}</b>
              <span>{tx(f.how)}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel class="sg__core sg__panel">
        <h2 class="k-h2">{tx('The core idea: calibrated trust')}</h2>
        <p>{tx('ARAW does not say "trust nothing". It helps people trust the right things, by the right amount.')}</p>
        <p>
          {tx('End every session with the same question:')}
          <strong>{t('lesson.takeawayTitle')}</strong>
        </p>
      </Panel>
      <div class="sg__cover">
        <div class="k-logos">
          <PartnerLogos variant="strip" />
        </div>
        <Sunrise width={22} />
      </div>
    </>,
    <>
      <style>{CSS}</style>
      <P2Css />
      <Banner title={tx('Keep everyone safe')} sub={tx('Kindness and health safety come first.')} left={<Ara scale={3} mood="happy" animate={false} decorative />} right={<Sunrise width={22} />} />
      <Panel class="sg__panel">
        <h2 class="k-h2">{tx('Kindness rules')}</h2>
        <Bullets
          items={[
            'Nobody is shamed or blamed. People share myths because they care.',
            'Mock the trick, never the person.',
            'Talk with people, not down to them. Use plain words and go slowly.',
            'Show what good sources look like, not only what to avoid.',
            'Every answer is welcome. Some prompts have no single right answer.',
          ]}
        />
      </Panel>
      <Panel class="sg__panel">
        <h2 class="k-h2">{tx('Health safety rule')}</h2>
        <Bullets
          items={[
            'Never give doses, diagnoses or treatment advice.',
            'Always point to people: a health worker, the barangay health center or a doctor.',
            'If anyone describes chest pain, trouble breathing, stroke signs, a seizure or heavy bleeding, tell them to go to a health facility now. Do not wait for the session to end.',
            'The red-flag card in this kit lists the signs. Keep it on the table.',
          ]}
        />
      </Panel>
      <Panel class="sg__panel">
        <h2 class="k-h2">{tx('Each module page')}</h2>
        <Bullets
          items={[
            'Learning goals, the story hook and the key ideas for the lesson.',
            'Discussion prompts taken from the lesson, and the activity: the game in the app, or a paper activity.',
            'The takeaway to read aloud, and a timing strip for 45 minutes.',
          ]}
        />
      </Panel>
    </>,
  ];
}

function modulePage(info: ModuleInfo, content: ModuleContent, ctx: SheetContext) {
  const ideas = keyIdeas(content);
  const qs = prompts(content);
  const { hook } = content;
  return (
    <>
      <style>{CSS}</style>
      <P2Css />
      <Banner
        title={tx(info.title)}
        sub={t('learn.dialogTitle', { n: info.n })}
        left={<Ara scale={3} mood="happy" animate={false} decorative />}
        right={<Qr url={appLink(ctx, `/learn/${info.id}`)} size={22} />}
      />
      <Fit group="sg" min={0.8}>
        <div class="sg__body">
          <p class="sg__topic">{tx(info.topic)}</p>
          <div class="sg__two">
            <Panel class="sg__panel">
              <h2 class="k-h2">{t('learn.objectives')}</h2>
              <Bullets items={info.objectives} />
            </Panel>
            <Panel class="sg__panel">
              <h2 class="k-h2">{tx('Story hook')}</h2>
              <p class="sg__quote">
                <small>{tx(hook.scene)}</small>
                {`"${tx(hook.line)}"`}
                <cite>{tx(hook.speaker)}</cite>
              </p>
            </Panel>
          </div>
          <div class="sg__two">
            <Panel class="sg__panel">
              <h2 class="k-h2">{tx('Key ideas')}</h2>
              <Bullets items={ideas} />
            </Panel>
            <Panel class="sg__panel">
              <h2 class="k-h2">{tx('Discussion prompts')}</h2>
              <ol class="sg__nums">
                {qs.map((q) => (
                  <li key={q}>{tx(q)}</li>
                ))}
              </ol>
            </Panel>
          </div>
          <Panel class="sg__panel">
            <h2 class="k-h2">{tx('Activity')}</h2>
            <div class="sg__act">
              <div>
                <p class="sg__quote">
                  <small>{tx('In the app')}</small>
                </p>
                <div class="sg__game">
                  <Icon name="arcade" size={48} />
                  <p class="sg__game-name">{info.game}</p>
                </div>
              </div>
              <p class="sg__quote">
                <small>{tx('On paper')}</small>
                {tx(PAPER[info.id] ?? '')}
              </p>
            </div>
          </Panel>
          <Panel class="sg__panel sg__trust">
            <h2 class="k-h2">{t('lesson.takeawayTitle')}</h2>
            <ul class="k-bullets sg__bullets">
              {content.takeaway.bullets.map((b) => (
                <li key={b}>{tx(b)}</li>
              ))}
            </ul>
          </Panel>
        </div>
      </Fit>
      <FlowStrip />
    </>
  );
}

export default function build(ctx: SheetContext) {
  return [...intro(ctx), ...MODULES.map((info, i) => modulePage(info, CONTENT[i] as ModuleContent, ctx))];
}
