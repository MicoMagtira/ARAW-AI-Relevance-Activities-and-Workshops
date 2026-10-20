// Short, captioned how-to videos: a one-minute tour of the app and a how-to-play clip for every arcade game and Fact or Fake.
// Each clip exists once per language (the app recorded in that language, with a WebVTT caption track), made by
// scripts/tutorials/record.mjs. Which clips and languages exist, and how long and big they are, comes from the manifest the
// recorder writes (tutorialManifest.json): a clip that was never recorded simply shows no Watch button.
import type { IconName } from '../ui/icons';
import { ARCADE_GAMES } from './games';

export type TutorialId =
  | 'tour'
  | 'fact-or-fake'
  | 'takbo-data'
  | 'feed-mo-to'
  | 'luto-ni-ara'
  | 'sino-to'
  | 'lamok-lamay'
  | 'tawid-lola'
  | 'hati-tayo'
  | 'gawa-ko-to'
  | 'tulog-na-bea'
  | 'sa-sapatos-nila'
  | 'objection';

export interface TutorialInfo {
  id: TutorialId;
  /** The tour, or a how-to-play clip for the game with this proper name. */
  kind: 'tour' | 'game';
  game?: string;
  icon: IconName;
}

/** Library order: the tour first, then Fact or Fake, then the arcade games in rotation order. */
export const TUTORIALS: readonly TutorialInfo[] = [
  { id: 'tour', kind: 'tour', icon: 'sun' },
  { id: 'fact-or-fake', kind: 'game', game: 'Fact or Fake', icon: 'search' },
  ...ARCADE_GAMES.map((g): TutorialInfo => ({ id: g.slug as TutorialId, kind: 'game', game: g.name, icon: g.icon })),
];

export const tutorialById = (id: string): TutorialInfo | undefined => TUTORIALS.find((tut) => tut.id === id);

/**
 * Captions written for the videos (translated through the language packs like every other string). The game clips mostly
 * reuse each game's own How to play lines, which the packs already translate; scripts/tutorials/boards/ lists every beat.
 */
export const TUTORIAL_CAPTIONS = {
  howToPlay: 'How to play: {game}',
  yourTurn: 'Now it is your turn. Have fun!',
  tourHello: 'Welcome to ARAW! Here is the app in one minute.',
  tourLanguage: 'First, pick your language. You can change it later in Me.',
  tourStart: 'Press Start when the sun has risen.',
  tourHome: 'Home shows your next lesson, the daily challenge and the myth of the day.',
  tourLearn: 'Learn has ten short modules. Go step by step, starting with Module 1.',
  tourLesson: 'Each module has short cards, quick questions and a game. Ara helps you along.',
  tourArcade: 'The Arcade has quick games to practise what you learned.',
  tourLibrary: 'The Library has myths and facts, a glossary, comics and these videos.',
  tourMe: 'In Me, see your badges and turn on helpers like Larger text.',
  tourReport: 'See something wrong? Press the flag to tell us.',
  tourBye: 'Learn when to trust AI and health info. Let us begin!',
} as const;
