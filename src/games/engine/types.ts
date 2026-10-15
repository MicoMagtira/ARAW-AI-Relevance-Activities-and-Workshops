// The contract between a game and the shared GameShell.
import type { AraMood } from '../../ui/Ara';
import type { InputFrame } from './input';
import type { Rng } from './rng';

export interface HudStat {
  id: string;
  label: string;
  /** Text shown (and read out) for the stat, e.g. "1,240" or "2 of 3". */
  value: string;
  /** Draw as hearts instead of text. */
  hearts?: { n: number; max: number };
  /** Draw as a segmented meter, 0 to 100. */
  meter?: number;
}

export interface GameStats {
  score: number;
  over: boolean;
  hud: readonly HudStat[];
  /** Plain-words description of the current game state: the text alternative for the canvas. */
  description: string;
  /** Lines for the game-over recap (what happened and why it matters). Read when `over` is true. */
  recap: readonly string[];
}

export interface GameInstance {
  /** Advance the game by one fixed step. */
  step(dtMs: number, input: InputFrame): void;
  /** Draw in logical units (the context is already scaled to the game's width and height). */
  draw(ctx: CanvasRenderingContext2D): void;
  stats(): GameStats;
}

export interface BriefingPage {
  title: string;
  text: string;
  mood?: AraMood;
}

export interface GameDef {
  slug: string;
  name: string;
  /** Logical canvas size; the shell keeps this aspect ratio and letterboxes. */
  width: number;
  height: number;
  /** Score that counts as a "good run" (+20 XP). */
  goodRun: number;
  /** Controls and rules, shown in How to play. */
  howTo: readonly string[];
  /** The five first-run briefing pages (SPEC section 5). */
  briefing: readonly BriefingPage[];
  /** The "Kailan ako magtitiwala?" one-liner shown at game over. */
  takeaway: string;
  create(options: { seed: string; rng: Rng }): GameInstance;
}
