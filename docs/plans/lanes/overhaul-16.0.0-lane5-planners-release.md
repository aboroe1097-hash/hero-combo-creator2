# 16.0.0 Overhaul — Lane 5: Planners, Exports & Release

> **Historical record — v16 planners/export lane.** Reviewed for documentation routing on 2026-09-05.
> Research and progression work shipped, but tests alone do not prove every proposed adapter or estimator is connected to a UI. The footprint audit identified several isolated modules for explicit keep/integrate/retire review.
> Original content below is retained as dated evidence, not current release instructions.

**Current starting points:** [js/research-planner-model.js](../../../js/research-planner-model.js) · [docs/repository-maintenance.md](../../repository-maintenance.md) · [Documentation index](../../README.md).


Status: proposal (rev 2, 2026-09-02). Lane: T1 heavy. Mode: proposal-only —
this document is the deliverable; no code is modified in this lane step.
Owns commit-spine commits 10–12 (second half) and 13, per
`docs/plans/overhaul-16.0.0.md`. Rev 2 folds in T0 review: R1 (re-anchored the
Eden/spec-tree adapter to real symbols), R2 (explicit row;col → node-id
relation transform for the lane-3 contract), R3 (export branding composed from
`js/seo.js`, no hardcoded site string).

## 1. Scope & goal

Ship, on `codex/overhaul-16-0-0`:

1. **Research Cost & Progression Planner** (A3) — absorbs Lofty/T10, unifies
   min-unlock vs 100% path costing with per-node trust badges.
2. **Shared specialty preset engine** (A4) — one engine for towers, legacy Eden
   trees, class cards, and the Lofty reset; concepts only from L96 pages, zero
   code copied.
3. **Castle Development Planner + Eden stamina projection** (A4/A5) — including
   the shareable alliance operation card and the gift-level estimator hard rule.
4. **Export + branding/watermark kit** (A7) — `js/export-branding.js` +
   `js/codex-export.js`, applied **retroactively** to combo PNG, throne buffs
   PNG, hero-atlas CSV (and wrapping battle-sim exports) so we do not ship two
   export families.
5. **Release metadata commit** (spine 13) — every `version:check` surface,
   15.0.15 → 16.0.0, full-gate + firebase:preview runbook, firestore rules
   deploy coordination with lane 2.

Hard constraints inherited from the master plan:

- **Route CSS/JS budgets are the binding constraint** (`scripts/check-size.mjs`:
  per-route `routeCssBytes`, `totalDeployBytes` 32,100 KiB, `deployFileCount`
  704). Lane 5 adds **no new routes** and **no eager CSS/JS**. Every planner is
  a lazily imported module inside an existing route. Lane 1 owns clearing the
  Phase 0 RED gate first; we must not re-blow it.
- **Rights rules**: facts not compilations; credit by name (DonPablone,
  FedeSack, Mtness, Raven, Cris Minime, riseofcastles.net community;
  Rustablesafe credited for concepts only — their Specialty Planner / Stamina
  calculator implementations are explicitly skipped). No logos, watermarks, or
  hotlinking; the L96 "DONPABLONE" watermark must not survive into any export.
  PDFs/graphics from DonPablone stay internal until decision D4.
- **Gift-level spend estimator hard rule**: explicitly-labelled estimate,
  stated assumption range, never attached to named players or alliances, never
  a ranking.
- **AGENTS.md workflow**: work on `codex/overhaul-16-0-0` (checkout
  `D:\Project\hcc2-overhaul16`), no direct `gh-pages` pushes, no destructive
  git, `npm run check` before the release commit, owner merges.
- **No-vision protocol (§0.7)**: any new dataset consumed here must arrive as a
  parse-validated paste-block package; unreadable source values stay `null`
  with `verificationStatus: 'unverified'` — never guessed.

## 2. Component work items (file-by-file)

### C1 — Research Cost & Progression Planner (A3)

Reuses the existing research section rather than a new route. The research tab
already lives in `index.html`, is driven by `js/app-research.js` (lazy import
from `js/app.js:180`), reads `techDatabase` from `js/tech-db.js` (29 trees,
S0–X8; node cost arrays `costs`/`wisdomCosts`/`courageCosts`/`wb_costs`/
`cm_costs`; per-tree `season`, `unlockCondition`, `primaryResource`; grid
`row`/`col`), and persists per-node levels under `vts_research_v1` with
`queueAccountSync('research')` (`js/app-research.js:36,150`). The Lofty/T10
handling today is ad-hoc type filtering at `js/app-research.js:1052,1084`
(`t.includes('lofty')`); C1 replaces that path with the unified planner.

New files:

- `js/research-planner-model.js` (pure, no DOM — mirrors
  `specialization-towers-v2-model.js` structure):
  - `resolveFamily(tree, techId)` — normalizes a `techDatabase` tree or a codex
    research-family record into one planner family shape
    `{familyId, name, season, nodes[]}` where each node carries
    `{id, name, troop, maxLevel, costs: {wisdom?, courage?, warBadges?, gems?,
    resources?, time?}, requirements: nodeId[], verificationStatus,
    sourceCredit, milestoneBenefit?}`.
  - `buildPrerequisiteGraph(family)` — input is **node-id relation lists** from
    the codex payload (see §3 transform), plus tech-db adjacency fallback
    (tech-db nodes carry no relation field today — verified); detects cycles
    and orphans (orphans are quarantined, not silently droppable). OR
    semantics: a node may declare `requirementGroups: string[][]` (any group
    satisfied = prerequisite met; payload already resolved, never raw
    positions).
  - `computeMinUnlockPath(family, targetNodeId, targetLevel)` — cheapest path
    satisfying prerequisites up to `targetLevel` (min-unlock: only required
    nodes, minimum required levels).
  - `computeFullPath(family, targetNodeId)` — 100% path (every node to
    `maxLevel`).
  - `computeRemainingCosts(family, currentLevels, plan)` — returns
    `{wisdomMedals, courageMedals, warBadges, gems, timeSeconds, resources,
    verified: boolean}` where `verified` is false if **any** node on the path
    has `verificationStatus: 'unverified'` or `'historical'` (badge contract
    from A1).
  - `listMilestones(family, plan)` — milestone benefits reached by the plan
    (from codex milestone metadata; falls back to per-node `buff` text).
  - `suggestNextBest(family, currentLevels, {metric})` — "next best research"
    presets: `cheapest-next-milestone`, `per-war-badge`, `per-wisdom`,
    `shortest-time`; deterministic tie-break (node id).
  - T9 full/min-path seeds: shipped as L96-sourced `unverified` staging data
    (see §3 lane-3 contract) — the UI must render them with the unverified
    badge and never present them as canonical.
  - X12 fixture validation: the two X12 trees from
    `docs/sources/x10-x12/x12-research-nodes.md` / `x12-research.json`
    (Defense 29 nodes / 4,998,500 WB / gameId 20005005; Charge 30 nodes /
    4,763,500 WB / gameId 20005019) are the golden path-total fixtures (see
    §5 tests).
- `js/research-planner-store.js`:
  - Storage key `vts_research_planner_v1`; snapshot schema
    `{schema: 'roc-vts.research-planner', schemaVersion: 1, savedAt,
    plans: [...]}`; parse/validate/migrate/`serialize` exactly like
    `specialization-towers-v2-store.js` (`vts_specialization_towers_v2`) and
    `battle-simulator-profile-store.js`; max JSON length guard (1 MiB);
    corrupted JSON → discarded with a logged warning, never a crash.
  - `queueAccountSync('research-planner')` on save (pattern:
    `js/material-calculator.js:266`, `js/app-research.js:150`).
- `js/research-planner-ui.js`:
  - Rendered inside the existing Research section as a sibling panel (subtab
    "Planner"), lazy-loaded from the `js/app-research.js` dynamic-import chain —
    **no new entry HTML route, no eager CSS**.
  - UI flow: family picker (season-scoped, lanes 2's X10/X12 pills appear once
    scaffolded) → target node + target level → plan mode toggle
    (min-unlock / 100%) → remaining-cost table (medals / WB / gems / time,
    each cell showing which input is verified) → milestone list → preset chips
    (`suggestNextBest`) → progress compare against saved per-node levels.
  - Trust badges: `current` / `historical` / `unverified` per node and per
    plan total, straight from `verificationStatus`.
- i18n: extend `js/i18n/research/` (13 locales: en, es, pt, de, fr, tr, ru,
  hr, id, it, kr, ar, zh) with a `planner.*` key group; register the new keys
  in `scripts/check-i18n.mjs` and `scripts/check-research-i18n.mjs` (which
  already verifies `researchMaxAll` per locale — same rigor for planner keys).
  Key fills (13 × N) delegate to DeepSeek per house rule; the en source keys
  are authored here.
- Exports: CSV / schema-versioned JSON / PNG card / print-PDF through C4
  (`js/codex-export.js`) — no bespoke export code in the planner.

Data contracts (consumed, not owned): lane 3's codex payload (gzipped
`js/codex-payload.json` + DecompressionStream loader per A1) supplies
research-costs with **node-id** requirements (`requirements` /
`requirementGroups`, already resolved from the raw row;col source — see the
§3 transform), `verificationStatus`, milestone metadata, and source credit;
`js/tech-db.js` remains the canonical tech-tree source and gains the two X12
trees (import shape: `X8_LOFTY_LEGION_COSTS` per-node key → per-level array,
`js/tech-db.js:39`) in the data commit.

### C2 — Shared specialty preset engine (A4)

One engine, four consumers. Concepts from L96's Rustablesafe-coded planners;
**zero code copied** (their implementations are deliberately skipped per the
master plan).

- `js/preset-engine-model.js` (pure):
  - Tree definition schema: `{treeId, name, nodes: [{id, name, cost: number,
    requirements: nodeId[], maxPoints}], pointsPool, checkpoints: [{id, name,
    filter}]}`.
  - `validateTreeDefinition(def)` — throws with node-id-level messages.
  - `computeAllocation(tree, nodePoints)` → totals, spent/remaining, validity
    (requirements satisfied, ≤ maxPoints, ≤ pool).
  - `applyPreset(tree, presetId)`, `listPresets(tree)`.
  - `exportPreset(tree, allocation)` → versioned share payload;
    `importPreset(tree, payload)` → validated allocation (rejects unknown
    nodes, requirement violations, oversized points — no silent clamp).
  - `compareProgress(a, b)` → per-node and per-checkpoint diff (used by
    "compare with a friend's build").
  - Checkpoints: named partial-goal filters (e.g. "first AoE unlock") reused
    across consumers.
- `js/preset-engine-store.js`: key `vts_preset_engine_v1`; saved presets +
  checkpoints; schema-versioned like C1's store; share-link codec in the
  `js/combo-share.js` style (base64url, `SHARE_VERSION`, max-length guard,
  `#preset=` hash parsing — tamper/decode failure returns null, never throws).
- Consumer adapters (each is a thin mapping layer; the consumers keep their
  existing stores as source of truth — no regression risk to the towers
  schema `roc-vts.specialization-towers` v1):
  - `js/specialization-towers-v2-preset-adapter.js` — maps
    `js/specialization-towers-v2-model.js` state
    (`getResearchSelection`/`setResearchNodes`/`SPECIALIZATION_STATE_SCHEMA`)
    to tree-definition shape; adds preset save/apply/compare/export to the
    towers UI (`js/specialization-towers-v2-app.js`) without touching its
    internal math.
  - `js/eden-preset-adapter.js` — the in-repo spec-tree renderer is
    `js/app-specialization.js` (verified; `js/eden-x1.js` contains **no**
    research/tree symbols and `js/eden-hub.js` has no tree renderer):
    `researchName` at `js/app-specialization.js:501`, `isTreeLayout` at
    `:1052`, `renderRing` at `:1304`, `renderTree` at `:1332`, dispatcher
    `renderNodeGraph` at `:1414` (dispatch at `:1419`, detail modal renders
    it at `:1500`). It consumes `SPECIALIZATION_RESEARCH` /
    `SPECIALIZATION_COLUMNS` from `specialization-towers-v2-data.js` and is
    lazy-loaded from `js/app.js:1211`. The Eden routes' datasets payload
    (`js/eden-datasets-loader.js` → `js/eden-map-data.js`) feeds the live map
    only (`catalog`/`sectors`/`overlays` — verified, no trees). Adapter maps
    those research objects to tree definitions; rendering untouched. TODO at
    implementation time: re-verify whether a distinct legacy-Eden tree dataset
    surfaces with lane 3's codex payload; until then the adapter's only
    in-repo anchor is `js/app-specialization.js`.
  - `js/class-card-preset-adapter.js` — class cards arrive as a codex dataset
    (lane 3); tree definitions generated from the payload at build time;
    `js/codex-provenance.js` gates rendering (no source/credit/capture date →
    no render).
  - Lofty reset planner — reuses checkpoints ("reset point A/B") and compare
    views; consumes the same engine, no Lofty-specific math ported from L96.

### C3 — Castle Development Planner + Eden stamina projection (A4/A5)

- `js/castle-planner-model.js` (pure):
  - Inputs: current building levels, target castle level, owned discount
    sources (class-card Architect/Builder bonuses from the codex class-cards
    dataset; research reductions from research-costs dataset), optional target
    date.
  - `computeBuildingPlan(input)` → per-building upgrade sequence with
    personalized resource + time costs; joins discounts multiplicatively with
    explicit assumption labels.
  - `findBlockers(input)` — "what blocks my next castle level" prerequisite
    walker over building → building requirements.
  - L96 building sheet enters as `verificationStatus: 'unverified'` staging
    data; **quarantined** (plan renders with badge, math excluded from
    verified totals) until the owner confirms (D3-class input).
  - `js/castle-planner-store.js`: `vts_castle_planner_v1`,
    `queueAccountSync('castle-planner')`.
  - `js/castle-planner-ui.js`: mounted inside the Eden Hub (`js/eden-hub.js`,
    A5's home) as a lazy panel; no new route.
- `js/stamina-calculator.js` — full I/O spec (authored here; the L96 broken
  `{{CODEstam}}` page is input to nothing but the "what not to do" note):
  - Inputs: `capacity` (max stamina), `currentStamina`, `regenPerHour`
    (dataset default, overridable), `ops: [{id, name, cost, desiredCount}]`,
    `startTime`.
  - Outputs: `timeToFull`, `timeline: [{at, stamina, affordableOps[]}]`,
    `perOp: [{id, firstAvailableAt, totalNeeded, capacityGaps[]}]`,
    `summary` (short copy for the operation card).
  - Deterministic pure core (`computeStaminaProjection(input)`) + thin DOM
    wrapper; unit-testable with zero timers.
  - **Shareable alliance operation card**: PNG card via C4
    (`exportPngCard`), containing the op list, timeline, and a copy-able
    `#stamina=` share URL; no player names unless the user types their own —
    never auto-attached (hard rule).
- Gift-level spend estimator (economy-* codex dataset, if it ships in A5):
  separate `js/gift-level-estimator.js` component that renders
  `estimate: {...}, assumptions: [...], source: {...}` and refuses by
  construction to accept player/alliance identifiers or rank outputs (hard
  rule enforced by a contract test — see §5).

### C4 — Export + branding/watermark kit (A7)

- `js/export-branding.js` (single source of export identity):
  - `getExportBranding()` → `{siteName: SITE_NAME, logoUrl: SITE_LOGO,
    displayName, appVersion: APP_VERSION (import from `js/state.js`),
    generatedAt, datasetRevision, verificationStatus, sourceCredits:
    ['DonPablone', 'FedeSack', 'Mtness', 'Raven', 'Cris Minime',
    'riseofcastles.net community', 'Rustablesafe (concepts)']}`.
    `SITE_NAME` / `SITE_LOGO` are imported from `js/seo.js` (single source of
    truth; `SITE_NAME = 'Hero Combo Creator'`, `SITE_LOGO` at
    `js/seo.js:5-7`). `displayName` is composed **here**, not hardcoded:
    `` `${SITE_NAME} — VTS 1097` `` (subtitle follows the `seoTitle` shape at
    `js/seo.js:12` if a full title is needed).
  - Renderers: `csvFooterLines(branding)` (comment-prefixed lines),
    `jsonMetaBlock(branding)` (schema-versioned `meta` object),
    `drawCanvasFooter(ctx, branding, {x, y, width})` (multi-line canvas
    footer with logo + site name + version + dataset revision +
    verificationStatus + source credit — the throne-buffs canvas
    (`js/throne-buffs-export.js:154-158`) and combo canvas
    (`js/app-export.js:207-213`) footer conventions merged).
  - Explicit regression rule: **no third-party logos or watermarks**; a test
    asserts the string "DONPABLONE" never appears in any generated export
    payload.
- `js/codex-export.js` (unified facade):
  - `exportCsv({columns, rows, meta, filename})` — BOM + `csvCell` escaping
    (reuse pattern from `js/app-hero-atlas.js:484-534` and
    `js/ocr-dashboard.js:7227`) + branding footer lines.
  - `exportJson({schema, schemaVersion, payload, meta})` — reuses the
    battle-sim machinery: `sanitizeForExport` (cycles throw, sensitive keys
    stripped, `js/battle-simulator-export.js:115-138`), `stableJson`,
    `schemaVersion` envelope, and a `migrateExportDocument` hook mirroring
    the v3→v4 path (`:1063-1080`).
  - `exportPngCard(renderFn, {filename})` — canvas card + `drawCanvasFooter`;
    font-ready wait from `js/throne-buffs-export.js:180-186`.
  - `exportPdf()` — **print-to-PDF only**, following the admin dashboard
    pattern (`js/ocr-dashboard.js:7916` `window.print()` + print stylesheet);
    no jsPDF dependency (budget + audit surface).
  - `shareUrl(kind, encoded)` / `parseShareUrl(kind, hash)` — generalized
    base64url hash share (pattern `js/combo-share.js`), max-length guard.
  - `copyToClipboard(text)`.
  - Filename convention: `vts-<tool>-<iso-date>.<ext>`, slugified.
- Retrofit (no second export family; consumer code keeps its i18n and layout,
  only the footer/meta layer changes):
  - Combo PNG — `js/app-export.js` `renderCombosToCanvas`/
    `downloadComboImage`/`captureElementAsImage`: footer switches to
    `drawCanvasFooter` (existing `buildComboExportCopy` from
    `js/i18n/output-copy.js` stays for labels).
  - Throne buffs PNG — `js/throne-buffs-export.js` `exportThroneWeekPng`:
    footer gains branding + credit (keep the "Generated by VTS Admin" line).
  - Hero atlas CSV — `js/app-hero-atlas.js` `exportHeroAtlasCsv`: add
    branding footer lines + source credit.
  - Battle sim — wrap, do not rewrite: `js/battle-simulator-export.js`
    already carries `schemaVersion: 4`, sanitization, and
    `source_provenance_json` in `SUMMARY_CSV_COLUMNS`; C4 only adds the
    branding `meta` where absent and keeps the v3 import path working.
  - Alliance brief CSV (`js/alliance-view-brief-export.js`) and admin
    dashboard CSV (`js/ocr-dashboard.js`): same footer convention, admin
    variant can add the admin role line.

### C5 — Release metadata commit (spine 13, last)

Exact surfaces (all verified at 15.0.15 today; regexes per
`scripts/check-version-consistency.mjs`):

| Surface | Location |
|---|---|
| package.json | `version` |
| package-lock.json | top-level `version` + `packages[''].version` |
| APP_VERSION | `js/state.js:10`, `js/admin-page.js:12`, `js/eden-x1.js:63`, `js/arcade.js:12`, `js/battle-simulator-app.js:104`, `js/specialization-towers-v2-app.js:47` |
| DEFAULT_APP_VERSION | `js/ai/tool-envelope.js:1` |
| vts-app-version meta | `battle-simulator.html:16`, `specialization-towers.html:15`, `profile.html:12`, `vtsscore.html:6` |
| public footers (`VTS 1097 … &middot; … vX.Y.Z`) | `index.html`, `admin.html`, `eden-x1.html`, `eden-x2.html`, `arcade.html` |
| maintenance label | `maintenance.html:241` (`<p class="version">v16.0.0</p>`) |
| README heading | `README.md:1` (`# Hero Combo Creator - VTS 1097 (v16.0.0)`) |
| CHANGELOG | new `## 16.0.0 - <date>` entry as the latest |
| CLAUDE.md | locale count correction 11 → 13 (spine 10–12 item, lands here) |
| build stamps | `npm run build` regenerates SW/cache metadata (`scripts/update-build-metadata.mjs`, `scripts/post-build.mjs`) — include generated changes, don't hand-edit |

Legality of 15.0.15 → 16.0.0: `check-version-consistency.mjs:131-143` — for
patch 0 / minor 0 the previous-entry cadence check computes
`expectedPrevious = null` and is skipped, so the jump passes `version:check`
(documented in master plan §0).

Release runbook (documented verbatim in the CHANGELOG-era release notes or
commit message, not the codebase):

1. `git fetch origin`; rebase `codex/overhaul-16-0-0` on latest
   `origin/gh-pages` (fixed cadence); `npm ci`.
2. Metadata edits above; `npm run version:check` first.
3. Focused loop during dev: `npm run check:fast` (version, lint, format,
   unit, i18n) + relevant Playwright smoke.
4. Release commit: full `npm run check` (adds `build`, `size:check`,
   `smoke:prod`, `smoke`) — 10–15 min matrix.
5. `npm run firebase:preview` — high-risk gate; read-only remote smoke
   (anonymous Auth/Analytics init only).
6. **Firestore rules ship separately**: `firebase deploy --only
   firestore:rules`, coordinated with lane 2 (roster name allowlist + `<= 78`
   cap, same order as `allHeroesData`, 1000-expression budget measured before
   deploy). The PR merge does **not** deploy rules.
7. Push, open/refresh PR against `gh-pages`, `deploy-verification` status
   check green, owner merges. Never push to `gh-pages` directly.

## 3. Interfaces with other lanes

- **Lane 1 (gate & theme)**: lane 5 adds no routes and no eager CSS/JS; all
  modules lazy-import behind existing entry chains (`js/app.js`,
  `js/eden-hub.js`). If C4 footer changes touch light-theme canvases, follow
  lane 1's token conventions (canvas colors are hardcoded hex today — keep
  parity with existing dark card look unless lane 1 decides otherwise).
- **Lane 2 (seasons & roster)**: planner family/season pickers consume
  `HERO_ATLAS_ALL_SEASONS` / `POPULATED_HERO_SEASONS` once scaffolded; X10/X12
  hero names may appear in planner hero filters. Firestore rules deploy
  sequencing (C5 step 6) is the shared release-order dependency.
- **Lane 3 (codex data)**: C1/C2/C3 consume the gzipped codex payload and
  `js/codex-provenance.js`. Required shapes (contract, must land before the
  consuming commits):
  - research-costs: per-node `{id, name, season, maxLevel, costs{...},
    requirements: string[] | requirementGroups: string[][],
    verificationStatus, source, credit, capturedAt, gameVersionScope}`.
    **Relation transform (required in lane 3's contract):** the raw source
    `relation` strings are **positional `"row;col"` pairs with `|`
    alternates** — e.g. `"2;2"`, `"4;2|4;6"`, `"14;2|14;4|14;6"` in
    `docs/sources/x10-x12/x12-research.json` (each node carries its own
    `position: "row;col"`). Lane 3 resolves positions to node ids at ingest
    time against the tree's position grid; the payload ships **node-id
    relations only** (`requirements` as a single list, or
    `requirementGroups` for OR semantics — `|` → separate groups). Position
    strings must never reach the planner. Trees without position/relation
    data (X12 Charge has none — verified) ship with per-node
    `verificationStatus` reflecting the gap, never guessed edges;
  - class-cards: `{classId, name, bonuses: [{kind, value, target}], ...}`;
  - building-costs + economy-*: per-level tables with the same provenance
    envelope;
  - T9 seeds explicitly flagged `unverified` (L96).
- **Lane 4 (hero UI)**: the skills 1–8 drawer feeds planner milestone
  benefit tooltips (read-only import of the drawer data contract); C4's kit is
  shared with any hero-table exports lane 4 adds.
- **All lanes**: version surfaces are touched **only** in spine 13 (C5);
  lanes 1–4 must not bump versions. New i18n keys across 13 locales are each
  lane's responsibility; `scripts/check-i18n.mjs` /
  `check-research-i18n.mjs` key lists grow in the lane that adds keys.

## 4. Tests

Unit (node --test, `tests/unit/*.test.mjs`):

- `research-planner-model.test.mjs` — golden fixtures: X12 Defense path sums
  to 4,998,500 WB, Charge to 4,763,500 WB (from
  `docs/sources/x10-x12/x12-research-nodes.md`); min-unlock ≤ full path;
  prerequisite graph cycle/orphan quarantine; unverified-node propagation to
  plan totals; `suggestNextBest` determinism; T9 seeds flagged.
- `research-planner-store.test.mjs` — schema parse/validate/migrate,
  corrupted JSON discarded without crash, 1 MiB guard.
- `preset-engine-model.test.mjs` — tree validation errors, allocation math,
  preset round-trip, import rejection (unknown node / requirement violation /
  oversized points), checkpoint compare.
- `preset-engine-store.test.mjs` + share codec — round-trip, tamper → null,
  max length.
- `castle-planner-model.test.mjs` — discount joins, blocker walker,
  unverified staging quarantine.
- `stamina-calculator.test.mjs` — projection math on fixed inputs,
  `timeToFull`, op affordability timeline; regression: no `{{CODEstam}}`-class
  placeholder ever renders.
- `gift-level-estimator.test.mjs` — hard-rule contract: output contains
  `estimate` + `assumptions`, and constructing/exporting with player or
  alliance identifiers throws (contract test, enforced by design).
- `export-branding.test.mjs` / `codex-export.test.mjs` — CSV footer lines
  present in every export family; JSON `meta` schema-versioned; canvas footer
  drawn; **"DONPABLONE" absent from all generated payloads**; sanitization
  reused (sensitive keys stripped); share URL round-trip.

Updated existing (keep green):

- `generator-export-state.test.mjs`, `output-i18n.test.mjs`,
  `share-links.test.mjs` — after C4 retrofit.
- `battle-simulator-export.test.mjs` — v3 import + v4 envelope unchanged.
- `research-v14-contract.test.mjs` — research tab wiring after planner
  subtab lands.
- `specialization-towers-v2-model.test.mjs` — towers math untouched by the
  adapter.
- i18n gates: `scripts/check-i18n.mjs` + `scripts/check-research-i18n.mjs`
  extended with the new key list (13 locales × N keys).

Playwright (smoke tier, `tests/app-smoke.spec.js` style): research tab opens
the planner; one export button per family produces a download; stamina card
share URL copies.

## 5. Budget & risk notes

- Size gate (`scripts/check-size.mjs`): planner models target ≤ ~30 KiB
  minified each; no new images (logo reused); exports are runtime-only. New
  files count against `deployFileCount` 704 (35 headroom at gh-pages) — the
  kit adds ~8 JS modules + tests; still within headroom, but verify with
  `npm run size:check` at the release commit.
- Route CSS: zero new CSS in `index.html`/`eden-*` eager bundles; planner
  styles go into lazy route chunks owned by lane 1's gate work.
- Version jump legality verified against the script (cadence check skipped
  for `.0.0`).
- Firestore rules regression risk: a bad rules deploy returns 403s across
  BoH signup — rules never ride the PR; lane 2 owns measurement and deploy.
- Export retrofit risk: wrap battle-sim exports without touching schema
  version 4 or the v3 import path; consumer i18n (`js/i18n/output-copy.js`
  REQUIRED_KEYS) untouched.
- Rights: credit lines only, no third-party watermarks, no hotlinked
  graphics in exports; D4-gated PDFs/graphics stay internal.
- Parallel-session hazard: only lane 5 writes
  `js/export-branding.js`, `js/codex-export.js`, `js/research-planner-*.js`,
  `js/preset-engine-*.js`, `js/castle-planner-*.js`, `js/stamina-calculator.js`,
  `js/gift-level-estimator.js`, and the version surfaces in spine 13; any
  collision with lanes 1–4 resolves by treating lane 5 as the sole writer of
  these paths.

## 6. Open questions

- O1 (research planner placement): subtab inside the existing Research
  section (lean) vs replacing the research browser — replacing risks the
  research contract tests and route CSS; subtab it is unless the owner says
  otherwise.
- O2 (Lofty/T10 absorption): confirm the exact Lofty/T10 entry points beyond
  `js/app-research.js:1052,1084` before spine 10; list them in the commit
  message.
- O3 (preset engine): adapter-over-towers (lean, chosen) vs native engine
  state inside towers — adapters avoid rewriting the towers schema v1.
- O4 (stamina): owner confirmation of regen-rate/capacity defaults before
  they ship as `current`; until then `unverified`.
- O5 (PDF): print-to-PDF only (lean) vs adding a PDF library — library adds
  budget + audit surface; print pattern already proven in
  `js/ocr-dashboard.js`.
- O6 (castle planner mount): Eden Hub panel (lean, A5's home) vs research
  section.
- O7 (CHANGELOG 16.0.0 entry): one entry summarizing workstreams (lean) vs
  per-commit entries.

## 7. Execution checklist

1. [ ] Confirm `codex/overhaul-16-0-0` clean and current in
       `D:\Project\hcc2-overhaul16`; verify lane 1 gate status and lane 3
       codex payload shape before starting C1 model commits.
2. [ ] C1: `research-planner-model.js` + model tests (X12 golden sums) —
       spine 10.
3. [ ] C1: store, UI, i18n en keys, DeepSeek 13-locale fill, check-i18n
       registration, account-sync wiring — spine 10.
4. [ ] C2: `preset-engine-model.js` + store + share codec + tests — spine 11.
5. [ ] C2: towers adapter, Eden adapter, class-card adapter (behind lane 3
       payload), Lofty reset checkpoints — spine 11.
6. [ ] C3: `castle-planner-*`, `stamina-calculator.js`,
       `gift-level-estimator.js` + hard-rule contract test — spine 11/12.
7. [ ] C4: `export-branding.js` + `codex-export.js` + tests — spine 12.
8. [ ] C4 retrofits: combo PNG, throne PNG, atlas CSV, battle-sim wrap,
       alliance/admin CSVs; keep `generator-export-state`,
       `battle-simulator-export`, `output-i18n`, `share-links` tests green —
       spine 12.
9. [ ] C5: all 15+ version surfaces → 16.0.0; CHANGELOG entry; CLAUDE.md
       locale fix; `npm run version:check` — spine 13 (last).
10. [ ] `npm run check` (full matrix) green; `npm run firebase:preview`
        read-only smoke green.
11. [ ] Coordinate `firebase deploy --only firestore:rules` with lane 2;
        measure the 1000-expression budget first.
12. [ ] Push; PR against `gh-pages`; `deploy-verification` green; owner
        merges.
