// Runtime safety net for elements that must keep a fixed size (stamps, HUD stats, tile labels, chips in fixed grids).
// Opt in with `data-fit`. One shared ResizeObserver steps the font size down (never below 75% or 12px) until the text
// no longer overflows, and resets the step when the text or the box size changes (language switch, resize).
const MIN_RATIO = 0.75;
const MIN_PX = 12;
const STEP = 0.92;

const overflows = (el: HTMLElement): boolean => {
  if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) return true;
  // centred flex content overflows to the left too, which scrollWidth does not report: measure the content itself
  const box = el.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(el);
  const c = range.getBoundingClientRect();
  return c.width > 0 && (c.left < box.left - 1 || c.right > box.right + 1);
};

export function fit(el: HTMLElement): void {
  el.style.removeProperty('font-size');
  if (!overflows(el)) return;
  const base = parseFloat(getComputedStyle(el).fontSize);
  if (!base) return;
  const floor = Math.max(base * MIN_RATIO, Math.min(MIN_PX, base));
  let size = base;
  while (overflows(el) && size > floor) {
    size = Math.max(floor, size * STEP);
    el.style.fontSize = `${size}px`;
  }
}

let ro: ResizeObserver | null = null;
let mo: MutationObserver | null = null;
let queued = false;
const pending = new Set<HTMLElement>();

function flush(): void {
  queued = false;
  for (const el of pending) if (el.isConnected) fit(el);
  pending.clear();
}

function schedule(el: HTMLElement): void {
  pending.add(el);
  if (!queued) {
    queued = true;
    requestAnimationFrame(flush);
  }
}

function watch(el: HTMLElement): void {
  if (el.dataset.fitWatched) return;
  el.dataset.fitWatched = '1';
  ro?.observe(el);
  schedule(el);
}

/** Start the safety net once; safe to call again. Does nothing without ResizeObserver (tests, old browsers). */
export function startAutoFit(): void {
  if (ro || typeof ResizeObserver === 'undefined' || typeof MutationObserver === 'undefined') return;
  ro = new ResizeObserver((entries) => {
    for (const e of entries) schedule(e.target as HTMLElement);
  });
  const scan = (root: ParentNode) => root.querySelectorAll<HTMLElement>('[data-fit]').forEach(watch);
  mo = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (n instanceof HTMLElement) {
          if (n.hasAttribute('data-fit')) watch(n);
          scan(n);
        }
      });
      const host = (m.target instanceof HTMLElement ? m.target : m.target.parentElement)?.closest<HTMLElement>('[data-fit]');
      if (host) schedule(host);
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  scan(document);
}
