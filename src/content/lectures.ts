// Bridge lines for the module lecture videos (scripts/lectures/). Plain English in Ara's kind voice; no health facts.
// Each line is translated through the language packs like any other string; until a pack has it the recorder falls back
// to English and lists it. Everything else in a lecture (cards, feedback, objectives, takeaway) is the app's own text.

export const LECTURE_CAPTIONS = {
  /** Shown and read before the answer to a question or poll. */
  think: 'Let us think about this one.',
  /** Closing card heading. */
  practise: 'Practise in ARAW',
  /** Closing card line, above the app address. */
  tryIt: 'Open the app and try it yourself.',
  /** Before the short look at the module game. */
  gameLook: 'Now a quick look at the game for this module.',
  /** Over the fast-forwarded part of a game round. */
  gameFast: 'The rest of the round plays quickly. You can play it yourself in ARAW.',
  /** Before the takeaway bullets. */
  takeawayIntro: 'Let us finish with the part to remember.',
} as const;

export type LectureCaption = keyof typeof LECTURE_CAPTIONS;

/** The app address shown on the closing card. */
export const LECTURE_URL = 'https://dost-nicer-araw.mjmagtira.workers.dev/';
