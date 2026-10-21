// Chatbot Sandbox engine: one small state machine over a backend that runs the model. The real backend (wllama, llama.cpp
// compiled to WebAssembly; it runs the model in its own worker) loads into memory only when the sandbox opens; the file
// itself may already be on the device from a quiet background download (prefetch, src/sandbox/preload.ts). Tests set
// window.__ARAW_FAKE_LLM__ to swap in a scripted backend, so no test ever downloads a model.
import { signal, type Signal } from '@preact/signals';
import type { PromptMessage } from './prompt';
import { modelSource, modelUrl, type ModelInfo } from './model';

export type UnsupportedReason = 'browser' | 'memory' | 'storage';

export type EngineStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'unsupported'; reason: UnsupportedReason }
  | { kind: 'downloading'; loaded: number; total: number }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error' };

export interface Backend {
  isCached(url: string): Promise<boolean>;
  /** Save the model file on the device without loading it into memory (the background download). */
  download(url: string, onProgress: (loaded: number, total: number) => void): Promise<void>;
  /** Load the model into memory, downloading it first when it is not on the device yet. */
  load(url: string, model: ModelInfo, onProgress: (loaded: number, total: number) => void): Promise<void>;
  /** Streams the answer: `onDelta` gets each new piece of text. Resolves when done; rejects with AbortError when stopped. */
  chat(messages: PromptMessage[], model: ModelInfo, onDelta: (text: string) => void, signal: AbortSignal): Promise<void>;
}

/** What the device offers. Fields left undefined are unknown (that browser does not say) and do not block. */
export interface DeviceInfo {
  wasm: boolean;
  workers: boolean;
  deviceMemoryGB?: number;
  storageFreeMB?: number;
}

/** Why this device cannot run the model, or null when it can. */
export function supportProblem(device: DeviceInfo, model: ModelInfo): UnsupportedReason | null {
  if (!device.wasm || !device.workers) return 'browser';
  if (device.deviceMemoryGB !== undefined && device.deviceMemoryGB < 2) return 'memory';
  if (device.storageFreeMB !== undefined && device.storageFreeMB < model.sizeMB * 1.2) return 'storage';
  return null;
}

// WebAssembly feature probes (from wasm-feature-detect, Apache-2.0): SIMD and exception handling, both needed by llama.cpp.
const SIMD = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
const EXCEPTIONS = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 6, 64, 25, 11, 11]);

export async function readDevice(): Promise<DeviceInfo> {
  let wasm = false;
  try {
    wasm = typeof WebAssembly === 'object' && WebAssembly.validate(SIMD) && WebAssembly.validate(EXCEPTIONS);
  } catch {
    wasm = false;
  }
  const info: DeviceInfo = { wasm, workers: typeof Worker === 'function' };
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === 'number') info.deviceMemoryGB = memory;
  try {
    const est = await navigator.storage?.estimate?.();
    if (est && typeof est.quota === 'number') info.storageFreeMB = (est.quota - (est.usage ?? 0)) / (1024 * 1024);
  } catch {
    /* unknown: do not block */
  }
  return info;
}

export interface Engine {
  status: Signal<EngineStatus>;
  generating: Signal<boolean>;
  model: ModelInfo;
  /** The sandbox opened: check the device, then download (if needed) and load the model. Ends at unsupported, ready or error. */
  init(): Promise<void>;
  /** Download (if needed) and load the model; also the Retry after an error. */
  load(): Promise<void>;
  /**
   * Quietly save the model on the device ahead of time, without loading it into memory. Does nothing on a device that
   * cannot run it, when the file is already there, or once the sandbox has started; failures stay silent.
   */
  prefetch(): Promise<void>;
  /** Ask the model. Resolves with stopped=true when the player pressed Stop; rejects when the model fails. */
  chat(messages: PromptMessage[], onDelta: (text: string) => void): Promise<{ stopped: boolean }>;
  stop(): void;
}

interface EngineDeps {
  backend: () => Promise<Backend>;
  device: () => Promise<DeviceInfo>;
  url: string;
}

const isAbort = (e: unknown): boolean => e instanceof Error && (e.name === 'AbortError' || e.name === 'WllamaAbortError');

export function createEngine(model: ModelInfo, deps: EngineDeps): Engine {
  const status = signal<EngineStatus>({ kind: 'idle' });
  const generating = signal(false);
  let backend: Backend | null = null;
  let controller: AbortController | null = null;
  let loading: Promise<void> | null = null;
  let prefetching: Promise<void> | null = null;
  const fullSize = model.sizeMB * 1024 * 1024;

  const getBackend = async (): Promise<Backend> => (backend ??= await deps.backend());
  const isCached = async (): Promise<boolean> => {
    try {
      return await (await getBackend()).isCached(deps.url);
    } catch {
      return false;
    }
  };

  const prefetch = (): Promise<void> => {
    if (prefetching) return prefetching;
    if (status.value.kind !== 'idle' || loading) return Promise.resolve();
    prefetching = (async () => {
      try {
        if (supportProblem(await deps.device(), model)) return; // the sandbox explains it if the player opens it
        if (await isCached()) return;
        if (status.value.kind !== 'idle') return; // the sandbox opened in the meantime and took over
        const b = await getBackend();
        status.value = { kind: 'downloading', loaded: 0, total: fullSize };
        await b.download(deps.url, (loaded, total) => {
          if (status.value.kind === 'downloading') status.value = { kind: 'downloading', loaded, total };
        });
      } catch {
        /* quiet: opening the sandbox tries again */
      } finally {
        if (status.value.kind === 'downloading') status.value = { kind: 'idle' };
        prefetching = null;
      }
    })();
    return prefetching;
  };

  const load = (cached = false): Promise<void> => {
    if (status.value.kind === 'ready') return Promise.resolve();
    loading ??= (async () => {
      try {
        const b = await getBackend();
        status.value = cached ? { kind: 'loading' } : { kind: 'downloading', loaded: 0, total: fullSize };
        await b.load(deps.url, model, (loaded, total) => {
          if (cached) return; // already on the device: it only reads into memory
          // the last progress tick comes before the model is read into memory
          status.value = loaded >= total && total > 0 ? { kind: 'loading' } : { kind: 'downloading', loaded, total };
        });
        status.value = { kind: 'ready' };
      } catch {
        status.value = { kind: 'error' };
      } finally {
        loading = null;
      }
    })();
    return loading;
  };

  return {
    status,
    generating,
    model,
    async init() {
      if (loading) return loading;
      const kind = status.value.kind;
      if (kind === 'ready' || kind === 'checking' || kind === 'loading') return;
      // a background download already running keeps showing its progress; the model loads as soon as it finishes
      if (prefetching) await prefetching;
      if (loading) return loading;
      status.value = { kind: 'checking' };
      const problem = supportProblem(await deps.device(), model);
      if (problem) {
        status.value = { kind: 'unsupported', reason: problem };
        return;
      }
      await load(await isCached());
    },
    load: () => load(),
    prefetch,
    async chat(messages, onDelta) {
      if (status.value.kind !== 'ready' || generating.value) throw new Error('engine not ready');
      // set before any await, so a second Send in the same moment is refused
      generating.value = true;
      const ctrl = new AbortController();
      controller = ctrl;
      try {
        const b = await getBackend();
        if (ctrl.signal.aborted) return { stopped: true }; // Stop pressed before the model started
        await b.chat(messages, model, onDelta, ctrl.signal);
        return { stopped: false };
      } catch (e) {
        if (isAbort(e) || ctrl.signal.aborted) return { stopped: true };
        throw e; // the model stays loaded: the screen shows the error on that answer
      } finally {
        generating.value = false;
        controller = null;
      }
    },
    stop() {
      controller?.abort();
    },
  };
}

/** Options for the scripted test backend (set on window before the app loads). */
export interface FakeLlmOptions {
  unsupported?: UnsupportedReason;
  cached?: boolean;
  failLoad?: boolean;
  /** Answer text; `{q}` is replaced by the player's last message. */
  reply?: string;
  /** Milliseconds between streamed words. */
  delay?: number;
}

declare global {
  interface Window {
    __ARAW_FAKE_LLM__?: FakeLlmOptions;
  }
}

const engines = new Map<string, Engine>();

/** The app's engine for a model (kept while the app is open, so leaving and coming back does not reload the model). */
export function getEngine(model: ModelInfo): Engine {
  const fake = typeof window !== 'undefined' ? window.__ARAW_FAKE_LLM__ : undefined;
  const key = `${model.id}${fake ? ':fake' : ''}`;
  let engine = engines.get(key);
  if (!engine) {
    engine = fake
      ? createEngine(model, {
          url: `fake://${model.file}`,
          device: async () => (fake.unsupported ? { wasm: fake.unsupported !== 'browser', workers: true, deviceMemoryGB: fake.unsupported === 'memory' ? 1 : 8, storageFreeMB: fake.unsupported === 'storage' ? 1 : 1e6 } : { wasm: true, workers: true }),
          backend: async () => (await import('./fakeBackend')).fakeBackend(fake),
        })
      : createEngine(model, {
          url: modelUrl(model, modelSource(), document.baseURI),
          device: readDevice,
          backend: async () => (await import('./wllamaBackend')).wllamaBackend(),
        });
    engines.set(key, engine);
  }
  return engine;
}
