# ARAW translation brief (all languages)

ARAW is a free, gamified web app that teaches non-technical Filipinos (seniors, parents, students, health workers in
barangays) AI literacy and how to resist health misinformation. Core idea: **calibrated trust**, not "trust less".
Ara is the friendly guide (a girl, sun spirit). Tone: warm, simple, encouraging, never scolding. Short sentences.

## Your job
Translate English strings into the target language for real community members, not linguists.
- Use the everyday spoken variety people actually use (e.g. Filipino as spoken in Metro Manila; Cebuano as spoken in
  Cebu/Davao; Ilokano of Ilocos/Cagayan Valley; Hiligaynon of Iloilo/Negros). Common English loanwords that people
  really use are fine and often better: AI, app, chatbot, post, online, link, screenshot, video, deepfake, XP, OK.
- Keep the meaning exact. Health facts must stay exactly as accurate as the English: never add, drop or soften advice,
  numbers, ages, time spans or warnings. Never add dosing or diagnosis.
- Keep it about as short as the English (buttons, chips, labels and headings must fit small screens). For buttons and
  chips, prefer the shortest natural wording. UPPERCASE English stays UPPERCASE.
- Follow the language's glossary (`scripts/i18n/glossary/<code>.md`) exactly for the terms it lists.

## Never change
- Placeholders in braces: `{n}`, `{name}`, `{total}` ... copy them exactly (you may move them within the sentence).
- Proper names: Ara, ARAW, the game titles (Takbo, Data!; Feed Mo 'To; Luto ni Ara; Sino 'To?; Lamok Lamay;
  Tawid, Lola!; Hati Tayo!; Gawa Ko 'To!; Tulog na, Bea!; Sa Sapatos Nila; OBJECTION!; Turuan si AI; Tanong kay Chatbot;
  Tita's GC), people (Lola Nena, Tita Baby, Kuya Jun, Ate Liza, Aling Nena, Aling Cora, Mang Isko, Nanay Tess,
  Tatay Berto, Mareng Fe, Ka Tonyo, Bea, Dr. Reyes, Nurse Carla...), villains (Conspiracy Kuya, Kwento Kim, Dr. Fake...),
  fictional places, pages, brands and apps (Barangay Masagana, Gising Pinoy, PisoPay, KausapBot...), hotline numbers,
  the "ARAW GAME" part of stamps, emoji, and URLs.
- A string that is already in a Philippine language (example posts in Taglish, Cebuano...) on purpose: return it unchanged.
- Symbols and spacing like " · ", "→", "×", "%", and leading/trailing spaces.

## Format
You get `scripts/i18n/work/<code>/in/bNNN.json`: one entry per line, `{"i": 1, "text": "...", "where": "file#export"}`.
`where` tells you the context (a myth card, a button in i18n `ui:...`, a game line...). Write
`scripts/i18n/work/<code>/out/bNNN.json` as ONE JSON object mapping every `i` (as a string) to the translation:
`{"1": "...", "2": "...", ...}` with every i present, valid JSON (escape quotes as \"), nothing else in the file.
If a string should stay exactly as it is (a proper name alone, a code), give it back unchanged.
