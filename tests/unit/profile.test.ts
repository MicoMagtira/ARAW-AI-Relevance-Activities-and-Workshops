import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AVATARS, AVATAR_COUNT, avatarPaths, avatarRects, safeAvatarIndex } from '../../src/ui/avatars';

const KEY = 'araw:v1:profile';

/** Load a fresh copy of the state module, as after a page reload. */
async function freshState() {
  vi.resetModules();
  return import('../../src/app/state');
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('avatars', () => {
  it('has at least six inclusive avatars including lola, hijab and wheelchair user', () => {
    expect(AVATAR_COUNT).toBeGreaterThanOrEqual(6);
    const ids = AVATARS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['lola', 'hijab', 'wheelchair']));
    expect(AVATARS.every((a) => a.label.length > 5)).toBe(true);
    expect(new Set(AVATARS.map((a) => a.skin)).size).toBeGreaterThanOrEqual(5);
  });

  it('draws every avatar inside the 16x16 grid with a face', () => {
    for (const a of AVATARS) {
      const rects = avatarRects(a);
      expect(rects.length).toBeGreaterThan(8);
      for (const [x, y, w, h, colour] of rects) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + w).toBeLessThanOrEqual(16);
        expect(y + h).toBeLessThanOrEqual(16);
        expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
      }
      expect(avatarPaths(a).length).toBeGreaterThan(2);
    }
  });

  it('clamps bad indexes to the first avatar', () => {
    expect(safeAvatarIndex(2)).toBe(2);
    expect(safeAvatarIndex(-1)).toBe(0);
    expect(safeAvatarIndex(AVATAR_COUNT)).toBe(0);
    expect(safeAvatarIndex(1.5)).toBe(0);
    expect(safeAvatarIndex(Number.NaN)).toBe(0);
  });
});

describe('profile persistence', () => {
  it('saves the chosen avatar and nickname and restores them after a reload', async () => {
    const first = await freshState();
    first.setAvatar(3);
    first.setNickname('Lola Bea');
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? '{}')).toEqual({ nickname: 'Lola Bea', avatar: 3 });

    const second = await freshState();
    expect(second.profile.value).toEqual({ nickname: 'Lola Bea', avatar: 3 });
  });

  it('ignores out-of-range avatars and caps the nickname at 20 characters', async () => {
    const s = await freshState();
    s.setAvatar(AVATAR_COUNT);
    s.setAvatar(-2);
    expect(s.profile.value.avatar).toBe(0);
    s.setNickname('x'.repeat(40));
    expect(s.profile.value.nickname).toHaveLength(20);
  });

  it('falls back to the defaults when stored data is invalid', async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ nickname: 'Bea', avatar: 99 }));
    const s = await freshState();
    expect(s.profile.value).toEqual({ nickname: 'Kaibigan', avatar: 0 });
  });

  it('shows Kaibigan when the nickname is empty', async () => {
    const s = await freshState();
    s.setNickname('   ');
    expect(s.displayName()).toBe('Kaibigan');
    s.setNickname(' Bea ');
    expect(s.displayName()).toBe('Bea');
  });
});
