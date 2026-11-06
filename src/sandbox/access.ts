// Who may use the Chatbot Sandbox AI, and where it runs. The terms must be agreed first (once per version, on this device).
// The AI runs on the server by default, so nothing is downloaded. The on-device AI is only ever the player's own choice,
// offered when the server cannot answer; offline app builds (VITE_MODEL_SOURCE=local) ship the model and always use it.
import { signal } from '@preact/signals';
import { persisted } from '../app/store';
import { modelSource } from './model';

/** Raise this when the terms change: everyone is then asked to agree again. */
export const TERMS_VERSION = 1;

export const agreedTerms = persisted<number>('sandbox-terms', 0, (v): v is number => typeof v === 'number');

export type SandboxMode = 'cloud' | 'device';

const startsOnDevice = (): boolean => modelSource() === 'local' || (typeof window !== 'undefined' && !!window.__ARAW_FAKE_LLM__?.device);

export const sandboxMode = signal<SandboxMode>(startsOnDevice() ? 'device' : 'cloud');
