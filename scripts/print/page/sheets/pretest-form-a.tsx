// Paper Fact or Fake test, Form A (before the lessons): 20 posts, tick Fact or Fake. Facilitator only, never in public/.
import { testPages } from '../p2c';
import type { SheetMeta } from '../kit';

export const meta: SheetMeta = { id: 'pretest-form-a', title: 'Fact or Fake pre-test (Form A)', facilitatorOnly: true };

export default function build() {
  return testPages('form_A', meta.title);
}
