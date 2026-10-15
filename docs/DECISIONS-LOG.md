# ARAW: Build Decisions Log

Decisions made during the unattended build. One line each: `date · task · decision · why`.
Product decisions live in `docs/SPEC.md`, `docs/CONTENT_GUIDE.md` and `docs/DESIGN.md`; this log records judgement calls.

- 2026-10-15 · T00 · Press Start 2P for screen titles, buttons, nav, HUD, chips and labels (min 12px); Baloo 2 for sentence-like content headings; Nunito 18px body · D45 supersedes the older "splash only" font rule, and long titles in a pixel font hurt readability for seniors.
- 2026-10-15 · T00 · Where 12px pixel text can't fit (phone bottom tabs), fall back to Baloo 2 800 13–14px · keeps labels readable at 320px instead of shrinking pixel text.
- 2026-10-15 · T00 · Focus ring is a 3px ink outline (gold on navy backgrounds), not coral · coral on cream is below the 3:1 non-text contrast minimum.
- 2026-10-15 · T00 · Tablet (600–1023px) uses a sticky top tab bar under the header rather than a collapsible sidebar · labels always visible and simpler to make seamless.
- 2026-10-15 · T00 · Module runner, Fact or Fake rounds, games and certificate run in a focus mode without sidebar/tabs · more room for play and fewer distractions; Close always confirms and saves.
- 2026-10-15 · T00 · Module games never block progress; finishing always completes and stars (1–3) show mastery · seniors must never get stuck.
- 2026-10-15 · T00 · Badge names for M6–M10: Tulong-Tulong, Tapat na Likha, Payapang Isip, Bukas sa Lahat, Boses ng Karapatan; plus villain, Timbang na Radar, streak (3/7/30) and Buong Araw badges · blueprint only named M1–M5 badges.
- 2026-10-15 · T00 · Arcade shows the 11 endless games plus a Practice row (Fact or Fake free play, M1–M5 game replays) · satisfies D6 replay without reskinning Fact or Fake as an arcade game.
- 2026-10-15 · T00 · Daily Challenge lets players try a locked module game as a "trial run" without unlocking it · the daily must rotate all 11 games for everyone.
- 2026-10-15 · T00 · Fact or Fake treats "fake" as the signal; log-linear correction for 0/100% rates; Truth Radar balanced zone |c| ≤ 0.25, badge needs ≥10 items and d′ ≥ 1.5 · standard signal-detection practice with safe edge cases.
- 2026-10-15 · T00 · Phase 1 Fact or Fake answers are binary everywhere (no "missing context" option yet) · simpler, consistent with the test forms.
- 2026-10-15 · T00 · Arcade run XP = 10 base + 20 good run + 20 new best (max 50); Daily bonus 30 · blueprint had no arcade XP; caps grinding and stays game-agnostic.
- 2026-10-15 · T00 · Every item card carries a small "ARAW GAME" watermark before reveal; FAKE stamp on reveal · prevents screenshots of unrevealed fakes circulating as real without giving away the answer.
- 2026-10-15 · T00 · Scam scripts and art use generic "e-wallet", "the feed", "the GC" and masked numbers, never real platform or wallet brands · fictional-brands rule.
- 2026-10-15 · T00 · Games default to a 320x240 (4:3) logical resolution; decision-heavy games may render pixel-styled DOM inside the GameShell, action games use canvas · 4:3 fits portrait phones and desktop letterboxing; DOM keeps text games accessible.
- 2026-10-15 · T00 · Streak freeze applies automatically when exactly one day is missed and that Manila week's freeze is unused · forgiving streaks without extra UI.
- 2026-10-15 · T00 · Ara sprite gets a skin-shade (#C98A62) and navy-shade (#283276) colour beyond the core tokens · needed for pixel shading; sprite-only literals.
- 2026-10-15 · T00 · Commit message uses the task title "T00: Write product spec, content guide and 8-bit design system" · CLAUDE.md requires "<TASK-ID>: <title>".
- 2026-10-15 · T00 · No `npm run verify` this task · package.json does not exist yet (scaffold is T01).
