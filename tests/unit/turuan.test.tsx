// Turuan si AI (T08): the naive Bayes detector, the example posts, scoring, the Module 2 content and the game component.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { LOCAL_POSTS, TEST_POSTS, TRAIN_POSTS, type TuruanPost } from '../../src/content/turuan';
import m02 from '../../src/modules/m02';
import TuruanSiAi from '../../src/modules/m02/TuruanSiAi';
import { accuracy, classify, emptyModel, reliedOn, tokenize, train, weightOf } from '../../src/modules/m02/naiveBayes';
import { labelScore, labelsRight, localFakes, missedLocalFakes, playerExamples, runTest, starsForAccuracy } from '../../src/modules/m02/turuanLogic';
import { MODULES } from '../../src/content/modules';

afterEach(cleanup);

const ALL: readonly TuruanPost[] = [...TRAIN_POSTS, ...TEST_POSTS, ...LOCAL_POSTS];

describe('tokenize', () => {
  it('lowercases, drops punctuation, short words and stopwords, and keeps repeats and local words', () => {
    expect(tokenize('SHOCKING! The cure is a secret, secret.')).toEqual(['shocking', 'cure', 'secret', 'secret']);
    expect(tokenize('Ang tsaa sa bayabas, 100%!')).toEqual(['ang', 'tsaa', 'sa', 'bayabas', '100']);
    expect(tokenize("Don't panic")).toEqual(["don't", 'panic']);
    expect(tokenize('')).toEqual([]);
  });
});

describe('naive Bayes detector', () => {
  const tiny = train([
    { text: 'miracle cure secret', label: 'fake' },
    { text: 'miracle pill guaranteed', label: 'fake' },
    { text: 'wash hands soap', label: 'real' },
    { text: 'visit clinic soap', label: 'real' },
  ]);

  it('counts words per class', () => {
    expect(tiny.docs).toEqual({ fake: 2, real: 2 });
    expect(tiny.words.fake.miracle).toBe(2);
    expect(tiny.words.real.soap).toBe(2);
    expect(tiny.total).toEqual({ fake: 6, real: 6 });
    expect(tiny.vocab).toBe(10);
  });

  it('weighs a word by how much more it shows up in one class (Laplace smoothed log ratio)', () => {
    // miracle: (2+1)/(6+10) fake vs (0+1)/(6+10) real
    expect(weightOf(tiny, 'miracle')).toBeCloseTo(Math.log(3), 10);
    expect(weightOf(tiny, 'clinic')).toBeCloseTo(Math.log(1 / 2), 10);
    expect(weightOf(tiny, 'soap')).toBeCloseTo(Math.log(1 / 3), 10);
    expect(weightOf(tiny, 'unseen')).toBe(0);
  });

  it('classifies by the words it knows and reports how sure it is', () => {
    const fake = classify(tiny, 'miracle cure');
    expect(fake.label).toBe('fake');
    expect(fake.confidence).toBeCloseTo(fake.pFake, 12);
    expect(fake.pFake).toBeCloseTo(1 / (1 + 1 / (3 * 2)), 10); // odds 3 x 2 (miracle, cure) with equal priors
    const real = classify(tiny, 'wash soap');
    expect(real.label).toBe('real');
    expect(real.confidence).toBeCloseTo(1 - real.pFake, 12);
  });

  it('is deterministic and ignores example order', () => {
    const examples = TRAIN_POSTS.map((p) => ({ text: p.text, label: p.label }));
    const a = train(examples);
    const b = train([...examples].reverse());
    expect(b).toEqual(a);
    expect(classify(a, TEST_POSTS[1]?.text ?? '')).toEqual(classify(b, TEST_POSTS[1]?.text ?? ''));
  });

  it('never accuses without a reason: no known words and equal priors means Real at 50%', () => {
    const p = classify(tiny, 'sigurado ipasa gamot');
    expect(p.label).toBe('real');
    expect(p.pFake).toBeCloseTo(0.5, 12);
    expect(p.confidence).toBeCloseTo(0.5, 12);
    expect(p.unknown).toBe(3);
    expect(classify(emptyModel(), 'anything at all').label).toBe('real');
  });

  it('the prior matters when words give no evidence', () => {
    const fakeHeavy = train([
      { text: 'miracle', label: 'fake' },
      { text: 'secret', label: 'fake' },
      { text: 'clinic', label: 'real' },
    ]);
    expect(classify(fakeHeavy, 'zzz').label).toBe('fake');
  });

  it('lists the words it relied on: known words only, strongest first, each once', () => {
    const p = classify(tiny, 'miracle miracle soap unknownword secret');
    expect(p.unknown).toBe(1);
    const top = reliedOn(p, 3);
    expect(top.map((w) => w.token)).toEqual(['miracle', 'soap', 'secret']);
    expect(top.map((w) => w.weight > 0)).toEqual([true, false, true]);
    expect(reliedOn(classify(tiny, 'nothing known here'))).toEqual([]);
  });

  it('measures accuracy', () => {
    expect(accuracy(tiny, [])).toBe(0);
    expect(
      accuracy(tiny, [
        { text: 'miracle cure', label: 'fake' },
        { text: 'wash soap', label: 'real' },
        { text: 'wash soap', label: 'fake' },
        { text: 'clinic visit', label: 'real' },
      ]),
    ).toBe(0.75);
  });
});

describe('Turuan si AI example posts', () => {
  it('has the sizes from the spec and unique ids', () => {
    expect(TRAIN_POSTS).toHaveLength(10);
    expect(TEST_POSTS).toHaveLength(8);
    expect(LOCAL_POSTS).toHaveLength(6);
    expect(new Set(ALL.map((p) => p.id)).size).toBe(ALL.length);
    expect(ALL.every((p) => p.review_status === 'unreviewed' && p.text && p.why && p.author)).toBe(true);
  });

  it('keeps the training set English and balanced, and the test and local sets mixed as designed', () => {
    expect(TRAIN_POSTS.every((p) => p.lang === 'en')).toBe(true);
    expect(TRAIN_POSTS.filter((p) => p.label === 'fake')).toHaveLength(5);
    expect(TEST_POSTS.filter((p) => p.lang !== 'en' && p.label === 'fake')).toHaveLength(4);
    expect(TEST_POSTS.filter((p) => p.lang === 'tl')).toHaveLength(3);
    expect(TEST_POSTS.filter((p) => p.lang === 'ceb')).toHaveLength(3);
    expect(LOCAL_POSTS.every((p) => p.lang !== 'en')).toBe(true);
    expect(LOCAL_POSTS.filter((p) => p.lang === 'tl')).toHaveLength(3);
    expect(LOCAL_POSTS.filter((p) => p.lang === 'ceb')).toHaveLength(3);
    expect(LOCAL_POSTS.filter((p) => p.label === 'fake')).toHaveLength(3);
  });

  it('never repeats a post across the three sets', () => {
    expect(new Set(ALL.map((p) => p.text)).size).toBe(ALL.length);
  });
});

describe('the detector on the example posts', () => {
  const trained = (posts: readonly TuruanPost[]) => train(posts.map((p) => ({ text: p.text, label: p.label })));

  it('trained on the English posts it gets the English tests right and misses all four local fakes, sounding sure', () => {
    const results = runTest(trained(TRAIN_POSTS), TEST_POSTS);
    const byId = Object.fromEntries(results.map((r) => [r.post.id, r]));
    expect(byId['tu-x01']?.right).toBe(true);
    expect(byId['tu-x03']?.right).toBe(true);
    for (const id of ['tu-x02', 'tu-x04', 'tu-x05', 'tu-x07']) {
      expect(byId[id]?.right, id).toBe(false);
      expect(byId[id]?.prediction.label).toBe('real');
      expect(byId[id]?.prediction.unknown, id).toBeGreaterThan((byId[id]?.prediction.words.length ?? 0) / 2);
    }
    expect(byId['tu-x02']?.prediction.confidence).toBeGreaterThan(0.8); // confidently wrong
    expect(missedLocalFakes(results)).toBe(4);
    expect(localFakes(results)).toBe(4);
    expect(accuracy(trained(TRAIN_POSTS), TEST_POSTS)).toBe(0.5);
  });

  it('after the six local examples every test post is right', () => {
    const model = trained([...TRAIN_POSTS, ...LOCAL_POSTS]);
    expect(accuracy(model, TEST_POSTS)).toBe(1);
    expect(missedLocalFakes(runTest(model, TEST_POSTS))).toBe(0);
  });

  it('shows the words it leaned on and how many it never saw', () => {
    const before = runTest(trained(TRAIN_POSTS), TEST_POSTS).find((r) => r.post.id === 'tu-x02');
    const words = reliedOn(before?.prediction as NonNullable<typeof before>['prediction']).map((w) => w.token);
    expect(words).toContain('health');
    expect(before?.prediction.unknown).toBeGreaterThanOrEqual(10);
  });
});

describe('Turuan si AI scoring', () => {
  it('turns the labels the player gave into training examples and points', () => {
    const labels = TRAIN_POSTS.map((p, i) => (i < 8 ? p.label : p.label === 'fake' ? 'real' : 'fake') as 'fake' | 'real');
    expect(playerExamples(TRAIN_POSTS, labels).map((e) => e.label)).toEqual(labels);
    expect(labelsRight(TRAIN_POSTS, labels)).toBe(8);
    expect(labelScore(TRAIN_POSTS, labels)).toBe(80);
    expect(labelScore(TRAIN_POSTS, [])).toBe(0);
  });

  it('gives stars by final accuracy: 3 at 85%, 2 at 65%, else 1', () => {
    expect([1, 0.875, 0.85, 0.7, 0.65, 0.5, 0].map(starsForAccuracy)).toEqual([3, 3, 3, 2, 2, 1, 1]);
  });
});

describe('Module 2 content', () => {
  it('follows the spec: hook, seven cards, the game and the takeaway', () => {
    const info = MODULES.find((m) => m.id === 'm02');
    expect(1 + m02.cards.length).toBe(info?.cards);
    const types = [m02.hook.type, ...m02.cards.map((c) => c.type)];
    expect(types).toEqual(['story-hook', 'info', 'choice', 'reveal', 'choice', 'reveal', 'swipe-sort', 'poll']);
    expect(m02.game.slug).toBe('turuan-si-ai');
    expect(m02.game.name).toBe(info?.game);
    expect(m02.hook.speaker).toBe('Bea');
    const ids = [m02.hook.id, ...m02.cards.map((c) => c.id), m02.takeaway.id];
    expect(new Set(ids).size).toBe(ids.length);
    expect(m02.review_status).toBe('unreviewed');
  });

  it('has a correct answer and feedback for every option, and a sort with items in both bins', () => {
    for (const c of m02.cards) {
      if (c.type === 'choice') {
        expect(c.options[c.correct]).toBeTruthy();
        expect(c.options.every((o) => o.feedback.length > 0)).toBe(true);
      }
      if (c.type === 'swipe-sort') {
        expect(c.items.length).toBeGreaterThanOrEqual(4);
        expect(c.items.length).toBeLessThanOrEqual(8);
        for (const bin of c.bins) expect(c.items.some((i) => i.bin === bin.id)).toBe(true);
      }
    }
  });

  it('loads the game lazily', async () => {
    expect((await m02.game.load()).default).toBeTypeOf('function');
  });
});

describe('Turuan si AI game', () => {
  const button = (name: string) => screen.getByRole('button', { name });

  /** Label every post of a step: `labelFor` picks the label for each post. */
  function labelStep(posts: readonly TuruanPost[], last: string, labelFor: (p: TuruanPost) => 'Fake' | 'Real') {
    posts.forEach((p, i) => {
      fireEvent.click(button(labelFor(p)));
      fireEvent.click(button(i === posts.length - 1 ? last : 'Next post'));
    });
  }
  const right = (p: TuruanPost) => (p.label === 'fake' ? 'Fake' : 'Real');

  it('plays the whole loop: train, fail on local fakes, Why?, add local examples, improve', () => {
    const onComplete = vi.fn();
    render(<TuruanSiAi moduleId="m02" onComplete={onComplete} />);
    expect(screen.getByRole('heading', { name: 'Step 1: Teach the detector' })).toBeTruthy();
    expect(screen.getByText('Post 1 of 10')).toBeTruthy();
    const first = TRAIN_POSTS[0] as TuruanPost;
    expect(screen.getByText(first.text)).toBeTruthy();

    // one right label: feedback with the truth, the stamp for a fake and 10 points
    fireEvent.click(button('Fake'));
    expect(screen.getByText('Good label! This post is Fake.')).toBeTruthy();
    expect(screen.getByText('ARAW GAME · FAKE')).toBeTruthy();
    expect(screen.getByText('+10 points')).toBeTruthy();
    expect(screen.getByText('10 pts')).toBeTruthy();
    fireEvent.click(button('Next post'));
    expect(screen.getByText('Post 2 of 10')).toBeTruthy();
    fireEvent.click(button('Real'));
    fireEvent.click(button('Next post'));
    labelStep(TRAIN_POSTS.slice(2), 'Train the detector', right);

    // test: the detector lets the local fakes through
    expect(screen.getByRole('heading', { name: 'Step 2: Test the detector' })).toBeTruthy();
    expect(screen.getByText('4 of 8 posts right')).toBeTruthy();
    expect(screen.getByText(/It caught only 0 of 4 fakes in Taglish and Cebuano/)).toBeTruthy();
    expect(screen.getAllByText('Detector says: Real').length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByText(/Missed it\. This post is Fake\./)).toHaveLength(4);

    // Why? marks the words it relied on and dots the ones it never saw
    const why = screen.getAllByRole('button', {
      name: 'Why?',
    })[1] as HTMLElement;
    expect(why.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(why);
    expect(why.getAttribute('aria-expanded')).toBe('true');
    const card = why.closest('.tu-post') as HTMLElement;
    expect(card.querySelectorAll('mark.tu-mark').length).toBeGreaterThan(0);
    expect(within(card).getByText(/It relied on these words:/)).toBeTruthy();
    expect(card.querySelectorAll('.tu-unknown').length).toBeGreaterThan(5);
    expect(within(card).getByText(/It had never seen \d+ of the \d+ words it looked at\./)).toBeTruthy();
    fireEvent.click(within(card).getByRole('button', { name: 'Hide why' }));
    expect(card.querySelectorAll('mark.tu-mark')).toHaveLength(0);

    // fix: six local-language examples, then retrain
    fireEvent.click(button('Teach it Taglish and Cebuano'));
    expect(screen.getByRole('heading', { name: 'Step 3: Teach it local words' })).toBeTruthy();
    expect(screen.getByText('Post 1 of 6')).toBeTruthy();
    labelStep(LOCAL_POSTS, 'Retrain the detector', right);

    expect(screen.getByRole('heading', { name: 'Step 4: Test it again' })).toBeTruthy();
    expect(screen.getByRole('meter', { name: 'Before: English only' }).getAttribute('aria-valuenow')).toBe('50');
    expect(screen.getByRole('meter', { name: 'After: with local words' }).getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByText('8 of 8 posts right')).toBeTruthy();
    expect(screen.getByRole('img', { name: '3 of 3 stars' })).toBeTruthy();
    expect(screen.getByText('You labelled 16 of 16 posts right: 160 points.')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(button('Finish game'));
    expect(onComplete).toHaveBeenCalledWith(3);
  });

  it('wrong labels teach the detector wrong, and the game still completes with one star', () => {
    const onComplete = vi.fn();
    render(<TuruanSiAi moduleId="m02" onComplete={onComplete} />);
    fireEvent.click(button('Real'));
    expect(screen.getByText(/Careful: this post is actually Fake/)).toBeTruthy();
    expect(screen.getByText('No points this time.')).toBeTruthy();
    fireEvent.click(button('Next post'));
    labelStep(TRAIN_POSTS.slice(1), 'Train the detector', () => 'Real');
    fireEvent.click(button('Teach it Taglish and Cebuano'));
    labelStep(LOCAL_POSTS, 'Retrain the detector', () => 'Real');
    expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy();
    expect(screen.getByText(/Better, but not perfect/)).toBeTruthy();
    fireEvent.click(button('Finish game'));
    expect(onComplete).toHaveBeenCalledWith(1);
  });
});
