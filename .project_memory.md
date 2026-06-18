# Project Memory: Hero Combo Creator (Rise of Castles — VTS 1097)

## What is this file?
This file serves as the "brain" or memory log for our project.
**Next time you start a new conversation with me (or another AI assistant), just attach this file or say: "Please read `.project_memory.md` to get context on our project."**

## Project Overview
- **Name:** Hero Combo Creator (v9.2.2)
- **Game:** Rise of Castles: Ice & Fire (VTS State 1097)
- **URL:** https://roc-vts.com/
- **Tech Stack:** Vanilla HTML/JS/CSS (ES6 modules), Vite 6 (dev bundler), Tailwind CSS (CDN runtime), Firebase Firestore (comments/combos/roster sync), Qwen VL API (OCR via Cloudflare Worker proxy)
- **Hosting:** GitHub Pages (gh-pages branch, root-level serving)
- **Key Features:** Manual Builder, Combo Generator, Hero Atlas, Skin System, Eden Map Planner, Tech Research Calculator, Eden Loyalty Calculator, VTS Admin Dashboard (OCR Analytics), VTS Admin Roster (snapshots, alliances, auth)

## Architecture Notes
- `index.html` is the SPA shell (~650 lines, 54KB). Three heavy tab templates (Admin, Eden Map, Loyalty) are lazy-loaded from `tabs/` directory.
- Tailwind is loaded via CDN for production (since GH Pages serves raw files from root). The `postcss.config.js` + `tailwind.config.js` are for Vite dev server only.
- `js/app.js` imports all sub-modules. Error boundaries wrap each module init via `safeInit()`. Global `error`/`unhandledrejection` handlers catch last-resort failures.
- Skin system lives in `js/skins-db.js` with Mythic/Legendary/Everlasting types, inheriting skill trees, and Hidden Power bonuses.
- OCR Admin module was split into `ocr-dashboard.js`, `ocr-roster.js`, `ocr-engine.js`, `ocr-render.js`, plus `ocr-shared.js` for shared state.

## Edits & Fixes Completed (June 2026)

### v9.2.2 — Deployment Fix & Code Review
- **Viewport fix** — removed `maximum-scale=1, user-scalable=0` (ADA/WCAG)
- **JSON-LD fix** — removed fake `aggregateRating: 4.9/89`
- **Hero images** — added `loading="lazy"` to builder, generator, atlas
- **PWA manifest** — `"display": "standalone"`
- **cssnano added** — CSS minification in production builds
- **Dead configs removed** — netlify.toml, firebase.json, .htaccess, Netlify functions
- **Tailwind CDN restored** — removed `@tailwind utilities;` from app.css, added CDN back (GH Pages root serving can't process PostCSS)
- **Post-build updated** — copies `js/`, `workers/`, `index.html`, `sw.js` to dist/docs
- **Footer version** — v9.2.2

### v9.2 — Skin System & Lazy-Load Tabs
- **Skin database** — `skins-db.js` with full schema + 3 example heroes
- **Skin toggle** — combo generator sorts/badges skinned heroes
- **Hero Atlas skins** — detail panel with attributes, skills, Hidden Power
- **Error boundaries** — `safeInit()` per module, global handlers
- **Loading timeout** — 5s hard fallback in `initAppLoading()`
- **Lazy-load tabs** — extracted Admin, Eden Map, Loyalty tabs to `tabs/` (-55% HTML)
- **OCR fixes** — Stronghold Unknown strip, Large Town Lv4 durability

### v9.0 — Cross-Module Refactor
- Created `ocr-shared.js` for shared state/constants in OCR module
- Eliminated `ReferenceError` crashes from module split
- All OCR module variables use `state.` prefix

### Roster Management
- Roster checklist: stats bar, filter/search, alliance/status assignment
- Roster login: 5 alliance users, pw=12345, `verifiedBy` tracking
- Snapshot history + modal view
- Counter database: Octavius/Rozen/Caesar → Arthur/Cleo/Theodora

## Ongoing / Next Steps
- Populate `heroSkins` in `skins-db.js` with real skin data for all 68 heroes
- Security: tighten Firestore rules, add rate limiting to Qwen worker
- Performance: purge `dist/` and `docs/` from git history (82MB artifacts)
- Accessibility: full ARIA audit
- PWA: implement real service worker caching strategy
- CI/CD: GitHub Actions for auto-build + deploy

## Important Gotchas
- **Deployment:** GH Pages serves from root of `gh-pages` branch. Raw source files must be valid for browsers. Tailwind CDN handles utility classes at runtime.
- **Vite is dev-only** for hot-reload. The `postcss.config.js` is used by Vite dev server but the production output in `dist/`/`docs/` is not served by GH Pages.
- **Build command:** `npm run build` creates `dist/` and mirrors to `docs/`. Source files at root are what GH Pages actually serves.
- **Security:** Admin password is SHA-256("12345") — client-side only. Roster passwords in plaintext. Qwen API key in browser localStorage.
