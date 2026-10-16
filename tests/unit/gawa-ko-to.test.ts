// Gawa Ko 'To! (T22): the part bank, how briefs are built, how a published poster is checked and scored, and the SVG helpers.
import { describe, expect, it } from 'vitest';
import { PICTURES, TOPICS, topicById } from '../../src/games/gawa-ko-to/parts';
import { bitsPath, describePoster } from '../../src/games/gawa-ko-to/Poster';
import {
  EMPTY_POSTER,
  POINTS,
  REQUIREMENT_TEXT,
  buildBrief,
  buildModuleBriefs,
  evaluate,
  replyFor,
  secondsFor,
  starsFor,
  wrap,
  type Brief,
  type Poster,
} from '../../src/games/gawa-ko-to/rules';

const brief = (over: Partial<Brief> = {}): Brief => ({ n: 1, topic: 'dengue', requirements: [], neighborSays: 'yes', seconds: null, ...over });
const poster = (over: Partial<Poster> = {}): Poster => ({ ...EMPTY_POSTER, slogan: 'dengue-s1', fact: 'dengue-f1', ...over });
const status = (p: Poster, b: Brief = brief()) => Object.fromEntries(evaluate(p, b).checks.map((c) => [c.id, c.status]));

describe('the part bank', () => {
  it('has the five pictures from SPEC and eight topics', () => {
    expect(PICTURES.map((p) => p.id)).toEqual(['ai', 'stock', 'neighbor', 'artist', 'ai-doctor']);
    expect(TOPICS).toHaveLength(8);
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(8);
  });

  it('gives every topic 3 slogans (one AI-written) and 4 facts (2 true, 2 tempting wrong ones) with a basis', () => {
    for (const t of TOPICS) {
      expect(t.slogans, t.id).toHaveLength(3);
      expect(t.slogans.filter((s) => s.ai), t.id).toHaveLength(1);
      expect(t.facts, t.id).toHaveLength(4);
      expect(t.facts.filter((f) => f.ok), t.id).toHaveLength(2);
      expect(t.basis.length, t.id).toBeGreaterThan(20);
      expect(t.title.length, t.id).toBeLessThanOrEqual(24);
      for (const f of t.facts) expect(f.why.length, f.id).toBeGreaterThan(20);
    }
    const ids = TOPICS.flatMap((t) => [...t.slogans.map((s) => s.id), ...t.facts.map((f) => f.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('fits every slogan and fact on the poster, and gives no dosing', () => {
    for (const t of TOPICS) {
      for (const s of t.slogans) expect(wrap(s.text, 22).length, s.id).toBeLessThanOrEqual(2);
      for (const f of t.facts) {
        expect(wrap(f.text, 38).length, f.id).toBeLessThanOrEqual(3);
        expect(`${f.text} ${f.why}`, f.id).not.toMatch(/\b\d+\s?(mg|ml|tablets?|capsules?)\b/i);
      }
    }
  });

  it('looks a topic up and falls back to the first', () => {
    expect(topicById('tb').title).toBe('COUGH CHECK');
    expect(topicById('nope').id).toBe('dengue');
  });
});

describe('briefs', () => {
  it('builds the same brief for the same seed and a different set for another', () => {
    expect(buildBrief('s', 3)).toEqual(buildBrief('s', 3));
    const a = [1, 2, 3, 4, 5, 6].map((n) => JSON.stringify(buildBrief('a', n)));
    const b = [1, 2, 3, 4, 5, 6].map((n) => JSON.stringify(buildBrief('b', n)));
    expect(a).not.toEqual(b);
  });

  it('never repeats a topic inside a cycle of eight', () => {
    const topics = Array.from({ length: 8 }, (_, i) => buildBrief('seed', i + 1).topic);
    expect(new Set(topics).size).toBe(8);
    expect(buildBrief('seed', 9).topic).toBe(topics[0]);
  });

  it('opens with an AI-picture brief, then asks for more as the run goes on', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      expect(buildBrief(seed, 1).requirements).toEqual(['ai-picture']);
      expect(buildBrief(seed, 2).requirements.length).toBe(1);
      expect(buildBrief(seed, 3).requirements.every((r) => r in REQUIREMENT_TEXT)).toBe(true);
    }
    const slogan = Array.from({ length: 200 }, (_, i) => buildBrief('many', 4 + (i % 20))).filter((b) => b.requirements.includes('ai-slogan'));
    expect(slogan.length).toBeGreaterThan(10);
    expect(Array.from({ length: 3 }, (_, i) => buildBrief('many', i + 1)).some((b) => b.requirements.includes('ai-slogan'))).toBe(false);
  });

  it('lets a required neighbour say yes, but an optional one sometimes says no', () => {
    const all = Array.from({ length: 300 }, (_, i) => buildBrief(`n${i}`, 2 + (i % 9)));
    for (const b of all.filter((x) => x.requirements.includes('neighbor'))) expect(b.neighborSays).toBe('yes');
    expect(all.some((b) => b.neighborSays === 'no')).toBe(true);
  });

  it('shrinks the clock to a floor of 40 seconds', () => {
    expect(secondsFor(1)).toBe(90);
    expect(secondsFor(5)).toBe(70);
    expect(secondsFor(100)).toBe(40);
    expect(buildBrief('x', 4).seconds).toBe(secondsFor(4));
  });

  it('builds three module briefs that teach each lesson once, with no timer and distinct topics', () => {
    for (const seed of ['a', 'b', 'c', 'unit']) {
      const briefs = buildModuleBriefs(seed);
      expect(briefs).toHaveLength(3);
      expect(briefs.map((b) => b.requirements[0]).sort()).toEqual(['ai-picture', 'artist', 'neighbor']);
      expect(new Set(briefs.map((b) => b.topic)).size).toBe(3);
      expect(briefs.every((b) => b.seconds === null && b.neighborSays === 'yes')).toBe(true);
      expect(buildModuleBriefs(seed)).toEqual(briefs);
    }
  });
});

describe('checking a poster', () => {
  it('reports an AI picture with no label, and passes it once labelled', () => {
    const bare = evaluate(poster({ picture: 'ai' }), brief());
    expect(bare.reported).toBe(true);
    expect(bare.checks.find((c) => c.id === 'label')?.report).toMatch(/AI-made/);
    const labelled = evaluate(poster({ picture: 'ai', label: true }), brief());
    expect(labelled.reported).toBe(false);
    expect(status(poster({ picture: 'ai', label: true })).label).toBe('pass');
  });

  it('also needs the label for an AI-written slogan', () => {
    expect(status(poster({ picture: 'stock', slogan: 'dengue-s3' })).label).toBe('fail');
    expect(status(poster({ picture: 'stock', slogan: 'dengue-s3', label: true })).label).toBe('pass');
  });

  it('does not need a label when nothing is AI-made, and says so', () => {
    const ev = evaluate(poster({ picture: 'stock', label: true }), brief());
    expect(ev.checks.find((c) => c.id === 'label')).toMatchObject({ status: 'na' });
    expect(ev.reported).toBe(false);
  });

  it('asks consent for a neighbour: not asking and being told no are both reported', () => {
    expect(status(poster({ picture: 'neighbor' })).consent).toBe('fail');
    expect(status(poster({ picture: 'neighbor', asked: true })).consent).toBe('pass');
    const no = brief({ neighborSays: 'no' });
    expect(status(poster({ picture: 'neighbor', asked: true }), no).consent).toBe('fail');
    expect(evaluate(poster({ picture: 'neighbor', asked: true }), no).reported).toBe(true);
  });

  it('always reports an AI picture of a real doctor, with the FAKE stamp, even if labelled and "asked"', () => {
    const ev = evaluate(poster({ picture: 'ai-doctor', label: true, asked: true }), brief());
    expect(ev.reported).toBe(true);
    expect(ev.fake).toBe(true);
    expect(ev.checks.find((c) => c.id === 'consent')?.status).toBe('fail');
    expect(ev.checks.find((c) => c.id === 'label')?.status).toBe('pass');
  });

  it('credits an artist, or the artist reports the poster', () => {
    expect(status(poster({ picture: 'artist' })).credit).toBe('fail');
    expect(status(poster({ picture: 'artist', credit: true })).credit).toBe('pass');
    expect(status(poster({ picture: 'stock' })).credit).toBe('na');
  });

  it('reports a wrong or missing health fact and stamps the wrong one FAKE', () => {
    const wrong = evaluate(poster({ picture: 'stock', fact: 'dengue-f3' }), brief());
    expect(wrong.reported).toBe(true);
    expect(wrong.fake).toBe(true);
    expect(wrong.checks.find((c) => c.id === 'fact')?.note).toMatch(/No home drink cures dengue/);
    const none = evaluate(poster({ picture: 'stock', fact: null }), brief());
    expect(none.reported).toBe(true);
    expect(none.fake).toBe(false);
  });

  it('checks the brief, but missing it does not get a poster reported', () => {
    const b = brief({ requirements: ['artist', 'ai-slogan'] });
    expect(status(poster({ picture: 'artist', credit: true, slogan: 'dengue-s3', label: true }), b).brief).toBe('pass');
    const miss = evaluate(poster({ picture: 'stock' }), b);
    expect(miss.checks.find((c) => c.id === 'brief')?.status).toBe('fail');
    expect(miss.reported).toBe(false);
    expect(status(poster({ picture: 'stock' })).brief).toBe('na');
  });

  it('scores 100 per honest check, 50 for the brief, 40 tidy and up to 50 for speed; a reported poster keeps only its passes', () => {
    expect(evaluate(poster({ picture: 'stock' }), brief()).points).toBe(POINTS.honest + POINTS.tidy);
    const b = brief({ requirements: ['neighbor'], seconds: 90 });
    const full = evaluate(poster({ picture: 'neighbor', asked: true }), b, 90);
    expect(full.points).toBe(2 * POINTS.honest + POINTS.brief + POINTS.tidy + POINTS.speedMax);
    expect(evaluate(poster({ picture: 'neighbor', asked: true }), b, 45).points).toBe(2 * POINTS.honest + POINTS.brief + POINTS.tidy + 25);
    const reported = evaluate(poster({ picture: 'neighbor' }), b, 90);
    expect(reported.reported).toBe(true);
    expect(reported.points).toBe(POINTS.honest + POINTS.brief);
  });

  it('treats a blank poster (time ran out) as reported', () => {
    expect(evaluate(EMPTY_POSTER, brief()).reported).toBe(true);
  });

  it('gives each honesty failure a reporter line', () => {
    const checks = evaluate(poster({ picture: 'ai-doctor', fact: 'dengue-f4' }), brief()).checks.filter((c) => c.status === 'fail');
    expect(checks.length).toBeGreaterThanOrEqual(3);
    for (const c of checks) expect(c.report?.length ?? 0, c.id).toBeGreaterThan(10);
  });
});

describe('small helpers', () => {
  it('lets only a real person answer when asked', () => {
    expect(replyFor('neighbor', brief())).toMatchObject({ name: 'Mang Rey', yes: true });
    expect(replyFor('neighbor', brief({ neighborSays: 'no' }))).toMatchObject({ yes: false });
    expect(replyFor('ai-doctor', brief())).toMatchObject({ name: 'Dr. Lim', yes: false });
    expect(replyFor('stock', brief())).toBeNull();
    expect(replyFor(null, brief())).toBeNull();
  });

  it('gives stars from the share of honest posters', () => {
    expect(starsFor(3, 3)).toBe(3);
    expect(starsFor(2, 3)).toBe(2);
    expect(starsFor(1, 3)).toBe(1);
    expect(starsFor(0, 3)).toBe(1);
    expect(starsFor(0, 0)).toBe(1);
  });

  it('wraps text greedily and keeps a long word whole', () => {
    expect(wrap('No water, no mosquitoes!', 22)).toEqual(['No water, no', 'mosquitoes!']);
    expect(wrap('Supercalifragilistic word', 5)).toEqual(['Supercalifragilistic', 'word']);
    expect(wrap('', 10)).toEqual([]);
  });

  it('draws bitmaps as merged runs', () => {
    expect(bitsPath(['##.#', '....'], 10, 20, 2)).toBe('M10 20h4v2h-4zM16 20h2v2h-2z');
  });

  it('describes the poster for screen readers as it fills up', () => {
    const b = brief();
    expect(describePoster(EMPTY_POSTER, b)).toMatch(/No picture yet\. No slogan yet\. No health fact yet\./);
    const full = describePoster(poster({ picture: 'artist', label: true, credit: true }), b);
    expect(full).toMatch(/Picture: Ate Dani/);
    expect(full).toMatch(/Slogan: No water, no mosquitoes!/);
    expect(full).toMatch(/Sticker: Made with AI\. Credit: Art by Ate Dani\./);
  });
});
