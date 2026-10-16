// Feed Mo 'To (algorithms and filter bubbles): you are the recommendation algorithm (docs/SPEC.md section 5).
// Pick one of 3 posts to show the current person. Scary posts win the most clicks (Engagement) but squeeze their feed into
// a bubble (Balanced Feed). Either meter at 0 ends the run. Everything is a pure function of the seed and the picks:
// users and posts come only from the seeded random numbers, never from what the player chose.
import { t, type StringKey } from '../../app/i18n';
import { tx } from '../../i18n/runtime';
import { PALETTE, box, text } from '../engine/draw';
import { createRng, type Rng } from '../engine/rng';
import type { Cue, GameDef, GameInstance, GameStats } from '../engine/types';
import { silent, timerCue } from '../engine/cues';
import {
  BANNER_TEXT_W,
  CARD_X,
  H,
  PANEL_LABEL,
  W,
  bubbleRadii,
  cardAt,
  drawBanner,
  drawBubble,
  drawCard,
  drawChip,
  drawMeter,
  drawPerson,
  gridLayout,
  layoutChips,
  meterColor,
  type BannerLine,
  type Face,
  type Pos,
} from './art';
import { makeCandidates, type Post } from './posts';
import {
  BALANCED_BONUS,
  BALANCE_START,
  ENGAGEMENT_START,
  POSTS_PER_USER,
  TOPICS,
  bubbleTopics,
  evaluatePick,
  evaluateTimeout,
  freshWeights,
  gainFor,
  isBalanced,
  learn,
  pickMs,
  pipsFor,
  refreshMeters,
  topicById,
  type Crash,
  type FeedWeights,
  type Meters,
  type TopicId,
} from './rules';
import { createUserQueue, type Persona } from './users';

const INTRO_MS = 2000;
const INTRO_SUMMARY_MS = 3200;
const RESULT_MS = 1600;
const CRASH_MS = 2600;
/** Intro and result screens can be skipped with a press or tap after this long. */
const SKIP_AFTER_MS = 700;
const RECENT_KEYS = 6;

type Phase = 'intro' | 'choose' | 'result';

interface Outcome {
  /** Card index that was picked, or -1 when the time ran out. */
  chosen: number;
  engagementDelta: number;
  balanceDelta: number;
  points: number;
  note: string;
}

export interface RunSummary {
  /** People whose feed you curated (including the one you were on). */
  users: number;
  posts: number;
  scary: number;
  trusted: number;
  timeouts: number;
  crash: Crash;
}

const approach = (cur: number, target: number): number => {
  const d = target - cur;
  if (d === 0) return cur;
  const step = Math.max(1, Math.round(Math.abs(d) * 0.2));
  return Math.abs(d) <= step ? target : cur + Math.sign(d) * step;
};

/** Topic names for the descriptions, each translated before they are joined. */
const list = (ids: readonly TopicId[]): string => ids.map((id) => tx(topicById(id).name)).join(', ');

function noteFor(topic: TopicId, liked: boolean, repeated: boolean): string {
  if (topic === 'scare' || topic === 'miracle') return t('g.feed.note.fear');
  if (topic === 'clinic') return t('g.feed.note.trusted');
  if (repeated) return t('g.feed.note.same');
  return liked ? t('g.feed.note.liked') : t('g.feed.note.new');
}

/** The crash banner's words wrap a little narrower than the banner, so the English keeps its three short lines. */
const CRASH_TEXT_W = 168;

const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

function createFeed({ rng, cue = silent }: { seed: string; rng: Rng; cue?: Cue }): GameInstance {
  const nextUser = createUserQueue(createRng(`${rng()}:feed-users`));

  let phase: Phase = 'intro';
  let phaseMs = 0;
  let introMs = INTRO_MS;
  let userIndex = 0;
  let user: Persona = nextUser();
  let meters: Meters = { engagement: ENGAGEMENT_START, balance: BALANCE_START };
  let weights: FeedWeights = freshWeights();
  let previous: TopicId | null = null;
  let postNo = 0;
  let candidates: Post[] = [];
  let sel = 1;
  let timeLeft = 0;
  let outcome: Outcome | null = null;
  let pendingCrash: Crash = null;
  /** The "is done" lines shown on the next person's intro banner. */
  let summary: BannerLine[] = [];
  let over = false;
  let score = 0;
  let lastPointer = '';
  const recent: string[] = [];
  const counts = { posts: 0, scary: 0, trusted: 0, timeouts: 0 };
  let crash: Crash = null;

  // animated bubble
  const grid = gridLayout();
  const chipPos = new Map<TopicId, Pos>(grid);
  let rx = 120;
  let ry = 30;

  function beginUser() {
    user = nextUser();
    weights = freshWeights();
    previous = null;
    postNo = 0;
    phase = 'intro';
    phaseMs = 0;
    introMs = summary.length > 0 ? INTRO_SUMMARY_MS : INTRO_MS;
  }

  function beginPost() {
    postNo += 1;
    candidates = makeCandidates({ user, userIndex, rng, recent: new Set(recent) });
    for (const p of candidates) recent.push(p.key);
    while (recent.length > RECENT_KEYS) recent.shift();
    sel = 1;
    timeLeft = pickMs(userIndex);
    cue('swipe');
    phase = 'choose';
    phaseMs = 0;
    outcome = null;
  }

  function finishUser() {
    const balanced = isBalanced(meters);
    if (balanced) score += BALANCED_BONUS;
    summary = [
      { text: t('g.feed.done', { name: user.name }), color: PALETTE.navy },
      balanced ? { text: t('g.feed.bonus', { n: BALANCED_BONUS }), color: PALETTE.fact } : { text: t('g.feed.noBonus'), color: PALETTE.muted },
    ];
    userIndex += 1;
    meters = refreshMeters(meters);
    beginUser();
  }

  function pick(index: number) {
    const post = candidates[index];
    if (!post || phase !== 'choose') return;
    const liked = user.interests.includes(post.topic);
    const result = evaluatePick({ topic: post.topic, liked, previous, userIndex, meters });
    outcome = {
      chosen: index,
      engagementDelta: result.engagementDelta,
      balanceDelta: result.balanceDelta,
      points: result.points,
      note: noteFor(post.topic, liked, previous === post.topic),
    };
    meters = result.meters;
    weights = learn(weights, post.topic);
    previous = post.topic;
    score += result.points;
    counts.posts += 1;
    if (topicById(post.topic).sensational) counts.scary += 1;
    if (post.topic === 'clinic') counts.trusted += 1;
    pendingCrash = result.crash;
    cue(result.crash === 'bubble' ? 'bubble' : liked ? 'heart' : 'select');
    phase = 'result';
    phaseMs = 0;
  }

  function timeout() {
    const result = evaluateTimeout(meters);
    const delta = result.meters.engagement - meters.engagement;
    meters = result.meters;
    counts.posts += 1;
    counts.timeouts += 1;
    outcome = { chosen: -1, engagementDelta: delta, balanceDelta: 0, points: 0, note: t('g.feed.note.slow') };
    pendingCrash = result.crash;
    cue('whiff');
    phase = 'result';
    phaseMs = 0;
  }

  function leaveResult() {
    if (pendingCrash) {
      crash = pendingCrash;
      over = true;
    } else if (postNo >= POSTS_PER_USER) finishUser();
    else beginPost();
  }

  const face = (): Face => (meters.engagement < 30 ? 'bored' : meters.balance < 40 ? 'worried' : 'happy');
  const alive = () => bubbleTopics(weights, meters.balance, user.interests);

  function animate() {
    const ids = alive();
    const block = layoutChips(ids);
    for (const t of TOPICS) {
      const cur = chipPos.get(t.id) as Pos;
      const target = (ids.includes(t.id) ? block.pos.get(t.id) : grid.get(t.id)) as Pos;
      chipPos.set(t.id, { x: approach(cur.x, target.x), y: approach(cur.y, target.y) });
    }
    const radii = bubbleRadii(block.w, block.h);
    rx = approach(rx, radii.rx);
    ry = approach(ry, radii.ry);
  }

  const skippable = (): boolean => phaseMs >= SKIP_AFTER_MS;

  return {
    step(dtMs, input) {
      if (over) return;
      animate();
      phaseMs += dtMs;
      const pressed = input.actions.includes('act') || input.taps.length > 0;

      if (phase === 'intro') {
        if (phaseMs >= introMs || (skippable() && pressed)) {
          summary = [];
          beginPost();
        }
        return;
      }
      if (phase === 'result') {
        const length = pendingCrash ? CRASH_MS : RESULT_MS;
        if (phaseMs >= length || (phaseMs >= (pendingCrash ? 1200 : SKIP_AFTER_MS) && pressed)) leaveResult();
        return;
      }

      // choosing
      for (const action of input.actions) {
        if (action === 'left') sel = Math.max(0, sel - 1);
        else if (action === 'right') sel = Math.min(candidates.length - 1, sel + 1);
        else if (action === 'act') {
          pick(sel);
          return;
        }
      }
      const p = input.pointer;
      const key = p ? `${Math.round(p.x)},${Math.round(p.y)}` : '';
      if (p && key !== lastPointer) {
        const hover = cardAt(p.x, p.y);
        if (hover >= 0) sel = hover;
      }
      lastPointer = key;
      for (const tap of input.taps) {
        const hit = cardAt(tap.x, tap.y);
        if (hit >= 0) {
          pick(hit);
          return;
        }
      }
      const tick = timerCue(timeLeft, timeLeft - dtMs);
      timeLeft -= dtMs;
      if (timeLeft <= 0) timeout();
      else if (tick) cue(tick);
    },

    draw(ctx) {
      box(ctx, PALETTE.cream, 0, 0, W, H);
      box(ctx, PALETTE.navy, 0, H - 4, W, 4);
      drawMeter(ctx, 6, 2, 148, t('g.feed.engagement'), meters.engagement, meterColor(meters.engagement));
      drawMeter(ctx, 166, 2, 148, t('g.feed.balancedFeed'), meters.balance, meterColor(meters.balance));

      // the person's column, left of the bubble panel
      const column = PANEL_LABEL.x - 4 - 48;
      drawPerson(ctx, 6, 30, user.look, face());
      text(ctx, user.name, 48, 30, { size: 8, color: PALETTE.navy, maxWidth: column });
      text(ctx, t('g.feed.postOf', { n: Math.max(1, postNo), total: POSTS_PER_USER }), 48, 42, { size: 8, color: PALETTE.muted, maxWidth: column });
      box(ctx, PALETTE.ink, 48, 55, 10, 10);
      box(ctx, PALETTE.gold, 49, 56, 8, 8);
      text(ctx, t('g.feed.likesKey'), 62, 56, { size: 8, color: PALETTE.muted, maxWidth: column - 14 });

      text(ctx, t('g.feed.bubble'), PANEL_LABEL.x, PANEL_LABEL.y, { size: 8, color: PALETTE.ink, maxWidth: PANEL_LABEL.w });
      const ids = alive();
      const sensationalShare = ids.filter((id) => topicById(id).sensational).length / ids.length;
      const paint = (inside: boolean) => () => {
        for (const t of TOPICS) {
          if (ids.includes(t.id) !== inside) continue;
          const pos = chipPos.get(t.id) as Pos;
          drawChip(ctx, t.id, pos.x, pos.y, user.interests.includes(t.id), !inside);
        }
      };
      drawBubble(ctx, rx, ry, sensationalShare >= 0.5 && ids.length <= 3, paint(false), paint(true));

      if (phase === 'intro') {
        const lines: BannerLine[] = [
          ...summary,
          { text: t(summary.length > 0 ? 'g.feed.next' : 'g.feed.first', { name: user.name }), color: PALETTE.ink },
          { text: t('g.feed.likes', { topics: user.interests.map((id) => tx(topicById(id).chip)).join(' ') }), color: PALETTE.muted },
        ];
        drawBanner(ctx, lines);
      } else {
        candidates.forEach((post, i) => {
          const picked = outcome !== null && outcome.chosen === i;
          drawCard(ctx, CARD_X[i] as number, post, {
            selected: phase === 'choose' ? sel === i : picked,
            revealed: phase === 'result',
            dim: phase === 'result' && !picked,
            pips: pipsFor(gainFor(post.topic, user.interests.includes(post.topic), previous)),
          });
        });
      }

      if (phase === 'choose') {
        const w = 308;
        const fraction = Math.max(0, timeLeft / pickMs(userIndex));
        box(ctx, PALETTE.ink, 6, 154, w, 8);
        box(ctx, PALETTE.surface, 8, 156, w - 4, 4);
        const color = fraction > 0.5 ? PALETTE.fact : fraction > 0.25 ? PALETTE.goldDeep : PALETTE.fake;
        box(ctx, color, 8, 156, Math.round((w - 4) * fraction), 4);
        text(ctx, t('g.feed.pick', { name: user.name }), W / 2, 166, { size: 8, color: PALETTE.ink, align: 'center', maxWidth: W - 12 });
      } else if (phase === 'result' && outcome) {
        const eng = outcome.engagementDelta;
        // the two deltas share the row: each keeps to its half
        const half = (W - 12) / 2 - 4;
        text(ctx, t('g.feed.engagementDelta', { n: signed(eng) }), 6, 156, { size: 8, color: eng >= 0 ? PALETTE.fact : PALETTE.fake, maxWidth: half });
        text(ctx, t('g.feed.balanceDelta', { n: signed(outcome.balanceDelta) }), W - 6, 156, {
          size: 8,
          color: outcome.balanceDelta >= 0 ? PALETTE.fact : PALETTE.fake,
          align: 'right',
          maxWidth: half,
        });
        text(ctx, outcome.note, W / 2, 168, { size: 8, color: PALETTE.ink, align: 'center', maxWidth: W - 12 });
        if (pendingCrash) {
          const bubble = pendingCrash === 'bubble';
          drawBanner(
            ctx,
            [
              { text: t(bubble ? 'g.feed.popped' : 'g.feed.loggedOff'), color: PALETTE.fake },
              { text: t(bubble ? 'g.feed.poppedText' : 'g.feed.loggedOffText', { name: user.name }), maxWidth: Math.min(BANNER_TEXT_W, CRASH_TEXT_W) },
            ],
            'fake',
          );
        }
      }
    },

    stats(): GameStats {
      const eng = Math.round(meters.engagement);
      const bal = Math.round(meters.balance);
      const name = tx(user.name).toLowerCase();
      const base = t('g.feed.say.base', { score, eng, bal, name, n: Math.max(1, postNo), total: POSTS_PER_USER });
      let description: string;
      if (over) {
        description = `${base} ${t(crash === 'bubble' ? 'g.feed.say.overBubble' : 'g.feed.say.overBored')}`;
      } else if (phase === 'intro') {
        const done = summary.length > 0 ? `${summary.map((line) => line.text).join('. ').toLowerCase()}. ` : '';
        description = `${base} ${done}${t(summary.length > 0 ? 'g.feed.say.nextUp' : 'g.feed.say.firstUp', { name, likes: list(user.interests) })}`;
      } else if (phase === 'result' && outcome) {
        const post = candidates[outcome.chosen];
        const said = post
          ? `${t('g.feed.say.showed', { text: post.text })} ${post.fake ? t('g.feed.say.fakePost') : post.topic === 'clinic' ? t('g.feed.say.trustedTip') : ''}`
          : t('g.feed.say.timeout');
        const deltas = t('g.feed.say.result', { eng: signed(outcome.engagementDelta), bal: signed(outcome.balanceDelta), points: outcome.points });
        description = `${base} ${said} ${deltas} ${outcome.note.toLowerCase()}`;
      } else {
        const options = candidates.map((post, i) => t('g.feed.say.option', { n: i + 1, topic: tx(topicById(post.topic).name), text: post.text })).join(' ');
        description = `${base} ${t('g.feed.say.feed', { likes: list(user.interests), feed: list(alive()) })} ${options} ${t('g.feed.say.highlighted', { n: sel + 1 })}`;
      }
      return {
        score,
        over,
        hud: [
          { id: 'score', label: t('g.feed.hud.score'), value: String(score) },
          { id: 'engagement', label: t('g.feed.hud.engagement'), value: `${eng}%`, meter: eng },
          { id: 'balance', label: t('g.feed.hud.balance'), value: `${bal}%`, meter: bal },
        ],
        description,
        recap: over ? buildRecap({ users: userIndex + 1, ...counts, crash }) : [],
      };
    },
  };
}

/** The game-over recap: what happened, then how feeds work, what a filter bubble is and why scary health posts spread. */
export function buildRecap(run: RunSummary): string[] {
  const plural = (n: number, one: StringKey, many: StringKey) => t(n === 1 ? one : many, { n });
  const counts = {
    people: plural(run.users, 'g.feed.recap.people.one', 'g.feed.recap.people.many'),
    posts: plural(run.posts, 'g.feed.recap.posts.one', 'g.feed.recap.posts.many'),
    scary: run.scary,
    tips: plural(run.trusted, 'g.feed.recap.tips.one', 'g.feed.recap.tips.many'),
  };
  const lines = [
    run.timeouts > 0
      ? t('g.feed.recap.summaryLate', { ...counts, late: plural(run.timeouts, 'g.feed.recap.times.one', 'g.feed.recap.times.many') })
      : t('g.feed.recap.summary', counts),
  ];
  if (run.crash === 'bubble') lines.push(t('g.feed.recap.bubble'));
  else if (run.crash === 'bored') lines.push(t('g.feed.recap.bored'));
  lines.push(t('g.feed.recap.how'), t('g.feed.recap.bubbleWhat'), t('g.feed.recap.why'), t('g.feed.recap.tipSearch'), t('g.feed.recap.tipPause'));
  return lines;
}

const feedMoTo: GameDef = {
  slug: 'feed-mo-to',
  name: "Feed Mo 'To",
  width: W,
  height: H,
  goodRun: 1200,
  howTo: [
    'You are the algorithm. Pick one of 3 posts to show the person before the timer ends.',
    'Press the left and right arrows (or A and D), then Space or Enter. You can also tap or click a post.',
    'CLICKS shows how much attention a post is likely to win. Scary posts win the most.',
    'Scary posts push Engagement up but shrink the Feed Bubble and drain Balanced Feed. Trusted health tips and new topics refill it.',
    'Gold chips are what the person likes. Each person has 10 posts, then comes the next one. Finish with both meters above 50 for a bonus.',
    'The run ends when Balanced Feed or Engagement hits 0.',
  ],
  briefing: [
    { title: 'Today, YOU are the algorithm!', text: "Tita Baby is scrolling, and you choose what she sees next. No pressure. Okay, a little pressure.", mood: 'wow' },
    { title: 'Feeds pick what keeps people scrolling', text: 'An algorithm shows more of whatever gets clicks. Keep Tita interested, but keep her feed balanced.', mood: 'happy' },
    { title: 'How to play', text: 'Pick one of three posts before the timer ends. Use left and right with Enter, or just tap a post.', mood: 'idle' },
    { title: 'Why it matters', text: 'Scary health posts get clicks, so feeds show more of them. That can trap people in a bubble of fear.', mood: 'think' },
    { title: 'When should I trust it?', text: 'Trust a feed that shows you many sides, and search on purpose for trusted sources.', mood: 'happy' },
  ],
  takeaway: 'When should I trust it? When a feed shows me many sides, and I search on purpose for trusted sources.',
  create: createFeed,
};

export default feedMoTo;
