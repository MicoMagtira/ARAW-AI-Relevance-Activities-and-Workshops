// Module 6 · Katuwang si AI (docs/SPEC.md section 4): hook, seven lesson cards, the Hati Tayo! game and the takeaway.
// Cards follow SPEC's list: AI is a tool, sort the tasks, AI's weak spots, who checks, jobs change, who is responsible, a poll.
import type { ModuleContent } from '../types';

const content: ModuleContent = {
  id: 'm06',
  review_status: 'unreviewed',
  hook: {
    id: 'm06-c1',
    type: 'story-hook',
    scene: 'The barangay health center, Monday morning',
    speaker: 'Kuya Jun',
    line: 'So much paperwork, Ara! The barangay just gave us a new AI helper. Can it do my whole job?',
    icon: 'briefcase',
    ara: {
      intro: 'Kuya Jun is buried in forms. A new AI helper has arrived. Let us find out what it is good at, and what it is not.',
      done: 'Tara! AI for the repeat jobs, people for the caring.',
    },
  },
  cards: [
    {
      id: 'm06-c2',
      type: 'info',
      title: 'AI is a tool. People do the caring.',
      body: 'An AI helper is like a very fast calculator or photocopier. It is great at jobs that repeat: counting, sorting, copying, drafting and scheduling. It does not know your neighbours, it does not feel worry, and it cannot be blamed. Use it to save time, so you have more time for people.',
      icon: 'briefcase',
      ara: { intro: 'The helper is fast. The caring is still ours.' },
    },
    {
      id: 'm06-c3',
      type: 'swipe-sort',
      title: 'Good for AI, or needs a person?',
      bins: [
        { id: 'ai', label: 'Good for AI' },
        { id: 'person', label: 'Needs a person' },
      ],
      items: [
        {
          id: 'm06-s1',
          text: 'Count the boxes of vitamins in the stockroom',
          bin: 'ai',
          why: 'Good for AI: counting is the same job again and again.',
        },
        {
          id: 'm06-s2',
          text: 'Translate a dengue leaflet draft',
          bin: 'ai',
          why: 'Good for AI as a first draft. A person must still check it.',
        },
        {
          id: 'm06-s3',
          text: 'Comfort a worried mother at the door',
          bin: 'person',
          why: 'Needs a person: comfort comes from someone who cares.',
        },
        {
          id: 'm06-s4',
          text: 'Decide whether a patient goes to the hospital today',
          bin: 'person',
          why: 'Needs a person: a referral is a health decision with a name behind it.',
        },
        {
          id: 'm06-s5',
          text: "Plan this week's home visits from a list",
          bin: 'ai',
          why: 'Good for AI: fitting names into days is a pattern job. Check the plan.',
        },
        {
          id: 'm06-s6',
          text: 'Visit Lolo Ben, who lives alone and feels low',
          bin: 'person',
          why: 'Needs a person: being there is the care.',
        },
      ],
      ara: { done: 'Repeat jobs to AI. Care and decisions to people.' },
    },
    {
      id: 'm06-c4',
      type: 'reveal',
      title: "AI's weak spots",
      prompt: 'Tap each tile to see where AI needs a person beside it.',
      tiles: [
        {
          label: 'Empathy',
          detail: 'AI has no feelings. It can write kind words, but it does not care about you. A worried mother needs a person who listens.',
        },
        {
          label: 'Local context',
          detail: 'AI does not know your barangay: who lives alone, which road floods, who needs a gentle word. People who live there do.',
        },
        {
          label: 'Judgement calls',
          detail: 'When two things matter at once, or the facts are unclear, someone has to weigh them. AI can sound sure and still be wrong.',
        },
        {
          label: 'Accountability',
          detail: 'If something goes wrong, you cannot blame the tool. A health worker answers for their decisions. AI cannot.',
        },
      ],
      ara: { done: 'Empathy, local context, judgement, accountability. People first.' },
    },
    {
      id: 'm06-c5',
      type: 'choice',
      question: 'The AI translates a health leaflet into Hiligaynon. Who checks it?',
      options: [
        {
          text: 'Nobody. The AI is fast, so it is surely right.',
          feedback: 'Fast does not mean right. A wrong word in a health leaflet can confuse or even harm someone. A person should check it.',
        },
        {
          text: 'A fluent speaker, before it is printed',
          feedback: 'Yes! This is "human in the loop": the AI drafts, and a person checks and decides before it goes out.',
        },
        {
          text: 'The people who read the leaflet, after it is printed',
          feedback: 'Too late. Once it is printed and handed out, mistakes are hard to fix. Check first.',
        },
      ],
      correct: 1,
      ara: { done: 'Human in the loop: AI drafts, a person checks.' },
    },
    {
      id: 'm06-c6',
      type: 'info',
      title: 'Jobs change more than they vanish',
      body: 'Looking back, most new tools changed jobs more than they ended them. Some tasks go to machines, new tasks appear, and people learn new skills. The skills that last are the human ones: caring, explaining, judging and checking. Keep learning, and ask your workplace how the tool will be used.',
      icon: 'learn',
      ara: { intro: 'Do not worry too much. But do keep learning!' },
    },
    {
      id: 'm06-c7',
      type: 'choice',
      question: 'The AI helper made a wrong schedule, and two home visits were missed. Who is responsible?',
      options: [
        {
          text: 'The AI. It made the mistake.',
          feedback: 'A tool cannot be responsible. It does not know it was wrong, and it cannot fix anything or say sorry.',
        },
        {
          text: 'Nobody. These things happen with new tools.',
          feedback: 'Someone always is responsible. If nobody owns the mistake, nobody fixes it, and the missed families are left waiting.',
        },
        {
          text: 'The people who chose the tool and use it',
          feedback: 'Yes! The people who picked the tool, and the people who used it without checking, are responsible. That is why we check.',
        },
      ],
      correct: 2,
      ara: { done: 'A person always answers for the work, even when AI helped.' },
    },
    {
      id: 'm06-c8',
      type: 'poll',
      question: 'Which task would you hand to AI first?',
      options: ['Counting and sorting records', 'Writing a first draft of a notice', 'Planning a schedule', 'None, I prefer to do it myself'],
      reflection: 'Thank you! There is no wrong answer. All of these are good picks if you check the result. Next, you will run a whole busy day.',
    },
  ],
  game: {
    slug: 'hati-tayo',
    name: 'Hati Tayo!',
    load: () => import('./HatiTayo'),
  },
  takeaway: {
    id: 'm06-takeaway',
    type: 'takeaway',
    bullets: [
      'Trust AI with repeat drafts you can check, such as counting, sorting, scheduling and first drafts.',
      'Keep people for care and decisions: comforting, local knowledge, judgement calls and health advice.',
      'Someone must always be responsible. A person checks the AI before its work goes out.',
    ],
  },
};

export default content;
