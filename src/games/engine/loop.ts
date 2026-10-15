// Fixed-timestep game loop: the game logic always advances in equal steps, however fast the screen refreshes.

export const STEP_MS = 1000 / 60;
/** A long frame (tab was busy or hidden) is cut to this, so the game never "catches up" in a burst. */
export const MAX_FRAME_MS = 250;

/**
 * Pure clock maths. Add a frame's time to the leftover time and take out whole steps.
 * Returns how many fixed steps to run and the new leftover (always less than one step).
 */
export function advanceClock(acc: number, frameMs: number, stepMs: number = STEP_MS, maxFrameMs: number = MAX_FRAME_MS): { steps: number; acc: number } {
  const frame = Math.min(Math.max(0, Number.isFinite(frameMs) ? frameMs : 0), maxFrameMs);
  let total = acc + frame;
  const steps = Math.floor(total / stepMs + 1e-9);
  total -= steps * stepMs;
  return { steps, acc: Math.max(0, total) };
}

export interface LoopOptions {
  /** Runs once per fixed step with the step length in ms. */
  update: (stepMs: number) => void;
  /** Runs once per screen frame; `alpha` (0 to 1) is how far we are into the next step. */
  render: (alpha: number) => void;
  stepMs?: number;
  maxFrameMs?: number;
  /** Test hooks: default to requestAnimationFrame / cancelAnimationFrame. */
  schedule?: (cb: (time: number) => void) => number;
  cancel?: (id: number) => void;
}

export interface Loop {
  start(): void;
  stop(): void;
  readonly running: boolean;
}

export function createLoop(options: LoopOptions): Loop {
  const { update, render, stepMs = STEP_MS, maxFrameMs = MAX_FRAME_MS } = options;
  const schedule = options.schedule ?? ((cb) => requestAnimationFrame(cb));
  const cancel = options.cancel ?? ((id) => cancelAnimationFrame(id));
  let handle: number | null = null;
  let last: number | null = null;
  let acc = 0;
  let stopped = true;

  const frame = (time: number) => {
    handle = null;
    const dt = last === null ? 0 : time - last;
    last = time;
    const next = advanceClock(acc, dt, stepMs, maxFrameMs);
    acc = next.acc;
    for (let i = 0; i < next.steps && !stopped; i++) update(stepMs);
    if (stopped) return; // update() may stop the loop (game over)
    render(acc / stepMs);
    handle = schedule(frame);
  };

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      last = null; // the first frame after a start only sets the clock
      acc = 0;
      handle = schedule(frame);
    },
    stop() {
      stopped = true;
      if (handle !== null) cancel(handle);
      handle = null;
      last = null;
    },
    get running() {
      return !stopped;
    },
  };
}
