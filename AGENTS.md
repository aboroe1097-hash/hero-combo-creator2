# Hero Combo Creator — Project Knowledge Base

> Hand this file to any new AI agent to get them fully up to speed.

## Quick Start

```bash
npm install
npm run dev      # Start dev server (Vite)
npm run build    # Build to dist/ + docs/
npm run preview  # Preview production build
```

Tech: Vanilla HTML/JS/CSS, Vite bundler, Tailwind CDN, Firebase Firestore, Qwen VL API.

---

## Architecture & Data Flow

### Entry Point
`index.html` → loads `js/app.js?v=<hash>` as `<script type="module">`

### Module Dependency Graph
```
index.html
 └─ js/app.js — main app, imports all sub-modules, global scope
     ├─ js/translations.js      — i18n strings (en + others)
     ├─ js/firebase.js           — Firebase init, anonymous auth, getDb
     ├─ js/comments.js           — Firestore snapshot comments
     ├─ js/combos-db.js          — rankedCombos array (180 entries)
     ├─ js/combo-counters.js     — counter matchups + render
     ├─ js/heroes-data.js        — allHeroesData (68 heroes, base info)
     ├─ js/heroes-info.js        — heroesExtendedData (skills, placement)
     ├─ js/hero-bonuses.js       — manual rating adjustments
     ├─ js/skins-db.js           — heroSkinTypes + heroSkins (skin data)
     ├─ js/state.js              — getComboRankInfo, troop colors, helpers
     ├─ js/utils.js              — escapeHtml, etc.
     ├─ js/seo.js                — JSON-LD, meta tags
     ├─ js/game-time.js          — game clock, sync titles
     ├─ js/tech-db.js            — tech tree database
     ├─ js/research-node-icons.js— tech node SVG icons
     ├─ js/app-loading.js        — boot splash, loading progress, 5s timeout
     ├─ js/pwa-register.js       — service worker + install prompt
     ├─ js/player-profile.js     — cloud profile sync
     ├─ js/combo-share.js        — share combo via URL
     ├─ js/roster-share.js       — share roster via URL
     ├─ js/eden-live-map.js      — live map overlay
     ├─ js/app-builder.js        — manual builder UI + logic
     ├─ js/app-generator.js      — combo generator UI + logic
     ├─ js/app-hero-atlas.js     — Hero Atlas tab (search, skills, skins)
     ├─ js/app-research.js       — Tech Research Calculator tab
     ├─ js/app-export.js         — Export (html2canvas, CSV, text)
     └─ js/app-hero-tooltip.js   — Hero tooltip hover logic

     Lazy-loaded by tab switch or explicit import():
     ├─ js/ocr-dashboard.js      — VTS Admin dashboard
     ├─ js/ocr-roster.js         — Roster checklist, login, alliances
     ├─ js/ocr-render.js         — Dashboard UI rendering
     ├─ js/ocr-engine.js         — OCR parsing logic
     ├─ js/ocr-shared.js         — Shared const/state/helpers for OCR
     ├─ js/eden-map.js           — Eden Map planner
     ├─ js/eden-map-data.js      — Eden map static data
     ├─ js/eden-map-assets.js    — Image preloading, icon management
     ├─ js/eden-map-terrain.js   — Terrain layer, pathfinding
     ├─ js/eden-map-ui.js        — Map UI controls, toolbars
     ├─ js/eden-map-features.js  — Structure features, filters
     ├─ js/eden-map-guide.js     — Guide/help overlay
     ├─ js/eden-map-season.js    — Season picker
     ├─ js/eden-map-teams.js     — Team management
     ├─ js/eden-map-scout.js     — Scout report overlay
     ├─ js/eden-map-construction.js — Construction timeline
     ├─ js/eden-map-config.js    — Constants
     ├─ js/eden-datasets-loader.js  — Decode Eden dataset payload
     ├─ js/loyalty-calculator.js — Eden Loyalty calculator
     └─ js/research-advanced.js  — Advanced research view
```

### Global State Variables (shared across modules via window scope)
- `allHeroesData` — hero list (heroes-data.js)
- `heroesExtendedData` — skill details (heroes-info.js)
- `rankedCombos` — ranked combo list (combos-db.js)
- `dashData` — OCR analytics data (ocr-dashboard.js)
- `rosterSnapshots` — roster snapshots array (ocr-dashboard.js)
- `bannerRecords` — banner day records (ocr-dashboard.js)

### Key Flows

#### 1. Combo Builder (Manual)
User selects 3 heroes → `updateManualComboScore()` → `getComboRankInfo()` → shows rank + score + counters.

#### 2. Combo Generator
User picks ≥12 owned heroes → `generateBestCombos()` → iterates `rankedCombos` → selects top 5 without overlap.
Skin toggle sorts skinned heroes to top and adds gradient skin badge (✦).

#### 3. OCR Roster (VTS Admin)
Upload screenshot → Qwen API extracts names → `takeRosterSnapshot()` → save to localStorage + Firestore → `renderRoster()` → checklist with alliance/status/verifiedBy.

#### 4. OCR Attack Data
Upload structure screenshots → Qwen API extracts attack data → saved to `dashData` → renders leaderboard, chart, insights.

#### 5. Eden Map Planner
Select season → view map → place/remove structures → plan routes → share plan.

### Firebase Integration
- Anonymous auth via `ensureAnonymousAuth()`
- Firestore paths:
  - `vts_admin/dashboard_data` — OCR attack data
  - `vts_admin/roster_data` — roster snapshots
  - `vts_saved_combos` — community shared combos (comments.js)
- Real-time listeners via `onSnapshot()` for roster and comments.
- All saves go to localStorage FIRST, then Firestore (offline-first).

---

## File Structure & What Each Does

### `/js/` — Core Application
| File | Lines | Purpose |
|------|-------|---------|
| `app.js` | ~860 | Main app: tabs, theme, event wiring, error boundaries, tab lazy-loader |
| `app-builder.js` | ~335 | Manual combo builder: drag-drop, slot rendering, save |
| `app-generator.js` | ~260 | Auto combo generator: best & random modes, skin toggle |
| `app-loading.js` | ~225 | Boot splash animation, loading progress, 5s timeout fallback |
| `app-hero-atlas.js` | ~565 | Hero Atlas tab: search, skills, synergies, top combos, skins |
| `app-research.js` | ~1095 | Research Calculator tab |
| `app-export.js` | ~250 | Export functions (html2canvas, rendering) |
| `app-hero-tooltip.js` | ~150 | Hero tooltip hover logic |
| `skins-db.js` | ~180 | Skin database: types (Mythic/Legendary/Everlasting), hero skin entries |
| `ocr-dashboard.js` | ~1135 | VTS Admin: main dashboard logic |
| `ocr-roster.js` | ~540 | Roster checklist, login, alliances |
| `ocr-render.js` | ~200 | Dashboard UI rendering |
| `ocr-engine.js` | ~305 | OCR parsing logic, structure name normalization, durability |
| `ocr-shared.js` | ~120 | Shared constants, state object, $id/esc/log helpers |
| `eden-map.js` | 2310 | Eden Map planner: map render, plans, routing |
| `eden-map-data.js` | 1042 | Eden map static data, sector definitions |
| `eden-map-assets.js` | 688 | Image preloading, icon management |
| `eden-map-terrain.js` | 443 | Terrain layer, pathfinding |
| `eden-map-ui.js` | 169 | Map UI controls, toolbars |
| `eden-map-features.js` | 372 | Structure features, filters |
| `eden-map-guide.js` | 348 | Guide/help overlay for Eden |
| `eden-map-season.js` | 89 | Season picker logic |
| `eden-map-teams.js` | 126 | Team management for Eden |
| `eden-map-scout.js` | 60 | Scout report overlay |
| `eden-map-construction.js` | 41 | Construction timeline |
| `eden-map-config.js` | 11 | Map constants/config |
| `combos-db.js` | 189 | Ranked combo database (180 entries) |
| `combo-counters.js` | 176 | Counter matchups, render functions |
| `combo-counter-lookup.js` | 56 | Search UI: which heroes counter which |
| `combo-share.js` | 31 | URL share for combos |
| `comments.js` | 219 | Firestore community comments |
| `heroes-data.js` | 69 | Hero base data (name, season, troop, state) |
| `heroes-info.js` | 585 | Hero skills, placement, copies |
| `hero-bonuses.js` | 15 | Manual rating adjustments |
| `state.js` | ~200 | Rank info, filters, troop colors, generatorSkinsOnly state |
| `translations.js` | 1740 | i18n string tables |
| `tech-db.js` | 1065 | Tech tree database |
| `research-node-icons.js` | 192 | SVG icons for tech nodes |
| `research-advanced.js` | 51 | Advanced research view |
| `loyalty-calculator.js` | 379 | Eden loyalty calculator |
| `game-time.js` | 140 | Game clock display |
| `firebase.js` | 67 | Firebase init, auth, db access |
| `player-profile.js` | 43 | Cloud profile save/load |
| `roster-share.js` | 29 | URL share for roster |
| `seo.js` | 119 | JSON-LD schema, meta optimization |
| `pwa-register.js` | 31 | Service worker, install prompt |
| `utils.js` | 10 | escapeHtml utility |
| `eden-datasets.payload.js` | 2 | Base64-encoded Eden datasets |
| `eden-datasets-loader.js` | 25 | Decode and load Eden datasets |
| `eden-tooltips.js` | ~30 | Eden control-deck hover tooltips |

### `/css/`
| File | Lines | Purpose |
|------|-------|---------|
| `app.css` | ~6150 | All styles (custom CSS + Tailwind utilities section) |
| `mobile.css` | 832 | Mobile-specific responsive overrides |

### `/tabs/` — Lazy-loaded Tab Templates
| File | Size | Purpose |
|------|------|---------|
| `admin.html` | ~25KB | VTS Admin dashboard HTML template |
| `eden-map.html` | ~23KB | Eden Map planner HTML template |
| `loyalty.html` | ~17KB | Eden Loyalty calculator HTML template |

### Root Config Files
| File | Purpose |
|------|---------|
| `index.html` | Single-page app shell (~650 lines, 54KB) |
| `vite.config.js` | Vite build config: entry, chunking, output |
| `postcss.config.js` | PostCSS plugins: Tailwind + Autoprefixer + cssnano (prod) |
| `tailwind.config.js` | Tailwind config (preflight disabled, content paths) |
| `scripts/post-build.mjs` | Post-build: copy assets (css/js/images/tabs) to dist/ + docs/ |
| `site.webmanifest` | PWA manifest (display: standalone, theme-color) |
| `public/sw.js` | Service worker for PWA |
| `public/404.html` | Custom 404 page |
| `workers/qwen-cors-proxy.js` | Cloudflare Worker: Qwen API CORS proxy |
| `database/build-eden-datasets.py` | Generate Eden dataset payload |

---

## Conventions & Permissions

### Code Style
- **No comments in code** unless absolutely necessary for clarity.
- **Module imports** at top of file, one group per source.
- **Global functions** use `function name()` (not `const name = () =>`).
- **DOM queries** use `document.getElementById()` (aliased as `$id()` in ocr-dashboard).
- **String escaping** via `esc()` in ocr-dashboard, `escapeHtml()` from `utils.js` elsewhere.
- **Template literals** for HTML generation (backtick strings).
- **CSS** uses `#ocrDashboardRoot` namespace for admin dashboard styles.
- **Event handlers** prefer inline `onclick=` in generated HTML for simplicity (matches existing pattern).

### Deployment Model
GitHub Pages serves from the **root** of the `gh-pages` branch. Source files (`index.html`, `js/`, `css/`) are served directly. The `dist/` and `docs/` folders are build artifacts for alternative hosting.

### Tailwind CSS
- Runtime: loaded via CDN (`cdn.tailwindcss.com`) with `preflight: false`
- Dev: Vite PostCSS plugin processes `@tailwind` directives from a separate entry
- `postcss.config.js` + `tailwind.config.js` enable Vite dev-server processing
- `cssnano` minifies in production builds

### Tab Lazy-Loading Pattern
Heavy tab templates (Admin, Eden Map, Loyalty) extracted from `index.html` into `tabs/` directory. Fetched on first tab activation via `loadTabTemplate()`, cached in `_tabTemplatesLoaded` map. Heavy JS modules (eden, ocr) use dynamic `import()`.

### Error Boundary Pattern
- Each module init wrapped in `safeInit()` wrapper in `startApp()`
- One failing tab doesn't block others
- Global `error` + `unhandledrejection` listeners at bottom of `app.js`
- 5-second loading screen timeout in `initAppLoading()` force-dismisses splash

### Firebase Rules
- Anonymous auth only.
- No delete/update operations from client (append-only for combos).
- Roster data: full replace via `setDoc`.

### localStorage Keys
| Key | Purpose |
|-----|---------|
| `vts_ocr_dashboard` | Attack data JSON |
| `vts_ocr_auth` | Admin password hash |
| `vts_ocr_roster` | Legacy flat roster text |
| `vts_roster_snapshots` | Roster snapshot array |
| `vts_roster_alliances` | Alliance name list |
| `vts_roster_user` | Logged-in roster user |
| `vts_ocr_banners` | Banner records array |
| `qwen_api_key` | Qwen API key (user-set) |

### Skin Database Schema
`js/skins-db.js` exports:
- `heroSkinTypes` — { mythic, legendary, everlasting } with color/gradient config
- `heroSkins` — per-hero array: { name, type, bioAttributes, inheritingSkill, preservingSkill, hiddenPower }
- `hasSkin(name)`, `getSkinCount(name)`, `SKIN_TYPES` helpers

---

## Change Log

### 2026-06-19 — v9.2.2 — Deployment Fix & Code Review
- **Viewport fix** — removed `maximum-scale=1, user-scalable=0` (ADA/WCAG accessibility)
- **JSON-LD fix** — removed fake `aggregateRating` (4.9/89 stars) to avoid Google manual action
- **Hero images** — added `loading="lazy"` to all hero portrait `<img>` tags (builder, generator, atlas)
- **PWA manifest** — `"display": "standalone"` (was `"browser"`)
- **cssnano added** — CSS minification in production builds
- **Dead configs removed** — `netlify.toml`, `firebase.json`, `.htaccess`, Netlify functions
- **Tailwind CDN restored** — removed `@tailwind utilities;` from `app.css`, added CDN script back (GH Pages serves raw source files from root, no PostCSS processing)
- **Post-build updated** — now copies `js/`, `workers/`, source `index.html`, `sw.js` to `dist/`/`docs/` for self-contained deployment
- **Footer version** — updated to v9.2.2
- **OCR fixes** — Fixed Stronghold reading as "Stronghold Unknown" (strip suffix in normalizeStructureName); added Large Town Lv4 durability (3.75M)
- **Vite config updated** — PostCSS + Tailwind for dev server only

### 2026-06-19 — v9.2 — Skin System & Lazy-Load Tabs
- **Skin database** — Created `js/skins-db.js` with full schema (Mythic/Legendary/Everlasting types, bio attributes, inheriting skill tree, Hidden Power bonuses)
- **Combo generator skin toggle** — Added "Heroes with skins" toggle that sorts skinned heroes to top with gradient badge
- **Hero Atlas skins section** — Added "Skins" nav button + detail panel showing skin attributes, skills, bonuses
- **State management** — Added `generatorSkinsOnly` state + `setGeneratorSkinsOnly()` setter
- **Error boundaries** — Added `safeInit()` wrapper per module, global error/unhandledrejection handlers
- **Loading screen timeout** — 5s hard fallback in `initAppLoading()`
- **Tailwind CDN → Built CSS** — Created `postcss.config.js` + `tailwind.config.js`, added `@tailwind utilities` to app.css, removed CDN script
- **Lazy-load tab templates** — Extracted 3 heaviest tabs (admin 25KB, eden-map 23KB, loyalty 17KB) from `index.html` into `tabs/` directory; fetched on first tab click; HTML dropped 120KB→54KB (-55%)
- **Cache-busters bumped** — All `?v=20260614_*` → `?v=20260619_1`

### 2026-06-18 — Codebase Refactoring & Modularity
- **App.js Split** — Extracted app-hero-atlas.js, app-research.js, app-export.js, app-hero-tooltip.js to break down the monolithic file.
- **OCR Dashboard Split** — Extracted ocr-roster.js, ocr-engine.js, and ocr-render.js; created ocr-shared.js for shared state/constants.
- **State Management** — Properly wired shared state variables via state.js for isolated modules.
- **Vite Chunking** — Updated vite.config.js to manually chunk i18n, tech-data, admin, and eden modules for better caching.
- **Roster Enhancements** — Implemented bulk actions, alliance filtering, and OCR demolition overlay.

### 2026-06-18 — Roster Management System
- **Roster Checklist** — complete rewrite of `renderRoster()` with stats bar, filter/search, alliance assignment, trusted/spy/unknown status per member.
- **Roster Login** — 5 alliance users (V3S/VTS/BIG/NM5/PP5), pw=12345. Tracks `verifiedBy` on every status/alliance change.
- **Counter Database** — added Octavius/Rozen/Caesar → Arthur/Cleo/Theodora counter with reason note.
- **Roster auth** persisted in `localStorage`, login/logout functions, disabled inputs when not logged in.
- **Old snapshot access** via collapsible "Snapshot History" at bottom + modal view.
- **CSS restructured** — old roster styles replaced with checklist, toolbar, history, login styles.

### Earlier (June 2026)
- Leaderboard layout fix (% calc, CSS grid alignment)
- Comments empty state + skeleton loader
- Branding consistency (footer, splash)
- Tab badges (SOON → Beta)
- API form clarity (Qwen label)
- Guest Mode banner
- VTS Admin: log panel, API key status, upload blocking
- Banner modal positioning, res.ok check
- Firestore-synced roster snapshots + OCR image upload
- Hero Atlas light theme fixes
- Firebase Analytics for guest activity
- html2canvas grid collapse fix
- Virtual scroll, overflow, drag hover fixes
- Active hours chart (24h game time)
- Alias mapping fixes
- Various Eden dataset updates
