# Translations (Filipino, Cebuano, Ilokano, Hiligaynon)

English in the code is the source. Each language is one pack, `src/i18n/packs/<code>.json` (English sentence -> translation),
applied at runtime by `src/i18n/` (t(), a Preact render hook and the canvas text calls), so screens need no changes.
Anything missing from a pack shows in English. A language appears on the pickers as soon as its pack exists.

## Add or update a language (resumable at every step)
1. `node scripts/i18n/extract.mjs`: refresh `source.json` (all player-facing English strings).
2. Write `glossary/<code>.md` (key terms; see `glossary/fil.md`) and read `TRANSLATOR.md` (rules for every language).
3. `node scripts/i18n/batches.mjs <code>`: splits what is still untranslated into `work/<code>/in/bNNN.json` (150 lines each).
4. Translate: for each in-file, write `work/<code>/out/bNNN.json` (`{"1": "...", ...}`). Done batches are never redone,
   so an interrupted run just continues with the missing out-files.
5. `node scripts/i18n/pack.mjs <code>`: checks placeholders, swaps in translated titles left in English inside longer
   lines, merges `work/<code>/extra.json` (hand-made additions) and writes the pack. Problems: `work/<code>/report.txt`.
6. `npm run build && npx playwright test tests/e2e/i18n.spec.ts`: every pack's main screens must fit at phone, tablet and
   desktop; untranslated English seen on screen is listed in `work/<code>/missing.txt`.

After content changes, repeat 1, 3, 4 and 5: only the new or changed strings become new batches.

## Status
| Code | Language | Translated | Native review |
|---|---|---|---|
| fil | Filipino | 100% (2026-10-16, Claude Sonnet; Opus review of health lines pending) | needed |
| ceb | Cebuano | 100% (2026-10-16, Claude Sonnet; Opus review of health lines pending) | needed |
| ilo | Ilokano | 100% (2026-10-16, Claude Opus) | needed |
| hil | Hiligaynon | 100% (2026-10-16, Claude Opus) | needed |

2026-10-20: project identity (About, partners, Home banner), the how-to video captions and player, and the guide updates
were added (batches b043, b044; Claude Opus, native review needed like the rest).

Machine translation of health content must be checked by a native speaker and the health reviewer before a public launch
(see docs/CONTENT_REVIEW.md), especially numbers, ages, time spans and warnings.
