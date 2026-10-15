// Pixel icon registry on a 24x24 grid. pixelarticons (MIT) where the icon exists; hand-made otherwise.
import home from 'pixelarticons/svg/home.svg?raw';
import bookOpen from 'pixelarticons/svg/book-open.svg?raw';
import gamepad from 'pixelarticons/svg/gamepad.svg?raw';
import user from 'pixelarticons/svg/user.svg?raw';
import flag from 'pixelarticons/svg/flag.svg?raw';
import close from 'pixelarticons/svg/close.svg?raw';
import check from 'pixelarticons/svg/check.svg?raw';
import lock from 'pixelarticons/svg/lock.svg?raw';
import heart from 'pixelarticons/svg/heart.svg?raw';
import trophy from 'pixelarticons/svg/trophy.svg?raw';
import calendar from 'pixelarticons/svg/calendar.svg?raw';
import mail from 'pixelarticons/svg/mail.svg?raw';
import info from 'pixelarticons/svg/info-box.svg?raw';
import chat from 'pixelarticons/svg/message-text.svg?raw';
import warning from 'pixelarticons/svg/warning-diamond.svg?raw';
import arrowLeft from 'pixelarticons/svg/arrow-left.svg?raw';
import arrowRight from 'pixelarticons/svg/arrow-right.svg?raw';
import chevronLeft from 'pixelarticons/svg/chevron-left.svg?raw';
import chevronRight from 'pixelarticons/svg/chevron-right.svg?raw';

/** Extract the path data from a pixelarticons SVG file. */
const paths = (svg: string): string[] => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1] as string);

const fromPack = { home, learn: bookOpen, arcade: gamepad, me: user, flag, close, check, lock, heart, trophy, calendar, mail, info, chat, warning, 'arrow-left': arrowLeft, 'arrow-right': arrowRight, 'chevron-left': chevronLeft, 'chevron-right': chevronRight };

/** Hand-made 24-cell icons (single colour, crisp edges). */
const handMade = {
  // pixel sun: disc plus eight rays
  sun: ['M10 6h4v2h2v2h2v4h-2v2h-2v2h-4v-2H8v-2H6v-4h2V8h2z', 'M11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4 4h2v2H4zM18 4h2v2h-2zM4 18h2v2H4zM18 18h2v2h-2z'],
  // stepped play triangle
  play: ['M5 3h3v18H5zM8 5h3v14H8zM11 7h3v10h-3zM14 9h3v6h-3zM17 11h2v2h-2z'],
  // four-point XP star
  'xp-star': ['M11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4zM9 5h6v2H9zM9 17h6v2H9zM5 9h2v6H5zM17 9h2v6h-2zM7 7h10v10H7z'],
  // flame with a hollow core (even-odd)
  flame: ['M11 1h2v3h2v4h2v2h2v8h-2v2h-2v2H9v-2H7v-2H5v-8h2V8h2V4h2zM10 14h4v6h-4z'],
  // solid pixel heart (pixelarticons only has the outline), for hit points
  'heart-solid': ['M5 4h4v2H5zM15 4h4v2h-4zM3 6h8v2H3zM13 6h8v2h-8zM3 8h18v4H3zM5 12h14v2H5zM7 14h10v2H7zM9 16h6v2H9zM11 18h2v2h-2z'],
  // book stack (pixelarticons has no "bookmarks")
  library: ['M4 3h16v5H4zM2 10h16v5H2zM5 17h17v5H5z'],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof fromPack | keyof typeof handMade;

const evenOdd: ReadonlySet<string> = new Set(['flame']);

const registry: Record<string, string[]> = { ...handMade };
for (const [name, svg] of Object.entries(fromPack)) registry[name] = paths(svg);

export interface IconData {
  paths: string[];
  evenOdd: boolean;
}

export function iconData(name: IconName): IconData {
  return { paths: registry[name] ?? [], evenOdd: evenOdd.has(name) };
}
