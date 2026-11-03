// Paper Fact or Fake test, Form B (after the lessons): 20 posts, tick Fact or Fake. Facilitator only, never in public/.
import { testPages } from '../p2c';
import type { SheetMeta } from '../kit';

export const meta: SheetMeta = { id: 'posttest-form-b', title: 'Fact or Fake post-test (Form B)', facilitatorOnly: true };

export default function build() {
  return testPages('form_B', meta.title);
}
