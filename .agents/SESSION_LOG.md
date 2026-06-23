# Session Log — Hero Combo Creator

> **Read this file at the start of every new session.** It is the single source of truth for what has been done, what's in progress, and how to work in this codebase. Update it after every significant change.

---

## 1. Quick Start

```bash
npm run dev      # Vite dev server (hot reload)
npm run build    # Build → dist/ + docs/ (GitHub Pages)
npm run preview  # Preview production build locally
```

**Tech stack:** Vanilla HTML/JS/CSS, Vite bundler, Firebase Firestore (anonymous auth), Qwen VL API for OCR.

**Current version:** 11.3.1

### Latest Release Notes - 2026-06-23

- Version cadence: 11.3.0 is the baseline. Every pushed release increments the patch slot through 11.3.19; the next release after that becomes 11.4.0. Repeat the same 20-release cycle for future minor versions.
- 11.3.1 tightens generated combo cards, adds filtered-score normalization, and records the latest counter relationships.
- Admin cloud sync now has repo tooling for the required Firebase custom claim: `npm run firebase:admin-claim` with `FIREBASE_SERVICE_ACCOUNT_PATH` and the deployed anonymous admin UID.
- Firestore admin writes intentionally remain protected by `request.auth.token.admin === true`; the local admin password only opens the UI.
- Eden runtime structure markers now use small `*-marker.webp` files. The large source art stays available for regeneration but should not be precached in the service worker.
- Strife Over Dragon availability uses hero release-season progression for S0-X8 recommendations.

---

## 2. Architecture Overview

### Entry Point
`index.html` → `<script type="module" src="js/app.js">` → imports everything.

### Module System
ES Modules (`import`/`export`). No bundler plugins (vanilla Vite). External CDN imports for Firebase and html2canvas.

### State Management
- `js/state.js` — centralized shared state with exported `let` variables + setter functions
- `app.js` registers UI functions (tooltip, modal) via `registerUiFunctions()` callback pattern
- `ocr-dashboard.js` uses module-level `let` variables for all dashboard state
- `eden-map.js` wraps everything in a single giant closure (`initEdenMapPlanner()`)

### Build Output
Vite produces 2 chunks:
- `index-*.js` — everything except Eden
- `eden-*.js` — all Eden map modules (via `manualChunks` in vite.config.js)
- `index-*.css` — all CSS combined

Post-build script (`scripts/post-build.mjs`) copies `dist/` → `docs/` for GitHub Pages.

### Firebase
- Anonymous auth via `ensureAnonymousAuth()`
- Firestore paths: `vts_admin/dashboard_data`, `vts_admin/roster_data`, `vts_saved_combos`
- Real-time listeners via `onSnapshot()`
- Offline-first: localStorage first, then Firestore

---

## 3. File Size Map (files > 200 lines)

 | File | Lines | Bytes | Role | Splittable? |
|------|------:|------:|------|:-----------:|
| `js/translations.js` | 1,740 | 138K | i18n strings (data) | — |
| `js/ocr-dashboard.js` | 2,178 | 124K | VTS Admin dashboard | ✅✅ YES |
| `js/tech-db.js` | 1,065 | 185K | Tech tree database (data) | — |
| `js/eden-map.js` | 2,310 | 91K | Eden Map planner | ⚠️ Closure |
| `js/eden-map-data.js` | 1,042 | 62K | Eden map data (data) | — |
| `js/heroes-info.js` | 585 | 55K | Hero skills data (data) | — |
| `js/app-research.js` | 978 | 53K | Research calc (extracted from app.js) | — |
| `js/app.js` | 734 | 27K | Main app controller (after split) | — |
| `js/app-hero-atlas.js` | 499 | 24K | Hero Atlas tab (extracted) | — |
| `js/eden-map-assets.js` | 688 | 24K | Image preloading | — |
| `js/loyalty-calculator.js` | 379 | 20K | Loyalty calculator | — |
| `js/eden-map-guide.js` | 348 | 18K | Guide overlay | — |
| `js/eden-map-terrain.js` | 443 | 18K | Terrain/pathfinding | — |
| `js/eden-map-features.js` | 372 | 14K | Structure features | — |
| `js/app-builder.js` | 332 | 14K | Manual combo builder | — |
| `js/comments.js` | 219 | 11K | Firestore comments | — |
| `js/app-generator.js` | 253 | 10K | Combo generator | — |
| `js/state.js` | 198 | 10K | Shared state hub | — |
| `js/combos-db.js` | 189 | 11K | 180 ranked combos | — |
| `js/app-loading.js` | 221 | 9K | Boot splash | — |
| `js/app-export.js` | 214 | 8K | Canvas export (extracted) | — |
| `js/combo-counters.js` | 201 | 8K | Counter matchups | — |
| `js/app-hero-tooltip.js` | 142 | 8K | Hero tooltip (extracted) | — |
| `css/app.css` | 5,963 | 231K | All styles | ✅✅ YES |
| `css/mobile.css` | 832 | 36K | Mobile overrides | — |
| `index.html` | ~1,300 | 120K | SPA shell | — |

---

## 4. Refactoring Plan — Code Splitting

### Phase 1: Split `app.js` (2,856 → ~800 lines) ✅ **COMPLETED**

| New File | Lines from app.js | What moves |
|----------|:-----------------:|------------|
| `js/app-research.js` | ~1,110 lines | `initResearchCalculator`, `renderTechList`, `renderCalculator`, `renderGameCalculator`, game tree layout, node press, `calculateTechTotals`, `updateGlobalSummary` |
| `js/app-hero-atlas.js` | ~440 lines | `computeHeroRankings`, hero filtering, `renderHeroesTab`, detail view, season scope toggle |
| `js/app-export.js` | ~260 lines | `renderCombosToCanvas`, `roundRect`, `circleClipImage`, `captureElementAsImage` |
| `js/app-hero-tooltip.js` | ~200 lines | `formatSkillText`, `showHeroTooltip`, `moveHeroTooltip`, `hideHeroTooltip` |

**After split, `app.js` becomes:** imports → theme → data normalizer → modal → UI wiring → tab switching → text content → tab scroll → init. **734 lines** (down from 2,856).

### Phase 2: Split `ocr-dashboard.js` (2,350 → ~700 lines)

| New File | Lines from ocr-dashboard.js | What moves |
|----------|:---------------------------:|------------|
| `js/ocr-roster.js` | L243–L1004 (~760 lines) | All roster management: snapshots, login, alliances, bulk actions, banners, renderRoster |
| `js/ocr-render.js` | L1318–L1737 (~420 lines) | Dashboard render, KPIs, leaderboard, insights, modals |
| `js/ocr-engine.js` | L1759–L2033 (~275 lines) | OCR processing, Qwen API, `parseOcrResults`, structure normalization |

**After split, `ocr-dashboard.js` becomes:** imports → helpers (esc, log, JSON repair, fuzzy match) → auth → persistence → exports → boot wiring. ~700 lines.

### Phase 3: Split `css/app.css` (6,234 → ~1,500 lines)

| New File | Lines from app.css | What moves |
|----------|:------------------:|------------|
| `css/research.css` | L882–L1595 (~713 lines) | Research tab, game tree, tech calculator |
| `css/hero-atlas.css` | L1937–L2596 (~660 lines) | Hero Atlas tab, detail view, season pills |
| `css/eden-map.css` | L2597–L4606 (~2,010 lines) | Eden Map planner |
| `css/ocr-dashboard.css` | Already exists | Dashboard-specific styles |

**After split, `app.css` becomes:** variables → base → boot splash → tabs/filters → hero cards → combos → toasts → footer → light theme overrides. ~1,500 lines.

### Phase 4: Vite Chunk Optimization

Update `vite.config.js` to add manual chunks:
```js
manualChunks(id) {
  if (id.includes('eden-map') || ...) return 'eden';
  if (id.includes('ocr-dashboard') || id.includes('ocr-')) return 'admin';
  if (id.includes('translations')) return 'translations';
  if (id.includes('tech-db')) return 'tech-data';
}
```

### Phase 5: Performance Quick Wins
- Lazy-load YouTube iframes via `IntersectionObserver` (already use `data-src`)
- Lazy-load `html2canvas` on demand (currently loaded at page load)
- Remove Tailwind CDN (line 67 of index.html) — only used for utility classes in Hero tooltip

---

## 5. Window-Scoped Functions (must stay or be refactored)

These functions are referenced by inline `onclick=` in generated HTML:

**In `ocr-dashboard.js`:**
`window.deleteAttack`, `window.editAttack`, `window.addPlayer`, `window.editPlayer`, `window.showPlayer`, `window.showAttack`, `window.exportPlayerReport`, `window.shareChartImage`, `window.loadMoreLeaderboard`, `deleteRosterSnapshot`, `setRosterStatus`, `setRosterAlliance`, `toggleBulkCheck`, `toggleBulkSelectAll`, `applyBulkStatus`, `applyBulkAlliance`, `rosterLogin`, `rosterLogout`, `configureAlliances`, `copyRosterNames`, `showRosterSnapshotModal`, `closeModal`, `deleteBannerRecord`, `showBannerForm`

**In `app.js`:**
`window.quickMaxTech`

**Strategy:** When splitting, either:
1. Keep `window.` assignments in the boot function, or
2. Use event delegation (`document.addEventListener('click', ...)` with `data-action` attributes)

---

## 6. localStorage Keys

| Key | Purpose | Used by |
|-----|---------|---------|
| `vts_ocr_dashboard` | Attack data JSON | ocr-dashboard.js |
| `vts_ocr_auth` | Admin password hash | ocr-dashboard.js |
| `vts_ocr_roster` | Legacy flat roster text | ocr-dashboard.js |
| `vts_roster_snapshots` | Roster snapshot array | ocr-dashboard.js |
| `vts_ocr_alliances` | Alliance name list | ocr-dashboard.js |
| `vts_roster_auth` | Logged-in roster user | ocr-dashboard.js |
| `vts_ocr_banners` | Banner records array | ocr-dashboard.js |
| `qwen_api_key` | Qwen API key | ocr-dashboard.js |
| `vts_hero_lang` | Language setting | app.js |
| `vts_intro_v1_seen` | First-visit flag | app-loading.js |
| `theme` | Light/dark theme | app.js |
| `vts_player_profile` | Cloud profile cache | player-profile.js |

---

## 7. Feature Backlog (Priority Order)

### Roster & Verification (In Progress)
- [x] Bulk actions — select multiple members, mark trusted/spy, assign alliance
- [x] Export CSV handler for `#dashRosterExportBtn`
- [x] Per-alliance auto-filter on login
- [x] Audit trail — `lastModified` + `verifiedBy` timestamps
- [x] Roster ↔ Performance cross-reference (OCR data overlay)
- [ ] **NEEDS REBUILD** — These features were patched via Python scripts in a previous session but the changes were reverted due to stability issues. Must be re-implemented cleanly after refactoring.

### Admin Dashboard
- [ ] Roster ↔ Performance cross-reference (overlay OCR attack data on roster)

### Combo System
- [ ] Hero skins database — skin variants and skin-specific combo rankings
- [ ] More counter matchups in `combo-counters.js`

### Technical Debt
- [ ] Replace Tailwind CDN with built Tailwind (or remove — only used for tooltip)
- [ ] Lazy-load YouTube embeds via IntersectionObserver
- [ ] Lazy-load html2canvas on demand
- [ ] Optimize Hero Atlas virtual scrolling

---

## 8. Edit Log

### 2026-06-18 — Session: Refactoring Plan + Knowledge Base
- **Created** `.agents/SESSION_LOG.md` (this file) — persistent knowledge base for agent continuity
- **Analyzed** all 42 JS files for line counts, section markers, import/export patterns
- **Mapped** splittable sections in `app.js`, `ocr-dashboard.js`, and `css/app.css`
- **Reverted** unstable Python-patched changes to `ocr-dashboard.js`, `app.js`, `index.html`, `app.css`
- **Cleaned** temp files: `patch_*.py`, `render_roster.js`, `roster_logic.js`, `scan_sections.py`
- **Note:** Tailwind CDN + PostCSS configs were added but should be evaluated — may not be needed if tooltip is rewritten with custom CSS
- **Status:** Codebase is at clean HEAD + README.md changes + new untracked files (`AGENTS.md`, `postcss.config.js`, `tailwind.config.js`, `css/ocr-dashboard.css`, `css/app.css.rej`)

### 2026-06-18 — Session: Roster Improvements (Re-implemented & Completed)
- **Implemented** roster bulk actions, CSV export, alliance auto-filter, audit trail, OCR overlay.
- **Method used:** Subagent `roster_implementer` generated the new `ocr-roster.js` module.
- **Outcome:** Changes applied successfully, syntax errors fixed (literal newlines converted to escaped 
), and deployed.
- **Lesson learned:** Vite dynamic imports `import('./module.js?v=...')` block esbuild from parsing unbundled JS files. Cache-busting strings must be removed to allow proper `manualChunks` bundling.

### 2026-06-18 — Session: Bug Fixes & Stabilization
- **Fixed:** `app-hero-tooltip.js` missing imports (`heroInfoEnabled`, `heroTooltip` element, `formatSkillText`, etc).
- **Fixed:** `SyntaxError: Unexpected reserved word` in `ocr-dashboard.js` (missing `async` on `exportChartPng`).
- **Fixed:** Vite build failure caused by unescaped multiline strings in `ocr-roster.js`.
- **Fixed:** Removed `?v=` from dynamic imports in `app.js` so Vite can bundle `ocr-dashboard.js` into the `admin` chunk properly.
- **Fixed:** Restored Tailwind CDN in `index.html` and empty fetch handler in `sw.js` per user request.

### 2026-06-18 — Session: app.js Code Splitting (Phase 1 Complete)
- **Executed** Phase 1 of refactoring plan: extracted 4 modules from `app.js`
  - `js/app-research.js` — research calculator (978 lines)
  - `js/app-hero-atlas.js` — hero atlas tab (499 lines)
  - `js/app-export.js` — canvas export (214 lines)
  - `js/app-hero-tooltip.js` — hero tooltip overlay (142 lines)
- **Fixed** duplicate import declarations in `app.js` (renderHeroesTab, downloadComboImage)
- **Fixed** `appT` circular dependency: moved from `app.js` → `js/utils.js`, updated imports in `app.js` and `app-research.js`
- **Cleaned** orphaned files: `apply_lazy.py`, `apply_roster.py`, `extract_modules_1.py`, `extract_modules_2.py`, `postcss.config.js`, `tailwind.config.js`, `app.css.rej` (3 copies)
- **Result:** `app.js` reduced from 2,856 → 734 lines. Build passes cleanly (
⚠️ 0 warnings).

### Earlier (pre-session)
- Version updated to 8.9 in README.md
- Light theme CSS overrides added for roster components
- OCR roster snapshot system built with Firestore sync
- Banner management system added
- Various Eden map, Hero Atlas, and VTS Admin improvements

---

## 9. Agent Instructions

### Workflow
1. **Read this file** at session start
2. **Check `git status`** to see what's modified
3. **Make changes incrementally** — edit one file at a time, build after each change
4. **Update this file** after completing significant work (add to Edit Log, update Feature Backlog)
5. **Always `npm run build`** to verify changes don't break the build

### Permissions Needed
- `read_file` on `D:\Project\hero-combo-creator2`
- `write_file` on `D:\Project\hero-combo-creator2`
- `command` for `npm`, `git`, `python`

### Code Style (from AGENTS.md)
- **No comments in code** unless absolutely necessary
- **Module imports** at top of file, one group per source
- **Global functions** use `function name()` (not arrow functions)
- **DOM queries** use `document.getElementById()` (aliased as `$id()` in ocr-dashboard)
- **Template literals** for HTML generation
- **Event handlers** prefer inline `onclick=` in generated HTML (matches existing pattern)
- **CSS** uses `#ocrDashboardRoot` namespace for admin dashboard styles

### Known Pitfalls
- **PowerShell escaping:** Multi-line Python one-liners fail due to PowerShell interpreting `$`, `()`, `||`. Always write to a `.py` file and run it instead.
- **Large file edits:** Use `multi_replace_file_content` with narrow line ranges. Never try to replace entire file content.
- **Build cache:** Old `dist/` and `docs/` assets may conflict. The hash in filenames changes on each build.
- **`.css.rej` files:** Leftover from failed patch attempts. Should be deleted.
- **Tailwind CDN:** Still in `index.html` line 67. Used by Hero tooltip's `formatSkillText()`. Remove only after rewriting tooltip CSS.

---

## 10. File Quick Reference

### Core App
| File | What it does |
|------|-------------|
| `js/app.js` | Main controller — theme, tabs, data normalizer, modal, UI wiring, tab switching, init |
| `js/app-builder.js` | Manual combo builder — drag-drop, slot render, save |
| `js/app-generator.js` | Auto combo generator — best & random modes |
| `js/app-loading.js` | Boot splash animation |
| `js/app-research.js` | Research calculator (extracted from app.js) |
| `js/app-hero-atlas.js` | Hero Atlas tab — rankings, filtering, detail view (extracted) |
| `js/app-hero-tooltip.js` | Hero tooltip overlay (extracted) |
| `js/app-export.js` | Canvas export — `renderCombosToCanvas`, `downloadComboImage` (extracted) |
| `js/state.js` | Shared state (language, filters, selections, slots) |
| `js/utils.js` | `escapeHtml()`, `appT()` |

### Data Files (read-only, no logic)
| File | What it contains |
|------|-----------------|
| `js/heroes-data.js` | 68 heroes: name, season, troop type, state |
| `js/heroes-info.js` | Hero skills, placement, copies |
| `js/hero-bonuses.js` | Manual rating adjustments |
| `js/combos-db.js` | 180+ ranked combos |
| `js/combo-counters.js` | Counter matchups + render |
| `js/tech-db.js` | Tech tree database (1,079 lines of data) |
| `js/translations.js` | i18n strings (11 languages) |

### Admin Dashboard
| File | What it does |
|------|-------------|
| `js/ocr-dashboard.js` | Full admin: OCR, roster, leaderboard, banners, export |

### Eden Map (12 files)
| File | What it does |
|------|-------------|
| `js/eden-map.js` | Core map controller (2,530 lines, giant closure) |
| `js/eden-map-data.js` | Static sector/structure definitions |
| `js/eden-map-assets.js` | Image preloading |
| `js/eden-map-terrain.js` | Terrain layer, pathfinding |
| `js/eden-map-features.js` | Structure features, filters |
| `js/eden-map-guide.js` | Help overlay |
| `js/eden-map-ui.js` | UI controls |
| `js/eden-map-teams.js` | Team management |
| `js/eden-map-season.js` | Season picker |
| `js/eden-map-scout.js` | Scout reports |
| `js/eden-map-construction.js` | Build timeline |
| `js/eden-map-config.js` | Constants |

### Other
| File | What it does |
|------|-------------|
| `js/firebase.js` | Firebase init, auth, db access |
| `js/comments.js` | Firestore community comments |
| `js/seo.js` | JSON-LD, meta tags |
| `js/game-time.js` | In-game clock |
| `js/loyalty-calculator.js` | Eden loyalty calculator |
| `js/research-node-icons.js` | Tech node SVG icons |
| `js/research-advanced.js` | Advanced research view |
| `js/player-profile.js` | Cloud profile sync |
| `js/combo-share.js` | Share combo via URL |
| `js/roster-share.js` | Share roster via URL |
| `js/pwa-register.js` | Service worker + install |
