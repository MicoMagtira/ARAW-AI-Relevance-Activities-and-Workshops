# REVIEW-1: Opus review checkpoint 1 (T12, 2026-10-15)

Scope: everything up to T11 (shell, Home, Learn, module runner, M1 to M5 content and games, Fact or Fake, Me, Report, About).
Method: `npm run verify` (352 unit + 276 e2e tests, all green), screenshots of every route and every module hook and game
step at phone, tablet and desktop, plus every accessibility setting switched on (`build/shots/`, output in `build/screens-1/`,
gitignored). Rerun with `npx playwright test -c build/shots/shots.config.ts`.

Overall: solid. No horizontal overflow on any screen at any of the 3 viewports (also checked with every setting on), axe has
no serious violations, no `any`, no stray console calls, storage always goes through `src/app/store.ts`, no hard-coded hex
colours outside `tokens.css`. Initial load is about 47 KB gzip JS (index 19.8 + kit 23.0 + AraBubble 3.7) plus 11 KB CSS,
well under the 200 KB budget, and every module and game is its own lazy chunk.
Ara's voice is warm, short, Taglish and never scolds ("Muntik na!", "walang hiyaan!"). No dosing or diagnosis anywhere,
red-flag symptoms always point to a health worker or hospital, and hotlines (1553, 1326) match CONTENT_GUIDE.

## Fixed in T12 (critical or high)
- [x] **Focus-mode top bar (lesson runner):** with no progress bar (locked or missing notices) the Report flag sat right
  after the title and the title was cut at 28ch even on a 1440px screen. The flag now always sits at the far end and the title
  takes up to 40ch (`src/styles/lesson.css`). Covered by a new assertion in `tests/e2e/learn.spec.ts`.
- [x] **Fact or Fake round dots:** the "10" overflowed its 28px box, and on desktop the dots wrapped 9 + 1. Boxes now grow to fit
  their number, and the desktop side column shows two rows of five (`src/styles/fof.css`).
- [x] **Real brand in content:** AI or Not? card "Facebook-style feed" renamed "Social media feed" (CONTENT_GUIDE: no real
  companies).
- [x] **Health overclaim:** assessment item `fof-b-01` promised a *free* flu shot to anyone with a heart condition. DOH's
  free flu vaccine is for seniors; it now says seniors get it free and people with heart disease should ask the health center.

## Remaining, prioritized (for T13)

### P1: should fix soon
- [x] **Home promises what the app cannot do yet.** The Arcade card says "6 of 11 ready" and "Play today's challenge" is an
  Done in T13: `playable` flag on `ARCADE_GAMES` (all false until T14); Home shows "Coming soon: 11 games" and a disabled "Coming soon" chip.
  active gold button, but the Arcade and the daily challenge both say "Coming soon". Until T14 lands, count only games that
  can really be played (add a `playable` flag to `ARCADE_GAMES`) and show the daily button as a disabled "Coming soon" chip.
  Update the Home e2e assertion ("6 of 11 ready").
- [x] **Practice bundle carries the test forms.** `TruthRadar` chunk (25.7 KB gzip) contains the whole FoF bank, including
  Done in T13: items split into `practice.ts` and `assessment.ts`; only the `#/assess/` route loads the `assessRound` chunk. Unit test guards the import paths.
  form_A and form_B. Split the assessment items into their own module imported only by the `#/assess/` route, so practice
  players never download the test sets (CLAUDE.md: forms never appear outside the assessment).
- [x] **Module 5 game intro is very long on phones**, especially with Larger text (about two screens of rules before
  Done in T13: CTA first, scoring rules in a "How scoring works" `<details>`.
  "Open the chat"). Put the CTA above the rules, or fold the three scoring bullets into a `<details>` "How scoring works".
- [x] **Path strip on tablet/phone** scrolls sideways inside its panel with no hint that there is more (the 7th node is
  Done in T13: wraps into two rows of five below 1280px, no sideways scroll.
  cut at the edge). Add an edge fade plus "scroll" hint, or wrap into two rows of five like the Learn road.

### P2: polish
- [x] **Fact or Fake desktop** leaves the right third empty until the first answer. Show a quiet placeholder card there
  Done in T13: quiet placeholder card (desktop, free play only).
  ("Your feedback appears here" plus the 3 quick checks) so the 3-column layout from DESIGN 11.5 reads from the start.
- [x] **Ara is winking by default** on the Home hero, the Learn current node and most lesson story lines. DESIGN 7 reserves
  Done in T13: Home, Learn node, story-hook and game intro use `happy`/`idle`; wink stays on reactions.
  `wink` for hints ("Sure ka na diyan?"); use `idle` or `happy` for greetings so the wink keeps its meaning.
- [x] **Card ids like `m01-c1`** show in pixel font under every lesson card. SPEC only needs the id carried by the Report flag;
  Done in T13: the id is no longer shown on cards; it stays in the Report flag's label and link.
  for seniors it reads as jargon. Keep it in the Report link and the flag's label, and show it visually only in muted small text
  (or drop it).
- [x] **High contrast:** the Daily challenge card's sunrise stripe disappears and leaves an empty band; hide the band too or
  Done in T13: the band is drawn with ink/gold stripes.
  draw it with ink/gold stripes.
- [x] **1366x768:** on module-game intro steps the runner's NEXT sits below the fold (the main CTA is visible, so this is
  Done in T13: tighter game step padding under 800px height (desktop).
  minor); consider tightening the game intro panel padding at heights under 800px.

### P3: content review notes (for the human health reviewer; all items stay `unreviewed`)
- [x] "No proven herbal cure for dengue, not even tawa-tawa or papaya leaf" (FoF facts and a myth card): correct per DOH, but
  Done in T13: myth card post now opens with "tawa-tawa and papaya leaf are loved home remedies, pero...". Still for the human reviewer.
  culturally sensitive; confirm the wording is gentle enough.
- [x] Dengue 4S fact says "Say yes to fogging only during outbreaks"; current DOH wording is "Support fogging/spraying only in
  Done in T13: now "Support fogging or spraying only in hotspot areas".
  hotspot areas". Align the phrasing.
- [x] "Boil until it bubbles hard": WHO says bring to a rolling boil for about one minute; consider adding "for one minute".
  Done in T13: "then keep it boiling for one minute".
- [x] Handwashing "about 20 seconds": fine for the scrub, WHO counts 40 to 60 seconds for the whole routine; keep as is or
  Done in T13: "at least 20 seconds" everywhere (the chatbot and tactic texts already said so).
  say "at least 20 seconds".
- [ ] Fictional names to double-check against public figures before launch: "Dr. Reyes" (Tita's GC), "Pamilya Garcia GC",
  Not done: needs a web search, which this run may not use. Left for the human reviewer.
  "Jessa Malonzo", "Ronnie Abesamis". All look fictional and generic; a quick search is still worth it.

### Test coverage notes
- [x] Add a unit test that every ARAW GAME item has a `basis` and that no content string matches a dosing pattern
  Done in T13: `tests/unit/content-safety.test.ts`.
  (`/\b\d+\s?(mg|ml|tablets?|capsules?)\b/i`) across all content files, not just Fact or Fake.
- [x] Add a screenshot smoke run (the `build/shots` harness) to a manual pre-release checklist; it is intentionally not part
  Done in T13: `docs/RELEASE-CHECKLIST.md`.
  of `npm run verify`.
