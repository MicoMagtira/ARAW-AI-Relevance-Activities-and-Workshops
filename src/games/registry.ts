// Lazy loaders for the arcade games, by slug. Each game is its own chunk and only downloads when it is opened.
// A game task adds its loader here and flips `playable` in src/content/games.ts.
import type { GameDef } from './engine/types';

type Loader = () => Promise<{ default: GameDef }>;

export const GAME_LOADERS: Readonly<Record<string, Loader>> = {
  // test-only demo game: reachable by URL, never listed in the Arcade
  demo: () => import('./demo/demo'),
};

export const hasGame = (slug: string): boolean => Object.hasOwn(GAME_LOADERS, slug);
