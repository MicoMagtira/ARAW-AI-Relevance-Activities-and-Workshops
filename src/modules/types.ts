// Content types for the module runner (docs/SPEC.md section 3). Every module is plain data plus a lazy-loaded game component.
import type { ComponentType } from 'preact';
import type { IconName } from '../ui/icons';

/** Ara's lines beside a card. The runner has defaults when a card gives none. */
export interface AraLines {
  /** Shown when the card appears. */
  intro?: string;
  /** Shown when the card is done (revealed, answered correctly, sorted). */
  done?: string;
}

interface CardBase {
  /** Stable id such as "m01-c3". Shown in the runner and carried by the Report flag. */
  id: string;
  ara?: AraLines;
}

/** Cast scene plus one line; tap to continue. */
export interface StoryHookCard extends CardBase {
  type: 'story-hook';
  /** Who speaks, e.g. "Lola Nena". */
  speaker: string;
  /** The story line (a quote). */
  line: string;
  /** Scene caption, e.g. "Lola Nena's kitchen". */
  scene: string;
  icon?: IconName;
}

/** One idea, at most about 60 words. */
export interface InfoCard extends CardBase {
  type: 'info';
  title: string;
  body: string;
  icon?: IconName;
}

export interface RevealTile {
  label: string;
  /** Hidden until the player taps the tile. */
  detail: string;
}

/** Tap tiles to reveal hidden parts (2 to 6 tiles). */
export interface RevealCard extends CardBase {
  type: 'reveal';
  title: string;
  prompt: string;
  tiles: readonly RevealTile[];
}

export interface ChoiceOption {
  text: string;
  /** Why: shown for every option, right or wrong. */
  feedback: string;
}

/** One question, 2 to 4 options, one correct. The player may try again until they find it. */
export interface ChoiceCard extends CardBase {
  type: 'choice';
  question: string;
  options: readonly ChoiceOption[];
  /** Index of the correct option. */
  correct: number;
}

export interface SortBin {
  id: string;
  label: string;
}

export interface SortItem {
  id: string;
  text: string;
  /** `SortBin.id` where the item belongs. */
  bin: string;
  /** One-line why, shown after the item is placed. */
  why: string;
}

/** 4 to 8 mini-cards sorted into two bins (swipe, buttons or arrow keys). */
export interface SwipeSortCard extends CardBase {
  type: 'swipe-sort';
  title: string;
  /** Exactly two bins: [left, right]. */
  bins: readonly [SortBin, SortBin];
  items: readonly SortItem[];
}

/** Opinion question with no right answer. */
export interface PollCard extends CardBase {
  type: 'poll';
  question: string;
  options: readonly string[];
  /** Friendly reflection shown after answering. */
  reflection: string;
}

/** "Kailan ako magtitiwala?" in three plain bullets. */
export interface TakeawayCard extends CardBase {
  type: 'takeaway';
  bullets: readonly [string, string, string];
}

export type Card = StoryHookCard | InfoCard | RevealCard | ChoiceCard | SwipeSortCard | PollCard | TakeawayCard;
export type CardType = Card['type'];

/** Props every module game receives. A module game never blocks progress: calling `onComplete` always counts. */
export interface ModuleGameProps {
  moduleId: string;
  /** 1 to 3 stars of mastery. */
  onComplete: (stars: 1 | 2 | 3) => void;
}

export interface ModuleGameDef {
  slug: string;
  name: string;
  /** Lazy-loaded so the game's code only downloads when the player reaches it. */
  load: () => Promise<{ default: ComponentType<ModuleGameProps> }>;
}

export interface ModuleContent {
  id: string;
  /** The story hook, followed by the lesson cards. Together they equal `ModuleInfo.cards`. */
  hook: StoryHookCard;
  cards: readonly Card[];
  game: ModuleGameDef;
  takeaway: TakeawayCard;
  review_status: 'unreviewed';
}

/** What the mini Fact or Fake slot receives. The real round (T05) and the stub both implement this. */
export interface PracticeRoundProps {
  moduleId: string;
  /** How many practice items to play (5, or 10 in Module 4). */
  count: number;
  /** Called after every answer so the runner can award XP. */
  onAnswer: (itemId: string, correct: boolean) => void;
  onDone: (result: { correct: number; total: number }) => void;
}
