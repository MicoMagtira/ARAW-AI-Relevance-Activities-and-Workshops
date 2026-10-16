// The 20 badges (docs/SPEC.md section 9). Earning them is wired up by the module, game and streak tasks.
import { MODULES } from './modules';

export type BadgeGroup = 'module' | 'villain' | 'radar' | 'streak' | 'finale';

export interface BadgeInfo {
  id: string;
  /** Badge name, as shown on the medallion. */
  name: string;
  howTo: string;
  group: BadgeGroup;
  review_status: 'unreviewed';
}

const b = (id: string, name: string, howTo: string, group: BadgeGroup): BadgeInfo => ({
  id,
  name,
  howTo,
  group,
  review_status: 'unreviewed',
});

const MODULE_BADGES: readonly string[] = [
  'First Light',
  "AI's Teacher",
  'Smart Patient',
  'Truth Guardian',
  "Family's Light",
  'Working Together',
  'Honest Maker',
  'Peaceful Mind',
  'Open to All',
  'Voice of Rights',
];

const VILLAINS = ['Dr. Fake', 'Miracle Mike', 'Fear Monger', 'Conspiracy Kuya', 'Kwento Kim'];

export const BADGES: readonly BadgeInfo[] = [
  ...MODULES.map((m, i) => {
    const name = MODULE_BADGES[i] ?? '';
    return b(`module-${m.id}`, name, `Finish Module ${m.n}: ${m.title}`, 'module');
  }),
  ...VILLAINS.map((v) => b(`villain-${v.toLowerCase().replace(/[^a-z]+/g, '-')}`, `Beat ${v}`, `Beat ${v} in Spot the Tactic (Module 4)`, 'villain')),
  b('radar', 'Balanced Radar', 'Play a 10-item Fact or Fake round and keep your Truth Radar balanced', 'radar'),
  b('streak-3', 'Three Days', 'Learn or play on 3 days in a row', 'streak'),
  b('streak-7', 'One Week', 'Learn or play on 7 days in a row', 'streak'),
  b('streak-30', 'Every Day', 'Learn or play on 30 days in a row', 'streak'),
  b('finale', 'Full Day', 'Finish all 10 modules', 'finale'),
];

export const BADGE_TOTAL = BADGES.length;
