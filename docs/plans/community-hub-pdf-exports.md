# Community Hub — Zero-Branding PDF Exports

Status: plan, awaiting owner decisions before implementation.
Target: PR #218. Base: `origin/gh-pages` (16.0.19).

## Goal

Make the site a community hub by publishing **one-click downloadable, shareable PDFs** of every
game-data breakdown we already hold, with **no site branding** on them (no logo, no `roc-vts.com`,
no `VTS 1097` mark, no app version), so any player or Discord can redistribute them freely.

## What is already verified

The pipeline was proven end-to-end on this branch before writing this plan (throwaway PoC under
`tmp/`, not committed):

1. **Node can import the site's own data modules directly.** Spot-checked 9 modules: `js/tech-db.js`,
   `js/heroes-data.js`, `js/eden-operations-data.js`, `js/skins-db.js`,
   `js/specialization-towers-v2-data.js`, `js/material-planner-model.js`, `js/throne-buffs-data.js`,
   `js/artifact-db.js` all import cleanly. Only `js/state.js` fails (touches `document`).
   **No data duplication is needed** — the PDF generator reads the same modules the site renders.
2. **Playwright Chromium can print real PDFs.** `page.pdf({ format: 'A4' })` produces a valid
   `%PDF-1.4`, vector-text, selectable PDF.
3. **Cost is small.** A full-page roster table rendered to **1 page / 57 KiB** with all four branding
   probes (`roc-vts`, `VTS 1097`, `Hero Combo Creator`, `hero-combo`) absent.
4. **Chromium is already present in both shipping pipelines.** Both `.github/workflows/ci.yml` and
   `.github/workflows/deploy.yml` run `npx playwright install --with-deps chromium` before
   `npm run verify:deploy`, and `@playwright/test` is already a devDependency. **No new dependency.**

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

## The branding question (needs an explicit owner decision)

The repo's export system is deliberately the **opposite** of zero-branding:
`js/export-branding.js` stamps site name, logo, URL, app version and **7 source credits** onto every
export, and `tests/unit/export-branding.test.mjs` asserts all 7 credits are present.

- **Site marks are safe to strip.** A new render path that simply never calls `drawCanvasFooter()` /
  `csvFooterLines()` removes the logo, `VTS 1097`, `roc-vts.com` and the version, without touching that
  module or its test.
- **The source credits are not just branding.** The numbers are community work with named provenance
  recorded in the data files themselves — DonPablone, Raven G / riseofcastles.net community, Ivan &
  CrazyDD / ΜΟΛΩΝ ΛΑΒΕ (Unit Specialization workbook), DrThunder (Eden loyalty playbook), l96.app. The
  repo protects this attribution on purpose, and `assertNoForbiddenWatermarks` even *throws* on the
  third-party token `DONPABLONE`.

**Recommendation:** strip every site mark, keep one compact `Sources:` line at the foot of each PDF.
This satisfies "shareable without branding on top of it" while not stripping other people's credit.
If the owner wants credits gone too, that is a rights call, not a design one, and should be explicit.

## Proposed export catalog

Filenames carry no site branding either, so the file itself is shareable.

| # | File                                         | Contents                                              |
| - | -------------------------------------------- | ----------------------------------------------------- |
| 1 | `roc-research-costs.pdf`                     | 1,036 rows / 36 trees, medals + gems + time           |
| 2 | `roc-unit-specialisation-medals.pdf`         | Per troop × tower I–X, per-level and cumulative       |
| 3 | `roc-specialisation-towers.pdf`              | 8 columns × 4 researches, nodes, legion skills        |
| 4 | `roc-eden-honor-building-costs.pdf`          | 6 buildings × 20 levels + discount tiers              |
| 5 | `roc-eden-specialty-honor-levels.pdf`        | Levels 1–143 + route milestones + presets             |
| 6 | `roc-eden-siege-structures.pdf`              | 13 structures, full siege stats                       |
| 7 | `roc-eden-tile-levels.pdf`                   | 16 tiles + blue-loyalty specialty                     |
| 8 | `roc-eden-map-structures.pdf`                | 1,729 structures across 3 datasets                    |
| 9 | `roc-dragon-master-enhancement.pdf`          | Advancement costs to +25                              |
| 10| `roc-dragon-master-crafting.pdf`             | Routes, recipes, stockpiles, dragonite rates          |
| 11| `roc-heroes-by-season.pdf`                   | 89 heroes × 10 seasons, free/paid, with/without skin  |
| 12| `roc-skin-catalogue.pdf`                     | 23 skins, 3 tiers, verified star-up costs             |
| 13| `roc-artifacts.pdf`                          | Sword of Judgment 33 + Redemption Grail 32 nodes      |
| 14| `roc-combos-and-counters.pdf`                | 210 combos + 19 countered targets                     |

Plus simple infographics on the hub page and as PDFs: the unit-specialisation medal curve (15,647 →
340,007 per tower, which makes the tier-VII jump obvious at a glance), heroes per season stacked by
free/paid, DM cumulative resource curves to +25, and the Eden specialty-honor curve.

## Implementation sequence

1. `scripts/pdf/` — dataset normalizers (Node, one per source) + HTML/CSS templates + the Chromium
   renderer. Assert every dataset's row count in the normalizer so a silent data change fails loudly.
2. Regenerate PDFs inside `npm run build`, after `vite build` and before `scripts/post-build.mjs`, so
   `dist/downloads/` exists before the size check and the service-worker manifest walk. PDFs are *not*
   precached (the collector matches only `css|js|webp|png|webmanifest`), which is correct for payloads.
3. `downloads.html` hub — grouped cards, file size, row count, last-built date, one click per file.
4. Budget raises with ledger comments, measured not guessed.
5. Tests: a `tests/unit/pdf-exports.test.mjs` contract (every PDF in the manifest exists in `dist`,
   is a valid `%PDF-` header, contains **no** site-branding token, and keeps the `Sources:` line), a
   page-contract test for `downloads.html`, and the rendered-content gate below.

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

## Decisions needed from the owner

1. **Credits:** strip site branding and keep a `Sources:` line (recommended), or remove credits entirely?
2. **Medals sequencing:** land PR #216 first, or stack this branch on it? (Otherwise the medals PDF
   publishes the 2^k-derived totals.)
3. **Locales:** English-only PDFs (recommended — 13 locales would mean 13× the files and budget), or a
   second language?
4. **Castle building costs:** locate the external source, or drop that export?
5. **Budget raise:** approve ~750 files / ~21,000 KiB media / ~34,500 KiB deploy.
6. **Scope:** ship all 14 in one PR, or land the highest-value few first (research, medals, heroes,
   DM, Eden honor buildings)?
