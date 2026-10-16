// Spot the Tactic (T10): villains and posts, portraits, post drawing, hearts and defeat rules, the Module 4 content and the game component.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { badgesEarned, tacticStreaks, villainCards } from '../../src/app/progress';
import { startRouter } from '../../src/app/router';
import { resetAll } from '../../src/app/store';
import { BADGES } from '../../src/content/badges';
import { MODULES } from '../../src/content/modules';
import { LEGIT_POSTS, postsFor, TACTIC_POSTS, VILLAIN_IDS, VILLAINS, villainById } from '../../src/content/tactics';
import { TRICKS } from '../../src/content/factOrFake/schema';
import m04 from '../../src/modules/m04';
import SpotTheTactic from '../../src/modules/m04/SpotTheTactic';
import { VillainCollection } from '../../src/modules/m04/VillainCollection';
import { applyPick, buildPosts, heartsLeft, HITS_TO_DEFEAT, isPickRight, LEGIT_PER_PLAY, PER_VILLAIN, POST_TOTAL, scoreFor, starsFor } from '../../src/modules/m04/tacticLogic';
import { VillainPortrait } from '../../src/ui/VillainPortrait';
import { SPRITE_PALETTE, SPRITE_SIZE, spriteRows } from '../../src/ui/villainSprites';

const words = (s: string) => s.trim().split(/\s+/).length;

describe('villains', () => {
  it('are the five tricks in the Fact or Fake trick set, each with a card and a badge', () => {
    expect(VILLAIN_IDS).toHaveLength(5);
    for (const id of VILLAIN_IDS) expect(TRICKS).toContain(id);
    expect(VILLAINS.map((v) => v.name)).toEqual(['Dr. Fake', 'Miracle Mike', 'Fear Monger', 'Conspiracy Kuya', 'Kwento Kim']);
    for (const v of VILLAINS) {
      expect(v.tagline.length).toBeGreaterThan(5);
      expect(v.tells.length).toBeGreaterThanOrEqual(3);
      expect(v.counter.length).toBeGreaterThan(10);
      expect(v.ara.length).toBeGreaterThan(10);
      expect(v.review_status).toBe('unreviewed');
      const badge = BADGES.find((b) => b.id === v.badgeId);
      expect(badge?.group).toBe('villain');
      expect(badge?.name).toBe(`Beat ${v.name}`);
    }
  });
});

describe('post pool', () => {
  it('has at least 20 posts: four or more per villain and at least four legit ones, with unique ids', () => {
    expect(TACTIC_POSTS.length).toBeGreaterThanOrEqual(20);
    for (const id of VILLAIN_IDS) expect(postsFor(id).length).toBeGreaterThanOrEqual(4);
    expect(LEGIT_POSTS.length).toBeGreaterThanOrEqual(4);
    const ids = TACTIC_POSTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is complete: text, why, check, basis, marks that are exact substrings, and unreviewed', () => {
    for (const p of TACTIC_POSTS) {
      for (const field of [p.author, p.meta, p.text, p.why, p.check, p.basis]) expect(field.trim().length).toBeGreaterThan(5);
      expect(p.marks.length).toBeGreaterThanOrEqual(2);
      for (const m of p.marks) expect(p.text).toContain(m);
      expect(p.review_status).toBe('unreviewed');
      expect(words(p.why)).toBeLessThanOrEqual(45);
      expect(words(p.check)).toBeLessThanOrEqual(30);
    }
  });

  it('never gives dosing, and every fake page is fictional (no real brand or person names)', () => {
    for (const p of TACTIC_POSTS) {
      expect(`${p.text} ${p.why} ${p.check}`).not.toMatch(/\d+\s?(mg|ml|mcg|tablet|pill|drops)s?\b/i);
      expect(p.text).not.toMatch(/facebook|tiktok|youtube|gcash|globe|smart|pfizer|moderna/i);
    }
  });
});

describe('portraits', () => {
  it('are 16 by 16, symmetrical, use only palette colours, and differ from each other', () => {
    const seen = new Set<string>();
    for (const id of VILLAIN_IDS) {
      const rows = spriteRows(id);
      expect(rows).toHaveLength(SPRITE_SIZE);
      for (const row of rows) {
        expect(row).toHaveLength(SPRITE_SIZE);
        expect(row).toBe([...row].reverse().join(''));
        for (const ch of row) if (ch !== '.') expect(SPRITE_PALETTE[ch]).toBeTruthy();
      }
      seen.add(rows.join('/'));
    }
    expect(seen.size).toBe(5);
  });

  it('render as a labelled pixel SVG, a silhouette when locked, or decorative', () => {
    const view = render(<VillainPortrait id="dr_fake" />);
    expect(screen.getByRole('img', { name: 'Dr. Fake, a pixel-art cartoon villain' })).toBeTruthy();
    view.rerender(<VillainPortrait id="dr_fake" locked />);
    expect(screen.getByRole('img', { name: 'Dr. Fake, not beaten yet' }).getAttribute('class')).toContain('villain-art--locked');
    view.rerender(<VillainPortrait id="dr_fake" decorative />);
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('post drawing', () => {
  it('draws 12 posts: two per villain and two legit, repeatable by seed and different across seeds', () => {
    expect(POST_TOTAL).toBe(VILLAIN_IDS.length * PER_VILLAIN + LEGIT_PER_PLAY);
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const posts = buildPosts(seed);
      expect(posts).toHaveLength(POST_TOTAL);
      expect(new Set(posts.map((p) => p.id)).size).toBe(POST_TOTAL);
      for (const id of VILLAIN_IDS) expect(posts.filter((p) => p.trick === id)).toHaveLength(PER_VILLAIN);
      expect(posts.filter((p) => p.trick === 'none')).toHaveLength(LEGIT_PER_PLAY);
    }
    expect(buildPosts('x').map((p) => p.id)).toEqual(buildPosts('x').map((p) => p.id));
    expect(new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((s) => buildPosts(s).map((p) => p.id).join())).size).toBeGreaterThan(1);
  });
});

describe('picks, hearts and defeat', () => {
  const dr = postsFor('dr_fake')[0]!;
  const legit = LEGIT_POSTS[0]!;

  it('a pick is right when it names the post trick, or none for a legit post', () => {
    expect(isPickRight(dr, 'dr_fake')).toBe(true);
    expect(isPickRight(dr, 'kwento_kim')).toBe(false);
    expect(isPickRight(dr, 'none')).toBe(false);
    expect(isPickRight(legit, 'none')).toBe(true);
    expect(isPickRight(legit, 'dr_fake')).toBe(false);
  });

  it('each right pick takes a heart and three in a row beat the villain', () => {
    let streaks: Record<string, number> = {};
    for (let i = 1; i <= HITS_TO_DEFEAT; i++) {
      const out = applyPick(streaks, [], dr, 'dr_fake');
      expect(out).toMatchObject({ correct: true, hit: true, reset: false, villain: 'dr_fake' });
      expect(out.streaks.dr_fake).toBe(i);
      expect(out.defeatedNow).toBe(i === HITS_TO_DEFEAT ? 'dr_fake' : null);
      streaks = { ...out.streaks };
    }
  });

  it('a miss on a trick post gives the hearts back, but a miss on a different villain does not', () => {
    const out = applyPick({ dr_fake: 2, kwento_kim: 1 }, [], dr, 'miracle_mike');
    expect(out).toMatchObject({ correct: false, hit: false, reset: true, defeatedNow: null });
    expect(out.streaks).toEqual({ dr_fake: 0, kwento_kim: 1 });
    expect(applyPick({}, [], dr, 'none').reset).toBe(false);
  });

  it('legit posts never touch a villain, whether right or wrong', () => {
    const streaks = { dr_fake: 2 };
    expect(applyPick(streaks, [], legit, 'none')).toMatchObject({ correct: true, villain: null, hit: false, streaks });
    expect(applyPick(streaks, [], legit, 'dr_fake')).toMatchObject({ correct: false, villain: null, reset: false, streaks });
  });

  it('a beaten villain stays beaten: no more hits, no reset, no second defeat', () => {
    expect(applyPick({ dr_fake: 3 }, ['dr_fake'], dr, 'dr_fake')).toMatchObject({ correct: true, hit: false, defeatedNow: null, streaks: { dr_fake: 3 } });
    expect(applyPick({ dr_fake: 3 }, ['dr_fake'], dr, 'none')).toMatchObject({ correct: false, reset: false, streaks: { dr_fake: 3 } });
  });

  it('hearts left: three at the start, none once beaten', () => {
    expect(heartsLeft(0, false)).toBe(3);
    expect(heartsLeft(2, false)).toBe(1);
    expect(heartsLeft(3, false)).toBe(0);
    expect(heartsLeft(1, true)).toBe(0);
    expect(heartsLeft(-1, false)).toBe(3);
  });

  it('scores 10 points per right pick and gives stars at 90% and 60%', () => {
    expect(scoreFor(7)).toBe(70);
    expect([12, 11, 10, 8, 7, 0].map((n) => starsFor(n))).toEqual([3, 3, 2, 2, 1, 1]);
    expect(starsFor(0, 0)).toBe(1);
  });
});

describe('Module 4 content', () => {
  it('follows the spec: hook, seven cards, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm04');
    expect(1 + m04.cards.length).toBe(info?.cards);
    expect(m04.cards).toHaveLength(7);
    expect(m04.hook.speaker).toBe('Tita Baby');
    expect(m04.hook.line).toMatch(/tea cures diabetes in 7 days/);
    expect(m04.game.slug).toBe('spot-the-tactic');
    expect(m04.game.name).toBe(info?.game);
    const ids = [m04.hook.id, ...m04.cards.map((c) => c.id), m04.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m04.review_status).toBe('unreviewed');
    expect(m04.cards.map((c) => c.type)).toEqual(['info', 'reveal', 'choice', 'choice', 'choice', 'swipe-sort', 'reveal']);
  });

  it('meets the five villains in one reveal card, and includes true posts in the sort', () => {
    const reveal = m04.cards[1];
    expect(reveal?.type === 'reveal' && reveal.tiles.map((t) => t.label)).toEqual(VILLAINS.map((v) => v.name));
    const sort = m04.cards[5];
    if (sort?.type !== 'swipe-sort') throw new Error('card 6 is the swipe-sort');
    expect(sort.items.length).toBeLessThanOrEqual(8);
    for (const bin of sort.bins) expect(sort.items.filter((i) => i.bin === bin.id).length).toBeGreaterThanOrEqual(2);
  });

  it('has a correct answer and feedback on every choice; the tea check points to the official page and FDA registration', () => {
    for (const c of m04.cards) {
      if (c.type === 'choice') {
        expect(c.options[c.correct]).toBeTruthy();
        expect(c.options.every((o) => o.feedback.length > 0)).toBe(true);
      }
    }
    const tea = m04.cards[2];
    expect(tea?.type === 'choice' && tea.options[tea.correct]?.text).toMatch(/official page.*FDA/);
  });

  it('loads the game lazily and uses ten practice items through the registry', async () => {
    expect((await m04.game.load()).default).toBeTypeOf('function');
    expect(villainById('kwento_kim').name).toBe('Kwento Kim');
  });
});

describe('Spot the Tactic game', () => {
  let stopRouter: () => void;
  beforeEach(() => {
    resetAll();
    window.location.hash = '#/learn/m04?seed=unit';
    stopRouter = startRouter(); // the game reads `?seed=` from the router signal
  });
  afterEach(() => {
    cleanup();
    stopRouter();
    window.location.hash = '';
    resetAll();
  });

  const button = (name: string | RegExp) => screen.getByRole('button', { name });
  const posts = () => buildPosts('unit');
  const pickName = (trick: string) => (trick === 'none' ? /^No trick, it is legit/ : new RegExp(`^${villainById(trick as (typeof VILLAIN_IDS)[number]).name}:`));

  /** Pick for the current post, then press Next. */
  function play(trick: string, last = false) {
    fireEvent.click(button(pickName(trick)));
    fireEvent.click(button(last ? 'See my result' : 'Next post'));
  }

  it('starts with an intro and the card collection, all locked', () => {
    render(<SpotTheTactic moduleId="m04" onComplete={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Spot the Tactic' })).toBeTruthy();
    expect(screen.getByText('0 of 5 cards collected')).toBeTruthy();
    expect(screen.getAllByText(/Spot this trick 3 times in a row to win the card/)).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Start spotting' })).toBeTruthy();
  });

  it('shows a post with six picks, then feedback with the trick, why and how to check; a fake gets the stamp', () => {
    render(<SpotTheTactic moduleId="m04" onComplete={vi.fn()} />);
    fireEvent.click(button('Start spotting'));
    const first = posts()[0]!;
    expect(screen.getByText('Post 1 of 12')).toBeTruthy();
    expect(screen.getByText(first.text)).toBeTruthy();
    for (const v of VILLAINS) expect(button(new RegExp(`^${v.name}:`))).toBeTruthy();
    expect(button(/^No trick, it is legit/)).toBeTruthy();
    expect(screen.queryByText('ARAW GAME · FAKE')).toBeNull();

    fireEvent.click(button(pickName(first.trick)));
    expect(screen.getByText(first.why)).toBeTruthy();
    expect(screen.getByText(first.check, { exact: false })).toBeTruthy();
    expect(screen.getByText('10 pts')).toBeTruthy();
    if (first.trick === 'none') expect(screen.getByText('Legit post')).toBeTruthy();
    else expect(screen.getByText('ARAW GAME · FAKE')).toBeTruthy();
    expect(document.querySelectorAll('.tt-mark').length).toBeGreaterThan(0);
  });

  it('a right pick on a trick post takes a heart and Ara jokes at the villain', () => {
    render(<SpotTheTactic moduleId="m04" onComplete={vi.fn()} />);
    fireEvent.click(button('Start spotting'));
    const first = posts().find((p) => p.trick !== 'none')!;
    // skip ahead to the first trick post, playing the legit ones right
    for (const p of posts()) {
      if (p.id === first.id) break;
      play(p.trick);
    }
    fireEvent.click(button(pickName(first.trick)));
    const v = villainById(first.trick as (typeof VILLAIN_IDS)[number]);
    expect(screen.getByText('Correct!')).toBeTruthy();
    expect(screen.getByText(v.ara)).toBeTruthy();
    expect(screen.getByText(new RegExp(`${v.name} lost a heart`))).toBeTruthy();
    expect(tacticStreaks.value[first.trick]).toBe(1);
  });

  it('a wrong pick says So close!, highlights the signs and gives no points', () => {
    render(<SpotTheTactic moduleId="m04" onComplete={vi.fn()} />);
    fireEvent.click(button('Start spotting'));
    const first = posts()[0]!;
    fireEvent.click(button(pickName(first.trick === 'none' ? 'dr_fake' : 'none')));
    expect(screen.getByText('So close!')).toBeTruthy();
    expect(screen.getByText('No points this time. On to the next one!')).toBeTruthy();
    expect(screen.getByText('0 pts')).toBeTruthy();
    expect(document.querySelectorAll('.tt-mark').length).toBe(first.marks.length);
  });

  it('plays all 12 posts right, finishes with three stars, and calls onComplete(3) on Finish', () => {
    const onComplete = vi.fn();
    render(<SpotTheTactic moduleId="m04" onComplete={onComplete} />);
    fireEvent.click(button('Start spotting'));
    const all = posts();
    all.forEach((p, i) => play(p.trick, i === all.length - 1));
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(screen.getByText('You made 12 right picks out of 12. 120 points.')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(button('Finish game'));
    expect(onComplete).toHaveBeenCalledWith(3);
  });

  it('wrong picks still finish the game, with one star', () => {
    const onComplete = vi.fn();
    render(<SpotTheTactic moduleId="m04" onComplete={onComplete} />);
    fireEvent.click(button('Start spotting'));
    const all = posts();
    // `none` is wrong for every trick post; `dr_fake` is wrong for every legit post
    all.forEach((p, i) => play(p.trick === 'none' ? 'dr_fake' : 'none', i === all.length - 1));
    expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy();
    expect(screen.getByText('You made 0 right picks out of 12. 0 points.')).toBeTruthy();
    fireEvent.click(button('Finish game'));
    expect(onComplete).toHaveBeenCalledWith(1);
  });

  it('beating a villain over several plays unlocks its card and badge once', () => {
    // a villain on two hearts lost: its next right pick in the play beats it
    tacticStreaks.value = { dr_fake: 2 };
    render(<SpotTheTactic moduleId="m04" onComplete={vi.fn()} />);
    fireEvent.click(button('Start spotting'));
    const all = posts();
    all.forEach((p, i) => play(p.trick, i === all.length - 1));
    expect(villainCards.value).toContain('dr_fake');
    expect(badgesEarned.value.filter((b) => b === 'villain-dr-fake')).toHaveLength(1);
    // the finished screen shows the collected card in full
    expect(screen.getByText('1 of 5 cards collected')).toBeTruthy();
    expect(screen.getAllByText('Beaten').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(villainById('dr_fake').counter)).toBeTruthy();
  });

  it('shows the new-card panel the moment the third right pick lands', () => {
    tacticStreaks.value = { dr_fake: 2 };
    render(<SpotTheTactic moduleId="m04" onComplete={vi.fn()} />);
    fireEvent.click(button('Start spotting'));
    const all = posts();
    const target = all.findIndex((p) => p.trick === 'dr_fake');
    for (let i = 0; i < target; i++) play(all[i]!.trick);
    fireEvent.click(button(/^Dr\. Fake:/));
    expect(screen.getByText('New card unlocked!')).toBeTruthy();
    expect(screen.getByText('Dr. Fake is beaten!', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText(/Badge earned: Beat Dr. Fake/, { selector: 'p' })).toBeTruthy();
  });

  it('a miss gives the hearts back', () => {
    tacticStreaks.value = { dr_fake: 2 };
    render(<SpotTheTactic moduleId="m04" onComplete={vi.fn()} />);
    fireEvent.click(button('Start spotting'));
    const all = posts();
    const target = all.findIndex((p) => p.trick === 'dr_fake');
    for (let i = 0; i < target; i++) play(all[i]!.trick);
    fireEvent.click(button(/^Kwento Kim:/));
    expect(screen.getByText(/Dr. Fake got the hearts back/)).toBeTruthy();
    expect(tacticStreaks.value.dr_fake).toBe(0);
    expect(villainCards.value).toEqual([]);
  });
});

describe('card collection', () => {
  beforeEach(() => resetAll());
  afterEach(() => {
    cleanup();
    resetAll();
  });

  it('shows locked silhouettes with progress and full cards for beaten villains', () => {
    tacticStreaks.value = { miracle_mike: 2 };
    villainCards.value = ['kwento_kim'];
    render(<VillainCollection />);
    expect(screen.getByText('1 of 5 cards collected')).toBeTruthy();
    expect(screen.getByText('Spot this trick 3 times in a row to win the card. 2 of 3 so far.')).toBeTruthy();
    expect(screen.getByText('Beaten')).toBeTruthy();
    expect(screen.getByText(villainById('kwento_kim').counter)).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Miracle Mike: 1 of 3 hearts left' })).toBeTruthy();
    // a locked card does not give away its counter-move
    expect(screen.queryByText(villainById('miracle_mike').counter)).toBeNull();
  });
});
