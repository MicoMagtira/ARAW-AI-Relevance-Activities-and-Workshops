// The 11 endless arcade games in Daily Challenge rotation order (docs/SPEC.md section 7).
export interface GameInfo {
  slug: string;
  name: string;
  /** Module whose completion unlocks the game in the Arcade, or null when open from the start. */
  module: string | null;
}

export const ARCADE_GAMES: readonly GameInfo[] = [
  { slug: 'takbo-data', name: 'Takbo, Data!', module: null },
  { slug: 'feed-mo-to', name: "Feed Mo 'To", module: null },
  { slug: 'luto-ni-ara', name: 'Luto ni Ara', module: null },
  { slug: 'sino-to', name: "Sino 'To?", module: null },
  { slug: 'lamok-lamay', name: 'Lamok Lamay', module: null },
  { slug: 'tawid-lola', name: 'Tawid, Lola!', module: null },
  { slug: 'hati-tayo', name: 'Hati Tayo!', module: 'm06' },
  { slug: 'gawa-ko-to', name: "Gawa Ko 'To!", module: 'm07' },
  { slug: 'tulog-na-bea', name: 'Tulog na, Bea!', module: 'm08' },
  { slug: 'sa-sapatos-nila', name: 'Sa Sapatos Nila', module: 'm09' },
  { slug: 'objection', name: 'OBJECTION!', module: 'm10' },
];
