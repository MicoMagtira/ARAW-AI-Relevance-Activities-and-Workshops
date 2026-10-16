// "Tita's GC" content (docs/SPEC.md section 4, Module 5): five branching family group chat scenarios as plain data.
// Every person, page, doctor, product and place is fictional. A scenario is a small graph: turns (what the family says, then the
// player picks) lead to other turns or to one of three endings. `validateScenario` in gcLogic.ts keeps the graph free of dead ends.
// Facts follow docs/CONTENT_GUIDE.md section 3: no doses, no diagnosis, always point to a health worker.

/** Who talks in the chat. `you` is the player. */
export const MEMBERS = ['lola', 'tita', 'jun', 'bea', 'you'] as const;
export type Member = (typeof MEMBERS)[number];

export interface MemberInfo {
  id: Member;
  name: string;
  role: string;
  /** Index into the pixel avatars (src/ui/avatars.ts); the player uses their own avatar. */
  avatar: number;
}

export const CAST: readonly MemberInfo[] = [
  { id: 'lola', name: 'Lola Nena', role: 'Grandmother, takes maintenance medicine', avatar: 2 },
  { id: 'tita', name: 'Tita Baby', role: 'Forwards everything, out of love', avatar: 6 },
  { id: 'jun', name: 'Kuya Jun', role: 'Barangay Health Worker', avatar: 1 },
  { id: 'bea', name: 'Bea', role: 'Student, always online', avatar: 0 },
  { id: 'you', name: 'You', role: 'The one who checks', avatar: 0 },
];

export const memberInfo = (id: Member): MemberInfo => CAST.find((m) => m.id === id) ?? (CAST[0] as MemberInfo);

export interface GcMessage {
  from: Member;
  text: string;
  /** Shown with a "Forwarded" label (the post that arrives in the chat). */
  forwarded?: boolean;
}

/** What each person did with the post. These three flags make the "family ripple". */
export interface RippleState {
  believed: boolean;
  checked: boolean;
  hurt: boolean;
}
export type Ripple = Readonly<Record<Member, RippleState>>;
export type RippleChange = Partial<Record<Member, Partial<RippleState>>>;

/** The mini check that a Verify choice opens: what the player found. */
export interface GcCheck {
  title: string;
  rows: ReadonlyArray<readonly [label: string, value: string]>;
  /** One plain line: what the findings mean. */
  verdict: string;
}

export type ChoiceKind = 'react' | 'verify' | 'reply' | 'forward';
export type Score = 0 | 1 | 2;

export interface GcChoice {
  id: string;
  kind: ChoiceKind;
  /** The button text: what the player does or says. */
  label: string;
  /** What appears in the chat as the player's message. */
  say: string;
  /** How true and useful this is, 0 to 2. Forwarding an unchecked fake is 0. */
  accuracy: Score;
  /** How it lands with the family, 0 to 2. Shaming is 0. */
  kindness: Score;
  /** Why: shown after the pick, for every choice. */
  why: string;
  ripple?: RippleChange;
  /** Required for `verify`, and only there. */
  check?: GcCheck;
  /** The id of the next turn or of an ending. */
  next: string;
}

export interface GcTurn {
  id: string;
  /** The family's lines when the turn starts. */
  messages: readonly GcMessage[];
  /** Question above the choices. */
  prompt: string;
  choices: readonly GcChoice[];
}

export type EndingTier = 'light' | 'mixed' | 'rough';

export interface GcEnding {
  id: string;
  tier: EndingTier;
  title: string;
  text: string;
  /** The last chat lines. */
  messages: readonly GcMessage[];
  /** Ara's closing line. */
  ara: string;
}

export interface GcScenario {
  id: string;
  title: string;
  /** Short setting line, e.g. "Sunday morning". */
  scene: string;
  /** True when the forward is accurate: calibrated trust means saying so too. */
  legit: boolean;
  /** Why the forward is (or is not) trustworthy, shown at the end. */
  lesson: string;
  /** The ripple at the start, before the player does anything. */
  start: Ripple;
  first: string;
  turns: readonly GcTurn[];
  endings: readonly GcEnding[];
  basis: string;
  review_status: 'unreviewed';
}

/* ---------- builders (keep the data below short) ---------- */

const say = (from: Member, text: string): GcMessage => ({ from, text });
const fwd = (from: Member, text: string): GcMessage => ({ from, text, forwarded: true });
const calm: RippleState = { believed: false, checked: false, hurt: false };
const startWith = (change: RippleChange): Ripple => {
  const out = {} as Record<Member, RippleState>;
  for (const m of MEMBERS) out[m] = { ...calm, ...change[m] };
  return out;
};

type Points = readonly [accuracy: Score, kindness: Score];
interface Extra {
  ripple?: RippleChange;
  check?: GcCheck;
}
/** kind, id, button text, chat text, [accuracy, kindness], why, next, extras. */
const pick = (kind: ChoiceKind, id: string, label: string, text: string, pts: Points, why: string, next: string, extra: Extra = {}): GcChoice => ({
  id,
  kind,
  label,
  say: text,
  accuracy: pts[0],
  kindness: pts[1],
  why,
  next,
  ...extra,
});

const ending = (id: string, tier: EndingTier, title: string, text: string, messages: readonly GcMessage[], ara: string): GcEnding => ({ id, tier, title, text, messages, ara });

/* ---------- 1. The miracle tea ---------- */

const TEA_WHO: GcCheck = {
  title: 'Who posted it?',
  rows: [
    ['Page', 'Natural Buhay PH, made 2 weeks ago'],
    ['What it posts', 'Only tea and capsules for sale'],
    ['The "doctor"', 'No official page. The video lives only on this shop page.'],
  ],
  verdict: 'This is a seller, not a source.',
};
const TEA_FDA: GcCheck = {
  title: 'FDA verification portal',
  rows: [
    ['Searched', 'Sambong-Luya Miracle Tea'],
    ['Result', 'No registered product found'],
    ['Label note', 'No "approved therapeutic claims" note anywhere'],
  ],
  verdict: 'A health claim on an unregistered product is a red flag. A tea cannot replace maintenance medicine.',
};

const TEA: GcScenario = {
  id: 'tea',
  title: 'The Miracle Tea',
  scene: 'Family GC, Sunday morning',
  legit: false,
  lesson: 'A seller made the post. No FDA registration, a "doctor" with no official page, and a promise to replace maintenance medicine are all red flags.',
  start: startWith({ tita: { believed: true } }),
  first: 'tea-1',
  basis: 'CONTENT_GUIDE section 3: do not stop maintenance medicine without a doctor; supplements do not replace medicine; check products on the FDA verification portal.',
  review_status: 'unreviewed',
  turns: [
    {
      id: 'tea-1',
      messages: [
        fwd('tita', 'DOCTOR REVEALS: Sambong-Luya Miracle Tea CURES diabetes in 7 days! Throw away your maintenance meds! 100% natural, no side effects! Please share 🙏🙏🙏'),
        say('tita', 'This is for Lola! Love you all!'),
        say('lola', 'Oh, a tea that cures diabetes? Maybe I can stop my pills, dear.'),
      ],
      prompt: 'Lola may stop her pills. What do you do?',
      choices: [
        pick('react', 'tea-1-react', 'React with 🙏', '🙏', [0, 1], 'A quick reaction looks like a yes. Lola reads your 🙏 as "go ahead".', 'tea-2p', { ripple: { lola: { believed: true } } }),
        pick('verify', 'tea-1-who', 'Check who posted it', 'Wait, let me check who posted this first.', [2, 2], 'Great job! You paused and looked at the source first, quietly, without blaming anyone.', 'tea-2v', { ripple: { you: { checked: true } }, check: TEA_WHO }),
        pick('verify', 'tea-1-fda', 'Look the tea up on the FDA portal', 'Let me look up this tea on the FDA portal.', [2, 2], 'A product check is one of the strongest steps. You looked before reacting.', 'tea-2v', { ripple: { you: { checked: true } }, check: TEA_FDA }),
        pick('forward', 'tea-1-fwd', 'Forward it to the Barangay Moms group', 'Forwarded to Barangay Moms', [0, 1], 'You meant well, but sharing an unchecked fake sends it to more people. Accuracy 0.', 'tea-2f', { ripple: { you: { believed: true } } }),
        pick('reply', 'tea-1-sharp', '"Tita, that is FAKE. Stop sharing nonsense!"', 'Tita, that is FAKE. Stop sharing nonsense!', [1, 0], 'It may be fake, but you did not check, and the words sting. Tita shared out of love.', 'tea-2h', { ripple: { tita: { hurt: true } } }),
      ],
    },
    {
      id: 'tea-2v',
      messages: [say('bea', 'So what did you find? Kuya Jun is online too.'), say('jun', 'Hello! What is happening here?'), say('lola', 'Baby says it is natural, so it must be safe, right?')],
      prompt: 'You checked. How do you answer?',
      choices: [
        pick('reply', 'tea-2v-kind', '"Thank you for caring, Tita! I checked: the tea has no FDA registration. Lola, please keep your medicine, and let us ask Kuya Jun."', 'Thank you for caring, Tita! I checked: the tea has no FDA registration and the page is a seller. Lola, please keep taking your medicine, and let us ask Kuya Jun first.', [2, 2], 'Warm first, then facts, a source and a next step. Kindness keeps the family listening.', 'tea-end-light', { ripple: { tita: { believed: false, checked: true }, lola: { believed: false }, jun: { checked: true } } }),
        pick('forward', 'tea-2v-quote', 'Share the tea post again with "FAKE" on top', 'Forwarded again: FAKE! DO NOT BUY!', [1, 1], 'Quote-sharing spreads the fake further, and many only see the post. Better to reply and share the right facts.', 'tea-end-mixed', { ripple: { tita: { hurt: true }, lola: { believed: false } } }),
        pick('reply', 'tea-2v-shame', '"Tita, you got scammed. Please check before you share."', 'Tita, you got scammed. Please check before you share.', [2, 0], 'Right facts, but shaming makes people hide and stop listening.', 'tea-end-mixed', { ripple: { tita: { hurt: true }, lola: { believed: false } } }),
      ],
    },
    {
      id: 'tea-2p',
      messages: [say('lola', 'Oh, thank you, Baby! Amen! I will start the tea tomorrow and stop my pills.'), say('bea', 'Wait... is that safe? You reacted 🙏 too, Ate.')],
      prompt: 'Lola read your 🙏 as a yes. What now?',
      choices: [
        pick('verify', 'tea-2p-fda', 'Say "Wait, Lola!" and look up the tea on the FDA portal', 'Wait, Lola! Let me look this tea up first.', [2, 2], 'Good catch, and in time. It is never too late to pause and check.', 'tea-end-mixed', { ripple: { you: { checked: true }, lola: { believed: false } }, check: TEA_FDA }),
        pick('reply', 'tea-2p-sorry', '"Sorry, I only reacted out of love. Lola, please talk to Kuya Jun before you stop any pills."', 'Sorry, I only reacted because I love you all. Lola, please talk to Kuya Jun before you stop any pills.', [2, 2], 'An honest sorry and a safe next step. You turned your reaction around.', 'tea-end-mixed', { ripple: { lola: { believed: false }, jun: { checked: true } } }),
        pick('react', 'tea-2p-again', 'Send another 🙏 and leave the chat', '🙏', [0, 1], 'Silence reads as agreement. Lola still thinks the tea is safe.', 'tea-end-rough', { ripple: { lola: { believed: true } } }),
      ],
    },
    {
      id: 'tea-2f',
      messages: [say('bea', 'Ate, you forwarded it too? Two aunties already asked me where to buy.'), say('jun', 'I saw this tea in two other groups. Who sent it first?')],
      prompt: 'Your forward has spread. What do you do?',
      choices: [
        pick('verify', 'tea-2f-fix', 'Check it now, then post a kind correction in both groups', 'I should have checked first. I looked it up: this tea has no FDA registration. Please do not stop any medicine. Ask Kuya Jun.', [2, 2], 'Owning a mistake and fixing it is brave. Some people already saw the first post, so the ripple is only half undone.', 'tea-end-mixed', { ripple: { you: { checked: true, believed: false }, jun: { checked: true } }, check: TEA_FDA }),
        pick('reply', 'tea-2f-quiet', 'Say nothing. It will blow over', 'Haha, no worries everyone.', [0, 1], 'It will not blow over. People are still reading it and some may buy the tea.', 'tea-end-rough'),
        pick('forward', 'tea-2f-more', 'Forward it to a third group too', 'Forwarded to the Friends Group', [0, 1], 'More shares mean more people who may skip their medicine.', 'tea-end-rough'),
      ],
    },
    {
      id: 'tea-2h',
      messages: [say('tita', 'Oh, sorry... I only wanted to help Lola. 😢'), say('lola', 'Baby, do not cry. But is it fake, dear?'), say('bea', 'Ate, maybe say it nicely? Let us check it first.')],
      prompt: 'Tita is hurt, and you never checked. Repair it?',
      choices: [
        pick('reply', 'tea-2h-sorry', '"Sorry, Tita, I was harsh. Thank you for caring! I looked it up: no FDA registration. Let us ask Kuya Jun together."', 'Sorry Tita, I was harsh. Thank you for caring! I looked it up: no FDA registration. Let us ask Kuya Jun together.', [2, 2], 'A real sorry, then the facts. You mended the hurt without dropping the truth.', 'tea-end-mixed', { ripple: { tita: { hurt: false, believed: false }, you: { checked: true }, lola: { believed: false } } }),
        pick('verify', 'tea-2h-check', 'Check it together: who posted it, then the FDA portal', 'Let us check it together. Who posted it? Is it on the FDA list?', [2, 2], 'Checking together turns blame into teamwork.', 'tea-end-mixed', { ripple: { tita: { hurt: false, checked: true }, you: { checked: true }, lola: { believed: false } }, check: TEA_FDA }),
        pick('reply', 'tea-2h-double', '"I said it is fake. Just believe me."', 'I said it is fake. Just believe me.', [1, 0], 'Believe me is not a reason. Tita is still hurt, and Lola still does not know why it is fake.', 'tea-end-rough', { ripple: { lola: { believed: true } } }),
      ],
    },
  ],
  endings: [
    ending('tea-end-light', 'light', "Lola keeps her pills", 'You checked first and answered kindly. Lola keeps taking her medicine, Kuya Jun will check her blood sugar at the health center, and Tita feels proud she started the talk.', [say('lola', 'Thank you, dear. I will keep my pills, and see Kuya Jun on Monday.'), say('tita', 'Next time I will check first too. Thank you, okay? ❤️')], "Family's Light! You were warm and you were right."),
    ending('tea-end-mixed', 'mixed', 'A close call', 'The family got the right facts in the end, but not everyone was spared. Someone felt hurt, or a few people saw the fake first. A kinder, earlier check would have been smoother.', [say('jun', 'Good that we caught it. Lola, please do not stop any medicine. Visit me at the health center.'), say('bea', 'Ate, next time check first, then reply. 😅')], 'So close to perfect! Pause, check, then reply kindly.'),
    ending('tea-end-rough', 'rough', 'The ripple grows', 'The fake kept going. Lola started the tea and skipped her pills. Kuya Jun noticed during a house visit and took her to see a doctor. She is okay, but it did not need to happen.', [say('jun', 'Lola, please never stop your medicine without your doctor. Let us go to the health center now.'), say('lola', 'Oh, sorry, dear. I thought it was safe.')], 'It is not your fault, friend. Let us try again: pause, check, reply kindly.'),
  ],
};

/* ---------- 2. Share before it is deleted ---------- */

const FEVER_WHO: GcCheck = {
  title: 'Who posted it?',
  rows: [
    ['Author', 'None. It says "forwarded many times".'],
    ['Date', 'No date. The same text went around last year with a different city name.'],
    ['Style', 'ALL CAPS, many "!!!" and "share before it is deleted"'],
  ],
  verdict: 'A copied chain message. Fear and a deadline are the trick.',
};
const FEVER_DOH: GcCheck = {
  title: 'DOH official page',
  rows: [
    ['Searched', 'The DOH official page and your health center notice board'],
    ['Result', 'No advisory about a "killer fever" or full hospitals'],
    ['Advice there', 'Real health alerts are posted by name, with a date, and tell you where to go'],
  ],
  verdict: 'No trusted source says this. A real alert would be posted there too.',
};

const FEVER: GcScenario = {
  id: 'fever',
  title: 'Share Before It Is Deleted',
  scene: 'Family GC, late evening',
  legit: false,
  lesson: 'It has no author, no date, no source, a copied city name and a deadline. The deadline is the trick: it pushes you to share before you check.',
  start: startWith({ tita: { believed: true } }),
  first: 'fever-1',
  basis: 'CONTENT_GUIDE section 4 (Fear Monger): a strong feeling and a deadline are the cue to pause and check; real alerts come from official pages.',
  review_status: 'unreviewed',
  turns: [
    {
      id: 'fever-1',
      messages: [
        fwd('tita', 'URGENT!!! NEW KILLER FEVER in our city! Hospitals are FULL and HIDING the numbers! SHARE to 10 groups before they DELETE this!!! 😱'),
        say('tita', 'Please everyone, stay safe!'),
        say('bea', 'Oh no, should I tell my classmates? Should the kids stay home tomorrow?'),
      ],
      prompt: 'Everyone is scared. What do you do first?',
      choices: [
        pick('react', 'fever-1-react', 'React with 😱', '😱', [0, 1], 'Panic spreads fast. Your reaction tells Bea this is serious and true.', 'fever-2p', { ripple: { bea: { believed: true } } }),
        pick('verify', 'fever-1-who', 'Check who posted it and when', 'Wait, who wrote this? Is there a date?', [2, 2], 'Pausing is Step 1, and asking who said it is Step 2. Nicely done.', 'fever-2v', { ripple: { you: { checked: true } }, check: FEVER_WHO }),
        pick('verify', 'fever-1-doh', 'Look on the DOH official page', 'Let me check the DOH official page first.', [2, 2], 'Going to the official page yourself is the best "another source" check.', 'fever-2v', { ripple: { you: { checked: true } }, check: FEVER_DOH }),
        pick('forward', 'fever-1-fwd', 'Share it to 10 groups, as it says', 'Forwarded to 10 groups', [0, 1], 'You wanted to protect people, but you spread an unchecked scare. Accuracy 0.', 'fever-2f', { ripple: { you: { believed: true }, bea: { believed: true } } }),
        pick('reply', 'fever-1-sharp', '"Tita, this is a hoax! Stop spamming us!"', 'Tita, this is a hoax! Stop spamming us!', [1, 0], 'It might be a hoax, but you had not checked yet, and "spamming" hurts.', 'fever-2h', { ripple: { tita: { hurt: true } } }),
      ],
    },
    {
      id: 'fever-2v',
      messages: [say('jun', 'Hello! I am at the health center. We have no notice about this.'), say('bea', 'So should we stay home tomorrow?'), say('tita', 'But it said they would delete it! 😢')],
      prompt: 'You checked. How do you reply to Tita?',
      choices: [
        pick('reply', 'fever-2v-kind', '"Thanks for looking out for us, Tita! I checked: the DOH page has no such alert, and the same message went around last year. If someone has a fever that will not go away, go to the health center."', 'Thanks for looking out for us, Tita! I checked: there is no such alert on the DOH page, and this same message went around last year. If anyone has a fever that will not go away, go to the health center.', [2, 2], 'Warm, factual, with a source and a safe next step. Kuya Jun backs you up.', 'fever-end-light', { ripple: { tita: { believed: false, checked: true }, bea: { believed: false }, jun: { checked: true } } }),
        pick('forward', 'fever-2v-quote', 'Share the post again with "HOAX!" on top, to warn others', 'Forwarded again: HOAX!! DO NOT BELIEVE THIS!!', [1, 1], 'Quote-sharing carries the scary post to more people. Reply and share the right information instead.', 'fever-end-mixed', { ripple: { tita: { hurt: true }, bea: { believed: false } } }),
        pick('reply', 'fever-2v-shame', '"Tita, you fall for every hoax. Please stop."', 'Tita, you fall for every hoax. Please stop.', [2, 0], 'You are right about the post, but the shame makes Tita hide.', 'fever-end-mixed', { ripple: { tita: { hurt: true }, bea: { believed: false } } }),
      ],
    },
    {
      id: 'fever-2p',
      messages: [say('bea', 'You reacted 😱 too, so it is real. I will tell my classmates not to go to school.'), say('jun', 'Hello? I have not seen any notice. Where did this come from?')],
      prompt: 'Bea is about to pass it on. Step in?',
      choices: [
        pick('verify', 'fever-2p-doh', 'Say "Wait, Bea!" and check the DOH page', 'Wait, Bea! Let me check the DOH page first.', [2, 2], 'Good. You stopped a second forward in time.', 'fever-end-mixed', { ripple: { you: { checked: true }, bea: { believed: false } }, check: FEVER_DOH }),
        pick('reply', 'fever-2p-sorry', '"Sorry, my 😱 was just a reaction. Please do not forward yet. Let us ask Kuya Jun."', 'Sorry, my 😱 was only a reaction. Please do not forward yet. Let us ask Kuya Jun.', [2, 2], 'An honest correction. You did not blame Bea.', 'fever-end-mixed', { ripple: { bea: { believed: false }, jun: { checked: true } } }),
        pick('react', 'fever-2p-again', 'React with 😱 again and say nothing', '😱', [0, 1], 'More panic and no facts. Bea shares it.', 'fever-end-rough', { ripple: { bea: { believed: true } } }),
      ],
    },
    {
      id: 'fever-2f',
      messages: [say('bea', 'Ate, my classmates are panicking. Some say they will not go to school!'), say('jun', 'I have had three calls asking about a "killer fever". There is no notice at all.')],
      prompt: 'Your forward caused real worry. What now?',
      choices: [
        pick('verify', 'fever-2f-fix', 'Check the DOH page, then post a calm correction in every group', 'I forwarded without checking. I looked at the DOH page: there is no such alert. Please stay calm, and ask your health worker if you have questions.', [2, 2], 'A calm correction is the right fix. Some people saw the scare first, so it only half undoes.', 'fever-end-mixed', { ripple: { you: { checked: true, believed: false }, bea: { believed: false }, jun: { checked: true } }, check: FEVER_DOH }),
        pick('reply', 'fever-2f-quiet', 'Say "sorry, I just forwarded it" and leave it', 'Sorry, I just forwarded it.', [0, 1], 'Owning it is good, but without a correction the scare keeps going.', 'fever-end-rough'),
        pick('forward', 'fever-2f-more', 'Forward it once more, "just in case it is true"', 'Forwarded again, just in case', [0, 1], '"Just in case" is how hoaxes survive. Check first, then share.', 'fever-end-rough'),
      ],
    },
    {
      id: 'fever-2h',
      messages: [say('tita', 'Sorry... I only wanted to warn everyone. 😢'), say('bea', 'Ate, you did not even check it. Is it a hoax, or not?'), say('jun', 'Let us be calm, everyone.')],
      prompt: 'You called it a hoax without checking. Repair it?',
      choices: [
        pick('reply', 'fever-2h-sorry', '"Sorry, Tita, that was harsh. Thank you for warning us! I checked: no DOH alert like this. Let us ask Kuya Jun."', 'Sorry Tita, that was harsh. Thank you for warning us! I checked: there is no DOH alert like this. Let us ask Kuya Jun.', [2, 2], 'A real sorry and the facts together. Tita feels heard.', 'fever-end-mixed', { ripple: { tita: { hurt: false, believed: false }, you: { checked: true }, bea: { believed: false } } }),
        pick('verify', 'fever-2h-check', 'Check it together on the DOH page', 'Let us check it together. Is there anything on the DOH page?', [2, 2], 'Checking together turns the quarrel into teamwork.', 'fever-end-mixed', { ripple: { tita: { hurt: false, checked: true }, you: { checked: true }, bea: { believed: false } }, check: FEVER_DOH }),
        pick('reply', 'fever-2h-double', '"It is obviously a hoax. Do not be gullible."', 'It is obviously a hoax. Do not be gullible.', [1, 0], 'Calling someone gullible is shaming. It also gives Bea no way to check for herself.', 'fever-end-rough', { ripple: { bea: { believed: true } } }),
      ],
    },
  ],
  endings: [
    ending('fever-end-light', 'light', 'The family stays calm', 'You paused and checked, then answered kindly. Bea does not forward it, the kids go to school, and Tita says she will look for the official page next time.', [say('tita', 'Thank you, dear. I get scared easily. I will check first next time. ❤️'), say('bea', 'I almost sent it to everyone! Pause first, okay.')], "Family's Light! A calm reply beat a scary post."),
    ending('fever-end-mixed', 'mixed', 'A bumpy evening', 'The hoax stopped in the family, but it left a mark. Someone felt hurt, or a few people saw the scare before the correction. Checking earlier would have helped.', [say('jun', 'Thank you all for checking. If someone has a fever that will not go away, come to the health center.'), say('tita', 'Okay. Next time I will ask first.')], 'So close! You got there. Pause first, then reply kindly.'),
    ending('fever-end-rough', 'rough', 'The scare spreads', 'The message went to more groups. Several families kept their kids home out of fear, and Kuya Jun spent the next day answering calls. No one is to blame. Fear is fast.', [say('jun', 'Everyone, there is no such fever alert. Please check the official pages before sharing.'), say('bea', 'Oh no, I told my whole class... 😬')], 'Fear spreads fast, friend. A calm check and a kind reply spread truth. Try again?'),
  ],
};

/* ---------- 3. The doctor who is not a doctor ---------- */

const DOC_WHO: GcCheck = {
  title: "The doctor's own page",
  rows: [
    ['Where the video lives', 'Only on "Joint Care PH Shop", which sells the capsule'],
    ['Dr. Reyes\'s official page', 'Does not have this video'],
    ['A pinned post there', '"Someone is using my face and voice. I never sell any product."'],
  ],
  verdict: 'Fake videos can look real. Do not trust the face. Check the source.',
};
const DOC_FDA: GcCheck = {
  title: 'FDA verification portal',
  rows: [
    ['Searched', 'Joint-Care Gold Capsule'],
    ['Result', 'No registered product found'],
    ['Claim on the post', '"Removes joint pain for good" and "50% off today only"'],
  ],
  verdict: 'No registration plus a big promise and a hurry-up sale: a red flag.',
};

const DOC: GcScenario = {
  id: 'doctor',
  title: 'The Doctor Who Is Not',
  scene: 'Family GC, Saturday afternoon',
  legit: false,
  lesson: 'The "doctor" was a faked video on a sales page. Real doctors have official pages, products need FDA registration, and "today only" is a pressure trick.',
  start: startWith({ tita: { believed: true }, lola: { believed: true } }),
  first: 'doc-1',
  basis: 'CONTENT_GUIDE section 3: videos and voices can be faked, so check the source; a doctor endorsing an unregistered miracle product is a red flag.',
  review_status: 'unreviewed',
  turns: [
    {
      id: 'doc-1',
      messages: [
        fwd('tita', 'WATCH: Dr. Reyes says ONE capsule a day removes joint pain for good! 50% off TODAY ONLY. Message the shop to order! 🙏'),
        say('lola', 'My knees hurt so much. I will order two bottles, dear. Look, he is a real doctor!'),
        say('bea', 'The video looks so real. Even his voice! 😮'),
      ],
      prompt: 'Lola wants to order. What do you do?',
      choices: [
        pick('react', 'doc-1-react', 'React with 👍', '👍', [0, 1], 'Your 👍 tells Lola it is okay to order.', 'doc-2p', { ripple: { lola: { believed: true } } }),
        pick('verify', 'doc-1-who', "Look for the doctor's own official page", "Let me look for Dr. Reyes's own page first.", [2, 2], 'Check the source, not the face. That is the best counter to a fake doctor.', 'doc-2v', { ripple: { you: { checked: true } }, check: DOC_WHO }),
        pick('verify', 'doc-1-fda', 'Search the capsule on the FDA portal', 'Let me search this capsule on the FDA portal.', [2, 2], 'A product check works even when the video looks real.', 'doc-2v', { ripple: { you: { checked: true } }, check: DOC_FDA }),
        pick('forward', 'doc-1-fwd', 'Forward the video to Lola\'s friends GC', 'Forwarded to Lola\'s Friends GC', [0, 1], 'Sending it on lets a deepfake reach more people. Accuracy 0.', 'doc-2f', { ripple: { you: { believed: true } } }),
        pick('reply', 'doc-1-sharp', '"Lola, you will fall for any scam!"', 'Lola, you will fall for any scam!', [1, 0], 'That stings, and you have not checked yet. Lola may stop listening.', 'doc-2h', { ripple: { lola: { hurt: true } } }),
      ],
    },
    {
      id: 'doc-2v',
      messages: [say('bea', 'Wait, so the doctor never said it? It looked so real!'), say('lola', 'But I saw his face and heard his voice...'), say('jun', 'Hello! Anything I can help with?')],
      prompt: 'You checked. How do you answer Lola?',
      choices: [
        pick('reply', 'doc-2v-kind', '"I know it looks real, Lola. Faces and voices can be faked now. The real Dr. Reyes says he never sells anything, and the capsule has no FDA registration. Let us ask Kuya Jun about your knees."', 'I know it looks real, Lola. Faces and voices can be faked now. The real Dr. Reyes says he never sells anything, and the capsule has no FDA registration. Let us ask Kuya Jun about your knees.', [2, 2], 'You explained why it looked real, gave two checks, and offered a real person to help.', 'doc-end-light', { ripple: { lola: { believed: false, checked: true }, tita: { believed: false }, jun: { checked: true } } }),
        pick('forward', 'doc-2v-quote', 'Share the video again with "DEEPFAKE" on top', 'Forwarded again: DEEPFAKE!! Do not order!', [1, 1], 'Sharing the fake video again gives it more views. Share the facts instead.', 'doc-end-mixed', { ripple: { lola: { believed: false }, tita: { hurt: true } } }),
        pick('reply', 'doc-2v-shame', '"Lola, you should know better than to trust videos."', 'Lola, you should know better than to trust videos.', [2, 0], 'Your facts are right, but this blames Lola for something even experts find hard.', 'doc-end-mixed', { ripple: { lola: { believed: false, hurt: true } } }),
      ],
    },
    {
      id: 'doc-2p',
      messages: [say('lola', 'Thank you, dear! You say it is good too. I will order two bottles now.'), say('bea', 'Ate, are you sure? He is selling it...')],
      prompt: 'Lola is about to send money. Step in?',
      choices: [
        pick('verify', 'doc-2p-who', "Say \"Wait, Lola!\" and look for the doctor's page", "Wait, Lola! Let me look for the doctor's own page first.", [2, 2], 'Good. You caught it before the money went out.', 'doc-end-mixed', { ripple: { you: { checked: true }, lola: { believed: false } }, check: DOC_WHO }),
        pick('reply', 'doc-2p-sorry', '"Sorry, my 👍 was too quick. Lola, please hold off and ask Kuya Jun about your knees first."', 'Sorry, my 👍 was too quick. Lola, please hold off and ask Kuya Jun about your knees first.', [2, 2], 'An honest correction with a person to ask.', 'doc-end-mixed', { ripple: { lola: { believed: false }, jun: { checked: true } } }),
        pick('react', 'doc-2p-again', 'Say "Okay, Lola" and leave it', 'Okay, Lola.', [0, 1], 'Agreeing hands Lola over to the seller.', 'doc-end-rough', { ripple: { lola: { believed: true } } }),
      ],
    },
    {
      id: 'doc-2f',
      messages: [say('bea', 'Ate, Lola\'s friends are asking for the shop number!'), say('jun', 'I saw that video in another group. Is it real?')],
      prompt: 'The deepfake is spreading from your forward. What now?',
      choices: [
        pick('verify', 'doc-2f-fix', 'Check the doctor\'s page and post a kind correction', 'Sorry, I should have checked first. Dr. Reyes\'s own page says that video is fake. Please do not order. Ask your health worker about joint pain.', [2, 2], 'A kind, clear correction. Some friends already saw the first one.', 'doc-end-mixed', { ripple: { you: { checked: true, believed: false }, jun: { checked: true } }, check: DOC_WHO }),
        pick('reply', 'doc-2f-quiet', 'Say "Oh, sorry!" and nothing else', 'Oh, sorry!', [0, 1], 'Sorry alone does not tell anyone the video is fake.', 'doc-end-rough'),
        pick('forward', 'doc-2f-more', 'Send the shop number to the friends who asked', 'Forwarded: the shop number', [0, 1], 'This sends people straight to the seller, and maybe their money.', 'doc-end-rough'),
      ],
    },
    {
      id: 'doc-2h',
      messages: [say('lola', 'Hmph. I only wanted my knees to feel better...'), say('tita', 'Dear, be kind to Lola.'), say('bea', 'Maybe look first before saying that, Ate.')],
      prompt: 'Lola feels scolded. Repair it?',
      choices: [
        pick('reply', 'doc-2h-sorry', '"Sorry, Lola, I was rude. I know your knees hurt. I looked: the capsule has no FDA registration. Can we ask Kuya Jun about it?"', 'Sorry Lola, I was rude. I know your knees hurt. I looked: the capsule has no FDA registration. Can we ask Kuya Jun about it?', [2, 2], 'You honoured Lola\'s pain, then gave facts and a person to ask.', 'doc-end-mixed', { ripple: { lola: { hurt: false, believed: false }, you: { checked: true } } }),
        pick('verify', 'doc-2h-check', 'Check the doctor\'s page together with Lola', 'Lola, let us look at the doctor\'s own page together.', [2, 2], 'Looking together shows Lola how to check, which is a gift.', 'doc-end-mixed', { ripple: { lola: { hurt: false, checked: true, believed: false }, you: { checked: true } }, check: DOC_WHO }),
        pick('reply', 'doc-2h-double', '"I am only telling the truth. Do not order it."', 'I am only telling the truth. Do not order it.', [1, 0], 'It leaves Lola hurt and with no reason to trust you.', 'doc-end-rough', { ripple: { lola: { believed: true } } }),
      ],
    },
  ],
  endings: [
    ending('doc-end-light', 'light', 'Lola asks Kuya Jun', 'You checked the source and answered with care. Lola cancels the order and goes to the health center, where Kuya Jun helps her plan a check-up for her knees.', [say('lola', 'Oh, it looked so real. Thank you, dear. I will see Kuya Jun on Monday.'), say('bea', 'Faces can be faked, check the source. Got it!')], "Family's Light! You taught the check, not just the answer."),
    ending('doc-end-mixed', 'mixed', 'Almost ordered', 'Lola did not buy the capsule, but the video made it to a few other groups, or Lola felt scolded. A calm, early check keeps everyone closer.', [say('jun', 'Lola, do not buy it. Let me look at your knees at the health center.'), say('lola', 'Okay, Jun. Thank you.')], 'So close! Kind and early is the combo.'),
    ending('doc-end-rough', 'rough', 'The order goes through', 'Lola sent money to the shop and the bottles never came. The family is sad but safe. Kuya Jun helped them report the shop, and Lola will see a real doctor about her knees.', [say('jun', 'Let us report the shop and keep your messages. If someone asks for money, call the cybercrime hotline, 1326.'), say('lola', 'Sorry, dear. I trusted the video.')], 'A faked video can fool anyone. We still have a way to fix it. Try again?'),
  ],
};

/* ---------- 4. One neighbour's story ---------- */

const COUGH_WHO: GcCheck = {
  title: 'Who told this story?',
  rows: [
    ['Name', '"A neighbour of a friend of Tita\'s friend"'],
    ['Date and place', 'None given'],
    ['Evidence', 'One story. No health worker is mentioned.'],
  ],
  verdict: 'One passed-along story is not evidence. It could be true, and it could be one lucky case.',
};
const COUGH_JUN: GcCheck = {
  title: 'Ask Kuya Jun',
  rows: [
    ['Question', 'Can garlic tea cure a long cough?'],
    ['Kuya Jun says', 'A cough that lasts 2 weeks or more should be checked at the health center for TB.'],
    ['Good news', 'TB can be cured with complete treatment, and it is free at the health center.'],
  ],
  verdict: 'A long cough needs a health worker, not a home remedy.',
};

const COUGH: GcScenario = {
  id: 'cough',
  title: "Aling Cora's Garlic Tea",
  scene: 'Family GC, rainy afternoon',
  legit: false,
  lesson: 'One person\'s story is not proof. A cough that lasts 2 weeks or more should be checked by a health worker, and a home remedy can delay that check.',
  start: startWith({ tita: { believed: true }, bea: { believed: true } }),
  first: 'cough-1',
  basis: 'CONTENT_GUIDE section 3: a cough lasting two weeks or more should be checked for TB; TB is curable and treatment is free at health centers. Section 4 (Kwento Kim).',
  review_status: 'unreviewed',
  turns: [
    {
      id: 'cough-1',
      messages: [
        fwd('tita', 'Aling Cora was coughing for 3 months. She drank garlic tea and skipped the health center. SHE GOT WELL! Try it! 🙏'),
        say('bea', 'Papa has coughed for three weeks. Maybe we try the garlic tea first?'),
      ],
      prompt: "Bea's father has had a cough for three weeks. What do you do?",
      choices: [
        pick('react', 'cough-1-react', 'React with ❤️', '❤️', [0, 2], 'A kind reaction, but it also cheers on the garlic tea, and Papa still has a cough.', 'cough-2p', { ripple: { bea: { believed: true } } }),
        pick('verify', 'cough-1-who', 'Ask where this story came from', 'Tita, who is Aling Cora? Where did you hear this?', [2, 2], 'A friendly question, with no blame. You found that it is a story with no name or date.', 'cough-2v', { ripple: { you: { checked: true } }, check: COUGH_WHO }),
        pick('verify', 'cough-1-jun', 'Ask Kuya Jun about a long cough', 'Kuya Jun, is it okay to treat a long cough with garlic tea?', [2, 2], 'Asking a real person you can trust is Step 2 at its best.', 'cough-2v', { ripple: { you: { checked: true }, jun: { checked: true } }, check: COUGH_JUN }),
        pick('forward', 'cough-1-fwd', 'Forward the story to the Barangay Moms group', 'Forwarded to Barangay Moms', [0, 1], 'A story that tells people to skip the health center is risky to spread. Accuracy 0.', 'cough-2f', { ripple: { you: { believed: true } } }),
        pick('reply', 'cough-1-sharp', '"Tita, a story is not proof. That is dangerous!"', 'Tita, one story is not proof. That is dangerous advice!', [1, 0], 'Right idea, but you have not checked, and it is said sharply.', 'cough-2h', { ripple: { tita: { hurt: true } } }),
      ],
    },
    {
      id: 'cough-2v',
      messages: [say('bea', 'So... should Papa go to the health center?'), say('tita', 'But Aling Cora really got better! I only wanted to help.'), say('jun', 'I can see Papa any weekday.')],
      prompt: 'You checked. How do you answer Tita and Bea?',
      choices: [
        pick('reply', 'cough-2v-kind', '"Tita, I love that you want to help! A story is nice, but a cough of 3 weeks needs a check. Bea, please bring Papa to Kuya Jun. The TB test is free."', 'Tita, I love that you want to help! A story is nice, but a cough of 3 weeks needs a check. Bea, please bring Papa to Kuya Jun at the health center. The tests are free.', [2, 2], 'Warm, specific and with a free next step. No one is blamed.', 'cough-end-light', { ripple: { tita: { believed: false, checked: true }, bea: { believed: false }, jun: { checked: true } } }),
        pick('forward', 'cough-2v-quote', 'Share the story again with "NOT PROOF!" on top', 'Forwarded again: NOT PROOF! DO NOT TRY!', [1, 1], 'Sharing the story again keeps it travelling. Share what the health worker said instead.', 'cough-end-mixed', { ripple: { tita: { hurt: true }, bea: { believed: false } } }),
        pick('reply', 'cough-2v-shame', '"Tita, stop spreading stories that can hurt people."', 'Tita, stop spreading stories that can hurt people.', [2, 0], 'Right about the risk, but it blames Tita instead of helping her.', 'cough-end-mixed', { ripple: { tita: { hurt: true }, bea: { believed: false } } }),
      ],
    },
    {
      id: 'cough-2p',
      messages: [say('bea', 'Thanks, Ate! I will buy garlic tonight and make Papa drink tea.'), say('jun', 'Hello. Is somebody coughing for a long time?')],
      prompt: 'Bea will try the tea instead of the health center. Step in?',
      choices: [
        pick('verify', 'cough-2p-jun', 'Say "Wait, Bea!" and ask Kuya Jun', 'Wait, Bea! Let us ask Kuya Jun first.', [2, 2], 'Good. You stopped the delay before it started.', 'cough-end-mixed', { ripple: { you: { checked: true }, jun: { checked: true }, bea: { believed: false } }, check: COUGH_JUN }),
        pick('reply', 'cough-2p-sorry', '"Sorry, Bea, my ❤️ was only for Tita. Please take Papa to the health center for a check first."', 'Sorry Bea, my ❤️ was for Tita, not for the tea. Please take Papa to the health center for a check first.', [2, 2], 'An honest correction with a clear next step.', 'cough-end-mixed', { ripple: { bea: { believed: false }, jun: { checked: true } } }),
        pick('react', 'cough-2p-again', 'Send another ❤️ and stay quiet', '❤️', [0, 1], 'No correction was made. Papa\'s check is delayed.', 'cough-end-rough', { ripple: { bea: { believed: true } } }),
      ],
    },
    {
      id: 'cough-2f',
      messages: [say('bea', 'Ate, two moms in that group said they will skip the health center too.'), say('jun', 'I saw the Aling Cora story in the Moms group. Please check before you forward.')],
      prompt: 'Your forward told people to skip the health center. What now?',
      choices: [
        pick('verify', 'cough-2f-fix', 'Ask Kuya Jun, then post a kind correction', 'Sorry, I forwarded this too fast. Kuya Jun says a cough of 2 weeks or more should be checked at the health center, and the tests are free. Please go.', [2, 2], 'A clear, kind correction. Some moms already saw the first post.', 'cough-end-mixed', { ripple: { you: { checked: true, believed: false }, jun: { checked: true } }, check: COUGH_JUN }),
        pick('reply', 'cough-2f-quiet', 'Say "Oh, sorry" and nothing else', 'Oh, sorry.', [0, 1], 'Without the correction, people still believe the story.', 'cough-end-rough'),
        pick('forward', 'cough-2f-more', 'Forward it to another group to be safe', 'Forwarded to the Friends Group', [0, 1], 'More shares mean more people who may skip their check-up.', 'cough-end-rough'),
      ],
    },
    {
      id: 'cough-2h',
      messages: [say('tita', 'Oh... I only meant to help Bea\'s Papa. 😢'), say('bea', 'Ate, please be gentle. But is it safe or not?'), say('jun', 'Let us talk calmly.')],
      prompt: 'You spoke sharply before you checked. Repair it?',
      choices: [
        pick('reply', 'cough-2h-sorry', '"Sorry, Tita, I was sharp. Thank you for wanting to help! I asked: a cough of 3 weeks should be checked at the health center."', 'Sorry Tita, I was sharp. Thank you for wanting to help! I asked: a cough of 3 weeks should be checked at the health center.', [2, 2], 'A real sorry, then the right advice. Tita and Bea both feel heard.', 'cough-end-mixed', { ripple: { tita: { hurt: false, believed: false }, you: { checked: true }, bea: { believed: false } } }),
        pick('verify', 'cough-2h-jun', 'Ask Kuya Jun together in the chat', 'Let us ask Kuya Jun together. Is it okay to treat a long cough at home?', [2, 2], 'Asking together turns the quarrel into teamwork.', 'cough-end-mixed', { ripple: { tita: { hurt: false, checked: true }, you: { checked: true }, jun: { checked: true }, bea: { believed: false } }, check: COUGH_JUN }),
        pick('reply', 'cough-2h-double', '"I said it is dangerous. Just trust me."', 'I said it is dangerous. Just trust me.', [1, 0], 'No reason given, and Tita is still hurt. Bea may try the tea anyway.', 'cough-end-rough', { ripple: { bea: { believed: true } } }),
      ],
    },
  ],
  endings: [
    ending('cough-end-light', 'light', 'Papa gets checked', 'You kept it kind and specific. Bea takes Papa to the health center this week, and Tita learns to ask "who says so?" before she shares.', [say('bea', 'We are going to the health center on Monday. Thank you, Ate!'), say('tita', 'Thank you, dear. I will not forward stories like that anymore. ❤️')], "Family's Light! A free check beats a nice story."),
    ending('cough-end-mixed', 'mixed', 'Caught in time', 'Papa will get checked, but Tita felt hurt, or the story reached a few other groups first. A calm early check would have kept it smoother.', [say('jun', 'Bea, bring Papa to the health center. The tests are free. See you!'), say('tita', 'Okay, sorry for the trouble.')], 'So close! A calm, early check keeps everyone close.'),
    ending('cough-end-rough', 'rough', 'The check is delayed', 'Papa kept coughing and drank garlic tea for two more weeks. Kuya Jun finally persuaded him to go to the health center. Nobody is to blame, but the delay was avoidable.', [say('jun', 'Let us get Papa checked this week. Please remember: 2 weeks or more of coughing needs a check.'), say('bea', 'Sorry, Papa. We should have gone sooner.')], 'It is not your fault, friend. One story felt convincing. Try again?'),
  ],
};

/* ---------- 5. A true post (calibrated trust) ---------- */

const VAX_WHO: GcCheck = {
  title: 'Who posted it?',
  rows: [
    ['Page', 'Barangay Sampaguita Health Center, the page Kuya Jun\'s team uses'],
    ['Date', 'Posted this week'],
    ['What it asks', 'Nothing to buy. A place, a day and a time.'],
  ],
  verdict: 'A named official page, a date and no sales pitch. This looks legit.',
};
const VAX_JUN: GcCheck = {
  title: 'Ask Kuya Jun',
  rows: [
    ['Question', 'Is the Wednesday vaccination day real?'],
    ['Kuya Jun says', 'Yes. We hold it every Wednesday morning at the health center.'],
    ['Good to know', 'Routine childhood vaccines are free at health centers. Bring the vaccine card.'],
  ],
  verdict: 'Confirmed by the health worker who runs it.',
};

const VAX: GcScenario = {
  id: 'vaccine',
  title: 'Free Vaccines',
  scene: 'Family GC, Monday morning',
  legit: true,
  lesson: 'This one is TRUE. A named health center, a date, a clear place and nothing to sell. Calibrated trust means checking, then saying "this one is legit" and acting on it.',
  start: startWith({ tita: { believed: true }, bea: { hurt: false } }),
  first: 'vax-1',
  basis: 'CONTENT_GUIDE section 3: routine childhood vaccines are available free at health centers. Section 1: calibrated trust, never "trust nothing".',
  review_status: 'unreviewed',
  turns: [
    {
      id: 'vax-1',
      messages: [
        fwd('tita', 'Barangay Sampaguita Health Center: FREE vaccines for children every Wednesday, 8 to 11 AM. Bring the vaccine card. Walk-ins welcome. Please share with the moms! 🙏'),
        say('lola', 'My grandchild is due for her shots! Should we go on Wednesday?'),
        say('bea', 'Hmm, "free" and "please share"... sounds like a hoax to me.'),
      ],
      prompt: 'Is this a hoax or the real thing? What do you do?',
      choices: [
        pick('react', 'vax-1-react', 'React with 👍', '👍', [1, 2], 'A kind reaction, and it happens to be true, but you did not check. Next time, check first.', 'vax-2p', { ripple: { lola: { believed: true } } }),
        pick('verify', 'vax-1-who', 'Check who posted it', 'Let me look at who posted this.', [2, 2], 'You checked and did not just guess. That is the habit.', 'vax-2v', { ripple: { you: { checked: true } }, check: VAX_WHO }),
        pick('verify', 'vax-1-jun', 'Ask Kuya Jun, the health worker', 'Kuya Jun, is this Wednesday vaccination day real?', [2, 2], 'Asking a real person who knows is a strong check.', 'vax-2v', { ripple: { you: { checked: true }, jun: { checked: true } }, check: VAX_JUN }),
        pick('forward', 'vax-1-fwd', 'Forward it to the Barangay Moms group right away', 'Forwarded to Barangay Moms', [1, 2], 'It is true, but you shared before checking. If it had been fake, it would have spread.', 'vax-2f', { ripple: { you: { believed: true } } }),
        pick('reply', 'vax-1-sharp', '"Bea is right. This looks fake. Do not go."', 'Bea is right. This looks fake. Do not go.', [0, 0], 'Saying "fake" without checking is a trap too. It could keep a child from needed vaccines.', 'vax-2h', { ripple: { tita: { hurt: true }, lola: { believed: false } } }),
      ],
    },
    {
      id: 'vax-2v',
      messages: [say('bea', 'Oh. So it is real? Sorry, Tita, I guessed too fast.'), say('lola', 'So we can go on Wednesday?'), say('tita', 'I told you it was a good one! 😄')],
      prompt: 'It checks out. What now?',
      choices: [
        pick('reply', 'vax-2v-kind', '"Thank you, Tita! I checked: it is the health center\'s own page, dated this week. Lola, let us bring the vaccine card on Wednesday. I will share it with the Barangay Moms."', 'Thank you, Tita! I checked: it is the health center\'s own page, dated this week. Lola, let us bring the vaccine card on Wednesday. I will share it with the Barangay Moms.', [2, 2], 'You thanked Tita, said what you checked, and put the good news to use. True posts are worth sharing.', 'vax-end-light', { ripple: { tita: { checked: true }, bea: { believed: true }, lola: { believed: true }, jun: { checked: true } } }),
        pick('reply', 'vax-2v-preach', '"Tita, next time please check before you share. This one happened to be okay."', 'Tita, next time please check before you share. This one happened to be okay.', [1, 0], 'Fair advice, but Tita got it right this time. A thank-you comes first.', 'vax-end-mixed', { ripple: { tita: { hurt: true }, lola: { believed: true } } }),
        pick('reply', 'vax-2v-quiet', 'Keep it to yourself and take Lola on Wednesday', 'Okay, see you Wednesday, Lola.', [1, 1], 'Good for Lola, but other families do not hear about the free day.', 'vax-end-mixed', { ripple: { lola: { believed: true } } }),
      ],
    },
    {
      id: 'vax-2p',
      messages: [say('lola', 'Good! So it is real? Then I will take the baby on Wednesday.'), say('bea', 'Are you sure, Ate? It could be fake.')],
      prompt: 'Bea doubts it and Lola is ready to go. What do you do?',
      choices: [
        pick('verify', 'vax-2p-jun', 'Ask Kuya Jun to confirm it', 'Kuya Jun, can you confirm the Wednesday vaccination day?', [2, 2], 'Checking now settles Bea\'s doubt and makes sure Lola does not go for nothing.', 'vax-end-mixed', { ripple: { you: { checked: true }, jun: { checked: true }, bea: { believed: true }, lola: { believed: true } }, check: VAX_JUN }),
        pick('reply', 'vax-2p-trust', '"I think it is real. Let us check on the page together, Bea."', 'I think it is real. Let us look at the page together, Bea.', [2, 2], 'You did not dismiss Bea\'s doubt, and you invited her to check.', 'vax-end-mixed', { ripple: { bea: { checked: true }, you: { checked: true } } }),
        pick('react', 'vax-2p-quiet', 'Send another 👍 and leave', '👍', [1, 1], 'Bea\'s doubt stays and no one checks. Lola may not go.', 'vax-end-rough', { ripple: { bea: { believed: false } } }),
      ],
    },
    {
      id: 'vax-2f',
      messages: [say('bea', 'Ate, you forwarded it?! What if it is fake?'), say('jun', 'Hello! I saw the post. That one is ours!')],
      prompt: 'It was true, but you shared before checking. What now?',
      choices: [
        pick('verify', 'vax-2f-confirm', 'Check the health center page and tell the groups it is confirmed', 'I checked the health center page and Kuya Jun says it is real. See you on Wednesday!', [2, 2], 'Now your forward has a check behind it. Good job.', 'vax-end-mixed', { ripple: { you: { checked: true }, jun: { checked: true }, bea: { believed: true } }, check: VAX_JUN }),
        pick('reply', 'vax-2f-trust', 'Say "Trust me, it is real"', 'Trust me, it is real.', [1, 1], '"Trust me" is not a check. It happens to be true, but the doubters have nothing to look at.', 'vax-end-mixed', { ripple: { bea: { hurt: true } } }),
        pick('reply', 'vax-2f-delete', 'Delete the forward and say "maybe fake, sorry"', 'Oops, maybe it is fake. Sorry, ignore it!', [0, 1], 'You took back something true. Other families may miss the free vaccines.', 'vax-end-rough', { ripple: { bea: { believed: false } } }),
      ],
    },
    {
      id: 'vax-2h',
      messages: [say('jun', 'Hello! That post is from our health center. It is real!'), say('tita', 'Oh... and you said it was fake. 😢'), say('lola', 'So should we go or not, dear?')],
      prompt: 'Oops. Kuya Jun says it is real. What now?',
      choices: [
        pick('reply', 'vax-2h-sorry', '"Sorry, Tita! I should have checked before I said that. Thank you for sharing it. Lola, let us go on Wednesday."', 'Sorry Tita! I should have checked before I said that. Thank you for sharing it. Lola, let us go on Wednesday.', [2, 2], 'A quick, honest sorry and a fix. Tita forgives you.', 'vax-end-mixed', { ripple: { tita: { hurt: false, believed: true }, lola: { believed: true }, you: { checked: true } } }),
        pick('verify', 'vax-2h-check', 'Check the page together and thank Kuya Jun', 'Let me check the page together with Kuya Jun, and thank you, Tita.', [2, 2], 'You checked, and you thanked both of them.', 'vax-end-mixed', { ripple: { tita: { hurt: false, believed: true }, you: { checked: true }, jun: { checked: true }, lola: { believed: true } }, check: VAX_WHO }),
        pick('reply', 'vax-2h-double', '"Anyone can fake a page name. I still do not trust it."', 'Anyone can fake a page name. I still do not trust it.', [0, 0], 'Kuya Jun is a real person who runs it. Doubting everything is as unhelpful as trusting everything.', 'vax-end-rough', { ripple: { lola: { believed: false } } }),
      ],
    },
  ],
  endings: [
    ending('vax-end-light', 'light', 'Wednesday is on!', 'You checked, said "this one is legit", and shared it. Lola brings her grandchild for her shots, and three moms from the Barangay Moms group say they will come too.', [say('lola', 'Thank you, dear! We will bring the vaccine card.'), say('jun', 'See you all on Wednesday morning! 😊')], "Family's Light! You know when to trust, too."),
    ending('vax-end-mixed', 'mixed', 'A little late, still good', 'The good news got through, but someone felt dismissed, or only a few families heard about it. Checking and saying "this is legit" works best when it is early and warm.', [say('jun', 'Lola, bring the vaccine card on Wednesday. We will see you!'), say('tita', 'Okay! 🙏')], 'So close! Trusting the right thing is a skill too.'),
    ending('vax-end-rough', 'rough', 'The free day is missed', 'Doubts lingered, and Lola decided to wait. The free vaccination day passed. Kuya Jun will hold another one, and Lola will go next week.', [say('jun', 'No worries, Lola. We have another Wednesday next week.'), say('bea', 'Oops, I should have checked first. 😅')], 'Doubting everything is a trap too, friend. Check, then trust what checks out. Try again?'),
  ],
};

/** The pool. `legit` marks the one forward that is true, which every play includes (see gcLogic.ts). */
export const GC_SCENARIOS: readonly GcScenario[] = [TEA, FEVER, DOC, COUGH, VAX];

export const scenarioById = (id: string): GcScenario | undefined => GC_SCENARIOS.find((s) => s.id === id);
