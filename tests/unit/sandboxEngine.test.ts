// Chatbot Sandbox engine: device checks, the load states, streaming, Stop and errors (with a scripted backend).
import { describe, expect, it, vi } from 'vitest';
import { createEngine, supportProblem, type Backend, type DeviceInfo } from '../../src/sandbox/engine';
import { MODELS } from '../../src/sandbox/model';

const model = MODELS['qwen3-0.6b'];
const OK: DeviceInfo = { wasm: true, workers: true, deviceMemoryGB: 8, storageFreeMB: 10_000 };

function backend(over: Partial<Backend> = {}): Backend {
  return {
    isCached: async () => false,
    download: async (_url, onProgress) => {
      onProgress(50, 100);
      onProgress(100, 100);
    },
    load: async (_url, _m, onProgress) => {
      onProgress(50, 100);
      onProgress(100, 100);
    },
    chat: async (_msgs, _m, onDelta) => {
      onDelta('Hello ');
      onDelta('there.');
    },
    ...over,
  };
}

const engineWith = (b: Backend, device: DeviceInfo = OK) => createEngine(model, { url: 'https://x/model.gguf', device: async () => device, backend: async () => b });

describe('supportProblem', () => {
  it('needs WebAssembly with workers, 2 GB of memory and room for the model', () => {
    expect(supportProblem(OK, model)).toBeNull();
    expect(supportProblem({ wasm: true, workers: true }, model)).toBeNull(); // unknown memory and storage do not block
    expect(supportProblem({ ...OK, wasm: false }, model)).toBe('browser');
    expect(supportProblem({ ...OK, workers: false }, model)).toBe('browser');
    expect(supportProblem({ ...OK, deviceMemoryGB: 1 }, model)).toBe('memory');
    expect(supportProblem({ ...OK, storageFreeMB: model.sizeMB }, model)).toBe('storage');
  });
});

describe('createEngine', () => {
  it('opening the sandbox downloads the model right away (no button), shows progress and ends ready', async () => {
    const e = engineWith(backend());
    const seen: string[] = [];
    e.status.subscribe((s) => seen.push(s.kind));
    await e.init();
    expect(e.status.value.kind).toBe('ready');
    expect(seen).toEqual(['idle', 'checking', 'downloading', 'downloading', 'loading', 'ready']);
  });

  it('loads a cached model straight away, without a download state', async () => {
    const e = engineWith(backend({ isCached: async () => true }));
    const seen: string[] = [];
    e.status.subscribe((s) => seen.push(s.kind));
    await e.init();
    expect(e.status.value.kind).toBe('ready');
    expect(seen).not.toContain('downloading');
    expect(seen[seen.indexOf('checking') + 1]).toBe('loading');
  });

  it('stops at unsupported on a device that cannot run the model', async () => {
    const load = vi.fn();
    const e = engineWith(backend({ load }), { ...OK, deviceMemoryGB: 1 });
    await e.init();
    expect(e.status.value).toEqual({ kind: 'unsupported', reason: 'memory' });
    expect(load).not.toHaveBeenCalled();
  });

  it('shows an error when loading fails, and can try again', async () => {
    let fail = true;
    const e = engineWith(
      backend({
        load: async () => {
          if (fail) throw new Error('network');
        },
      }),
    );
    await e.init();
    await e.load();
    expect(e.status.value.kind).toBe('error');
    fail = false;
    await e.load();
    expect(e.status.value.kind).toBe('ready');
  });

  it('streams an answer and is not generating afterwards', async () => {
    const e = engineWith(backend({ isCached: async () => true }));
    await e.init();
    let text = '';
    const result = await e.chat([{ role: 'user', content: 'Hi' }], (piece) => (text += piece));
    expect(text).toBe('Hello there.');
    expect(result.stopped).toBe(false);
    expect(e.generating.value).toBe(false);
  });

  it('Stop ends the answer early and reports it as stopped', async () => {
    const e = engineWith(
      backend({
        isCached: async () => true,
        chat: (_msgs, _m, onDelta, signal) =>
          new Promise((_resolve, reject) => {
            onDelta('Part ');
            signal.addEventListener('abort', () => {
              const err = new Error('stop');
              err.name = 'AbortError';
              reject(err);
            });
          }),
      }),
    );
    await e.init();
    const pending = e.chat([{ role: 'user', content: 'Hi' }], () => {});
    expect(e.generating.value).toBe(true);
    e.stop();
    await expect(pending).resolves.toEqual({ stopped: true });
    expect(e.generating.value).toBe(false);
  });

  it('a failing answer rejects but keeps the model ready', async () => {
    const e = engineWith(
      backend({
        isCached: async () => true,
        chat: async () => {
          throw new Error('kv cache full');
        },
      }),
    );
    await e.init();
    await expect(e.chat([{ role: 'user', content: 'Hi' }], () => {})).rejects.toThrow('kv cache full');
    expect(e.status.value.kind).toBe('ready');
    expect(e.generating.value).toBe(false);
  });

  it('refuses to chat before the model is ready', async () => {
    const e = engineWith(backend(), { ...OK, wasm: false });
    await e.init();
    await expect(e.chat([{ role: 'user', content: 'Hi' }], () => {})).rejects.toThrow('not ready');
  });
});

describe('background download (prefetch)', () => {
  it('saves the file without loading it into memory, then the sandbox loads it without a second download', async () => {
    let cached = false;
    const download = vi.fn(async (_url: string, onProgress: (l: number, t: number) => void) => {
      onProgress(100, 100);
      cached = true;
    });
    const load = vi.fn(async (_url: string, _m: unknown, onProgress: (l: number, t: number) => void) => onProgress(1, 1));
    const e = engineWith(backend({ isCached: async () => cached, download, load }));
    await e.prefetch();
    expect(download).toHaveBeenCalledTimes(1);
    expect(load).not.toHaveBeenCalled();
    expect(e.status.value.kind).toBe('idle');
    const seen: string[] = [];
    e.status.subscribe((s) => seen.push(s.kind));
    await e.init();
    expect(e.status.value.kind).toBe('ready');
    expect(seen).not.toContain('downloading');
  });

  it('opening the sandbox mid-download shows its progress, then loads when it finishes', async () => {
    let finish: () => void = () => {};
    let cached = false;
    const e = engineWith(
      backend({
        isCached: async () => cached,
        download: (_url, onProgress) =>
          new Promise<void>((resolve) => {
            onProgress(30, 100);
            finish = () => {
              cached = true;
              resolve();
            };
          }),
      }),
    );
    const bg = e.prefetch();
    await new Promise((r) => setTimeout(r, 0));
    expect(e.status.value).toEqual({ kind: 'downloading', loaded: 30, total: 100 });
    const opening = e.init();
    expect(e.status.value.kind).toBe('downloading');
    finish();
    await Promise.all([bg, opening]);
    expect(e.status.value.kind).toBe('ready');
  });

  it('does nothing when the file is already there or the device cannot run it, and a failure stays quiet', async () => {
    const download = vi.fn(async () => {});
    await engineWith(backend({ isCached: async () => true, download })).prefetch();
    await engineWith(backend({ download }), { ...OK, deviceMemoryGB: 1 }).prefetch();
    expect(download).not.toHaveBeenCalled();
    const failing = engineWith(
      backend({
        download: async () => {
          throw new Error('offline');
        },
      }),
    );
    await failing.prefetch();
    expect(failing.status.value.kind).toBe('idle');
    await failing.init(); // the sandbox simply downloads it when opened
    expect(failing.status.value.kind).toBe('ready');
  });
});
