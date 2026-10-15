# Architecture (short)

- **Stack:** Vite + strict TypeScript + Preact (`@preact/signals`). Hash router, so any static host works; `base: './'`.
- **Shell (`src/app`):** `App`/`Shell` give the sidebar (desktop), top tabs (tablet) and bottom tab bar (phone). `routes.ts` and
  `router.ts` map hash routes to lazy screens (`LazyScreen`). `settings.ts` applies accessibility options as root classes.
- **State:** `store.ts` holds signals; `state.ts`, `progress.ts`, `streak.ts`, `scores.ts`, `daily*.ts` hold logic.
  Persistence is `localStorage` only, always inside try/catch, so the app runs with storage blocked.
- **Modules (`src/modules`):** each `mNN` exports typed `ModuleContent`; `registry.ts` loads it on demand. Shared cards are in `cards/`.
- **Games (`src/games`):** `engine/` is a small Canvas 2D loop (fixed logical size, letterboxed, DPR scaling, resize handling,
  touch/mouse/keyboard input). Each game is its own lazy chunk through `registry.ts` and `LazyGame`. Game logic stays pure for unit tests.
- **Content (`src/content`):** typed banks with validators; every entry has `review_status` and a `basis`. Fact or Fake test forms
  (`assessment.ts`) are a separate chunk and never appear in practice, the arcade or the daily challenge.
- **Styling:** `src/styles/tokens.css` (design tokens) and `base.css`; the 8-bit rules are in `docs/DESIGN.md`.
- **PWA:** `scripts/pwa-plugin.ts` and `sw-template.js` generate the service worker and precache list at build time.
- **Quality gates:** `npm run verify` = type-check + build, `scripts/check-budget.mjs` (initial JS <= 200 KB gzip), Vitest, and
  Playwright on phone/tablet/desktop with axe and no-horizontal-overflow checks.
