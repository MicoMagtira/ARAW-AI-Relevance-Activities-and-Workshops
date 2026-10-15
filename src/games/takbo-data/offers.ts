// The offers on the road in Takbo, Data!: safe freebies (ask for nothing) and data traps (ask for something).
// Sign text is two short lines (10 characters at most) so it stays readable on a phone-sized canvas.
import type { ContentReview } from '../../content/review';

export type SafeKind = 'water' | 'flyer' | 'badge';
export type DataKind = 'name' | 'birthday' | 'contacts' | 'idphoto' | 'philhealth';

export interface SafeOffer {
  kind: SafeKind;
  lure: string;
  line: string;
  /** Plain-words description for the screen-reader text. */
  say: string;
}

export interface DataTrap {
  kind: DataKind;
  lure: string;
  /** What the form asks for, shown in a form field on the sign. */
  ask: string;
  /** Shield lost when grabbed (15 to 30 by sensitivity). */
  cost: number;
  say: string;
  /** What was given away, for the recap ("your birthday"). */
  gave: string;
  /** Why it matters, for the recap. */
  why: string;
}

export const SAFE_OFFERS: readonly SafeOffer[] = [
  { kind: 'water', lure: 'FREE WATER', line: 'AT STORE', say: 'a free water refill at the store' },
  { kind: 'flyer', lure: 'CLINIC', line: 'FLYER', say: 'a health center flyer' },
  { kind: 'badge', lure: 'VERIFIED', line: 'APP BADGE', say: 'a verified app badge' },
];

export const DATA_TRAPS: readonly DataTrap[] = [
  {
    kind: 'name',
    lure: 'LUCKY DRAW',
    ask: 'FULL NAME?',
    cost: 15,
    say: 'a lucky draw that asks for your full name',
    gave: 'your full name',
    why: 'A name alone looks harmless, but scammers combine it with other bits to sound like someone you know.',
  },
  {
    kind: 'birthday',
    lure: 'FREE LOAD!',
    ask: 'BIRTHDAY?',
    cost: 20,
    say: 'free load that asks for your birthday',
    gave: 'your birthday',
    why: 'Your birthday is a common password and ID check, so it helps someone pretend to be you.',
  },
  {
    kind: 'contacts',
    lure: 'FREE APP',
    ask: 'CONTACTS?',
    cost: 25,
    say: 'a free app that asks to read your contacts',
    gave: 'your contact list',
    why: "Your contacts are other people's data too. Scammers use them to message your family and friends.",
  },
  {
    kind: 'idphoto',
    lure: 'WIN PHONE!',
    ask: 'ID PHOTO?',
    cost: 30,
    say: 'a phone giveaway that asks for a photo of your ID',
    gave: 'a photo of your ID',
    why: 'A photo of your ID can be used to open accounts or take loans in your name.',
  },
  {
    kind: 'philhealth',
    lure: 'RAFFLE',
    ask: 'PHILHEALTH',
    cost: 30,
    say: 'a raffle that asks for your PhilHealth number',
    gave: 'your PhilHealth number',
    why: 'Your PhilHealth number links to your health records and claims. Scammers want it more than free load.',
  },
];

export const trapByKind = (kind: DataKind): DataTrap => DATA_TRAPS.find((t) => t.kind === kind) as DataTrap;
export const safeByKind = (kind: SafeKind): SafeOffer => SAFE_OFFERS.find((s) => s.kind === kind) as SafeOffer;

/** The three privacy tips every recap ends with. */
export const PRIVACY_TIPS: readonly string[] = [
  'A real freebie does not ask for your ID, birthday, contacts or PhilHealth number.',
  'Share the least you can. If an offer asks for more than it needs, skip it.',
  'Your health records are valuable. Give them only to your health worker or the official health center.',
];

/** Every line in this file is unreviewed teaching content (CONTENT_GUIDE 7). */
export const CONTENT_REVIEW: ContentReview = {
  basis: 'CONTENT_GUIDE safe facts: free offers that ask for ID numbers, OTPs or health data are a data risk; Data Privacy Act (RA 10173) data minimisation',
  review_status: 'unreviewed',
};
