// Lazy loaders for the arcade games, by slug. Each game is its own chunk and only downloads when it is opened.
// A game task adds its loader here and flips `playable` in src/content/games.ts.
import type { ComponentType } from 'preact';
import type { GameDef } from './engine/types';

type Loader = () => Promise<{ default: GameDef }>;

export const GAME_LOADERS: Readonly<Record<string, Loader>> = {
  'takbo-data': () => import('./takbo-data/takbo'),
  'feed-mo-to': () => import('./feed-mo-to/feed'),
  'luto-ni-ara': () => import('./luto-ni-ara/luto'),
  'sino-to': () => import('./sino-to/sino'),
  'lamok-lamay': () => import('./lamok-lamay/lamok'),
  'tawid-lola': () => import('./tawid-lola/tawid'),
  'hati-tayo': () => import('./hati-tayo/hati'),
  // test-only demo game: reachable by URL, never listed in the Arcade
  demo: () => import('./demo/demo'),
};

/** What a DOM game (no canvas, so no GameShell) gets from the route. */
export interface DomGameProps {
  seed?: string;
  /** Today's daily-challenge run. */
  daily?: boolean;
}

/** Arcade games built from real page elements (an SVG poster, buttons), shown in the plain game frame. */
export const DOM_GAME_LOADERS: Readonly<Record<string, () => Promise<{ default: ComponentType<DomGameProps> }>>> = {
  'gawa-ko-to': () => import('./gawa-ko-to/GawaArcade'),
  'tulog-na-bea': () => import('./tulog-na-bea/TulogArcade'),
};

export const hasGame = (slug: string): boolean => Object.hasOwn(GAME_LOADERS, slug) || Object.hasOwn(DOM_GAME_LOADERS, slug);
