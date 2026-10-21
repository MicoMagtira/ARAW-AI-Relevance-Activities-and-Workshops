// Scripted backend for tests (window.__ARAW_FAKE_LLM__): fake download progress, then streams a canned answer word by
// word. Never used in the real app.
import type { Backend, FakeLlmOptions } from './engine';

const wait = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      const e = new Error('aborted');
      e.name = 'AbortError';
      reject(e);
    });
  });

export function fakeBackend(opts: FakeLlmOptions): Backend {
  const delay = opts.delay ?? 15;
  let cached = !!opts.cached;
  const fakeDownload = async (total: number, onProgress: (loaded: number, total: number) => void) => {
    for (const part of [0.25, 0.5, 0.75, 1]) {
      await wait(delay);
      onProgress(total * part, total);
    }
  };
  return {
    async isCached() {
      return cached;
    },
    async download(_url, onProgress) {
      await fakeDownload(100 * 1024 * 1024, onProgress);
      cached = true;
    },
    async load(_url, model, onProgress) {
      if (!cached) await fakeDownload(model.sizeMB * 1024 * 1024, onProgress);
      if (opts.failLoad) throw new Error('fake load failure');
      cached = true;
    },
    async chat(messages, _model, onDelta, signal) {
      const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
      const text = (opts.reply ?? 'This is a practice answer about: {q}. Please check with a health worker.').replace('{q}', last);
      for (const word of text.split(/(?<=\s)/)) {
        await wait(delay, signal);
        onDelta(word);
      }
    },
  };
}
