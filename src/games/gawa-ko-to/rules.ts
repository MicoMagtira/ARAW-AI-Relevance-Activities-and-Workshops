// Gawa Ko 'To! rules with no drawing in them, so they are all unit-tested: how a brief is built (seeded, harder as the run
// goes on), how a published poster is checked (label, consent, credit, fact, brief), what it scores and when it is "Reported!".
import { createRng, rngPick, shuffle, type Rng } from '../engine/rng';
import { ARTIST, DOCTOR, NEIGHBOR, TOPICS, topicById, type Fact, type PictureId, type Slogan, type Topic } from './parts';
import type { ContentReview } from '../../content/review';

/** What the brief insists on. At most one picture requirement, plus maybe the AI slogan. */
export type Requirement = 'ai-picture' | 'neighbor' | 'artist' | 'ai-slogan';

export interface Brief {
  n: number;
  topic: string;
  requirements: readonly Requirement[];
  /** What the neighbour answers when asked for permission. A required neighbour always says yes. */
  neighborSays: 'yes' | 'no';
  /** Seconds to publish (arcade only); null means no timer. */
  seconds: number | null;
}

export interface Poster {
  picture: PictureId | null;
  slogan: string | null;
  fact: string | null;
  /** The "Made with AI" sticker is on. */
  label: boolean;
  /** The artist credit line is on. */
  credit: boolean;
  /** The player asked the person in the picture for permission. */
  asked: boolean;
}

export const EMPTY_POSTER: Poster = { picture: null, slogan: null, fact: null, label: false, credit: false, asked: false };

export const HEARTS = 3;
export const GOOD_RUN = 1500;
export const POINTS = { honest: 100, brief: 50, tidy: 40, speedMax: 50 } as const;

export type CheckId = 'label' | 'consent' | 'credit' | 'fact' | 'brief';
export interface Check {
  id: CheckId;
  /** na: this poster has nothing to check here. */
  status: 'pass' | 'fail' | 'na';
  /** What happened, in plain words. */
  note: string;
  /** Who reported the poster, when this check failed (honesty checks only). */
  report?: string;
}

export interface Evaluation {
  checks: readonly Check[];
  /** Any honesty check failed. */
  reported: boolean;
  points: number;
  /** The fact on the poster is wrong, or the picture is a made-up endorsement: the poster gets the FAKE stamp. */
  fake: boolean;
}

export const REQUIREMENT_TEXT: Readonly<Record<Requirement, string>> = {
  'ai-picture': 'The budget is tiny: use the AI-generated picture.',
  neighbor: `The captain wants a local face: use ${NEIGHBOR}’s photo.`,
  artist: `The captain wants local art: use ${ARTIST}’s drawing.`,
  'ai-slogan': 'No time to write: use the AI tool’s slogan.',
};

const PICTURE_REQ: Readonly<Record<Exclude<Requirement, 'ai-slogan'>, PictureId>> = { 'ai-picture': 'ai', neighbor: 'neighbor', artist: 'artist' };

const topicOrder = (seed: string): Topic[] => shuffle(TOPICS, createRng(`${seed}:topics`));
const PICTURE_REQS: readonly Requirement[] = ['ai-picture', 'neighbor', 'artist'];

/** Seconds on the clock for poster n (arcade): generous, shrinking to a floor. */
export const secondsFor = (n: number): number => Math.max(40, 90 - 5 * (Math.max(1, n) - 1));

/** The three briefs of the module game: each lesson once (AI picture, neighbour, artist), topics from the seed, no timer. */
export function buildModuleBriefs(seed: string): Brief[] {
  const topics = topicOrder(seed);
  const reqs = shuffle(PICTURE_REQS, createRng(`${seed}:module-reqs`));
  return reqs.map((r, i) => ({
    n: i + 1,
    topic: (topics[i] as Topic).id,
    requirements: [r, ...(i === 2 && r !== 'ai-picture' ? (['ai-slogan'] as const) : [])],
    neighborSays: 'yes',
    seconds: null,
  }));
}

/**
 * Brief n of an arcade run. Poster 1 asks for one picture type; from poster 3 the picture is sometimes free; from poster 4 the
 * brief may also insist on the AI slogan. Topics never repeat inside a cycle of eight.
 */
export function buildBrief(seed: string, n: number): Brief {
  const k = Math.max(1, Math.floor(n));
  const rng: Rng = createRng(`${seed}:brief:${k}`);
  const topic = (topicOrder(seed)[(k - 1) % TOPICS.length] as Topic).id;
  const free = k >= 3 && rng() < 0.25;
  const pic: Requirement | null = free ? null : k === 1 ? 'ai-picture' : rngPick(PICTURE_REQS, rng);
  const slogan: Requirement | null = k >= 4 && rng() < 0.45 ? 'ai-slogan' : null;
  const requirements = [pic, slogan].filter((r): r is Requirement => r !== null);
  const says: 'yes' | 'no' = pic === 'neighbor' || rng() < 0.7 ? 'yes' : 'no';
  return { n: k, topic, requirements, neighborSays: says, seconds: secondsFor(k) };
}

export const sloganOf = (topic: Topic, id: string | null): Slogan | undefined => topic.slogans.find((s) => s.id === id);
export const factOf = (topic: Topic, id: string | null): Fact | undefined => topic.facts.find((f) => f.id === id);

/** Pictures that are AI-made and so need the label. */
export const aiPicture = (p: PictureId | null): boolean => p === 'ai' || p === 'ai-doctor';

/** What the person in the picture says when asked, or null when the picture has no real person to ask. */
export function replyFor(picture: PictureId | null, brief: Brief): { name: string; yes: boolean; text: string } | null {
  if (picture === 'neighbor') {
    return brief.neighborSays === 'yes'
      ? { name: NEIGHBOR, yes: true, text: 'Sure, for the health drive! Just for this poster, ha?' }
      : { name: NEIGHBOR, yes: false, text: 'Ay, nakakahiya! Please use another picture.' };
  }
  if (picture === 'ai-doctor') return { name: DOCTOR, yes: false, text: 'I never made that picture, and I never said that. Please take it down!' };
  return null;
}

const FAIL_REPORT: Readonly<Record<'label' | 'consent' | 'credit' | 'fact', string>> = {
  label: 'A reader noticed the picture looked fake and nobody said it was AI-made.',
  consent: 'The person in the picture never agreed to it and reported the poster.',
  credit: `${ARTIST} saw her drawing with no name on it and reported the poster.`,
  fact: 'The health center reported the poster: its health fact was wrong.',
};

/** Check a finished poster against its brief. Honesty checks decide "Reported!"; the brief check only affects points. */
export function evaluate(poster: Poster, brief: Brief, secondsLeft = 0): Evaluation {
  const topic = topicById(brief.topic);
  const slogan = sloganOf(topic, poster.slogan);
  const fact = factOf(topic, poster.fact);
  const checks: Check[] = [];
  const pic = poster.picture;

  const needsLabel = aiPicture(pic) || !!slogan?.ai;
  if (needsLabel) {
    checks.push(
      poster.label
        ? { id: 'label', status: 'pass', note: 'You labelled the AI-made parts with "Made with AI". Labels build trust.' }
        : { id: 'label', status: 'fail', note: 'Part of this poster was made by AI, but it says nothing. People deserve to know.', report: FAIL_REPORT.label },
    );
  } else {
    checks.push({
      id: 'label',
      status: 'na',
      note: poster.label ? 'Nothing here was AI-made, so the label was not needed. Label only what is true.' : 'Nothing here was made by AI, so no label was needed.',
    });
  }

  if (pic === 'neighbor') {
    const reply = replyFor(pic, brief);
    if (!poster.asked) checks.push({ id: 'consent', status: 'fail', note: `You never asked ${NEIGHBOR}. Even for a good cause, ask first.`, report: FAIL_REPORT.consent });
    else if (reply && !reply.yes) checks.push({ id: 'consent', status: 'fail', note: `${NEIGHBOR} said no, and you used the photo anyway.`, report: FAIL_REPORT.consent });
    else checks.push({ id: 'consent', status: 'pass', note: `You asked ${NEIGHBOR} first, and he said yes. That is consent.` });
  } else if (pic === 'ai-doctor') {
    checks.push({
      id: 'consent',
      status: 'fail',
      note: `${DOCTOR} never agreed to this. A fake endorsement uses a trusted face to sell, and people may skip real care.`,
      report: `${DOCTOR} reported the poster: it used a made-up picture of the doctor.`,
    });
  } else {
    checks.push({ id: 'consent', status: 'na', note: 'No real person’s face or voice is on this poster, so there was no one to ask.' });
  }

  if (pic === 'artist') {
    checks.push(
      poster.credit
        ? { id: 'credit', status: 'pass', note: `You credited ${ARTIST}. Her name stays with her work.` }
        : { id: 'credit', status: 'fail', note: `${ARTIST}’s drawing has no credit line. Artists should be named.`, report: FAIL_REPORT.credit },
    );
  } else {
    checks.push({ id: 'credit', status: 'na', note: poster.credit ? 'There was no artist to credit here, but a credit line does no harm.' : 'No artist’s work is on this poster, so no credit was needed.' });
  }

  if (fact?.ok) checks.push({ id: 'fact', status: 'pass', note: `Correct health fact. ${fact.why}` });
  else if (fact) checks.push({ id: 'fact', status: 'fail', note: `Wrong health fact. ${fact.why}`, report: FAIL_REPORT.fact });
  else checks.push({ id: 'fact', status: 'fail', note: 'The poster has no health fact. A health poster needs one from a trusted source.', report: FAIL_REPORT.fact });

  if (brief.requirements.length === 0) {
    checks.push({ id: 'brief', status: 'na', note: 'The brief left the choices to you.' });
  } else {
    const met = brief.requirements.every((r) => (r === 'ai-slogan' ? !!slogan?.ai : pic === PICTURE_REQ[r]));
    checks.push(met ? { id: 'brief', status: 'pass', note: 'You followed the brief.' } : { id: 'brief', status: 'fail', note: 'The poster did not follow the brief.' });
  }

  const honesty = checks.filter((c) => c.id !== 'brief');
  const reported = honesty.some((c) => c.status === 'fail');
  const passes = honesty.filter((c) => c.status === 'pass').length;
  const briefPass = checks.find((c) => c.id === 'brief')?.status === 'pass';
  const speed = brief.seconds && secondsLeft > 0 ? Math.round(POINTS.speedMax * Math.min(1, secondsLeft / brief.seconds)) : 0;
  const points = passes * POINTS.honest + (briefPass ? POINTS.brief : 0) + (reported ? 0 : POINTS.tidy + speed);
  return { checks, reported, points, fake: fact?.ok === false || pic === 'ai-doctor' };
}

/** Stars for the module game: 3 honest posters of 3 = 3 stars, 2 = 2 stars, else 1 (docs/SPEC.md section 3). */
export const starsFor = (honest: number, total: number): 1 | 2 | 3 => {
  if (total <= 0) return 1;
  const share = honest / total;
  return share >= 0.99 ? 3 : share >= 0.6 ? 2 : 1;
};

/** Greedy wrap for the SVG poster text: lines of at most `max` characters. Long words get a line of their own. */
export function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

/** Every line in this file is unreviewed teaching content (CONTENT_GUIDE 7). */
export const CONTENT_REVIEW: ContentReview = {
  basis: 'SPEC M7: label AI-made pictures, ask consent, give credit; facts come from the curated pool in parts.ts',
  review_status: 'unreviewed',
};
