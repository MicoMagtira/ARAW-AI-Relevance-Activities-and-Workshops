// Inclusive pixel avatars on a 16x16 grid, drawn in Ara's style. Colours are sprite data (like Ara's frames), not UI tokens.

type Hair = 'long' | 'short' | 'bun' | 'curly' | 'hijab';
type Rect = readonly [x: number, y: number, w: number, h: number, colour: string];

export interface AvatarSpec {
  id: string;
  /** Spoken description (picker buttons and the big preview). */
  label: string;
  skin: string;
  hair: Hair;
  /** Hair colour, or the scarf colour for `hijab`. */
  hairColor: string;
  shirt: string;
  glasses?: boolean;
  moustache?: boolean;
  chair?: boolean;
}

export const AVATARS: readonly AvatarSpec[] = [
  { id: 'young-woman', label: 'Young woman with long hair', skin: '#E2A77E', hair: 'long', hairColor: '#2B2118', shirt: '#35408E' },
  { id: 'young-man', label: 'Young man with short hair', skin: '#A86B45', hair: 'short', hairColor: '#1A1410', shirt: '#FF7A59' },
  { id: 'lola', label: 'Grandmother with a bun and glasses', skin: '#D9A07A', hair: 'bun', hairColor: '#B9B6B0', shirt: '#2FA36B', glasses: true },
  { id: 'hijab', label: 'Woman in a hijab', skin: '#C98E66', hair: 'hijab', hairColor: '#35408E', shirt: '#E8B84A' },
  { id: 'lolo', label: 'Grandfather with glasses', skin: '#B97B52', hair: 'short', hairColor: '#C9C6C0', shirt: '#4A56A8', glasses: true },
  { id: 'wheelchair', label: 'Teen who uses a wheelchair', skin: '#8C5A3C', hair: 'short', hairColor: '#1A1410', shirt: '#E8B84A', chair: true },
  { id: 'tita', label: 'Auntie with short curly hair', skin: '#F1C9A5', hair: 'curly', hairColor: '#5A3A22', shirt: '#C4323A' },
  { id: 'tatay', label: 'Dad with a moustache', skin: '#7A4A30', hair: 'short', hairColor: '#1A1410', shirt: '#2FA36B', moustache: true },
];

export const AVATAR_COUNT = AVATARS.length;

const INK = '#1F2550';
const MOUTH = '#8A3B2E';
const CHAIR = '#4A4F6A';

/** Hair pieces leave the colour empty; `paint` fills it in. */
const rect = (x: number, y: number, w: number, h: number, colour = ''): Rect => [x, y, w, h, colour];

function wheel(x: number): Rect[] {
  return [rect(x + 1, 10, 2, 1, CHAIR), rect(x + 1, 15, 2, 1, CHAIR), rect(x, 11, 1, 4, CHAIR), rect(x + 3, 11, 1, 4, CHAIR), rect(x + 1, 12, 2, 2, CHAIR)];
}

function hairRects(hair: Exclude<Hair, 'hijab'>): Rect[] {
  const top = [rect(4, 2, 8, 1), rect(3, 3, 10, 2)];
  switch (hair) {
    case 'long':
      return [...top, rect(3, 5, 1, 7), rect(12, 5, 1, 7)];
    case 'short':
      return [...top, rect(3, 5, 1, 2), rect(12, 5, 1, 2)];
    case 'curly':
      return [rect(5, 1, 2, 1), rect(9, 1, 2, 1), ...top, rect(3, 5, 1, 2), rect(12, 5, 1, 2)];
    case 'bun':
      return [rect(7, 0, 2, 1), rect(6, 1, 4, 2), rect(4, 3, 8, 2), rect(3, 4, 1, 3), rect(12, 4, 1, 3)];
  }
}

/** Every filled cell of an avatar as [x, y, w, h, colour], back to front. */
export function avatarRects(spec: AvatarSpec): Rect[] {
  const { skin, hairColor: hc, shirt } = spec;
  const out: Rect[] = [];
  const paint = (rects: Rect[], colour?: string) => rects.forEach((r) => out.push(colour ? [r[0], r[1], r[2], r[3], colour] : r));

  if (spec.chair) {
    paint([...wheel(1), ...wheel(11)]);
    paint([rect(5, 14, 6, 1, CHAIR)]);
    paint([rect(5, 12, 6, 2, shirt)]);
  } else {
    paint([rect(4, 12, 8, 1, shirt), rect(3, 13, 10, 3, shirt)]);
  }

  if (spec.hair === 'hijab') {
    paint([rect(4, 2, 8, 1, hc), rect(3, 3, 10, 10, hc)]);
    paint([rect(5, 4, 6, 6, skin), rect(6, 10, 4, 1, skin)]);
  } else {
    paint([rect(7, 11, 2, 1, skin), rect(4, 4, 8, 6, skin), rect(5, 10, 6, 1, skin)]);
    paint(hairRects(spec.hair), hc);
  }

  paint([rect(6, 7, 1, 1, INK), rect(9, 7, 1, 1, INK)]);
  paint([rect(7, 9, 2, 1, MOUTH)]);
  if (spec.moustache) paint([rect(6, 8, 4, 1, hc)]);
  if (spec.glasses) {
    paint([rect(5, 6, 3, 1, INK), rect(5, 8, 3, 1, INK), rect(5, 6, 1, 3, INK), rect(7, 6, 1, 3, INK)]);
    paint([rect(8, 6, 3, 1, INK), rect(8, 8, 3, 1, INK), rect(8, 6, 1, 3, INK), rect(10, 6, 1, 3, INK)]);
  }
  return out;
}

/** Cells grouped by colour as SVG path data (one path per colour keeps the DOM small). */
export function avatarPaths(spec: AvatarSpec): Array<{ colour: string; d: string }> {
  const byColour = new Map<string, string>();
  for (const [x, y, w, h, colour] of avatarRects(spec)) {
    byColour.set(colour, `${byColour.get(colour) ?? ''}M${x} ${y}h${w}v${h}h${-w}z`);
  }
  return [...byColour].map(([colour, d]) => ({ colour, d }));
}

/** Clamp a stored avatar index into the set (older or edited data falls back to the first avatar). */
export function safeAvatarIndex(i: number): number {
  return Number.isInteger(i) && i >= 0 && i < AVATAR_COUNT ? i : 0;
}
