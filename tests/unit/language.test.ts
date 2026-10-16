import { describe, expect, it } from 'vitest';
import { finishLanguage, initBoot, introStep, splashVisible } from '../../src/app/boot';
import { LANGUAGES, initLanguage, isLanguageCode, language, setLanguage } from '../../src/app/language';

describe('language setting', () => {
  it('offers English for now and validates codes', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en']);
    expect(isLanguageCode('en')).toBe(true);
    expect(isLanguageCode('fil')).toBe(false);
    expect(isLanguageCode(null)).toBe(false);
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
