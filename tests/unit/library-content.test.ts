// Validates the Library content banks (docs/SPEC.md section 8, docs/CONTENT_GUIDE.md section 6).
import { describe, expect, it } from 'vitest';
import { FOF_ITEMS } from '../../src/content/factOrFake/items';
import { MODULE_TAGS } from '../../src/content/factOrFake/schema';
import { GLOSSARY } from '../../src/content/library/glossary';
import {
  KIND_EXPRESSIONS,
  KOMIKS,
  KOMIKS_CAST,
  KOMIKS_EXPRESSIONS,
  KOMIKS_PROPS,
  KOMIKS_SETTINGS,
  KOMIKS_TIMES,
} from '../../src/content/library/komiks';
import { MYTH_PROGRAMS, MYTH_PROGRAM_LABELS, MYTH_TOPICS, MYTH_TOPIC_LABELS, MYTHS, mythById } from '../../src/content/library/myths';
import { VILLAIN_IDS } from '../../src/content/tactics';

const words = (s: string): number => s.trim().split(/\s+/).length;
const unique = (xs: readonly string[]): boolean => new Set(xs).size === xs.length;
/** Shaming words that must never appear in any Library text (mock the trick, never the person). */
const SHAMING = /\b(stupid|dumb|idiot|gullible|fool(ish)?|tanga|bobo|ignorant|senile|uto-uto|mangmang)\b/i;
const DOSING = /\b\d+\s?(mg|ml|tablets?|capsules?)\b/i;

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

describe('myth bank', () => {
  it('has at least 24 myths with unique ids', () => {
    expect(MYTHS.length).toBeGreaterThanOrEqual(24);
    expect(unique(MYTHS.map((m) => m.id))).toBe(true);
    expect(unique(MYTHS.map((m) => m.myth.toLowerCase()))).toBe(true);
  });

  it('every myth has all fields within the length rules', () => {
    for (const m of MYTHS) {
      expect(m.myth.length, m.id).toBeLessThan(70);
      expect(m.fact.length, m.id).toBeLessThan(120);
      expect(words(m.why), m.id).toBeLessThanOrEqual(40);
      expect(words(m.check), m.id).toBeLessThanOrEqual(25);
      expect(m.why.length, m.id).toBeGreaterThan(20);
      expect(m.check.length, m.id).toBeGreaterThan(20);
      expect(m.basis.trim().length, m.id).toBeGreaterThan(8);
      expect(m.review_status).toBe('unreviewed');
    }
  });

  it('uses valid topics, villains and modules, and covers every topic', () => {
    for (const m of MYTHS) {
      expect(MYTH_TOPICS).toContain(m.topic);
      expect(VILLAIN_IDS).toContain(m.villain);
      expect(MODULE_TAGS).toContain(m.module);
    }
    for (const topic of MYTH_TOPICS) {
      expect(MYTH_TOPIC_LABELS[topic].length).toBeGreaterThan(0);
      expect(MYTHS.filter((m) => m.topic === topic).length, topic).toBeGreaterThanOrEqual(2);
    }
    // every trick shows up somewhere so the villain filter is never empty
    for (const v of VILLAIN_IDS) expect(MYTHS.some((m) => m.villain === v), v).toBe(true);
  });

  it('tags every myth with a DOST-NICER project or null, and each project has myths', () => {
    for (const m of MYTHS) expect(m.program === null || MYTH_PROGRAMS.includes(m.program), m.id).toBe(true);
    for (const p of MYTH_PROGRAMS) {
      expect(MYTH_PROGRAM_LABELS[p].length).toBeGreaterThan(0);
      expect(MYTHS.filter((m) => m.program === p).length, p).toBeGreaterThanOrEqual(4);
    }
    // the project topics map to their projects
    const tie: Record<string, string> = { outbreaks: 'healthph', hiv: 'advocaid', healthai: 'aikasalig', dengue: 'mosquito' };
    for (const m of MYTHS) if (tie[m.topic]) expect(m.program, m.id).toBe(tie[m.topic]);
  });

  it('HIV cards use person-first, stigma-free words', () => {
    const hiv = MYTHS.filter((m) => m.topic === 'hiv');
    expect(hiv.length).toBeGreaterThanOrEqual(6);
    const STIGMA = /\b(victims?|suffer(s|ing|ers?)?|carriers?|infected (people|persons?)|AIDS patients?|promiscuous|high-risk people|HIV-positive people|risky lifestyles?)\b/i;
    for (const m of hiv) expect([m.myth, m.fact, m.why, m.check].filter((s) => STIGMA.test(s)), m.id).toEqual([]);
  });

  it('includes the seed myths from the spec', () => {
    for (const id of ['tawa-tawa-dengue', 'herbal-cancer-cure', 'vaccines-not-checked', 'antibiotics-colds', 'pasma-washing-hands', 'doctor-in-ad-proves-it']) {
      expect(mythById(id), id).toBeDefined();
    }
  });

  it('every Fact or Fake myth_id link resolves to a myth card', () => {
    const links = FOF_ITEMS.map((i) => (i as { myth_id?: string }).myth_id).filter((id): id is string => typeof id === 'string');
    expect(links.length).toBeGreaterThan(0);
    expect(links.filter((id) => !mythById(id))).toEqual([]);
  });

  it('health facts carry no emoji', () => {
    expect(MYTHS.filter((m) => /\p{Extended_Pictographic}/u.test(m.fact + m.check))).toEqual([]);
  });
});

describe('glossary (Diksyunaryo)', () => {
  it('has about 32 terms with unique ids and names', () => {
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(30);
    expect(GLOSSARY.length).toBeLessThanOrEqual(40);
    expect(unique(GLOSSARY.map((g) => g.id))).toBe(true);
    expect(unique(GLOSSARY.map((g) => g.term.toLowerCase()))).toBe(true);
  });

  it('is sorted A to Z', () => {
    const names = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('every entry has a short meaning, an Example line and a module link', () => {
    for (const g of GLOSSARY) {
      expect(words(g.meaning), g.id).toBeLessThanOrEqual(15);
      expect(g.meaning.length, g.id).toBeGreaterThan(10);
      expect(g.example, g.id).toMatch(/^Example: .{20,}/);
      expect(MODULE_TAGS).toContain(g.module);
      expect(g.review_status).toBe('unreviewed');
    }
  });

  it('includes the starter terms from the spec', () => {
    const ids = GLOSSARY.map((g) => g.id);
    for (const id of ['algorithm', 'ai', 'machine-learning', 'training-data', 'bias', 'hallucination', 'chatbot', 'deepfake', 'voice-clone',
      'prompt', 'feed', 'viral', 'bot', 'troll', 'fact-check', 'source']) {
      expect(ids, id).toContain(id);
    }
  });
});

describe('Komiks season 1', () => {
  it('has 10 episodes, one per module, in order', () => {
    expect(KOMIKS.map((e) => e.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(KOMIKS.map((e) => e.module)).toEqual([...MODULE_TAGS]);
    expect(unique(KOMIKS.map((e) => e.id))).toBe(true);
    expect(KOMIKS[0]?.title).toBe('The Miracle Tea');
    expect(KOMIKS[9]?.title).toBe('The Hearing');
  });

  it('each episode has 4 to 6 valid panels', () => {
    for (const ep of KOMIKS) {
      expect(ep.review_status).toBe('unreviewed');
      expect(ep.summary.length, ep.id).toBeGreaterThan(20);
      expect(ep.panels.length, ep.id).toBeGreaterThanOrEqual(4);
      expect(ep.panels.length, ep.id).toBeLessThanOrEqual(6);
      ep.panels.forEach((p, i) => {
        const at = `${ep.id} panel ${i + 1}`;
        expect(KOMIKS_SETTINGS, at).toContain(p.setting);
        expect(KOMIKS_TIMES, at).toContain(p.time);
        expect(p.characters.length, at).toBeGreaterThanOrEqual(1);
        expect(p.characters.length, at).toBeLessThanOrEqual(4);
        expect(unique(p.characters.map((ch) => ch.who)), at).toBe(true);
        for (const ch of p.characters) {
          expect(KOMIKS_CAST, at).toContain(ch.who);
          expect(KOMIKS_EXPRESSIONS, at).toContain(ch.expression);
        }
        for (const prop of p.props) expect(KOMIKS_PROPS, at).toContain(prop);
        expect(p.alt.length, at).toBeGreaterThan(20);
        expect(p.bubbles.length, at).toBeLessThanOrEqual(2);
        for (const b of p.bubbles) {
          expect(p.characters.map((ch) => ch.who), `${at}: speaker in scene`).toContain(b.speaker);
          expect(b.text.length, at).toBeLessThanOrEqual(100);
          expect(b.text.trim().length, at).toBeGreaterThan(0);
        }
        // every panel says something: a bubble, a caption or a screen
        expect(p.bubbles.length > 0 || !!p.caption || !!p.screen, at).toBe(true);
      });
    }
  });

  it('every episode ends kindly', () => {
    for (const ep of KOMIKS) {
      const last = ep.panels[ep.panels.length - 1];
      expect(last?.characters.some((ch) => KIND_EXPRESSIONS.includes(ch.expression)), ep.id).toBe(true);
      expect(last?.characters.some((ch) => ch.expression === 'worried'), ep.id).toBe(false);
    }
  });

  it('the whole cast appears, and Ara guides in most episodes', () => {
    const inSeason = new Set(KOMIKS.flatMap((e) => e.panels.flatMap((p) => p.characters.map((ch) => ch.who))));
    for (const who of KOMIKS_CAST) expect(inSeason.has(who), who).toBe(true);
    const withAra = KOMIKS.filter((e) => e.panels.some((p) => p.characters.some((ch) => ch.who === 'ara')));
    expect(withAra.length).toBeGreaterThanOrEqual(9);
  });

  it('Ara lines use at most one emoji', () => {
    const araLines = KOMIKS.flatMap((e) => e.panels.flatMap((p) => p.bubbles.filter((b) => b.speaker === 'ara').map((b) => b.text)));
    expect(araLines.filter((t) => (t.match(/\p{Extended_Pictographic}/gu) ?? []).length > 1)).toEqual([]);
  });

  it('on-screen fakes are flagged so the reader stamps them', () => {
    const screens = KOMIKS.flatMap((e) => e.panels.flatMap((p) => (p.screen ? [p.screen] : [])));
    expect(screens.some((s) => s.fake)).toBe(true);
    // the miracle-tea claims are always marked fake
    for (const s of screens) if (/miracle tea max!|replaces maintenance|cures/i.test(s.text)) expect(s.fake, s.text).toBe(true);
  });
});

describe('Library text is kind and safe', () => {
  const all = strings([MYTHS, GLOSSARY, KOMIKS]);
  it('never shames believers', () => {
    expect(all.filter((s) => SHAMING.test(s))).toEqual([]);
  });
  it('never gives dosing', () => {
    expect(all.filter((s) => DOSING.test(s))).toEqual([]);
  });
});
