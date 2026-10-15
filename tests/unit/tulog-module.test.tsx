// Module 8 (T23): the lesson content, the "Tulog na, Bea!" module game, and the Arcade version (endless days, saved run).
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { startRouter } from '../../src/app/router';
import { bestScores } from '../../src/app/scores';
import { resetAll } from '../../src/app/store';
import { MODULES } from '../../src/content/modules';
import { BOUNDARIES, METERS, PULLS, type BoundaryId, type Moment, type MomentOption } from '../../src/games/tulog-na-bea/moments';
import { buildDay, choose, endDay, newGame, starsFor, toggleBoundary, MODULE_DAYS, type Game } from '../../src/games/tulog-na-bea/sim';
import TulogArcade from '../../src/games/tulog-na-bea/TulogArcade';
import m08 from '../../src/modules/m08';
import TulogNaBea from '../../src/modules/m08/TulogNaBea';
import { hasContent, loadContent } from '../../src/modules/registry';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('Module 8 content', () => {
  it('has the hook, seven cards in SPEC order, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm08');
    expect(1 + m08.cards.length).toBe(info?.cards);
    expect(m08.cards.map((c) => c.type)).toEqual(['info', 'info', 'reveal', 'choice', 'swipe-sort', 'choice', 'poll']);
    expect(m08.hook.speaker).toBe('Lola Nena');
    expect(m08.hook.scene).toMatch(/1 AM/);
    expect(m08.game.slug).toBe('tulog-na-bea');
    expect(m08.game.name).toBe(info?.game);
    const ids = [m08.hook.id, ...m08.cards.map((c) => c.id), m08.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m08.review_status).toBe('unreviewed');
  });

  it('keeps info cards short, and every choice option explains itself', () => {
    for (const c of m08.cards) {
      if (c.type === 'info') expect(words(c.body), c.id).toBeLessThanOrEqual(60);
      if (c.type === 'choice') {
        expect(c.options.length).toBeGreaterThanOrEqual(2);
        expect(c.options.length).toBeLessThanOrEqual(4);
        for (const o of c.options) expect(o.feedback.length).toBeGreaterThan(20);
      }
    }
  });

  it('teaches attention design and sleep in the two info cards', () => {
    const [attention, sleep] = [m08.cards[0], m08.cards[1]];
    if (attention?.type !== 'info' || sleep?.type !== 'info') throw new Error('cards 1 and 2 should be info');
    expect(attention.body).toMatch(/Infinite scroll/);
    expect(attention.body).toMatch(/Autoplay/);
    expect(attention.body).toMatch(/Notifications/);
    expect(sleep.body).toMatch(/mood/);
    expect(sleep.body).toMatch(/memory/);
  });

  it('reveals that AI companions are products, not friends', () => {
    const c = m08.cards[2];
    if (c?.type !== 'reveal') throw new Error('card 3 should be a reveal');
    expect(c.tiles.map((t) => t.label)).toEqual(['It feels caring', 'A company made it', '"I will miss you"', 'What it cannot do']);
    expect(c.tiles[1]?.detail).toMatch(/product/);
  });

  it('points to a trusted person, a health worker and the 1553 crisis hotline for weeks of feeling down', () => {
    const c = m08.cards[3];
    if (c?.type !== 'choice') throw new Error('card 4 should be a choice');
    expect(c.question).toMatch(/weeks/);
    expect(c.options[c.correct]?.text).toMatch(/someone she trusts, or a health worker/);
    expect(c.options[c.correct]?.feedback).toMatch(/1553/);
    expect(c.options[0]?.text).toMatch(/AI companion/);
  });

  it('sorts helpful boundaries from unhelpful habits', () => {
    const sort = m08.cards[4];
    if (sort?.type !== 'swipe-sort') throw new Error('card 5 should be the sort');
    expect(sort.bins.map((b) => b.id)).toEqual(['helps', 'not']);
    const bin = (needle: RegExp) => sort.items.find((i) => needle.test(i.text))?.bin;
    expect(bin(/Focus mode/)).toBe('helps');
    expect(bin(/Phone-free dinner/)).toBe('helps');
    expect(bin(/Notifications off at night/)).toBe('helps');
    expect(bin(/Autoplay on/)).toBe('not');
    expect(bin(/pillow/)).toBe('not');
    expect(sort.items.length).toBeGreaterThanOrEqual(4);
    expect(sort.items.length).toBeLessThanOrEqual(8);
  });

  it('says a chatbot is a tool for tasks, not a friend or a doctor', () => {
    const c = m08.cards[5];
    if (c?.type !== 'choice') throw new Error('card 6 should be a choice');
    expect(c.options[c.correct]?.text).toMatch(/tool for tasks/);
    expect(c.options.length).toBe(3);
  });

  it('ends with the three-bullet takeaway and loads through the registry', async () => {
    expect(m08.takeaway.bullets).toHaveLength(3);
    expect(m08.takeaway.bullets.join(' ')).toMatch(/respect your time/);
    expect(m08.takeaway.bullets.join(' ')).toMatch(/real people help with feelings/);
    expect(m08.takeaway.bullets.join(' ')).toMatch(/Sleep beats one more video/);
    expect(hasContent('m08')).toBe(true);
    expect((await loadContent('m08'))?.id).toBe('m08');
    expect((await m08.game.load()).default).toBeTypeOf('function');
  });
});

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const meter = (name: string) => screen.getByRole('meter', { name }).getAttribute('aria-valuenow');
const total = (o: MomentOption) => o.fx.reduce((a, b) => a + b, 0);

type Policy = (m: Moment) => MomentOption;
const wise: Policy = (m) => m.options.reduce((a, b) => (total(b) > total(a) ? b : a));
const greedy: Policy = (m) => m.options.find((o) => o.pull) ?? (m.options[0] as MomentOption);

/** Play the screens from the intro, mirroring every step in the sim, until the result screen. Returns the mirror. */
function play(seed: string, policy: Policy, boundaries: readonly BoundaryId[], days: number): Game {
  press(/^Start the first day/);
  let g = newGame(seed);
  while (true) {
    if (g.day === 1) {
      for (const b of boundaries) {
        press(new RegExp(`^${BOUNDARIES.find((x) => x.id === b)?.name}`));
        g = toggleBoundary(g, b);
      }
    }
    press(new RegExp(`^Start day ${g.day}`));
    for (const m of buildDay(seed, g.day, g.boundaries)) {
      const o = policy(m);
      press(o.text);
      g = choose(g, m, o).game;
      if (g.reset) {
        press(/^See the result/);
        return g;
      }
      press(g.slot >= 6 ? /^Go to sleep/ : /^Next part of the day/);
    }
    g = endDay(g).game;
    if (g.reset || g.day > days) {
      // the module ends by itself; in the Arcade the player finishes the run from the next morning's plan
      if (screen.queryByRole('button', { name: /^See the result/ })) press(/^See the result/);
      else {
        press(/^Plan day/);
        press('Finish run');
      }
      return g;
    }
    press(new RegExp(`^Plan day ${g.day}`));
  }
}

describe('Tulog na, Bea! module game', () => {
  let stopRouter: () => void;
  beforeEach(() => {
    resetAll();
    window.location.hash = '#/learn/m08?seed=unit';
    stopRouter = startRouter();
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
    resetAll();
  });

  it('shows the intro with a How it works list', () => {
    render(<TulogNaBea moduleId="m08" onComplete={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Tulog na, Bea!' })).toBeTruthy();
    expect(screen.getByText(/Help Bea through three days/)).toBeTruthy();
    expect(screen.getByText(/Four meters: Sleep, Mood, Study and Social/)).toBeTruthy();
  });

  it('shows four meters at 70, and a morning plan with the four boundaries and what each costs', () => {
    render(<TulogNaBea moduleId="m08" onComplete={() => {}} />);
    press(/^Start the first day/);
    expect(screen.getByRole('heading', { name: 'Morning plan, day 1' })).toBeTruthy();
    for (const m of METERS) expect(meter(m[0]?.toUpperCase() + m.slice(1))).toBe('70');
    const names = BOUNDARIES.map((b) => b.name);
    for (const n of names) expect(screen.getByRole('button', { name: new RegExp(`^${n}`) }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByText(/Social −6 now, Social −2 a day/, { selector: '.tulog-bound__cost' })).toHaveLength(2);
    expect(screen.getByRole('progressbar', { name: 'Days done' }).getAttribute('aria-valuetext')).toBe('Day 1 of 3');
  });

  it('switching a boundary on costs a little right away and shows it on the meter', () => {
    render(<TulogNaBea moduleId="m08" onComplete={() => {}} />);
    press(/^Start the first day/);
    const focus = screen.getByRole('button', { name: /^Focus mode/ });
    fireEvent.click(focus);
    expect(focus.getAttribute('aria-pressed')).toBe('true');
    expect(meter('Social')).toBe('64');
    fireEvent.click(focus);
    expect(focus.getAttribute('aria-pressed')).toBe('false');
    expect(meter('Social')).toBe('64');
  });

  it('draws Bea with a description that follows how she feels and what the phone is doing', () => {
    render(<TulogNaBea moduleId="m08" onComplete={() => {}} />);
    press(/^Start the first day/);
    expect(screen.getByRole('img', { name: /^Bea looks happy\. It is Morning, 6 to 8 AM\./ })).toBeTruthy();
  });

  it('shows one moment at a time with three choices, then what the choice did and why', () => {
    render(<TulogNaBea moduleId="m08" onComplete={() => {}} />);
    press(/^Start the first day/);
    press(/^Start day 1/);
    const [first] = buildDay('unit', 1, []) as [Moment];
    expect(screen.getByRole('heading', { name: first.title })).toBeTruthy();
    expect(screen.getByText(/Part 1 of 6: Morning/)).toBeTruthy();
    const group = screen.getByRole('group', { name: 'What does Bea do?' });
    expect(group.querySelectorAll('button')).toHaveLength(3);
    const o = wise(first);
    press(o.text);
    expect(screen.getByText(`Bea chose: ${o.text}`)).toBeTruthy();
    expect(screen.getByText(o.lesson)).toBeTruthy();
    expect(screen.getByText(/Balance points: \+/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/[+−]\d/);
  });

  it('names the design trick and says the pull won when Bea gives in', () => {
    // find a seed whose first day starts with a pull
    let seed = '';
    for (let i = 0; i < 40 && !seed; i++) if (buildDay(`p${i}`, 1, [])[0]?.source) seed = `p${i}`;
    expect(seed).not.toBe('');
    cleanup();
    stopRouter();
    window.location.hash = `#/learn/m08?seed=${seed}`;
    stopRouter = startRouter();
    render(<TulogNaBea moduleId="m08" onComplete={() => {}} />);
    press(/^Start the first day/);
    press(/^Start day 1/);
    const [first] = buildDay(seed, 1, []) as [Moment];
    expect(screen.getByText('Her phone is calling')).toBeTruthy();
    press(greedy(first).text);
    expect(screen.getByRole('heading', { name: 'The pull won' })).toBeTruthy();
    const info = PULLS[first.source as keyof typeof PULLS];
    expect(screen.getByText(`Design trick: ${info.name}.`)).toBeTruthy();
    expect(screen.getByText(info.trick, { exact: false })).toBeTruthy();
  });

  it('plays three days with balanced choices and boundaries: the result, stars and Finish game', () => {
    let stars = 0;
    render(<TulogNaBea moduleId="m08" onComplete={(n) => (stars = n)} />);
    const g = play('unit', wise, ['focus', 'dinner', 'bedtime', 'mute'], MODULE_DAYS);
    expect(g.reset).toBeNull();
    expect(g.day).toBe(MODULE_DAYS + 1);
    expect(screen.getByRole('heading', { name: 'Three days done!' })).toBeTruthy();
    expect(screen.getByText('Days finished: 3')).toBeTruthy();
    expect(screen.getByText(`Good days: ${g.goodDays}`)).toBeTruthy();
    expect(screen.getByText(/Sleep beats one more video/)).toBeTruthy();
    expect(screen.getByText(/crisis hotline, 1553/)).toBeTruthy();
    press(/^Finish game/);
    expect(stars).toBe(starsFor(g.goodDays, null));
    expect(stars).toBeGreaterThanOrEqual(2);
  });

  it('still finishes after a reset day: one star, and no fail state', () => {
    // find a seed where giving in every time ends the run within the three days
    let seed = '';
    for (let i = 0; i < 60 && !seed; i++) {
      let g = newGame(`r${i}`);
      while (!g.reset && g.day <= MODULE_DAYS) {
        for (const m of buildDay(`r${i}`, g.day, [])) {
          g = choose(g, m, greedy(m)).game;
          if (g.reset) break;
        }
        if (!g.reset) g = endDay(g).game;
      }
      if (g.reset) seed = `r${i}`;
    }
    expect(seed).not.toBe('');
    cleanup();
    stopRouter();
    window.location.hash = `#/learn/m08?seed=${seed}`;
    stopRouter = startRouter();
    let stars = 0;
    render(<TulogNaBea moduleId="m08" onComplete={(n) => (stars = n)} />);
    const g = play(seed, greedy, [], MODULE_DAYS);
    expect(g.reset).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Bea needs a reset day' })).toBeTruthy();
    expect(screen.getByText(/Bea (ran out|lost|fell)|Bea’s mood ran out/)).toBeTruthy();
    press(/^Finish game/);
    expect(stars).toBe(1);
  });
});

describe('Tulog na, Bea! in the Arcade', () => {
  beforeEach(() => resetAll());
  afterEach(() => {
    cleanup();
    resetAll();
  });

  it('is endless: no day limit, a Finish run button, and the day counter in the HUD', () => {
    render(<TulogArcade seed="arc" />);
    expect(screen.getByText(/The game goes on until a meter hits zero/)).toBeTruthy();
    press(/^Start the first day/);
    expect(screen.getByText('Day 1')).toBeTruthy();
    expect(screen.getByText('Score 0')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Finish run' })).toBeTruthy();
  });

  it('plays until Bea needs a reset day, then saves the run and plays again from day one', () => {
    render(<TulogArcade seed="arc" />);
    const g = play('arc', greedy, [], 60);
    expect(g.reset).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Bea needs a reset day' })).toBeTruthy();
    expect(screen.getByText(`Days finished: ${g.day - 1}`)).toBeTruthy();
    expect(screen.getByText(`Points: ${g.score.toLocaleString('en-US')}`)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Arcade' })).toBeTruthy();
    expect(bestScores.value['tulog-na-bea'] ?? 0).toBe(g.score);
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByRole('heading', { name: 'Tulog na, Bea!' })).toBeTruthy();
    press(/^Start the first day/);
    expect(meter('Sleep')).toBe('70');
  });

  it('lets the player finish the run on purpose', () => {
    render(<TulogArcade seed="arc" />);
    press(/^Start the first day/);
    press(/^Start day 1/);
    press('Finish run');
    expect(screen.getByRole('heading', { name: 'Run finished' })).toBeTruthy();
    expect(screen.getByText('Days finished: 0')).toBeTruthy();
  });

  it('runs a well-balanced run for many days with boundaries and keeps adding points', () => {
    render(<TulogArcade seed="arc2" />);
    const g = play('arc2', wise, ['focus', 'dinner', 'bedtime', 'mute'], 10);
    expect(g.reset).toBeNull();
    expect(g.day).toBe(11);
    expect(g.goodDays).toBeGreaterThanOrEqual(8);
    expect(screen.getByRole('heading', { name: 'Run finished' })).toBeTruthy();
    expect(g.score).toBeGreaterThan(1500);
  });
});
