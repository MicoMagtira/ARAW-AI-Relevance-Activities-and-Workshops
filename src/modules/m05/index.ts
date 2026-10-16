// Module 5 · Check Before You Share (docs/SPEC.md section 4): hook, seven lesson cards, the Tita's GC game and the takeaway.
// Cards follow SPEC's list: Pause, check who said it, another source, FDA steps, the kindest reply, quote-sharing, where to report.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm05',
  review_status: 'unreviewed',
  hook: {
    id: 'm05-c1',
    type: 'story-hook',
    scene: 'The family group chat lights up',
    speaker: 'Tita Baby',
    line: 'Miracle tea replaces your maintenance meds! 100% natural, no side effects! Please share 🙏🙏🙏',
    icon: 'mail',
    ara: {
      intro: 'Hey, the family GC is buzzing. Tita Baby means well. Let us learn how to check first, and answer kindly.',
      done: 'Here we go! Three small steps, and one kind reply.',
    },
  },
  cards: [
    {
      id: 'm05-c2',
      type: 'info',
      title: 'Step 1: Pause',
      body: 'If a post makes you scared or angry, that is the moment to pause. Fake posts are made to hurry you. Take a breath, and put the phone down for a minute. Nothing bad happens when you wait to share. Checking takes only a few minutes, and your family is safer for it.',
      icon: 'clock',
      ara: { intro: 'Step 1 is the easiest one: do nothing for a minute.' },
    },
    {
      id: 'm05-c3',
      type: 'reveal',
      title: 'Step 2: Check who said it',
      prompt: 'Tap each tile to see what to look at.',
      tiles: [
        {
          label: 'The page name',
          detail: 'Open the page itself, not only the post. Is the name a copy, with a small spelling change? When was the page made? What else does it post?',
        },
        {
          label: 'The date',
          detail: 'Old posts come back again and again as "new". Check when it was first posted. A message with the place names changed is a copy.',
        },
        {
          label: 'The official account',
          detail: 'Go to the real page yourself, by searching its name. A badge helps but is not proof. If the official page says nothing, be careful.',
        },
        {
          label: 'A real person',
          detail: 'Ask someone you can talk to: your barangay health worker, a nurse or your doctor. A real person can tell you what is true for you.',
        },
      ],
      ara: { done: 'Page, date, official account, a real person. Four quick looks.' },
    },
    {
      id: 'm05-c4',
      type: 'choice',
      question: 'Step 3 is to look for another source. Which one counts?',
      options: [
        {
          text: 'The same post, forwarded by three other groups',
          feedback: 'Not a new source. Forwards copy each other, so ten copies are still one post. Look for a source that wrote it on its own.',
        },
        {
          text: "The DOH's official page, an independent fact-checker, or your health worker",
          feedback: 'Yes! These checked the facts themselves. When two or more of them agree, you can trust the answer much more.',
        },
        {
          text: 'A comment under the post saying "legit, it worked for me!"',
          feedback: 'Comments can be written by anyone, even by the seller. One story is not proof.',
        },
      ],
      correct: 1,
      ara: { done: 'Another source means a source that checked, not one more copy.' },
    },
    {
      id: 'm05-c5',
      type: 'reveal',
      title: 'Checking a product with the FDA',
      prompt: 'Tap each step, in order.',
      tiles: [
        {
          label: '1. Search the product name',
          detail: 'Open the FDA Philippines online verification portal and type the product name exactly as it is written on the label.',
        },
        {
          label: '2. Registered, or not?',
          detail: 'If the product is registered, it appears in the list. If nothing comes up, a health claim on it is a red flag. Unregistered does not always mean dangerous, but do not trust its claims.',
        },
        {
          label: '3. Read the note',
          detail: 'A food supplement must say "No approved therapeutic claims". That means it is not medicine. It cannot cure diabetes or replace the medicine your doctor gave you.',
        },
        {
          label: '4. Still unsure? Ask',
          detail: 'Show the label to your health worker or pharmacist. Never stop or change your maintenance medicine without talking to your doctor.',
        },
      ],
      ara: { done: 'Search, registered or not, read the note, ask. There you go!' },
    },
    {
      id: 'm05-c6',
      type: 'choice',
      question: 'Tita forwards the tea post to the GC. Which reply helps most?',
      options: [
        {
          text: '"Tita, stop sharing fake news. How embarrassing!"',
          feedback: 'It may be true that the post is fake, but shaming makes people hide and stop listening. Tita shared out of love.',
        },
        {
          text: '"Thank you for caring, Tita! I checked: this tea has no FDA registration. Let us ask Kuya Jun before Lola changes anything."',
          feedback: 'Yes! Warm first, then the facts, then a source and a next step. Kindness keeps your family listening.',
        },
        {
          text: '"Okay 👍" and say nothing more',
          feedback: 'Kind, but Lola is still reading it. A gentle correction, with a source, is part of caring.',
        },
      ],
      correct: 1,
      ara: { done: 'Warm, true, and with a source. That is the recipe.' },
    },
    {
      id: 'm05-c7',
      type: 'choice',
      question: 'Should you quote-share the fake post to warn everyone?',
      options: [
        {
          text: 'Yes, post it again with "FAKE!" on top',
          feedback: 'It often backfires. The fake spreads to more people, and many only see the post, not your warning.',
        },
        {
          text: 'Better: reply privately and share the correct information instead',
          feedback: 'Yes! A private, kind message is easier to hear. Then share the checked facts, not the fake.',
        },
        {
          text: 'Delete the chat so nobody sees it',
          feedback: 'It does not help. Others have seen it already, and the people who believed it are left without an answer.',
        },
      ],
      correct: 1,
      ara: { done: 'Share the true thing, not the fake thing. Smart move!' },
    },
    {
      id: 'm05-c8',
      type: 'reveal',
      title: 'Where to report',
      prompt: 'Tap each place. You do not have to report everything. These are here when you need them.',
      tiles: [
        {
          label: "The platform's Report button",
          detail: 'Use Report on the post or the page. It is quick, and it tells the platform to look at it.',
        },
        {
          label: 'Fact-checkers',
          detail: 'Independent fact-checkers check viral claims. You can send them a post and read their answers.',
        },
        {
          label: 'The FDA, for illegal products',
          detail: 'Tell the FDA Philippines about products that are not registered or that make false health claims.',
        },
        {
          label: 'The cybercrime hotline, for scams',
          detail: 'If someone asked for money or tried to cheat your family, call the cybercrime hotline, 1326. Never send money to a "miracle cure" seller.',
        },
        {
          label: 'Your health worker',
          detail: 'Ask the barangay health worker or the health center. They can also tell your neighbours the truth in person.',
        },
      ],
      ara: { done: 'Five places to turn to. You are never alone with a scam.' },
    },
  ],
  game: {
    slug: 'titas-gc',
    name: "Tita's GC",
    load: () => import('./TitasGc'),
  },
  takeaway: {
    id: 'm05-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust a forward only after you paused, checked who said it, and found another trusted source.',
      'Kindness keeps your family listening. Thank the person first, then share the facts and a source.',
      'When you are unsure, do not share. Ask your health worker instead.',
    ],
  },
};

export default content;
