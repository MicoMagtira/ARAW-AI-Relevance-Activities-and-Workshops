// The ten ARAW modules (docs/SPEC.md section 4). Lesson content arrives with src/modules/m01..m10.
export interface ModuleInfo {
  id: string;
  n: number;
  title: string;
  /** Short label for the path strip. */
  short: string;
  /** Lesson cards in the module (progress shows "x / cards"). */
  cards: number;
  review_status: 'unreviewed';
}

const mod = (n: number, title: string, short: string): ModuleInfo => ({
  id: `m${String(n).padStart(2, '0')}`,
  n,
  title,
  short,
  cards: 7,
  review_status: 'unreviewed',
});

export const MODULES: readonly ModuleInfo[] = [
  mod(1, 'What Is AI, Really?', 'What Is AI?'),
  mod(2, 'How AI Learns and Makes Mistakes', 'How AI Learns'),
  mod(3, 'AI and Your Health', 'AI and Your Health'),
  mod(4, 'Tricks of Health Misinformation', 'Misinfo Tricks'),
  mod(5, 'Check Before You Share', 'Check Before Sharing'),
  mod(6, 'Katuwang si AI', 'Katuwang si AI'),
  mod(7, 'Gawa ni AI?', 'Gawa ni AI?'),
  mod(8, 'Pahinga Muna', 'Pahinga Muna'),
  mod(9, 'Para sa Lahat', 'Para sa Lahat'),
  mod(10, 'Karapatan Mo', 'Karapatan Mo'),
];

export const MODULE_COUNT = MODULES.length;
