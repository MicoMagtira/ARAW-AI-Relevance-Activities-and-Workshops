// Chatbot Sandbox model config. The website fetches the GGUF file from a pinned Hugging Face revision (so the file can never
// change under us); offline app builds set VITE_MODEL_SOURCE=local and ship the same file at ./models/<file>
// (scripts/sandbox/fetch-model.mjs downloads it). Swapping the model is a change to DEFAULT_MODEL_ID.

export interface ModelInfo {
  id: string;
  /** Shown on the screen, e.g. "Qwen3 0.6B". */
  label: string;
  repo: string;
  /** Hugging Face commit hash: pins the exact file. */
  revision: string;
  file: string;
  /** Download size in MB (1024 x 1024 bytes), shown before the first download. */
  sizeMB: number;
  license: string;
  /** Extra chat-template switches, e.g. turning off a model's "thinking" mode. */
  templateKwargs?: Record<string, unknown>;
}

const m = (info: ModelInfo): ModelInfo => info;

/** Candidates for the bake-off (docs/DECISIONS-LOG.md). `#/sandbox?model=<id>` picks one for testing. */
export const MODELS = {
  'qwen3-0.6b': m({
    id: 'qwen3-0.6b',
    label: 'Qwen3 0.6B',
    repo: 'unsloth/Qwen3-0.6B-GGUF',
    revision: '50968a4468ef4233ed78cd7c3de230dd1d61a56b',
    file: 'Qwen3-0.6B-Q4_K_M.gguf',
    sizeMB: 378,
    license: 'Apache-2.0',
    templateKwargs: { enable_thinking: false },
  }),
  'qwen3.5-0.8b': m({
    id: 'qwen3.5-0.8b',
    label: 'Qwen3.5 0.8B',
    repo: 'unsloth/Qwen3.5-0.8B-GGUF',
    revision: '6ab461498e2023f6e3c1baea90a8f0fe38ab64d0',
    file: 'Qwen3.5-0.8B-Q4_K_M.gguf',
    sizeMB: 508,
    license: 'Apache-2.0',
    templateKwargs: { enable_thinking: false },
  }),
  'qwen2.5-0.5b': m({
    id: 'qwen2.5-0.5b',
    label: 'Qwen2.5 0.5B',
    repo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    revision: '9217f5db79a29953eb74d5343926648285ec7e67',
    file: 'qwen2.5-0.5b-instruct-q4_0.gguf',
    sizeMB: 409,
    license: 'Apache-2.0',
  }),
  'gemma3-270m': m({
    id: 'gemma3-270m',
    label: 'Gemma 3 270M',
    repo: 'unsloth/gemma-3-270m-it-GGUF',
    revision: 'c90975dbd40c0c7b275fefaae758c3415c906238',
    file: 'gemma-3-270m-it-Q4_K_M.gguf',
    sizeMB: 241,
    license: 'Gemma Terms of Use',
  }),
  'gemma3-1b': m({
    id: 'gemma3-1b',
    label: 'Gemma 3 1B',
    repo: 'unsloth/gemma-3-1b-it-GGUF',
    revision: 'f0b45be0aac41bd6a100a4b5734cad5f67255bfb',
    file: 'gemma-3-1b-it-Q4_0.gguf',
    sizeMB: 688,
    license: 'Gemma Terms of Use',
  }),
} as const satisfies Record<string, ModelInfo>;

export type ModelId = keyof typeof MODELS;

export const DEFAULT_MODEL_ID: ModelId = 'qwen3-0.6b';

/** Context window and answer length: small enough for phones with 3-4 GB of memory. */
export const N_CTX = 2048;
export const MAX_TOKENS = 320;

export type ModelSource = 'hf' | 'local';

export const isModelId = (v: unknown): v is ModelId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(MODELS, v);

/** The build's model source: `local` only when VITE_MODEL_SOURCE says so. */
export function modelSource(env: string | undefined = import.meta.env.VITE_MODEL_SOURCE): ModelSource {
  return env === 'local' ? 'local' : 'hf';
}

/** The model to load: a `?model=` candidate when given, else the default. */
export function pickModel(requested?: string): ModelInfo {
  return MODELS[isModelId(requested) ? requested : DEFAULT_MODEL_ID];
}

/** Where to download the GGUF file from. `base` is the page URL (local files sit next to index.html). */
export function modelUrl(model: ModelInfo, source: ModelSource, base: string): string {
  if (source === 'local') return new URL(`models/${model.file}`, base).href;
  return `https://huggingface.co/${model.repo}/resolve/${model.revision}/${model.file}`;
}
