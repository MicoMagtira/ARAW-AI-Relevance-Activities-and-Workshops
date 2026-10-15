// Canvas sizing maths: fit a fixed logical size into a box (letterbox), sharp at any devicePixelRatio.

export interface Fit {
  /** Canvas size in CSS pixels. */
  cssWidth: number;
  cssHeight: number;
  /** Backing store size in device pixels. */
  pixelWidth: number;
  pixelHeight: number;
  /** Device pixels per logical pixel (the ctx scale). */
  scale: number;
  dpr: number;
}

/** With pixel snapping, whole-number scales are used while they waste less than this share of the box. */
const SNAP_TOLERANCE = 0.85;

/**
 * Largest canvas of the logical aspect ratio that fits the box. With `snap` (pixel art) the picture is drawn at a whole
 * number of device pixels per logical pixel, so every sprite pixel is crisp. If a whole number would leave big bars
 * (under 85% of the box) the buffer is drawn one whole step larger and shown at the exact fitting size instead.
 * Below 1x it scales smoothly.
 */
export function fitCanvas(boxWidth: number, boxHeight: number, logicalWidth: number, logicalHeight: number, dpr = 1, snap = true): Fit {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const w = Math.max(0, boxWidth);
  const h = Math.max(0, boxHeight);
  const raw = Math.max(0.01, Math.min((w * ratio) / logicalWidth, (h * ratio) / logicalHeight));
  let scale = raw; // device pixels per logical pixel in the buffer
  let shown = raw; // device pixels per logical pixel on screen
  if (snap && raw >= 1) {
    const whole = Math.floor(raw);
    if (whole / raw >= SNAP_TOLERANCE) {
      scale = whole;
      shown = whole;
    } else {
      scale = Math.ceil(raw);
    }
  }
  const pixelWidth = Math.max(1, Math.round(logicalWidth * scale));
  const pixelHeight = Math.max(1, Math.round(logicalHeight * scale));
  // floor to hundredths so rounding never pushes the canvas a hair outside its box
  const css = (logical: number) => Math.floor(((logical * shown) / ratio) * 100) / 100;
  return { cssWidth: css(logicalWidth), cssHeight: css(logicalHeight), pixelWidth, pixelHeight, scale, dpr: ratio };
}

/** Where a pointer is on the canvas, in logical units (rect = the canvas's bounding rect in CSS pixels). */
export function toLogical(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  logicalWidth: number,
  logicalHeight: number,
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  return { x: ((clientX - rect.left) / rect.width) * logicalWidth, y: ((clientY - rect.top) / rect.height) * logicalHeight };
}

export interface CanvasFit {
  /** Re-measure now (also runs on its own when the box, window or orientation changes). */
  resize(): void;
  current(): Fit;
  destroy(): void;
}

/**
 * Keep `canvas` fitted inside `box` (a positioned element with its own size). Handles window resize, orientation change
 * and box size change (ResizeObserver). Drawing code works in logical units: the context is pre-scaled.
 */
export function attachCanvas(canvas: HTMLCanvasElement, box: HTMLElement, logicalWidth: number, logicalHeight: number, onResize?: (fit: Fit) => void): CanvasFit {
  let fit = fitCanvas(box.clientWidth, box.clientHeight, logicalWidth, logicalHeight, window.devicePixelRatio);

  const resize = () => {
    fit = fitCanvas(box.clientWidth, box.clientHeight, logicalWidth, logicalHeight, window.devicePixelRatio);
    canvas.width = fit.pixelWidth;
    canvas.height = fit.pixelHeight;
    canvas.style.width = `${fit.cssWidth}px`;
    canvas.style.height = `${fit.cssHeight}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(fit.scale, 0, 0, fit.scale, 0, 0);
      ctx.imageSmoothingEnabled = false;
    }
    onResize?.(fit);
  };

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  observer?.observe(box);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  resize();

  return {
    resize,
    current: () => fit,
    destroy() {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    },
  };
}
