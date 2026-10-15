// Tita's GC (T11): scenario data and the graph validator, play drawing, scoring, the family ripple, the Module 5 content and the game component.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { startRouter } from '../../src/app/router';
import { resetAll } from '../../src/app/store';
import { MODULES } from '../../src/content/modules';
import { CAST, GC_SCENARIOS, MEMBERS, memberInfo, scenarioById, type GcChoice, type GcScenario } from '../../src/content/gc';
import m05 from '../../src/modules/m05';
import TitasGc from '../../src/modules/m05/TitasGc';
import {
  addChoice,
  addTally,
  applyRipple,
  buildPlay,
  EMPTY_TALLY,
  enumeratePaths,
  meterPercent,
  orderedChoices,
  PLAY_SIZE,
  rippleCounts,
  starsFor,
  turnById,
  validateScenario,
} from '../../src/modules/m05/gcLogic';
import { hasContent, loadContent } from '../../src/modules/registry';

const words = (s: string) => s.trim().split(/\s+/).length;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const allChoices = (s: GcScenario): GcChoice[] => s.turns.flatMap((t) => [...t.choices]);

describe('scenario data', () => {
  it('has five scenarios, one of them a true forward, with unique ids', () => {
    expect(GC_SCENARIOS).toHaveLength(5);
    expect(new Set(GC_SCENARIOS.map((s) => s.id)).size).toBe(5);
    expect(GC_SCENARIOS.filter((s) => s.legit)).toHaveLength(1);
    expect(scenarioById('tea')?.title).toBe('The Miracle Tea');
    expect(scenarioById('nope')).toBeUndefined();
  });

  it('has the five cast members, with Lola, Tita, Kuya Jun, Bea and the player', () => {
    expect(MEMBERS).toEqual(['lola', 'tita', 'jun', 'bea', 'you']);
    expect(CAST.map((m) => m.name)).toEqual(['Lola Nena', 'Tita Baby', 'Kuya Jun', 'Bea', 'You']);
    expect(memberInfo('jun').role).toMatch(/Health Worker/);
  });

  for (const s of GC_SCENARIOS) {
    describe(`"${s.id}"`, () => {
      it('passes the validator: no dead ends, no cycles, everything reachable, best route good and worst route rough', () => {
        expect(validateScenario(s)).toEqual([]);
      });

      it('has at least 2 branch points on every path and 3 endings of different tiers', () => {
        const paths = enumeratePaths(s);
        expect(Math.min(...paths.map((p) => p.choices.length))).toBeGreaterThanOrEqual(2);
        expect(s.endings.length).toBeGreaterThanOrEqual(3);
        expect(new Set(s.endings.map((e) => e.tier))).toEqual(new Set(['light', 'mixed', 'rough']));
        expect(new Set(paths.map((p) => p.ending.id)).size).toBe(s.endings.length);
      });

      it('has React, Verify, Reply and Forward moves on the first turn or the next ones', () => {
        const kinds = new Set(allChoices(s).map((c) => c.kind));
        expect([...kinds].sort()).toEqual(['forward', 'react', 'reply', 'verify']);
      });

      it('scores every move on Accuracy and Kindness (0 to 2); forwarding an unchecked fake scores 0 accuracy; shaming scores 0 kindness', () => {
        for (const c of allChoices(s)) {
          expect([0, 1, 2]).toContain(c.accuracy);
          expect([0, 1, 2]).toContain(c.kindness);
          if (c.kind === 'forward' && !s.legit && turnById(s, s.first)?.choices.includes(c)) expect(c.accuracy).toBe(0);
          if (c.kind === 'verify') expect(c.accuracy).toBe(2);
        }
        // every turn offers one reply that is both accurate and kind, or a verify, so the best path is always reachable
        const best = Math.max(...enumeratePaths(s).map((p) => p.accuracy + p.kindness));
        expect(best).toBe(s.turns.length > 0 ? 8 : 0);
      });

      it('is complete: short lines, a why on every move, a lesson, a basis and unreviewed', () => {
        for (const t of s.turns) {
          for (const m of t.messages) expect(words(m.text)).toBeLessThanOrEqual(45);
          for (const c of t.choices) {
            expect(words(c.why)).toBeLessThanOrEqual(40);
            if (c.kind === 'verify') {
              expect(c.check?.rows.length).toBeGreaterThanOrEqual(2);
              expect(c.check?.verdict.length).toBeGreaterThan(10);
            }
          }
        }
        expect(s.lesson.length).toBeGreaterThan(20);
        expect(s.basis.length).toBeGreaterThan(20);
        expect(s.review_status).toBe('unreviewed');
        expect(s.start.tita).toBeTruthy();
      });

      it('has a first turn with the forward from Tita', () => {
        const first = turnById(s, s.first);
        expect(first?.messages.some((m) => m.forwarded && m.from === 'tita')).toBe(true);
      });
    });
  }

  it('never gives dosing or real names: no milligrams, no real brands or officials', () => {
    const text = JSON.stringify(GC_SCENARIOS);
    expect(text).not.toMatch(/\b\d+\s?(mg|ml|mcg)\b/i);
    expect(text).not.toMatch(/\b(Duterte|Marcos|Facebook|Google|Pfizer|Sinovac)\b/);
  });

  it('keeps the true forward honest: it is a legit scenario where doubting everything scores badly', () => {
    const vax = scenarioById('vaccine');
    expect(vax?.legit).toBe(true);
    const first = vax?.turns[0]?.choices.find((c) => c.kind === 'reply');
    expect(first?.accuracy).toBe(0);
    expect(first?.kindness).toBe(0);
  });
});

describe('validator', () => {
  const base = scenarioById('tea') as GcScenario;
  const clone = (): GcScenario => JSON.parse(JSON.stringify(base)) as GcScenario;

  it('flags a choice that leads nowhere', () => {
    const s = clone();
    (s.turns[0]?.choices[0] as { next: string }).next = 'ghost';
    expect(validateScenario(s).join(' ')).toMatch(/leads to unknown "ghost"/);
  });

  it('flags a dead-end turn with fewer than 2 choices', () => {
    const s = clone();
    (s.turns[1] as unknown as { choices: unknown[] }).choices = (s.turns[1]?.choices ?? []).slice(0, 1);
    expect(validateScenario(s).join(' ')).toMatch(/needs at least 2 choices/);
  });

  it('flags a cycle', () => {
    const s = clone();
    (s.turns[1]?.choices[0] as { next: string }).next = s.first;
    expect(validateScenario(s).join(' ')).toMatch(/cycle/);
  });

  it('flags an ending that no path reaches, and a turn that no path reaches', () => {
    const s = clone();
    for (const t of s.turns) for (const c of t.choices) if (c.next === 'tea-end-rough') (c as { next: string }).next = 'tea-end-mixed';
    expect(validateScenario(s).join(' ')).toMatch(/ending "tea-end-rough" can never be reached/);
    const t2 = clone();
    (t2.turns[0]?.choices ?? []).forEach((c) => ((c as { next: string }).next = 'tea-2v'));
    expect(validateScenario(t2).join(' ')).toMatch(/turn "tea-2p" can never be reached/);
  });

  it('flags a path with only one choice, and a missing ending tier', () => {
    const s = clone();
    (s.turns[0]?.choices[0] as { next: string }).next = 'tea-end-rough';
    expect(validateScenario(s).join(' ')).toMatch(/after only 1 choice/);
    const t = clone();
    t.endings.forEach((e) => ((e as { tier: string }).tier = 'mixed'));
    expect(validateScenario(t).join(' ')).toMatch(/no "light" ending/);
  });

  it('flags a verify without a check, a check on a non-verify, and a forward of a fake that scores accuracy', () => {
    const s = clone();
    const verify = allChoices(s).find((c) => c.kind === 'verify') as { check?: unknown };
    verify.check = undefined;
    expect(validateScenario(s).join(' ')).toMatch(/needs a check/);
    const t = clone();
    const react = allChoices(t).find((c) => c.kind === 'react') as { check?: unknown };
    react.check = { title: 'x', rows: [], verdict: 'y' };
    expect(validateScenario(t).join(' ')).toMatch(/only verify choices open a check/);
    const u = clone();
    (allChoices(u).find((c) => c.kind === 'forward') as { accuracy: number }).accuracy = 1;
    expect(validateScenario(u).join(' ')).toMatch(/must score 0 accuracy/);
  });

  it('flags a best-scoring route that does not end well', () => {
    const s = clone();
    (allChoices(s).find((c) => c.id === 'tea-2v-kind') as { next: string }).next = 'tea-end-mixed';
    (allChoices(s).find((c) => c.id === 'tea-2v-quote') as { next: string }).next = 'tea-end-light';
    expect(validateScenario(s).join(' ')).toMatch(/best-scoring route ends in "tea-end-mixed"/);
  });
});

describe('play', () => {
  it('draws three scenarios, always including the true forward, in a repeatable order', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const play = buildPlay(seed);
      expect(play).toHaveLength(PLAY_SIZE);
      expect(new Set(play.map((s) => s.id)).size).toBe(PLAY_SIZE);
      expect(play.filter((s) => s.legit)).toHaveLength(1);
      expect(buildPlay(seed).map((s) => s.id)).toEqual(play.map((s) => s.id));
    }
  });

  it('varies with the seed', () => {
    const seen = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((seed) => buildPlay(seed).map((s) => s.id).join()));
    expect(seen.size).toBeGreaterThan(2);
  });

  it('puts the choices in a repeatable order that keeps all of them', () => {
    const turn = turnById(GC_SCENARIOS[0] as GcScenario, 'tea-1');
    if (!turn) throw new Error('turn missing');
    const a = orderedChoices(turn, 's1');
    expect(a.map((c) => c.id).sort()).toEqual(turn.choices.map((c) => c.id).sort());
    expect(orderedChoices(turn, 's1').map((c) => c.id)).toEqual(a.map((c) => c.id));
  });
});

describe('scoring and ripple', () => {
  it('tallies accuracy and kindness, and shows each as a share of 2 per move', () => {
    let tally = addChoice(EMPTY_TALLY, { accuracy: 2, kindness: 1 });
    tally = addChoice(tally, { accuracy: 0, kindness: 2 });
    expect(tally).toEqual({ accuracy: 2, kindness: 3, turns: 2 });
    expect(meterPercent(tally.accuracy, tally.turns)).toBe(50);
    expect(meterPercent(tally.kindness, tally.turns)).toBe(75);
    expect(meterPercent(0, 0)).toBe(0);
    expect(addTally(tally, tally)).toEqual({ accuracy: 4, kindness: 6, turns: 4 });
  });

  it('gives stars by total: 3 at 80%, 2 at 50%, else 1', () => {
    const t = (points: number, turns = 6) => ({ accuracy: Math.min(points, turns * 2), kindness: Math.max(0, points - turns * 2), turns });
    expect(starsFor(EMPTY_TALLY)).toBe(1);
    expect(starsFor(t(24))).toBe(3); // 24 of 24
    expect(starsFor(t(20))).toBe(3); // 20 of 24 = 83%
    expect(starsFor(t(19))).toBe(2); // 79%
    expect(starsFor(t(12))).toBe(2); // 50%
    expect(starsFor(t(11))).toBe(1);
  });

  it('applies ripple changes without touching the others, and counts them', () => {
    const tea = scenarioById('tea') as GcScenario;
    const after = applyRipple(tea.start, { lola: { believed: true }, jun: { checked: true }, tita: { hurt: true, believed: false } });
    expect(after.lola.believed).toBe(true);
    expect(after.tita).toEqual({ believed: false, checked: false, hurt: true });
    expect(tea.start.lola.believed).toBe(false);
    expect(applyRipple(tea.start, undefined)).toBe(tea.start);
    expect(rippleCounts(after)).toEqual({ believed: 1, checked: 1, hurt: 1 });
  });

  it('is part of the real data: the best route heals Tita, and the worst keeps Lola believing', () => {
    const tea = scenarioById('tea') as GcScenario;
    const paths = enumeratePaths(tea);
    const best = paths.find((p) => p.choices.map((c) => c.id).join() === 'tea-1-who,tea-2v-kind');
    const ripple = (best?.choices ?? []).reduce((r, c) => applyRipple(r, c.ripple), tea.start);
    expect(ripple.tita).toEqual({ believed: false, checked: true, hurt: false });
    expect(ripple.lola.believed).toBe(false);
    const worst = paths.find((p) => p.choices.map((c) => c.id).join() === 'tea-1-react,tea-2p-again');
    const bad = (worst?.choices ?? []).reduce((r, c) => applyRipple(r, c.ripple), tea.start);
    expect(bad.lola.believed).toBe(true);
  });
});

describe('Module 5 content', () => {
  it('follows the spec: hook, seven cards, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm05');
    expect(1 + m05.cards.length).toBe(info?.cards);
    expect(m05.cards).toHaveLength(7);
    expect(m05.hook.speaker).toBe('Tita Baby');
    expect(m05.hook.line).toMatch(/🙏🙏🙏/);
    expect(m05.game.slug).toBe('titas-gc');
    expect(m05.game.name).toBe(info?.game);
    const ids = [m05.hook.id, ...m05.cards.map((c) => c.id), m05.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m05.review_status).toBe('unreviewed');
    expect(m05.cards.map((c) => c.type)).toEqual(['info', 'reveal', 'choice', 'reveal', 'choice', 'choice', 'reveal']);
  });

  it('teaches Pause, Check who said it, another source, FDA steps, the kind reply, quote-sharing and where to report', () => {
    const titles = m05.cards.map((c) => ('title' in c ? c.title : c.type === 'choice' ? c.question : ''));
    expect(titles[0]).toMatch(/Pause/);
    expect(titles[1]).toMatch(/who said it/);
    expect(titles[2]).toMatch(/another source/);
    expect(titles[3]).toMatch(/FDA/);
    expect(titles[5]).toMatch(/quote-share/);
    expect(titles[6]).toMatch(/report/i);
    const reveal = m05.cards[3];
    expect(reveal?.type === 'reveal' && JSON.stringify(reveal.tiles)).toMatch(/No approved therapeutic claims/);
    const report = m05.cards[6];
    expect(report?.type === 'reveal' && JSON.stringify(report.tiles)).toMatch(/Report button[\s\S]*Fact-checkers[\s\S]*FDA[\s\S]*cybercrime[\s\S]*1326/);
  });

  it('has one correct, kind answer on each choice card, and a reply that is warm and has a source', () => {
    for (const c of m05.cards) {
      if (c.type !== 'choice') continue;
      expect(c.options[c.correct]).toBeTruthy();
      for (const o of c.options) expect(words(o.feedback)).toBeLessThanOrEqual(40);
    }
    const reply = m05.cards[4];
    if (reply?.type !== 'choice') throw new Error('card 5 is the reply choice');
    expect(reply.options[reply.correct]?.text).toMatch(/Thank you[\s\S]*FDA/);
  });

  it('loads through the registry', async () => {
    expect(hasContent('m05')).toBe(true);
    expect((await loadContent('m05'))?.id).toBe('m05');
    expect((await m05.game.load()).default).toBeTypeOf('function');
  });
});

describe("Tita's GC game", () => {
  let stopRouter: () => void;
  beforeEach(() => {
    resetAll();
    window.location.hash = '#/learn/m05?seed=unit';
    stopRouter = startRouter();
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
    resetAll();
  });

  const play = () => buildPlay('unit');
  const choiceButton = (c: GcChoice) => screen.getByRole('button', { name: new RegExp(escapeRe(c.label.slice(0, 40))) });
  const score = (c: GcChoice) => c.accuracy + c.kindness;

  /** The turn on screen: the one whose choices are all on the page. */
  function currentTurn(s: GcScenario) {
    return s.turns.find((t) => t.choices.every((c) => screen.queryByRole('button', { name: new RegExp(escapeRe(c.label.slice(0, 40))) })));
  }

  /** Make one move, then press Continue. Returns the choice made. */
  function move(s: GcScenario, pickFrom: (choices: readonly GcChoice[]) => GcChoice): GcChoice {
    const turn = currentTurn(s);
    if (!turn) throw new Error('no turn on screen');
    const choice = pickFrom(turn.choices);
    fireEvent.click(choiceButton(choice));
    fireEvent.click(screen.getByRole('button', { name: /^Continue the chat/ }));
    return choice;
  }

  const best = (cs: readonly GcChoice[]) => cs.reduce((a, b) => (score(b) > score(a) ? b : a));
  const worst = (cs: readonly GcChoice[]) => cs.reduce((a, b) => (score(b) < score(a) ? b : a));

  function playChat(s: GcScenario, pickFrom: (choices: readonly GcChoice[]) => GcChoice, last: boolean) {
    for (let i = 0; i < 6; i++) {
      if (screen.queryByRole('button', { name: last ? /^See my result/ : /^Next chat/ })) break;
      move(s, pickFrom);
    }
    fireEvent.click(screen.getByRole('button', { name: last ? /^See my result/ : /^Next chat/ }));
  }

  it('opens with the cast, how scoring works and a start button', () => {
    render(<TitasGc moduleId="m05" onComplete={() => {}} />);
    expect(screen.getByRole('heading', { name: "Tita's GC" })).toBeTruthy();
    for (const name of ['Lola Nena', 'Tita Baby', 'Kuya Jun', 'Bea']) expect(screen.getByText(name)).toBeTruthy();
    expect(screen.getByText(/Accuracy: Did you check/)).toBeTruthy();
    expect(screen.getByText(/Kindness: Does your reply/)).toBeTruthy();
  });

  it('shows the forward, four kinds of move, the ripple and two meters', () => {
    render(<TitasGc moduleId="m05" onComplete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Open the chat/ }));
    const s = play()[0] as GcScenario;
    expect(screen.getByText('Chat 1 of 3')).toBeTruthy();
    expect(screen.getByRole('log', { name: 'Family group chat' })).toBeTruthy();
    expect(screen.getAllByText('Forwarded').length).toBeGreaterThan(0);
    const first = turnById(s, s.first);
    for (const c of first?.choices ?? []) expect(choiceButton(c)).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'Accuracy' })).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'Kindness' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Family ripple' })).toBeTruthy();
  });

  it('a verify move opens a mini check in the chat, shows scores and the FAKE stamp, then continues', () => {
    render(<TitasGc moduleId="m05" onComplete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Open the chat/ }));
    const s = play()[0] as GcScenario;
    const verify = turnById(s, s.first)?.choices.find((c) => c.kind === 'verify') as GcChoice;
    expect(screen.queryByText('ARAW GAME · FAKE')).toBeNull();
    fireEvent.click(choiceButton(verify));
    expect(screen.getByRole('region', { name: 'Mini check' })).toBeTruthy();
    expect(screen.getByText(verify.why)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Accuracy: 2 of 2' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Kindness: 2 of 2' })).toBeTruthy();
    if (s.legit) expect(screen.getByText('Legit post')).toBeTruthy();
    else expect(screen.getByText('ARAW GAME · FAKE')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Continue the chat/ })).toBeTruthy();
  });

  it('the best route to the end gives the best ending with its ripple and lesson', () => {
    render(<TitasGc moduleId="m05" onComplete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Open the chat/ }));
    const s = play()[0] as GcScenario;
    move(s, best);
    move(s, best);
    expect(screen.getByText('Best ending')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /^Ending: / })).toBeTruthy();
    expect(screen.getByText(/What the post was/)).toBeTruthy();
    expect(screen.getAllByText(/believed it, .* checked it, .* felt hurt\./).length).toBeGreaterThan(0);
    expect(screen.getByText('Accuracy 4 of 4, Kindness 4 of 4 in this chat.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Next chat/ })).toBeTruthy();
  });

  it('the worst route ends roughly but still lets the player carry on', () => {
    render(<TitasGc moduleId="m05" onComplete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /^Open the chat/ }));
    const s = play()[0] as GcScenario;
    move(s, worst);
    move(s, worst);
    expect(screen.getByText('Rough ending')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Next chat/ })).toBeTruthy();
  });

  it('plays all three chats with the best choices: three stars, and onComplete gets 3', () => {
    let stars = 0;
    render(<TitasGc moduleId="m05" onComplete={(n) => (stars = n)} />);
    fireEvent.click(screen.getByRole('button', { name: /^Open the chat/ }));
    play().forEach((s, i, all) => playChat(s, best, i === all.length - 1));
    expect(screen.getByRole('heading', { name: 'The chat is quiet again!' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(screen.getByText(/You made 6 moves in 3 chats and earned 24 of 24 points\./)).toBeTruthy();
    expect(screen.getByText('This one was true.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Finish game' }));
    expect(stars).toBe(3);
  });

  it('plays all three chats with the worst choices: one star, no fail state, onComplete still fires', () => {
    let stars = 0;
    render(<TitasGc moduleId="m05" onComplete={(n) => (stars = n)} />);
    fireEvent.click(screen.getByRole('button', { name: /^Open the chat/ }));
    play().forEach((s, i, all) => playChat(s, worst, i === all.length - 1));
    expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Finish game' }));
    expect(stars).toBe(1);
  });
});
