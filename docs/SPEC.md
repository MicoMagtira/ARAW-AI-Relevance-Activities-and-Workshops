# ARAW: Product Spec

**ARAW = AI Relevance Activities and Workshops.** A fun, gamified, desktop-first (and fully responsive) web app that teaches
non-technical Filipinos (seniors, parents, students, health workers) AI literacy and how to resist health misinformation.

- Content rules: `docs/CONTENT_GUIDE.md`. Visual system: `docs/DESIGN.md` (8-bit, desktop-first, the visual authority).
- `design/mockup/*.dc.html` is a content and flow reference only (screens, copy, colours, interactions), never a style or layout reference.
- App version shown in the app and in reports: `0.1.0 beta` (read from `package.json`).
- Credit line (splash, sidebar footer, About, certificate): **An AIKasalig project · DOST-PCHRD · National University**.
- Licences: MIT for code, CC BY 4.0 for content (lessons, items, Komiks, art), credited to AIKasalig, NU and DOST.

---

## 1. Core idea: calibrated trust

ARAW does not teach people to "trust less". It teaches them to **trust the right things for the right reasons**.
Over-suspicion is a failure too: a player who calls every true health post "fake" has not learned anything useful.

- Every module ends with the same card: **"Kailan ako magtitiwala?"** (When should I trust?), three plain bullets.
- Scoring rewards **discernment** (telling true from false), not doubt. Fact or Fake reports both skill and lean (see section 6).
- Every game that has an "AI said X" moment includes cases where the AI is right and following it is the correct move.
- The app always points to people and institutions that can help: health workers, the barangay health center, DOH, FDA.

## 2. Cast and Ara's voice

All characters are fictional. Real cases are described as patterns, never by name.

| Character | Who | Teaches through |
|---|---|---|
| **Ara** | Sun-spirit girl, the mascot and guide. Pixel-art sprite with sun-ray gold hair and a navy outfit. | Hints, recaps, briefings, badge ceremonies. Celebrates wins, never shames. |
| **Lola Nena** | Grandmother with maintenance meds, curious about "natural cures". | Miracle-cure and herbal scenarios; maintenance meds. |
| **Tita Baby** | Forwards everything to the family GC, always out of love. | Messenger forwards; correcting family kindly. |
| **Kuya Jun** | Barangay Health Worker (BHW). | The trusted local source; how to check with DOH and FDA; AI as a tool at work. |
| **Bea** | Student who uses AI chatbots for everything. | Chatbot trust, AI errors, privacy, digital wellbeing. |
| Aling Nena's sari-sari store, the barangay hall, the health center | Recurring places. | Settings for games and Komiks. |

**Ara's voice** (full rules in `CONTENT_GUIDE.md`): a bubbly *ate* who teases but is kind.
- Reactions: "Hala!", "Uy, galing!", "Ayan!", playful nudges ("Sure ka na diyan? 👀").
- Wrong answers: "Muntik na! Here's the trick..." then the explanation. Never mocks the player or people who believe myths.
- Her jokes target the villains, never the player or believers.
- Short lines: one or two sentences per bubble.

## 3. Module template (12 to 15 minutes, one idea per screen)

Each module is data-driven (`src/modules/mNN/`) and runs in the shared module runner. Steps:

1. **Hook.** One story-moment screen with the cast and Ara ("Tita Baby just forwarded this...").
2. **Lesson cards.** Six to eight cards. Each has exactly one micro-interaction. Card types:
   - `story-hook`: cast scene plus one line; tap to continue.
   - `info`: one idea, at most ~60 words, a pixel illustration; tap Next.
   - `reveal`: tap tiles or a "Show me" button to reveal hidden parts (2 to 6 tiles).
   - `choice`: one question, 2 to 4 options, one correct, instant feedback (why) for every option.
   - `swipe-sort`: 4 to 8 mini-cards sorted into two bins (swipe on touch, buttons and arrow keys everywhere).
   - `poll`: opinion question with no right answer; shows a friendly reflection after answering.
   - `takeaway`: the "Kailan ako magtitiwala?" card (three bullets).
3. **Module game.** The module's signature game (lazy-loaded).
4. **"Kailan ako magtitiwala?"** Three-bullet takeaway card.
5. **Mini Fact or Fake.** Five practice items tagged to the module (M4 uses ten and shows the Truth Radar). Never Form A or B.
6. **Reward.** Badge ceremony (confetti, Ara "wow" then "happy"), XP tally, then: next module unlocks, next Komiks episode
   unlocks, and for M6 to M10 the module's endless game joins the Arcade.

Rules:
- Modules unlock **sequentially** (M1 is open at start). Completed modules can be replayed (no repeat card XP).
- Progress saves after every card; leaving mid-module resumes at the same card.
- **Module games never block progress.** Finishing a module game always counts as completion; stars (1 to 3) show mastery
  and a "Try again" button is offered. Seniors must never get stuck.
- Every lesson card and game screen shows a Report flag carrying the card or item id.

## 4. The 10 modules

Modules M1 to M5 are the **Core modules**; M6 to M10 are **More modules**. Both rows sit on the same Learn path.

### M1 · What Is AI, Really?
- **Topic:** what AI is; AI around us; real AI vs hype.
- **Objectives.** Learners can: describe AI as "learning patterns from many examples to make guesses"; spot AI they already use
  (feed, face filters, Maps traffic, spam filters, voice assistants, symptom-checker apps); tell real AI from hype ("AI-powered" supplements).
- **Hook:** Lola Nena: "Is my phone listening to me? It keeps showing me tea ads!"
- **Cards:**
  1. `info` AI = learning patterns from many examples to make guesses.
  2. `reveal` The three parts: Examples → Patterns → Guess (tap each).
  3. `choice` A computer saw 1,000 mango photos. What did it learn? (patterns of shape and colour, not "what a mango tastes like").
  4. `reveal` AI you already use: feed, face filter, Maps traffic, spam filter, voice assistant, symptom checker.
  5. `choice` Maps says "20 minutes". A promise or a guess? (a guess from patterns).
  6. `reveal` AI in health: X-ray reading helpers, chatbots, appointment systems, claims-fraud flags. "AI helps; people decide."
  7. `choice` A supplement says "AI-powered formula". Does the sticker make it work? (No; check FDA registration).
  8. `poll` Where did you meet AI this week?
- **Takeaway:** trust AI for low-stakes guesses but double-check; "AI-powered" is a sticker, not proof; for health decisions, a health worker decides.
- **Game: AI or Not?** (swipe sort; also teaches the swipe gesture used later)
  - *Mechanic:* a deck of 12 everyday things drawn (seeded) from a pool of ~24: Facebook-style feed, face filter, calculator,
    rice-cooker timer, symptom-checker app, Maps traffic, spam filter, light switch, voice assistant, "AI-powered" supplement, etc.
  - *Loop:* card appears → swipe right **AI** / left **Not AI** (or buttons, or ←/→ keys) → instant one-line why → next.
    Hype cards ("AI-powered" tea) count as Not AI with a special "Hype alert!" explanation.
  - *Scoring:* +10 per correct, +5 bonus for each 3-in-a-row. Stars: 3 at ≥11/12, 2 at ≥8, else 1.
  - *Win/lose:* always completes after 12 cards; no fail state.
- **Badge:** *Unang Sinag* (First Light).

### M2 · How AI Learns and Makes Mistakes
- **Topic:** training data, bias, confident errors, explainability.
- **Objectives.** Learners can: explain that AI learns only from the examples it is given; recognise that lopsided examples
  produce biased AI; recognise that AI can be confidently wrong; say why "Why did the AI say that?" is a fair question.
- **Hook:** Bea's school project: "Let's teach a computer to catch fake health posts!"
- **Cards:**
  1. `info` AI only knows what it was shown. "Kung ano ang itinuro, iyon lang ang alam."
  2. `choice` A fruit sorter trained only on green mangoes sees a ripe yellow mango. What does it say? ("Not a mango").
  3. `reveal` Lopsided examples: a voice assistant trained mostly on one accent misunderstands Bisaya speakers.
  4. `choice` The AI says "98% sure". Does a high number mean it is right? (No; it can be confidently wrong).
  5. `reveal` "Why did the AI say that?": highlighted words show what it relied on.
  6. `swipe-sort` Balanced vs lopsided training sets.
  7. `poll` Would you trust a detector trained only in English for posts in your language?
- **Takeaway:** trust AI more when it was trained on examples like your situation; a confident number is not proof; ask "why?" and expect an answer.
- **Game: Turuan si AI** ("Teach the misinfo detector")
  - *Mechanic:* the player trains a real tiny in-browser classifier (naive Bayes over word tokens).
  - *Loop:* (1) **Train:** label ~10 English example posts as Fake or Real. (2) **Test:** the detector rates 8 new posts,
    including Taglish and Cebuano fakes, and lets the local-language fakes slip through. (3) **Why?:** a button highlights
    the words the detector relied on. (4) **Fix:** add ~6 local-language examples. (5) **Retest:** accuracy visibly improves.
  - *Scoring:* labelling accuracy (+10 each) and detector accuracy before/after shown as two pixel bars. Stars by final
    detector accuracy: 3 at ≥85%, 2 at ≥65%, else 1.
  - *Win/lose:* completes after the retest; no fail state. Sets up M4 ("now YOU are the detector").
- **Badge:** *Guro ni AI* (AI's Teacher).

### M3 · AI and Your Health
- **Topic:** chatbot answer quality, red flags, health data privacy, AI assists doctors.
- **Objectives.** Learners can: judge whether a chatbot's health answer is usable, wrong, or a "see a health worker now" case;
  know the red-flag symptoms that always go to a professional; protect their health data (what not to type, app permissions);
  understand that AI assists doctors and does not replace them.
- **Hook:** Bea has fever and a headache at midnight and asks a chatbot.
- **Cards:**
  1. `info` Chatbots predict likely words. They cannot examine you.
  2. `reveal` Three kinds of answers: Usable · Wrong · See a health worker now.
  3. `swipe-sort` "Magpatingin agad" (go now) vs "Ask at the health center": chest pain, trouble breathing, dengue warning signs,
     stroke signs vs mild cold, small scratch.
  4. `choice` Which answer is better? The one that says "I'm not sure, please see a health worker" beats the confident cure.
  5. `choice` What should you NOT type into a chatbot? (full name + PhilHealth number + diagnosis).
  6. `choice` A step-counter app asks for your contacts and photos. Allow? (No; it does not need them).
  7. `reveal` AI helps doctors read X-rays; the doctor decides and is responsible.
- **Takeaway:** trust a chatbot for general explanations, not diagnosis or dosing; red flags always go to a health worker; share the least data possible.
- **Game: Tanong kay Chatbot**
  - *Mechanic:* Bea asks a chat assistant health questions; answers are **scripted** (reviewable, not live AI).
  - *Loop:* 8 rounds drawn (seeded) from a pool of ~16. Each round: question bubble → chatbot answer → player rules
    **Tama** (usable) / **Mali** (wrong) / **Magpatingin** (see a health worker) → feedback card (why, what a good answer says).
    One round is a privacy scenario: a health app asks for contacts, location and photos; the player toggles which to allow.
  - *Scoring:* +10 per correct ruling; red-flag rounds ruled anything but Magpatingin show an extra gentle warning.
    Stars: 3 at ≥7/8, 2 at ≥5, else 1.
  - *Win/lose:* completes after 8 rounds; no fail state.
- **Badge:** *Matalinong Pasyente* (Smart Patient).

### M4 · Tricks of Health Misinformation
- **Topic:** five misinformation tricks as villains; deepfaked doctor endorsements; rating true posts as true; vaccine fear (blame-free).
- **Objectives.** Learners can: name the five tricks; spot them in local-style posts, including AI-deepfaked doctor endorsements;
  correctly rate true posts as true.
- **Hook:** Tita Baby forwards: "Doctor reveals: this tea cures diabetes in 7 days! Share before it's deleted!"
- **Cards:**
  1. `info` Misinformation uses tricks, not just wrong facts. Learn the trick, and you can spot a hundred fakes.
  2. `reveal` Meet the villains: flip Dr. Fake, Miracle Mike, Fear Monger, Conspiracy Kuya, Kwento Kim.
  3. `choice` A video shows a "doctor" selling tea. Best check? (Look for the doctor's own official page and the product's FDA
     registration; looking for glitches alone is unreliable).
  4. `choice` "Share before it's deleted!" Which trick? (Fear Monger: urgency).
  5. `choice` "It worked for my neighbour!" Enough proof? (No; one story is not evidence: Kwento Kim).
  6. `swipe-sort` Fact or trick? Includes true posts so learners practise saying "true" too.
  7. `reveal` How vaccine fear spreads, blame-free: scary stories travel faster than checks; vaccines are tested and monitored after approval.
- **Takeaway:** trust a post when the source checks out, other trusted sources agree and no trick is doing the work; tricks are a
  reason to check, not proof it is false; true health news exists, so don't doubt everything.
- **Game: Spot the Tactic** (plus the 10-item Fact or Fake round as the module's mini round)
  - *Mechanic:* collectible villain cards. Each villain has 2 HP shown as pixel hearts.
  - *Loop:* a post appears (seeded from ~20 templates) → player picks which villain's trick it uses from the 5 cards →
    correct: villain loses 1 HP with a hit animation, Ara jokes at the villain; wrong: "Muntik na!" with the tell-tale sign highlighted.
    10 posts per play, at least 2 per villain.
  - *Scoring:* +10 per correct pick. A villain at 0 HP is "defeated" and awards its villain badge. Stars: 3 at ≥9/10, 2 at ≥6, else 1.
  - *Win/lose:* completes after 10 posts; undefeated villains can be beaten on replay.
- **Badges:** *Bantay Katotohanan* (Truth Guardian) for the module, plus one per villain: *Talo si Dr. Fake*, *Talo si Miracle Mike*,
  *Talo si Fear Monger*, *Talo si Conspiracy Kuya*, *Talo si Kwento Kim*.

### M5 · Check Before You Share
- **Topic:** a three-step checking habit; replying kindly; where to report.
- **Objectives.** Learners can: apply **Pause → Check who said it → Look for another source** (FDA product verification, DOH,
  independent fact-checkers, the local health worker); reply to family kindly without shaming; know where to report.
- **Hook:** the family GC lights up: Tita Baby forwards a miracle-cure post with three 🙏 emojis.
- **Cards:**
  1. `info` Pause: if a post makes you scared or angry, that is the moment to pause.
  2. `reveal` Check who said it: page name, date, official account, a real person you can ask.
  3. `choice` Which is "another source"? (DOH's official page, an independent fact-checker, your health worker; not another forward).
  4. `reveal` FDA verification step by step: search the product name → registered or not → "No approved therapeutic claims" means it is not medicine.
  5. `choice` Pick the kindest helpful reply to Tita (warm, with a source) vs shaming replies.
  6. `choice` Should you quote-share the fake to warn people? (Better: reply privately and share the correct info instead).
  7. `reveal` Where to report: the platform's Report button, fact-checkers, the FDA for illegal products, the cybercrime hotline for scams.
- **Takeaway:** trust a forward after you have checked who said it and found another trusted source; kindness keeps family listening; when unsure, don't share.
- **Game: Tita's GC**
  - *Mechanic:* a branching mock Messenger-style family group chat (Lola Nena, Tita Baby, Kuya Jun, Bea, the player).
  - *Loop:* 3 scenarios per play from a pool of 5. Each scenario: a forward arrives → the player chooses at each node among
    **React**, **Verify** (opens a mini check: who posted, FDA/DOH lookup result), **Reply** (pick from 3 replies) or **Forward**.
    The chat continues based on choices; the ending shows a "family ripple" (who believed it, who checked, who felt hurt).
  - *Scoring:* every reply is scored on **Accuracy** (0 to 2) and **Kindness** (0 to 2), shown as two meters. Forwarding an
    unchecked fake scores 0 accuracy. Stars by total over the 3 scenarios: 3 at ≥80%, 2 at ≥50%, else 1.
  - *Win/lose:* completes after 3 scenarios; no fail state.
- **Badge:** *Liwanag ng Pamilya* (Family's Light).

### M6 · Katuwang si AI (AI and Jobs)
- **Topic:** AI as a tool at work; what AI is good and bad at; humans in the loop; responsibility.
- **Objectives.** Learners can: name tasks AI does well (repetitive, fast, pattern-based) and tasks that need people
  (empathy, context, judgement, accountability); explain "human in the loop"; say who is responsible when AI is used at work.
- **Hook:** Kuya Jun is buried in paperwork; the barangay gets a new AI helper.
- **Cards:**
  1. `info` AI is a tool. People do the caring.
  2. `swipe-sort` Good for AI vs Needs a person: count stock, translate a leaflet draft, comfort a worried mother, decide on a referral.
  3. `reveal` AI's weak spots: empathy, local context, judgement calls, accountability.
  4. `choice` The AI translates a leaflet into Hiligaynon. Who checks it? (A fluent speaker, before printing).
  5. `info` Jobs change more often than they vanish; new skills matter.
  6. `choice` The AI gave a wrong schedule. Who is responsible? (The people who chose and use the tool).
  7. `poll` Which task would you hand to AI?
- **Takeaway:** trust AI with repetitive drafts you can check; keep people for care and decisions; someone must always be responsible.
- **Game: Hati Tayo!** (task-splitting tycoon, endless)
  - *Mechanic:* a day in Kuya Jun's BHW work or Aling Nena's sari-sari store (random). Tasks arrive on a conveyor queue.
  - *Loop:* drag (or select + key) each task to the **AI** lane or the **Human** lane. AI finishes repetitive tasks instantly
    but fails empathy/judgement tasks ("The AI told the worried mother 'Error 404: comfort not found'"). Humans are slower
    (limited worker time). A day ends after a set number of tasks; each new day is faster with new task mixes. Days never repeat (seeded).
  - *Scoring:* +points per correctly placed task, time bonus for clearing the queue; **Service meter** falls on wrong placements
    and when the queue overflows.
  - *Win/lose:* endless; game over when the Service meter empties. Score = points; days survived shown.
- **Badge:** *Tulong-Tulong* (Working Together).

### M7 · Gawa ni AI? (Generative AI and Creativity)
- **Topic:** generative AI; labelling, consent, credit; the maker's side of deepfakes.
- **Objectives.** Learners can: explain that generative AI makes new text, images and voices from patterns; label AI-made content;
  ask consent before using someone's face or voice; credit artists; explain why deepfaked doctor ads cause harm.
- **Hook:** Bea must make a poster for the barangay health drive; an AI tool makes pictures in seconds.
- **Cards:**
  1. `info` Generative AI makes new pictures, text and voices from patterns in lots of examples.
  2. `choice` Should the poster say "Made with AI"? (Yes; labels build trust).
  3. `choice` Use a neighbour's photo without asking? (No; ask first. Consent matters, even for good causes).
  4. `reveal` AI art learned from real artists; credit people whose work you use.
  5. `reveal` Why fake doctor endorsements harm: people trust the face, buy unproven products, may skip real care.
  6. `swipe-sort` Honest vs not-okay poster practices (health facts copied from DOH vs facts "made up by the AI").
  7. `poll` Would you trust a poster more if it said "Made with AI"?
- **Takeaway:** trust AI-made content that is labelled and checked; consent and credit are part of honest work; health facts must come from trusted sources, not from the AI.
- **Game: Gawa Ko 'To!** (creative studio / collage builder, endless)
  - *Mechanic:* random briefs ("Dengue-prevention poster for Barangay Masagana"). Parts palette: AI-generated image, stock photo,
    neighbour's photo, artist's drawing, slogan options, health-fact options (curated true facts plus tempting wrong ones), label and credit stickers.
  - *Loop:* assemble the poster on a grid before the timer ends → **Publish** → checklist reveal: AI parts labelled? consent asked
    (a "Ask permission" step for faces/voices)? artist credited? health fact correct? Missing steps trigger a "Reported!" ending
    for that poster. Briefs speed up and combine requirements as you go.
  - *Scoring:* points per poster from the checklist plus a design-completeness bonus; 3 hearts.
  - *Win/lose:* endless; each "Reported!" poster costs a heart; game over at 0 hearts.
- **Badge:** *Tapat na Likha* (Honest Maker).

### M8 · Pahinga Muna (Digital Wellbeing)
- **Topic:** attention-grabbing design, sleep, AI companions, healthy boundaries.
- **Objectives.** Learners can: name design tricks that keep people scrolling (infinite scroll, autoplay, notifications); explain
  why sleep matters for health; see AI companions as products, not friends; set simple boundaries; know when to talk to a real person.
- **Hook:** 1 AM. Bea is still scrolling; Lola Nena sees the light under her door.
- **Cards:**
  1. `info` Many apps are designed to hold your attention: infinite scroll, autoplay, notifications.
  2. `info` Sleep is health: it helps mood, memory and the immune system.
  3. `reveal` AI companions can feel caring, but they are products made by companies.
  4. `choice` Feeling down for weeks? Talk to someone you trust or a health worker (crisis hotline info shown).
  5. `swipe-sort` Helpful boundary vs not: focus mode, phone-free dinner, notifications off at night vs autoplay on, phone in bed.
  6. `choice` Healthy chatbot use: a tool for tasks, not a replacement for people.
  7. `poll` One boundary you'll try this week.
- **Takeaway:** trust apps that respect your time; a chatbot can help with tasks but real people help with feelings; sleep beats one more video.
- **Game: Tulog na, Bea!** (virtual-pet life sim, endless)
  - *Mechanic:* keep Bea's **Sleep**, **Mood**, **Study** and **Social** meters balanced. Each day is ~60 seconds of game time.
  - *Loop:* events pop up (notifications, autoplay, an over-friendly AI companion: "Stay and chat? I'll miss you!", a friend's
    invite, homework). The player picks actions and sets boundaries (focus mode, phone-free dinner, notifications off at night,
    charge the phone outside the bedroom). Boundaries cost a little now but reduce future pulls. Days never repeat (seeded).
  - *Scoring:* +points per balanced hour; bonus for a "good day" (all meters above 50% at bedtime).
  - *Win/lose:* endless; if any meter hits zero, "Bea needs a reset day" ends the run (gentle framing). Score = points; days shown.
- **Badge:** *Payapang Isip* (Peaceful Mind).

### M9 · Para sa Lahat (Fairness and Accessibility)
- **Topic:** who gets left out of health AI; bias from data; inclusive design; keeping a human option.
- **Objectives.** Learners can: name groups often left out by health tech (low vision, Deaf, other languages, wheelchair users,
  no smartphone); explain that biased data makes unfair AI; suggest fixes (large text, voice, captions, languages, assisted counter);
  insist on a human option.
- **Hook:** the health center installs an AI kiosk; Lola Nena can't read its tiny text.
- **Cards:**
  1. `info` Fair AI works for everyone, not just the people who built it.
  2. `reveal` Who gets left out? Five persona cards.
  3. `choice` The kiosk's voice was trained on one accent. What happens to an Ilocano-speaking farmer?
  4. `swipe-sort` Fixes that help vs don't: large text, voice, captions, more languages, assisted counter vs "faster animations".
  5. `choice` Should the kiosk replace the front-desk staff? (Keep a human option).
  6. `info` Your feedback improves services: tell the health center what didn't work.
  7. `poll` Who in your family would struggle with a kiosk?
- **Takeaway:** trust tools that work for everyone you love; ask for the human option when tech leaves someone out; feedback makes systems fairer.
- **Game: Sa Sapatos Nila** (perspective simulator + fix-it, endless)
  - *Mechanic:* random users visit the kiosk: Lola with blurry vision, a Deaf teen, an Ilocano-only farmer, a wheelchair user,
    someone without a smartphone, and more.
  - *Loop:* (1) **Play through their eyes:** complete the kiosk task (e.g. book a check-up) with that person's filter on
    (blur, muted audio with no captions, unfamiliar language, out-of-reach buttons). (2) **Fix it:** spend limited fix points on
    fixes (voice, large text, language, captions, lower screen, assisted counter) until the person is served. Fixes stay installed,
    so later users get easier, but new users bring new needs.
  - *Scoring:* points per person served, bonus for fixes that help several people, satisfaction stars per visit.
  - *Win/lose:* endless; a person who can't be served leaves; game over after 3 leave.
- **Badge:** *Bukas sa Lahat* (Open to All).

### M10 · Karapatan Mo (Your Rights and Accountability)
- **Topic:** Data Privacy Act (RA 10173) rights in plain words; complaining to the National Privacy Commission; explanation and
  human review of AI decisions; who is responsible.
- **Objectives.** Learners can: list their data rights in plain words (be informed, access, object, correct, erase or block,
  data portability, damages, complain); describe the complaint path (the organisation's data protection officer first, then the
  National Privacy Commission); ask for an explanation and a human review of an automated decision; say that the organisation
  using AI is responsible, not "the AI".
- **Hook:** Tita Baby's health app sent her lab results to a stranger.
- **Cards:**
  1. `info` Your data, your rights: the Data Privacy Act protects personal and health information.
  2. `reveal` Your rights in plain words (tap each).
  3. `choice` An AI rejected your claim. What can you ask for? (An explanation and a review by a person).
  4. `choice` Who is responsible when a clinic's chatbot gives harmful advice? (The clinic that chose to use it).
  5. `reveal` How to complain: write to the organisation's data protection officer → keep records → file with the National Privacy Commission.
  6. `swipe-sort` Privacy red flag vs okay.
  7. `poll` Did you know these rights before today?
- **Takeaway:** trust services that tell you how they use your data; you can ask "why?" and ask for a person; when something goes wrong, someone is accountable. (Educational, not legal advice.)
- **Game: OBJECTION!** (Ace Attorney-style hearing at the barangay hall, endless)
  - *Mechanic:* cases are generated from templates (incident × actor × harm × applicable right): a health app leaked records,
    an AI wrongly flagged a health-insurance claim, a clinic chatbot gave harmful advice. All organisations fictional.
  - *Loop:* read the testimony (4 to 5 statements) → **Press** a statement for more detail → collect evidence cards (4 to 6:
    documents, screenshots, rights cards) → at the false statement shout **OBJECTION!** and present the right evidence or right.
    Case won → next, harder case.
  - *Scoring:* points per case won, bonus for no wrong objections; 5 credibility hearts.
  - *Win/lose:* endless; a wrong objection costs a heart; game over at 0 hearts.
- **Badge:** *Boses ng Karapatan* (Voice of Rights).

## 5. Arcade: the six endless games

**Diversity rule:** each game teaches a different topic with a different mechanic; no game reskins Fact or Fake.
All arcade games are open from the start. The Arcade shows **11 endless games**: these 6 plus the 5 module games of M6 to M10
(each unlocks when its module is complete). A **Practice** row below holds Fact or Fake free play (always open) and replays of
the M1 to M5 module games (unlocked when the module is done).

Shared rules for every endless game:
- Seeded procedural generation (`mulberry32` seeded by an FNV-1a hash of a string); runs never repeat unless the seed is reused (Daily Challenge).
- Health facts shown as true come only from the curated pool, never generated. Every generated fake (scam script, fake post,
  fake poster) shows the **ARAW GAME · FAKE** stamp on reveal.
- Forms A and B never appear.
- Runs inside the shared **GameShell**: HUD, pause (also on tab hidden), How to play, game-over with Ara recap and XP,
  text descriptions of game state for screen readers, keyboard + mouse + touch.
- **First-run briefing:** the first time a game is opened, Ara gives a paged, skippable, ~60-second briefing (5 pages, about
  12 seconds each): (1) hook, (2) the idea in one line, (3) how to play and controls, (4) the health hook, (5) a
  "Kailan ako magtitiwala?" one-liner, then **Start**. Replayable from How to play.
- **Pahinga muna!** After ~10 minutes of cumulative play in a session, Ara pauses the game for a short recap and a stretch suggestion.
- Personal best per game is stored locally.
- Run XP: 10 base + 20 if the run reached the game's "good run" threshold + 20 for a new personal best (max 50 per run).

### Takbo, Data! (data privacy)
- *Mechanic:* endless runner (Google Dino / Temple Run). Ara runs through a procedurally generated barangay (sari-sari store, jeepney stop, health center).
- *Loop:* 3 lanes; switch lanes (↑/↓, swipe, tap top/bottom half) and jump (Space, tap, swipe up) over obstacles (puddles, stray
  chickens, potholes). Pickups: **safe freebies** (free water, health-center flyer, verified-app badge) vs **data traps**
  ("Free load! Just type your birthday", "Win a phone! Send a photo of your ID", "PhilHealth number for a raffle", "Allow contacts").
  Speed rises over time.
- *Scoring:* distance + 10 per safe pickup. **Privacy Shield** (100): data traps drain it (−15 to −30 by sensitivity, ID photo
  and PhilHealth number cost most); safe pickups refill +5; obstacle bumps −10.
- *Win/lose:* game over when the Shield hits 0. Recap lists the data you gave away and why it matters.
- *Health hook:* your health records are worth more than free load.
- *Briefing:* "Hala, freebies everywhere!" → "Some 'free' things cost your data." → controls → "Your PhilHealth number and health
  records are valuable; scammers want them." → "Trust offers that don't ask for more than they need."

### Feed Mo 'To (recommendation algorithms and filter bubbles)
- *Mechanic:* feed curator (doomscroll parody). **You are the algorithm.**
- *Loop:* the current user (Tita first, then endless random users, each with interests) scrolls; pick which of 3 candidate posts
  (generated from templates) to show next before the timer ends. Sensational posts spike **Engagement**; repeating one scary
  topic drops the **Balanced-Feed** meter and her topic chips visibly narrow into a "bubble". 10 picks per user, then the next user.
- *Scoring:* points = engagement gained × a balance multiplier; bonus for ending a user with both meters above 50%.
- *Win/lose:* endless; game over if Balanced-Feed reaches 0 ("Tita only sees scary posts now") or Engagement reaches 0 ("Tita logged off, bored").
- *Health hook:* why scary health posts keep showing up in your feed.
- *Briefing:* "Today, YOU are the algorithm!" → "Feeds pick what keeps people scrolling." → controls → "Scary health posts get
  clicks, so feeds show more of them." → "Trust a feed that shows you many sides; search on purpose for trusted sources."

### Luto ni Ara (prompting and using AI well)
- *Mechanic:* kitchen time-management (Overcooked / Cooking Mama).
- *Loop:* customers order outputs ("Explain dengue to Lola, simple Tagalog, short"). Drag or tap prompt ingredients into the pot:
  **role**, **audience**, **language**, **length**, **format**, **"cite sources"**, **"say if unsure"**. Press **Cook**; the dish
  is the AI's answer. Matching ingredients serve a good dish; missing or wrong ones serve a hilariously wrong dish
  ("A 3-page essay in deep English for Lola"). Orders arrive faster and never repeat.
- *Scoring:* points per order by ingredient match and speed; tips for "cite sources" and "say if unsure" on health orders.
- *Win/lose:* 3 hearts; an expired or badly served order costs a heart; game over at 0.
- *Health hook:* asking a chatbot a health question the right way, and still checking the answer.
- *Briefing:* "Welcome to my kusina!" → "A good prompt is a good recipe." → controls → "For health questions, ask the AI to cite
  sources and say when it's unsure." → "Trust answers that show their sources, and check them with a health worker."

### Sino 'To? (deepfakes and voice-clone scams)
- *Mechanic:* phone switchboard and decisions (Papers, Please-lite). Calls and voice notes shown as transcripts with caller
  cards (no audio in this phase).
- *Loop:* a call comes in ("Anak, naospital ako, send money now!"). Use verification moves before acting: **Secret family question**,
  **Call back the saved number**, **Ask another relative**, **Check the official hotline**. Then **Help** or **Hang up & report**.
  Some calls are AI voice-clone scams (fake relative, fake doctor, fake bank); some are genuine and must be helped. Scam scripts
  are generated from templates; each scam shows the FAKE stamp on reveal.
- *Scoring:* +points for correct outcomes, bonus for using the fewest needed checks (speed), streak multiplier.
- *Win/lose:* 3 hearts; sending money to a scam or hanging up on a verified genuine emergency costs a heart; game over at 0.
- *Health hook:* fake hospital-emergency and fake-doctor scams.
- *Briefing:* "Ring ring! Sino 'to?" → "AI can copy a voice from a short clip." → controls → "Scammers fake hospital emergencies
  to rush you." → "Trust a call after you verify it through a number or person you already know."

### Lamok Lamay (how AI "sees": computer vision errors)
- *Mechanic:* whack-a-mole with an AI-vision overlay. Ties to dengue prevention.
- *Loop:* water containers pop up (drums, tires, flower pots, cans). An **AI camera** draws boxes labelled "larvae 87%". Some boxes
  are false positives (a seed, a leaf bit, a raisin) and some larvae are missed. Tap a correct box to **whack** the larvae, tap a
  wrong box to **reject** it, tap unboxed larvae to **add** a box. Waves get faster.
- *Scoring:* points per correct action; **Precision** and **Catch rate** meters (false positives vs misses) in plain words.
- *Win/lose:* each missed larva that matures becomes a mosquito; game over after 5 escape.
- *Health hook:* remove standing water; AI-assisted surveillance helps but needs human checks.
- *Briefing:* "Bantay lamok time!" → "AI cameras can spot larvae, but they make two kinds of mistakes." → controls → "Dengue
  mosquitoes breed in clean standing water; cover, clean and empty containers." → "Trust the AI camera as a helper; your eyes make the final call."

### Tawid, Lola! (automation bias and human oversight)
- *Mechanic:* Crossy Road-style lanes procedurally generated toward the health center.
- *Loop:* an AI navigation voice (text bubble) says **GO** or **WAIT** for each lane. It is usually right but sometimes confidently
  wrong. The player presses **Go** (step forward) or **Wait**, using their own eyes on the traffic. Reaching the health center starts
  a new, busier street.
- *Scoring:* +points per lane; **Trust Meter** rewards following the AI when it is right and overriding it when your eyes disagree;
  blindly following wrong advice or ignoring correct advice lowers it.
- *Win/lose:* 3 hearts. Lola is never hit: a wrong call means a horn "BEEP!", Lola steps back safely and a heart is lost. Game over at 0.
- *Health hook:* when to follow the app and when to trust your own judgement.
- *Briefing:* "Tara, Lola, sa health center!" → "The AI guide is helpful but not perfect." → controls → "Health apps help, but your
  eyes and your health worker know your situation." → "Trust the app when it matches what you see; speak up when it doesn't."

## 6. Fact or Fake

The only real-or-fake sorting game. Used for module mini rounds, free play, the Daily Challenge, and two hidden parallel test forms.

### Item schema (`src/content/factOrFake/schema.ts`)
| Field | Type | Notes |
|---|---|---|
| `id` | string | `fof-p-001` (practice), `fof-a-01` (form A), `fof-b-01` (form B) |
| `format` | `text` \| `gc_screenshot` \| `image` \| `chatbot_answer` | audio and video come later |
| `domain` | `health_misinfo` \| `ai_in_health_claim` \| `ai_generated_health_content` | |
| `truth` | `fact` \| `fake` | |
| `trick` | `dr_fake` \| `miracle_mike` \| `fear_monger` \| `conspiracy_kuya` \| `kwento_kim` \| `none` | facts use `none` |
| `difficulty` | 1 \| 2 \| 3 | |
| `module` | `m01`..`m10` | topical tag for mini rounds |
| `set` | `practice` \| `form_A` \| `form_B` | |
| `pair_id` | string? | links matched form_A and form_B items |
| `author` | string | fictional page/person/bot name shown on the post |
| `meta` | string | e.g. "Sponsored · 2h", "Forwarded many times" |
| `text` | string | the post, message or chatbot answer |
| `image` | object? | SVG scene descriptor (synthetic scenes and personas only) |
| `explanation` | string | why it is fact or fake |
| `how_to_check` | string | one concrete step |
| `basis` | string | source or rationale (e.g. "WHO dengue fact sheet; DOH 4S") |
| `myth_id` | string? | link to a Myth Library card |
| `review_status` | `unreviewed` \| `in_review` \| `reviewed` | all `unreviewed` now |

A validator checks every item at test time (unique ids, valid enums, facts have `trick: none`, fakes have a trick, forms balanced 10/10,
A/B pairs matched on domain, format, trick and difficulty).

### Sets
- **practice** (≥50 items, all modules): mini rounds, free play, Daily Challenge.
- **form_A** and **form_B** (20 each, 10 fact / 10 fake, matched item-for-item): reserved parallel test forms. Reachable only by a hidden
  route (`#/assess/form_A`, `#/assess/form_B`), never linked in the UI, never in practice, arcade or daily. Binary answers, no
  feedback until the end. Phase 1 stores nothing beyond the device and sends nothing.

### Round rules
- Every round is balanced between fact and fake (odd sizes differ by at most one), drawn without repeats, seeded.
- True items are never "obviously real"; fakes are never cartoonishly fake.
- Answer by **FACT** / **FAKE** buttons, swipe (right = Fact, left = Fake) on touch, or keys (→ or L = Fact, ← or A = Fake).
- Instant feedback card after every answer: correct or "Muntik na!", **why**, **how to check**, trick chip (for fakes), the
  **ARAW GAME · FAKE** stamp (for fakes), and a Report link with the item id.
- Modes: module mini round (5 practice items for that module; 10 in M4), free play (10 balanced random practice items),
  Daily Challenge (3 date-seeded practice items, at least one fact and one fake), assessment (hidden).
- Phase 1 answers are binary everywhere.

### Scoring: d′ and c
Treat **"fake" as the signal**.
- Hit rate `H = P(answer fake | item fake)`, false-alarm rate `F = P(answer fake | item fact)`.
- Log-linear correction so 0% and 100% are safe: `H = (hits + 0.5) / (nFake + 1)`, `F = (falseAlarms + 0.5) / (nFact + 1)`.
- `d′ = z(H) − z(F)` (discernment). `c = −(z(H) + z(F)) / 2` (bias). `z` is the inverse standard normal CDF (Acklam approximation).
- `c > 0`: says "fake" too rarely = **leans too trusting**. `c < 0`: says "fake" too often = **leans too doubtful**.

### Truth Radar (what players see)
Two plain-language pixel meters, never the raw numbers (raw values available in a "details" disclosure):
1. **"How well you tell them apart"**: `d′` clamped to 0..3 → 0..100%. Labels: <0.5 *Just starting*, 0.5–1.5 *Getting there*,
   1.5–2.5 *Sharp eyes*, >2.5 *Truth Radar pro*.
2. **"Do you lean too trusting or too doubtful?"**: `c` clamped to −1..1 on a two-sided slider. |c| ≤ 0.25 *Balanced* (the healthy
   zone, shaded green); c > 0.25 *Leans trusting*; c < −0.25 *Leans doubtful*. Ara gives one tip per lean.
- Rounds under 10 items show the Radar as a "rough read". The **Timbang na Radar** (Balanced Radar) badge needs a round of ≥10
  items with d′ ≥ 1.5 and |c| ≤ 0.25.
- Every correct answer gives 10 XP (not in assessment mode).

## 7. Daily Challenge

- **Date-seeded, same for everyone that day.** Day = the current date in **Asia/Manila**. Seed string `ARAW-YYYY-MM-DD`.
- **Featured game:** rotates through the 11 endless games in a fixed order: Takbo Data!, Feed Mo 'To, Luto ni Ara, Sino 'To?,
  Lamok Lamay, Tawid Lola!, Hati Tayo!, Gawa Ko 'To!, Tulog na Bea!, Sa Sapatos Nila, OBJECTION!.
  Index = (days since 2026-01-01, Manila) mod 11. The run uses the day's seed. If the featured game is a locked module game, the
  daily still lets the player try it ("Trial run"); it does not unlock it in the Arcade.
- **Plus 3 Fact or Fake items** from the practice pool (date-seeded, at least one fact and one fake).
- **One scored attempt per day.** Replays are allowed for fun but don't change the shared result.
- Completion: +30 XP bonus and counts for the streak.
- **Wordle-style share text** (Copy, or the Web Share API where available; no data stored or sent by the app):
  ```
  ARAW Daily · 15 Oct 2026
  Takbo, Data! 🟨🟨🟨⬜⬜ 1,240
  Fact or Fake 🟩🟩🟥
  🔥 4-day streak
  ```
  Game blocks = 5 bands of the game's score scale (each game defines band thresholds); FoF blocks: 🟩 correct, 🟥 wrong.

## 8. Library

Three tabs: **Myths**, **Diksyunaryo**, **Komiks**. Content lives in `src/content/library/`.

- **Myths (Kwentong Kalusugan):** ≥24 Philippine health myths as flip cards. Front: the myth. Back: the fact, why people believe it,
  how to check, linked villain trick chip, related module. Filter by topic, search. Seeds: tawa-tawa as a dengue cure, herbal cancer
  cures, vaccine fear, antibiotics for colds, "pasma"-type beliefs (handled respectfully), deepfaked doctor supplements.
  Practice items can link to a myth (`myth_id`). Home shows a "Myth of the day" (date-seeded).
- **Ara's Diksyunaryo:** ~32 plain-language AI terms: term, one-line meaning, a funny Filipino example ("Halimbawa: ..."), "Seen in
  module X" link. Search plus alphabetical index. Starter terms: algorithm, AI, machine learning, training data, bias, hallucination,
  chatbot, deepfake, voice clone, prompt, feed, viral, bot, troll, fact-check, source, and more.
- **Ara's Komiks, Season 1: "The Miracle Tea".** 10 episodes, 4 to 6 panels each, drawn as pixel SVG scenes from descriptors.
  Episode N unlocks when module N is complete. Arc: Tita Baby's forwarded miracle cure spreads through the family; Lola nearly stops
  her maintenance meds; Bea and Kuya Jun use what the player learned to sort it out kindly.
  1. *The Miracle Tea*: a "doctor" video sells a tea that "replaces maintenance meds"; Tita forwards it.
  2. *Lola's Maintenance Meds*: Lola wonders about stopping her pills; the platform's filter missed the Taglish post.
  3. *Bea Asks the Bot*: the chatbot sounds sure, then says to see a doctor; Bea decides to ask Kuya Jun.
  4. *The Doctor Who Wasn't*: Kuya Jun shows the "doctor" never said it; the family names the tricks.
  5. *Kindly, Tita*: Bea replies kindly in the GC; Tita checks the FDA verification portal herself.
  6. *Kuya Jun's Busy Day*: an AI tool drafts translated leaflets; Kuya Jun still does the home visit.
  7. *A Poster for the Barangay*: Bea makes an honest health poster, labelled, with permission and credit.
  8. *Lights Out, Bea*: Bea stays up reading debunks, learns to rest; phone-free dinner with Lola.
  9. *A Kiosk for Lola*: the new kiosk confuses Lola; the family gives feedback and the kiosk gets large text and voice.
  10. *The Hearing*: the tea seller's app leaked buyers' data; the family learns their rights; Lola keeps her meds and her check-up is good.

## 9. Rewards

- **XP:** lesson card 5 (first completion only), module game completion 50, each correct Fact or Fake item 10, module complete 100,
  arcade run 10 to 50 (section 5), Daily Challenge bonus 30.
- **Badges:**
  - 10 module badges (section 4).
  - 5 villain badges (M4 Spot the Tactic).
  - *Timbang na Radar* (Balanced Radar).
  - Streak badges: *Tatlong Araw* (3 days), *Isang Linggo* (7 days), *Araw-araw* (30 days).
  - *Buong Araw* (Full Day) for completing all 10 modules.
  - Badge earned → ceremony dialog with confetti (or a static sparkle with reduced motion) and a toast.
- **Streak:** a day counts when the player completes any activity (a lesson card, a game run, a Fact or Fake round, or the Daily
  Challenge) on that Asia/Manila date. **One freeze per week** (Monday to Sunday, Manila): if exactly one day was missed and this
  week's freeze is unused, it is used automatically and the streak continues ("Streak freeze used! ❄️"). Otherwise the streak restarts
  at 1 with a kind message ("Bagong simula! Welcome back."). Never guilt-trip.
- **Certificate:** after all 10 modules. Generated client-side: the player types a name (**not stored**), sees a preview, then
  **Print** (print CSS, A4 landscape) or **Download PNG** (drawn on canvas). Shows: name, "completed all 10 ARAW modules", date,
  badges earned, pixel Ara and sunrise border, credit line, and "Educational, not medical advice".
- **Storage:** browser `localStorage` on this device only, keys prefixed `araw:v1:` (profile, progress, settings, scores, daily, streak,
  seen). All access in try/catch; the app works (without saving) if storage is blocked. Me → "Reset my progress" clears it after a confirm dialog.

## 10. Me screen and accessibility settings

- **Profile:** nickname (default "Kaibigan", max 20 chars) and an inclusive avatar picker drawn in Ara's pixel style (6+: young woman
  long hair, young man short hair, Lola with a bun, woman in a hijab, Lolo with glasses, teen wheelchair user; varied skin tones).
- **Stats:** total XP, current streak (and best), modules done (x/10), badges (x/total), best Truth Radar.
- **Badge cabinet:** all badges, locked ones shown as silhouettes with "How to earn".
- **Accessibility** (all **off** by default, applied app-wide via root classes on `<html>`, persisted):
  | Setting | Hint shown | Effect |
  |---|---|---|
  | Larger text | Makes all words bigger | Type scales ×1.2 (Nunito and Press Start 2P) |
  | High contrast | Stronger colours for bright sun or low vision | High-contrast theme (DESIGN.md) |
  | Extra-large buttons | Bigger tap areas | Min target 56px, larger paddings |
  | Screen-reader hints | Extra spoken descriptions for TalkBack | Adds extra `aria-describedby` hints and game-state narration |
  | Reduce motion | Fewer bounces and no confetti | Disables bob, confetti, barber-pole motion and transitions (also on by OS `prefers-reduced-motion`) |
- **Language:** English · more coming (disabled row).
- **Certificate** button (locked until all 10 modules).
- **Report a problem**, **About and licences** (MIT code, CC BY 4.0 content, font licences OFL, credit line, beta note),
  **Reset my progress**.

## 11. Report button

Available app-wide: sidebar footer (desktop), header flag icon (tablet and phone), the module runner top bar (with card id), every
Fact or Fake feedback card (with item id), and the game pause menu.

- Screen `#/report?screen=<screen>&item=<id>`. Categories: **Something broke** (Bug), **Wrong or unsafe info** (Wrong content),
  **Suggestion**, **Other**. Optional free-text details.
- "Added automatically" preview: screen, item id (if any), app version, device summary (OS + browser parsed from the user agent).
- Opens `mailto:AIKasalig@gmail.com` with encoded subject **`[ARAW] Report: <category label>`** and body:
  ```
  Screen: <screen>
  Item: <item id or "none">
  App: ARAW <version>
  Device: <OS>, <browser>

  What happened:
  <details>
  ```
- Privacy note: "This opens your email app with the details filled in. Nothing is sent until you press Send there. Please do not
  include personal health information."

## 12. Navigation per breakpoint

| Width | Navigation |
|---|---|
| **Desktop ≥1024px (primary)** | Left sidebar (logo, Home, Learn, Arcade, Library, Me; footer: Report a problem, credit, beta note) + gold header banner (screen title, XP and streak chips, avatar). |
| **Tablet 600–1023px** | Gold header (logo + BETA chip, XP, streak, report flag) + sticky top tab bar with the same 5 items (icon + label). |
| **Phone <600px** | Compact gold header (logo, XP, streak, report flag) + fixed bottom tab bar: Home, Learn, Arcade, Library, Me. |

- **Focus mode:** the module runner, Fact or Fake rounds, games and the certificate hide the sidebar/tabs and show a slim top bar
  (Close with "Leave? Your progress is saved." confirm, progress, Report). Same features at every size.
- Hash routes (static hosting):
  `#/` Home · `#/learn` · `#/learn/mNN` (runner) · `#/play/fact-or-fake` · `#/assess/form_A|form_B` (hidden) · `#/arcade` ·
  `#/arcade/<slug>` · `#/daily` · `#/library/myths` · `#/library/glossary` · `#/library/komiks` · `#/library/komiks/<n>` · `#/me` ·
  `#/report` · `#/certificate` · `#/about`. Unknown routes show a friendly Not Found with Ara and a Home button.
- Game slugs: `takbo-data`, `feed-mo-to`, `luto-ni-ara`, `sino-to`, `lamok-lamay`, `tawid-lola`, `hati-tayo`, `gawa-ko-to`,
  `tulog-na-bea`, `sa-sapatos-nila`, `objection`; module games `ai-or-not`, `turuan-si-ai`, `tanong-kay-chatbot`,
  `spot-the-tactic`, `titas-gc`; plus `fact-or-fake`.

## 13. Screen list

| # | Screen | Purpose |
|---|---|---|
| 1 | Splash (boot) | First visit per session: 8-bit sunrise, ARAW wordmark, loading bar, **SIMULAN**, credit, beta note. Skippable, not a route. |
| 2 | Home | Greeting by time of day with nickname, Continue card, Daily Challenge card, path preview, Arcade and Myth-of-the-day shortcuts, badge strip, stats. |
| 3 | Learn | The 10-module path (Core and More rows), states done/current/locked, module details panel or sheet. |
| 4 | Module runner | Hook → cards → game → takeaway → mini Fact or Fake → reward. |
| 5 | Fact or Fake | Free play rounds, feedback cards, results with Truth Radar. |
| 6 | Assessment (hidden) | Form A/B, no feedback until the end. |
| 7 | Arcade | Featured daily game, 11 endless game tiles, Practice row, game details. |
| 8 | Game | GameShell: briefing, HUD, pause, game over. |
| 9 | Daily Challenge | Today's game + 3 items, result card, share. |
| 10 | Library: Myths | Flip cards, filter, search. |
| 11 | Library: Diksyunaryo | Search, A–Z, glossary cards. |
| 12 | Library: Komiks | Episode list and panel reader. |
| 13 | Me | Profile, stats, badge cabinet, accessibility settings, language, about, reset. |
| 14 | Report | Category, auto context, details, mailto. |
| 15 | Certificate | Name entry, preview, print, PNG. |
| 16 | About and licences | What ARAW is, licences, credits, beta and not-medical-advice note. |
| 17 | Not Found | Friendly fallback. |

## 14. Non-functional requirements

- Desktop-first, fully responsive 320px to 2560px with no horizontal page scroll; see `DESIGN.md`.
- WCAG 2.2 AA baseline always on. All images, icon buttons and game states have text alternatives.
- Initial JS ≤ 200 KB gzip; every game and module lazy-loaded; smooth on low-end Android.
- Works offline after first visit (PWA), no backend, no tracking, no data leaves the device except what the player chooses to email or share.
- A visible "Beta: educational, not medical advice" note stays in the app.
