// The 20 badges (docs/SPEC.md section 9). Earning them is wired up by the module, game and streak tasks.
import { MODULES } from './modules';

export type BadgeGroup = 'module' | 'villain' | 'radar' | 'streak' | 'finale';

export interface BadgeInfo {
  id: string;
  /** Filipino name, as shown on the medallion. */
  name: string;
  english: string;
  howTo: string;
  group: BadgeGroup;
  review_status: 'unreviewed';
}

const b = (id: string, name: string, english: string, howTo: string, group: BadgeGroup): BadgeInfo => ({
  id,
  name,
  english,
  howTo,
  group,
  review_status: 'unreviewed',
});

const MODULE_BADGES: ReadonlyArray<readonly [string, string]> = [
  ['Unang Sinag', 'First Light'],
  ['Guro ni AI', "AI's Teacher"],
  ['Matalinong Pasyente', 'Smart Patient'],
  ['Bantay Katotohanan', 'Truth Guardian'],
  ['Liwanag ng Pamilya', "Family's Light"],
  ['Tulong-Tulong', 'Working Together'],
  ['Tapat na Likha', 'Honest Maker'],
  ['Payapang Isip', 'Peaceful Mind'],
  ['Bukas sa Lahat', 'Open to All'],
  ['Boses ng Karapatan', 'Voice of Rights'],
];

const VILLAINS = ['Dr. Fake', 'Miracle Mike', 'Fear Monger', 'Conspiracy Kuya', 'Kwento Kim'];

export const BADGES: readonly BadgeInfo[] = [
  ...MODULES.map((m, i) => {
    const [name, english] = MODULE_BADGES[i] ?? ['', ''];
    return b(`module-${m.id}`, name, english, `Finish Module ${m.n}: ${m.title}`, 'module');
  }),
  ...VILLAINS.map((v) => b(`villain-${v.toLowerCase().replace(/[^a-z]+/g, '-')}`, `Talo si ${v}`, `Beat ${v}`, `Beat ${v} in Spot the Tactic (Module 4)`, 'villain')),
  b('radar', 'Timbang na Radar', 'Balanced Radar', 'Play a 10-item Fact or Fake round and keep your Truth Radar balanced', 'radar'),
  b('streak-3', 'Tatlong Araw', 'Three Days', 'Learn or play on 3 days in a row', 'streak'),
  b('streak-7', 'Isang Linggo', 'One Week', 'Learn or play on 7 days in a row', 'streak'),
  b('streak-30', 'Araw-araw', 'Every Day', 'Learn or play on 30 days in a row', 'streak'),
  b('finale', 'Buong Araw', 'Full Day', 'Finish all 10 modules', 'finale'),
];

export const BADGE_TOTAL = BADGES.length;
