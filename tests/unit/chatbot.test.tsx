// Tanong kay Chatbot (T09): the scripted round pool, round building, scoring and stars, the Module 3 content and the game component.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { CHAT_ROUNDS, PRIVACY_SCENARIO, RULINGS } from '../../src/content/chatbot';
import { MODULES } from '../../src/content/modules';
import { startRouter } from '../../src/app/router';
import m03 from '../../src/modules/m03';
import TanongKayChatbot from '../../src/modules/m03/TanongKayChatbot';
import { buildRounds, checkPermissions, isRulingRight, needsRedFlagWarning, ROUND_TOTAL, scoreFor, starsFor } from '../../src/modules/m03/chatbotLogic';

const count = (ruling: string, rounds = CHAT_ROUNDS) => rounds.filter((r) => r.ruling === ruling).length;

describe('Tanong kay Chatbot content', () => {
  it('is a pool of at least 16 scripted rounds with every ruling well covered', () => {
    expect(CHAT_ROUNDS.length).toBeGreaterThanOrEqual(16);
    for (const ruling of RULINGS) expect(count(ruling)).toBeGreaterThanOrEqual(4);
    const ids = CHAT_ROUNDS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is complete: every round has text, a why, a good answer, a basis and is unreviewed', () => {
    for (const r of CHAT_ROUNDS) {
      for (const field of [r.question, r.answer, r.why, r.good, r.basis]) expect(field.trim().length).toBeGreaterThan(10);
      expect(r.review_status).toBe('unreviewed');
    }
  });

  it('marks exactly the Magpatingin rounds as red flags', () => {
    for (const r of CHAT_ROUNDS) expect(r.redFlag).toBe(r.ruling === 'magpatingin');
  });

  it('never gives dosing: no milligrams, units or numeric doses in answers', () => {
    for (const r of CHAT_ROUNDS) expect(`${r.answer} ${r.good}`).not.toMatch(/\d+\s?(mg|ml|mcg|tablet|pill|drops)s?\b/i);
  });

  it('has one privacy scenario where only one permission is needed', () => {
    expect(PRIVACY_SCENARIO.review_status).toBe('unreviewed');
    const ids = PRIVACY_SCENARIO.permissions.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['contacts', 'location', 'photos']));
    expect(PRIVACY_SCENARIO.permissions.filter((p) => p.needed).map((p) => p.id)).toEqual(['motion']);
  });
});

describe('round building', () => {
  it('draws eight rounds: seven chat rounds plus the privacy round, never first', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const rounds = buildRounds(seed);
      expect(rounds).toHaveLength(ROUND_TOTAL);
      expect(rounds.filter((r) => r.kind === 'privacy')).toHaveLength(1);
      expect(rounds[0]?.kind).toBe('qa');
    }
  });

  it('has at least two of each ruling and no repeated round', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const qa = buildRounds(seed).flatMap((r) => (r.kind === 'qa' ? [r.round] : []));
      for (const ruling of RULINGS) expect(count(ruling, qa)).toBeGreaterThanOrEqual(2);
      expect(new Set(qa.map((r) => r.id)).size).toBe(qa.length);
    }
  });

  it('is repeatable per seed and differs between seeds', () => {
    const ids = (seed: string) => buildRounds(seed).map((r) => (r.kind === 'qa' ? r.round.id : r.scenario.id));
    expect(ids('x')).toEqual(ids('x'));
    const variety = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((s) => ids(s).join()));
    expect(variety.size).toBeGreaterThan(1);
  });
});

describe('rulings, permissions and scoring', () => {
  const red = CHAT_ROUNDS.find((r) => r.ruling === 'magpatingin')!;
  const usable = CHAT_ROUNDS.find((r) => r.ruling === 'tama')!;

  it('a ruling is right only when it matches', () => {
    expect(isRulingRight(red, 'magpatingin')).toBe(true);
    expect(isRulingRight(red, 'tama')).toBe(false);
    expect(isRulingRight(usable, 'tama')).toBe(true);
  });

  it('red-flag rounds ruled anything but Magpatingin get the extra warning', () => {
    expect(needsRedFlagWarning(red, 'tama')).toBe(true);
    expect(needsRedFlagWarning(red, 'mali')).toBe(true);
    expect(needsRedFlagWarning(red, 'magpatingin')).toBe(false);
    expect(needsRedFlagWarning(usable, 'mali')).toBe(false);
  });

  it('permissions are right only when exactly the needed one is allowed', () => {
    expect(checkPermissions(PRIVACY_SCENARIO, new Set(['motion'])).allRight).toBe(true);
    expect(checkPermissions(PRIVACY_SCENARIO, new Set()).allRight).toBe(false);
    const both = checkPermissions(PRIVACY_SCENARIO, new Set(['motion', 'contacts']));
    expect(both.allRight).toBe(false);
    expect(both.checks.find((c) => c.id === 'contacts')?.right).toBe(false);
    expect(both.checks.find((c) => c.id === 'photos')?.right).toBe(true);
  });

  it('scores 10 per right round; stars: 3 at 7 or more, 2 at 5 or more, else 1', () => {
    expect(scoreFor(8)).toBe(80);
    expect([8, 7, 6, 5, 4, 0].map(starsFor)).toEqual([3, 3, 2, 2, 1, 1]);
  });
});

describe('Module 3 content', () => {
  it('follows the spec: hook, seven cards, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm03');
    expect(1 + m03.cards.length).toBe(info?.cards);
    expect(m03.cards).toHaveLength(7);
    expect(m03.hook.speaker).toBe('Bea');
    expect(m03.game.slug).toBe('tanong-kay-chatbot');
    expect(m03.game.name).toBe(info?.game);
    const ids = [m03.hook.id, ...m03.cards.map((c) => c.id), m03.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m03.review_status).toBe('unreviewed');
    expect(m03.cards.map((c) => c.type)).toEqual(['info', 'reveal', 'swipe-sort', 'choice', 'choice', 'choice', 'reveal']);
  });

  it('has a correct answer and feedback on every choice, and a sort with both bins used', () => {
    for (const c of m03.cards) {
      if (c.type === 'choice') {
        expect(c.options[c.correct]).toBeTruthy();
        expect(c.options.every((o) => o.feedback.length > 0)).toBe(true);
      }
      if (c.type === 'swipe-sort') {
        expect(c.items.length).toBeGreaterThanOrEqual(4);
        expect(c.items.length).toBeLessThanOrEqual(8);
        for (const bin of c.bins) expect(c.items.some((i) => i.bin === bin.id)).toBe(true);
      }
    }
  });

  it('loads the game lazily', async () => {
    expect((await m03.game.load()).default).toBeTypeOf('function');
  });
});

describe('Tanong kay Chatbot game', () => {
  let stopRouter: () => void;
  beforeEach(() => {
    window.location.hash = '#/learn/m03?seed=unit';
    stopRouter = startRouter(); // the game reads `?seed=` from the router signal
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
  });

  const button = (name: string | RegExp) => screen.getByRole('button', { name });
  const rounds = () => buildRounds('unit');
  const labels = { tama: /^Tama/, mali: /^Mali/, magpatingin: /^Magpatingin/ } as const;

  /** Rule one chat round, then press Next. */
  function playQa(ruling: keyof typeof labels, last = false) {
    fireEvent.click(button(labels[ruling]));
    fireEvent.click(button(last ? 'See my result' : 'Next round'));
  }
  function playPrivacy(allow: string[], last = false) {
    for (const id of allow) {
      const perm = PRIVACY_SCENARIO.permissions.find((p) => p.id === id)!;
      fireEvent.click(screen.getByRole('switch', { name: new RegExp(perm.label) }));
    }
    fireEvent.click(button('Decide'));
    fireEvent.click(button(last ? 'See my result' : 'Next round'));
  }

  it('starts with an intro and the disabled Chatbot Sandbox card', () => {
    render(<TanongKayChatbot moduleId="m03" onComplete={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Tanong kay Chatbot' })).toBeTruthy();
    const sandbox = button('Chatbot Sandbox (coming soon)') as HTMLButtonElement;
    expect(sandbox.disabled).toBe(true);
    expect(screen.getByText(/runs on your own device/)).toBeTruthy();
    expect(screen.getByText('Coming soon')).toBeTruthy();
  });

  it('plays eight rounds with the right rulings, gives feedback, and finishes with three stars', () => {
    const onComplete = vi.fn();
    render(<TanongKayChatbot moduleId="m03" onComplete={onComplete} />);
    fireEvent.click(button('Start the chat'));
    const all = rounds();
    all.forEach((r, i) => {
      expect(screen.getByText(`Round ${i + 1} of 8`)).toBeTruthy();
      const last = i === all.length - 1;
      if (r.kind === 'qa') {
        expect(screen.getByText(r.round.question)).toBeTruthy();
        expect(screen.getByText(r.round.answer)).toBeTruthy();
        fireEvent.click(button(labels[r.round.ruling]));
        expect(screen.getByText('Tama!')).toBeTruthy();
        expect(screen.getByText('+10 points')).toBeTruthy();
        expect(screen.getByText(r.round.why)).toBeTruthy();
        expect(screen.getByText(r.round.good)).toBeTruthy();
        expect(screen.queryByRole('alert')).toBeNull();
        fireEvent.click(button(last ? 'See my result' : 'Next round'));
      } else {
        expect(screen.getByText(/Bea installs Hakbang Buddy/)).toBeTruthy();
        playPrivacy(['motion'], last);
      }
    });
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(screen.getByText('You ruled 8 of 8 rounds right. 80 points.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chatbot Sandbox (coming soon)' })).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(button('Finish game'));
    expect(onComplete).toHaveBeenCalledWith(3);
  });

  it('a wrong ruling gives no points, a red flag gets the gentle warning, and the game still finishes with one star', () => {
    const onComplete = vi.fn();
    render(<TanongKayChatbot moduleId="m03" onComplete={onComplete} />);
    fireEvent.click(button('Start the chat'));
    const all = rounds();
    let sawWarning = false;
    all.forEach((r, i) => {
      const last = i === all.length - 1;
      if (r.kind === 'privacy') return playPrivacy([], last);
      // always rule Tama: wrong for every Mali and Magpatingin round, right only for the Tama ones
      fireEvent.click(button(labels.tama));
      if (r.round.redFlag) {
        sawWarning = true;
        const alert = screen.getByRole('alert');
        expect(within(alert).getByText(/always go to a health worker/)).toBeTruthy();
      } else {
        expect(screen.queryByRole('alert')).toBeNull();
      }
      if (r.round.ruling !== 'tama') expect(screen.getByText('Muntik na!')).toBeTruthy();
      fireEvent.click(button(last ? 'See my result' : 'Next round'));
    });
    expect(sawWarning).toBe(true);
    const tamaRight = all.filter((r) => r.kind === 'qa' && r.round.ruling === 'tama').length;
    expect(screen.getByText(`You ruled ${tamaRight} of 8 rounds right. ${tamaRight * 10} points.`)).toBeTruthy();
    expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy();
    fireEvent.click(button('Finish game'));
    expect(onComplete).toHaveBeenCalledWith(1);
  });

  it('the privacy round starts with every permission off and explains each one', () => {
    render(<TanongKayChatbot moduleId="m03" onComplete={vi.fn()} />);
    fireEvent.click(button('Start the chat'));
    const all = rounds();
    const at = all.findIndex((r) => r.kind === 'privacy');
    for (let i = 0; i < at; i++) playQa('tama');
    expect(screen.getByText('Privacy round')).toBeTruthy();
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(PRIVACY_SCENARIO.permissions.length);
    expect(switches.every((s) => s.getAttribute('aria-checked') === 'false')).toBe(true);
    fireEvent.click(switches[1] as HTMLElement); // contacts: not needed
    fireEvent.click(button('Decide'));
    expect(screen.getByText('Muntik na!')).toBeTruthy();
    expect(screen.getByText(/Do not allow: counting steps never needs your family/)).toBeTruthy();
    expect(screen.getByText('You allowed it')).toBeTruthy();
    expect(screen.getByText('No points this time. On to the next one!')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
