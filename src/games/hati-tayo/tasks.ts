// The task bank for Hati Tayo! (Module 6 and the arcade game): what lands on the desk, and who should do it.
// Two workplaces, nine tasks each for AI and nine for people. All names are fictional. Health tasks are general:
// no dosing, no diagnosis, and the people tasks always point back to a health worker.
import type { ContentReview } from '../../content/review';

export type Setting = 'bhw' | 'store';
export type Lane = 'ai' | 'human';
/** Why a task needs a person (used in the recap). AI-suited tasks are all 'repeat'. */
export type Trait = 'repeat' | 'empathy' | 'judgement' | 'context' | 'accountability';

export interface Task {
  id: string;
  setting: Setting;
  /** Tile label: 7 characters at most, upper case. */
  short: string;
  /** The task as it lands on the desk: three lines of 36 characters at most. */
  text: string;
  /** Who should do it. */
  needs: Lane;
  trait: Trait;
  /** Why that lane is right (two lines of 36 characters at most). */
  why: string;
  /** What goes wrong in the wrong lane (two lines of 36 characters at most): the AI's slip-up, or the slow hand-work. */
  wrong: string;
}

export interface SettingInfo {
  id: Setting;
  /** Header text on the canvas (upper case, 20 characters at most). */
  header: string;
  /** Plain name for descriptions and the module game. */
  place: string;
  /** Who runs the day. */
  boss: string;
}

export const SETTINGS: Readonly<Record<Setting, SettingInfo>> = {
  bhw: { id: 'bhw', header: "KUYA JUN'S CLINIC", place: "Kuya Jun's barangay health work", boss: 'Kuya Jun' },
  store: { id: 'store', header: "ALING NENA'S STORE", place: "Aling Nena's sari-sari store", boss: 'Aling Nena' },
};

export const TRAIT_NAME: Readonly<Record<Trait, string>> = {
  repeat: 'repetitive jobs',
  empathy: 'comforting people',
  judgement: 'judgement calls',
  context: 'local knowledge',
  accountability: 'being accountable',
};

export const TASKS: readonly Task[] = [
  // ---- Kuya Jun, barangay health worker: AI-suited ------------------------------------------------------------
  {
    id: 'bhw-stock',
    setting: 'bhw',
    short: 'STOCK',
    text: 'Count the boxes of vitamins and masks in the stockroom.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Counting is the same job again and again. AI is fast at it.',
    wrong: 'Kuya Jun counted every box by hand. The mothers kept waiting.',
  },
  {
    id: 'bhw-leaflet',
    setting: 'bhw',
    short: 'LEAFLET',
    text: 'Translate the dengue leaflet draft into Hiligaynon.',
    needs: 'ai',
    trait: 'repeat',
    why: 'AI drafts fast. A fluent speaker must check it before it is printed.',
    wrong: 'It was translated by hand, word by word. It took all day.',
  },
  {
    id: 'bhw-visits',
    setting: 'bhw',
    short: 'VISITS',
    text: "Plan this week's home visits so nobody is skipped.",
    needs: 'ai',
    trait: 'repeat',
    why: 'Fitting names into days is a pattern job. Check the plan first.',
    wrong: 'The plan was rubbed out and redone four times. Hours gone.',
  },
  {
    id: 'bhw-sort',
    setting: 'bhw',
    short: 'RECORDS',
    text: 'Sort sixty household records by purok.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Sorting a long list is quick for AI, and easy for you to spot-check.',
    wrong: 'Sixty cards sorted by hand. The pile was neat, the day was gone.',
  },
  {
    id: 'bhw-report',
    setting: 'bhw',
    short: 'REPORT',
    text: 'Fill in the monthly report form from the clinic tally sheet.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Copying numbers into a form is repetitive. Read it before you send.',
    wrong: 'Typed in by hand, number by number. The care work had to wait.',
  },
  {
    id: 'bhw-text',
    setting: 'bhw',
    short: 'REMIND',
    text: "Write a reminder text for Saturday's immunization day.",
    needs: 'ai',
    trait: 'repeat',
    why: 'A short, plain reminder is an easy AI draft. You read it and send it.',
    wrong: 'Half an hour went into the right words for one little text.',
  },
  {
    id: 'bhw-tally',
    setting: 'bhw',
    short: 'TALLY',
    text: 'Add up how many children were weighed this month.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Adding columns of numbers is what computers do best.',
    wrong: 'The numbers were added by hand, twice, to be sure. Ages!',
  },
  {
    id: 'bhw-hours',
    setting: 'bhw',
    short: 'HOURS',
    text: 'Type up the handwritten clinic hours for the notice board.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Turning handwriting into text is quick, and mistakes are easy to see.',
    wrong: 'It was copied letter by letter. A person was tied up for ages.',
  },
  {
    id: 'bhw-sheet',
    setting: 'bhw',
    short: 'SHEETS',
    text: 'Turn the paper sign-in sheets into one spreadsheet.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Moving rows from paper to a table is repetitive. AI does it in seconds.',
    wrong: 'Every row was typed by hand. A whole afternoon, gone.',
  },
  // ---- Kuya Jun: people-suited --------------------------------------------------------------------------------
  {
    id: 'bhw-comfort',
    setting: 'bhw',
    short: 'COMFORT',
    text: 'A worried mother is in tears at the door. Comfort her.',
    needs: 'human',
    trait: 'empathy',
    why: 'Comfort comes from a person who listens. AI cannot feel it.',
    wrong: "The AI told the worried mother 'Error 404: comfort not found'.",
  },
  {
    id: 'bhw-refer',
    setting: 'bhw',
    short: 'REFER?',
    text: 'Decide whether a patient should be sent to the hospital today.',
    needs: 'human',
    trait: 'accountability',
    why: 'A referral is a health decision. A trained worker answers for it.',
    wrong: "The AI said 'Refer everybody!' and the hospital line grew long.",
  },
  {
    id: 'bhw-news',
    setting: 'bhw',
    short: 'NEWS',
    text: 'Explain to a family that Lolo needs more check-ups.',
    needs: 'human',
    trait: 'empathy',
    why: 'Hard news needs a gentle voice, a face and time for questions.',
    wrong: "The AI sent 'RESULT: ABNORMAL', no hello. The family panicked.",
  },
  {
    id: 'bhw-lonely',
    setting: 'bhw',
    short: 'LONELY',
    text: 'Visit Lolo Ben, who lives alone and feels very low.',
    needs: 'human',
    trait: 'empathy',
    why: 'Being there is the care. A kind face cannot be sent as a message.',
    wrong: "The AI sent Lolo a thumbs-up sticker. He asked, 'Who is this?'",
  },
  {
    id: 'bhw-first',
    setting: 'bhw',
    short: 'WHO 1ST',
    text: 'Two homes need help at once. Who goes first?',
    needs: 'human',
    trait: 'context',
    why: 'You know the families and the roads. That is local knowledge.',
    wrong: 'The AI sent you to the nearest house. The sicker family waited.',
  },
  {
    id: 'bhw-teen',
    setting: 'bhw',
    short: 'SCARED',
    text: 'A shy teen is scared of her first check-up. Calm her down.',
    needs: 'human',
    trait: 'empathy',
    why: 'A calm voice and a smile help her trust the check-up.',
    wrong: 'The AI read her a long leaflet. She hid behind her mother.',
  },
  {
    id: 'bhw-refuse',
    setting: 'bhw',
    short: 'REFUSE',
    text: 'A father says no to the vaccine. Listen to his reasons.',
    needs: 'human',
    trait: 'context',
    why: 'Trust grows when you listen. Then share the facts kindly.',
    wrong: "The AI replied 'Your opinion is invalid.' The door stayed shut.",
  },
  {
    id: 'bhw-thin',
    setting: 'bhw',
    short: 'NOTICE',
    text: 'At the weighing, a child looks too thin and too quiet.',
    needs: 'human',
    trait: 'judgement',
    why: 'Noticing that something is off takes human eyes. Tell a nurse.',
    wrong: 'The AI logged the number. It never noticed the sad little face.',
  },
  {
    id: 'bhw-sign',
    setting: 'bhw',
    short: 'SIGN',
    text: 'Sign the form saying a child is well enough for school.',
    needs: 'human',
    trait: 'accountability',
    why: 'Someone must answer for a health sign-off. A tool cannot.',
    wrong: "The AI signed 'Healthy' for a child it never met. Who is to blame?",
  },
  // ---- Aling Nena's sari-sari store: AI-suited ----------------------------------------------------------------
  {
    id: 'store-count',
    setting: 'store',
    short: 'STOCK',
    text: 'Count the cans, noodles and coffee sachets left on the shelves.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Counting stock is the same job over and over. AI does it fast.',
    wrong: 'Aling Nena counted every can herself. The suki line grew long.',
  },
  {
    id: 'store-sales',
    setting: 'store',
    short: 'SALES',
    text: "Add up today's sales from the notebook.",
    needs: 'ai',
    trait: 'repeat',
    why: 'Adding long columns is quick. Compare the total with the cash box.',
    wrong: 'The notebook was added by hand, then added again. Slow work.',
  },
  {
    id: 'store-prices',
    setting: 'store',
    short: 'PRICES',
    text: 'Make a neat price list for the sari-sari board.',
    needs: 'ai',
    trait: 'repeat',
    why: 'A tidy list is an easy draft. Read it before you hang it up.',
    wrong: 'The list was lettered by hand, with crossed-out prices. Hours!',
  },
  {
    id: 'store-reorder',
    setting: 'store',
    short: 'REORDER',
    text: 'List what to reorder from the supplier this week.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Turning sales patterns into a shopping list is a pattern job.',
    wrong: 'It was worked out on scrap paper while the store sat shut.',
  },
  {
    id: 'store-sign',
    setting: 'store',
    short: 'SIGN',
    text: "Translate the sign 'No credit today' into Hiligaynon.",
    needs: 'ai',
    trait: 'repeat',
    why: 'AI drafts fast. A neighbour who speaks it well checks the tone.',
    wrong: 'It was written slowly, asking around for words. It took ages.',
  },
  {
    id: 'store-text',
    setting: 'store',
    short: 'REMIND',
    text: 'Write a short text to tell suki about the new rice price.',
    needs: 'ai',
    trait: 'repeat',
    why: 'A short, plain notice is an easy draft. Read it, then send it.',
    wrong: 'Half an hour went into the right words for one little text.',
  },
  {
    id: 'store-load',
    setting: 'store',
    short: 'LOAD',
    text: 'Look for double entries in the e-load notebook.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Spotting repeats in a long list is a pattern job. Check what it finds.',
    wrong: 'Page after page, line by line. Her eyes hurt and the store waited.',
  },
  {
    id: 'store-deliver',
    setting: 'store',
    short: 'DELIVER',
    text: 'Make the delivery calendar: which day each supplier comes.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Fitting days into a calendar is a pattern job. Read it before use.',
    wrong: 'The calendar was drawn by hand and redrawn twice. A morning gone.',
  },
  {
    id: 'store-expiry',
    setting: 'store',
    short: 'EXPIRY',
    text: 'List the items whose expiry dates fall this month.',
    needs: 'ai',
    trait: 'repeat',
    why: 'Sorting by date is quick for AI. Then you check the real shelf.',
    wrong: 'Every label was read by hand, one can at a time. Slow going.',
  },
  // ---- Aling Nena: people-suited ------------------------------------------------------------------------------
  {
    id: 'store-sick',
    setting: 'store',
    short: 'COMFORT',
    text: 'A suki is scared because her child is sick. Comfort her.',
    needs: 'human',
    trait: 'empathy',
    why: 'She needs a caring person, and a push to the health center.',
    wrong: "The AI said 'Your feelings are being processed. Please hold.'",
  },
  {
    id: 'store-medicine',
    setting: 'store',
    short: 'MEDS?',
    text: 'A customer asks which medicine to take for a long cough.',
    needs: 'human',
    trait: 'accountability',
    why: 'Only a health worker can advise on medicine. Point her to the center.',
    wrong: 'The AI named a medicine from a list. Nobody was accountable.',
  },
  {
    id: 'store-utang',
    setting: 'store',
    short: 'UTANG',
    text: 'Ka Tonyo asks for credit again. Yes, or no?',
    needs: 'human',
    trait: 'context',
    why: 'You know Ka Tonyo and his family. No tool has that knowledge.',
    wrong: "The AI said 'Credit denied' to a suki of twenty years. Ouch.",
  },
  {
    id: 'store-argue',
    setting: 'store',
    short: 'ARGUE',
    text: 'Two customers argue about who was first in line.',
    needs: 'human',
    trait: 'judgement',
    why: 'Settling a quarrel takes fairness and a calm, friendly face.',
    wrong: "The AI said 'You are both wrong.' Now both were angry.",
  },
  {
    id: 'store-lola',
    setting: 'store',
    short: 'CHAT',
    text: 'Chat with Lola Pining, who visits just to talk.',
    needs: 'human',
    trait: 'empathy',
    why: 'The visit is the point. She comes for a person, not for biscuits.',
    wrong: "The AI replied 'Please state your purchase.' Lola walked away.",
  },
  {
    id: 'store-fish',
    setting: 'store',
    short: 'UPSET',
    text: 'A customer says her canned fish smelled bad. Hear her out.',
    needs: 'human',
    trait: 'judgement',
    why: 'Saying sorry and fixing it fairly is a judgement call.',
    wrong: "The AI sent 'No refunds.' The suki told the whole barangay.",
  },
  {
    id: 'store-new',
    setting: 'store',
    short: 'WELCOME',
    text: 'A new neighbour is shy and lost. Make her welcome.',
    needs: 'human',
    trait: 'empathy',
    why: 'A warm hello makes a neighbour. A message cannot do it for you.',
    wrong: 'The AI sent a coupon code. She still did not know where to go.',
  },
  {
    id: 'store-helper',
    setting: 'store',
    short: 'HELPER',
    text: 'Your helper is late and tired again. Talk kindly, then decide.',
    needs: 'human',
    trait: 'context',
    why: 'You know what is behind it. Kindness and fairness are yours.',
    wrong: "The AI sent 'Warning 1 of 3' at midnight. The helper quit.",
  },
  {
    id: 'store-qr',
    setting: 'store',
    short: 'QR?',
    text: "A stranger says, 'Scan my QR to get paid more.' Accept?",
    needs: 'human',
    trait: 'judgement',
    why: 'Judging a possible scam is your job. When unsure, say no.',
    wrong: 'The AI scanned it at once. The e-wallet was empty by lunch.',
  },
];

export const tasksFor = (setting: Setting, needs?: Lane): Task[] => TASKS.filter((t) => t.setting === setting && (needs === undefined || t.needs === needs));

export const taskById = (id: string): Task | undefined => TASKS.find((t) => t.id === id);

/** Every line in this file is unreviewed teaching content (CONTENT_GUIDE 7). */
export const CONTENT_REVIEW: ContentReview = {
  basis: 'SPEC M6: AI as a tool at work with humans in the loop; health tasks stay general and point to a health worker',
  review_status: 'unreviewed',
};
