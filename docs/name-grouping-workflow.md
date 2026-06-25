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

## 3. Banners & Pathers — fall back to the same authority (IMPLEMENTED 2026-06)

Banners and Pathers are uploaded mostly from **Viber screenshots**. Player cells are **Viber tags**,
which differ from in-game tags and carry extra noise. The directive: **do not build a separate
merger** — pre-clean the Viber noise and route through the *same* `findBestMatch` + roster, so
Banner/Pather names inherit the Structures/Attacks authority automatically.

**Decision (locked):** banner work **rolls up to the operating player**. A parenthetical operator
note wins (e.g. `Angel Banner (zubbs)` → `zubbs`); otherwise the banner's owner with the `banner`
suffix stripped is credited (`BOiiE BANNER` → `BOiiE`, `Kika-banner` → `Kika`). Note this is a
*duty-context* roll-up only — in the Structures/Attacks dataset, `꧁ Kika-banner ꧂` remains a
separate account (§4). The two contexts intentionally differ.

### Implementation

- **`cleanDutyRawName(raw)`** + **`resolveDutyPlayerName(raw)`** in
  [`js/ocr-shared.js`](../js/ocr-shared.js) — strip the Viber noise (below), extract the operating
  player, then call the shared `findBestMatch`. No separate alias list.
- Wired into **`getDutySuggestions`** and **`getDutyMatchStatus`**
  ([`js/ocr-roster.js`](../js/ocr-roster.js)) so the default confirmed name auto-resolves to the
  rolled-up canonical and clean roll-ups are not falsely flagged for review.
- **`exportDutyDebugCsv()`** ([`js/ocr-dashboard.js`](../js/ocr-dashboard.js), button
  **"CSV Duty Debug (Banner/Pather)"** in the export menu) emits per duty entry:
  `Date, Type, Upload ID, Raw Name, Cleaned Name, Grouped Name (Master), Confirmed Name,
  Match Status, Target, Group, Time`. This gives Banners/Pathers the same weekly dedup loop as §2.
- Tests pin behavior to the real Viber data
  ([`tests/unit/ocr-engine.test.mjs`](../tests/unit/ocr-engine.test.mjs)).

### Residual that still needs the shared aliasMap

Pre-clean gets to a clean token, but final canonicalization leans on roster + `aliasMap`. Names the
fuzzy match can't bridge (e.g. `Dvd`→`DvD18`, `Uz`→`!!Uzumaki!!`, `BOiiE`→`BiG BOiiE`) surface in
the duty debug CSV as `Cleaned ≠ Grouped` and should be added to the **same shared `aliasMap`**
(§1) — never a duty-only list.

### Viber noise patterns the pre-clean handles (observed 2026-06-25)

`cleanDutyRawName` strips/normalizes these (in roughly this order):

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

7. **Banner suffix** → owner player: `BOiiE BANNER` → `BOiiE`, `Kika-banner` → `Kika`,
   `Undead_Banner` → `Undead` (then matched via the shared authority).

After pre-clean, the residual leans on the shared `aliasMap` + roster fuzzy match, which handles
OCR letter errors (`@UNDEA`→UNDEAD via alias; `Dvd`→DvD18 needs an alias if the roster fuzzy match
can't bridge it — surfaced by the duty debug CSV).

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
