// Content checks for the full Fact or Fake bank (T06): schema, balance per set and module, A/B matching, practice isolation.
import { describe, expect, it } from 'vitest';
import { FOF_ITEMS } from '../../src/content/factOrFake/items';
import { FORMATS, MODULE_TAGS, TRICKS, validateBank, validateItem, type FofItem } from '../../src/content/factOrFake/schema';
import { formRound } from '../../src/games/fact-or-fake/assessRound';
import { FREE_PLAY_SIZE, buildRound, practicePool } from '../../src/games/fact-or-fake/rounds';

const ofSet = (set: FofItem['set']) => FOF_ITEMS.filter((i) => i.set === set);
const facts = (items: readonly FofItem[]) => items.filter((i) => i.truth === 'fact').length;
const fakes = (items: readonly FofItem[]) => items.filter((i) => i.truth === 'fake').length;
const words = (s: string) => s.trim().split(/\s+/).length;
const FAKE_TRICKS = TRICKS.filter((t) => t !== 'none');
const practice = ofSet('practice');
const formA = ofSet('form_A');
const formB = ofSet('form_B');

describe('Fact or Fake bank: schema', () => {
  it('passes the full validator with complete forms', () => {
    expect(validateBank(FOF_ITEMS, { requireCompleteForms: true })).toEqual([]);
    for (const i of FOF_ITEMS) expect(validateItem(i)).toEqual([]);
  });

  it('has unique ids and only the three known sets', () => {
    expect(new Set(FOF_ITEMS.map((i) => i.id)).size).toBe(FOF_ITEMS.length);
    expect(FOF_ITEMS.length).toBe(practice.length + formA.length + formB.length);
  });

  it('is all unreviewed, never gives dosing and keeps feedback short', () => {
    for (const i of FOF_ITEMS) {
      expect(i.review_status, i.id).toBe('unreviewed');
      expect(`${i.text} ${i.explanation} ${i.how_to_check}`, i.id).not.toMatch(/\b\d+\s?(mg|mcg|ml|tablets?|capsules? a day)\b/i);
      expect(words(i.explanation), `${i.id} explanation`).toBeLessThanOrEqual(40);
      expect(words(i.how_to_check), `${i.id} how_to_check`).toBeLessThanOrEqual(25);
    }
  });

  it('uses fictional authors only and marks every picture as synthetic', () => {
    for (const i of FOF_ITEMS) {
      expect(i.author, i.id).not.toMatch(/\b(DOH|WHO|FDA|PhilHealth|National Privacy Commission)\b/);
      if (i.image) expect(i.image.alt, i.id).toMatch(/synthetic/);
    }
  });

  it('links myths only by known ids', () => {
    const known = new Set(['tawa-tawa-dengue', 'antibiotics-colds', 'forwarded-many-times', 'chatbot-always-right', 'natural-is-safe']);
    for (const i of FOF_ITEMS) if (i.myth_id) expect(known.has(i.myth_id), i.id).toBe(true);
  });
});

describe('Fact or Fake bank: practice set', () => {
  it('holds at least 50 balanced items covering every format and trick', () => {
    expect(practice.length).toBeGreaterThanOrEqual(50);
    expect(facts(practice)).toBe(fakes(practice));
    for (const f of FORMATS) expect(practice.some((i) => i.format === f), f).toBe(true);
    for (const t of FAKE_TRICKS) expect(practice.filter((i) => i.trick === t).length, t).toBeGreaterThanOrEqual(4);
  });

  it('gives every module a balanced slice of at least six (ten for M4)', () => {
    for (const m of MODULE_TAGS) {
      const slice = practice.filter((i) => i.module === m);
      expect(slice.length, m).toBeGreaterThanOrEqual(m === 'm04' ? 10 : 6);
      expect(facts(slice), m).toBe(fakes(slice));
    }
  });

  it('never repeats a form item text in practice', () => {
    const formTexts = new Set([...formA, ...formB].map((i) => i.text));
    for (const i of practice) expect(formTexts.has(i.text), i.id).toBe(false);
  });
});

describe('Fact or Fake bank: forms A and B', () => {
  it('has 20 items in each form, 10 fact and 10 fake', () => {
    for (const form of [formA, formB]) {
      expect(form).toHaveLength(20);
      expect(facts(form)).toBe(10);
      expect(fakes(form)).toBe(10);
    }
  });

  it('matches A and B item-for-item on truth, domain, format, trick, difficulty and module', () => {
    const pairIds = formA.map((i) => i.pair_id);
    expect(new Set(pairIds).size).toBe(20);
    for (const a of formA) {
      const b = formB.filter((i) => i.pair_id === a.pair_id);
      expect(b, String(a.pair_id)).toHaveLength(1);
      const twin = b[0] as FofItem;
      expect(twin.id).toBe(a.id.replace('fof-a-', 'fof-b-'));
      for (const field of ['truth', 'domain', 'format', 'trick', 'difficulty', 'module'] as const) {
        expect(twin[field], `${a.pair_id} ${field}`).toBe(a[field]);
      }
      expect(twin.text).not.toBe(a.text);
    }
  });

  it('uses each of the five tricks twice in each form', () => {
    for (const form of [formA, formB]) {
      for (const t of FAKE_TRICKS) expect(form.filter((i) => i.trick === t).length, t).toBe(2);
    }
  });

  it('mixes formats and difficulties in each form', () => {
    for (const form of [formA, formB]) {
      for (const f of FORMATS) expect(form.some((i) => i.format === f), f).toBe(true);
      for (const d of [1, 2, 3]) expect(form.some((i) => i.difficulty === d), String(d)).toBe(true);
    }
  });
});

describe('Fact or Fake bank: practice selectors never use form items', () => {
  it('keeps the practice pool to practice items', () => {
    expect(practicePool()).toEqual(practice);
  });

  it('free play rounds are full, balanced and practice-only', () => {
    for (let s = 0; s < 100; s++) {
      const round = buildRound({ size: FREE_PLAY_SIZE, seed: `free-${s}` });
      expect(round).toHaveLength(FREE_PLAY_SIZE);
      expect(round.every((i) => i.set === 'practice')).toBe(true);
      expect(facts(round)).toBe(fakes(round));
    }
  });

  it('module mini rounds come fully from the module slice and stay practice-only', () => {
    for (const m of MODULE_TAGS) {
      const size = m === 'm04' ? 10 : 5;
      for (let s = 0; s < 20; s++) {
        const round = buildRound({ size, seed: `${m}-${s}`, module: m });
        expect(round).toHaveLength(size);
        expect(round.every((i) => i.set === 'practice' && i.module === m), m).toBe(true);
        expect(Math.abs(facts(round) - fakes(round))).toBeLessThanOrEqual(size % 2);
      }
    }
  });

  it('forms only ever return their own items', () => {
    expect(formRound('form_A').map((i) => i.id).sort()).toEqual(formA.map((i) => i.id).sort());
    expect(formRound('form_B').map((i) => i.id).sort()).toEqual(formB.map((i) => i.id).sort());
  });
});
