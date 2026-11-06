// Scripted backend for tests (window.__ARAW_FAKE_LLM__): fake download progress, then streams a canned answer word by
// word. Never used in the real app.
import { CloudError, type Backend, type FakeLlmOptions } from './engine';

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

export function fakeBackend(opts: FakeLlmOptions, cloud: boolean): Backend {
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
    async load(_url, model, onProgress) {
      if (!cached) await fakeDownload(model.sizeMB * 1024 * 1024, onProgress);
      if (opts.failLoad) throw new Error('fake load failure');
      cached = true;
    },
    async chat(messages, _model, onDelta, signal) {
      if (cloud && opts.cloudError) throw new CloudError(opts.cloudError);
      const last = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
      const text = (opts.reply ?? 'This is a practice answer about: {q}. Please check with a health worker.').replace('{q}', last);
      for (const word of text.split(/(?<=\s)/)) {
        await wait(delay, signal);
        onDelta(word);
      }
    },
  };
}
