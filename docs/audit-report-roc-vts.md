# Comprehensive Audit Report — roc-vts.com (Hero Combo Creator - VTS 1097)

> **Historical record — Earlier security and repository assessment.** Reviewed for documentation routing on 2026-09-05.
> Counts, roles, and vulnerability assessments describe the audited revision. They are not a current security certification or an executable remediation backlog. Recheck current handlers/rules before acting.
> Original content below is retained as dated evidence, not current release instructions.

**Current starting points:** [SECURITY.md](../SECURITY.md) · [docs/architecture.md](architecture.md) · [Documentation index](README.md).


**Repository:** `github.com/aboroe1097-hash/hero-combo-creator2`
**Version:** v13.1.0
**Generated:** 2026-07-09
**Scope:** Firebase Security Rules, GitHub Repository, Frontend Code (HTML/JS/CSS), Tools & Sub-tools, Theme System, Translations

---

## 1. Firebase Security Rules Analysis

**File:** `firestore.rules` (291 lines, `rules_version = '2'`)

### Authentication Model

| Gate | Mechanism | Used For |
|------|-----------|----------|
| `signedIn()` | `request.auth != null` | All non-public endpoints |
| `isOwner(uid)` | `request.auth.uid == uid` | User-scoped resources |
| `isAdmin()` | `request.auth.token.admin == true` (custom claim) | Comment updates, error management |
| `isAdminLogin()` | `sign_in_provider == 'password'` | Dashboard, roster, conduct, votes |

### Vulnerabilities Found

| Severity | Finding | Details |
|----------|---------|---------|
| **P0 — Critical** | No double-vote protection on `eden_x1_votes` | A voter can create unlimited documents with same `(season, voterKey, candidateKey)` but different document IDs. Only `id` field is validated to match `voteId` param — no uniqueness constraint on voter+season combination. |
| **P1 — High** | Missing type validation on `parentId` and `name` in `validComment()` | `parentId` is in the key allowlist but never type-checked (`is string`) or size-limited. Potential injection vector via crafted document writes. |
| **P1 — High** | Comment authors can delete approved comments | `allow delete: if signedIn() && resource.data.authorId == request.auth.uid` — no check on `approved` status. Authors can remove admin-moderated content. |
| **P2 — Medium** | `isAdminLogin()` is a provider gate, not an identity gate | Any user with an email/password Firebase Auth account passes `isAdminLogin()`. Not just the shared admin credential. If the registration surface expands, unintended users gain admin write access. |
| **P2 — Medium** | Dashboard & roster data readable by all authenticated users | `vts_admin/dashboard_data` and `vts_admin/roster_data` use `allow read: if signedIn()` — exposes guild roster and conduct data to any authenticated user. Should use `isAdminLogin()`. |
| **P2 — Medium** | `repairsHistoricalConductMetadata()` in production rules | Migration path (`createdBy == auth.uid`, `createdAt == request.time`) is present in production rules. Allows any admin-login user to claim authorship of existing records. |
| **P3 — Low** | No write-rate limiting | Any signed-in user can create unlimited comments, errors, combos, and votes. No `request.time` rate window. DoS risk for collection flooding. |
| **P3 — Low** | No `get()`/`exists()` cross-document validation | Comment `parentId` is never verified to point to a real document. Vote candidate references are not validated. |

### Strengths

- **Default deny is correctly implemented** with explicit `if false` catch-all at `/{document=**}`
- **Comment validation is thorough:** `approved == false` enforced on create, authorId pinned to `request.auth.uid`
- **User profile and best combo data are well-scoped** to owner-only read/write
- **Conduct adjustment validation is excellent:** enum-category dropdown, ±1000 point range, key allowlist, string size limits

### Recommendations

1. **Add application-layer double-vote prevention** for `eden_x1_votes`: use a single document per (season, voter) or enforce uniqueness before write
2. **Add type validation** for `name`, `parentId`, `createdAt` in `validComment()`
3. **Gate comment deletion on non-approved status** or restrict to `isAdmin()` for approved comments
4. **Move dashboard/roster reads behind `isAdminLogin()`** instead of `signedIn()`
5. **Remove `repairsHistoricalConductMetadata()`** — production rules should not contain data migration branches
6. **Consider unifying `isAdmin()` and `isAdminLogin()`** into a single custom-claim-based model

---

## 2. GitHub Repository Audit

**Remote:** `https://github.com/aboroe1097-hash/hero-combo-creator2.git`
**Branch:** `main`

### Commit History

```
dc5cb7b2 Internationalize Eden X1 voting and UI strings
ca1ca605 Eden X1 voting, research-buff UI, player tags
3ed35a92 Bump build hashes and add dashboard retry flush
ad750cdf Add X8 season with buff progress tracking
c9f0c3e6 Match Vicked Russian contribution typo
74158ccb Add Sheselkie duty name alias
4d1acec1 Repair historical conduct metadata on edit
f4017aa7 Stabilize GitHub Pages deploy retries
6792bf66 Keep admin auth session stable across auth-state noise
17363cde Fix admin cloud gate: validate the session we actually use
79f4c982 Upsert conduct adjustments on edit so cloud-only-missing docs save
dbcb949a 12.4.2
4de07e34 Treat Small Town as City in OCR normalization
c8ea4f92 Release 12.4.1
```

### Observations

| Aspect | Assessment |
|--------|------------|
| **Commit frequency** | Active — ~14 commits in recent history, multiple per day |
| **Commit messages** | Descriptive and actionable (e.g., "Fix admin cloud gate: validate the session we actually use, non-destructively") |
| **Branch management** | Single `main` branch — no feature branches, no PR workflow visible |
| **Release tagging** | Present: `12.4.1`, `12.4.2` |
| **CI/CD** | GitHub Actions for Pages deploy, Playwright smoke tests |
| **Linting** | ESLint configured for JS files, Prettier for formatting |
| **Testing** | Playwright-based smoke tests (`tests/app-smoke.spec.js`), unit tests (`tests/unit/`) |

### Code Quality Infrastructure

| Tool | Config File | Status |
|------|-------------|--------|
| ESLint | `.eslintrc.json` | Configured for ES module JS |
| Prettier | `.prettierrc.json` | Configured |
| Playwright | `playwright.config.js` | Smoke tests configured |
| Vite | `vite.config.js` | Build tool |
| PostCSS | `postcss.config.js` | With autoprefixer + cssnano |
| Vite PWA | `vite.config.js` | Service worker, manifest generation |

### Recommendations

- Introduce feature branch workflow with PR reviews
- Add more unit tests — core algorithms (combo ranking, upgrade sequence) are untested
- Consider TypeScript for large modules (`eden-map.js` at 2800+ lines)

---

## 3. Frontend Code Analysis

### 3.1 HTML (`index.html` — 714 lines)

**Strengths:**
- Well-structured semantic HTML with `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>` elements
- Comprehensive `<meta>` tags: Open Graph, Twitter Cards, viewport, theme-color, robots
- Structured data via JSON-LD (WebSite, Organization, WebApplication)
- CSP properly configured with specific allowlists for scripts, styles, fonts, images, connections
- Lazy asset loading: `preconnect` for Google Fonts, `preload` for hero images, `media="print" onload="this.media='all'"` pattern for non-blocking CSS
- Font-display and preconnect for CLS reduction
- Inline `<script>` for theme flash prevention (critical rendering path optimization)
- noscript fallback with SEO content
- Service worker registration, PWA manifest
- Keyboard accessibility: scroll-to-top button, tab navigation roles

**Issues:**
- **Google Search Console verification commented out** — `<!-- <meta name="google-site-verification" ... /> -->` — site cannot be verified in GSC
- **Inline `onclick` handlers in footer** (`onclick="document.getElementById('tabManual').click()"`) — violates CSP `script-src 'self'` only when CSP is strictly enforced (currently `'unsafe-inline'` is present)
- **ARIA `role="switch"` on label without full keyboard support** — the hero info toggle label has `role="switch"` and `tabindex="0"` but no `onKeyDown` handler for Space/Enter

### 3.2 JavaScript (76 files in `js/`)

**Security:**

| Severity | Finding | Location |
|----------|---------|----------|
| **CRITICAL** | SHA-256 password hashes exposed in client bundle | `admin-auth-config.js:5` — `deleteHashes: ['5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5']` (SHA-256 of `"1"`, trivially reversed) |
| **CRITICAL** | Admin destructive operations gated entirely by client-side hash comparison | `ocr-roster.js`, `ocr-dashboard.js` — can be bypassed by reading the hash from source |
| **Medium** | `innerHTML` injection risk in `loadTabTemplate()` | `app.js:819` — fetches HTML from `data-tab-src` and injects via `innerHTML`. Hardcoded values mitigate, but no sanitization layer |
| **Medium** | `authorId` set client-side in comments | `comments.js:325` — relies entirely on Firestore rules to enforce `request.auth.uid == authorId` |
| **Low** | App Check debug token condition is client-side | `firebase.js` — `isLocalDevHost()` check is trivially bypassable |

**Code Quality:**

| Module | Lines | Quality | Notes |
|--------|-------|---------|-------|
| `app.js` | ~1300 | **Excellent** | Strong init orchestration, lazy loading, graceful degradation, stale asset recovery |
| `app-strife.js` | 434 | **Excellent** | Clean architecture, pure data pipeline, event delegation |
| `loyalty-calculator.js` | 419 | **Excellent** | Well-isolated algorithm, dual rendering, clean UX |
| `comments.js` | ~350 | **Good** | Proper `escapeHtml()` usage, signature-based render dedup, pessimistic rendering |
| `firebase.js` | ~200 | **Good** | Proper async patterns, retry with back-off, graceful degradation |
| `app-generator.js` | 656 | **Fair** | 180-line render monolith, correct logic but hard to maintain |
| `app-hero-atlas.js` | 954 | **Fair** | 360-line render function, no memoization on expensive ranking computation |
| `app-research.js` | 1399 | **Below average** | No debounce on search, DOM queries per calculation, largest tool |
| `eden-map.js` | 2861+ | **Poor** | Single closure monolith, 110+ variables in same scope, unmaintainable |

**Key Issues:**
- **DOM-churn anti-pattern across all tools:** Render functions rebuild entire DOM subtrees on any state change. No diffing, no fragment-based reconciliation.
- **No memoization on expensive computations:** `computeHeroRankings()` (160k iterations) runs on every filter change
- **No debounce on research search** — fires full render on every keystroke
- **Inconsistent `escapeHtml()` usage:** Core comment system uses it correctly, but `innerHTML` is still used in template loading without sanitization layers

### 3.3 CSS (7 files in `css/`, ~7000+ lines total)

**Architecture:**
- **Design tokens** in `_tokens.css`: `--surface`, `--text-primary`, `--brand`, spacing/radius/timing/z-index tokens
- **Dark theme default** in `:root`; **Light theme** via `[data-theme='light']` overrides
- **Desktop-first** with `mobile.css` (2182 lines) overriding via `@media (max-width: 768px)`
- **`color-scheme: dark/light`** set for native form control theming

**Light Theme Coverage:**
- **~15% of components have light overrides** (comments, hero-tooltips, scrollbars)
- **~85% use hardcoded dark colors** — research trees, game layout, buttons, footer, filter panels, etc.
- Many sections (`section-heading: #f1f5f9`) have no light override — text invisible on white background

**Responsiveness:**
- Breakpoints: 768px, 640px, 520px, 480px, 430px, 360px
- Safe area insets (`--safe-top`, `--safe-bottom`), keyboard-aware layout
- Touch target sizing (`tap-min: 44px`), `touch-action: manipulation`
- **Heavy `!important` abuse:** Nearly every rule in `mobile.css` uses `!important`

**Performance:**
- `color-mix()` used 10+ times with no browser fallback — breaks on Safari <16.2, Chrome <111, Firefox <113
- `box-shadow` and `filter` animations (logo pulse, skin transitions) — paint-heavy
- `transition: all` on several components — unnecessarily broad
- `content-visibility: auto` not used

**Accessibility:**
- `--text-dim` at 3.7:1 contrast (dark) / 3.2:1 (light) — **fails WCAG AA**
- Toast `info: #60a5fa` on dark background at 3.6:1 — **fails WCAG AA**
- Global `:focus-visible` styles exist in `atmosphere.css` (256 lines) but **file is not linked in HTML** — dead code
- No `prefers-reduced-motion` at component level for micro-interactions
- No `prefers-contrast: more` support

**Recommendations:**
1. Move global `:focus-visible` from `atmosphere.css` into `app.css` and link the file
2. Add `rgba()` fallbacks before all `color-mix()` declarations
3. Darken `--text-dim` to achieve 4.5:1 contrast ratio
4. Systematically add `[data-theme='light']` overrides for research, game-tech, buttons, and footer
5. Refactor `mobile.css` to reduce `!important` usage
6. Extract research tree CSS (~1500 lines) from `app.css` into dedicated file

---

## 4. Tools & Sub-tools Analysis

| Tool | File | Lines | Quality | Purpose |
|------|------|-------|---------|---------|
| **Manual Builder** | `app-builder.js` | 504 | Good | Drag-and-drop 3-hero lineup assembly, Firestore persistence, undo |
| **Combo Generator** | `app-generator.js` | 656 | Fair | Owned-hero selection, top-5 combo generation, skin-aware ranking |
| **Hero Atlas** | `app-hero-atlas.js` | 954 | Fair | Hero ranking DB, skills/synergies/counters/skins explorer, CSV export |
| **Tech Research** | `app-research.js` | 1399 | Below avg | Tech tree tracker with cost calculator, dual render modes, game layout |
| **Eden Map** | `eden-map.js` | 2861+ | Poor | Interactive isometric map, path/routing, teams, scout intel, 20+ modules |
| **Strife Over Dragon** | `app-strife.js` | 434 | **Best** | Monster lineup planner, manual + fallback combo sources, cleanest code |
| **Loyalty Calculator** | `loyalty-calculator.js` | 419 | **Best** | Upgrade sequence optimizer, greedy algorithm, dual desktop/mobile render |

### Critical Metrics

| Metric | Value |
|--------|-------|
| Total JS files | 76 |
| Total JS lines | ~25,000+ |
| Largest module | `eden-map.js` (2861 lines, single closure) |
| Largest render function | `renderHeroesTab()` (360 lines) |
| Source of truth data | `combos-db.js` (~800 ranked combos), `allHeroesData[]` (~200 heroes) |
| External APIs | Firebase Auth, Firestore, Cloudflare Worker (OCR), YouTube, html2canvas |

### Architecture Patterns

- **ES modules** via importmap — no bundler in dev, Vite for production build
- **Event delegation** used in most tools (one listener per container)
- **DOM render from strings** — HTML template literals rebuilt on every state change
- **localStorage** persistence for all tool state (research, strife, loyalty, map, generator selections)
- **Firestore** only for comments and saved combos

---

## 5. Theme Analysis

### Implementation
- `document.documentElement.dataset.theme` toggle between `'light'` and `'dark'`
- Dark default at `:root`, light overrides under `[data-theme='light']`
- `color-scheme: dark` / `color-scheme: light` on html element
- Broad `transition` on `background, background-color, color, border-color, box-shadow` for smooth switching

### Theme Coverage

| Area | Dark | Light |
|------|------|-------|
| Surfaces (`--surface`, `--surface-2`, etc.) | ✅ Token-driven | ✅ Token-driven |
| Text (`--text-primary`, `--text-muted`) | ✅ Token-driven | ✅ Token-driven |
| Body background & gradient | ✅ | ✅ |
| Comments section | ✅ | ✅ |
| Hero tooltips | ✅ | ✅ |
| Scrollbars | ✅ | ✅ |
| Research trees & game layout | ✅ | ❌ (hardcoded dark gold/blue) |
| Tech node cards & sliders | ✅ | ❌ |
| Buttons (`btn--save`, `btn--clear`, etc.) | ✅ | ❌ |
| Tool filter panels | ✅ | ❌ |
| Footer | ✅ | ❌ |
| Section headings | ✅ | ❌ (`#f1f5f9` invisible on white) |
| Generator cards & results | ✅ | ❌ |
| Hero Atlas ranking list | ✅ | ❌ |
| Eden Map UI | ✅ | ❌ |
| YouTube section | ✅ | ❌ |

**Estimated coverage:** ~15% of components have light theme overrides beyond the token system.

---

## 6. Translation Analysis

### Coverage

| Language | File | Keys | Coverage |
|----------|------|------|----------|
| English | `en.js` | 1199 | 100% (reference) |
| Spanish | `es.js` | 1199 | 100% |
| Portuguese | `pt.js` | 1199 | 100% |
| French | `fr.js` | 1199 | 100% |
| German | `de.js` | 1199 | 100% |
| Turkish | `tr.js` | 1199 | 100% |
| Russian | `ru.js` | 1199 | 100% |
| Indonesian | `id.js` | 1199 | 100% |
| Chinese | `zh.js` | 1199 | 100% |
| Arabic | `ar.js` | 1199 | 100% |
| Korean | `kr.js` | 1199 | 100% |

**HTML linkage:** 42 `data-i18n` attributes in `index.html` — all present in all languages.

### Issues Found

| Issue | Severity | Details |
|-------|----------|---------|
| **Admin strings untranslated** | High | 8 admin strings (Password, Sign Out, Sign In as Admin, Username, Cloud sync error, etc.) remain English in 9/10 non-English files. Only Russian translated them. |
| **No RTL support for Arabic** | High | `ar.js` exists with full key coverage, but HTML has no `dir="rtl"` handling. `translations.js` has no RTL direction logic. Arabic layout would be LTR with Arabic text — unusable. |
| **Indonesian uses English "hero"** | Low | `heroCountOne: '{n} hero'` / `heroCountMany: '{n} hero'` — Indonesian typically uses "pahlawan" |
| **Pluralization for Korean** | Low | Korean uses same string for singular/plural — acceptable for Korean grammar |

### Recommendations

1. Translate admin strings (adminLoginPass, adminSignOutBtn, adminLoginBtn, etc.) across all 9 affected languages
2. Implement RTL direction handling for Arabic: detect `ar` locale → set `<html dir="rtl">`, apply CSS mirroring
3. Add `seoTitle` localized values — only Portuguese has a translated version

---

## 7. Summary of Findings by Priority

### Critical (P0)

| # | Finding | Area | Impact |
|---|---------|------|--------|
| 1 | **Admin auth hashes exposed in client bundle** (`SHA-256("1")`) | Auth/Security | Attacker can extract hash, bypass admin checks |
| 2 | **Admin destructive operations gated client-side** | Auth/Security | No server-side enforcement for clearData/deleteAttack |
| 3 | **No double-vote protection on Eden X1 voting** | Firebase Rules | Unlimited duplicate votes per user |

### High (P1)

| # | Finding | Area | Impact |
|---|---------|------|--------|
| 4 | Missing type validation on `parentId` in comments | Firebase Rules | Injection vector |
| 5 | Authors can delete approved comments | Firebase Rules | Data loss of moderated content |
| 6 | `isAdminLogin()` is a provider gate, not identity gate | Firebase Rules | Any password-auth user gains admin access |
| 7 | 8 admin strings untranslated across 9 languages | i18n | Broken UX for non-English admins |
| 8 | No RTL support for Arabic | i18n | Arabic layout broken |
| 9 | `color-mix()` has no browser fallback | CSS | Breaks on older browsers |
| 10 | ~85% of components lack light theme overrides | CSS/Theming | Light mode visually broken |

### Medium (P2)

| # | Finding | Area |
|---|---------|------|
| 11 | Dashboard/roster data readable by all authenticated users | Firebase Rules |
| 12 | Migration code (`repairsHistoricalConductMetadata`) in production | Firebase Rules |
| 13 | No rate limiting on writes | Firebase Rules |
| 14 | `eden-map.js` at 2800+ lines in a single closure | Code Quality |
| 15 | No memoization on `computeHeroRankings` / `getTechMedalTotals` | Performance |
| 16 | No debounce on research search | Performance |
| 17 | `--text-dim` fails WCAG AA contrast (3.7:1) | Accessibility |
| 18 | Global `:focus-visible` in unlinked `atmosphere.css` | Accessibility |
| 19 | Google Search Console verification commented out | SEO |
| 20 | DOM-churn anti-pattern across all render functions | Performance |

### Low (P3)

| # | Finding | Area |
|---|---------|------|
| 21 | No `get()`/`exists()` cross-document validation | Firebase Rules |
| 22 | Indonesian uses English "hero" instead of "pahlawan" | i18n |
| 23 | Typographic design tokens missing (font-size, line-height) | CSS |
| 24 | Heavy `!important` in mobile.css | CSS |
| 25 | `transition: all` on several components | CSS/Performance |
| 26 | `atmosphere.css` (256 lines) entirely dead code | CSS |

---

## 8. Key Recommendations

### Immediate (P0 — fix now)

1. **Replace client-side admin auth with Firebase Callable Functions** that verify `request.auth.token.admin === true` on the server. Remove all SHA-256 hash-based auth from client code.
2. **Add server-side validation for votes** to enforce uniqueness per (voter, season) combination.

### Short-term (P1 — next sprint)

3. **Add missing type validation** to `validComment()` for `parentId`, `name`, `createdAt`.
4. **Gate comment deletion** behind `resource.data.approved == false` check.
5. **Translate 8 admin strings** across all non-English locales.
6. **Add RTL support** for Arabic (`dir="rtl"`, CSS mirroring).
7. **Add `rgba()` fallbacks** before every `color-mix()` call.
8. **Link `atmosphere.css`** containing global focus-visible styles, or inline them in `app.css`.

### Medium-term (P2 — next release)

9. **Refactor `eden-map.js`** into 3-5 smaller modules (rendering, interaction, sidebar, persistence).
10. **Add memoization** for `computeHeroRankings()`, `getTechMedalTotals()`, `getComboRankInfo()`.
11. **Debounce research search input** to prevent render on every keystroke.
12. **Darken `--text-dim`** to achieve WCAG AA 4.5:1 minimum contrast.
13. **Systematically add light theme overrides** — start with research trees, buttons, filter panels, footer.
14. **Uncomment Google Search Console verification tag** with the correct token.

### Long-term (P3 — roadmap)

15. **Introduce virtual DOM or diffing** for hero card grids to eliminate full DOM rebuilds.
16. **Add unit tests** for core algorithms (combo selection, upgrade sequence, skill tokenizer).
17. **Extract research tree CSS** from `app.css` (1500 lines) into dedicated file.
18. **Replace `!important` patterns** in `mobile.css` with mobile-first base styles.
19. **Add TypeScript types** for data layer (`allHeroesData`, `baseRankedCombos`, tech database).
20. **Add `prefers-contrast: more`** and `prefers-reduced-motion` at component level.
21. **Localize SEO title** across all languages.

---

## Report Methodology

- **Source Analysis:** Reviewed all 76 JS files, 7 CSS files, index.html, firestore.rules, firebase.json, and 11 i18n files from the working repository at `D:\Project\hero-combo-creator2`
- **Live Website:** Fetched and analyzed `https://roc-vts.com` HTML source, CSP headers, and asset manifests
- **Git Repository:** Audited commit history, branch structure, CI configuration, and code quality tooling
- **Security Analysis:** Firebase Security Rules evaluated against OWASP guidelines and Firebase best practices documentation
- **Translation Audit:** Cross-compared 1199 keys across all 11 language files for coverage, accuracy, and completeness
- **CSS Analysis:** Evaluated against WCAG 2.1 AA standards, CSS performance best practices, and cross-browser compatibility
