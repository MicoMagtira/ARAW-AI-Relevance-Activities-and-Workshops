// ARAW's only server code: the Chatbot Sandbox AI. Everything else is static files, served without running this Worker.
// The browser sends the chat; this Worker adds the system prompt, asks Workers AI and streams the answer back.
// Nothing is stored and nothing is logged: chats pass through and are gone. Safety checks run in the browser first
// (src/sandbox/guard.ts), so thoughts of self-harm never get here.
import type { LanguageCode } from '../src/app/language';
import { MAX_INPUT } from '../src/sandbox/guard';
import { CLOUD_MODEL, MAX_TOKENS } from '../src/sandbox/model';
import { HISTORY_CHARS, LANGUAGE_NAMES, systemPrompt, type ChatTurn } from '../src/sandbox/prompt';

export interface Env {
  AI: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
  ASSETS: { fetch(request: Request): Promise<Response> };
  CHAT_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

/** Longest chat this endpoint accepts: what the app can send, plus room for one long answer. */
const MAX_CHARS = HISTORY_CHARS + MAX_INPUT + 2000;
const MAX_TURNS = 40;
const MAX_BODY = 32 * 1024;

export type ChatFailure = 'quota' | 'busy' | 'bad-request' | 'forbidden';

const fail = (status: number, error: ChatFailure): Response =>
  new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const isLanguage = (v: unknown): v is LanguageCode => typeof v === 'string' && Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, v);

/** The chat from the request, or null when it is not one the app would send. Only the turns are taken: never a system prompt. */
export function readChat(body: unknown): { lang: LanguageCode; turns: ChatTurn[] } | null {
  if (typeof body !== 'object' || body === null) return null;
  const { lang, messages } = body as { lang?: unknown; messages?: unknown };
  if (!isLanguage(lang) || !Array.isArray(messages) || messages.length === 0 || messages.length > MAX_TURNS) return null;
  const turns: ChatTurn[] = [];
  let chars = 0;
  for (const m of messages as Array<Partial<ChatTurn> | null>) {
    if ((m?.role !== 'user' && m?.role !== 'assistant') || typeof m.content !== 'string' || !m.content) return null;
    if (m.role === 'user' && m.content.length > MAX_INPUT) return null;
    chars += m.content.length;
    turns.push({ role: m.role, content: m.content });
  }
  if (chars > MAX_CHARS || turns[turns.length - 1]?.role !== 'user') return null;
  return { lang, turns };
}

/** Workers AI errors: 3036 is the used-up daily free allowance, the rest means try again later. */
export function failureOf(error: unknown): ChatFailure {
  const text = error instanceof Error ? error.message : String(error);
  return /\b3036\b|daily free allocation/i.test(text) ? 'quota' : 'busy';
}

function sameSite(request: Request): boolean {
  try {
    return new URL(request.headers.get('Origin') ?? '').host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST' || !sameSite(request)) return fail(403, 'forbidden');
  const visitor = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.CHAT_LIMIT.limit({ key: visitor });
  if (!success) return fail(429, 'busy');

  const raw = await request.text();
  if (raw.length > MAX_BODY) return fail(413, 'bad-request');
  let chat: ReturnType<typeof readChat> = null;
  try {
    chat = readChat(JSON.parse(raw));
  } catch {
    /* not JSON: refused below */
  }
  if (!chat) return fail(400, 'bad-request');

  try {
    const stream = await env.AI.run(CLOUD_MODEL.id, {
      messages: [{ role: 'system', content: systemPrompt(chat.lang) }, ...chat.turns],
      stream: true,
      max_tokens: MAX_TOKENS,
      temperature: 0.6,
      top_p: 0.9,
    });
    return new Response(stream as ReadableStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store' } });
  } catch (error) {
    const failure = failureOf(error);
    return fail(failure === 'quota' ? 429 : 503, failure);
  }
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === '/api/chat') return handleChat(request, env);
    return env.ASSETS.fetch(request);
  },
};
