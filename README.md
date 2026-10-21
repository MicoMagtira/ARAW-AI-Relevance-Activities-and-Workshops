---
title: ARAW
emoji: ☀️
colorFrom: yellow
colorTo: blue
sdk: static
app_build_command: npm run build
app_file: dist/index.html
custom_headers:
  cross-origin-opener-policy: same-origin
  cross-origin-embedder-policy: credentialless
pinned: false
license: mit
short_description: AI literacy and health-misinformation games for Filipinos
---

# ARAW: AI Relevance Activities and Workshops

ARAW is a gamified, mobile-first web app that teaches non-technical Filipinos (seniors, parents, students, health workers)
AI literacy and how to resist health misinformation. The core idea is **calibrated trust**, not "trust less": every module
ends with "When should I trust it?". It is a sibling of TALA, with the same 8-bit retro spirit and a
light, warm daytime palette. All text is in English; only proper names (game titles, characters) stay Filipino.

ARAW is part of a DOST-NICER program. Its home project is **AIKasalig** (responsible AI in Philippine health care), and it sits
alongside **HealthPH+** (public health surveillance with multilingual NLP), **AdvocAid PH** (geospatial AI on online HIV
conversations) and the **Mosquito Density and Disease Outbreak Prediction** project. The Library myths cover topics from all four.

## Features

- **Learn:** 10 short modules (lesson cards, a module game, a takeaway) with a certificate at the end.
- **Arcade:** 11 pixel-art Canvas games (Takbo, Data!, Feed Mo 'To, Luto ni Ara, Sino 'To?, Lamok Lamay, Tawid, Lola!,
  Hati Tayo!, Gawa Ko 'To!, Tulog na, Bea!, Sa Sapatos Nila, OBJECTION!) plus Fact or Fake, with touch, mouse and keyboard.
- **Chatbot Sandbox:** chat with a real, small AI that runs on the player's own device (no server, no API), rate each
  answer, and "Catch the AI" missions; red flags, self-harm, personal details and medicine doses are handled safely.
- **Daily challenge, streaks, badges and a report card** to keep practice going.
- **Library:** myth cards, glossary, the Comics series and the how-to videos.
- **How-to videos:** a one-minute tour and a how-to-play clip for every arcade game and Fact or Fake, short, silent and
  captioned, in all five languages (see "Tutorial videos" below).
- **Project identity:** an AIKasalig project of the DOST-NICER R&D Center on NLP for Health Applications at National
  University; partner logos on the splash, Home and the About page.
- **Accessibility:** WCAG 2.2 AA baseline; settings for larger text, high contrast, extra-large buttons, screen-reader
  hints and reduced motion (all off by default).
- **8-bit sound:** chiptune music per area and sound effects generated live (no audio files), with TALA-style Music and Sound
  effects switches and volume sliders (on at 25 and 65); everything heard is also shown on screen.
- **Responsive:** desktop sidebar layout first, tablet tabs, phone bottom tab bar. Installable PWA, works offline.
- **Private:** progress is kept in `localStorage` only. No backend, no accounts, no trackers.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Test

```bash
npm run test       # Vitest unit and component tests
npm run e2e        # Playwright on phone (360x740), tablet (820x1180) and desktop (1440x900); serves a build on port 4173
npm run verify     # build + bundle budget + unit + e2e (the full gate)
```

First e2e run needs browsers: `npx playwright install chromium`. The bundle budget (initial JS <= 200 KB gzip) is checked by
`npm run budget`. After changing content, regenerate the reviewer list with
`REVIEW_WRITE=1 npx vitest run tests/unit/contentReview.test.ts`.

## Build

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serves dist/ at http://localhost:4173
```

The build uses a relative base path (`base: './'`) and a hash router, so `dist/` works from any static host or sub-path.

## Tutorial videos

The how-to videos in `public/videos/<id>/<lang>.webm` (+ `.vtt` captions) are recorded from the app itself, one storyboard
per clip in `scripts/tutorials/boards/` (format and tips: `scripts/tutorials/boards/README.md`):

```bash
npm run build
node scripts/tutorials/record.mjs                       # every clip in every language (about 30 minutes)
node scripts/tutorials/record.mjs takbo-data --langs=en # one clip, one language
node scripts/tutorials/probe.mjs takbo-data             # plan a canvas game's key timeline
```

The recorder serves `dist/` on port 4173, encodes with Playwright's bundled ffmpeg and updates
`src/content/tutorialManifest.json`, which is what shows the Watch buttons; rebuild after recording. Re-record a clip when its
screen or its translation changes. Partner logos are built the same way, from the git-ignored `logos/` folder:
`python scripts/logos/build_logos.py` (needs Pillow and numpy).

## Report relay (optional, set before deploying)

The Report screen can send reports straight to AIKasalig@gmail.com through a free Google Apps Script web app
(`tools/report-relay/`, step-by-step guide in `tools/report-relay/README.md`). After deploying the script, put its `/exec`
URL in `.env.production` (see `.env.example`):

```bash
VITE_REPORT_ENDPOINT=https://script.google.com/macros/s/<id>/exec
```

The URL is read at build time, so rebuild after changing it. It is not a secret, so committing `.env.production` is fine
(the Hugging Face and GitHub Pages builds need it in the repo or as a build variable). Left empty, the Send button is hidden
and players use the fallbacks (Open in Gmail, their email app, or Copy report). The e2e tests pass either way.

## Deploy to a free static Hugging Face Space

1. Create a Hugging Face account and go to **New Space**. Pick **Static** as the SDK, a name such as `araw`, and a public license.
2. Clone the Space repo: `git clone https://huggingface.co/spaces/<user>/araw hf-araw`.
3. Copy this project's files (without `node_modules` and `dist`) into it. The YAML block at the top of this README already sets
   `sdk: static`, `app_build_command: npm run build` and `app_file: dist/index.html`, so the Space builds the app itself.
4. `git add -A && git commit -m "Deploy ARAW" && git push`. Wait for the Space to build, then open it.
5. Alternative without a build step: run `npm run build`, remove `dist/` from `.gitignore`, commit `dist/` and keep
   `app_file: dist/index.html` (drop the `app_build_command` line).

## Deploy to GitHub Pages

1. Create a GitHub repository and push this project to it (`git remote add origin <url>` then `git push -u origin main`).
2. In **Settings, Pages**, set the source to **GitHub Actions**.
3. Add `.github/workflows/pages.yml`:

   ```yaml
   name: Deploy
   on: { push: { branches: [main] } }
   permissions: { contents: read, pages: write, id-token: write }
   jobs:
     deploy:
       runs-on: ubuntu-latest
       environment: { name: github-pages, url: "${{ steps.deploy.outputs.page_url }}" }
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 22, cache: npm }
         - run: npm ci && npm run build
         - uses: actions/upload-pages-artifact@v3
           with: { path: dist }
         - id: deploy
           uses: actions/deploy-pages@v4
   ```

4. Push to `main`. The site appears at `https://<user>.github.io/<repo>/`. No extra config is needed for the sub-path
   (relative base, hash routes).

GitHub Pages cannot send custom headers, so there the Chatbot Sandbox AI runs on one CPU thread (slower, still works).

## Deploy to Cloudflare Pages

Connect the GitHub repository in Cloudflare Pages: build command `npm run build`, output directory `dist`. Every push to
`main` deploys. `public/_headers` sets caching plus the `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`
headers that let the Chatbot Sandbox AI use several threads. Every file stays under Pages' 25 MiB limit (the largest is
wllama's 16 MB compat `.wasm`).

## Chatbot Sandbox model

The sandbox (`#/sandbox`) runs a small open model in the visitor's browser with [wllama](https://github.com/ngxson/wllama)
(llama.cpp in WebAssembly). There is no server and no API key, so any number of people can use it at once for free.

- **No download step for learners:** on Wi-Fi (or when the browser does not say, as on iPhones and desktops) the app saves
  the model on the device in the background a few seconds after it opens (`src/sandbox/preload.ts`), so the sandbox is
  usually ready when a learner gets there. On mobile data it downloads when the sandbox is opened.
- **Which model:** `DEFAULT_MODEL_ID` in `src/sandbox/model.ts`. Each entry pins a Hugging Face repo, commit and GGUF file,
  so the download can never change under you. To host the file yourself, copy it to your own Hugging Face repo and change
  `repo` and `revision`. Try another candidate without rebuilding: `#/sandbox?model=gemma3-1b`.
- **Offline app builds:** `node scripts/sandbox/fetch-model.mjs` downloads the pinned file into `public/models/`
  (git-ignored, SHA-256 checked); `VITE_MODEL_SOURCE=local npm run build` then loads it from `./models/` instead of Hugging Face.
- **Bake-off and real-model smoke test** (downloads models, not part of verify):
  `npx playwright test -c scripts/sandbox/smoke.config.ts`. Answers in all five languages go to `shots-out/sandbox-bakeoff/`.

## Project structure

```
src/app        shell, hash router, store, settings, streaks, daily challenge, PWA
src/ui         shared components, Ara sprite, pixel icons
src/screens    Home, Learn, Lesson, Arcade, Library, Me, Daily, Report, Certificate
src/modules    m01..m10 lesson content and module games (lazy-loaded)
src/games      shared Canvas engine (engine/) and one folder per arcade game (lazy-loaded)
src/content    typed, validated item banks, myths, glossary, komiks, badges
src/styles     design tokens and base styles
tests/unit     Vitest        tests/e2e    Playwright
docs           SPEC, CONTENT_GUIDE, DESIGN, ARCHITECTURE, CONTENT_REVIEW, RELEASE-CHECKLIST, DECISIONS-LOG
```

## Content status and review

All content is fictional (people, pages, brands) and ships as `review_status: "unreviewed"`. Reviewers use
[`docs/CONTENT_REVIEW.md`](docs/CONTENT_REVIEW.md). Do not remove the beta note before medical and cultural review is done.

## Licenses and credits

- Code: MIT, see [LICENSE](LICENSE).
- Content (lessons, items, myths, glossary, komiks, art): CC BY 4.0, see [CONTENT-LICENSE.md](CONTENT-LICENSE.md).
- Made by **AIKasalig**, National University, with support from **DOST-PCHRD**.
- Fonts (OFL): Baloo 2, Nunito, Press Start 2P via Fontsource. Icons: [pixelarticons](https://github.com/halfmage/pixelarticons) (MIT).
- Built with Vite, TypeScript, Preact, Vitest and Playwright.
