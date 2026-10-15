# Manual pre-release checklist

Not part of `npm run verify` on purpose (slow, visual, for a human to look at).

- [ ] `npm run verify` is green.
- [ ] Screenshot smoke run: `npx playwright test -c build/shots/shots.config.ts`, then look through `build/screens-*/`
  (every route, every module hook and game step at phone, tablet and desktop, plus every accessibility setting on).
- [ ] Check for horizontal scroll, cut-off text, empty bands and "Coming soon" promises that are not true.
- [ ] Initial JS is still under 200 KB gzip, and the test forms (`assessRound` chunk) are not in any practice chunk.
- [ ] Health reviewer has gone through the items flagged in `build/REVIEW-*.md` (content stays `unreviewed` until then).
- [ ] The "Beta: educational, not medical advice" note is visible.
