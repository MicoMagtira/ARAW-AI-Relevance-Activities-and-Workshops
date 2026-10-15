import { describe, expect, it } from 'vitest';
import { STORAGE_PREFIX, createStorage, persisted, resetAll } from '../../src/app/store';

class FakeStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

class BlockedStorage extends FakeStorage {
  override getItem(): string | null {
    throw new Error('blocked');
  }
  override setItem(): void {
    throw new Error('quota');
  }
  override removeItem(): void {
    throw new Error('blocked');
  }
}

describe('createStorage', () => {
  it('writes and reads versioned keys', () => {
    const backend = new FakeStorage();
    const s = createStorage(() => backend);
    s.write('xp', 40);
    expect(backend.getItem(`${STORAGE_PREFIX}xp`)).toBe('40');
    expect(STORAGE_PREFIX).toBe('araw:v1:');
    expect(s.read('xp', 0)).toBe(40);
    expect(s.isPersistent()).toBe(true);
  });

  it('returns the fallback for missing, corrupt or invalid data', () => {
    const backend = new FakeStorage();
    const s = createStorage(() => backend);
    expect(s.read('missing', 'fallback')).toBe('fallback');
    backend.setItem(`${STORAGE_PREFIX}bad`, '{not json');
    expect(s.read('bad', 7)).toBe(7);
    backend.setItem(`${STORAGE_PREFIX}num`, '"a string"');
    expect(s.read('num', 1, (v): v is number => typeof v === 'number')).toBe(1);
  });

  it('falls back to memory when storage throws', () => {
    const s = createStorage(() => new BlockedStorage());
    s.write('xp', 5);
    expect(s.isPersistent()).toBe(false);
    expect(s.read('xp', 0)).toBe(5);
    s.remove('xp');
    expect(s.read('xp', 0)).toBe(0);
  });

  it('falls back to memory when localStorage itself is not accessible', () => {
    const s = createStorage(() => {
      throw new Error('SecurityError');
    });
    s.write('a', { ok: true });
    expect(s.read('a', null)).toEqual({ ok: true });
    expect(() => s.clearAll()).not.toThrow();
  });

  it('clearAll removes only ARAW keys', () => {
    const backend = new FakeStorage();
    const s = createStorage(() => backend);
    s.write('a', 1);
    s.write('b', 2);
    backend.setItem('other:key', 'keep');
    s.clearAll();
    expect(backend.getItem(`${STORAGE_PREFIX}a`)).toBeNull();
    expect(backend.getItem(`${STORAGE_PREFIX}b`)).toBeNull();
    expect(backend.getItem('other:key')).toBe('keep');
  });
});

describe('persisted + resetAll', () => {
  const isNum = (v: unknown): v is number => typeof v === 'number';

  it('loads, saves on change and resets to the default', () => {
    const backend = new FakeStorage();
    const s = createStorage(() => backend);
    backend.setItem(`${STORAGE_PREFIX}score`, '12');
    const score = persisted('score', 0, isNum, s);
    expect(score.value).toBe(12);
    score.value = 30;
    expect(backend.getItem(`${STORAGE_PREFIX}score`)).toBe('30');
    resetAll(s);
    expect(score.value).toBe(0);
    expect(backend.getItem(`${STORAGE_PREFIX}score`)).toBeNull();
  });

  it('ignores invalid stored data', () => {
    const backend = new FakeStorage();
    backend.setItem(`${STORAGE_PREFIX}score2`, '"oops"');
    const score = persisted('score2', 3, isNum, createStorage(() => backend));
    expect(score.value).toBe(3);
  });
});
