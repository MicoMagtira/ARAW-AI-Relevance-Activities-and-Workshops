// Content-wide guards (docs/CONTENT_GUIDE.md): every fact-bearing game item names its basis, and no string anywhere
// in the content gives dosing. Also keeps the assessment forms out of every practice import path.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BADGES } from '../../src/content/badges';
import { AON_POOL } from '../../src/content/aiOrNot';
import { CHAT_ROUNDS, PRIVACY_SCENARIO } from '../../src/content/chatbot';
import { FOF_ITEMS } from '../../src/content/factOrFake/items';
import { GC_SCENARIOS } from '../../src/content/gc';
import { MODULES } from '../../src/content/modules';
import { MYTH_SEEDS } from '../../src/content/myths';
import { GLOSSARY } from '../../src/content/library/glossary';
import { KOMIKS } from '../../src/content/library/komiks';
import { LEGIT_POSTS, TACTIC_POSTS, VILLAINS } from '../../src/content/tactics';
import { LOCAL_POSTS, TEST_POSTS, TRAIN_POSTS } from '../../src/content/turuan';

const lessonModules = import.meta.glob('../../src/modules/m*/index.ts', { eager: true }) as Record<string, { default: unknown }>;

const DOSING = /\b\d+\s?(mg|ml|tablets?|capsules?)\b/i;

/** Every string value inside a nested content object. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

describe('every ARAW GAME item names its basis', () => {
  const withBasis: Record<string, readonly { id: string; basis?: string }[]> = {
    'Fact or Fake': FOF_ITEMS,
    'Spot the Tactic': TACTIC_POSTS,
    'Spot the Tactic (legit)': LEGIT_POSTS,
    'Tanong kay Chatbot': CHAT_ROUNDS,
    "Tita's GC": GC_SCENARIOS,
  };
  for (const [game, items] of Object.entries(withBasis)) {
    it(game, () => {
      expect(items.length).toBeGreaterThan(0);
      const missing = items.filter((i) => typeof i.basis !== 'string' || i.basis.trim().length < 8).map((i) => i.id);
      expect(missing).toEqual([]);
    });
  }

  it('the privacy scenario names its basis too', () => {
    expect(PRIVACY_SCENARIO.basis.trim().length).toBeGreaterThan(8);
  });
});

describe('no content string gives dosing', () => {
  const sources: Record<string, unknown> = {
    fof: FOF_ITEMS,
    tactics: [TACTIC_POSTS, VILLAINS],
    chatbot: [CHAT_ROUNDS, PRIVACY_SCENARIO],
    gc: GC_SCENARIOS,
    aon: AON_POOL,
    turuan: [TRAIN_POSTS, TEST_POSTS, LOCAL_POSTS],
    myths: MYTH_SEEDS,
    library: [GLOSSARY, KOMIKS],
    badges: BADGES,
    modules: MODULES,
    lessons: Object.values(lessonModules).map((m) => m.default),
  };
  for (const [name, data] of Object.entries(sources)) {
    it(name, () => {
      const all = strings(data);
      expect(all.length).toBeGreaterThan(0);
      expect(all.filter((s) => DOSING.test(s))).toEqual([]);
    });
  }

  it('the lesson modules were really collected', () => {
    expect(Object.keys(lessonModules).length).toBeGreaterThanOrEqual(5);
  });
});

describe('assessment forms stay out of the practice bundle', () => {
  const read = (p: string) => readFileSync(resolve(process.cwd(), 'src', p), 'utf8');
  const practicePath = ['games/fact-or-fake/rounds.ts', 'games/fact-or-fake/PracticeRound.tsx', 'games/fact-or-fake/FofRound.tsx', 'games/fact-or-fake/FactOrFake.tsx', 'content/factOrFake/practice.ts'];

  it('only the assess route chunk imports the assessment bank', () => {
    for (const file of practicePath) {
      const src = read(file);
      expect(src, file).not.toMatch(/factOrFake\/assessment|factOrFake\/items|assessRound/);
    }
    // the route entry is part of the main bundle: it must not statically reach any item bank
    expect(read('games/fact-or-fake/LazyFactOrFake.tsx')).not.toMatch(/from '\.\/(rounds|assessRound)'|factOrFake\/(practice|assessment|items)'/);
    expect(read('games/fact-or-fake/LazyFactOrFake.tsx')).toMatch(/import\('\.\/assessRound'\)/);
    expect(read('games/fact-or-fake/assessRound.ts')).toMatch(/factOrFake\/assessment/);
  });

  it('the practice bank holds no form items', () => {
    const practice = read('content/factOrFake/practice.ts');
    expect(practice).not.toMatch(/set: 'form_/);
    expect(read('content/factOrFake/assessment.ts')).not.toMatch(/set: 'practice'/);
  });
});

describe('arcade game content files carry a review marker and no dosing', () => {
  const GAME_CONTENT = ['takbo-data/offers', 'feed-mo-to/posts', 'luto-ni-ara/orders', 'sino-to/calls', 'lamok-lamay/scans',
    'tawid-lola/lanes', 'hati-tayo/tasks', 'gawa-ko-to/rules', 'tulog-na-bea/moments', 'sa-sapatos-nila/data', 'objection/data'];
  const files = import.meta.glob('../../src/games/*/*.ts', { eager: true }) as Record<string, { CONTENT_REVIEW?: { basis: string; review_status: string } }>;
  for (const name of GAME_CONTENT) {
    it(name, () => {
      const mod = files[`../../src/games/${name}.ts`];
      expect(mod?.CONTENT_REVIEW?.review_status).toBe('unreviewed');
      expect(mod?.CONTENT_REVIEW?.basis.length).toBeGreaterThan(20);
      expect(readFileSync(resolve(__dirname, `../../src/games/${name}.ts`), 'utf8')).not.toMatch(DOSING);
    });
  }
});
