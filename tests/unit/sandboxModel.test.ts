// Chatbot Sandbox model config: pinned Hugging Face files, the local source for offline app builds, the ?model= override.
import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_ID, isModelId, MODELS, modelSource, modelUrl, pickModel } from '../../src/sandbox/model';

describe('sandbox model config', () => {
  it('pins every candidate to a full commit hash and a GGUF file', () => {
    for (const m of Object.values(MODELS)) {
      expect(m.revision).toMatch(/^[0-9a-f]{40}$/);
      expect(m.file).toMatch(/\.gguf$/);
      expect(m.sizeMB).toBeGreaterThan(50);
      expect(m.sizeMB).toBeLessThan(800);
      expect(m.license.length).toBeGreaterThan(2);
    }
    expect(isModelId(DEFAULT_MODEL_ID)).toBe(true);
  });

  it('uses Hugging Face unless the build asks for local files', () => {
    expect(modelSource(undefined)).toBe('hf');
    expect(modelSource('hf')).toBe('hf');
    expect(modelSource('local')).toBe('local');
    expect(modelSource('anything')).toBe('hf');
  });

  it('builds the pinned download URL or the local file next to index.html', () => {
    const m = MODELS[DEFAULT_MODEL_ID];
    expect(modelUrl(m, 'hf', 'https://example.org/app/index.html')).toBe(`https://huggingface.co/${m.repo}/resolve/${m.revision}/${m.file}`);
    expect(modelUrl(m, 'local', 'https://example.org/app/index.html')).toBe(`https://example.org/app/models/${m.file}`);
    expect(modelUrl(m, 'local', 'file:///C:/ARAW/index.html')).toBe(`file:///C:/ARAW/models/${m.file}`);
  });

  it('picks a listed candidate from ?model= and ignores anything else', () => {
    expect(pickModel('gemma3-270m').id).toBe('gemma3-270m');
    expect(pickModel('not-a-model').id).toBe(DEFAULT_MODEL_ID);
    expect(pickModel('__proto__').id).toBe(DEFAULT_MODEL_ID);
    expect(pickModel(undefined).id).toBe(DEFAULT_MODEL_ID);
  });
});
