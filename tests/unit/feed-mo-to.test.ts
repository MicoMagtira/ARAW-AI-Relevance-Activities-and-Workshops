import { describe, expect, it } from 'vitest';
import { STEP_MS } from '../../src/games/engine/loop';
import type { Action, InputFrame } from '../../src/games/engine/input';
import { createRng } from '../../src/games/engine/rng';
import type { GameInstance } from '../../src/games/engine/types';
import { CARD_X, CARD_Y, bubbleRadii, cardAt, layoutChips } from '../../src/games/feed-mo-to/art';
import feed, { buildRecap } from '../../src/games/feed-mo-to/feed';
import { TEMPLATES, buildPost, makeCandidates } from '../../src/games/feed-mo-to/posts';
import {
  BALANCED_BONUS,
  BALANCE_START,
  ENGAGEMENT_START,
  LIKEABLE,
  TOPICS,
  aliveCount,
  boredom,
  bubbleTopics,
  crashOf,
  evaluatePick,
  evaluateTimeout,
  freshWeights,
  gainFor,
  isBalanced,
  learn,
  pickMs,
  pipsFor,
  pointsFor,
  refreshMeters,
  topicById,
  type TopicId,
} from '../../src/games/feed-mo-to/rules';
import { OTHERS, TITA, createUserQueue } from '../../src/games/feed-mo-to/users';

const NONE: InputFrame = { actions: [], held: new Set(), taps: [], pointer: null };
const press = (...actions: Action[]): InputFrame => ({ ...NONE, actions });
const make = (seed: string): GameInstance => feed.create({ seed, rng: createRng(seed) });
const START = { engagement: ENGAGEMENT_START, balance: BALANCE_START };

function run(game: GameInstance, ms: number, input: InputFrame = NONE) {
  for (let t = 0; t < ms; t += STEP_MS) game.step(STEP_MS, t === 0 ? input : NONE);
}

/** A canvas context that accepts every call, to prove each phase draws without throwing. */
function fakeContext(): CanvasRenderingContext2D {
  const noop = () => undefined;
  return new Proxy({}, { get: (_t, prop) => (prop === 'measureText' ? () => ({ width: 8 }) : noop), set: () => true }) as unknown as CanvasRenderingContext2D;
}

describe('picks and meters', () => {
  it('a scary post wins the most clicks and costs the most balance', () => {
    const r = evaluatePick({ topic: 'scare', liked: false, previous: null, userIndex: 0, meters: START });
    expect(r.gain).toBe(24);
    expect(r.engagementDelta).toBe(24 - 8);
    expect(r.balanceDelta).toBe(-12);
    expect(r.meters).toEqual({ engagement: 76, balance: 78 });
    expect(r.points).toBe(Math.round(24 * 1.4));
  });

  it('repeating sensational posts costs extra balance and never bores the user', () => {
    const r = evaluatePick({ topic: 'scare', liked: false, previous: 'miracle', userIndex: 0, meters: START });
    expect(r.balanceDelta).toBe(-18);
    expect(gainFor('scare', false, 'scare')).toBe(24);
    expect(evaluatePick({ topic: 'miracle', liked: false, previous: 'miracle', userIndex: 0, meters: START }).balanceDelta).toBe(-16);
  });

  it('trusted health tips and new topics refill balance for fewer clicks', () => {
    const tip = evaluatePick({ topic: 'clinic', liked: false, previous: 'scare', userIndex: 0, meters: START });
    expect(tip.balanceDelta).toBe(14);
    expect(tip.engagementDelta).toBe(0);
    expect(evaluatePick({ topic: 'clinic', liked: true, previous: null, userIndex: 0, meters: START }).engagementDelta).toBe(6);
    expect(evaluatePick({ topic: 'sports', liked: false, previous: null, userIndex: 0, meters: START }).balanceDelta).toBe(8);
    expect(evaluatePick({ topic: 'food', liked: true, previous: null, userIndex: 0, meters: START }).balanceDelta).toBe(5);
  });

  it('a liked topic repeated twice bores the user (half the clicks, no balance gain)', () => {
    expect(gainFor('food', true, null)).toBe(12);
    expect(gainFor('food', true, 'food')).toBe(6);
    const r = evaluatePick({ topic: 'food', liked: true, previous: 'food', userIndex: 0, meters: START });
    expect(r.balanceDelta).toBe(0);
    expect(r.engagementDelta).toBe(6 - 8);
  });

  it('clamps meters to 0..100 and reports the crash', () => {
    const high = evaluatePick({ topic: 'scare', liked: false, previous: null, userIndex: 0, meters: { engagement: 95, balance: 95 } });
    expect(high.meters.engagement).toBe(100);
    const bubble = evaluatePick({ topic: 'scare', liked: false, previous: 'scare', userIndex: 0, meters: { engagement: 80, balance: 15 } });
    expect(bubble.meters.balance).toBe(0);
    expect(bubble.crash).toBe('bubble');
    const bored = evaluatePick({ topic: 'sports', liked: false, previous: null, userIndex: 0, meters: { engagement: 3, balance: 50 } });
    expect(bored.meters.engagement).toBe(0);
    expect(bored.crash).toBe('bored');
    expect(crashOf({ engagement: 0, balance: 0 })).toBe('bubble');
    expect(crashOf({ engagement: 1, balance: 1 })).toBeNull();
  });

  it('scoring multiplies clicks by a balance multiplier from 0.5 to 1.5', () => {
    expect(pointsFor(20, 0)).toBe(10);
    expect(pointsFor(20, 50)).toBe(20);
    expect(pointsFor(20, 100)).toBe(30);
  });

  it('boredom and the timer get harder with each user', () => {
    expect(boredom(0)).toBe(8);
    expect(boredom(2)).toBe(10);
    expect(boredom(99)).toBe(22);
    expect(pickMs(0)).toBe(9000);
    expect(pickMs(2)).toBe(8500);
    expect(pickMs(99)).toBe(6000);
  });

  it('running out of time costs 15 engagement and nothing else', () => {
    expect(evaluateTimeout(START)).toEqual({ meters: { engagement: 45, balance: 90 }, crash: null });
    expect(evaluateTimeout({ engagement: 10, balance: 50 }).crash).toBe('bored');
  });

  it('the bonus needs both meters above 50, and a new user gives some back', () => {
    expect(isBalanced({ engagement: 51, balance: 51 })).toBe(true);
    expect(isBalanced({ engagement: 50, balance: 90 })).toBe(false);
    expect(isBalanced({ engagement: 90, balance: 50 })).toBe(false);
    expect(refreshMeters({ engagement: 90, balance: 90 })).toEqual({ engagement: 100, balance: 100 });
    expect(refreshMeters({ engagement: 20, balance: 20 })).toEqual({ engagement: 35, balance: 40 });
  });

  it('predicts 1 to 3 click pips', () => {
    expect([pipsFor(24), pipsFor(20), pipsFor(12), pipsFor(8), pipsFor(2)]).toEqual([3, 3, 2, 1, 1]);
  });
});

describe('the bubble', () => {
  it('keeps every topic while the feed is balanced and one topic when it is a pure bubble', () => {
    expect(aliveCount(100)).toBe(TOPICS.length);
    expect(aliveCount(BALANCE_START)).toBe(TOPICS.length);
    expect(aliveCount(50)).toBe(5);
    expect(aliveCount(0)).toBe(1);
  });

  it('keeps the topics that were fed the most', () => {
    let w = freshWeights();
    for (let i = 0; i < 4; i++) w = learn(w, 'scare');
    w = learn(w, 'miracle');
    expect(bubbleTopics(w, 0, ['food'])).toEqual(['scare']);
    expect(bubbleTopics(w, 20, ['food'])).toEqual(['scare', 'miracle']);
    expect(bubbleTopics(freshWeights(), 100, [])).toHaveLength(8);
  });

  it('breaks ties in favour of what the user likes', () => {
    expect(bubbleTopics(freshWeights(), 12, ['sports'])).toEqual(['sports']);
  });

  it('lays chips out in rows that fit the panel, and the bubble gets smaller with fewer chips', () => {
    const all = layoutChips(TOPICS.map((t) => t.id));
    const one = layoutChips(['scare']);
    expect(all.w).toBeLessThanOrEqual(154);
    for (const p of all.pos.values()) expect(p.x).toBeGreaterThanOrEqual(150);
    expect(bubbleRadii(one.w, one.h).rx).toBeLessThan(bubbleRadii(all.w, all.h).rx);
  });
});

describe('posts', () => {
  it('every template fits the card (4 lines of 11 characters) and has a full text', () => {
    for (const topic of TOPICS) {
      for (let seed = 0; seed < 40; seed++) {
        const rng = createRng(`t-${seed}`);
        TEMPLATES[topic.id].forEach((template) => {
          const made = template(rng);
          expect(made.lines.length).toBeGreaterThanOrEqual(3);
          expect(made.lines.length).toBeLessThanOrEqual(4);
          for (const line of made.lines) expect(line.length).toBeLessThanOrEqual(11);
          expect(made.text.length).toBeGreaterThan(30);
        });
      }
    }
  });

  it('only scary and miracle-cure posts are fake; trusted health tips are never fake', () => {
    for (const topic of TOPICS) {
      const post = buildPost(topic.id, createRng(topic.id));
      expect(post.fake).toBe(topic.sensational);
    }
  });

  it('avoids repeating recent posts when it can', () => {
    const first = buildPost('clinic', createRng('a'));
    for (let i = 0; i < 20; i++) expect(buildPost('clinic', createRng(`r${i}`), new Set([first.key])).key).not.toBe(first.key);
  });

  it('offers 3 posts on 3 different topics: one sensational and one the user likes', () => {
    for (let i = 0; i < 300; i++) {
      const user = i % 2 === 0 ? TITA : (OTHERS[i % OTHERS.length] as (typeof OTHERS)[number]);
      const posts = makeCandidates({ user, userIndex: i % 8, rng: createRng(`c${i}`), recent: new Set() });
      expect(posts).toHaveLength(3);
      expect(new Set(posts.map((p) => p.topic)).size).toBe(3);
      expect(posts.some((p) => topicById(p.topic).sensational)).toBe(true);
      expect(posts.some((p) => user.interests.includes(p.topic))).toBe(true);
    }
  });

  it('offers a trusted tip often, and a second sensational post only from the 4th user on', () => {
    let tips = 0;
    let doubleEarly = 0;
    let doubleLate = 0;
    for (let i = 0; i < 400; i++) {
      const early = makeCandidates({ user: TITA, userIndex: 1, rng: createRng(`e${i}`), recent: new Set() });
      const late = makeCandidates({ user: TITA, userIndex: 5, rng: createRng(`e${i}`), recent: new Set() });
      tips += early.filter((p) => p.topic === 'clinic').length;
      doubleEarly += early.filter((p) => p.fake).length === 2 ? 1 : 0;
      doubleLate += late.filter((p) => p.fake).length === 2 ? 1 : 0;
    }
    expect(tips).toBeGreaterThan(120);
    expect(doubleEarly).toBe(0);
    expect(doubleLate).toBeGreaterThan(40);
  });

  it('is the same for the same seed', () => {
    const a = makeCandidates({ user: TITA, userIndex: 0, rng: createRng('same'), recent: new Set() });
    const b = makeCandidates({ user: TITA, userIndex: 0, rng: createRng('same'), recent: new Set() });
    expect(a).toEqual(b);
  });
});

describe('users', () => {
  it('starts with Tita Baby, never repeats back to back and has fitting names and interests', () => {
    const next = createUserQueue(createRng('q'));
    const seq = Array.from({ length: 40 }, () => next());
    expect(seq[0]).toBe(TITA);
    seq.slice(1).forEach((u, i) => expect(u).not.toBe(seq[i]));
    for (const u of [TITA, ...OTHERS]) {
      expect(u.name.length).toBeLessThanOrEqual(11);
      expect(u.interests).toHaveLength(3);
      for (const t of u.interests) expect(LIKEABLE).toContain(t);
    }
    expect(new Set(OTHERS.map((u) => u.id)).size).toBe(OTHERS.length);
  });
});

describe('Feed Mo To game', () => {
  const topicsOf = (description: string): TopicId[] =>
    [...description.matchAll(/Option \d, ([^:]+):/g)].map((m) => TOPICS.find((t) => t.name === m[1])?.id as TopicId);
  const highlighted = (description: string) => Number(/Highlighted: option (\d)/.exec(description)?.[1]) - 1;
  const phase = (game: GameInstance) => (game.stats().description.includes('Option 1,') ? 'choose' : 'other');

  /** Wait until the cards are on screen. */
  function toChoose(game: GameInstance) {
    for (let i = 0; i < 600 && phase(game) !== 'choose'; i++) game.step(STEP_MS, NONE);
  }

  /** Pick the card the policy likes, with the keyboard. Returns the topic picked. */
  function pickBy(game: GameInstance, choose: (topics: TopicId[], balance: number) => number): TopicId {
    toChoose(game);
    const d = game.stats().description;
    const topics = topicsOf(d);
    const want = choose(topics, game.stats().hud[2]?.meter ?? 0);
    let at = highlighted(d);
    while (at < want) {
      game.step(STEP_MS, press('right'));
      at += 1;
    }
    while (at > want) {
      game.step(STEP_MS, press('left'));
      at -= 1;
    }
    game.step(STEP_MS, press('act'));
    run(game, 2800); // result (and crash banner) screens
    return topics[want] as TopicId;
  }

  const greedy = (topics: TopicId[]) => Math.max(0, topics.findIndex((t) => topicById(t).sensational));
  const careful = (topics: TopicId[], balance: number) => {
    const scary = topics.findIndex((t) => topicById(t).sensational);
    const safe = topics.findIndex((t) => t === 'clinic');
    const other = topics.findIndex((t) => !topicById(t).sensational);
    return balance >= 75 ? scary : safe >= 0 ? safe : other;
  };

  it('starts on Tita Baby with 3 HUD stats, empty recap and an introduction', () => {
    const game = make('start');
    const s = game.stats();
    expect(s.over).toBe(false);
    expect(s.score).toBe(0);
    expect(s.hud.map((h) => h.id)).toEqual(['score', 'engagement', 'balance']);
    expect(s.hud[1]).toMatchObject({ value: '60%', meter: 60 });
    expect(s.hud[2]).toMatchObject({ value: '90%', meter: 90 });
    expect(s.description).toContain('tita baby');
    expect(s.description).toContain('food, family, showbiz');
    expect(s.recap).toEqual([]);
  });

  it('shows 3 options in words (with the full post text) once the intro is over', () => {
    const game = make('options');
    toChoose(game);
    const d = game.stats().description;
    expect(topicsOf(d)).toHaveLength(3);
    expect(d).toContain('Highlighted: option 2.');
    expect(d).toContain('Her feed still shows');
  });

  it('moves the highlight with left and right, and picks with act', () => {
    const game = make('keys');
    toChoose(game);
    game.step(STEP_MS, press('left'));
    expect(highlighted(game.stats().description)).toBe(0);
    game.step(STEP_MS, press('left'));
    expect(highlighted(game.stats().description)).toBe(0);
    game.step(STEP_MS, press('right', 'right', 'right'));
    expect(highlighted(game.stats().description)).toBe(2);
    game.step(STEP_MS, press('act'));
    expect(game.stats().description).toContain('You showed "');
  });

  it('picks a card by tap, and ignores taps outside the cards', () => {
    const game = make('tap');
    toChoose(game);
    game.step(STEP_MS, { ...NONE, taps: [{ x: 160, y: 10 }] });
    expect(game.stats().description).toContain('Option 1,');
    const y = CARD_Y + 20;
    expect(cardAt(CARD_X[2] + 10, y)).toBe(2);
    expect(cardAt(CARD_X[0] + 10, 5)).toBe(-1);
    game.step(STEP_MS, { ...NONE, taps: [{ x: CARD_X[2] + 10, y }] });
    expect(game.stats().description).toContain('You showed "');
  });

  it('reveals fake posts as fake and trusted tips as trusted, and moves the meters', () => {
    const scary = make('reveal-1');
    pickBy(scary, () => 0);
    const game = make('reveal-2');
    toChoose(game);
    const topics = topicsOf(game.stats().description);
    game.step(STEP_MS, press('left'));
    game.step(STEP_MS, press('act'));
    const d = game.stats().description;
    const first = topics[0] as TopicId;
    if (topicById(first).sensational) expect(d).toContain('This post is fake.');
    else if (first === 'clinic') expect(d).toContain('This is a trusted health tip.');
    expect(d).toMatch(/Engagement [+-]?\d+, Balanced Feed [+-]?\d+, \d+ points/);
  });

  it('the intro and the result can be skipped with a press, but not at once', () => {
    const game = make('skip');
    game.step(STEP_MS, press('act'));
    expect(phase(game)).toBe('other');
    run(game, 800);
    game.step(STEP_MS, press('act'));
    expect(phase(game)).toBe('choose');
  });

  it('running out of time makes her scroll away (engagement -15) and idle play ends bored', () => {
    const game = make('idle');
    toChoose(game);
    run(game, 9100);
    expect(game.stats().description).toContain('ran out of time');
    expect(game.stats().hud[1]?.meter).toBe(45);
    run(game, 120_000);
    const s = game.stats();
    expect(s.over).toBe(true);
    expect(s.recap.join(' ')).toContain('logged off, bored');
    expect(s.recap.join(' ')).toContain('4 times you ran out of time');
    expect(s.score).toBe(0);
  });

  it('only scary posts: the bubble pops (balance 0) within a few picks and the recap says why', () => {
    const game = make('greedy');
    let picks = 0;
    while (!game.stats().over && picks < 20) {
      pickBy(game, greedy);
      picks += 1;
    }
    const s = game.stats();
    expect(s.over).toBe(true);
    expect(picks).toBeLessThanOrEqual(7);
    expect(s.hud[2]?.meter).toBe(0);
    expect(s.score).toBeGreaterThan(0);
    const recap = s.recap.join('\n');
    expect(recap).toContain('filter bubble');
    expect(recap).toContain('Why scary health posts spread');
    expect(recap).toContain('How it works: a recommendation algorithm');
    expect(recap).toContain(`${picks} posts`);
  });

  it('mixing scary posts with trusted tips keeps both meters alive across several people and scores', () => {
    const game = make('careful');
    let picks = 0;
    while (!game.stats().over && picks < 30) {
      pickBy(game, careful);
      picks += 1;
    }
    const s = game.stats();
    expect(picks).toBe(30);
    expect(s.over).toBe(false);
    expect(s.score).toBeGreaterThan(500);
    expect(s.hud[2]?.meter).toBeGreaterThan(40);
  });

  it('gives the balanced bonus when a person ends with both meters above 50', () => {
    const game = make('bonus');
    for (let i = 0; i < 10; i++) pickBy(game, careful);
    const before = game.stats();
    expect(before.over).toBe(false);
    expect(before.description).toMatch(/is done!.*balanced feed bonus \+50/);
    expect(BALANCED_BONUS).toBe(50);
  });

  it('is fully decided by the seed: same seed and same picks give the same run', () => {
    const play = (seed: string) => {
      const game = make(seed);
      const log: string[] = [];
      for (let i = 0; i < 12; i++) {
        pickBy(game, careful);
        const s = game.stats();
        log.push(`${s.score}|${s.description}`);
      }
      return log;
    };
    expect(play('same-seed')).toEqual(play('same-seed'));
    expect(play('same-seed')).not.toEqual(play('other-seed'));
  });

  it('draws every phase without error', () => {
    const ctx = fakeContext();
    const game = make('draw');
    game.draw(ctx); // intro
    toChoose(game);
    game.draw(ctx); // choose
    game.step(STEP_MS, press('act'));
    game.draw(ctx); // result
    const bad = make('draw-over');
    let guard = 0;
    while (!bad.stats().over && guard++ < 20) pickBy(bad, greedy);
    bad.draw(ctx); // crash
    const bored = make('draw-bored');
    run(bored, 120_000);
    bored.draw(ctx);
    expect(bored.stats().over).toBe(true);
  });
});

describe('recap text', () => {
  it('explains algorithms, filter bubbles and why scary health posts spread, with tips', () => {
    const lines = buildRecap({ users: 1, posts: 1, scary: 1, trusted: 0, timeouts: 0, crash: 'bubble' });
    expect(lines[0]).toBe('You curated feeds for 1 person and showed 1 post: 1 scary or miracle-cure, 0 trusted health tips.');
    expect(lines.filter((l) => l.startsWith('Tip:'))).toHaveLength(2);
    expect(lines.join(' ')).toContain('Spreading fast does not make a post true.');
  });

  it('has the When should I trust it? takeaway and a five-page briefing', () => {
    expect(feed.briefing).toHaveLength(5);
    expect(feed.briefing[0]?.title).toBe('Today, YOU are the algorithm!');
    expect(feed.briefing[4]?.title).toBe('When should I trust it?');
    expect(feed.takeaway).toMatch(/^When should I trust it\?/);
  });
});
