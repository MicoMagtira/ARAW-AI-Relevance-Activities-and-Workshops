# How-to video storyboards

One file per clip, `<id>.mjs`, where `<id>` is a `TutorialId` from `src/content/tutorials.ts` (`tour`, `fact-or-fake`, or an
arcade game slug). `scripts/tutorials/record.mjs` plays the board once per language and records it; the result is a short,
silent video with one WebVTT caption cue per step.

```js
export default {
  viewport: { width: 1024, height: 576 }, // games 1024x576, the tour 1280x720
  url: '#/arcade/<slug>?seed=video',      // where the clip starts (relative to the app)
  storage: { briefingsSeen: ['<slug>'] }, // saved state to start from (keys of src/app/*.ts persisted signals, no prefix)
  splash: false,                          // true: start on the language landing and splash (tour only)
  clock: true,                            // canvas games: the recorder owns the page clock (see below)
  async ready(page, h) {},                // wait until the first screen is there; the title card follows
  beats: [                                // real-time steps
    { caption: 'English text or an i18n key', async run(page, h) {}, hold: 4000 },
  ],
  timeline: [                             // game-time steps (clock: true only), ms after the beats end
    { at: 2400, key: 'ArrowUp' },
    { at: 5000, caption: '...' },
    { at: 6600, key: ' ' },
    { at: 8000, run: async (page, h) => {} },
  ],
  end: 25000,                             // game ms at which the clip ends (after the last timeline step)
};
```

Every clip opens with a title card ("How to play: <game>", translated) that is also the first caption and the poster frame.

## Captions

- A caption is the **exact English text** of a string the language packs already translate, or a catalog key from
  `src/app/i18n.ts` (for example `'gawa.how.parts'`). The recorder translates it per language and **fails** if a pack lacks
  it. Reuse the game's own How to play lines (`howTo` in the game definition, or its `*.how.*` keys): they are translated.
- Do not invent new caption text. If a clip truly needs a new line, add it to `TUTORIAL_CAPTIONS` in
  `src/content/tutorials.ts` and get it translated (scripts/i18n/README.md) before recording other languages.
- The generic closing line is `'Now it is your turn. Have fun!'` (`TUTORIAL_CAPTIONS.yourTurn`).
- Seniors read slowly: keep each caption on screen 4 to 6 seconds, and show on screen what the caption says while it shows.
- Keep clips short: 20 to 35 seconds for a game, about 60 for the tour.

## The helpers (`h`)

`h.click(locator)` glides the pixel cursor to an element and clicks it · `h.point(locator)` glides without clicking ·
`h.press(key, label)` shows a key cap and presses the key · `h.move(x, y)` · `h.scroll(dy)` · `h.sleep(ms)` ·
`h.card({ kicker, heading, line }, ms)` a full-screen title card · `h.t(keyOrText, vars)` the app's t() in the clip's
language (use it to find buttons by their translated name) · `h.state()` a canvas game's text description and HUD ·
`h.lang` the language code.

Find elements by stable classes or by `h.t(...)` names, never by English text: the same board runs in five languages.

## Canvas games: the game clock

With `clock: true` the recorder installs Playwright's fake clock and advances it in 40 ms ticks, paced to real time.
Timeline steps run between ticks while the clock waits (a cursor glide inside a step costs no game time), so a key press
always lands on the same game moment: with a fixed `?seed=` the run is identical in every language. **Start the run from
the timeline** (`{ at: 0, caption, run: (page, h) => h.click(page.locator('.game-card .px-btn--gold')) }`), not from a beat:
a real-time beat would let the clock tick on while it runs. Game time can run a little slower than real time on a busy
machine, so a clip may last a few seconds longer than its `end`. Drags: the game reads a held pointer once per frame, and the clock
stands still inside a step, so split a drag into a press step, a few move steps about 80 ms apart, and a release step
(see hati-tayo.mjs). Plan key presses with some slack (a quarter second either way still works) where you can. Plan the key timeline with the probe, which plays the board in English, fast, and prints the
game's own text description and HUD every few hundred ms:

```sh
npm run build
node scripts/tutorials/probe.mjs <id> --every=250 --until=30000      # add --shots for a PNG every second
```

## Test a board

```sh
node scripts/tutorials/record.mjs <id> --langs=en --dry --shots      # video + PNG per caption in shots-out/tutorials/
```

`--dry` leaves `public/videos` and the manifest alone. `--no-server` uses a preview server already running on 4173.
