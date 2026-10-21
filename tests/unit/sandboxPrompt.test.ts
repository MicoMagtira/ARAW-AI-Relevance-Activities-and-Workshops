// Chatbot Sandbox prompt: the system prompt per language, trimming the history and tidying answers for the bubble.
import { describe, expect, it } from 'vitest';
import { buildMessages, LANGUAGE_NAMES, systemPrompt, tidyAnswer, type ChatTurn } from '../../src/sandbox/prompt';
import { ALL_LANGUAGES } from '../../src/app/language';

describe('systemPrompt', () => {
  it('names the answer language and keeps the safety rules in every language', () => {
    for (const { code } of ALL_LANGUAGES) {
      const p = systemPrompt(code);
      expect(p).toContain(`Answer in ${LANGUAGE_NAMES[code]}`);
      expect(p).toMatch(/Never give medicine doses/);
      expect(p).toMatch(/Never diagnose/);
      expect(p).toMatch(/health worker/);
      expect(p).toMatch(/do not know today's date/);
    }
  });
});

describe('buildMessages', () => {
  const turn = (role: ChatTurn['role'], n: number): ChatTurn => ({ role, content: `${role} ${n} `.padEnd(100, '.') });

  it('starts with the system prompt and keeps the whole short chat', () => {
    const history = [turn('user', 1), turn('assistant', 1), turn('user', 2)];
    const msgs = buildMessages(history, 'fil');
    expect(msgs[0]?.role).toBe('system');
    expect(msgs[0]?.content).toContain('Filipino');
    expect(msgs.slice(1)).toEqual(history);
  });

  it('drops the oldest turns past the budget and still starts with a user turn', () => {
    const history: ChatTurn[] = [];
    for (let i = 0; i < 10; i++) history.push(turn('user', i), turn('assistant', i));
    history.push(turn('user', 10));
    const msgs = buildMessages(history, 'en', 450);
    const kept = msgs.slice(1);
    expect(kept.length).toBeLessThanOrEqual(5);
    expect(kept[0]?.role).toBe('user');
    expect(kept.at(-1)).toEqual(turn('user', 10));
  });

  it('always keeps the newest message, even when it alone is over the budget', () => {
    const msgs = buildMessages([turn('user', 1)], 'ceb', 10);
    expect(msgs).toHaveLength(2);
  });
});

describe('tidyAnswer', () => {
  it('removes a thinking block, finished or still streaming', () => {
    expect(tidyAnswer('<think>\nhmm\n</think>\n\nHello!')).toBe('Hello!');
    expect(tidyAnswer('<think>still thinking')).toBe('');
  });

  it('turns simple Markdown into plain text', () => {
    expect(tidyAnswer('## Tips\n**Rest** well.\n- Drink water\n* Sleep')).toBe('Tips\nRest well.\n• Drink water\n• Sleep');
  });
});
