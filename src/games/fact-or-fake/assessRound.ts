// Assessment rounds (form_A / form_B). Kept apart from rounds.ts so the test sets only download on the `#/assess/` route.
import { FOF_ASSESSMENT } from '../../content/factOrFake/assessment';
import type { FofItem, ItemSet } from '../../content/factOrFake/schema';
import { createRng, shuffle } from '../engine/rng';

/** All items of one assessment form in a fixed order (the same for every player). Never mixes with practice. */
export function formRound(form: Extract<ItemSet, 'form_A' | 'form_B'>, items: readonly FofItem[] = FOF_ASSESSMENT): FofItem[] {
  return shuffle(
    items.filter((i) => i.set === form),
    createRng(`ARAW-${form}`),
  );
}
