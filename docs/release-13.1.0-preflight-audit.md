# Release 13.1.0 Pre-Flight Audit — roc-vts.com

**Repo:** `aboroe1097-hash/hero-combo-creator2` (gh-pages production pipeline)
**Audit date:** 2026-07-09 · **Workspace HEAD:** `a1117ec` ("Refine Eden X1 reward scoring and trend display")
**Scope:** Version/release alignment · Firebase rules sync & security · Mobile layout (360–430px) · Navigation flow

## Executive Verdict

| # | Checkpoint | Verdict |
|---|---|---|
| 1 | Version & release alignment | ❌ **BLOCKER** — workspace is still 13.0.3 everywhere; no 13.1.0 string exists |
| 2 | Firebase rules sync & security | ✅ Strong overall · ⚠️ 1 client/rules read mismatch · reminder: rules deploy is separate from Pages deploy |
| 3 | Mobile layout 360–430px | ✅ Pass — fixed-width tables are all inside `overflow-x: auto` wrappers; dedicated 480/430/360px breakpoints |
| 4 | Navigation flow & smoothness | ⚠️ 2 cache-busting gaps on lazy-loaded tab fragments · 1 service-worker offline cache-poisoning bug |

**Local quality gates re-run in this workspace:** ESLint ✅ · Prettier ✅ · unit tests 151/151 ✅ ·
i18n ✅ (858 template keys, 1302 runtime keys, 11 languages) · production Vite build ✅ ·
size check ✅ (index 48.3 kB, total JS 1915.4 kB, total CSS 637.2 kB — all under budget) ·
Playwright smoke suite ✅ **green** — 26 passed, 0 failed (exit 0); the remaining tests are the
platform-specific visual-baseline snapshots that intentionally auto-skip in CI environments
(`tests/app-smoke.spec.js:302,329`). An initial all-fail run was purely environmental (the
container lacked the pinned Playwright `chromium_headless_shell-1228` binary; re-run used the
pre-installed Chromium). The mobile-overflow smoke tests passed.

---

## 1. Version & Release Alignment — ❌ BLOCKER

**Nothing in the workspace says 13.1.0.** Every version surface reads `13.0.3`. If 13.1.0 is the
intended release tag, the bump has not been made (or not pushed to this branch's base). Shipping
now would deploy a release labeled 13.0.3, skip the What's New banner (it keys off `APP_VERSION`
vs `CHANGELOG.md`), and leave the README/changelog out of sync.

- 📂 **Version surfaces that must all be bumped together:**

| File | Line | Current |
|---|---|---|
| `js/state.js` | 9 | `export const APP_VERSION = '13.0.3';` |
| `js/eden-x1.js` | 29 | `const APP_VERSION = '13.0.3';` |
| `js/admin-page.js` | 6 | `const APP_VERSION = '13.0.3';` |
| `index.html` | 659 | `v13.0.3` (footer) |
| `admin.html` | 157 | `v13.0.3` (footer) |
| `README.md` | 1, 75 | `v13.0.3` |
| `CHANGELOG.md` | top | latest entry is `## 13.0.3 - 2026-07-07` |

- ⚠️ **Why it breaks production:** the What's New banner (`js/app-whats-new.js:40-69`) fetches
  `CHANGELOG.md` and matches the `APP_VERSION` heading; with no `## 13.1.0` entry the banner
  renders stale or empty content. Footer/version labels and smoke-test expectations drift.
- 🛠️ **Fix:**

```js
// js/state.js:9
export const APP_VERSION = '13.1.0';
// js/eden-x1.js:29
const APP_VERSION = '13.1.0';
// js/admin-page.js:6
const APP_VERSION = '13.1.0';
```

```html
<!-- index.html:659 -->
<p>&copy; <span id="footerYear">2026</span> VTS 1097 &middot; v13.1.0</p>
<!-- admin.html:157 -->
<p>&copy; <span id="adminFooterYear">2026</span> VTS 1097 &middot; v13.1.0</p>
```

```markdown
<!-- CHANGELOG.md — prepend -->
## 13.1.0 - 2026-07-09

- <release notes for 13.1.0>
- Synced public version labels, README, changelog, and app constants to 13.1.0.
```

Also update `README.md` lines 1 and 75, and re-run `npm run check` (the smoke suite asserts
version labels).

**Build/environment cleanliness — ✅ verified:**
`window.VTS_MAINTENANCE_MODE = false` (`js/maintenance-config.js:4`); `EDEN_X1_TEST_MODE` only
activates via an explicit `globalThis.VTS_EDEN_X1_TEST_MODE` (test harness) — off in production;
App Check debug tokens are explicitly ignored outside local dev (`js/firebase.js:90-113`);
no hardcoded `localhost` endpoints in shipped code; `package.json` carries no stale env config.
Note: `npm run build` rewrites `?v=` stamps in `index.html`/`admin.html`/`eden-x1.html`,
`js/admin-page.js`, and regenerates `public/sw.js` `CACHE_VERSION` — commit those stamped files
as part of the release push (this is the existing pipeline behavior).

---

## 2. Firebase Rules Sync & Security — ✅ / ⚠️

**Syntax & structure:** `firestore.rules` (463 lines, `rules_version = '2'`) parses cleanly by
inspection and is text-asserted by `tests/unit/security-config.test.mjs` (151/151 unit tests pass).
Default-deny catch-alls are in place for both `/vts_admin/{document=**}` (line 454) and
`/{document=**}` (line 458). Admin writes require the forgeable-by-nobody `admin` custom claim,
not just password sign-in. Every writable document is `keys().hasOnly()`-validated with size
bounds. No overly-permissive `allow read, write: if true` anywhere.

**Schema sync:** every collection/doc path used by the client exists in the rules and vice versa:
`vts_admin/dashboard_data`, `vts_admin/roster_data`, `vts_admin/conduct_adjustments/records`,
`vts_admin/eden_x1_votes/records`, `vts_admin/eden_x1_vote_history/records`,
`vts_admin/eden_x1_vote_settings` (valid 2-segment doc path — the 13.0.2 fix is intact),
`comments`, `users/{uid}(/bestCombos)`, `errors`, `eden_map/shared_intel`. Vote payload fields
written by `js/eden-x1.js` exactly match `validEdenX1Vote()`/`validEdenX1VoteHistory()`.

### 2.1 ⚠️ Voters cannot read their own vote — silent permission failure on every save

- 📂 `firestore.rules:429-438` vs `js/eden-x1.js:1822`
- ⚠️ **Issue:** `match /vts_admin/eden_x1_votes/records/{voteId}` allows `read` only for admins,
  but the public vote-save flow does `await getDoc(voteRef).catch(() => null)` to detect changes.
  For every non-admin voter that read is **always denied**, so `previousVote` is always `null`,
  `changed` is always `true`, and every re-save writes a history row with `action: 'created'` and
  empty `previousCandidateKeys` — duplicate history rows and a misleading audit trail (plus a
  denied-permission error on every save in the Firestore backend logs). It does not crash the
  client (the `.catch` swallows it), but the vote edit-history feature shipped in 13.0.x never
  records real `updated` transitions from the public page.
- 🛠️ **Fix (owner-read, keeps admin-only for everyone else):**

```
// firestore.rules — replace the votes match block
match /vts_admin/eden_x1_votes/records/{voteId} {
  allow read: if isAdmin()
    || (signedIn() && resource.data.voterAuthUid == request.auth.uid);
  allow delete: if isAdmin();
  allow create: if signedIn()
    && validEdenX1Vote()
    && validEdenX1VotePath(voteId);
  allow update: if signedIn()
    && validEdenX1Vote()
    && validEdenX1VotePath(voteId)
    && resource.data.voterAuthUid == request.auth.uid;
}
```

  Since the doc id is `{season}__team_players__{uid}`, a signed-in user can only ever address —
  and now read — their own ballot. Update `tests/unit/security-config.test.mjs:274-278`
  expectations accordingly.

### 2.2 ⚠️ Rules deploy is NOT part of the gh-pages deploy

- 📂 `firebase.json` (rules pointer only — hosting is GitHub Pages)
- ⚠️ **Issue:** pushing to `gh-pages` publishes the static site but **never** publishes
  `firestore.rules` (already documented in the 13.0.0 changelog). If 13.1.0 includes any rules
  change (including fix 2.1), client calls will fail post-deploy until rules are pushed.
- 🛠️ **Fix:** run as a release step, before or with the Pages push:

```bash
firebase deploy --only firestore:rules --project abocombo
```

### 2.3 ℹ️ Low-severity backlog (not blockers)

- `errors/{errorId}` and `eden_x1_vote_history` allow `create` by any signed-in user, and the app
  signs users in **anonymously** — both collections are floodable by any visitor (bounded per-doc
  by field-size validation, and votes themselves are capped at one doc per uid/season). Mitigation
  is App Check (already enforced) + Firestore usage alerts; consider a Cloud Function TTL/cleanup.
- No `storage.rules` / `database.rules` exist, and that is correct: the client imports no
  `firebase/storage` or `firebase/database` — nothing to sync.

---

## 3. Mobile Layout Sizing (360–430px) — ✅ PASS

Methodology: swept all seven stylesheets for hardcoded/rigid widths, checked each against its
wrapper, verified breakpoint coverage, and confirmed the repo's own mobile-overflow smoke tests
(`eden x1 mobile surfaces avoid horizontal overflow with Cyrillic names`, `admin mobile
special-list tables avoid overflow and label card rows`) run in the suite.

Verified safe (each fixed `min-width` element sits inside an `overflow-x: auto` scroller, so
content scrolls inside its container instead of stretching the page):

| Fixed width | File:Line | Wrapper |
|---|---|---|
| `.research-tree-root` min-width 940px | `css/app.css:1278` | `.research-tree-scroll--lanes` (`overflow-x: auto`, app.css:1275) |
| `.dash-duty-match-row` min-width 910px | `css/ocr-dashboard.css:4525` | parent list `overflow: auto` (ocr-dashboard.css:4517) |
| `.dash-contribution-match-*` min-width 890px | `css/ocr-dashboard.css:4647` | `.dash-table-wrap` pattern |
| compare table min-width 920px | `css/ocr-dashboard.css:4934` | `.dash-contribution-compare-table-wrap` (`overflow-x: auto`, :4931) |
| `.dash-contribution-table` min-width 780px | `css/ocr-dashboard.css:5861` | `.dash-table-wrap` (`overflow-x: auto`) |
| leaderboard table min-width 620px | `css/ocr-dashboard.css:6433` | `.dash-table-wrap` with `-webkit-overflow-scrolling: touch` (:6427) |
| inline `min-width: 680px` table | `tabs/admin.html:962` | `.dash-table-wrap` (line 961) |
| `.tool-filter-block--troops` min-width 380px | `css/app.css:12437` | desktop-only (`@media (min-width: 769px)`), overridden ≤768px at app.css:12617 |
| `.heroes-ranking-list` fixed 360px | `css/app.css:3613-3616` | inside a `min-width` desktop media query |

Breakpoint hygiene: `css/mobile.css` (27 media queries) is loaded with
`media="(max-width: 768px)"`, includes explicit `@media (max-width: 430px)` (line 2280) and
`@media (max-width: 360px)` (lines 1027, 2533) tiers covering exactly the 360–430px audit range,
plus a global `overflow-x: hidden` guard (mobile.css:78, 1419). All three entry pages carry
`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />`.
No Tailwind-style arbitrary widths (`w-[400px]`) exist — the project uses custom CSS tokens.

**No mobile-breaking layout defects found.**

---

## 4. Navigation Flow & View Smoothness — ⚠️ 3 findings

Architecture: state-based tab controller (`js/app.js:1033 switchTab`) across 9 tabs on
`index.html`, plus standalone `admin.html` and `eden-x1.html` pages. All 9 tab buttons map to
existing panels (`generator/manual/heroes/research/materials/edenMap/strife/loyalty/youtube`) —
**no dead ends, no broken internal links** (`index.html ⇄ admin.html ⇄ eden-x1.html` all valid).
CLS protection is in place: `js/theme-prepaint.js` pre-paints the theme before first render, and
tab panels use fade-in transitions. `public/404.html` is a minimal noindex page — acceptable since
navigation is state-based, not path-based (no deep routes to redirect).

### 4.1 ⚠️ `tabs/eden-map.html` fragment has no cache-buster

- 📂 `index.html:502` (compare `:510` where loyalty *is* stamped)
- ⚠️ **Issue:** the Eden Map tab lazy-loads its DOM via
  `data-tab-src="tabs/eden-map.html"` → `fetch(src)` (`js/app.js:893`). The build stamper
  (`scripts/update-build-metadata.mjs:51`) only refreshes **pre-existing** `?v=` params, so this
  URL is never versioned. The service worker serves non-`/js/`/`/css/` requests **cache-first**
  (`public/sw.js:112-126`), so after each deploy returning users get the *previous* release's
  eden-map fragment for at least one load while the new `eden-map.js` runs against it —
  element-id mismatches surface as a silently broken Eden Map tab.
- 🛠️ **Fix (one line; the build stamper keeps it fresh forever after):**

```html
<!-- index.html:502 -->
<section id="edenMapSection" class="tab-panel hidden animate-fade-in tab-panel-pad-sm"
         data-tab-src="tabs/eden-map.html?v=20260709_000000">
```

### 4.2 ⚠️ `tabs/admin.html` fragment fetched unversioned

- 📂 `js/admin-page.js:132`
- ⚠️ **Issue:** same stale-fragment window as 4.1, on the admin dashboard — the highest-churn
  template in recent releases. `fetch('tabs/admin.html')` hits the SW cache-first branch with no
  version key.
- 🛠️ **Fix (uses the version constant already in the file):**

```js
// js/admin-page.js:132
const res = await fetch(`tabs/admin.html?v=${encodeURIComponent(APP_VERSION)}`);
```

### 4.3 ⚠️ Service worker caches every navigation under the `/index.html` key

- 📂 `public/sw.js:81-92` and its template in `scripts/update-build-metadata.mjs:166-177`
- ⚠️ **Issue:** the navigate handler does `cache.put('/index.html', copy)` for **all** page
  navigations. Visiting `/admin.html` or `/eden-x1.html` overwrites the cached shell for `/` with
  that page's markup. Next offline (or flaky-network fallback) load of the homepage serves the
  admin or Eden X1 HTML instead — wrong scripts, wrong page. It also means `/eden-x1.html`'s own
  offline fallback never matches its precached copy.
- 🛠️ **Fix — key by actual path and fall back per-page (apply to the template in
  `scripts/update-build-metadata.mjs`; `public/sw.js` is regenerated from it on build):**

```js
if (request.mode === 'navigate') {
  event.respondWith(
    fetch(new Request(request, { cache: 'reload' }))
      .then(async (response) => {
        const copy = response.clone();
        const cache = await caches.open(CACHE_VERSION);
        await cache.put(url.pathname === '/' ? '/index.html' : url.pathname, copy);
        await trimCache(cache, MAX_CACHE_ENTRIES);
        return response;
      })
      .catch(async () => (await caches.match(url.pathname)) || caches.match('/index.html'))
  );
  return;
}
```

---

## 5. Multi-Agent Edit Range Audit — `b2afe20..a1117ec` (14 commits, Jul 7–9)

Scope: all edits made after the 13.0.3 release commit by the multi-agent sessions
(codex 5.5 / qwen 3.7 / glm 5.2 / deepseek), +6,162/−716 lines across 72 files.
**State note:** these edits ARE committed (14 commits) and ARE on `origin/gh-pages`
(the remote tip was force-updated to `a1117ec`). What is missing is the 13.1.0 version
bump/changelog on top of them (§1).

All quality gates pass on this exact tree (see Executive Verdict), including the mobile
overflow smoke tests, so functional regressions are covered. Findings below are from
manual review of the diff.

### 5.1 ⚠️ Client-side PIN gate is cosmetic — and the PIN is published in the repo

- 📂 `js/admin-pin-gate.js:19` (fallback `'232323'`), `js/admin-auth-config.js:5`
  (`adminPin: '232323'` shipped to every visitor), used at `js/ocr-dashboard.js:1665`
- ⚠️ **Issue:** the new Eden X1 votes admin subtab is "protected" by a PIN that is
  hardcoded in public client source and bypassable via
  `localStorage.setItem('vts_eden_votes_pin_ok','1')`. It sits *inside* the
  claim-gated admin dashboard, so the real security boundary (Firebase admin custom
  claim + Firestore rules) is intact — but this gate must never be treated as
  security, and publishing the PIN in a public repo means it offers no secrecy even
  as a speed bump.
- 🛠️ **Fix:** either accept it as a UI convenience (document that), or derive it per
  deploy: remove the hardcoded fallback in `admin-pin-gate.js` and leave
  `adminPin: ''` in the committed config (empty PIN ⇒ gate disabled), setting the
  real value only in the deployed copy:

```js
// js/admin-pin-gate.js
function configuredPin() {
  return String(window.VTS_ADMIN_AUTH?.adminPin || '');
}
export function requireEdenVotesPin() {
  if (!configuredPin()) return Promise.resolve(true); // no PIN configured = no gate
  ...
}
```

### 5.2 ⚠️ Management votes load via JSONP on a page with no CSP

- 📂 `js/eden-x1-management-votes.js:352-392` (`loadManagementVotesViaJsonp` injects a
  `<script src="https://docs.google.com/...">`), consumed by `js/eden-x1.js:403`
- ⚠️ **Issue:** JSONP executes third-party-served JavaScript. It works only because
  `eden-x1.html` — unlike `index.html` and `admin.html` — has **no
  Content-Security-Policy meta at all** (a pre-existing gap this feature now leans on).
  The Sheet endpoint is Google's gviz API (Google-generated response, not raw sheet
  content) and all sheet-derived names are escaped through `esc()` at render
  (verified at `js/eden-x1.js:4467-4484` and the winner/status paths), so the
  practical XSS risk is low — but the page that renders community data is the one
  page without CSP defense-in-depth.
- 🛠️ **Fix:** add a CSP meta to `eden-x1.html` mirroring `index.html`'s policy plus
  the one extra origin the JSONP loader needs:

```html
<!-- eden-x1.html <head>, mirroring index.html:7 with one addition -->
script-src 'self' https://docs.google.com https://www.gstatic.com ...;
connect-src 'self' https://delicate-term-725f.aboroe1097.workers.dev https://*.googleapis.com ...;
```

### 5.3 ⚠️ Hardcoded module cache-buster stamps in `js/app.js` will go stale

- 📂 `js/app.js:18` and `js/app.js:147` — `'./app-whats-new.js?v=20260708_101500'`,
  `import('./app-research.js?v=20260708_101500')`
- ⚠️ **Issue:** `scripts/update-build-metadata.mjs` rewrites `?v=` stamps only in the
  three HTML files and the `ocr-dashboard.js` import inside `js/admin-page.js`
  (lines 48–65). These two new stamps inside `js/app.js` are invisible to it and are
  frozen at `20260708_101500` forever. Impact is bounded (the service worker fetches
  `/js/*` network-first), but the stamp stops doing its job on the next release and
  silently reintroduces HTTP-cache staleness for What's New and Research.
- 🛠️ **Fix — extend the stamper to cover app.js:**

```js
// scripts/update-build-metadata.mjs — alongside the admin-page.js block
const appJsPath = path.join(root, 'js', 'app.js');
if (fs.existsSync(appJsPath)) {
  const appJs = fs
    .readFileSync(appJsPath, 'utf8')
    .replace(
      /((?:app-whats-new|app-research)\.js)(?:\?v=[0-9A-Za-z_-]+)?/g,
      `$1?v=${buildVersion}`
    );
  fs.writeFileSync(appJsPath, appJs);
}
```

### 5.4 ⚠️ Confirm intended: grant_premium now downgrades a Guild Master reward

- 📂 `js/contribution-weighting.js:474-481`
- ⚠️ **Issue:** before this range, a `grant_premium` conduct flag never touched a
  player already at `guild_master`; now it unconditionally sets them to `core`, and
  the forfeit branch no longer applies to `guild_master` at all. Unit tests were
  updated to match, so it appears deliberate (commit 9df904a "Assign guild master
  reward to top Eden X1 contributor") — but this changes real reward outcomes, so
  confirm the new semantics are what R5 wants before shipping.
- 🛠️ If unintended, restore the `finalReward !== 'guild_master'` guard.

### 5.5 ℹ️ Reviewed and OK

- **Stale-asset recovery** (`js/admin-page.js:12-48`, mirrored on `vite:preloadError`):
  clears caches + unregisters the SW + reloads once per session on dynamic-import
  failure. Session-guarded against reload loops. Sound.
- **What's New suppression** on local/preview hosts and `?qa`/`?visual` params
  (`js/app-whats-new.js:42-51`): correct private-range regexes; no production impact.
- **Escaping discipline maintained:** the ~1,000 new render lines in `js/eden-x1.js`
  consistently route dynamic values through `esc()` (219 call sites); Google-Sheet
  names, voter names, and Cyrillic aliases are escaped at every sink I checked.
- **`public/sw.js` APP_SHELL** dropped `firebase.js`/`firebase-sdk.js` — consistent
  with their lazy-load usage; regenerated by the build.
- **Size budget raises** in `scripts/check-size.mjs` are documented in-line and match
  the measured output of the responsive CSS pass (build + size gate pass).
- **Data-only changes** (R4 management key list in `js/player-tags.js`, OCR name
  aliases in `js/ocr-shared.js`, GoodnesGraycious family key) are covered by updated
  unit tests.
- **Fragment stamp:** `tabs/loyalty.html` gained its `?v=` stamp in this range —
  but `tabs/eden-map.html` (§4.1) and the `tabs/admin.html` fetch (§4.2) were missed.
- **No secrets introduced** anywhere in the range (scanned for keys/tokens/passwords;
  the only hit is the deliberate-but-weak admin PIN, §5.1).
- **Fixed slot-1 assignment** of "Wicked Russian" in the management reward table
  (`js/eden-x1.js:3008`) is data-in-code consistent with prior releases; fine.

---

## Recommended pre-push checklist for 13.1.0

1. Bump all seven version surfaces (§1) + prepend the `## 13.1.0` CHANGELOG entry.
2. Apply fixes 4.1 and 4.2 (one-liners, low risk, close the stale-fragment window).
3. Apply fix 4.3 to `scripts/update-build-metadata.mjs` (sw.js regenerates on build).
4. Optionally apply fix 2.1 (vote owner-read) — if applied, `firebase deploy --only
   firestore:rules --project abocombo` **must** ship with the release (§2.2).
5. Decide on §5.1 (PIN in public repo), §5.2 (CSP for eden-x1.html), §5.3 (app.js
   stamp coverage), and confirm the §5.4 reward-semantics change with R5.
6. Run the full gate: `npm run check` (lint → format → unit → i18n → build → size → smoke).
7. Commit the build-stamped files (`index.html`, `admin.html`, `eden-x1.html`,
   `js/admin-page.js`, `public/sw.js`, `js/eden-datasets.payload.json`) and push to `gh-pages`.
