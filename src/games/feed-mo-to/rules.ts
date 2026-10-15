// Feed Mo 'To rules: topics, how each pick moves the two meters, scoring and the narrowing "bubble".
// Pure functions, no randomness and no drawing, so every number is testable.

export type TopicId = 'scare' | 'miracle' | 'food' | 'family' | 'showbiz' | 'sports' | 'news' | 'clinic';

export interface Topic {
  id: TopicId;
  /** Short chip label (6 characters at most) for the bubble and the cards. */
  chip: string;
  /** Plain name for the screen-reader text and the recap. */
  name: string;
  /** Sensational topics are the fake, fear-driven ones that win clicks. */
  sensational: boolean;
}

export const TOPICS: readonly Topic[] = [
  { id: 'scare', chip: 'SCARE', name: 'scary health posts', sensational: true },
  { id: 'miracle', chip: 'CURE', name: 'miracle cure posts', sensational: true },
  { id: 'food', chip: 'FOOD', name: 'food', sensational: false },
  { id: 'family', chip: 'KIDS', name: 'family', sensational: false },
  { id: 'showbiz', chip: 'SHOW', name: 'showbiz', sensational: false },
  { id: 'sports', chip: 'BALL', name: 'sports', sensational: false },
  { id: 'news', chip: 'NEWS', name: 'barangay news', sensational: false },
  { id: 'clinic', chip: 'CLINIC', name: 'health center tips', sensational: false },
];

export const topicById = (id: TopicId): Topic => TOPICS.find((t) => t.id === id) as Topic;
/** The topics a user can like (everything that is not sensational). */
export const LIKEABLE: readonly TopicId[] = TOPICS.filter((t) => !t.sensational).map((t) => t.id);

export const METER_MAX = 100;
export const ENGAGEMENT_START = 60;
export const BALANCE_START = 90;
/** A fresh user is a fresh feed: both meters get a little back. */
export const NEW_USER_ENGAGEMENT = 15;
export const NEW_USER_BALANCE = 20;
export const POSTS_PER_USER = 10;
export const BALANCED_BONUS = 50;
/** Both meters must be above this at the end of a user for the bonus. */
export const BONUS_LEVEL = 50;

/** Clicks a post wins before boredom. Scary posts win the most. */
export const GAIN = { scare: 24, miracle: 20, liked: 12, clinic: 8, clinicLiked: 14, other: 4 } as const;
/** Balanced-Feed change per pick. */
export const BALANCE = { scare: -12, miracle: -10, repeatSensational: -6, liked: 5, other: 8, clinic: 14 } as const;
export const TIMEOUT_ENGAGEMENT = -15;

/** Every scroll costs a little engagement (boredom), and one more with each user (up to 22), so nobody can coast forever. */
export const boredom = (userIndex: number): number => 8 + Math.min(14, userIndex);

/** Time to pick, in ms: 9 s for the first user, 0.25 s less for each next user, never under 6 s. */
export const pickMs = (userIndex: number): number => Math.max(6000, 9000 - userIndex * 250);

export interface Meters {
  engagement: number;
  balance: number;
}

export const clampMeter = (v: number): number => Math.max(0, Math.min(METER_MAX, v));

export type Crash = 'bubble' | 'bored' | null;

export interface PickContext {
  topic: TopicId;
  liked: boolean;
  /** Topic of the previous pick for this user, or null at the first pick. */
  previous: TopicId | null;
  userIndex: number;
  meters: Meters;
}

export interface PickResult {
  /** Clicks won before boredom (what the points are made of). */
  gain: number;
  /** Net change of Engagement (gain minus boredom). */
  engagementDelta: number;
  balanceDelta: number;
  points: number;
  meters: Meters;
  crash: Crash;
}

/** Clicks a post would win for this user (shown as pips on the card). Repeating a topic bores a user, unless it is scary. */
export function gainFor(topic: TopicId, liked: boolean, previous: TopicId | null): number {
  if (topic === 'scare') return GAIN.scare;
  if (topic === 'miracle') return GAIN.miracle;
  const base = topic === 'clinic' ? (liked ? GAIN.clinicLiked : GAIN.clinic) : liked ? GAIN.liked : GAIN.other;
  return previous === topic ? Math.floor(base / 2) : base;
}

/** 1 to 3 pips for the card: how many clicks the algorithm predicts. */
export const pipsFor = (gain: number): number => (gain >= 20 ? 3 : gain >= 10 ? 2 : 1);

export function balanceFor(topic: TopicId, liked: boolean, previous: TopicId | null): number {
  const sensational = (id: TopicId | null) => id !== null && topicById(id).sensational;
  if (topic === 'scare' || topic === 'miracle') {
    return (topic === 'scare' ? BALANCE.scare : BALANCE.miracle) + (sensational(previous) ? BALANCE.repeatSensational : 0);
  }
  if (topic === 'clinic') return BALANCE.clinic;
  if (previous === topic) return 0;
  return liked ? BALANCE.liked : BALANCE.other;
}

/** Score for a pick: the clicks it won, times a multiplier from 0.5 (bubble) to 1.5 (balanced feed). */
export const pointsFor = (gain: number, balanceBefore: number): number => Math.round(gain * (0.5 + balanceBefore / METER_MAX));

export function crashOf(m: Meters): Crash {
  if (m.balance <= 0) return 'bubble';
  if (m.engagement <= 0) return 'bored';
  return null;
}

export function evaluatePick(ctx: PickContext): PickResult {
  const gain = gainFor(ctx.topic, ctx.liked, ctx.previous);
  const engagementDelta = gain - boredom(ctx.userIndex);
  const balanceDelta = balanceFor(ctx.topic, ctx.liked, ctx.previous);
  const meters = { engagement: clampMeter(ctx.meters.engagement + engagementDelta), balance: clampMeter(ctx.meters.balance + balanceDelta) };
  return { gain, engagementDelta, balanceDelta, points: pointsFor(gain, ctx.meters.balance), meters, crash: crashOf(meters) };
}

/** Tita scrolled away before a pick was made. */
export function evaluateTimeout(meters: Meters): { meters: Meters; crash: Crash } {
  const next = { engagement: clampMeter(meters.engagement + TIMEOUT_ENGAGEMENT), balance: meters.balance };
  return { meters: next, crash: crashOf(next) };
}

/** Both meters above the line at the end of a user. */
export const isBalanced = (m: Meters): boolean => m.engagement > BONUS_LEVEL && m.balance > BONUS_LEVEL;

/** Fresh feed for the next user. */
export const refreshMeters = (m: Meters): Meters => ({
  engagement: clampMeter(m.engagement + NEW_USER_ENGAGEMENT),
  balance: clampMeter(m.balance + NEW_USER_BALANCE),
});

// ---- the bubble -----------------------------------------------------------------------------------------------

export type FeedWeights = Record<TopicId, number>;

export const freshWeights = (): FeedWeights => Object.fromEntries(TOPICS.map((t) => [t.id, 1])) as FeedWeights;

/** Whatever was shown grows; everything else fades. This is what a feed learns from clicks. */
export function learn(weights: FeedWeights, shown: TopicId): FeedWeights {
  const next = { ...weights };
  for (const t of TOPICS) next[t.id] = t.id === shown ? weights[t.id] + 1 : weights[t.id] * 0.85;
  return next;
}

/** How many topic chips still fit in the bubble: all 8 when the feed is balanced, 1 when it is a pure bubble. */
export const aliveCount = (balance: number): number => Math.max(1, Math.min(TOPICS.length, Math.ceil(balance / 12)));

/** The topics still in the bubble, most-fed first (ties: topics she likes first, then list order). */
export function bubbleTopics(weights: FeedWeights, balance: number, likes: readonly TopicId[]): TopicId[] {
  return TOPICS.map((t, i) => ({ id: t.id, w: weights[t.id], liked: likes.includes(t.id), i }))
    .sort((a, b) => b.w - a.w || Number(b.liked) - Number(a.liked) || a.i - b.i)
    .slice(0, aliveCount(balance))
    .map((t) => t.id);
}
