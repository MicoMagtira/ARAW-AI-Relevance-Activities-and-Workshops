// Pure helpers for the user guide: the screenshot manifest's shape and where numbered callout markers go.
// No imports on purpose: scripts/guide/build-pdf.mjs loads this file straight from Node (type stripping),
// and the in-app Guide screen uses the same maths, so markers sit on the same spot in the app and in the PDF.

/** A rectangle in CSS pixels, relative to the top-left corner of the saved screenshot. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ShotVariant = 'phone' | 'desktop';

export interface ShotEntry {
  /** Path relative to the app root (and to public/), e.g. `guide/home-phone.png`. */
  file: string;
  /** Image size in CSS pixels (the PNG itself is this times its scale). */
  w: number;
  h: number;
  scale: number;
  /** Named targets the guide can point at. A target that was not found is simply missing. */
  boxes: Record<string, Box>;
}

export interface GuideManifest {
  generatedAt: string;
  shots: Record<string, Partial<Record<ShotVariant, ShotEntry>>>;
}

/** Marker position in percent of the image, so it scales with a responsive image. */
export interface Marker {
  n: number;
  target: string;
  left: number;
  top: number;
}

export interface PlaceOptions {
  /** Marker diameter in image CSS pixels (used for clamping and overlap). Default 28. */
  marker?: number;
  /** Where on the box the marker sits. Default 'top-left': centred on the corner, so it covers little of the element. */
  anchor?: 'top-left' | 'center' | 'left';
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Centre point (in image pixels) of a marker for one box, before overlap handling. */
export function anchorPoint(box: Box, anchor: PlaceOptions['anchor'] = 'top-left', marker = 28): { x: number; y: number } {
  const inset = marker / 2;
  if (anchor === 'center') return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  if (anchor === 'left') return { x: box.x + Math.min(inset, box.w / 2), y: box.y + box.h / 2 };
  return { x: box.x, y: box.y };
}

/** Is a box usable at all (inside the image, with some size)? */
export function isUsableBox(box: Box | undefined, w: number, h: number): box is Box {
  if (!box) return false;
  if (![box.x, box.y, box.w, box.h].every(Number.isFinite)) return false;
  if (box.w <= 0 || box.h <= 0) return false;
  return box.x < w && box.y < h && box.x + box.w > 0 && box.y + box.h > 0;
}

/**
 * Place numbered markers for `targets` (in order: the first target is number 1) over a `w` x `h` screenshot.
 * Targets missing from `boxes` keep their number but get no marker (the legend still lists them).
 * Markers stay fully inside the image, and a marker that would cover an earlier one is nudged down (then up).
 */
export function placeCallouts(targets: readonly string[], boxes: Record<string, Box>, w: number, h: number, options: PlaceOptions = {}): Marker[] {
  const size = options.marker ?? 28;
  const half = size / 2;
  const placed: Array<{ x: number; y: number }> = [];
  const out: Marker[] = [];
  targets.forEach((target, i) => {
    const box = boxes[target];
    if (!isUsableBox(box, w, h)) return;
    const p = anchorPoint(box, options.anchor, size);
    let x = clamp(p.x, half, w - half);
    let y = clamp(p.y, half, h - half);
    const hits = (yy: number) => placed.some((q) => Math.abs(q.x - x) < size && Math.abs(q.y - yy) < size);
    if (hits(y)) {
      // try below first, then above, in marker-sized steps
      let moved = false;
      for (let step = 1; step <= 6 && !moved; step++) {
        for (const dir of [1, -1]) {
          const yy = y + dir * step * size;
          if (yy >= half && yy <= h - half && !hits(yy)) {
            y = yy;
            moved = true;
            break;
          }
        }
      }
      if (!moved) x = clamp(x + size, half, w - half);
    }
    placed.push({ x, y });
    out.push({ n: i + 1, target, left: round2((x / w) * 100), top: round2((y / h) * 100) });
  });
  return out;
}

/** The variant to show, falling back to the other one when only one was captured. */
export function pickShot(manifest: GuideManifest, id: string, prefer: ShotVariant): ShotEntry | undefined {
  const entry = manifest.shots[id];
  if (!entry) return undefined;
  return entry[prefer] ?? entry[prefer === 'phone' ? 'desktop' : 'phone'];
}
