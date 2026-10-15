// "Pahinga muna!": cumulative play time in this browser session, so Ara can suggest a break.

export const BREAK_AFTER_MS = 10 * 60 * 1000;

export class PlayClock {
  playedMs = 0;
  limitMs: number;

  constructor(limitMs: number = BREAK_AFTER_MS) {
    this.limitMs = limitMs;
  }

  /** Add play time. Returns true once the limit is reached (and keeps returning true until reset). */
  add(ms: number): boolean {
    if (ms > 0 && Number.isFinite(ms)) this.playedMs += ms;
    return this.due;
  }

  get due(): boolean {
    return this.playedMs >= this.limitMs;
  }

  /** Whole minutes played, for the recap line. */
  get minutes(): number {
    return Math.floor(this.playedMs / 60_000);
  }

  reset(): void {
    this.playedMs = 0;
  }
}

/** One clock for the whole session, shared by every game. Memory only: a new visit starts fresh. */
export const sessionClock = new PlayClock();
