# ARAW Print Kit: build plan

Workplan item: *Develop digital and printable versions of training content (infographics, videos, explainers): a complete
set of multimedia learning assets for digital deployment and field use.* Planned 2026-11-03. Videos are deferred
(user decision pending: module explainer videos). This plan covers the printables and their in-app download.

**Principle: compile, do not author.** Every sheet is generated from the typed content that already ships in the app
(`src/content/*`, `src/modules/m01..m10`) and translated by the existing packs (`src/i18n/packs/*.json`) through
`t()`. Write new English only for framing text (headings, instructions, facilitator notes), keep it short, and expect it
to be translated in Phase 3. Never invent health facts. Follow `CLAUDE.md`, `docs/CONTENT_GUIDE.md` and `docs/DESIGN.md`.

## 1. Deliverables (per language: en, fil, ceb, ilo, hil)

Public kit: `public/print/<lang>/<id>.pdf`, listed in the app (Library > Printables).

| id | What | Source | Format |
|---|---|---|---|
| `trust-guide` | "When should I trust it?": all 10 module takeaways on one page, Ara, QR to the app | `modules.ts` + each module's `takeaway` | A4 portrait, 1 page |
| `module-posters` | One infographic poster per module: title, topic, 3 to 5 key ideas (lesson card titles), takeaway, game name, QR to `#/learn/<id>` | `modules.ts`, `src/modules/mNN` | A4 portrait, 10 pages |
| `five-tricks` | The five misinformation villains: portrait, trick, tells, counter-move | `tactics.ts` villains, `VillainPortrait` | A4 portrait, 1 page |
| `check-before-share` | The three-step checking habit and how to reply kindly | Module 5 cards | A4 portrait, 1 page |
| `red-flags` | "Magpatingin agad" red-flag card: go to a health facility now, 911, hotline 1553 | red-flag strings in `src/app/i18n.ts` / `src/sandbox/guard.ts` | A4 with 4 cut-out cards |
| `myth-cards` | Myth front / fact back cut-out cards with "why people believe it" and "who can help" | `library/myths.ts` | A4, 8 cards a page, duplex (long-edge flip, backs mirrored) |
| `glossary` | Plain-words AI and health glossary | `library/glossary.ts` | A4, 2 columns |
| `komiks` | Ara's Comics Season 1 "The Miracle Tea", one episode a page | `library/komiks.ts`, `src/ui/komiks/Scene.tsx` | A4 portrait |
| `session-guides` | Facilitator guide: how to run a session, then one page per module (objectives, story hook, discussion prompts from the module's `poll`/`choice` cards, activity = the game or a paper alternative, takeaway, timing for 45 min) | `modules.ts`, `src/modules/mNN` + short new framing text | A4 portrait, about 12 pages |
| `certificate` | Blank completion certificate to fill in by hand, same art as the in-app certificate | `src/screens/certificate/certificateArt.ts` | A4 landscape, 1 page |

Facilitator-only kit: `print-out/facilitator/<lang>/` (gitignored, **never** in `public/`, the app or the service worker),
because Forms A and B are test sets (CLAUDE.md):

| id | What | Source |
|---|---|---|
| `pretest-form-a`, `posttest-form-b` | Paper Fact or Fake test: 20 posts each, tick Fact / Fake, name, date, site | `factOrFake/assessment.ts` |
| `answer-key` | Answers for both forms, the trick, the explanation; fakes carry the "ARAW GAME · FAKE" stamp | same |

## 2. Print rules (all sheets)

- **A4**, 12 mm margins; nothing important within 15 mm of an edge, so "Fit to page" on short bond (Letter) and long bond
  still works. Certificate: A4 landscape.
- **Photocopy-safe:** it must read on a black-and-white photocopy. Text is always ink (`--ink`) or navy on light fills;
  colour is never the only signal (fact/fake also carry an icon and a word). No large solid dark areas (toner). Light
  pixel-border panels, the gold banner as a light tint.
- **8-bit style, senior-readable:** Press Start 2P for titles, labels and chips only, at 12 pt or larger; Nunito body
  at 12 pt minimum (14 pt on posters and cards). Pixel borders and hard offset shadows as in DESIGN.md. Pixel art
  (`Ara`, `VillainPortrait`, komiks `Scene`) rendered from the real components with `image-rendering: pixelated`.
- **Footer on every page:** "ARAW · AI Relevance Activities and Workshops" · sheet name · language · version
  `1.0 (2026-11)` · page n/N, plus the partner logos strip on the trust guide and session-guide cover (`PartnerLogos`).
  No "beta" or "not medical advice" banner (CONTENT_GUIDE).
- **QR codes** point to the app (`<PRINT_APP_URL>#/...`). The URL comes from `PRINT_APP_URL` (env or `--app-url=`); when
  it is missing the build still runs and prints the QR box as "QR: set PRINT_APP_URL" so nothing ships pointing nowhere.
  QR encoding via the `qrcode` package (MIT) as a **devDependency**, SVG output, at least 22 mm square.
- All names stay fictional; proper names (ARAW, Ara, game titles, villain names) are never translated.
- **Size:** each PDF at most 2 MB (vector art, embedded font subsets). Check and print the sizes at the end of a build.

## 3. Pipeline (`scripts/print/`), modelled on `scripts/guide/`

- `scripts/print/page/`: a small Vite + Preact print app (own `vite.config.ts`, `base: './'`) that imports the real
  content, `src/styles/tokens.css`, the i18n runtime and the pixel-art components, plus `print.css` (`@page` rules,
  page boxes, footer). URL params: `?sheet=<id>&lang=<code>&appUrl=...`. It renders every page of one sheet and sets
  `document.body.dataset.ready = '1'` when fonts and art are done.
- One file per sheet: `scripts/print/page/sheets/<id>.tsx`, discovered with `import.meta.glob`, so parallel builders
  never edit a shared registry. Shared pieces (page frame, footer, QR, panel, stamp) in `scripts/print/page/kit.tsx`.
- `scripts/print/build.mjs`: `vite build` of the print app into `scripts/print/out/site/`, then Playwright Chromium opens
  it **without any listening port** (serve the folder with `page.route('http://araw.print/**', ...)` from disk) and
  `page.pdf()` per sheet x language. Flags: `--only=<id,...>`, `--langs=<code,...>`, `--pages` (also save a PNG per page
  to `scripts/print/out/png/<lang>/<id>-<n>.png` for review), `--out=<dir>` (default `public/print`; facilitator-only
  sheets always go to `print-out/facilitator/`). Writes `src/content/printManifest.json` (id, lang, pages, bytes) for the
  public sheets, like `tutorialManifest.json`.
- `scripts/print/out/` and `print-out/` are gitignored. Never leave a process running. No watch modes.
- New framing strings go through `t()` with English as the key, so untranslated text shows in English until Phase 3.

## 4. Phases (Opus plans and reviews; Sonnet builds)

1. **Foundation** (one builder): the pipeline in section 3, `kit.tsx`, `print.css`, QR, and two exemplar sheets that set
   the look: `trust-guide` and `module-posters`, in all 5 languages, with `--pages` PNGs. Stop for review.
2. **Sheets** (three builders in parallel, each owning only its own sheet files):
   - 2a: `five-tricks`, `check-before-share`, `red-flags`
   - 2b: `myth-cards`, `glossary`, `komiks`, `certificate`
   - 2c: `session-guides`, `pretest-form-a`, `posttest-form-b`, `answer-key`
   Each builder runs only `--only=<its sheets>` with its own `--out` and PNG folder, and reports new English strings.
3. **Integration** (one builder): add the new framing strings to the i18n extraction and translate them for fil, ceb,
   ilo and hil with the `scripts/i18n` pipeline (README + TRANSLATOR.md); full build of every sheet x language; Library >
   Printables tab (route `#/library/printables`, list from `printManifest.json`, grouped by sheet with a language
   picker defaulting to the app language, real download links, pixel icons, works at all 3 viewports, axe-clean, no
   horizontal overflow); keep `public/print/` out of the service-worker precache (download on demand, like the videos);
   unit test for the manifest helpers; e2e for the tab on phone, tablet and desktop; README section "Print kit";
   `docs/RELEASE-CHECKLIST.md` step; `docs/DECISIONS-LOG.md` lines; `npm run verify` green.
4. **Review** (Opus): page PNGs and the diff, then a short fix list if needed.

## 5. Open items

- `PRINT_APP_URL` = `https://dost-nicer-araw.mjmagtira.workers.dev/` (the live app; user, 2026-11-03).
- All content is `review_status: "unreviewed"`: recommend a health and language review before mass printing.

## 6. Module lecture videos (`scripts/lectures/`)

Ten slow, explanation-based video lectures, one per module, recorded **silent** so the user can add a voiceover later.
Not how-to-play clips: they teach the lesson. Same recording approach as `scripts/tutorials/` (Playwright drives the
real app, desktop layout), reusing `scripts/tutorials/lib.mjs` helpers (pixel cursor, title cards, translator) without
changing how the existing tutorial clips record.

**Structure of a lecture** (one beat per step; hold time computed, see below):
1. Title card: "Module N · <title>" and the topic.
2. "In this lesson you will learn": the module's `objectives`.
3. Story hook in the real lesson screen: scene, speaker line, Ara's intro.
4. Every lesson card in order, in the real lesson screen. Info cards: hold for reading. Interactive cards (choice, poll,
   swipe-sort, etc.): show the question, a "think about it" pause, then pick the best answer and hold on the feedback.
5. A short look at the module's game (briefing screen, a few seconds of play where it is reliable).
6. "When should I trust it?": the takeaway bullets.
7. Closing card: "Practise in ARAW" with the app URL.

**Pacing (for narration):** target **6 to 7 minutes per module** (user decision 2026-11-03, after the 12:46 Module 1
pilot at 100 wpm + 3 s). Use about 130 wpm with a shorter minimum on "tap to reveal" tiles, computed per language from
the translated text; "think about it" pauses 5 s. The narration script drops app chatter ("Nice! 2 more to go",
"Tap each part...") so it reads like a lecture. Deferred: record when the user asks. Captions: one WebVTT cue per beat (not burned in), so the voiceover is free to differ.

**Narration script** per module and language, `mNN-script.md` beside the video: a table of beats with start and end
time, what is on screen, and the suggested narration (the on-screen text read naturally, Ara's lines, the feedback
explanation, and short bridge lines such as "Let us think about this one."). Bridge lines are a small fixed set
written in English and passed through `t()`, so they translate in Phase 3; no new health facts, ever.

**Output: MP4 only** (user decision 2026-11-03: maximum compatibility with video editors, phones, TVs, Facebook and
Messenger). H.264 High profile, `yuv420p`, 30 fps, `-movflags +faststart`, 1920x1080, silent (no audio track), tuned
for crisp pixel text (`-tune animation`, CRF about 20). The encoder is `ffmpeg-static` (devDependency, build-time
only, never shipped), because Playwright's bundled ffmpeg has no H.264. Capture losslessly or near-losslessly (CDP
screencast frames with their timestamps, encoded once) rather than re-encoding Playwright's low-bitrate VP8 recording,
so text stays sharp. Files: `lecture-out/<lang>/mNN.mp4`, `mNN.vtt` (also `mNN.srt` for editors) and `mNN-script.md`
(gitignored; raw renders for the voiceover edit, not app assets). Builds into its own `dist-lecture/` and serves it with
`vite preview` on port **4182** (never 4173 or 4180), stopped when done.

**Phases:** V1 pilot: Module 1 in en and fil, for review. V2: all 10 modules x 5 languages, after the Phase 3 translations
of the bridge lines. After the voiceovers, the finished lectures can join Library > Videos (a later decision).
