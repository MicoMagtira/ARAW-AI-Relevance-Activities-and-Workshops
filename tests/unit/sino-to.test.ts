import { describe, expect, it } from 'vitest';
import { STEP_MS } from '../../src/games/engine/loop';
import type { Action, InputFrame } from '../../src/games/engine/input';
import { createRng } from '../../src/games/engine/rng';
import type { GameInstance } from '../../src/games/engine/types';
import {
  BUBBLE_CHARS,
  BUBBLE_LINES,
  H,
  HANGUP_SLOT,
  HEAD_CHARS,
  HELP_SLOT,
  LESSON_LINES,
  LINE_CHARS,
  SLOTS,
  W,
  moveSlot,
  slotAt,
  slotRect,
  wrapText,
} from '../../src/games/sino-to/art';
import {
  BASE_POINTS,
  BONUS_MAX,
  CHECKS,
  CHECK_INFO,
  FAMILY,
  GUESS_POINTS,
  STORIES,
  createCallGenerator,
  decisiveCount,
  evidence,
  judge,
  multiplierFor,
  type Call,
  type CheckId,
} from '../../src/games/sino-to/calls';
import sino, { buildRecap, headlineFor } from '../../src/games/sino-to/sino';

const NONE: InputFrame = { actions: [], held: new Set(), taps: [], pointer: null };
const press = (...actions: Action[]): InputFrame => ({ ...NONE, actions });
const tapAt = (x: number, y: number): InputFrame => ({ ...NONE, taps: [{ x, y }] });
const center = (slot: number) => {
  const r = slotRect(slot);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
};
const make = (seed: string): GameInstance => sino.create({ seed, rng: createRng(seed) });

function run(game: GameInstance, ms: number, input: InputFrame = NONE) {
  for (let t = 0; t < ms; t += STEP_MS) game.step(STEP_MS, t === 0 ? input : NONE);
}
const tapSlot = (game: GameInstance, slot: number) => {
  const c = center(slot);
  run(game, STEP_MS, tapAt(c.x, c.y));
};

/** The calls a game made from this seed (same derivation as the game uses). */
function callsOf(seed: string, count: number): Call[] {
  const rng = createRng(seed);
  const gen = createCallGenerator(createRng(`${rng()}:sino-calls`));
  return Array.from({ length: count }, (_, i) => gen.next(i));
}

function fakeContext(): CanvasRenderingContext2D {
  const noop = () => undefined;
  return new Proxy({}, { get: (_t, prop) => (prop === 'measureText' ? () => ({ width: 8 }) : noop), set: () => true }) as unknown as CanvasRenderingContext2D;
}

describe('call generator', () => {
  it('gives the same calls for the same seed and different calls for another', () => {
    expect(callsOf('s1', 40).map((c) => c.text)).toEqual(callsOf('s1', 40).map((c) => c.text));
    expect(callsOf('s1', 40).map((c) => c.text)).not.toEqual(callsOf('s2', 40).map((c) => c.text));
  });

  it('mixes fake and real calls and never runs more than 3 of a kind in a row', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const calls = callsOf(seed, 200);
      const scams = calls.filter((c) => c.scam).length;
      expect(scams).toBeGreaterThan(70);
      expect(scams).toBeLessThan(130);
      for (let i = 3; i < calls.length; i++) {
        const four = calls.slice(i - 3, i + 1).map((c) => c.scam);
        expect(four.every((s) => s === four[0])).toBe(false);
      }
    }
  });

  it('has fake and real stories for relatives, doctors and banks, fake ones first-class and with a lesson', () => {
    for (const kind of ['relative', 'doctor', 'bank'] as const) {
      expect(STORIES.some((s) => s.kind === kind && s.scam)).toBe(true);
      expect(STORIES.some((s) => s.kind === kind && !s.scam)).toBe(true);
    }
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length);
  });

  it('never repeats a story within 3 calls and fills every blank', () => {
    const calls = callsOf('rep', 300);
    for (let i = 1; i < calls.length; i++) {
      for (let k = 1; k <= 3 && i - k >= 0; k++) expect((calls[i] as Call).story.id).not.toBe((calls[i - k] as Call).story.id);
    }
    for (const c of calls) expect(c.text).not.toMatch(/[{}]/);
  });

  it('every transcript fits the bubble, every check result fits one line, every lesson and name fits the reveal', () => {
    for (const seed of ['fit1', 'fit2', 'fit3']) {
      for (const c of callsOf(seed, 300)) {
        expect(wrapText(c.text, BUBBLE_CHARS).length).toBeLessThanOrEqual(BUBBLE_LINES);
        for (const id of CHECKS) expect(c.results[id].text.length).toBeLessThanOrEqual(LINE_CHARS);
        expect(`${c.channel}: ${c.callerName}, ${c.tag}`.length).toBeLessThanOrEqual(LINE_CHARS);
      }
    }
    for (const s of STORIES) expect(wrapText(s.lesson, LINE_CHARS).length).toBeLessThanOrEqual(LESSON_LINES);
    for (const f of FAMILY) expect(f.name.length).toBeLessThanOrEqual(9);
  });

  it('a call is fake or real consistently: passing checks belong to real calls, failing checks to fakes', () => {
    for (const c of callsOf('truth', 300)) {
      for (const id of CHECKS) {
        const v = c.results[id].verdict;
        if (v === 'pass') expect(c.scam).toBe(false);
        if (v === 'fail') expect(c.scam).toBe(true);
      }
      expect(c.decisive.length).toBeGreaterThanOrEqual(1);
      for (const id of c.decisive) expect(c.results[id].verdict).not.toBe('unclear');
      for (const id of CHECKS) if (!c.decisive.includes(id)) expect(c.results[id].verdict).toBe('unclear');
    }
  });

  it('checks that cannot settle a story say so: no secret question for a doctor or bank, no callback after "my phone broke"', () => {
    for (const c of callsOf('limits', 300)) {
      if (c.kind !== 'relative') expect(c.results.secret.verdict).toBe('unclear');
      if (c.kind === 'bank') expect(c.results.relative.verdict).toBe('unclear');
      if (c.story.excuse) expect(c.results.callback.verdict).toBe('unclear');
      if (c.kind === 'relative' && !c.story.hospital) expect(c.results.hotline.verdict).toBe('unclear');
    }
  });

  it('fewer checks settle a call as the run goes on', () => {
    expect(decisiveCount(0)).toBe(3);
    expect(decisiveCount(6)).toBe(2);
    expect(decisiveCount(12)).toBe(1);
    expect(decisiveCount(500)).toBe(1);
    const late = callsOf('late', 40).slice(20);
    expect(late.every((c) => c.decisive.length === 1)).toBe(true);
  });

  it('the caller card does not give the truth away: a new number shows for fake and real calls alike', () => {
    const calls = callsOf('tags', 400);
    for (const tag of ['NEW NO.', 'SAVED']) {
      expect(calls.some((c) => c.tag === tag && c.scam)).toBe(true);
      expect(calls.some((c) => c.tag === tag && !c.scam)).toBe(true);
    }
  });

  it('uses fictional names only and no dosing or diagnosis', () => {
    const all = STORIES.map((s) => s.text + s.lesson).join(' ');
    expect(all).not.toMatch(/\b(GCash|Maya|BDO|BPI|Facebook|Messenger|Viber)\b/);
    expect(all).not.toMatch(/\b\d+\s?(mg|ml)\b|\bdose|\bdosage|diagnos/i);
    expect(all).toMatch(/PisoPay|Banko Liwanag/);
  });

  it('has tile text that fits the 76 px tiles', () => {
    for (const id of CHECKS) {
      expect(CHECK_INFO[id].line1.length).toBeLessThanOrEqual(8);
      expect(CHECK_INFO[id].line2.length).toBeLessThanOrEqual(8);
    }
  });
});

describe('judging a decision', () => {
  const find = (scam: boolean) => callsOf('judge', 60).find((c) => c.scam === scam && c.decisive.length === 3) as Call;
  const scam = find(true);
  const real = find(false);
  const decisive = (c: Call): CheckId => c.decisive[0] as CheckId;
  const useless = (c: Call): CheckId | undefined => CHECKS.find((id) => c.results[id].verdict === 'unclear');

  it('reads the evidence from the first check that settles it', () => {
    expect(evidence(scam, [])).toBe('unclear');
    expect(evidence(scam, [decisive(scam)])).toBe('fail');
    expect(evidence(real, [decisive(real)])).toBe('pass');
  });

  it('hanging up on a fake after a check scores base plus the speed bonus', () => {
    const j = judge(scam, 'hangup', [decisive(scam)], 0);
    expect(j).toMatchObject({ result: 'stopped', correct: true, verified: true, base: BASE_POINTS, bonus: BONUS_MAX, multiplier: 1, total: 160, heartLost: false, streak: 1 });
  });

  it('helping a real call after a check scores the same', () => {
    expect(judge(real, 'help', [decisive(real)], 0)).toMatchObject({ result: 'helped', total: 160, streak: 1 });
  });

  it('each extra check trims the bonus, to nothing', () => {
    const [a, b, c, d] = CHECKS as readonly CheckId[] as [CheckId, CheckId, CheckId, CheckId];
    const first = scam.decisive[0] as CheckId;
    const others = [a, b, c, d].filter((x) => x !== first);
    expect(judge(scam, 'hangup', [first, others[0] as CheckId], 0).bonus).toBe(40);
    expect(judge(scam, 'hangup', [first, others[0] as CheckId, others[1] as CheckId], 0).bonus).toBe(20);
    expect(judge(scam, 'hangup', [first, ...others], 0).bonus).toBe(0);
  });

  it('the streak multiplier grows by a quarter per verified call, up to x2', () => {
    expect([0, 1, 2, 3, 4, 9].map(multiplierFor)).toEqual([1, 1.25, 1.5, 1.75, 2, 2]);
    expect(judge(scam, 'hangup', [decisive(scam)], 2).total).toBe(240);
    expect(judge(scam, 'hangup', [decisive(scam)], 8).total).toBe(320);
  });

  it('helping a fake, or hanging up on a real call, costs a heart and the streak', () => {
    expect(judge(scam, 'help', [decisive(scam)], 3)).toMatchObject({ result: 'paid', correct: false, total: 0, heartLost: true, streak: 0 });
    expect(judge(real, 'hangup', [decisive(real)], 3)).toMatchObject({ result: 'hungUp', correct: false, total: 0, heartLost: true, streak: 0 });
    expect(judge(real, 'hangup', [], 3).heartLost).toBe(true);
  });

  it('a right answer without proof is a lucky guess: little score, streak untouched', () => {
    expect(judge(scam, 'hangup', [], 3)).toMatchObject({ correct: true, verified: false, total: GUESS_POINTS, streak: 3, heartLost: false });
    const dud = useless(scam);
    if (dud) expect(judge(scam, 'hangup', [dud], 3)).toMatchObject({ verified: false, total: GUESS_POINTS });
  });

  it('headlines fit beside the stamp', () => {
    for (const choice of ['help', 'hangup'] as const) {
      for (const c of [scam, real]) {
        for (const used of [[], [decisive(c)]]) {
          for (const line of headlineFor(judge(c, choice, used, 4))) expect(line.length).toBeLessThanOrEqual(HEAD_CHARS);
        }
      }
    }
  });
});

describe('layout', () => {
  it('has 4 check tiles and 2 decision tiles that never overlap or leave the canvas', () => {
    expect(SLOTS).toBe(6);
    const rects = Array.from({ length: SLOTS }, (_, s) => slotRect(s));
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(W);
      expect(r.y + r.h).toBeLessThanOrEqual(H);
    }
    for (let a = 0; a < rects.length; a++) {
      for (let b = a + 1; b < rects.length; b++) {
        const p = rects[a] as (typeof rects)[number];
        const q = rects[b] as (typeof rects)[number];
        expect(p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h).toBe(false);
      }
    }
  });

  it('finds the slot under a point, gaps included, and nothing above the tiles', () => {
    for (let s = 0; s < SLOTS; s++) {
      const c = center(s);
      expect(slotAt(c.x, c.y)).toBe(s);
    }
    const first = slotRect(0);
    const second = slotRect(1);
    expect(slotAt(first.x + first.w + 1, first.y + 5)).toBe(0);
    expect(slotAt(second.x - 1, second.y + 5)).toBe(1);
    expect(slotAt(10, 60)).toBe(-1);
    expect(slotAt(-3, 130)).toBe(-1);
  });

  it('moves the highlight: four checks over two decisions', () => {
    expect(moveSlot(0, 'left')).toBe(0);
    expect(moveSlot(0, 'right')).toBe(1);
    expect(moveSlot(3, 'right')).toBe(3);
    expect(moveSlot(0, 'down')).toBe(HELP_SLOT);
    expect(moveSlot(3, 'down')).toBe(HANGUP_SLOT);
    expect(moveSlot(HELP_SLOT, 'right')).toBe(HANGUP_SLOT);
    expect(moveSlot(HANGUP_SLOT, 'right')).toBe(HANGUP_SLOT);
    expect(moveSlot(HELP_SLOT, 'left')).toBe(HELP_SLOT);
    expect(moveSlot(HELP_SLOT, 'up')).toBe(1);
    expect(moveSlot(HANGUP_SLOT, 'up')).toBe(3);
    expect(moveSlot(1, 'up')).toBe(1);
    expect(moveSlot(HANGUP_SLOT, 'down')).toBe(HANGUP_SLOT);
  });
});

describe('the game', () => {
  const [first] = callsOf('g1', 1) as [Call];
  const run1 = () => make('g1');
  const state = (g: GameInstance) => g.stats().description;
  const finish = (g: GameInstance) => run(g, 6000, press());

  it('starts with 3 hearts, no streak and the first transcript in the description', () => {
    const g = run1();
    const s = g.stats();
    expect(s.score).toBe(0);
    expect(s.over).toBe(false);
    expect(s.hud.find((h) => h.id === 'hearts')?.hearts).toEqual({ n: 3, max: 3 });
    expect(s.description).toContain(`Call 1, `);
    expect(s.description).toContain(`"${first.text}"`);
    expect(s.description).toContain('Checks made: none yet.');
  });

  it('a tap on a check runs it once and the finding is described', () => {
    const g = run1();
    const id = first.decisive[0] as CheckId;
    tapSlot(g, CHECKS.indexOf(id));
    expect(state(g)).toContain(first.results[id].text);
    expect(state(g)).toContain('That settles it.');
    tapSlot(g, CHECKS.indexOf(id));
    expect(state(g).split(first.results[id].text).length).toBe(2);
  });

  it('keyboard: arrows move the highlight and Enter makes the check', () => {
    const g = run1();
    run(g, STEP_MS, press('right'));
    expect(state(g)).toContain(`Highlighted: the check to ${CHECK_INFO.callback.name}`);
    run(g, STEP_MS, press('act'));
    expect(state(g)).toContain(first.results.callback.text);
    run(g, STEP_MS, press('down'));
    expect(state(g)).toContain('Highlighted: the Help them button');
    run(g, STEP_MS, press('right'));
    expect(state(g)).toContain('Highlighted: the Hang up and report button');
  });

  it('the right decision after proof scores, shows the stamp text and moves on to the next call', () => {
    const g = run1();
    tapSlot(g, CHECKS.indexOf(first.decisive[0] as CheckId));
    tapSlot(g, first.scam ? HANGUP_SLOT : HELP_SLOT);
    const s = g.stats();
    expect(s.score).toBe(160);
    expect(s.description).toContain(first.scam ? 'ARAW GAME FAKE stamp' : 'Genuine call stamp');
    expect(s.description).toContain(first.story.lesson);
    expect(s.hud.find((h) => h.id === 'streak')?.value).toBe('1 (x1.25)');
    finish(g);
    expect(state(g)).toContain('Call 2, ');
    expect(state(g)).toContain('Checks made: none yet.');
  });

  it('the wrong decision costs a heart and breaks the streak', () => {
    const g = run1();
    tapSlot(g, CHECKS.indexOf(first.decisive[0] as CheckId));
    tapSlot(g, first.scam ? HELP_SLOT : HANGUP_SLOT);
    const s = g.stats();
    expect(s.score).toBe(0);
    expect(s.hud.find((h) => h.id === 'hearts')?.hearts?.n).toBe(2);
    expect(s.description).toContain(first.scam ? 'helped a scammer' : 'hung up on a real call');
  });

  it('a press right after the reveal starts is ignored, a later one skips it', () => {
    const g = run1();
    tapSlot(g, first.scam ? HANGUP_SLOT : HELP_SLOT);
    run(g, 300, press('act'));
    expect(state(g)).toContain('Call 1, ');
    run(g, 900);
    run(g, STEP_MS, press('act'));
    expect(state(g)).toContain('Call 2, ');
  });

  it('three lost hearts end the run with a recap that teaches verifying', () => {
    const g = run1();
    for (let i = 0; i < 12 && !g.stats().over; i++) {
      const wrong = (callsOf('g1', 12)[i] as Call).scam ? HELP_SLOT : HANGUP_SLOT;
      tapSlot(g, wrong);
      finish(g);
    }
    const s = g.stats();
    expect(s.over).toBe(true);
    expect(s.recap.length).toBeGreaterThan(3);
    expect(s.recap.join(' ')).toMatch(/AI can copy a voice/);
    expect(s.description).toContain('no hearts left');
    run(g, 2000, press('act'));
    expect(g.stats().over).toBe(true);
  });

  it('plays the same calls for the same seed (the Daily Challenge) whatever the player does', () => {
    const a = make('daily');
    const b = make('daily');
    tapSlot(a, HELP_SLOT);
    finish(a);
    tapSlot(a, 0);
    expect(callsOf('daily', 2).every((c) => c.text.length > 0)).toBe(true);
    expect(state(make('daily'))).toBe(state(b));
    expect(state(make('other'))).not.toBe(state(b));
  });

  it('draws every phase without throwing', () => {
    const g = run1();
    const ctx = fakeContext();
    g.draw(ctx);
    run(g, 400);
    g.draw(ctx);
    run(g, 3000);
    tapSlot(g, 0);
    tapSlot(g, 1);
    g.draw(ctx);
    tapSlot(g, HANGUP_SLOT);
    g.draw(ctx);
    run(g, 700);
    g.draw(ctx);
    for (let i = 0; i < 20; i++) {
      tapSlot(g, i % 2 === 0 ? HELP_SLOT : HANGUP_SLOT);
      run(g, 1300, press('act'));
      g.draw(ctx);
    }
  });
});

describe('recap and definition', () => {
  it('counts the run and explains voice clones, fake emergencies and how to verify', () => {
    const lines = buildRecap({ calls: 6, stopped: 3, helped: 1, paid: 1, hungUp: 1, guesses: 2, bestStreak: 3 });
    expect(lines[0]).toBe('You took 6 calls: 3 scams stopped, 1 real call helped, 1 scam you helped and 1 real call you hung up on. Best streak: 3.');
    expect(lines[1]).toMatch(/2 times without proof/);
    expect(lines.join(' ')).toMatch(/number or a person you already know/);
    expect(buildRecap({ calls: 1, stopped: 1, helped: 0, paid: 0, hungUp: 0, guesses: 0, bestStreak: 1 })[1]).toMatch(/Every decision had proof/);
  });

  it('is a complete game definition with a five-page briefing that ends on Kailan ako magtitiwala', () => {
    expect(sino.slug).toBe('sino-to');
    expect(sino.briefing).toHaveLength(5);
    expect(sino.briefing[0]?.title).toBe("Ring ring! Sino 'to?");
    expect(sino.briefing[4]?.title).toBe('Kailan ako magtitiwala?');
    expect(sino.takeaway).toMatch(/^Kailan ako magtitiwala\?/);
    expect(sino.howTo.length).toBeGreaterThanOrEqual(4);
    expect(sino.goodRun).toBeGreaterThan(0);
  });
});
