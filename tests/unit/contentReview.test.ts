// Keeps docs/CONTENT_REVIEW.md in step with the content banks. Run `REVIEW_WRITE=1 npx vitest run tests/unit/contentReview.test.ts`
// to regenerate the file after adding or changing content; the plain run fails if the file is stale.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AON_POOL } from '../../src/content/aiOrNot';
import { BADGES } from '../../src/content/badges';
import { CHAT_ROUNDS, PRIVACY_SCENARIO } from '../../src/content/chatbot';
import { FOF_ASSESSMENT } from '../../src/content/factOrFake/assessment';
import { FOF_PRACTICE } from '../../src/content/factOrFake/practice';
import { GC_SCENARIOS } from '../../src/content/gc';
import { GLOSSARY } from '../../src/content/library/glossary';
import { KOMIKS } from '../../src/content/library/komiks';
import { MYTH_PROGRAM_LABELS, MYTHS, type Myth } from '../../src/content/library/myths';
import { TACTIC_POSTS, VILLAINS } from '../../src/content/tactics';
import { LOCAL_POSTS, TEST_POSTS, TRAIN_POSTS } from '../../src/content/turuan';

interface Entry { id: string; review_status: string }
interface Group { title: string; file: string; items: readonly Entry[]; extra?: { header: string; cell: (i: Entry) => string } }

/** Myth rows also show the topic and the DOST-NICER project the myth ties to (docs/CONTENT_GUIDE.md section 10). */
const mythTag = (i: Entry): string => {
  const m = i as Myth;
  return `${m.topic} · ${m.program ? MYTH_PROGRAM_LABELS[m.program] : 'none'}`;
};

const MODULE_IDS = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'];
const GAME_FILES: Record<string, string> = {
  'feed-mo-to': 'posts.ts', 'gawa-ko-to': 'rules.ts', 'hati-tayo': 'tasks.ts', 'lamok-lamay': 'scans.ts',
  'luto-ni-ara': 'orders.ts', objection: 'data.ts', 'sa-sapatos-nila': 'data.ts', 'sino-to': 'calls.ts',
  'takbo-data': 'offers.ts', 'tawid-lola': 'lanes.ts', 'tulog-na-bea': 'moments.ts',
};

const groups: Group[] = [
  { title: 'Fact or Fake: practice bank', file: 'src/content/factOrFake/practice.ts', items: FOF_PRACTICE },
  { title: 'Fact or Fake: assessment forms A/B', file: 'src/content/factOrFake/assessment.ts', items: FOF_ASSESSMENT },
  { title: 'Myth cards (Library)', file: 'src/content/library/myths.ts', items: MYTHS, extra: { header: 'Topic · project', cell: mythTag } },
  { title: 'Glossary terms', file: 'src/content/library/glossary.ts', items: GLOSSARY },
  { title: 'Comics episodes', file: 'src/content/library/komiks.ts', items: KOMIKS },
  { title: 'AI or Not? cards', file: 'src/content/aiOrNot.ts', items: AON_POOL },
  { title: 'Chatbot answer rounds', file: 'src/content/chatbot.ts', items: [...CHAT_ROUNDS, PRIVACY_SCENARIO] },
  { title: 'Family GC scenarios', file: 'src/content/gc.ts', items: GC_SCENARIOS },
  { title: 'Villains (tricks)', file: 'src/content/tactics.ts', items: VILLAINS },
  { title: 'Trick-spotting posts', file: 'src/content/tactics.ts', items: TACTIC_POSTS },
  { title: 'Turuan training posts', file: 'src/content/turuan.ts', items: TRAIN_POSTS },
  { title: 'Turuan test posts', file: 'src/content/turuan.ts', items: TEST_POSTS },
  { title: 'Turuan local posts', file: 'src/content/turuan.ts', items: LOCAL_POSTS },
  { title: 'Badges', file: 'src/content/badges.ts', items: BADGES },
  { title: 'Module lessons', file: 'src/modules/mNN/index.ts', items: MODULE_IDS.map((id) => ({ id, review_status: 'unreviewed' })) },
];

const render = (): string => {
  const out = [
    '# Content review list',
    '',
    'Checklist for the medical and cultural reviewers. Every entry below ships as `review_status: "unreviewed"`.',
    'Tick the boxes as entries are checked, then set the entry to `reviewed` in code. Basis and rules: `docs/CONTENT_GUIDE.md`.',
    'Regenerate with `REVIEW_WRITE=1 npx vitest run tests/unit/contentReview.test.ts` (the plain test fails if this file is stale).',
    '',
    '- **Medical reviewer:** facts follow WHO/DOH-level consensus; no dosing or diagnosis; health workers are pointed to.',
    '- **Cultural reviewer:** Filipino flavour is natural and respectful; personas, pages and brands are fictional; wording suits seniors.',
    '',
  ];
  for (const g of groups) {
    const x = g.extra;
    out.push(`## ${g.title} (${g.items.length})`, '', `File: \`${g.file}\``, '',
      x ? `| Done | Id | ${x.header} | Medical | Cultural |` : '| Done | Id | Medical | Cultural |',
      x ? '| --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- |');
    for (const i of g.items) out.push(x ? `| [ ] | \`${i.id}\` | ${x.cell(i)} | [ ] | [ ] |` : `| [ ] | \`${i.id}\` | [ ] | [ ] |`);
    out.push('');
  }
  out.push(`## Game content (${Object.keys(GAME_FILES).length} files)`, '', 'Each game keeps its teaching lines next to its code and marks the whole file with `CONTENT_REVIEW`.', '',
    '| Done | Game | File | Medical | Cultural |', '| --- | --- | --- | --- | --- |');
  for (const [slug, f] of Object.entries(GAME_FILES)) out.push(`| [ ] | \`${slug}\` | \`src/games/${slug}/${f}\` | [ ] | [ ] |`);
  out.push('');
  return out.join('\n');
};

describe('docs/CONTENT_REVIEW.md', () => {
  it('lists only unreviewed entries', () => {
    for (const g of groups) for (const i of g.items) expect(i.review_status, `${g.title} ${i.id}`).toBe('unreviewed');
  });
  it('matches the content banks', () => {
    const next = render();
    if (process.env.REVIEW_WRITE) writeFileSync('docs/CONTENT_REVIEW.md', next);
    expect(readFileSync('docs/CONTENT_REVIEW.md', 'utf8').replace(/\r\n/g, '\n')).toBe(next);
  });
});
