import { effect, signal, type Signal } from '@preact/signals';

/** Keys are namespaced and versioned so a future schema can live next to this one. */
export const STORAGE_PREFIX = 'araw:v1:';

export interface AppStorage {
  read<T>(key: string, fallback: T, validate?: (v: unknown) => v is T): T;
  write(key: string, value: unknown): void;
  remove(key: string): void;
  /** Remove every ARAW key (storage and memory). */
  clearAll(): void;
  /** False when the browser blocked storage and values only live in memory. */
  isPersistent(): boolean;
}

/**
 * Wrap a Storage getter. Every access is in try/catch; when storage is blocked or full the
 * values fall back to an in-memory map so the app keeps working (without saving).
 */
export function createStorage(getBackend: () => Storage | null): AppStorage {
  const memory = new Map<string, string>();
  let persistent = true;

  const backend = (): Storage | null => {
    try {
      return getBackend();
    } catch {
      return null;
    }
  };

  return {
    read<T>(key: string, fallback: T, validate?: (v: unknown) => v is T): T {
      const full = STORAGE_PREFIX + key;
      let raw: string | null | undefined = memory.get(full);
      if (raw === undefined) {
        try {
          raw = backend()?.getItem(full);
        } catch {
          raw = null;
        }
      }
      if (raw === null || raw === undefined) return fallback;
      try {
        const parsed: unknown = JSON.parse(raw);
        return validate && !validate(parsed) ? fallback : (parsed as T);
      } catch {
        return fallback;
      }
    },
    write(key, value) {
      const full = STORAGE_PREFIX + key;
      const raw = JSON.stringify(value);
      try {
        const b = backend();
        if (!b) throw new Error('no storage');
        b.setItem(full, raw);
        memory.delete(full);
      } catch {
        persistent = false;
        memory.set(full, raw);
      }
    },
    remove(key) {
      const full = STORAGE_PREFIX + key;
      memory.delete(full);
      try {
        backend()?.removeItem(full);
      } catch {
        /* blocked storage: nothing to remove */
      }
    },
    clearAll() {
      memory.clear();
      try {
        const b = backend();
        if (!b) return;
        const keys: string[] = [];
        for (let i = 0; i < b.length; i++) {
          const k = b.key(i);
          if (k?.startsWith(STORAGE_PREFIX)) keys.push(k);
        }
        keys.forEach((k) => b.removeItem(k));
      } catch {
        /* blocked storage */
      }
    },
    isPersistent: () => persistent,
  };
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The app-wide storage instance. */
export const storage: AppStorage = createStorage(browserStorage);

const resetters: Array<() => void> = [];
let resetting = false;

/**
 * A signal that loads from storage on creation and saves on every change.
 * Invalid or missing stored data falls back to `initial`.
 */
export function persisted<T>(key: string, initial: T, validate: (v: unknown) => v is T, store: AppStorage = storage): Signal<T> {
  const s = signal<T>(store.read(key, initial, validate));
  let first = true;
  effect(() => {
    const value = s.value;
    if (first) {
      first = false;
      return;
    }
    if (!resetting) store.write(key, value);
  });
  resetters.push(() => {
    s.value = initial;
  });
  return s;
}

/** Clear all saved data and put every persisted signal back to its default. */
export function resetAll(store: AppStorage = storage): void {
  resetting = true;
  try {
    store.clearAll();
    resetters.forEach((r) => r());
  } finally {
    resetting = false;
  }
}
