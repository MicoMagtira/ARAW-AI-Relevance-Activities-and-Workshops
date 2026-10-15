import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { DEFAULT_SETTINGS, SETTING_CLASSES, initSettings, settings } from '../../src/app/settings';
import { profile } from '../../src/app/state';
import { badgesEarned, modulesDone } from '../../src/app/progress';
import { Home } from '../../src/screens/Home';
import { Me } from '../../src/screens/Me';

let stop: () => void = () => {};

beforeEach(() => {
  window.localStorage.clear();
  settings.value = DEFAULT_SETTINGS;
  profile.value = { nickname: 'Kaibigan', avatar: 0 };
  modulesDone.value = [];
  badgesEarned.value = [];
  stop = initSettings();
});

afterEach(() => {
  stop();
  cleanup();
});

const SWITCHES = [
  ['Larger text', 'largeText'],
  ['High contrast', 'highContrast'],
  ['Extra-large buttons', 'xlButtons'],
  ['Screen-reader hints', 'srHints'],
  ['Reduce motion', 'reduceMotion'],
] as const;

describe('Me: accessibility settings', () => {
  it('lists five switches, all off by default', () => {
    render(<Me />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(5);
    expect(switches.every((s) => s.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(document.documentElement.className).toBe('');
  });

  for (const [name, key] of SWITCHES) {
    it(`"${name}" toggles its root class and saves`, () => {
      render(<Me />);
      const sw = screen.getByRole('switch', { name });
      fireEvent.click(sw);
      expect(sw.getAttribute('aria-checked')).toBe('true');
      expect(document.documentElement.classList.contains(SETTING_CLASSES[key])).toBe(true);
      expect(JSON.parse(window.localStorage.getItem('araw:v1:settings') ?? '{}')[key]).toBe(true);
      fireEvent.click(sw);
      expect(document.documentElement.classList.contains(SETTING_CLASSES[key])).toBe(false);
    });
  }

  it('Screen-reader hints adds extra descriptions only while on', () => {
    const { container } = render(
      <div>
        <Home />
        <Me />
      </div>,
    );
    expect(container.querySelectorAll('.sr-hint')).toHaveLength(0);
    fireEvent.click(screen.getByRole('switch', { name: 'Screen-reader hints' }));
    const hints = container.querySelectorAll('.sr-hint');
    expect(hints.length).toBeGreaterThanOrEqual(3);
    // every button that points at a hint resolves to a real element
    for (const el of container.querySelectorAll('[aria-describedby]')) {
      for (const id of (el.getAttribute('aria-describedby') ?? '').split(' ')) {
        expect(container.querySelector(`[id="${id}"]`), id).not.toBeNull();
      }
    }
  });
});

describe('Me: profile', () => {
  it('saves the avatar the player picks and marks it pressed', () => {
    render(<Me />);
    const picker = screen.getByRole('group', { name: 'Pick your avatar' });
    const buttons = within(picker).getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(6);
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(within(picker).getByRole('button', { name: 'Woman in a hijab' }));
    expect(within(picker).getByRole('button', { name: 'Woman in a hijab' }).getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(JSON.parse(window.localStorage.getItem('araw:v1:profile') ?? '{}').avatar).toBe(3);
    expect(screen.getByRole('img', { name: /Your avatar: Woman in a hijab/ })).toBeTruthy();
  });

  it('saves the nickname as the player types and restores the default when left empty', () => {
    render(<Me />);
    const input = screen.getByLabelText('Nickname') as HTMLInputElement;
    expect(input.maxLength).toBe(20);
    fireEvent.input(input, { target: { value: 'Bea' } });
    expect(profile.value.nickname).toBe('Bea');
    fireEvent.input(input, { target: { value: '  ' } });
    fireEvent.blur(input);
    expect(profile.value.nickname).toBe('Kaibigan');
  });

  it('shows how to earn a locked badge when it is picked', () => {
    render(<Me />);
    fireEvent.click(screen.getByRole('button', { name: /Guro ni AI/ }));
    expect(screen.getByText(/Finish Module 2: How AI Learns and Makes Mistakes/)).toBeTruthy();
  });
});

describe('Home', () => {
  it('greets by nickname, offers Module 1 and shows locked badges when new', () => {
    profile.value = { nickname: 'Bea', avatar: 0 };
    render(<Home />);
    expect(screen.getByRole('heading', { level: 2, name: /^Magandang (umaga|tanghali|hapon|gabi), Bea!$/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'What Is AI, Really?' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Start' }).getAttribute('href')).toBe('#/learn');
    expect(screen.getByText(/No badges yet/)).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(14); // 10 path nodes + badge strip
  });

  it('moves Continue along when modules are done', () => {
    modulesDone.value = ['m01', 'm02'];
    render(<Home />);
    expect(screen.getByRole('heading', { level: 3, name: 'AI and Your Health' })).toBeTruthy();
    expect(screen.getByText(/Continue · Module 3 of 10/i)).toBeTruthy();
  });

  it('flips the myth card to the fact', () => {
    render(<Home />);
    const card = screen.getByRole('button', { name: /Myth of the day/ });
    expect(card.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(card);
    expect(card.getAttribute('aria-pressed')).toBe('true');
  });
});
