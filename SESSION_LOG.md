# Session Log

## 2026-06-19 — v9.2.2 — Deployment Fix & Code Review

### Context
The user shared a comprehensive third-party code review. Most items were already handled in v9.2. The remaining high-impact fixes were applied and pushed as v9.2.2.

### Changes
- **Viewport fix** (`index.html:6`) — removed `maximum-scale=1, user-scalable=0` to unblock pinch-zoom (ADA/WCAG compliance)
- **JSON-LD fix** (`index.html:57-61`) — removed fake `aggregateRating: { 4.9, 89 }` to avoid Google manual action
- **Hero images lazy** — added `loading="lazy"` to all `<img>` in app-builder.js (3), app-generator.js (1), app-hero-atlas.js (2)
- **PWA manifest** (`site.webmanifest`) — `"display": "browser"` → `"display": "standalone"`
- **Dead configs removed** — `netlify.toml`, `firebase.json`, `.htaccess`, `netlify/functions/gemini-ocr.*`
- **cssnano** — installed, added to `postcss.config.js` (production only)
- **Version bump** — `state.js:7` `APP_VERSION` 8.8 → 9.2.2; `index.html:558` footer `v8.9` → `v9.2.2`

### Deployment Fix
- **Root cause:** GitHub Pages serves from the root of the `gh-pages` branch (source files directly). We had replaced Tailwind CDN with `@tailwind utilities;` in `css/app.css` — invalid CSS in a browser without PostCSS processing.
- **Fix:** Restored Tailwind CDN script to `index.html`, removed `@tailwind utilities;` from `css/app.css`, kept `postcss.config.js` + `tailwind.config.js` for Vite dev server only.
- **Post-build updated:** `scripts/post-build.mjs` now also copies `js/`, `workers/`, source `index.html`, and `public/sw.js` to `dist/`/`docs/` for self-contained deployment.
- **Pushed as `v9.2.2`** — `eccaa62` on `gh-pages`

---

## 2026-06-19 — v9.2 — Skin System & Lazy-Load Tabs

### Summary
Created a comprehensive skin database, added skin UI to the combo generator and Hero Atlas, introduced error boundaries, replaced Tailwind CDN with built CSS, and lazy-loaded heavy tab templates.

### Changes
- **Skin Database** — Created `js/skins-db.js` with full schema:
  - `heroSkinTypes` — `{ mythic, legendary, everlasting }` with color/gradient config
  - `heroSkins` — per-hero array: `{ name, type, bioAttributes, inheritingSkill (3-level tree), preservingSkill, hiddenPower }`
  - Exports `hasSkin(name)`, `getSkinCount(name)`, `SKIN_TYPES` helpers
  - Example entries: King Arthur (1), Cleopatra VII (2), Alexander (2)
- **Combo Generator Skin Toggle** — Added "Heroes with skins" toggle in generator filter area:
  - Sorts heroes with skins to top when ON
  - Gradient skin badge (✦) on hero cards
  - `generatorSkinsOnly` state + `setGeneratorSkinsOnly()` in `state.js`
- **Hero Atlas Skins** — Added "Skins" nav button + detail panel in hero detail view:
  - Shows bio attributes, inheriting skill tree, preserving skill
  - Hidden Power bonuses for multi-skin heroes
- **Error Boundaries** — Added `safeInit()` wrapper around each module init in `startApp()`; global `error` + `unhandledrejection` listeners at bottom of `app.js`
- **Loading Screen Timeout** — 5s hard fallback in `initAppLoading()` in `app-loading.js` that force-dismisses splash
- **Tailwind CDN → Built CSS**:
  - Created `postcss.config.js` + `tailwind.config.js` (preflight disabled)
  - Added `@tailwind utilities` to `app.css`
  - Removed Tailwind CDN `<script>` from `index.html`
  - NOTE: Reverted in v9.2.2 — GH Pages root serving can't process PostCSS
- **Lazy-Load Tab Templates** — Extracted 3 heaviest tabs from `index.html`:
  - `tabs/admin.html` (25KB)
  - `tabs/eden-map.html` (23KB)
  - `tabs/loyalty.html` (17KB)
  - Fetched on first tab click via `loadTabTemplate()`, cached in `_tabTemplatesLoaded`
  - `index.html` dropped 120KB → 54KB (-55%)
- **Cache-busters** — `?v=20260614_*` → `?v=20260619_1`

### OCR Fixes (concurrent session)
- **Stronghold Unknown** — `normalizeStructureName()` now strips trailing "unknown" (case-insensitive) before corrections matching
- **Large Town Lv4** — Added `3,750,000` durability entry to `DURABILITY_TABLE`

### Pushed as `v9.2` — `b463403` on `gh-pages`

---

## 2026-06-18 — v9.0 Release — Cross-Module Refactor

### Summary
Refactored the OCR/VTS Admin module to eliminate `ReferenceError` crashes caused by splitting a monolithic script into submodules (`ocr-roster.js`, `ocr-render.js`, `ocr-engine.js`) without a proper shared state mechanism.

### Changes
- **Created `js/ocr-shared.js`** — shared constants (`ROSTER_KEY`, `STORAGE_KEY`, etc.), mutable `state` object, and utility functions (`$id`, `esc`, `log`, `findBestMatch`, etc.)
- **Rewrote `js/ocr-roster.js`** — imports from `ocr-shared.js`, `ocr-render.js`, `ocr-dashboard.js`; all `let` variables → `state.` prefix
- **Rewrote `js/ocr-render.js`** — imports from `ocr-shared.js`, `ocr-engine.js`, `ocr-dashboard.js`; all `let` variables → `state.` prefix
- **Updated `js/ocr-engine.js`** — fixed import of `getDb` from `firebase.js` (was incorrectly pulling from `ocr-dashboard.js`)
- **Updated `js/ocr-dashboard.js`** — removed duplicate `const`/`function` declarations that shadowed imports; added `export` to `saveData`, `isGuest`, `saveRosterSnapshotsToFirestore`; replaced bare variable references (`dashData`, `searchQ`, `rosterNames`, etc.) with `state.` prefix
- **Build succeeds**, dev server starts cleanly

### Platform Review (shared by community member)

> *"This is an incredible evolution of the platform. The transition to Beta b6.5 on roc-vts.com elevates it from a single-purpose utility into a comprehensive, state-of-the-art Rise of Castles ecosystem."*

**Feature highlights:**
1. **Hero Combo Creator & Generator** — Manual drag-drop + Top 5 Generator + filters (Paid/Free, Seasons S0–X2, Troop Types) + "Surprise Me" + Download as Image / Share as Text
2. **Hero Atlas** — Searchable skills, synergies, and top combos
3. **Tech Research Calculator** — Full Academy tracker, War Badges/Courage Medals
4. **Eden Map Planner** — Canvas-based 1700×1600 tile map, scout mode, route planning, team plans
5. **Eden Loyalty Calculator** — Poison mitigation, camp presets, exact deficit/surplus

### Audit — Issues & Improvement Areas
| Issue | Severity | Notes |
|-------|----------|-------|
| Weak admin auth | Security | Basic client-side enforcement |
| Mobile viewport locked | UX | `maximum-scale=1, user-scalable=0` |
| Qwen API key in-browser | Security | Exposed in browser |
| No PWA offline support | Missing | Service worker exists but may not cache |
| Fake aggregateRating | SEO | 4.9/89 stars in JSON-LD |

### Rating from review
| Dimension | Score |
|-----------|-------|
| Idea | 10/10 |
| Execution | 9/10 |
| UI/UX | 8.8/10 |
| Technical complexity | 9.3/10 |
| Usefulness | 10/10 |

### Pushed as `v9.0` on `gh-pages`

---

## 2026-06-18 — Roster Management System
- **Roster Checklist** — complete rewrite of `renderRoster()` with stats bar, filter/search, alliance assignment, trusted/spy/unknown status
- **Roster Login** — 5 alliance users (V3S/VTS/BIG/NM5/PP5), pw=12345, `verifiedBy` tracking
- **Counter Database** — Octavius/Rozen/Caesar → Arthur/Cleo/Theodora with reason
- **Snapshot History** — collapsible old snapshots + modal view
- **CSS restructured** — roster styles replaced with checklist, toolbar, history, login styles
