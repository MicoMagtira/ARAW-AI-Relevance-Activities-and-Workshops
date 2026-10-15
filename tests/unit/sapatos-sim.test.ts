// Sa Sapatos Nila rules (T24): barriers and fixes, a try at the kiosk, fix points, the counter's queue, stars and points, who
// visits (seeded), software updates, and the end of a run. Balance is checked with bots.
import { describe, expect, it } from 'vitest';
import { BARRIERS, CORE_IDS, FIXES, HARD_IDS, LANGS, MORE_IDS, PERSONAS, STEP_COUNT, fixById, personaById, type FixId, type Persona } from '../../src/games/sa-sapatos-nila/data';
import {
  FP_CAP,
  FP_PER_VISIT,
  GOOD_RUN,
  LEAVE_LIMIT,
  MAX_FAILS,
  MODULE_VISITS,
  QUEUE_MAX,
  READY_BONUS,
  SHARED_BONUS,
  STAR_POINTS,
  barriersHelpedBy,
  beginVisit,
  blockersAt,
  cheapestFixes,
  counterFree,
  install,
  isOver,
  leave,
  moduleDone,
  moduleStars,
  newGame,
  scramble,
  serveAtKiosk,
  starsFor,
  takeCounter,
  tryStep,
  unmetBarriers,
  updateBreaks,
  visitorFor,
  type Game,
  type Mode,
} from '../../src/games/sa-sapatos-nila/sim';

const lola = personaById('lola-nena');
const jun = personaById('jun');
const ben = personaById('mang-ben');
const rey = personaById('kuya-rey');
const pacita = personaById('aling-pacita');

/** A game with the given visitor already at the kiosk. */
const arrive = (installed: readonly FixId[] = [], fp = 5, mode: Mode = 'arcade'): Game => ({ ...beginVisit(newGame('t', mode)), installed, fp });

/** Press through every screen; returns the game after serving, or the first game where the person got stuck. */
function walk(g: Game, p: Persona): { game: Game; stuck: boolean } {
  for (let i = 0; i < STEP_COUNT; i++) {
    const r = tryStep(g, p);
    g = r.game;
    if (!r.ok) return { game: g, stuck: true };
    if (r.done) return { game: serveAtKiosk(g, p), stuck: false };
  }
  return { game: g, stuck: false };
}

describe('the data', () => {
  it('has unique people, and every barrier and fix they name exists', () => {
    expect(new Set(PERSONAS.map((p) => p.id)).size).toBe(PERSONAS.length);
    for (const p of PERSONAS) {
      expect(p.barriers.length, p.id).toBeGreaterThan(0);
      for (const b of p.barriers) expect(BARRIERS[b], `${p.id} ${b}`).toBeTruthy();
    }
    for (const b of Object.values(BARRIERS)) for (const f of b.fixes) expect(FIXES.some((x) => x.id === f), `${b.id} ${f}`).toBe(true);
    for (const id of [...CORE_IDS, ...MORE_IDS, ...HARD_IDS]) expect(personaById(id).id).toBe(id);
  });

  it('gives every language its own barrier and fix, and every fix a cost and a plain description', () => {
    for (const l of LANGS) {
      expect(BARRIERS[`lang-${l}`].fixes).toEqual([`lang-${l}`]);
      expect(fixById(`lang-${l}`).cost).toBe(1);
    }
    for (const f of FIXES) {
      expect(f.cost, f.id).toBeGreaterThanOrEqual(1);
      expect(f.cost, f.id).toBeLessThanOrEqual(FP_CAP);
      expect(f.what.length, f.id).toBeGreaterThan(15);
    }
  });

  it('serves every person at the kiosk with the right fixes, except no-smartphone people, who need the counter', () => {
    for (const p of PERSONAS) {
      const all = FIXES.map((f) => f.id);
      const needsCounter = p.barriers.includes('phone');
      expect(unmetBarriers(p, all.filter((f) => f !== 'counter')).length === 0, p.id).toBe(!needsCounter);
    }
  });

  it('covers the five groups SPEC names, and no content gives dosing or diagnosis', () => {
    const labels = Object.values(BARRIERS).map((b) => b.filter);
    for (const want of ['Blurry view', 'No sound, no captions', 'Unfamiliar language', 'Out of reach', 'No smartphone']) expect(labels).toContain(want);
    for (const p of PERSONAS) expect(`${p.who} ${p.task} ${p.thanks} ${p.left}`, p.id).not.toMatch(/\b\d+ ?mg\b|diagnos|prescri/i);
  });
});

describe('scramble (the unfamiliar-language filter)', () => {
  it('keeps length, case, spaces and punctuation and changes the letters', () => {
    const text = 'Welcome to the health center, 12 please!';
    const out = scramble(text);
    expect(out).toHaveLength(text.length);
    expect(out).not.toBe(text);
    expect(out.replace(/[A-Za-z]/g, 'x')).toBe(text.replace(/[A-Za-z]/g, 'x'));
    for (let i = 0; i < text.length; i++) {
      if (/[A-Za-z]/.test(text[i] as string)) {
        expect(out[i]).not.toBe(text[i]);
        expect(out[i] === out[i]?.toUpperCase()).toBe(text[i] === text[i]?.toUpperCase());
      }
    }
    expect(scramble(text)).toBe(out);
  });
});

describe('barriers and fixes', () => {
  it('removes a barrier only with a fix that fits it', () => {
    expect(unmetBarriers(lola, [])).toEqual(['blur']);
    expect(unmetBarriers(lola, ['large-text'])).toEqual([]);
    expect(unmetBarriers(lola, ['voice'])).toEqual([]);
    expect(unmetBarriers(lola, ['captions', 'lower'])).toEqual(['blur']);
    expect(unmetBarriers(jun, ['captions'])).toEqual([]);
    expect(unmetBarriers(rey, ['lower'])).toEqual([]);
  });

  it('does not let the voice guide fix a language barrier (it only speaks Filipino and English)', () => {
    expect(unmetBarriers(ben, ['voice', 'large-text', 'captions'])).toEqual(['lang-ilocano']);
    expect(unmetBarriers(ben, ['lang-ilocano'])).toEqual([]);
    expect(unmetBarriers(ben, ['lang-cebuano'])).toEqual(['lang-ilocano']);
  });

  it('never lets the kiosk alone serve a person with no smartphone, even with the counter installed', () => {
    expect(unmetBarriers(pacita, FIXES.map((f) => f.id))).toEqual(['phone']);
  });

  it('knows which screen each barrier bites on', () => {
    expect(blockersAt(rey, [], 0)).toEqual(['reach']);
    expect(blockersAt(rey, [], 1)).toEqual([]);
    expect(blockersAt(lola, [], 1)).toEqual(['blur']);
    expect(blockersAt(jun, [], 2)).toEqual(['sound']);
    expect(blockersAt(pacita, [], 0)).toEqual(['phone']);
    expect(blockersAt(personaById('ate-grace'), ['lower'], 0)).toEqual([]);
  });

  it('suggests the cheapest fix for each barrier, and says what a fix helps', () => {
    expect(cheapestFixes(lola, [])).toEqual(['large-text']);
    expect(cheapestFixes(personaById('ate-mel'), [])).toEqual(['voice']);
    expect(cheapestFixes(personaById('lolo-ernie'), [])).toEqual(['large-text', 'lang-cebuano']);
    expect(barriersHelpedBy('voice').sort()).toEqual(['blind', 'blur', 'reading']);
    expect(barriersHelpedBy('captions')).toEqual(['sound']);
  });

  it('spends fix points on a fix, once, and only when there are enough', () => {
    const g = arrive([], 3);
    const a = install(g, 'voice');
    expect(a.installed).toEqual(['voice']);
    expect(a.fp).toBe(1);
    expect(install(a, 'voice')).toBe(a);
    expect(install(a, 'lower')).toBe(a);
    expect(install(a, 'captions').fp).toBe(0);
  });
});

describe('a try at the kiosk', () => {
  it('moves through all the screens when nothing blocks', () => {
    const { game, stuck } = walk(arrive(['large-text']), lola);
    expect(stuck).toBe(false);
    expect(game.step).toBe(STEP_COUNT);
    expect(game.fails).toBe(0);
    expect(game.last?.kind).toBe('served');
  });

  it('makes the person stumble on the screen the barrier bites, without moving on', () => {
    const g = arrive();
    const a = tryStep(g, lola); // screen 1 is fine for Lola
    expect(a.ok).toBe(true);
    const b = tryStep(a.game, lola);
    expect(b.ok).toBe(false);
    expect(b.blockers).toEqual(['blur']);
    expect(b.game.step).toBe(1);
    expect(b.game.fails).toBe(1);
    expect(b.gaveUp).toBe(false);
    const c = tryStep(install(b.game, 'large-text'), lola);
    expect(c.ok).toBe(true);
  });

  it('makes the person give up on the third stumble', () => {
    let g = arrive();
    for (let i = 1; i < MAX_FAILS; i++) {
      const r = tryStep(g, pacita);
      expect(r.gaveUp).toBe(false);
      g = r.game;
    }
    expect(tryStep(g, pacita).gaveUp).toBe(true);
  });
});

describe('stars and points', () => {
  it('gives 3 stars and the ready bonus to a person served with no stumble', () => {
    const { game } = walk(arrive(['captions']), jun);
    expect(game.last).toMatchObject({ kind: 'served', via: 'kiosk', stars: 3, ready: true, shared: [] });
    expect(game.score).toBe((STAR_POINTS[3] ?? 0) + READY_BONUS);
    expect(game.served).toBe(1);
    expect(game.stars).toBe(3);
  });

  it('gives no ready bonus after a stumble, but still 3 stars after one', () => {
    let { game } = walk(arrive([]), jun);
    game = install(game, 'captions');
    const done = walk(game, jun).game;
    expect(done.last).toMatchObject({ stars: 3, ready: false });
    expect(done.score).toBe(STAR_POINTS[3]);
  });

  it('takes a star off after two stumbles', () => {
    expect(starsFor('kiosk', jun, 0)).toBe(3);
    expect(starsFor('kiosk', jun, 1)).toBe(3);
    expect(starsFor('kiosk', jun, 2)).toBe(2);
    expect(starsFor('counter', jun, 0)).toBe(2);
    expect(starsFor('counter', jun, 2)).toBe(1);
    expect(starsFor('counter', pacita, 0)).toBe(3);
  });

  it('pays a bonus for each earlier fix that helps another person too', () => {
    let g = arrive(['voice']);
    g = walk(g, lola).game; // voice helps Lola
    expect(g.helped.voice).toBe(1);
    expect(g.last?.shared).toEqual([]);
    g = { ...beginVisit(g) };
    const second = walk(g, personaById('ate-mel')).game; // voice helps Ate Mel too
    expect(second.last?.shared).toEqual(['voice']);
    expect(second.helped.voice).toBe(2);
    expect(second.score - g.score).toBe((STAR_POINTS[3] ?? 0) + READY_BONUS + SHARED_BONUS);
  });
});

describe('the assisted counter', () => {
  it('needs to be installed, and serves anyone at 2 stars (3 for a person with no smartphone)', () => {
    expect(takeCounter(arrive([]), lola).ok).toBe(false);
    const a = takeCounter(arrive(['counter']), lola);
    expect(a.ok).toBe(true);
    expect(a.game.last).toMatchObject({ via: 'counter', stars: 2, ready: false, points: STAR_POINTS[2] });
    expect(takeCounter(arrive(['counter']), pacita).game.last?.stars).toBe(3);
  });

  it('fills a queue that only kiosk-served visitors empty', () => {
    let g = arrive(['counter', 'large-text', 'captions']);
    for (let i = 0; i < QUEUE_MAX; i++) {
      expect(counterFree(g)).toBe(true);
      g = takeCounter(g, pacita).game;
    }
    expect(g.queue).toBe(QUEUE_MAX);
    expect(counterFree(g)).toBe(false);
    const busy = takeCounter(g, pacita);
    expect(busy).toMatchObject({ ok: false, busy: true });
    expect(busy.game.fails).toBe(1);
    expect(busy.game.served).toBe(g.served);
    const served = walk(beginVisit(g), lola).game;
    expect(served.queue).toBe(QUEUE_MAX - 1);
    expect(counterFree(served)).toBe(true);
  });

  it('gives up after too many busy tries', () => {
    let g: Game = { ...arrive(['counter']), queue: QUEUE_MAX };
    for (let i = 1; i < MAX_FAILS; i++) g = takeCounter(g, pacita).game;
    expect(takeCounter(g, pacita).gaveUp).toBe(true);
  });
});

describe('fix points, leaving and the end of a run', () => {
  it('brings 2 fix points per visitor up to a cap of 5, and keeps unspent ones', () => {
    let g = newGame('t', 'arcade');
    g = beginVisit(g);
    expect(g.fp).toBe(FP_PER_VISIT);
    g = beginVisit(g);
    expect(g.fp).toBe(2 * FP_PER_VISIT);
    for (let i = 0; i < 6; i++) g = beginVisit(g);
    expect(g.fp).toBe(FP_CAP);
  });

  it('counts people who leave, and the run is over at three', () => {
    let g = arrive();
    for (let i = 1; i <= LEAVE_LIMIT; i++) {
      expect(isOver(g)).toBe(false);
      g = leave(g, 'let-go');
      expect(g.left).toBe(i);
      expect(g.last).toMatchObject({ kind: 'left', stars: 0, points: 0, why: 'let-go' });
    }
    expect(isOver(g)).toBe(true);
  });

  it('ends the module game after five visitors, or three people leaving', () => {
    const g = { ...arrive([], 5, 'module'), visit: MODULE_VISITS };
    expect(moduleDone(g)).toBe(false); // the fifth visitor is still at the kiosk
    expect(moduleDone({ ...g, last: { kind: 'left', via: 'none', stars: 0, points: 0, ready: false, shared: [] } })).toBe(true);
    expect(moduleDone({ ...arrive([], 5, 'module'), left: 3 })).toBe(true);
    expect(moduleStars(5, 5)).toBe(3);
    expect(moduleStars(3, 5)).toBe(2);
    expect(moduleStars(1, 5)).toBe(1);
    expect(moduleStars(0, 3)).toBe(1);
  });
});

describe('who visits', () => {
  it('is the same for the same seed and different for another', () => {
    const seq = (seed: string) => Array.from({ length: 14 }, (_, i) => visitorFor(seed, i + 1, 'arcade').id).join(',');
    expect(seq('a')).toBe(seq('a'));
    expect(seq('a')).not.toBe(seq('b'));
  });

  it('starts with Lola Nena and never repeats a person back to back', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const ids = Array.from({ length: 40 }, (_, i) => visitorFor(seed, i + 1, 'arcade').id);
      expect(ids[0]).toBe('lola-nena');
      ids.slice(1).forEach((id, i) => expect(id).not.toBe(ids[i]));
    }
  });

  it('brings new needs as the run goes on: two barriers at once only from the eighth visitor', () => {
    const seen = new Set<string>();
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      for (let n = 1; n <= 40; n++) {
        const p = visitorFor(seed, n, 'arcade');
        seen.add(p.id);
        if (n <= 3) expect(CORE_IDS, `${seed} ${n}`).toContain(p.id);
        if (n <= 7) expect(HARD_IDS, `${seed} ${n}`).not.toContain(p.id);
      }
    }
    for (const id of [...CORE_IDS, ...MORE_IDS, ...HARD_IDS]) expect(seen.has(id), id).toBe(true);
  });

  it('brings the five core visitors in the module game, Lola first, in a seeded order', () => {
    for (const seed of ['a', 'b']) {
      const ids = Array.from({ length: MODULE_VISITS }, (_, i) => visitorFor(seed, i + 1, 'module').id);
      expect(ids[0]).toBe('lola-nena');
      expect([...ids].sort()).toEqual([...CORE_IDS].sort());
    }
    expect(Array.from({ length: 5 }, (_, i) => visitorFor('a', i + 1, 'module').id)).not.toEqual(Array.from({ length: 5 }, (_, i) => visitorFor('z', i + 1, 'module').id));
  });
});

describe('software updates (Arcade only)', () => {
  const full: FixId[] = ['large-text', 'captions', 'counter'];
  it('switch one installed fix off from visit 7, every 4 visits, never the counter', () => {
    expect(updateBreaks('s', 6, full, 'arcade')).toBeNull();
    const first = updateBreaks('s', 7, full, 'arcade');
    expect(first && ['large-text', 'captions']).toContain(first);
    expect(updateBreaks('s', 8, full, 'arcade')).toBeNull();
    expect(updateBreaks('s', 11, full, 'arcade')).not.toBeNull();
    expect(updateBreaks('s', 7, ['counter'], 'arcade')).toBeNull();
    expect(updateBreaks('s', 7, [], 'arcade')).toBeNull();
  });

  it('never happen in the module game, and show up when the visitor arrives', () => {
    expect(updateBreaks('s', 7, full, 'module')).toBeNull();
    const g: Game = { ...newGame('s', 'arcade'), visit: 6, installed: full };
    const next = beginVisit(g);
    expect(next.broke).not.toBeNull();
    expect(next.installed).not.toContain(next.broke);
    expect(next.installed).toContain('counter');
  });
});

/** A bot that installs the cheapest fix a stuck visitor needs, or goes to the counter, or lets them go. */
function botVisit(g: Game, p: Persona): Game {
  g = beginVisit(g);
  for (let guard = 0; guard < 20; guard++) {
    const r = tryStep(g, p);
    g = r.game;
    if (r.ok) {
      if (r.done) return serveAtKiosk(g, p);
      continue;
    }
    if (r.gaveUp) return leave(g, 'fails');
    const picks = cheapestFixes(p, g.installed);
    const cost = picks.reduce((a, f) => a + fixById(f).cost, 0);
    if (picks.length > 0 && cost <= g.fp) for (const f of picks) g = install(g, f);
    else {
      if (!g.installed.includes('counter') && g.fp >= 2) g = install(g, 'counter');
      if (g.installed.includes('counter')) {
        const c = takeCounter(g, p);
        g = c.game;
        if (c.ok) return g;
        if (c.gaveUp) return leave(g, 'queue');
      } else return leave(g, 'let-go');
    }
  }
  return leave(g, 'fails');
}

describe('balance', () => {
  it('lets a careful player serve nearly everyone for 40 visitors and score a good run', () => {
    for (const seed of ['a', 'b', 'c']) {
      let g = newGame(seed, 'arcade');
      for (let n = 1; n <= 40 && !isOver(g); n++) g = botVisit(g, visitorFor(seed, n, 'arcade'));
      expect(isOver(g), seed).toBe(false);
      expect(g.served, seed).toBeGreaterThanOrEqual(30);
      expect(g.score, seed).toBeGreaterThan(GOOD_RUN);
    }
  });

  it('serves all five module visitors for a careful player, three stars', () => {
    let g = newGame('m', 'module');
    for (let n = 1; n <= MODULE_VISITS; n++) g = botVisit(g, visitorFor('m', n, 'module'));
    expect(g.served).toBe(MODULE_VISITS);
    expect(moduleStars(g.served, MODULE_VISITS)).toBe(3);
  });

  it('ends a run in three visitors for a player who never fixes anything', () => {
    let g = newGame('x', 'arcade');
    let n = 0;
    while (!isOver(g)) {
      n++;
      g = leave(beginVisit(g), 'let-go');
    }
    expect(n).toBe(LEAVE_LIMIT);
  });

  it('is not trivial: installing nothing and leaning on the counter backs the line up', () => {
    let g = newGame('c', 'arcade');
    g = install(beginVisit(g), 'counter');
    let busy = false;
    for (let i = 0; i < 6 && !busy; i++) {
      const r = takeCounter(g, lola);
      busy = r.busy;
      g = r.game;
    }
    expect(busy).toBe(true);
  });
});
