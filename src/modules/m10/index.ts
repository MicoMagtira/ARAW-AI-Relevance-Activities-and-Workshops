// Module 10 · Karapatan Mo (docs/SPEC.md section 4): hook, seven lesson cards, the OBJECTION! game and the takeaway.
// Cards follow SPEC's list: your data rights, the rights in plain words, an AI that rejects a claim, who is responsible, how to
// complain, red flags, a poll. Kept general: the Data Privacy Act (RA 10173) and the National Privacy Commission, no legal advice.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm10',
  review_status: 'unreviewed',
  hook: {
    id: 'm10-c1',
    type: 'story-hook',
    scene: 'Tita Baby’s sala',
    speaker: 'Tita Baby',
    line: 'My health app sent my lab results to a stranger, anak! Who do I even complain to? Do I have any rights at all?',
    icon: 'shield',
    ara: {
      intro: 'Oh no. Yes, Tita Baby, you do have rights! Let us learn them, then practise speaking up.',
      done: 'Tara! Knowing your rights is the first step to using them.',
    },
  },
  cards: [
    {
      id: 'm10-c2',
      type: 'info',
      title: 'Your data, your rights',
      body: 'In the Philippines, the Data Privacy Act protects your personal information, and your health information gets extra care. Apps, clinics, schools and health plans must handle it fairly, and you have rights over it. You do not need to be a lawyer to use them.',
      icon: 'shield',
      ara: { intro: 'Your name, your face, your lab results: they are all yours.' },
    },
    {
      id: 'm10-c3',
      type: 'reveal',
      title: 'Your rights in plain words',
      prompt: 'Tap each one to see what it means for you.',
      tiles: [
        {
          label: 'Be informed',
          detail: 'Before an organisation uses your data, you can know what it collects, why, who gets it and how long it keeps it.',
        },
        {
          label: 'See your data',
          detail: 'Access: you can ask to see the personal data an organisation keeps about you.',
        },
        {
          label: 'Say no',
          detail: 'Object: you can say no to some uses of your data, such as marketing, and to certain automated decisions about you.',
        },
        {
          label: 'Fix it',
          detail: 'Correct: if something about you is wrong or out of date, you can ask for it to be corrected.',
        },
        {
          label: 'Erase or block',
          detail: 'You can ask an organisation to remove or stop using your data when it is no longer needed or was not handled properly.',
        },
        {
          label: 'And more',
          detail: 'You can ask for a copy of your data to take elsewhere (portability), you may be paid for harm caused by misuse (damages), and you can complain.',
        },
      ],
      ara: { done: 'Be informed, see it, say no, fix it, erase it, complain. That is quite a toolbox!' },
    },
    {
      id: 'm10-c4',
      type: 'choice',
      question: 'An AI system rejected your health insurance claim and the letter does not say why. What can you ask for?',
      options: [
        {
          text: 'Nothing. A computer decided, so that is final.',
          feedback: 'No. A decision is not final just because a computer made it. You are allowed to question it.',
        },
        {
          text: 'An explanation of the decision, and a review by a person.',
          feedback: 'Yes! You can ask the organisation to explain how the decision was made and to have a person look at it again. AI can make mistakes, often because the data about you is wrong.',
        },
        {
          text: 'A new account under a different name.',
          feedback: 'That would not fix anything, and it could cause new problems. Ask for the explanation and the human review instead.',
        },
      ],
      correct: 1,
      ara: { done: 'Always ask why, and ask for a person.' },
    },
    {
      id: 'm10-c5',
      type: 'choice',
      question: 'A clinic’s chatbot gave a patient harmful advice. The clinic says, "It was the AI, not us." Who is responsible?',
      options: [
        {
          text: 'The chatbot, because it said it.',
          feedback: 'A program cannot be held to account, and it cannot say sorry or fix things. People and organisations can.',
        },
        {
          text: 'The patient, for trusting a chatbot.',
          feedback: 'No. Patients should not have to double-check a clinic’s own tools. The clinic is the one who put it in front of them.',
        },
        {
          text: 'The clinic that chose to use the chatbot.',
          feedback: 'Yes! The organisation that decides to use AI answers for what it does. "The AI did it" is not an excuse.',
        },
      ],
      correct: 2,
      ara: { done: 'Someone chose that tool. Someone is accountable.' },
    },
    {
      id: 'm10-c6',
      type: 'reveal',
      title: 'How to complain',
      prompt: 'Tap each step. This is the path, in order.',
      tiles: [
        {
          label: '1. Write to the DPO',
          detail: 'Organisations that handle personal data have a Data Protection Officer (DPO). Write to them first and say clearly what happened and what you want.',
        },
        {
          label: '2. Keep records',
          detail: 'Save screenshots, letters, dates and replies. Note who you spoke to. Records make your complaint strong.',
        },
        {
          label: '3. Go to the NPC',
          detail: 'If the organisation does not answer or does not fix it, you can file a complaint with the National Privacy Commission (NPC).',
        },
        {
          label: 'Need help?',
          detail: 'Ask your barangay health worker or a trusted person to help you write. You do not have to do it alone. (This is educational, not legal advice.)',
        },
      ],
      ara: { done: 'Organisation first, keep records, then the NPC.' },
    },
    {
      id: 'm10-c7',
      type: 'swipe-sort',
      title: 'Privacy red flag or okay?',
      bins: [
        { id: 'red', label: 'Red flag' },
        { id: 'ok', label: 'Okay' },
      ],
      items: [
        {
          id: 'm10-s1',
          text: 'An app asks for your lab results and does not say who will see them',
          bin: 'red',
          why: 'Red flag: you have the right to be informed about who gets your data.',
        },
        {
          id: 'm10-s2',
          text: 'A clinic explains what it collects, why, and who to ask if you have questions',
          bin: 'ok',
          why: 'Okay: it tells you what is happening and gives you someone to talk to.',
        },
        {
          id: 'm10-s3',
          text: 'A rejection letter says "flagged by the system" and nothing else',
          bin: 'red',
          why: 'Red flag: you can ask for an explanation and a human review.',
        },
        {
          id: 'm10-s4',
          text: 'You can ask the health plan for a copy of the data it holds about you',
          bin: 'ok',
          why: 'Okay: that is your right of access.',
        },
        {
          id: 'm10-s5',
          text: 'There is no way to reach a person and no contact for questions',
          bin: 'red',
          why: 'Red flag: a trustworthy service has someone you can ask and a person who answers.',
        },
        {
          id: 'm10-s6',
          text: 'An app asks permission before sharing your data with outside companies',
          bin: 'ok',
          why: 'Okay: asking you first is how it should be, and you can say no.',
        },
        {
          id: 'm10-s7',
          text: 'A leak happened and the company is hiding it',
          bin: 'red',
          why: 'Red flag: after a serious breach, organisations must tell the NPC and the people affected.',
        },
        {
          id: 'm10-s8',
          text: 'You can correct a wrong detail in your record, and the organisation updates it',
          bin: 'ok',
          why: 'Okay: that is your right to correct.',
        },
      ],
      ara: { done: 'Spotting red flags early keeps you safe.' },
    },
    {
      id: 'm10-c8',
      type: 'poll',
      question: 'Did you know about these rights before today?',
      options: ['Yes, I knew most of them', 'I knew a few', 'This is all new to me', 'I knew I had rights, but not how to use them'],
      reflection: 'Thank you! Most people are in the same place, and that is why this matters. Next, you will stand up in a hearing and use your rights.',
    },
  ],
  game: {
    slug: 'objection',
    name: 'OBJECTION!',
    load: () => import('./ObjectionGame'),
  },
  takeaway: {
    id: 'm10-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust services that tell you how they use your data.',
      'You can ask "why?" and ask for a person.',
      'When something goes wrong, someone is accountable. It is never "just the AI".',
    ],
  },
};

export default content;
