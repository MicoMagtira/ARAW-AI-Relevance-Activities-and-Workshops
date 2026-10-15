// Module 6 (T21): the lesson content and the "Hati Tayo!" module game component.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { startRouter } from '../../src/app/router';
import { resetAll } from '../../src/app/store';
import { MODULES } from '../../src/content/modules';
import { buildModulePlay } from '../../src/games/hati-tayo/rules';
import type { Task } from '../../src/games/hati-tayo/tasks';
import m06 from '../../src/modules/m06';
import HatiTayo from '../../src/modules/m06/HatiTayo';
import { hasContent, loadContent } from '../../src/modules/registry';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('Module 6 content', () => {
  it('has the hook, seven cards in SPEC order, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm06');
    expect(1 + m06.cards.length).toBe(info?.cards);
    expect(m06.cards).toHaveLength(7);
    expect(m06.hook.speaker).toBe('Kuya Jun');
    expect(m06.game.slug).toBe('hati-tayo');
    expect(m06.game.name).toBe(info?.game);
    const ids = [m06.hook.id, ...m06.cards.map((c) => c.id), m06.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m06.review_status).toBe('unreviewed');
    expect(m06.cards.map((c) => c.type)).toEqual(['info', 'swipe-sort', 'reveal', 'choice', 'info', 'choice', 'poll']);
  });

  it('keeps info cards short, and every choice option explains itself', () => {
    for (const c of m06.cards) {
      if (c.type === 'info') expect(words(c.body), c.id).toBeLessThanOrEqual(75);
      if (c.type === 'choice') {
        expect(c.options.length).toBeGreaterThanOrEqual(2);
        expect(c.options.length).toBeLessThanOrEqual(4);
        for (const o of c.options) expect(o.feedback.length).toBeGreaterThan(20);
      }
    }
  });

  it('sorts the four SPEC tasks (count stock, translate, comfort, referral) into the right bins', () => {
    const sort = m06.cards[1];
    if (sort?.type !== 'swipe-sort') throw new Error('card 2 should be the sort');
    expect(sort.bins.map((b) => b.id)).toEqual(['ai', 'person']);
    expect(sort.items.length).toBeGreaterThanOrEqual(4);
    expect(sort.items.length).toBeLessThanOrEqual(8);
    const bin = (needle: RegExp) => sort.items.find((i) => needle.test(i.text))?.bin;
    expect(bin(/Count the boxes/)).toBe('ai');
    expect(bin(/Translate/)).toBe('ai');
    expect(bin(/Comfort/)).toBe('person');
    expect(bin(/hospital/)).toBe('person');
  });

  it('answers the two questions as SPEC says: a fluent speaker checks, the people who use the tool are responsible', () => {
    const [translate, schedule] = [m06.cards[3], m06.cards[5]];
    if (translate?.type !== 'choice' || schedule?.type !== 'choice') throw new Error('cards 4 and 6 should be choices');
    expect(translate.options[translate.correct]?.text).toMatch(/fluent speaker, before it is printed/);
    expect(schedule.options[schedule.correct]?.text).toMatch(/chose the tool and use it/);
  });

  it('names the four weak spots and ends with the three-bullet takeaway', () => {
    const reveal = m06.cards[2];
    if (reveal?.type !== 'reveal') throw new Error('card 3 should be a reveal');
    expect(reveal.tiles.map((t) => t.label)).toEqual(['Empathy', 'Local context', 'Judgement calls', 'Accountability']);
    expect(m06.takeaway.bullets).toHaveLength(3);
    expect(m06.takeaway.bullets.join(' ')).toMatch(/responsible/);
  });

  it('loads through the registry, with a lazy game component', async () => {
    expect(hasContent('m06')).toBe(true);
    expect((await loadContent('m06'))?.id).toBe('m06');
    expect((await m06.game.load()).default).toBeTypeOf('function');
  });
});

describe('Hati Tayo! module game', () => {
  let stopRouter: () => void;
  beforeEach(() => {
    resetAll();
    window.location.hash = '#/learn/m06?seed=unit';
    stopRouter = startRouter();
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
    resetAll();
  });

  const tasks = (): Task[] => buildModulePlay('unit');
  const start = () => fireEvent.click(screen.getByRole('button', { name: /^Start the day/ }));
  const send = (lane: 'ai' | 'person') => fireEvent.click(screen.getByRole('button', { name: new RegExp(lane === 'ai' ? '^AI helper' : '^Person') }));
  const next = () => fireEvent.click(screen.getByRole('button', { name: /^(Next task|See the day report)/ }));

  /** Play all eight tasks, choosing each lane with `choose`. */
  function playAll(choose: (t: Task) => 'ai' | 'person') {
    for (const t of tasks()) {
      expect(screen.getByText(t.text)).toBeTruthy();
      send(choose(t));
      next();
    }
  }

  it('opens with the story and a start button', () => {
    render(<HatiTayo moduleId="m06" onComplete={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Hati Tayo!' })).toBeTruthy();
    expect(screen.getByText(/Kuya Jun's first day with the AI helper/)).toBeTruthy();
    expect(screen.getByText('The AI helper is instant at repeat jobs, but it can fail at care and judgement.')).toBeTruthy();
  });

  it('shows the first task with two lane buttons, a progress bar and the Service meter', () => {
    render(<HatiTayo moduleId="m06" onComplete={() => {}} />);
    start();
    expect(screen.getByText('Count the boxes of vitamins and masks in the stockroom.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Who should do this task?' })).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Tasks done' }).getAttribute('aria-valuetext')).toBe('Task 1 of 8');
    expect(screen.getByRole('meter', { name: 'Service' }).getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByText('Instant')).toBeTruthy();
    expect(screen.getByText('Slow, but caring')).toBeTruthy();
  });

  it('praises the right lane and moves on', () => {
    render(<HatiTayo moduleId="m06" onComplete={() => {}} />);
    start();
    send('ai');
    expect(screen.getByText('Good split!')).toBeTruthy();
    expect(screen.getByText('You sent it to the AI helper.')).toBeTruthy();
    expect(screen.getByText('Counting is the same job again and again. AI is fast at it.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^AI helper/ })).toBeNull();
    next();
    expect(screen.getByText('A worried mother is in tears at the door. Comfort her.')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Tasks done' }).getAttribute('aria-valuetext')).toBe('Task 2 of 8');
  });

  it('shows the funny AI slip-up, says what was better and lowers the Service meter', () => {
    render(<HatiTayo moduleId="m06" onComplete={() => {}} />);
    start();
    send('ai');
    next();
    send('ai');
    expect(screen.getByText('AI slip-up!')).toBeTruthy();
    expect(screen.getByText("The AI told the worried mother 'Error 404: comfort not found'.")).toBeTruthy();
    expect(screen.getByText(/^Better: the person\./)).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'Service' }).getAttribute('aria-valuenow')).toBe('86');
  });

  it('calls a person doing an AI job slow, not wrong', () => {
    render(<HatiTayo moduleId="m06" onComplete={() => {}} />);
    start();
    send('person');
    expect(screen.getByText('Done, but slow')).toBeTruthy();
    expect(screen.getByText('Kuya Jun counted every box by hand. The mothers kept waiting.')).toBeTruthy();
    expect(screen.getByText(/^Better: the AI helper\./)).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'Service' }).getAttribute('aria-valuenow')).toBe('100');
  });

  it('plays all eight tasks with the right lanes: three stars, and onComplete gets 3', () => {
    let stars = 0;
    render(<HatiTayo moduleId="m06" onComplete={(n) => (stars = n)} />);
    start();
    playAll((t) => (t.needs === 'ai' ? 'ai' : 'person'));
    expect(screen.getByRole('heading', { name: 'The day is done!' })).toBeTruthy();
    expect(screen.getByText('Good splits: 8 of 8. Done slowly by hand: 0. AI slip-ups: 0.')).toBeTruthy();
    expect(screen.getByText(/Tulong-Tulong in the making/)).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(8);
    fireEvent.click(screen.getByRole('button', { name: 'Finish game' }));
    expect(stars).toBe(3);
  });

  it('plays all eight tasks with every lane wrong: one star, no fail state, onComplete still fires', () => {
    let stars = 0;
    render(<HatiTayo moduleId="m06" onComplete={(n) => (stars = n)} />);
    start();
    playAll((t) => (t.needs === 'ai' ? 'person' : 'ai'));
    expect(screen.getByText('Good splits: 0 of 8. Done slowly by hand: 4. AI slip-ups: 4.')).toBeTruthy();
    expect(screen.getByText(/A good start/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Finish game' }));
    expect(stars).toBe(1);
  });

  it('gives two stars for a half-right day', () => {
    let stars = 0;
    render(<HatiTayo moduleId="m06" onComplete={(n) => (stars = n)} />);
    start();
    // every AI job right, every people job to AI: 4 good, 4 slip-ups
    playAll(() => 'ai');
    expect(screen.getByText(/Good job!/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Finish game' }));
    expect(stars).toBe(2);
  });
});
