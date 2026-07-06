# Comprehensive Audit & Analysis Report — roc-vts.com

**Site:** https://roc-vts.com (Hero Combo Creator — VTS State 1097)
**Repo:** https://github.com/aboroe1097-hash/hero-combo-creator2 (branch `gh-pages` is default + source)
**Audit date:** 2026-07-06 · **App version:** 12.4.1
**Methods:** Live site fetch, full source-code review (local clone), git history analysis, static greps, and two delegated parallel deep-scans (opencode/glm-5.2 for broad JS + CSS sweeps).

---

## 0. Executive Snapshot

| Area | Rating | One-line verdict |
|---|---|---|
| Firebase Rules | ★★★★☆ | Default-deny, field-validated, well-structured; one weak admin-gate pattern. |
| GitHub Repo / Process | ★★★★☆ | Solo dev, 596 commits, linear history, real CI/CD gates, mature SECURITY.md. |
| Tools / Sub-tools | ★★★★★ | 9 feature tabs, well-modularized, lazy-loaded, documented in README. |
| HTML / A11y | ★★★★☆ | Semantic, ARIA-aware, SEO/JSON-LD strong; minor inline-handler smell. |
| JavaScript | ★★★★☆ | Modern ES modules, esc() discipline, no eval; large files + 191 innerHTML sites. |
| CSS | ★★★☆☆ | Excellent token *system*; weak token *discipline* (hardcoded colors, ~2k `!important`). |
| Themes | ★★★☆☆ | Dark-first polished; light theme has rendering gaps from hardcoded colors. |
| Translations | ★★★★★ | 11 langs × 1199 keys = perfect parity, CI-enforced, lazy code-split. |

**Overall:** A mature, security-conscious community project that punches well above the typical "fan-tool" bar. The fundamentals (default-deny Firestore rules, Firebase App Check, strict CSP, a hardened Cloudflare Worker, no secrets in client, CI-enforced i18n) are genuinely strong. The weaknesses are concentrated in **CSS/theme token discipline** and a **documented-but-weak admin authorization pattern**.

---

## 1. Firebase Rules Analysis

**File:** `firestore.rules` (291 lines) · **Project:** `abocombo` (`.firebaserc`) · **Config:** `firebase.json` (rules pointer only; no hosting config — hosting is GitHub Pages).

### 1.1 Architecture & helpers
The ruleset defines reusable helper functions and ends with a **default-deny global** — best-practice "allow-list" posture:

```js
// firestore.rules:287-289  —  catch-all deny (good)
match /{document=**} {
  allow read, write: if false;
}
```

Three identity helpers are defined: `signedIn()`, `isOwner(uid)`, `isAdmin()` (custom claim `request.auth.token.admin == true`), and a fourth, `isAdminLogin()`:

```js
// firestore.rules:20-22
function isAdminLogin() {
  return signedIn() && request.auth.token.firebase.sign_in_provider == 'password';
}
```

### 1.2 Strengths
- **Field validation everywhere.** `validComment()`, `validBestCombo()`, `validClientError()`, `validDashboardData()`, `validRosterData()`, `validConductAdjustment()`, `validEdenX1Vote()` all use `request.resource.data.keys().hasOnly([...])` plus type + size bounds.
- **Size caps** on every text field (e.g. comment text ≤2000, error stack ≤8000, note ≤500) — limits abuse/storage cost.
- **Owner-bound writes:** `users/{uid}` is `isOwner(uid)` only; `bestCombos` create is owner-only, update denied, delete owner-only.
- **Moderated comments:** new comments are forced to `approved == false && public == true` and `authorId == request.auth.uid`; reads require `approved==true` OR ownership OR admin. Update is admin-only. Solid community-moderation model.
- **Server-set timestamp enforced:** `validClientError()` requires `receivedAt == request.time` and `validEdenX1Vote()` requires `updatedAt == request.time` — clients can't forge times.
- **Conduct-metadata integrity:** `keepsConductMetadata()` / `repairsHistoricalConductMetadata()` prevent silent rewrites of audit provenance (lines 195-213), with an explicit carve-out to repair a known historical `release-12.4.1` migration artifact.
- **`eden_x1_votes`** correctly binds `voterAuthUid == request.auth.uid` on both create and update, so votes are tamper-proof per user.

### 1.3 Findings & concerns

| # | Severity | Finding | Evidence |
|---|---|---|---|
| F1.1 | ✅ Resolved | ~~`isAdminLogin()` gated admin writes on `sign_in_provider == 'password'`.~~ **Fixed:** all `vts_admin` write paths now require the `admin` custom claim via `isAdmin()`. The `isAdminLogin()` function was removed and its 6 call sites (dashboard_data, roster_data, conduct_adjustments create/update/delete, eden_x1_votes read/delete) switched to `isAdmin()`. The client login gate (`ocr-dashboard.js` `doLogin`) now calls `isAdminAuthUser(user, { forceRefresh: true })` so a non-admin who self-registers via the Identity Toolkit REST API is rejected at login. | `firestore.rules:13-15, 275-309`; `js/ocr-dashboard.js:2054-2057` |
| F1.2 | ✅ Resolved | Inconsistency removed: `vts_admin` write paths now use the same `isAdmin()` claim gate as `eden_map/shared_intel`. | `firestore.rules:13-15` |
| F1.3 | **Low-Med** | No rule-level rate limiting on `comments` creates. Any signed-in (anonymous) user can create unbounded (moderated) comment docs. App Check raises the bar but does not cap volume. | `firestore.rules:243-248` |
| F1.4 | **Low** | `validComment()` allows `parentId` (now regex-validated `^[A-Za-z0-9_-]{1,150}$`) but no cycle/depth check — deeply nested reply chains possible (client-enforced only). | `firestore.rules:31-34` |
| F1.5 | **Info** | No Storage rules (`firebase.json` only declares `firestore.rules`). If Firebase Storage is ever used, it would default-open. | `firebase.json` |

**F1.1 resolution note:** The provider-based gate was exploitable regardless of console sign-up settings, because the public web API key lets anyone create a password account via the Identity Toolkit `signUp` REST endpoint — that account would then pass `sign_in_provider == 'password'`. The custom claim is the only gate an attacker cannot forge (it is set exclusively via `scripts/firebase-set-admin-claim.mjs` using a service account). **Deployment prerequisite (must be done before the rules go live):** run `node scripts/firebase-set-admin-claim.mjs <admin-email-or-uid>` with `FIREBASE_SERVICE_ACCOUNT_PATH`/`FIREBASE_SERVICE_ACCOUNT_JSON` set, so the admin UID carries the `admin: true` claim — otherwise the admin is locked out of writes the moment the new rules deploy. The legacy `isPasswordAuthUser()` client helper is retained for non-security re-resolution paths but is no longer a trust boundary.

---

## 2. GitHub Repository Audit

**Repo:** `aboroe1097-hash/hero-combo-creator2` (public) · **Default branch:** `gh-pages` (also the source branch).

### 2.1 History & contributors
- **596 commits**, **2026-01-22 → 2026-07-06** (~5.5 months, actively maintained).
- **Contributors:** `aboroe1097-hash` (596), `dependabot[bot]` (5), `qwen.ai[bot]` (1) → effectively a **solo developer** project with automated dependency + AI assistance.
- **Only 2 merge commits** → **linear, squash/rebase workflow** (clean, bisectable history).
- Commit messages are imperative and specific ("Repair historical conduct metadata on edit", "Stabilize GitHub Pages deploy retries") — good hygiene.

### 2.2 Branch management
- Branches: `gh-pages` (default, source), `main` (largely dormant), `dependabot/*` (4 open dep PRs), `claude/*` and `wip-backup-*` (agent-assisted dev scratch branches).
- `gh-pages` being **both** the source and deploy branch is unusual: every push to `gh-pages` triggers a deploy build (`.github/workflows/deploy.yml:4-5`). The full `npm run check` gate (lint+format+test+i18n+build+size+smoke) prevents broken deploys, but WIP commits to the source branch can trigger deploys. A cleaner model is source-on-`main`, deploy-artifacts-to-`gh-pages`.

### 2.3 CI / CD
**`ci.yml`** (runs on every push + PR):
- `npm ci` + `npm run check:fast` (lint + format:check + test:unit + i18n:check).
- Uses **dummy Firebase env vars** (no secrets in fast CI). Node 20. Good.

**`deploy.yml`** (runs on push to `gh-pages`):
- **Least-privilege permissions:** `contents: read`, `pages: write`, `id-token: write` — correct for Pages deploy.
- **Verifies required build env** before building (fails fast if secrets missing).
- Runs the **full `npm run check`** (incl. Playwright smoke, build, size:check) before uploading.
- Deploy retry logic (primary `deploy-pages` + retry after 20s sleep) — pragmatic against transient Pages failures.
- `concurrency: group: pages, cancel-in-progress: false` — sensible for deploys.

### 2.4 Security & community files
- **`SECURITY.md`** — mature: scoped (rules, admin access, API keys, XSS, builds), 7-day acknowledgement SLA, explicit "do not open public issues for credential/admin-rule bugs," and a candid note that static admin hashes are convenience gates. ★
- **`.gitignore`** — `.env*` ignored; **`.env` confirmed untracked** (`git ls-files --error-unmatch .env` → not found). `.firebaserc` ignored. No secrets committed.
- **`.env.example`** — documents each var, notes reCAPTCHA site key is public, warns the App Check debug token must not go to Pages secrets.
- **`PULL_REQUEST_TEMPLATE.md`**, **`ISSUE_TEMPLATE/{bug_report,feature_request}.md`**, **`FUNDING.yml`**, **`CONTRIBUTING.md`**, **`dependabot.yml`** all present.
- **`LICENSE`** present.

### 2.5 Code-quality infrastructure
- **ESLint 8.57** + **Prettier 3.8** configured (`.eslintrc.json`, `.prettierrc.json`), enforced in `check:fast`.
- **Playwright 1.61** smoke tests (`tests/app-smoke.spec.js`) + **node `--test`** unit tests (`tests/unit/*.test.mjs`).
- **`size:check`** (bundle budget), **`i18n:check`**, **`worker:check`** (wrangler dry-run) — multiple gates.
- Only runtime dependency is `firebase@11.6.1`; dev tooling is modern (Vite 6, cssnano 8, autoprefixer 10, firebase-admin 14).

---

## 3. Tool & Sub-tool Functionality

Nine top-level tools (tabs in `index.html`) + a separate `eden-x1.html` view. The README feature table matches the deployed UI 1:1.

| Tool | Source files | Purpose | Dependencies | Perf notes |
|---|---|---|---|---|
| **Manual Builder** | `app-builder.js`, `combos-db.js`, `combo-share.js` | Drag-drop 3-hero combos; save to `users/{uid}/bestCombos`; export image/text | Firestore, html2canvas | Save = Firestore write (owner-gated) |
| **Combo Generator** | `app-generator.js`, `hero-bonuses.js`, `combo-counters.js` | Select owned heroes → top-5 ranked combos, no overlap; "Surprise Me" random; skin mode | heroes-data, skins-db | Pure client-side ranking |
| **Hero Atlas** | `app-hero-atlas.js`, `heroes-info.js`, `heroes-data.js`, `skins-db.js`, `skin-heroes-data.js` | 68+ heroes DB; search/filter; skills, synergies, top combos; seasonal filters; adjustable bonuses | Static data | New badge |
| **Tech Research** | `app-research.js`, `tech-db.js` (209KB data), `research-buffs.js`, `research-advanced.js`, `research-node-icons.js` | Academy tracker S0–X8; War Badge/Courage Medal summary; game-layout trees | Static data | `tech-db.js` is data-heavy (209KB) |
| **Eden Map** | `eden-map.js` + 11 `eden-map-*.js` modules, `eden-datasets-loader.js` | Canvas 1700×1600 tile map; scout mode; route planning; layer toggles; ≤4 teams; terrain-aware distance | Static datasets in `database/` | Lazy-loaded tab (`data-tab-src`) |
| **Strife over Dragon** | `app-strife.js`, `strife-db.js` | New — strife tool | Static data | New badge |
| **Eden Loyalty** | `loyalty-calculator.js` | Poison mitigation, camp presets, deficit/surplus | None | Lazy-loaded tab |
| **YouTube** | (inline in `index.html`) | 3 VTS 1097 playlists | YouTube IFrame | **Lazy-loaded via IntersectionObserver** (rootMargin 200px) — good |
| **VTS Admin** | `admin-page.js`, `ocr-dashboard.js`, `ocr-*.js` (6 files), `eden-x1.js` | OCR attack analysis, roster screenshots, contribution lists, leaderboard, CSV/PNG/JSON export, Eden X1 voting, conduct adjustments | **Cloudflare Worker** (Qwen VL OCR), Firebase Auth, reCAPTCHA Enterprise | Seasonal badge; `noindex,nofollow` |

**Cross-cutting sub-systems:** `comments.js` (Firestore-threaded feedback), `bug-widget.js` + `app-error-reporting.js` (error queue → `errors` collection), `pwa-register.js` (service worker), `game-time.js` (global game clock), `app-undo.js` (undo toasts), `app-shortcuts.js`, `app-whats-new.js`, `player-tags.js`/`player-registry.js`/`player-profile.js` (roster identity), `user-data-portability.js` (local data export).

**Performance posture (strong):** Vite build with content-hash asset names (cache-busting), modulepreload for critical chunks, dynamic `import()` per tab and per language (code-splitting), `preload` for hero wing images + Google Fonts, `font-display: swap` via print→all media swap trick, lazy YouTube iframes, mobile-specific CSS conditionally loaded at ≤768px, `loading="lazy"`/`decoding="async"` on footer imagery, `requestIdleCallback` for error flush, `--tap-min: 44px` for touch targets, `env(safe-area-inset-*)` for notches.

---

## 4. Frontend Code Analysis

### 4.1 HTML (`index.html`, `admin.html`, `tabs/{loyalty,eden-map,admin}.html`, `eden-x1.html`)

**Strengths:**
- **Semantic structure:** `header / nav[aria-label] / main / section / footer` throughout. `noscript` fallback with real SEO copy (`index.html`).
- **ARIA discipline:** `role="status"` + `aria-live="polite"` on boot splash and maintenance card; `aria-hidden="true"` on all decorative SVG/wings/particles; `aria-label` on every icon-only button (theme toggle, scroll, install, language select); `role="switch"` + `aria-checked` on the hero-info toggle; `role="dialog"` + `aria-label` on the message-box modal; `.sr-only` on the checkbox input.
- **SEO/meta:** canonical, robots, full OG + Twitter cards, `theme-color`, `application-name`, **JSON-LD `@graph`** (`WebSite` + `Organization` + `WebApplication` with `offers: price 0`).
- **PWA:** manifest linked, `apple-touch-icon`, `viewport-fit=cover` for notches.
- **`admin.html`** is correctly `noindex,nofollow`.

**Findings:**
| # | Severity | Finding | Evidence |
|---|---|---|---|
| F4.1.1 | **Med** | CSP `script-src` includes `'unsafe-inline'` (and `style-src 'unsafe-inline'`). This is the largest remaining XSS-hardening gap. The inline scripts (theme pre-paint, footer-year, scroll-top, lazy-iframe) could be hash- or nonce-based. | `index.html` `<meta http-equiv="Content-Security-Policy">` |
| F4.1.2 | **Low** | Footer nav uses inline `onclick="document.getElementById('tabX').click(); …"` — JS behavior embedded in HTML, mixing concerns and bypassing any future CSP `script-src` without `'unsafe-inline'`. | `index.html` footer links |
| F4.1.3 | **Low** | PWA manifest `theme_color`/`background_color` are hardcoded `#0f172a` (dark) and do not adapt to the user's theme. | `assets/site-*.webmanifest` |
| F4.1.4 | **Info** | `<html lang="en">` is hardcoded; `dir`/`lang` are set dynamically per language in JS. Pre-JS, Arabic users get LTR/en — acceptable but not ideal. | `admin-page.js:61-62` |

### 4.2 JavaScript (`js/` — ~75 files, ~4400+ lines of logic excluding data files)

**Security posture (strong):**
- **`esc()` HTML-escaping discipline** is used consistently — the two `insertAdjacentHTML` sites (`ocr-render.js:1466`, `ocr-roster.js:2703`) sit inside templates that `esc()` all interpolated data; player names go through `renderTaggedPlayerName()`.
- **Zero** `eval(`, `new Function(`, `document.write(` (grep across `js/`).
- **Zero** `postMessage` (no message-event attack surface).
- **Zero** `console.log` in production `js/*.js` (only `console.warn`/`info` for diagnostics).
- **No hardcoded secrets:** the only "secret-like" string is the public Firebase web config in `js/firebase.js:58-66` (correctly commented as "public client configuration"; the API key is split into two string parts only to discourage naive scraping). The real secret (`DASHSCOPE_API_KEY`) lives as a **wrangler secret on the Worker**, never in client code.
- **`.env` is gitignored and untracked** (verified).
- **`fetch(`** appears 11 times, all constrained by the CSP `connect-src` allowlist (worker + `*.googleapis.com` + `*.gstatic.com` + Google Analytics domains).
- **Firebase App Check** (reCAPTCHA Enterprise) is initialized (`js/firebase.js:312-335`) and the Worker **verifies the App Check JWT** server-side (RS256 + JWKS + aud/iss/exp/sub — see §5).

**Findings:**
| # | Severity | Finding | Evidence |
|---|---|---|---|
| F4.2.1 | **Low-Med** | A weak client-side admin hash ships to every browser: `5994471abb…cacfc5` = **SHA-256("12345")** in `deleteHashes`. Documented as a convenience gate (SECURITY.md), but a trivially brute-forced hash adds no real protection and signals a weak passphrase culture. `clearHash: ''` may allow the "clear" action unconditionally depending on usage. | `js/admin-auth-config.js:1-7`, consumed at `js/ocr-shared.js:605-606` |
| F4.2.2 | **Low** | `isPasswordAuthUser()` returns **`true` on token-read failure** for any non-anonymous user (the `catch` branch). Server rules still enforce, so this is a UX-only bypass, but it can surface admin UI to a user whose token read failed. | `js/firebase.js:354-370` |
| F4.2.3 | **Low** | **191 `.innerHTML =` assignments** across `js/` — a large XSS surface. The sampled sites are escaped, but the volume warrants a systematic esc()-coverage audit + an ESLint rule banning `innerHTML`/`insertAdjacentHTML` without an `esc()` call on interpolated expressions. | grep `\.innerHTML\s*=` |
| F4.2.4 | **Med** | **Maintainability:** several logic files are very large — `ocr-dashboard.js` (4170 lines), `ocr-roster.js` (3509), `eden-x1.js` (2542), `eden-map.js` (2737). `tech-db.js` (1228 lines) is data and acceptable. | file sizes |
| F4.2.5 | **Low** | **36 `var` declarations, all in `ocr-roster.js`** — one file lags the `let`/`const` modernization. | grep `\bvar\s` |
| F4.2.6 | **Info** | Top-level `await` in `js/firebase.js:14-33` (dynamic SDK imports) — modern and correct, but requires `type: module` (set in `package.json`) and a modern browser target. | `js/firebase.js` |

### 4.3 CSS (`css/` — 7 files)

**Architecture (`_tokens.css`, 142 lines) — excellent:**
- Dark palette on `:root` (default `color-scheme: dark`), light palette on `[data-theme='light']` (`color-scheme: light`), **same custom-property names overridden** — the correct theme pattern.
- Comprehensive tokens: brand/accent/danger, surface ramps, text ramp, spacing scale, `--tap-min: 44px`, `env(safe-area-inset-*)`, radii, motion easings, z-index scale, documented breakpoints.
- `@media (prefers-reduced-motion: reduce)` globally zeroes animation/transition — strong accessibility.

**Findings (token *discipline* is weak):**
| # | Severity | Finding | Evidence |
|---|---|---|---|
| F4.3.1 | **High** | **Hardcoded colors bypass the token system**, concentrated in the largest files. `app.css` has **~1,560 hex-color lines + ~1,405 rgba lines** (of 14,749 total); `ocr-dashboard.css` 278 hex + 343 rgba; `mobile.css` and `eden-x1.css` also affected. Many are dark-assumed (e.g. `mobile.css:233 #15803d/#22c55e`, `:1277 color:#06121d`, `:1323 color:#eaffff`) and will not adapt to light theme. | opencode CSS scan + grep |
| F4.3.2 | **High** | **`!important` overuse:** `app.css` **1,050**, `mobile.css` **893**, `eden-x1.css` 138, `ocr-dashboard.css` 11, `components.css` 9. This signals specificity wars and makes the cascade hard to override/maintain. | grep `!important` per file |
| F4.3.3 | **Med** | **`app.css` is 420KB / 14,749 lines** — a single monolithic stylesheet. Should be split by feature (e.g., `combos.css`, `filters.css`, `hero-grid.css`, `comments.css`) and minified (the build does run `minify-built-css.mjs`, but source maintainability suffers). | `css/app.css` size |
| F4.3.4 | **Low** | `atmosphere.css` uses `rgba(255,255,255,0.07)` outside tokens — minor, decorative. | `css/atmosphere.css:73,255` |

---

## 5. Cloudflare Worker (`workers/qwen-cors-proxy.js`) — Security Deep-Dive

Although not explicitly called out in the request, the Worker is the only server-side code in this project and is security-critical (it holds the OCR API key), so it warrants explicit review.

**Verdict: exemplary.** This is one of the best-hardened small Workers I've reviewed.

- **Secret hygiene:** `DASHSCOPE_API_KEY` is a `wrangler secret`, never in source; the Worker refuses to run if missing (`workers/qwen-cors-proxy.js:666-673`).
- **Origin allowlist (CORS):** only `https://roc-vts.com` + private Vite dev ports (regex-validated to localhost/10.x/192.168.x/172.16-31.x on ports 4173–5177). Reflects the allowed origin and sets `Vary: Origin`. (`isAllowedOrigin`, `isPrivateViteDevOrigin`.)
- **Firebase App Check verification, fully implemented server-side** (`verifyAppCheck`, lines 573-636): RS256 JWT, JWKS fetch + cache, `kid` match, signature verify via `crypto.subtle`, and checks for `iss`, `aud` (array-aware), `exp`, `nbf`, and `sub` (app id). This is the right way to attest the client.
- **SSRF guard:** `isAllowedDashscopeEndpoint` rejects non-HTTPS and any `.workers.dev` host (prevents redirect-to-worker loops).
- **DoS protection:** 5MB body cap (`MAX_BODY_BYTES`) enforced via **streaming read with running byte count** (`readJsonBodyWithLimit`) — not just `Content-Length`. Rate limit 30 req/60s, KV-backed when available with in-memory fallback. Prunes expired in-memory entries.
- **Payload validation:** model must be in the configured allowlist (regex-validated names), 1–20 messages, 1–32 content parts, text ≤20,000 chars, image URLs restricted to `data:image/(png|jpe?g|webp)` or HTTP(S). No prompt-injection-relevant fields are forwarded raw beyond what the upstream LLM expects.
- **Safe error logging:** upstream response bodies are truncated to 240 chars and whitespace-collapsed before being returned in `attempts` (`safeAttemptLog`).
- **Fallback chain** across primary + fallback models/keys/endpoints, with smart retry-on-5xx/429/408/409/425/401/403 and quota-pattern-on-400.

**Minor:**
- In-memory rate limit is per-isolate (Workers may run many isolates), so without `RATE_LIMIT_KV` the 30/60s cap is a soft ceiling. The code correctly prefers KV when configured.
- The `/status` endpoint surfaces `configured`/`originAllowed`/upstream host/path — informational only, no secrets. Fine.

---

## 6. Theme Analysis (Light / Dark)

**Mechanism:**
- Dark is the default (`:root` in `_tokens.css`). Light is activated by `data-theme="light"` on `<html>`.
- **FOUC prevention:** an inline pre-paint script in `index.html` reads `localStorage.vts_theme` and sets `data-theme` before CSS loads.
- `admin-page.js:15-48` shows the toggle: sets/removes the attribute, updates `<meta name="theme-color">` (`#f8fafc` light / `#0f172a` dark), persists to `vts_theme`, and migrates the legacy `theme` key.
- `_tokens.css` defines a **complete light palette** mirroring every dark property (brand, accent, surfaces, borders, text ramp, shadows, body gradients).

**Findings:**
| # | Severity | Finding |
|---|---|---|
| F6.1 | **Med** | **Light-theme rendering gaps.** Because `app.css`/`mobile.css`/`ocr-dashboard.css` contain thousands of hardcoded dark-assumed colors (see F4.3.1), components in light theme inherit colors designed for dark backgrounds — e.g. `mobile.css` green/amber/purple badge gradients (`#15803d`, `#b45309`, `#6d28d9`), near-black text (`#06121d`), and near-cyan text (`#eaffff`) on light surfaces. The token *system* is correct; the *coverage* is incomplete. |
| F6.2 | **Low** | PWA manifest `theme_color`/`background_color` are dark-only (`#0f172a`) — the OS-level UI (status bar, splash) won't match light theme. |
| F6.3 | **Low** | `index.html` ships an initial `<meta name="theme-color" content="#060b13">` (dark); verify the main app (not just `admin-page.js`) updates it on toggle. |
| F6.4 | **Info** | Dark theme is clearly the primary, polished design ("v12 Command UI" dark-first). Light is a secondary state — usable, but visually less refined in decorative/badge components. |

---

## 7. Translation Analysis (i18n)

**Files:** `js/i18n/{en,es,pt,de,fr,tr,ru,id,zh,ar,kr}.js` (11 languages) + loader `js/translations.js` + CI gate `scripts/check-i18n.mjs`.

### 7.1 Completeness (structural) — best-in-class
- **Every language defines exactly 1199 top-level keys** — perfect parity with English.
- Line counts cluster tightly (1271–1291), consistent with translation length differences per language.
- **Loader** (`translations.js:22-39`): English is bundled upfront; the other 10 are **lazy-loaded via dynamic `import()`** (per-language code-splitting) with **English fallback** on failure and an in-flight de-dup guard.

### 7.2 CI enforcement (`check-i18n.mjs`)
The i18n check (run in `check:fast`) is unusually thorough:
1. Walks `index.html`, `admin.html`, `eden-x1.html`, `tabs/*.html` for `data-i18n{,-ph,-title,-aria,-label}` attributes and collects referenced keys.
2. Walks `js/` for `adminT()/dashT()/t('key')` runtime references (with a prefix heuristic to limit false positives).
3. Asserts every referenced key exists in English.
4. Asserts **every language contains all English keys** (no missing).
5. Detects **broken placeholders**: `??`, the U+FFFD replacement char, and `letter?letter` patterns (catches encoding-corrupted translations).
6. Detects **specific Eden X1 keys that still equal the English string** (catches "left as English" untranslated content).
7. Reports per-language English-fallback coverage.

### 7.3 RTL & locale
- Arabic (`ar`) gets `document.documentElement.dir = 'rtl'` and `lang = 'ar'` (`admin-page.js:61-62`); `data-i18n`/`-ph`/`-title` all honored. Good RTL support.

### 7.4 Findings & honest limitations
| # | Severity | Finding |
|---|---|---|
| F7.1 | **Low** | The CI check enforces **structural** completeness but not **placeholder consistency**: a translation could swap `{version}`/`{time}`/`{error}` placeholders (count or name) and pass. Recommend adding a check that the `{...}` placeholder set in each translation matches English exactly. |
| F7.2 | **Info** | **Semantic accuracy / cultural appropriateness cannot be verified from code.** The `??`/U+FFFD checks suggest prior machine-translation cleanup occurred; a commit ("Match Vicked Russian contribution typo") indicates community translation patches. A human linguistic review of all 10 non-English locales is recommended. |
| F7.3 | **Info** | Language `<option>` labels are hardcoded in HTML (not i18n-keyed), so they don't localize — acceptable (users need to recognize their own language name). |

---

## 8. Accessibility Notes (cross-cutting)

- `--tap-min: 44px` token enforces WCAG touch-target minimums.
- `prefers-reduced-motion` globally honored.
- Icon-only buttons all carry `aria-label`/`title`.
- Live regions (`aria-live="polite"`) on status/loading areas.
- `sr-only` utility used for the toggle checkbox.
- **Gap:** the main app's theme-toggle and tab-pill buttons rely on visual state classes; verify `aria-pressed`/`aria-selected` are set on tab pills (the hero-info toggle correctly uses `aria-checked`, but the tab-nav pills did not show `aria-selected` in the sampled HTML).

---

## 9. Summary of Key Findings

**Top strengths:**
1. **Default-deny, field-validated Firestore rules** with owner/admin separation and server-timestamp enforcement.
2. **Hardened Cloudflare Worker** — App Check JWT verification, origin allowlist, streaming body-cap, rate limit, SSRF guard, model allowlist.
3. **No secrets in client**; `.env` untracked; public Firebase config correctly treated as public.
4. **`esc()` XSS discipline** + zero `eval`/`document.write`/`postMessage` + strict (mostly) CSP.
5. **CI-enforced i18n parity** (11 × 1199 keys) and a rigorous translation-validator gate.
6. **Mature dev process** for a solo project: ESLint/Prettier, Playwright + unit tests, size budget, SECURITY.md, PR/issue templates, least-privilege deploy permissions.

**Top concerns (priority order):**
1. **(Sec, Med)** `isAdminLogin()` rules rely on `sign_in_provider == 'password'` rather than the `admin` custom claim; safety depends on Email/Password **sign-up being disabled** in the Firebase Console (must be verified, not visible in code).
2. **(Sec, Low-Med)** Weak client-side admin convenience hash `SHA-256("12345")` in `admin-auth-config.js`.
3. **(Sec, Med)** CSP `script-src 'unsafe-inline'` — removable via nonces/hashes.
4. **(Maint, High)** CSS: ~3,000 hardcoded color lines + ~2,050 `!important` across `app.css`/`mobile.css` — breaks light-theme consistency and harms maintainability.
5. **(Maint, Med)** Very large logic files (`ocr-dashboard.js` 4170 lines, `ocr-roster.js` 3509) and 36 `var` declarations in `ocr-roster.js`.
6. **(Theme, Med)** Light theme inherits dark-assumed colors where tokens are bypassed.
7. **(XSS surface, Low)** 191 `innerHTML` assignments — escaped where sampled, but large surface.

---

## 10. Actionable Recommendations

### Security
1. **Verify and document the admin-auth invariant.** In the Firebase Console, confirm Email/Password **sign-up is disabled** (so only the console-created admin account can use password auth). Add this as an explicit assertion in `SECURITY.md`. **Preferably, migrate `vts_admin/*` write rules from `isAdminLogin()` to `isAdmin()`** (the custom-claim path already exists via `scripts/firebase-set-admin-claim.mjs`), removing reliance on provider type entirely. *(F1.1, F1.2)*
2. **Rotate the admin passphrase and remove `5994471a…` from `admin-auth-config.js`.** If a client-side confirm-gate is still desired, use a strong, unique passphrase and a slow hash (or, better, drop the client hash and require **re-authentication** (`reauthenticateWithCredential`) before destructive admin actions, enforced by Firestore rules). *(F4.2.1)*
3. **Remove `'unsafe-inline'` from `script-src`/`style-src`.** Move inline scripts to external files or hash them (`'sha256-…'`); the JSON-LD block is already safe as `application/ld+json`. *(F4.1.1)*
4. **Add an ESLint `no-restricted-syntax` rule** banning `innerHTML =` / `insertAdjacentHTML(` templates that interpolate non-`esc()` expressions, then audit all 191 sites. *(F4.2.3)*
5. **Consider rule-level write rate-limiting for `comments`** (e.g., a per-uid daily counter doc enforced in rules) to complement App Check. *(F1.3)*

### Maintainability / CSS
6. **Token-ize hardcoded colors** in `app.css`, `mobile.css`, `ocr-dashboard.css`, `eden-x1.css` so light theme adapts. Add a CI lint that fails on raw hex/rgb outside `_tokens.css`. *(F4.3.1, F6.1)*
7. **Reduce `!important` usage** (1,050 + 893) by flattening selector specificity. *(F4.3.2)*
8. **Split `app.css`** (14,749 lines) by feature area. *(F4.3.3)*
9. **Split `ocr-dashboard.js` / `ocr-roster.js`** into smaller modules; convert the 36 `var`s in `ocr-roster.js` to `let`/`const`. *(F4.2.4, F4.2.5)*

### Themes
10. **Make the PWA manifest theme-aware** (dynamically set `theme_color` on toggle, or serve two manifests) and ensure the main app updates `<meta name="theme-color">` on toggle (admin already does). *(F6.2, F6.3)*

### i18n
11. **Add a placeholder-consistency CI check** asserting each translation's `{...}` placeholder set matches English. *(F7.1)*
12. **Commission a human linguistic review** of the 10 non-English locales for semantic accuracy and cultural appropriateness. *(F7.2)*

### Process
13. **Separate source and deploy branches:** build from `main`, deploy artifacts to `gh-pages`, so WIP source commits don't trigger Pages deploys. *(§2.2)*
14. **Add `aria-selected`/`aria-pressed`** to tab-nav pills for screen-reader correctness. *(§8)*

---

## 11. Audit Methodology & Limitations

- **Source coverage:** Full local clone of the public repo (`gh-pages` branch at audit time). Read all security-critical JS (`firebase.js`, `firebase-sdk.js`, `admin-auth-config.js`, `admin-page.js`, `app-error-reporting.js`), the Worker, `firestore.rules`, `firebase.json`, `.firebaserc`, `package.json`, CI/deploy workflows, `SECURITY.md`, `.env.example`, `.gitignore`, `translations.js`, `check-i18n.mjs`, `_tokens.css`, and sampled the two `insertAdjacentHTML` contexts.
- **Static greps:** `eval`/`Function`/`document.write`/`innerHTML`/`var`/`console.log`/`postMessage`/`fetch`/`!important`/hardcoded colors/translation-key counts across `js/` and `css/`.
- **Delegated parallel deep-scans:** two `opencode` (glm-5.2) agents ran in parallel for a broad JS code-quality sweep and a deep CSS color/`!important` sweep. Both were killed by the 115s timeout mid-synthesis, but their **intermediate data was captured** (file/line counts, color-line counts per file) and is reflected in §4.3. The timeout is noted as a tooling limitation, not a finding.
- **Limitations (honest):**
  - Firebase Console settings (Email/Password sign-up enabled? App Check enforcement level? quota config) are **not visible from code** — findings F1.1/F1.2 are conditioned on these.
  - Translation **semantic** accuracy cannot be machine-verified; only structural completeness was confirmed (§7.4).
  - The 191 `innerHTML` sites were **sampled**, not exhaustively audited for `esc()` coverage — a recommendation, not a clearance.
  - Runtime behavior (actual light-theme rendering, OCR end-to-end, Firestore rule behavior under edge inputs) was not executed; this is a **static** audit.
