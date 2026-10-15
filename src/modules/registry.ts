// Module content and slots. Each module's lesson data is its own chunk, loaded when the player opens it.
import type { ComponentType } from 'preact';
import type { ModuleContent, PracticeRoundProps } from './types';

type ContentLoader = () => Promise<{ default: ModuleContent }>;

/** Add `mNN: () => import('./mNN')` as each module's content lands (T07 and on). */
const CONTENT: Readonly<Record<string, ContentLoader>> = {
  m01: () => import('./m01'),
};

/** True when the module has lesson content (sync: used by the details sheet). */
export const hasContent = (id: string): boolean => id in CONTENT;

/** Load a module's content, or null when it is not written yet. */
export async function loadContent(id: string): Promise<ModuleContent | null> {
  const loader = CONTENT[id];
  return loader ? (await loader()).default : null;
}

/**
 * The mini Fact or Fake slot. T05 swaps this loader for the real round (practice items from the item bank,
 * Truth Radar in Module 4). Until then a small stub round runs.
 */
export const loadPracticeRound = (): Promise<{ default: ComponentType<PracticeRoundProps> }> => import('./practice/StubPracticeRound');
