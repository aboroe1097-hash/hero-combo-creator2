# Specialization Topology — Plan 1: Analysis

**Audience:** Vision analysis by OpenCode + implementation by DeepSeek
**Status:** Analysis complete — first cavalry batch limited to four researches
**Date:** 2026-08-12  
**Goal:** Stop paying a full monorepo `npm run check` (10–20+ min) after every Towers/topology edit. Treat Specialization Towers as a **local-first, separately gated tool**, then fold verified work back into production through the normal `gh-pages` PR flow.

---

## 1. Problem statement

Today, Towers work is entangled with the full ROC-VTS monorepo gate:

| Pain | Reality |
|------|---------|
| Slow feedback | `npm run check` runs version, lint, format, **all** unit tests, i18n, full Vite multi-page build, size budgets, prod smoke, and full smoke (`app-smoke` + all `p1-*`). |
| Dual UIs | Standalone `specialization-towers.html` **and** integrated tab `js/app-specialization.js` (loaded from `index.html` via `app.js`). Same data/model; different renderers. |
| Shared consumers | Battle Simulator imports Towers data/model/store/contributions. AI adapters import Towers data. Changing shared modules risks unrelated surfaces. |
| Topology honesty cost | Evidence screenshots are mostly **100% complete** graphs. They prove layout/node counts/art, **not** unlock direction or per-node medal costs. Filling topology without stronger evidence invents edges. |
| Full matrix overkill | Topology/data/UI iterations only need Towers unit + focused Playwright on `/specialization-towers.html`, not All-Star, Admin, Eden, Arcade, etc. |

**Desired outcome:** A developer (or agent) can iterate Towers locally in **seconds–low minutes**, with a dedicated gate, then run monorepo checks only when integrating to production.

---

## 2. Current architecture (as of 14.3.2)

### 2.1 Entry points

| Surface | Path | Boot |
|---------|------|------|
| **Standalone (canonical public planner UI)** | `specialization-towers.html` | `js/specialization-towers-v2.js` → dynamic import `specialization-towers-v2-app.js` |
| **Main-site tab** | `index.html` → `#specialization` | `js/app.js` dynamic import `app-specialization.js` |
| **Battle Simulator consumer** | `battle-simulator.html` | Reads progress/stats via `specialization-towers-v2-{data,model,store,contributions}.js` |
| **AI tool context** | `js/ai/tool-adapters-app.js` | Lazy import of Towers data for guide answers |

Vite multi-page input already includes `specialization-towers` (`vite.config.js`). SW precaches `/specialization-towers.html`.

### 2.2 Module map (Towers-owned)

```
specialization-towers.html
css/specialization-towers-v2.css
js/specialization-towers-v2.js                 # boot only
js/specialization-towers-v2-app.js             # standalone UI (~67KB)
js/specialization-towers-v2-data.js            # canonical corpus (~255KB / ~9.9k lines)
js/specialization-towers-v2-assets.js          # embedded emblems
js/specialization-towers-v2-model.js           # progress, access, prereqs
js/specialization-towers-v2-store.js           # localStorage
js/specialization-towers-v2-contributions.js   # battle-stat contributions
js/specialization-towers-v2-template.js
js/specialization-towers-v2-archer-data.js     # archer evidence overlay
js/specialization-towers-cavalry-data.js       # cavalry evidence overlay
js/specialization-footman-evidence.js          # footman evidence overlay
js/app-specialization.js                      # integrated tab UI (parallel renderer)
js/i18n/specialization-towers-v2/*            # en + locale packs + display helpers
```

### 2.3 Evidence / asset locations

| Troop | Full screenshots | Cropped icons | Manifest / code |
|-------|------------------|---------------|-----------------|
| Archer | `docs/specialization/archer/assets/evidence/` | `.../icons/{research,legion,nodes}/` | `js/specialization-towers-v2-archer-data.js` |
| Cavalry | `database/specialization/cavalry/assets/evidence/` | `.../icons/` | `js/specialization-towers-cavalry-data.js` + `manifest.json` |
| Footman | `database/specialization/footmen/evidence/2026-07-18/` | (evidence JPEGs; crops described in code) | `js/specialization-footman-evidence.js` |

Public planner emblems (runtime): `js/specialization-towers-v2-assets.js` + fixture `tests/fixtures/specialization-planner-assets.json`.

### 2.4 Persistence

- Progress key: `vts_specialization_towers_v2` (schema `roc-vts.specialization-towers` v1).
- Contributions (tab): `vts_specialization_contributions`.
- Active tower tab (standalone): `vts_specialization_towers_v2_active_tower`.

Battle Simulator and standalone/tab **must stay on the same progress schema** when sharing browser origin.

### 2.5 Tests already dedicated to Towers

**Unit** (`tests/unit/`):

- `specialization-towers-v2-data.test.mjs`
- `specialization-towers-v2-model.test.mjs`
- `specialization-towers-v2-store.test.mjs`
- `specialization-towers-v2-contributions.test.mjs`
- `specialization-towers-v2-page.test.mjs`
- `specialization-towers-v2-i18n.test.mjs`
- `specialization-towers-v2-accessibility.test.mjs`
- `specialization-towers-v2-archer-data.test.mjs`
- `specialization-towers-cavalry-data.test.mjs`
- `specialization-footman-evidence.test.mjs`
- `app-specialization-ui.test.mjs`
- `battle-simulator-specialization.test.mjs` (consumer contract — run on integrate, not every UI tweak)

**Browser:**

- `tests/p1-specialization-towers-v2.spec.js` → `/specialization-towers.html`
- Production smoke snippets in `tests/production-smoke.spec.js` for the built route

There is **no** `npm run` script today that runs only these. Developers hit full `test:unit` / `smoke` / `check`.

---

## 3. Topology / data truth model

### 3.1 What is already solid

- 32 researches × 8 columns; shared structure across troops with troop-specific names/effects.
- 718 attribute nodes, 384 milestones, 17 passives, 24 Legion Skills (public corpus).
- Whole-research medal totals from the public planner.
- Model rule: **missing `prerequisiteNodeIds` is never inferred as an edge** (`getResearchNodeAccess` in model).
- Enhanced Tactics IV: full 24-node catalog exposed; path edges not invented when corpus lacks them.
- Troop evidence packs confirm **visible completed arrangement**, node counts, and artwork for columns I–III + legion detail shots.

### 3.2 What evidence does **not** prove

From cavalry/footman/archer evidence modules and README:

1. Learning order / **directed** prerequisites  
2. Per-node medal costs  
3. 1:1 mapping of repeated same-art nodes to canonical numeric IDs from art alone  
4. Full single-frame Enhanced Tactics II (needs left+right pans)

### 3.3 Topology work policy (non-negotiable)

| Allowed | Forbidden |
|---------|-----------|
| Encode edges only when public planner or **partial unlock** screenshots prove direction | Guess edges from completed-graph line art alone |
| Leave `prerequisiteNodeIds` absent/empty and mark partial evidence | Fabricate costs by dividing research totals |
| Keep troop overlays read-only evidence; do not silently mutate canonical corpus | Replace contaminated/missing art with redrawn approximations without owner approval |
| Prefer standalone UI as the topology editor surface | Drive topology QA only through the dual tab renderer |

### 3.4 Vision/implementation split

DeepSeek is not responsible for interpreting screenshots. OpenCode performs the visual analysis and
returns a structured, reviewable data handoff. DeepSeek implements only that handoff.

**OpenCode owns:**

- Identifying the research and every visible node in each supplied image.
- Reading node icons, labels, effects, visible costs, state highlighting, and large/extra nodes.
- Reconstructing visible coordinates and undirected connection arrangement.
- Separating confirmed facts from visual ambiguity.
- Producing the final topology payload, evidence manifest, and confidence notes.

**DeepSeek owns:**

- Adding the supplied payload to the existing Cavalry data overlay/canonical data at the exact IDs
  specified by OpenCode.
- Adding tests for counts, labels, effects, costs, states, and any explicitly approved edges.
- Rendering the result in the standalone Towers UI and running the focused local gate.
- Never reinterpreting screenshots or filling values that are absent from the handoff.

**Current intake:** `C:\Users\alsel\Downloads\WhatsApp Unknown 2026-08-12 at 14.23.40`

This intake is **Cavalry only** and is restricted to the first four researches:

1. Cavalry Training I
2. Encounter Battle I
3. Call of Glory I
4. Enhanced Tactics I

The supplied images show completed graph layouts and selected-node detail states. They provide useful
node names/effects and state examples, including large/extra nodes and high-cost or extreme states.
They do not automatically prove directed prerequisite order. OpenCode must mark graph connections as
`arrangement-only` unless the image sequence visibly proves locked-to-unlocked order.

**Required OpenCode handoff format:**

```json
{
  "troopId": "cavalry",
  "researchId": "training1",
  "evidence": [{ "file": "...jpeg", "kind": "graph|node-detail|state" }],
  "nodes": [{
    "visualKey": "top-01",
    "icon": "hourglass",
    "name": "...",
    "effect": "...",
    "cost": null,
    "state": "complete|selected|unknown",
    "position": { "x": 0, "y": 0 },
    "size": "normal|large|extra",
    "confidence": "confirmed|probable|ambiguous"
  }],
  "connections": [{ "from": "top-01", "to": "right-01", "evidence": "arrangement-only" }],
  "directedPrerequisites": [],
  "notes": []
}
```

The payload is a working analysis artifact until owner review. `cost: null` and an empty
`directedPrerequisites` list are correct when the screenshots do not prove those fields.

---

## 4. Coupling analysis (what “fully separate” means)

### 4.1 Must stay shared (contracts, not UI)

These are **libraries**, not the Towers app shell:

- `specialization-towers-v2-data.js` + assets  
- `specialization-towers-v2-model.js` + store schema  
- `specialization-towers-v2-contributions.js` (Battle Simulator)

Separation does **not** mean forking the corpus into two incompatible datasets. It means:

1. **UI/dev loop** is standalone-only.  
2. **Test gate** is Towers-scoped.  
3. **Integration consumers** get explicit contract tests when data/model APIs change.

### 4.2 Should converge (duplicate UI debt)

`app-specialization.js` is a second renderer (overview → detail, placeholder glyph maps). Standalone `specialization-towers-v2-app.js` is the richer eight-column planner.

**Recommendation:** Canonical product UI = standalone page. Main-site tab becomes either:

- **A)** thin iframe/link/redirect to `specialization-towers.html`, or  
- **B)** thin wrapper that mounts `mountSpecializationTowers()` into `#specializationSection`,

…not a third layout. Plan 2 implements the thinner integration after local standalone is the daily driver.

### 4.3 CSS / build coupling

- Standalone CSS: `css/specialization-towers-v2.css` (good).  
- Tab still may lean on broader `app.css` selectors historically — any tab mount path must not depend on full toolkit chrome for graph correctness.  
- Build stamps (`?v=` query on html) are refreshed by monorepo build metadata; local Vite HMR does not need stamps.

### 4.4 What must never load on the Towers route

Already asserted by tests: no Battle Simulator asset preload from `/specialization-towers.html`. Keep that invariant when extracting packages or adding lab servers.

---

## 5. Target operating model (local-first)

Mirror **Velo Lab** spirit (`docs/velo-lab.md`, `npm run velo:lab`): isolated local loop, production path unchanged until intentional integrate.

```
┌─────────────────────────────────────────────────────────┐
│  LOCAL TOWERS LOOP (seconds–minutes)                    │
│  npm run towers:dev                                     │
│  → Vite (or thin static server) on /specialization-…    │
│  npm run towers:test                                    │
│  → unit (towers*) + playwright p1-specialization only   │
│  Optional: npm run towers:test:unit / towers:test:ui    │
└───────────────────────────┬─────────────────────────────┘
                            │ owner says “ship”
                            ▼
┌─────────────────────────────────────────────────────────┐
│  INTEGRATE (once per shippable slice)                   │
│  branch from origin/gh-pages                            │
│  version + CHANGELOG if user-visible                    │
│  npm run check:fast  (or full check if high-risk)       │
│  PR → gh-pages  (never direct push)                     │
└─────────────────────────────────────────────────────────┘
```

### 5.1 Suggested npm scripts (Plan 2 delivers)

| Script | Purpose |
|--------|---------|
| `towers:dev` | Dev server focused on standalone Towers (document URL). Prefer reusing `vite` with open path, or a tiny script that prints the URL. |
| `towers:test:unit` | `node --test tests/unit/specialization-*.test.mjs tests/unit/app-specialization-ui.test.mjs` |
| `towers:test:ui` | Playwright only `tests/p1-specialization-towers-v2.spec.js` against dev or preview |
| `towers:test` | unit + ui |
| `towers:check` | lint scoped paths optional + `towers:test` — **not** full monorepo build/smoke |

Do **not** require `npm run check` inside the local Towers loop. AGENTS.md fast lane already allows focused confidence for small fixes; this makes that lane **explicit and scripted**.

### 5.2 Optional harder isolation (later phase)

If monorepo Vite startup remains heavy:

- `tools/specialization-towers-lab/` static/lab server (like Velo Lab), loopback-only, **not** in `dist/`.  
- Or a Vite config fragment that only builds the Towers input.

Plan 2 Phase A does scripts + docs + dual-UI decision; Phase B only if still too slow.

---

## 6. Gaps and risks

| ID | Gap / risk | Severity | Mitigation |
|----|------------|----------|------------|
| G1 | Dual UI drift (tab vs standalone) | High | Canonicalize standalone; thin tab mount or deep-link |
| G2 | Battle Simulator contract break on model/export change | High | Keep `battle-simulator-specialization` tests on integrate; freeze store schema unless versioned migration |
| G3 | Topology filled from complete-graph screenshots | High | Evidence policy in §3.3; partial-unlock captures as follow-up owner assets |
| G4 | Full `check` still required for high-risk / version bumps | Med | Document when `towers:check` is enough vs `check` / `check:fast` |
| G5 | i18n packs large surface | Med | `towers:test` includes i18n unit tests; full `i18n:check` on integrate |
| G6 | Agent (DeepSeek) may edit wrong renderer | Med | Plan 2 file ownership table: default edits under standalone + data/model only |
| G7 | Evidence paths split (`docs/` vs `database/`) | Low | Normalize layout later; do not block separation |
| G8 | Production smoke still covers Towers route | Low | Keep one smoke assertion; do not expand monorepo smoke for every topology tweak |

---

## 7. Success criteria (Plan 1 done when…)

- [x] Architecture, coupling, evidence limits, and dual-UI debt are documented (this file).  
- [x] Local-first loop and script names are specified.  
- [x] Topology honesty rules are explicit for implementers.  
- [ ] Plan 2 implementation doc exists and is actionable by DeepSeek without further discovery.  
- [ ] Owner accepts: standalone is canonical; tab thinned or linked; local gate is `towers:*`.

---

## 8. Out of scope for this separation track

- Inventing missing prerequisite graphs without new evidence.  
- Clean transparent Research sprite redraws (see backlog LIMIT-002).  
- Firebase / Auth / App Check work.  
- Changing Battle Simulator combat math except via existing contribution snapshots.  
- Full monorepo package monorepo-split (npm workspaces) unless Phase B proves necessary.

---

## 9. Inputs DeepSeek should read before coding

1. This file (Plan 1).  
2. `docs/specialization-topology-plan-2-implementation.md` (Plan 2).  
3. `AGENTS.md` — branch from `origin/gh-pages`, never push `gh-pages`, fast lane rules.  
4. `specialization-towers.html` + `js/specialization-towers-v2-app.js` + `js/specialization-towers-v2-model.js`.  
5. Evidence READMEs / limitations in troop evidence modules.  
6. Existing tests listed in §2.5 — extend, do not discard.

---

## 10. Owner decisions locked by this analysis

Unless the owner overrides in writing:

1. **Canonical UI** = standalone `specialization-towers.html`.  
2. **Local gate** = `towers:test` / `towers:check`; monorepo `check` only on integrate / high-risk.  
3. **No invented topology edges.**  
4. **Shared data/model remain single source of truth** for Simulator + AI.  
5. **Ship path** remains PR into `gh-pages` after focused (or full) verification.
