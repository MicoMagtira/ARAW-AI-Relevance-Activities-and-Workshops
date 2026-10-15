import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { resetAll } from '../../src/app/store';
import { FOF_ITEMS } from '../../src/content/factOrFake/items';
import type { FofItem } from '../../src/content/factOrFake/schema';
import { FofRound, SWIPE_DISTANCE, type RoundAnswer } from '../../src/games/fact-or-fake/FofRound';
import { TruthRadar } from '../../src/games/fact-or-fake/TruthRadar';
import { scoreRound } from '../../src/games/fact-or-fake/scoring';

beforeEach(() => {
  window.localStorage.clear();
  resetAll();
});
afterEach(cleanup);

const byId = (id: string) => FOF_ITEMS.find((i) => i.id === id) as FofItem;
const FAKE_TEXT = byId('fof-p-001'); // text, fake
const FACT_CHAT = byId('fof-p-002'); // chatbot, fact
const GC_FAKE = byId('fof-p-003');
const IMAGE_FAKE = byId('fof-p-005');

function setup(items: FofItem[], mode: 'module' | 'free' | 'assess' = 'free') {
  const onAnswer = vi.fn();
  const onFinish = vi.fn();
  render(<FofRound items={items} mode={mode} finishLabel="See my Truth Radar" onAnswer={onAnswer} onFinish={onFinish} />);
  return { onAnswer, onFinish };
}

describe('item renderers', () => {
  it('shows a feed post with author, meta and the ARAW GAME watermark', () => {
    setup([FAKE_TEXT]);
    expect(screen.getByText('Healthy Pinoy Tips 24/7')).toBeTruthy();
    expect(screen.getByText(/Page · 2h/)).toBeTruthy();
    expect(screen.getByText('ARAW GAME')).toBeTruthy();
    expect(screen.queryByText('ARAW GAME · FAKE')).toBeNull();
  });

  it('shows a GC message with the context bar', () => {
    setup([GC_FAKE]);
    expect(screen.getByText(/Barangay Masagana GC/)).toBeTruthy();
    expect(screen.getByText('Tito Boy')).toBeTruthy();
  });

  it('shows a chatbot answer with the question above it', () => {
    setup([FACT_CHAT]);
    expect(screen.getByText('You asked')).toBeTruthy();
    expect(screen.getByText(/coughing for three weeks/)).toBeTruthy();
    expect(screen.getByText(/I am an AI/)).toBeTruthy();
  });

  it('shows the synthetic picture with alt text, badge and a sponsored call to action', () => {
    setup([IMAGE_FAKE]);
    expect(screen.getByRole('img', { name: /synthetic/ })).toBeTruthy();
    expect(screen.getByText('FDA APPROVED')).toBeTruthy();
    expect(screen.getByText('Learn more')).toBeTruthy();
  });
});

describe('answering', () => {
  it('right answer on a fake: Tama, stamp, why, how to check, trick chip, report link with the id', () => {
    const { onAnswer } = setup([FAKE_TEXT, FACT_CHAT]);
    fireEvent.click(screen.getByRole('button', { name: 'Fake' }));
    expect(onAnswer).toHaveBeenCalledWith({ item: FAKE_TEXT, answer: 'fake', correct: true });
    expect(screen.getByText('Tama! It is FAKE.')).toBeTruthy();
    expect(screen.getByText('ARAW GAME · FAKE')).toBeTruthy();
    expect(screen.getByText('Trick: Miracle Mike')).toBeTruthy();
    expect(screen.getByText(/not proof/)).toBeTruthy();
    expect(screen.getByText(/FDA Philippines verification portal/)).toBeTruthy();
    expect(screen.getByText(/Based on:/)).toBeTruthy();
    const report = screen.getByRole('link', { name: /Report this item \(fof-p-001\)/ });
    expect(report.getAttribute('href')).toBe('#/report?screen=fact-or-fake&item=fof-p-001');
  });

  it('wrong answer on a fact says Muntik na, shows no stamp and no trick', () => {
    setup([FACT_CHAT, FAKE_TEXT]);
    fireEvent.click(screen.getByRole('button', { name: 'Fake' }));
    expect(screen.getByText('Muntik na! It is actually FACT.')).toBeTruthy();
    expect(screen.queryByText('ARAW GAME · FAKE')).toBeNull();
    expect(screen.queryByText(/^Trick:/)).toBeNull();
  });

  it('ignores a second answer to the same item', () => {
    const { onAnswer } = setup([FAKE_TEXT, FACT_CHAT]);
    fireEvent.click(screen.getByRole('button', { name: 'Fake' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fact' }));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it('answers with the keys: arrows and A / L', () => {
    const { onAnswer } = setup([FAKE_TEXT, FACT_CHAT, GC_FAKE]);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(onAnswer).toHaveBeenLastCalledWith(expect.objectContaining({ answer: 'fake' }));
    fireEvent.keyDown(window, { key: 'Enter' }); // next
    fireEvent.keyDown(window, { key: 'l' });
    expect(onAnswer).toHaveBeenLastCalledWith(expect.objectContaining({ answer: 'fact', item: FACT_CHAT }));
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'a' });
    expect(onAnswer).toHaveBeenLastCalledWith(expect.objectContaining({ answer: 'fake', item: GC_FAKE }));
  });

  it('walks through the items and finishes with every answer', () => {
    const { onFinish } = setup([FAKE_TEXT, FACT_CHAT]);
    fireEvent.click(screen.getByRole('button', { name: 'Fake' }));
    expect(screen.getByRole('button', { name: /^Next/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fact' }));
    fireEvent.click(screen.getByRole('button', { name: /See my Truth Radar/ }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    const answers = onFinish.mock.calls[0]?.[0] as RoundAnswer[];
    expect(answers.map((a) => [a.item.id, a.answer, a.correct])).toEqual([
      ['fof-p-001', 'fake', true],
      ['fof-p-002', 'fact', true],
    ]);
    // pressing the finish button again never double-submits
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('marks round progress dots right, wrong and not yet', () => {
    setup([FAKE_TEXT, FACT_CHAT, GC_FAKE]);
    fireEvent.click(screen.getByRole('button', { name: 'Fake' }));
    expect(screen.getByText('Item 1: right')).toBeTruthy();
    expect(screen.getByText('Item 2: not answered yet')).toBeTruthy();
  });
});

describe('swipe', () => {
  const swipe = (dx: number) => {
    const area = document.querySelector('.fof-swipe') as HTMLElement;
    fireEvent.pointerDown(area, { pointerType: 'touch', pointerId: 1, clientX: 200 });
    fireEvent.pointerMove(area, { pointerType: 'touch', pointerId: 1, clientX: 200 + dx });
    fireEvent.pointerUp(area, { pointerType: 'touch', pointerId: 1, clientX: 200 + dx });
  };

  it('swipe right answers Fact, swipe left answers Fake', () => {
    const { onAnswer } = setup([FACT_CHAT, FAKE_TEXT]);
    swipe(SWIPE_DISTANCE + 20);
    expect(onAnswer).toHaveBeenLastCalledWith(expect.objectContaining({ answer: 'fact', correct: true }));
    fireEvent.click(screen.getByRole('button', { name: /^Next/ }));
    swipe(-(SWIPE_DISTANCE + 20));
    expect(onAnswer).toHaveBeenLastCalledWith(expect.objectContaining({ answer: 'fake', correct: true }));
  });

  it('a short drag snaps back without answering', () => {
    const { onAnswer } = setup([FACT_CHAT, FAKE_TEXT]);
    swipe(SWIPE_DISTANCE - 20);
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('a mouse drag is not a swipe', () => {
    const { onAnswer } = setup([FACT_CHAT, FAKE_TEXT]);
    const area = document.querySelector('.fof-swipe') as HTMLElement;
    fireEvent.pointerDown(area, { pointerType: 'mouse', pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(area, { pointerType: 'mouse', pointerId: 1, clientX: 400 });
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe('assessment mode', () => {
  it('gives no feedback, no stamp and no report link, and moves straight on', () => {
    const { onAnswer, onFinish } = setup([FAKE_TEXT, FACT_CHAT], 'assess');
    expect(screen.queryByRole('link', { name: /Report/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fake' }));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Tama!|Muntik na!/)).toBeNull();
    expect(screen.queryByText('ARAW GAME · FAKE')).toBeNull();
    expect(screen.getByText(/2 of 2/)).toBeTruthy();
    expect(screen.getByText('Item 1: answered')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fact' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});

describe('Truth Radar panel', () => {
  const score = (nFake: number, hits: number, nFact: number, fa: number) =>
    scoreRound([
      ...Array.from({ length: nFake }, (_, i) => ({ truth: 'fake' as const, answer: i < hits ? ('fake' as const) : ('fact' as const) })),
      ...Array.from({ length: nFact }, (_, i) => ({ truth: 'fact' as const, answer: i < fa ? ('fake' as const) : ('fact' as const) })),
    ]);

  it('shows both meters, the balanced verdict and the numbers behind a disclosure', () => {
    render(<TruthRadar score={score(5, 5, 5, 0)} />);
    expect(screen.getByRole('meter', { name: 'How well you tell them apart' })).toBeTruthy();
    expect(screen.getByText('Truth Radar pro')).toBeTruthy();
    expect(screen.getAllByText('Balanced').length).toBeGreaterThan(0);
    expect(screen.getByText(/Nice balance/)).toBeTruthy();
    expect(screen.queryByText(/Rough read/)).toBeNull();
    expect(screen.getByText('Show the numbers')).toBeTruthy();
  });

  it('shows a rough read for short rounds and the lean tips for each side', () => {
    const { unmount } = render(<TruthRadar score={score(2, 0, 2, 0)} />);
    expect(screen.getByText(/Rough read/)).toBeTruthy();
    expect(screen.getByText('Leans trusting')).toBeTruthy();
    expect(screen.getByText(/You lean trusting/)).toBeTruthy();
    unmount();
    render(<TruthRadar score={score(5, 5, 5, 5)} />);
    expect(screen.getByText('Leans doubtful')).toBeTruthy();
    expect(screen.getByText(/You lean doubtful/)).toBeTruthy();
  });

  it('copes with a round of only one truth', () => {
    render(<TruthRadar score={score(4, 4, 0, 0)} />);
    expect(screen.getByRole('meter')).toBeTruthy();
  });
});
