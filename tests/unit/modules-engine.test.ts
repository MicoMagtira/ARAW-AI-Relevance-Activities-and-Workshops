import { beforeEach, describe, expect, it } from 'vitest';
import { badgesEarned, cardsDone, claimXp, isUnlocked, modulesDone, moduleStars, nodeState, xpClaims } from '../../src/app/progress';
import { xp } from '../../src/app/state';
import { resetAll } from '../../src/app/store';
import { MODULES, moduleById } from '../../src/content/modules';
import {
  XP,
  answerPractice,
  buildSteps,
  checkChoice,
  completeCard,
  completeGame,
  countedSteps,
  finishModule,
  komiksEpisode,
  placeSortItem,
  practiceCount,
  startIndex,
  starsFor,
  tallyFor,
} from '../../src/modules/engine';
import content from '../../src/modules/m01';
import { hasContent, loadContent } from '../../src/modules/registry';
import type { ChoiceCard, SwipeSortCard } from '../../src/modules/types';

const m01 = moduleById('m01')!;
const m02 = moduleById('m02')!;

beforeEach(() => {
  window.localStorage.clear();
  resetAll();
});

describe('unlock rule (sequential)', () => {
  it('opens only module 1 at the start', () => {
    expect(MODULES.map((m) => isUnlocked(m, []))).toEqual([true, ...Array(9).fill(false)]);
    expect(nodeState(m01, [])).toBe('current');
  });

  it('opens the next module when one is finished, and keeps finished ones open', () => {
    const done = ['m01', 'm02'];
    expect(MODULES.filter((m) => isUnlocked(m, done)).map((m) => m.id)).toEqual(['m01', 'm02', 'm03']);
    expect(nodeState(m01, done)).toBe('done');
  });

  it('does not open a module whose predecessor is missing, even if later ones are done', () => {
    expect(isUnlocked(moduleById('m04')!, ['m01', 'm03'])).toBe(false);
    expect(isUnlocked(moduleById('m02')!, ['m01', 'm03'])).toBe(true);
  });
});

describe('steps and resume', () => {
  it('runs hook, cards, game, takeaway, mini Fact or Fake, reward in that order', () => {
    const steps = buildSteps(content);
    expect(steps.map((s) => s.kind)).toEqual([...Array(9).fill('card'), 'game', 'takeaway', 'practice', 'reward']);
    expect(steps[0]).toMatchObject({ id: 'm01-c1', kind: 'card' });
    expect(countedSteps(steps)).toBe(12);
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length);
  });

  it('resumes at the saved card, clamped to the card count, and restarts a finished module', () => {
    expect(startIndex(m01, {}, [])).toBe(0);
    expect(startIndex(m01, { m01: 3 }, [])).toBe(3);
    expect(startIndex(m01, { m01: 99 }, [])).toBe(m01.cards);
    expect(startIndex(m01, { m01: 7 }, ['m01'])).toBe(0);
    expect(startIndex(m01, { m01: -4 }, [])).toBe(0);
  });

  it('uses ten practice items in module 4 and five elsewhere', () => {
    expect(practiceCount('m04')).toBe(10);
    expect(practiceCount('m01')).toBe(5);
  });
});

describe('XP and progress', () => {
  it('pays each claim key once', () => {
    expect(claimXp('a', 5)).toBe(5);
    expect(claimXp('a', 5)).toBe(0);
    expect(claimXp('b', 0)).toBe(0);
    expect(xp.value).toBe(5);
    expect(xpClaims.value).toEqual(['a']);
  });

  it('pays 5 XP per lesson card the first time and saves progress after every card', () => {
    expect(completeCard(m01, 'm01-c1', 0)).toBe(XP.card);
    expect(completeCard(m01, 'm01-c2', 1)).toBe(XP.card);
    expect(cardsDone.value.m01).toBe(2);
    expect(xp.value).toBe(10);
    // replaying a card never pays again and never moves progress backwards
    expect(completeCard(m01, 'm01-c1', 0)).toBe(0);
    expect(cardsDone.value.m01).toBe(2);
    expect(xp.value).toBe(10);
  });

  it('pays 50 XP for the module game once and keeps the best stars', () => {
    expect(completeGame(m01, 2)).toBe(XP.game);
    expect(completeGame(m01, 3)).toBe(0);
    expect(completeGame(m01, 1)).toBe(0);
    expect(moduleStars.value.m01).toBe(3);
    expect(xp.value).toBe(XP.game);
  });

  it('pays 10 XP per correct practice item once, nothing for wrong answers', () => {
    expect(answerPractice(m01, 'i1', true)).toBe(10);
    expect(answerPractice(m01, 'i1', true)).toBe(0);
    expect(answerPractice(m01, 'i2', false)).toBe(0);
    expect(xp.value).toBe(10);
  });

  it('finishing a module marks it done, pays 100 XP, awards the badge and unlocks the next module and Komiks', () => {
    const r = finishModule(m01);
    expect(r).toMatchObject({ firstTime: true, badgeId: 'module-m01', newBadges: ['module-m01'], komiks: 1, xp: XP.module });
    expect(r.unlocked?.id).toBe('m02');
    expect(modulesDone.value).toEqual(['m01']);
    expect(badgesEarned.value).toEqual(['module-m01']);
    expect(cardsDone.value.m01).toBe(m01.cards);
    expect(isUnlocked(m02, modulesDone.value)).toBe(true);
    expect(xp.value).toBe(100);
    expect(komiksEpisode(m02)).toBe(2);
  });

  it('a replay earns nothing new', () => {
    completeCard(m01, 'm01-c1', 0);
    finishModule(m01);
    const before = xp.value;
    expect(finishModule(m01)).toMatchObject({ firstTime: false, newBadges: [], unlocked: null, komiks: null, xp: 0 });
    expect(completeCard(m01, 'm01-c1', 0)).toBe(0);
    expect(xp.value).toBe(before);
    expect(modulesDone.value).toEqual(['m01']);
  });

  it('the last module awards the finale badge and unlocks nothing', () => {
    modulesDone.value = MODULES.slice(0, 9).map((m) => m.id);
    const r = finishModule(moduleById('m10')!);
    expect(r.unlocked).toBeNull();
    expect(r.newBadges).toEqual(['module-m10', 'finale']);
  });

  it('adds up what a module paid from its claim keys', () => {
    completeCard(m01, 'a', 0);
    completeCard(m01, 'b', 1);
    completeGame(m01, 1);
    answerPractice(m01, 'x', true);
    finishModule(m01);
    answerPractice(m02, 'y', true);
    expect(tallyFor('m01')).toEqual({ cards: 10, game: 50, practice: 10, module: 100, total: 170 });
    expect(tallyFor('m02').total).toBe(10);
  });
});

describe('card logic', () => {
  const sort: SwipeSortCard = {
    id: 'test-sort',
    type: 'swipe-sort',
    title: 'Which of these use AI?',
    bins: [
      { id: 'not-ai', label: 'Not AI' },
      { id: 'ai', label: 'AI' },
    ],
    items: [
      { id: 'calculator', text: 'Pocket calculator', bin: 'not-ai', why: 'It follows fixed rules.' },
      { id: 'spam', text: 'Spam filter', bin: 'ai', why: 'It learned from many junk messages.' },
    ],
  };
  const choice = content.cards.find((c): c is ChoiceCard => c.type === 'choice')!;

  it('choice: marks the one correct option and returns feedback for every option', () => {
    expect(checkChoice(choice, choice.correct)).toMatchObject({ correct: true });
    const wrong = choice.options.findIndex((_, i) => i !== choice.correct);
    expect(checkChoice(choice, wrong).correct).toBe(false);
    choice.options.forEach((_, i) => expect(checkChoice(choice, i).feedback.length).toBeGreaterThan(0));
    expect(checkChoice(choice, 99)).toEqual({ correct: false, feedback: '' });
  });

  it('swipe-sort: left bin is index 0, right bin index 1', () => {
    const idx = sort.items.findIndex((i) => i.bin === sort.bins[1].id);
    expect(placeSortItem(sort, idx, 1)?.correct).toBe(true);
    expect(placeSortItem(sort, idx, 0)?.correct).toBe(false);
    expect(placeSortItem(sort, 99, 0)).toBeNull();
  });

  it('stars: 3 for perfect, 2 for two thirds, otherwise 1', () => {
    expect([starsFor(12, 12), starsFor(8, 12), starsFor(7, 12), starsFor(0, 0)]).toEqual([3, 2, 1, 1]);
  });
});

describe('module 1 content', () => {
  it('fits the module info and is well formed', () => {
    expect(1 + content.cards.length).toBe(m01.cards);
    const ids = [content.hook.id, ...content.cards.map((c) => c.id), content.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(content.takeaway.bullets).toHaveLength(3);
    expect(content.review_status).toBe('unreviewed');
    for (const c of content.cards) {
      if (c.type === 'choice') {
        expect(c.options.length).toBeGreaterThanOrEqual(2);
        expect(c.options.length).toBeLessThanOrEqual(4);
        expect(c.correct).toBeGreaterThanOrEqual(0);
        expect(c.correct).toBeLessThan(c.options.length);
      }
      if (c.type === 'reveal') expect(c.tiles.length).toBeGreaterThanOrEqual(2);
      if (c.type === 'swipe-sort') {
        expect(c.items.length).toBeGreaterThanOrEqual(4);
        expect(c.items.every((i) => c.bins.some((b) => b.id === i.bin))).toBe(true);
      }
    }
    // SPEC section 4: hook, info, 3 reveals, 3 choices, poll (the swipe sort is the module game)
    const types = [content.hook.type, ...content.cards.map((c) => c.type)];
    expect(types).toEqual(['story-hook', 'info', 'reveal', 'choice', 'reveal', 'choice', 'reveal', 'choice', 'poll']);
    expect(content.game.slug).toBe('ai-or-not');
  });

  it('loads through the registry; modules without content report so', async () => {
    expect(hasContent('m01')).toBe(true);
    expect(hasContent('m02')).toBe(false);
    expect((await loadContent('m01'))?.id).toBe('m01');
    expect(await loadContent('m02')).toBeNull();
    expect((await content.game.load()).default).toBeTypeOf('function');
  });
});
