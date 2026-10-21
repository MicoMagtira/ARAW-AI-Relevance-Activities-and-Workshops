// Chatbot Sandbox system prompt and chat history. Small models follow English instructions best, so the instructions are
// in English and only name the language to answer in (the app language, or whatever the player writes in).
import type { LanguageCode } from '../app/language';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface PromptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const LANGUAGE_NAMES: Readonly<Record<LanguageCode, string>> = {
  en: 'English',
  fil: 'Filipino (Tagalog)',
  ceb: 'Cebuano (Bisaya)',
  ilo: 'Ilocano (Ilokano)',
  hil: 'Hiligaynon (Ilonggo)',
};

export function systemPrompt(lang: LanguageCode): string {
  const name = LANGUAGE_NAMES[lang];
  return [
    'You are a small practice chatbot inside ARAW, a learning game that teaches Filipinos about AI. You run on the user\'s own device.',
    `Answer in ${name}. If the user writes in another language, answer in the user's language.`,
    'Use short, simple sentences: at most 5 sentences. Be kind and friendly.',
    'You can make mistakes. You do not know today\'s date, the news, or anything recent. If you are not sure, say so.',
    'Never give medicine doses, amounts or schedules. Never diagnose. Never tell anyone to start, stop or change a treatment.',
    'For any health worry, tell the user to ask a health worker, the barangay health center or a doctor.',
    'Do not ask for personal details such as full names, ID numbers, phone numbers or addresses.',
  ].join('\n');
}

/**
 * Plain text for the chat bubble: drops a model's hidden "thinking" block (also an unfinished one while it streams) and
 * the most common Markdown marks, since bubbles show plain text.
 */
export function tidyAnswer(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/<think>[\s\S]*$/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trimStart();
}

/**
 * Rough size of the chat the model can read: the context window minus room for the answer, at about 3 characters a token
 * (Filipino languages split into more tokens than English).
 */
export const HISTORY_CHARS = 3600;

/**
 * The messages sent to the model: the system prompt plus the newest turns that fit in `budget` characters. The latest
 * user message is always kept (cut from the front only if it alone is too long, which the input cap prevents).
 */
export function buildMessages(history: readonly ChatTurn[], lang: LanguageCode, budget = HISTORY_CHARS): PromptMessage[] {
  const kept: ChatTurn[] = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i] as ChatTurn;
    if (kept.length > 0 && used + turn.content.length > budget) break;
    kept.unshift(turn);
    used += turn.content.length;
  }
  // a chat must start with the user's turn
  while (kept.length > 1 && kept[0]?.role !== 'user') kept.shift();
  return [{ role: 'system', content: systemPrompt(lang) }, ...kept];
}
