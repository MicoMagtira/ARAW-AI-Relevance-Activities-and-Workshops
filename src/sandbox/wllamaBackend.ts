// The real Chatbot Sandbox backend: wllama (MIT), llama.cpp compiled to WebAssembly. It runs the model in its own worker,
// keeps downloaded models in the browser's private file storage (OPFS), and uses the GPU (WebGPU) or several CPU threads
// when the browser allows. All of its files are served by ARAW itself: no CDN.
import { LoggerWithoutDebug, Wllama } from '@wllama/wllama/esm/index.js';
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url';
import type { Backend } from './engine';
import { MAX_TOKENS, N_CTX } from './model';

/** JSPI and 64-bit memory: browsers without either (Safari, older phones) need wllama's slower compat build. */
function needsCompat(): boolean {
  if (!('Suspending' in WebAssembly)) return true;
  try {
    new WebAssembly.Memory({ address: 'i64', initial: 1n } as unknown as WebAssembly.MemoryDescriptor);
    return false;
  } catch {
    return true;
  }
}

const isFirefox = (): boolean => /Firefox\/\d/.test(navigator.userAgent);

async function create(): Promise<Wllama> {
  const wllama = new Wllama({ default: wasmUrl }, { logger: LoggerWithoutDebug, suppressNativeLog: true, allowOffline: true });
  // Firefox runs the normal build without the GPU; Safari and older browsers get the compat build (its own lazy chunk)
  if (needsCompat() && !isFirefox()) wllama.setCompat((await import('./wllamaCompat')).WLLAMA_COMPAT);
  else wllama.setCompat(null);
  return wllama;
}

export async function wllamaBackend(): Promise<Backend> {
  const wllama = await create();
  return {
    async isCached(url) {
      const models = await wllama.modelManager.getModels();
      return models.some((m) => m.url === url);
    },
    async download(url, onProgress) {
      // the file only: nothing is loaded into memory, so lessons and games stay smooth while it downloads
      await wllama.modelManager.downloadModel(url, { progressCallback: ({ loaded, total }) => onProgress(loaded, total) });
    },
    async load(url, _model, onProgress) {
      await wllama.loadModelFromUrl(url, {
        n_ctx: N_CTX,
        jinja: true,
        progressCallback: ({ loaded, total }) => onProgress(loaded, total),
      });
    },
    async chat(messages, model, onDelta, signal) {
      const stream = await wllama.createChatCompletion({
        messages,
        stream: true,
        max_tokens: MAX_TOKENS,
        temperature: 0.6,
        top_p: 0.9,
        top_k: 40,
        penalty_repeat: 1.1,
        abortSignal: signal,
        ...(model.templateKwargs ? { chat_template_kwargs: model.templateKwargs } : {}),
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta.content;
        if (text) onDelta(text);
      }
    },
  };
}
