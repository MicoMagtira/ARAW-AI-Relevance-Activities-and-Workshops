import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  episodeUnlocked,
  filterGlossary,
  filterMyths,
  groupByLetter,
  matchesQuery,
  parseEpisode,
  parseTab,
  stepPanel,
  swipeStep,
} from '../../src/app/library';
import { GLOSSARY } from '../../src/content/library/glossary';
import { KOMIKS } from '../../src/content/library/komiks';
import { MYTHS } from '../../src/content/library/myths';
import { ARA_MOOD_FOR, CAST_SPECS, SCENE_H, SCENE_W, castRects, charSize, propRects, rectPaths, sceneLayers, type Rect } from '../../src/ui/komiks/art';
import { KOMIKS_EXPRESSIONS, KOMIKS_PROPS, KOMIKS_SETTINGS, KOMIKS_TIMES } from '../../src/content/library/komiks';

describe('library routes', () => {
  it('parses the tab and falls back to Myths', () => {
    expect(parseTab('glossary')).toBe('glossary');
    expect(parseTab('komiks')).toBe('komiks');
    expect(parseTab('nope')).toBe('myths');
    expect(parseTab(undefined)).toBe('myths');
  });

  it('parses an episode number only when it is a whole number from 1', () => {
    expect(parseEpisode('3')).toBe(3);
    expect(parseEpisode('10')).toBe(10);
    for (const bad of [undefined, '', '0', '-1', '2.5', 'abc', '1e3', '12345']) expect(parseEpisode(bad)).toBeNull();
  });
});

describe('search and filters', () => {
  it('matches every word, ignoring case and accents', () => {
    expect(matchesQuery('', 'anything')).toBe(true);
    expect(matchesQuery('  ', 'anything')).toBe(true);
    expect(matchesQuery('TAWA dengue', 'Tawa-tawa cures dengue.')).toBe(true);
    expect(matchesQuery('tawa cancer', 'Tawa-tawa cures dengue.')).toBe(false);
    expect(matchesQuery('cafe', 'Café')).toBe(true);
  });

  it('filters myths by topic, trick and text together', () => {
    const all = filterMyths(MYTHS, { query: '', topic: 'all', villain: 'all' });
    expect(all).toHaveLength(MYTHS.length);
    const dengue = filterMyths(MYTHS, { query: '', topic: 'dengue', villain: 'all' });
    expect(dengue.length).toBeGreaterThan(0);
    expect(dengue.every((m) => m.topic === 'dengue')).toBe(true);
    const tricky = filterMyths(MYTHS, { query: '', topic: 'all', villain: 'miracle_mike' });
    expect(tricky.every((m) => m.villain === 'miracle_mike')).toBe(true);
    const found = filterMyths(MYTHS, { query: 'tawa-tawa', topic: 'all', villain: 'all' });
    expect(found.map((m) => m.id)).toContain('tawa-tawa-dengue');
    expect(filterMyths(MYTHS, { query: 'zzzzqqq', topic: 'all', villain: 'all' })).toEqual([]);
    expect(filterMyths(MYTHS, { query: 'tawa', topic: 'vaccines', villain: 'all' })).toEqual([]);
  });

  it('filters the glossary by term, meaning or example', () => {
    expect(filterGlossary(GLOSSARY, '')).toHaveLength(GLOSSARY.length);
    const hits = filterGlossary(GLOSSARY, 'deepfake');
    expect(hits.some((g) => g.term.toLowerCase() === 'deepfake')).toBe(true);
    expect(filterGlossary(GLOSSARY, 'zzzzqqq')).toEqual([]);
  });
});

describe('A to Z grouping', () => {
  it('groups under the first letter in alphabetical order', () => {
    const groups = groupByLetter(GLOSSARY);
    const letters = groups.map((g) => g.letter);
    expect(letters).toEqual([...letters].sort());
    expect(new Set(letters).size).toBe(letters.length);
    for (const g of groups) {
      expect(ALPHABET).toContain(g.letter);
      expect(g.terms.every((term) => term.term[0]?.toUpperCase() === g.letter)).toBe(true);
    }
    expect(groups.reduce((n, g) => n + g.terms.length, 0)).toBe(GLOSSARY.length);
  });

  it('sorts terms inside a letter and handles an empty list', () => {
    for (const g of groupByLetter(GLOSSARY)) {
      const names = g.terms.map((term) => term.term.toLowerCase());
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    }
    expect(groupByLetter([])).toEqual([]);
  });
});

describe('Komiks unlocking and navigation', () => {
  it('episode N opens only when module N is done', () => {
    const ep3 = KOMIKS.find((e) => e.n === 3);
    if (!ep3) throw new Error('episode 3 missing');
    expect(episodeUnlocked(ep3, [])).toBe(false);
    expect(episodeUnlocked(ep3, ['m01', 'm02'])).toBe(false);
    expect(episodeUnlocked(ep3, ['m03'])).toBe(true);
  });

  it('steps through panels without leaving the episode', () => {
    expect(stepPanel(0, -1, 5)).toBe(0);
    expect(stepPanel(0, 1, 5)).toBe(1);
    expect(stepPanel(4, 1, 5)).toBe(4);
    expect(stepPanel(2, 1, 5)).toBe(3);
  });

  it('reads a swipe: sideways and long enough, not a scroll', () => {
    expect(swipeStep(-80, 0)).toBe(1);
    expect(swipeStep(80, 5)).toBe(-1);
    expect(swipeStep(-20, 0)).toBe(0);
    expect(swipeStep(-60, 70)).toBe(0);
    expect(swipeStep(0, 0)).toBe(0);
  });
});

describe('Komiks art', () => {
  const inside = (r: Rect, w: number, h: number) => r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= w && r[1] + r[3] <= h && r[2] > 0 && r[3] > 0;

  it('draws every setting at every time inside the 96x60 scene', () => {
    for (const setting of KOMIKS_SETTINGS) {
      for (const time of KOMIKS_TIMES) {
        const { back, front } = sceneLayers(setting, time);
        expect(back.length).toBeGreaterThan(0);
        for (const layer of [...back, ...front]) expect(layer.rects.every((r) => inside(r, SCENE_W, SCENE_H))).toBe(true);
      }
    }
  });

  it('puts the dinner table in front of the cast and tints evening and night', () => {
    expect(sceneLayers('dinner_table', 'day').front).toHaveLength(1);
    expect(sceneLayers('sala', 'day').front).toHaveLength(0);
    expect(sceneLayers('sala', 'day').back).toHaveLength(1);
    expect(sceneLayers('sala', 'evening').back[1]?.opacity).toBeGreaterThan(0);
    expect(sceneLayers('sala', 'night').back[1]?.opacity).toBeGreaterThan(0.3);
  });

  it('draws every prop inside the scene, floor props in front and wall props behind', () => {
    for (const p of KOMIKS_PROPS) {
      const { behind, front } = propRects([p]);
      expect(behind.length + front.length).toBeGreaterThan(0);
      expect([...behind, ...front].every((r) => inside(r, SCENE_W, SCENE_H))).toBe(true);
    }
    expect(propRects(['moon']).behind.length).toBeGreaterThan(0);
    expect(propRects(['phone']).front.length).toBeGreaterThan(0);
  });

  it('gives every cast member a face for every expression, inside the 16x16 sprite', () => {
    for (const who of Object.keys(CAST_SPECS) as Array<keyof typeof CAST_SPECS>) {
      const faces = new Set<string>();
      for (const e of KOMIKS_EXPRESSIONS) {
        const rects = castRects(who, e);
        expect(rects.every((r) => inside(r, 16, 16))).toBe(true);
        faces.add(JSON.stringify(rects));
      }
      expect(faces.size).toBeGreaterThan(6); // the faces differ, not one face for everything
    }
  });

  it('maps every expression to an Ara mood and scales characters by head count', () => {
    for (const e of KOMIKS_EXPRESSIONS) expect(ARA_MOOD_FOR[e]).toBeTruthy();
    expect(charSize(1)).toBeGreaterThan(charSize(2));
    expect(charSize(2)).toBeGreaterThan(charSize(3));
    expect(charSize(3) * 3).toBeLessThanOrEqual(SCENE_W);
  });

  it('groups rects into one path per colour', () => {
    const paths = rectPaths([[0, 0, 1, 1, '#111'], [2, 0, 1, 1, '#111'], [0, 1, 1, 1, '#222']]);
    expect(paths).toHaveLength(2);
    expect(paths[0]?.d).toContain('M0 0');
  });

  it('every real panel can be drawn', () => {
    for (const ep of KOMIKS) {
      for (const panel of ep.panels) {
        sceneLayers(panel.setting, panel.time);
        propRects(panel.props);
        for (const c of panel.characters) if (c.who !== 'ara') castRects(c.who, c.expression);
      }
    }
  });
});
