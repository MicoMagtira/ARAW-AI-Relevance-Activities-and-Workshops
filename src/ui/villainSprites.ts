// Pixel portraits of the five villains (docs/CONTENT_GUIDE.md section 4: pixel art, comic, never scary).
// Each is a 16 x 16 bust drawn as its LEFT HALF (8 characters per row); the right half is the mirror image, so every portrait
// is symmetrical by construction. Like Ara's frames, the colours here are sprite data, not UI colours.
import type { VillainId } from '../content/tactics';

export const SPRITE_SIZE = 16;
const HALF = SPRITE_SIZE / 2;

/** One character per colour; `.` is transparent. */
export const SPRITE_PALETTE: Readonly<Record<string, string>> = {
  o: '#1F2550', // ink outline
  s: '#F5CFA6', // skin
  w: '#FFFFFF',
  g: '#C9CCDA', // foil grey
  r: '#C4323A', // red
  c: '#FF7A59', // coral
  y: '#E8B84A', // gold
  n: '#35408E', // navy
  b: '#8FA0E8', // glint blue
  k: '#3A2A2A', // dark hair
  e: '#1E7D50', // green
  p: '#7A4FA0', // purple
  m: '#8A2030', // mouth
  t: '#3AA6A0', // teal
};

const HALVES: Readonly<Record<VillainId, readonly string[]>> = {
  // Dr. Fake: white coat, head mirror, thin moustache. Looks the part, nothing behind it.
  dr_fake: [
    '........',
    '....oooo',
    '...okkkk',
    '..okkkyy',
    '..osssss',
    '..oswoss',
    '..osssss',
    '..osskkk',
    '..ossmmm',
    '...ossss',
    '.....oss',
    '.oowwwss',
    '.owwwwnn',
    '.owrwwwn',
    '.owwwwwn',
    '.ooooooo',
  ],
  // Miracle Mike: straw hat, huge sales grin, green vest with gold buttons.
  miracle_mike: [
    '....oooo',
    '...occcc',
    '...oyyyy',
    '.ooocccc',
    '..osssss',
    '..okksss',
    '..oswoss',
    '..osssss',
    '..osmwww',
    '...osmmm',
    '....osss',
    '.oeeeeww',
    '.oeeeeyw',
    '.oeeeeew',
    '.oeeeeyw',
    '.ooooooo',
  ],
  // Fear Monger: siren on the head, wide eyes, open mouth, a red "!" shirt.
  fear_monger: [
    '.....ooo',
    '....orcc',
    '...oorrr',
    '..ooyyyy',
    '..okkkkk',
    '..osssss',
    '..owowss',
    '..owowss',
    '..osmmmm',
    '...osmrr',
    '....osss',
    '.orrrrss',
    '.orrrrrw',
    '.orrrrrw',
    '.orrrrrr',
    '.ooooooo',
  ],
  // Conspiracy Kuya: foil hat, dark glasses, big moustache, navy hoodie.
  conspiracy_kuya: [
    '.......o',
    '......ow',
    '.....ogw',
    '....ogwg',
    '...ogwgg',
    '.ooggggg',
    '..osssss',
    '..oobooo',
    '..osssss',
    '..osskkk',
    '...ossmm',
    '....osss',
    '.onnnnss',
    '.onnnnwn',
    '.onnnnwn',
    '.ooooooo',
  ],
  // Kwento Kim: purple pigtails, mid-story open mouth, teal top with a speech bubble.
  kwento_kim: [
    '....oooo',
    '...opppp',
    '..oppppp',
    '..oppppp',
    'oppossss',
    'oppowoss',
    'oppossss',
    'oppossmm',
    '.pp.osss',
    '.pp.osss',
    '.....oss',
    '.ottttss',
    '.ottwwww',
    '.ottwwow',
    '.ottwwww',
    '.ooooooo',
  ],
};

/** The full 16-character rows of a villain's portrait (left half plus its mirror). */
export function spriteRows(id: VillainId): string[] {
  return (HALVES[id] ?? []).map((half) => half + [...half].reverse().join(''));
}

export interface SpriteRun {
  char: string;
  x: number;
  y: number;
  w: number;
}

/** Horizontal runs of one colour, merged to keep the SVG small. */
export function spriteRuns(id: VillainId): SpriteRun[] {
  const runs: SpriteRun[] = [];
  spriteRows(id).forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const char = row[x] as string;
      let w = 1;
      while (row[x + w] === char) w++;
      if (char !== '.') runs.push({ char, x, y, w });
      x += w;
    }
  });
  return runs;
}

/** SVG path data per colour character. */
export function spritePaths(id: VillainId): Array<[string, string]> {
  const byChar = new Map<string, string>();
  for (const r of spriteRuns(id)) byChar.set(r.char, `${byChar.get(r.char) ?? ''}M${r.x} ${r.y}h${r.w}v1h-${r.w}z`);
  return [...byChar.entries()];
}

export { HALF as SPRITE_HALF };
