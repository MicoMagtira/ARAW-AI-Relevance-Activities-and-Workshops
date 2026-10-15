// Module 9 (T24): the lesson content, the "Sa Sapatos Nila" module game, the kiosk's simulation filters, and the Arcade version.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startRouter } from '../../src/app/router';
import { bestScores } from '../../src/app/scores';
import { resetAll } from '../../src/app/store';
import { MODULES } from '../../src/content/modules';
import { SCREENS, personaById } from '../../src/games/sa-sapatos-nila/data';
import { Kiosk } from '../../src/games/sa-sapatos-nila/Kiosk';
import SapatosArcade from '../../src/games/sa-sapatos-nila/SapatosArcade';
import { MODULE_VISITS, visitorFor } from '../../src/games/sa-sapatos-nila/sim';
import m09 from '../../src/modules/m09';
import SaSapatosNila from '../../src/modules/m09/SaSapatosNila';
import { hasContent, loadContent } from '../../src/modules/registry';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('Module 9 content', () => {
  it('has the hook, seven cards in SPEC order, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm09');
    expect(1 + m09.cards.length).toBe(info?.cards);
    expect(m09.cards.map((c) => c.type)).toEqual(['info', 'reveal', 'choice', 'swipe-sort', 'choice', 'info', 'poll']);
    expect(m09.hook.speaker).toBe('Lola Nena');
    expect(m09.hook.line).toMatch(/kiosk/);
    expect(m09.game.slug).toBe('sa-sapatos-nila');
    expect(m09.game.name).toBe(info?.game);
    const ids = [m09.hook.id, ...m09.cards.map((c) => c.id), m09.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m09.review_status).toBe('unreviewed');
  });

  it('keeps info cards short, and every choice option explains itself', () => {
    for (const c of m09.cards) {
      if (c.type === 'info') expect(words(c.body), c.id).toBeLessThanOrEqual(60);
      if (c.type === 'choice') {
        expect(c.options.length).toBeGreaterThanOrEqual(2);
        expect(c.options.length).toBeLessThanOrEqual(4);
        for (const o of c.options) expect(o.feedback.length).toBeGreaterThan(20);
      }
    }
  });

  it('reveals the five groups left out, with a fix for each', () => {
    const c = m09.cards[1];
    if (c?.type !== 'reveal') throw new Error('card 2 should be a reveal');
    expect(c.tiles.map((t) => t.label)).toEqual(['Lola Nena', 'Jun, a Deaf teen', 'Mang Ben', 'Kuya Rey', 'Aling Pacita']);
    expect(c.tiles.map((t) => t.detail).join(' ')).toMatch(/Ilocano/);
    expect(c.tiles.map((t) => t.detail).join(' ')).toMatch(/wheelchair/);
    expect(c.tiles.map((t) => t.detail).join(' ')).toMatch(/smartphone/);
    for (const t of c.tiles) expect(t.detail, t.label).toMatch(/would help/);
  });

  it('teaches that one-accent training data makes unfair AI, and that the human option stays', () => {
    const voice = m09.cards[2];
    const staff = m09.cards[4];
    if (voice?.type !== 'choice' || staff?.type !== 'choice') throw new Error('cards 3 and 5 should be choices');
    expect(voice.question).toMatch(/one accent/);
    expect(voice.options[voice.correct]?.feedback).toMatch(/bias from data/);
    expect(staff.options[staff.correct]?.text).toMatch(/person at the counter/);
    expect(staff.options[staff.correct]?.feedback).toMatch(/human option/);
  });

  it('sorts the fixes that help from "faster animations" and other things that do not', () => {
    const sort = m09.cards[3];
    if (sort?.type !== 'swipe-sort') throw new Error('card 4 should be the sort');
    const helps = sort.items.filter((i) => i.bin === 'helps').map((i) => i.text);
    expect(helps).toEqual(expect.arrayContaining(['Large text', 'Captions for every sound', 'More languages to choose from', 'An assisted counter with a real person']));
    expect(sort.items.find((i) => i.text === 'Faster animations')?.bin).toBe('not');
    expect(sort.items.every((i) => i.why.length > 10)).toBe(true);
  });

  it('ends with the three-bullet takeaway and loads through the registry', async () => {
    expect(m09.takeaway.bullets).toHaveLength(3);
    expect(m09.takeaway.bullets.join(' ')).toMatch(/work for everyone you love/);
    expect(m09.takeaway.bullets.join(' ')).toMatch(/human option/);
    expect(m09.takeaway.bullets.join(' ')).toMatch(/feedback/);
    expect(hasContent('m09')).toBe(true);
    expect((await loadContent('m09'))?.id).toBe('m09');
    expect((await m09.game.load()).default).toBeTypeOf('function');
  });
});

describe('the kiosk simulation', () => {
  afterEach(cleanup);

  it('draws the filter only on the kiosk text, and keeps every real word for screen readers', () => {
    const ben = personaById('mang-ben');
    const view = render(<Kiosk persona={ben} installed={[]} step={1} onPress={() => {}} />);
    const button = screen.getByRole('button', { name: SCREENS[1]?.button as string });
    // the look-alike text is hidden from assistive tech; the real label is the accessible name
    expect(button.querySelector('[aria-hidden="true"]')?.textContent).not.toBe(SCREENS[1]?.button);
    expect(button.querySelector('.sr-only')?.textContent).toBe(SCREENS[1]?.button);
    expect(view.container.querySelectorAll('.kiosk__fx').length).toBeGreaterThan(0);
    expect(view.container.querySelectorAll('.kiosk__fx')).toHaveLength(view.container.querySelectorAll('.kiosk .kiosk__fx').length);
    expect(screen.getByRole('heading', { level: 4, name: SCREENS[1]?.title })).toBeTruthy();
  });

  it('blurs for low vision, softens the blur with large text, and never hides the button from the keyboard', () => {
    const lola = personaById('lola-nena');
    const view = render(<Kiosk persona={lola} installed={[]} step={1} onPress={() => {}} />);
    expect(view.container.querySelector('.kiosk')?.classList.contains('kiosk--blur')).toBe(true);
    expect(screen.getByRole('button', { name: SCREENS[1]?.button as string }).getAttribute('aria-hidden')).toBeNull();
    view.rerender(<Kiosk persona={lola} installed={['large-text']} step={1} onPress={() => {}} />);
    const kiosk = view.container.querySelector('.kiosk');
    expect(kiosk?.classList.contains('kiosk--large')).toBe(true);
    expect(kiosk?.classList.contains('kiosk--blur')).toBe(false);
  });

  it('shows missing captions for a Deaf visitor, then the number on screen once captions are on', () => {
    const jun = personaById('jun');
    const view = render(<Kiosk persona={jun} installed={[]} step={2} onPress={() => {}} />);
    expect(screen.getByText(/Sound only: nothing to read, no captions/)).toBeTruthy();
    expect(screen.queryByText(/Your queue number is 12/)).toBeNull();
    view.rerender(<Kiosk persona={jun} installed={['captions']} step={2} onPress={() => {}} />);
    expect(screen.getByText(/Your queue number is 12/)).toBeTruthy();
    expect(screen.getByText(/Captions:/)).toBeTruthy();
  });

  it('puts the button above the reach line for a wheelchair user until the screen is lowered', () => {
    const rey = personaById('kuya-rey');
    const view = render(<Kiosk persona={rey} installed={[]} step={0} onPress={() => {}} />);
    expect(view.container.querySelector('.kiosk__zone--high button')).toBeTruthy();
    expect(view.container.querySelector('.kiosk__reach')).toBeTruthy();
    view.rerender(<Kiosk persona={rey} installed={['lower']} step={0} onPress={() => {}} />);
    expect(view.container.querySelector('.kiosk__zone--high button')).toBeNull();
    expect(view.container.querySelector('.kiosk__zone--low button')).toBeTruthy();
  });

  it('shows the assisted counter button only once it is installed', () => {
    const p = personaById('aling-pacita');
    const onCounter = vi.fn();
    const view = render(<Kiosk persona={p} installed={[]} step={0} onPress={() => {}} />);
    expect(screen.queryByRole('button', { name: /assisted counter/i })).toBeNull();
    view.rerender(<Kiosk persona={p} installed={['counter']} step={0} onPress={() => {}} onCounter={onCounter} />);
    fireEvent.click(screen.getByRole('button', { name: /assisted counter/i }));
    expect(onCounter).toHaveBeenCalledOnce();
  });
});

const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const kioskButton = () => document.querySelector<HTMLButtonElement>('[data-kiosk-press]') as HTMLButtonElement;

describe('Sa Sapatos Nila module game', () => {
  let stopRouter: () => void;
  beforeEach(() => {
    resetAll();
    window.location.hash = '#/learn/m09?seed=unit';
    stopRouter = startRouter();
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
    resetAll();
  });

  it('shows the intro with a How it works list that says the filters never touch the game controls', () => {
    render(<SaSapatosNila moduleId="m09" onComplete={() => {}} />);
    expect(screen.getByRole('heading', { name: 'Sa Sapatos Nila' })).toBeTruthy();
    expect(screen.getByText(/Five visitors will come/)).toBeTruthy();
    fireEvent.click(screen.getByText('How it works'));
    expect(screen.getByText(/The game buttons stay clear and easy to use/)).toBeTruthy();
  });

  it('starts with Lola Nena, her task and what she sees written out', () => {
    render(<SaSapatosNila moduleId="m09" onComplete={() => {}} />);
    press('Open the kiosk');
    expect(screen.getByRole('heading', { name: 'Lola Nena comes to the health center' })).toBeTruthy();
    expect(screen.getByText('Fix points now: 2')).toBeTruthy();
    expect(screen.getByRole('img', { name: /Lola Nena, 72/ })).toBeTruthy();
    press('Try the kiosk as Lola Nena');
    expect(screen.getByText(/Everything on the screen is a blur/)).toBeTruthy();
    expect(screen.getByRole('group', { name: /kiosk \(simulation\)/ })).toBeTruthy();
  });

  it('gets Lola stuck on screen two, takes a fix, and serves her with three stars and a lesson', () => {
    render(<SaSapatosNila moduleId="m09" onComplete={() => {}} />);
    press('Open the kiosk');
    press('Try the kiosk as Lola Nena');
    fireEvent.click(kioskButton()); // screen 1 is fine
    fireEvent.click(kioskButton()); // screen 2: blur
    expect(screen.getByRole('heading', { name: 'Lola Nena is stuck' })).toBeTruthy();
    expect(screen.getByText(/squints at the blur/)).toBeTruthy();
    expect(screen.getByText('Stuck 1 of 3 times. At 3, they leave.')).toBeTruthy();
    // a fix she cannot use does nothing, a fix she needs costs points
    const captions = screen.getByRole('button', { name: /^Captions/ });
    expect(captions.getAttribute('aria-disabled')).toBe('false');
    const large = screen.getByRole('button', { name: /^Large text/ });
    expect(within(large).getByText(/would help Lola Nena/)).toBeTruthy();
    fireEvent.click(large);
    expect(screen.getByText('Fix points 1 / 5')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: /^Large text/ })).getByText('Installed')).toBeTruthy();
    expect(screen.getByText('This is no longer a barrier for Lola Nena.')).toBeTruthy();
    // too dear: voice costs 2 and only 1 is left
    expect(screen.getByRole('button', { name: /^Voice guide/ }).getAttribute('aria-disabled')).toBe('true');
    press('Try the kiosk again');
    fireEvent.click(kioskButton());
    expect(screen.getByRole('heading', { name: 'Lola Nena is served!' })).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 of 3 satisfaction stars' })).toBeTruthy();
    expect(screen.getByText('Served at the kiosk: +150')).toBeTruthy();
    expect(screen.queryByText(/Ready in advance/)).toBeNull();
    expect(screen.getByText(/Large text or a voice guide lets people with low vision/)).toBeTruthy();
    expect(screen.getByText('Score 150')).toBeTruthy();
  });

  it('keeps a fix installed, so the next visitor can be ready in advance', () => {
    render(<SaSapatosNila moduleId="m09" onComplete={() => {}} />);
    press('Open the kiosk');
    press('Try the kiosk as Lola Nena');
    fireEvent.click(kioskButton());
    fireEvent.click(kioskButton());
    fireEvent.click(screen.getByRole('button', { name: /^Large text/ }));
    press('Try the kiosk again');
    fireEvent.click(kioskButton());
    press('Next visitor');
    const second = visitorFor('unit', 2, 'module');
    expect(screen.getByRole('heading', { name: `${second.name} comes to the health center` })).toBeTruthy();
    expect(screen.getByText('Fix points now: 3')).toBeTruthy();
    expect(screen.getByText(/Large text · helped 1/)).toBeTruthy();
  });

  it('lets a visitor leave without a fix, and still finishes after three leave with one star', () => {
    const onComplete = vi.fn();
    render(<SaSapatosNila moduleId="m09" onComplete={onComplete} />);
    press('Open the kiosk');
    for (let n = 1; n <= 3; n++) {
      const name = visitorFor('unit', n, 'module').name;
      press(`Try the kiosk as ${name}`);
      for (let guard = 0; guard < 6 && !screen.queryByRole('button', { name: /^Let .* leave$/ }); guard++) fireEvent.click(kioskButton());
      press(`Let ${name} leave`);
      expect(screen.getByRole('heading', { name: `${name} left without help` })).toBeTruthy();
      expect(screen.getByText('Left without help ' + n + ' / 3')).toBeTruthy();
      press(n < 3 ? 'Next visitor' : 'See the result');
    }
    expect(screen.getByRole('heading', { name: 'The health center closes for today' })).toBeTruthy();
    expect(screen.getByText('People who left: 3')).toBeTruthy();
    press('Finish game');
    expect(onComplete).toHaveBeenCalledWith(1);
  });

  it('serves all five visitors with the right fixes and finishes with three stars', () => {
    const onComplete = vi.fn();
    render(<SaSapatosNila moduleId="m09" onComplete={onComplete} />);
    press('Open the kiosk');
    const fixFor: Record<string, RegExp> = {
      'lola-nena': /^Large text/,
      jun: /^Captions/,
      'mang-ben': /^Language: Ilocano/,
      'kuya-rey': /^Lower screen/,
      'aling-pacita': /^Assisted counter/,
    };
    for (let n = 1; n <= MODULE_VISITS; n++) {
      const p = visitorFor('unit', n, 'module');
      press(`Try the kiosk as ${p.name}`);
      let guard = 0;
      while (!screen.queryByRole('heading', { name: `${p.name} is served!` }) && guard++ < 8) {
        if (screen.queryByRole('heading', { name: `${p.name} is stuck` })) {
          const fix = screen.getByRole('button', { name: fixFor[p.id] as RegExp });
          fireEvent.click(fix);
          if (p.id === 'aling-pacita') {
            press('Go to the assisted counter');
            continue;
          }
        }
        fireEvent.click(kioskButton());
      }
      expect(screen.getByRole('heading', { name: `${p.name} is served!` }), p.id).toBeTruthy();
      press(n < MODULE_VISITS ? 'Next visitor' : 'See the result');
    }
    expect(screen.getByRole('heading', { name: 'Five visitors done!' })).toBeTruthy();
    expect(screen.getByText('People served: 5')).toBeTruthy();
    expect(screen.getByText(/Bukas sa Lahat/)).toBeTruthy();
    press('Finish game');
    expect(onComplete).toHaveBeenCalledWith(3);
  });
});

describe('Sa Sapatos Nila in the Arcade', () => {
  beforeEach(() => resetAll());
  afterEach(() => {
    cleanup();
    resetAll();
  });

  it('is endless: no visitor limit, a Finish run button, and the visitor counter in the HUD', () => {
    render(<SapatosArcade seed="arc" />);
    expect(screen.getByText(/Visitors keep coming/)).toBeTruthy();
    press('Open the kiosk');
    expect(document.querySelector('.sapatos-hud')?.textContent).toMatch(/Visitor 1/);
    expect(screen.getByText('Score 0')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Finish run' })).toBeTruthy();
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('ends the run by hand, saves it and plays again from the intro', () => {
    render(<SapatosArcade seed="arc" />);
    press('Open the kiosk');
    press('Try the kiosk as Lola Nena');
    fireEvent.click(kioskButton());
    fireEvent.click(kioskButton());
    fireEvent.click(screen.getByRole('button', { name: /^Large text/ }));
    press('Try the kiosk again');
    fireEvent.click(kioskButton());
    press('Next visitor');
    press('Finish run');
    expect(screen.getByRole('heading', { name: 'Run finished' })).toBeTruthy();
    expect(screen.getByText('People served: 1')).toBeTruthy();
    expect(screen.getByText('Points: 150')).toBeTruthy();
    expect(bestScores.value['sa-sapatos-nila']).toBe(150);
    press('Play again');
    expect(screen.getByRole('heading', { name: 'Sa Sapatos Nila' })).toBeTruthy();
  });
});
