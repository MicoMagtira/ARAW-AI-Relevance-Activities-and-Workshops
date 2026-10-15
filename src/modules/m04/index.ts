// Module 4 · Tricks of Health Misinformation (docs/SPEC.md section 4): hook, seven lesson cards, the Spot the Tactic game and the takeaway.
// The mini round after the takeaway is the 10-item Fact or Fake with the Truth Radar (see practiceCount in ../engine.ts).
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm04',
  review_status: 'unreviewed',
  hook: {
    id: 'm04-c1',
    type: 'story-hook',
    scene: 'The family group chat',
    speaker: 'Tita Baby',
    line: 'Doctor reveals: this tea cures diabetes in 7 days! Share before it\'s deleted!',
    icon: 'mail',
    ara: {
      intro: 'Uy, Tita Baby forwarded something again. It is full of tricks. Let us find them.',
      done: 'Tara! Learn the trick and you can spot a hundred fakes.',
    },
  },
  cards: [
    {
      id: 'm04-c2',
      type: 'info',
      title: 'Misinformation uses tricks, not just wrong facts',
      body: 'A fake post often works because of how it is made, not only what it says. It scares you, flatters you, or borrows a doctor\'s face. Learn the trick and you can spot a hundred different fakes. A trick is a reason to check. It is not proof that a post is false.',
      icon: 'warning',
    },
    {
      id: 'm04-c3',
      type: 'reveal',
      title: 'Meet the villains',
      prompt: 'Tap each villain to flip the card and see its trick.',
      tiles: [
        {
          label: 'Dr. Fake',
          detail: '"Trust me, I\'m a doctor!" A "doctor" sells a product, often in a video on a sales page. Counter-move: look for the doctor\'s own official page and the product\'s FDA registration.',
        },
        {
          label: 'Miracle Mike',
          detail: '"Cures everything, 100% natural!" One product for many diseases, "no side effects", "replaces your medicine". Counter-move: ask if it is registered and proven. Natural does not mean safe.',
        },
        {
          label: 'Fear Monger',
          detail: '"SHARE BEFORE IT\'S DELETED!!!" ALL CAPS, countdowns and "your family is in danger". Counter-move: pause. A strong feeling is the time to check, not to share.',
        },
        {
          label: 'Conspiracy Kuya',
          detail: '"Doctors don\'t want you to know this!" A secret plot with no source, where any proof against it is "part of the cover-up". Counter-move: ask who gains and where the evidence is.',
        },
        {
          label: 'Kwento Kim',
          detail: '"It worked for my neighbour!" One story in place of evidence. Counter-move: one story is not proof. Look at what studies and health workers say.',
        },
      ],
      ara: { done: 'Five villains, five tricks. You will meet them again in the game.' },
    },
    {
      id: 'm04-c4',
      type: 'choice',
      question: 'A video shows a "doctor" selling a tea that "cures diabetes". What is the best check?',
      options: [
        {
          text: 'Look for glitches in his face and voice',
          feedback: 'Not the best. Fake videos are getting hard to spot, and a real video can still sell a false claim. Do not rely on glitches alone.',
        },
        {
          text: "Look for the doctor's own official page and the product's FDA registration",
          feedback: 'Yes! Check the source, not the face. A real doctor has an official page that confirms the claim, and a medicine has an FDA registration. A video on a sales page proves nothing.',
        },
        {
          text: 'Count how many people shared it',
          feedback: 'Shares are not proof. A false post can travel very far, very fast.',
        },
      ],
      correct: 1,
      ara: { done: 'Check the source, not the face. That is the Dr. Fake counter-move.' },
    },
    {
      id: 'm04-c5',
      type: 'choice',
      question: '"Share before it\'s deleted!" Which villain is this?',
      options: [
        {
          text: 'Fear Monger: scary words and a rush',
          feedback: 'Yes! A deadline makes you share before you think. The counter-move is to pause and check first.',
        },
        {
          text: 'Dr. Fake: a fake expert',
          feedback: 'Not here. Nobody claims to be a doctor in this line. It is the rush that gives it away.',
        },
        {
          text: 'Kwento Kim: one story',
          feedback: 'Not this one. There is no story in the line, only pressure to share quickly.',
        },
      ],
      correct: 0,
      ara: { done: 'Kalma lang, Fear Monger. We pause first.' },
    },
    {
      id: 'm04-c6',
      type: 'choice',
      question: '"It worked for my neighbour!" Is that enough proof?',
      options: [
        {
          text: 'Yes. She is my neighbour, so I trust her',
          feedback: 'She may be sincere, but one person cannot show that something works. Many other things could explain her story.',
        },
        {
          text: 'No. One story is not evidence: that is Kwento Kim',
          feedback: 'Yes! One story is not proof. Look for what studies and your health worker say.',
        },
        {
          text: 'Yes, if three neighbours say it',
          feedback: 'Still stories. A few stories are picked by chance. Real evidence compares many people.',
        },
      ],
      correct: 1,
      ara: { done: 'Nice kwento, Kim. Pero isang kwento lang.' },
    },
    {
      id: 'm04-c7',
      type: 'swipe-sort',
      title: 'Trick post, or true post?',
      bins: [
        { id: 'trick', label: 'Trick post' },
        { id: 'true', label: 'True post' },
      ],
      items: [
        {
          id: 'm04-s1',
          text: 'Cures diabetes, high blood pressure AND arthritis. 100% natural, zero side effects!',
          bin: 'trick',
          why: 'Trick: Miracle Mike. One product cannot cure three diseases, and "zero side effects" is a tell.',
        },
        {
          id: 'm04-s2',
          text: 'Barangay Health Center: free measles vaccines for children on Wednesday mornings. Bring the vaccine card.',
          bin: 'true',
          why: 'True: a named health center, a clear place and time, and nothing to buy. Good news can be true.',
        },
        {
          text: 'URGENT!!! Hospitals are FULL!!! SHARE NOW before they delete this!!!',
          id: 'm04-s3',
          bin: 'trick',
          why: 'Trick: Fear Monger. ALL CAPS, "!!!" and a deadline push you to share before you check.',
        },
        {
          id: 'm04-s4',
          text: 'Wash your hands with soap and water for at least 20 seconds. It helps stop many infections.',
          bin: 'true',
          why: 'True: simple, well-known advice with no sales pitch and no panic. The WHO says the same.',
        },
        {
          id: 'm04-s5',
          text: 'My friend\'s cousin tried this oil and was fine the next day. Everyone should use it!',
          bin: 'trick',
          why: 'Trick: Kwento Kim. A story passed through two friends is not evidence.',
        },
        {
          id: 'm04-s6',
          text: 'High blood pressure often has no signs. Get a free check at your health center, even when you feel fine.',
          bin: 'true',
          why: 'True: calm, well-established advice that points you to a health worker.',
        },
      ],
      ara: { done: 'True posts exist, and you can say so. Doubting everything is a trap too.' },
    },
    {
      id: 'm04-c8',
      type: 'reveal',
      title: 'How vaccine fear spreads',
      prompt: 'Tap each tile. No blame: people share these out of care.',
      tiles: [
        {
          label: 'Scary stories travel faster',
          detail: 'A frightening story about one child spreads far quicker than a calm checked fact. Worried parents share it to protect others. That care is good. The story is what needs checking.',
        },
        {
          label: 'Vaccines are tested first',
          detail: 'Vaccines are tested for safety and how well they work before they are approved. Many people are checked before a vaccine is offered to everyone.',
        },
        {
          label: 'And watched afterwards',
          detail: 'After approval, health authorities keep watching for side effects, and they investigate every report. Ask your barangay health worker about your child\'s vaccine schedule.',
        },
      ],
      ara: { done: 'Fear spreads fast. A calm check and a health worker spread truth.' },
    },
  ],
  game: {
    slug: 'spot-the-tactic',
    name: 'Spot the Tactic',
    load: () => import('./SpotTheTactic'),
  },
  takeaway: {
    id: 'm04-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust a post when the source checks out, other trusted sources agree and no trick is doing the work.',
      'A trick is a reason to check, not proof that a post is false. Pause, then look for the official page or another source.',
      'True health news exists, so do not doubt everything. Learn to say "this one is legit" as well as "this is a trick".',
    ],
  },
};

export default content;
