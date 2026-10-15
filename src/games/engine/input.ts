// One input model for touch, mouse and keyboard: games read actions and taps, never raw events.

export type Action = 'left' | 'right' | 'up' | 'down' | 'act';

export interface Tap {
  /** Logical canvas units. */
  x: number;
  y: number;
}

export interface InputFrame {
  /** Actions pressed since the last frame (key presses and swipes), oldest first. */
  actions: Action[];
  /** Actions whose key is held right now. */
  held: ReadonlySet<Action>;
  /** Taps and clicks since the last frame. */
  taps: Tap[];
  /** Pointer position in logical units while it is over the canvas or pressed, else null. */
  pointer: { x: number; y: number; down: boolean } | null;
}

const KEY_ACTIONS: Record<string, Action> = {
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ' ': 'act',
  Enter: 'act',
};

export const keyAction = (key: string): Action | null => KEY_ACTIONS[key] ?? null;

/** Swipe distance (CSS px) that counts as a swipe rather than a tap. */
export const SWIPE_MIN_PX = 28;

/** Direction of a drag from its x and y distance, or null when it is too short to be a swipe. */
export function swipeAction(dx: number, dy: number, minDistance: number = SWIPE_MIN_PX): Action | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minDistance) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

export interface InputController {
  /** Take everything that happened since the last call. */
  frame(): InputFrame;
  /** Drop queued input (e.g. after a pause) and stop holding keys. */
  clear(): void;
  /** While false, key and pointer input is ignored (and not blocked from the page). */
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

const isFormField = (el: EventTarget | null): boolean => el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
const isControl = (el: EventTarget | null): boolean => el instanceof HTMLElement && /^(BUTTON|A|SUMMARY)$/.test(el.tagName);

/**
 * Listen for keys on the window and pointers on `target`.
 * `toLogical` turns client coordinates into the game's logical units.
 */
export function createInput(target: HTMLElement, toLogical: (clientX: number, clientY: number) => { x: number; y: number }): InputController {
  let enabled = true;
  let actions: Action[] = [];
  let taps: Tap[] = [];
  const held = new Set<Action>();
  let pointer: InputFrame['pointer'] = null;
  let press: { id: number; x: number; y: number; swiped: boolean } | null = null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (!enabled || e.ctrlKey || e.metaKey || e.altKey || isFormField(e.target)) return;
    const action = keyAction(e.key);
    if (!action) return;
    // Space and Enter on a focused button must still press that button
    if (action === 'act' && isControl(e.target)) return;
    e.preventDefault();
    if (!e.repeat) actions.push(action);
    held.add(action);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const action = keyAction(e.key);
    if (action) held.delete(action);
  };
  const onBlur = () => held.clear();

  const onDown = (e: PointerEvent) => {
    if (!enabled) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
    pointer = { ...toLogical(e.clientX, e.clientY), down: true };
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers cannot be captured: fine */
    }
  };
  const onMove = (e: PointerEvent) => {
    if (!enabled) return;
    pointer = { ...toLogical(e.clientX, e.clientY), down: press !== null };
    if (press && !press.swiped && press.id === e.pointerId) {
      const swipe = swipeAction(e.clientX - press.x, e.clientY - press.y);
      if (swipe) {
        press.swiped = true;
        actions.push(swipe);
      }
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!enabled || !press || press.id !== e.pointerId) return;
    if (!press.swiped) taps.push(toLogical(e.clientX, e.clientY));
    press = null;
    pointer = e.pointerType === 'mouse' ? { ...toLogical(e.clientX, e.clientY), down: false } : null;
  };
  const onCancel = () => {
    press = null;
    pointer = null;
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !press) pointer = null;
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onCancel);
  target.addEventListener('pointerleave', onLeave);

  const clear = () => {
    actions = [];
    taps = [];
    held.clear();
    press = null;
    pointer = null;
  };

  return {
    frame() {
      const out: InputFrame = { actions, held: new Set(held), taps, pointer: pointer ? { ...pointer } : null };
      actions = [];
      taps = [];
      return out;
    },
    clear,
    setEnabled(next) {
      enabled = next;
      if (!next) clear();
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      target.removeEventListener('pointerdown', onDown);
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      target.removeEventListener('pointerleave', onLeave);
    },
  };
}
