// The 11 endless arcade games in Daily Challenge rotation order (docs/SPEC.md section 7).
export interface GameInfo {
  slug: string;
  name: string;
  /** Module whose completion unlocks the game in the Arcade, or null when open from the start. */
  module: string | null;
  /** True once the game ships and can really be played. Home counts only these. */
  playable: boolean;
}

export const ARCADE_GAMES: readonly GameInfo[] = [
  { slug: 'takbo-data', name: 'Takbo, Data!', module: null, playable: false },
  { slug: 'feed-mo-to', name: "Feed Mo 'To", module: null, playable: false },
  { slug: 'luto-ni-ara', name: 'Luto ni Ara', module: null, playable: false },
  { slug: 'sino-to', name: "Sino 'To?", module: null, playable: false },
  { slug: 'lamok-lamay', name: 'Lamok Lamay', module: null, playable: false },
  { slug: 'tawid-lola', name: 'Tawid, Lola!', module: null, playable: false },
  { slug: 'hati-tayo', name: 'Hati Tayo!', module: 'm06', playable: false },
  { slug: 'gawa-ko-to', name: "Gawa Ko 'To!", module: 'm07', playable: false },
  { slug: 'tulog-na-bea', name: 'Tulog na, Bea!', module: 'm08', playable: false },
  { slug: 'sa-sapatos-nila', name: 'Sa Sapatos Nila', module: 'm09', playable: false },
  { slug: 'objection', name: 'OBJECTION!', module: 'm10', playable: false },
];
