// "Ara caught this" tips: which answer gets which tip, in all five languages.
import { describe, expect, it } from 'vitest';
import { catchFor } from '../../src/sandbox/catches';

const PLAIN = 'Empty any standing water around the house.';

describe('catchFor', () => {
  it('catches date questions in all five languages', () => {
    for (const q of ['What is the date today?', 'What day is it?', 'Anong petsa ngayon?', 'Unsang petsaha karon?', 'Ania ti petsa ita?', 'Ano nga petsa subong?']) {
      expect(catchFor(q, 'I do not know the date.'), q).toBe('date');
    }
  });

  it('catches questions about things that change', () => {
    for (const q of ['What is the latest news on dengue?', 'Who won the election?', 'Ano ang balita ngayon?', 'Ania ti damag ita?']) {
      expect(catchFor(q, PLAIN), q).toBe('recent');
    }
  });

  it('catches requests for a source, even when the AI gave none', () => {
    for (const q of ['Can you give me a link to a study about vitamin C?', 'May pag-aaral ba tungkol dito?', 'Naay pagtuon bahin niini?']) {
      expect(catchFor(q, 'I cannot find links.'), q).toBe('source');
    }
  });

  it('a link in the answer wins, whatever was asked', () => {
    expect(catchFor('Tell me about vitamin C', 'See https://example.org/study for more.')).toBe('link');
    expect(catchFor('What is the date today?', 'Check www.example.com.')).toBe('link');
    expect(catchFor('Hello', 'Try healthfacts.ph today.')).toBe('link');
  });

  it('catches a promise the AI cannot make', () => {
    expect(catchFor('Three weeks of cough', 'Huwag mag-alala, gagaling ka rin!')).toBe('promise');
    expect(catchFor('I feel sick', 'Do not worry, you will be fine.')).toBe('promise');
    expect(catchFor('Nakulbaan ko', 'Ayaw kabalaka, mamaayo ka ra.')).toBe('promise');
  });

  it('catches exact-sounding numbers only when nothing else applies', () => {
    expect(catchFor('Does it work?', 'It works in 95% of people.')).toBe('number');
    expect(catchFor('Does it work?', 'It helps 3 out of 4 people.')).toBe('number');
    expect(catchFor('What is the date today?', 'About 95% of days are fine.')).toBe('date');
  });

  it('a starter question brings its own kind, in any language', () => {
    expect(catchFor('wording no list knows', PLAIN, 'date')).toBe('date');
    expect(catchFor('wording no list knows', 'See www.example.com', 'date')).toBe('link');
  });

  it('stays quiet on ordinary chats', () => {
    expect(catchFor('How can I keep mosquitoes away?', PLAIN)).toBeNull();
    expect(catchFor('What does a vaccine do?', 'It trains your body to fight a germ.')).toBeNull();
    expect(catchFor('I do not know for sure', 'I am not sure. Ask a health worker.')).toBeNull();
  });

  it('does not take a word inside another word for a link or a source', () => {
    expect(catchFor('Is the clinic open?', 'Go to the health center.')).toBeNull(); // "link" is not in "clinic"
    expect(catchFor('Hello', 'Use a mosquito net. Thank you.')).toBeNull(); // no domain here
  });
});
