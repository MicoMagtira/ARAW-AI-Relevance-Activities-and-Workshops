// The 11 endless arcade games in Daily Challenge rotation order (docs/SPEC.md section 7).
import type { IconName } from '../ui/icons';

export interface GameInfo {
  slug: string;
  name: string;
  /** Module whose completion unlocks the game in the Arcade, or null when open from the start. */
  module: string | null;
  /** True once the game ships and can really be played. Home counts only these. */
  playable: boolean;
  /** What the game teaches, in a few words. */
  topic: string;
  /** One or two plain sentences on how it plays (details sheet). */
  how: string;
  /** Pixel icon on the tile. */
  icon: IconName;
}

export const ARCADE_GAMES: readonly GameInfo[] = [
  {
    slug: 'takbo-data',
    name: 'Takbo, Data!',
    module: null,
    playable: true,
    topic: 'Data privacy',
    how: 'Run through the barangay and grab freebies, but some of them cost your data. Keep your Privacy Shield up.',
    icon: 'shield',
  },
  {
    slug: 'feed-mo-to',
    name: "Feed Mo 'To",
    module: null,
    playable: true,
    topic: 'Algorithms and filter bubbles',
    how: 'You are the algorithm. Keep Tita scrolling, but do not trap her in a bubble of scary posts.',
    icon: 'article',
  },
  {
    slug: 'luto-ni-ara',
    name: 'Luto ni Ara',
    module: null,
    playable: false,
    topic: 'Prompting AI well',
    how: 'Mix the right prompt ingredients before the order runs out. Bad prompts serve funny dishes.',
    icon: 'cake',
  },
  {
    slug: 'sino-to',
    name: "Sino 'To?",
    module: null,
    playable: false,
    topic: 'Voice-clone scams',
    how: 'Calls keep coming in. Verify the caller before you send anything, and help the real ones fast.',
    icon: 'phone-call',
  },
  {
    slug: 'lamok-lamay',
    name: 'Lamok Lamay',
    module: null,
    playable: false,
    topic: 'How AI sees, and misses',
    how: 'The AI camera boxes mosquito larvae, but it makes mistakes. Whack the real ones and fix the AI.',
    icon: 'ai-scan',
  },
  {
    slug: 'tawid-lola',
    name: 'Tawid, Lola!',
    module: null,
    playable: false,
    topic: 'When to trust the AI guide',
    how: 'Help Lola cross to the health center. Follow the AI voice, unless your own eyes say otherwise.',
    icon: 'bus',
  },
  {
    slug: 'hati-tayo',
    name: 'Hati Tayo!',
    module: 'm06',
    playable: false,
    topic: 'AI and jobs',
    how: "Split each task between AI and a person in Kuya Jun's busy day.",
    icon: 'briefcase',
  },
  {
    slug: 'gawa-ko-to',
    name: "Gawa Ko 'To!",
    module: 'm07',
    playable: false,
    topic: 'Generative AI and consent',
    how: 'Make health posters with AI tools the honest way: label, ask consent, credit.',
    icon: 'brush',
  },
  {
    slug: 'tulog-na-bea',
    name: 'Tulog na, Bea!',
    module: 'm08',
    playable: false,
    topic: 'Digital wellbeing',
    how: "Keep Bea's sleep, mood, study and friends balanced while her phone keeps calling.",
    icon: 'moon',
  },
  {
    slug: 'sa-sapatos-nila',
    name: 'Sa Sapatos Nila',
    module: 'm09',
    playable: false,
    topic: 'Fairness and accessibility',
    how: 'Use the health kiosk as different people, then fix it so it works for everyone.',
    icon: 'eye',
  },
  {
    slug: 'objection',
    name: 'OBJECTION!',
    module: 'm10',
    playable: false,
    topic: 'Your rights with AI',
    how: 'Spot the false statement at the barangay hearing and present the right evidence.',
    icon: 'scale',
  },
];
