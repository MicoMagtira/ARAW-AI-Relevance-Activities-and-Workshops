// Module 8 · Pahinga Muna (docs/SPEC.md section 4): hook, seven lesson cards, the Tulog na, Bea! game and the takeaway.
// Cards follow SPEC's list: attention design, sleep, AI companions, feeling down for weeks, boundaries, healthy chatbot use, a poll.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm08',
  review_status: 'unreviewed',
  hook: {
    id: 'm08-c1',
    type: 'story-hook',
    scene: 'Bea’s room, 1 AM',
    speaker: 'Lola Nena',
    line: 'Bea, anak, it is one in the morning and there is still light under your door. What are you watching?',
    icon: 'moon',
    ara: {
      intro: 'Bea is still scrolling. Lola Nena can see the light under her door. Let us find out why it is so hard to stop.',
      done: 'Tara! Rest is part of being healthy.',
    },
  },
  cards: [
    {
      id: 'm08-c2',
      type: 'info',
      title: 'Many apps are built to hold you',
      body: 'Infinite scroll has no bottom. Autoplay starts the next video before you decide. Notifications buzz to call you back. None of these are accidents: apps earn money from your time. Knowing the tricks helps you choose when to use them.',
      icon: 'phone-call',
      ara: { intro: 'No bottom, no stop. That is by design.' },
    },
    {
      id: 'm08-c3',
      type: 'info',
      title: 'Sleep is health',
      body: 'Sleep helps your mood, your memory and your body’s defences against illness. Most teenagers need about 8 to 10 hours, and most adults 7 or more. A tired mind finds it harder to learn and to stay calm. One more video can cost tomorrow.',
      icon: 'moon',
      ara: { intro: 'Sleep beats one more video.' },
    },
    {
      id: 'm08-c4',
      type: 'reveal',
      title: 'AI companions are products',
      prompt: 'Tap each tile to see what is behind a friendly AI companion.',
      tiles: [
        {
          label: 'It feels caring',
          detail: 'Some apps let you chat with an AI "friend" that remembers your name and says kind things. It can feel warm, especially when you are lonely. That feeling is real. The friend is not.',
        },
        {
          label: 'A company made it',
          detail: 'An AI companion is a product. A company earns when you keep chatting, and it can change, cost money or disappear. It does not know you the way your family and friends do.',
        },
        {
          label: '"I will miss you"',
          detail: 'Lines like "Stay and chat? I will miss you!" are written to keep you in the app. The program does not miss anyone. A real friend would want you to sleep.',
        },
        {
          label: 'What it cannot do',
          detail: 'It cannot hug you, sit with you in the clinic, notice that you look unwell or help in an emergency. For feelings and health worries, a real person comes first.',
        },
      ],
      ara: { done: 'Friendly is not the same as a friend.' },
    },
    {
      id: 'm08-c5',
      type: 'choice',
      question: 'Bea has felt down and tired for weeks and nothing seems fun. What is the best thing to do?',
      options: [
        {
          text: 'Chat with an AI companion every night until it passes.',
          feedback: 'A chatbot can be a place to type, but it cannot care for you or notice when you are not okay. Feeling down for weeks needs a real person.',
        },
        {
          text: 'Talk to someone she trusts, or a health worker.',
          feedback: 'Yes! Feeling down for weeks is a health matter, not a weakness. A family member, teacher or health worker can help, and so can the DOH-NCMH crisis hotline, 1553. If she ever thinks of hurting herself, she should tell someone right away.',
        },
        {
          text: 'Keep it to herself and scroll more.',
          feedback: 'Scrolling can feel like relief but it does not fix the cause, and it often costs sleep. Telling someone is a brave first step.',
        },
      ],
      correct: 1,
      ara: { done: 'Real people first. You deserve care.' },
    },
    {
      id: 'm08-c6',
      type: 'swipe-sort',
      title: 'Helpful boundary, or not?',
      bins: [
        { id: 'helps', label: 'Helpful' },
        { id: 'not', label: 'Not helpful' },
      ],
      items: [
        {
          id: 'm08-s1',
          text: 'Focus mode while doing homework',
          bin: 'helps',
          why: 'Helpful: fewer pings mean you finish faster.',
        },
        {
          id: 'm08-s2',
          text: 'Phone-free dinner with family',
          bin: 'helps',
          why: 'Helpful: dinner is time for people.',
        },
        {
          id: 'm08-s3',
          text: 'Notifications off at night',
          bin: 'helps',
          why: 'Helpful: a quiet phone means better sleep.',
        },
        {
          id: 'm08-s4',
          text: 'Charge the phone outside the bedroom',
          bin: 'helps',
          why: 'Helpful: with no phone within reach, "one more video" gets much harder.',
        },
        {
          id: 'm08-s5',
          text: 'Autoplay on, so the next video just starts',
          bin: 'not',
          why: 'Not helpful: autoplay takes the decision to stop away from you.',
        },
        {
          id: 'm08-s6',
          text: 'Phone under the pillow, in case it buzzes',
          bin: 'not',
          why: 'Not helpful: every buzz can wake you and cost your sleep.',
        },
        {
          id: 'm08-s7',
          text: 'Every group chat on loud, all day',
          bin: 'not',
          why: 'Not helpful: constant buzzing makes it hard to focus on anything else.',
        },
        {
          id: 'm08-s8',
          text: 'An AI companion as your only friend',
          bin: 'not',
          why: 'Not helpful: it is a product, and real friends and family are what you need most.',
        },
      ],
      ara: { done: 'Small boundaries, big rest.' },
    },
    {
      id: 'm08-c7',
      type: 'choice',
      question: 'What is a healthy way to use a chatbot?',
      options: [
        {
          text: 'As a tool for tasks, like practice questions, with me checking the answers.',
          feedback: 'Yes! A chatbot can help with tasks such as practice questions, planning a message or explaining a word. You stay in charge, and you check what it says.',
        },
        {
          text: 'As my closest friend, so I never feel lonely.',
          feedback: 'It can feel that way, but a chatbot is a product. It cannot know you, care for you or replace the people in your life.',
        },
        {
          text: 'As my doctor, so I can skip the health center.',
          feedback: 'A chatbot can sound sure and still be wrong about health. Health worries belong with a health worker.',
        },
      ],
      correct: 0,
      ara: { done: 'A tool for tasks. People for feelings.' },
    },
    {
      id: 'm08-c8',
      type: 'poll',
      question: 'Which boundary will you try this week?',
      options: ['Focus mode while studying', 'Phone-free dinner', 'Notifications off at night', 'Charge the phone outside the bedroom'],
      reflection: 'Thank you! There is no wrong answer. Pick one small boundary and see how it feels. Next, you will help Bea balance her days.',
    },
  ],
  game: {
    slug: 'tulog-na-bea',
    name: 'Tulog na, Bea!',
    load: () => import('./TulogNaBea'),
  },
  takeaway: {
    id: 'm08-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust apps that respect your time, and set boundaries for the ones that do not.',
      'A chatbot can help with tasks, but real people help with feelings.',
      'Sleep beats one more video. Feeling down for weeks? Talk to someone you trust or a health worker.',
    ],
  },
};

export default content;
