# Unit Specialisation + Tech sheet data expansion

Status: rev 2 (2026-09-23). Lanes 1–3 shipped in **16.5.0** (the owner supplied the
workbook itself and chose the sheet as the authoritative cost source; see "What shipped"
below). Lanes 4–6 remain open. Numbers below are measured against the workbook, the live
sheet CSV, and the shipped repo data, not copied from either sheet's summary rows.

## What shipped in 16.5.0

- `database/specialization-sheet-unit-specilization.xlsx` — the workbook itself (sha256
  `d8fbd549…`), plus `database/specialization-sheet/evidence.json`, a one-node-per-line
  snapshot for review and offline re-derivation.
- `scripts/specialization/extract-sheet-workbook.py` (workbook → snapshot, validating every
  section against its stated total) and `scripts/specialization/build-sheet-evidence.mjs`
  (snapshot → shipped module: maps sections to researches, resolves canonical node ids, and
  with `--apply-costs` adopts the sheet's badge totals). `npm run data:specialization` runs
  both; `npm run data:check` fails if the module drifts from the snapshot.
- The medal-evidence module now carries all 3 troops × 10 towers × 4 sections = **120
  sections, 2,745 node rows, 2,985 per-level costs**, with `nodeId` resolution so troop
  renames ("Energetic", "Tough Armor") still map to their canonical nodes.
- The sheet's section totals are now the shipped research and column badge costs (grand
  total 1,369,839 → **723,639**); Column I was already correct and is unchanged.
- Provenance and credit: `SPECIALIZATION_MEDAL_EVIDENCE_SOURCE` points at the workbook with
  maintainers, channel, observed date and checksum, and the planner's source link plus the
  "With gratitude" panel credit Ivan & CrazyDD / ΜΟΛΩΝ ΛΑΒΕ.

Still open: towers IX–X as first-class columns, the three Tech trees, `Dragon Gear
Advance`, and surfacing the workbook's per-node buff text.

Scope exclusions set by the owner (not available in kingdom 1097, or not wanted yet):
Royal Tech (RT) books, Eden Season Talents, the two new dragons (Frost Soul / Thunder
Soul), and Legendary Hall. Everything below respects those exclusions.

## 0. What the two workbooks actually are

Both workbooks are public, read-only, and were readable without a Google session via the
gviz CSV endpoint (`/gviz/tq?tqx=out:csv&sheet=<tab name>`). The `/export?format=xlsx`
and `/pub` endpoints are auth-walled for these files, and `gid=` is ignored by gviz (it
silently falls back to the first tab) — so tab access is by exact tab name only.

| Workbook | Title | Tabs | Access | Role |
|---|---|---|---|---|
| A — `1b6vZo20rXYCYDENSW0r1YAJ8di9DuHZ5Xfphoala8RU` | Royal Tech + Tech + Artifact + Dragon | 24 | read-only, gviz + browser | RT books, Tech, Artifact (Redemption Grail), Dragons, Season Talents, Dragon Gear Advance, Legendary Hall, Navigation |
| B — `1ZR9d38cXAbEfbEnp1QqVZtlRFGbliDMVW76NBMGfXPg` | Unit Specilization | 31 | read-only, gviz | Navigation + `{Footman,Cavalry,Archer} Training I–X` |

They cross-link: workbook A's Navigation points at *"the Unit Specilization file"*, and
workbook B's Navigation points back at A. Both are maintained by **Ivan & CrazyDD /
ΜΟΛΩΝ ΛΑΒΕ** (Bracket 1 – 347 CXF; Bracket 2 – 584 goW), crediting their YouTube channel
(@TheRocNoobs) in the sheet banner. Any public use should carry that attribution, the way
`SPECIALIZATION_CONTRIBUTION_SHEET_URL` and the artifact farming notes already do.

### Tab inventory (workbook A)

- 13 × `RT - <book>` (Glorious Gala … Vigil Oath) — **excluded** (RT not in 1097)
- 4 × `TECH - {Solid Tactics, Melee Legion - Charge, Elite Troop, Imperial Soul}`
- `Artifact - Redemption Grail`
- 2 × `Dragon - {Frost Soul, Thunder Soul}` — **excluded**
- `Season Talents` — **excluded**
- `Dragon Gear Advance` — dragon-adjacent, assumed **excluded** (confirm)
- `Legendary Hall` — **excluded**
- `Navigation` (index/status)

### Tab inventory (workbook B)

`Navigation` + 30 troop tabs: Footman / Cavalry / Archer × `Training I … X`. Every tab
holds four sections (Training, then the tower's three other researches in the order our
own column sets use). Parsed volume: **120 sections, 2,745 nodes, 2,985 per-level cost
cells, 215 distinct buff texts**.

## 1. The headline: workbook B is a per-node, per-level record of the whole tower system

Our shipped corpus (`js/specialization-towers-v2-data.js`, contract-pinned at 32
researches / 718 attribute nodes / 8 columns) is a *planner* corpus: it knows what each
node does and the medal total per research (`SPECIALIZATION_RESEARCH[id].cost`), but not
what each node costs, and not per level. Workbook B gives exactly that, for all three
troops and all ten towers:

```
"Archer Training VII","Skill","BUFF","Level 1","Level 2","TOTAL","Progress Tracker"
"1","Courage","For squads with Archers, Might increased by 3%","811","","811","811"
"5","Unstoppable Force","Physical Damage dealt by Archer increased by 2%","1,686","1,770","3,456","6,952"
"11","Solid Armor","Squads with Archers gain 15 Physical Immunity","3,775","","3,775","16,446"
```

That is node name + troop-scoped buff text + level-1 cost + level-2 cost (where a node has
two levels) + exact section total. Its own totals are internally consistent: all 30 tabs'
four section totals sum exactly to the per-tower numbers in its Navigation tab (verified
30/30; the only wobble is tower IX archer, 321,992 parsed vs 321,993 listed).

## 2. Mapping is 1:1 — verified, not assumed

Every workbook B section was matched to the shipped research that owns it, and the mapping
is exact:

- For all 120 sections the shipped research with the same **node-name multiset** (order
  differs, because our corpus re-sorts nodes into its layout order) is unique, and the
  only sheet node our corpus lacks is the sheet's last row — the per-troop passive skill
  ("Defense in Danger", "Attack with Courage", "Faltering", "Incapacitate", …), which we
  already store separately under `passiveSkill.{footman,archer,cavalry}`.
- Tower I agrees **exactly** with ours in all four sections for all three troops
  (1,674 / 2,712 / 4,472 / 6,789). Same currency, same unit, no interpretation needed.
- Workbook A's artifact tab, summed over its AS rows, gives **107,280** — the exact
  `totalAS` our `artifact-db` contract test pins. Our artifact data demonstrably came
  from this same sheet family.

Once the mapping is taken as proven, the numeric disagreements below are real data
disagreements, not a numbering mismatch.

## 3. Where the sheet and our corpus disagree

**Resolved in 16.5.0: the sheet won.** The corpus now ships the right-hand column of the
table below (see "What shipped"), so this table is the record of what moved.

Per-section medal totals, sheet (workbook B) vs the previously shipped research `cost`:

| Tower | Sheet s1 / s2 / s3 / s4 | Shipped s1 / s2 / s3 / s4 | Sheet tab total | Shipped column total |
|---|---|---|---|---|
| I | 1,674 / 2,712 / 4,472 / 6,789 | 1,674 / 2,712 / 4,472 / 6,789 | 15,647 | 15,647 ✓ |
| II | 2,633 / 5,789 / 7,988 / 10,384 | 3,348 / 5,424 / 8,944 / 13,578 | 26,794 | 31,294 |
| III | 5,590 / 11,189 / 15,509 / 19,903 | 6,696 / 10,848 / 17,888 / 27,156 | 52,191 | 62,588 |
| IV | 9,025 / 14,384 / 19,190 / 27,183 | 13,392 / 21,696 / 35,776 / 54,312 | 69,782 | 125,176 |
| V | 4,431 / 16,446 / 22,791 / 28,186 | 26,784 / 43,392 / 71,552 / 108,624 | 71,854 | 250,352 |
| VI | 8,218 / 15,260 / 29,247 / 39,937 | 53,568 / 86,784 / 143,104 / 217,248 | 92,662 | 500,704 |
| VII | 16,446 / 32,893 / 49,337 / 65,785 | 15,896 / 32,100 / 48,000 / 64,700 | 164,461 | 160,696 |
| VIII | 23,025 / 46,048 / 69,076 / 92,099 | 27,982 / 45,000 / 65,500 / 84,900 | 230,248 | 223,382 |
| IX | 32,196 / 48,295 / 80,496 / 161,005 | — (absent) | 321,993 | — |
| X | 34,001 / 51,002 / 85,002 / 170,002 | — (absent) | 340,007 | — |

Observation worth an explicit owner decision: our columns II–VI are exact powers-of-two
scalings of column I (col totals 15,647 → 31,294 → 62,588 → 125,176 → 250,352 → 500,704,
and every research cost follows the same 2×/4×/8×/16×/32× rule). Column I matches the
sheet exactly; columns VII and VIII differ from the sheet by a few percent in both
directions (ours look rounded to the nearest hundred); IX and X simply don't exist in our
data. So the sheet is currently the only independent per-tower record we have for
II–VI, and it disagrees with what we ship by up to ~6× (tower V: 71,854 vs 250,352).

## 4. What we gain, concretely

1. **Evidence coverage 12 → 120 sections.** `SPECIALIZATION_TROOP_MEDAL_EVIDENCE` today
   covers archer towers VII–VIII and footman tower IX only, and 3 of those 12 sections are
   marked `complete: false`. Workbook B covers all 3 troops × 10 towers, so the planner's
   per-node source rows (`js/app-specialization.js:337`, `:934`, `:1431`) stop falling
   back to "unknown" for most troops and towers.
2. **Per-level costs — a granularity we have never had.** 2,985 cost cells let the planner
   price a node's *next level*, not just the research total. Today the progress model is
   research-level only (`js/app-specialization.js:1486`–`:1516`, single "medals recorded"
   input).
3. **Exact values where we ship approximations** (towers VII–VIII), and **new towers**
   (IX, X) with the same four-research shape.
4. **Troop-scoped buff text**: 215 templates like "For squads with Footmen, Might
   increased by 1%" and multi-level values ("Footman's Base Might increased by 2%" with
   per-level numbers) — more precise than our synthesized `effect`/"Might +1%" strings, and
   troop-specific where ours are troop-agnostic.
5. **Cross-check surface**: the sheet's passive-skill row names per troop validate the
   `passiveSkill` mapping we derive, and its Navigation tab supplies independent per-tower
   totals to assert against in tests.
6. **Possibly 3 Tech trees** (workbook A): `TECH - Melee Legion - Charge` (30 skills),
   `TECH - Elite Troop` (30), `TECH - Imperial Soul` (43) have **no counterpart** in
   `js/tech-db.js`. What the sheet shows for them (skill list, troop type, buff, 20 levels
   of WB/CM costs, and an acquisition-time "No. Of Days" column) is real new data. Their
   sibling `TECH - Solid Tactics` is already shipped as the tech-db tree `Solid Tactics`
   [X1], 37 of its 38 sheet skills matching by name — which is also the reason to ask
   whether the other three are available in 1097 before building anything.

## 5. Open questions that need your call

1. **Which source wins where they disagree?** — **answered (2026-09-23): the workbook.** It
   supplies exact per-node, per-level costs for every troop and tower, so it became the
   authoritative badge-cost source; the shipped corpus adopted its section totals and the
   evidence module carries the node-level detail.
2. **Towers IX and X: available in 1097?** They are the newest tier in the sheet (its
   Navigation shows X as the active level with 1,020,021 virtue badges). Their 24 sections
   are recorded in the shipped evidence module as `researchId: null` rows today, so making
   them first-class columns (season, legion skills, milestones, images) is the remaining
   decision.
3. **Are the three missing TECH trees in scope?** They are the same currency family as the
   Tech trees we ship (WB/CM), unlike the RT books you excluded.
4. **`Dragon Gear Advance`** — confirm it is excluded with the dragons.
5. **Budget**: 2,745 nodes / 2,985 cost cells / 215 buff texts. A naive JSON dump of the
   parsed data is ~325 KB; the gzip+base64 payload pattern used by
   `js/eden-datasets.payload.json` lands nearer 15–25 KB, but the current size contract has
   ~7 KiB `totalJsBytes`, ~7 KiB `totalDeployBytes` and **5 files** of headroom
   (`scripts/check-size.mjs`), so this needs either a compressed payload plus a budget bump
   with a dated audit note, or a lazy JS data chunk behind a dynamic import (the pattern
   used for tech-db / specialization data today). Do not let it ride in `index.html`'s
   eager graph.

## 6. The stale-provenance bug — fixed in 16.5.0

`SPECIALIZATION_MEDAL_EVIDENCE_SOURCE` used to cite workbook A with `gid`s for tabs named
"Unit Specilisation VII/VIII/IX", and `js/app-specialization.js` deep-linked users to
`<sourceUrl>?gid=<gid>#gid=<gid>`. Verified on 2026-09-23:

- Workbook A has **no** Unit Specialisation tabs — its 24 tabs are all RT/TECH/Artifact/
  Dragon/Season Talents/Legendary Hall (browser-read tab strip).
- Navigating to `#gid=1492876894` lands on the workbook's first tab (`gid=1980675471`) —
  the cited gids no longer resolve, so every "open the source" link went to a Royal Tech
  page.
- The content those tabs described now lives in workbook B, as per-troop tabs
  (`Archer Training VII`, …), which is also where `sheet=` resolves.

16.5.0 replaced that record with the workbook's own id, title, per-troop tab names,
maintainer credit, observation date and checksum; the UI now links to the workbook instead
of a dead `gid`, and the pinning test asserts the new source shape.

Workbook A's own banner reported that the document "changed a lot", which is why the ingest
stamps a fresh `observedAt` and the snapshot is versioned by workbook checksum rather than
trusting a tab layout.

## 7. Phased work plan

Each lane is independently shippable; data lanes land last per the release convention.
Status as of 16.5.0:

| Lane | Work | Size | Risk | Depends on | Status |
|---|---|---|---|---|---|
| 1 | Provenance fix: repoint `SPECIALIZATION_MEDAL_EVIDENCE_SOURCE` at the workbook, replace the dead `gid` deep link, update the pinning test | XS | None (metadata) | — | **shipped** |
| 2 | Evidence expansion: regenerate `SPECIALIZATION_TROOP_MEDAL_EVIDENCE` — 120 sections, exact per-level costs, node-id resolution, `complete` semantics preserved, blanks stay absent | M | Low (additive) | Lane 1 | **shipped** |
| 3 | Reconciliation: publish the delta table (section 3), decide the source policy, adopt the sheet's badge totals | M–L | Medium (user-visible numbers) | Owner call | **shipped** (sheet wins) |
| 4 | Towers IX–X as first-class columns: `training9/10` + the three companion researches per tower, with seasons, legion skills, milestones and images | M | Low (data-only) | Owner call on availability | open — evidence rows already recorded |
| 5 | Per-level planner: price a node's next level from the sheet's level columns; extends the progress model beyond research-level medals | L | Medium (UI + model) | Lane 2 | open |
| 6 | Tech gap: add `Melee Legion - Charge`, `Elite Troop`, `Imperial Soul` as tech trees if in scope; they carry WB/CM cost arrays and an acquisition-time column `tech-db.js` does not model yet | L | Medium | Owner call | open |
| 7 | Surface the workbook's per-node buff text (215 templates, troop-scoped, already in the snapshot) beside each node | S–M | Low (UI copy) | Lane 2 | open |

### Lane 2 mechanics (as shipped)

- Two committed steps: `scripts/specialization/extract-sheet-workbook.py` reads the
  committed `.xlsx` into `database/specialization-sheet/evidence.json` (one node per line,
  so a changed cost is a one-line diff, and every section is checked against its stated
  total), then `scripts/specialization/build-sheet-evidence.mjs` maps sections to
  researches, resolves canonical node ids and renders the module.
- The workbook binary plus the snapshot live under `database/`, which the deploy never
  copies into `dist/`, so the ingest is auditable offline without touching the artifact.
- Evidence discipline preserved: the builder refuses to write when any node row lacks a
  cost, blank rows stay absent, and a per-node level cost is never inferred from a section
  total.
- `npm run data:check` runs the builder with `--check`, so the shipped module cannot drift
  from the snapshot unnoticed; `tests/unit/specialization-towers-v2-data.test.mjs` pins the
  workbook checksum, the 120-section shape, the node-id resolution counts, section totals
  against the shipped `cost` for every research, and the Column I anchor.

## 8. Re-deriving the data

The workbook is committed, so nothing here needs Google Sheets access:

```bash
# workbook -> snapshot, then snapshot -> shipped module (writes the module)
npm run data:specialization

# fail if the shipped module drifted from the committed snapshot
node scripts/specialization/build-sheet-evidence.mjs --check   # also part of data:check

# adopt the snapshot's section totals as the shipped research/column badge costs
node scripts/specialization/build-sheet-evidence.mjs --apply-costs
```

Refresh the workbook by asking the maintainers' sheet for `File → Download → .xlsx` and
replacing `database/specialization-sheet-unit-specilization.xlsx`; the extractor re-validates
every section against its stated total and stamps the new checksum into the snapshot (and
therefore into the shipped source record and its test).

For a sanity check against the live sheet, a single tab is readable as CSV, with the exact
tab name (`gid=` is ignored by that endpoint):

```bash
curl -sL "https://docs.google.com/spreadsheets/d/1ZR9d38cXAbEfbEnp1QqVZtlRFGbliDMVW76NBMGfXPg/gviz/tq?tqx=out:csv&sheet=Archer%20Training%20VII"
```
