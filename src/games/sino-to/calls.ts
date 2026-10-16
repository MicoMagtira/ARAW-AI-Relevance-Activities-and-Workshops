// The seeded call generator for Sino 'To?: who is calling, what the transcript says, what each verification move finds out,
// and how a decision is scored. Scripts come from templates (a story with blanks for the family member, amount and place).
// Everything here is fictional: the family, the clinic, "Banko Liwanag" and the "PisoPay" wallet. Health content stays
// general education: no dosing, no diagnosis. Calls depend only on the seed (never on the player's choices), so the Daily Challenge matches.
import { rngInt, rngPick, shuffle, type Rng } from '../engine/rng';
import type { Look } from '../feed-mo-to/users';
import type { ContentReview } from '../../content/review';

export const HEARTS = 3;

export type CheckId = 'secret' | 'callback' | 'relative' | 'hotline';
/** Tile order on the canvas. */
export const CHECKS: readonly CheckId[] = ['secret', 'callback', 'relative', 'hotline'];

export interface CheckInfo {
  id: CheckId;
  /** Tile text, 8 characters at most per line (the tile is 76 logical px wide). */
  line1: string;
  line2: string;
  /** Plain-words name for the screen-reader description. */
  name: string;
}

export const CHECK_INFO: Readonly<Record<CheckId, CheckInfo>> = {
  secret: { id: 'secret', line1: 'SECRET', line2: 'QUESTION', name: 'ask the family secret question' },
  callback: { id: 'callback', line1: 'CALL', line2: 'SAVED NO', name: 'call back the saved number' },
  relative: { id: 'relative', line1: 'ASK A', line2: 'RELATIVE', name: 'ask another relative' },
  hotline: { id: 'hotline', line1: 'OFFICIAL', line2: 'HOTLINE', name: 'check the official hotline' },
};

/** What a verification move found: it proves the call real, proves it fake, or does not help. */
export type Verdict = 'pass' | 'fail' | 'unclear';

export interface CheckResult {
  verdict: Verdict;
  /** One line, 38 characters at most (it is drawn on one canvas line). */
  text: string;
}

export type Kind = 'relative' | 'doctor' | 'bank';
export type Channel = 'CALL' | 'VOICE NOTE';
export type Choice = 'help' | 'hangup';

export interface Relative {
  id: string;
  /** Upper case, 9 characters at most. */
  name: string;
  say: string;
  /** What this person calls the player. */
  addr: string;
  look: Look;
}

export const FAMILY: readonly Relative[] = [
  { id: 'mama', name: 'MAMA', say: 'Mama', addr: 'Sweetheart', look: { hair: '#1f2550', skin: '#e2a77e', shirt: '#ff7a59' } },
  { id: 'papa', name: 'PAPA', say: 'Papa', addr: 'Sweetheart', look: { hair: '#4a4f6a', skin: '#c98a5e', shirt: '#35408e' } },
  { id: 'lola', name: 'LOLA NENA', say: 'Lola Nena', addr: 'Dear', look: { hair: '#c9c9d6', skin: '#e2a77e', shirt: '#1e7d50', glasses: true } },
  { id: 'liza', name: 'ATE LIZA', say: 'Ate Liza', addr: 'Kiddo', look: { hair: '#4a2c1a', skin: '#f0c19a', shirt: '#c4323a' } },
  { id: 'ben', name: 'KUYA BEN', say: 'Kuya Ben', addr: 'Kiddo', look: { hair: '#1f2550', skin: '#d99a6c', shirt: '#e8b84a' } },
  { id: 'raul', name: 'TITO RAUL', say: 'Tito Raul', addr: 'Kiddo', look: { hair: '#6b6f8a', skin: '#c98a5e', shirt: '#1e7d50', glasses: true } },
];

const DOCTOR_LOOK: Look = { hair: '#1f2550', skin: '#e2a77e', shirt: '#e3e6f5', glasses: true };
const BANK_LOOK: Look = { hair: '#4a4f6a', skin: '#f0c19a', shirt: '#35408e' };

/** The family question: asked with "Secret question", answered in the family, never shared online. */
export const SECRET_ANSWERS = ['Kikay', 'Tagpi', 'Bibingka', 'Kidlat', 'Santan'] as const;

export interface Story {
  id: string;
  kind: Kind;
  scam: boolean;
  /** 0 has loud tells (secrecy, "hurry"); 1 sounds calm. Later calls lean on level 1. */
  level: 0 | 1;
  /** Blanks: {addr} {who} {other} {amount} {wallet} {hospital} {clinic}. */
  text: string;
  /** Names a hospital, so the hotline can say something about the patient. */
  hospital?: boolean;
  /** Says the phone is lost, broken or borrowed, so calling the saved number cannot settle it. */
  excuse?: boolean;
  /** The caller says it is a new number (shown on the caller card for scams and real calls alike). */
  newNumber?: boolean;
  urgent?: boolean;
  /** Why it was fake, or why it was real: shown on the reveal (at most 4 lines of 38 characters). */
  lesson: string;
}

export const STORIES: readonly Story[] = [
  // ---- relative: fake ---------------------------------------------------------------------------------------------
  {
    id: 'r-s1', kind: 'relative', scam: true, level: 0, hospital: true, excuse: true, newNumber: true, urgent: true,
    text: "{addr}! It's {who}. I'm at the {hospital} ER, my phone broke. Send {amount} by {wallet} NOW. Don't tell {other}!",
    lesson: 'A voice clone! AI can copy a voice from a short clip. "Keep it secret" is a scam trick.',
  },
  {
    id: 'r-s2', kind: 'relative', scam: true, level: 0, hospital: true, urgent: true,
    text: "{addr}, {who} here. The doctor says I need an operation tonight. Please send {amount} on {wallet} right now. Hurry!",
    lesson: 'Scammers fake hospital emergencies to rush you. A real family member can wait while you call back.',
  },
  {
    id: 'r-s3', kind: 'relative', scam: true, level: 1, hospital: true,
    text: "Hello {addr}, {who} here. I'm in the {hospital} ER and need a deposit for the bed. Please send {amount} on {wallet}. I'll explain later.",
    lesson: 'A calm voice can be cloned too. Hospital bills are paid at the hospital, not by wallet.',
  },
  {
    id: 'r-s4', kind: 'relative', scam: true, level: 1, excuse: true, newNumber: true,
    text: "{addr}, it's {who} on a new number, my phone fell in water. I need {amount} on {wallet} for medicine at the pharmacy. Keep it between us.",
    lesson: '"New number" plus "keep it between us" is a classic. Call the saved number or ask another relative.',
  },
  {
    id: 'r-s5', kind: 'relative', scam: true, level: 1, hospital: true, urgent: true,
    text: "{addr}, it's {who}. I'm in the {hospital} ER. They will not treat me until I pay {amount}. Send it to {wallet}, please.",
    lesson: 'Real emergency rooms treat first. Pressure to pay by wallet right now is the red flag.',
  },
  // ---- relative: real ---------------------------------------------------------------------------------------------
  {
    id: 'r-g1', kind: 'relative', scam: false, level: 0, hospital: true,
    text: "{addr}, it's {who}. I twisted my ankle and I'm at the {hospital}. I'm short {amount} for the X-ray. Can you send it? Call me back if you like.",
    lesson: 'A real family call can ask for money, and it welcomes your check. Calling back and asking proved it.',
  },
  {
    id: 'r-g2', kind: 'relative', scam: false, level: 0, hospital: true, excuse: true, newNumber: true,
    text: "{addr}, {who} here. I'm borrowing a nurse's phone, mine died. I have a fever and they want me to stay overnight. Please bring my blanket tomorrow.",
    lesson: 'A borrowed phone is no proof either way. The other checks agreed, so this was a real call.',
  },
  {
    id: 'r-g3', kind: 'relative', scam: false, level: 1,
    text: "{addr}, it's {who}. I'm okay, it's only a sprain. I'm at the health center. Can you pick me up at 5? No need to send any money.",
    lesson: 'A real call with no money asked. A quick check is still kind, and your family will understand.',
  },
  {
    id: 'r-g4', kind: 'relative', scam: false, level: 1,
    text: "{addr}, {who}. The health center check-up is done, and my medicine costs {amount}. Can you send it on {wallet}? I'll pay you back on Sunday.",
    lesson: 'A real request can look just like a scam. Only the checks tell them apart: never trust the voice alone.',
  },
  {
    id: 'r-g5', kind: 'relative', scam: false, level: 1, hospital: true,
    text: "Hi {addr}, it's {who}. They are keeping me at the {hospital} for tests. Please don't worry. Can you bring my glasses and ID?",
    lesson: 'A calm, real call. Checking took a moment, and it let you help the right way.',
  },
  // ---- doctor: fake -----------------------------------------------------------------------------------------------
  {
    id: 'd-s1', kind: 'doctor', scam: true, level: 0, urgent: true,
    text: 'Dr. Alcantara from {clinic}. Your lab results are critical! Pay a release fee of {amount} on {wallet} within the hour, or we close your file.',
    lesson: 'Real clinics do not charge a "release fee" by e-wallet. Call your health center on its official number.',
  },
  {
    id: 'd-s2', kind: 'doctor', scam: true, level: 1,
    text: 'Hello! Dr. Alcantara here. Stop your maintenance medicine, it is poison. My herbal capsules cure it all. Send {amount} on {wallet} for a box.',
    lesson: 'Never stop prescribed medicine because of a call or an ad. Ask your own doctor or health worker.',
  },
  {
    id: 'd-s3', kind: 'doctor', scam: true, level: 1,
    text: "Good day, from {clinic}. To hold your child's vaccine slot, send a booking fee of {amount} to {wallet} today. Slots are almost gone.",
    lesson: 'Routine child vaccines at the health center are free. Call the health center to check.',
  },
  // ---- doctor: real -----------------------------------------------------------------------------------------------
  {
    id: 'd-g1', kind: 'doctor', scam: false, level: 0,
    text: "Good day, this is the nurse at {clinic}. Reminder: your baby's vaccine is on Friday, 9 AM. It is free. Please bring the health card.",
    lesson: 'A real health center reminder asks for no fee. Vaccines at the health center are free.',
  },
  {
    id: 'd-g2', kind: 'doctor', scam: false, level: 0,
    text: "Hello, {clinic} here. Your mother's blood pressure check is on Thursday. Please bring her medicine list. No payment needed. Call us to confirm.",
    lesson: 'A real clinic call asks you to bring papers, not to send money. Confirming through the clinic is safe.',
  },
  {
    id: 'd-g3', kind: 'doctor', scam: false, level: 1,
    text: 'This is Dr. Alcantara at {clinic}. Your follow-up visit is next month. Please bring your health card. There is no fee to book it.',
    lesson: 'Real clinics confirm visits and take no wallet fees. Calling them back is always okay.',
  },
  // ---- bank: fake -------------------------------------------------------------------------------------------------
  {
    id: 'b-s1', kind: 'bank', scam: true, level: 0, urgent: true,
    text: 'Banko Liwanag security! Your account is locked. Read me the 6-digit code we just texted you so we can unlock it. Quick!',
    lesson: 'A real bank never asks for your OTP or PIN. Hang up and call the number on your card.',
  },
  {
    id: 'b-s2', kind: 'bank', scam: true, level: 1,
    text: 'Good day from Banko Liwanag. A strange payment left your account. To cancel it, tell me your PIN and move your money to a safe account.',
    lesson: 'Banks do not ask you to move money to a "safe account". Call the number on your card.',
  },
  {
    id: 'b-s3', kind: 'bank', scam: true, level: 1,
    text: 'Banko Liwanag here. Your hospital refund of {amount} is ready. To receive it, first send a small processing fee to {wallet}.',
    lesson: 'A refund never needs a fee first. Check with the bank through the number on your card.',
  },
  // ---- bank: real -------------------------------------------------------------------------------------------------
  {
    id: 'b-g1', kind: 'bank', scam: false, level: 0,
    text: 'Banko Liwanag customer care. You asked about a replacement ATM card. We never ask for your PIN or OTP. Please visit a branch to continue.',
    lesson: 'Real banks never ask for your PIN or OTP. They send you to a branch or to the number on your card.',
  },
  {
    id: 'b-g2', kind: 'bank', scam: false, level: 1,
    text: 'Banko Liwanag reminder: your loan payment is due on Friday. Please pay at a branch or in our official app. We will not ask for your PIN.',
    lesson: 'A real reminder sends you to the branch or the official app and never asks for your PIN.',
  },
];

export interface Call {
  story: Story;
  kind: Kind;
  scam: boolean;
  channel: Channel;
  /** The transcript, with the blanks filled in. */
  text: string;
  /** Who the caller says they are (upper case). */
  callerName: string;
  /** "NEW NO.", "SAVED" or "UNKNOWN": what the caller card shows (true for fakes and real calls alike). */
  tag: string;
  look: Look;
  /** The relative the "Ask a relative" move reaches. */
  other: Relative;
  /** The checks that give proof one way or the other. */
  decisive: readonly CheckId[];
  results: Readonly<Record<CheckId, CheckResult>>;
}

const AMOUNTS_SCAM = ['P5,000', 'P8,000', 'P10,000', 'P12,000'];
const AMOUNTS_REAL = ['P1,500', 'P2,000', 'P2,500'];
const HOSPITALS = ['San Isidro Norte Hospital', 'Masagana District Hospital', 'Liwanag General Hospital'];
const CLINICS = ['Barangay Masagana Health Center', 'Liwanag Health Center', 'San Isidro Norte Clinic'];

const fill = (template: string, values: Readonly<Record<string, string>>): string => template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');

/** The checks a story can settle at all. */
function available(story: Story): CheckId[] {
  if (story.kind === 'relative') {
    const out: CheckId[] = ['secret', 'relative'];
    if (!story.excuse) out.push('callback');
    if (story.hospital) out.push('hotline');
    return out;
  }
  if (story.kind === 'doctor') return ['callback', 'relative', 'hotline'];
  return ['callback', 'hotline'];
}

/** How many checks are decisive: three at first, then two, then only one. */
export const decisiveCount = (index: number): number => Math.max(1, 3 - Math.floor(index / 6));

/** Pure: what one check says for this story, truth and name. `decisive` false means it does not settle the question. */
export function resolveCheck(check: CheckId, story: Story, other: Relative, decisive: boolean, answer: string, rng: Rng): CheckResult {
  const kind = story.kind;
  const pass = (text: string): CheckResult => ({ verdict: 'pass', text });
  const fail = (text: string): CheckResult => ({ verdict: 'fail', text });
  const unclear = (text: string): CheckResult => ({ verdict: 'unclear', text });
  const who = story.scam ? fail : pass;
  const name = other.name;

  if (check === 'secret') {
    if (kind !== 'relative') return unclear('SECRET Q: Not for doctors or banks.');
    if (!decisive) return unclear('SECRET Q: Bad line. Cannot hear.');
    if (!story.scam) return pass(`SECRET Q: "${answer}!" Right answer.`);
    return fail(rngPick(['SECRET Q: "Um... just send it first!"', 'SECRET Q: "Mingming?" Wrong answer.', 'SECRET Q: "I forgot! Hurry up!"'], rng));
  }
  if (check === 'callback') {
    if (!decisive) return unclear(kind === 'relative' ? 'CALL BACK: Rings and rings. No reply.' : 'CALL BACK: Line busy. Try again later.');
    if (kind === 'relative') return who(story.scam ? 'CALL BACK: "I never called you!"' : 'CALL BACK: "Yes, that was me!"');
    if (kind === 'doctor') return who(story.scam ? 'CALL BACK: Clinic: "We never called."' : 'CALL BACK: Clinic: "Yes, we called."');
    return who(story.scam ? 'CALL BACK: Bank: "That was not us."' : 'CALL BACK: Bank: "Yes, we called."');
  }
  if (check === 'relative') {
    if (kind === 'bank') return unclear(`${name}: "Not sure. Ask the bank."`);
    if (!decisive) return unclear(`${name}: No reply. Left on read.`);
    if (kind === 'relative') return who(story.scam ? `${name}: "Safe at home. No call."` : `${name}: "Yes, it is true. I know."`);
    return who(story.scam ? `${name}: "Nobody booked that."` : `${name}: "Yes, the clinic told me."`);
  }
  if (kind === 'relative' && !story.hospital) return unclear('HOTLINE: A hotline cannot find family.');
  if (!decisive) return unclear('HOTLINE: Long queue. No answer yet.');
  if (kind === 'relative') return who(story.scam ? 'HOTLINE: "No such patient today."' : 'HOTLINE: "Yes, that patient is in."');
  if (kind === 'doctor') return who(story.scam ? 'HOTLINE: "No such doctor or fee."' : 'HOTLINE: "Yes, that was booked."');
  return who(story.scam ? 'HOTLINE: "Not us. Never share OTP."' : 'HOTLINE: "Yes, we did call you."');
}

export interface CallGenerator {
  /** The call at this index (0, 1, 2...). Call it in order. */
  next(index: number): Call;
}

export function createCallGenerator(rng: Rng): CallGenerator {
  const recent: string[] = [];
  const truths: boolean[] = [];

  return {
    next(index) {
      // about 55% fakes, never more than 3 of the same kind in a row
      const last3 = truths.slice(-3);
      const scam = last3.length === 3 && last3.every((t) => t === last3[0]) ? !last3[0] : rng() < 0.55;
      truths.push(scam);
      const calm = rng() < Math.min(0.8, index * 0.12);
      const pool = (strict: boolean) => STORIES.filter((s) => s.scam === scam && (!strict || s.level === (calm ? 1 : 0)) && !recent.includes(s.id));
      const choices = pool(true).length > 0 ? pool(true) : pool(false).length > 0 ? pool(false) : STORIES.filter((s) => s.scam === scam);
      const story = rngPick(choices, rng);
      recent.push(story.id);
      if (recent.length > 3) recent.shift();

      const caller = rngPick(FAMILY, rng);
      const other = rngPick(FAMILY.filter((r) => r.id !== caller.id), rng);
      const answer = rngPick(SECRET_ANSWERS, rng);
      const clinicIx = rngInt(rng, 0, CLINICS.length);
      const values = {
        addr: caller.addr,
        who: caller.say,
        other: other.say,
        amount: rngPick(scam ? AMOUNTS_SCAM : AMOUNTS_REAL, rng),
        wallet: 'PisoPay',
        hospital: rngPick(HOSPITALS, rng),
        clinic: CLINICS[clinicIx] as string,
      };
      const decisive = shuffle(available(story), rng).slice(0, decisiveCount(index));
      const results = Object.fromEntries(CHECKS.map((c) => [c, resolveCheck(c, story, other, decisive.includes(c), answer, rng)])) as Record<CheckId, CheckResult>;
      const kind = story.kind;
      return {
        story,
        kind,
        scam,
        channel: rng() < 0.35 ? 'VOICE NOTE' : 'CALL',
        text: fill(story.text, values),
        callerName: kind === 'relative' ? caller.name : kind === 'doctor' ? 'DR. ALCANTARA' : 'BANKO LIWANAG',
        tag: kind !== 'relative' ? 'UNKNOWN' : story.newNumber ? 'NEW NO.' : 'SAVED',
        look: kind === 'relative' ? caller.look : kind === 'doctor' ? DOCTOR_LOOK : BANK_LOOK,
        other,
        decisive,
        results,
      };
    },
  };
}

/** What the used checks prove: real, fake, or nothing yet. */
export function evidence(call: Call, used: readonly CheckId[]): Verdict {
  for (const c of used) {
    const v = call.results[c].verdict;
    if (v !== 'unclear') return v;
  }
  return 'unclear';
}

export type Result = 'stopped' | 'paid' | 'helped' | 'hungUp';

export interface Judgement {
  result: Result;
  correct: boolean;
  /** The decision had proof from a check (a lucky guess scores little and leaves the streak alone). */
  verified: boolean;
  base: number;
  bonus: number;
  multiplier: number;
  total: number;
  heartLost: boolean;
  /** Streak after this call. */
  streak: number;
}

export const BASE_POINTS = 100;
export const GUESS_POINTS = 20;
export const BONUS_MAX = 60;
export const BONUS_STEP = 20;

/** Streak multiplier: x1 at no streak, plus 0.25 per verified call in a row, up to x2. */
export const multiplierFor = (streak: number): number => 1 + 0.25 * Math.min(streak, 4);

/** Score a decision. Fewer checks earn a bigger bonus, but only a decision backed by proof counts as verified. */
export function judge(call: Call, choice: Choice, used: readonly CheckId[], streak: number): Judgement {
  const result: Result = call.scam ? (choice === 'hangup' ? 'stopped' : 'paid') : choice === 'help' ? 'helped' : 'hungUp';
  const correct = result === 'stopped' || result === 'helped';
  const verified = evidence(call, used) !== 'unclear';
  if (!correct) return { result, correct, verified, base: 0, bonus: 0, multiplier: 1, total: 0, heartLost: true, streak: 0 };
  if (!verified) return { result, correct, verified, base: GUESS_POINTS, bonus: 0, multiplier: 1, total: GUESS_POINTS, heartLost: false, streak };
  const bonus = Math.max(0, BONUS_MAX - BONUS_STEP * (used.length - 1));
  const multiplier = multiplierFor(streak);
  return { result, correct, verified, base: BASE_POINTS, bonus, multiplier, total: Math.round((BASE_POINTS + bonus) * multiplier), heartLost: false, streak: streak + 1 };
}

/** Every line in this file is unreviewed teaching content (CONTENT_GUIDE 7). */
export const CONTENT_REVIEW: ContentReview = {
  basis: 'CONTENT_GUIDE places to report: cybercrime hotline 1326; voice-clone scam advice: hang up and call back on a known number',
  review_status: 'unreviewed',
};
