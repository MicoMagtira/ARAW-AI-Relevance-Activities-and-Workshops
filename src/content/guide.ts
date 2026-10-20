// "How to use ARAW": the user guide, shared by the in-app Guide screen (src/screens/guide/Guide.tsx) and the printable PDF
// (scripts/guide/build-pdf.mjs). English source, shown translated through the language packs; plain, short sentences.
// No imports on purpose: build-pdf.mjs loads this file straight from Node (type stripping).
//
// Each step can show one screenshot (`shot`, an id from scripts/guide/capture.spec.ts). Its callouts are numbered in order:
// the first callout is marker 1. `target` names a box in scripts/guide/out/manifest.json; a target that was not captured
// keeps its number in the legend but gets no marker on the picture.

export interface GuideCallout {
  target: string;
  text: string;
}

export interface GuideStep {
  title: string;
  text: string;
  shot?: string;
  /** Describes the screenshot for people who cannot see it. Required when `shot` is set. */
  alt?: string;
  callouts?: GuideCallout[];
  /** A short numbered list (for steps without a picture, such as installing the app). */
  list?: string[];
  tip?: string;
}

export interface GuideSection {
  id: string;
  /** Short label for the table of contents and the pixel kicker. */
  label: string;
  title: string;
  intro: string;
  steps: GuideStep[];
}

export const GUIDE_META = {
  title: 'How to use ARAW',
  intro:
    'ARAW teaches you when to trust AI and health information, one short game at a time. This guide shows each screen with numbered pictures. Read it from the top, or jump to the part you need.',
  tocTitle: 'Contents',
  pdfLink: 'Download the printable guide (PDF)',
  pdfHref: './guide/ARAW-User-Guide.pdf',
  pdfHint: 'A4 pages with big pictures. Good for printing and for facilitators.',
  legendTitle: 'What the numbers mean',
  backToTop: 'Back to contents',
  stepLabel: 'Step',
  noPicture: 'Picture not available yet.',
} as const;

export const GUIDE_COVER = {
  wordmark: 'ARAW',
  name: 'ARAW: AI Relevance Activities and Workshops',
  subtitle: 'User Guide',
  project: 'An AIKasalig project · DOST-PCHRD · National University',
  credit: 'Created by Mico C. Magtira — Senior Data and NLP-Geospatial Scientist, DOST-NICER',
  tagline: 'Learn when to trust AI and health info, one fun game at a time.',
  partnersLabel: 'An AIKasalig project',
} as const;

export const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    id: 'start',
    label: 'Start',
    title: 'Getting started',
    intro: 'ARAW works in the web browser of any phone, tablet or computer. You do not need an account.',
    steps: [
      {
        title: 'Choose your language',
        text: 'The very first screen asks for your language. ARAW speaks English, Filipino, Cebuano, Ilokano and Hiligaynon. Tap a language card, then press SELECT.',
        shot: 'language',
        alt: 'The ARAW language screen: the title box with the English card picked, the gold SELECT button under it, and Ara in front of a pixel sunrise sky.',
        callouts: [
          { target: 'card', text: 'Tap your language. The picked card turns blue and its little box fills in.' },
          { target: 'select', text: 'Press SELECT. The music starts and the sun begins to rise.' },
          { target: 'later', text: 'You can change the language later in Me, under Settings.' },
        ],
      },
      {
        title: 'Wait for the sunrise, then press START',
        text: 'Next, the sun rises behind Ara and the loading bar fills. When the bar is full, press START.',
        shot: 'splash',
        alt: 'The ARAW start screen: the title box at the top, Ara in front of a pixel sunrise, and a big gold START button at the bottom.',
        callouts: [
          { target: 'title', text: 'The name of the app and what it is for.' },
          { target: 'partners', text: 'ARAW is an AIKasalig project. These are the project partners: DOST, DOST-PCHRD, National University, NICER and AIKasalig.' },
          { target: 'sound', text: 'Sound switches. Turn music or sound effects on or off before you start.' },
          { target: 'start', text: 'Press START to go to the Home screen.' },
        ],
      },
      {
        title: 'Turn sound on or off',
        text: 'ARAW has soft music and small sound effects. You can turn each one off at any time. Your choice is saved on this device.',
        list: [
          'On the start screen, use the Music and Sound effects switches.',
          'Later, open Me and scroll to Sound to change them again.',
          'In a quiet room or a group session, turn the music off and keep the effects low.',
        ],
      },
      {
        title: 'Install ARAW on your phone',
        text: 'You can add ARAW to your home screen like an app. After the first visit it also works without internet.',
        list: [
          'Android (Chrome): tap the three dots at the top right, then "Add to Home screen" or "Install app".',
          'iPhone (Safari): tap the Share button, then "Add to Home Screen".',
          'Computer (Chrome or Edge): click the install icon at the right end of the address bar.',
          'Open ARAW from the new icon. It opens full screen.',
        ],
        tip: 'Your progress stays on this device only. If you clear the browser data, your progress is cleared too.',
      },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    title: 'The Home screen',
    intro: 'Home shows what to do next. Use the buttons at the bottom (on a phone) or on the left (on a computer) to move around.',
    steps: [
      {
        title: 'The ARAW banner',
        text: 'The top of Home shows what ARAW is and who made it. New here? Watch the one-minute tour first.',
        shot: 'home-banner',
        alt: 'The top of Home: a pixel sunrise banner with the big ARAW name and a gold Watch the 1-minute tour button, and a white band of partner logos with an About the project link.',
        callouts: [
          { target: 'word', text: 'ARAW: AI Relevance Activities and Workshops, an AIKasalig project.' },
          { target: 'tour', text: 'Watch a one-minute video tour of the app, with captions.' },
          { target: 'partners', text: 'The project partners.' },
          { target: 'about', text: 'Read about the project, its partners and the team.' },
        ],
      },
      {
        title: 'See your next lesson',
        text: 'Ara greets you and shows the next lesson. Press CONTINUE to keep learning where you stopped.',
        shot: 'home',
        alt: 'The Home screen on a phone: XP and streak chips at the top, Ara saying good morning, a Continue card for Module 5, and the tab bar at the bottom.',
        callouts: [
          { target: 'hud', text: 'Your points (XP) and your streak: how many days in a row you have played.' },
          { target: 'progress', text: 'How much of this lesson you have done.' },
          { target: 'continue', text: 'Continue the lesson.' },
          { target: 'report', text: 'Report a problem from any screen.' },
          { target: 'nav', text: 'Go to Home, Learn, Arcade, Library or Me.' },
        ],
      },
      {
        title: 'More on Home',
        text: 'Scroll down for the Daily Challenge, a myth of the day and the Arcade.',
        shot: 'home-more',
        alt: 'Lower part of Home: the Daily Challenge card, the Myth of the day card, and the Arcade card.',
        callouts: [
          { target: 'daily', text: "Today's challenge: one game and three quick questions." },
          { target: 'myth', text: 'Myth of the day. Tap the card to flip it and read the fact.' },
          { target: 'arcade', text: 'A shortcut to the games.' },
        ],
      },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    title: 'Learn: lessons step by step',
    intro: 'There are ten short modules. Each takes about 12 to 15 minutes and ends with the same question: when should I trust it?',
    steps: [
      {
        title: 'Your learning path',
        text: 'Modules open one after another. A check mark means done. A lock means you finish the one before it first.',
        shot: 'learn',
        alt: 'The Learn path: four finished modules with check marks, module 5 lit up with Ara above it, and locked modules below.',
        callouts: [
          { target: 'done', text: 'A finished module. You can replay it any time.' },
          { target: 'current', text: 'Your next module. Ara stands on it.' },
          { target: 'locked', text: 'A locked module. Finish the one before it to open it.' },
          { target: 'count', text: 'How many modules you have finished.' },
        ],
      },
      {
        title: 'Open a module',
        text: 'Tap a module to see what it teaches, how long it takes and the badge you can earn. Then press START or CONTINUE.',
        shot: 'learn-details',
        alt: 'Details of Module 5, Check Before You Share: the game, the time, what you will learn, the badge, and a Continue button.',
        callouts: [
          { target: 'title', text: 'The module name and what you will learn.' },
          { target: 'start', text: 'Start or continue the module.' },
        ],
      },
      {
        title: 'Answer a lesson card',
        text: 'Read the card and tap an answer. If it is not right, ARAW says "So close!" and explains why. Then try another answer. No one loses points for trying.',
        shot: 'lesson',
        alt: 'A lesson card asking what a computer learned from 1,000 mango photos. The wrong answer is marked, a So close! note explains why, and Ara reacts.',
        callouts: [
          { target: 'close', text: 'Close the lesson. Your place is saved.' },
          { target: 'progress', text: 'How far you are in this module.' },
          { target: 'ara', text: 'Ara reacts to your answer and gives a hint.' },
          { target: 'answer', text: 'The answer you picked.' },
          { target: 'feedback', text: '"So close!" tells you why, so you can try again.' },
          { target: 'next', text: 'NEXT opens when the card is done.' },
        ],
        tip: 'On a computer you can press the number keys to pick an answer, and Enter for NEXT.',
      },
      {
        title: 'Rewards and badges',
        text: 'Each finished module gives you XP and a badge. Ara celebrates with you. See all your badges in Me, in the Badge cabinet.',
        shot: 'me-badges',
        alt: 'The Badge cabinet on the Me screen, with earned badges in colour and locked ones in grey.',
        callouts: [{ target: 'badge', text: 'Tap a badge to see how to earn it.' }],
      },
    ],
  },
  {
    id: 'fof',
    label: 'Fact or Fake',
    title: 'Fact or Fake and the Truth Radar',
    intro: 'Fact or Fake shows ten posts, messages or pictures. You decide: is it fact or fake? Every fake is made up for the game and gets a FAKE stamp.',
    steps: [
      {
        title: 'Decide: fact or fake?',
        text: 'Read the post. Then press FACT or FAKE. On a phone you can also swipe: right for fact, left for fake.',
        shot: 'fof-item',
        alt: 'A Fact or Fake item: a made-up social media post, with a red FAKE button and a green FACT button below it.',
        callouts: [
          { target: 'count', text: 'Which item you are on, out of ten.' },
          { target: 'card', text: 'The post to check. Read it slowly.' },
          { target: 'fake', text: 'Press FAKE if you think it is false.' },
          { target: 'fact', text: 'Press FACT if you think it is true.' },
        ],
        tip: 'Keyboard: right arrow or L for Fact, left arrow or A for Fake.',
      },
      {
        title: 'Read the feedback',
        text: 'After each answer, a card tells you if you were right, why, and how to check it in real life.',
        shot: 'fof-answer',
        alt: 'The same post with a red ARAW GAME FAKE stamp, and a green card that says Correct! It is FAKE, with the reason and how to check.',
        callouts: [
          { target: 'stamp', text: 'The FAKE stamp shows the post was made up for the game.' },
          { target: 'feedback', text: 'Why it is fact or fake, and how to check.' },
          { target: 'report', text: 'Report this item if something looks wrong.' },
          { target: 'next', text: 'Go to the next item.' },
        ],
      },
      {
        title: 'Your Truth Radar',
        text: 'At the end you see your score and your Truth Radar. The radar shows whether you lean too trusting, too doubtful, or balanced. Balanced is the goal.',
        shot: 'fof-radar',
        alt: 'The results screen: the score out of ten, the Truth Radar meter with a pin, a short verdict and a Play again button.',
        callouts: [
          { target: 'score', text: 'How many you got right, and the XP you earned.' },
          { target: 'radar', text: 'The Truth Radar: how well you tell fact from fake.' },
          { target: 'verdict', text: 'Do you lean trusting, doubtful, or balanced? A tip follows.' },
          { target: 'again', text: 'Play another round with new items.' },
        ],
      },
    ],
  },
  {
    id: 'arcade',
    label: 'Arcade',
    title: 'Arcade games',
    intro: 'The Arcade has short games about AI and health. Every run is different. Games open as you finish modules.',
    steps: [
      {
        title: 'Pick a game',
        text: 'The top card shows today\'s featured game. Below are all the games. Tap one to see what it is about.',
        shot: 'arcade',
        alt: 'The Arcade: a featured game card with a Play button at the top, and game tiles below with their best scores.',
        callouts: [
          { target: 'featured', text: "Today's featured game. Everyone plays the same run today." },
          { target: 'tile', text: 'A game tile with its topic and your best score.' },
          { target: 'watch', text: 'Watch a short video of how the game is played.' },
        ],
      },
      {
        title: 'Play Fact or Fake from the Arcade',
        text: 'Scroll down in the Arcade to play Fact or Fake as often as you like.',
        shot: 'arcade-fof',
        alt: 'The Fact or Fake card in the Arcade with a Play Fact or Fake button.',
        callouts: [{ target: 'fof', text: 'Start a new round of ten items.' }],
      },
      {
        title: "Ara's briefing",
        text: 'The first time you open a game, Ara explains it in five short pages. You can skip it and read it again later.',
        shot: 'game-briefing',
        alt: "Ara's briefing for the game Takbo, Data!, with page dots and Skip and Next buttons.",
        callouts: [
          { target: 'ara', text: 'Ara explains the game in a few words.' },
          { target: 'page', text: 'Which page of the briefing you are on.' },
          { target: 'next', text: 'Go to the next page.' },
          { target: 'skip', text: 'Skip the briefing.' },
          { target: 'watch', text: 'Watch a short video of the game instead.' },
        ],
      },
      {
        title: 'Start the game',
        text: 'Read How to play if you need a reminder. Then press START.',
        shot: 'game-intro',
        alt: 'The game start screen with a How to play button and a Start button.',
        callouts: [
          { target: 'howto', text: 'How to play: the controls and the goal.' },
          { target: 'start', text: 'Start playing.' },
        ],
      },
      {
        title: 'Watch how to play',
        text: 'Every game has a short video that shows how it is played. Open it from How to play, the game details, or Library > Videos. The videos have no sound: read the captions under the picture.',
        shot: 'video',
        alt: 'A how-to video for Takbo, Data!: the game picture, a big caption bar under it, a Captions switch, and language buttons EN, FIL, CEB, ILO and HIL.',
        callouts: [
          { target: 'video', text: 'The video. Press play, or make it full screen.' },
          { target: 'caption', text: 'The captions say what is happening.' },
          { target: 'cc', text: 'Turn the captions on or off.' },
          { target: 'langs', text: 'Watch the video in another language. This changes only the video, not the app.' },
          { target: 'transcript', text: 'Read all the captions at once.' },
        ],
        tip: 'The videos play from the internet. They are not saved for offline use.',
      },
      {
        title: 'Play with tap, mouse or keyboard',
        text: 'Every game works three ways. Use what is easiest for you. You can pause at any time.',
        shot: 'game-play',
        alt: 'The game Takbo, Data! running: Ara on a street, the score and Privacy Shield beside the game, and a Pause button.',
        callouts: [
          { target: 'canvas', text: 'The game. Tap or click on it to play.' },
          { target: 'hud', text: 'Your score and status.' },
          { target: 'pause', text: 'Pause the game. P or Esc also pauses.' },
        ],
        list: [
          'Phone or tablet: tap or swipe on the game.',
          'Computer with a mouse: click on the game.',
          'Keyboard: arrow keys (or W A S D) to move, Space to act, P or Esc to pause.',
        ],
        tip: 'After a while Ara says "Pahinga muna!" and suggests a short break. Rest your eyes, then continue.',
      },
    ],
  },
  {
    id: 'daily',
    label: 'Daily',
    title: 'Daily Challenge and streaks',
    intro: 'Each day there is one new challenge: one game run and three Fact or Fake items. It is the same for everyone that day.',
    steps: [
      {
        title: "Do today's challenge",
        text: 'Finish both steps to get your result card. You get one scored try a day. You can share your result in your group chat.',
        shot: 'daily',
        alt: "The Daily Challenge: step 1 is today's game, step 2 is three Fact or Fake items, and a side card shows the result and the streak.",
        callouts: [
          { target: 'game', text: "Step 1: play today's game once." },
          { target: 'items', text: 'Step 2: answer three Fact or Fake items.' },
          { target: 'status', text: 'How many steps you have done.' },
          { target: 'streak', text: 'Your streak of days in a row.' },
        ],
      },
      {
        title: 'Keep your streak',
        text: 'A day counts when you learn or play. If you miss one day, a streak freeze keeps your streak going. You get one freeze a week.',
        shot: 'daily-streak',
        alt: 'The streak card: a 4-day streak, best 6 days, and a note that the streak freeze is ready this week.',
        callouts: [
          { target: 'status', text: 'Your daily result appears here when both steps are done.' },
          { target: 'streak', text: 'Your streak, your best streak, and your freeze.' },
        ],
      },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    title: 'Library: myths, words, comics and videos',
    intro: 'The Library is for reading and watching at your own pace. It has four parts: Myths, Dictionary, Comics and Videos.',
    steps: [
      {
        title: 'Myths',
        text: 'Each card shows a common health myth. Tap it to flip it and read the fact. Use the search box or the topic chips to find a myth.',
        shot: 'library-myths',
        alt: 'The Myths tab: the three Library tabs, a search box, topic filters, and myth cards.',
        callouts: [
          { target: 'tabs', text: 'Switch between Myths, Dictionary, Comics and Videos.' },
          { target: 'search', text: 'Search for a myth by a word.' },
          { target: 'chips', text: 'Topic chips: show only one topic, like dengue. On a phone, tap Filters first.' },
          { target: 'card', text: 'A myth card. Tap to flip it.' },
        ],
      },
      {
        title: 'Read the fact',
        text: 'The back of the card gives the fact, why people believe the myth, and how to check.',
        shot: 'library-card',
        alt: 'A flipped myth card: the fact in green, then Why people believe it and How to check.',
        callouts: [
          { target: 'fact', text: 'The fact, in plain words.' },
          { target: 'why', text: 'Why people believe the myth. No one is blamed.' },
          { target: 'check', text: 'How to check it yourself.' },
        ],
        tip: 'For any health worry, talk to your health worker or barangay health center.',
      },
      {
        title: 'Dictionary',
        text: 'Look up AI words in plain language, like "chatbot" or "deepfake". Each word has an example.',
        shot: 'library-dictionary',
        alt: "Ara's Dictionary: a search box, a row of letters, and word cards.",
        callouts: [
          { target: 'search', text: 'Type a word to find it.' },
          { target: 'letters', text: 'Jump to a letter.' },
          { target: 'word', text: 'A word with its meaning and an example.' },
        ],
      },
      {
        title: 'Comics',
        text: 'Read short comics about a family facing fake health news. A new episode opens as you finish modules.',
        shot: 'library-comics',
        alt: 'The Comics list: unlocked episodes you can open and locked ones for later.',
        callouts: [{ target: 'episode', text: 'Open an episode to read it.' }],
      },
      {
        title: 'Read a comic',
        text: 'Read one panel at a time. Press NEXT, swipe, or use the arrow keys. You can also read the whole episode as text.',
        shot: 'comics-reader',
        alt: 'The comics reader: one big panel with speech bubbles, panel numbers, and a Next button.',
        callouts: [
          { target: 'stage', text: 'The comic panel.' },
          { target: 'steps', text: 'Go to any panel.' },
          { target: 'next', text: 'Go to the next panel.' },
        ],
      },
      {
        title: 'Videos',
        text: 'All the how-to videos in one place: the one-minute tour of ARAW and a video for every game. Each one is in five languages.',
        shot: 'library-videos',
        alt: 'The Videos tab: video cards for ARAW in one minute and for each game, with their length and languages.',
        callouts: [
          { target: 'tab', text: 'The Videos tab.' },
          { target: 'card', text: 'A video, its length and its languages. Tap it to watch.' },
        ],
      },
    ],
  },
  {
    id: 'me',
    label: 'Me',
    title: 'Me: your profile and settings',
    intro: 'Me is your corner of ARAW. Everything here stays on this device.',
    steps: [
      {
        title: 'Nickname and avatar',
        text: 'Type a nickname (up to 20 letters) and pick an avatar. Ara will greet you by this name. Do not use your full real name.',
        shot: 'me-profile',
        alt: 'Your profile: a nickname box, a grid of pixel avatars, and your stats.',
        callouts: [
          { target: 'nickname', text: 'Type your nickname.' },
          { target: 'avatar', text: 'Tap an avatar to pick it.' },
          { target: 'stats', text: 'Your XP, streak, modules and badges.' },
        ],
      },
      {
        title: 'Accessibility settings',
        text: 'Make ARAW easier to use. All settings are off at first. Turn on what helps you. They work on every screen.',
        shot: 'me-settings',
        alt: 'The Accessibility list with switches for Larger text, High contrast, Extra-large buttons, Screen-reader hints and Reduce motion.',
        callouts: [
          { target: 'larger', text: 'Larger text: makes all words bigger.' },
          { target: 'contrast', text: 'High contrast: stronger colours for bright sun or low vision.' },
          { target: 'buttons', text: 'Extra-large buttons: bigger tap areas.' },
          { target: 'motion', text: 'Reduce motion: fewer bounces and no confetti.' },
        ],
      },
      {
        title: 'Sound settings',
        text: 'Turn the music and the sound effects on or off, and set how loud each one is.',
        shot: 'me-sound',
        alt: 'The Sound settings: a Music switch and volume slider, and a Sound effects switch and volume slider.',
        callouts: [
          { target: 'music', text: 'Music on or off.' },
          { target: 'musicVolume', text: 'How loud the music is.' },
          { target: 'sfx', text: 'Sound effects on or off.' },
          { target: 'sfxVolume', text: 'How loud the sound effects are.' },
        ],
      },
      {
        title: 'Change the language',
        text: 'The language you picked on the first screen is saved. To change it, open Me and find Language under the settings, then tap another language card. It changes right away.',
        list: ['ARAW speaks English, Filipino, Cebuano, Ilokano and Hiligaynon.', 'The translations are new. If a word looks wrong, use Report to tell us.'],
      },
      {
        title: 'About the project',
        text: 'ARAW is part of AIKasalig, a project on responsible AI in Philippine health care, under the DOST-NICER R&D Center on Natural Language Processing for Health Applications at National University. Open About the project from Me (or from the left side on a computer) to read more.',
        shot: 'about',
        alt: 'The About the project page: the partner logos, the story of the AIKasalig project, an At a glance card with the dates, and the credits.',
        callouts: [
          { target: 'wall', text: 'The project partners.' },
          { target: 'story', text: 'What AIKasalig is, and where ARAW fits.' },
          { target: 'glance', text: 'At a glance: who runs it and for how long (February 2026 to January 2029).' },
          { target: 'credits', text: 'The people behind the project and the app.' },
        ],
      },
      {
        title: 'Your certificate',
        text: 'Finish all ten modules to get a certificate. Type your name on it, then print it or download it as a picture. ARAW does not save your name.',
        shot: 'certificate',
        alt: 'The certificate screen: a certificate with the ARAW sun, a name box, and buttons to save or print.',
        callouts: [
          { target: 'certificate', text: 'Your certificate.' },
          { target: 'name', text: 'The name to print on it.' },
          { target: 'save', text: 'Print it, or download it as a picture.' },
        ],
        tip: 'Until then, Me shows how many modules are left.',
      },
    ],
  },
  {
    id: 'report',
    label: 'Report',
    title: 'Report a problem',
    intro: 'Did something break, or did you see wrong or unsafe information? Tell us. Press the flag (Report) on any screen.',
    steps: [
      {
        title: 'Send a report',
        text: 'Pick the kind of problem and write what happened. The screen and item are added for you. Do not write personal health information.',
        shot: 'report',
        alt: 'The Report screen: four problem types, a details box, and buttons to send the report.',
        callouts: [
          { target: 'kind', text: 'Pick the kind of problem.' },
          { target: 'details', text: 'Write what happened (optional).' },
          { target: 'send', text: 'Send the report by email or copy it.' },
        ],
      },
    ],
  },
  {
    id: 'facilitators',
    label: 'Facilitators',
    title: 'For facilitators',
    intro: 'Running an ARAW session in a barangay, school or health center? These tips help the session go smoothly.',
    steps: [
      {
        title: 'Before the session',
        text: 'Prepare the devices on good internet the day before. After the first visit, ARAW works offline.',
        list: [
          'Use any phone, tablet or computer with Chrome, Edge or Safari. One device for one or two people works best.',
          'Open ARAW once on each device while online. Visit Home, one lesson and one game so they are saved for offline use.',
          'Install ARAW on the home screen (see Getting started) so people can find it again.',
          'Charge every device. Bring a power strip and a few earphones.',
          'Print the quick-start sheet at the end of this guide, one per pair.',
          "Start with the one-minute tour on a big screen (Home > Watch the 1-minute tour). Pick the group's language with the buttons under the video.",
        ],
      },
      {
        title: 'Pacing',
        text: 'Keep it short and friendly. One module takes 12 to 15 minutes.',
        list: [
          'Welcome and pre-test: 15 minutes.',
          'One or two modules together: 30 minutes.',
          'Arcade or Daily Challenge in pairs: 15 minutes.',
          'Talk: "When should I trust it?" Share stories from the group: 15 minutes.',
          'Post-test and closing: 15 minutes.',
        ],
        tip: 'Turn the music off in a shared room. Turn on Larger text and Extra-large buttons for seniors.',
      },
      {
        title: 'Pre-test and post-test',
        text: 'ARAW has two matched Fact or Fake tests, Form A and Form B, with 20 items each. They never appear in practice or games, so the result is fair.',
        list: [
          'Pre-test: open the address ending in #/assess/form_A before the lessons.',
          'Post-test: open the address ending in #/assess/form_B after the lessons.',
          'There is no feedback until the end. Ask people to write down the score shown on the last screen.',
          'Nothing is sent anywhere. The scores stay on the device.',
          'Do not show the test items on a screen or in print before the test.',
        ],
      },
      {
        title: 'Good habits to model',
        text: 'ARAW is about calibrated trust, not distrust. Praise careful checking, not just right answers.',
        list: [
          'Say "So close!" too. Mistakes are part of learning.',
          'Never give dosing or diagnosis advice. Point people to a health worker.',
          'Remind people that all names and posts in ARAW are made up.',
          'If you see wrong information in the app, use Report.',
        ],
      },
    ],
  },
];

/** The one-page quick-start sheet in the PDF (for photocopying). */
export const GUIDE_QUICKSTART = {
  title: 'ARAW quick start',
  subtitle: 'Learn when to trust AI and health info.',
  steps: [
    { title: 'Open ARAW', text: 'Open the ARAW link or icon. Pick your language, press SELECT, then press START.' },
    { title: 'Learn', text: 'Tap Learn, then the module where Ara stands. Read each card and tap an answer.' },
    { title: 'Try again', text: '"So close!" means read the tip and try another answer. No one loses for trying.' },
    { title: 'Fact or Fake', text: 'Read the post. Press FACT or FAKE. Read why. Every fake gets a FAKE stamp.' },
    { title: 'Play', text: "Tap Arcade for short games. Not sure how? Watch the game's video. Tap, click, or use the arrow keys." },
    { title: 'Make it easier', text: 'Tap Me. Turn on Larger text or Extra-large buttons. Turn the music off if you like.' },
    { title: 'Ask', text: 'When should I trust it? For health worries, always ask your health worker.' },
  ],
  footer: 'Need help? Press the flag (Report) on any screen.',
} as const;
