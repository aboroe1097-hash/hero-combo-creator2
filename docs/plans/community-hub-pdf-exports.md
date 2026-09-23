# Community Hub — Branded PDF Exports

Status: **implementation in progress, not finished.** See "Work in progress" at the end for exactly
what is committed, what is verified, and what remains.
Target: PR #217 (the owner expected #218, but #216 was still open so #217 was the next free number).
Base: `origin/gh-pages` (16.0.19).

## Goal

Make the site a community hub by publishing **one-click downloadable, shareable PDFs** of every
game-data breakdown we already hold, so any player or Discord can redistribute them freely.

**Owner decisions locked in (2026-09-23):**

1. **Branding stays ON.** The PDFs carry the normal site branding — `Hero Combo Creator — VTS 1097`,
   `roc-vts.com`, app version, and the seven source credits — exactly like every existing CSV and PNG
   export. This replaces an earlier draft of this plan that proposed stripping branding; that was a
   misreading of the request and is **not** the direction. Implement it by calling the existing
   `getExportBranding()` from `js/export-branding.js`, not by building a parallel unbranded path.
2. **Building costs are Eden honor buildings only.** Do not chase the external castle / Main Building
   source for this PR.
3. Both PRs (#216 and this one) are in scope.

## What is already verified

The pipeline was proven end-to-end (throwaway PoC under `tmp/` in the main checkout, not committed):

1. **Node can import the site's own data modules directly.** Spot-checked 9 modules: `js/tech-db.js`,
   `js/heroes-data.js`, `js/eden-operations-data.js`, `js/skins-db.js`,
   `js/specialization-towers-v2-data.js`, `js/material-planner-model.js`, `js/throne-buffs-data.js`,
   `js/artifact-db.js` all import cleanly. Only `js/state.js` fails (reads DOM at module scope).
   **No data duplication is needed** — the PDF generator reads the same modules the site renders.
2. **`js/export-branding.js` is importable in Node with a small DOM stub**, verified by running it:
   it returns `displayName: "Hero Combo Creator — VTS 1097"`, `siteUrl`, `appVersion`, and all seven
   credits. `scripts/pdf/lib/env.mjs` provides that stub.
3. **Playwright Chromium can print real PDFs.** `page.pdf({ format: 'A4' })` produces a valid
   `%PDF-1.4`, vector-text, selectable PDF. A full-page roster table measured **1 page / 57 KiB**.
4. **Chromium is already present in both shipping pipelines.** Both `.github/workflows/ci.yml` and
   `.github/workflows/deploy.yml` run `npx playwright install --with-deps chromium` before
   `npm run verify:deploy`, and `@playwright/test` is already a devDependency. **No new dependency.**

**Modules that are NOT Node-importable** (do not try to import these from the generator):
`js/state.js` (DOM at module scope) and `js/material-calculator.js` (imports `css/materials.css`,
which Node rejects as an unknown extension). Use `js/material-planner-model.js` for DM data instead.

## Data inventory

Verdict per requested export. "Live" = real rows today; "pending" = header-only stub.

| Requested export                   | Source                                                                            | Verdict                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Research costs                     | `database/codex/research-costs.txt`                                               | Live — **1,036 rows / 36 trees**, the only source with `gems` + `timeSec`     |
| Medals breakdown                   | `js/specialization-towers-medal-evidence.js`                                      | Live but **must come from PR #216** — see "Blocking dependency" below        |
| Towers                             | `js/specialization-towers-v2-data.js`                                             | Live — 32 researches, 8 columns, 718 attribute nodes, 24 legion skills        |
| Eden — honor building costs        | `js/eden-operations-data.js`                                                      | Live — 6 buildings × 20 levels + 4 discount tiers                            |
| Eden — specialty honor levels      | `js/eden-operations-data.js`                                                      | Live — 143 levels, 12 route milestones, 4 presets                            |
| Eden — siege structures            | `js/eden-operations-data.js`                                                      | Live — 13 structures, loyalty/durability/damage/attackers/support            |
| Eden — tile levels                 | `js/eden-operations-data.js`                                                      | Live — 16 tiles + 21 blue-loyalty specialty ranks                            |
| Eden — map structures              | `js/eden-datasets.payload.json`                                                   | Live — 1,729 structures across 3 datasets (622/585/522)                      |
| DM — enhancement ("advancing")     | `js/material-planner-model.js` `DM_ENHANCE_*`                                     | Live — 7 verified milestones (+5…+25) × 3 resources, 6-piece = 6× one piece   |
| DM — crafting ("building")         | `js/material-planner-model.js` `DM_ROUTES`, `DM_SLOT_RECIPES`, stockpiles         | Live — 3 routes, 3 troops × 6 slots, 4 materials, 6 tiers                     |
| Heroes per season, free vs paid    | `js/heroes-data.js`                                                               | Live — 89 heroes × 10 seasons × {Free 71, Paid 18}                            |
| With vs without skins              | `js/skins-db.js`, `js/skin-heroes-data.js`                                        | **Split** — catalogue + star-up costs live; stat deltas mostly missing        |
| Artifacts                          | `js/artifact-db.js`, `js/artifact-sword-data.js`                                  | Live — Sword of Judgment 33 nodes, Redemption Grail 32 nodes                  |
| Combos and counters                | `js/combos-db.js`, `js/counter-db.js`                                             | Live — 210 combos, 19 countered targets                                      |
| Throne buffs                       | `js/throne-buffs-data.js`                                                         | Live — 9 titles                                                                |
| Infographics                       | derived from the above                                                            | Live — bar/curve/tile charts from the same data                              |

### Gaps that must be surfaced, not papered over

- **Castle / Main Building costs do not exist in this repo.** `database/codex/building-costs.txt` is a
  header-only stub with `status: pending` and the narrative "L96 'Main Building Costs' — not yet
  located". `js/castle-planner-model.js` is a complete engine with no catalog behind it. Eden honor
  buildings are a *different* system and are live. **A castle building-cost PDF cannot ship from repo
  data**; it needs the external source located first.
- **Five more staging datasets are pending:** `economy-honor-buildings`, `economy-gift-levels`,
  `lofty-costs`, `duel-matrix`, `combo-snapshots`.
- **"With skins" stat deltas are blocked.** 22 of 23 skins are `createPendingSkin()` stubs with
  `detailsStatus: 'pending'` and zeroed `bioAttributes`. Only King Arthur has real numbers. What *can*
  ship: the 23-skin catalogue, the 3 verified tier star-up cost tables, and codex rank deltas.
- **Skins are season-clustered.** All 23 sit on S0–X1 heroes; X2, X8, X10 and X12 have **zero** skins.
  A "per-season with/without skin" column is empty for every modern season.
- **`BUILDING_HONOR_YIELDS` is `null` for all six Eden buildings** (`status: 'not-supplied'`) — render
  the gap explicitly rather than omitting the column silently.
- **`economy-war-medals` sounds like a medals source but is not.** It is 3 rows of prose about COP
  medal *distribution rules* (historical, 2023-10-30). Unit-specialisation medals are the real dataset.

## Blocking dependency: PR #216

`origin/gh-pages` still ships **derived** medal totals — columns II–VI are 2^k doublings:

```
gh-pages:  15,647  31,294  62,588  125,176  250,352  500,704  160,696  223,382  = 1,369,839
PR #216:   15,647  26,794  52,191   69,782   71,854   92,662  164,461  230,248  =   723,639
```

PR #216 (`codex/specialization-sheet-data`, open, `MERGEABLE`) replaces those with the community
workbook's real per-node numbers: 120 sections, 2,745 node rows, 2,985 per-level cost cells, all three
troops × all ten towers. It also adds towers IX–X (321,992 / 340,007) which gh-pages has no node data
for at all.

**A medals PDF generated from `gh-pages` today would publish wrong totals.** The generator derives
everything at build time, so the correct sequencing is to land #216 first (or stack this branch on it)
— after that the PDF is correct with no further work.

## Architecture

**Build-time static PDFs, not client-side generation.**

```
js/*-data.js  +  database/codex/*.txt     (single source of truth — untouched)
        |
        v
scripts/pdf/build-pdf-exports.mjs          Node: normalize each dataset -> HTML/CSS templates
        |
        v
Playwright Chromium  page.pdf({ format: 'A4', printBackground: true })
        |
        v
dist/downloads/*.pdf                       served as plain static files by GitHub Pages
```

Why build-time rather than a browser "Print to PDF" button:

- **One click, exact file.** `window.print()` makes the user walk a dialog and choose "Save as PDF",
  and Chrome defaults headers/footers **on** — which stamps the page title and `roc-vts.com` on top.
  That literally fails the "no branding on top of it" requirement. Build-time PDFs have exactly the
  content we author, nothing else.
- **Zero runtime cost.** No PDF library in the bundle. This matters: `totalJsBytes` has ~7.5 KiB of
  headroom and jsPDF alone is ~350 KiB.
- **No new dependency.** Chromium and Playwright are already in both pipelines.
- **Vector text** — selectable, searchable, accessible, and small (57 KiB/page proven), versus
  rasterizing with html2canvas.

### Adding the hub page

A new standalone `downloads.html` route, mirroring `specialization-towers.html` exactly: CSP meta,
versioned local entry, registration in `vite.config.js` `input`, an entry in
`scripts/update-build-metadata.mjs` `entryHtmlFiles` (or its `?v=` stamps go stale), a `routeCssBytes`
budget, a `tests/unit/downloads-page.test.mjs` contract test, and an entry in the
`tests/production-smoke.spec.js` page list.

`index.html` **cannot** host this: it is 84,766 bytes against an 83 KiB cap (`indexBytes: 83 * 1024`),
leaving **226 bytes** of raw-source headroom. There is no room for new markup, and a tab inside the
shell is not available.

## Cost

PDFs count as **deployed media** — `scripts/check-size.mjs` defines `deployMediaFiles` as everything
not matching `\.(?:css|html?|js|json|map|md|txt|xml)$`, so each PDF hits `totalMediaBytes`,
`totalDeployBytes` **and** `deployFileCount` simultaneously.

| Budget              | Limit    | Audited today | Proposed | Why                                   |
| ------------------- | -------- | ------------- | -------- | ------------------------------------- |
| `deployFileCount`   | 733      | 730           | ~750     | 14–19 PDFs + hub page (HTML/JS/CSS)   |
| `totalMediaBytes`   | 18,850 K | 18,828.2 K    | ~21,000 K| PDFs (~1.5–2 MiB total, measured)     |
| `totalDeployBytes`  | 32,100 K | 32,093.1 K    | ~34,500 K| Same files, same walk                 |

Both existing caps have almost no room (22 KiB media, 7 KiB deploy, 3 files), so this is a deliberate
raise with a ledger comment per house style — the exact audited figure gets recorded during
implementation, as every previous raise in that file does.

Build time: roughly 15–19 Chromium renders. Expect **+30–45 s** on `npm run build`; to be measured and
recorded, since this lands on the production deploy path.

## Branding: RESOLVED — carry the normal export branding

The PDFs use the repo's existing branding, the same as every CSV and PNG export.
`js/export-branding.js` stamps site name, logo, URL, app version and **7 source credits**, and
`tests/unit/export-branding.test.mjs` asserts all 7 credits are present. Nothing in that module or its
test needs to change, and no unbranded code path should be added.

Implementation: `scripts/pdf/lib/env.mjs` installs a small DOM stub, then imports
`getExportBranding()` and threads the result through the layout so each document renders
`Hero Combo Creator — VTS 1097`, the app version, `roc-vts.com` and the credits. Verified working —
the real module returned the expected values under the stub.

Where each element goes:

- **Every page footer:** `{displayName} v{appVersion} · {siteUrl}` on the left, `Page X of Y` on the
  right, drawn by Chromium's `footerTemplate` (`scripts/pdf/lib/render.mjs`).
- **On the document:** a short brand bar, the title, and a metadata row (data revision, verification
  status, generated date).
- **Closing "About this data" section:** revision, the seven credits, and a reminder to verify against
  the live game.

### A rights note worth preserving

Three of the credits in `EXPORT_SOURCE_CREDITS` are not decorative. The numbers in these PDFs are
community work with provenance recorded in the data files themselves — DonPablone (l96.app codex
imports), Raven G / Ash Roe and the riseofcastles.net community (`database/codex/research-costs.txt`),
and Ivan & CrazyDD / ΜΟΛΩΝ ΛΑΒΕ (the Unit Specialization workbook), with DrThunder for the Eden
loyalty playbook. Separately, `assertNoForbiddenWatermarks` deliberately **throws** on the
third-party token `DONPABLONE` to stop a watermark being stamped into an export. Keep the credits
intact, and do not reuse that token as a watermark.

## Proposed export catalog

Filenames are descriptive and game-named.

| #   | File                                  | Contents                                             | State |
| --- | ------------------------------------- | ---------------------------------------------------- | ----- |
| 1   | `roc-research-costs.pdf`              | 1,036 rows / 36 trees, medals + gems + time          | todo  |
| 2   | `roc-unit-specialisation-medals.pdf`  | Per troop × tower I–X, per-level and cumulative      | todo  |
| 3   | `roc-specialisation-towers.pdf`       | 8 columns × 4 researches, nodes, legion skills       | todo  |
| 4   | `roc-eden-honor-building-costs.pdf`   | 6 buildings × 20 levels + discount tiers             | draft |
| 5   | `roc-eden-specialty-honor-levels.pdf` | Levels 1–143 + route milestones + presets            | draft |
| 6   | `roc-eden-siege-structures.pdf`       | 13 structures, full siege stats                      | draft |
| 7   | `roc-eden-tile-levels.pdf`            | 16 tiles + Blue Loyalty specialty                    | draft |
| 8   | `roc-eden-map-structures.pdf`         | 1,729 structures across 3 datasets                   | todo  |
| 9   | `roc-dragon-master-enhancement.pdf`   | Advancement costs to +25                             | draft |
| 10  | `roc-dragon-master-crafting.pdf`      | Routes, recipes, stockpiles, dragonite rates         | draft |
| 11  | `roc-heroes-by-season.pdf`            | 89 heroes × 10 seasons, free/paid, with/without skin | todo  |
| 12  | `roc-skin-catalogue.pdf`              | 23 skins, 3 tiers, verified star-up costs            | todo  |
| 13  | `roc-artifacts.pdf`                   | Sword of Judgment 33 + Redemption Grail 32 nodes     | todo  |
| 14  | `roc-combos-and-counters.pdf`         | 210 combos + 19 countered targets                    | todo  |

Costs are Eden honor buildings only, per the owner decision — rows 4–7. There is no castle or
Main Building export in scope.

Plus simple infographics built from CSS-width bars in the same layout system: the unit-specialisation
medal curve (15,647 → 340,007 per tower, which makes the tier-VII jump obvious at a glance), heroes per
season stacked by free/paid, DM cumulative resource curves to +25, and the Eden specialty-Honor curve.

## Implementation sequence

1. `scripts/pdf/` — dataset normalizers (Node, one per source) + HTML/CSS templates + the Chromium
   renderer. Assert every dataset's row count in the normalizer so a silent data change fails loudly.
2. Regenerate PDFs inside `npm run build`, after `vite build` and before `scripts/post-build.mjs`, so
   `dist/downloads/` exists before the size check and the service-worker manifest walk. PDFs are *not*
   precached (the collector matches only `css|js|webp|png|webmanifest`), which is correct for payloads.
3. `downloads.html` hub — grouped cards, file size, row count, last-built date, one click per file.
4. Budget raises with ledger comments, measured not guessed.
5. Tests: a `tests/unit/pdf-exports.test.mjs` contract (every PDF in the manifest exists in `dist`, is a
   valid `%PDF-` header, and contains the brand line), a page-contract test for `downloads.html`, and
   the rendered-content gate below.

### Verifying PDF output

Freshly generated PDFs get rendered to PNG and reviewed as the visual acceptance gate — a table that
overflows a column or splits a header across a page break looks fine in a byte-level check and wrong to
a reader. Layout is the deliverable here, so it gets eyeballed, not just asserted.

## Non-goals

- No PDF library, no new npm dependency, no runtime JS or CSS for the exports.
- No client-side PDF generation.
- No fabricated numbers: gaps render as explicit gaps (`not supplied`, `pending`) exactly as
  `js/eden-operations-data.js` and the codex manifest already track them.
- Not fixing the underlying data gaps; this ships what is real and makes the holes visible.

## Remaining decisions

1. **Locales:** English-only PDFs is the working assumption (13 locales would mean 13× the files and
   budget). Confirm or ask for a second language.
2. **Budget raise:** approve roughly 750 files / ~21,000 KiB media / ~34,500 KiB deploy, or ask for a
   smaller first batch. Exact figures must be measured during implementation, not copied from here.
3. **Scope:** the catalog is 14 exports. Landing the highest-value few first (research, medals, heroes,
   DM, Eden honor buildings) is a reasonable fallback if the budget raise is unwelcome.

---

# Work in progress — handoff for the reviewer

**This PR is not finished.** It contains a corrected, final plan plus **unverified draft scaffolding**.
Nobody should merge it as-is. Read this section before touching anything.

## State of the branch

| Item                                                              | State                                                                            |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Research + architecture plan                                      | **Done** — this document                                                |
| Owner decisions (branding ON, Eden honor buildings only)          | **Done** — locked above                                                 |
| `scripts/pdf/lib/env.mjs`                                         | **Verified** — branding module loads under the stub                      |
| `scripts/pdf/lib/layout.mjs`                                      | **Verified visually** — rendered to PNG and reviewed                     |
| `scripts/pdf/lib/render.mjs`                                      | Written, **never executed** (needs Chromium)                             |
| `scripts/pdf/lib/codex.mjs`                                       | Written, **never executed against a real file**                          |
| `scripts/pdf/datasets/eden.mjs` (4 exports)                       | **Executes, produces branded HTML**                                      |
| `scripts/pdf/datasets/dm.mjs` (2 exports)                         | **Executes, produces branded HTML**                                      |
| `scripts/pdf/verify-datasets.mjs`                                 | **Works** — runs every drafted builder without `node_modules`            |
| Manifest + build entry (`scripts/pdf/build.mjs`)                  | **Not written**                                                          |
| `downloads.html` hub page + vite/build registration               | **Not written**                                                          |
| Size budget raises                                                | **Not written**                                                          |
| `package.json` build step                                         | **Not wired**                                                            |
| Tests (`tests/unit/pdf-exports.test.mjs`, page contract)          | **Not written**                                                          |
| Remaining 8 dataset normalizers                                   | **Not written**                                                          |
| Lint under eslint 10                                              | **Not run** (see environment notes)                                      |
| A PDF produced by this code                                       | **Not yet** — HTML is verified, the Chromium step is not                 |

## Proven vs unproven

**Proven** (measured, not assumed):

- Node imports the site's data modules and returns correct data. Measured:
  `allHeroesData.length === 89`, `heroSkins` keys `=== 23`, `SPECIALIZATION_COLUMNS` keys `=== 8`,
  `BUILDING_UPGRADE_COSTS.workshop.length === 20`, `SPECIALIZATION_TROOP_MEDAL_EVIDENCE.length === 12`
  (see the #216 note below).
- `getExportBranding()` loads in Node under the DOM stub and returns the real brand values.
- **The six drafted builders execute and emit branded HTML.** `node scripts/pdf/verify-datasets.mjs`
  runs them with no dependencies installed and reports per-export table/row/gap counts. Measured row
  counts match the data: 20 Eden building levels, 143 specialty Honor levels (41 explicit
  `not supplied` gaps), 13 siege structures, 16 tiles + 21 specialty ranks, 7 DM milestones, 6 slots.
- **The layout was rendered and reviewed by eye** (`tmp/pdf-layout-check.png` in the main checkout).
  Header, KPI tiles, CSS bars, the 20-row table with a totals row, and the discount table all render
  correctly with the brand line, "About this data", and credits present.
- Playwright `page.pdf()` produces a valid `%PDF-1.4`; a full-page table measured 1 page / 57 KiB.
- All written `.mjs` files pass `node --check` and `prettier --check`.

**Unproven** — every one of these needs running before the PR is real:

- `scripts/pdf/lib/render.mjs` has **never been executed**. Import paths and the `page.pdf()` option
  combination (especially `displayHeaderFooter` plus custom margins plus `preferCSSPageSize: false`)
  are untested. The footer band is the most likely thing to need adjusting, since Chromium clips
  footer content that exceeds the bottom margin.
- `scripts/pdf/lib/codex.mjs` has never been run against `research-costs.txt`, so the pipe-limit split
  and the nested `p` column are unverified in practice.
- No PDF has been produced by this code. The 57 KiB figure came from a separate throwaway PoC.
- Size budget impact is **estimated, not measured**. Do not copy the figures in the Cost section into
  `scripts/check-size.mjs`; measure them.
- The eight unwritten normalizers are where most of the remaining risk sits.

### A bug this loop already caught

The first execution of `verify-datasets.mjs` failed all six builders: `loadSiteModule` resolved paths
relative to `env.mjs`, so `'../../js/…'` landed in `scripts/js/`. It now resolves site modules from the
repository root and callers pass `'js/eden-operations-data.js'`. Worth knowing because the same
mistake is easy to reintroduce.


## Next steps, in order

1. **Get dependencies installed** (see environment notes) and run
   `node scripts/pdf/build.mjs` — which does not exist yet — so first write the manifest and entry:
   - `scripts/pdf/manifest.mjs`: array of `{ id, filename, build }` where `build` is the async function
     from a dataset module.
   - `scripts/pdf/build.mjs`: for each manifest entry call `build()`, then
     `renderDocument({ branding, ...result })`, then hand the jobs to `renderPdfBatch(jobs, { outputDir })`
     in `scripts/pdf/lib/render.mjs`. `outputDir` should be `dist/downloads`. Preserve
     `renderPdfBatch`'s behaviour of one shared browser across all exports.
2. **Execute the two draft dataset modules first** and fix whatever breaks. Eden and DM are the best
   starting point because their data is complete.
3. Write the remaining 8 normalizers (research, medals, towers, Eden map, heroes, skins, artifacts,
   combos).
4. Wire into `package.json` `build`: insert `node scripts/pdf/build.mjs` **between `vite build` and
   `node scripts/post-build.mjs`**. Do not put it before `vite build` (no `dist` yet) or after
   `minify-built-css.mjs` (too late for the size check to see the files).
5. `downloads.html` + registration: `vite.config.js` `input`, `scripts/update-build-metadata.mjs`
   `entryHtmlFiles`, a `routeCssBytes` entry in `scripts/check-size.mjs`, a page-contract test, and an
   entry in `tests/production-smoke.spec.js`'s page list.
6. Measure and raise `deployFileCount`, `totalMediaBytes`, `totalDeployBytes` with ledger comments.
7. Tests, then render the PDFs to PNG and review the layout.

## Data shapes — already inspected, do not re-derive

Field names below were confirmed by executing the modules, not read off docs.

`js/eden-operations-data.js`

- `BUILDING_UPGRADE_COSTS` = `{ workshop, fortress, ac1, ac2, ac3, ac4 }`, each an array of **20**
  numbers where index `i` is the cost to reach **level `i + 1`**; index 0 is `0` (level 1 is free).
  Confirmed by the discount maths in `tests/unit/eden-operations-model.test.mjs`: `685 × (1 − 0.27)`
  rounds up to 501.
- `BUILDING_DISCOUNTS` = `[{ id, rate, label }]` × 4 (`0, 0.27, 0.36, 0.56`).
- `BUILDING_HONOR_YIELDS` — every value `null`, `status: 'not-supplied'`. Render as a gap.
- `TILE_LEVELS` = `[{ level, loyalty, resistance, influence, honor }]` × 16.
- `EDEN_STRUCTURES` = `[{ id, group, level, occupation, factionPoints, loyalty, durability,
damageLoyalty, damageDurability, attackers, support, bannerAttackers, bannerSupport }]` × 13.
  `level` is `null` for some rows (e.g. `stronghold`).
- `SPECIALTY_HONOR_LEVELS` = `[{ level, honor, cumulative, cumulativeStatus, status }]` × 143.
  `honor` and `cumulative` are `null` for levels **101–110**; render `not supplied`, never interpolate.
- `SPECIALTY_ROUTE_MILESTONES` = `{ green: [...], blue: [...], red: [...] }`, each
  `{ id, name, critical, essential, advanced, summary, caution? }`. `advanced` is `null` on all three
  red routes.
- `SPECIALTY_PRESETS` = `[{ id, name, tone, critical, essential, advanced, routeOrder[], summary }]` × 4.
- `BLUE_LOYALTY_SPECIALTY` = `[{ rank, specialtyPoints, extraLoyalty }]` × 21.
- `SPECIALTY_DATA_GAPS` = array of prose gap strings.

`js/material-planner-model.js`

- `DM_ENHANCE_MILESTONES` = object **keyed by level string** (`'0','5','10','11','15','20','25'`) →
  `{ superDragonCore, exoticCrystal, dragonCrystal }`. Values are cumulative from +0 for **one piece**;
  a set is 6×. Only 7 points exist on a 26-level curve — label intermediates as floored, do not
  interpolate. `DM_ENHANCE_LEVELS` = `[0,5,10,11,15,20,25]`, `DM_ENHANCE_RESOURCE_KEYS` = the 3 keys.
- `DM_ROUTES` = `{ gold, purple, blue }`, each `{ id, normalTier, dmPieceResources, perPiece, stages[] }`
  where `stages` is `[{ tier, count }]`.
- `DM_SLOT_RECIPES` = `{ slot: { archers, footmen, cavalry } }`, 6 slots.
- `DM_MATERIAL_STOCKPILES` = `{ tier: { setId: [4 numbers] } }` for tiers `gold|purple|blue` and sets
  `ranger|cavalry|dreadnaught`. **The 4 numbers are positional and unnamed in this module.** The names
  live in `js/material-calculator.js` `NORMAL_MATERIALS` (which cannot be imported — see below), so
  `datasets/dm.mjs` carries a `SET_MATERIALS` map mirroring it with a comment. Each set uses *different*
  material names, which is why the stockpile renders as one table per set rather than one shared table.
- `DM_NORMAL_GEAR_DRAGONITE_PER_ITEM` = `{ blue: 140, purple: 696, gold: 17300 }`.
- `DM_TIER_IDENTITIES` gives tier display labels/ranks; `DM_EQUIPMENT_PRIORITY` and `DM_PRESETS` exist.

`js/heroes-data.js` — `allHeroesData` × 89, each `{ name, season, Type, State, imageUrl, releaseSeason? }`
only. `season` ∈ `S0 S1 S2 S3 S4 X1 X2 X8 X10 X12`; `State` ∈ `Free | Paid`; `Type` ∈
`Cavalry | Archers | Footmen | All`. **No stats, no rarity, no faction.** `releaseSeason` exists on
only 11 records, so it is not a usable axis.

`js/skins-db.js` — `heroSkins` keyed by hero name, **23 keys, exactly one skin each**.
`SKIN_TYPES` × 9, `SKIN_TIERS` × 3 with verified `star1To2.items` / `star2To3.items` / `maximizeTotal`.
22 of 23 skin records are `detailsStatus: 'pending'` with zeroed `bioAttributes`, so a with-skin vs
without-skin **stat** table is possible for King Arthur only.

`js/specialization-towers-v2-data.js` — `SPECIALIZATION_COLUMNS` keyed `1..8`, each
`{ name, researches[4], totalCost, unlockSeason }`; `SPECIALIZATION_RESEARCH` keyed by id, each
`{ id, name, cost, sequence, column, nodes[], passiveSkill, skillMilestones }`.
`SPECIALIZATION_TROOP_MEDAL_EVIDENCE` = sections of
`{ tower, troop, title, complete, rows: [{ sourceRow, name, costs[] }], knownCostTotal, researchId }`.

`database/codex/research-costs.txt` — pipe-delimited, **1,036 data rows / 36 trees**, 16 columns; the
trailing `p` column itself contains `|`, so split with a column limit and re-join the remainder
(`scripts/pdf/lib/codex.mjs` does this). Only 184 rows carry `timeSec` and 182 carry `gems`.
Several other codex datasets are header-only stubs — `readCodexDataset` returns zero rows for them, so
guard against rendering empty tables.

## Blocking dependency: PR #216 — still open

`gh-pages` currently ships **derived** medal totals. Columns II–VI of
`js/specialization-towers-v2-data.js` are exact 2^k scalings of column I:

```
gh-pages:  15,647  31,294  62,588  125,176  250,352  500,704  160,696  223,382  = 1,369,839
PR #216:   15,647  26,794  52,191   69,782   71,854   92,662  164,461  230,248  =   723,639
```

PR #216 (`codex/specialization-sheet-data`, now retitled 16.5.0) replaces these with the community
workbook's real per-node numbers and adds towers IX–X, which `gh-pages` has no node data for.

Two consequences:

1. **The medals PDF must not be generated from `gh-pages` data as-is** — it would publish wrong totals
   to the community. Either land #216 first or stack this branch on it.
2. On `gh-pages` today, `SPECIALIZATION_TROOP_MEDAL_EVIDENCE.length === 12` sections with 3 marked
   `complete: false`. After #216 it is 120 sections / 2,745 rows / 2,985 per-level costs. The
   normalizer must read whatever is present and mark incomplete sections rather than assuming 120.

**As of this writing #216 has not merged** (`mergedAt: null`, `mergeStateStatus: UNSTABLE`) and a CI run
was in progress on its branch. Its last completed run failed **6 browser smoke tests** in the
specialization area — `tests/app-smoke.spec.js:1498`, `:1570`, `:1614`,
`tests/p1-specialization-contrib.spec.js:3`, and `tests/p1-specialization-towers-v2.spec.js:120` at two
viewports (failing inside `expectHeaderMetadataVisible`, `p1-specialization-towers-v2.spec.js:44`).
Those look like stale copy/assertions after the medal totals changed. **Before "doing #216", re-check
whether that lane already fixed them** — a fresh run may have superseded it.

## Environment notes for whoever picks this up

- **The worktree at `.worktrees/pr218-base` has a broken/incomplete `node_modules`.** Two `npm ci`
  attempts stalled partway (614 packages, `@playwright/test` never materialised) and the task was
  cancelled. Clear it and reinstall: `rm -rf node_modules && npm ci`.
- **Local Chromium revision mismatch.** `D:\Extra_C\Caches\playwright` holds `chromium-1243`,
  but the (stale) Playwright in the main checkout wants `chromium_headless_shell-1228`, so
  `chromium.launch()` fails locally with "Executable doesn't exist". Two ways forward: install the
  matching browser (`npx playwright install chromium` from the repo whose lockfile you are using), or
  for local iteration only, launch a system channel (`chromium.launch({ channel: 'chrome' })` — Chrome
  and Edge are both present on this machine). **Do not ship the `channel` option** — CI installs
  Playwright's own Chromium on Linux and has no Google Chrome.
- **Lint could not be run.** The main checkout has eslint 8.57.1, but `gh-pages` moved to **eslint 10
  with a flat `eslint.config.js`**, which 8.x cannot read. `scripts/**/*.mjs` is inside the lint glob,
  so `npm run lint` must be run against the real dependency set before this is trusted. Prettier was
  available (3.8.4) and the written files are formatted; note `scripts/pdf/**` is **not** in the
  `format:check` file list, only `lint` covers it.
- **Do not trust a local `npm run data:check`** while the working tree is not at `gh-pages` — it walks
  art assets on disk and will report on whatever branch you are standing on.
- The measurement / PoC artefacts live in the main checkout's gitignored `tmp/`
  (`pdf-poc.mjs`, `pdf-poc-heroes.pdf`, `pdf-poc-shot.png`) — useful as a reference for the
  `page.pdf()` call and for what the output looked like. They are not part of the PR.

## What "done" looks like

- `npm run build` emits every catalog PDF into `dist/downloads/` with the real brand line on each page.
- `npm run check:fast` passes; `npm run size:check` passes with the raised, measured budgets.
- The new hub page is reachable, listed in the smoke-test page list, and every download link resolves.
- Each PDF has been rendered to PNG and read by eye for column overflow and page-break problems.
- The medals export is built from post-#216 data, or the branch is stacked on #216.


