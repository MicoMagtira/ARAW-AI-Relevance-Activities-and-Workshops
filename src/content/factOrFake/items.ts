// The whole Fact or Fake bank, practice plus assessment forms. For tests and content checks only:
// app code imports practice.ts (practice rounds) or assessment.ts (the `#/assess/` route) so each bundle gets just its own set.
import { FOF_ASSESSMENT } from './assessment';
import { FOF_PRACTICE } from './practice';
import type { FofItem } from './schema';

export const FOF_ITEMS: readonly FofItem[] = [...FOF_PRACTICE, ...FOF_ASSESSMENT];
