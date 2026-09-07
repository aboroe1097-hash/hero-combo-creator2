# 16.0.0 Lane 4 — Legacy `?atlas=` / Hash Deep-Link Stability Test Design

> **Historical record — v16 legacy-link test design.** Reviewed for documentation routing on 2026-09-05.
> This document specifies test intent. Current hash/query behavior must be checked in the shell and browser suite, including subtab activation and focus restoration.
> Original content below is retained as dated evidence, not current release instructions.

**Current starting points:** [js/shell-v14.js](../../../js/shell-v14.js) · [tests/app-smoke.spec.js](../../../tests/app-smoke.spec.js) · [Documentation index](../../README.md).


Status: design (2026-09-02). Test implementation waits for T0's implementation
start; this document freezes the contract the test will enforce. Nothing in
`js/app-hero-atlas.js`, `js/heroes-combos-hub.js`, `js/shell-v14.js`, or
`js/app.js` changes until then.

## Goal

The 5th `codex` sub-tab and the codex mode in the Atlas must not break any deep
link already live in shared URLs, the toolkit map, Velo's knowledge base, or
member-shared links. The test proves: (a) every legacy link keeps resolving to
its current tab/sub-tab/mode, and (b) the new `codex` surfaces get their own
stable links without colliding with the old ones.

## Link inventory (verified against this checkout)

### A. Query params on `index.html` (parsed in `app-hero-atlas.js` `applyHeroAtlasUrlParams`, lines 370-402)

| Link | Today | After 16.0.0 (required) |
|---|---|---|
| `?atlas=skins` | Atlas skin mode | unchanged — skin mode |
| `?atlas=heroes` | Atlas hero mode | unchanged — hero mode |
| `?atlas=codex` (new) | n/a | codex mode — new value added to the same legacy branch, must not shadow `skins`/`heroes` |
| `?atlas=<garbage>` | hero mode (fallback) | unchanged — hero mode fallback |
| `?season=X1,X2` / `?seasons=X1` | season filter | unchanged (codex mode must honor it too) |
| `?troop=cavalry` / `?troop=Cavalry` / `?troop=arch` | troop filter (`normalizeTroopParam`, lines 359-368) | unchanged |
| `?state=Free` / `?state=Paid` | state filter | unchanged in hero mode; **ignored inside codex mode** (preset pills are authoritative) — must not crash or leak into `?state` writes |
| `?heroSearch=…` / `?search=…` | search filter | unchanged |
| `?hero=King%20Arthur` | opens detail drawer | unchanged, incl. from codex mode |

### B. Hash deep links (resolved in `shell-v14.js` `resolveCanonicalHashTabName`, lines 169-206)

| Hash | Today | After 16.0.0 (required) |
|---|---|---|
| `#manual`, `#generator`, `#heroes`, `#skins` | open Heroes & Combos hub on that sub-tab via `legacyHeroesCombosHashes` (lines 80-85) | unchanged (these four only — `#codex` is NOT added to the legacy map; the canonical form is the sub-tab param below) |
| `#heroesCombos?subtab=manual|generator|heroes|skins` | canonical sub-tab deep link (`heroes-combos-hub.js` `readHeroesCombosIntent`) | unchanged; `subtab=codex` becomes valid |
| `#loyalty`, `#bounty`, `#royalbounty`, `#edenx1` | Eden hub legacy (lines 63-68) | untouched |
| `#research`, `#specialization`, `#towers`, `#artifact(s)` | Research hub legacy (lines 71-77) | untouched |
| `#edenhub` | alias → Eden tab (line 89) | untouched |
| `#combo=…`, `#roster=…` | share-intent payloads; `updateSubtabHash` must skip them (`heroes-combos-hub.js:63-70`) | unchanged — codex sub-tab opening must respect the same guard |
| `#arcade`, `#edenMap`, `#strife`, `#youtube`, top-level tab hashes | shell routing | untouched |

### C. Intent chain (must stay in order)

`body.dataset.heroesCombosSubtab` intent (`app.js:1408-1462`, set by shell for
legacy hashes) → `readHeroesCombosIntent()` → `openHeroesCombosSubtab(name)`.
The codex sub-tab plugs into this chain exactly like `heroes`/`skins`;
`PANEL_FOR_SUBTAB.codex = 'heroes'` shares the Atlas panel.

## Test file

`tests/unit/hero-atlas-deeplink-stability.test.mjs` (new, at implementation
start). Follows the existing source-pattern convention
(`tests/unit/hero-atlas-detail-v14.test.mjs` reads source with
`readFileSync` + `assert.match` — no app imports, so it runs before any lane
dependency lands).

### Part 1 — source-pattern assertions (fast, no browser)

1. `HEROES_COMBOS_SUBTABS` still contains `manual`, `generator`, `heroes`,
   `skins` in that relative order, and exactly one new `codex` entry.
2. `legacyHeroesCombosHashes` still maps exactly `manual|generator|heroes|
   skins` — assert `'codex'` is **absent** from that Map.
3. `updateSubtabHash` still guards `combo=`/`roster=` prefixes before writing
   `#heroesCombos?subtab=…`.
4. `applyHeroAtlasUrlParams` still accepts `?atlas=skins` and `?atlas=heroes`
   (branch structure), and any new `atlas=codex` handling is a third arm —
   source-pattern: the `params.get('atlas')` comparison lists exactly three
   outcomes.
5. `updateHeroAtlasUrlParams` still `delete`s `atlas` and never writes it back
   (the "hub sub-tab is canonical" rule), and `state` param writes remain
   gated to hero mode.
6. `normalizeTroopParam` prefix rules (`arch`/`foot`/`cav`) untouched.

### Part 2 — runtime smoke (Playwright, added to the existing smoke suite at
implementation start; requires a built dev server)

| Scenario | Steps | Expected |
|---|---|---|
| Legacy `?atlas=skins` | open `index.html?atlas=skins#heroesCombos` | Skins sub-tab active, skin gallery visible |
| Legacy hash `#heroes` | open `index.html#heroes` | hub opens, Heroes sub-tab active |
| New `#heroesCombos?subtab=codex` | open | Codex sub-tab active, preset pills visible |
| Legacy `?hero=` detail | open `index.html?hero=Immortal#heroesCombos` | detail drawer opens for Immortal |
| Share intent survival | open `#combo=<payload>` then click Codex sub-tab | hash payload preserved (guard holds) |
| `?state=Paid` inside codex | open `?atlas=codex&state=Paid` | codex preset defaults to `free`, no crash, URL not rewritten with a spurious `state` |

### Part 3 — regression guard for the gate

Assert (source-pattern, mirroring `check-size.mjs:346-348`) that no HTML file
contains `<link>`/`<script>` references to `hero-atlas` or
`battle-simulator-field-data` assets — the Phase-0 preload regression class
must not return with the new sub-tab.

## Pass criteria for the implementation commit

- Part 1 fully green before any `npm run build`.
- Part 2 green in the Playwright smoke run at the release gate.
- Part 3 green in `npm run size:check` (the `forbiddenInitialFeaturePattern`
  check is the authoritative one).

## Notes for the implementer

- New URL value `codexPreset=free|paid|skins-paid` is written only inside codex
  mode and deleted on exit (mirrors `?state` handling for hero mode).
- The legacy `#heroes`/`#skins` hashes must keep routing to hero/skin **mode**,
  not to the codex table, forever.
- The command palette entry for the hub sub-tabs (if one is added for codex)
  must use the same `#heroesCombos?subtab=codex` canonical form — no new hash
  alias.
