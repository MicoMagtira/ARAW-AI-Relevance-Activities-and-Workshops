import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BOOT_KEY, finishSplash, hasBooted, initBoot, splashVisible } from '../../src/app/boot';

beforeEach(() => {
  window.sessionStorage.clear();
  splashVisible.value = false;
  window.location.hash = '';
});
afterEach(() => window.sessionStorage.clear());

describe('boot flow', () => {
  it('shows the splash on the first visit to Home', () => {
    initBoot('/');
    expect(splashVisible.value).toBe(true);
    expect(hasBooted()).toBe(false);
  });

  it('skips it for deep links and remembers that for the session', () => {
    initBoot('/learn');
    expect(splashVisible.value).toBe(false);
    expect(window.sessionStorage.getItem(BOOT_KEY)).toBe('1');
    initBoot('/');
    expect(splashVisible.value).toBe(false);
  });

  it('START hides the splash, marks the session and lands on Home', () => {
    initBoot('/');
    finishSplash();
    expect(splashVisible.value).toBe(false);
    expect(hasBooted()).toBe(true);
    expect(window.location.hash).toBe('#/');
  });
});
