# Player Name Grouping & Dedup Workflow

This doc captures the repeatable process for keeping player names consistent across the VTS Admin
datasets (Structures/Attacks, Banners, Pathers, Contributions). Run the dedup pass every few days,
or whenever OCR introduces odd readings. It is written so it can be picked up cold — by the
maintainer or by an AI agent.

> **Why this matters:** Structure performance + Contribution + Banner + Pather data are combined to
> pick the **Top-20 performers for premium gifts**. If one player's records are split across
> name variants, their totals are wrong. One canonical identity per player is the goal.

---

## 1. The single source of truth

All name resolution flows through **`findBestMatch(name)`** in
[`js/ocr-shared.js`](../js/ocr-shared.js). There is **one** authority — do not build a second
merge list for Banners/Pathers. Everything falls back to this same function and the same roster.

`findBestMatch` resolves a raw name in this order:

1. **Special pre-strip** — e.g. `UNDEAD` ring glyphs, leading Cyrillic `Н`→`H`.
2. **`getProtectedPlayerIdentity(name)`** — hard-coded identity routing for multi-account players
   (currently Kika; see §4).
3. **`aliasMap`** — exact-string map of `variant → canonical master`. This is the hand-maintained
   list the weekly dedup pass expands.
4. **Roster match** — exact, then `compactPlayerIdentity` (NFKD + strip diacritics/decoration +
   Cyrillic→Latin homoglyph fold + lowercase), then fuzzy `getSimilarity` against
   `state.rosterNames` (threshold 0.72–0.82, length-gated).
5. Falls through to the raw name unchanged if nothing matches.

Supporting helpers in the same file:
- `compactPlayerIdentity(name)` — the normalization key (diacritics/decoration removed).
- `editDistance` / `getSimilarity` / `getSimilarityAlphaNum` — fuzzy matching.
- `resolvePlayerNameForAttack(player, attackPlayers)` — wraps `findBestMatch` and additionally
  splits same-name players that appear in one attack with different demolition values (used by the
  Kika multi-account logic).

---

## 2. Weekly dedup pass (Structures/Attacks)

This is the loop that already works today.

1. **Export** the debug CSV from the dashboard. The button calls `exportDebugCsv()`
   ([`js/ocr-dashboard.js`](../js/ocr-dashboard.js)). It emits, per attacking player:
   `Attack ID, Start/End Time, Structure, Level, Raw Name, Grouped Name (Master), Demolition Value, Rank`.
   `Grouped Name (Master)` is the output of `resolvePlayerNameForAttack` → `findBestMatch`.
2. **Analyze** the CSV for names that should be one player but aren't (and vice-versa). The
   normalization + fuzzy approach used in the last audit:
   - Normalize each master name (NFKD, strip combining marks, lowercase, fold leet
     `0→o 1→l 3→e 4→a 5→s 7→t 8→b $→s @→a !→i`, strip non-alphanumeric).
   - **Exact normalized collisions** → near-certain merges (decoration/diacritic only).
   - **Edit-distance 1–2 on the normalized form** → candidate OCR typos. Verify each.
   - **Same raw name → multiple masters** → inconsistent grouping.
   - **Critical check:** before proposing a merge, look at whether each variant's *raw* spelling is
     internally **stable**. If `MalakAbo` always OCRs as `MalakAbo` and `MalakAdo` always as
     `MalakAdo` (zero cross-variation), they are **two real players**, not OCR error — do **not**
     merge. Real OCR errors flicker.
3. **Expand `aliasMap`** in [`js/ocr-shared.js`](../js/ocr-shared.js) with the confirmed merges
   (`'variant': 'Canonical Master'`). Pick the highest-frequency / cleanest variant as canonical.
   Leave intentional separations (§4) alone.
4. **Add a test** in [`tests/unit/ocr-engine.test.mjs`](../tests/unit/ocr-engine.test.mjs):
   - merges go in *"player aliases fold decoration and OCR-typo variants into one master"*.
   - intentional separations go in *"player aliases keep known separate accounts apart"*.
5. **Verify**: `npm run test:unit` (must stay green — the "keep separate" test is the guard rail).
6. **Commit & deploy**: commit `js/ocr-shared.js` + the test, rebase onto `origin/gh-pages`, push to
   `gh-pages`. (No build step needed for this file — Pages serves `js/` directly.)
7. **Note on existing data:** alias changes apply to data grouped *from now on*. They do **not**
   retroactively rewrite master names already stored in saved dashboard records. Re-process
   (re-upload/re-OCR) to re-group historical rows, or run a one-time migration (not yet built).

### Quick-start analysis script

The exact normalization + collision + fuzzy + raw-stability checks used in the June 2026 audit can
be reproduced with a short Python script over the exported CSV (columns `Raw Name`,
`Grouped Name (Master)`). Keep the "raw-stability" rule front-of-mind — it's what prevents merging
two real players.

---

## 3. Banners & Pathers — fall back to the same authority (DESIGN / TODO)

Banners and Pathers are uploaded mostly from **Viber screenshots**. Player cells are **Viber tags**,
which differ from in-game tags and carry extra noise. The directive: **do not build a separate
merger** — pre-clean the Viber noise and route through the *same* `findBestMatch` + roster, so
Banner/Pather names inherit the Structures/Attacks authority automatically.

### Current state

- Banner/Pather rows are **duty records** (`DUTY_TYPES` in [`js/ocr-roster.js`](../js/ocr-roster.js):
  `banner`, `pather`, `speed_tile`, `shield_wall`), stored under `DUTY_LIST_KEY`.
- They **already touch** `findBestMatch` via `getDutySuggestions()`
  ([`js/ocr-roster.js`](../js/ocr-roster.js) ~L657) — but only as *review suggestions*. The noisy
  Viber forms are **not pre-cleaned** before matching, so match quality is poor and many rows land
  in the manual review queue.
- There is **no debug/CSV export** for duty records (only Structures/Attacks has `exportDebugCsv`).
  This is why duty tables currently have to be copy-pasted by hand.

### Viber noise patterns to pre-clean (observed 2026-06-25)

Before calling `findBestMatch`, strip/normalize these (in roughly this order):

1. **Leading target tokens** accidentally merged into the name:
   `bridge`, `gate`, `gates`, `gate l2/l5`, `town l1/l4/lvl1`, `capital`, `Team N`, `Reserve`.
   e.g. `bridge @Roha` → `Roha`, `town lvl1 @UNDEA` → `UNDEA`, `capital @UNDEAD +` → `UNDEAD`.
2. **Viber `@` prefix**: `@Maximus` → `Maximus`, `@Juli` → `Juli`.
3. **Parenthetical operator/covering notes**: `(zubbs)`, `(osito)`, `(Teresita)`, `(bubbles)`,
   `(RedBull banner)` — strip trailing `\s*\([^)]*\)`.
4. **Trailing OCR junk**: stray `","`, `"`, `,` (e.g. `A.S.KHAN","`, `Ezeta.TV","`).
5. **`+`/reinforcement markers**: `@UNDEAD +`, `@+`.
6. **Multi-tag cells** (ambiguous — send to review, don't auto-pick):
   `@UNDEAD + @BiG BOiiE`, `gate @redull @+ Ezeta TV`.

After pre-clean, the residual still benefits from the shared `aliasMap` + roster fuzzy match,
which already handles OCR letter errors (`@UNDEA`→UNDEAD, `@redull`→redbull, `Dvd`→DvD18,
`@ANGƎL`→ANGEL).

### Open decision (BLOCKS the banner-suffix rule)

Some names carry a **"Banner" suffix**: `Kika-banner`, `Angel Banner`, `RedBull_Banner`,
`Uz banner`, `BOiiE BANNER`, `Undead_Banner`. Policy question:

- Are banner identities **separate accounts** for Top-20 purposes (like Kika's 4 accounts, where
  `꧁ Kika-banner ꧂` is already a distinct master), **or**
- Should a banner's performance **roll up** to the operating player?

This is unresolved and must be decided before writing the banner-suffix rule. Until then, treat
`*-banner` as **distinct identities** (matches the existing Kika treatment) and do not auto-merge
them to the player.

### Proposed work (not yet implemented)

1. **`cleanDutyRawName(raw)`** helper in [`js/ocr-shared.js`](../js/ocr-shared.js) implementing the
   pre-clean above, then `findBestMatch(cleaned)`. Wire it into the duty parse/confirm path so
   Banner/Pather names resolve against the shared authority by default.
2. **`exportDutyDebugCsv()`** mirroring `exportDebugCsv` but over `state.dutyRecords`
   (columns: `Date, Type, Raw Name, Cleaned Name, Grouped Name (Master), Match Status, Target,
   Time, Uploads`). Gives the same weekly dedup loop for Banners/Pathers and removes the
   copy-paste workaround.
3. Odd readings discovered this way feed the **same** `aliasMap` (one authority), per the directive.

---

## 4. Intentional separations — DO NOT MERGE

These are real distinct accounts/identities. They are protected by the
*"keep known separate accounts apart"* unit test. Adding a merge that breaks them will fail CI.

- **Kika ×4 accounts:** `꧁ Kika ꧂`, `꧁༺ Kika ༻꧂`, `꧁ Kika-banner ꧂`, `꧁Kika-banner2꧂`
  (routed by `getProtectedPlayerIdentity`).
- **`REDBULL-#`** vs **`REDBULLS`** — the `-#` is a deliberate alt-account marker.
- **`MalakAbo`** vs **`MalakAdo`** — two players (raw OCR is stable for each).
- **`~Sarafino~`** vs **`~Sarafina~`** — two players (stable raw).
- **`Dragon.Gold`** — kept literal.

---

## 5. File map

| Concern | Location |
|---|---|
| Name resolution authority | `findBestMatch`, `aliasMap`, `getProtectedPlayerIdentity` — [`js/ocr-shared.js`](../js/ocr-shared.js) |
| Normalization / fuzzy | `compactPlayerIdentity`, `editDistance`, `getSimilarity*` — [`js/ocr-shared.js`](../js/ocr-shared.js) |
| Structures debug export | `exportDebugCsv` — [`js/ocr-dashboard.js`](../js/ocr-dashboard.js) |
| Duty (banner/pather) records + suggestions | `DUTY_TYPES`, `getDutySuggestions`, `getDutyMatchStatus` — [`js/ocr-roster.js`](../js/ocr-roster.js) |
| Tests / guard rails | `tests/unit/ocr-engine.test.mjs` |
