// Module content and slots. Each module's lesson data is its own chunk, loaded when the player opens it.
import type { ComponentType } from 'preact';
import type { ModuleContent, PracticeRoundProps } from './types';

type ContentLoader = () => Promise<{ default: ModuleContent }>;

/** Add `mNN: () => import('./mNN')` as each module's content lands (T07 and on). */
const CONTENT: Readonly<Record<string, ContentLoader>> = {
  m01: () => import('./m01'),
  m02: () => import('./m02'),
  m03: () => import('./m03'),
  m04: () => import('./m04'),
  m05: () => import('./m05'),
  m06: () => import('./m06'),
  m07: () => import('./m07'),
  m08: () => import('./m08'),
  m09: () => import('./m09'),
};

/** True when the module has lesson content (sync: used by the details sheet). */
export const hasContent = (id: string): boolean => id in CONTENT;

/** Load a module's content, or null when it is not written yet. */
export async function loadContent(id: string): Promise<ModuleContent | null> {
  const loader = CONTENT[id];
  return loader ? (await loader()).default : null;
}

/** The mini Fact or Fake slot: practice items tagged for the module, with the Truth Radar in Module 4. */
export const loadPracticeRound = (): Promise<{ default: ComponentType<PracticeRoundProps> }> => import('../games/fact-or-fake/PracticeRound');
