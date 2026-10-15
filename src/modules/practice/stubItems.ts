// Stub practice items so the mini Fact or Fake slot has something to play. T05 and T06 bring the real item bank.
// All people, pages and brands are fictional. Generated fakes are stamped "ARAW GAME · FAKE" when revealed.
export interface StubItem {
  id: string;
  module: string;
  text: string;
  truth: 'fact' | 'fake';
  explanation: string;
  review_status: 'unreviewed';
}

const item = (id: string, truth: 'fact' | 'fake', text: string, explanation: string): StubItem => ({
  id,
  module: 'm01',
  text,
  truth,
  explanation,
  review_status: 'unreviewed',
});

export const STUB_ITEMS: readonly StubItem[] = [
  item('stub-m01-1', 'fake', 'NEW "AI-powered" tea cures diabetes in 7 days! Doctors hate it. Share with 10 friends!', '"AI-powered" is a sticker, not proof. Diabetes needs care from a health worker.'),
  item('stub-m01-2', 'fact', 'Maps apps guess your travel time from patterns in past traffic. A guess can still be wrong.', 'AI makes guesses from patterns, so it can miss when something new happens.'),
  item('stub-m01-3', 'fake', 'A chatbot is always right because computers never make mistakes.', 'Chatbots can sound sure and still be wrong. Double-check anything important.'),
  item('stub-m01-4', 'fact', 'A spam filter uses AI to guess which messages are junk, and it sometimes blocks a real one.', 'It learned from many examples, and its guesses are not perfect.'),
  item('stub-m01-5', 'fake', 'If an app uses AI, you no longer need to see a doctor.', 'AI can help, but a health worker makes the decision.'),
];

/** The first `count` practice items tagged for a module (the stub bank is not shuffled). */
export const stubItemsFor = (moduleId: string, count: number): StubItem[] => STUB_ITEMS.filter((i) => i.module === moduleId).slice(0, count);
