# ARAW: Content Guide

Rules for every word, item, myth, glossary entry, Comics script, game string and Ara line in ARAW.
Product structure is in `docs/SPEC.md`; visuals in `docs/DESIGN.md`.

## 1. Audience and tone

Writing for non-technical Filipinos: seniors, parents, students, health workers. Many read English as a second language, on a phone, outdoors.

- **Language:** all player-visible text is English: UI, lessons, dialogue, games, comics, glossary, myths, Fact or Fake items, badges,
  certificate, aria-labels and alt text. Only proper names stay Filipino: the game titles (the 11 arcade games and the module games),
  character names including kinship titles used as names (Ara, Lola Nena, Tita Baby, Kuya Jun, Ate Liza, Aling Nena), fictional places,
  pages and brands, and the app name ARAW. All UI strings go through `src/app/i18n.ts`. (Exception: Module 2's detector game keeps its
  Taglish and Cebuano example posts, because the lesson is that an English-only AI misreads local languages.)
- **Reading level:** about Grade 6 to 8. Short, common words. One idea per sentence; sentences under ~20 words.
- **Length:** info cards ≤ 60 words; feedback ≤ 40 words (why) + ≤ 25 words (how to check); buttons 1 to 3 words.
- **Voice:** warm, playful, respectful. Talk *with* people, never down to them. Use "you" and "we".
- **Calibrated trust:** never "trust nothing". Always show what *good* sources look like and when trusting is the right call.
- **No shame, no blame:** people who believe or share myths do it out of care. Mock the trick, never the person.
- **Local flavour stays in the names and the setting,** not in the words: Lola, Tita Baby and Kuya Jun as names, the family GC,
  the barangay health center, and everyday foods like adobo and pancit. Use plain English for everything else ("friend", "thank you",
  "So close!", "Great job!", "Let's go", "Get checked").
- **Emoji:** at most one per Ara line, none in health facts or explanations.
- **Numbers and dates:** digits ("3 days"), dates like "15 Oct 2026".

## 2. Ara's voice

Ara is a bubbly big sister: teasing but kind, never shaming.

| Moment | Style | Examples |
|---|---|---|
| Greeting | Time of day + nickname + a nudge | "Good morning, Friend! Ready for Module 3?" · "It is late! One quick game, then rest?" |
| Correct | Short cheer, name the skill | "Great job! You checked who said it." · "There you go! Sharp eyes." |
| Wrong | "So close!" + the trick, never "wrong!" alone | "So close! Here's the trick: the 'doctor' never posted this on their own page." |
| Hint / nudge | Playful question | "Are you sure about that? 👀 Look at who posted it." |
| Villain jokes | Aim at the villain only | "A cure-all again, Mike? You have no FDA number!" |
| Badge | Big, warm celebration | "Wow! You earned Truth Guardian! So proud of you. ✨" |
| Break | Gentle, caring | "Time for a break! Stretch, drink water, then come back." |
| Streak reset | Welcoming, no guilt | "A fresh start! Welcome back, Friend." |
| Empathy (story) | Soft, serious when needed | "Lola is worried. Let's help her ask the right person." |

Rules: one or two sentences per bubble; jokes never about age, body, region, religion, illness or belief; Ara never gives medical
advice herself; she points to health workers. Sprite mood mapping: correct → happy; wrong → think; badge → wow then happy;
hint → wink; sad only for story empathy, never at the player.

## 3. Health accuracy rules

1. **Only well-established facts** (WHO, DOH, FDA Philippines level consensus). If in doubt, leave it out or rephrase to "ask a health worker".
2. **Never give dosing, diagnosis or treatment plans.** No milligrams, no "take X for Y". Medicines are named only to say "ask a health worker first".
3. **Always point to people:** health workers, the barangay health center, a doctor; emergency help for red flags.
4. **True facts come only from the curated, reviewed pool.** Games and generators never invent health facts.
5. **Every content entry** carries `basis` (source or rationale, e.g. "WHO dengue fact sheet") and `review_status`.
6. **Myths are handled respectfully**, especially cultural beliefs such as *pasma*: acknowledge why people believe them,
   avoid ridicule, focus on what to do ("if symptoms continue, see a health worker").
7. **Sensitive topics (vaccine fear, past vaccine controversies) are blame-free:** explain how fear spreads and how safety is monitored.
   No politicians, officials, companies or real cases named.
8. **Legal content (M10) is general and plain**, labelled "educational, not legal advice".
9. **Real institutions** (WHO, DOH, FDA Philippines, National Privacy Commission, independent fact-checkers, official hotlines) may
   appear only as *places to check or report*. Never put words in their mouths, never use their logos, never present a fake as theirs.
   A fake may *imitate* an authority with an invented look-alike page name (e.g. "DOH Updates PH Official (fan page)") only when the
   lesson is about impersonation.

### Red flags: always "Magpatingin agad" (go to a health facility now)
Chest pain or pressure · trouble breathing · stroke signs (face drooping, arm weakness, speech trouble) · dengue warning signs
(see below) · fainting or seizures · severe bleeding · signs of dehydration in a child (very little urine, no tears, very sleepy) ·
high fever in a young baby · an animal bite or scratch · thoughts of self-harm (talk to someone now; crisis hotline 1553).

### Safe facts list (may be used as true content)
Phrase them plainly; add "ask a health worker" where useful.

**Dengue and mosquitoes**
- Dengue spreads through bites of *Aedes* mosquitoes, which bite mostly in the daytime.
- They breed in clean standing water: cover, clean and empty containers (drums, tires, flower pots, cans) every week.
- DOH's 4S: Search and destroy mosquito breeding places, Secure self-protection, Seek early consultation, Support fogging or spraying only in hotspot areas (older wording: "Say yes to fogging only during outbreaks").
- Dengue warning signs need urgent hospital care: severe stomach pain, vomiting that won't stop, bleeding gums or nose, blood in
  vomit or stool, being very tired or restless, fast breathing, cold clammy skin.
- There is **no herbal cure for dengue**. Tawa-tawa or papaya leaf have not been proven to cure it; care means fluids and close
  monitoring by health workers. Do not let a remedy delay a check-up.
- With suspected dengue, ask a health worker before taking any pain reliever (WHO advises against aspirin and ibuprofen).

**Medicines**
- Antibiotics kill bacteria; they **do not work on viruses** such as colds and flu.
- Using antibiotics when not needed helps germs become resistant. Use them only when prescribed, exactly as a health worker says.
- **Do not stop or change maintenance medicines** (for blood pressure, diabetes, etc.) without talking to your doctor.
- Supplements and herbal products do not replace prescribed medicine.
- In the Philippines, food supplements must carry the note **"No approved therapeutic claims"**: they are not medicine.
- You can check whether a product is registered on the **FDA Philippines online verification portal**. Unregistered does not
  always mean dangerous, but health claims on unregistered products are a red flag.

**Vaccines (blame-free framing)**
- Vaccines are tested in large studies before approval and **monitored after approval**; side effects are reported and reviewed.
- Most side effects are mild and short (sore arm, mild fever). Serious ones are rare, and monitoring is how they are found.
- Routine childhood vaccines are available free at health centers.
- Fear spreads faster than facts because scary stories are shared more; checking with a health worker is a good habit, not a sign of distrust.

**Everyday health**
- Washing hands with soap and water for at least 20 seconds helps prevent many infections.
- Oral rehydration solution (ORS) helps prevent dehydration from diarrhea; see a health worker for danger signs.
- High blood pressure often has no symptoms; regular checks at the health center help.
- There is no proven herbal cure for diabetes or cancer; early check-ups and screening help.
- A cough lasting two weeks or more should be checked for TB; TB is curable with complete treatment, available free at health centers.
- Dog or cat bite: wash the wound with soap and running water and go to an animal bite center right away; rabies is preventable but deadly once symptoms appear.
- Wading in flood water raises leptospirosis risk; see a health worker after exposure.
- Boiling water (a rolling boil) makes it safer to drink.
- Sleep supports mood, memory and the immune system; teens need more sleep than adults.
- Smoking and vaping harm the lungs and heart.

**AI and data**
- AI learns patterns from examples and makes guesses; it can be confidently wrong ("hallucination").
- Chatbots cannot examine you and are not doctors; don't type your full name, ID numbers or diagnoses into them.
- Videos, photos and voices can be faked with AI; spotting glitches is unreliable, so **check the source** instead.
- A real doctor endorsing an unregistered "miracle" product is a red flag; check the doctor's own official page.
- The Data Privacy Act (RA 10173) gives rights to be informed, to access, to object, to correct, to erase or block, to data
  portability, to damages, and to complain to the National Privacy Commission.

**Places to check and report** (no URLs needed in content): your health worker or barangay health center, DOH official pages and
hotlines, the FDA Philippines verification portal, independent fact-checkers, the platform's Report button, the cybercrime hotline 1326 for scams.

## 4. Villain cards (the five tricks)

Each villain card shows: name, trick, tagline, tell-tale signs, counter-move, and an Ara line. Portraits are pixel art, comic, never scary.

| Villain | Trick | Tagline | Tell-tale signs | Counter-move | Ara line |
|---|---|---|---|---|---|
| **Dr. Fake** | Fake expert or deepfaked doctor endorsement | "Trust me, I'm a doctor!" | A "doctor" selling a product; video only on a sales page; no official page confirms it; lab coat as costume | Look for the expert's own official page and the product's FDA registration | "Ang ganda ng lab coat, Dr. Fake. Saan ang ebidensya?" |
| **Miracle Mike** | Miracle cure / "natural is always safe" | "Cures everything, 100% natural!" | Cures many diseases at once; "no side effects"; "replaces your meds"; before-and-after photos | Ask: registered? proven? what does my health worker say? Natural ≠ safe | "Cure-all ka na naman, Mike? Wala kang FDA number!" |
| **Fear Monger** | Emotional, scary language and urgency | "SHARE BEFORE IT'S DELETED!!!" | ALL CAPS, many "!!!", countdowns, "your family is in danger" | Pause. Strong feelings = time to check, not share | "Calm down, Fear Monger. We pause first." |
| **Conspiracy Kuya** | "They are hiding the truth" | "Doctors don't want you to know this!" | Secret plots, "mainstream lies", no checkable source, any evidence against it is "proof" of the cover-up | Ask who benefits and where the evidence is; check independent sources | "Kuya, kung secret 'yan, bakit nasa GC na?" |
| **Kwento Kim** | One anecdote in place of evidence | "It worked for my neighbour!" | A single story, testimonials, "my friend's cousin" | One story is not proof; look for what studies and health workers say | "Nice story, Kim. But it is only one story 'yan." |

Villains are tricks, not people types. Never make a villain look like a real person, a specific region or a religion.

## 5. Fictional naming rules

- **All people, pages, products and brands are fictional.** No real names of people, politicians, celebrities, doctors, influencers or companies.
- **People:** common Filipino first names with invented surnames (e.g. "Dr. Ramon Dalisay-Cruz", "Mila Santiaguel"); check that the
  full name is not a well-known public figure. Fictional doctors must be clearly fictional and appear only in teaching contexts.
- **Pages and accounts:** invented and slightly "off" (e.g. "Healthy Pinoy Tips 24/7", "Kalusugan Hacks Daily", "Lola's Remedies Club").
- **Products:** invented (e.g. "Miracle Tea Max", "SugarAway Capsules", "ImmunoBoost Gold").
- **Places:** fictional barangays and towns (Barangay Masagana, Barangay Liwanag, San Isidro Norte). Regions may be named generically
  ("in the Visayas") but never tied to an incident or outbreak.
- **Platforms and money apps:** describe them generically ("the feed", "the GC", "e-wallet", "load"); no real logos or brand names in game art or scam scripts.
- **Phone numbers and IDs:** masked placeholders only ("0917-XXX-1234", "PhilHealth no. 12-XXXXXXX-3").
- **Images:** synthetic scenes and personas only; no photos or likenesses of real people; no deepfakes of real people, ever.

## 6. Item, myth and entry rules

- **Fact or Fake balance:** every round is balanced. True items must not be "obviously real" (they can be surprising or informal);
  fakes must not be cartoonish (they should resemble real misinformation patterns).
- **Every item** has `explanation` (why), `how_to_check` (one concrete step), `basis` (source or rationale) and a trick for fakes.
- **Forms A/B** are never used outside the hidden assessment route. Practice items feed mini rounds, free play and the Daily Challenge.
- **Myths:** myth, fact, why people believe it (empathetic), how to check, villain trick, related module.
- **Glossary:** term, one-line meaning (≤ 15 words), a funny example from Filipino everyday life (starts "Example: "), "seen in module".
- **Comics:** 4 to 6 panels; each panel has a scene descriptor, characters, and ≤ 2 short speech bubbles; every episode ends kindly.

## 7. review_status

- Every content entry (lesson cards, items, myths, glossary entries, Comics, game content pools) has
  `review_status: "unreviewed" | "in_review" | "reviewed"`. **Everything is `"unreviewed"` now.**
- Optional `reviewer_notes` field for the medical and cultural reviewer.
- Nothing is presented as reviewed until a qualified reviewer marks it. (The in-app "Beta: educational, not medical advice"
  note was dropped on 2026-10-16: the proposal already frames ARAW as educational.)

## 8. FAKE stamp rule

- Every fake shown in a **revealed** state (Fact or Fake feedback, generated fake posts, scam scripts, fake posters, voice-clone
  transcripts, deepfake examples in lessons) shows the stamp **ARAW GAME · FAKE**.
- Stamp look: red (`--fake`) 4px pixel border, Press Start 2P 12px+, rotated −8°, over the content corner (see `DESIGN.md`).
- Before reveal (while the player decides), every item card, fact or fake, carries a small persistent **"ARAW GAME"** watermark
  so screenshots can't circulate as real posts, without giving away the answer.
- True facts never get the FAKE stamp; they come only from the curated pool.

## 9. Public-safety rules

- Content is public from day one: no internal project details, partner names, budgets or targets in the app or repo.
- Credit line allowed: **An AIKasalig project · DOST-PCHRD · National University**.
- No collection of personal data. Never ask players for health information. The Report screen reminds people not to include it.

## 10. DOST-NICER program projects and the Library myths

ARAW is the AI-literacy arm of AIKasalig, one of four projects in a DOST-NICER program. Library myths cover topics from all four,
and every myth carries an internal `program` tag (`src/content/library/myths.ts`): `healthph`, `advocaid`, `mosquito`, `aikasalig`,
or `null` when none fits. The tag feeds reports and `docs/CONTENT_REVIEW.md`; the player UI never shows it. Project names may
appear in docs and code, not in player-facing text.

| Project | Focus | Myth topic | Content ties |
|---|---|---|---|
| **HealthPH+** | ML and multilingual NLP for public health surveillance: respiratory outbreaks (fever, cough), online health misinformation and sentiment in Filipino, Cebuano, Ilocano, Hiligaynon and English | Coughs, flu and outbreaks (also respiratory, TB and online-misinformation myths in other topics) | Online posts are **leads that health workers check**, never confirmed outbreaks; real outbreak news comes from DOH and local health offices |
| **AdvocAid PH** | Geospatial AI on online HIV conversations: stigma, discrimination, misconceptions that discourage testing, treatment and prevention | HIV | Stigma-free language (below); **a map of online HIV talk shows conversations, not HIV prevalence or cases**; case counts come from DOH |
| **Mosquito Density and Disease Outbreak Prediction** | Geo-tagged community reports of breeding sites, deep learning for outbreak prediction, two-way reporting with LGUs, One Health | Dengue and mosquitoes (also flood and leptospirosis) | DOH 4S; community reports help barangays and LGUs act; people, animals and the environment share health (One Health) |
| **AIKasalig** | Responsible AI in Philippine health care: trust, explainability, AI literacy, accountability and policy | AI in health care (also AI, chatbot and deepfake myths in AI and online) | Calibrated trust; people stay accountable; you may ask how an AI reached a result; Data Privacy Act rights |

**HIV language rules (AdvocAid PH topics).**
- Person-first: "people living with HIV" (PLHIV), "a person with HIV". Never "victim", "sufferer", "carrier", "AIDS patient" or "infected people".
- Stigma-free and blame-free: no talk of "risky lifestyles", "promiscuity" or "high-risk people"; say "anyone can be affected" and
  "if you may have been at risk". Never single out a group, region or orientation.
- Hopeful and factual: treatment works; undetectable means HIV is not passed on through sex (WHO 2023 policy brief); PrEP prevents HIV;
  testing is voluntary, confidential (RA 11166) and free at government treatment hubs.
- Point to DOH treatment hubs and social hygiene clinics, never to a named person or private clinic.
- A unit test (`tests/unit/library-content.test.ts`) rejects the stigmatising words above in HIV cards.
