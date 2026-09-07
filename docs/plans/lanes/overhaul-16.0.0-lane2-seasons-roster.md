# 16.0.0 Lane 2 — Seasons & Roster (commit-1 re-apply + X10/X12 landing chain)

> **Historical record — v16 roster/research lane.** Reviewed for documentation routing on 2026-09-05.
> X10/X12 catalog support landed. Recheck current roster and research selectors, especially the later X12 fixes, before applying any paste block or allowlist change.
> Original content below is retained as dated evidence, not current release instructions.

**Current starting points:** [js/heroes-data.js](../../../js/heroes-data.js) · [tests/unit/research-season-defaults.test.mjs](../../../tests/unit/research-season-defaults.test.mjs) · [Documentation index](../../README.md).


Status: proposal (rev 2, 2026-09-02) — T0 review of rev 1 accepted; revisions R1-R4 applied
(exact cap strings; file-vs-deploy staging rule; visible-pane reveal check; the two
`state.js` list edits spelled out, TECH_SEASON_ORDER landing with the tech-db import).
Author: Lane 2 (Seasons & Roster).
Parent plan: `docs/plans/overhaul-16.0.0.md` (commit spine #1, §0.7 roster landing chain).
Source package: `docs/sources/x10-x12/` (HERO-DATA.md, x12-research.json, x12-research-nodes.md).
Mode: proposal-only — this file is the lane's only output; no code changes.

---

## 1. Scope & goal

Land the X10/X12 season scaffolding and then the transcribed X10/X12 roster, test-gated,
in an order where every intermediate commit keeps the suite green. Two independent
deliverables:

- **D1 — Season scaffolding (commit-1 re-apply).** The Opus session built this and it was
  tested (1302 +6 tests) but it is committed nowhere. Re-apply it from the spec, not from
  thin air. No data dependency; lands even if the roster is later delayed.
- **D2 — Roster landing chain (the 6-step chain).** The 11 transcribed heroes (9 free + 2
  paid), split-staged: free 9 first, Al-Hawra + Achilles held until authored tower profiles
  exist (decision D5).
- **D3 — X12 research import** into `js/tech-db.js` from `x12-research.json` (this lane
  owns tech-db.js; Lane 3 owns the provenance *subsystem*, not this import).

Both D1 and D3 are independent of owner input. D2's heroes-info step is blocked-on-owner
(`placement` / `minCopies`); everything else in D2 is executable today.

### 1.1 Verification results that correct the sources (read first)

These were re-verified against the repo on 2026-09-02 and **differ from the written docs**:

| # | Doc claim | Verified reality | Consequence |
|---|---|---|---|
| V1 | HERO-DATA.md §1: "Already shipped in js/state.js: HERO_ATLAS_ALL_SEASONS ends X8,X10,X12 and TECH_SEASON_ORDER ends X8,X12" | `js/state.js:156-158`: both lists end `'...X1','X2','X8']`. No X10/X12 anywhere. No `POPULATED_HERO_SEASONS`, no `revealPopulatedSeasonPills`, no `season-scaffold.test.mjs` in the repo (rg over js/, tests/, index.html). | The entire scaffolding is to be re-applied. Master plan commit 1 is authoritative, not HERO-DATA §1 — T0 has since added a correction banner to HERO-DATA.md marking both sandbox-only "already shipped" claims false. |
| V2 | HERO-DATA.md §8: "No new i18n keys are required — seasonX10/seasonX12 already ship in all 12 locale files" | `seasonX10`/`seasonX12` appear **nowhere** in `js/i18n/*` (only in the two plan docs). Only `season0..season4, seasonX1, seasonX2, seasonX8` exist, in all 12 full packs. `hr.js` is a stub (no season keys at all). | The keys MUST be added (×12 full packs, skip hr per "stub by design"). Commit-1 spec wins. |
| V3 | Plan §0.7: "local line 939; gh-pages 1053/2189" | This branch = gh-pages base: exact strings `values.size() <= 78` at `firestore.rules:1053` (inside `validAllStarBoHUsableHeroNames`) **and** `stats.usableHeroNames.size() <= 78` at `firestore.rules:2189` (profile validator). Allowlist = exactly 78 names, ends `'Ragnar', 'Cyrus'`. | Both exact strings must grow — grep BOTH patterns, not "the caps"; the 2189 one is easy to miss. |
| V4 | Plan corrections log: file count 669/704 | Not re-measured in this lane (Lane 1 owns the gate). | This lane adds one JS file edit to `state.js`/`constants.js` only — no new routes, no eager CSS. |
| V5 | HERO-DATA §8: FUTURE_HEROES "currently 38 entries" | `tests/unit/hero-season-scope.test.mjs:21-60` has 38 entries; the 10 names to remove are all present; `Pepin` confirmed absent. | Removal list is exactly the 10 names from §8. |
| V6 | Plan says "season-scaffold.test.mjs — invert the two X10/X12 emptiness tests" | No such file exists yet; the inversions are edits to the file D1 creates. | The two emptiness tests are born-empty and inverted when the roster lands. |

---

## 2. Ordered work items (file-by-file)

All paths relative to repo root, branch `codex/overhaul-16-0-0`. Each step is a
self-contained commit candidate in the spine; "A#" marks the test that gates it.

### Stage 1 — D1: season scaffolding (no roster data)

**1.1 `js/state.js`** — the two list edits, spelled out exactly (R4):
- `HERO_ATLAS_ALL_SEASONS` (line 158): append **both** `'X10'` and `'X12'` →
  `['S0','S1','S2','S3','S4','X1','X2','X8','X10','X12']` (canonical order **includes
  empty seasons**).
- `TECH_SEASON_ORDER` (line 156): append **`'X12'` only** →
  `['S0','S1','S2','S3','S4','X1','X2','X8','X12']`. **No X10** — X10 has no research tree
  (HERO-DATA §7); `app-research.js` renders tabs from this list (lines 608, 731).
  **This edit lands in Stage 4, in the same commit as the tech-db import (§4.2)** — the
  X12 research tab and its trees must appear together, never an empty tab. Do not apply
  it in Stage 1.
- Add the derived list next to the two above:
  ```js
  export const POPULATED_HERO_SEASONS = HERO_ATLAS_ALL_SEASONS.filter((season) =>
    allHeroesData.some((hero) => hero.season === season)
  );
  ```
  `state.js` already imports `allHeroesData` (line 3). This is the *only* new symbol;
  everything else in this stage consumes it. (A1, A4)

**1.2 `js/constants.js`**
- `seasonColors` (line 14): add `X10: '#f472b6', X12: '#a3e635'`.
- `TechseasonColors` (line 19): add the same two entries.
- These are the only color consumers (pills via `--sc` inline var in
  `app-hero-atlas.js:1115`, rank tags at `:1147`, generator pills). (A3)

**1.3 `js/app-hero-atlas.js` — pills + "All" math on the *populated* list**
- Season pill row render (lines 1108-1118): iterate `POPULATED_HERO_SEASONS` instead of
  `HERO_ATLAS_ALL_SEASONS` (pills only exist for seasons that have heroes).
- "All" affordance math — replace both `HERO_ATLAS_ALL_SEASONS.length` comparisons with
  `POPULATED_HERO_SEASONS.length`:
  - line 539: `allSeasonsSelected = normalized.length === HERO_ATLAS_ALL_SEASONS.length`
  - line 1106: same expression in the ranking view
- Keep canonical list for: `HERO_SEASON_INDEX` (line 223), default `_heroesTabState.seasons`
  (line 324), URL-param whitelist (line 386), URL serialization (lines 424, 444), and the
  offered-set normalization (lines 545, 552-553, 630). Rationale: the *offered set* stays
  canonical (state math is index-based and must not shift), only the *visible pills* and
  the *all-selected sentinel* become populated-aware. Empty seasons can then never break
  the "All" button. (A4)
- No change to `getSeasonIndex`/`HERO_SEASON_INDEX`: appending keeps S0..X8 at indexes
  0-7; X10=8, X12=9. `getMaxSelectedSeasonIndex` (app-generator.js:79) stays cumulative by
  construction.

**1.4 `js/app.js` — `revealPopulatedSeasonPills()`**
- Add a small module-level function (near `wireFilterSets`, line 573):
  ```js
  function revealPopulatedSeasonPills() {
    const populated = new Set(POPULATED_HERO_SEASONS);
    for (const container of [seasonFiltersEl, genSeasonFiltersEl]) {
      if (!container) continue;
      container.querySelectorAll('label.filter-pill[data-season]').forEach((pill) => {
        pill.classList.toggle('hidden', !populated.has(pill.dataset.season));
      });
    }
  }
  ```
- Call it inside `wireFilterSets()` (before the first `wireFilterControls`), so both the
  atlas/manual strip (`#seasonFilters`) and the generator strip (`#generatorSeasonFilters`)
  are unhidden on init. `wireFilterSets` runs once at boot (app.js:901); the call is
  idempotent — safe to re-run.
- Import `POPULATED_HERO_SEASONS` in app.js's existing `./state.js` import block (it
  already imports `HERO_ATLAS_ALL_SEASONS`, line 70). (A5)

**1.5 `index.html` — hidden X10/X12 pills in both strips**
- In `#seasonFilters` (after the X8 pill, line 782-784) add:
  ```html
  <label class="filter-pill x10-pill hidden" data-season="X10"
    ><input type="checkbox" value="X10" /><span data-i18n="seasonX10">X10</span></label
  >
  <label class="filter-pill x12-pill hidden" data-season="X12"
    ><input type="checkbox" value="X12" /><span data-i18n="seasonX12">X12</span></label
  >
  ```
- Identical pair inside `#generatorSeasonFilters` (after line 980-981, unchecked to match
  X8's generator default).
- `.hidden` is the existing global utility class (used e.g. by `seasonCatchupHint`,
  app.js:523). No new CSS — Lane 1's route-CSS budget is not touched. (A5)

**1.6 i18n keys — `js/i18n/{ar,de,en,es,fr,id,it,kr,pt,ru,tr,zh}.js`**
- Add `seasonX10: 'X10',` and `seasonX12: 'X12',` right after the `seasonX8` line in each
  of the 12 full packs. Values are season codes — untranslated, same as all existing
  season keys (en.js:950-957 pattern).
- **Do not touch `hr.js`** — hr is the stub pack; `check-i18n.mjs` + the translations
  loader fill specialist terminology from canonical English (verified: hr.js has no
  season keys today). (A6, gate: `npm run i18n:check`)

**1.7 NEW `tests/unit/season-scaffold.test.mjs`** — six assertions:
1. `HERO_ATLAS_ALL_SEASONS` ends `'X8','X10','X12'` and starts with the existing S0 prefix
   (canonical order intact, indexes 0-7 unchanged for existing seasons).
2. `TECH_SEASON_ORDER` ends `'X12'` and contains **no** `'X10'` — **assertion introduced
   in Stage 4** (same commit as the `TECH_SEASON_ORDER` edit + tech-db import, §4.2);
   until then it is absent from the file so Stage 1 stays green.
3. `seasonColors.X10 === '#f472b6'`, `seasonColors.X12 === '#a3e635'`, and the same two in
   `TechseasonColors`.
4. `POPULATED_HERO_SEASONS` ⊆ `HERO_ATLAS_ALL_SEASONS`, order-preserving, and initially
   equals the canonical list **minus** X10/X12 → **[invert in Stage 2]** "X10 and X12 carry
   no heroes yet".
5. All-Selected math: `POPULATED_HERO_SEASONS.length === 8` and every season in
   `HERO_ATLAS_ALL_SEASONS \ POPULATED_HERO_SEASONS` has zero heroes in `allHeroesData` →
   **[invert in Stage 2]** "the X10/X12 roster is still gated". (These two are the
   emptiness tests from the commit-1 spec.)
6. i18n guard: `seasonX10`/`seasonX12` exist in the 12 full packs (import
   `js/translations.js` and assert both keys for every language in `availableLanguages`
   minus `hr`), matching the existing season-key coverage.

**Stage 1 acceptance:** `npm run test:unit`, `npm run i18n:check`, `npm run lint`, and a
**10-second live-browser reveal check** (owed from the commit-1 spec): load index.html
**in a visible browser pane** (rAF never fires in a hidden pane — this artifact class
already produced two audit false positives), open the generator panel, assert the X10/X12
pills are still hidden and all existing pills visible. Probe rule: never assert on rAF or
`details[open]`-dependent reveal inside a hidden pane — unhide the pane first (plan §B
method notes).

### Stage 2 — D2a: land the 9 free heroes (test-gated chain)

Order matters; the suite must be green after every step. Recommended commit grouping:
2.1-2.2 together (data + rules must change atomically or `all-star-boh-security.test.mjs`
fails), then 2.3-2.4, then 2.5.

**2.1 `js/heroes-data.js` — paste §2 block (free 9 only)**
- Add a comma after the `Cyrus` entry (line 80), append before `];`:
  ```js
  // X10 — intermediate bracket, no research, two heroes drawn from the X12 list.
  { name: "Healer", season: 'X10', Type:'Footmen', State:'Free' },
  { name: "Hellfire", season: 'X10', Type:'All', State:'Free' },
  // X12 — full seasonal recruitment wave.
  { name: "Belisarius", season: 'X12', Type:'Archers', State:'Free' },
  { name: "Pepin", season: 'X12', Type:'Footmen', State:'Free' },
  { name: "El Cid", season: 'X12', Type:'Cavalry', State:'Free' },
  { name: "Arslan", season: 'X12', Type:'Footmen', State:'Free' },
  { name: "Farah", season: 'X12', Type:'Cavalry', State:'Free' },
  { name: "Poison Master", season: 'X12', Type:'Archers', State:'Free' },
  { name: "Lilith", season: 'X12', Type:'Archers', State:'Free' },
  ```
- No `imageUrl` (placeholder fallback, `state.js:287-290` — HERO-DATA §5 option 2).
- No `releaseSeason` for now: §2 is the parse-validated block. Optional follow-up (safe,
  still no-guess): add the 4 legible badges — `Pepin: 'X12'`, `El Cid: 'X12'`,
  `Lilith: 'X09'` — per §2's badge table; `X09` is outside `HERO_ATLAS_ALL_SEASONS` and
  `getSeasonIndex` returns -1, which existing code already handles (X8 wave precedent).
  `Al-Hawra` badge stays off (ambiguous — do not use). Note: all 11 records are pasted
  with no releaseSeason; badges may be added only from the legible list.
- Do NOT paste Al-Hawra/Achilles in this stage. (A7, A8)

**2.2 `firestore.rules` — allowlist + BOTH caps grow 78 → 87**
- In `validAllStarBoHUsableHeroNames()` (lines 1051-1079): append the 9 new names to the
  `hasOnly([...])` list **in exactly the order they appear in `allHeroesData`** (after
  `'Cyrus'`): `'Healer', 'Hellfire', 'Belisarius', 'Pepin', 'El Cid', 'Arslan', 'Farah',
  'Poison Master', 'Lilith'`.
- Exact cap strings (R1) — grep both patterns; they are the only two `<= 78` occurrences
  in the file:
  - `values.size() <= 78` (line 1053, inside `validAllStarBoHUsableHeroNames`) → `<= 87`
  - `stats.usableHeroNames.size() <= 78` (line 2189, profile validator) → `<= 87`
- The test parses the function block with a regex (all-star-boh-security.test.mjs:1081-1086)
  and `assert.deepEqual`s against `allHeroesData.map(({name}) => name)` — **order is a
  hard constraint** (V3).
- **File state vs production deploy (R2):** the in-repo allowlist grows 78 → 87 in this
  same commit as 2.1 — the deepEqual test must pass at **every branch commit**, and the
  file must always match the shipped roster. The "deploy once at 89" rule (§5.4) concerns
  only the production Firebase deploy (`firebase deploy --only firestore:rules`), never
  the file's intermediate states; a PR merge ships no rules (AGENTS.md external-deploys
  policy). (A9)

**2.3 `tests/unit/all-star-boh-security.test.mjs` — canonical counts**
- Line 1079: `assert.equal(canonicalHeroes.length, 78)` → `87`.
- Line 1093: `/values\.size\(\) <= 78/` → `/values\.size\(\) <= 87/`.
- The deepEqual at 1086 passes automatically once 2.1+2.2 land in the same order. (A9)

**2.4 `tests/unit/hero-season-scope.test.mjs` — FUTURE_HEROES removals (8 names)**
- Remove from `FUTURE_HEROES` only what actually lands now: `'Healer'`, `'Hellfire'`,
  `'Belisarius'`, `'El Cid'`, `'Arslan'`, `'Farah'`, `'Poison Master'`, `'Lilith'`.
- Keep `'Achilles'` and `'Al-Hawra'` in `FUTURE_HEROES` until Stage 3 (the guard asserts
  no FUTURE name is in the active roster — a prematurely removed name would silently
  weaken the guard). `Pepin` was never listed. The X8 catch-up expectations
  (lines 6-19, 62-76) are untouched. (A7)

**2.5 `tests/unit/season-scaffold.test.mjs` — invert the two emptiness tests**
- Test 4 becomes: `POPULATED_HERO_SEASONS` now includes `'X10'` and `'X12'` (both populated
  by Stage 2: X10 has 2 heroes, X12 has 7).
- Test 5 becomes: `POPULATED_HERO_SEASONS.length === 10` and the All-selected sentinel
  math equals 10. (A4)

**Stage 2 acceptance:** `npm run test:unit`, `npm run i18n:check`, `npm run lint`. Live
browser check: the X10/X12 pills are now visible in both filter strips; checking X10 and
"All" together lights the All button (populated math); hero atlas pills include X10/X12
with the new colors; `?season=X10` URL param filters to the two X10 heroes.

### Stage 3 — D2b: the 2 paid heroes (blocked on D5 tower profiles)

**3.1 `js/specialization-hero-paths.js` — author two profiles (owner + judgement model,**
**never guessed)**
- Add to `PAID_HERO_TOWER_PROFILES`:
  - `"Al-Hawra"`: `troop: 'archer'` (roster Type `'Archers'`), `siegeBias` in [-1,1],
    `demand` keyed by `TOWER_SUPPLY_TAGS` (might/baseMight/hp/resistance/speed/countering/
    skillDamage/physicalDamage/healing/defense), `columns` keyed by real Legion Skill
    column ids for archer, `research` keyed by real `SPECIALIZATION_RESEARCH` ids,
    `keyMechanics` non-empty (e.g. All-Ability buff, Phantom, below-50% execute — read
    from HERO-DATA §3, written in the hero's own skill terms), `note` > 60 chars quoting
    the mechanic.
  - `"Achilles"`: `troop: 'footman'`, same shape, mechanics from his skill text (Demigod,
    round-5/6 vulnerability, Sacred Realm, 500% recovery).
- Pattern reference: existing profiles (e.g. `Ramses II` archer, `King Arthur` footman).
  These drive real recommendations — this is decision D5, explicitly owner/judgement work.
- No new `HERO_PATH_PRESETS` entries are required (the existing tests only require that
  preset-referenced heroes exist in the catalog); verify `paidHeroesForTroop('archer')`
  and `('footman')` still pass the ≥4 and Cleopatra-last assertions (specialization-hero-
  paths.test.mjs:102-109). (A10)

**3.2 `js/heroes-data.js`** — append the two paid records (after Lilith, same paste
style, no imageUrl, no releaseSeason except `Achilles: 'SP'` which is legible and
optional-safe).

**3.3 `firestore.rules`** — allowlist + both exact cap strings 87 → 89:
`values.size() <= 87` → `<= 89` (line 1053) and `stats.usableHeroNames.size() <= 87` →
`<= 89` (line 2189), plus `'Al-Hawra'`, `'Achilles'` appended in roster order. **This is
the state to deploy rules at** (`firebase deploy --only firestore:rules`) — one deploy,
after expression-budget measurement (§5.1).

**3.4 `tests/unit/all-star-boh-security.test.mjs`** — 87 → 89 in both assertions.

**3.5 `tests/unit/hero-season-scope.test.mjs`** — remove `'Achilles'`, `'Al-Hawra'` from
`FUTURE_HEROES` (FUTURE_HEROES is now the 28-name residue for later seasons).

**3.6 `js/heroes-info.js` — skills (blocked-on-owner)**
- Paste §3 blocks for all 11 heroes **only once `placement` and `minCopies` are filled**
  from the game. Until then this step stays open; `maxCopies: 34` is already confirmed.
- Do not invent placements. The heroes render fine without `heroesExtendedData` entries
  (atlas detail falls back; verify no crash path before shipping Stage 2 — see §6 Q4).

### Stage 4 — D3: X12 research import into `js/tech-db.js`

**4.1 Shape check.** `x12-research.json` = array of 2 trees:
`{ id, name, season:'X12', medalType:'WB', gameId, image, note, sourceNote, totalCp,
subs: [...] }`. Each sub: `{ o, n, t[], u[], a, mc, lv, costs[WB/level], total, buildData
[{level, cp, bonus, bonus_value, cm, wb}], gameNodeId, position:'row;col',
relation:'row;col' }`. Verified: buildData carries **cm/wb/cp only** (no gold/time in
this slice); `costs` == wb arrays.

**4.2 Append two trees to `techDatabase` (29 → 31 trees), following the X8 Lofty Legion
pattern (id `19ae0569`, `season:'X8'`, `unlockCondition:'Start of Eden X8'`, lines
1197-1248):**
- Tree 1: `id: '9c5d4006'` (keep source id or map to a local hash — use the source id,
  documented in a comment), `name: 'Melee Legion - Defense'`, `season: 'X12'`,
  `unlockCondition: 'Start of Eden X12'`, `primaryResource: 'War Badges'`,
  `default_pos`, `layoutMode: 'game'`.
- Tree 2: `id: 'b57d6bf9'`, `name: 'Melee Legion - Charge'`, same metadata.
- Node mapping per sub (following the `{ id, page, row, col, name, troop, buff, maxLevel,
  costType, wisdomCosts }` shape):
  - `id`: `node_${o}` (page-scoped like the X8 tree) or `node_${o}_${treeIndex}` —
    must be unique across the tree; keep it deterministic and stable.
  - `row`/`col`: parse `position` (`'1;2'` → row 1, col 2).
  - `name`: `n`; `troop`: join `t` with `, ` or `'ALL'` for all three; `buff`: `a`;
    `maxLevel`: `lv`; `costType`: `'War Badge'`; `wisdomCosts`: `costs` array (WB).
  - Prerequisite `relation` (`'2;2'`) is position-based; the X8 game layout doesn't model
    prerequisites — carry it as a code comment per node or a `requires` field only if the
    research renderer consumes one (check `app-research.js`; do not add dead fields).
  - `buildData`/`totalCp`/`gameNodeId` are NOT part of the `techDatabase` node schema —
    retain them in `docs/sources/x10-x12/` as the provenance source (Lane 3's full
    provenance subsystem owns richer metadata; this import mirrors the existing shape
    only).
- **Strip `image` (wixstatic) everywhere — text and numbers only** (HERO-DATA §5).
- Provenance comment above each tree: source (`sourceNote`: Defense = "Merged: client
  CP/levels + community costs/names", Charge = "Game client (CP) + Community (costs)"),
  credit (Raven G, Ash Roe (709) for Defense — from x12-research-nodes.md), capture date
  2026-09-02, game-version scope X12, `verificationStatus: 'community'`-style note that
  costs are community-sourced. This matches plan A1's "nothing renders without source"
  rule in spirit until the full provenance schema lands in Lane 3.
- Both trees are WB (`costType: 'War Badge'`) — consistent with the research UI's
  existing cost types; no UI change expected.
- **`js/state.js` `TECH_SEASON_ORDER`** (line 156): append `'X12'` in this same commit
  (R4) — the research UI's season tab (`app-research.js:608,731`) and the two trees land
  together, so the X12 tab never renders empty. Add scaffold-test assertion 2 (§1.7) in
  this commit as well. (A11)

**4.3 Test gate.** `tests/unit/tech-db...` — check what tech-db tests exist (there is a
29-tree count assertion in all-star-boh-security.test.mjs:1097 `canonicalResearchIds
.length === 29` and the firestore research allowlist). Adding 2 trees:
- Update `all-star-boh-security.test.mjs` 29 → 31 **only if** the new tree ids enter the
  `validAllStarBohResearchProgress` allowlist — they do NOT by default: that allowlist is
  for BoH research progress tracking, and X12 trees are not BoH-tracked. Verify before
  touching; if the allowlist is deliberately frozen to BoH-relevant trees, leave it and
  instead add a `tech-db`-scoped test asserting the two X12 trees exist, season is `'X12'`,
  node counts 29/30, and WB totals 4,998,500 / 4,763,500 (cross-checked against
  x12-research-nodes.md). (A11)
- `TECH_SEASON_ORDER` gains `'X12'` in this same stage (§4.2), so the research UI's new
  season tab and its trees appear together; no other UI change is required.

**4.4 Out of scope, note for later:** the wider dataset carries X15/X18/X20/X22/X24 with
the same shape — free once an importer exists (Lane 3 A1 pipeline). This lane hand-writes
the two X12 trees only; do not build the importer here.

---

## 3. Interfaces with other lanes

- **Lane 1 (gate & theme):** no file overlap. This lane adds zero eager CSS/JS (only edits
  existing JS, adds hidden HTML pills + i18n keys). If Lane 1 lands the token-authority
  commit first (as the spine dictates), this lane rebases on it — no conflicts expected
  (different files).
- **Lane 3 (codex data / provenance):** `js/tech-db.js` and `docs/sources/x10-x12/` are
  shared. Stage 4 keeps `tech-db.js` in its existing shape and leaves rich metadata in the
  source package so Lane 3's `js/codex-provenance.js` can adopt it later without a data
  re-edit. Lane 3 must NOT re-import X12 research (ownership: this lane).
- **Lane 4 (hero UI):** consumes `allHeroesData` + `heroesExtendedData`. The skills drawer
  depends on Stage 3.6 (blocked-on-owner). Lane 4 should build against the 9 free heroes +
  placeholder rendering and treat Al-Hawra/Achilles skills as absent until 3.6 lands.
  Hero-table Free/Paid split reads `State` — the 9 free are immediately visible in Lane
  4's Free table.
- **Lane 5 (planners/release):** release metadata is not this lane's business, but Stage 2
  adds public roster content that a release note should mention; the version bump stays
  with Lane 5/spine commit 13.
- **Roster landing chain coupling:** this lane owns steps 1-6 of §0.7. The
  `firestore.rules` deploy is an external deploy per AGENTS.md (Firebase files changed) —
  flag it in the PR description so the owner runs it; CI cannot deploy rules.

---

## 4. Tests to add or update (summary table)

| Test file | Change | Stage |
|---|---|---|
| `tests/unit/season-scaffold.test.mjs` | NEW — 6 assertions; 5 land in Stage 1, assertion 2 (TECH_SEASON_ORDER ends X12) lands in Stage 4 with the import; the two emptiness assertions inverted in Stage 2 | 1, 2.5, 4.2 |
| `tests/unit/hero-season-scope.test.mjs` | Remove 8 FUTURE_HEROES (Stage 2), 2 more (Stage 3); X8 expectations untouched | 2.4, 3.5 |
| `tests/unit/all-star-boh-security.test.mjs` | 78 → 87 → 89 in `canonicalHeroes.length` (1079) and `/values\.size\(\) <= N/` (1093); **add** a `/stats\.usableHeroNames\.size\(\) <= N/` regex for the line-2189 cap; deepEqual self-verifies via order and must pass at every branch commit | 2.3, 3.4 |
| `tests/unit/all-star-boh-security.test.mjs` | 29-tree count — leave unchanged unless X12 ids enter the BoH allowlist (verify); add tech-db-scoped X12 assertions instead | 4.3 |
| `tests/unit/specialization-hero-paths.test.mjs` | No edits required; Stage 3.1 must keep all 6 tests green (profile coverage, troop match, tag/column/research validity, Cleopatra-last ordering) | 3.1 |
| NEW tech-db X12 test (name TBD, e.g. `tests/unit/tech-db-x12.test.mjs`) | Two X12 trees exist with season `'X12'`, 29/30 nodes, WB totals 4,998,500 / 4,763,500, no wixstatic URLs in the file | 4.3 |

Baseline expectations per source docs: `npm run test:unit` ≈ 1303 + additions; `npm run
i18n:check` must stay green; `npm run lint` / `format:check` on touched files.

---

## 5. Risk notes

**5.1 Firestore rules expression budget (highest risk).** `firestore.rules:20` records
that the file already hit Firestore's 1000-expressions-per-request limit once. Adding 9-11
list literals to the `hasOnly` block grows the expression count of every request that
evaluates this function. Mitigation: (a) land the rules file change only once, at the
final roster state (89), not at 87; (b) measure the budget before deploy — the project
has an established measurement step (see plan §0.7 step 2, "measure the budget before
deploying"); (c) the deploy is manual and separate; the PR merge ships no rules, so a
staged rules file is inert until deployed; (d) a regression returns 403s across BoH
signup — treat as P0.

**5.2 deepEqual order.** The rules allowlist must equal `allHeroesData` name order exactly
(test 1086). The paste order is fixed by HERO-DATA §2; the allowlist edit must append the
same names in the same sequence or the test fails loudly — which is the safety net, not a
risk to users, but it means 2.1 and 2.2 are one atomic commit.

**5.3 The two caps (R1).** The exact strings are `values.size() <= 78` (line 1053) and
`stats.usableHeroNames.size() <= 78` (line 2189) — implementers grep BOTH patterns; there
are no other `<= 78` occurrences in the file. Missing line 2189 leaves the profile
validator rejecting the new names silently in staging — the unit test only regexes the
function block, not line 2189. Add an explicit regex assertion for
`stats\.usableHeroNames\.size\(\) <= N` in the security test (or scaffold test) so the
second cap can never drift.

**5.4 Staging split state (R2).** The in-repo `firestore.rules` file grows 78 → 87 → 89
in the same commits as the roster stages — every branch commit keeps the deepEqual test
green and the file always matches the shipped roster. "Deploy once at 89" is a
**production-deploy-only** rule: the Firebase deploy happens once, immediately after the
Stage 3 PR merge; until then the intermediate file states exist only on the branch and
are never deployed. Never deploy rules at a number that doesn't match the app currently
on gh-pages (and vice versa). The 2 paid heroes remain in FUTURE_HEROES until Stage 3.

**5.5 Empty-season UX regressions.** If the pills render from the canonical list anywhere
else (there are three other consumers: generator strips, atlas pills, URL params), X10/X12
appear clickable-but-empty. The Stage 1 acceptance live-check covers both strips; re-check
after Stage 2. Watch the generator's "X8 unchecked by default" convention — X10/X12
generator pills are also unchecked by default (matches cumulative-selection semantics:
an X8 player shouldn't suddenly include X12 heroes).

**5.6 Hidden-pane artifact.** `revealPopulatedSeasonPills` must run while the strips exist
in the DOM — index.html renders both strips statically, so a boot-time call is safe; do
not move it behind a tab-open hook (rAF/DOM-visibility trap from the audit method notes).

**5.7 No imageUrl.** Atlas rank rows render `hero.imageUrl` directly with a
`data-fallback-src` (app-hero-atlas.js:1161); detail views use `getHeroImageUrl` (state.js
fallback). Verify the rank-row fallback fires for the 9 free heroes; if the fallback
handler is wired to `images/logo.png` it is fine (records ship placeholder-only per
HERO-DATA §5 option 2).

**5.8 Tech-db consumers.** The research UI (`app-research.js`) renders
`TECH_SEASON_ORDER`; the `'X12'` edit therefore lands in Stage 4 with the tech-db import
(§4.2) so no empty X12 tab ever renders. Confirm no other consumer keys off the
techDatabase count (29) — grep before Stage 4.

---

## 6. Open questions (owner / orchestrator)

1. **Q1 — Rules deploy timing (re 5.4):** confirm the policy "deploy `firestore:rules`
   once at Stage 3 (89), after that PR merges" — or does the owner prefer 87 deployed at
   Stage 2 with a second deploy at Stage 3? The expression-budget measurement should run
   at 89 regardless.
2. **Q2 — X12 tree ids:** keep the source `gameId`-style ids (`9c5d4006`/`b57d6bf9`) as
   techDatabase ids, or mint local ids in the existing 8-hex pattern and cite the source
   ids in comments? Leaning: keep source ids + comment (traceability, and Lane 3 can map
   to `gameId` 20005005/20005019 later).
3. **Q3 — releaseSeason for the 4 legible badges:** add `Pepin X12 / El Cid X12 /
   Lilith X09 / Achilles SP` now (safe, handled by `getSeasonIndex → -1`), or keep the
   paste block verbatim and skip badges until the owner re-confirms? Leaning: add them
   (they are legible in the source), with Al-Hawra explicitly left off.
4. **Q4 — heroes-info gap handling:** confirm the atlas detail view renders gracefully
   for heroes absent from `heroesExtendedData` before Stage 2 merges (Lane 4 may already
   know; if it doesn't, the verification belongs to this lane's Stage 2 acceptance).
5. **Q5 — D5 authorship:** who authors the two tower profiles — owner + sighted model, or
   does the orchestrator assign a judgement model against HERO-DATA §3? This lane does
   not author them.
6. **Q6 — Stage 4 node `id` scheme:** `node_${o}` per tree is unique within a tree (o is
   1..30) but collides across trees — the existing db scopes node ids per tree, so
   `node_1`/`node_2`... within each tree is the established convention. Confirm no global
   uniqueness requirement exists before using it.

---

## 7. Execution checklist (this lane, in order)

- [ ] Stage 1: state.js `HERO_ATLAS_ALL_SEASONS` += X10, X12 + `POPULATED_HERO_SEASONS`
      (1.1) — `TECH_SEASON_ORDER` untouched until Stage 4
- [ ] Stage 1: constants.js both color maps (1.2)
- [ ] Stage 1: app-hero-atlas.js populated pills + All math (1.3)
- [ ] Stage 1: app.js revealPopulatedSeasonPills + wiring (1.4)
- [ ] Stage 1: index.html hidden pills ×2 strips (1.5)
- [ ] Stage 1: i18n seasonX10/seasonX12 ×12 packs, skip hr (1.6)
- [ ] Stage 1: season-scaffold.test.mjs new — 5 assertions (assertion 2 deferred to
      Stage 4) (1.7)
- [ ] Stage 1 gates: test:unit, i18n:check, lint, live-browser reveal check **in a
      visible browser pane** (rAF never fires in a hidden pane — same artifact class as
      the audit false positives)
- [ ] Stage 2: heroes-data free-9 paste + firestore.rules 87 (atomic, 2.1+2.2)
- [ ] Stage 2: security test 87s + FUTURE_HEROES −8 + scaffolding inversions (2.3-2.5) —
      deepEqual rules test green at every commit
- [ ] Stage 2 gates: test:unit, i18n:check, lint, live-browser pill/URL check
- [ ] Stage 3: D5 tower profiles authored (owner, Q5) → paid-2 paste, both cap strings
      89, tests 89 incl. line-2189 regex (3.1-3.5)
- [ ] Stage 3: expression-budget measurement at 89 → single rules deploy after PR merge
      (Q1)
- [ ] Stage 3.6: heroes-info skills once placement/minCopies arrive (blocked-on-owner)
- [ ] Stage 4: tech-db X12 trees + provenance comments + `TECH_SEASON_ORDER` += 'X12'
      + scaffold-test assertion 2 + new tech-db X12 test (4.2-4.3)
- [ ] Whole-lane: `npm run check:fast` before PR; full `npm run check` at the release
      commit per the master plan (Lane 5 / spine commit 13).
