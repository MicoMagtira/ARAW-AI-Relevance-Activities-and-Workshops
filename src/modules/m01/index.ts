// Module 1 stub content: just enough to exercise every card type in the runner. T07 writes the real lesson and game.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm01',
  review_status: 'unreviewed',
  hook: {
    id: 'm01-c1',
    type: 'story-hook',
    scene: "Lola Nena's kitchen",
    speaker: 'Lola Nena',
    line: 'Is my phone listening to me? It keeps showing me tea ads!',
    icon: 'heart',
    ara: { intro: 'Uy, good question, Lola! Let us find out how these guesses work.', done: 'Tara, let us look inside the guess!' },
  },
  cards: [
    {
      id: 'm01-c2',
      type: 'info',
      title: 'AI learns patterns from many examples, then makes a guess.',
      body: 'Show a computer thousands of mango photos and it learns what mangoes usually look like. Then it can guess if a new photo shows a mango. It is a guess from patterns, not magic and not a mind.',
      icon: 'sun',
    },
    {
      id: 'm01-c3',
      type: 'reveal',
      title: 'Three parts of every AI guess',
      prompt: 'Tap each part to see what it means.',
      tiles: [
        { label: 'Examples', detail: 'Lots of photos, words or numbers the AI is shown first.' },
        { label: 'Patterns', detail: 'What the examples have in common, like shapes and colours.' },
        { label: 'Guess', detail: 'An answer for something new. It can be right or wrong.' },
      ],
      ara: { done: 'Examples, patterns, guess. Kaya mo na ito!' },
    },
    {
      id: 'm01-c4',
      type: 'choice',
      question: 'A computer saw 1,000 mango photos. What did it learn?',
      options: [
        { text: 'What mangoes taste like', feedback: 'Not quite. It only saw pictures, so it cannot know a taste.' },
        { text: 'Patterns of shape and colour', feedback: 'Yes! It learned what mangoes usually look like.' },
        { text: 'How to grow a mango tree', feedback: 'No. Photos do not teach how things grow.' },
      ],
      correct: 1,
    },
    {
      id: 'm01-c5',
      type: 'swipe-sort',
      title: 'Which of these use AI?',
      bins: [
        { id: 'not-ai', label: 'Not AI' },
        { id: 'ai', label: 'AI' },
      ],
      items: [
        { id: 'calculator', text: 'Pocket calculator', bin: 'not-ai', why: 'It follows fixed rules. It does not learn from examples.' },
        { id: 'spam', text: 'Spam filter in your email', bin: 'ai', why: 'It learned from many junk and normal messages.' },
        { id: 'switch', text: 'Light switch', bin: 'not-ai', why: 'On and off. Nothing is guessed.' },
        { id: 'maps', text: 'Maps traffic guess', bin: 'ai', why: 'It guesses from patterns in past traffic.' },
      ],
      ara: { done: 'Galing! Now you can spot the guessers.' },
    },
    {
      id: 'm01-c6',
      type: 'poll',
      question: 'Where did you meet AI this week?',
      options: ['In my social media feed', 'In a camera filter', 'In a maps or ride app', 'I am not sure'],
      reflection: 'Thank you! There is no wrong answer. AI is often hiding in ordinary apps, so being not sure is normal.',
    },
    {
      id: 'm01-c7',
      type: 'choice',
      question: 'A tea box says "AI-powered formula". Does that sticker make it work?',
      options: [
        { text: 'Yes, AI proves it works', feedback: 'No. "AI-powered" is a sticker, not proof.' },
        { text: 'No. Check if it is registered with the FDA', feedback: 'Yes! Ask a health worker or check the FDA before you trust it.' },
      ],
      correct: 1,
    },
  ],
  game: {
    slug: 'ai-or-not',
    name: 'AI or Not?',
    load: () => import('./StubGame'),
  },
  takeaway: {
    id: 'm01-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust AI for low-stakes guesses, and double-check the ones that matter.',
      '"AI-powered" is a sticker, not proof.',
      'For health decisions, a health worker decides.',
    ],
  },
};

export default content;
