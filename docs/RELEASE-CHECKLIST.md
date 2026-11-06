# Manual pre-release checklist

Not part of `npm run verify` on purpose (slow, visual, for a human to look at).

- [ ] `npm run verify` is green.
- [ ] Screenshot smoke run: `npx playwright test -c scripts/shots/shots.config.ts`, then look through `shots-out/screens-*/`
  (every route, every module hook and game step at phone, tablet and desktop, plus every accessibility setting on).
- [ ] Check for horizontal scroll, cut-off text, empty bands and "Coming soon" promises that are not true.
- [ ] Initial JS is still under 200 KB gzip, and the test forms (`assessRound` chunk) are not in any practice chunk.
- [ ] Listen pass with headphones and phone speakers: splash START (chime, sunrise jingle, then music), a lesson (answers, Ara's
  voice, reward sequence), a Fact or Fake round (stamp then verdict), a daily challenge, each arcade game (actions, the last-5-seconds
  tick) and the certificate. Nothing too loud next to the interface clicks, nothing stacked, music per area, Music and Sound effects
  switches and volumes on Me and the splash work, the test forms stay silent, and every sound has something on screen to match.
- [ ] Health reviewer has gone through `docs/CONTENT_REVIEW.md` (content stays `unreviewed` until then).
- [ ] Partner logos (DOST, DOST-PCHRD, National University, NICER-DOST, NICER RDC-NLPHA, AIKasalig, in that order) show crisp on
  the splash, the language landing, the Home banner and the About page, at phone and desktop size.
- [ ] How-to videos: every clip in Library > Videos plays in all five languages, the captions match the picture, and the
  Watch buttons appear. After any change to a screen a video shows, or to its translations, re-record that clip
  (`node scripts/tutorials/record.mjs <id>`), then rebuild. Watch one clip on a phone in full screen (browser captions show).
- [ ] User guide refreshed after screen changes: `npx playwright test -c scripts/guide/capture.config.ts`, then
  `node scripts/guide/compress.mjs` (if used) and `node scripts/guide/build-pdf.mjs`.
- [ ] Chatbot Sandbox on the live site, in a fresh browser and on a real low-end Android and an iPhone: the terms come first, an answer
  streams in English and Filipino, no model downloads by itself, and the wording matches where the AI runs. A browser that already
  saved the on-device model can hide download faults. Keep `Referrer-Policy: no-referrer` in `public/_headers`.
- [ ] If the terms changed, raise `TERMS_VERSION` in `src/sandbox/access.ts` and get a privacy review.
- [ ] The creator credit ("Created by Mico C. Magtira ...") shows on the splash, the About screen and the app footer.
- [ ] Print kit rebuilt after any content or translation change: `node scripts/print/build.mjs --pages` (no overflow warnings), then check a few PNGs in
  `scripts/print/out/png/` (trust guide, red-flag cards, myth cards) in a regional language. Library > Printables lists all ten public sheets in all
  five languages and every Download link opens a PDF. `public/print/` has no test forms (they live only in `print-out/facilitator/`).
