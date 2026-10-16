// ARAW's 8-bit synth (lazy chunk). Every sound is generated live with the Web Audio API from four console-style voices:
// two pulse waves (12.5/25/50% duty), a triangle and a 15-bit LFSR noise channel. Nothing is recorded, so the whole sound
// set costs a few KB. Recipes were tuned and level-balanced on the review sound board (planning/sound/soundboard.html).

type Wave = 'p12' | 'p25' | 'p50' | 'tri' | 'sine';
type Env = 'decay' | 'flat' | 'pluck' | 'swell' | 'lead';
export type Mood = 'happy' | 'wink' | 'think' | 'wow' | 'sad';

interface Common {
  /** Start offset from now, in seconds. */
  t?: number;
  /** Absolute start time on the audio clock (music scheduler). */
  at?: number;
  d?: number;
  v?: number;
  a?: number;
  env?: Env;
  bus?: GainNode;
}
interface ToneOpts extends Common {
  wave?: Wave;
  f: number;
  f2?: number;
  step?: boolean;
  arp?: readonly number[];
  arpRate?: number;
  vib?: readonly [rate: number, depth: number];
  vibDelay?: number;
}
interface NoiseOpts extends Common {
  mode?: 'long' | 'short';
  rate?: number;
  rate2?: number;
  filter?: readonly [BiquadFilterType, number, number | null, number?];
}
interface MelOpts extends Omit<ToneOpts, 'f' | 'wave'> {
  u?: number;
  legato?: number;
  tr?: number;
}

const FR = 1 / 60; // envelopes move in 60 Hz frames, like the old consoles

interface Graph {
  ctx: AudioContext;
  sfx: GainNode;
  music: GainNode;
  waves: Record<'p12' | 'p25' | 'p50', PeriodicWave>;
  noise: { long: AudioBuffer; short: AudioBuffer };
}
let g: Graph | null = null;
const live = new Set<{ node: AudioScheduledSourceNode; bus: GainNode }>();

function pulseWave(c: AudioContext, duty: number): PeriodicWave {
  const n = 64;
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI);
    im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI);
  }
  return c.createPeriodicWave(re, im);
}

function lfsrBuffer(c: AudioContext, short: boolean, len: number): AudioBuffer {
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let r = 1;
  for (let i = 0; i < len; i++) {
    const b = (r ^ (r >> (short ? 6 : 1))) & 1;
    r = (r >> 1) | (b << 14);
    d[i] = r & 1 ? 0.7 : -0.7;
  }
  return buf;
}

type AudioCtor = new () => AudioContext;
function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Build the audio graph on first use. Returns null where Web Audio is missing (tests, very old browsers). */
function graph(): Graph | null {
  if (g) return g;
  const AC = audioCtor();
  if (!AC) return null;
  try {
    const ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.12;
    const soften = ctx.createBiquadFilter(); // takes the sting off square waves
    soften.type = 'lowpass';
    soften.frequency.value = 8500;
    const master = ctx.createGain();
    master.gain.value = 0.8;
    const sfx = ctx.createGain();
    const music = ctx.createGain();
    sfx.gain.value = 0;
    music.gain.value = 0;
    sfx.connect(master);
    music.connect(master);
    master.connect(soften);
    soften.connect(comp);
    comp.connect(ctx.destination);
    g = {
      ctx,
      sfx,
      music,
      waves: { p12: pulseWave(ctx, 0.125), p25: pulseWave(ctx, 0.25), p50: pulseWave(ctx, 0.5) },
      noise: { long: lfsrBuffer(ctx, false, 32767), short: lfsrBuffer(ctx, true, 93 * 31 * 4) },
    };
    return g;
  } catch {
    return null;
  }
}

/** A new context is running immediately only when the browser permits autoplay. */
export function tryAutoplay(): boolean {
  return graph()?.ctx.state === 'running';
}

export function resume(): void {
  const gr = graph();
  if (gr && gr.ctx.state === 'suspended') void gr.ctx.resume().catch(() => undefined);
}

export function suspend(): void {
  if (g && g.ctx.state === 'running') void g.ctx.suspend().catch(() => undefined);
}

export function setGains(sfx: number, music: number): void {
  const gr = graph();
  if (!gr) return;
  const t = gr.ctx.currentTime;
  gr.sfx.gain.setTargetAtTime(sfx, t, 0.02);
  gr.music.gain.setTargetAtTime(music, t, 0.02);
}

function track(node: AudioScheduledSourceNode, bus: GainNode): void {
  const e = { node, bus };
  live.add(e);
  node.onended = () => live.delete(e);
}

function envelope(gain: GainNode, t0: number, d: number, v: number, a: number, shape: Env): void {
  const n = Math.max(2, Math.ceil(d / FR));
  gain.gain.setValueAtTime(0, t0);
  for (let k = 1; k <= n; k++) {
    const tt = Math.min(d, k * FR);
    let lvl: number;
    if (a && tt <= a) lvl = tt / a;
    else {
      const p = (tt - a) / Math.max(0.001, d - a);
      lvl =
        shape === 'flat' ? 1
        : shape === 'pluck' ? (1 - p) ** 2
        : shape === 'swell' ? Math.sin(Math.PI * p)
        : shape === 'lead' ? (p < 0.12 ? 1 - 2.5 * p : p < 0.85 ? 0.7 : (0.7 * (1 - p)) / 0.15)
        : 1 - 0.8 * p;
    }
    lvl = Math.round(Math.max(0, Math.min(1, lvl)) * 15) / 15; // 16 volume steps, 4-bit like the NES
    gain.gain.linearRampToValueAtTime(lvl * v, t0 + tt);
  }
  gain.gain.linearRampToValueAtTime(0, t0 + d + 0.012);
}

const startTime = (gr: Graph, o: Common): number => o.at ?? gr.ctx.currentTime + 0.012 + (o.t ?? 0);

function tone(o: ToneOpts): void {
  const gr = graph();
  if (!gr) return;
  const { ctx } = gr;
  const t0 = startTime(gr, o);
  const d = o.d ?? 0.1;
  const f = o.f;
  const f2 = o.f2 ?? f;
  const bus = o.bus ?? gr.sfx;
  const osc = ctx.createOscillator();
  const wave = o.wave ?? 'p50';
  if (wave === 'tri') osc.type = 'triangle';
  else if (wave === 'sine') osc.type = 'sine';
  else osc.setPeriodicWave(gr.waves[wave]);
  const fq = osc.frequency;
  if (o.arp && o.arp.length) {
    const r = o.arpRate ?? 1 / 30;
    let i = 0;
    for (let tt = 0; tt < d; tt += r, i++) fq.setValueAtTime(f * 2 ** ((o.arp[i % o.arp.length] ?? 0) / 12), t0 + tt);
  } else if (f2 !== f) {
    if (o.step) {
      const n = Math.max(1, Math.round(d / FR));
      for (let k = 0; k <= n; k++) fq.setValueAtTime(f * (f2 / f) ** (k / n), t0 + (k * d) / n);
    } else {
      fq.setValueAtTime(f, t0);
      fq.exponentialRampToValueAtTime(f2, t0 + d);
    }
  } else fq.setValueAtTime(f, t0);
  if (o.vib) {
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    lfo.frequency.value = o.vib[0];
    lg.gain.setValueAtTime(0, t0);
    lg.gain.setValueAtTime(f * o.vib[1], t0 + (o.vibDelay ?? 0));
    lfo.connect(lg);
    lg.connect(fq);
    lfo.start(t0);
    lfo.stop(t0 + d + 0.05);
    track(lfo, bus);
  }
  const gain = ctx.createGain();
  envelope(gain, t0, d, o.v ?? 0.15, o.a ?? 0, o.env ?? 'decay');
  osc.connect(gain);
  gain.connect(bus);
  osc.start(t0);
  osc.stop(t0 + d + 0.03);
  track(osc, bus);
}

function noise(o: NoiseOpts): void {
  const gr = graph();
  if (!gr) return;
  const { ctx } = gr;
  const t0 = startTime(gr, o);
  const d = o.d ?? 0.1;
  const bus = o.bus ?? gr.sfx;
  const src = ctx.createBufferSource();
  src.buffer = o.mode === 'short' ? gr.noise.short : gr.noise.long;
  src.loop = true;
  const r = o.rate ?? 1;
  const r2 = o.rate2 ?? r;
  src.playbackRate.setValueAtTime(r, t0);
  if (r2 !== r) src.playbackRate.exponentialRampToValueAtTime(r2, t0 + d);
  let last: AudioNode = src;
  if (o.filter) {
    const [type, fa, fb, q] = o.filter;
    const bq = ctx.createBiquadFilter();
    bq.type = type;
    bq.frequency.setValueAtTime(fa, t0);
    if (fb) bq.frequency.exponentialRampToValueAtTime(fb, t0 + d);
    bq.Q.value = q ?? 0.8;
    src.connect(bq);
    last = bq;
  }
  const gain = ctx.createGain();
  envelope(gain, t0, d, o.v ?? 0.15, o.a ?? 0, o.env ?? 'decay');
  last.connect(gain);
  gain.connect(bus);
  src.start(t0, o.mode === 'short' ? 0 : Math.random() * 0.5);
  src.stop(t0 + d + 0.03);
  track(src, bus);
}

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** Note name (C4, F#5, Bb3) to frequency in Hz. */
export function N(s: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error(`Bad note ${s}`);
  const midi = 12 * (Number(m[3]) + 1) + (SEMI[m[1] as string] ?? 0) + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
const up = (f: number, semis: number): number => f * 2 ** (semis / 12);

/** mel('p25', 'C5 E5 . G5*2 C5+E5+G5*4', { u: .08 }): one token per unit, '.' rest, '*n' longer, '+' chord. */
function mel(wave: Wave, str: string, o: MelOpts = {}): number {
  const u = o.u ?? 0.08;
  let t = o.t ?? 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [body = '.', mul] = tok.split('*');
    const len = u * (mul ? Number(mul) : 1);
    if (body !== '.') for (const nn of body.split('+')) tone({ ...o, wave, f: up(N(nn), o.tr ?? 0), t, d: len * (o.legato ?? 0.92) });
    t += len;
  }
  return t;
}

function kick(o: Common = {}): void {
  const v = o.v ?? 0.5;
  tone({ ...o, wave: 'tri', f: 165, f2: 45, d: 0.11, v, env: 'pluck' });
  noise({ ...o, rate: 0.25, d: 0.025, v: v * 0.25, env: 'decay' });
}
function snare(o: Common = {}): void {
  const v = o.v ?? 0.15;
  noise({ ...o, rate: 0.55, d: 0.11, v, env: 'decay', filter: ['highpass', 1200, null] });
  tone({ ...o, wave: 'tri', f: 230, f2: 170, d: 0.05, v: v * 1.4, env: 'pluck' });
}
function hat(o: Common = {}): void {
  noise({ ...o, rate: 1, d: 0.025, v: o.v ?? 0.06, env: 'decay', filter: ['highpass', 7000, null] });
}
function crash(o: Common = {}): void {
  noise({ ...o, rate: 0.8, d: 0.6, v: o.v ?? 0.09, env: 'decay', filter: ['highpass', 3000, null] });
}
/** Kulintang-style gong: soft strike, slight pitch sag, one inharmonic overtone. */
function gong(f: number, o: Common = {}): void {
  const v = o.v ?? 0.5;
  tone({ ...o, wave: 'tri', f, f2: f * 0.992, d: o.d ?? 0.5, v: 0.7 * v, env: 'pluck' });
  tone({ ...o, wave: 'sine', f: f * 2.76, d: 0.12, v: 0.16 * v, env: 'pluck' });
  tone({ ...o, wave: 'p12', f, d: 0.04, v: 0.1 * v, env: 'pluck' });
}
function thump(k = 1): void {
  noise({ rate: 0.22, d: 0.07, v: 0.35 * k, filter: ['lowpass', 2500, null] });
  tone({ wave: 'tri', f: 170, f2: 48, d: 0.13, v: 0.55 * k, env: 'pluck' });
}

/* ------------------------------------------------------------------ sound effects */
export const SFX = {
  // interface
  tap() { tone({ wave: 'p25', f: N('E6'), d: 0.05, v: 0.2, env: 'pluck' }); },
  select() { tone({ wave: 'p12', f: N('C6'), d: 0.04, v: 0.2, env: 'pluck' }); tone({ wave: 'p12', f: N('G6'), t: 0.045, d: 0.06, v: 0.2, env: 'pluck' }); },
  back() { tone({ wave: 'p25', f: N('G5'), d: 0.04, v: 0.18, env: 'pluck' }); tone({ wave: 'p25', f: N('C5'), t: 0.045, d: 0.07, v: 0.18, env: 'pluck' }); },
  toggleOn() { mel('p25', 'C6 G6', { u: 0.05, v: 0.18, env: 'pluck' }); },
  toggleOff() { mel('p25', 'G5 C5', { u: 0.05, v: 0.18, env: 'pluck' }); },
  tab() { tone({ wave: 'tri', f: N('G5'), f2: N('C6'), step: true, d: 0.08, v: 0.16, env: 'pluck' }); },
  page() { noise({ rate: 0.9, rate2: 0.35, d: 0.13, v: 0.13, env: 'swell', filter: ['bandpass', 3200, 1200, 0.8] }); },
  open() { tone({ wave: 'p12', f: N('C5'), arp: [0, 4, 7, 12], arpRate: 1 / 45, d: 0.11, v: 0.11 }); },
  close() { tone({ wave: 'p12', f: N('C5'), arp: [12, 7, 4, 0], arpRate: 1 / 45, d: 0.11, v: 0.11 }); },
  locked() { mel('tri', 'E4 . C4', { u: 0.06, v: 0.22, env: 'pluck' }); },

  // feedback
  correct(level = 0) {
    const tr = [0, 2, 4, 5, 7, 9][Math.max(0, Math.min(level, 5))] ?? 0;
    tone({ wave: 'p25', f: up(N('C6'), tr), d: 0.07, v: 0.17, env: 'flat' });
    tone({ wave: 'p25', f: up(N('G6'), tr), t: 0.075, d: 0.28, v: 0.17, vib: [7, 0.006], vibDelay: 0.08 });
    tone({ wave: 'p12', f: up(N('G6'), tr), t: 0.2, d: 0.2, v: 0.045 });
    if (level > 0) tone({ wave: 'tri', f: up(N('C7'), tr), arp: [0, 4, 7, 12], arpRate: 1 / 50, t: 0.1, d: 0.16 + level * 0.03, v: 0.15 });
  },
  wrong() {
    tone({ wave: 'tri', f: N('E5'), d: 0.1, v: 0.13, env: 'flat' });
    tone({ wave: 'tri', f: N('C5'), f2: N('A4'), t: 0.11, d: 0.28, v: 0.13 });
    tone({ wave: 'p12', f: N('C5'), f2: N('A4'), t: 0.11, d: 0.22, v: 0.04 });
  },
  stampFact() { thump(); mel('p25', 'C6+E6+G6*9', { t: 0.07, u: 0.06, v: 0.065, env: 'lead', vib: [6, 0.006], vibDelay: 0.15 }); mel('tri', 'C4*9', { t: 0.07, u: 0.06, v: 0.16 }); tone({ wave: 'tri', f: N('C7'), arp: [0, 4, 7, 12, 16], arpRate: 1 / 45, t: 0.12, d: 0.3, v: 0.16 }); tone({ wave: 'tri', f: N('G6'), t: 0.5, d: 0.4, v: 0.14 }); tone({ wave: 'p12', f: N('G6'), t: 0.66, d: 0.3, v: 0.03 }); },
  stampFake() {
    thump();
    tone({ wave: 'p50', f: N('Bb4'), f2: N('A4'), t: 0.08, d: 0.13, v: 0.1, env: 'flat' });
    tone({ wave: 'p50', f: N('A4'), f2: N('Ab4'), t: 0.23, d: 0.13, v: 0.1, env: 'flat' });
    tone({ wave: 'p50', f: N('Ab4'), f2: N('G4'), t: 0.38, d: 0.38, v: 0.1, vib: [6, 0.014], vibDelay: 0.06 });
  },
  radar() {
    tone({ wave: 'p12', f: 400, f2: 1600, d: 0.22, v: 0.035, env: 'swell' });
    [0, 0.26, 0.52].forEach((t, i) => tone({ wave: 'tri', f: N('E6'), t: 0.18 + t, d: 0.28, v: [0.34, 0.14, 0.06][i] ?? 0.06 }));
  },
  xp() { mel('p25', 'G6 C7*3', { u: 0.05, v: 0.09 }); },
  tally() {
    const sc = [0, 2, 4, 7, 9];
    for (let i = 0; i < 10; i++) tone({ wave: 'p25', f: up(N('G5'), (sc[i % 5] ?? 0) + 12 * Math.floor(i / 5)), t: i * 0.055, d: 0.04, v: 0.08, env: 'pluck' });
    tone({ wave: 'p25', f: N('G6'), t: 0.58, d: 0.3, v: 0.1 });
    tone({ wave: 'tri', f: N('D7'), t: 0.58, d: 0.3, v: 0.18 });
  },
  tick() { noise({ mode: 'short', rate: 1.6, d: 0.025, v: 0.18, filter: ['highpass', 3000, null] }); },
  hurry() { [0, 0.14].forEach((t) => tone({ wave: 'p50', f: N('A5'), t, d: 0.08, v: 0.1, env: 'flat' })); },
  hint() { tone({ wave: 'tri', f: N('C6'), arp: [0, 4, 7, 12, 16], arpRate: 1 / 45, d: 0.2, v: 0.26 }); tone({ wave: 'p12', f: N('G6'), f2: N('C7'), t: 0.16, d: 0.14, v: 0.05 }); },

  // celebrations
  sunrise() {
    const u = 0.11;
    'C5 D5 E5 G5 A5 C6 D6 E6'.split(' ').forEach((n, i) => gong(N(n), { t: i * u, v: 0.4 }));
    gong(N('C3'), { t: 0, d: 1.2, v: 0.45 });
    gong(N('G3'), { t: 4 * u, d: 1, v: 0.4 });
    ['C5', 'E5', 'G5'].forEach((n) => tone({ wave: 'p12', f: N(n), d: 2.0, v: 0.035, env: 'swell' }));
    const t = 8 * u;
    mel('p25', 'C6+E6+G6*10', { t, u: 0.1, v: 0.06, env: 'lead', vib: [5, 0.006], vibDelay: 0.2 });
    mel('tri', 'C4*10', { t, u: 0.1, v: 0.2 });
    crash({ t, v: 0.07 });
    tone({ wave: 'tri', f: N('C7'), arp: [0, 4, 7, 12, 16, 19], arpRate: 1 / 40, t: t + 0.15, d: 0.4, v: 0.12 });
  },
  start() {
    tone({ wave: 'p25', f: N('C5'), arp: [0, 4, 7, 12], arpRate: 1 / 50, d: 0.1, v: 0.11 });
    tone({ wave: 'p25', f: N('C6'), arp: [0, 4, 7, 12], arpRate: 1 / 50, t: 0.1, d: 0.1, v: 0.11 });
    tone({ wave: 'p25', f: N('C7'), t: 0.2, d: 0.25, v: 0.1 });
    tone({ wave: 'tri', f: N('C5'), f2: N('C6'), step: true, d: 0.2, v: 0.25 });
  },
  badge() {
    const u = 0.075;
    mel('p25', 'G5 C6 E6 . D6 E6 G6*8', { u, v: 0.12, env: 'lead', vib: [6, 0.007], vibDelay: 0.12 });
    mel('p12', 'E5 G5 C6 . B5 C6 E6*8', { u, v: 0.06, env: 'lead' });
    mel('tri', 'C4*3 . G3*2 C4*8', { u, v: 0.22 });
    kick({ t: 0 });
    kick({ t: u * 4 });
    kick({ t: u * 6 });
    crash({ t: u * 6 });
    tone({ wave: 'tri', f: N('C7'), arp: [0, 4, 7, 12], arpRate: 1 / 40, t: u * 8, d: 0.32, v: 0.14 });
  },
  complete() {
    const u = 0.07;
    mel('p25', 'C5 E5 G5 C6 F5 A5 C6 F6 G5 B5 D6 G6 C6*12', { u, v: 0.11, env: 'lead', vib: [6, 0.007], vibDelay: 0.15 });
    mel('p12', 'E5*4 A5*4 B5*4 E6*12', { u, v: 0.05, env: 'lead' });
    mel('tri', 'C3*4 F3*4 G3*4 C4*12', { u, v: 0.24 });
    [0, 4, 8, 12].forEach((i) => kick({ t: i * u }));
    [2, 6, 10].forEach((i) => snare({ t: i * u }));
    crash({ t: 12 * u });
    tone({ wave: 'tri', f: N('C7'), arp: [0, 4, 7, 12, 16], arpRate: 1 / 40, t: 14 * u, d: 0.4, v: 0.13 });
  },
  streak() {
    noise({ rate: 0.18, rate2: 0.9, d: 0.38, v: 0.15, env: 'swell', filter: ['bandpass', 500, 3200, 1.2] });
    [0.08, 0.17, 0.29].forEach((t) => noise({ rate: 0.6, d: 0.02, v: 0.12, t, filter: ['highpass', 2000, null] }));
    mel('p25', 'C6 E6 G6 C7*5', { t: 0.3, u: 0.055, v: 0.11 });
    mel('tri', 'C5 E5 G5 C6*5', { t: 0.3, u: 0.055, v: 0.22 });
  },
  countdown() {
    [0, 0.5, 1].forEach((t) => {
      tone({ wave: 'p50', f: N('C5'), t, d: 0.13, v: 0.09, env: 'flat' });
      tone({ wave: 'tri', f: N('C4'), t, d: 0.13, v: 0.14, env: 'flat' });
    });
    tone({ wave: 'p25', f: N('C6'), t: 1.5, d: 0.45, v: 0.13, env: 'lead', vib: [7, 0.008], vibDelay: 0.1 });
    tone({ wave: 'p12', f: N('G5'), t: 1.5, d: 0.45, v: 0.07, env: 'lead' });
    tone({ wave: 'tri', f: N('C5'), t: 1.5, d: 0.45, v: 0.18 });
    crash({ t: 1.5, v: 0.08 });
  },
  unlock() {
    noise({ mode: 'short', rate: 0.9, d: 0.035, v: 0.13 });
    noise({ mode: 'short', rate: 1.1, d: 0.035, v: 0.13, t: 0.07 });
    mel('tri', 'G5 C6 E6 G6*4', { t: 0.15, u: 0.06, v: 0.28 });
    mel('p12', 'G5 C6 E6 G6*4', { t: 0.2, u: 0.06, v: 0.035 });
  },
  certificate() {
    const u = 0.1;
    mel('p25', 'G4 G4 G4 C5*6 . E5 . G5 C6*12', { u, v: 0.12, env: 'lead', legato: 0.85, vib: [6, 0.007], vibDelay: 0.15 });
    mel('p12', 'E4 E4 E4 A4*6 . B4 . D5 E5*12', { u, v: 0.06, env: 'lead', legato: 0.85 });
    mel('tri', 'C3 C3 C3 F3*6 . G3 . G3 C3*12', { u, v: 0.24, legato: 0.85 });
    [0, 1, 2].forEach((i) => snare({ t: i * u }));
    [3, 9, 11, 13].forEach((i) => kick({ t: i * u }));
    crash({ t: 13 * u });
    'C6 D6 E6 G6 A6 C7 D7 E7'.split(' ').forEach((n, i) => gong(N(n), { t: (14 + i * 0.6) * u, v: 0.45 }));
  },

  // arcade: Takbo, Data!
  jump() { tone({ wave: 'p50', f: N('C5'), f2: N('C6'), step: true, d: 0.15, v: 0.11 }); },
  freebie() { tone({ wave: 'p25', f: N('E6'), arp: [0, 7, 12], arpRate: 1 / 40, d: 0.13, v: 0.1 }); },
  leak() { noise({ rate: 0.35, d: 0.2, v: 0.18 }); tone({ wave: 'p12', f: N('E5'), f2: N('E3'), step: true, t: 0.03, d: 0.32, v: 0.1 }); },
  shield() { tone({ wave: 'p25', f: N('A4'), f2: N('A5'), d: 0.35, v: 0.1, env: 'swell', vib: [14, 0.02] }); tone({ wave: 'tri', f: N('A6'), arp: [0, 4, 7, 12], arpRate: 1 / 40, t: 0.3, d: 0.2, v: 0.16 }); },
  // Feed Mo 'To
  swipe() { noise({ rate: 0.5, rate2: 1.3, d: 0.09, v: 0.11, env: 'swell', filter: ['bandpass', 2200, null, 0.9] }); },
  heart() { mel('p25', 'E6 A6', { u: 0.045, v: 0.1, env: 'pluck' }); tone({ wave: 'tri', f: N('A6'), t: 0.09, d: 0.14, v: 0.18 }); },
  bubble() { tone({ wave: 'p50', f: N('C5'), d: 0.55, v: 0.09, env: 'swell', vib: [5, 0.05] }); tone({ wave: 'p12', f: N('C#5'), d: 0.55, v: 0.035, env: 'swell', vib: [4, 0.05] }); },
  // Luto ni Ara
  plop() { tone({ wave: 'tri', f: N('C6'), f2: N('C5'), d: 0.09, v: 0.3, env: 'pluck' }); noise({ rate: 0.5, d: 0.02, v: 0.06 }); },
  sizzle() { noise({ rate: 1, d: 0.8, v: 0.07, env: 'swell', filter: ['highpass', 4500, null] }); [0.1, 0.22, 0.37, 0.5, 0.63].forEach((t) => noise({ rate: 0.7, d: 0.015, v: 0.1, t, filter: ['highpass', 2500, null] })); },
  served() { tone({ wave: 'tri', f: N('E6'), d: 0.7, v: 0.17 }); tone({ wave: 'sine', f: N('E6') * 2.76, d: 0.25, v: 0.06, env: 'pluck' }); tone({ wave: 'p12', f: N('B6'), t: 0.05, d: 0.4, v: 0.03 }); },
  funnyDish() { tone({ wave: 'tri', f: N('C6'), f2: N('C5'), d: 0.25, v: 0.15, env: 'flat', vib: [9, 0.02] }); tone({ wave: 'tri', f: N('C5'), f2: N('G5'), t: 0.27, d: 0.18, v: 0.15 }); },
  // Sino 'To?
  ring() { [0, 0.7].forEach((t) => tone({ wave: 'p25', f: N('E6'), arp: [0, -4], arpRate: 1 / 25, t, d: 0.5, v: 0.07, env: 'flat' })); },
  verify() { ['C6', 'G6', 'C7'].forEach((n, i) => tone({ wave: 'p50', f: N(n), t: i * 0.07, d: 0.05, v: 0.08, env: 'flat' })); },
  hangUp() { noise({ mode: 'short', rate: 0.6, d: 0.03, v: 0.15 }); tone({ wave: 'tri', f: N('G4'), f2: N('C4'), t: 0.04, d: 0.16, v: 0.18 }); },
  scamCaught() { thump(0.8); mel('p25', 'G5 G5 C6*4', { t: 0.08, u: 0.06, v: 0.11 }); mel('p12', 'E5 E5 G5*4', { t: 0.08, u: 0.06, v: 0.05 }); },
  // Lamok Lamay
  whack() { noise({ rate: 0.3, d: 0.06, v: 0.26 }); tone({ wave: 'tri', f: 300, f2: 80, d: 0.09, v: 0.36, env: 'pluck' }); },
  whiff() { noise({ rate: 0.8, rate2: 0.3, d: 0.13, v: 0.1, env: 'swell', filter: ['bandpass', 1500, null, 0.8] }); },
  aiScan() { tone({ wave: 'p12', f: 1200, f2: 2400, step: true, d: 0.08, v: 0.1, env: 'flat' }); [0.1, 0.17].forEach((t) => tone({ wave: 'p12', f: 2400, t, d: 0.04, v: 0.1, env: 'flat' })); },
  fixAI() { mel('p25', 'C6 D6 E6 G6*2', { u: 0.045, v: 0.1 }); tone({ wave: 'tri', f: N('C5'), d: 0.25, v: 0.12 }); },
  // Tawid, Lola!
  step() { [0, 0.18, 0.36, 0.54].forEach((t, i) => tone({ wave: 'tri', f: i % 2 ? 200 : 240, f2: i % 2 ? 150 : 180, t, d: 0.04, v: 0.4, env: 'pluck' })); },
  aiVoice() { mel('p12', 'E6 B5 E6', { u: 0.08, v: 0.08, env: 'flat', vib: [28, 0.012], legato: 0.8 }); },
  honk() { [0, 0.3].forEach((t) => { tone({ wave: 'p50', f: N('F4'), t, d: 0.22, v: 0.06, env: 'flat' }); tone({ wave: 'p50', f: N('A4'), t, d: 0.22, v: 0.06, env: 'flat' }); }); },
  arrive() { mel('p25', 'C6 E6 G6 C7*3', { u: 0.06, v: 0.1 }); mel('tri', 'C5 E5 G5 C6*3', { u: 0.06, v: 0.14 }); },
  // Hati Tayo!
  toAI() { tone({ wave: 'p12', f: 600, f2: 1400, step: true, d: 0.1, v: 0.12, env: 'flat' }); tone({ wave: 'p12', f: 1400, t: 0.12, d: 0.05, v: 0.12, env: 'flat' }); },
  toPerson() { mel('tri', 'G5 C6*2', { u: 0.07, v: 0.16 }); },
  dayDone() { mel('p25', 'C6 G5 E5 G5 C6*4', { u: 0.07, v: 0.1 }); mel('tri', 'C4*4 G3 . C4*3', { u: 0.07, v: 0.15 }); },
  // Gawa Ko 'To!
  label() { thump(0.55); tone({ wave: 'p25', f: N('C6'), t: 0.06, d: 0.06, v: 0.09, env: 'pluck' }); },
  consent() { tone({ wave: 'p25', f: N('G5'), f2: N('D6'), d: 0.16, v: 0.1 }); },
  credit() { tone({ wave: 'tri', f: N('C6'), arp: [0, 4, 7, 12], arpRate: 1 / 40, d: 0.18, v: 0.26 }); tone({ wave: 'p12', f: N('C7'), t: 0.12, d: 0.15, v: 0.04 }); },
  // Tulog na, Bea!
  buzz() { [0, 0.3].forEach((t) => tone({ wave: 'p12', f: 85, t, d: 0.2, v: 0.14, env: 'flat', vib: [30, 0.08] })); },
  lullaby() { mel('tri', 'E5 C5 G4 E4*2 C4*4', { u: 0.13, v: 0.15 }); },
  meterWarn() { tone({ wave: 'tri', f: N('E4'), d: 0.45, v: 0.14, env: 'swell', vib: [8, 0.04] }); },
  // Sa Sapatos Nila
  kiosk() { [0, 0.18].forEach((t) => tone({ wave: 'p50', f: N('B5'), t, d: 0.1, v: 0.08, env: 'flat' })); },
  fixApplied() { noise({ mode: 'short', rate: 0.7, d: 0.04, v: 0.13 }); noise({ mode: 'short', rate: 0.8, d: 0.04, v: 0.13, t: 0.09 }); mel('p25', 'E6 G6 C7*2', { t: 0.2, u: 0.05, v: 0.1 }); },
  persona() { tone({ wave: 'tri', f: N('G5'), arp: [0, 5, 7, 12, 7, 5, 0], arpRate: 1 / 30, d: 0.24, v: 0.16 }); },
  // OBJECTION!
  objection() {
    thump();
    noise({ rate: 0.4, d: 0.1, v: 0.12, t: 0.02 });
    mel('p50', 'C5 G5*2 E5*3', { t: 0.08, u: 0.06, v: 0.1, env: 'flat', vib: [9, 0.02], legato: 0.85 });
    mel('p25', 'D5+F5+A5*5', { t: 0.5, u: 0.06, v: 0.06 });
    kick({ t: 0.5 });
  },
  gavel() { [0, 0.22].forEach((t) => { noise({ rate: 0.2, d: 0.09, v: 0.27, t }); tone({ wave: 'tri', f: 190, f2: 60, t, d: 0.15, v: 0.38, env: 'pluck' }); }); },
  evidence() { noise({ rate: 0.4, rate2: 1, d: 0.12, v: 0.11, env: 'swell', filter: ['bandpass', 1800, null, 0.9] }); mel('p25', 'C5 G5 C6*4', { t: 0.12, u: 0.05, v: 0.11 }); mel('p12', 'E5 C6 E6*4', { t: 0.12, u: 0.05, v: 0.05 }); },
  verdict() { mel('p25', 'C6 C6 G5 C6*2 E6 G6*4', { u: 0.07, v: 0.11 }); mel('tri', 'C4 . . C4*2 G3 C4*4', { u: 0.07, v: 0.18 }); crash({ t: 6 * 0.07, v: 0.07 }); },
} satisfies Record<string, (arg?: number) => void>;

export type SfxName = keyof typeof SFX;

export function playSfx(name: SfxName, arg?: number): void {
  if (!graph()) return;
  try {
    (SFX[name] as (a?: number) => void)(arg);
  } catch {
    /* a sound must never break the app */
  }
}

/* ------------------------------------------------------------------ Ara's voice */
const VOICE: Record<Mood, { wave: Wave; base: string; scale: number[]; step: number; v: number; drop: number; rise?: boolean; fall?: boolean }> = {
  happy: { wave: 'p50', base: 'A5', scale: [0, 2, 4, 7, 9], step: 0.055, v: 0.08, drop: 0.94 },
  wink: { wave: 'p25', base: 'G5', scale: [0, 2, 4, 7, 9], step: 0.06, v: 0.09, drop: 1.1 },
  think: { wave: 'tri', base: 'D5', scale: [0, 2, 3, 5, 7], step: 0.072, v: 0.24, drop: 0.97 },
  wow: { wave: 'p50', base: 'C6', scale: [0, 4, 7, 9], step: 0.05, v: 0.08, drop: 1.06, rise: true },
  sad: { wave: 'tri', base: 'F4', scale: [0, 3, 5, 7], step: 0.09, v: 0.22, drop: 0.92, fall: true },
};

/** Ara "talks" in pitched blips, one per letter, so her voice works in any language. Returns the length in seconds. */
export function say(text: string, mood: Mood): number {
  if (!graph()) return 0;
  const vc = VOICE[mood];
  const base = N(vc.base);
  const chars = [...text];
  const L = chars.length;
  let t = 0;
  if (mood === 'think') {
    tone({ wave: 'tri', f: base, d: 0.32, v: 0.2, env: 'swell', vib: [6, 0.03] });
    t = 0.36;
  }
  chars.forEach((ch, i) => {
    const p = i / Math.max(1, L - 1);
    if (/[a-z0-9]/i.test(ch)) {
      const vowel = /[aeiou]/i.test(ch);
      let f = up(base, (vc.scale[(ch.toLowerCase().charCodeAt(0) * 7) % vc.scale.length] ?? 0) - (vowel ? 0 : 2));
      if (vc.rise) f = up(f, p * 5);
      if (vc.fall) f = up(f, -p * 4);
      const next = chars[i + 1];
      if (next === '?') f = up(f, 5);
      else if (next === '!') f = up(f, 3);
      tone({ wave: vc.wave, f, f2: f * vc.drop, t, d: vc.step * 0.75, v: vc.v, env: 'pluck' });
      t += vc.step;
    } else if (/[.!?,]/.test(ch)) t += vc.step * 3;
    else t += vc.step * 0.6;
  });
  return t;
}

/* ------------------------------------------------------------------ music */
const bars = (...b: string[]): string => b.join(' ');
const rep = (s: string, n: number): string => Array<string>(n).fill(s).join(' ');

interface Track { wave: Wave; v: number; env: Env; vib?: readonly [number, number]; pat: string }
interface Song { bpm: number; tracks: Track[]; drums: string | null }

export const SONGS = {
  /** Home, Learn path, Library, Me. */
  umaga: {
    bpm: 132,
    tracks: [
      { wave: 'p25', v: 0.1, env: 'lead', vib: [5.5, 0.007], pat: bars('G5 - E5 G5 A5 - G5 E5', 'D5 - - G4 B4 D5 G5 -', 'E5 - C5 E5 A5 - G5 E5', 'F5 - E5 D5 C5 - - -', 'G5 - E5 G5 C6 - A5 G5', 'D6 - B5 G5 D5 - G5 -', 'A5 - G5 E5 C5 - D5 E5', 'F5 - A5 - G5 - - .') },
      { wave: 'p12', v: 0.045, env: 'pluck', pat: bars(rep('C4 E4 G4 E4', 2), rep('B3 D4 G4 D4', 2), rep('C4 E4 A4 E4', 2), rep('C4 F4 A4 F4', 2), rep('C4 E4 G4 E4', 2), rep('B3 D4 G4 D4', 2), rep('C4 E4 A4 E4', 2), 'C4 F4 A4 F4 B3 D4 G4 D4') },
      { wave: 'tri', v: 0.28, env: 'decay', pat: bars(rep('C3 C4', 4), rep('G2 G3', 4), rep('A2 A3', 4), rep('F2 F3', 4), rep('C3 C4', 4), rep('G2 G3', 4), rep('A2 A3', 4), 'F2 F3 F2 F3 G2 G3 G2 B2') },
    ],
    drums: bars(rep('k h s h k k s h', 7), 'k h s h k s s s'),
  },
  /** Inside a lesson, while reading: calm, no drums. */
  aral: {
    bpm: 92,
    tracks: [
      { wave: 'tri', v: 0.2, env: 'lead', pat: bars('E5 - - - G5 - - -', 'C5 - - - E5 - D5 -', 'C5 - - - A4 - - -', 'B4 - - - D5 - - -', 'E5 - G5 - C6 - - -', 'A5 - - - G5 - E5 -', 'F5 - E5 - C5 - - -', 'D5 - - - - - - .') },
      { wave: 'p12', v: 0.03, env: 'pluck', pat: rep(bars(rep('C4 G4 E5 G4', 2), rep('A3 E4 C5 E4', 2), rep('F3 C4 A4 C4', 2), rep('G3 D4 B4 D4', 2)), 2) },
      { wave: 'tri', v: 0.2, env: 'lead', pat: rep(bars('C3 - - - - - - -', 'A2 - - - - - - -', 'F2 - - - - - - -', 'G2 - - - - - - -'), 2) },
    ],
    drums: null,
  },
  /** Arcade menu and games. */
  laro: {
    bpm: 156,
    tracks: [
      { wave: 'p25', v: 0.1, env: 'lead', vib: [6, 0.007], pat: bars('A5 - C6 - A5 G5 F5 G5', 'B5 - D6 - B5 A5 G5 D5', 'E5 G5 B5 - E6 - D6 B5', 'C6 - B5 - A5 - E5 -', 'F5 A5 C6 A5 F6 - E6 D6', 'D6 - B5 G5 D6 - G6 -', 'E6 - D6 B5 G5 - B5 D6', 'C6 - B5 - A5 - - .') },
      { wave: 'p12', v: 0.045, env: 'pluck', pat: rep(bars(rep('F4 A4 C5 A4', 2), rep('G4 B4 D5 B4', 2), rep('E4 G4 B4 G4', 2), rep('A4 C5 E5 C5', 2)), 2) },
      { wave: 'tri', v: 0.3, env: 'pluck', pat: rep(bars(rep('F2 F2 F3 F2', 2), rep('G2 G2 G3 G2', 2), rep('E2 E2 E3 E2', 2), rep('A2 A2 A3 A2', 2)), 2) },
    ],
    drums: bars(rep('k h s h k k s h', 7), 'k h s h s s c .'),
  },
  /** Certificate and other victory screens. */
  panalo: {
    bpm: 140,
    tracks: [
      { wave: 'p25', v: 0.1, env: 'lead', vib: [6, 0.007], pat: bars('C5 E5 G5 C6 - - G5 -', 'A5 - C6 - A5 - F5 -', 'G5 - B5 - D6 - B5 G5', 'C6 - - - E6 - C6 .') },
      { wave: 'p12', v: 0.045, env: 'pluck', pat: bars(rep('C4 E4 G4 E4', 2), rep('C4 F4 A4 F4', 2), rep('B3 D4 G4 D4', 2), rep('C4 E4 G4 E4', 2)) },
      { wave: 'tri', v: 0.28, env: 'pluck', pat: bars('C3 - C3 C4 C3 - G2 -', 'F2 - F2 F3 F2 - C3 -', 'G2 - G2 G3 G2 - D3 -', 'C3 - G2 - C3 - - .') },
    ],
    drums: bars(rep('k h s h k h s h', 3), 'k h s h k s s s'),
  },
} satisfies Record<string, Song>;

export type TrackId = keyof typeof SONGS;

interface NoteEvent { n: string; len: number; end: number }
/** One token per eighth note: a note name (or chord with '+'), '-' holds the previous note, '.' is a rest. */
export function parseTrack(str: string): { total: number; by: Map<number, NoteEvent> } {
  const toks = str.trim().split(/\s+/);
  const by = new Map<number, NoteEvent>();
  let last: NoteEvent | null = null;
  toks.forEach((tk, i) => {
    if (tk === '-') {
      if (last && last.end === i) {
        last.len++;
        last.end++;
      }
    } else if (tk === '.') last = null;
    else {
      last = { n: tk, len: 1, end: i + 1 };
      by.set(i, last);
    }
  });
  return { total: toks.length, by };
}

let song: { id: TrackId } | null = null;

export function currentTrack(): TrackId | null {
  return song?.id ?? null;
}

export function setTrack(id: TrackId | null): void {
  if ((song?.id ?? null) === id) return;
  stopTrack();
  const gr = graph();
  if (!id || !gr) return;
  const s: Song = SONGS[id];
  const { ctx, music } = gr;
  const stepDur = 60 / s.bpm / 2;
  const tracks = s.tracks.map((tr) => ({ ...tr, ev: parseTrack(tr.pat) }));
  const drums = s.drums ? s.drums.trim().split(/\s+/) : null;
  let next = ctx.currentTime + 0.08;
  let step = 0;
  const me = { id };
  // The scheduler is woken by the audio clock itself (a silent 40 ms blip whose "ended" event schedules the next notes), not
  // by setInterval: it keeps time in background tabs and under page clocks that replace the timers (tests).
  const mute = ctx.createGain();
  mute.gain.value = 0;
  mute.connect(ctx.destination);
  const wake = (): void => {
    if (song !== me) {
      mute.disconnect();
      return;
    }
    if (next < ctx.currentTime) next = ctx.currentTime + 0.08; // after a pause, pick up where the clock is now
    while (next < ctx.currentTime + 0.2) {
      for (const tr of tracks) {
        const e = tr.ev.by.get(step % tr.ev.total);
        if (e) for (const nn of e.n.split('+')) tone({ wave: tr.wave, f: N(nn), at: next, d: e.len * stepDur * 0.94, v: tr.v, env: tr.env, vib: tr.vib, vibDelay: 0.12, bus: music });
      }
      if (drums) {
        const dk = drums[step % drums.length];
        const o = { at: next, bus: music };
        if (dk === 'k') kick({ ...o, v: 0.4 });
        else if (dk === 's') snare({ ...o, v: 0.11 });
        else if (dk === 'h') hat({ ...o, v: 0.045 });
        else if (dk === 'c') crash({ ...o, v: 0.06 });
      }
      next += stepDur;
      step++;
    }
    const blip = ctx.createOscillator();
    blip.connect(mute);
    blip.onended = wake;
    blip.start();
    blip.stop(ctx.currentTime + 0.04);
  };
  song = me;
  wake();
}

export function stopTrack(): void {
  if (!song) return;
  song = null; // the scheduler sees this on its next wake-up and stops
  if (!g) return;
  const musicBus = g.music;
  for (const e of live) {
    if (e.bus !== musicBus) continue;
    try {
      e.node.stop();
    } catch {
      /* already stopped */
    }
  }
}
