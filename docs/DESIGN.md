# ARAW: 8-bit Design System (desktop-first)

This is the **visual authority** for ARAW. The whole app is 8-bit, in the spirit of its sibling app TALA: pixel borders, hard shadows,
pixel icons and a pixel-art Ara. The difference is the palette: TALA is night, ARAW is a warm, light daytime sunrise.

- **Desktop landscape is the primary design** (1366x768 and 1920x1080 first). Tablet and phone are adaptations with the same features.
- The early phone-first mockups (kept in the private planning folder) were a **content and flow reference only**; this document supersedes them.
- Product behaviour: `docs/SPEC.md`. Words: `docs/CONTENT_GUIDE.md`.

---

## 1. Principles

1. **Readable first, retro second.** Pixel fonts for short labels; Nunito 18px for anything people must read and think about.
2. **Chunky and honest.** Square shapes, 4px pixel borders, hard offset shadows with no blur, no gradients except stepped bands.
3. **Everything on the 4px grid.** All sizes, spacing, borders and shadows are multiples of 4px (2px only inside meters).
4. **Calm sunrise.** Cream backgrounds, gold banners, navy ink. Coral is a spark (fills only), never a text colour.
5. **Same app everywhere.** Layouts reflow; nothing is removed at small sizes.

## 2. Tokens (`src/styles/tokens.css`; components use variables only, never raw hexes)

```css
:root {
  /* palette */
  --cream: #FFF8EC;      /* page background */
  --surface: #FFFFFF;    /* panels, cards */
  --gold: #F5D89E;       /* header banner, done states */
  --gold-deep: #E8B84A;  /* accents, barber pole */
  --navy: #35408E;       /* primary buttons, active nav */
  --navy-dark: #283276;  /* primary hover */
  --navy-tint: #E3E6F5;  /* selected chips, current item bg */
  --ink: #1F2550;        /* text, pixel borders, shadows */
  --muted: #4A4F6A;      /* secondary text */
  --coral: #FF7A59;      /* XP, streak, highlights: FILLS ONLY */
  --fact: #1E7D50;  --fact-tint: #E3F4EA;
  --fake: #C4323A;  --fake-tint: #FDE7E8;
  --line: #EADFC8;       /* dividers, inactive tracks */
  --soft: #F3ECDD;       /* soft fills, hover, locked */

  /* pixel geometry */
  --px: 4px;                 /* border and shadow unit */
  --px-line: var(--ink);     /* border colour */
  --px-shadow: var(--ink);   /* hard shadow colour */
  --focus: var(--ink);

  /* type */
  --font-pixel: 'Press Start 2P', ui-monospace, monospace;
  --font-head: 'Baloo 2', system-ui, sans-serif;
  --font-body: 'Nunito', system-ui, sans-serif;
  --text-scale: 1;           /* 1.2 with Larger text */

  /* spacing (4px grid) */
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

  /* targets */
  --tap: 44px;               /* 56px with Extra-large buttons */

  /* motion */
  --step-fast: 120ms; --step: 160ms; --step-slow: 240ms;
}
```

Approved text pairs (all ≥ 4.5:1): ink or navy on cream/surface/gold/soft/tints; muted on cream/surface/soft; white on navy,
fact or fake; ink on coral and gold-deep fills. Never coral text, never gold text, never white on gold.

### App-wide setting classes (on `<html>`)
| Class | Effect |
|---|---|
| `.a11y-large-text` | `--text-scale: 1.2` (every font size is `calc(<size> * var(--text-scale))`) |
| `.a11y-high-contrast` | see below |
| `.a11y-xl-buttons` | `--tap: 56px`; button paddings +8px; tab bar 72px |
| `.a11y-sr-hints` | renders extra `.sr-hint` descriptions (visually hidden) and richer game narration |
| `.a11y-reduce-motion` | same as `prefers-reduced-motion: reduce` (section 9) |

**High contrast** overrides: `--cream: #FFFFFF; --soft: #FFFFFF; --line: var(--ink); --muted: var(--ink); --navy: #1F2550;`
`--gold: #FFE08A` (ink text on it), borders always 4px ink, focus ring 4px, all decorative patterns (dither, stripes) removed,
disabled states use a dashed ink border plus the word "Locked"/"Off" (never colour alone).

## 3. Typography

Three self-hosted fonts (`@fontsource/press-start-2p`, `@fontsource/baloo-2`, `@fontsource/nunito`, OFL).

| Role | Font | Desktop | Phone | Notes |
|---|---|---|---|---|
| Splash wordmark | Press Start 2P | `clamp(32px, 6vw, 72px)` | same | only place larger than 32px |
| Screen title (header banner) | Press Start 2P | 20px | 16px | 1 to 3 words, uppercase |
| Section label ("YOUR PATH") | Press Start 2P | 14px | 12px | uppercase, ink or muted |
| Button | Press Start 2P | 14px (lg 16px) | 14px | uppercase, ≤ 18 characters |
| Nav item (sidebar, top tabs) | Press Start 2P | 12px | (phone tabs: see note) | |
| Chip, badge label, HUD, kicker | Press Start 2P | 12px | 12px | **minimum size for meaningful pixel text** |
| Content heading (card, module and myth titles) | Baloo 2 800 | 28px (h2) / 22px (h3) | 24px / 20px | sentence case |
| Body, lesson text, feedback | Nunito 400/700 | 18px / line-height 1.6 | 18px | max 68ch per line |
| Secondary text (hints, meta) | Nunito 600 | 16px | 16px | **minimum body size** |

Rules:
- Press Start 2P: `line-height: 1.5`, `letter-spacing: 0`, no italics, no bold (the font has one weight), short strings only.
  Pixel text is never used for sentences, explanations, health facts or form help.
- **Fallback rule:** if a label can't fit at 12px Press Start 2P (e.g. phone bottom-tab labels at 320px), use Baloo 2 800 at
  13 to 14px instead. Never shrink pixel text below 12px. Exception: the decorative "ARAW GAME" watermark (`aria-hidden`).
- All sizes multiply by `--text-scale`. Layouts must survive Larger text without overflow (wrap, never clip).
- Numbers in HUDs use Press Start 2P (tabular by nature).

## 4. Layout

### Breakpoints
| Name | Width | Shell |
|---|---|---|
| Phone | < 600px | compact header + bottom tab bar, single column |
| Tablet | 600–1023px | header + sticky top tabs, 2 columns |
| **Desktop** | **≥ 1024px** | **left sidebar + gold header banner, 12-column grid** |
| Wide | ≥ 1600px | same as desktop, wider gutters, content max 1440px centered |

Supported range 320px to 2560px with **no horizontal page scroll** (`overflow-x: clip` on the shell is not a fix; layouts must fit).
Use flex/grid, `clamp()`, `minmax()`, and container queries (`container-type: inline-size` on cards and panels).

### Desktop shell (primary)

```
+------------------+-----------------------------------------------------------+
| [sun] ARAW [BETA]|  GOLD HEADER BANNER   SCREEN TITLE      [240 XP][3 DAYS][av]|
|                  +===========================================================+ <- 4px ink + 4px gold-deep edge
| > HOME           |                                                           |
|   LEARN          |    main content: 12-col grid, gap 24px (32px wide),       |
|   ARCADE         |    padding 32px (48px wide), max-width 1440px, centered   |
|   LIBRARY        |                                                           |
|   ME             |                                                           |
|                  |                                                           |
| ---------------- |                                                           |
| [flag] REPORT    |                                                           |
| AIKasalig ·      |                                                           |
| DOST-PCHRD · NU  |                                                           |
| Beta: not        |                                                           |
| medical advice   |                                                           |
+------------------+-----------------------------------------------------------+
```

- **Sidebar:** `width: clamp(240px, 18.75vw, 288px)` (240 at 1024, 256 at 1366, 288 at 1920). Sticky, full height, `--surface`
  background, 4px ink right border. Logo block 88px tall (pixel sun mark 32px + "ARAW" Press Start 2P 20px navy + BETA chip).
  Nav items 52px tall with 8px gaps. Footer pinned to the bottom: Report button (secondary, full width), credit line and beta note
  (Nunito 14px muted; the only place 14px body text is allowed, since it is repeated in About).
- **Header banner:** height 72px (80px ≥ 1600px), `--gold`, sticky at the top of the main column. Left: screen title. Right: XP chip,
  streak chip, avatar (40px pixel avatar + nickname, links to Me). Bottom edge: 4px ink line then 4px `--gold-deep` line.
  A decorative pixel sun (64x32, half risen) sits behind the right side at 30% (hidden in high contrast).
- **Content:** 12 columns. At 1366x768 each screen's key action must be visible without scrolling (viewport below the banner ≈ 696px).
  At 1920x1080 use the extra width for a third column or larger previews, not for stretching text: body text max 68ch.
- **Focus mode** (module runner, Fact or Fake rounds, games, certificate): sidebar and banner are replaced by a 64px top bar
  (Close, title, progress bar, Report flag) on a `--cream` stage; content centered, max 1200px.

### Tablet (600–1023px)
- Header 64px: logo + BETA, then XP chip, streak chip, report flag icon button (44px).
- Sticky top tab bar 56px below the header: 5 equal tabs (icon 24px + Press Start 2P 12px label; falls back to Baloo 2 per the
  fallback rule below ~720px). Active tab: navy fill, white text, notched border.
- Content: 8-column grid, gap 16px, padding 24px. Desktop's side panels become stacked sections or dialogs.

### Phone (< 600px)
- Header 56px: logo mark + "ARAW", XP chip, streak chip, report flag (44px).
- Bottom tab bar 64px + `env(safe-area-inset-bottom)`, 4px ink top border, 5 tabs (Home, Learn, Arcade, Library, Me): pixel icon 24px
  + Baloo 2 800 13px label; active tab shows a 40x32 navy tile behind a white icon and an ink label.
- Single column, padding 16px, gap 16px. Side panels and detail panels become bottom sheets. Beta note appears in Home's footer.

## 5. Pixel UI kit (exact recipes, `src/styles/base.css`)

### 5.1 Pixel box (panels, cards): square border + hard shadow
```css
.px-box {
  background: var(--surface);
  color: var(--ink);
  border: var(--px) solid var(--px-line);
  border-radius: 0;
  box-shadow: var(--px) var(--px) 0 0 var(--px-shadow);   /* no blur, ever */
}
.px-panel { padding: var(--sp-5); }  /* always used together with .px-box: class="px-box px-panel" */
```
Leave `var(--px)` of space to the right and below (the shadow does not take layout space).

### 5.2 Notched pixel border (buttons, chips, HUD, badges, tabs): 8-bit cut corners
Drawn entirely with stacked hard box-shadows: four 4px "border" strips with the corners missing, then a stepped hard shadow.
```css
.px-notch {
  --c: var(--px-line); --s: var(--px-shadow);
  border: 0; border-radius: 0;
  margin: var(--px) calc(var(--px) * 3) calc(var(--px) * 3) var(--px); /* room for the fake border and shadow */
  box-shadow:
    0 calc(var(--px) * -1) 0 0 var(--c),        /* top    */
    0 var(--px) 0 0 var(--c),                   /* bottom */
    calc(var(--px) * -1) 0 0 0 var(--c),        /* left   */
    var(--px) 0 0 0 var(--c),                   /* right  */
    var(--px) var(--px) 0 0 var(--s),           /* shadow body (fills the corner) */
    calc(var(--px) * 2) var(--px) 0 0 var(--s), /* shadow right strip */
    var(--px) calc(var(--px) * 2) 0 0 var(--s); /* shadow bottom strip */
}
.px-notch--flat {  /* pressed / selected / disabled: border only, no shadow */
  box-shadow:
    0 calc(var(--px) * -1) 0 0 var(--c), 0 var(--px) 0 0 var(--c),
    calc(var(--px) * -1) 0 0 0 var(--c), var(--px) 0 0 0 var(--c);
}
```

### 5.3 Buttons
```css
.px-btn {
  /* + .px-notch */
  display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2);
  min-height: max(48px, var(--tap)); min-width: var(--tap);
  padding: var(--sp-3) var(--sp-5);
  font: calc(14px * var(--text-scale)) / 1.5 var(--font-pixel);
  text-transform: uppercase; cursor: pointer;
  background: var(--navy); color: #fff;            /* primary (#fff is the one allowed literal: white text) */
  transition: transform var(--step-fast) steps(2), background-color var(--step-fast) steps(2);
}
.px-btn:hover { background: var(--navy-dark); }
.px-btn:active { transform: translate(var(--px), var(--px)); /* + .px-notch--flat shadows */ }
.px-btn:focus-visible { outline: 3px solid var(--focus); outline-offset: 7px; }  /* clears the fake border + shadow */
.px-btn--secondary { background: var(--surface); color: var(--navy); }
.px-btn--secondary:hover { background: var(--soft); }
.px-btn--gold { background: var(--gold-deep); color: var(--ink); }       /* hero CTA: Continue, Play today's challenge */
.px-btn--fact { background: var(--fact); color: #fff; }
.px-btn--fake { background: var(--fake); color: #fff; }
.px-btn--lg { min-height: max(56px, var(--tap)); font-size: calc(16px * var(--text-scale)); padding: var(--sp-4) var(--sp-6); }
.px-btn--icon { padding: 0; width: var(--tap); }                         /* always has aria-label */
.px-btn[disabled], .px-btn[aria-disabled="true"] {
  background: var(--soft); color: var(--muted); cursor: not-allowed; transform: none; /* + .px-notch--flat, --c: var(--muted) */
}
```
States: **rest** (raised, shadow) → **hover** (darker fill, 2 steps) → **pressed** (moves 4px down-right onto its shadow, shadow gone)
→ **focus** (3px ink outline, 7px offset; gold outline on navy backgrounds). Toggle buttons with `aria-pressed="true"` stay in the
pressed position with `--navy-tint` fill and navy text.

### 5.4 Cards
- **Base card:** `.px-box` + padding 16–24px. Interactive cards are `<a>` or `<button>` with hover `transform: translate(-2px,-2px)`
  and shadow `6px 6px` (2 steps, 120ms), pressed = translate(4px,4px) with no shadow.
- **Module card / node:** 64px pixel tile with the module number in Press Start 2P. States: done (gold fill, check icon), current
  (navy fill, white number, coral 4px "pulse" ring that steps on/off every 800ms; static with reduced motion), locked (soft fill,
  muted number, lock icon, dashed muted border in high contrast).
- **Game tile:** pixel-art icon 64px on a tinted header block, name (Baloo 2 800 20px), topic (Nunito 16px), status chip
  ("BEST 1,240" / "NEW" / "LOCKED · M6").
- **Myth flip card:** front (cream, "MYTH" kicker chip, Baloo headline) and back (white, "FACT" chip in fact-tint); flip is a 4-step
  `scaleX(1 → 0 → 1)` swap over 240ms (instant swap with reduced motion). `aria-pressed` on the card button, both sides in the DOM.
- **Badge medallion:** 8-sided pixel octagon (clip-path with 4px steps) 64–96px, gold-deep ring, pixel icon; locked = soft silhouette.

### 5.5 Chips
```css
.px-chip {
  /* + .px-notch with --px: 2px for small chips */
  display: inline-flex; align-items: center; gap: var(--sp-1);
  min-height: 32px; padding: var(--sp-1) var(--sp-3);
  font: calc(12px * var(--text-scale)) / 1.5 var(--font-pixel);
  background: var(--soft); color: var(--ink);
}
.px-chip--xp     { background: var(--coral); color: var(--ink); }     /* XP chip: star icon + "240 XP" */
.px-chip--streak { background: var(--gold-deep); color: var(--ink); } /* flame icon + "3 DAYS" */
.px-chip--fact   { background: var(--fact-tint); color: var(--fact); --c: var(--fact); }
.px-chip--fake   { background: var(--fake-tint); color: var(--fake); --c: var(--fake); } /* trick chips */
.px-chip--select { min-height: var(--tap); cursor: pointer; }          /* filter chips are buttons with aria-pressed */
```

### 5.6 Toggle (pixel switch)
```html
<button class="px-switch" role="switch" aria-checked="false"><span class="px-switch__knob"></span></button>
```
```css
.px-switch { width: 64px; height: 36px; padding: 0; position: relative;
  background: var(--soft); border: var(--px) solid var(--ink); box-shadow: var(--px) var(--px) 0 0 var(--ink); }
.px-switch[aria-checked="true"] { background: var(--fact); }
.px-switch__knob { position: absolute; top: 4px; left: 4px; width: 20px; height: 20px;
  background: var(--surface); border: var(--px) solid var(--ink); box-sizing: border-box;
  transition: transform var(--step-fast) steps(3); }
.px-switch[aria-checked="true"] .px-switch__knob { transform: translateX(28px); }
```
The whole settings row (label + hint + switch) is one `<label>`-linked tap target ≥ `--tap` tall. Next to the switch show the word
**ON** / **OFF** (Press Start 2P 12px) so state never depends on colour.

### 5.7 Slider
```css
.px-range { appearance: none; width: 100%; height: 20px; background: var(--soft);
  border: var(--px) solid var(--ink);
  background-image: linear-gradient(var(--gold-deep), var(--gold-deep));
  background-size: var(--fill, 50%) 100%; background-repeat: no-repeat; }
.px-range::-webkit-slider-thumb { appearance: none; width: 20px; height: 32px; background: var(--navy);
  border: var(--px) solid var(--ink); border-radius: 0; box-shadow: var(--px) var(--px) 0 0 var(--ink); }
.px-range::-moz-range-thumb { width: 12px; height: 24px; background: var(--navy);
  border: var(--px) solid var(--ink); border-radius: 0; box-shadow: var(--px) var(--px) 0 0 var(--ink); }
```
Native `<input type="range">` with a visible value label; thumb hit area padded to `--tap`.

### 5.8 Progress bars
**Barber pole** (TALA-style; module progress, loading, XP to next milestone):
```css
.px-progress { height: 24px; background: var(--soft); border: var(--px) solid var(--ink);
  box-shadow: var(--px) var(--px) 0 0 var(--ink); overflow: hidden; }
.px-progress__fill { height: 100%; width: var(--value);   /* value rounded to 5% steps in code */
  background: repeating-linear-gradient(-45deg, var(--gold-deep) 0 8px, var(--gold) 8px 16px);
  background-size: 22.63px 22.63px;                       /* 16px * sqrt(2): seamless tile */
  border-right: var(--px) solid var(--ink);
  animation: px-barber 800ms steps(4) infinite; }
@keyframes px-barber { to { background-position: 22.63px 0; } }
```
Use `role="progressbar"` with `aria-valuenow/min/max` and a visible text value ("3 / 7 cards").
**Segmented meter** (HUDs: Privacy Shield, Trust Meter, Truth Radar):
```css
.px-meter { display: grid; grid-template-columns: repeat(var(--segments, 10), 1fr); gap: 2px;
  padding: 2px; background: var(--ink); border: var(--px) solid var(--ink); }
.px-meter > i { height: 12px; background: var(--soft); }
.px-meter > i.on { background: var(--fact); }   /* low (≤30%): var(--fake); mid: var(--gold-deep) */
```
Always paired with a text label and value ("PRIVACY SHIELD 70%").

### 5.9 Dialogs and sheets
- **Dialog** (native `<dialog>`, focus trapped, Esc closes, focus returns to the opener): `.px-box`, max-width 560px (720px for
  wide content), title bar = `--gold` strip 56px with Press Start 2P 14px title and a 44px icon close button, body padding 24px,
  footer actions right-aligned (stacked full width on phone).
  Backdrop: `rgba(31, 37, 80, .55)` plus a 4px dither
  `background-image: conic-gradient(rgba(31,37,80,.25) 25%, transparent 0 50%, rgba(31,37,80,.25) 0 75%, transparent 0); background-size: 4px 4px;`.
  Enter: `translateY(16px) → 0` in `steps(4)` over 160ms.
- **Bottom sheet** (phone only): full width, 4px ink top border, no side shadow, 48x8 pixel drag handle, max-height 85dvh with
  internal scroll, same title bar. On tablet and desktop the same content renders as a dialog or a side panel.

### 5.10 Tabs (segmented)
`role="tablist"` container with `.px-notch`; tabs are buttons (`role="tab"`, `aria-selected`, arrow-key navigation, Home/End),
min-height `--tap`, Press Start 2P 12px. Selected: navy fill, white text, flat (pressed) look. Unselected: surface fill, ink text, hover soft.

### 5.11 Nav items
- **Sidebar item:** 52px tall, padding 0 16px, pixel icon 24px + Press Start 2P 12px label, ink text, transparent background.
  Hover: `--soft` fill. Active (`aria-current="page"`): `.px-notch` with navy fill, white text and icon, plus an 8px gold
  "sunbeam" on the left edge (`box-shadow: inset 8px 0 0 var(--gold)` layered first). Focus: 3px ink outline, 4px offset.
- **Top tab / bottom tab:** see section 4. Badges (e.g. "NEW") are 12px pixel chips, never colour dots alone.

### 5.12 Toasts
`role="status"` (`aria-live="polite"`) stack; desktop top-right below the banner (24px inset), phone top-center below the header.
`.px-box` with a 40px icon tile on the left (coral for XP, gold-deep for badge, fact for success), Press Start 2P 12px title,
Nunito 16px text. Max-width 360px. Auto-dismiss after 4s (paused on hover or focus), close button 44px. Enter in `steps(3)` from
16px above; reduced motion: appear instantly.

### 5.13 Speech bubble (Ara)
`.px-box` with padding 16px, Nunito 18px, plus a stepped tail made of a tiny pixel SVG (3x3 cells at 4px) placed over the bubble's
left border so the white cells replace the border segment:
```html
<svg class="px-bubble__tail" width="12" height="12" viewBox="0 0 3 3" shape-rendering="crispEdges" aria-hidden="true">
  <path fill="var(--ink)" d="M1 0h1v1H1zM0 1h1v1H0zM1 2h1v1H1z"/>
  <path fill="var(--surface)" d="M2 0h1v3H2zM1 1h1v1H1z"/>
</svg>
```
`position: absolute; left: -8px; top: 20px;` (mirrored with `transform: scaleX(-1)` for a right-side Ara; rotated 90° for a bubble above).
Bubbles are `aria-live="polite"` only when they change in response to an answer.

### 5.14 FAKE stamp and watermark
```css
.px-stamp { position: absolute; top: 12px; right: 12px; transform: rotate(-8deg);
  padding: var(--sp-2) var(--sp-3); background: var(--fake-tint); color: var(--fake);
  border: var(--px) solid var(--fake); box-shadow: var(--px) var(--px) 0 0 var(--fake);
  font: calc(12px * var(--text-scale)) / 1.5 var(--font-pixel); text-transform: uppercase; }
/* text: "ARAW GAME · FAKE"; enters with a 2-step scale 1.4 -> 1 thump (instant with reduced motion) */
.px-watermark { position: absolute; bottom: 8px; right: 8px; font: 10px/1 var(--font-pixel);
  color: var(--muted); opacity: .6; pointer-events: none; } /* "ARAW GAME", aria-hidden, on every item card */
```

### 5.15 Header banner, HUD and misc
- **Header banner:** see section 4.
- **Game HUD:** DOM overlay above the canvas (never drawn only on canvas): `.px-notch` chips for score, hearts (pixel heart icons
  + "3 of 3 lives" text), meters (5.8), pause button. Press Start 2P 12–14px. Live values announced politely at most every 2s.
- **Inputs (nickname, search, details):** `.px-box` style with no shadow, 48px tall, Nunito 18px, 4px ink border; focus = 3px ink
  outline offset 2px plus `--navy-tint` fill. Labels always visible (Press Start 2P 12px above the field).
- **Skip link:** "Skip to content", first focusable element, visible on focus as a gold `.px-btn`.

### 5.16 Motifs
- **8-bit sunrise bands** (splash, home hero, certificate border, game title cards):
  ```css
  .px-sunrise { background: linear-gradient(to bottom,
      var(--cream) 0 45%, var(--gold) 45% 60%, var(--gold-deep) 60% 72%, var(--coral) 72% 80%, var(--navy) 80% 100%); }
  ```
  with a stepped pixel sun (an SVG of rects forming a half circle, radius 12 cells) rising from the horizon line, and 2–3 pixel
  clouds. Text never sits directly on bands; it sits on a panel.
- **Dither** (4px checker, section 5.9) for overlays and locked states; removed in high contrast.
- **Pixel confetti:** see section 9.

## 6. Pixel icons

Pixel-art only, on a 24x24 grid (1 cell = 1px at 24px; render at 24, 32 or 48px), `shape-rendering: crispEdges`, single colour
`currentColor`. Source: `pixelarticons` (MIT) where the icon exists; otherwise hand-made in the same 24-cell style in `src/ui/icons/`.
Verify the exact pixelarticons name in the installed package before use.

| Use | Icon id | Source |
|---|---|---|
| Home tab | `home` | pixelarticons `home` |
| Learn tab | `learn` | pixelarticons `book-open` |
| Arcade tab | `arcade` | pixelarticons `gamepad` |
| Library tab | `library` | pixelarticons `bookmarks` or hand-made book stack |
| Me tab | `me` | pixelarticons `user` |
| Report | `flag` | pixelarticons `flag` |
| Close / back / next | `close`, `chevron-left`, `chevron-right`, `arrow-left`, `arrow-right` | pixelarticons |
| Correct / wrong | `check`, `close` (in fact/fake tiles) | pixelarticons |
| Lock / unlock | `lock`, `lock-open` | pixelarticons |
| Play / pause / retry | `play`, `pause`, `reload` | pixelarticons |
| Search / filter | `search`, `sliders` | pixelarticons |
| Settings rows | `text-size` (A+), `contrast`, `hand` (big buttons), `speaker`, `motion-off` | hand-made |
| Hearts / lives | `heart` | pixelarticons `heart` |
| XP | `xp-star` | hand-made 4-point pixel star |
| Streak | `flame` | hand-made |
| Streak freeze | `snowflake` | hand-made |
| Daily | `calendar` | pixelarticons `calendar` |
| Badge | `trophy` | pixelarticons `trophy` |
| Share / copy / download / print | `share`, `copy`, `download`, `printer` | pixelarticons (hand-made fallback) |
| Info / help | `info` | pixelarticons `info-box` |
| Email | `mail` | pixelarticons `mail` |
| Brand mark | `sun` | hand-made pixel sun (also favicon/PWA icon) |
| Modules 1–10 | `m01`…`m10` | hand-made 32x32: chip-brain, teaching board, stethoscope, magnifier, chat bubbles, handshake, paintbrush, moon, wheelchair+speech, gavel |
| Games | one 32x32 pixel icon per game slug | hand-made: runner shoe, phone feed, cooking pot, ringing phone, larva+box, crosswalk, split arrows, poster, sleeping face, sneakers, "!" speech |
| Villains | 5 portraits 48x48 | hand-made, comic not scary |

Every icon-only button has an `aria-label`; decorative icons are `aria-hidden="true"`.

## 7. Ara, the pixel-art sprite

Ara is a chibi Filipina sun-spirit girl: gold hair framed by pixel sun rays, navy outfit with a white collar and a coral sun emblem,
gold hem trim. Rendered as an SVG of `<rect>`s (merge horizontal runs per row) with `shape-rendering="crispEdges"`, from frame grids
in `src/ui/ara/frames.ts`. Displayed only at **integer scales** of the 32x32 grid: 64 (2x, HUD/inline), 96 (3x, bubbles),
128 (4x, cards), 192 (6x, home hero), 256 (8x, splash and badge ceremony).

### Palette (sprite-only; may use these literals inside the frame data)
| Key | Colour | Use |
|---|---|---|
| `.` | transparent | |
| `K` | `#1F2550` ink | outline, eyes, mouth, shoes |
| `Y` | `#F5D89E` gold | hair |
| `G` | `#E8B84A` deep gold | hair shading, sun rays, hem trim |
| `S` | `#E2A77E` skin | face, neck, hands, legs |
| `s` | `#C98A62` skin shade | chin shadow |
| `N` | `#35408E` navy | outfit |
| `n` | `#283276` navy shade | skirt |
| `W` | `#FFFFFF` white | eye highlights, collar |
| `C` | `#FF7A59` coral | cheeks, sun emblem, open mouth |

### Base frame: `idle` (32x32 reference grid)
The implementer may refine individual pixels for charm, keeping the palette, proportions (big head ≈ rows 2–20, body rows 21–31),
silhouette and ray positions.
```
r00 ...............GG...............
r01 ....G..........GG..........G....
r02 .....G...KKKKKKKKKKKKKK...G.....
r03 ......G.KYYYYYYYYYYYYYYK.G......
r04 .......KYYYYYYYYYYYYYYYYK.......
r05 ......KYYYGYYYYYYYYYYGYYYK......
r06 .....KYYYGYYYYYYYYYYYYGYYYK.....
r07 .....KYYGYYYYYYYYYYYYYYGYYK.....
r08 ....KYYYGYYYGYYYYYYGYYYGYYYK....
r09 ....KYYGYYGGGGGGGGGGGGYYGYYK....
r10 ....KYYGYYSSSSSSSSSSSSYYGYYK....
r11 GGG.KYYGYSSSSSSSSSSSSSSYGYYK.GGG
r12 ....KYYGYSSWKSSSSSSWKSSYGYYK....
r13 ....KYYGYSSKKSSSSSSKKSSYGYYK....
r14 ....KYYGYSSKKSSSSSSKKSSYGYYK....
r15 ....KYYGYSCCSSSSSSSSCCSYGYYK....
r16 .....KYGYSSSSKSSSSKSSSSYGYK.....
r17 .....KYGGSSSSSKKKKSSSSSGGYK.....
r18 ....G.KYYGsSSSSSSSSSSsGYYK.G....
r19 ...G...KYYKKKKKKKKKKKKYYK...G...
r20 ..G....KYK...KSSSSK...KYK....G..
r21 ........KKKKKWWSSWWKKKKK........
r22 .......KNNNNNNWWWWNNNNNNK.......
r23 ......KNKNNNNNNCCNNNNNNKNK......
r24 ......KNKNNNNNNCCNNNNNNKNK......
r25 ......KNKNNNNNNNNNNNNNNKNK......
r26 ......KSKNNNNNNNNNNNNNNKSK......
r27 .......KnnnnnnnnnnnnnnnnK.......
r28 .......KGGGGGGGGGGGGGGGGK.......
r29 ........KKKKKKKKKKKKKKKK........
r30 ..........KSK......KSK..........
r31 .........KKKK......KKKK.........
```
Eyes: 2x3 blocks at cols 11–12 and 19–20, rows 12–14, highlight `W` top-left. Mouth: smile at rows 16–17, cols 13–18.

### Frames (deltas from `idle`)
| Frame | When | Changes |
|---|---|---|
| `idle` (A/B) | default | B = whole sprite drawn 1 cell lower (bob). Blink: rows 12 and 14 eye cells become `S`, row 13 stays `KK` |
| `happy` | correct answer, success | eyes become `^` arcs (row 13 cols 11–12 and 19–20 `K`; row 14 cols 10, 13, 18, 21 `K`; rows 12/14 other eye cells `S`); open smile (row 16 cols 13–18 `K`, row 17 cols 13 & 18 `K` with 14–17 `C`, row 18 cols 14–17 `K`); arms raised (hands `S` at rows 19–20 beside the hair, cols 5 and 26; sleeves rows 21–23) |
| `wow` | badge, big reveal | eyes 3x3 (cols 10–12 / 19–21) with `W` highlight; small "O" mouth (row 16 cols 15–16 `K`; row 17 col 14 `K`, 15–16 `C`, col 17 `K`; row 18 cols 15–16 `K`); every ray extended 1 cell outward |
| `wink` | hint, "Sure ka na diyan?" | left eye closed (row 13 cols 10–12 `K`, rows 12/14 `S`); right eye normal; smile; right hand raised by the face (`S` at cols 24–25, rows 17–19) |
| `sad` | story empathy only (never at the player) | eyes moved down one row (rows 13–15); worried brows as short `K` slants (row 10 cols 11 & 20, row 11 cols 10 & 21); mouth inverted (row 16 cols 14–17 `K`, row 17 cols 13 & 18 `K`); ray tips use `Y` instead of `G` (dimmer) |
| `think` | wrong answer ("So close!"), loading, AI moments | eyes 2x2 looking up-left (rows 11–12, cols 10–11 / 18–19); flat mouth (row 17 cols 15–16 `K`); one hand at the chin (`S` at cols 17–18, rows 19–20 with `N` sleeve below); a 3-dot thought bubble (`W` with `K` outline) at cols 26–31, rows 0–4 |

### Animation (step-based)
- Idle: A/B alternate every 600ms (`steps(1)`), blink for 120ms at random 3.5–5s intervals.
- Reactions: swap to the frame instantly, hold 900ms, then return to idle. `happy` and `wow` add a 2-step hop (−2 cells then 0, 200ms).
- Reduced motion (OS or in-app): static frame, no bob, no blink, no hop; frames still change (that's information, not motion).
- Accessibility: `role="img"` with `aria-label="Ara, your guide, looking <mood>"`; purely decorative instances use `aria-hidden="true"`.

## 8. Imagery and game art

- Pixel art everywhere: scenes, villain portraits, avatars (Ara style, 32x32), Comics panels (SVG rect scenes from descriptors), game
  sprites. `image-rendering: pixelated` on raster sprites and canvases.
- Games use a **logical resolution** (default 320x240, 4:3; a game may choose 16:9 at 384x216 if play needs width) scaled to fit the
  stage with letterboxing, centered; integer scale when the scale ≥ 2, otherwise fractional with pixelated rendering; backing store
  multiplied by `devicePixelRatio`. Smooth (non-pixel) rendering only where it clearly helps play.
- Decision-heavy games (Feed Mo 'To, Sino 'To?, Luto ni Ara, Hati Tayo!, Gawa Ko 'To!, Tulog na Bea!, Sa Sapatos Nila, OBJECTION!,
  and the module games) may render their play area as pixel-styled DOM inside the GameShell instead of canvas: better for screen
  readers and text. Action games (Takbo Data!, Lamok Lamay, Tawid Lola!) use canvas.
- Synthetic personas only; inclusive cast (ages, skin tones, hijab, wheelchair user).

## 9. Motion

- **Character:** lively but calm. 8-bit motion is stepped: use `steps(n)` timing (2–4 steps) for UI transforms, frame swaps for sprites.
- **Durations:** hover 120ms (2 steps), presses instant, card/page enter 160ms (4 steps, translate 16px + opacity), dialogs 160ms,
  flip cards 240ms, badge ceremony ≤ 1.6s total.
- **Celebrations:** pixel confetti on badges and module complete: 4x4 and 8x8 squares in gold, gold-deep, coral, navy and fact green;
  max 60 particles, gravity, 1.2s, on a pointer-events-none canvas overlay. Ara reacts. Optional `navigator.vibrate(15)` on correct
  answers where supported.
- **Never:** blur, parallax, flashing more than 3 times per second, motion that blocks input, auto-scrolling text.
- **Reduced motion** (`prefers-reduced-motion: reduce` OR `.a11y-reduce-motion`): no confetti (a static sparkle frame instead), no bob
  or hop, barber pole static, card/page transitions instant (or ≤ 100ms opacity), no stamp thump, no vibration. Game motion continues
  (it's the game) but screen shake and flashes are off.

## 10. Accessibility checklist (WCAG 2.2 AA, always on)

Real `<button>`/`<a>`/`<label>` elements · visible focus on every interactive element (3px ink outline; gold on navy) · tap targets
≥ 44px (56px with Extra-large buttons) · text contrast ≥ 4.5:1, UI borders ≥ 3:1 · state never by colour alone (icons + words) ·
alt text or ARIA on every image, icon button and game state · `aria-live` for feedback, toasts and HUD (throttled) · dialogs trap
focus and restore it · logical heading order (one h1 per screen: the banner title) · skip link · forms with visible labels ·
works with keyboard only, including every game.

## 11. Screen layouts (desktop first, then adaptations)

Grid references are for the 12-column desktop content area at 1366x768; at 1920x1080 the same layout gets wider columns and,
where noted, an extra column.

### 11.0 Language landing (first screen of a session, src/screens/Landing.tsx)
"Before sunrise": the splash's sky bands, clouds, ground strip and credits, with the sun held just below the horizon (it rises on
the splash that follows) and happy Ara one scale step smaller than on the splash. The white title panel holds the ARAW
wordmark, the tagline, "Choose your language" (Press Start 2P), the language cards and a large gold **SELECT** button
(disabled until a card is picked), then "You can change this later in Me, under Settings." Language cards (`src/ui/LanguagePicker.tsx`,
also used in Me > Settings): a native radio group; each card is a pixel box (4px ink border, hard shadow) with a navy tag
("EN"), the language name in Baloo 2 and a square mark that fills gold when picked; the picked card turns navy-tint with a navy
border. The invisible radio covers the whole card (tap target 64px tall). Sounds: picking a card plays `select`, SELECT plays
`open`. After SELECT the page scrolls to the top and focus moves to the splash.

### 11.1 Splash (first visit per session, after the language landing)
Full-viewport `.px-sunrise` scene: pixel sun rising behind a centered panel stack: "ARAW" wordmark (Press Start 2P, clamp 32–72px,
navy with a 4px gold hard shadow), subtitle "AI Relevance Activities and Workshops" (Baloo 2), tagline (Nunito), Ara at 8x beside the
panel (desktop) or above it (phone), barber-pole loading bar labelled "THE SUN IS RISING...", then a large gold **START**
button with two compact Music and Sound effects switches under it (section 12). Footer: credit lines (AIKasalig project, and "Created by Mico C. Magtira — Senior Data and NLP-Geospatial Scientist, DOST-NICER"). A "Skip intro" link is the first focus. Landscape phones:
Ara hidden, panel compact.

### 11.2 Home
- **Desktop:** row 1: greeting banner panel (cols 1–8): Ara 6x + bubble "Magandang araw, Kaibigan! Bea has a chatbot question for you."
  + **Continue** card inside (module kicker "CONTINUE · MODULE 3 OF 10", Baloo title, barber progress "3 / 7 cards", gold CONTINUE
  button); stats panel (cols 9–12): XP, streak with freeze indicator, badges x/20, modules x/10. Row 2: Daily Challenge card
  (cols 1–6, sunrise mini-band, "DAILY CHALLENGE · 15 OCT", game name + "+ 3 Fact or Fake", button), Myth of the day flip card
  (cols 7–9), Arcade shortcut (cols 10–12, "6 OF 11 READY"). Row 3: "YOUR PATH" strip of 10 module nodes (cols 1–12) linking to Learn.
  Row 4: badge strip (latest badges + "See all" to Me). At 1920: rows 1–2 merge into a 3-column layout (greeting+continue | daily |
  stats+myth) so everything fits above the fold.
- **Tablet:** greeting+continue full width; daily and stats side by side; myth and arcade side by side; path strip scrolls inside its panel.
- **Phone:** stacked: greeting with Ara 3x, Continue, Daily, Arcade + Myth (2-up tiles if ≥ 360px wide), badges, beta note footer.

### 11.3 Learn
- **Desktop:** path area (cols 1–8): two labelled rows, "CORE MODULES" (M1–M5) and "MORE MODULES" (M6–M10), each a winding pixel
  road (stepped dashed path drawn in SVG) connecting 5 module nodes with short names under them; Ara stands next to the current node.
  Details panel (cols 9–12, sticky): selected module number and status chip, Baloo title, topic, game name with icon, estimated
  minutes, objectives list, badge preview, primary button (START / CONTINUE / REPLAY) or locked message ("Finish Module 2 first").
  At 1920 the path area shows all 10 nodes on one long winding road.
- **Tablet:** path full width (two rows), details as a dialog.
- **Phone:** vertical winding path (nodes alternate left/right on a stepped road), details in a bottom sheet.

### 11.4 Module runner (focus mode)
Top bar: Close, module title (Press Start 2P 12px, truncated), barber progress (step x of n), Report flag (with card id).
- **Desktop:** stage max 1200px: Ara column (cols 1–3: Ara 4x + bubble with reactions) and card column (cols 4–12: the card as a
  large `.px-panel`, illustration on the left half, text and interaction on the right half when wide). Primary action bottom-right.
  Keyboard: Enter/Space next, 1–4 choose options, ←/→ in swipe-sort.
- **Tablet:** Ara small at the top-left of the card, card full width.
- **Phone:** card full width; Ara 2x in the bubble header; action button sticky at the bottom above the safe area.
- Reward step: full-stage dialog with badge medallion 96px, confetti, XP tally rows, "Unlocked: Module 4 · Comics Episode 3".

### 11.5 Fact or Fake (focus mode)
- **Desktop:** three columns: left (cols 1–3) round progress (pixel dots per item: correct/wrong/pending with icons) and Ara;
  center (cols 4–8) the item rendered as its format (feed post, GC screenshot, sponsored ad with synthetic image, chatbot answer)
  with the "ARAW GAME" watermark; below it the two large buttons **FAKE** (left) and **FACT** (right) with key hints.
  Right (cols 9–12) the feedback card appears after answering (correct/"So close!", why, how to check, trick chip, Report link,
  NEXT) while the item gets its FAKE stamp. Results: Truth Radar panel (two meters + Ara tip), score, XP, PLAY AGAIN / DONE.
- **Tablet:** item centered, feedback slides in below the item.
- **Phone:** item card swipeable (right Fact, left Fake) with the buttons below; feedback as a bottom sheet.

### 11.6 Arcade
- **Desktop:** featured banner (cols 1–12): today's game pixel scene, "TODAY'S FEATURED GAME", name, "Same seed for everyone", PLAY.
  Grid "ENDLESS GAMES": 4 tiles per row at 1366 (11 tiles), 6 per row at 1920. "PRACTICE" row: Fact or Fake free play + M1–M5 replays.
  Selecting a tile opens a details dialog: icon, name, topic, how to play, personal best, "First time? Ara gives a 60-second briefing",
  PLAY or the locked message.
- **Tablet:** 3 tiles per row; **phone:** 2 per row (1 below 360px); details in a bottom sheet.

### 11.7 Game (focus mode)
Top bar: Close (pauses + confirm), game name, pause, Report. Stage: canvas or DOM play area, letterboxed and centered at its fixed
aspect ratio, with `--cream` letterbox bars and a `.px-box` frame. HUD chips above the stage (desktop and tablet) or overlaid at the
top inside safe insets (phone). Desktop may show a side panel (cols 10–12) with controls help and live meters when the stage leaves
room. Overlays (briefing pages, pause, Pahinga muna!, game over) are dialogs over the stage; game over shows Ara recap, score, best,
XP, PLAY AGAIN, BACK TO ARCADE. Orientation change or resize mid-game re-fits without losing state.

### 11.8 Daily Challenge
- **Desktop:** left panel (cols 1–4): date, "TODAY'S CHALLENGE" steps list (1 game run, 2 three Fact or Fake items) with status
  icons, streak chip. Main (cols 5–12): the current step (game stage or item). Result: share card preview (the emoji share text shown in
  a `.px-panel`), COPY and SHARE buttons, "Come back tomorrow" note with the next game's name hidden.
- **Tablet/phone:** steps as a horizontal stepper at the top, content below, result card full width.

### 11.9 Library
Segmented tabs MYTHS · DIKSYUNARYO · KOMIKS under the banner (deep-linkable routes).
- **Myths, desktop:** filter column (cols 1–3: search input, topic filter chips, villain filter) + flip-card grid (cols 4–12, 3 per row;
  4 at 1920). Tablet 2 per row with filters above; phone 1 per row with a filter button opening a sheet.
- **Dictionary, desktop:** A–Z index column (cols 1–2, sticky letter buttons) + search on top + card grid (cols 3–12, 3 per row):
  term (Baloo), meaning, "Halimbawa: ..." example, "Seen in Module X" link. Tablet 2 per row; phone 1 per row with the A–Z index as a
  horizontal scroller.
- **Comics, desktop:** episode list (cols 1–4: 10 episode rows with number tile, title, locked/new chip) + reader (cols 5–12):
  panels in a 2x3 pixel-framed grid with speech bubbles as real text, PREV / NEXT EPISODE. Tablet: list then reader stacked;
  phone: list, reader opens full screen with one panel per row.

### 11.10 Me
- **Desktop:** three columns: profile (cols 1–4: nickname input, avatar picker grid 3x2 of 64px pixel avatars with `aria-pressed`,
  stats list), badge cabinet (cols 5–8: medallion grid with locked silhouettes and "how to earn" on focus/tap; Certificate button),
  settings (cols 9–12: ACCESSIBILITY rows with switches, SOUND rows (Music and Sound effects switches, each with a volume slider; section 12), LANGUAGE row, Report, About and licences, Reset my progress).
  At 1920 the columns simply widen.
- **Tablet:** profile + stats row, then badges, then settings full width. **Phone:** single column in the same order; settings rows
  full width with switches on the right.

### 11.11 Report
- **Desktop:** centered panel max 960px, two columns: left: "What kind of problem?" category tiles (2x2, `aria-pressed`), optional
  details textarea, privacy note, OPEN EMAIL button; right: "ADDED AUTOMATICALLY" preview panel (screen, item, app version, device)
  and Ara 3x saying "Salamat for helping!". **Tablet/phone:** single column, preview below the details.

### 11.12 Certificate (focus mode)
Desktop: left controls panel (name input "Name on certificate (not saved)", PRINT, DOWNLOAD PNG) and a right live preview at A4
landscape ratio: sunrise pixel border, ARAW wordmark, Ara 6x, name in Baloo 2 800, "completed all 10 ARAW modules", date, badge row,
credit line. Phone: controls above, preview scaled to width. Print CSS hides everything except
the certificate.

### 11.13 About and Not Found
- **About:** single readable column (max 68ch) in a `.px-panel`: what ARAW is, licences (MIT code, CC BY 4.0 content, OFL fonts,
  pixelarticons MIT), credit line, beta and not-medical-advice note, content review status.
- **Not Found:** centered Ara (think) at 4x, "Hala! This page is lost." and a HOME button.

## 12. Sound

ARAW sounds like an 8-bit console, the same family as TALA. Nothing is recorded: every sound is generated live with the Web Audio
API, so the whole set costs a few KB and loads as a separate chunk. With sound enabled, the app attempts playback at startup;
when the browser blocks autoplay, the first tap or key press enables it. Saved mute preferences are respected.

- **Four voices**, like the old consoles: two pulse waves (12.5, 25 and 50% duty), a triangle (bass, soft bells) and a noise channel
  (stamps, paper, sizzles, drums). Envelopes move in 60 Hz frames, so even the fades are stepped.
- **Level tiers** (balanced on the review sound board, `planning/sound/soundboard.html`): the **interface** is quietest (tap, select,
  back, tab, page, toggles, dialog open and close, locked); **game actions and answers** sit in the middle (correct, rising one step
  per answer in a row up to 5, wrong, the Fact and Fake stamps, every game's own action sounds, the timer tick and hurry); **celebrations**
  are the loudest and longest (start, the sunrise jingle, module complete, badge, unlock, XP tally, Truth Radar, streak, countdown,
  certificate). Celebrations are sequenced (module reward: jingle, badge, tally, unlock), never stacked.
- **Ara's voice** is a short blip per letter, pitched by mood (happy, wink, think, wow, sad; idle Ara stays quiet), so it works in any
  language. She speaks her reaction about 0.4 s after the answer sound, briefing pages and end-of-game lines; not every idle intro.
- **Music per area:** the warm morning theme `umaga` on the splash, Home, Learn, Library, Me, Daily, About and Report; the calm, drum-free
  `aral` inside lessons and Fact or Fake; the upbeat `laro` in the Arcade and games; the victory theme `panalo` on the certificate.
  After START (and the certificate fanfare) the music waits for the jingle to ring out, then comes in from its first bar.
- **Controls, like TALA:** Music (switch + volume) and Sound effects (switch + volume). Defaults: music **on at 25**, effects **on at 65**.
  The full group sits on Me under the accessibility switches (sliders are 5.7 `.px-range`, disabled while their switch is off, with a
  visible value); the splash shows the two switches beside START. Switches blip up or down; releasing the effects slider plays a tap
  at the new volume. Audio pauses while the app is in the background.
- **Every sound has a visual twin** already on screen (a stamp, a feedback card, a toast, a timer, Ara's bubble), so turning sound off
  or not hearing it never hides information. The assessment forms (Fact or Fake test sets A and B) play no feedback sound at all.
- **Rules for code:** buttons click through one app-wide listener (`data-sfx="name"` picks another sound, `data-sfx="none"` opts out
  where the screen plays its own). Canvas games ask for sounds through the shell's `cue` callback only when their state changes, never
  every frame, so their logic stays pure and silent in unit tests.
- **Files:** `src/app/sound/synth.ts` (the lazy synth: effects, Ara's voice, the four songs), `src/app/sound/index.ts` (the tiny controller
  in the main bundle: `sfx`, `araSay`, `setMusic`, `holdMusic`), `src/app/sound/prefs.ts` (saved settings), `src/app/sound/music.ts`
  (route to track), `src/app/sound/useLater.ts` (timed sounds that stop when a screen closes), `src/ui/SoundControls.tsx` (Me and splash
  controls), `src/games/engine/cues.ts` (game cue helpers and the countdown tick rule).
