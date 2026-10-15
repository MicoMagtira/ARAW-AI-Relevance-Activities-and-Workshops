# REVIEW-2: Opus review checkpoint 2 (T30, 2026-10-16, full app)

Scope: the finished app (T01 to T29): shell, Home, Learn and all 10 modules with their games, Fact or Fake and the assessment,
the 11 arcade games, Daily Challenge, Library (myths, Diksyunaryo, Komiks), Me, badges, certificate, Report, About, PWA.
Method: `npm run verify` (build, budget, 944 unit tests, 636 e2e passed / 18 skipped by design), then a screenshot and axe sweep of
54 screens x 3 viewports = 162 captures (every route, every module's hook and game step, every arcade game's intro and first
seconds of play, five screens with every accessibility setting on) in `build/screens-2/` (gitignored).
Rerun: `npx playwright test -c build/shots/shots.config.ts shots2.spec.ts` (logs OVERFLOW / AXE lines).
Game logic was play-tested by reading the engine (`GameShell`, loop, input, scale) and the rules and tests of each game.

Overall: production quality. No horizontal overflow on any of the 162 captures. Axe (WCAG 2.2 AA tags) found one serious issue
(fixed below), nothing else at any impact. Initial load 67.6 KB gzip JS + 12.6 KB CSS (budget 200 KB); every game and module is
its own lazy chunk; the assessment forms only load on `#/assess/`. No `any`, no console calls, storage only via `store.ts` and
`boot.ts`, no hex colours outside `tokens.css`. The engine pauses on tab hide, Escape/P, refits on resize, orientation and
devicePixelRatio, and seeds every run so the Daily Challenge is the same for everyone.
Content: health facts stay at WHO/DOH consensus level, no dosing or diagnosis anywhere, red flags always point to a health worker,
hotlines are consistent (1553 crisis, 1326 cybercrime), Data Privacy Act content is general and says "not legal advice",
all people and brands are fictional, every fake carries the ARAW GAME · FAKE stamp. Ara's voice is warm, short, light Taglish and
never scolds across modules, games, myths and Komiks.

## Fixed in T30 (critical or high)
- [x] **Accessibility (axe serious, desktop):** for a new player (every episode locked) the scrolling Komiks list had nothing
  focusable, so keyboard users could not scroll it (`scrollable-region-focusable`). The list is now a tab stop; `Panel` accepts
  `tabIndex`. New assertion in `tests/e2e/library.spec.ts` (all-locked state).
- [x] **Content traceability:** the 11 arcade game content files had no `basis` or `review_status` (CONTENT_GUIDE 5 and 7), so
  the human reviewer had no marker for them. Each now exports `CONTENT_REVIEW` (basis + `unreviewed`), checked together with a
  dosing scan in `tests/unit/content-safety.test.ts`.
- [x] **Health wording drift:** the "Fogging is all we need" myth still said "fogging only for outbreaks"; aligned with the DOH
  4S wording used elsewhere since T13 ("support fogging only in hotspot areas").
- [x] **Ara's wink as a greeting** on the Arcade featured card and every game intro card; now `happy` (DESIGN 7: wink is for hints).

## Remaining, prioritized

### P1: before public launch
- [ ] **Human health and legal review.** Everything is still `review_status: 'unreviewed'`. Priority files: `src/content/chatbot.ts`
  (red-flag rounds), `src/content/library/myths.ts` (herbal cures are culturally sensitive), `src/modules/m08` (sleep hours,
  1553), `src/modules/m10` and `src/games/objection/data.ts` (Data Privacy Act statements, breach notification).
- [ ] **Fictional-name check** carried over from REVIEW-1 ("Dr. Reyes", "Pamilya Garcia GC", "Jessa Malonzo", "Ronnie Abesamis",
  "Banko Liwanag", "PisoPay", "Lumi"): needs a web search, which this run may not use.
- [ ] **Native-speaker pass** on Taglish lines (DECISIONS-LOG T08) across the newer modules 6 to 10 and the Komiks.

### P2: polish
- [ ] **Phone canvas games are small in portrait** (e.g. Takbo, Data! is about 320x170 on a 360x740 phone, with half the screen
  empty below the HUD). Consider a taller logical size for portrait, or moving the HUD beside/inside the canvas on phones.
- [ ] **Phone "Keys: arrow keys or WASD..." hint** shows on touch devices; show the touch hint only under `(pointer: coarse)`.
- [ ] **Duplicate heading on module game steps:** "MODULE GAME / Tulog na, Bea!" panel title and the game's own intro title
  repeat the same name (m06 to m10). Drop one, it costs a phone screen of scrolling with Larger text.
- [ ] **Programmatic focus ring on Komiks headings:** opening a locked episode moves focus to its `h2` and Chromium draws the full
  focus box around the heading. Keep focus, but style `h2[tabindex="-1"]:focus:not(:focus-visible)` without the ring.
- [ ] **Locked Komiks episode cards** show a small empty lock button under the text that does nothing visible; use a "Locked" chip.
- [ ] **Hati Tayo! canvas text:** the two-line hint ("Tap a task, then a lane...") has its lines nearly touching at desktop
  scale; add 2 to 3 logical pixels of line height.
- [ ] **Home "Your stats" panel** on desktop is taller than its content (empty lower half); fill with the streak calendar or
  shorten so the hero and stats rows line up.

### P3: nice to have
- [ ] **Story-hook art** for modules 6 to 10 is a single pixel icon on a gold square (e.g. M10 shield). DESIGN asks for small pixel
  scenes; add a 2 to 3 sprite vignette per module when there is time.
- [ ] **Certificate preview:** the subtitle "AI Relevance Activities and Workshops" renders around 8px at 1440px; scale it with the
  certificate or drop it from the on-screen preview (keep it in the PNG).
- [ ] **Arcade locked tiles** read "AFTER MODULE 6" in pixel font; seniors may not know which module that is. Add the module's
  short name ("After Katuwang si AI").

### Test coverage notes
- [ ] The shots sweep (`build/shots/shots2.spec.ts`) runs axe on every screen at 3 sizes; fold its "every route + every arcade intro"
  axe loop into `tests/e2e/responsive.spec.ts` so regressions like the Komiks one fail `verify`.
