// The server backend of the Chatbot Sandbox: reading the stream, the two failure reasons, Stop, and the site headers.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cloudBackend, textOf } from '../../src/sandbox/cloudBackend';
import { CloudError } from '../../src/sandbox/engine';
import { MODELS } from '../../src/sandbox/model';

const model = MODELS['qwen3-0.6b'];
const encoder = new TextEncoder();

function sse(...chunks: string[]): Response {
  return new Response(
    new ReadableStream({
      start(c) {
        for (const chunk of chunks) c.enqueue(encoder.encode(chunk));
        c.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );
}

const ask = async (signal = new AbortController().signal) => {
  let text = '';
  await cloudBackend().chat(
    [
      { role: 'system', content: 'secret rules' },
      { role: 'user', content: 'Hi' },
    ],
    model,
    (piece) => (text += piece),
    signal,
  );
  return text;
};

describe('textOf', () => {
  it('reads both stream shapes and skips the rest', () => {
    expect(textOf('data: {"response":"Hello"}')).toBe('Hello');
    expect(textOf('data: {"choices":[{"delta":{"content":"Hi"}}]}')).toBe('Hi');
    expect(textOf('data: [DONE]')).toBe('');
    expect(textOf('data: {broken')).toBe('');
    expect(textOf('data: {"usage":{"total_tokens":3}}')).toBe('');
    expect(textOf('')).toBe('');
  });
});

describe('cloudBackend', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('has nothing to download', async () => {
    const b = cloudBackend();
    expect(await b.isCached('')).toBe(true);
    await b.load('', model, () => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('streams the answer, even when a line is split between two chunks', async () => {
    fetchMock.mockResolvedValue(sse('data: {"response":"Keep "}\n\ndata: {"resp', 'onse":"water covered."}\n\n', 'data: [DONE]\n\n'));
    expect(await ask()).toBe('Keep water covered.');
  });

  it('sends the chat without the system prompt: the server adds its own', async () => {
    fetchMock.mockResolvedValue(sse('data: [DONE]\n\n'));
    await ask();
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toMatch(/\/api\/chat$/);
    const body = JSON.parse(String(init.body)) as { messages: unknown[] };
    expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
  });

  it('reports the used-up allowance, and treats every other failure as busy', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'quota' }, { status: 429 }));
    await expect(ask()).rejects.toMatchObject({ reason: 'quota' });
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'busy' }, { status: 503 }));
    await expect(ask()).rejects.toMatchObject({ reason: 'busy' });
    fetchMock.mockResolvedValueOnce(new Response('Not found', { status: 404 })); // a host without the Worker
    await expect(ask()).rejects.toMatchObject({ reason: 'busy' });
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')); // no internet
    await expect(ask()).rejects.toBeInstanceOf(CloudError);
  });

  it('lets Stop through as a stop, not a failure', async () => {
    const ctrl = new AbortController();
    fetchMock.mockImplementation(async () => {
      ctrl.abort();
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    });
    await expect(ask(ctrl.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('site headers', () => {
  it('sends no Referer: Hugging Face refuses *.workers.dev referers, which blocks the on-device download', () => {
    expect(readFileSync('public/_headers', 'utf8')).toMatch(/^\s*Referrer-Policy: no-referrer\s*$/m);
  });
});
