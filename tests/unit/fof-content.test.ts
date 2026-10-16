import { beforeEach, describe, expect, it } from 'vitest';
import { badgesEarned, bestRadar } from '../../src/app/progress';
import { xp } from '../../src/app/state';
import { resetAll } from '../../src/app/store';
import { FOF_ITEMS } from '../../src/content/factOrFake/items';
import { FORMATS, validateBank, validateItem, type FofItem } from '../../src/content/factOrFake/schema';
import { createRng, hashSeed, shuffle } from '../../src/games/engine/rng';
import { formRound } from '../../src/games/fact-or-fake/assessRound';
import { FREE_PLAY_SIZE, buildRound, practicePool } from '../../src/games/fact-or-fake/rounds';
import { isFormId } from '../../src/games/fact-or-fake/forms';
import { payCorrect, recordRound, scoreAnswers, xpForRound } from '../../src/games/fact-or-fake/results';
import { SCENE_HEIGHT, SCENE_RECTS, SCENE_WIDTH } from '../../src/games/fact-or-fake/scenes';
import type { RoundAnswer } from '../../src/games/fact-or-fake/FofRound';
import { scoreRound, type Answered } from '../../src/games/fact-or-fake/scoring';
import { initials, avatarTone } from '../../src/games/fact-or-fake/ItemCard';

const first = FOF_ITEMS[0] as FofItem;
const clone = (patch: Partial<FofItem>): FofItem => ({ ...first, ...patch });

/** A synthetic practice bank: `facts` facts and `fakes` fakes across modules. */
function bank(facts: number, fakes: number): FofItem[] {
  const out: FofItem[] = [];
  const make = (n: number, truth: 'fact' | 'fake', offset: number) => {
    for (let i = 0; i < n; i++) {
      const id = `fof-p-${String(offset + i + 1).padStart(3, '0')}`;
      out.push({ ...first, id, truth, trick: truth === 'fake' ? 'miracle_mike' : 'none', module: i % 2 ? 'm02' : 'm01' });
    }
  };
  make(facts, 'fact', 0);
  make(fakes, 'fake', facts);
  return out;
}

describe('item bank basics', () => {
  it('is a clean bank with every format, both truths and the three sets (full checks live in fof-bank.test.ts)', () => {
    expect(validateBank(FOF_ITEMS)).toEqual([]);
    for (const f of FORMATS) expect(FOF_ITEMS.some((i) => i.format === f)).toBe(true);
    expect(new Set(FOF_ITEMS.map((i) => i.set))).toEqual(new Set(['practice', 'form_A', 'form_B']));
    expect(practicePool().filter((i) => i.truth === 'fact').length).toBe(practicePool().filter((i) => i.truth === 'fake').length);
  });
});

describe('validator', () => {
  it('accepts a valid item', () => {
    expect(validateItem(first)).toEqual([]);
  });

  it('rejects bad enums, empty text and wrong ids', () => {
    expect(validateItem(clone({ format: 'video' as never }))[0]).toMatch(/invalid format/);
    expect(validateItem(clone({ module: 'm11' as never }))[0]).toMatch(/invalid module/);
    expect(validateItem(clone({ difficulty: 4 as never }))[0]).toMatch(/difficulty/);
    expect(validateItem(clone({ text: '  ' }))[0]).toMatch(/text is empty/);
    expect(validateItem(clone({ id: 'fof-x-1' })).join()).toMatch(/does not match the practice pattern/);
    expect(validateItem(clone({ review_status: 'done' as never }))[0]).toMatch(/review_status/);
    expect(validateItem(null)).toEqual(['item is not an object']);
  });

  it('requires facts to use trick none and fakes to have a trick', () => {
    expect(validateItem(clone({ truth: 'fact', trick: 'dr_fake' })).join()).toMatch(/facts must use trick/);
    expect(validateItem(clone({ truth: 'fake', trick: 'none' })).join()).toMatch(/fakes need a trick/);
  });

  it('requires an image descriptor with alt text for image items', () => {
    expect(validateItem(clone({ format: 'image' })).join()).toMatch(/image descriptor/);
    expect(validateItem(clone({ format: 'image', image: { scene: 'tea', alt: '' } })).join()).toMatch(/alt text/);
    expect(validateItem(clone({ format: 'image', image: { scene: 'zebra' as never, alt: 'x' } })).join()).toMatch(/unknown scene/);
    expect(validateItem(clone({ format: 'image', image: { scene: 'tea', alt: 'A cup of tea' } }))).toEqual([]);
  });

  it('detects duplicate ids', () => {
    expect(validateBank([first, first]).join()).toMatch(/duplicate id/);
  });

  it('detects unbalanced forms and unmatched or mismatched pairs', () => {
    const a = FOF_ITEMS.filter((i) => i.set === 'form_A');
    const b = FOF_ITEMS.filter((i) => i.set === 'form_B');
    expect(validateBank([...a, ...b.slice(0, 1)]).join()).toMatch(/form_B: not balanced|needs exactly one/);
    const moved = b.map((i) => (i.id === 'fof-b-02' ? { ...i, difficulty: 2 as const } : i));
    expect(validateBank([...a, ...moved]).join()).toMatch(/differ in difficulty/);
    const swapped = b.map((i) => (i.id === 'fof-b-01' ? { ...i, format: 'gc_screenshot' as const } : i));
    expect(validateBank([...a, ...swapped]).join()).toMatch(/differ in format/);
    expect(validateBank([...a, ...b.map((i) => ({ ...i, pair_id: undefined }))]).join()).toMatch(/pair_id/);
  });

  it('can require complete 20-item forms', () => {
    expect(validateBank(FOF_ITEMS, { requireCompleteForms: true })).toEqual([]);
    const short = FOF_ITEMS.filter((i) => i.id !== 'fof-a-03' && i.id !== 'fof-b-03' && i.id !== 'fof-a-04' && i.id !== 'fof-b-04');
    expect(validateBank(short, { requireCompleteForms: true }).join()).toMatch(/needs 20 items/);
  });
});

describe('seeded rng', () => {
  it('gives the same sequence for the same seed and differs between seeds', () => {
    const a = createRng('ARAW-2026-10-15');
    const b = createRng('ARAW-2026-10-15');
    const c = createRng('ARAW-2026-10-16');
    const seqA = [a(), a(), a()];
    expect(seqA).toEqual([b(), b(), b()]);
    expect(seqA).not.toEqual([c(), c(), c()]);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(hashSeed('x')).toBe(hashSeed('x'));
  });

  it('shuffles without losing or repeating items and without touching the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, createRng('s'));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('round building', () => {
  const counts = (items: FofItem[]) => ({ fact: items.filter((i) => i.truth === 'fact').length, fake: items.filter((i) => i.truth === 'fake').length });

  it('builds balanced rounds of 10 and 5 without repeats', () => {
    const items = bank(20, 20);
    for (const size of [10, 5, 4, 1]) {
      for (let s = 0; s < 20; s++) {
        const round = buildRound({ size, seed: `seed-${s}`, items });
        expect(round).toHaveLength(size);
        expect(new Set(round.map((i) => i.id)).size).toBe(size);
        const c = counts(round);
        expect(Math.abs(c.fact - c.fake)).toBeLessThanOrEqual(size % 2);
      }
    }
    expect(counts(buildRound({ size: FREE_PLAY_SIZE, seed: 'x', items }))).toEqual({ fact: 5, fake: 5 });
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const items = bank(20, 20);
    const ids = (seed: string) => buildRound({ size: 10, seed, items }).map((i) => i.id).join();
    expect(ids('same')).toBe(ids('same'));
    const variety = new Set(Array.from({ length: 10 }, (_, s) => ids(`v${s}`)));
    expect(variety.size).toBeGreaterThan(5);
  });

  it('picks the extra item of an odd round from either side, by seed', () => {
    const items = bank(20, 20);
    const extras = new Set(Array.from({ length: 30 }, (_, s) => counts(buildRound({ size: 5, seed: `o${s}`, items })).fake));
    expect(extras).toEqual(new Set([2, 3]));
  });

  it('prefers the module items and tops up from the rest of the pool', () => {
    const items = bank(10, 10); // module m01 on even indexes
    const round = buildRound({ size: 4, seed: 'm', module: 'm01', items });
    expect(round.every((i) => i.module === 'm01')).toBe(true);
    const big = buildRound({ size: 16, seed: 'm', module: 'm01', items });
    expect(big).toHaveLength(16);
    expect(big.filter((i) => i.module === 'm01').length).toBe(10);
  });

  it('shrinks but stays balanced when the pool is small or one-sided', () => {
    const small = buildRound({ size: 10, seed: 'a', items: bank(3, 5) });
    expect(counts(small)).toEqual({ fact: 3, fake: 3 });
    expect(buildRound({ size: 4, seed: 'a', items: bank(0, 6) })).toHaveLength(0);
    expect(buildRound({ size: 5, seed: 'a', items: bank(0, 6) })).toHaveLength(1); // still within one of balanced
    expect(buildRound({ size: 0, seed: 'a', items: bank(2, 2) })).toEqual([]);
    expect(counts(buildRound({ size: 3, seed: 'a', items: bank(1, 6) }))).toEqual({ fact: 1, fake: 2 });
  });

  it('never puts form_A or form_B items in practice rounds', () => {
    for (let s = 0; s < 50; s++) {
      const round = buildRound({ size: 10, seed: `p${s}` });
      expect(round.every((i) => i.set === 'practice')).toBe(true);
      expect(buildRound({ size: 5, seed: `q${s}`, module: 'm02' }).every((i) => i.set === 'practice')).toBe(true);
    }
    expect(practicePool().every((i) => i.set === 'practice')).toBe(true);
  });

  it('returns a form in a fixed order and nothing else', () => {
    const a = formRound('form_A');
    expect(a.every((i) => i.set === 'form_A')).toBe(true);
    expect(a).toHaveLength(20);
    expect(formRound('form_A').map((i) => i.id)).toEqual(a.map((i) => i.id));
    expect(formRound('form_B').every((i) => i.set === 'form_B')).toBe(true);
    expect(isFormId('form_A')).toBe(true);
    expect(isFormId('practice')).toBe(false);
  });
});

describe('round results', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAll();
  });

  const answers = (nFake: number, hits: number, nFact: number, falseAlarms: number): Answered[] => {
    const list: Answered[] = [];
    for (let i = 0; i < nFake; i++) list.push({ truth: 'fake', answer: i < hits ? 'fake' : 'fact' });
    for (let i = 0; i < nFact; i++) list.push({ truth: 'fact', answer: i < falseAlarms ? 'fake' : 'fact' });
    return list;
  };

  it('pays 10 XP per correct answer', () => {
    expect(xpForRound(7)).toBe(70);
    expect(xpForRound(-1)).toBe(0);
    expect(payCorrect()).toBe(10);
    expect(xp.value).toBe(10);
  });

  it('scores a list of round answers', () => {
    const list: RoundAnswer[] = [
      { item: first, answer: 'fake', correct: true },
      { item: { ...first, truth: 'fact', trick: 'none' }, answer: 'fake', correct: false },
    ];
    expect(scoreAnswers(list)).toEqual(scoreRound([{ truth: 'fake', answer: 'fake' }, { truth: 'fact', answer: 'fake' }]));
  });

  it('does not record short rounds', () => {
    const out = recordRound(scoreRound(answers(4, 4, 4, 0)));
    expect(out).toEqual({ counted: false, newBest: false, badge: false });
    expect(bestRadar.value).toBeNull();
  });

  it('records the best radar of 10+ item rounds and only replaces it with a better d-prime', () => {
    const good = scoreRound(answers(5, 4, 5, 1));
    expect(recordRound(good).newBest).toBe(true);
    expect(bestRadar.value?.dPrime).toBeCloseTo(good.dPrime, 9);
    const worse = scoreRound(answers(5, 3, 5, 2));
    expect(recordRound(worse).newBest).toBe(false);
    expect(bestRadar.value?.dPrime).toBeCloseTo(good.dPrime, 9);
    expect(recordRound(scoreRound(answers(5, 5, 5, 0))).newBest).toBe(true);
  });

  it('earns the Balanced Radar badge once for a sharp, balanced 10-item round', () => {
    expect(recordRound(scoreRound(answers(5, 5, 5, 0))).badge).toBe(true);
    expect(badgesEarned.value).toContain('radar');
    expect(recordRound(scoreRound(answers(5, 5, 5, 0))).badge).toBe(false);
  });

  it('gives no badge when the round leans or is not sharp enough', () => {
    expect(recordRound(scoreRound(answers(5, 5, 5, 5))).badge).toBe(false);
    expect(badgesEarned.value).not.toContain('radar');
  });
});

describe('pixel scenes and avatars', () => {
  it('keeps every scene rectangle inside the 32x16 grid', () => {
    for (const rects of Object.values(SCENE_RECTS)) {
      expect(rects.length).toBeGreaterThan(5);
      for (const [, x, y, w, h] of rects) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(SCENE_WIDTH);
        expect(y + h).toBeLessThanOrEqual(SCENE_HEIGHT);
      }
    }
  });

  it('makes stable initials and avatar tones', () => {
    expect(initials('Healthy Pinoy Tips 24/7')).toBe('HP');
    expect(initials("Lola's Remedies Club")).toBe('LR');
    expect(initials('')).toBe('?');
    expect(avatarTone('Kuya Jun (BHW)')).toBe(avatarTone('Kuya Jun (BHW)'));
    expect(avatarTone('x')).toBeLessThan(4);
  });
});
