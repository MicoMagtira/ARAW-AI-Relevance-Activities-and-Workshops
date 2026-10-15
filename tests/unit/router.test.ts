import { afterEach, describe, expect, it } from 'vitest';
import { hrefFor, location$, matchRoute, navigate, parseHash, startRouter } from '../../src/app/router';

describe('parseHash', () => {
  it('treats empty and "#/" as the root', () => {
    expect(parseHash('').path).toBe('/');
    expect(parseHash('#').path).toBe('/');
    expect(parseHash('#/').segments).toEqual([]);
  });

  it('splits segments and ignores trailing slashes', () => {
    const p = parseHash('#/learn/m01/');
    expect(p.path).toBe('/learn/m01');
    expect(p.segments).toEqual(['learn', 'm01']);
  });

  it('parses the query string', () => {
    const p = parseHash('#/report?screen=home&item=card%201');
    expect(p.path).toBe('/report');
    expect(p.query).toEqual({ screen: 'home', item: 'card 1' });
  });

  it('survives malformed escapes', () => {
    expect(parseHash('#/%E0%A4%A').segments).toEqual(['%E0%A4%A']);
  });
});

describe('hrefFor', () => {
  it('builds hash links and drops empty query values', () => {
    expect(hrefFor('/')).toBe('#/');
    expect(hrefFor('learn')).toBe('#/learn');
    expect(hrefFor('/report', { screen: 'home', item: undefined })).toBe('#/report?screen=home');
  });
});

describe('matchRoute', () => {
  it('matches every tab route and highlights its tab', () => {
    for (const [hash, name, tab] of [
      ['#/', 'home', 'home'],
      ['#/learn', 'learn', 'learn'],
      ['#/arcade', 'arcade', 'arcade'],
      ['#/library', 'library', 'library'],
      ['#/me', 'me', 'me'],
    ] as const) {
      const m = matchRoute(parseHash(hash));
      expect(m.def.name).toBe(name);
      expect(m.def.tab).toBe(tab);
    }
  });

  it('matches report and about without a tab', () => {
    expect(matchRoute(parseHash('#/report?screen=me')).def.tab).toBeUndefined();
    expect(matchRoute(parseHash('#/about')).def.name).toBe('about');
  });

  it('falls back to Not Found for unknown routes', () => {
    expect(matchRoute(parseHash('#/nope')).def.name).toBe('notFound');
    expect(matchRoute(parseHash('#/learn/m99/extra')).def.name).toBe('notFound');
  });

  it('extracts :param segments from a custom table', () => {
    const table = [{ name: 'learn', pattern: '/learn/:id', titleKey: 'title.learn' }] as const;
    expect(matchRoute(parseHash('#/learn/m03'), table).params).toEqual({ id: 'm03' });
  });
});

describe('startRouter', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('syncs the location signal on hashchange and navigate()', async () => {
    const stop = startRouter();
    navigate('/arcade');
    await new Promise((r) => setTimeout(r, 20));
    expect(location$.value.path).toBe('/arcade');
    stop();
    navigate('/me');
    await new Promise((r) => setTimeout(r, 20));
    expect(location$.value.path).toBe('/arcade');
  });
});
