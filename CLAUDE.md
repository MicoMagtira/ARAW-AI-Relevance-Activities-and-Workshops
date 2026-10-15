# ARAW: developer brief (read fully, keep it in mind; do not re-read planning docs unless a task says so)

ARAW = **AI Relevance Activities and Workshops**: a fun, gamified, mobile-first web app that teaches NON-technical Filipinos
(seniors, parents, students, health workers) AI literacy and how to resist health misinformation.
Core idea: **calibrated trust**, not "trust less". Every module ends with "Kailan ako magtitiwala?" (When should I trust?).
Sibling of TALA (dark, technical); ARAW is light, warm, playful. Product spec: `docs/SPEC.md`. Content rules: `docs/CONTENT_GUIDE.md`.
Visual baseline: `design/mockup/*.dc.html` (clickable mockup v1: match its look; you may improve quality, not change direction).

## You are working unattended
- An overnight script runs you one task at a time in fresh sessions. **Never ask questions.** Make a sensible decision, then add
  one line to `docs/DECISIONS-LOG.md` (date, task id, decision, why).
- Do only the current task, completely and well. Do not start other tasks.
- Finish by running `npm run verify` until it passes, then commit: `git add -A && git commit -m "<TASK-ID>: <title>"`.
- Never `git push`, never add remotes, never touch files outside this repo, never install global tools.

## Stack (fixed)
- Vite + TypeScript (strict) + Preact (`preact`, `preact/hooks`, `@preact/signals` allowed). Hash router (static hosting).
- Games: HTML Canvas 2D on a small shared engine in `src/games/engine/` (no Phaser). Icons: `lucide-preact` (MIT).
- Fonts self-hosted via `@fontsource/baloo-2`, `@fontsource/nunito`, `@fontsource/press-start-2p` (OFL). No CDNs at runtime.
- Tests: Vitest (+ @testing-library/preact) for logic/components; Playwright for e2e with three projects:
  `phone` 360x740 (touch), `tablet` 820x1180, `desktop` 1440x900. `@axe-core/playwright` for accessibility checks.
- Persistence: `localStorage` only (no backend). Always wrap in try/catch; app must work if storage is blocked.
- Deploy target: free static Hugging Face Space / GitHub Pages, so use relative base path (`base: './'`).
- Ports are fixed: dev server 5173, preview 4173 with `--strictPort`. Playwright `webServer` uses `vite preview --port 4173
  --strictPort` with `reuseExistingServer: false` (the runner frees these ports before each verify).
- Never leave long-running processes (dev servers, watchers) running when you finish; never use watch modes in scripts.

## Folder layout
`src/app` (shell, router, store, settings) · `src/ui` (shared components, Ara) · `src/screens` · `src/modules/m01..m10`
(lesson content + module game) · `src/games/engine` + `src/games/<slug>` (arcade) · `src/content` (item banks, myths,
glossary, komiks, typed + validated) · `src/styles` (tokens.css, base.css) · `tests/unit` · `tests/e2e`.

## Design tokens (D33-D37; use CSS variables, never hard-code hexes in components)
cream bg #FFF8EC · surface #FFFFFF · gold #F5D89E · deep gold #E8B84A · navy primary #35408E · ink text #1F2550 ·
muted text #4A4F6A · coral accent #FF7A59 (fills only, never text) · fact green #1E7D50 (tint #E3F4EA) ·
fake red #C4323A (tint #FDE7E8) · line #EADFC8 · soft #F3ECDD. Headings Baloo 2 (700/800), body Nunito 18px, splash only Press Start 2P.
Radii 14/16/20/24/28. Cards: white, soft 3px floor shadow `0 3px 0 var(--line)`. Header bar gold with navy text.
Motion: lively but calm (bouncy transitions, confetti on badges, Ara reacts); honour `prefers-reduced-motion` AND the in-app toggle.

## Responsive (must be seamless)
- Fluid layouts (flex/grid, `clamp()`, container queries). No horizontal page scroll at any width from 320px to 2560px.
- <600px: bottom tab bar (Home, Learn, Arcade, Library, Me). 600-1023px: tablet layout (wider cards, 2-col grids, tabs).
  >=1024px: side navigation, multi-column home, path shown wide. Same features at every size.
- Games: canvas keeps a fixed aspect ratio, letterboxed and centered, scales with devicePixelRatio, handles resize and
  orientation change mid-game, supports touch, mouse and keyboard.
- Every e2e test runs on all three Playwright projects; include a "no horizontal overflow" assertion on each screen.

## Accessibility (WCAG 2.2 AA baseline, always on)
Real buttons/links/labels, focus-visible rings, tap targets >= 44px, alt text/ARIA on every image, icon button and game state,
4.5:1 text contrast. Settings (all OFF by default): Larger text, High contrast, Extra-large buttons, Screen-reader hints,
Reduce motion. Settings apply app-wide via root classes.

## Content rules (summary; full rules in docs/CONTENT_GUIDE.md)
- All content in English with light Filipino flavour; game names stay Filipino. Strings go through `src/app/i18n.ts` (en only now).
- Health facts must be well established (WHO/DOH-level consensus). Never give dosing or diagnosis. Point to health workers.
- All people, pages and brands are fictional. No real names. Synthetic personas only.
- Every content entry has `review_status: "unreviewed"`. A visible "Beta: educational, not medical advice" note stays in the app.
- Generated fake posts/scams show an "ARAW GAME · FAKE" stamp when revealed. True facts only from the curated pool, never generated.
- Fact or Fake Forms A/B (test sets) never appear in practice rounds, the arcade or the daily challenge.

## Quality bar
- TypeScript strict, no `any` unless justified in a comment. Small, readable modules. Match surrounding code style.
- Each feature ships with tests (unit for logic such as scoring, RNG, unlocks; e2e for the screen at all 3 viewports).
- Performance: initial JS <= 200 KB gzip; lazy-load each game and module; smooth on low-end Android.

## Token discipline (this run is paid per token)
- Read only the files you need; use Grep/Glob to locate code before reading. Do not re-read files you just wrote.
- Run tests with terse reporters: `npx vitest run --reporter=dot`, `npx playwright test --reporter=line`.
  When something fails, re-run only the failing test file/project.
- Do not spawn subagents. Do not use web search or web fetch. Do not paste large logs into your reasoning.
- Write complete files in one go rather than many tiny edits. End with a summary of at most 5 lines.
