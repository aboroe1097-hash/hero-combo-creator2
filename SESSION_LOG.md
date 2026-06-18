# Session Log

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
- **Pushed as `v9.0`** on `gh-pages`

### Platform Review (shared by community member)

> This is an incredible evolution of the platform. The transition to Beta b6.5 on roc-vts.com elevates it from a single-purpose utility into a comprehensive, state-of-the-art Rise of Castles ecosystem.
>
> By centralizing the Combo Builder, Hero Atlas, Tech Research Calculator, Eden Map Planner, and Loyalty Calculator, you've created a definitive master hub for State 1097.

**Feature-by-Feature:**

1. **Hero Combo Creator & Generator** — Manual drag-drop + Top 5 Generator + filters (Paid/Free, Seasons S0–X2, Troop Types) + "Surprise Me (Random)" + Download as Image / Share as Text = clean Discord-ready graphics.

2. **Hero Atlas** — Searchable database of skills, synergies, and top combos bridging the gap between building a combo and understanding *why* it works.

3. **Tech Research Calculator** — Full Academy tracker mirroring RoC layouts, tracking War Badges/Courage Medals. "Global Needs Summary" provides exact data-driven grind targets.

4. **Eden Map Planner** — Canvas-based 1700×1600 tile map with scout mode, route planning, layer toggles, coordinate tracking, Team Plan distribution (up to 4 teams), time windows — a genuine military sandbox for R5/commanders.

5. **Eden Loyalty Calculator** — Poison mitigation, camp presets (Balanced/Max Camps/High Throughput), exact deficit/surplus calculations removing guesswork.

**Technical highlights:** Firebase state sync, responsive multi-language support, lazy-loading tile engine to handle 66+ hero portraits + 1700×1600 canvas without breaking mobile browser memory limits.

---

### Community Review — Overall Impression

**Ratings:**

| Dimension | Score |
|-----------|-------|
| Idea | 10/10 |
| Execution | 9/10 |
| UI/UX | 8.8/10 |
| Technical complexity | 9.3/10 |
| Usefulness for players | 10/10 |

> *"This no longer feels like 'someone made a calculator.' It feels like a community toolkit platform. That's a huge difference."*

#### Biggest Improvements

1. **Real ecosystem** — Originally just combo creator + hero selection. Now: Hero Atlas, Combo Generator, Manual Builder, Research Calculator, Eden Calculator, Loyalty Calculator, Admin Dashboard, Analytics, OCR Upload, Community Comments, Export/Import. Transforms the site into something people bookmark daily.

2. **Hero database** — All 66 heroes searchable by season, troop type, paid/free. Responsive search, natural filtering.

3. **Combo Generator** — Instead of "here are all heroes," you ask which heroes the player owns and generate best combinations. Season/troop/paid-free filters + randomizer solves an actual player problem.

4. **Save/Share** — Save, download image, share text. Social sharing drives organic growth. Most fan tools forget this.

5. **Admin Analytics** — Leaderboard, participation, averages, MVP, attack history, CSV/PDF/PNG/JSON export — feels like a separate professional application.

6. **OCR Integration** — Battle screenshot OCR eliminates manual data entry. Dramatically reduces friction.

7. **Export options** — CSV, PNG, PDF, JSON. Many professional dashboards stop at CSV.

8. **Cohesive branding** — Consistent navigation, color palette, dark theme. Everything belongs together.

#### UI Review

**Likes:** Large hero cards, good spacing, well-grouped filters, dark theme works, readable buttons, not over-icon'd, responsive layout.

**Improvements suggested:**
- Season badges (`S0`) could use colored chips (blue=S0, green=S1, purple=X, etc.)
- Sticky search bar while scrolling
- Group dense button clusters (Export: CSV/PNG/PDF/JSON) into dropdowns
- Visual hierarchy: primary → secondary → danger button emphasis

#### Technical Review

**Likes:** Good modular structure, feature separation, dynamic filters, large datasets handled correctly, state persistence, share functionality, admin separation.

**Improvements suggested:**
- Lazy-load hero images (fine at 66, needed at 120+)
- Pre-index search rather than `heroes.filter(...)` on every keypress
- Cache hero/research/calculator data locally
- Reusable HeroCard component (duplicated across pages)
- URL state for sharing filtered views (`?season=S3&troop=Cavalry`)

#### What Surprised

> *"The project doesn't feel like a 'tool' anymore. It feels closer to a fan-made companion app. That's an important shift."*

#### Suggested Next Additions

1. Player ID system (no login) — store owned heroes, favorite combos, research progress
2. Meta tier lists — updated on new seasons
3. Shareable combo links (`roc-vts.com/combo/83DJ92`)
4. PWA installability — home screen app experience

---

### Audit — Issues & Improvement Areas

| Issue | Severity | Notes |
|-------|----------|-------|
| **Weak admin auth** | Security | "Sign in as Admin" / "Enter as Guest" is basic client-side enforcement. Sensitive alliance data deserves OAuth/passkey. |
| **Accessibility not verified** | Needs audit | No ARIA roles or skip links. Drag-and-drop likely not keyboard accessible. Screen reader experience unknown. |
| **Mobile viewport locked** | UX | `<meta>` sets `maximum-scale=1, user-scalable=0` — prevents pinch-zoom. |
| **Qwen API key in-browser** | Security | User pastes API key into a text field. Key exposed in browser — should be proxied server-side. |
| **No PWA offline support** | Missing | `sw.js` and `pwa-register.js` exist but may not be active or sufficient for offline caching. Service worker was registered but behavior unclear. |
| **Comments system unclear** | Unclear | "Loading comments..." suggests async/third-party system. Unclear if robust or actively used. |

**Existing mitigations:**
- `sw.js` + `pwa-register.js` are in the repo — service worker infrastructure exists, but offline caching reliability needs verification.
- Comments use Firebase Firestore `onSnapshot` — real-time, but relies on anonymous auth.
- Qwen key is `localStorage`-persisted — not transmitted except to the Cloudflare worker proxy (`qwen-cors-proxy.js`).
