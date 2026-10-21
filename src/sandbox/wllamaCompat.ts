// wllama's compat build (MIT) for browsers without JSPI or 64-bit WebAssembly memory, mostly Safari. Its own chunk, so
// other browsers never download it. Vite needs the worker script as ?raw (wllama starts it from a Blob).
import compatWasm from '@wllama/wllama-compat/wasm/wllama.wasm?url';
import compatWorker from '@wllama/wllama-compat/wasm/wllama.js?raw';

export const WLLAMA_COMPAT = { wasm: compatWasm, worker: { code: compatWorker } };
