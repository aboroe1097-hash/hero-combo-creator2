# Session Handoff — roc-vts.com Audit + F1.1 Fix

**Date:** 2026-07-06 · **Branch:** `gh-pages` · **Repo:** `aboroe1097-hash/hero-combo-creator2` (local clone at `D:\Project\hero-combo-creator2`)

## 1. Project at a glance
- **Site:** https://roc-vts.com — "Hero Combo Creator" for Rise of Castles, VTS State 1097. v12.4.1.
- **Stack:** Vite 6 vanilla-ESM SPA · Firebase (project `abocombo`: Auth + Firestore + App Check/reCAPTCHA Enterprise) · Cloudflare Worker (`workers/qwen-cors-proxy.js`, name `delicate-term-725f`, holds `DASHSCOPE_API_KEY` as wrangler secret, does Qwen-VL OCR) · GitHub Pages deploy from `gh-pages` branch (source + deploy are the same branch) · html2canvas for image export · PWA (manifest + SW).
- **Solo dev:** `aboroe1097-hash`, 596 commits, linear history, Dependabot + qwen.ai bot. CI: `ci.yml` (push/PR → `check:fast`) + `deploy.yml` (push gh-pages → full `npm run check` + Pages deploy).
- **9 tools:** Manual Builder, Combo Generator, Hero Atlas, Research, Eden Map, Strife, Eden Loyalty, YouTube, VTS Admin (+ `eden-x1.html`). ~75 source JS files in `js/`, 7 CSS files in `css/`, 11 i18n locales in `js/i18n/`.

## 2. What this session did
### a) Comprehensive audit → `AUDIT-REPORT.md` (repo root, untracked)
Covers 8 areas: Firebase Rules, GitHub Repo, Tools/Sub-tools, HTML, JS, CSS, Themes, Translations. Rated findings. Key positive conclusions: default-deny Firestore rules with field validation; exemplary Cloudflare Worker (App Check JWT verify, origin allowlist, 5MB streaming body cap, rate limit, SSRF guard, model allowlist); no secrets in client (`.env` gitignored & untracked); `esc()` XSS discipline; zero `eval`/`document.write`/`postMessage`; CI-enforced i18n parity (11 langs × 1199→1206 keys); mature `SECURITY.md`.

### b) Applied the F1.1 security fix (the only code change this session made beyond the report)
**Problem:** `firestore.rules` gated `vts_admin` writes on `isAdminLogin()` = `sign_in_provider == 'password'`. Because the Firebase web API key is public, an attacker can self-register a password account via the Identity Toolkit `signUp` REST endpoint and pass that check → write `dashboard_data`/`roster_data`/`conduct_adjustments`, read/delete `eden_x1_votes`. Not just theoretical; exploitable regardless of console sign-up settings.

**Fix:** gate on the `admin` custom claim (`isAdmin()`) instead — unforgeable, set only via `scripts/firebase-set-admin-claim.mjs` (admin SDK + service account).

| File | Change |
|---|---|
| `firestore.rules` | Removed `isAdminLogin()` fn (was lines 17-22) + updated comment; 6 call sites (`vts_admin/dashboard_data`, `roster_data`, `conduct_adjustments` create/update/delete, `eden_x1_votes` read/delete) → `isAdmin()`. Now consistent with `eden_map/shared_intel` which already used `isAdmin()`. |
| `js/ocr-dashboard.js` | `doLogin` (lines 2054-2057): `isPasswordAuthUser` → `isAdminAuthUser(credential.user, { forceRefresh: true })`. Non-admin who self-registers is now rejected at login (fail-closed), not just 403'd on writes. |
| `js/firebase.js` | Updated stale comment on `isPasswordAuthUser` (lines 351-357): now documented as legacy loose check for re-resolution only, NOT a trust boundary. Function retained (14 other call-sites still use it for non-security hints). |
| `tests/unit/security-config.test.mjs` | 3 test blocks updated: test @150 ("…writes require the admin custom claim"), @199 (conduct uses `isAdmin()`), @212 (eden_x1 read/delete `isAdmin()`). Added `assert.doesNotMatch(rules, /sign_in_provider == 'password'/)`. |
| `AUDIT-REPORT.md` | §1.3 F1.1/F1.2 marked ✅ Resolved with fix description + deploy prerequisite. |

**Verification:** `npm run check:fast` fully green — lint clean, format clean, **150/150 unit tests pass**, i18n clean (776 template keys, 1206 runtime keys, 11 langs). The coupled security-config tests pass, confirming rules ↔ client ↔ tests consistency.

## 3. Repo / working-tree state (important context)
- The working tree has **substantial WIP beyond the audit** — many `M` files (fr.js +266/-234, tr.js +277/-251, app.js +49/-7, eden-map.js, eden-x1.js, ocr-render.js, contribution-weighting.js, player-tags.js, CSS files, admin.html, eden-x1.html, etc.) plus untracked new files (`js/consistency-score.js`, `js/eden-map-sidebar.js`, `js/eden-map-toolbar.js`, `js/index-page-enhancements.js`, `js/theme-prepaint.js`, `site-light.webmanifest`, `docs/audit-report-roc-vts.md`). That WIP is the user's separate in-progress work; during the session it transiently broke lint (fr.js/tr.js parse errors, app.js `applyLanguageDirection` no-undef, a "lean app shell 26 URLs" test fail) but was resolved by the user mid-session — all green now.
- `AUDIT-REPORT.md` (untracked) is the full report.
- The audit edits + F1.1 fix are **uncommitted** in the working tree, mixed with the user's WIP.

## 4. Pending redeploy (user's next action — NOT yet done)
Order matters:
1. **Step 0 (prerequisite, before rules go live or admin is locked out):** `$env:FIREBASE_SERVICE_ACCOUNT_PATH=...; node scripts/firebase-set-admin-claim.mjs <admin-email>` — sets `admin: true` claim on the admin UID. (If `eden_map/shared_intel` writes already work for the admin, the claim is already set — Step 0 is just confirmation.)
2. **Step 1:** `firebase deploy --only firestore:rules --project abocombo` (firebase CLI v15.22.4 is on PATH; reads `firestore.rules` per `firebase.json`).
3. **Step 3:** `git add` the 5 audit files + `git commit` + `git push origin gh-pages` → triggers `deploy.yml` full `npm run check` gate + Pages rebuild. (Worker redeploy `npm run worker:deploy` is NOT needed — worker untouched.)
- Note: pushing will also ship whatever WIP is staged/committed alongside. The user should stage selectively or sort out the WIP first.

## 5. Open audit recommendations NOT yet addressed (see `AUDIT-REPORT.md` §10)
- **F4.2.1** `admin-auth-config.js` ships `SHA-256("12345")` in `deleteHashes` — weak client-side convenience gate (documented in SECURITY.md as non-security, but should be rotated/removed).
- **F4.1.1** CSP `script-src`/`style-src 'unsafe-inline'` — removable via nonces/hashes (biggest remaining XSS-hardening step).
- **F4.2.3** 191 `.innerHTML =` assignments — sampled ones are `esc()`-escaped, but full coverage audit + ESLint rule recommended.
- **F4.3.1/F4.3.2/F6.1** CSS: ~3000 hardcoded dark-assumed color lines + ~2050 `!important` (app.css 1050, mobile.css 893) — breaks light-theme consistency. Token *system* is good (`css/_tokens.css`), token *discipline* is weak. app.css is 420KB/14749 lines (should split).
- **F4.2.4/F4.2.5** Large logic files (ocr-dashboard.js 4170 lines, ocr-roster.js 3509); 36 `var` in ocr-roster.js.
- **F6.2/F6.3** PWA manifest theme_color dark-only; verify main app updates `<meta name="theme-color">` on toggle (admin-page.js does).
- **F7.1** i18n: add placeholder-consistency CI check (`{...}` set per translation matches English). Semantic linguistic review of 10 non-English locales still needed.
- **F1.3** No rule-level rate limit on `comments` creates (any signed-in/anonymous user, unbounded moderated docs). App Check raises the bar.
- **§2.2** Consider source-on-`main`, deploy-artifacts-to-`gh-pages` (currently gh-pages is both).

## 6. Methods / tooling notes for future sessions
- The deployed site is a Vite production build (minified, hashed assets) — but the **full source is the local repo clone**, so audit the source, not the minified bundles.
- Firebase security rules are server-side config in `firestore.rules` (committed) — NOT visible from the deployed site. The Firebase Console (Auth sign-up enabled? App Check enforcement? quota) is NOT verifiable from code — findings conditioned on console state are flagged as such in the report.
- Two `opencode`/glm-5.2 deep-scan agents were dispatched (broad JS code-quality + deep CSS color/`!important` sweeps) but both hit the 115s bash timeout mid-synthesis; their intermediate data (file/line/color counts) was captured to `D:\Extra_C\Temp\opencode\{js,css}-scan.txt` and incorporated. If re-running, use longer timeouts or smaller scoped prompts.
- `opencode` is on PATH at `C:\Users\alsel\AppData\Roaming\npm\opencode.ps1`; `firebase` CLI at `C:\Users\alsel\AppData\Roaming\npm\firebase.ps1` (v15.22.4); wrangler is NOT installed locally — `npm run worker:deploy` (= `npx wrangler deploy`) fetches it on first run; worker secrets persist across deploys.
- Useful commands: `npm run check:fast` (lint+format+test+i18n, the CI fast gate), `npm run check` (adds build+size+smoke, the deploy gate), `npm run test:unit` (`node --test tests/unit/*.test.mjs`), `npm run worker:check` (wrangler dry-run).
