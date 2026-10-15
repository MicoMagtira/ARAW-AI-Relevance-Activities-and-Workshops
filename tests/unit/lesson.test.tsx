import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { cardsDone, modulesDone } from '../../src/app/progress';
import { resetAll } from '../../src/app/store';
import { xp } from '../../src/app/state';
import { CardView } from '../../src/modules/cards/Cards';
import { SWIPE_DISTANCE } from '../../src/modules/cards/SwipeSort';
import content from '../../src/modules/m01';
import type { Card, ChoiceCard, PollCard, RevealCard, SwipeSortCard } from '../../src/modules/types';
import { Learn, roadPath } from '../../src/screens/Learn';
import { Lesson } from '../../src/screens/Lesson';
import { CONFETTI_MAX, makeParticles, stepParticle } from '../../src/ui/confettiPhysics';

beforeEach(() => {
  window.scrollTo = vi.fn(); // jsdom does not implement it
  window.localStorage.clear();
  resetAll();
});
afterEach(cleanup);

// The M1 lesson has no swipe-sort card (its game is the swipe sort), so the card component is tested with its own fixture.
const sortCard: SwipeSortCard = {
  id: 'test-sort',
  type: 'swipe-sort',
  title: 'Which of these use AI?',
  bins: [
    { id: 'not-ai', label: 'Not AI' },
    { id: 'ai', label: 'AI' },
  ],
  items: [
    { id: 'calculator', text: 'Pocket calculator', bin: 'not-ai', why: 'It follows fixed rules.' },
    { id: 'spam', text: 'Spam filter in your email', bin: 'ai', why: 'It learned from many junk messages.' },
    { id: 'switch', text: 'Light switch', bin: 'not-ai', why: 'On and off. Nothing is guessed.' },
    { id: 'maps', text: 'Maps traffic guess', bin: 'ai', why: 'It guesses from past traffic.' },
  ],
};

const find = <T extends Card>(type: T['type']) => content.cards.find((c) => c.type === type) as T;

function setup(card: Card) {
  const onReady = vi.fn();
  const onReact = vi.fn();
  render(<CardView card={card} onReady={onReady} onReact={onReact} />);
  return { onReady, onReact };
}

describe('card types', () => {
  it('story-hook shows the speaker and is ready at once', () => {
    const { onReady } = setup(content.hook);
    expect(screen.getByText(/phone listening/)).toBeTruthy();
    expect(screen.getByText('Lola Nena')).toBeTruthy();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('info shows title and body and is ready at once', () => {
    const card = content.cards.find((c) => c.type === 'info')!;
    const { onReady } = setup(card);
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('reveal: ready only after every tile was tapped', () => {
    const card = find<RevealCard>('reveal');
    const { onReady, onReact } = setup(card);
    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(card.tiles.length);
    expect(onReady).not.toHaveBeenCalled();
    expect(tiles[0]?.getAttribute('aria-expanded')).toBe('false');
    tiles.forEach((tile, i) => {
      fireEvent.click(tile);
      expect(tile.getAttribute('aria-expanded')).toBe('true');
      expect(onReady).toHaveBeenCalledTimes(i === tiles.length - 1 ? 1 : 0);
    });
    expect(screen.getByText(`${card.tiles.length} of ${card.tiles.length} revealed`)).toBeTruthy();
    expect(onReact).toHaveBeenLastCalledWith(expect.objectContaining({ mood: 'happy' }));
  });

  it('choice: a wrong answer explains and allows another try, the right one unlocks Next and explains every option', () => {
    const card = find<ChoiceCard>('choice');
    const { onReady, onReact } = setup(card);
    const wrongIndex = card.options.findIndex((_, i) => i !== card.correct);
    const buttons = screen.getAllByRole('button');

    fireEvent.click(buttons[wrongIndex]!);
    expect(onReady).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain(card.options[wrongIndex]!.feedback);
    expect(screen.getByRole('status').textContent).toContain('Try another answer');
    expect(onReact).toHaveBeenLastCalledWith(expect.objectContaining({ mood: 'think' }));

    fireEvent.click(buttons[card.correct]!);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toContain('Tama!');
    card.options.forEach((o) => expect(document.body.textContent).toContain(o.feedback));
    expect(onReact).toHaveBeenLastCalledWith(expect.objectContaining({ mood: 'happy' }));
  });

  it('choice: number keys pick options', () => {
    const card = find<ChoiceCard>('choice');
    const { onReady } = setup(card);
    fireEvent.keyDown(window, { key: String(card.correct + 1) });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('swipe-sort: buttons place cards, arrow keys work, and it is ready after the last card', () => {
    const card = sortCard;
    const { onReady } = setup(card);
    const [left, right] = card.bins;
    const placeFor = (i: number) => (card.items[i]!.bin === left.id ? 'ArrowLeft' : 'ArrowRight');

    expect(screen.getByText(card.items[0]!.text)).toBeTruthy();
    // first card by the right button
    const first = card.items[0]!.bin === left.id ? left.label : right.label;
    fireEvent.click(screen.getByRole('button', { name: first }));
    expect(screen.getByRole('status').textContent).toContain('Tama!');
    expect(screen.getByText(card.items[1]!.text)).toBeTruthy();
    // wrong placement says so
    fireEvent.keyDown(window, { key: placeFor(1) === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft' });
    expect(screen.getByRole('status').textContent).toContain('Muntik na!');
    expect(onReady).not.toHaveBeenCalled();
    for (let i = 2; i < card.items.length; i++) fireEvent.keyDown(window, { key: placeFor(i) });
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/All sorted!/)).toBeTruthy();
    expect((screen.getByRole('button', { name: left.label }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('swipe-sort: dragging past the threshold places the card', () => {
    const card = sortCard;
    const { onReady } = setup(card);
    const el = screen.getByText(card.items[0]!.text).closest('.sort-card') as HTMLElement;
    fireEvent.pointerDown(el, { clientX: 200, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 200 + SWIPE_DISTANCE / 2, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 200 + SWIPE_DISTANCE / 2, pointerId: 1 });
    expect(screen.getByText(card.items[0]!.text)).toBeTruthy(); // short drag: still there
    fireEvent.pointerDown(el, { clientX: 200, pointerId: 2 });
    fireEvent.pointerUp(el, { clientX: 200 + SWIPE_DISTANCE, pointerId: 2 });
    expect(screen.queryByText(card.items[0]!.text)).toBeNull();
    expect(screen.getByText(card.items[1]!.text)).toBeTruthy();
    expect(onReady).not.toHaveBeenCalled();
  });

  it('poll: any answer is fine, shows the reflection, and locks', () => {
    const card = find<PollCard>('poll');
    const { onReady } = setup(card);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]!);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('status').textContent).toContain(card.reflection);
    fireEvent.click(buttons[0]!);
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('takeaway: "Kailan ako magtitiwala?" with three bullets, ready at once', () => {
    const { onReady } = setup(content.takeaway);
    expect(screen.getByRole('heading', { name: 'Kailan ako magtitiwala?' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});

describe('Lesson screen', () => {
  it('shows a locked notice for a module that is not open yet', async () => {
    render(<Lesson id="m03" />);
    expect(screen.getByRole('heading', { name: 'This module is locked' })).toBeTruthy();
    expect(screen.getByText('Finish Module 2 first. Modules open one after another.')).toBeTruthy();
  });

  it('shows a notice for an unknown module and for an open module without content', async () => {
    const view = render(<Lesson id="m99" />);
    expect(screen.getByRole('heading', { name: 'We could not find that module' })).toBeTruthy();
    view.unmount();
    modulesDone.value = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09'];
    render(<Lesson id="m10" />);
    expect(await screen.findByRole('heading', { name: 'Coming soon' })).toBeTruthy();
  });

  it('runs a card, saves progress, pays XP and resumes at the same card', async () => {
    const view = render(<Lesson id="m01" />);
    expect(await screen.findByText(/phone listening/)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' }).getAttribute('aria-valuetext')).toBe('Step 1 / 12');
    expect(screen.getByRole('link', { name: /Report this card \(m01-c1\)/ }).getAttribute('href')).toContain('item=m01-c1');
    fireEvent.click(await waitFor(() => {
      const next = screen.getByRole('button', { name: /^Next/ });
      expect((next as HTMLButtonElement).disabled).toBe(false);
      return next;
    }));
    await screen.findByText(/learns patterns/i);
    expect(cardsDone.value.m01).toBe(1);
    expect(xp.value).toBe(5);
    view.unmount();

    render(<Lesson id="m01" />);
    expect(await screen.findByText(/learns patterns/i)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Lesson progress' }).getAttribute('aria-valuetext')).toBe('Step 2 / 12');
  });
});

describe('Learn path', () => {
  it('lists ten modules: one current, nine locked, with a rule and counts', () => {
    render(<Learn />);
    const nodes = screen.getAllByRole('button', { name: /^Module \d+:/ });
    expect(nodes).toHaveLength(10);
    expect(nodes[0]!.getAttribute('aria-current')).toBe('step');
    expect(nodes.filter((n) => /locked/.test(n.getAttribute('aria-label') ?? ''))).toHaveLength(9);
    expect(screen.getByText('0 / 10 done')).toBeTruthy();
    expect(screen.getByText('Core modules')).toBeTruthy();
    expect(screen.getByText('More modules')).toBeTruthy();
  });

  it('shows done and current states from saved progress', () => {
    modulesDone.value = ['m01', 'm02'];
    render(<Learn />);
    const labels = screen.getAllByRole('button', { name: /^Module \d+:/ }).map((n) => n.getAttribute('aria-label') ?? '');
    expect(labels.filter((l) => /done/.test(l))).toHaveLength(2);
    expect(labels[2]).toMatch(/next up/);
    expect(screen.getByText('2 / 10 done')).toBeTruthy();
  });

  it('draws the stepped road with right angles only', () => {
    expect(roadPath([], 'x')).toBe('');
    expect(roadPath([{ x: 10, y: 40 }, { x: 30, y: 96 }], 'x')).toBe('M10 40 H20 V96 H30');
    expect(roadPath([{ x: 25, y: 40 }, { x: 75, y: 168 }], 'y')).toBe('M25 40 V104 H75 V168');
  });
});

describe('confetti physics', () => {
  it('never spawns more than 60 particles of 4 or 8 px, with valid colours', () => {
    expect(makeParticles(500, 400)).toHaveLength(CONFETTI_MAX);
    expect(makeParticles(-3, 400)).toHaveLength(0);
    for (const p of makeParticles(60, 400)) {
      expect([4, 8]).toContain(p.size);
      expect(p.colour).toBeGreaterThanOrEqual(0);
      expect(p.colour).toBeLessThan(5);
    }
  });

  it('falls under gravity', () => {
    const p = makeParticles(1, 400, () => 0.5)[0]!;
    const next = stepParticle(p, 0.1);
    expect(next.vy).toBeGreaterThan(p.vy);
    expect(next.y).toBeGreaterThan(p.y);
  });
});
