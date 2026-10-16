// Module 9 · For Everyone (docs/SPEC.md section 4): hook, seven lesson cards, the Sa Sapatos Nila game and the takeaway.
// Cards follow SPEC's list: fair AI, who gets left out, one-accent voice, fixes that help, the human option, feedback, a poll.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm09',
  review_status: 'unreviewed',
  hook: {
    id: 'm09-c1',
    type: 'story-hook',
    scene: 'The barangay health center',
    speaker: 'Lola Nena',
    line: 'The health center has a new AI kiosk, dear. But the words are so tiny, I cannot read a thing. Where do I press?',
    icon: 'eye',
    ara: {
      intro: 'A shiny new kiosk, and Lola Nena cannot use it. Let us find out who else gets left out.',
      done: 'Here we go! Good tech works for everyone you love.',
    },
  },
  cards: [
    {
      id: 'm09-c2',
      type: 'info',
      title: 'Fair AI works for everyone',
      body: 'A fair tool works for everyone who needs it, not only for the people who built it. When a kiosk, an app or an AI is made with one kind of user in mind, others get stuck at the door. Fairness is part of good health care.',
      icon: 'heart',
      ara: { intro: 'Fair means it fits all of us.' },
    },
    {
      id: 'm09-c3',
      type: 'reveal',
      title: 'Who gets left out?',
      prompt: 'Tap each person to see what stops them at the kiosk.',
      tiles: [
        {
          label: 'Lola Nena',
          detail: 'Her eyesight is blurry. The kiosk text is tiny, so she cannot tell which button is which. Large text or a voice guide would help.',
        },
        {
          label: 'Jun, a Deaf teen',
          detail: 'The kiosk says "Your number is 12" out loud and shows nothing on the screen. Jun cannot hear it. Captions and a clear on-screen number would help.',
        },
        {
          label: 'Mang Ben',
          detail: 'Mang Ben, a farmer, speaks only Ilocano. The kiosk offers only English and Filipino, so he cannot follow it. A language choice would help.',
        },
        {
          label: 'Kuya Rey',
          detail: 'Kuya Rey uses a wheelchair. The buttons are placed high up, out of his reach. A lower screen would help.',
        },
        {
          label: 'Aling Pacita',
          detail: 'The kiosk asks her to scan a code with a smartphone, and she does not have one. A person at an assisted counter would help.',
        },
      ],
      ara: { done: 'Five people, five different doors. Each one can be opened.' },
    },
    {
      id: 'm09-c4',
      type: 'choice',
      question: 'The kiosk’s voice was trained on only one accent. Mang Ben, an Ilocano-speaking farmer, talks to it. What happens?',
      options: [
        {
          text: 'It understands him perfectly, because AI understands everyone.',
          feedback: 'Not quite. AI learns from the examples it was given. If most of them are one accent, it gets other accents wrong more often.',
        },
        {
          text: 'It may misunderstand him, because it learned from too few voices like his.',
          feedback: 'Yes! When the training data leaves people out, the AI works worse for them. That is bias from data. Adding more voices and languages makes it fairer.',
        },
        {
          text: 'It is Mang Ben’s fault for not speaking the way the kiosk expects.',
          feedback: 'No. The kiosk should fit the people it serves, not the other way around. Blaming the user hides the real problem.',
        },
      ],
      correct: 1,
      ara: { done: 'Biased data, unfair AI. Fix the data, fix the fairness.' },
    },
    {
      id: 'm09-c5',
      type: 'swipe-sort',
      title: 'Does this fix help?',
      bins: [
        { id: 'helps', label: 'Helps' },
        { id: 'not', label: 'Does not help' },
      ],
      items: [
        {
          id: 'm09-s1',
          text: 'Large text',
          bin: 'helps',
          why: 'Helps: people with blurry vision can read the screen.',
        },
        {
          id: 'm09-s2',
          text: 'A voice that reads the screen aloud',
          bin: 'helps',
          why: 'Helps: people who cannot see well, or who find reading hard, can listen.',
        },
        {
          id: 'm09-s3',
          text: 'Captions for every sound',
          bin: 'helps',
          why: 'Helps: Deaf and hard-of-hearing people can read what is said.',
        },
        {
          id: 'm09-s4',
          text: 'More languages to choose from',
          bin: 'helps',
          why: 'Helps: people can use the kiosk in the language they know best.',
        },
        {
          id: 'm09-s5',
          text: 'An assisted counter with a real person',
          bin: 'helps',
          why: 'Helps: someone who cannot use the kiosk still gets served.',
        },
        {
          id: 'm09-s6',
          text: 'Faster animations',
          bin: 'not',
          why: 'Not helpful: it looks flashy but does not remove any barrier.',
        },
        {
          id: 'm09-s7',
          text: 'Smaller text so more words fit',
          bin: 'not',
          why: 'Not helpful: smaller text makes reading harder for many people.',
        },
        {
          id: 'm09-s8',
          text: 'A sound-only alert with no words on screen',
          bin: 'not',
          why: 'Not helpful: anyone who cannot hear it misses the message.',
        },
      ],
      ara: { done: 'Fixes should remove a barrier, not just look shiny.' },
    },
    {
      id: 'm09-c6',
      type: 'choice',
      question: 'The health center wants to remove the front-desk staff because the kiosk is cheaper. What do you say?',
      options: [
        {
          text: 'Good idea. Machines never get tired.',
          feedback: 'A kiosk cannot help someone it does not work for. Taking away the people leaves those who are left out with nowhere to turn.',
        },
        {
          text: 'Keep a person at the counter too, so anyone can ask for human help.',
          feedback: 'Yes! A human option is how nobody gets left behind. The kiosk can serve many people, and staff can serve the rest.',
        },
        {
          text: 'Only people with smartphones should be served.',
          feedback: 'That would shut out many of the people who most need health care. Health services are for everyone.',
        },
      ],
      correct: 1,
      ara: { done: 'Always keep the human option.' },
    },
    {
      id: 'm09-c7',
      type: 'info',
      title: 'Your feedback makes it fairer',
      body: 'If something at the health center did not work for you or someone you love, tell them. Talk to the staff, use the suggestion box or ask your barangay health worker to pass it on. Services improve when people speak up.',
      icon: 'chat',
      ara: { intro: 'Your voice is a fix too.' },
    },
    {
      id: 'm09-c8',
      type: 'poll',
      question: 'Who in your family would struggle with a kiosk like this?',
      options: ['A grandparent with blurry eyes', 'Someone who speaks another language', 'Someone who is Deaf or hard of hearing', 'Someone without a smartphone or who uses a wheelchair'],
      reflection: 'Thank you! Thinking of real people is how fair design starts. Next, you will step into their shoes and fix the kiosk.',
    },
  ],
  game: {
    slug: 'sa-sapatos-nila',
    name: 'Sa Sapatos Nila',
    load: () => import('./SaSapatosNila'),
  },
  takeaway: {
    id: 'm09-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust tools that work for everyone you love.',
      'When technology leaves someone out, ask for the human option.',
      'Your feedback makes services fairer, so speak up.',
    ],
  },
};

export default content;
