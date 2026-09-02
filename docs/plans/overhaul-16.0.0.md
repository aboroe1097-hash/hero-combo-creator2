# 16.0.0 "Overhaul" — Big Batch Release Plan

Status: proposal rev 5 (2026-09-02). Reconciles: ZCode L96 research + Opus 5.0
interface audit + Codex additions + Opus 5.0 release plan + Opus no-vision data
package, all claims re-verified against the repo and git refs where possible.
Raw sources: `work/l96-codex-sources/`, `work/roc-research-sources/`, and
`work/x10-x12-source/` (all currently **untracked in this checkout only** — see
"Where the work actually lives").

## 0. Release framing & status

- Version: origin/gh-pages is at **15.0.15** (verified via `git show`). Target
  **16.0.0**, single PR (owner decision). Legality confirmed: for 16.0.0 both minor
  and patch are 0, so `check-version-consistency.mjs` skips the previous-entry
  continuity check — 15.0.15 → 16.0.0 passes `version:check`; we forgo
  15.0.16–15.0.20. (This shared worktree still shows 15.0.13 — it is **22 commits
  behind gh-pages** with uncommitted vite8 edits; always verify version at branch
  cut.)
- High-risk lane: full `npm run check` + `npm run firebase:preview` before merge.
- Branch `codex/overhaul-16-0-0` cut fresh from latest `origin/gh-pages`; fixed
  rebase cadence (gh-pages moves weekly); **data commits land last** (most likely to
  need revision, zero code risk).
- Cost stated plainly: ~32 workstreams on one branch; the gate is a 10–15 min
  matrix re-run after every rebase. Managed by the revertable commit spine below.

## 0.5 Phase 0 — gate status (CORRECTED 2026-09-02; lane 1 finding, T0-verified)

**The earlier RED-gate finding does not reproduce at the branch cut.** PR #176's
`deploy-verification` CI is green (build + `size:check` pass at gh-pages HEAD
`beafd73a`), verified independently by T0. The RED table below came from the
**stale vite8 worktree** (22 commits behind gh-pages + uncommitted vite8 edits);
gh-pages PRs #169–#175 cleared the route-CSS violations and the preload issue
after the audit snapshot was taken.

New invariant — **keep the gate green**: headroom is razor-thin (eden-x2 desktop
0.0 kB, admin 0.6, profile 0.9), so spine commit 2 (token retirement) must be
**strictly net-negative CSS and land before any CSS addition**; every commit
re-runs `size:check`; the existing `forbiddenInitialFeaturePattern` guard in
`scripts/check-size.mjs` remains the standing lazy-load regression net (no new
work needed there). D1 is thereby resolved: **no re-baseline** — retirement must
fit the existing budgets.

Historical record (describes the stale vite8 tree, NOT gh-pages): all eight routes
were measured over budget (index 565.2/530, admin 719.1/680, eden-x1 840.3/803,
eden-x2 840.3/802, arcade 503.4/463, profile 37.1/25, towers 92.1/80,
battle-sim 69.9/59 kB desktop) plus an eager eden-map/hero-atlas preload.

**File-count budget:** gh-pages `deployFileCount` is **704** with the build
emitting 669 — 35 files of headroom. Keep the gzipped-payload approach for the
right reason: **route CSS and JS budgets are the binding constraint**, not file
count.

## Commit spine (13 commits, each independently revertable)

1. **X10/X12 season scaffolding — SPEC ONLY, NOT LANDED.** The Opus session built
   and tested it (18 files, +97/−17, 1302 tests +6) but it is committed **nowhere**
   in this repo (no `POPULATED_HERO_SEASONS` on any ref, no
   `tests/unit/season-scaffold.test.mjs` in history) — it lived in that session's
   sandbox. Re-apply on the overhaul branch using its spec:
   `HERO_ATLAS_ALL_SEASONS` (canonical order incl. empty seasons) vs derived
   `POPULATED_HERO_SEASONS` (drives pills + all-selected math, so empty seasons
   can't break the "All" affordance); `revealPopulatedSeasonPills()` in
   `js/app.js` unhides a pill once its season has heroes; colors X10 `#f472b6`,
   X12 `#a3e635` in both `js/constants.js` maps; hidden pills in `index.html`;
   i18n `seasonX10`/`seasonX12` ×12 (hr stub by design); new
   `season-scaffold.test.mjs`; `hero-season-scope.test.mjs` 38-post-X8 guard stays
   intact. Discrete seasons (X9/X11 deliberately absent, unlike X8's bundled
   catch-up). Owed: 10-second live-browser reveal check (rAF never fires in a
   hidden pane — same artifact class as the audit false positives).
   **The data side IS landed as source**: `work/x10-x12-source/` (see §0.7).
2. **Token authority (audit 01 + 03) — first, it shrinks route CSS.** Rescope the
   `#ocrDashboardRoot` token block (`:root:not([data-theme='light'])
   #ocrDashboardRoot`, or a matching light counterpart), retire the ~357 override
   rules it made necessary (~272 in `ocr-dashboard.css` + 85 in `eden-x1.css`),
   towers `color: inherit` specificity fix (`specialization-towers-v2.css:52,
   :287`) in the same pass. New
   `tests/unit/theme-token-authority.test.mjs`: `--ff-text` must resolve to the
   light value inside `#ocrDashboardRoot` under `[data-theme='light']`.
3. **Keep the gate green** — commit 2 must be net-negative CSS (eden-x2 desktop
   has 0.0 kB headroom); re-measure the eight route budgets after it; the
   existing `forbiddenInitialFeaturePattern` guard is the lazy-load net.
4–6. **Theme batch** — audit 02 (profile auth screen), 04 (768px boundary),
   05 (account chip + Eden announcement chips), 06–09 (battle-sim tap targets,
   lazy-CSS fragility, maintenance page theme).
7–9. **Data layer** — commit the `work/l96-codex-sources/` +
   `work/roc-research-sources/` archives + this plan (currently untracked in the
   ZCode checkout; the `claude/l96-data-analysis-integration-9a314f` branch is
   just an old gh-pages mirror — it does NOT contain them). Provenance schema +
   `js/codex-provenance.js` (gates rendering: nothing renders without source,
   credit, capture date, game-version scope, verificationStatus). Hero alias +
   version model: every L96 record must resolve to exactly one of the 78 heroes
   in `js/heroes-data.js` or be **quarantined — never silently dropped**. Build
   pipeline mirroring `database/specialization/` → gzipped `js/codex-payload.json`
   + DecompressionStream loader.
10–12. **Features** — three hero tables inside the existing Hero Atlas (keeps us
   off the blown route-CSS budget); full skills 1–8 drawer; export/branding kit
   applied to existing exports too; Research Cost Planner absorbing Lofty/T10 +
   class-card engine + building/stamina planners; duel evidence explorer; honor &
   COP reference tables; CLAUDE.md locale count corrected 11 → 13.
13. **Release metadata** — every `version:check` surface: `package.json`, lockfile
   root + package, `APP_VERSION` in the six JS files, HTML footers,
   `profile.html` / `vtsscore.html` metas, `maintenance.html` label, README
   heading, `CHANGELOG.md`. Then the full gate + firebase:preview.

Mechanical work (i18n key fills, per-export wiring, manifest fill) delegates to
DeepSeek per the house rule; judgement stays local.

## Corrections log (folded into this rev)

- Version: gh-pages = **15.0.15** (worktree 15.0.13 = stale, 22 behind).
- File count: gh-pages 669/704 (35 free) — not 755/760; branch-local 760 is drift.
- Roster file is `js/heroes-data.js` (78 heroes, `{name, season, Type, State,
  imageUrl}`) — and `State` is already `'Free' | 'Paid'`, so the Free/Paid table
  split has a **local origin today**; L96 only contributes the third Royal tier.
- 13 locales is correct; CLAUDE.md's "11" is stale — fix ships in this release.
- **66 hotlinked images** already in the app: 40 hero portraits on
  `static.wixstatic.com` (third-party CDN, no uptime guarantee, no fallback) +
  26 on `i.ibb.co` (owner's own uploads — rights fine, availability still applies).
  New workstream A8.
- Phase 0 archive lives in this checkout's untracked files, not on any branch.
- Opus "Commit 1 shipped" — not in this repo; treated as spec (above).
- **§0.5 RED gate did not reproduce** (lane 1, T0-verified via PR #176 CI + local
  build): stale vite8-worktree artifact; gh-pages #169–#175 already cleared it.
  Gate green with near-zero headroom (eden-x2 desktop 0.0 kB, admin 0.6, profile
  0.9) → retire-before-add ordering replaces gate-clearing; D1 resolved as
  no-re-baseline. The 768px collision is 7 blocks in 2 files (app.css ×5,
  components.css ×2), not 7 stylesheets; light overrides count 341 blocks /
  357 grep occurrences (272 ocr + 85 eden).
- **Lane reconciliation (2026-09-02, all five lane plans blessed at rev 2):**
  cross-lane contracts verified consistent — prerequisite format
  (`requirements: nodeId[]` / `requirementGroups: nodeId[][]`, positional
  resolution owned by lane 3; X12 Charge ships 0/30 relations as a flagged gap,
  never guessed), `access` enum `standard|paid|royal` frozen in lane 3 and
  consumed by lane 4 (fallback `paid`). **i18n key ownership arbitrated:** lane 2
  owns `seasonX10`/`seasonX12` (canonical en.js + 12 non-English core files; hr
  stub skipped); lane 3 owns `codexSource/Credit/Captured/GameVersion/StatusCurrent/
  StatusHistorical/StatusUnverified/QuarantinedNotice`; lane 4 owns
  `codexMode/Preset/Search/Sort/Col/Empty/Export/Loading/Rank/Unavailable`, the
  bare `codexStatus` chip label, and `fieldData.*`; lane 5 owns `planner.*` in
  the research domain pack. Sets are disjoint — any new `codex*` or `planner*`
  key requires a T0 ownership note first. **File-count ledger authority:**
  669 + 1 (lane 3 payload) + 2 (lane 4) = 672/704, re-measured at the release
  commit; lane-local counts are informational. Sequencing pins: lane 1 commit 2
  before any CSS anywhere; lane 2 roster before lane 3's 11-name codex rows;
  lane 3 payload before lane 4/5 loader wiring.
- **"Adding a roster is a data-only edit" was wrong** (Opus's own correction,
  re-verified here: `firestore.rules` allowlist + `<= 78` cap at local line 939,
  deepEqual-order-sensitive test, 1000-expression budget note at line 20) — real
  chain in §0.7.

## Where the work actually lives (critical for branch cut)

This checkout = `codex/vite8-esbuild-standalone`, 22 behind gh-pages, with
uncommitted vite8 edits AND our untracked deliverables (`docs/plans/`,
`work/l96-codex-sources/`, `work/roc-research-sources/`,
`work/x10-x12-source/`). The overhaul branch must be cut from fresh
`origin/gh-pages`; carry the untracked plan/archive files over explicitly (copy
into the new worktree before committing spine commit 7). Do not `commit -a`
blindly here — parallel sessions share this checkout.

## §0.7 No-vision execution protocol (owner requirement, 2026-09-02)

The plan will be executed by models **without vision**. Every data-ingestion
deliverable must therefore be plain text, structured for copy-paste, before any
execution step depends on it:

1. **Paste-ready, parse-validated blocks.** Every dataset lands as a `work/`
   markdown/JSON package with fenced code blocks in the exact shape of the target
   file (`js/heroes-data.js`, `js/heroes-info.js`, `js/tech-db.js`, …). The
   packaging step must parse-validate each block (wrap + `node` run) before it is
   handed over. Template: `work/x10-x12-source/HERO-DATA.md` — roster block,
   skills block, reference tables, image flow, edit checklist with file-by-file
   steps.
2. **Images never require vision.** Owner uploads to ImgBB and supplies a
   `name → url` list; the model pastes `imageUrl` strings. Records ship fine
   without images (`getHeroImageUrl` falls back to a placeholder). New records
   never point at `static.wixstatic.com`; wix `image` URLs in any ingested JSON
   are stripped on ingest (text and numbers only).
3. **Do-not-guess discipline.** Illegible/cropped source values are marked
   explicitly (e.g. Al-Hawra's season badge "X01 or X10 — do not use") and left
   out; TODO fields (`placement`, `minCopies`) stay `null` until the owner fills
   them from the game. Bad seed data is worse than no data.
4. **Same protocol applies to the remaining transcriptions** (D3): Farmer +
   Builder class sheets, honor costs, gift levels, Lofty per-level grid, and any
   future season screenshots — each becomes a `work/<topic>-source/*.md` package
   with validated paste blocks before the corresponding commit is attempted.

`work/x10-x12-source/` contents (verified in this checkout): `HERO-DATA.md`
(11 heroes: 2 X10, 7 X12 free, 2 paid; all 33 skills 2/5/8; attribute/tag tables;
roster + skills blocks re-parse-validated here), `x12-research.json` (both trees,
full per-level costs, regenerated locally from `roc_research_data.js` — Defense
29 nodes / 4,998,500 WB / gameId 20005005, Charge 30 nodes / 4,763,500 WB /
gameId 20005019), `x12-research-nodes.md`, `README.md`.

### Roster landing chain (replaces the "data-only edit" claim — verified: 7 tests fail otherwise)

1. `js/heroes-data.js` — paste HERO-DATA.md §2 (comma after `Cyrus`).
2. `firestore.rules` — `validAllStarBoHUsableHeroNames()` embeds all 78 names AND
   caps `values.size() <= 78` (local line 939; gh-pages 1053/2189). Both must
   grow, names in the **same order** as `allHeroesData`
   (`tests/unit/all-star-boh-security.test.mjs` does `assert.deepEqual`).
   **Rules deploy separately** (`firebase deploy --only firestore:rules`) — the
   PR merge does not ship them; the file already hit the Firestore
   1000-expressions-per-request limit once (comment at line 20), so measure the
   budget before deploying. A rules regression returns 403s across BoH signup.
3. `js/specialization-hero-paths.js` — every `State:'Paid'` hero needs a tower
   profile (`troop`, `siegeBias`, weighted `demand`) — **blocks Al-Hawra and
   Achilles only**; these are gameplay tuning values and must be authored
   deliberately (D5), never guessed. The 9 free heroes have no such requirement.
4. `tests/unit/hero-season-scope.test.mjs` — remove the 10 landed names from
   `FUTURE_HEROES` (`Pepin` is not in the list).
5. `tests/unit/season-scaffold.test.mjs` — invert the two X10/X12 emptiness tests.
6. `js/heroes-info.js` — skills from HERO-DATA.md §3 **once `placement`/
   `minCopies` are filled** (owner input; do not invent).

Split recommendation: land the 9 free heroes first (steps 1, 2, 4, 5), hold the
2 paid until profiles exist. Import target for research: `js/tech-db.js` (29
trees, stops at X8) following the `X8_LOFTY_LEGION_COSTS` shape; X15–X24 come
free from the same dataset once the importer exists.

---

## Workstream A — Codex data subsystem

### A1 Data layer + provenance (gates everything)
`database/codex/` pipe-delimited sources mirroring `database/specialization/`,
`scripts/codex/build-codex-datasets.mjs` (mirror of the eden builder), gzipped
`js/codex-payload.json` + loader, `js/codex-provenance.js`. Every record: source,
author credit, capture date, game-version scope, `verificationStatus`
(current | historical | unverified) — **nothing renders without it and the UI shows
it**. Datasets: heroes-codex (+versions), class-cards, lofty-costs/specialty,
research-costs, building-costs, economy-*, duel-matrix (+evidence),
combo-snapshots, name-aliases (+`externalGameAliases`).

**Current research backbone** (archived: `work/roc-research-sources/`):
`research_data.js` from tools.riseofcastles.net/tech-research — 36 trees / 1036
nodes / S0→X24, per-level gold/gems/time + CM/WB/FM costs, CP values, game node
IDs. X12 = Melee Legion - Charge (4,763,500 WB) + Melee Legion - Defense
(4,998,500 WB); **no X10 research tree exists** (ladder X8→X12→X15→X18→X20→X22→
X24). Cross-check vs L96: Zone Commemoration / Zone Conflict / Master Warfare /
Master City Defense totals match exactly; Defense Legion diverged (L96 47,990 vs
current 54,120) → L96 demoted to historical cross-check values. Cost completeness
varies (empty buildData on Lofty Realm, Faithful Guard, Lofty Command, training
trees) → per-node verificationStatus. Their tool code is not copied — data only.

### A2 Hero tables + version history (the flagship)
One grid, three presets in the existing Hero Atlas: **Free** (State:'Free' — local
origin), **Paid** (State:'Paid' + L96 Royal tier), **Skins+Paid** (join
`js/skins-db.js`). Drawer: skills 2/5/8 → full 1–8. Version-history schema
(`heroVersionId`, `effectiveFrom/To`, `previousVersionId`, `changeSummary[]`,
aliases incl. cross-game) with Current / Historical / What-Changed / Before-After
views, invalidated-combo warnings, stale-recommendation banners. Dated combo posts
ingest as `recommendationSnapshot` only — never into `rankedCombos`.

**X10/X12**: scaffolding per commit 1; the roster and skills are fully transcribed
in `work/x10-x12-source/HERO-DATA.md` (paste-ready, parse-validated). Landing is a
**6-step chain incl. a firestore.rules change with its own deploy** (see §0.7) —
NOT a data-only edit. Owner still owes: `placement` + `minCopies` per hero, ImgBB
portrait URLs (name→url list), and confirmation of the 7 cropped season badges
(legible: Lilith X09, Pepin X12, El Cid X12, Achilles SP; Al-Hawra ambiguous —
do not use). Land 9 free heroes first; Al-Hawra + Achilles wait on authored tower
profiles (D5).

### A3 Research Cost & Progression Library
Unified planner (absorbs Lofty/T10): family → node levels → target; min-unlock vs
100% paths; remaining medals/badges/gems/time; milestones; prerequisite graph
(from `relation` strings); "next best research" presets; per-account saved
progress; CSV/JSON/PNG/PDF exports; trust badges. T9 full/min-path totals stay
L96-sourced `unverified` seeds (not in the current dataset).

### A4 Planners on a shared preset engine
General preset engine (tree definition, node requirements, allocation, presets,
checkpoints, import/export, share links, progress comparison) consumed by Unit
Specialization towers, legacy Eden specialty trees, class cards, Lofty reset,
future trees. Castle Development Planner: building × level × discounts (joins
class-cards Architect/Builder bonuses + research reductions) → personalized cost &
time; "what blocks my next castle level". L96 building sheet = `unverified`
staging data. Rustablesafe-coded L96 planners: concepts only, zero code.

### A5 Eden Hub — War Room + stamina projection
Honor building costs calculator, gift/medal reference cards, ROC guide localized.
Stamina calculator (L96's is broken `{{CODEstam}}`): full I/O spec + shareable
alliance operation card; later multi-player readiness table.

### A6 Battle Sim — field data + matchup evidence
Duel schema with methodology metadata (research/equipment/skill profiles,
attacker tie-priority, inclusion criteria, CI, sourceGameVersion); explorer shows
conditions, "resembles your account?", sim-vs-recorded deltas. Equipment deltas
fold into the sim catalog.

### A7 Export + branding/watermark kit
`js/export-branding.js` + `js/codex-export.js` (CSV/JSON/PNG/PDF/share/clipboard),
applied to existing exports (combo PNG, throne PNG, atlas CSV) so we don't ship
two export families. L96's "DONPABLONE" watermark must not survive into ours.

### A8 Asset resilience (new)
Self-host the 40 `static.wixstatic.com` portraits under `images/heroes/` (with
remote fallback during migration); add a generic image-fallback strategy covering
both hosts. The 26 i.ibb.co uploads are owner assets — keep, optionally rehost.

### A9 Library (optional)
Historical combo-recommendation series, rewritten localized guides, SEO.

---

## Workstream B — audit remediation (verified)

Dark theme clean; defects are light-theme, the 768px boundary, or opt-out pages.
Zero mobile overflow.

- **B1 (P0)** token authority — see commit 2 (~357 overrides retired; admin +
  eden-x1/x2 shells; `admin-login-gate.css:7` 2.2:1 collateral).
- **B2 (P0)** profile auth screen: "Create account" 1.00:1, "Reset password"
  1.46, "Sign in" 2.50; `css/account-profile.css` 63 hex / 0 var() → tokenize;
  auth-surface contract test.
- **B3 (P0)** towers primary buttons both themes (`:52` `color: inherit` 0,1,1
  beats 0,1,0) — fixed in commit 2's pass.
- **B4 (P1)** 768px trap: 7 stylesheets `min-width: 768px` vs mobile.css
  `max-width: 768px` — normalize 767/769 + lint test.
- **B5 (P1)** account chip + **Eden announcement chips** hardcoded dark → tokenize.
- **B6 (P2)** battle-sim tap targets: 18 visible small (native checkboxes 13–16px)
  → ≥44px hit areas.
- **B7 (P2)** embedded towers stylesheet: lazy `.catch()` swallowed, wired only to
  `<details>` toggle (`battle-simulator-app.js:3382`) → load-on-expanded + retry.
- **B8 (P2)** maintenance page theme alignment.
- Method notes: neutralize transitions, honor `details[open]`, beware rAF in
  hidden panes — encode in every probe script. **Visual diffs:** CI Linux
  baselines are authoritative; local Windows baseline failures are a known
  artifact (~350 px taller pages); never `--update-snapshots` locally.

## Rights & data ethics (hard rules)

1. **Facts, not compilations**: individual numbers transcribe into our
   independently designed schema after verification; never mirror someone's
   curated sheet wholesale.
2. Rewrite all prose (hero write-ups are creative work). Structured mechanics in
   our own words.
3. No logos, watermarks, or hotlinking — including the 66 existing hotlinks (A8).
4. Credit by name in-app and in exports: DonPablone, FedeSack, Mtness, Raven,
   Cris Minime, Rustablesafe (concepts), riseofcastles.net community data.
5. **PDFs/graphics stay internal** until DonPablone answers a redistribution ask
   (D4) — their ToS grants us nothing; captured artifacts are evidence only.
6. **Gift-level spend estimator hard rule**: explicitly-labelled estimate, stated
   assumption range, never attached to named players or alliances, never a ranking.

## Open decisions (owner)

| # | Decision | Lean |
|---|---|---|
| D1 | Reduce vs re-baseline route CSS budgets | Commit 2 first, measure what it recovers, re-baseline only the remainder with comments |
| D2 | X10/X12 roster gaps | Roster + skills transcribed (work/x10-x12-source); owner owes placement/minCopies per hero, ImgBB name→url portrait list, 7 cropped badge confirmations |
| D3 | Image-sheet transcription (Farmer, Builder, honor costs, gift levels, Lofty grid) | Manual or OCR-assisted, **packaged per §0.7 as validated paste-block markdown**, double-keyed against source; bad seed data is worse than none |
| D4 | Contact DonPablone before Codex commits | Ask early — a yes makes his PDFs/graphics usable; a no costs nothing already planned |
| D5 | Author tower profiles for the 2 paid heroes (Al-Hawra, Achilles: `troop`, `siegeBias`, weighted `demand` in `js/specialization-hero-paths.js`) | Judgement work — owner + a sighted/judgement model against the heroes' skill text in HERO-DATA.md §3; never guess. Free 9 land without it |

## Phase 0 archive status

`work/l96-codex-sources/`: heroes list + sample profile, Lofty article, chaos
shell, 6 economy/guide posts, Raider + Trader sheets (text), HeroDuels numbers,
Roecast, broken stamina + specialty planner pages, htm2txt.py, SOURCES.md.
`work/roc-research-sources/`: research_data.js + summary + provenance notes.
`work/x10-x12-source/`: HERO-DATA.md (no-vision hero package, parse-validated),
x12-research.json + x12-research-nodes.md (regenerated + cross-verified), README.
Still to locate on l96.app (pagination broken): T9/Zone totals article, Main
Building Costs, Hero Duels methodology, S1 hero update, dated combo guides.
Unlocated everywhere: image-only transcriptions (D3).

## Deliberately skipped

Old Google Site charts, Viber rooms, donation flow, login-gated l96 `/tools`,
their hero images, their watermark, their Specialty Planner / Stamina calculator
implementations (Rustablesafe), mirrored copies of anyone's curated sheets.
