# 16.0.0 Lane 4 — Hero UI & Field Data Implementation Plan

Status: proposal **rev 2** (lane 4 of 5), 2026-09-02. Covers commit-spine commit 10
and the first half of commit 11. Rev 1 accepted by T0 with three revisions (R1–R3,
folded below) plus one ratified decision (Q1: 5th sub-tab). Rev 2 reflects the rev-5
master-plan framing (gate GREEN at branch cut), the resolved Q2/Q6, and the
heroes-info.js data-boundary rule. Proposal only: no code is changed by this lane.

Companion reading: `docs/plans/overhaul-16.0.0.md` (Workstream A2/A6, §0.5 budget
corrections, §0.7 no-vision protocol, rights rules 1–6) and
`docs/plans/lanes/overhaul-16.0.0-lane3-codex-data.md` (payload + provenance contract).

---

## 1. Scope & goal

Deliver the user-facing half of Workstreams A2 and A6 without growing any eager
route CSS/JS. **Gate status (rev 5): the release gate is GREEN at branch cut** —
the goal is now *keep the gate green*, with retire-before-add ordering everywhere.
The tight spots after the token-authority and preload fixes are `eden-x2.html`
desktop (0.0 kB of headroom), `admin.html` (0.6 kB), and `profile.html` (0.9 kB);
`index.html` has headroom again. Lane 4 adds **zero eager bytes to any route**, so
it cannot regress those numbers (§6.3). The binding constraint stays per-route CSS
budgets, not file count:

1. **One Atlas "Codex" mode** hosting the three hero tables (Free / Paid+Royal /
   Skins+Paid) as filter presets inside the existing Hero Atlas.
2. **Detail drawer upgrade** — skills 2/5/8 → full 1–8, duel win% bars with era
   badges, provenance/verification chips.
3. **i18n** — the complete new-key list in English plus the per-surface locale
   sets: 11 non-English Hero Atlas locale files, 12 core locale files (incl.
   `hr`) for hub copy only, and the 11 non-English battle-sim packs (§4.4).
4. **Battle Simulator "Field Data" panel** — duel evidence metadata, "resembles
   your account?" comparison, sim-vs-recorded deltas, strict-CSP-safe payload
   fetch, equipment delta folding.
5. **Route-CSS neutrality** — everything lands in existing lazy chunks (§6).

Out of scope: lane 3 data files, lane 1 token refactor, lane 5 release metadata,
the A3/A4 planners, A5/A7/A8/A9.

### Verified architecture facts this plan builds on

- `js/app-hero-atlas.js` (1635 lines) is a **lazy chunk** (`manualChunks` in
  `vite.config.js:88`, dynamically imported by `js/app.js` at lines 1081/1397 with
  a `?v=` cache key maintained by `scripts/update-build-metadata.mjs`).
- `css/hero-atlas-detail-v14.css` (56 KB source) is imported **by the JS module**
  (`app-hero-atlas.js:43`), so Vite emits it as the hero-atlas chunk's companion
  CSS — it never appears in any HTML `<link>` and adds zero eager bytes. Any CSS
  we add behind an `import` in that module merges into the same chunk CSS.
- `js/heroes-combos-hub.js` hosts 4 sub-tabs (`manual | generator | heroes |
  skins`) over `#heroesCombosSection`; `PANEL_FOR_SUBTAB`/`ATLAS_MODE_FOR_SUBTAB`
  map sub-tab → panel/mode. A 5th `codex` sub-tab is additive.
- `_heroesTabState` in `app-hero-atlas.js:323` already has `mode`, `state`
  (all/Free/Paid), `troop`, `seasons`, `sort`, `limit`; URL state mirrors it via
  `applyHeroAtlasUrlParams`/`updateHeroAtlasUrlParams` (`?season`, `?troop`,
  `?state`, `?search`, `?hero`, legacy `?atlas=`).
- Detail drawer sections (`detailHtml`) are ordered
  synergies → skins → skills → combos → counters with `data-detail-section` nav
  buttons; a contract test asserts the order
  (`tests/unit/hero-atlas-detail-v14.test.mjs:19-26`).
- Skills today come from `js/heroes-info.js` (`heroesExtendedData[name].skills`,
  ids 2/5/8 only). The i18n audit (`auditHeroAtlasPack`) requires translated
  `type|target|desc` for **every skill of every hero in `heroesExtendedData`**.
- Skins: `js/skins-db.js` — `SKIN_TYPES` (9 types with color/icon), `SKIN_TIERS`
  (3 tiers with per-star item costs + `maximizeTotal`), `heroSkins`,
  `getSkinForHero`, `getAllSkinHeroEntries`, `heroHiddenPowers`.
- Skin-mode ranks: `js/combos-db.js` `rankedCombos` has a top block of
  skin-code rank overrides (`skin: '321'` etc.; 3=must, 2=recommended,
  1=optional) and `baseRankedCombos = filterCombosForSkinMode(rankedCombos,
  false)` (line 291). The **override block re-orders ranks** — that is the raw
  material for the Skins+Paid "rank delta" column.
- `battle-simulator.html` ships a **strict CSP**: `script-src 'self'`,
  `connect-src 'self'`, `img-src 'self' data:`. Static same-origin JSON fetch is
  legal; any external image or CDN call is a CSP violation.
- Battle sim layout (`js/battle-simulator-app.js:1278-1298`): run panel →
  scenario panel → setup toolbar → battle profile panel → formations → actions;
  `#battleResults` after the form. i18n via `battle-simulator-i18n.js`
  (`BATTLE_SIMULATOR_ENGLISH` key catalog, 578 lines) + packs in
  `battle-simulator-i18n-packs.js` (175 KB, 11 non-English).
- Lazy-CSS precedent inside the battle sim:
  `loadBattleProfileTowersStyles()` → `import('../css/battle-profile-towers-embedded.css')`
  (`battle-simulator-app.js:155-163`). Audit item B7: its `.catch()` is
  swallowed and it is wired only to a `<details>` toggle (~line 3382) — the
  Field Data panel must use **load-on-expanded + retry**, fixing that pattern.
- Route CSS budgets (`scripts/check-size.mjs:275-321`): `battle-simulator.html`
  **59 KiB desktop AND mobile** (measured ~54.9–57.5 — near zero headroom);
  after rev-5 gate clearing the tight spots are eden-x2 desktop (0.0 kB),
  admin (0.6), profile (0.9); `index.html` is no longer blown. The
  `forbiddenInitialFeaturePattern` still blacklists `hero-atlas` in
  `dist/index.html` preloads (`check-size.mjs:346-348`) — the Phase-0
  regression class the gate watches; our code must keep living in lazy chunks.

---

## 2. Component work items (file-by-file)

### 2.1 `js/heroes-combos-hub.js` — 5th sub-tab (small)

- Extend `HEROES_COMBOS_SUBTABS` to `['manual', 'generator', 'codex', 'heroes',
  'skins']` (codex before heroes: it is the flagship table; hub order is the
  only visible order, keep it stable for muscle memory). Update
  `PANEL_FOR_SUBTAB.codex = 'heroes'` and `ATLAS_MODE_FOR_SUBTAB.codex =
  'codex'`.
- Deep links: `#heroesCombos?subtab=codex` already work via
  `readHeroesCombosIntent()`; `openHeroesCombosSubtab('codex')` must be what
  `openHeroDetailFromAnyMode` falls back to when the Atlas is in codex mode
  (mirror the existing `heroes` handling in `app-hero-atlas.js:588-593`).
- No CSS here; hub bar styles are shared and token-driven already.

### 2.2 `js/app-hero-atlas.js` — Codex mode (the bulk of commit 10)

**State (extend `_heroesTabState`):**
- `mode: 'heroes' | 'skins' | 'codex'` — `setHeroAtlasMode()` already normalizes
  unknown values to `'heroes'`; change it to accept `'codex'`.
- `codexPreset: 'free' | 'paid' | 'skins-paid'` (default `'free'`).
- `codexSort` per preset (see column sets below; default `'name'`).
- `codexSearch` — reuse `search` (one search box per mode, consistent with the
  skins gallery).

**URL state:**
- `applyHeroAtlasUrlParams`: `?atlas=codex` sets `mode='codex'` (extend the
  current two-way branch at line 378-380). Add `?codexPreset=` (validated
  against the three presets).
- `updateHeroAtlasUrlParams`: persist `codexPreset` when not default; delete it
  otherwise. Keep the rule "hub sub-tab is the canonical mode source" — never
  write `?atlas=` back.

**`renderCodexView()`** (new function, mirrors `renderSkinsView()`/hero branch):
- Toolbar: search field (id `heroesTabSearch` reused), preset pill group
  (`role="group"`, `data-codex-preset="free|paid|skins-paid"`,
  `aria-pressed`), count badge, CSV export button (reuses
  `exportHeroAtlasCsv()` — extend the exporter with a per-preset column set, see
  §2.4), clear-filters button.
- Preset chips render labels via `heroUi('codexPresetFree'|'codexPresetPaid'|
  'codexPresetSkinsPaid')`.
- **Provenance gating:** rows render entirely from local data
  (`allHeroesData`, `heroSkins`, `rankedCombos`); lane-3 columns (Royal tier,
  verification chips, full skill counts, duel counts) fill in only after the
  codex payload resolves. A `data-codex-state="loading|ready|unavailable"`
  attribute on the section drives the loading state; `unavailable` shows
  `heroUi('codexUnavailable')` and keeps local columns. Never block first paint
  on the payload.
- Async payload access goes through lane 3's `js/codex-loader.js` (fetch +
  DecompressionStream + cache — §3.1). Guard re-render with the same
  token/generation pattern as `_heroLocaleRefreshToken`
  (`app-hero-atlas.js:344-357`).

**Column sets** (concrete):

| Preset | Columns (order) | Sort options | Row join |
|---|---|---|---|
| `free` | Portrait · Name · Season (+origin `releaseSeason`) · Troop · State chip · Rating (finalRating bar) · Appearances · Best rank · Skins count · Verification chip | `name` / `season` / `rating` | `allHeroesData` where `State==='Free'`; verification from lane-3 heroes-codex |
| `paid` | Portrait · Name · Season · Troop · **Access** (`standard`/`paid`/**`royal`** from the lane-3 `access` column) · Rating · Appearances · Best rank · Skins count · Verification chip | `name` / `season` / `access` | `State==='Paid'` + lane-3 `access: 'royal'` (fallback access = `paid`) |
| `skins-paid` | Portrait · Name · Skin name · Skin type (SKIN_TYPES label+icon) · **Star-up cost** (Biography Seal + medal counts from the skin's tier `maximizeTotal`) · Hidden Power (yes/—) · **Skin-mode rank delta** (best rank gain vs `baseRankedCombos`) · Verification chip | `name` / `skin-type` / `rank-delta` | `getAllSkinHeroEntries()` joined to `allHeroesData`; heroes without skins listed once with `—` in skin columns |

- **Rank delta algorithm:** for a hero, collect combos containing them. Base
  rank = index in `baseRankedCombos` (+1). Skin-mode rank = index in
  `filterCombosForSkinMode(rankedCombos, true, /* ownsSkin: */ () => true)`
  (+1). Delta per combo = base − skin-mode; show the **best (largest positive)
  delta** as `+{n}` chip, `0` when none improves. Never re-rank `rankedCombos`;
  this is a read-only projection, so the "dated posts never enter
  `rankedCombos`" rule (master plan A2) is untouched.
- **Star-up cost:** `SKIN_TIERS.find(t => t.typeKey === skin.type)`; Mythic
  tier has no preserving step so it shows the lower total — that is correct and
  must not be "fixed".
- **Access column (R3, cross-lane freeze):** Royal comes from lane 3's new
  `access` column on payload hero records — `standard | paid | royal` (added in
  lane 3 rev 2). The UI reads `access` from the payload; it does **not**
  invent a parallel tier field. `paid` preset = `State==='Paid'` heroes,
  access label resolved from the payload with fallback `paid`.

**Row markup & a11y:**
- Reuse the `.hero-rank-row` button pattern (one row = one button opens the
  detail drawer) but with a new modifier `hero-codex-row` and a header row
  (`role="columnheader"` is overkill in a non-`<table>` list — use a
  `.hero-codex-head` div with `aria-hidden="true"` so the columns stay visual
  only; every cell value is still inside the button's accessible name).
- Column layout via CSS grid with named columns; collapse to a two-line layout
  under the normalized mobile boundary (767/769 — **defer to lane 1's final
  value**, do not write `min-width: 768px` anywhere; see §6.3).
- Empty states per preset: `heroUi('codexEmptyFree')`, `'codexEmptyPaid'`,
  `'codexEmptySkinsPaid'` (e.g. "No free heroes match your search.").
- `show more` pagination reuses `_heroesTabState.limit` + `.hero-tab-show-more`.

**Event wiring** (in `wireHeroesTabEvents`): `[data-codex-preset]` click
handler (set preset, reset `limit` to 20, `updateHeroAtlasUrlParams()`,
`renderHeroesTab()`). Everything else (search, export, clear, row select,
close, Escape) already works by id/data-attr.

**`renderHeroesTab` routing:** at the top, mirror the `mode === 'skins'`
early-return with `mode === 'codex'` → `container.innerHTML =
renderCodexView()` (plus search focus/caret restore).

### 2.3 `js/app-hero-atlas.js` — detail drawer upgrade (commit 10)

**Skills 1–8:**
- **Data boundary (hard rule, T0-ratified):** skills 1–8 live **only** in the
  lane-3 payload and are **never copied into `js/heroes-info.js`**.
  `heroesExtendedData` stays exactly as it is (ids 2/5/8). Copying them in
  would grow the i18n audit surface ~2.7× (`auditHeroAtlasPack` requires
  translated `type|target|desc` for every skill in `heroesExtendedData`). The
  audit stays anchored to heroes-info; payload skills are covered by a
  separate EN-only contract test (§7.2) and may fall back to English with a
  translation-missing chip — full 1–8 localization across 11 locales is a
  follow-up, not 16.0.0.
- Source merge helper `getHeroSkillsFull(name)`: lane-3 `heroes-codex`
  skill list (ids 1–8, each carrying its own provenance `verificationStatus`)
  **merged with** `heroesExtendedData[name].skills` (2/5/8, treated as
  `current` when the payload has no entry for that id — heroes-info.js is the
  community-verified baseline). Merge key = skill `id`; union sorted
  numerically 1–8. Never silently drop a payload skill; a payload skill id that
  collides with heroes-info is decided by payload (it is newer) but the UI
  shows the provenance chip of whichever won.
- Render each skill with `renderVerificationChip(status)` in the skill header
  (next to the existing type/range chips).
- `data-skill-count` now 1–8; extend the CSS grid rules (§6.2) and update the
  contract test (currently asserts patterns for 3 and 4 only,
  `hero-atlas-detail-v14.test.mjs:30-31`).
- Async: drawer renders the 2/5/8 skeleton immediately (from heroes-info),
  then upgrades in place when the payload resolves; `data-codex-state` on the
  skills section drives the "full data loading" affordance. No spinner that
  blocks content.

**New `duels` section** (after `combos`, before `counters`):
- Fed by lane-3 `duel-matrix` filtered to records whose lineup includes the
  anchor hero. Per record: opponent lineup (hero chips via existing
  `data-hero-pick` buttons), era badge, win% bar (CSS width bar, value +
  CI whisker from `confidenceInterval`), `battleCount`, verification chip.
- Era badge: map `sourceGameVersion` → era label via a lane-4-defined
  `CODEX_ERA_BADGES` table in `js/codex-ui.js` (§2.7) with a `heroUi`-style
  label per era; records whose version is unmapped get `eraUnknown`.
- `verificationStatus === 'unverified'` records render collapsed under a
  "Evidence only — not verified" disclosure (never a bar chart).
- Section nav button `data-detail-section="duels"`; update the section-order
  contract test.

**Provenance chips (shared component, §2.7):** used on skills, duel records,
combo-snapshot rows (once lane 3 exposes them), and the hero header (worst
status across sources). Chip markup: `<span class="codex-chip
codex-chip--{current|historical|unverified}" data-codex-status="...">label</span>`
with labels from `heroUi`; colors only via `var(--ff-*)` tokens (§6.1).

**Combo snapshots in the drawer:** lane-3 `combo-snapshots` dated posts render
under a `recommendationSnapshot` label in the `combos` section (master plan:
never into `rankedCombos`). If lane 3 defers snapshots, this is a clean drop —
see §3.1.

### 2.4 CSV export (commit 10)

`exportHeroAtlasCsv()` gains a mode branch: when `mode === 'codex'`, emit the
current preset's column set with header labels from `heroUi` (name / season /
troop / tier / skin / skin type / star-up cost / rank delta / verification
status). Filename `hero-codex-{preset}-{date}.csv`. Reuse `csvCell`; keep the
existing export path byte-identical for heroes/skins modes so existing export
tests stay green.

### 2.5 `js/battle-simulator-field-data.js` — new lazy module (commit 11a)

New dynamic module (not statically imported anywhere — that is what keeps it
out of eager JS):
- `import './codex-loader.js'` (lane 3) for payload access.
- `import '../css/battle-simulator-field-data.css'` — Vite emits this as the
  module's chunk CSS, loaded only with the chunk (§6.2).
- Exports `mountFieldDataPanel(container, deps)` and
  `hasFieldDataReady()`; deps injected from `battle-simulator-app.js`
  (translator, engine `simulateBattleBatch`, setup snapshot builders, equipment
  resolver) — no circular imports, battle-simulator-app stays the composition
  root.

**Panel placement:** new `<section id="battleFieldData"
class="battle-field-data" aria-labelledby="battleFieldDataTitle">` inserted
**after `renderBattleProfilePanel()`** and before `#battleFormations`
(`battle-simulator-app.js:1282-1283`), wrapped in `<details>` collapsed by
default, with the toggle labeled "Field Data — recorded duels and matchup
evidence" (`t('fieldData.summary')`).
- **Load-on-expanded + retry (B7 fix):** first `toggle`/expand does the dynamic
  `import('./battle-simulator-field-data.js')`; failure surfaces a retry button
  (`t('fieldData.retry')`) instead of a swallowed `.catch()`.

**Record card (per duel record):**
- Methodology metadata block, all fields from the lane-3 `duel-matrix` schema:
  `researchProfile`, `equipmentProfile`, `heroSkillUnlockProfile`,
  `castleSkinProfile`, `legionSkinProfile`, `attackerSpeedPriority`,
  `inclusionCriteria`, `battleCount`, `wins`, `losses`,
  `confidenceInterval`, `sourceGameVersion` + provenance (`source`, `author`,
  `captureDate`, `verificationStatus`). Missing fields render as named
  exclusions ("not captured"), consistent with the simulator's existing
  `coverage.*` copy approach.
- Win% bar + CI whisker; era badge (same `CODEX_ERA_BADGES` table as the Atlas,
  §2.7 — one source of truth).
- **"Resembles your account?"** comparison: compute per-dimension matches
  between the current battle profile (research snapshot via
  `buildBattleResearchSnapshot`, equipment loadout via `resolveEquipmentLoadout`,
  hero skill unlocks from the setup state) and the record's profiles → a match
  score `{matched}/{total}` with a dimension list (research / equipment / hero
  skills / skins). Pure function
  `scoreAccountResemblance(setupSnapshot, recordProfile)` exported for unit
  tests; no ML, no ranking — the master plan's gift-level hard rule (never a
  ranking attached to named players) applies to presentation tone as well.
- **Sim-vs-recorded delta:** "Run comparison" button re-runs the engine batch
  (`simulateBattleBatch`) under the record's conditions (lineup, tier, research
  profile) at the record's `battleCount`, then shows recorded win% vs simulated
  win% with delta and CI overlap ("sim agrees / sim under-/over-estimates by
  {n}%"). Only enabled for records with `verificationStatus !== 'unverified'`
  and `battleCount > 0`. Never overwrites the main form's current run.

**Strict-CSP-safe fetch:** payload fetch is a relative same-origin GET
(`connect-src 'self'`). Constraints to encode: (a) no external images — all
lineup art comes from existing local `getHeroImageUrl` assets; (b) no injected
HTML from payload strings without `escapeHtml` (payload is still data, not
code); (c) fetch with a `?v=` cache-bust key from build metadata, same pattern
as the atlas chunk.

### 2.6 `js/battle-simulator-equipment-field-deltas.js` — equipment delta folding (commit 11a)

- New small module exporting `EQUIPMENT_FIELD_DELTAS` — records keyed by
  equipment id/set id with `{ field, value, source, author, captureDate,
  gameVersion, verificationStatus, duelRecordIds[] }`, extracted from lane-3
  duel evidence `equipmentProfile` deltas (structured by lane 3; lane 4 only
  defines the consumer contract, §3.1).
- Consumed in `js/battle-simulator-equipment.js` at `resolveEquipmentLoadout`:
  apply a delta **only when** `verificationStatus !== 'unverified'` and the
  loaded equipment id matches; `unverified` deltas are excluded from the sim
  silently-with-log but remain visible in the Field Data panel.
- `js/battle-simulator-equipment-catalog.js` itself stays canonical
  (`identity-only | partial | verified` statuses already exist there);
  deltas are an overlay, never an edit to `EQUIPMENT_CATALOG`.

### 2.7 `js/codex-ui.js` — shared Codex UI kit (commit 10/11 shared)

Small shared module (loaded by both the atlas chunk and the field-data chunk —
it lands in whichever chunk imports it first; keep it tiny to avoid chunk
duplication surprises; see §6.4):
- `CODEX_ERA_BADGES` — era label/color-key map for `sourceGameVersion` ranges.
- `renderVerificationChip(status, opts)` — the single provenance badge
  implementation (labels via the host surface's `heroUi`/`t()`), so Atlas and
  Battle Sim render identical chips. Colors exclusively `var(--ff-*)`.
- `codexStatusRank(status)` — `current > historical > unverified` helper for
  "worst status" aggregation on the hero header.

### 2.8 CSS files

| File | Change | Loads |
|---|---|---|
| `css/hero-atlas-detail-v14.css` | + Codex table grid, preset pills, tier/skin-cost/rank-delta columns, verification chips, duel bars + era badges, skills grid for counts 1–8 (replace the 3/4-only `repeat()` rules with a general 1–8 mapping or grid-auto-rows), drawer `duels` section | lazily with the `hero-atlas` chunk (unchanged mechanism) |
| `css/battle-simulator-field-data.css` | new — panel layout, record cards, resemblance meter, delta table | lazily with `js/battle-simulator-field-data.js` |
| `css/_tokens.css` | **no edits by lane 4** — but we consume new `--ff-*` tokens that lane 1 must guarantee exist (verification/success/warning/era colors); list them in §3.2 | eager (tokens only) |

**Hard CSS rules:** zero raw hex in new rules; both themes first-class via
tokens (no `[data-theme='light']` override blocks for new components — the
token layer resolves it, which is the whole point of lane 1's token-authority
commit); no `min-width: 768px` (use lane 1's normalized boundary); honor
`prefers-reduced-motion` (bars animate via width transition only when motion is
allowed); `min-height: 44px` tap targets for every interactive codex/field-data
control (audit B6 precedent).

### 2.9 i18n files — see §4 for the full key list

- `js/i18n/hero-atlas/ui.js` — add keys to `KEYS`, add the en row block, and
  add rows to all 11 non-English `ROWS` blocks; `auditHeroAtlasUi()` enforces
  completeness automatically.
- `js/i18n/hero-atlas/locales/{ar,de,es,fr,id,it,kr,pt,ru,tr,zh}.js` — new
  content strings (era labels, verification labels, Royal tier, skin-type
  names already exist; star-up cost item names already exist) go into each
  `strings` pack.
- `js/i18n/hero-atlas/content-contract.js` — register the new required strings
  (they flow from `js/codex-ui.js` + the Royal tier labels) so the audit keeps
  all 11 packs honest.
- `js/battle-simulator-i18n.js` — add `fieldData.*` keys to
  `BATTLE_SIMULATOR_ENGLISH`.
- `js/battle-simulator-i18n-packs.js` — mirror the `fieldData.*` keys into the
  11 non-English packs.

---

## 3. Interfaces with other lanes

### 3.1 Consumes (contracts lane 4 depends on)

| From | Shape needed | Used by |
|---|---|---|
| Lane 3 — `js/codex-loader.js` | `loadCodexDataset(name)` / `getCodexPayload()` returning the decompressed datasets, cached, with a `ready` flag and a generation token; payload fetch is same-origin with build cache-bust | Atlas codex columns, drawer skills/duels, Field Data panel |
| Lane 3 — `js/codex-provenance.js` | badge contract: `verificationStatus ∈ {current, historical, unverified}`, `source`, `author`, `captureDate`, `gameVersionScope` on every record; `codexStatusRank()` equivalent | verification chips everywhere |
| Lane 3 — `heroes-codex` dataset | per-hero: `access` ∈ `standard\|paid\|royal` (rev 2, frozen), `skills[]` ids 1–8 each with own provenance (payload-only, never copied to `js/heroes-info.js`), `aliases[]` | codex tables + drawer skills |
| Lane 3 — `duel-matrix` dataset | records with the §2.5 metadata fields, lineup hero names that resolve through the alias model to `allHeroesData` names | drawer duels section + Field Data panel |
| Lane 3 — `combo-snapshots` (optional) | dated recommendation posts with provenance | drawer combos section (drop cleanly if deferred) |
| Lane 3 — equipment delta extracts | structured `EQUIPMENT_FIELD_DELTAS` consumer contract (§2.6) | field-data folding |
| Lane 1 — token layer | `--ff-*` tokens covering success/warning/muted/era colors in both themes; authority over `#ocrDashboardRoot`-style scoping resolved | all new CSS |
| Lane 2 — season scaffolding | `HERO_ATLAS_ALL_SEASONS` incl. X10/X12 + `POPULATED_HERO_SEASONS`, `seasonColors` X10/X12 | codex tables show X10/X12 heroes once landed; pills/preset math must stay empty-season-safe (combo scope + "All" affordance) |

### 3.2 Produces (for other lanes)

- Lane 5 (release gate): the new lazy chunks (`battle-simulator-field-data` +
  its CSS) and any hero-atlas chunk growth are the size-gate deltas to measure
  at the release commit; the CSV exporter change is user-visible (changelog).
  **CHANGELOG item for lane 5 (Q1 ratification):** the Heroes & Combos hub
  gains a `Codex` sub-tab in flagship-first order (`manual | generator | codex
  | heroes | skins`) — the hub order change is user-visible. Legacy deep links
  must stay stable: `?atlas=skins|heroes` keeps working (unchanged branch),
  `#heroesCombos?subtab=…` values keep their meaning, and `?hero=` detail links
  are untouched.
- Lane 1 (theme): the list of required `--ff-*` tokens in §2.8 is the demand
  signal; if lane 1 lands first, lane 4 must compile against the final token
  names (single source of truth = `css/_tokens.css`).
- Lane 3: the equipment delta consumer contract and the frozen `access`
  column (`standard|paid|royal`, lane 3 rev 2) are the two cross-lane
  freezes implementation depends on.

---

## 4. i18n — full new-key list

### 4.1 New Hero Atlas UI keys (`js/i18n/hero-atlas/ui.js`)

English value + note for translators. Add to `KEYS` (line 1-105), en `ROWS`,
and all 11 non-English `ROWS` blocks. Keys stay short; reuse `{n}`, `{hero}`,
`{season}` placeholders already established in the file.

| Key | English | Notes |
|---|---|---|
| `codexModeName` | Codex | sub-tab / mode label |
| `codexModeHint` | Verified hero data with source tracking. | sub-headline under the preset pills |
| `codexPresetFree` | Free | |
| `codexPresetPaid` | Paid + Royal | |
| `codexPresetSkinsPaid` | Skins + Paid | |
| `codexColSeason` | Season | column header (reuse `original` for origin) |
| `codexColTier` | Tier | acquisition tier column |
| `codexColSkinType` | Skin | column header |
| `codexColStarCost` | Star-up cost | seals + medals summary |
| `codexColRankDelta` | Rank gain (skin) | best rank improvement chip |
| `codexColVerification` | Verification | column header |
| `tierFree` | Free | |
| `tierPaid` | Paid | |
| `tierRoyal` | Royal | L96 Royal acquisition tier |
| `codexEmptyFree` | No free heroes match your search. | |
| `codexEmptyPaid` | No paid heroes match your search. | |
| `codexEmptySkinsPaid` | No heroes with skins match your search. | |
| `codexLoading` | Loading verified data… | |
| `codexUnavailable` | Verified data unavailable right now. Local data shown. | |
| `codexSort` | Sort | aria/tooltip for the codex sort control |
| `verificationCurrent` | Verified current | short chip label |
| `verificationHistorical` | Historical | short chip label |
| `verificationUnverified` | Unverified | short chip label |
| `verificationAria` | Data verification: {status} | screen-reader label |
| `skillVerification` | Skill data: {status} | drawer skill chip aria |
| `duelsTitle` | Duels & Evidence | drawer section title |
| `duelWinRate` | Win rate | bar label |
| `duelRecordCount` | {n} recorded battles | |
| `duelEraUnknown` | Era unknown | |
| `duelEvidenceOnly` | Evidence only — not verified | collapsed-group label |
| `duelCIAria` | Confidence interval {lo}%–{hi}% | |
| `duelNoData` | No duel records for this hero yet. | |
| `snapshotRecommendation` | Community recommendation | combo-snapshot label (drop if lane 3 defers) |
| `snapshotDatedAria` | Posted {date} | |
| `codexExportCsv` | Export {preset} table | toast/title |

### 4.2 New Hero Atlas content strings (`locales/*.js` `strings` packs)

These flow through `heroContentText`/`auditHeroAtlasPack` via
`content-contract.js`; add the English values as pack keys + the 11 translated
values. Era labels are the reusable set (short, mostly season-like tokens —
translators should transliterate, not localize, `X10`-style names):

- Era badge labels for `CODEX_ERA_BADGES` (exact set defined when lane 3 fixes
  `sourceGameVersion` values; anticipated): `S0–S4`, `X1–X8`, `X10`, `X12`,
  `X15+` → keys like `eraS0S4`, `eraX1X8`, `eraX10`, `eraX12`, `eraX15Plus`.
- `Royal` tier display string (mirrors `tierRoyal` above in the strings pack).
- Verification chip labels (mirror §4.1 — keep the same three strings; they
  live in both surfaces).

### 4.3 Battle Simulator i18n keys (`battle-simulator-i18n.js` + packs)

| Key | English |
|---|---|
| `fieldData.summary` | Field Data — recorded duels & matchup evidence |
| `fieldData.kicker` | Field data |
| `fieldData.title` | Recorded duel evidence |
| `fieldData.copy` | Community-recorded duels with methodology and provenance. Numbers never rank players or alliances. |
| `fieldData.loading` | Loading field data… |
| `fieldData.retry` | Retry loading field data |
| `fieldData.empty` | No verified field data yet. |
| `fieldData.metadata` | Methodology |
| `fieldData.attackerSpeedPriority` | Attacker speed priority |
| `fieldData.inclusionCriteria` | Inclusion criteria |
| `fieldData.battleCount` | Battles |
| `fieldData.wins` | Wins |
| `fieldData.losses` | Losses |
| `fieldData.confidenceInterval` | Confidence interval |
| `fieldData.sourceGameVersion` | Game version |
| `fieldData.resembles` | Resembles your account? |
| `fieldData.resemblesMatch` | {matched}/{total} profile fields match |
| `fieldData.researchProfile` | Research profile |
| `fieldData.equipmentProfile` | Equipment profile |
| `fieldData.heroSkillUnlockProfile` | Hero skill unlocks |
| `fieldData.skinProfiles` | Castle/Legion skins |
| `fieldData.runComparison` | Compare with simulator |
| `fieldData.simVsRecorded` | Sim vs recorded |
| `fieldData.simAgrees` | Sim agrees with the record ({delta}%) |
| `fieldData.simUnder` | Sim under-estimates by {delta}% |
| `fieldData.simOver` | Sim over-estimates by {delta}% |
| `fieldData.unverifiedNote` | Unverified record — evidence only, excluded from simulations. |
| `fieldData.provenance` | Source / credit |

### 4.4 Locale sets per surface (Q6 resolved — no discrepancy, two file sets)

| Surface | Non-English files | Lane 4 keys land here |
|---|---|---|
| Hero Atlas domain locales | **11** — `js/i18n/hero-atlas/locales/{ar,de,es,fr,id,it,kr,pt,ru,tr,zh}.js` (no `hr`) | §4.1 UI keys (`ui.js` `KEYS` + `ROWS` blocks) and §4.2 content strings |
| Core app locales | **12** — `js/i18n/*.js` (the 11 above **+ `hr`**) | only the hub sub-tab label and any shared chrome copy (e.g. `heroesCombos` hub tab names, `?atlas=`-adjacent tooltips); lane 4's atlas-domain keys do **not** go here |
| Battle Simulator packs | **11** — `js/battle-simulator-i18n-packs.js` (same 11, no `hr`) | §4.3 `fieldData.*` keys |

Translation work orders must name the file set explicitly: atlas locale fills
= 11 files, core hub-copy fill = 12 files (incl. `hr` — usually a stub or
Latin-script copy, per the master plan's hr-stub convention), battle-sim pack
fill = 11 packs.

---

## 5. Component & data flow notes (risks the implementer must not trip on)

1. **`state` filter vs codex presets.** The existing `?state=Free|Paid` param
   and the codex presets overlap semantically. Decision: inside codex mode the
   preset pills are authoritative and `?state=` is ignored (and not written);
   the heroes-mode Free/Paid pills stay untouched. Do not merge the two
   controls.
2. **Detail drawer in codex mode.** `selectHeroInAtlas` + detail rendering must
   work from codex rows too (rows reuse `data-hero-name`); the drawer itself is
   mode-independent.
3. **Payload timing vs locale.** Both the codex payload and the atlas locale
   pack are async; re-render only when both are settled, using a single
   generation token (pattern: `_heroLocaleRefreshToken`). Guard against
   double-render on `vts:language-change`.
4. **Empty-season safety.** With lane 2 landed, X10/X12 pills appear; codex
   preset math must use `POPULATED_HERO_SEASONS` semantics so empty seasons
   never break the preset row counts or the "All" affordance.
5. **XSS hygiene.** Payload strings go through `escapeHtml` exactly like
   `heroes-info.js` text does today (`formatSkillText`); the `duel-matrix`
   free-text fields (`inclusionCriteria` etc.) are rendered with `escapeHtml`
   only, never raw HTML, never `innerHTML` of payload text.
6. **Worker/batch limits.** The sim-vs-recorded comparison reuses the batch
   engine; respect `BATCH_WORKER_TIMEOUT_MS` and cap comparison `battleCount`
   at the record's own count (no unbounded runs from payload values).

---

## 6. Route-CSS neutrality & budget notes

### 6.1 How CSS currently loads

- **Eager:** per-route `<link rel="stylesheet">` in each HTML entry
  (`index.html`: tokens, ai-launcher-critical, app, components, atmosphere,
  mobile(max-width:768px), shell-v14, loader-v14, command-palette,
  account-chip, shell-account-chip → measured as the entry CSS + per-route
  totals by `check-size.mjs`).
- **Lazy:** any CSS imported by a dynamically imported module. Vite
  (`cssCodeSplit`) emits it as that chunk's CSS asset and injects it when the
  chunk executes: `hero-atlas-detail-v14.css` (via `app-hero-atlas.js`) and
  `battle-profile-towers-embedded.css` (via `import('../css/…')` inside
  `battle-simulator-app.js`) are the two precedents.

### 6.2 Where new styles land (explicit)

| New styles | Mechanism | Net eager impact |
|---|---|---|
| Codex table + drawer upgrades | edit `css/hero-atlas-detail-v14.css`, still imported from `app-hero-atlas.js` | **0** on every route; grows only the lazy hero-atlas chunk CSS |
| Field Data panel | `import '../css/battle-simulator-field-data.css'` from the new dynamic module | **0**; `battle-simulator.html` route stays ≤ 59 KiB desktop/mobile (it is ~57.5 now — do not touch `css/battle-simulator.css` at all) |
| New tokens | lane 1's job; token file is already eager on every route — only variable *values*, no new rules from lane 4 | negligible (lane 1 owns this delta) |

### 6.3 Gate checks — keep-green acceptance criteria

- `forbiddenInitialFeaturePattern` (`scripts/check-size.mjs:346-348`) already
  contains `hero-atlas` — the codex additions must keep living inside that
  chunk and never be statically imported by `js/app.js` or linked in any HTML.
  The Field Data module must never be statically imported by
  `js/battle-simulator-app.js` (dynamic import only, inside the expand
  handler).
- Route CSS budgets (`check-size.mjs:275-321`) are GREEN at branch cut with
  retire-before-add ordering; lane 4's acceptance criterion: after `npm run
  build && npm run size:check`, the deltas for `battle-simulator.html`,
  `eden-x2.html`, `admin.html`, `profile.html`, and `index.html` are all **0**
  (the tight spots — eden-x2 desktop 0.0 kB, admin 0.6, profile 0.9 — cannot
  absorb a single eager byte from this lane).
- Aggregate budgets (`totalJsBytes` 10084, `totalCssBytes` 1635,
  `totalDeployBytes` 32100, `deployFileCount` 704): lane 4 adds exactly **2
  emitted files** (field-data chunk JS + its CSS) plus the growth of existing
  chunks. Running file ledger (T0-ratified): **669 + 1 (lane 3 payload) + 2
  (lane 4) = 672 / 704**. If the shared `js/codex-ui.js` causes duplication
  across the hero-atlas and field-data chunks, inline it into each consumer
  instead (see §2.7).
- `deployFileCount` guard: do not introduce new emitted locale chunks — the
  codex UI keys ride the existing atlas locale files and battle-sim packs.

### 6.4 Chunk-duplication trap

`js/codex-ui.js` imported by two different lazy chunks will be duplicated
(Rollup only dedupes shared statics that roll up through a common entry; the
hero-atlas and field-data chunks are imported by different routes). Keep it
under ~1 KB of minified code, or split: badge rendering inline in each surface,
era table in `js/codex-loader.js` (lane 3) instead. Preferred: put
`CODEX_ERA_BADGES` + `codexStatusRank` in lane 3's provenance module (single
copy, loaded once), leave only tiny rendering helpers per surface.

---

## 7. Tests

### 7.1 Update existing

- `tests/unit/hero-atlas-detail-v14.test.mjs` — section order becomes
  synergies → skins → skills → combos → **duels** → counters; `data-skill-count`
  patterns extended from {3,4} to 1–8 (`repeat(...)` rules); assert the codex
  branch exists (`data-codex-preset`) and that codex CSS uses `var(--ff-`
  tokens (see 7.2).
- `tests/unit/skin-atlas.test.mjs` — hub subtab list now contains `codex`;
  `atlasModeForSubtab('codex') === 'codex'`; assert codex additions made no
  new `atlas-mode-toggle` style leaks into `css/app.css` (keep the
  `doesNotMatch` family).
- `tests/unit/hero-atlas-i18n.test.mjs` — UI catalog completeness now covers
  the §4.1 keys across all 11 locales (automatic via `auditHeroAtlasUi` once
  keys are added to `KEYS`); content-contract test gains the §4.2 strings.
- `tests/unit/battle-simulator-page.test.mjs` — new `#battleFieldData`
  section contract; assert `battle-simulator-field-data` is not referenced by
  any static import in `js/battle-simulator-app.js` (source-pattern test, same
  style as the lazy-chunk test at `hero-atlas-detail-v14.test.mjs:59-62`).
- `tests/unit/battle-simulator-i18n.test.mjs` — `fieldData.*` key parity
  across the 11 packs (the existing pack-parity test pattern).
- `tests/unit/battle-simulator-equipment.test.mjs` — delta overlay: verified
  delta applies to `resolveEquipmentLoadout`, `unverified` excluded.

### 7.2 New tests

- `tests/unit/hero-atlas-codex.test.mjs` (new):
  - source-pattern contract for `renderCodexView`: three `data-codex-preset`
    values, column header keys per preset, sort option sets, empty-state keys;
  - rank-delta pure function (export it from `app-hero-atlas.js` or a small
    `js/codex-rank-projection.js`): fixture combos with skin overrides produce
    the expected best delta; missing skin metadata behaves like `111`;
  - star-up cost lookup: Mythic tier returns the 2-star-only total, Legendary
    returns seals+medals, Everlasting returns advanced seals;
  - verification chip: `codexStatusRank` ordering, chip markup contains
    `data-codex-status`, no raw hex in chip CSS;
  - skill merge: payload 1–8 + heroes-info 2/5/8 unions to 1–8, collision
    resolved to payload, unknown ids never silently dropped;
  - empty-season safety: preset counts unaffected by empty X10/X12 seasons.
- `tests/unit/battle-simulator-field-data.test.mjs` (new):
  - record schema validation (all §2.5 metadata fields present or explicitly
    absent → named exclusion);
  - `scoreAccountResemblance` fixture math (full match / partial / mismatch);
  - sim-vs-recorded delta calc incl. CI overlap classification
    (`simAgrees`/`simUnder`/`simOver`) and the `unverified` + `battleCount: 0`
    exclusion;
  - CSP hygiene: assert the module contains no absolute URLs except
    `images/`, `assets/`, relative fetches (source-pattern), and all payload
    string interpolation goes through `escapeHtml`;
  - equipment delta folding contract (§2.6).
- `tests/unit/light-theme-compatibility.test.mjs` (update): the new codex +
  field-data CSS must contain zero raw hex colors outside the existing
  pre-token legacy blocks (regex on the two CSS files), and both `var(--ff-`
  and `[data-theme='light']`-free rule bodies for new selectors.

---

## 8. Budget & risk notes

- **Battle-sim route budget is the tightest binding constraint** (59/59, ~57.5
  used). Rule for the whole lane: `css/battle-simulator.css` and
  `battle-simulator.html` are untouchable; everything field-data goes lazy.
- **Keep-green discipline:** the gate is GREEN at branch cut (rev 5); the
  tight spots eden-x2 (0.0 kB desktop), admin (0.6), profile (0.9) mean any
  eager byte this lane adds fails the gate — the lazy-chunk design above adds
  none, and the §6.3 acceptance deltas are all zero.
- **Phase-0 regression class:** the eager `hero-atlas` preload is exactly what
  the gate's `forbiddenInitialFeaturePattern` catches. Acceptance: after build,
  `dist/index.html` contains no `<link>` to hero-atlas/field-data assets.
- **i18n pack growth:** 11 locale files × ~30 short keys ≈ small; the risk is
  audit failures, not bytes. Fill the en `KEYS`/rows first, run
  `node --test tests/unit/hero-atlas-i18n.test.mjs`, then delegate the 11-locale
  fill as one mechanical DeepSeek work order per locale file (house rule:
  inline the key list — §4.1 is the data source).
- **Async races:** payload + locale both async in the drawer; the generation
  token pattern is mandatory (§5.3).
- **Skin-mode rank projection correctness:** the override block re-orders
  `rankedCombos` by position; any naive "compare same combo index" diff must
  instead re-index both lists. Test fixture coverage in §7.2 is the guard.
- **Aggregate file budget:** the running ledger is 669 + 1 (lane 3 payload) +
  2 (lane 4) = **672 / 704** emitted files; the release commit re-measures and
  any further chunk proliferation must be called out lane by lane.
- **Provenance discipline (hard rule):** nothing renders without
  source/author/captureDate/gameVersionScope/verificationStatus (master plan
  A1). Every new rendered dataset column above traces to a lane-3 record.
- **Never rank players:** the Field Data copy and the gift-level estimator
  hard rule (§0.7 / rights rule 6) both forbid named-player rankings; the
  resemblance meter and deltas are account-vs-record, not player-vs-player.

---

## 9. Open questions (for the orchestrator / owner)

| # | Question | Lane 4 lean |
|---|---|---|
| Q1 | ~~5th hub sub-tab `codex` vs preset-only inside `heroes` mode~~ | **Ratified (T0):** 5th sub-tab, flagship-first order (`manual \| generator \| codex \| heroes \| skins`); hub-order change is user-visible → CHANGELOG via lane 5; legacy `?atlas=`/hash deep links stay stable (§3.2) |
| Q3 | Should `combo-snapshots` render in 16.0.0's drawer, or defer to a follow-up commit? | Defer if lane 3 defers; the section is designed drop-in |
| Q4 | Duels section: anchor-hero records only, or also records where the hero is an opponent? | Anchor only in the drawer; opponent view is the battle-sim panel's job |
| Q5 | Does the Field Data panel need the assumptions-acknowledge gate (`data-assumptions-acknowledged`) or is it independent evidence? | Independent — it is evidence, not engine output; no gate |
| Q7 | Mobile boundary value (767 vs 769) | Defer to lane 1's normalization; lane 4 writes no fixed breakpoint |
| Q8 | `js/codex-ui.js` shared vs inline (chunk duplication, §6.4) | Era table + status rank in lane 3's provenance module; tiny render helpers inline |

---

## 10. Execution checklist (commit-spine order)

1. **Gated:** lane 3 payload/provenance modules exist (`js/codex-loader.js`,
   `js/codex-provenance.js`, `heroes-codex` with the frozen `access` column,
   `duel-matrix`); lane 1 token authority merged; gate verified GREEN at
   branch cut before first commit.
2. Add `codex` sub-tab to `js/heroes-combos-hub.js` (flagship-first order);
   extend `setHeroAtlasMode` + URL params in `js/app-hero-atlas.js`; keep
   legacy `?atlas=skins|heroes` and `#heroesCombos?subtab=…` deep links stable
   (regression test); update hub tests.
3. Implement `renderCodexView` with local-data columns first (no payload),
   preset pills, search, pagination, empty states; source-pattern tests.
4. Add payload-driven columns (Royal tier, verification chips, duel counts)
   behind `codex-loader`; loading/unavailable states; generation-token guard.
5. Export `codexRankProjection` + star-up cost helper; Skins+Paid columns;
   fixture tests.
6. Drawer: skills 1–8 merge + chips; `data-skill-count` 1–8 CSS; duels section
   + era badges + CI bars; update section-order test. **Verify the data
   boundary:** diff confirms `js/heroes-info.js` is untouched (skills 1–8
   payload-only) and `auditHeroAtlasPack` still audits only the 2/5/8 set.
7. i18n: en keys/rows + content strings first; run atlas i18n audit; delegate
   the fills per surface (§4.4): 11 atlas locale files, 12 core locale files
   (incl. `hr` stub) for hub copy only, 11 battle-sim packs — one work order
   per file, keys inlined from §4.1/§4.2/§4.3.
8. `js/battle-simulator-field-data.js` + `css/battle-simulator-field-data.css`:
   panel markup, load-on-expanded + retry, record cards, resemblance meter,
   sim-vs-recorded; battle-sim i18n keys + packs.
9. `js/battle-simulator-equipment-field-deltas.js` + `resolveEquipmentLoadout`
   hook; equipment tests.
10. Full local verification: `npm run build` → `npm run size:check` (assert the
    §6.3 keep-green deltas are 0 on every route) → `node --test
    tests/unit/hero-atlas-codex.test.mjs
    tests/unit/battle-simulator-field-data.test.mjs` + updated atlas/skin/
    i18n/battle tests → `npm run lint`.
11. No budget re-baseline expected (retire-before-add: this lane retires
    nothing eager and adds nothing eager). If aggregate chunk growth demands
    it, escalate to lane 5 before touching `check-size.mjs` limits.
12. Hand the commit to the spine (commit 10 + 11a); release metadata and the
    hub-order CHANGELOG entry stay with lane 5 (§3.2).
