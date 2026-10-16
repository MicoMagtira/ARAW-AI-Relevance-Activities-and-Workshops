// AI or Not? (T07): the card pool, deck building, scoring and stars, and the game component.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { AON_POOL, answerFor, validatePool, type AonItem } from '../../src/content/aiOrNot';
import AiOrNot, { AON_SWIPE_DISTANCE } from '../../src/modules/m01/AiOrNot';
import { buildDeck, DECK_SIZE, maxScore, newRound, POINTS, scoreAnswer, starsForScore } from '../../src/modules/m01/aonLogic';

const kinds = (items: readonly AonItem[]) => ({
  ai: items.filter((i) => i.kind === 'ai').length,
  notAi: items.filter((i) => i.kind === 'not-ai').length,
  hype: items.filter((i) => i.kind === 'hype').length,
});

describe('AI or Not? pool', () => {
  it('is well formed and every entry is unreviewed', () => {
    expect(validatePool()).toEqual([]);
    expect(AON_POOL.every((i) => i.review_status === 'unreviewed')).toBe(true);
  });

  it('is larger than a round and has enough of every kind', () => {
    expect(AON_POOL.length).toBeGreaterThanOrEqual(24);
    const k = kinds(AON_POOL);
    expect(k.ai).toBeGreaterThanOrEqual(10);
    expect(k.notAi).toBeGreaterThanOrEqual(8);
    expect(k.hype).toBeGreaterThanOrEqual(3);
  });

  it('includes the everyday things from the brief', () => {
    const names = AON_POOL.map((i) => i.name.toLowerCase()).join('|');
    for (const word of ['feed', 'face filter', 'calculator', 'rice-cooker', 'symptom', 'maps', 'spam', 'light switch', 'voice assistant', 'tv remote']) {
      expect(names).toContain(word);
    }
  });

  it('counts hype as Not AI and opens its why with "Hype alert!"', () => {
    const hype = AON_POOL.filter((i) => i.kind === 'hype');
    for (const h of hype) {
      expect(answerFor(h)).toBe('not-ai');
      expect(h.why.startsWith('Hype alert!')).toBe(true);
      expect(h.sticker).toBeTruthy();
    }
    expect(AON_POOL.filter((i) => i.kind === 'ai').every((i) => answerFor(i) === 'ai')).toBe(true);
  });

  it('flags a bad pool', () => {
    const [first] = AON_POOL as readonly AonItem[];
    const bad = [first!, first!, { ...first!, id: 'x', kind: 'hype' as const, why: 'Nope.' }];
    const problems = validatePool(bad).map((p) => p.problem);
    expect(problems).toContain('duplicate id');
    expect(problems).toContain('hype card needs a sticker and "Hype alert!"');
  });
});

describe('deck', () => {
  it('has 12 distinct cards with a fixed mix, from the pool', () => {
    const deck = buildDeck('seed-a');
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map((i) => i.id)).size).toBe(DECK_SIZE);
    expect(kinds(deck)).toEqual({ ai: 5, notAi: 5, hype: 2 });
    expect(deck.every((i) => AON_POOL.includes(i))).toBe(true);
  });

  it('is repeatable per seed and differs between seeds', () => {
    const ids = (seed: string) => buildDeck(seed).map((i) => i.id);
    expect(ids('same')).toEqual(ids('same'));
    const variants = new Set(['a', 'b', 'c', 'd', 'e'].map((s) => ids(s).join()));
    expect(variants.size).toBeGreaterThan(1);
  });

  it('tops up from the rest of a small pool', () => {
    const small = AON_POOL.filter((i) => i.kind !== 'hype');
    const deck = buildDeck('x', small);
    expect(deck).toHaveLength(DECK_SIZE);
    expect(new Set(deck.map((i) => i.id)).size).toBe(DECK_SIZE);
  });
});

describe('scoring', () => {
  const ai = AON_POOL.find((i) => i.kind === 'ai')!;
  const hype = AON_POOL.find((i) => i.kind === 'hype')!;

  it('pays 10 for a right answer and nothing for a wrong one', () => {
    const right = scoreAnswer(newRound(), ai, 'ai');
    expect(right).toMatchObject({ right: true, bonus: false, points: 10 });
    const wrong = scoreAnswer(newRound(), ai, 'not-ai');
    expect(wrong).toMatchObject({ right: false, points: 0 });
    expect(wrong.state).toMatchObject({ correct: 0, score: 0, streak: 0, answered: 1 });
  });

  it('accepts Not AI as the right answer for hype', () => {
    expect(scoreAnswer(newRound(), hype, 'not-ai').right).toBe(true);
    expect(scoreAnswer(newRound(), hype, 'ai').right).toBe(false);
  });

  it('adds +5 for each third right answer in a row and a wrong answer resets the run', () => {
    let state = newRound();
    const points: number[] = [];
    for (const a of ['ai', 'ai', 'ai', 'ai', 'ai', 'ai'] as const) {
      const r = scoreAnswer(state, ai, a);
      state = r.state;
      points.push(r.points);
    }
    expect(points).toEqual([10, 10, 15, 10, 10, 15]);
    expect(state).toMatchObject({ score: 70, streak: 6, best: 6, correct: 6 });
    state = scoreAnswer(state, ai, 'not-ai').state;
    expect(state).toMatchObject({ streak: 0, best: 6 });
    const after = [scoreAnswer(state, ai, 'ai'), scoreAnswer(scoreAnswer(state, ai, 'ai').state, ai, 'ai')];
    expect(after.map((r) => r.bonus)).toEqual([false, false]);
  });

  it('a perfect round scores 12 x 10 plus four bonuses', () => {
    let state = newRound();
    for (let i = 0; i < DECK_SIZE; i++) state = scoreAnswer(state, ai, 'ai').state;
    expect(state.score).toBe(DECK_SIZE * POINTS.correct + 4 * POINTS.streakBonus);
    expect(state.score).toBe(maxScore());
    expect(maxScore()).toBe(140);
  });

  it('stars: 3 at 11 or more, 2 at 8 or more, otherwise 1', () => {
    expect([12, 11, 10, 8, 7, 0].map(starsForScore)).toEqual([3, 3, 2, 2, 1, 1]);
  });
});

describe('AiOrNot component', () => {
  beforeEach(() => {
    window.location.hash = '#/learn/m01?seed=unit';
  });
  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  // The component reads the seed from the router signal, so build the same deck the way it does.
  const setup = () => {
    const onComplete = vi.fn();
    render(<AiOrNot moduleId="m01" onComplete={onComplete} />);
    return { onComplete };
  };
  const clickAnswer = (a: 'ai' | 'not-ai') => fireEvent.click(screen.getByRole('button', { name: a === 'ai' ? /^AI/ : /Not AI/ }));
  const currentName = () => screen.getByRole('heading', { level: 3 }).textContent ?? '';
  const itemNamed = (name: string) => AON_POOL.find((i) => i.name === name)!;

  it('plays 12 cards with the buttons, explains each one, then finishes with stars', () => {
    const { onComplete } = setup();
    let right = 0;
    for (let i = 0; i < DECK_SIZE; i++) {
      expect(screen.getByText(`Card ${i + 1} of 12`)).toBeTruthy();
      const item = itemNamed(currentName());
      // answer correctly on every card except the first
      const give = i === 0 ? (answerFor(item) === 'ai' ? 'not-ai' : 'ai') : answerFor(item);
      clickAnswer(give);
      if (give === answerFor(item)) right++;
      const status = screen.getByRole('status');
      expect(status.textContent).toContain(i === 0 ? 'So close!' : 'Correct!');
      expect(status.textContent).toContain(item.kind === 'hype' ? 'Hype alert!' : item.why);
      fireEvent.click(screen.getByRole('button', { name: i === DECK_SIZE - 1 ? 'See my score' : 'Next card' }));
    }
    expect(right).toBe(11);
    expect(screen.getByRole('heading', { name: 'Round complete!' })).toBeTruthy();
    expect(screen.getByText(/11 of 12 cards in the right bin/)).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(screen.getByText('Worth remembering')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Finish game/ }));
    expect(onComplete).toHaveBeenCalledWith(3);
  });

  it('a round of all wrong answers still completes, with one star', () => {
    const { onComplete } = setup();
    for (let i = 0; i < DECK_SIZE; i++) {
      const item = itemNamed(currentName());
      clickAnswer(answerFor(item) === 'ai' ? 'not-ai' : 'ai');
      fireEvent.click(screen.getByRole('button', { name: i === DECK_SIZE - 1 ? 'See my score' : 'Next card' }));
    }
    expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Finish game/ }));
    expect(onComplete).toHaveBeenCalledWith(1);
  });

  it('arrow keys answer (right is AI, left is Not AI) and Enter moves on; a card is answered once', () => {
    setup();
    const first = itemNamed(currentName());
    fireEvent.keyDown(window, { key: answerFor(first) === 'ai' ? 'ArrowRight' : 'ArrowLeft' });
    expect(screen.getByRole('status').textContent).toContain('Correct!');
    expect(screen.getByText('10 pts')).toBeTruthy();
    // a second key press on the same card changes nothing
    fireEvent.keyDown(window, { key: answerFor(first) === 'ai' ? 'ArrowLeft' : 'ArrowRight' });
    expect(screen.getByText('10 pts')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('Card 2 of 12')).toBeTruthy();
    expect(screen.getByRole('status').textContent).not.toContain('Correct!');
  });

  it('a swipe past the threshold answers (right is AI), a short drag does not, and the mouse never drags', () => {
    setup();
    const first = itemNamed(currentName());
    const el = document.querySelector('.aon-swipe') as HTMLElement;
    fireEvent.pointerDown(el, { clientX: 200, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerMove(el, { clientX: 200 + AON_SWIPE_DISTANCE / 2, pointerId: 1, pointerType: 'touch' });
    fireEvent.pointerUp(el, { clientX: 200 + AON_SWIPE_DISTANCE / 2, pointerId: 1, pointerType: 'touch' });
    expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
    fireEvent.pointerDown(el, { clientX: 200, pointerId: 2, pointerType: 'mouse' });
    fireEvent.pointerUp(el, { clientX: 400, pointerId: 2, pointerType: 'mouse' });
    expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
    const dir = answerFor(first) === 'ai' ? 1 : -1;
    fireEvent.pointerDown(el, { clientX: 200, pointerId: 3, pointerType: 'touch' });
    fireEvent.pointerUp(el, { clientX: 200 + dir * AON_SWIPE_DISTANCE, pointerId: 3, pointerType: 'touch' });
    expect(screen.getByRole('status').textContent).toContain('Correct!');
    expect(screen.getByRole('button', { name: 'Next card' })).toBeTruthy();
  });

  it('adds the +5 bonus on the third right answer in a row and shows the streak', () => {
    setup();
    for (let i = 0; i < 3; i++) {
      expect(screen.getByText(`Streak ${i}/3`)).toBeTruthy();
      clickAnswer(answerFor(itemNamed(currentName())));
      if (i === 2) expect(screen.getByRole('status').textContent).toContain('+15 points');
      fireEvent.click(screen.getByRole('button', { name: 'Next card' }));
    }
    expect(screen.getByText('35 pts')).toBeTruthy();
    expect(screen.getByText('Streak 0/3')).toBeTruthy();
  });

  it('puts the sticker on both hype cards and a perfect round scores 140', () => {
    setup();
    let stickers = 0;
    for (let i = 0; i < DECK_SIZE; i++) {
      const item = itemNamed(currentName());
      if (item.kind === 'hype') {
        stickers++;
        expect(screen.getByLabelText(`Sticker on the box: ${item.sticker}`)).toBeTruthy();
      } else {
        expect(document.querySelector('.aon-card__sticker')).toBeNull();
      }
      clickAnswer(answerFor(item));
      fireEvent.click(screen.getByRole('button', { name: i === DECK_SIZE - 1 ? 'See my score' : 'Next card' }));
    }
    expect(stickers).toBe(2);
    expect(screen.getByText('Perfect round! You can spot real AI and hype.')).toBeTruthy();
    expect(screen.getByText('Score: 140 of 140 points')).toBeTruthy();
  });
});
