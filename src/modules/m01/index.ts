// Module 1 · What Is AI, Really? (docs/SPEC.md section 4): hook, eight lesson cards, the AI or Not? game and the takeaway.
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
    ara: { intro: 'Hey, good question, Lola! Let us find out how these guesses work.', done: 'Come on, let us look inside the guess!' },
  },
  cards: [
    {
      id: 'm01-c2',
      type: 'info',
      title: 'AI learns patterns from many examples, then makes a guess.',
      body: 'Show a computer thousands of mango photos and it learns what mangoes usually look like. Then it can guess if a new photo shows a mango. It is a guess from patterns, not magic and not a mind. Your phone is not listening: it is guessing what you might like.',
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
      ara: { done: 'Examples, patterns, guess. You have got this!' },
    },
    {
      id: 'm01-c4',
      type: 'choice',
      question: 'A computer saw 1,000 mango photos. What did it learn?',
      options: [
        { text: 'What mangoes taste like', feedback: 'Not quite. It only saw pictures, so it cannot know a taste.' },
        { text: 'Patterns of shape and colour', feedback: 'Yes! It learned what mangoes usually look like, nothing more.' },
        { text: 'How to grow a mango tree', feedback: 'No. Photos show how a mango looks, not how it grows.' },
      ],
      correct: 1,
    },
    {
      id: 'm01-c5',
      type: 'reveal',
      title: 'AI you already use',
      prompt: 'Tap each one to see the guess it makes for you.',
      tiles: [
        { label: 'Social media feed', detail: 'Guesses which posts you will watch, like or share, and shows those first.' },
        { label: 'Face filter', detail: 'Guesses where your eyes, nose and mouth are, so the puppy ears stay put.' },
        { label: 'Maps traffic', detail: 'Guesses your travel time from patterns in past traffic.' },
        { label: 'Spam filter', detail: 'Guesses which messages are junk because it has seen many junk messages before.' },
        { label: 'Voice assistant', detail: 'Guesses the words you said from the sound of your voice.' },
        { label: 'Symptom checker', detail: 'Guesses what might be going on from patterns in past cases. It cannot examine you.' },
      ],
      ara: { done: 'See? AI is hiding in plain sight. Each one is a guess.' },
    },
    {
      id: 'm01-c6',
      type: 'choice',
      question: 'Your maps app says "20 minutes". Is that a promise or a guess?',
      options: [
        { text: 'A promise: the app knows the future', feedback: 'No. Nobody knows the future, not even a smart app. A flood or an accident can change it.' },
        { text: 'A guess from patterns in past traffic', feedback: 'Yes! It is usually a good guess, so use it, but leave a little extra time.' },
      ],
      correct: 1,
    },
    {
      id: 'm01-c7',
      type: 'reveal',
      title: 'AI in health: it helps, people decide',
      prompt: 'Tap each one to see how AI is used, and who still decides.',
      tiles: [
        { label: 'X-ray helpers', detail: 'Mark spots on a scan so a doctor looks closely. The doctor makes the call.' },
        { label: 'Health chatbots', detail: 'Answer simple questions and point you to a clinic. They can be wrong, so do not use them to diagnose.' },
        { label: 'Appointment systems', detail: 'Guess busy hours to shorten the queue. Staff still run the clinic.' },
        { label: 'Claims-fraud flags', detail: 'Flag odd insurance claims for a person to check. A flag is not a verdict.' },
      ],
      ara: { done: 'AI helps; people decide. Remember that!' },
    },
    {
      id: 'm01-c8',
      type: 'choice',
      question: 'A tea box says "AI-powered formula". Does that sticker make it work?',
      options: [
        { text: 'Yes, AI proves it works', feedback: 'No. "AI-powered" is a sticker, not proof. Anyone can print it on a box.' },
        { text: 'No. Check if it is registered with the FDA', feedback: 'Yes! Check the FDA, and ask a health worker before you trust a health claim.' },
      ],
      correct: 1,
      ara: { done: 'Stickers are cheap. Proof is not.' },
    },
    {
      id: 'm01-c9',
      type: 'poll',
      question: 'Where did you meet AI this week?',
      options: ['In my social media feed', 'In a camera filter', 'In a maps or ride app', 'I am not sure'],
      reflection: 'Thank you! There is no wrong answer. AI is often hiding in ordinary apps, so being not sure is normal.',
    },
  ],
  game: {
    slug: 'ai-or-not',
    name: 'AI or Not?',
    load: () => import('./AiOrNot'),
  },
  takeaway: {
    id: 'm01-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust AI for low-stakes guesses, like traffic or spam, and double-check the ones that matter.',
      '"AI-powered" is a sticker, not proof.',
      'For health decisions, a health worker decides.',
    ],
  },
};

export default content;
