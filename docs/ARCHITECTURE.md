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
- **Project identity:** `src/ui/PartnerLogos.tsx` (the six partner logos, built from the git-ignored `logos/` folder by
  `scripts/logos/build_logos.py` into `src/assets/logos/`), the Home project banner and the About page; styles in `src/styles/brand.css`.
- **How-to videos:** `src/content/tutorials.ts` (clip list and caption lines), `src/content/tutorialManifest.json` (which clips
  and languages exist, written by the recorder), `src/app/tutorials.ts` (manifest helpers, the shared dialog signal, VTT
  transcript parser) and `src/ui/tutorial/` (Watch button, dialog host, lazy player chunk). Files: `public/videos/<id>/<lang>.webm|vtt`,
  recorded by `scripts/tutorials/record.mjs` from `scripts/tutorials/boards/` (canvas games on a paused fake clock, so runs repeat).
- **Chatbot Sandbox (`src/sandbox`, `#/sandbox`):** `model.ts` (pinned Hugging Face GGUF candidates, `VITE_MODEL_SOURCE`
  hf/local), `engine.ts` (state machine and device checks over a `Backend`), `wllamaBackend.ts` (wllama: llama.cpp in
  WebAssembly, runs in its own worker, OPFS model cache) and `wllamaCompat.ts` (Safari build, own chunk), `fakeBackend.ts`
  (tests set `window.__ARAW_FAKE_LLM__`), `guard.ts` (red flags, personal data, streamed dose filter), `prompt.ts`,
  `missions.ts`, `preload.ts` (tiny, in the first load: background download on Wi-Fi, file only, never in automated
  browsers); screen in `src/screens/sandbox/`. Model files are never precached; `public/_headers` sets COOP/COEP so the
  engine can use threads. `scripts/sandbox/` holds the real-model bake-off (`smoke.config.ts`) and `fetch-model.mjs`.
- **PWA:** `scripts/pwa-plugin.ts` and `sw-template.js` generate the service worker and precache list at build time.
- **Quality gates:** `npm run verify` = type-check + build, `scripts/check-budget.mjs` (initial JS <= 200 KB gzip), Vitest, and
  Playwright on phone/tablet/desktop with axe and no-horizontal-overflow checks.
