# Specialization Topology — Plan 2: Implementation (DeepSeek)

**Audience:** DeepSeek implementer  
**Depends on:** `docs/specialization-topology-plan-1-analysis.md`  
**Date:** 2026-08-12  
**Product version at write time:** 14.3.2 (bump only when shipping user-visible changes)  
**Branch policy:** `git fetch origin` → `git switch -c codex/towers-<short> origin/gh-pages` — never commit/push `gh-pages` directly.

---

## 0. Mission (one paragraph)

Make Specialization Towers a **local-first tool**: add `towers:*` npm scripts so topology/UI/data work is verified in minutes against `/specialization-towers.html` only; make the standalone page the **canonical UI**; thin or deep-link the main-site tab so we stop maintaining two full renderers; keep data/model/store as the single shared contract for Battle Simulator and AI. Do **not** invent prerequisite edges. Do **not** run full `npm run check` inside the daily Towers loop.

---

## 1. Non-goals

- Full monorepo workspace split.
- Rewriting the 255KB corpus from scratch.
- Guessing `prerequisiteNodeIds` from completed-graph screenshots.
- Changing Battle Simulator formulas.
- Deploying or pushing to `gh-pages`.
- Firebase preview unless owner asks.

---

## 2. File ownership (edit these / avoid those)

### 2.1 Primary edit set (Towers loop)

| Area | Files |
|------|--------|
| Standalone shell | `specialization-towers.html` |
| Boot / app UI | `js/specialization-towers-v2.js`, `js/specialization-towers-v2-app.js` |
| CSS | `css/specialization-towers-v2.css` |
| Data / model / store | `js/specialization-towers-v2-data.js`, `js/specialization-towers-v2-model.js`, `js/specialization-towers-v2-store.js`, `js/specialization-towers-v2-assets.js`, `js/specialization-towers-v2-contributions.js`, `js/specialization-towers-v2-template.js` |
| Troop evidence overlays | `js/specialization-towers-v2-archer-data.js`, `js/specialization-towers-cavalry-data.js`, `js/specialization-footman-evidence.js` |
| i18n | `js/i18n/specialization-towers-v2/**` |
| Evidence assets | `docs/specialization/**`, `database/specialization/**` |
| Tests | `tests/unit/specialization-*.test.mjs`, `tests/unit/app-specialization-ui.test.mjs`, `tests/p1-specialization-towers-v2.spec.js` |
| Tooling | `package.json` scripts; optional `scripts/towers-*.mjs`, `playwright.towers.config.js` |
| Docs | Plan 1/2, README Specialization section if scripts/URL change |

### 2.2 Integration-only (when thinning the tab)

| Files | Rule |
|-------|------|
| `js/app-specialization.js` | Replace with thin mount/redirect; do not add features here |
| `js/app.js` (dynamic import site only) | Keep lazy load; point at thin wrapper |
| `index.html` / tab markup for specialization | Minimal chrome + mount node or link-out |

### 2.3 Touch only with contract tests

| Consumer | Files | Required tests on change |
|----------|--------|---------------------------|
| Battle Simulator | `js/battle-simulator-*.js` imports | `tests/unit/battle-simulator-specialization.test.mjs` |
| AI | `js/ai/tool-adapters-app.js` | existing AI/unit coverage if any; at least smoke import |
| SW / build | `public/sw.js`, `vite.config.js` | keep Towers input + SW path |

### 2.4 Do not edit unless necessary

- Unrelated `tests/app-smoke.spec.js` flows  
- Admin, BoH, Eden, Arcade, Velo production workers  
- `gh-pages` branch  

---

## 3. Phased delivery

Ship as **one PR if small**, or **two PRs** (tooling first, UI converge second). Prefer small reversible PRs per AGENTS.md fast lane.

### Phase A — Local gate + docs (do first)

**A1. Add npm scripts** to root `package.json`:

```json
"towers:dev": "vite --open /specialization-towers.html",
"towers:test:unit": "node --test tests/unit/specialization-towers-v2-*.test.mjs tests/unit/specialization-towers-cavalry-data.test.mjs tests/unit/specialization-footman-evidence.test.mjs tests/unit/app-specialization-ui.test.mjs",
"towers:test:ui": "playwright test tests/p1-specialization-towers-v2.spec.js --reporter=line",
"towers:test": "npm run towers:test:unit && npm run towers:test:ui",
"towers:check": "npm run towers:test"
```

Notes:

- On Windows PowerShell, `vite --open /specialization-towers.html` is fine under npm scripts.  
- If globs fail on Windows `node --test`, expand to an explicit file list or a tiny `scripts/towers-test-unit.mjs` that spawns `node --test` with the file array.  
- `towers:test:ui` needs a running dev server **or** Playwright webServer config. Prefer a dedicated `playwright.towers.config.js`:

```js
// playwright.towers.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: 'p1-specialization-towers-v2.spec.js',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:5173' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173/specialization-towers.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Then:

```json
"towers:test:ui": "playwright test --config=playwright.towers.config.js --reporter=line"
```

**A2. Document the loop** in README under Specialization Towers / Quick Start:

```bash
npm run towers:dev    # http://127.0.0.1:5173/specialization-towers.html
npm run towers:test   # unit + focused Playwright
npm run towers:check  # local Towers gate
# integrate only when shipping:
npm run check:fast    # or npm run check if high-risk
```

**A3. Verify Phase A**

```bash
npm run towers:test:unit
npm run towers:test:ui
```

Both green before starting Phase B.

**Phase A exit:** Developer never needs full monorepo smoke to validate a Towers-only change.

---

### Phase B — Canonical standalone UI / kill dual-renderer drift

**B1. Export a stable mount API** (if not already clean) from `js/specialization-towers-v2-app.js`:

- Keep `mountSpecializationTowers(mountEl, options?)`.  
- Options may include `{ embedded: true }` for tab chrome differences (hide redundant page title, respect toolkit theme host).  
- Must work with only: mount node + Towers CSS + tokens CSS. No dependency on `app.js` globals beyond optional language bridge.

**B2. Thin `js/app-specialization.js`** to one of these (pick **B2-link** if mount proves messy; pick **B2-mount** if seamless tab UX is required):

#### Option B2-mount (preferred if low-risk)

```text
app-specialization.js
  - import mountSpecializationTowers from specialization-towers-v2-app.js
  - ensure css/specialization-towers-v2.css (+ tokens) applied for tab scope
  - mount into #specializationToolRoot / existing section root
  - remove duplicate overview/detail DOM builders and placeholder BADGE_ICON/NODE_ICON maps
  - preserve lazy import from app.js
```

#### Option B2-link (safest / fastest)

```text
app-specialization.js
  - render a short card: open full planner (specialization-towers.html) + optional progress summary using model/store only
  - no second graph renderer
```

**B3. CSS**

- Graph/layout rules live only in `css/specialization-towers-v2.css`.  
- Tab host may add a thin wrapper class; do not re-implement node graph in `app.css`.  
- If embedded, prevent toolkit footers/dock from covering inspector (reuse standalone z-index patterns).

**B4. Update tests**

- `app-specialization-ui.test.mjs`: assert thin wrapper behavior (mount called or link present), not old dual DOM.  
- Keep `p1-specialization-towers-v2.spec.js` as the UI source of truth.  
- If tab still mounts full UI, add one Playwright case in p1 or a small p1-tab spec that opens `index.html#specialization` **only if** you can do it without pulling entire app-smoke. Prefer not blocking local loop on full index boot.

**Phase B exit:** One graph implementation path; tab does not fork topology UX.

---

### Phase C — Topology pipeline (data honesty)

Only after A+B are usable.

**C1. Inventory prerequisites**

Add a dev-only unit test or script that reports:

- researches with full explicit `prerequisiteNodeIds` coverage  
- researches with partial/empty prereqs (e.g. Enhanced Tactics IV)  
- nodes where access is open because prereqs are unverified  

Do not “fix” by filling empties.

**C2. Evidence → edge encoding rules**

When owner supplies **partial unlock** screenshots later:

1. Store unmodified JPEG/PNG under the troop evidence folder.  
2. Record sha/path in the troop evidence module.  
3. Set `prerequisiteNodeIds` only for nodes proven locked→unlocked.  
4. Unit-test the specific research graph.  
5. Run `npm run towers:test`.

**C3. Medal costs**

- Keep whole-research totals.  
- Per-node costs stay `null`/unknown until per-node UI captures exist.  
- Never divide totals across nodes.

**C4. Enhanced Tactics II**

- Continue left/right pan evidence; do not require a single full-frame image to ship layout.

**Phase C exit:** Topology changes are evidence-linked and covered by `towers:test:unit`.

---

### Phase D — Optional lab isolation (only if A is still slow)

If `vite` cold start or monorepo root scan remains painful:

1. Add `tools/specialization-towers-lab/` or `scripts/towers-lab-server.mjs` serving standalone HTML + JS/CSS/assets on loopback (pattern: `docs/velo-lab.md`).  
2. Ensure lab is **not** in Vite production inputs / post-build copy.  
3. Point `playwright.towers.config.js` webServer at the lab.  
4. Document `npm run towers:lab`.

Skip Phase D unless measured need.

---

## 4. Implementation checklist (DeepSeek execution order)

Copy this into the PR body and tick as you go.

### Tooling

- [ ] `playwright.towers.config.js` (or equivalent webServer)  
- [ ] `package.json` `towers:dev` / `towers:test:unit` / `towers:test:ui` / `towers:test` / `towers:check`  
- [ ] Windows-safe unit file list  
- [ ] README quick commands  

### Canonical UI

- [ ] Confirm `mountSpecializationTowers` is the only graph mounter  
- [ ] Thin or link `app-specialization.js`  
- [ ] No new features in the old tab renderer  
- [ ] Standalone still has zero Battle Simulator preload (existing p1 assertion)  

### Data / topology (only if this PR includes corpus edits)

- [ ] No invented edges  
- [ ] Evidence paths updated  
- [ ] Model access tests still pass  
- [ ] Store schema unchanged **or** version bumped with migration + Simulator test  

### Verification

- [ ] `npm run towers:test` green  
- [ ] If model/store/contributions changed: `node --test tests/unit/battle-simulator-specialization.test.mjs`  
- [ ] If shipping user-visible: version surfaces + `CHANGELOG.md` + `npm run version:check`  
- [ ] Integrate PR: `npm run check:fast` minimum; full `npm run check` if high-risk (schema, auth, broad CSS, multi-tool)  

### Git

- [ ] Branch from latest `origin/gh-pages`  
- [ ] PR base `gh-pages`  
- [ ] No secrets, no direct `gh-pages` push  

---

## 5. Coding standards (match repo)

- No new comments unless owner asked.  
- ES modules, existing naming (`SPECIALIZATION_*`, `data-specialization-*`).  
- Do not introduce new UI libraries.  
- i18n: user-visible strings via `specialization-towers-v2` packs; update `en.js` first, then other locales or keep English fallback behavior consistent with existing loader.  
- Preserve CSP on `specialization-towers.html` (`script-src 'self'`, etc.).  
- Progress key `vts_specialization_towers_v2` stays stable unless intentional migration.

---

## 6. Acceptance tests (definition of done)

| # | Criterion | How to prove |
|---|-----------|--------------|
| 1 | Local Towers gate exists and is documented | `npm run towers:check` + README |
| 2 | Unit slice runs without full monorepo unit set | `towers:test:unit` finishes with only Towers-related files |
| 3 | UI tests hit standalone only by default | Playwright config testMatch = p1 specialization |
| 4 | Standalone loads 3 troops × 8 columns | existing p1 test |
| 5 | No BS asset preload on Towers route | existing p1 assertion |
| 6 | Single canonical graph implementation | tab is thin mount or link; no duplicate node-path DOM builder |
| 7 | Simulator contract intact if shared modules touched | battle-simulator-specialization unit |
| 8 | Topology honesty | empty/partial prereqs remain where evidence lacks direction; new edges have tests + evidence refs |
| 9 | Production path unchanged | still PR → `gh-pages`; SW still lists route |

---

## 7. Suggested commit / PR shape

**PR 1 — tooling only (docs + scripts, no version bump if docs-only policy applies):**

```text
title: Add local Specialization Towers test lane
body: Plan 1/2 docs + towers:* scripts + playwright.towers.config.js
```

**PR 2 — UI converge (user-visible → version bump per cadence):**

```text
title: Canonicalize Specialization Towers standalone UI
body: thin tab, mount API, towers tests green, check:fast
```

**PR 3 — topology evidence batches (as owner supplies shots):**

```text
title: Encode verified specialization prerequisites for <research>
```

---

## 8. DeepSeek prompt pack (paste when starting work)

```text
Implement docs/specialization-topology-plan-2-implementation.md Phase A fully.
Then Phase B using B2-mount if straightforward, else B2-link.
Do not invent prerequisiteNodeIds.
Do not run full npm run check unless integrating a ship PR.
Use npm run towers:test as the local gate.
Branch from origin/gh-pages with codex/ prefix.
Read plan-1 analysis first. Match existing code style; no new comment noise.
```

---

## 9. Rollback

- Scripts/docs only: revert PR; no user impact.  
- Tab thin-mount issues: flip tab to B2-link (open standalone) without touching corpus.  
- Bad topology encode: revert data commit; progress schema unchanged so user saves remain valid.

---

## 10. Handoff back to owner

When a phase is done, report:

1. Phase letter + files touched  
2. `towers:test` result  
3. Any consumer tests run  
4. Open questions (especially evidence gaps)  
5. Whether a version bump / production PR is ready  

Do not merge to `gh-pages` yourself unless the owner explicitly orders a fast-merge per AGENTS.md.
