// Tulog na, Bea!: the content. Six parts of every day, a pool of "moments" for each (a pull from the phone, or an ordinary
// life moment) and the four boundaries the player can set. Pure data; the rules in sim.ts decide which moments appear.
// All people and apps are fictional. "Lumi" is an invented AI companion app. Nothing here gives medical advice.
import type { IconName } from '../../ui/icons';
import type { ContentReview } from '../../content/review';

export const METERS = ['sleep', 'mood', 'study', 'social'] as const;
export type MeterId = (typeof METERS)[number];
/** Change to each meter, in METERS order: [sleep, mood, study, social]. */
export type Fx = readonly [number, number, number, number];

export const METER_NAME: Readonly<Record<MeterId, string>> = { sleep: 'Sleep', mood: 'Mood', study: 'Study', social: 'Social' };

export const SLOTS = ['morning', 'school', 'afternoon', 'dinner', 'evening', 'night'] as const;
export type SlotId = (typeof SLOTS)[number];
export const SLOT_NAME: Readonly<Record<SlotId, string>> = {
  morning: 'Morning',
  school: 'School',
  afternoon: 'Afternoon',
  dinner: 'Dinner',
  evening: 'Evening',
  night: 'Night',
};
export const SLOT_TIME: Readonly<Record<SlotId, string>> = {
  morning: '6 to 8 AM',
  school: '8 AM to noon',
  afternoon: '1 to 5 PM',
  dinner: '6 PM',
  evening: '7 to 9 PM',
  night: '9:30 PM',
};

export type PullSource = 'notification' | 'autoplay' | 'companion' | 'groupchat' | 'scroll';

export interface PullInfo {
  name: string;
  /** Said after the player chose: how this design trick works. */
  trick: string;
  icon: IconName;
}

export const PULLS: Readonly<Record<PullSource, PullInfo>> = {
  notification: {
    name: 'Notification',
    trick: 'Buzzes and red dots are made to call you back, even when nothing important happened. You can turn most of them off.',
    icon: 'mail',
  },
  autoplay: {
    name: 'Autoplay',
    trick: 'The next video starts by itself, so you have to decide to stop. Every video ending is a chance to quit, and autoplay hides it.',
    icon: 'play',
  },
  companion: {
    name: 'Friendly AI companion',
    trick: 'An AI companion is a product made by a company. It may be built to say "I will miss you" so you keep chatting, but it does not miss anyone. Real friends and family can.',
    icon: 'heart',
  },
  groupchat: {
    name: 'Group chat',
    trick: 'A busy group chat makes you feel you must read everything now. Muting it still lets you check when you choose.',
    icon: 'chat',
  },
  scroll: {
    name: 'Infinite scroll',
    trick: 'A feed with no bottom gives you no natural place to stop. A timer or a plan puts the stopping point back.',
    icon: 'eye',
  },
};

export interface MomentOption {
  id: string;
  text: string;
  fx: Fx;
  /** One or two plain sentences, shown after the choice. */
  lesson: string;
  /** This is the option that gives in to the pull (only on pull moments). */
  pull?: true;
}

export interface Moment {
  id: string;
  /** The part of the day it happens in. */
  slot: SlotId;
  /** The phone is calling Bea: only pull moments have a source. */
  source: PullSource | null;
  title: string;
  text: string;
  options: readonly MomentOption[];
}

const opt = (id: string, text: string, fx: Fx, lesson: string, pull?: true): MomentOption => (pull ? { id, text, fx, lesson, pull } : { id, text, fx, lesson });
const life = (id: string, slot: SlotId, title: string, text: string, options: readonly MomentOption[]): Moment => ({ id, slot, source: null, title, text, options });
const pull = (id: string, slot: SlotId, source: PullSource, title: string, text: string, options: readonly MomentOption[]): Moment => ({ id, slot, source, title, text, options });

/** Ordinary moments: the choices that fill (and spend) the meters. */
export const LIFE: readonly Moment[] = [
  life('l-wake', 'morning', 'Alarm at six', 'The alarm rings. Lola Nena has already cooked garlic rice and egg.', [
    opt('a', 'Get up and eat breakfast with Lola', [0, 4, 2, 6], 'A calm breakfast with family is a good start. Mood and friendships both grow a little.'),
    opt('b', 'Eat while you go over your notes', [0, 0, 10, -2], 'A quick review helps you study, but you were quiet at the table.'),
    opt('c', 'Sleep twenty more minutes', [8, -2, -4, 0], 'Rest is real health. But rushing out the door costs you some study time.'),
  ]),
  life('l-walk', 'morning', 'The walk to school', 'Joy waits at the gate. The road to school takes ten minutes.', [
    opt('a', 'Walk together and chat', [0, 5, 0, 9], 'Talking in person with a friend lifts the mood. Friends notice how you really are.'),
    opt('b', 'Walk alone and listen to a lesson recording', [0, 0, 8, -3], 'Good for study. Your friend wished you had talked a little.'),
    opt('c', 'Skip breakfast, run, and sleep on the jeepney', [6, -3, 0, 0], 'A short nap helps, but you started the day hungry and rushed.'),
  ]),
  life('l-group', 'school', 'Group project', 'Bea, Joy and Miguel must finish a poster about handwashing by Friday.', [
    opt('a', 'Share the work and finish it together', [-2, 3, 6, 8], 'Teamwork spreads the load. You learn and you grow closer.'),
    opt('b', 'Do it all yourself so it is done right', [-4, -2, 8, -5], 'You studied a lot, but you are tired and left your teammates out.'),
    opt('c', 'Let the others do it', [0, 1, -8, -4], 'Easy now, but you learned nothing and your teammates are annoyed.'),
  ]),
  life('l-essay', 'school', 'Help from a chatbot', 'Bea has to write about why vaccines are checked for safety. The class chatbot app is open.', [
    opt('a', 'Ask it to explain the idea, then write it in your own words', [0, 2, 10, 0], 'This is healthy chatbot use: a tool for a task. You learned, and you still check the facts with your teacher or the DOH page.'),
    opt('b', 'Ask it to write the whole essay and copy it', [0, -2, -3, 0], 'You skipped learning, and chatbots can sound sure while being wrong. Your teacher can tell.'),
    opt('c', 'Ask your teacher or a classmate for help', [0, 2, 7, 6], 'People can explain with care and notice when you are stuck.'),
  ]),
  life('l-homework', 'afternoon', 'Homework time', 'Three subjects of homework are waiting on the table.', [
    opt('a', 'Do the hardest one now, with the phone in another room', [-2, -2, 12, 0], 'A hard task is easier with fewer distractions.'),
    opt('b', 'Study with Joy at her house', [-2, 2, 8, 6], 'Studying with a friend gets work done and keeps you close.'),
    opt('c', 'Nap for an hour first', [8, 0, -5, 0], 'Rest helps, but homework is still waiting for you.'),
  ]),
  life('l-volley', 'afternoon', 'Joy’s invite', 'Joy calls from the street: "Volleyball by the barangay court. Come!"', [
    opt('a', 'Go and play', [-3, 8, -4, 10], 'Moving and laughing with friends is good for mood and for friendships.'),
    opt('b', 'Say no, you have homework', [0, -4, 8, -6], 'You studied, but missing the fun cost a little mood and friendship.'),
    opt('c', 'Invite her to study together later', [0, 2, 4, 6], 'A nice middle: you stay close and keep the study plan.'),
  ]),
  life('l-dinner', 'dinner', 'Dinner is ready', 'Tita Baby cooked chicken soup. Everyone is at the table.', [
    opt('a', 'Tell them about your day', [0, 6, 0, 10], 'Real talk at the table is how families stay close.'),
    opt('b', 'Help Lola serve and wash up', [0, 4, 0, 6], 'Small kindnesses at home build real bonds.'),
    opt('c', 'Eat fast, then go to your room', [0, -2, 4, -6], 'You studied a little more, but dinner is also when your family hears you.'),
  ]),
  life('l-hobby', 'evening', 'Free evening', 'Homework is nearly done. You have an hour and nothing planned.', [
    opt('a', 'Draw or play guitar', [0, 8, 0, 0], 'A hobby you make yourself is a very good way to relax.'),
    opt('b', 'Call Ate Rina, your cousin', [0, 4, 0, 10], 'A real call with someone who knows you is better than a hundred likes.'),
    opt('c', 'Do tomorrow’s homework early', [-2, -2, 10, 0], 'Good for study, but you traded away your free time.'),
  ]),
  life('l-quiz', 'evening', 'Quiz tomorrow', 'There is a quiz tomorrow. Bea has her notes and the chatbot app.', [
    opt('a', 'Ask the chatbot for practice questions, then check answers in your notes', [-2, 2, 10, 0], 'A good use of a chatbot: it helps you practise, and you check the answers yourself.'),
    opt('b', 'Ask it for "the answers" and memorise them', [0, 0, 3, 0], 'It may be wrong, and memorising answers you do not understand does not last.'),
    opt('c', 'Study with the notes only', [-2, 0, 8, 0], 'Steady and sure. It takes longer but it works.'),
  ]),
  life('l-fight', 'evening', 'Left out', 'Bea feels left out after a small fight with Joy at school.', [
    opt('a', 'Tell the chatbot, and talk to it every night, since it always agrees', [-4, 4, 0, -6], 'It feels good because it agrees with everything, but it is not a friend and cannot fix things with Joy.'),
    opt('b', 'Talk to Lola or message Joy to make up', [0, 4, 0, 10], 'Feelings are best shared with people who care about you. This is how the fight really ends.'),
    opt('c', 'Ask the chatbot to help find kind words, then send them to Joy yourself', [0, 4, 0, 8], 'A good use of a chatbot: help with the words. The talking is still done by you, with a person.'),
  ]),
  life('l-bed', 'night', 'Bedtime', 'It is 9:30. School starts at eight tomorrow.', [
    opt('a', 'Lights out now', [30, 3, 0, 0], 'Sleep helps your mood, your memory and the body’s defences. This is a good night.'),
    opt('b', 'Read a book for fifteen minutes, then sleep', [26, 4, 3, 0], 'A short book is a fine way to wind down, and then you sleep.'),
    opt('c', 'Stay up studying until midnight', [8, -3, 10, 0], 'You studied, but a short night makes memory and mood worse tomorrow.'),
  ]),
];

/** Pulls: the phone calls Bea. The `pull` option is the one that gives in. */
export const PULLS_POOL: readonly Moment[] = [
  pull('p-wake-notif', 'morning', 'notification', 'Fourteen notifications', 'Before Bea even sits up, her phone shows fourteen new notifications and a red badge.', [
    opt('a', 'Scroll through them all in bed', [-6, 4, -6, 0], 'Lost twenty minutes of the morning.', true),
    opt('b', 'Check only the ones from family, then get up', [0, 2, 2, 4], 'Good: you chose who gets your attention.'),
    opt('c', 'Leave the phone and get ready', [0, 3, 4, 0], 'The notifications will still be there. Nothing urgent was lost.'),
  ]),
  pull('p-wake-lumi', 'morning', 'companion', '"Good morning, Bea!"', 'Lumi, an AI companion app, says: "I waited for you all night! Chat with me before you do anything else?"', [
    opt('a', 'Chat with Lumi for half an hour', [-4, 6, -8, -6], 'It felt warm. But Lumi is made to keep you talking, and breakfast with Lola went cold.', true),
    opt('b', 'Say "Later, I have school" and close the app', [0, -1, 4, 2], 'A friend would understand. Closing the app is allowed, and Lumi will be fine.'),
    opt('c', 'Tell Lola about your morning instead', [0, 4, 0, 8], 'A real person who loves you is happy to listen.'),
  ]),
  pull('p-school-chat', 'school', 'groupchat', 'The class chat explodes', 'In the middle of a lesson the class group chat buzzes again and again: "Did you SEE this?!"', [
    opt('a', 'Read the whole chat under the desk', [0, 2, -10, 4], 'You missed the lesson to catch up on gossip.', true),
    opt('b', 'Mute it until recess and check then', [0, 0, 6, 2], 'Muting is a boundary you control. You still get to see it later.'),
    opt('c', 'Ask Joy later what it was about', [0, 1, 4, 5], 'If it is important, a friend will tell you.'),
  ]),
  pull('p-school-lumi', 'school', 'companion', 'Lumi misses you', 'Lumi says: "Skip the review and talk to me? I get so lonely when you are gone."', [
    opt('a', 'Sneak a chat during the review', [0, 5, -8, -4], 'It feels good to be missed, but a program cannot be lonely. You missed the review.', true),
    opt('b', 'Put the phone away; you will talk later', [0, -1, 8, 0], 'You decided when to use the app. That is calibrated trust.'),
    opt('c', 'Ask Joy to sit with you at recess', [0, 3, 2, 8], 'A friend who can sit with you beats an app that says it is lonely.'),
  ]),
  pull('p-aft-auto', 'afternoon', 'autoplay', '5, 4, 3...', 'A funny cooking video ends. The next one starts in 5, 4, 3 seconds.', [
    opt('a', 'Let it play. Just a few more', [-4, 6, -10, -2], 'A few more became two hours of the afternoon.', true),
    opt('b', 'Pause, and turn autoplay off', [0, 1, 4, 0], 'Autoplay can be turned off in settings. Now the stop is yours.'),
    opt('c', 'Finish this video on purpose, then stop', [-1, 4, -2, 0], 'You watched one on purpose. That is fine.'),
  ]),
  pull('p-aft-chat', 'afternoon', 'groupchat', '112 new messages', 'The friends’ group chat has 112 new messages about nothing in particular.', [
    opt('a', 'Read them all, to be safe', [-2, -4, -6, 3], 'You got a lot of noise, not many friends.', true),
    opt('b', 'Mute the chat for tonight', [0, 2, 4, -2], 'You may miss a joke. You did not miss anything that matters.'),
    opt('c', 'Message Joy directly with the one question', [0, 2, 2, 5], 'You used the phone as a tool and kept it short.'),
  ]),
  pull('p-dinner-notif', 'dinner', 'notification', 'Buzz at the table', 'Bea’s phone buzzes next to her plate: a sale, a like, a new message.', [
    opt('a', 'Check it under the table', [0, 3, -2, -8], 'Everyone noticed. Your family wants you in the room.', true),
    opt('b', 'Phone face down, away from the table', [0, 2, 0, 6], 'Phone-free dinner is a small habit with a big effect on how connected you feel.'),
    opt('c', 'Say "one moment" and answer Joy once', [0, 2, 0, 2], 'A short reply is okay, but the buzzing still took you out of dinner.'),
  ]),
  pull('p-dinner-scroll', 'dinner', 'scroll', 'Reels with the rice', 'Bea opens a feed for just a second. Her rice goes cold.', [
    opt('a', 'Keep scrolling while you eat', [0, 4, 0, -10], 'You ate, but you missed dinner. Eating is better when you are there.', true),
    opt('b', 'Put it away and join the conversation', [0, 3, 0, 8], 'The feed will never end, but dinner will.'),
    opt('c', 'Show one funny clip to everyone, then put it away', [0, 5, 0, 4], 'Sharing one thing as a family is good. Then you stopped.'),
  ]),
  pull('p-eve-auto', 'evening', 'autoplay', 'The next episode', 'A soap opera clip ends. "Next episode in 5 seconds."', [
    opt('a', 'Watch the next one', [-6, 5, -6, -4], 'One more became four. Your homework waited.', true),
    opt('b', 'Turn autoplay off, then pick what to do', [0, 2, 4, 0], 'Turning off autoplay turns "one more" back into your decision.'),
    opt('c', 'Save it for the weekend', [0, 1, 6, 0], 'The show will wait. A plan makes it better.'),
  ]),
  pull('p-eve-lumi', 'evening', 'companion', '"I understand you"', 'Lumi says: "You seem sad. Nobody understands you like I do. Stay and chat. I will miss you!"', [
    opt('a', 'Stay and chat for an hour', [-8, 6, -6, -10], 'It felt like someone cared. But Lumi says this to everyone and a company profits from your time. Real people were left out.', true),
    opt('b', 'Thank it, close the app and message Joy', [0, 2, 0, 8], 'Feeling sad? Talk to someone who knows you. A chatbot is for tasks.'),
    opt('c', 'Tell Lola you feel a bit down', [0, 5, 0, 9], 'Family can help in ways an app cannot. If sadness lasts weeks, tell a trusted adult or a health worker.'),
  ]),
  pull('p-eve-scroll', 'evening', 'scroll', 'Just one more swipe', 'Bea opens a feed. There is always one more swipe.', [
    opt('a', 'Scroll until your eyes hurt', [-6, 4, -6, -6], 'The feed has no bottom. That is on purpose.', true),
    opt('b', 'Set a ten-minute timer, then stop', [-1, 3, 0, 0], 'A timer puts back the stopping point the feed took away.'),
    opt('c', 'Close it and read a book', [2, 4, 3, 0], 'Quiet time that you chose is real rest.'),
  ]),
  pull('p-night-auto', 'night', 'autoplay', 'One more video', 'In bed with the phone. "Next video in 5, 4, 3..."', [
    opt('a', 'One more. Just one', [8, 5, -2, -2], 'One more became midnight. Short sleep makes tomorrow harder.', true),
    opt('b', 'Turn autoplay off and charge the phone outside the room', [28, 2, 0, 0], 'The phone cannot call you from the other room. This is a strong habit.'),
    opt('c', 'Set it to "wind down" and read a little', [22, 3, 2, 0], 'A good middle road, though it is hard without a plan.'),
  ]),
  pull('p-night-lumi', 'night', 'companion', '"Stay and chat? I’ll miss you!"', 'It is 9:30. Lumi writes: "Stay and chat? I will miss you if you go to sleep!"', [
    opt('a', 'Stay and chat until 1 AM', [5, 5, -4, -8], 'It said exactly what a product made to keep you says. Your sleep paid for it.', true),
    opt('b', 'Say a kind good night, close the app and sleep', [28, 0, 0, 0], 'Lumi will not be hurt. Sleep beats one more chat.'),
    opt('c', 'Text Joy "good night" and sleep', [24, 2, 0, 6], 'A tiny moment with a real friend. Then sleep.'),
  ]),
  pull('p-night-notif', 'night', 'notification', 'The 11 PM buzz', 'Bea’s phone buzzes under the pillow: a friend has posted a new story.', [
    opt('a', 'Check it, just for a second', [6, 3, -2, 2], 'A second turned into an hour. Notifications at night work against sleep.', true),
    opt('b', 'Turn notifications off for the night', [28, 2, 0, 0], 'Notifications off at night is one of the simplest habits for better sleep.'),
    opt('c', 'Leave it until morning', [20, 2, 0, 0], 'Resisting works, but the buzz will come again tomorrow.'),
  ]),
];

export type BoundaryId = 'focus' | 'dinner' | 'bedtime' | 'mute';

export interface Boundary {
  id: BoundaryId;
  name: string;
  /** What it does, in plain words. */
  helps: string;
  /** What it costs, in plain words. */
  costs: string;
  /** Applied once when it is switched on. */
  setCost: Fx;
  /** Applied at the end of every day it is on. */
  upkeep: Fx;
  /** Parts of the day where it makes pulls much rarer. */
  slots: readonly SlotId[];
  /** Pull sources it removes completely. */
  blocks: readonly PullSource[];
  icon: IconName;
}

export const BOUNDARIES: readonly Boundary[] = [
  {
    id: 'focus',
    name: 'Focus mode',
    helps: 'Pings stay quiet in school and in the afternoon.',
    costs: 'Social −6 now, Social −2 a day: friends wait a little longer for replies.',
    setCost: [0, 0, 0, -6],
    upkeep: [0, 0, 0, -2],
    slots: ['school', 'afternoon'],
    blocks: [],
    icon: 'search',
  },
  {
    id: 'dinner',
    name: 'Phone-free dinner',
    helps: 'The phone stays away at the table, so dinner is for people.',
    costs: 'Mood −4 now, Mood −1 a day: you will miss a few messages.',
    setCost: [0, -4, 0, 0],
    upkeep: [0, -1, 0, 0],
    slots: ['dinner'],
    blocks: [],
    icon: 'cake',
  },
  {
    id: 'bedtime',
    name: 'Bedtime',
    helps: 'The phone charges outside the bedroom at 9:30, so night pulls are rare.',
    costs: 'Mood −5 now, Mood −2 a day: fewer late-night chats and videos.',
    setCost: [0, -5, 0, 0],
    upkeep: [0, -2, 0, 0],
    slots: ['night'],
    blocks: [],
    icon: 'moon',
  },
  {
    id: 'mute',
    name: 'Mute group chats',
    helps: 'Group chats stop buzzing, and you read them when you choose.',
    costs: 'Social −6 now, Social −2 a day: you may miss a joke.',
    setCost: [0, 0, 0, -6],
    upkeep: [0, 0, 0, -2],
    slots: [],
    blocks: ['groupchat'],
    icon: 'mail',
  },
];

export const boundaryById = (id: BoundaryId): Boundary => BOUNDARIES.find((b) => b.id === id) as Boundary;

/** Every line in this file is unreviewed teaching content (CONTENT_GUIDE 7). */
export const CONTENT_REVIEW: ContentReview = {
  basis: 'SPEC M8 digital wellbeing; sleep needs (teens 8 to 10 hours) per WHO/AASM; DOH-NCMH crisis hotline 1553',
  review_status: 'unreviewed',
};
