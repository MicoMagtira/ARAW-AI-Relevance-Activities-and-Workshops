// Module 7 (T22): the lesson content, the "Gawa Ko 'To!" module game, and the Arcade version (timer, hearts, saved run).
import { act, cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startRouter } from '../../src/app/router';
import { bestScores } from '../../src/app/scores';
import { resetAll } from '../../src/app/store';
import { MODULES } from '../../src/content/modules';
import GawaArcade from '../../src/games/gawa-ko-to/GawaArcade';
import { topicById } from '../../src/games/gawa-ko-to/parts';
import { EMPTY_POSTER, buildBrief, buildModuleBriefs, evaluate, type Brief } from '../../src/games/gawa-ko-to/rules';
import m07 from '../../src/modules/m07';
import GawaKoTo from '../../src/modules/m07/GawaKoTo';
import { hasContent, loadContent } from '../../src/modules/registry';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('Module 7 content', () => {
  it('has the hook, seven cards in SPEC order, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm07');
    expect(1 + m07.cards.length).toBe(info?.cards);
    expect(m07.cards.map((c) => c.type)).toEqual(['info', 'choice', 'choice', 'reveal', 'reveal', 'swipe-sort', 'poll']);
    expect(m07.hook.speaker).toBe('Bea');
    expect(m07.game.slug).toBe('gawa-ko-to');
    expect(m07.game.name).toBe(info?.game);
    const ids = [m07.hook.id, ...m07.cards.map((c) => c.id), m07.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m07.review_status).toBe('unreviewed');
  });

  it('keeps info cards short, and every choice option explains itself', () => {
    for (const c of m07.cards) {
      if (c.type === 'info') expect(words(c.body), c.id).toBeLessThanOrEqual(75);
      if (c.type === 'choice') {
        expect(c.options.length).toBeGreaterThanOrEqual(2);
        expect(c.options.length).toBeLessThanOrEqual(4);
        for (const o of c.options) expect(o.feedback.length).toBeGreaterThan(20);
      }
    }
  });

  it('answers as SPEC says: label the AI picture, ask the neighbour first', () => {
    const [label, consent] = [m07.cards[1], m07.cards[2]];
    if (label?.type !== 'choice' || consent?.type !== 'choice') throw new Error('cards 2 and 3 should be choices');
    expect(label.question).toMatch(/Made with AI/);
    expect(label.options[label.correct]?.text).toMatch(/^Yes/);
    expect(consent.question).toMatch(/neighbour/);
    expect(consent.options[consent.correct]?.text).toMatch(/^No\. Ask him first/);
  });

  it('reveals where AI art comes from and why fake doctor ads harm', () => {
    const [art, doctor] = [m07.cards[3], m07.cards[4]];
    if (art?.type !== 'reveal' || doctor?.type !== 'reveal') throw new Error('cards 4 and 5 should be reveals');
    expect(art.tiles.map((t) => t.label)).toContain('Credit people');
    expect(doctor.tiles.map((t) => t.label)).toEqual(['People trust the face', 'They buy unproven products', 'They may skip real care', 'What to do']);
  });

  it('sorts honest from not-okay practices, with the DOH facts honest and AI-made facts not', () => {
    const sort = m07.cards[5];
    if (sort?.type !== 'swipe-sort') throw new Error('card 6 should be the sort');
    expect(sort.bins.map((b) => b.id)).toEqual(['ok', 'no']);
    const bin = (needle: RegExp) => sort.items.find((i) => needle.test(i.text))?.bin;
    expect(bin(/DOH page/)).toBe('ok');
    expect(bin(/make up the health facts/)).toBe('no');
    expect(bin(/real doctor/)).toBe('no');
    expect(bin(/after they said yes/)).toBe('ok');
    expect(sort.items.length).toBeGreaterThanOrEqual(4);
    expect(sort.items.length).toBeLessThanOrEqual(8);
  });

  it('ends with the three-bullet takeaway and loads through the registry', async () => {
    expect(m07.takeaway.bullets).toHaveLength(3);
    expect(m07.takeaway.bullets.join(' ')).toMatch(/labelled/);
    expect(m07.takeaway.bullets.join(' ')).toMatch(/trusted sources/);
    expect(hasContent('m07')).toBe(true);
    expect((await loadContent('m07'))?.id).toBe('m07');
    expect((await m07.game.load()).default).toBeTypeOf('function');
  });
});

const pickRadio = (name: string | RegExp) => fireEvent.click(screen.getByRole('radio', { name }));
const press = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** Make the honest poster for a brief: right picture, right slogan, a true fact, and every step it needs. */
function playHonest(b: Brief, beforePublish?: () => void) {
  const topic = topicById(b.topic);
  const req = b.requirements;
  const wantAiSlogan = req.includes('ai-slogan');
  pickRadio(req.includes('neighbor') ? /Mang Rey/ : req.includes('artist') ? /Ate Dani/ : /^AI-generated picture$/);
  pickRadio((topic.slogans.find((s) => s.ai === wantAiSlogan)?.text ?? ''));
  pickRadio((topic.facts.find((f) => f.ok)?.text ?? ''));
  if (req.includes('ai-picture') || wantAiSlogan) press(/Made with AI/);
  if (req.includes('artist')) press(/^Credit Ate Dani/);
  if (req.includes('neighbor')) press(/^Ask permission/);
  beforePublish?.();
  press(/^Publish poster/);
}

describe("Gawa Ko 'To! module game", () => {
  let stopRouter: () => void;
  beforeEach(() => {
    resetAll();
    window.location.hash = '#/learn/m07?seed=unit';
    stopRouter = startRouter();
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
    resetAll();
  });

  const briefs = (): Brief[] => buildModuleBriefs('unit');
  const start = () => press(/^Start making posters/);

  it('shows the intro with a How it works list', () => {
    render(<GawaKoTo moduleId="m07" onComplete={() => {}} />);
    expect(screen.getByRole('heading', { name: "Gawa Ko 'To!" })).toBeTruthy();
    expect(screen.getByText(/You will make three, one at a time/)).toBeTruthy();
    expect(screen.getByText(/Anything an AI made gets the "Made with AI" label/)).toBeTruthy();
  });

  it('shows the first brief with its requirement, an empty SVG poster and Publish disabled until all three parts are picked', () => {
    render(<GawaKoTo moduleId="m07" onComplete={() => {}} />);
    start();
    const [first] = briefs() as [Brief];
    const topic = topicById(first.topic);
    expect(screen.getByText(`Make ${topic.ask} for Barangay Masagana.`)).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Posters done' }).getAttribute('aria-valuetext')).toBe('Poster 1 of 3');
    expect(screen.getAllByRole('img').some((i) => i.tagName.toLowerCase() === 'svg' && /No picture yet/.test(i.textContent ?? ''))).toBe(true);
    const publish = screen.getByRole('button', { name: /^Publish poster/ }) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
    pickRadio(/Stock photo/);
    pickRadio(topic.slogans[0]?.text ?? '');
    expect(publish.disabled).toBe(true);
    pickRadio(topic.facts[0]?.text ?? '');
    expect(publish.disabled).toBe(false);
    expect(screen.getByRole('radio', { name: /Stock photo/ }).hasAttribute('checked') || (screen.getByRole('radio', { name: /Stock photo/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('lets only a real person be asked, and shows what they answer', () => {
    render(<GawaKoTo moduleId="m07" onComplete={() => {}} />);
    start();
    const ask = screen.getByRole('button', { name: /^Ask permission/ }) as HTMLButtonElement;
    expect(ask.disabled).toBe(true);
    expect(screen.getByText(/Asking permission needs a real person in the picture/)).toBeTruthy();
    pickRadio(/Mang Rey/);
    expect(ask.disabled).toBe(false);
    press(/^Ask permission/);
    expect(screen.getByText(/Sure, for the health drive!/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /^Permission asked/ }) as HTMLButtonElement).disabled).toBe(true);
    pickRadio(/AI picture of Dr\. Lim/);
    press(/^Ask permission/);
    expect(screen.getByText(/I never made that picture/)).toBeTruthy();
  });

  it('toggles the label and the credit with aria-pressed', () => {
    render(<GawaKoTo moduleId="m07" onComplete={() => {}} />);
    start();
    const label = screen.getByRole('button', { name: /Made with AI/ });
    expect(label.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(label);
    expect(label.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('img').some((i) => /Sticker: Made with AI/.test(i.textContent ?? ''))).toBe(true);
    fireEvent.click(label);
    expect(label.getAttribute('aria-pressed')).toBe('false');
  });

  it('publishes three honest posters: three stars, and onComplete gets 3', () => {
    let stars = 0;
    render(<GawaKoTo moduleId="m07" onComplete={(n) => (stars = n)} />);
    start();
    for (const [i, b] of briefs().entries()) {
      playHonest(b);
      expect(screen.getByRole('heading', { name: 'Published!' })).toBeTruthy();
      expect(screen.getByText('Points for this poster:', { exact: false })).toBeTruthy();
      press(i === 2 ? /^See the result/ : /^Next brief/);
    }
    expect(screen.getByRole('heading', { name: 'All three posters are done!' })).toBeTruthy();
    expect(screen.getByText('Honest posters: 3 of 3.')).toBeTruthy();
    expect(screen.getByText(/Honest Maker/)).toBeTruthy();
    press(/^Finish game/);
    expect(stars).toBe(3);
  });

  it('reports an AI picture with no label: the checklist says what was missed and the poster is stamped', () => {
    render(<GawaKoTo moduleId="m07" onComplete={() => {}} />);
    start();
    const topic = topicById((briefs()[0] as Brief).topic);
    pickRadio(/^AI-generated picture$/);
    pickRadio(topic.slogans[0]?.text ?? '');
    pickRadio(topic.facts.find((f) => f.ok)?.text ?? '');
    press(/^Publish poster/);
    expect(screen.getByRole('heading', { name: 'Reported!' })).toBeTruthy();
    expect(screen.getByText(/nobody said it was AI-made/)).toBeTruthy();
    expect(screen.getAllByText('Missed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('img').some((i) => /Stamp: Reported!/.test(i.textContent ?? ''))).toBe(true);
  });

  it('stamps a wrong health fact ARAW GAME FAKE and explains why it is wrong', () => {
    render(<GawaKoTo moduleId="m07" onComplete={() => {}} />);
    start();
    const topic = topicById((briefs()[0] as Brief).topic);
    const wrong = topic.facts.find((f) => !f.ok);
    pickRadio(/Stock photo/);
    pickRadio(topic.slogans[0]?.text ?? '');
    pickRadio(wrong?.text ?? '');
    press(/^Publish poster/);
    expect(screen.getByText(wrong?.why ?? '', { exact: false })).toBeTruthy();
    expect(screen.getAllByRole('img').some((i) => /Stamp: ARAW GAME FAKE/.test(i.textContent ?? ''))).toBe(true);
  });

  it('still finishes when every poster is reported: one star, no fail state', () => {
    let stars = 0;
    render(<GawaKoTo moduleId="m07" onComplete={(n) => (stars = n)} />);
    start();
    for (const [i, b] of briefs().entries()) {
      const topic = topicById(b.topic);
      pickRadio(/^AI picture of Dr\. Lim/);
      pickRadio(topic.slogans[0]?.text ?? '');
      pickRadio(topic.facts.find((f) => !f.ok)?.text ?? '');
      press(/^Publish poster/);
      expect(screen.getByRole('heading', { name: 'Reported!' })).toBeTruthy();
      press(i === 2 ? /^See the result/ : /^Next brief/);
    }
    expect(screen.getByText('Honest posters: 0 of 3.')).toBeTruthy();
    expect(screen.getByText(/A good start/)).toBeTruthy();
    press(/^Finish game/);
    expect(stars).toBe(1);
  });
});

describe("Gawa Ko 'To! in the Arcade", () => {
  beforeEach(() => {
    resetAll();
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    resetAll();
  });

  const tick = (s: number) => act(() => void vi.advanceTimersByTime(s * 1000));

  it('shows the timer, hearts and score, and the Pause button stops the clock', () => {
    render(<GawaArcade seed="arc" />);
    press(/^Start making posters/);
    expect(screen.getByRole('timer').textContent).toBe('90s left');
    expect(screen.getByRole('img', { name: '3 of 3 hearts left' })).toBeTruthy();
    tick(10);
    expect(screen.getByRole('timer').textContent).toBe('80s left');
    press(/^Pause clock/);
    tick(60);
    expect(screen.getByRole('timer').textContent).toBe('80s left');
    press(/^Resume clock/);
    tick(5);
    expect(screen.getByRole('timer').textContent).toBe('75s left');
  });

  it('publishes an honest poster with a speed bonus and carries on to the next brief', () => {
    render(<GawaArcade seed="arc" />);
    press(/^Start making posters/);
    const first = buildBrief('arc', 1);
    expect(first.requirements).toEqual(['ai-picture']);
    playHonest(first, () => tick(10));
    expect(screen.getByRole('heading', { name: 'Published!' })).toBeTruthy();
    const poster = { ...EMPTY_POSTER, picture: 'ai' as const, label: true };
    const expected = evaluate({ ...poster, slogan: topicById(first.topic).slogans.find((x) => !x.ai)?.id ?? null, fact: topicById(first.topic).facts.find((f) => f.ok)?.id ?? null }, first, 80).points;
    expect(screen.getByText(`Points for this poster: ${expected}`)).toBeTruthy();
    press(/^Next brief/);
    expect(screen.getByText('Poster 2')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toBe('85s left');
    expect(screen.getByText('Score ' + expected.toLocaleString('en-US'))).toBeTruthy();
  });

  it('sends a poster out as it is when time runs out, loses a heart, and ends after three', () => {
    render(<GawaArcade seed="arc" />);
    press(/^Start making posters/);
    for (let i = 0; i < 3; i++) {
      tick(100);
      expect(screen.getByRole('heading', { name: 'Reported!' })).toBeTruthy();
      expect(screen.getByText('Time ran out, so the poster went out as it was.')).toBeTruthy();
      expect(screen.getByRole('img', { name: `${2 - i} of 3 hearts left` })).toBeTruthy();
      press(i === 2 ? /^See the result/ : /^Next brief/);
    }
    expect(screen.getByRole('heading', { name: 'Game over' })).toBeTruthy();
    expect(screen.getByText('Honest posters: 0 of 3.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play again' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to Arcade' })).toBeTruthy();
    expect(bestScores.value['gawa-ko-to'] ?? 0).toBe(0);
  });

  it('saves a best score and plays again from the start', () => {
    render(<GawaArcade seed="arc" />);
    press(/^Start making posters/);
    for (let i = 0; i < 3; i++) {
      tick(100);
      press(i === 2 ? /^See the result/ : /^Next brief/);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    expect(screen.getByRole('heading', { name: "Gawa Ko 'To!" })).toBeTruthy();
    press(/^Start making posters/);
    expect(screen.getByText('Poster 1')).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 of 3 hearts left' })).toBeTruthy();
  });
});
