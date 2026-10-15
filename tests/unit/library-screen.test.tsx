import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { DEFAULT_SETTINGS, initSettings, settings } from '../../src/app/settings';
import { komiksRead, modulesDone } from '../../src/app/progress';
import { location$, parseHash } from '../../src/app/router';
import { KOMIKS, KOMIKS_SEASON_TITLE } from '../../src/content/library/komiks';
import { GLOSSARY } from '../../src/content/library/glossary';
import { MYTHS } from '../../src/content/library/myths';
import { LibraryScreen } from '../../src/screens/library/LibraryScreen';

let stop: () => void = () => {};

function open(hash: string) {
  location$.value = parseHash(hash);
}

beforeEach(() => {
  window.localStorage.clear();
  settings.value = DEFAULT_SETTINGS;
  modulesDone.value = [];
  komiksRead.value = [];
  stop = initSettings();
  open('#/library/myths');
});

afterEach(() => {
  stop();
  cleanup();
});

describe('Library tabs', () => {
  it('shows three tabs and marks the open one', () => {
    open('#/library/glossary');
    render(<LibraryScreen />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Myths', 'Diksyunaryo', 'Komiks']);
    expect(screen.getByRole('tab', { name: 'Diksyunaryo' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel', { name: 'Diksyunaryo' })).toBeTruthy();
  });

  it('opens Myths for an unknown tab', () => {
    open('#/library/whatever');
    render(<LibraryScreen />);
    expect(screen.getByRole('heading', { name: 'Kwentong Kalusugan' })).toBeTruthy();
  });
});

describe('Myths', () => {
  it('lists every myth and flips a card to the fact, why, check, trick and module', () => {
    render(<LibraryScreen />);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(MYTHS.length);
    const first = MYTHS[0]!;
    const card = document.getElementById(`myth-${first.id}`) as HTMLElement;
    const toggle = within(card).getByRole('button');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(within(card).queryByText(first.fact)).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(within(card).getByText(first.fact)).toBeTruthy();
    expect(within(card).getByText(first.why)).toBeTruthy();
    expect(within(card).getByText(first.check)).toBeTruthy();
    expect(within(card).getByText(/^Trick: /)).toBeTruthy();
    expect(within(card).getByRole('link', { name: /^Related: Module/ }).getAttribute('href')).toBe('#/learn');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('searches, filters by topic and trick, and clears', () => {
    render(<LibraryScreen />);
    const search = screen.getByLabelText('Search myths');
    fireEvent.input(search, { target: { value: 'tawa-tawa' } });
    expect(screen.getByRole('status').textContent).toMatch(/^\d+ myths?$/);
    expect(document.getElementById('myth-tawa-tawa-dengue')).toBeTruthy();
    expect(document.querySelectorAll('.myth-flip').length).toBeLessThan(MYTHS.length);

    fireEvent.input(search, { target: { value: 'zzzzqqq' } });
    expect(screen.getByText(/No myth matches that/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('0 myths');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(document.querySelectorAll('.myth-flip')).toHaveLength(MYTHS.length);

    const topics = screen.getByRole('group', { name: 'Topic' });
    fireEvent.click(within(topics).getByRole('button', { name: 'Dengue' }));
    expect(within(topics).getByRole('button', { name: 'Dengue' }).getAttribute('aria-pressed')).toBe('true');
    const dengue = MYTHS.filter((m) => m.topic === 'dengue').length;
    expect(document.querySelectorAll('.myth-flip')).toHaveLength(dengue);

    const tricks = screen.getByRole('group', { name: 'Trick' });
    fireEvent.click(within(tricks).getByRole('button', { name: 'Miracle Mike' }));
    const both = MYTHS.filter((m) => m.topic === 'dengue' && m.villain === 'miracle_mike').length;
    expect(document.querySelectorAll('.myth-flip')).toHaveLength(both);

    fireEvent.click(within(topics).getByRole('button', { name: 'All topics' }));
    fireEvent.click(within(tricks).getByRole('button', { name: 'All tricks' }));
    expect(document.querySelectorAll('.myth-flip')).toHaveLength(MYTHS.length);
  });

  it('opens the linked myth from Myth of the day already flipped', () => {
    const id = MYTHS[3]!.id;
    open(`#/library/myths?myth=${id}`);
    render(<LibraryScreen />);
    const card = document.getElementById(`myth-${id}`) as HTMLElement;
    expect(within(card).getByRole('button').getAttribute('aria-expanded')).toBe('true');
    expect(within(card).getByText(MYTHS[3]!.fact)).toBeTruthy();
  });

  it('ignores an unknown linked myth', () => {
    open('#/library/myths?myth=not-a-myth');
    render(<LibraryScreen />);
    expect(document.querySelectorAll('.myth-flip--back')).toHaveLength(0);
  });

  it('counts a single result in the singular', () => {
    render(<LibraryScreen />);
    fireEvent.input(screen.getByLabelText('Search myths'), { target: { value: MYTHS[0]!.myth } });
    expect(screen.getByRole('status').textContent).toBe('1 myth');
  });
});

describe('Diksyunaryo', () => {
  beforeEach(() => open('#/library/glossary'));

  it('shows every term alphabetically with its example and module link', () => {
    render(<LibraryScreen />);
    const terms = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent ?? '');
    expect(terms).toHaveLength(GLOSSARY.length);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
    expect(screen.getAllByText(/^Halimbawa: /).length).toBe(GLOSSARY.length);
    expect(screen.getAllByRole('link', { name: /^Seen in Module \d+: / }).length).toBe(GLOSSARY.length);
  });

  it('searches and disables letters without results', () => {
    render(<LibraryScreen />);
    fireEvent.input(screen.getByLabelText('Search a word'), { target: { value: 'deepfake' } });
    expect(screen.getByRole('heading', { level: 4, name: 'Deepfake' })).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Jump to D' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Jump to Q' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.input(screen.getByLabelText('Search a word'), { target: { value: 'zzzzqqq' } });
    expect(screen.getByText(/No word matches that/)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('0 words');
  });

  it('jumps to a letter group and focuses its heading', () => {
    render(<LibraryScreen />);
    const letter = (document.querySelector('.gl-letter') as HTMLElement).textContent as string;
    fireEvent.click(screen.getByRole('button', { name: `Jump to ${letter}` }));
    expect(document.activeElement?.id).toBe(`gl-${letter}`);
  });
});

describe('Komiks list', () => {
  beforeEach(() => open('#/library/komiks'));

  it('locks every episode until its module is done', () => {
    render(<LibraryScreen />);
    expect(screen.getByRole('heading', { level: 2, name: KOMIKS_SEASON_TITLE })).toBeTruthy();
    expect(screen.getByText('0 of 10 episodes unlocked')).toBeTruthy();
    expect(screen.getAllByText('Finish Module 1 to unlock').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.ep-card--locked')).toHaveLength(KOMIKS.length);
    expect(screen.queryAllByRole('link', { name: /Episode \d/ })).toHaveLength(0);
    expect(screen.getByText('Finish Module 1 to unlock the first episode.')).toBeTruthy();
  });

  it('opens an episode when its module is done and flags it New until read', () => {
    modulesDone.value = ['m01', 'm02'];
    render(<LibraryScreen />);
    expect(screen.getByText('2 of 10 episodes unlocked')).toBeTruthy();
    const links = document.querySelectorAll('a.ep-card');
    expect(links).toHaveLength(2);
    expect(links[0]?.getAttribute('href')).toBe('#/library/komiks/1');
    expect(within(links[0] as HTMLElement).getByText('New!')).toBeTruthy();
    expect(document.querySelectorAll('.ep-card--locked')).toHaveLength(8);
  });

  it('shows a locked notice for a locked episode reached by link', () => {
    open('#/library/komiks/4');
    render(<LibraryScreen />);
    expect(screen.getByRole('heading', { name: 'Episode 4 is locked' })).toBeTruthy();
    expect(screen.getByText(/Finish Module 4, Tricks of Health Misinformation, to unlock/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to Learn' }).getAttribute('href')).toBe('#/learn');
  });

  it('shows a friendly note for an episode that does not exist', () => {
    open('#/library/komiks/99');
    render(<LibraryScreen />);
    expect(screen.getByRole('heading', { name: 'We could not find that episode.' })).toBeTruthy();
    open('#/library/komiks/abc');
    cleanup();
    render(<LibraryScreen />);
    expect(screen.getByRole('heading', { name: 'We could not find that episode.' })).toBeTruthy();
  });
});

describe('Komiks reader', () => {
  const ep1 = KOMIKS[0]!;

  beforeEach(() => {
    modulesDone.value = ['m01'];
    open('#/library/komiks/1');
  });

  it('draws panel 1 as an image with alt text and real-text words', () => {
    render(<LibraryScreen />);
    expect(screen.getByRole('heading', { level: 2, name: ep1.title })).toBeTruthy();
    const art = screen.getByRole('img', { name: ep1.panels[0]!.alt });
    expect(art.tagName.toLowerCase()).toBe('svg');
    expect(document.querySelector('.kbubbles .kbubble__text')?.textContent).toBe(ep1.panels[0]!.bubbles[0]!.text);
    expect(screen.getByRole('status').textContent).toBe(`Panel 1 of ${ep1.panels.length}`);
  });

  it('stamps an on-screen fake with ARAW GAME · FAKE', () => {
    render(<LibraryScreen />);
    const screenCard = screen.getByRole('group', { name: 'On the screen' });
    expect(within(screenCard).getByText(ep1.panels[0]!.screen!.author)).toBeTruthy();
    expect(within(screenCard).getByText('ARAW GAME · FAKE')).toBeTruthy();
  });

  it('turns panels with Back and Next, the step buttons and the arrow keys', () => {
    render(<LibraryScreen />);
    const next = screen.getByRole('button', { name: /Next/ });
    const back = screen.getByRole('button', { name: /Back/ });
    expect(back.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(next);
    expect(screen.getByRole('status').textContent).toBe(`Panel 2 of ${ep1.panels.length}`);
    expect(screen.getByRole('img', { name: ep1.panels[1]!.alt })).toBeTruthy();
    fireEvent.click(back);
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 1 /);

    fireEvent.click(screen.getByRole('button', { name: 'Go to panel 3' }));
    expect(screen.getByRole('button', { name: 'Go to panel 3' }).getAttribute('aria-current')).toBe('step');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 4 /);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 2 /);
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true });
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 2 /);
  });

  it('leaves the arrow keys to the tab strip', () => {
    render(<LibraryScreen />);
    const tab = screen.getByRole('tab', { name: 'Komiks' });
    fireEvent.keyDown(tab, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 1 /);
  });

  it('turns panels with a swipe on touch, but not with a mouse drag', () => {
    render(<LibraryScreen />);
    const stage = document.querySelector('.reader__stage') as HTMLElement;
    const swipe = (pointerType: string, from: number, to: number) => {
      fireEvent.pointerDown(stage, { pointerType, clientX: from, clientY: 100 });
      fireEvent.pointerUp(stage, { pointerType, clientX: to, clientY: 104 });
    };
    swipe('mouse', 300, 100);
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 1 /);
    swipe('touch', 300, 100);
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 2 /);
    swipe('touch', 100, 300);
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 1 /);
    swipe('touch', 100, 120);
    expect(screen.getByRole('status').textContent).toMatch(/^Panel 1 /);
  });

  it('marks the episode read at the last panel and offers the next one when it is unlocked', () => {
    modulesDone.value = ['m01', 'm02'];
    render(<LibraryScreen />);
    expect(komiksRead.value).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: `Go to panel ${ep1.panels.length}` }));
    expect(komiksRead.value).toEqual([ep1.id]);
    expect(screen.getByText('The end of Episode 1')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Next episode: / }).getAttribute('href')).toBe('#/library/komiks/2');
    // Next is a no-op on the last panel
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByRole('status').textContent).toBe(`Panel ${ep1.panels.length} of ${ep1.panels.length}`);
  });

  it('says when the next episode is still locked', () => {
    render(<LibraryScreen />);
    fireEvent.click(screen.getByRole('button', { name: `Go to panel ${ep1.panels.length}` }));
    expect(screen.getByText('The next episode unlocks when you finish Module 2.')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Next episode/ })).toBeNull();
  });

  it('writes the whole episode out as a transcript', () => {
    render(<LibraryScreen />);
    const transcript = document.querySelector('.reader__transcript') as HTMLElement;
    expect(within(transcript).getByText('Read the whole episode as text')).toBeTruthy();
    for (const p of ep1.panels) {
      expect(within(transcript).getByText(p.alt)).toBeTruthy();
      for (const b of p.bubbles) expect(transcript.textContent).toContain(b.text);
    }
    expect(transcript.textContent).toContain('[ARAW GAME · FAKE]');
  });

  it('marks think bubbles differently from speech', () => {
    open('#/library/komiks/1');
    render(<LibraryScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Go to panel 2' }));
    expect(document.querySelectorAll('.kbubble--think').length).toBe(1);
    expect(document.querySelector('.kbubble--think .kbubble__who')?.textContent).toMatch(/thinks$/);
  });

  it('renders every unlocked episode panel without error', () => {
    modulesDone.value = KOMIKS.map((e) => e.module);
    for (const ep of KOMIKS) {
      open(`#/library/komiks/${ep.n}`);
      cleanup();
      render(<LibraryScreen />);
      for (let i = 1; i < ep.panels.length; i++) fireEvent.click(screen.getByRole('button', { name: /Next/ }));
      expect(screen.getByRole('status').textContent).toBe(`Panel ${ep.panels.length} of ${ep.panels.length}`);
      expect(komiksRead.value).toContain(ep.id);
    }
  });

  it('reads back to the list from the tab (tabs navigate to their route)', async () => {
    render(<LibraryScreen />);
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Myths' }));
    });
    expect(window.location.hash).toBe('#/library/myths');
  });
});
