# Hero Combo Creator — Project Knowledge Base

> Hand this file to any new AI agent to get them fully up to speed.

## Quick Start

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Build to dist/ + docs/
npm run preview  # Preview production build
```

Tech: Vanilla HTML/JS/CSS, Vite bundler, Firebase Firestore, Qwen VL API.

---

## Architecture & Data Flow

### Entry Point
`index.html` → loads `js/app.js?v=<hash>` as `<script type="module">`

### Module Dependency Graph
```
index.html
 └─ js/app.js (2855 lines) — main app, imports all sub-modules, global scope
     ├─ js/translations.js      — i18n strings (en + others)
     ├─ js/firebase.js           — Firebase init, anonymous auth, getDb
     ├─ js/comments.js           — Firestore snapshot comments
     ├─ js/combos-db.js          — rankedCombos array (180 entries)
     ├─ js/combo-counters.js     — counter matchups + render
     ├─ js/heroes-data.js        — allHeroesData (68 heroes, base info)
     ├─ js/heroes-info.js        — heroesExtendedData (skills, placement)
     ├─ js/hero-bonuses.js       — manual rating adjustments
     ├─ js/state.js              — getComboRankInfo, troop colors, helpers
     ├─ js/utils.js              — escapeHtml, etc.
     ├─ js/seo.js                — JSON-LD, meta tags
     ├─ js/game-time.js          — game clock, sync titles
     ├─ js/tech-db.js            — tech tree database
     ├─ js/research-node-icons.js— tech node SVG icons
     ├─ js/app-loading.js        — boot splash
     ├─ js/pwa-register.js       — service worker + install prompt
     ├─ js/player-profile.js     — cloud profile sync
     ├─ js/combo-share.js        — share combo via URL
     ├─ js/roster-share.js       — share roster via URL
     ├─ js/eden-live-map.js      — live map overlay
     ├─ js/app-builder.js        — manual builder UI + logic
     └─ js/app-generator.js      — combo generator UI + logic

  js/ocr-dashboard.js (777 lines) — VTS Admin dashboard (loaded via HTML tab)
  js/eden-map.js (2310 lines)     — Eden Map planner (separate tab)
  js/loyalty-calculator.js        — Eden Loyalty calculator
  js/research-advanced.js         — Advanced research view
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
| `app.js` | ~835 | Main app: tabs, theme, event wiring |
| `app-builder.js` | 332 | Manual combo builder: drag-drop, slot rendering, save |
| `app-generator.js` | 253 | Auto combo generator: best & random modes |
| `app-loading.js` | 221 | Boot splash animation, loading progress |
| `app-hero-atlas.js` | ~560 | Hero Atlas tab |
| `app-research.js` | ~1090| Research Calculator tab |
| `app-export.js` | ~250 | Export functions (html2canvas, rendering) |
| `app-hero-tooltip.js` | ~150 | Hero tooltip hover logic |
| `ocr-dashboard.js` | ~1130| VTS Admin: main dashboard logic |
| `ocr-roster.js` | ~535 | Roster checklist, login, alliances |
| `ocr-render.js` | ~200 | Dashboard UI rendering |
| `ocr-engine.js` | ~300 | OCR parsing logic |
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
| `state.js` | 198 | Rank info, filters, troop colors |
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

### `/css/`
| File | Lines | Purpose |
|------|-------|---------|
| `app.css` | 5963 | All styles (may split into features) |
| `mobile.css` | 832 | Mobile-specific responsive overrides |

### Other Key Files
| File | Purpose |
|------|---------|
| `index.html` | Single-page app shell, all tab templates |
| `sw.js` | Service worker for PWA |
| `firebase.json` | Firebase hosting config |
| `netlify.toml` | Netlify deployment config |
| `vite.config.js` | Vite build config |
| `scripts/post-build.mjs` | Post-build: copy assets to dist/ + docs/ |
| `database/build-eden-datasets.py` | Build Eden dataset payload |

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

### Vite Config Notes
- Entry: `index.html`
- Output: `dist/` (primary) + `docs/` (GitHub Pages)
- Static assets in `public/` copied as-is
- No framework plugins (vanilla setup)

---

## Change Log

### 2026-06-18 — Codebase Refactoring & Modularity
- **App.js Split** — Extracted app-hero-atlas.js, app-research.js, app-export.js, app-hero-tooltip.js to break down the monolithic file.
- **OCR Dashboard Split** — Extracted ocr-roster.js, ocr-engine.js, and ocr-render.js.
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
