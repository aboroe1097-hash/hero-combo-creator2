# Lane 3 — Codex Data Platform (commit-spine commits 7–9)

Status: proposal rev 2 (2026-09-02). Mode: proposal-only — this file is the sole
deliverable; no code is modified. Parent: Codex T0 orchestrator, 16.0.0 Overhaul,
branch `codex/overhaul-16-0-0` (worktree `D:/Project/hcc2-overhaul16`).

Rev 2: T0 review of rev 1 ACCEPTED with 3 blocking revisions + 2 minor, all applied
below (R1 prerequisite transform, R2 Lane-2 sequencing, R3 duel-matrix pending,
R4 heroes-codex `access` field, R5 real capture dates). Open questions O1–O6 ratified
as leaned.

---

## 1. Scope & goal

Lane 3 builds the **data substrate** for Workstream A: the `database/codex/` source
layout, the gzip+base64 build pipeline that produces `js/codex-payload.json`, the lazy
loader, and the provenance/alias/version contracts that gate rendering. It delivers
commit-spine commits **7–9**:

- **Commit 7** — commit the `work/l96-codex-sources/` + `work/roc-research-sources/`
  archives into `database/codex/` (as independently-schemaed pipe-delimited sources,
  never raw mirrors) plus the master plan (already landed in Phase 0).
- **Commit 8** — `scripts/codex/build-codex-payload.mjs` (mirror of the eden builder),
  `js/codex-loader.js` (DecompressionStream fetch-and-cache clone), build-chain +
  post-build wiring, `js/codex-provenance.js`, alias + version model, quarantine.
- **Commit 9** — the contract tests (provenance, alias/quarantine, payload, lazy-load)
  and i18n badge keys.

Everything downstream (Lane 4 hero tables, Lane 5 planners) reads the payload through
`js/codex-loader.js` + `js/codex-provenance.js`. Nothing in this lane touches route CSS,
adds eager bytes, or changes any version surface (release metadata is commit 13).

**Hard rules restated (from the master plan):**

1. Facts, not compilations: numbers are transcribed individually into our
   independently designed schema; nobody's curated sheet is mirrored wholesale.
2. Credit by name in every dataset source block: DonPablone (L96), FedeSack,
   Mtness s177, Raven G, Ash Roe (709), riseofcastles.net community data.
3. No image URLs in ingested data (strip all `static.wixstatic.com` / `http(s)://`
   fields on ingest — text and numbers only).
4. No-vision protocol (§0.7): every source is plain text, paste-ready and
   parse-validated before execution depends on it.
5. Budgets: zero eager bytes on any route; ≤ 704 deployed files on gh-pages
   (currently 669 emitted → 35 headroom); payload loads lazily only.

---

## 2. Data layout & schemas (field-by-field)

### 2.1 Directory layout — mirrors `database/specialization/` + the eden pattern

```
database/codex/
  codex-datasets.manifest.json     # registry, mirror of eden-datasets.manifest.json
  heroes-codex.txt                 # codex metadata keyed by canonical hero name
  hero-versions.txt                # version chain rows
  class-cards.txt                  # class-card benefits (Raider/Trader landed; Farmer/Builder pending)
  lofty-costs.txt                  # Lofty per-level grid
  lofty-specialty.txt              # specialty planner reference
  research-costs.txt               # 36-tree research dataset (incl. both X12 trees)
  building-costs.txt               # main building costs (pending source)
  economy-honor-buildings.txt      # honor building costs
  economy-gift-levels.txt          # gift-level spend estimator (estimate-labelled)
  economy-war-medals.txt           # war medals / COP medals reference
  duel-matrix.txt                  # recorded duels — PENDING (R3): hero names are logo
                                   #   images in the source PDF; numbers only → zero rows,
                                   #   methodology JSON still ships (see duel-evidence/)
  combo-snapshots.txt              # dated recommendation snapshots (never rankedCombos)
  name-aliases.txt                 # alias map incl. externalGameAliases
  duel-evidence/                   # methodology/evidence JSONs (mirror tests/fixtures/battle-reports shape)
```

All `.txt` sources are **pipe-delimited** (`|`), UTF-8, first data line is the header.
Line 1 of every file is a provenance directive the builder merges into every record:

```
# source: <publication/site/person> | credit: <name(s)> | captureDate: <YYYY-MM-DD> | gameVersionScope: <S0..X24 | 16.0.0-notes> | verificationStatus: current|historical|unverified
```

Per-row overrides are allowed via a trailing `p` column holding a
`credit=...|verification=...` fragment — needed for mixed-status datasets
(`research-costs` has per-tree completeness).

### 2.2 Manifest — `database/codex/codex-datasets.manifest.json`

```json
{
  "datasets": [
    {
      "id": "heroes-codex",
      "file": "heroes-codex.txt",
      "schema": "heroes-codex",
      "status": "live",
      "defaultProvenance": {
        "source": "L96 Codex archive (work/l96-codex-sources)",
        "credit": "DonPablone",
        "captureDate": "2026-09-02",
        "gameVersionScope": "X12",
        "verificationStatus": "historical"
      }
    }
  ]
}
```

`status: live | pending` — `pending` datasets (building-costs, combo-snapshots until
sources are located) ship a header + zero rows and are hidden by the UI.

### 2.3 The provenance record (attached by the builder to EVERY record)

```
{ source, credit, captureDate, gameVersionScope, verificationStatus }
```

- `source` — where it came from (publication URL/title or archive path reference).
- `credit` — human names, comma-separated. Non-empty; build fails otherwise.
- `captureDate` — `YYYY-MM-DD` when the source was captured/transcribed.
- `gameVersionScope` — the game seasons the numbers are claimed against (e.g. `X12`).
- `verificationStatus` — `current` (matches live game today) | `historical` (was
  current, superseded; kept for Before/After) | `unverified` (staging/unconfirmed).

### 2.4 Dataset schemas (header = field names, pipe-delimited)

| file | columns | notes |
|---|---|---|
| `heroes-codex.txt` | `heroName\|firstSeenSeason\|lastSeenSeason\|role\|access\|notes\|p` | Join key `heroName`. **`access` is frozen (R4, Lane 4 contract)**: `standard\|paid\|royal` — an *access level*, not a power tier. L96's Standard/Paid/Royal maps onto this enum; the roster's own `State` (`'Free'\|'Paid'` in `js/heroes-data.js`) stays local and untouched. No other field name or enum value may be added without a contract update. |
| `hero-versions.txt` | `heroVersionId\|heroName\|effectiveFrom\|effectiveTo\|previousVersionId\|changeSummary\|sourceNote\|p` | `changeSummary` = `;`-joined fragments; empty `effectiveTo` = current version. |
| `class-cards.txt` | `cardId\|className\|benefitType\|benefitDesc\|sourceRef\|p` | Raider/Trader from `pdf_*_Raider.txt`/`Trader.txt`; Farmer/Builder rows `pending` (D3). |
| `lofty-costs.txt` | `nodeName\|costType\|maxLevel\|values\|p` | `values` = comma-joined per-level numbers (mirrors `X8_LOFTY_LEGION_COSTS` shape). |
| `lofty-specialty.txt` | `specialtyId\|name\|desc\|p` | From `txt_specialty.txt`. |
| `research-costs.txt` | `treeName\|season\|medalType\|nodeId\|nodeName\|maxLevel\|costType\|values\|totalMedals\|requirements\|requirementGroups\|p` | 36 trees from `roc_research_data.js`; per-tree `p` carries that tree's credit line (e.g. `Source: Raven G \| 4000 WB/day`). **No raw positions ship**: `requirements`/`requirementGroups` are node-id lists resolved at ingest (R1 — see §3.6). |
| `building-costs.txt` | `building\|level\|wood\|stone\|iron\|food\|timeSec\|requirement\|p` | `pending` — L96 "Main Building Costs" not yet located. |
| `economy-honor-buildings.txt` | `building\|level\|honorCost\|timeSec\|notes\|p` | From `txt_post_honor-building-costs.txt`. |
| `economy-gift-levels.txt` | `giftLevel\|spendLow\|spendHigh\|assumptionNote\|p` | **Hard rule**: explicitly-labelled estimate with stated assumption range; never attached to named players or alliances; never a ranking. |
| `economy-war-medals.txt` | `item\|source\|cost\|notes\|p` | From `txt_post_war-medals-cop-medals.txt`. |
| `duel-matrix.txt` | `duelId\|attacker\|defender\|outcome\|conditions\|methodologyRef\|p` | **`pending` (R3)** — the HeroDuels PDF renders hero names as logo images; only the numbers were extracted, so there is nothing to resolve to canonical names. Zero rows ship; `duel-evidence/methodology-heroduels.json` still ships. Goes `live` only after the names are transcribed (D3-class vision work). |
| `combo-snapshots.txt` | `snapshotId\|heroes\|date\|sourceUrl\|p` | Ingested as `recommendationSnapshot` only — never into `rankedCombos`. `pending` until dated guides are located. |
| `name-aliases.txt` | `canonicalName\|alias\|externalGame\|sourceRef\|p` | `externalGame` = game name for cross-game aliases; empty for same-game. |

### 2.5 Payload shape — `js/codex-payload.json` (committed artifact)

Outer envelope mirrors `js/eden-datasets.payload.json` exactly:

```json
{ "builtAt": "…Z", "encoding": "gzip-base64", "payload": "<base64>" }
```

Decoded inner object:

```json
{
  "builtAt": "…Z",
  "catalog": [ { "id": "research-costs", "recordCount": 1036, "status": "live",
                 "provenance": { …5 fields… } } ],
  "datasets": { "heroes-codex": [ …records, each with `p` resolved to the 5-field
                 provenance object… ] },
  "aliases": { "Jeanne d'Arc": [ { "alias": "Jeanne", "externalGame": "", "sourceRef": "…" } ] },
  "currentVersions": { "Alfred": "hv-alfred-2" },
  "quarantine": [ { "datasetId": "heroes-codex", "row": 12, "ref": "Achilleus",
                    "reason": "no-canonical-match" } ]
}
```

Every record carries the resolved 5-field `provenance` object at the same level as the
record's data (builder attaches it; the UI badge reads `js/codex-provenance.js`
helpers off this field).

---

## 3. Pipeline & build script design

### 3.1 `scripts/codex/build-codex-payload.mjs` (node, mirrors the eden python builder)

Stages, in order — any stage failure aborts the build:

1. **Read manifest** (`database/codex/codex-datasets.manifest.json`).
2. **Parse** each dataset `.txt` (pipe-delimited; skip `#` directives; header mapping;
   empty dataset files allowed only when `status: pending`).
3. **Resolve hero references** against `allHeroesData` imported **at build time** from
   `js/heroes-data.js` (this is the dual-key anchor: the canonical set is whatever
   `heroes-data.js` contains at build time — 78 today, 89 after Lane 2 lands; the
   builder needs no hardcoded count). Every `heroName` / `canonicalName` / duel side
   must resolve to exactly one canonical name, or land in `quarantine` with a
   reason (`no-canonical-match` | `ambiguous-alias`).
4. **Alias validation**: every alias row must resolve its `canonicalName` to exactly
   one hero; one alias mapping to ≥2 canonicals = ambiguous → quarantined. Build
   **fails** if any `live` dataset produces quarantine rows; `pending` datasets warn.
5. **Provenance completeness**: every record must end with all 5 provenance fields
   (file default + row override merge). Missing/empty `credit` or `captureDate` on a
   `live` dataset = hard build failure.
6. **Image-URL stripping**: reject any field matching `/https?:\/\//` (build error,
   never silent) — enforces "text and numbers only" and keeps the 36 Wix URLs out of
   the research import.
7. **Size guard**: if the decoded inner JSON exceeds the payload budget (see §6),
   fail with the dataset-by-dataset byte breakdown (budget lives in the manifest as
   `"budget": { "rawBytes": 524288, "gzipBytes": 81920 }`).
8. **Emit** `js/codex-payload.json`: `JSON.stringify` with `(,)(:)` separators,
   `gzip` level 9, base64, `builtAt` from the newest source mtime — same as
   `scripts/eden/build-eden-datasets.py:264-289`.

Reused conventions: `scripts/check-tech-db.mjs` shows the house style for node data
validators (issue accumulation + `process.argv` flags); the eden builder shows the
payload envelope. No new dependencies.

### 3.2 `js/codex-loader.js` (clone of `js/eden-datasets-loader.js`)

Same module pattern as `js/eden-datasets-loader.js:1-36`: module-level `cachedStore`
+ `loadPromise`, `fetch('js/codex-payload.json')`, decode `gzip-base64` via
`Blob().stream().pipeThrough(new DecompressionStream('gzip'))`, reset `loadPromise`
on error, return `{ builtAt, catalog, datasets, aliases, currentVersions, quarantine }`.
**Never imported from an eager entry module** — only from lazy feature modules
(hero atlas, research planners, battle-sim duel explorer). The lazy-load contract
test (§7) enforces this at source level.

### 3.3 `js/codex-provenance.js` — the render gate

```js
export const VERIFICATION_STATUSES = Object.freeze(['current', 'historical', 'unverified']);
export function provenanceFor(record)            // → the 5-field object or null
export function assertRenderable(record, ctx)    // throws if provenance incomplete
export function provenanceBadge(record, t)       // → { source, credit, captureDate, gameVersionScope, statusLabel }
```

Contract: **nothing renders without source, author credit, capture date, game-version
scope, and verificationStatus.** The UI badge (Lane 4 renders it; this module defines
the shape) shows all five; `unverified` and `historical` get visually distinct badges.
`assertRenderable` is called by every consumer before rendering a record.

### 3.4 Build-chain wiring

- `package.json` `"scripts"`: add `"codex:build": "node scripts/codex/build-codex-payload.mjs"`
  and insert `&& npm run codex:build` into the `build` chain immediately after
  `npm run build:eden` (before `update-build-metadata`/`vite build`).
- `scripts/post-build.mjs`: add `'js/codex-payload.json'` to `copyFiles` (line ~66)
  and to `copyDest` (`'js/codex-payload.json': 'js/codex-payload.json'`, near line 80)
  — exactly how `js/eden-datasets.payload.json` ships today.
- Vite: nothing to configure — the payload is a static JSON copied post-build, not an
  imported module, so it contributes zero bytes to any route chunk.

### 3.5 Ingestion scripts (one per external source family)

All live in `scripts/codex/` and read **orchestrator-staged inputs** (never committed;
see §5). Each emits one `database/codex/*.txt`:

| script | input → output |
|---|---|
| `import-research-costs.mjs` | `work/roc-research-sources/roc_research_data.js` → `research-costs.txt` (prereq transform per §3.6) |
| `import-x12-research.mjs` | `docs/sources/x10-x12/x12-research.json` (in-repo) → X12 rows appended to `research-costs.txt` (note: this in-repo slice carries `position` but **no** `relation` strings — those live only in the staged full dataset) |
| `import-l96-posts.mjs` | `work/l96-codex-sources/pages/txt_post_*.txt` → `economy-*.txt` |
| `import-l96-duels.mjs` | `pdf_HeroDuels_By_Mtness_177-IMS.txt` → **R3: emits `duel-evidence/methodology-heroduels.json` ONLY; `duel-matrix.txt` ships header-only `pending`** until hero names are transcribed from the PDF's logo images |
| `import-l96-classes.mjs` | `pdf_*_Raider.txt`, `pdf_*_Trader.txt` → `class-cards.txt` |
| `import-l96-heroes.mjs` | `txt_heroes_list.txt`, `txt_hero_alfred.txt` → `heroes-codex.txt`, `hero-versions.txt`, `name-aliases.txt` — **R2: emits rows only for names already canonical in `js/heroes-data.js`; non-canonical names are listed in a machine-readable `excluded-noncanonical.txt` for the Lane-2 landing follow-up** |

Each importer is a plain-text transformer: it must be re-runnable, idempotent, and
parse-validate its own output (wrap + `node --check` / schema walk, per §0.7).

### 3.6 Prerequisite transform (R1 — Lane 5 contract)

Raw `relation` strings in `roc_research_data.js` are **positional**, e.g. `"2;2"`
(single prerequisite) or `"4;2|4;6"` (alternates). They are resolved at **ingest** in
`import-research-costs.mjs`; the payload never carries raw positions.

1. **Node ids**: `nodeId = gameNodeId` when the source carries one; otherwise a
   stable derived id `<treeSlug>-r<c>-c<r>` from the node's own `position` field.
   `treeSlug` = slugified `treeName` (same slug helper convention as
   `scripts/eden/build-eden-datasets.py` `zone_slug`).
2. **Resolve**: split the raw string on `|` into alternatives; within each, split on
   `;` into `row;col` positions; map each position to the node id whose `position`
   matches, **within the same tree only**.
3. **Emit** — exactly one of:
   - `requirements` — `;`-joined `nodeId`s when the raw string had no `|`
     alternates (AND semantics, mirrors Lane 5's `requirements: nodeId[]`);
   - `requirementGroups` — `|`-separated groups of `;`-joined `nodeId`s when
     alternates exist (each `|`-alternative = one group; **any group satisfied =
     prerequisite met**, mirrors Lane 5's `requirementGroups: string[][]`).
   Both columns are empty when the node has no relations. Lane 5's
   `buildPrerequisiteGraph(family)` consumes these already-resolved lists verbatim
   (its contract: "payload already resolved, never raw positions" — lane5 §3).
4. **Unresolved positions** (bad `row;col`, cross-tree, or missing node): never
   silently dropped — the affected node row is downgraded to `verificationStatus:
   'unverified'`, an explanatory note is appended to its `p` override, and the
   builder reports the count. Lane 5's orphan quarantine is the second net at graph
   build time.

---

## 4. Hero alias + version model

### 4.1 Alias model (join-key integrity)

- Canonical key = `name` in `js/heroes-data.js` (all 89 after Lane 2; 78 today).
- `name-aliases.txt` maps `canonicalName → alias[]`; `externalGameAliases` is the
  same map filtered on `externalGame != ''` (exported for cross-game search).
- **Resolution rule** (enforced in the builder + a unit test): every external record's
  hero reference (L96 names, duels, snapshots) normalizes via exact match, then via
  the alias map, to **exactly one** canonical name — or it is **quarantined, never
  silently dropped**. Two failure modes: `no-canonical-match` (unknown name) and
  `ambiguous-alias` (alias resolves to ≥2 canonicals).
- Quarantine is visible: payload carries `quarantine[]` and Lane 4 renders a
  quarantined-rows notice in the Hero Atlas; nothing quarantined renders as data.

### 4.2 Version chain

```
heroVersionId  e.g. "hv-alfred-2"  (stable across renames; version rows reference heroName)
effectiveFrom / effectiveTo        season-scoped, empty effectiveTo = current
previousVersionId                  chain backlink
changeSummary[]                    human fragments ("2/5/8 skill text updated for X12")
```

- `currentVersions: { heroName → heroVersionId }` index is payload-wide; the UI's
  Current / Historical / What-Changed / Before-After views (A2, Lane 4) walk the chain
  from `previousVersionId`.
- **Dual-key transition**: existing joins (`rankedCombos`, `heroes-info`,
  specialization profiles) keep working on `name`; the version overlay is purely
  additive in 16.0.0. `name` stays the primary key for reads; `heroVersionId` exists
  so historical rows survive a future rename. Nothing in `rankedCombos` changes.

---

## 5. Ingestion steps (sources & provenance per dataset)

Inputs come from two places: **in-repo** (`docs/sources/x10-x12/`) and
**orchestrator-staged** `work/` paths in the orchestrator checkout
(`D:/Project/hero-combo-creator2/work/…` — gitignored, never committed; the
orchestrator copies what commit 7 needs onto the branch). Verified content today:

| dataset | source | credit | verification | notes |
|---|---|---|---|---|
| research-costs | `work/roc-research-sources/roc_research_data.js` (1.78 MB, 36 trees / 1036 nodes) | Raven G; Ash Roe (709); per-tree credit lines from `roc_research_summary.json` (`Lord of Pondtail`, `Valasky`, `Pablo, Hellcat, Crazy Queen`, `Ptr, Old.Faithful`, …) | per-tree: `current` where totals cross-check; `unverified` for trees with empty `buildData` (Lofty Realm, Faithful Guard, Lofty Command, training trees) | Cross-check vs L96: Zone Commemoration / Zone Conflict / Master Warfare / Master City Defense totals match exactly → `current`; Defense Legion diverged (L96 47,990 vs 54,120) → L96 value kept as a `historical` cross-check row, current dataset wins. Raw `relation` strings resolved at ingest (§3.6). |
| research-costs (X12) | in-repo `docs/sources/x10-x12/x12-research.json` | Raven G, Ash Roe (709); Game client (CP) + community (costs) | `current` | Totals must match `x12-research-nodes.md`: Defense 29 nodes / 4,998,500 WB / gameId 20005005; Charge 30 nodes / 4,763,500 WB / gameId 20005019. Strip the 36 Wix `image` URLs. |
| heroes-codex / hero-versions / name-aliases | `work/l96-codex-sources/pages/txt_heroes_list.txt`, `txt_hero_alfred.txt` (sample profile = version-row template) | DonPablone | `historical` | **R2**: initial rows include only names canonical in `js/heroes-data.js` today (the 78). Non-canonical names (incl. Lilith, Hellfire, Belisarius and the other X10/X12 names) go to `excluded-noncanonical.txt`, not into datasets. |
| class-cards | `pdf_L96.app_Sheets_-_Raider.txt`, `-_Trader.txt` | DonPablone | `historical` | Farmer/Builder owed (D3) → rows `pending`, do not invent. |
| lofty-costs / lofty-specialty | `txt_lofty.txt`, `txt_specialty.txt` | DonPablone | `unverified` (L96 staging) | T9 full/min-path totals stay L96-sourced `unverified` seeds. |
| economy-gift-levels | `txt_post_amount-of-money-spent-for-each-gift-level.txt` | DonPablone | `historical` | Estimate-labelled per hard rule. |
| economy-honor-buildings | `txt_post_honor-building-costs.txt` | DonPablone | `historical` | |
| economy-war-medals | `txt_post_war-medals-cop-medals.txt` | DonPablone | `historical` | |
| duel-matrix | `pdf_HeroDuels_By_Mtness_177-IMS.txt` | Mtness s177 | — | **R3: `pending`, zero rows** — the PDF's hero names are logo images, only numbers were extracted, so nothing resolves to canonical names. `duel-evidence/methodology-heroduels.json` still ships (mirror `tests/fixtures/battle-reports/synthetic-01.json` provenance shape, credit Mtness s177). Goes `live` only after names are transcribed (D3-class vision work). |
| combo-snapshots | dated combo guides — **not yet located** | FedeSack (expected) | — | Ship `pending`, zero rows. Never ingested into `rankedCombos`. |
| building-costs | L96 "Main Building Costs" — **not yet located** | DonPablone | — | Ship `pending`, zero rows. |

Unlocated/owed items (D3/D4) do **not** block the lane: the dataset ships as
`pending` with header + provenance directive + zero rows, hidden by the UI, until the
owner supplies sources. "Bad seed data is worse than no data" (§0.7.3).

**R2 sequencing with Lane 2 (ratified):** commits 7–9 run **before** Lane 2's roster
landing commit, so the build-time canonical set is the 78. The 11 X10/X12 roster rows
(`heroes-codex`, `hero-versions`, `name-aliases`) are added in a small follow-up codex
commit that lands **in the same commit sequence as, and only after, Lane 2's roster
commit** — the orchestrator schedules it. No `futureRosterAllowlist` mechanism: the
builder's hard-fail-on-unresolved-live-rows discipline is the guard, and
`excluded-noncanonical.txt` is the queue. (Capture dates: both archives'
`SOURCES.md` say 2026-09-02 — R5.)

---

## 6. Budget & risk notes

- **File count**: gh-pages `deployFileCount` = 704, current build emits 669 → +1 for
  `js/codex-payload.json` = 670. Comfortable. Keep total new committed build outputs
  (payload + any evidence JSON) ≤ 5 files so headroom stays ≥ 30.
- **Payload size**: research-costs dominates. Proposed budget (manifest-enforced,
  self-contained in the builder): **≤ 512 KB raw / ≤ 80 KB gzipped** for the decoded
  inner JSON. Cost arrays are compact comma-lists; per-tree shared cost tables are
  deduplicated exactly like `X8_LOFTY_LEGION_COSTS` (`js/tech-db.js:39-51`). The X12
  JSON alone is 231 KB raw but its gzipped form is ~10× smaller; 36 trees fit well
  under budget with the dedupe.
- **Zero eager bytes**: the payload is fetched on demand by `codex-loader` from lazy
  feature modules only. It is not a Vite import, so no route chunk grows; the
  `forbiddenInitialFeaturePattern` check in `scripts/check-size.mjs:346` scans HTML
  link tags — a `.json` fetch can't trip it. Enforced additionally by a source-level
  lazy-load contract test (§7).
- **Route CSS**: this lane adds zero CSS. Lane 1's token-authority commit (spine 2)
  must land first so the hero-table UI (Lane 4) has CSS headroom.
- **firestore.rules**: not touched here. The 1000-expression budget risk and the
  separate rules deploy belong to Lane 2's roster chain.
- **Rights**: the 36-tree research dataset is third-party compiled data — the single
  biggest facts-vs-compilations tension in this lane. Mitigations, per the master
  plan: individual per-node numbers into our own schema (never the tool's JSON
  mirrored), per-tree credit preserved verbatim from `roc_research_summary.json`,
  per-node `verificationStatus`, tool code never copied, and D4 (contact DonPablone)
  gating the PDF-derived datasets' `status` before the release commit.
- **Version surfaces**: none. Release metadata lands in commit 13.
- **Rebase risk**: the payload is a generated file; after any rebase onto a moved
  gh-pages, re-run `npm run codex:build` and commit the refreshed `builtAt` — never
  hand-edit build stamps (AGENTS.md).

---

## 7. Interfaces with other lanes

**Consumes:**
- `docs/sources/x10-x12/x12-research.json` (Phase 0, in-repo) — X12 research rows.
- Orchestrator-staged `work/roc-research-sources/roc_research_data.js` +
  `roc_research_summary.json`, `work/l96-codex-sources/` — treated as external
  inputs staged before commit 7; never committed raw.
- `js/heroes-data.js` (Lane 2's landed roster) — build-time canonical set.
- `js/i18n/en.js` key shape — badge keys listed below.

**Produces (for other lanes):**
- Lane 4 (hero UI): `js/codex-loader.js`, `js/codex-provenance.js`, `js/codex-payload.json`
  — hero-table presets (Free/Paid/Skins+Paid), drawer skills 2/5/8 → full 1–8,
  version-history views, provenance badges, quarantine notice. **Frozen contract
  (R4): `heroes-codex` records carry `access: 'standard'|'paid'|'royal'`** — an
  access level, not a power tier; Lane 4's preset split and badges read this field
  name and enum as-is. (Local `State: 'Free'|'Paid'` in `js/heroes-data.js` remains
  the roster's own field; the two are intentionally separate.)
- Lane 5 (planners & release): `research-costs` with **resolved node-id
  `requirements`/`requirementGroups`** satisfying its `buildPrerequisiteGraph`
  input contract ("already resolved, never raw positions" — lane5 §3, per R1);
  `building-costs`, `economy-*` datasets — Research Cost Planner and Castle
  Development Planner data sources; `duel-matrix` for the Battle Sim evidence
  explorer (currently `pending`, R3).
- Lane 2 (seasons/roster): two coordination points —
  1. **tech-db ownership split**: Lane 2 imports the two X12 trees into
     `js/tech-db.js` manually (its item 4). Lane 3's `import-x12-research.mjs`
     writes the *codex dataset* rows only — it must **not** re-edit `js/tech-db.js`.
     The reusable importer for X15/X18/X20/X22/X24 becomes a later follow-up using
     the same `import-research-costs.mjs` shape.
  2. **Flag for the orchestrator (verified here)**: `seasonX10` / `seasonX12` do
     **not** exist in any locale file (checked `js/i18n/*.js` — only `seasonX8`
     ships, in 12 files; `hr.js` is the stub). HERO-DATA.md §8's claim
     "seasonX10/seasonX12 already ship in all 12 locale files" is wrong, same as its
     §1 claim that `js/state.js` already ends `X8,X10,X12` (it ends `X8`). Lane 2
     must add the two keys ×12 locale files (DeepSeek mechanical fill), `hr.js`
     skipped by design. This lane's badge keys follow the same 12-file pattern.
- Lane 1 (gate/theme): depends on spine commit 2 landing first (CSS headroom);
  no interaction otherwise.

**i18n keys this lane adds** (12 locale files, `hr.js` stub skipped — mirroring the
`seasonX8` precedent; DeepSeek mechanical fill per house rule, `i18n:check` must pass):
`codexSource`, `codexCredit`, `codexCaptured`, `codexGameVersion`,
`codexStatusCurrent`, `codexStatusHistorical`, `codexStatusUnverified`,
`codexQuarantinedNotice`.

---

## 8. Tests to add or update

New files (all `node --test`, matching existing unit-test style; baseline stays green
at 1303 + additions):

1. `tests/unit/codex-provenance-contract.test.mjs` — every payload record has the
   5-field provenance; enum values valid; `assertRenderable` throws on incomplete
   records; `provenanceBadge` output shape.
2. `tests/unit/codex-alias-quarantine.test.mjs` — resolution returns exactly one
   canonical; unknown name → quarantined; ambiguous alias (fixture) → quarantined;
   `externalGameAliases` derivation; quarantine list populated in payload.
3. `tests/unit/codex-payload-contract.test.mjs` — inflate the real
   `js/codex-payload.json` with node `zlib.gunzipSync`; assert: every record carries
   provenance, **zero `http`/`wixstatic` strings anywhere**, all hero references
   resolve, `quarantine` empty for `live` datasets, `builtAt` RFC3339, X12 research
   totals sum to 4,998,500 / 4,763,500 WB (cross-check vs `x12-research-nodes.md`),
   **prereq resolution (R1)**: every `requirements` member and every group in
   `requirementGroups` is a valid `nodeId` within the same tree; no raw `row;col`
   position survives anywhere in the payload; the two columns are mutually
   exclusive per record.
4. `tests/unit/codex-lazy-load-contract.test.mjs` — source-grep guard: `codex-payload`
   / `codex-loader` must not be referenced from any `*.html` entry or from eager
   entry modules (`js/app.js`, `js/app-generator.js`, `js/state.js`); allowed only in
   lazy feature modules. Mirrors the intent of
   `forbiddenInitialFeaturePattern` at source level.
5. `tests/unit/codex-version-chain.test.mjs` — version rows chain via
   `previousVersionId`; exactly one version per hero with empty `effectiveTo`;
   `currentVersions` index matches.
6. `tests/unit/codex-noncanonical-exclusion.test.mjs` — **R2 guard**: before Lane 2's
   roster lands, no `heroes-codex`/`hero-versions`/`name-aliases` row references a
   name outside the current `allHeroesData`; `excluded-noncanonical.txt` exists and
   lists exactly the L96 names that failed canonicalization (expected to include the
   11 X10/X12 names). After the roster lands and the follow-up codex commit, the
   guard inverts: the excluded list is empty and the 11 rows are present.

`npm run i18n:check` after the 12-file key fill. No changes to existing tests;
`hero-season-scope` / `all-star-boh-security` / tower-path suites are Lane 2's and
must stay green.

---

## 9. Open questions (owner/orchestrator)

| # | Question | Lean |
|---|---|---|
| O1 | Payload size budget 512 KB raw / 80 KB gzip acceptable? | Yes — research-costs with deduped cost tables fits; budget enforced in-builder, adjustable in manifest only |
| O2 | Authority split: `js/tech-db.js` stays the live research UI authority; codex payload is the provenance-bearing superset + historical cross-check. Double-maintenance acceptable? | Yes — importer generates the codex rows from the same sources, so divergence is a test failure |
| O3 | Quarantine surface: visible banner in Hero Atlas vs admin-only log? | Hero Atlas notice (visibility is the point of "never silently dropped") |
| O4 | D4 status gates duel-matrix / class-cards `status`; if DonPablone says no, what happens? | Facts remain (individual numbers, credited); only PDF-*derived* artifacts freeze; datasets drop to `pending` |
| O5 | D3 transcriptions (Farmer, Builder, honor, gift levels, Lofty grid) — ship `pending` empty datasets now, or hold the files entirely? | Ship `pending` (manifest + header + zero rows; UI hides them) |
| O6 | `hr.js` stub — skip codex keys there (matches `seasonX8` precedent)? | Yes |

---

## 10. Execution checklist (commit-spine 7–9, ordered)

1. Cut work on `codex/overhaul-16-0-0` from latest `origin/gh-pages` (per AGENTS.md;
   orchestrator stages `work/` inputs onto the branch).
2. **Commit 7**: create `database/codex/` with manifest + all `.txt` sources
   (provenance directives, per §5 credits; capture dates 2026-09-02 per the
   archives' `SOURCES.md` — R5); `duel-evidence/methodology-heroduels.json`;
   `pending` datasets as header-only (`duel-matrix` R3, `building-costs`,
   `combo-snapshots`); **R2**: hero-referencing rows restricted to names canonical
   in today's `js/heroes-data.js`, non-canonical names recorded in
   `excluded-noncanonical.txt`.
3. **Commit 8**: `scripts/codex/build-codex-payload.mjs` + importers (incl. the
   §3.6 prereq transform in `import-research-costs.mjs`); `js/codex-loader.js`;
   `js/codex-provenance.js`; wire `package.json` `codex:build` into the `build`
   chain; add payload to `scripts/post-build.mjs` `copyFiles`/`copyDest`.
4. **Commit 9**: the 6 test files (§8); i18n badge keys ×12 files (DeepSeek fill).
5. **Follow-up codex commit (with Lane 2)**: when Lane 2's roster lands, add the
   11 X10/X12 rows (`heroes-codex`, `hero-versions`, `name-aliases`) from
   `excluded-noncanonical.txt`, flip the R2 test guard, re-run `codex:build`.
   Scheduled by the orchestrator in the same commit sequence as the roster commit.
6. Verify: `npm run codex:build` (clean, no quarantine rows, size guard passes) →
   `npm run test:unit` (1303 + new) → `npm run i18n:check` → `npm run build` +
   `npm run size:check` (670/704 files; zero route-CSS delta vs Lane 1's re-baseline;
   no eager payload reference).
7. Report to orchestrator: payload byte budget used/headroom, quarantine count,
   excluded-noncanonical count, cross-check table (roc vs L96 vs X12 in-repo),
   open questions O1–O6.
