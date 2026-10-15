// Sa Sapatos Nila content: the visitors to the health-center kiosk, the barriers that stop them, and the fixes that remove those
// barriers. All people are fictional. Rules live in sim.ts; this file is plain data so it is easy to review.
import type { IconName } from '../../ui/icons';

export type LangId = 'ilocano' | 'kapampangan' | 'cebuano' | 'waray' | 'hiligaynon' | 'bikol';
export const LANGS: readonly LangId[] = ['ilocano', 'kapampangan', 'cebuano', 'waray', 'hiligaynon', 'bikol'];
export const LANG_NAME: Readonly<Record<LangId, string>> = {
  ilocano: 'Ilocano',
  kapampangan: 'Kapampangan',
  cebuano: 'Cebuano',
  waray: 'Waray',
  hiligaynon: 'Hiligaynon',
  bikol: 'Bikol',
};

export type LangFixId = `lang-${LangId}`;
export type FixId = 'large-text' | 'voice' | 'captions' | 'lower' | 'counter' | LangFixId;
/** What stops a person at the kiosk. A language barrier is named after the language fix that removes it. */
export type BarrierId = 'blur' | 'blind' | 'reading' | 'sound' | 'reach' | 'phone' | LangFixId;

/** The three screens of the task "book a check-up and get a queue number". */
export type StepId = 0 | 1 | 2;
export const STEP_COUNT = 3;

export interface Fix {
  id: FixId;
  name: string;
  icon: IconName;
  /** Fix points it costs to install. */
  cost: number;
  /** What it does, in plain words. */
  what: string;
}

const langFix = (l: LangId): Fix => ({
  id: `lang-${l}`,
  name: `Language: ${LANG_NAME[l]}`,
  icon: 'chat',
  cost: 1,
  what: `The kiosk can be switched to ${LANG_NAME[l]}, screens and sounds.`,
});

export const FIXES: readonly Fix[] = [
  { id: 'large-text', name: 'Large text', icon: 'search', cost: 1, what: 'Bigger, bolder letters on every screen.' },
  { id: 'voice', name: 'Voice guide', icon: 'phone-call', cost: 2, what: 'The kiosk reads each screen aloud, in Filipino and English.' },
  { id: 'captions', name: 'Captions', icon: 'article', cost: 1, what: 'Every sound also appears as words on the screen.' },
  { id: 'lower', name: 'Lower screen', icon: 'arrow-right', cost: 2, what: 'The buttons sit low enough to reach from a seat.' },
  { id: 'counter', name: 'Assisted counter', icon: 'me', cost: 2, what: 'A staff member helps anyone who cannot use the kiosk.' },
  ...LANGS.map(langFix),
];

export const fixById = (id: FixId): Fix => FIXES.find((f) => f.id === id) ?? (FIXES[0] as Fix);

export interface Barrier {
  id: BarrierId;
  /** The simulation filter, as a short label. */
  filter: string;
  /** Which screen it bites on. */
  step: StepId;
  /** Fixes that remove it. Empty: the kiosk can never serve them, only a person can. */
  fixes: readonly FixId[];
  /** What the player sees or hears, in words (the filter is also drawn, but this is always real text). */
  feel: string;
  /** Why the visitor is stuck; `{name}` is the visitor. */
  stuck: string;
  /** What this teaches, shown when the person has been served or has left. */
  lesson: string;
}

const langBarrier = (l: LangId): Barrier => ({
  id: `lang-${l}`,
  filter: 'Unfamiliar language',
  step: 1,
  fixes: [`lang-${l}`],
  feel: `The kiosk only speaks English and Filipino. The words look like gibberish, because ${LANG_NAME[l]} is the language {name} knows.`,
  stuck: `{name} stares at words they cannot read. The kiosk has no ${LANG_NAME[l]}.`,
  lesson: 'A language choice lets people use the kiosk in the language they know best. Voices and text trained on only a few languages leave others out.',
});

export const BARRIERS: Readonly<Record<BarrierId, Barrier>> = {
  blur: {
    id: 'blur',
    filter: 'Blurry view',
    step: 1,
    fixes: ['large-text', 'voice'],
    feel: 'Everything on the screen is a blur. The small letters run together, so {name} cannot tell which button is which.',
    stuck: '{name} squints at the blur and cannot read the buttons.',
    lesson: 'Large text or a voice guide lets people with low vision use the same kiosk as everyone else.',
  },
  blind: {
    id: 'blind',
    filter: 'Cannot see the screen',
    step: 1,
    fixes: ['voice'],
    feel: 'The screen is dark to {name}. Only what the kiosk says aloud can be used, and right now it says nothing.',
    stuck: '{name} cannot see the screen, and the kiosk does not speak.',
    lesson: 'A voice guide that reads every screen aloud is the way a person who cannot see the screen can use a kiosk.',
  },
  reading: {
    id: 'reading',
    filter: 'Hard to read',
    step: 1,
    fixes: ['voice'],
    feel: 'The sentences are long and full of small words. {name} finds reading hard and cannot follow what to press.',
    stuck: '{name} gives up on the long words on the screen.',
    lesson: 'A voice guide helps people who find reading hard. Plain words and pictures help too.',
  },
  sound: {
    id: 'sound',
    filter: 'No sound, no captions',
    step: 2,
    fixes: ['captions'],
    feel: 'The kiosk says the queue number aloud and shows only "Listen for your number". {name} is Deaf: the sound is missing and there are no captions.',
    stuck: 'The kiosk announces the number aloud. {name} cannot hear it, and there are no captions.',
    lesson: 'Captions turn every sound into words, so Deaf and hard-of-hearing people do not miss the message.',
  },
  reach: {
    id: 'reach',
    filter: 'Out of reach',
    step: 0,
    fixes: ['lower'],
    feel: 'The buttons are above the reach line. From a wheelchair, {name} cannot press them.',
    stuck: '{name} stretches, but the button is too high to reach.',
    lesson: 'Where buttons are placed matters. A lower screen can be used from a seat, standing or by a child.',
  },
  phone: {
    id: 'phone',
    filter: 'No smartphone',
    step: 0,
    fixes: [],
    feel: 'The kiosk starts by asking you to scan a QR code with a smartphone. {name} does not have one.',
    stuck: '{name} has no smartphone to scan the QR code with, so the kiosk will not start.',
    lesson: 'Not everyone has a smartphone. An assisted counter keeps a human option, so nobody is turned away.',
  },
  ...Object.fromEntries(LANGS.map((l) => [`lang-${l}`, langBarrier(l)])),
} as unknown as Readonly<Record<BarrierId, Barrier>>;

export const barrierById = (id: BarrierId): Barrier => BARRIERS[id];

/** How a visitor is drawn (see Person.tsx). Colours are design tokens. */
export interface Look {
  hair: string;
  skin: string;
  shirt: string;
  acc: 'none' | 'glasses' | 'cane' | 'wheelchair' | 'hat';
}

export interface Persona {
  id: string;
  name: string;
  who: string;
  task: string;
  barriers: readonly BarrierId[];
  look: Look;
  /** Said after being served. */
  thanks: string;
  /** Said when they leave without help. */
  left: string;
}

const SKIN = 'var(--gold-deep)';

const lang = (id: string, name: string, l: LangId, who: string, look: Look): Persona => ({
  id,
  name,
  who,
  task: 'Book a check-up and get a queue number.',
  barriers: [`lang-${l}`],
  look,
  thanks: 'Salamat! Now I understand every word.',
  left: `${name} shakes their head and walks out, still without an appointment.`,
});

export const PERSONAS: readonly Persona[] = [
  {
    id: 'lola-nena',
    name: 'Lola Nena',
    who: 'Lola Nena, 72. Her eyesight is blurry.',
    task: 'Book a check-up and get a queue number.',
    barriers: ['blur'],
    look: { hair: 'var(--soft)', skin: SKIN, shirt: 'var(--coral)', acc: 'glasses' },
    thanks: 'Ay, salamat, anak! I can read it now.',
    left: 'Lola Nena sighs and goes home without her check-up.',
  },
  {
    id: 'jun',
    name: 'Jun',
    who: 'Jun, 16. He is Deaf.',
    task: 'Get a queue number for the school vaccine day.',
    barriers: ['sound'],
    look: { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--navy)', acc: 'none' },
    thanks: 'Thanks! I can read my number on the screen.',
    left: 'Jun waits, then realises the number was only spoken aloud, and leaves.',
  },
  lang('mang-ben', 'Mang Ben', 'ilocano', 'Mang Ben, a farmer who speaks only Ilocano.', { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--fact)', acc: 'hat' }),
  {
    id: 'kuya-rey',
    name: 'Kuya Rey',
    who: 'Kuya Rey, 35. He uses a wheelchair.',
    task: 'Book a check-up and get a queue number.',
    barriers: ['reach'],
    look: { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--navy)', acc: 'wheelchair' },
    thanks: 'Ayos! Easy to reach now.',
    left: 'Kuya Rey cannot reach the buttons and turns his wheelchair around.',
  },
  {
    id: 'aling-pacita',
    name: 'Aling Pacita',
    who: 'Aling Pacita, 60. She has no smartphone.',
    task: 'Book a check-up and get a queue number.',
    barriers: ['phone'],
    look: { hair: 'var(--soft)', skin: SKIN, shirt: 'var(--fact)', acc: 'none' },
    thanks: 'Salamat po. A real person helped me, and that is just what I needed.',
    left: 'Aling Pacita has no phone to scan. She leaves without a number.',
  },
  {
    id: 'ate-mel',
    name: 'Ate Mel',
    who: 'Ate Mel, 41. She is blind.',
    task: 'Book a check-up and get a queue number.',
    barriers: ['blind'],
    look: { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--coral)', acc: 'cane' },
    thanks: 'Wow, it talks to me! Thank you.',
    left: 'Ate Mel cannot find anything to press or hear, and leaves.',
  },
  {
    id: 'kuya-dodong',
    name: 'Kuya Dodong',
    who: 'Kuya Dodong, 28. He finds reading hard.',
    task: 'Book a check-up and get a queue number.',
    barriers: ['reading'],
    look: { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--gold)', acc: 'none' },
    thanks: 'Ang galing! It told me what to press.',
    left: 'Kuya Dodong feels embarrassed and leaves without asking for help.',
  },
  lang('nanay-tess', 'Nanay Tess', 'kapampangan', 'Nanay Tess, a mother who speaks only Kapampangan.', { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--coral)', acc: 'none' }),
  lang('tatay-berto', 'Tatay Berto', 'cebuano', 'Tatay Berto, a fisher who speaks only Cebuano.', { hair: 'var(--soft)', skin: SKIN, shirt: 'var(--navy)', acc: 'hat' }),
  lang('ate-lyn', 'Ate Lyn', 'waray', 'Ate Lyn, a vendor who speaks only Waray.', { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--fact)', acc: 'none' }),
  lang('mang-isko', 'Mang Isko', 'hiligaynon', 'Mang Isko, a farmer who speaks only Hiligaynon.', { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--gold)', acc: 'hat' }),
  lang('ate-bing', 'Ate Bing', 'bikol', 'Ate Bing, a teacher who speaks only Bikol at home.', { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--navy)', acc: 'none' }),
  {
    id: 'ate-grace',
    name: 'Ate Grace',
    who: 'Ate Grace, 24. She is Deaf and uses a wheelchair.',
    task: 'Get a queue number for a prenatal check-up.',
    barriers: ['reach', 'sound'],
    look: { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--coral)', acc: 'wheelchair' },
    thanks: 'Thank you! I could reach it and read it.',
    left: 'Ate Grace meets two barriers at once and leaves without a number.',
  },
  {
    id: 'lolo-ernie',
    name: 'Lolo Ernie',
    who: 'Lolo Ernie, 78. His eyes are weak and he speaks only Cebuano.',
    task: 'Book a check-up and get a queue number.',
    barriers: ['blur', 'lang-cebuano'],
    look: { hair: 'var(--soft)', skin: SKIN, shirt: 'var(--fact)', acc: 'glasses' },
    thanks: 'Salamat kaayo! Big letters in my own language.',
    left: 'Lolo Ernie cannot read the screen in any way and goes home.',
  },
  {
    id: 'tita-carmen',
    name: 'Tita Carmen',
    who: 'Tita Carmen, 52. She finds reading hard and is hard of hearing.',
    task: 'Get a queue number for the blood pressure check.',
    barriers: ['reading', 'sound'],
    look: { hair: 'var(--ink)', skin: SKIN, shirt: 'var(--gold)', acc: 'none' },
    thanks: 'Thank you! I could hear it and read it.',
    left: 'Tita Carmen cannot follow the kiosk and leaves.',
  },
];

export const personaById = (id: string): Persona => PERSONAS.find((p) => p.id === id) ?? (PERSONAS[0] as Persona);

/** The five people of the Module 9 game, and the first group in the Arcade. */
export const CORE_IDS: readonly string[] = ['lola-nena', 'jun', 'mang-ben', 'kuya-rey', 'aling-pacita'];
/** Join in from the fourth visitor. */
export const MORE_IDS: readonly string[] = ['ate-mel', 'kuya-dodong', 'nanay-tess', 'tatay-berto', 'ate-lyn', 'mang-isko', 'ate-bing'];
/** Two barriers at once, from the eighth visitor. */
export const HARD_IDS: readonly string[] = ['ate-grace', 'lolo-ernie', 'tita-carmen'];

/** What the kiosk shows and says on each screen. */
export interface KioskScreen {
  title: string;
  text: string;
  button: string;
  /** What the kiosk says aloud on this screen. */
  sound: string;
}

export const SCREENS: readonly KioskScreen[] = [
  { title: 'Welcome', text: 'Welcome to the health center. Scan the QR code with your phone to begin.', button: 'Scan QR to start', sound: 'Beep. Welcome to the health center.' },
  { title: 'Book a check-up', text: 'Choose Book a check-up, then pick a time that works for you.', button: 'Book a check-up, tomorrow 9 AM', sound: 'Please choose a time.' },
  { title: 'All set', text: 'All set! Listen for your queue number.', button: 'Take my queue number', sound: 'Your number is twelve. Please wait to be called.' },
];
