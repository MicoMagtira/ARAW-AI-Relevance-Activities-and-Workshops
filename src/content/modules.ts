// The ten ARAW modules (docs/SPEC.md section 4). Lesson content lives in src/modules/m01..m10 and loads on demand.
export interface ModuleInfo {
  id: string;
  n: number;
  title: string;
  /** Short label for the path strip. */
  short: string;
  /** Core (M1 to M5) or More (M6 to M10) row on the Learn path. */
  group: 'core' | 'more';
  topic: string;
  /** Name of the module's signature game. */
  game: string;
  /** "Learners can..." list shown in the details sheet. */
  objectives: readonly string[];
  /** Lesson card steps (the hook plus the lesson cards): progress shows "x / cards". */
  cards: number;
  review_status: 'unreviewed';
}

const mod = (n: number, title: string, short: string, topic: string, game: string, objectives: readonly string[], cards = 7): ModuleInfo => ({
  id: `m${String(n).padStart(2, '0')}`,
  n,
  title,
  short,
  group: n <= 5 ? 'core' : 'more',
  topic,
  game,
  objectives,
  cards,
  review_status: 'unreviewed',
});

export const MODULES: readonly ModuleInfo[] = [
  mod(1, 'What Is AI, Really?', 'What Is AI?', 'What AI is, AI around us, and real AI versus hype.', 'AI or Not?', [
    'Describe AI as learning patterns from many examples to make guesses.',
    'Spot the AI you already use every day.',
    'Tell real AI from "AI-powered" hype.',
  ], 9),
  mod(2, 'How AI Learns and Makes Mistakes', 'How AI Learns', 'Training data, bias, confident errors and explanations.', 'Turuan si AI', [
    'Explain that AI learns only from the examples it is given.',
    'Recognise that lopsided examples make biased AI.',
    'Know that AI can be confidently wrong, and that asking "why?" is fair.',
  ]),
  mod(3, 'AI and Your Health', 'AI and Your Health', 'Chatbot answers, red flags, health data privacy, AI that assists doctors.', 'Tanong kay Chatbot', [
    'Judge whether a chatbot answer is usable, wrong, or a "see a health worker now" case.',
    'Know the red-flag symptoms that always go to a professional.',
    'Protect your health data and know that AI assists doctors, it does not replace them.',
  ]),
  mod(4, 'Tricks of Health Misinformation', 'Misinfo Tricks', 'Five misinformation tricks, deepfaked doctors, and trusting true posts.', 'Spot the Tactic', [
    'Name the five misinformation tricks.',
    'Spot them in local-style posts, including AI-deepfaked doctor endorsements.',
    'Rate true posts as true.',
  ]),
  mod(5, 'Check Before You Share', 'Check Before Sharing', 'A three-step checking habit, replying kindly, and where to report.', "Tita's GC", [
    'Pause, check who said it, and look for another source.',
    'Reply to family kindly without shaming.',
    'Know where to report misinformation.',
  ]),
  mod(6, 'Katuwang si AI', 'Katuwang si AI', 'AI as a tool at work, humans in the loop, and who is responsible.', 'Hati Tayo!', [
    'Name tasks AI does well and tasks that need people.',
    'Explain "human in the loop".',
    'Say who is responsible when AI is used at work.',
  ]),
  mod(7, 'Gawa ni AI?', 'Gawa ni AI?', 'Generative AI, labels, consent and credit.', "Gawa Ko 'To!", [
    'Explain that generative AI makes new content from patterns.',
    'Label AI-made content, ask consent and credit artists.',
    'Explain why deepfaked doctor ads cause harm.',
  ]),
  mod(8, 'Pahinga Muna', 'Pahinga Muna', 'Attention-grabbing design, sleep, AI companions and healthy boundaries.', 'Tulog na, Bea!', [
    'Name the design tricks that keep people scrolling.',
    'Explain why sleep matters and see AI companions as products, not friends.',
    'Set simple boundaries and know when to talk to a real person.',
  ]),
  mod(9, 'Para sa Lahat', 'Para sa Lahat', 'Who gets left out of health AI, bias from data, and inclusive design.', 'Sa Sapatos Nila', [
    'Name the groups often left out by health tech.',
    'Explain that biased data makes unfair AI and suggest fixes.',
    'Insist on a human option.',
  ]),
  mod(10, 'Karapatan Mo', 'Karapatan Mo', 'Your data rights in plain words and who is accountable.', 'OBJECTION!', [
    'List your data rights in plain words.',
    'Describe the complaint path, from the organisation to the National Privacy Commission.',
    'Know that the organisation using AI is responsible, not "the AI".',
  ]),
];

export const MODULE_COUNT = MODULES.length;
export const moduleById = (id: string): ModuleInfo | undefined => MODULES.find((m) => m.id === id);
