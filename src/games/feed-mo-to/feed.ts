// Feed Mo 'To (algorithms and filter bubbles): you are the recommendation algorithm (docs/SPEC.md section 5).
// Pick one of 3 posts to show the current person. Scary posts win the most clicks (Engagement) but squeeze their feed into
// a bubble (Balanced Feed). Either meter at 0 ends the run. Everything is a pure function of the seed and the picks:
// users and posts come only from the seeded random numbers, never from what the player chose.
import { PALETTE, box, text } from '../engine/draw';
import { createRng, type Rng } from '../engine/rng';
import type { GameDef, GameInstance, GameStats } from '../engine/types';
import { CARD_X, GRID, H, PANEL_LABEL, W, bubbleRadii, cardAt, drawBanner, drawBubble, drawCard, drawChip, drawMeter, drawPerson, layoutChips, meterColor, type Face, type Pos } from './art';
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

const list = (ids: readonly TopicId[]): string => ids.map((id) => topicById(id).name).join(', ');

function noteFor(topic: TopicId, liked: boolean, repeated: boolean): string {
  if (topic === 'scare' || topic === 'miracle') return 'FEAR WINS CLICKS. HER FEED SHRINKS.';
  if (topic === 'clinic') return 'TRUSTED TIP: FEWER CLICKS, WIDER FEED.';
  if (repeated) return 'SAME TOPIC AGAIN. SHE GETS BORED.';
  return liked ? 'SHE LIKES THIS. A STEADY SMALL WIN.' : 'NEW TOPIC! WIDER FEED, FEWER CLICKS.';
}

const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

function createFeed({ rng }: { seed: string; rng: Rng }): GameInstance {
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
  let summary: string[] = [];
  let over = false;
  let score = 0;
  let lastPointer = '';
  const recent: string[] = [];
  const counts = { posts: 0, scary: 0, trusted: 0, timeouts: 0 };
  let crash: Crash = null;

  // animated bubble
  const chipPos = new Map<TopicId, Pos>(GRID);
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
    phase = 'choose';
    phaseMs = 0;
    outcome = null;
  }

  function finishUser() {
    const balanced = isBalanced(meters);
    if (balanced) score += BALANCED_BONUS;
    summary = [`${user.name} IS DONE!`, balanced ? `BALANCED FEED BONUS +${BALANCED_BONUS}` : 'NO BONUS: KEEP BOTH ABOVE 50'];
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
    phase = 'result';
    phaseMs = 0;
  }

  function timeout() {
    const result = evaluateTimeout(meters);
    const delta = result.meters.engagement - meters.engagement;
    meters = result.meters;
    counts.posts += 1;
    counts.timeouts += 1;
    outcome = { chosen: -1, engagementDelta: delta, balanceDelta: 0, points: 0, note: 'TOO SLOW! SHE SCROLLED AWAY.' };
    pendingCrash = result.crash;
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
      const target = (ids.includes(t.id) ? block.pos.get(t.id) : GRID.get(t.id)) as Pos;
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
      timeLeft -= dtMs;
      if (timeLeft <= 0) timeout();
    },

    draw(ctx) {
      box(ctx, PALETTE.cream, 0, 0, W, H);
      box(ctx, PALETTE.navy, 0, H - 4, W, 4);
      drawMeter(ctx, 6, 2, 148, 'ENGAGEMENT', meters.engagement, meterColor(meters.engagement));
      drawMeter(ctx, 166, 2, 148, 'BALANCED FEED', meters.balance, meterColor(meters.balance));

      drawPerson(ctx, 6, 30, user.look, face());
      text(ctx, user.name, 48, 30, { size: 8, color: PALETTE.navy });
      text(ctx, `POST ${Math.max(1, postNo)}/${POSTS_PER_USER}`, 48, 42, { size: 8, color: PALETTE.muted });
      box(ctx, PALETTE.ink, 48, 55, 10, 10);
      box(ctx, PALETTE.gold, 49, 56, 8, 8);
      text(ctx, '= LIKES', 62, 56, { size: 8, color: PALETTE.muted });

      text(ctx, 'FEED BUBBLE', PANEL_LABEL.x, PANEL_LABEL.y, { size: 8, color: PALETTE.ink });
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
        const lines = [
          ...summary.map((t, i) => ({ text: t, color: i === 0 ? PALETTE.navy : t.includes('BONUS +') ? PALETTE.fact : PALETTE.muted })),
          { text: `${summary.length > 0 ? 'NEXT: ' : 'FIRST: '}${user.name}`, color: PALETTE.ink },
          { text: `LIKES ${user.interests.map((t) => topicById(t).chip).join(' ')}`, color: PALETTE.muted },
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
        text(ctx, `PICK A POST FOR ${user.name}`, W / 2, 166, { size: 8, color: PALETTE.ink, align: 'center' });
      } else if (phase === 'result' && outcome) {
        const eng = outcome.engagementDelta;
        text(ctx, `ENGAGEMENT ${signed(eng)}`, 6, 156, { size: 8, color: eng >= 0 ? PALETTE.fact : PALETTE.fake });
        text(ctx, `BALANCE ${signed(outcome.balanceDelta)}`, W - 6, 156, { size: 8, color: outcome.balanceDelta >= 0 ? PALETTE.fact : PALETTE.fake, align: 'right' });
        text(ctx, outcome.note, W / 2, 168, { size: 8, color: PALETTE.ink, align: 'center' });
        if (pendingCrash) {
          drawBanner(
            ctx,
            pendingCrash === 'bubble'
              ? [{ text: 'BUBBLE POPPED!', color: PALETTE.fake }, { text: `${user.name} ONLY SEES` }, { text: 'SCARY POSTS NOW' }]
              : [{ text: 'LOGGED OFF!', color: PALETTE.fake }, { text: `${user.name} GOT BORED` }, { text: 'AND LEFT THE APP' }],
            'fake',
          );
        }
      }
    },

    stats(): GameStats {
      const eng = Math.round(meters.engagement);
      const bal = Math.round(meters.balance);
      const base = `Feed Mo 'To. Score ${score}. Engagement ${eng} percent. Balanced Feed ${bal} percent. ${user.name.toLowerCase()}, post ${Math.max(1, postNo)} of ${POSTS_PER_USER}.`;
      let description: string;
      if (over) {
        description = `${base} The run is over: ${crash === 'bubble' ? 'the feed is now only scary posts' : 'she logged off, bored'}.`;
      } else if (phase === 'intro') {
        description = `${base} ${summary.length > 0 ? `${summary.join('. ').toLowerCase()}. Next up: ` : 'First up: '}${user.name.toLowerCase()}, who likes ${list(user.interests)}. Get ready.`;
      } else if (phase === 'result' && outcome) {
        const post = candidates[outcome.chosen];
        const said = post ? `You showed "${post.text}" ${post.fake ? 'This post is fake.' : post.topic === 'clinic' ? 'This is a trusted health tip.' : ''}` : 'You ran out of time and she scrolled away.';
        description = `${base} ${said} Engagement ${signed(outcome.engagementDelta)}, Balanced Feed ${signed(outcome.balanceDelta)}, ${outcome.points} points. ${outcome.note.toLowerCase()}`;
      } else {
        const options = candidates.map((post, i) => `Option ${i + 1}, ${topicById(post.topic).name}: "${post.text}"`).join(' ');
        description = `${base} She likes ${list(user.interests)}. Her feed still shows ${list(alive())}. ${options} Highlighted: option ${sel + 1}.`;
      }
      return {
        score,
        over,
        hud: [
          { id: 'score', label: 'Score', value: String(score) },
          { id: 'engagement', label: 'Engagement', value: `${eng}%`, meter: eng },
          { id: 'balance', label: 'Balanced Feed', value: `${bal}%`, meter: bal },
        ],
        description,
        recap: over ? buildRecap({ users: userIndex + 1, ...counts, crash }) : [],
      };
    },
  };
}

/** The game-over recap: what happened, then how feeds work, what a filter bubble is and why scary health posts spread. */
export function buildRecap(run: RunSummary): string[] {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const lines = [
    `You curated feeds for ${plural(run.users, 'person', 'people')} and showed ${plural(run.posts, 'post', 'posts')}: ${run.scary} scary or miracle-cure, ${run.trusted} trusted health ${run.trusted === 1 ? 'tip' : 'tips'}${run.timeouts > 0 ? ` and ${plural(run.timeouts, 'time', 'times')} you ran out of time` : ''}.`,
  ];
  if (run.crash === 'bubble') lines.push('Her feed shrank into a bubble: only scary posts were left. That is a filter bubble.');
  else if (run.crash === 'bored') lines.push('She logged off, bored. A feed nobody clicks gets dropped, so real feeds are built to keep you scrolling.');
  lines.push(
    'How it works: a recommendation algorithm guesses what you will click next from what you watched, liked and shared, then shows you more of the same.',
    'A filter bubble is when a feed keeps showing the same kind of posts, so you stop seeing other views and other facts.',
    'Why scary health posts spread: fear and shock make people click, comment and share. The algorithm counts that as good, so it shows them to more people. Spreading fast does not make a post true.',
    'Tip: search on purpose for trusted sources, like your health center or the Department of Health, and follow a few of them.',
    'Tip: when a health post scares you, pause before you share. Check who wrote it and ask a health worker.',
  );
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
    { title: 'Kailan ako magtitiwala?', text: 'Trust a feed that shows you many sides, and search on purpose for trusted sources.', mood: 'happy' },
  ],
  takeaway: 'Kailan ako magtitiwala? When a feed shows me many sides, and I search on purpose for trusted sources.',
  create: createFeed,
};

export default feedMoTo;
