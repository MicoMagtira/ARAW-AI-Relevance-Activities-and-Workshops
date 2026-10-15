// Module 10 (T25): the lesson content, the "OBJECTION!" module game, and the Arcade version.
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startRouter } from '../../src/app/router';
import { bestScores } from '../../src/app/scores';
import { resetAll } from '../../src/app/store';
import { MODULES } from '../../src/content/modules';
import ObjectionArcade from '../../src/games/objection/ObjectionArcade';
import { STRIKE_LIMIT, buildCase } from '../../src/games/objection/sim';
import m10 from '../../src/modules/m10';
import ObjectionGame from '../../src/modules/m10/ObjectionGame';
import { hasContent, loadContent } from '../../src/modules/registry';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('Module 10 content', () => {
  it('has the hook, seven cards in SPEC order, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm10');
    expect(1 + m10.cards.length).toBe(info?.cards);
    expect(m10.cards.map((c) => c.type)).toEqual(['info', 'reveal', 'choice', 'choice', 'reveal', 'swipe-sort', 'poll']);
    expect(m10.hook.speaker).toBe('Tita Baby');
    expect(m10.hook.line).toMatch(/lab results/);
    expect(m10.game.slug).toBe('objection');
    expect(m10.game.name).toBe(info?.game);
    const ids = [m10.hook.id, ...m10.cards.map((c) => c.id), m10.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m10.review_status).toBe('unreviewed');
  });

  it('keeps info cards short, reveals within 2 to 6 tiles, and every choice option explains itself', () => {
    for (const c of m10.cards) {
      if (c.type === 'info') expect(words(c.body), c.id).toBeLessThanOrEqual(60);
      if (c.type === 'reveal') {
        expect(c.tiles.length).toBeGreaterThanOrEqual(2);
        expect(c.tiles.length).toBeLessThanOrEqual(6);
      }
      if (c.type === 'choice') {
        expect(c.options.length).toBeGreaterThanOrEqual(2);
        expect(c.options.length).toBeLessThanOrEqual(4);
        for (const o of c.options) expect(o.feedback.length).toBeGreaterThan(20);
      }
    }
  });

  it('explains the rights in plain words, from being informed to complaining', () => {
    const rights = m10.cards[1];
    if (rights?.type !== 'reveal') throw new Error('card 2 should be a reveal');
    const text = rights.tiles.map((t) => `${t.label} ${t.detail}`).join(' ');
    for (const word of [/informed/i, /access/i, /object/i, /correct/i, /erase/i, /block/i, /portability/i, /damages/i, /complain/i]) expect(text).toMatch(word);
  });

  it('teaches: ask for an explanation and a human review, the clinic is responsible, and the complaint path in order', () => {
    const ai = m10.cards[2];
    const clinic = m10.cards[3];
    const path = m10.cards[4];
    if (ai?.type !== 'choice' || clinic?.type !== 'choice' || path?.type !== 'reveal') throw new Error('unexpected card types');
    expect(ai.options[ai.correct]?.text).toMatch(/explanation/);
    expect(ai.options[ai.correct]?.text).toMatch(/person/);
    expect(clinic.options[clinic.correct]?.text).toMatch(/clinic that chose/);
    expect(clinic.options[clinic.correct]?.feedback).toMatch(/not an excuse/);
    expect(path.tiles.slice(0, 3).map((t) => t.label)).toEqual(['1. Write to the DPO', '2. Keep records', '3. Go to the NPC']);
    expect(path.tiles.map((t) => t.detail).join(' ')).toMatch(/National Privacy Commission/);
    expect(path.tiles.map((t) => t.detail).join(' ')).toMatch(/not legal advice/);
  });

  it('sorts privacy red flags from okay signs, with a reason for each', () => {
    const sort = m10.cards[5];
    if (sort?.type !== 'swipe-sort') throw new Error('card 6 should be the sort');
    expect(sort.items.length).toBeGreaterThanOrEqual(6);
    expect(sort.items.filter((i) => i.bin === 'red').length).toBeGreaterThanOrEqual(3);
    expect(sort.items.filter((i) => i.bin === 'ok').length).toBeGreaterThanOrEqual(3);
    expect(sort.items.every((i) => i.why.length > 10)).toBe(true);
  });

  it('ends with the three-bullet takeaway and loads through the registry', async () => {
    expect(m10.takeaway.bullets).toHaveLength(3);
    expect(m10.takeaway.bullets.join(' ')).toMatch(/tell you how they use your data/);
    expect(m10.takeaway.bullets.join(' ')).toMatch(/ask for a person/);
    expect(m10.takeaway.bullets.join(' ')).toMatch(/accountable/);
    expect(hasContent('m10')).toBe(true);
    expect((await loadContent('m10'))?.id).toBe('m10');
    expect((await m10.game.load()).default).toBeTypeOf('function');
  });
});

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const SEED = 'unit-m10';

/** Click the evidence card with this title. */
function present(title: string) {
  const el = [...document.querySelectorAll('.objection-card--pick .objection-card__title')].find((n) => n.textContent === title);
  if (!el) throw new Error(`no evidence card "${title}"`);
  fireEvent.click(el.closest('button') as HTMLButtonElement);
}

/** Step to statement `index` (0-based) from wherever the testimony is (it starts at 0). */
function goTo(index: number, from = 0) {
  for (let i = from; i < index; i++) press('Next statement');
}

describe('OBJECTION! module game', () => {
  let stopRouter: () => void;
  beforeEach(() => {
    resetAll();
    window.location.hash = `#/learn/m10?seed=${SEED}`;
    stopRouter = startRouter();
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
    resetAll();
  });

  it('opens with an intro that explains the hall is a game stage and the real complaint path', () => {
    render(<ObjectionGame moduleId="m10" onComplete={() => {}} />);
    expect(screen.getByRole('heading', { name: 'OBJECTION!' })).toBeTruthy();
    expect(screen.getByText(/Three cases are waiting/)).toBeTruthy();
    fireEvent.click(screen.getByText('How it works'));
    expect(screen.getByText(/every person, clinic and app is made up/)).toBeTruthy();
  });

  it('shows the case file, then one statement at a time, with Press and a court record', () => {
    render(<ObjectionGame moduleId="m10" onComplete={() => {}} />);
    const c = buildCase(SEED, 'module', 1);
    press('Enter the hall');
    expect(screen.getByRole('heading', { name: c.title })).toBeTruthy();
    expect(screen.getByText(c.brief)).toBeTruthy();
    press('Begin the hearing');
    expect(screen.getByRole('heading', { name: `Testimony: ${c.witness}` })).toBeTruthy();
    expect(screen.getByText(`Statement 1 of ${c.statements.length}`)).toBeTruthy();
    expect(screen.getAllByText(c.statements[0]?.text as string).length).toBeGreaterThan(0);
    // press shows the witness's detail and does not cost anything
    press('Press');
    expect(screen.getByText(c.statements[0]?.press as string)).toBeTruthy();
    expect(screen.getByText('Strikes 0 / 3')).toBeTruthy();
    press('Next statement');
    expect(screen.getByText(`Statement 2 of ${c.statements.length}`)).toBeTruthy();
    expect(screen.queryByText(c.statements[0]?.press as string)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Court record' })).toBeTruthy();
    expect(document.querySelectorAll('.objection-card')).toHaveLength(c.evidence.length);
  });

  it('wraps from the last statement back to the first, and jumps from the list', () => {
    render(<ObjectionGame moduleId="m10" onComplete={() => {}} />);
    const c = buildCase(SEED, 'module', 1);
    press('Enter the hall');
    press('Begin the hearing');
    goTo(c.statements.length - 1);
    press('Hear it again');
    expect(screen.getByText(`Statement 1 of ${c.statements.length}`)).toBeTruthy();
    fireEvent.click(screen.getByText('Statements so far'));
    fireEvent.click(screen.getByRole('button', { name: c.statements[2]?.text as string }));
    expect(screen.getByText(`Statement 3 of ${c.statements.length}`)).toBeTruthy();
  });

  it('overrules an objection to a true statement, adds a strike and marks the statement ruled true', () => {
    render(<ObjectionGame moduleId="m10" onComplete={() => {}} />);
    const c = buildCase(SEED, 'module', 1);
    const wrong = c.statements.findIndex((_, i) => i !== c.lieIndex);
    press('Enter the hall');
    press('Begin the hearing');
    goTo(wrong);
    press('OBJECTION!');
    expect(screen.getByRole('heading', { name: `Present your evidence against statement ${wrong + 1}` })).toBeTruthy();
    present(c.evidence[0]?.title as string);
    expect(screen.getByRole('heading', { name: 'Overruled! That statement is true.' })).toBeTruthy();
    expect(screen.getByText(c.statements[wrong]?.why as string)).toBeTruthy();
    expect(screen.getByText('Strike 1 of 3')).toBeTruthy();
    press('Back to the testimony');
    expect(screen.getByText('Ruled true')).toBeTruthy();
    // a statement already ruled true cannot be challenged again
    expect(screen.getByRole('button', { name: 'OBJECTION!' }).getAttribute('aria-disabled')).toBe('true');
  });

  it('lets the player take an objection back with no strike', () => {
    render(<ObjectionGame moduleId="m10" onComplete={() => {}} />);
    press('Enter the hall');
    press('Begin the hearing');
    press('OBJECTION!');
    press('Take it back, no strike');
    expect(screen.getByRole('heading', { name: 'Court record' })).toBeTruthy();
    expect(screen.getByText('Strikes 0 / 3')).toBeTruthy();
  });

  it('says "right statement, wrong evidence" when the card does not prove it', () => {
    render(<ObjectionGame moduleId="m10" onComplete={() => {}} />);
    const c = buildCase(SEED, 'module', 1);
    const decoy = c.evidence.find((e) => e.id !== c.proofId);
    press('Enter the hall');
    press('Begin the hearing');
    goTo(c.lieIndex);
    press('OBJECTION!');
    present(decoy?.title as string);
    expect(screen.getByRole('heading', { name: 'Right statement, wrong evidence' })).toBeTruthy();
    expect(screen.getByText(new RegExp(`“${decoy?.title}” does not prove it`))).toBeTruthy();
    expect(screen.getByText('Strike 1 of 3')).toBeTruthy();
  });

  it('wins all three cases with the right evidence, shows each case-closed summary, and finishes with three stars', () => {
    const onComplete = vi.fn();
    render(<ObjectionGame moduleId="m10" onComplete={onComplete} />);
    press('Enter the hall');
    for (let no = 1; no <= 3; no++) {
      const c = buildCase(SEED, 'module', no);
      expect(screen.getByRole('heading', { name: c.title })).toBeTruthy();
      press('Begin the hearing');
      goTo(c.lieIndex);
      press('OBJECTION!');
      const proof = c.evidence.find((e) => e.id === c.proofId);
      present(proof?.title as string);
      expect(screen.getByRole('heading', { name: 'Case closed!' })).toBeTruthy();
      expect(screen.getByText(c.statements[c.lieIndex]?.text as string)).toBeTruthy();
      expect(screen.getByText(`Proved by: ${proof?.title}.`)).toBeTruthy();
      expect(screen.getByText(c.statements[c.lieIndex]?.why as string)).toBeTruthy();
      expect(screen.getByText(c.lesson)).toBeTruthy();
      expect(screen.getByText(/write to the organisation’s Data Protection Officer first/)).toBeTruthy();
      expect(screen.getByText(`Case won: +${100 + 20 * (no - 1)}`)).toBeTruthy();
      expect(screen.getByText('No wrong objections: +50')).toBeTruthy();
      press(no < 3 ? 'Next case' : 'See the result');
    }
    expect(screen.getByRole('heading', { name: 'The hearing is over!' })).toBeTruthy();
    expect(screen.getByText('Cases won: 3')).toBeTruthy();
    expect(screen.getByText('Strikes: 0 of 3')).toBeTruthy();
    expect(screen.getByText('Educational, not legal advice.')).toBeTruthy();
    press('Finish game');
    expect(onComplete).toHaveBeenCalledWith(3);
  });

  it('adjourns on the third strike, reveals the false statement, and still lets the player finish', () => {
    const onComplete = vi.fn();
    render(<ObjectionGame moduleId="m10" onComplete={onComplete} />);
    const c = buildCase(SEED, 'module', 1);
    const wrongs = c.statements.map((_, i) => i).filter((i) => i !== c.lieIndex);
    press('Enter the hall');
    press('Begin the hearing');
    let at = 0;
    for (let n = 0; n < STRIKE_LIMIT; n++) {
      const to = wrongs[n] as number;
      if (to < at) {
        press('Hear it again');
        at = 0;
      }
      goTo(to, at);
      at = to;
      press('OBJECTION!');
      present(c.evidence[0]?.title as string);
      if (n < STRIKE_LIMIT - 1) press('Back to the testimony');
    }
    expect(screen.getByText('Strike 3 of 3')).toBeTruthy();
    press('See the verdict');
    expect(screen.getByRole('heading', { name: 'Three strikes: the hearing is adjourned' })).toBeTruthy();
    expect(screen.getByText('Cases won: 0')).toBeTruthy();
    expect(screen.getByText(c.statements[c.lieIndex]?.why as string)).toBeTruthy();
    press('Finish game');
    expect(onComplete).toHaveBeenCalledWith(1);
  });
});

describe('OBJECTION! in the Arcade', () => {
  let stopRouter: () => void;
  beforeEach(() => {
    resetAll();
    window.location.hash = '#/play/objection';
    stopRouter = startRouter();
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
    resetAll();
  });

  it('plays an endless run from the seed, shows score and strikes, and saves the run when it ends', () => {
    render(<ObjectionArcade seed="arc" />);
    expect(screen.getByText(/the run ends on your third strike/)).toBeTruthy();
    press('Enter the hall');
    const c = buildCase('arc', 'arcade', 1);
    expect(screen.getByRole('heading', { name: c.title })).toBeTruthy();
    expect(screen.getByText('Score 0')).toBeTruthy();
    press('Begin the hearing');
    goTo(c.lieIndex);
    press('OBJECTION!');
    present(c.evidence.find((e) => e.id === c.proofId)?.title as string);
    expect(screen.getByText('Score 150')).toBeTruthy();
    press('Next case');
    const c2 = buildCase('arc', 'arcade', 2);
    expect(screen.getByRole('heading', { name: c2.title })).toBeTruthy();
    expect(screen.getAllByText('Case 2').length).toBeGreaterThan(0);
    press('Finish run');
    expect(screen.getByRole('heading', { name: 'Run finished' })).toBeTruthy();
    expect(screen.getByText('Points: 150')).toBeTruthy();
    expect(screen.getByText('New personal best!')).toBeTruthy();
    expect(bestScores.value.objection).toBe(150);
    press('Play again');
    expect(screen.getByRole('heading', { name: 'OBJECTION!' })).toBeTruthy();
  });
});
