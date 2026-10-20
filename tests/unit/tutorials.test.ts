import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  captionSrc,
  defaultTutorialLang,
  formatDuration,
  formatMb,
  hasTutorial,
  openTutorial,
  parseVtt,
  setTutorialManifest,
  tutorialLangs,
  tutorialOpen,
  videoSrc,
} from '../../src/app/tutorials';
import { EN_STRINGS } from '../../src/app/i18n';
import { TUTORIALS, TUTORIAL_CAPTIONS } from '../../src/content/tutorials';
import { ARCADE_GAMES } from '../../src/content/games';
import manifestJson from '../../src/content/tutorialManifest.json';

const real = manifestJson as Parameters<typeof setTutorialManifest>[0];
afterEach(() => {
  setTutorialManifest(real);
  tutorialOpen.value = null;
});

describe('tutorial list', () => {
  it('has the tour, Fact or Fake and every arcade game, each once', () => {
    const ids = TUTORIALS.map((tut) => tut.id);
    expect(ids[0]).toBe('tour');
    expect(ids).toContain('fact-or-fake');
    for (const g of ARCADE_GAMES) expect(ids).toContain(g.slug);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('manifest helpers', () => {
  it('lists recorded languages in picker order and picks the app language, then English', () => {
    setTutorialManifest({ 'takbo-data': { hil: { s: 30, kb: 700 }, en: { s: 31, kb: 720 }, fil: { s: 30, kb: 710 } } });
    expect(tutorialLangs('takbo-data')).toEqual(['en', 'fil', 'hil']);
    expect(defaultTutorialLang('takbo-data', 'fil')).toBe('fil');
    expect(defaultTutorialLang('takbo-data', 'ceb')).toBe('en');
    expect(defaultTutorialLang('tour', 'fil')).toBeNull();
    expect(hasTutorial('tour')).toBe(false);
  });

  it('opens only clips that exist', () => {
    setTutorialManifest({ tour: { en: { s: 60, kb: 2000 } } });
    openTutorial('takbo-data');
    expect(tutorialOpen.value).toBeNull();
    openTutorial('tour');
    expect(tutorialOpen.value).toBe('tour');
  });

  it('builds relative file paths (static hosting under any base path)', () => {
    expect(videoSrc('tour', 'ceb')).toBe('videos/tour/ceb.webm');
    expect(captionSrc('objection', 'en')).toBe('videos/objection/en.vtt');
  });

  it('formats lengths and sizes for people', () => {
    expect(formatDuration(25)).toBe('0:25');
    expect(formatDuration(72.4)).toBe('1:12');
    expect(formatMb(840)).toBe('0.8');
    expect(formatMb(2600)).toBe('2.5');
    expect(formatMb(10)).toBe('0.1');
  });
});

describe('parseVtt', () => {
  it('returns the caption text of every cue, in order, without tags or cue numbers', () => {
    const vtt = 'WEBVTT\r\n\r\n1\r\n00:00:00.000 --> 00:00:02.200\r\nHow to play\r\n\r\n2\r\n00:00:02.200 --> 00:00:06.000\r\nPress <b>Space</b>\r\nto jump.\r\n';
    expect(parseVtt(vtt)).toEqual(['How to play', 'Press Space to jump.']);
    expect(parseVtt('')).toEqual([]);
  });
});

// ---------- the recorded clips ----------
const root = process.cwd();
const packs = Object.fromEntries(['fil', 'ceb', 'ilo', 'hil'].map((l) => [l, JSON.parse(readFileSync(resolve(root, `src/i18n/packs/${l}.json`), 'utf8')) as Record<string, string>]));

describe('storyboards', () => {
  const boardDir = resolve(root, 'scripts/tutorials/boards');
  const files = readdirSync(boardDir).filter((f) => f.endsWith('.mjs'));

  it('exist only for known clips', () => {
    const ids = new Set<string>(TUTORIALS.map((tut) => tut.id));
    for (const f of files) expect(ids.has(f.replace(/\.mjs$/, '')), f).toBe(true);
  });

  it('use only captions that every language pack translates', async () => {
    const missing: string[] = [];
    for (const f of files) {
      const board = (await import(pathToFileURL(resolve(boardDir, f)).href)).default as {
        beats?: Array<{ caption?: string }>;
        timeline?: Array<{ caption?: string }>;
      };
      const captions = [...(board.beats ?? []), ...(board.timeline ?? [])].map((s) => s.caption).filter((c): c is string => !!c);
      for (const c of captions) {
        const english = (EN_STRINGS as Record<string, string>)[c] ?? c;
        for (const [lang, pack] of Object.entries(packs)) if (!pack[english]) missing.push(`${f} ${lang}: ${english}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('the video captions themselves are translated', () => {
    for (const text of Object.values(TUTORIAL_CAPTIONS)) for (const pack of Object.values(packs)) expect(pack[text], text).toBeTruthy();
  });
});

describe('manifest', () => {
  it('points at files that exist, within the size budget', () => {
    for (const [id, clips] of Object.entries(real)) {
      for (const [lang, info] of Object.entries(clips ?? {})) {
        const webm = resolve(root, 'public', videoSrc(id as never, lang as never));
        const vtt = resolve(root, 'public', captionSrc(id as never, lang as never));
        expect(readFileSync(vtt, 'utf8').startsWith('WEBVTT'), `${id}/${lang}.vtt`).toBe(true);
        expect(readFileSync(webm).byteLength, `${id}/${lang}.webm`).toBeGreaterThan(10_000);
        expect(info?.kb ?? 0, `${id}/${lang}`).toBeLessThanOrEqual(id === 'tour' ? 3000 : 1300);
      }
    }
  });
});
