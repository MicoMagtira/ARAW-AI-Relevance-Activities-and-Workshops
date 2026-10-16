import { describe, expect, it } from 'vitest';
import { finishLanguage, initBoot, introStep, splashVisible } from '../../src/app/boot';
import { LANGUAGES, initLanguage, isLanguageCode, language, setLanguage } from '../../src/app/language';
import { t } from '../../src/app/i18n';
import { hasPack, loadPack, tx } from '../../src/i18n/runtime';

describe('language setting', () => {
  it('offers English plus every language that has a pack, and validates codes', () => {
    const codes = LANGUAGES.map((l) => l.code);
    expect(codes[0]).toBe('en');
    for (const c of codes) expect(hasPack(c)).toBe(true);
    expect(isLanguageCode('en')).toBe(true);
    expect(isLanguageCode('xx')).toBe(false);
    expect(isLanguageCode(null)).toBe(false);
  });

  it('a pack translates UI strings, inserted words and quoted lines, and falls back to English', async () => {
    if (!hasPack('fil')) return;
    await loadPack('fil', false);
    expect(t('nav.learn')).not.toBe('Learn');
    expect(tx('A sentence that is not in any pack.')).toBe('A sentence that is not in any pack.');
    const learn = tx('Learn');
    expect(tx('"Learn"')).toBe(`"${learn}"`);
    await loadPack('en', false);
    expect(t('nav.learn')).toBe('Learn');
  });

  it('starts unpicked, saves the choice and keeps <html lang> in step', () => {
    language.value = null;
    const root = document.createElement('html');
    const stop = initLanguage(root);
    expect(root.lang).toBe('en'); // English until a choice is made
    setLanguage('en');
    expect(language.value).toBe('en');
    expect(window.localStorage.getItem('araw:v1:language')).toBe('"en"');
    stop();
  });
});

describe('intro steps', () => {
  it('a first visit at Home shows the language landing, then the sunrise splash', () => {
    window.sessionStorage.clear();
    initBoot('/');
    expect(splashVisible.value).toBe(true);
    expect(introStep.value).toBe('language');
    finishLanguage();
    expect(introStep.value).toBe('sunrise');
    expect(splashVisible.value).toBe(true);
  });

  it('a deep link skips the whole intro', () => {
    window.sessionStorage.clear();
    initBoot('/learn');
    expect(splashVisible.value).toBe(false);
  });
});
