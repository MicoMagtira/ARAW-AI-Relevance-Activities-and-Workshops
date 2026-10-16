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
- [ ] The creator credit ("Created by Mico C. Magtira ...") shows on the splash, the About screen and the app footer.
