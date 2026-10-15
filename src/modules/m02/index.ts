// Module 2 · How AI Learns and Makes Mistakes (docs/SPEC.md section 4): hook, seven lesson cards, the Turuan si AI game and the takeaway.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm02',
  review_status: 'unreviewed',
  hook: {
    id: 'm02-c1',
    type: 'story-hook',
    scene: "Bea's school project",
    speaker: 'Bea',
    line: "Let's teach a computer to catch fake health posts!",
    icon: 'sun',
    ara: {
      intro: 'Ooh, a school project! Let us find out what a computer can learn.',
      done: 'Tara, let us teach it and see what happens!',
    },
  },
  cards: [
    {
      id: 'm02-c2',
      type: 'info',
      title: 'AI only knows what it was shown.',
      body: 'An AI learns from the examples people give it, and nothing else. If it never saw a ripe mango, it has no idea what one is. Kung ano ang itinuro, iyon lang ang alam. Good examples make a good helper. Missing examples make blind spots.',
      icon: 'learn',
    },
    {
      id: 'm02-c3',
      type: 'choice',
      question: 'A fruit sorter was trained only on green mangoes. Then it sees a ripe yellow mango. What does it say?',
      options: [
        {
          text: '"Mango!" It knows every kind',
          feedback: 'No. It only knows what it was shown, and it never saw a yellow one.',
        },
        {
          text: '"Not a mango"',
          feedback: 'Yes! Green was all it learned, so yellow looks like something new. Missing examples make blind spots.',
        },
        {
          text: '"I am not sure, please ask a person"',
          feedback: 'That would be wise, but most AI is not built to say it. It usually just answers.',
        },
      ],
      correct: 1,
    },
    {
      id: 'm02-c4',
      type: 'reveal',
      title: 'Lopsided examples, unfair results',
      prompt: 'Tap each one to see how lopsided examples hurt real people.',
      tiles: [
        {
          label: 'Voice assistant',
          detail: 'Trained mostly on one accent, it keeps misunderstanding Bisaya speakers. The people were fine. The examples were lopsided.',
        },
        {
          label: 'Photo app',
          detail: 'Trained mostly on lighter faces, it makes more mistakes on darker faces. Whoever is missing from the examples pays for it.',
        },
        {
          label: 'Health app',
          detail: 'Trained on city clinic records, it can miss what is common in the province. Check that it was trained on people like you.',
        },
      ],
      ara: { done: 'Lopsided examples make lopsided AI. We call that bias.' },
    },
    {
      id: 'm02-c5',
      type: 'choice',
      question: 'An AI says "98% sure". Does a high number mean it is right?',
      options: [
        {
          text: 'Yes, 98% sure means it is right',
          feedback: 'Not always. The number shows how sure the AI feels, not whether it is correct.',
        },
        {
          text: 'No. It can be confidently wrong',
          feedback: 'Yes! AI can say a wrong answer in a very sure voice. A big number is not proof, so check anything important.',
        },
      ],
      correct: 1,
      ara: {
        done: 'Sure is not the same as right. You will see that in the game!',
      },
    },
    {
      id: 'm02-c6',
      type: 'reveal',
      title: '"Why did the AI say that?"',
      prompt: 'Tap each tile to see what a fair "why?" gives you.',
      tiles: [
        {
          label: 'Highlighted words',
          detail: 'A detector can show the words it leaned on. If they are silly words, you know not to trust the answer.',
        },
        {
          label: 'Words it never saw',
          detail: 'It cannot use words it was never taught. A post in your language may look like a blank to it.',
        },
        {
          label: 'A fair question',
          detail: 'You can always ask an AI tool, or the people who made it, "Why did it say that?" A good tool can show you.',
        },
      ],
      ara: { done: 'Asking "why?" is not rude. It is how you stay in charge.' },
    },
    {
      id: 'm02-c7',
      type: 'swipe-sort',
      title: 'Balanced or lopsided?',
      bins: [
        { id: 'lopsided', label: 'Lopsided' },
        { id: 'balanced', label: 'Balanced' },
      ],
      items: [
        {
          id: 'm02-s1',
          text: 'A skin-check app trained on photos of only one skin tone',
          bin: 'lopsided',
          why: 'Lopsided: it will guess worse on the skin tones it never saw.',
        },
        {
          id: 'm02-s2',
          text: 'A voice assistant trained on many accents from across the Philippines',
          bin: 'balanced',
          why: 'Balanced: many kinds of speakers means fewer people left out.',
        },
        {
          id: 'm02-s3',
          text: 'A fake-post detector trained only on English posts',
          bin: 'lopsided',
          why: 'Lopsided: it has seen no Taglish or Bisaya posts.',
        },
        {
          id: 'm02-s4',
          text: 'A flu-risk tool trained on records from towns and cities, young and old',
          bin: 'balanced',
          why: 'Balanced: it learned from different places and ages.',
        },
        {
          id: 'm02-s5',
          text: 'A fruit sorter that saw only green mangoes',
          bin: 'lopsided',
          why: 'Lopsided: ripe mangoes are a blind spot.',
        },
        {
          id: 'm02-s6',
          text: 'A spam filter trained on both junk and normal messages in Tagalog, Bisaya and English',
          bin: 'balanced',
          why: 'Balanced: both kinds of messages, in the languages people use.',
        },
      ],
    },
    {
      id: 'm02-c8',
      type: 'poll',
      question: 'Would you trust a detector trained only in English to check posts in your language?',
      options: ['Yes, I would trust it', 'Only a little', 'No, not without checking', 'I am not sure'],
      reflection: 'Good thinking. Any answer is fine here. In the game, you will see what happens when a detector only learned English.',
    },
  ],
  game: {
    slug: 'turuan-si-ai',
    name: 'Turuan si AI',
    load: () => import('./TuruanSiAi'),
  },
  takeaway: {
    id: 'm02-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust AI more when it was trained on examples like your situation, your language and your community.',
      'A confident number is not proof. AI can be sure and still be wrong.',
      'Ask "why?" and expect an answer.',
    ],
  },
};

export default content;
