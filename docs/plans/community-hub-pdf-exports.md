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
| 1   | `roc-research-costs.pdf`              | 1,036 rows / 36 trees, medals + gems + time          | done, 63 pp |
| 2   | `roc-unit-specialisation-medals.pdf`  | Per troop × tower I–X, per-level and cumulative      | done, partial data — see #216 |
| 3   | `roc-specialisation-towers.pdf`       | 8 columns × 4 researches, nodes, legion skills       | done  |
| 4   | `roc-eden-honor-building-costs.pdf`   | 6 buildings × 20 levels + discount tiers             | done  |
| 5   | `roc-eden-specialty-honor-levels.pdf` | Levels 1–143 + route milestones + presets            | done  |
| 6   | `roc-eden-siege-structures.pdf`       | 13 structures, full siege stats                      | done  |
| 7   | `roc-eden-tile-levels.pdf`            | 16 tiles + Blue Loyalty specialty                    | done  |
| 8   | `roc-eden-map-structures.pdf`         | 1,729 structures across 3 datasets                   | done  |
| 9   | `roc-dragon-master-enhancement.pdf`   | Advancement costs to +25                             | done  |
| 10  | `roc-dragon-master-crafting.pdf`      | Routes, recipes, stockpiles, dragonite rates         | done  |
| 11  | `roc-heroes-by-season.pdf`            | 89 heroes × 10 seasons, free/paid, with/without skin | done  |
| 12  | `roc-skin-catalogue.pdf`              | 23 skins, 3 tiers, verified star-up costs            | done  |
| 13  | `roc-artifacts.pdf`                   | Sword of Judgment 33 + Redemption Grail 32 nodes     | done  |
| 14  | `roc-combos-and-counters.pdf`         | 210 combos + 19 countered targets                    | done  |

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

---

# Implementation status

**Implemented and verified locally. The remaining verification is CI's.**

## What is in this PR

| Piece                                                       | State                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| Plan, locked owner decisions, data-shape reference           | Done                                                                   |
| `scripts/pdf/lib/env.mjs`                                    | Done — DOM stub + real branding module                      |
| `scripts/pdf/lib/layout.mjs`                                 | Done — print layout, tables, KPIs, CSS bars                 |
| `scripts/pdf/lib/render.mjs`                                 | Done — Chromium → PDF, branded footer with page numbers      |
| `scripts/pdf/lib/codex.mjs`                                  | Done — pipe-delimited codex parser                          |
| `scripts/pdf/datasets/*.mjs` — all 14 builders               | Done                                                          |
| `scripts/pdf/manifest.mjs`, `scripts/pdf/build.mjs`          | Done — catalogue + entry, `--only` / `--out` flags           |
| `scripts/pdf/verify-datasets.mjs`                            | Done — runs every builder with no dependencies installed     |
| `downloads.html`, `js/downloads.js`, `css/downloads.css`     | Done — hub page, reads the generated manifest                |
| Build wiring                                                 | Done — `vite build` → `scripts/pdf/build.mjs` → `post-build` |
| Registrations                                                | Done — vite `input`, `update-build-metadata`, `check-version-consistency`, `check-size` route budget, production smoke page list |
| Size budget raises                                           | Done — `totalMediaBytes` 20,102 KiB, `totalDeployBytes` 33,384 KiB, `deployFileCount` 751 |
| Tests                                                        | Done — `tests/unit/pdf-exports.test.mjs`, 10 tests, all passing |

## Verified by actually running it

- **All 14 PDFs generate.** `node scripts/pdf/build.mjs` produces real vector PDFs, **1,258.7 KiB
  total**, 128 pages. Largest is `roc-research-costs.pdf` at 357.0 KiB / 63 pages; everything else is
  53–103 KiB. All are well under the 4 MiB single-file guard.
- **`node --test tests/unit/pdf-exports.test.mjs` → 10/10 pass**, including the builder-level
  assertions and the dist-level check that every manifest entry is a real `%PDF-` file of sane size.
- **`npm run version:check` passes** with `downloads.html` added to the version surface list.
- **Branding is present and correct.** Page-footers carry `Hero Combo Creator — VTS 1097 v16.0.19 ·
  https://roc-vts.com` plus `Page X of Y`; the closing "About this data" block carries the generated
  date, the dataset revision and all seven source credits. Verified with `pdftotext` on the emitted
  files, e.g. research shows `revision codex-2026-09-02, current` and the Eden map shows
  `revision eden-payload-2026-09-22`.
- **Layout was reviewed page by page** from rasterised PNGs: header block, KPI tiles, bar
  infographics, and the wide tables. Specifically confirmed: the 7-column research table wraps long
  medal ladders without overflow, the 13-column siege table fits, table headers repeat on
  continuation pages (checked at page 30 of 63), and `not supplied` gaps render in amber italic rather
  than being silently dropped.
- **`downloads.html` measures 13.3 kB of initial CSS**, inside its 40 KiB ceiling.
- **The measured artifact with the PDFs is 748 files** (`deployFileCount` budget raised to 751,
  keeping three of headroom, matching this file's convention).

## What is NOT verified locally

- **`npm run build` does not complete in this environment**, and it is worth saying exactly why so
  nobody misreads the CI result. The local `node_modules` was corrupted by two `npm ci` runs killed
  midway, which left 21 packages partially extracted (directories present, files missing). `npm
  install` skips a package whose directory already exists, so it never repaired them. The visible
  symptoms were misleading: first `Rolldown failed to resolve import "@firebase/firestore"` (its
  `dist/index.esm.js` was missing while the `.map` was present), then a `caniuse-lite`
  `MODULE_NOT_FOUND`. Deleting the broken directories and reinstalling repaired the Firebase and CSS
  chains, and the build then got all the way through `vite build` and the PDF step — which is how the
  artifact sizes above were measured. **This is a Windows npm/file-locking failure, not a code
  defect**; `npm ci` succeeds on the Linux runners both workflows use.
- **`scripts/check-size.mjs` reports four failures, all pre-existing and environmental**, not caused
  by this change: `admin.html` desktop 687.1 > 684.0, `admin.html` mobile 814.1 > 786.0, and
  `eden-x1.html` / `eden-x2.html` mobile 790.9 > 761.0. Evidence they are not ours: `dist/admin.html`
  links no downloads-related stylesheet at all (checked directly), and this branch adds no CSS to
  those routes. The cause is that a plain `npm run build` omits the production build environment —
  `verify:deploy` runs `build-env:check && admin-auth:inject` first, which changes CSS composition.
  The three budgets this PR actually raised all pass.
- **`npm run lint` was not run.** `gh-pages` uses **eslint 10 with a flat config**; this environment
  only had eslint 8, which cannot read it. `scripts/**/*.mjs` is inside the lint glob, so
  `scripts/pdf/**`, `downloads.html`, `js/downloads.js` and the new test have not been linted.
  Prettier was available and every new file is formatted. **Treat lint as the first thing to check in
  CI.**
- Only the PDF-level assertions in the new test are conditional on `dist/` existing; the builder-level
  assertions run anywhere.

## Next steps

1. Run `npm run check:fast` (or `npm run check`) on a healthy checkout and fix any lint findings.
2. Confirm the measured artifact numbers against CI's production build and adjust the three raised
   budgets if CI disagrees — the ledger comments in `scripts/check-size.mjs` name the figures used.
3. Re-check the four route-CSS budgets above on a build that includes the production env. If they fail
   there too, they are a genuine pre-existing regression on `gh-pages` and deserve their own PR rather
   than being folded into this one.
4. **The medals export is still built from un-merged data.** See the #216 note below.

## Environment notes for whoever picks this up

- **The worktree is at `D:\hcc218`**, not under the repo's `.worktrees/`. That is deliberate: the
  original `.worktrees/pr218-base` path was 63 characters before `node_modules`, and npm could not
  extract deep dependency trees under it. Keep new worktrees on a short path.
- **To repair a corrupted `node_modules` on Windows**: delete the broken package directories and
  re-run `npm install`. `npm ci` will not recover, because its cleanup step fails with `ENOTEMPTY`
  while antivirus or a file watcher holds handles. `npm install --force` alone does nothing, since
  npm treats an existing directory as installed.
- **A partially-extracted package can look fine.** Check that entry files exist, not just that the
  directory does; a missing `.js` next to a present `.js.map` in the same folder is the tell.
- `chromium.launch()` needs a browser matching the installed Playwright revision. If it reports a
  missing executable, run `npx playwright install chromium` from the repo whose lockfile you are
  using. Never ship `chromium.launch({ channel: 'chrome' })` — CI runners have no Google Chrome.
- `scripts/pdf/verify-datasets.mjs` runs every builder **without `node_modules`** and writes HTML
  previews to `scripts/pdf/.preview/` (gitignored). It is the fast loop for layout work.

## Blocking dependency: PR #216 — still open

`gh-pages` still ships **derived** medal totals. Columns II–VI of
`js/specialization-towers-v2-data.js` are exact 2^k scalings of column I:

```
gh-pages:  15,647  31,294  62,588  125,176  250,352  500,704  160,696  223,382  = 1,369,839
PR #216:   15,647  26,794  52,191   69,782   71,854   92,662  164,461  230,248  =   723,639
```

`SPECIALIZATION_TROOP_MEDAL_EVIDENCE` is also only **12 sections with 3 marked `complete: false`** on
`gh-pages`, versus 120 sections / 2,745 rows after #216.

`roc-unit-specialisation-medals.pdf` is therefore generated from partial data today. **The export
handles this honestly rather than publishing wrong numbers**: it reads only the workbook evidence
(the per-node record), never the derived planner column totals, and its coverage table marks each
un-transcribed tower as "No data" with an explicit callout saying the transcription is in progress.
Committing the export would not be harmful, but for a community handout it is better to **land #216
first or stack on it** — after which the same generator picks up the complete data with no code change.

**As of this writing #216 has not merged** (`mergedAt: null`, `mergeStateStatus: UNSTABLE`) and a CI
run was in progress on its branch. Its last completed run failed 6 browser smoke tests in the
specialization area. **Check whether that lane already fixed them before "doing #216".**

## What "done" looks like

- `npm run check` passes on a healthy checkout, including lint.
- `npm run build` emits all 14 PDFs into `dist/downloads/`.
- The raised budgets are confirmed or re-measured against CI's production artifact.
- The hub page is reachable at `/downloads.html` with every link resolving.
- The medals export is built from post-#216 data, or the branch is stacked on #216.
