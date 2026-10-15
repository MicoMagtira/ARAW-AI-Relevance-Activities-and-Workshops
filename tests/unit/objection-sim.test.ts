// OBJECTION! (T25): the case data, the seeded case builder and the rules (strikes, points, when a run ends).
import { describe, expect, it } from 'vitest';
import { BOTS, COMPLAINANTS, EVIDENCE, TEMPLATES, TEMPLATE_IDS, evidenceCount, statementCount } from '../../src/games/objection/data';
import {
  CASE_BASE,
  CASE_STEP,
  CLEAN_BONUS,
  GOOD_RUN,
  MODULE_CASES,
  STRIKE_LIMIT,
  beginCase,
  buildCase,
  casePoints,
  finished,
  isOver,
  moduleStars,
  newGame,
  objection,
} from '../../src/games/objection/sim';

const SEEDS = ['a', 'b', 'e2e-m10', 'ARAW-2026-10-16', 'zzz'];

describe('case data', () => {
  it('has three templates with enough true statements and false variants for the hardest case', () => {
    expect(TEMPLATE_IDS).toEqual(['leak', 'claim', 'chatbot']);
    for (const id of TEMPLATE_IDS) {
      const tpl = TEMPLATES[id];
      expect(tpl.id).toBe(id);
      expect(tpl.truths.length, id).toBeGreaterThanOrEqual(statementCount(99) - 1);
      expect(tpl.lies.length, id).toBeGreaterThanOrEqual(4);
      expect(tpl.orgs.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives every false statement one proof and enough clearly different decoys', () => {
    for (const id of TEMPLATE_IDS) {
      for (const lie of TEMPLATES[id].lies) {
        expect(EVIDENCE[lie.proof], lie.id).toBeDefined();
        expect(lie.decoys, lie.id).not.toContain(lie.proof);
        expect(new Set(lie.decoys).size, lie.id).toBe(lie.decoys.length);
        expect(lie.decoys.length, lie.id).toBeGreaterThanOrEqual(evidenceCount(99) - 1);
        for (const d of lie.decoys) expect(EVIDENCE[d], `${lie.id}:${d}`).toBeDefined();
        expect(lie.why.length).toBeGreaterThan(20);
        expect(lie.lesson.length).toBeGreaterThan(10);
      }
    }
  });

  it('covers documents, screenshots and rights cards, with the DPA rights in plain words', () => {
    const kinds = new Set(Object.values(EVIDENCE).map((e) => e.kind));
    expect([...kinds].sort()).toEqual(['document', 'right', 'screenshot']);
    for (const r of ['r-informed', 'r-access', 'r-object', 'r-correct', 'r-erase', 'r-portability', 'r-damages', 'r-complain', 'r-human', 'r-accountable']) {
      expect(EVIDENCE[r]?.kind, r).toBe('right');
    }
    expect(EVIDENCE['breach-rule']?.shows).toMatch(/72 hours/);
    expect(EVIDENCE['r-complain']?.shows).toMatch(/National Privacy Commission/);
    expect(COMPLAINANTS.length).toBeGreaterThanOrEqual(5);
    expect(BOTS.length).toBeGreaterThanOrEqual(3);
  });

  it('grows harder: more statements, then more evidence', () => {
    expect([1, 2, 3, 4].map(statementCount)).toEqual([4, 4, 5, 5]);
    expect([1, 2, 3, 4, 5].map(evidenceCount)).toEqual([4, 5, 5, 6, 6]);
  });
});

describe('buildCase', () => {
  it('is the same for the same seed and different for another', () => {
    expect(buildCase('x', 'arcade', 2)).toEqual(buildCase('x', 'arcade', 2));
    const texts = (seed: string) => [1, 2, 3, 4, 5, 6].map((n) => buildCase(seed, 'arcade', n).statements.map((s) => s.text).join('|')).join('||');
    expect(texts('x')).not.toBe(texts('y'));
  });

  it('puts the false statement in the list, its proof in the evidence, and fills every slot', () => {
    for (const seed of SEEDS) {
      for (const mode of ['module', 'arcade'] as const) {
        for (let no = 1; no <= 12; no++) {
          const c = buildCase(seed, mode, no);
          const tpl = TEMPLATES[c.template];
          expect(
            tpl.lies.some((l) => l.proof === c.proofId),
            `${seed} ${mode} ${no}`,
          ).toBe(true);
          expect(c.statements).toHaveLength(statementCount(no));
          expect(c.lieIndex).toBeGreaterThanOrEqual(0);
          expect(c.lieIndex).toBeLessThan(c.statements.length);
          expect(c.evidence).toHaveLength(evidenceCount(no));
          expect(c.evidence.filter((e) => e.id === c.proofId)).toHaveLength(1);
          expect(new Set(c.evidence.map((e) => e.id)).size).toBe(c.evidence.length);
          expect(new Set(c.statements.map((s) => s.text)).size).toBe(c.statements.length);
          const all = [c.title, c.brief, c.witness, c.harm, c.lesson, ...c.statements.flatMap((s) => [s.text, s.press, s.why]), ...c.evidence.flatMap((e) => [e.title, e.shows])].join(' ');
          expect(all, `${seed} ${mode} ${no}`).not.toMatch(/[{}]/);
          expect(c.brief).toContain(c.who);
          expect(c.brief).toContain(c.org);
        }
      }
    }
  });

  it('puts the false statement in different places, not always first or last', () => {
    const places = new Set<number>();
    for (let i = 0; i < 40; i++) places.add(buildCase(`pos${i}`, 'arcade', 3).lieIndex);
    expect(places.size).toBeGreaterThanOrEqual(4);
  });

  it('never lets a decoy prove the false statement: only the proof card is accepted', () => {
    const g = beginCase(newGame('p', 'arcade'));
    const c = buildCase('p', 'arcade', 1);
    for (const e of c.evidence) {
      const r = objection(g, c, c.lieIndex, e.id);
      expect(r.kind === 'won').toBe(e.id === c.proofId);
    }
  });

  it('plays the module in a fixed order (leak, claim, chatbot) and the Arcade in a seeded order that covers all three', () => {
    expect([1, 2, 3].map((n) => buildCase('m', 'module', n).template)).toEqual(['leak', 'claim', 'chatbot']);
    for (const seed of SEEDS) expect(new Set([1, 2, 3].map((n) => buildCase(seed, 'arcade', n).template)).size).toBe(3);
    const orders = new Set(SEEDS.concat(['q', 'r', 's', 't', 'u']).map((s) => [1, 2, 3].map((n) => buildCase(s, 'arcade', n).template).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('uses a different false statement each time an incident comes back, until it has used them all', () => {
    for (const id of TEMPLATE_IDS) {
      const n = TEMPLATES[id].lies.length;
      const seen = new Set<string>();
      for (let round = 0; round < n; round++) {
        // in the module order the template for case k is k mod 3
        const no = TEMPLATE_IDS.indexOf(id) + 1 + round * 3;
        const c = buildCase('rot', 'module', no);
        expect(c.template).toBe(id);
        seen.add(c.proofId + c.statements[c.lieIndex]?.text);
      }
      expect(seen.size).toBe(n);
    }
  });

  it('keeps chatbot advice safe: no dosing, and it tells people to see a health worker', () => {
    const chat = JSON.stringify(TEMPLATES.chatbot) + JSON.stringify(EVIDENCE);
    expect(chat).not.toMatch(/\b\d+\s?(mg|ml|tablet|capsule)/i);
    expect(JSON.stringify(TEMPLATES.chatbot.lies)).toMatch(/see a health worker/);
  });
});

describe('rules', () => {
  const start = (mode: 'module' | 'arcade' = 'arcade') => beginCase(newGame('rules', mode));

  it('starts at case 0 and begins a clean case', () => {
    const g = newGame('s', 'arcade');
    expect(g.caseNo).toBe(0);
    const n = beginCase(g);
    expect(n.caseNo).toBe(1);
    expect(n.caseStrikes).toBe(0);
    expect(n.closed).toBe(false);
  });

  it('wins a case with the false statement and the right card, with the clean bonus', () => {
    const g = start();
    const c = buildCase('rules', 'arcade', 1);
    const r = objection(g, c, c.lieIndex, c.proofId);
    if (r.kind !== 'won') throw new Error('should win');
    expect(r.clean).toBe(true);
    expect(r.points).toBe(CASE_BASE + CLEAN_BONUS);
    expect(r.game.score).toBe(150);
    expect(r.game.won).toBe(1);
    expect(r.game.clean).toBe(1);
    expect(r.game.strikes).toBe(0);
    expect(r.game.closed).toBe(true);
  });

  it('overrules an objection to a true statement, marks it checked and adds a strike', () => {
    const g = start();
    const c = buildCase('rules', 'arcade', 1);
    const wrong = c.statements.findIndex((_, i) => i !== c.lieIndex);
    const r = objection(g, c, wrong, c.proofId);
    expect(r.kind).toBe('true-statement');
    expect(r.game.strikes).toBe(1);
    expect(r.game.caseStrikes).toBe(1);
    expect(r.game.checked).toEqual([wrong]);
    expect(r.game.score).toBe(0);
    expect(r.game.closed).toBe(false);
    // a second try on the same statement does not list it twice
    expect(objection(r.game, c, wrong, c.proofId).game.checked).toEqual([wrong]);
  });

  it('counts the right statement with the wrong card as a strike, and then wins without the clean bonus', () => {
    const g = start();
    const c = buildCase('rules', 'arcade', 1);
    const decoy = c.evidence.find((e) => e.id !== c.proofId)?.id as string;
    const miss = objection(g, c, c.lieIndex, decoy);
    expect(miss.kind).toBe('wrong-evidence');
    expect(miss.game.strikes).toBe(1);
    expect(miss.game.checked).toEqual([]);
    const win = objection(miss.game, c, c.lieIndex, c.proofId);
    if (win.kind !== 'won') throw new Error('should win');
    expect(win.clean).toBe(false);
    expect(win.points).toBe(CASE_BASE);
    expect(win.game.clean).toBe(0);
    expect(win.game.strikes).toBe(1);
  });

  it('raises the points with every case and starts each case with a clean slate', () => {
    expect(casePoints(1, true)).toBe(150);
    expect(casePoints(2, false)).toBe(CASE_BASE + CASE_STEP);
    expect(casePoints(5, true)).toBe(CASE_BASE + 4 * CASE_STEP + CLEAN_BONUS);
    const next = beginCase({ ...start(), strikes: 1, caseStrikes: 1, checked: [2], closed: true });
    expect(next.caseNo).toBe(2);
    expect(next.strikes).toBe(1);
    expect(next.caseStrikes).toBe(0);
    expect(next.checked).toEqual([]);
    expect(next.closed).toBe(false);
  });

  it('ends the run on the third strike', () => {
    let g = start();
    const c = buildCase('rules', 'arcade', 1);
    const wrong = c.statements.findIndex((_, i) => i !== c.lieIndex);
    for (let i = 0; i < STRIKE_LIMIT; i++) {
      expect(isOver(g)).toBe(false);
      g = objection(g, c, wrong, c.proofId).game;
    }
    expect(isOver(g)).toBe(true);
    expect(finished(g)).toBe(true);
  });

  it('finishes the module after three cases won, and a perfect run scores a good run in the Arcade', () => {
    let g = newGame('perfect', 'module');
    for (let no = 1; no <= MODULE_CASES; no++) {
      expect(finished(g)).toBe(false);
      g = beginCase(g);
      const c = buildCase('perfect', 'module', no);
      const r = objection(g, c, c.lieIndex, c.proofId);
      if (r.kind !== 'won') throw new Error('should win');
      g = r.game;
    }
    expect(finished(g)).toBe(true);
    expect(g.won).toBe(3);
    expect(g.clean).toBe(3);
    let a = newGame('perfect', 'arcade');
    for (let no = 1; no <= 5; no++) {
      a = beginCase(a);
      const c = buildCase('perfect', 'arcade', no);
      const r = objection(a, c, c.lieIndex, c.proofId);
      if (r.kind === 'won') a = r.game;
    }
    expect(finished(a)).toBe(false);
    expect(a.score).toBeGreaterThanOrEqual(GOOD_RUN);
  });

  it('gives module stars from cases won and strikes taken', () => {
    expect(moduleStars(3, 0)).toBe(3);
    expect(moduleStars(3, 1)).toBe(3);
    expect(moduleStars(3, 2)).toBe(2);
    expect(moduleStars(2, 2)).toBe(2);
    expect(moduleStars(1, 3)).toBe(1);
    expect(moduleStars(0, 3)).toBe(1);
  });
});
