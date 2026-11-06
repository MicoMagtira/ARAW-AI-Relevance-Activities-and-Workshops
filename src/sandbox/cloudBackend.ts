// The default Chatbot Sandbox backend: the AI runs on the server (worker/index.ts, Cloudflare Workers AI), so visitors
// download nothing and any phone can use it. Answers stream back as server-sent events. A host without the Worker
// (GitHub Pages, a Hugging Face Space) answers 404, which reads as "busy" and offers the on-device AI.
import { language } from '../app/language';
import { CloudError, type Backend } from './engine';

/** No new words for this long means the answer has stalled. */
const STALL_MS = 30_000;

/** The text in one server-sent line, whichever shape the model streams in, or '' when the line carries none. */
export function textOf(line: string): string {
  if (!line.startsWith('data:')) return '';
  const data = line.slice(5).trim();
  if (!data || data === '[DONE]') return '';
  try {
    const event = JSON.parse(data) as { response?: unknown; choices?: Array<{ delta?: { content?: unknown } }> };
    const text = event.response ?? event.choices?.[0]?.delta?.content;
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

async function failure(res: Response): Promise<CloudError> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  return new CloudError(body?.error === 'quota' ? 'quota' : 'busy');
}

export function cloudBackend(): Backend {
  return {
    isCached: async () => true, // nothing to download
    load: async () => {},
    async chat(messages, _model, onDelta, signal) {
      const stall = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const watch = () => {
        clearTimeout(timer);
        timer = setTimeout(() => stall.abort(), STALL_MS);
      };
      try {
        watch();
        const res = await fetch(new URL('api/chat', document.baseURI), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // the Worker adds the system prompt itself
          body: JSON.stringify({ lang: language.value ?? 'en', messages: messages.filter((m) => m.role !== 'system') }),
          signal: AbortSignal.any([signal, stall.signal]),
        });
        if (!res.ok || !res.body) throw await failure(res);
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          watch();
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const text = textOf(line);
            if (text) onDelta(text);
          }
        }
      } catch (e) {
        if (signal.aborted) throw e; // the player pressed Stop
        throw e instanceof CloudError ? e : new CloudError('busy');
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
