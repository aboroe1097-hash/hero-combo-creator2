# Lane 1 — Gate & Theme (commit-spine commits 2–6)

Status: proposal (2026-09-02). Lane: T1 heavy. Mode: proposal-only — this file is the
only deliverable; no code is modified. All file/line references verified against
`codex/overhaul-16-0-0` (gh-pages `beafd73a` + Phase 0 docs) in the `hcc2-overhaul16`
worktree.

---

## 0. Scope & goal

Own commits 2–6 of the master spine: **token authority** (audit 01+03), **release-gate
clearing** (preload fix + re-baseline method), and the **theme batch** (audit 02/04/05/
06–09). Everything here is light-theme, 768px-boundary, or opt-out-page remediation.
Dark theme is clean today and must stay pixel-identical.

### 0.1 Correction to master plan §0.5 (must be folded into master rev 5)

**The Phase 0 blocker does not reproduce at branch cut. The gate is GREEN.**

Verified two ways on 2026-09-02:

1. Local: `npm ci && npm run build && npm run size:check` on `codex/overhaul-16-0-0`
   — **passes** (output below).
2. CI: PR #176 `deploy-verification` (runs `verify:deploy` = inject-admin-auth +
   full `npm run check`) — **pass** on both the push and pull_request runs.

Fresh measurements at branch cut (post-minify):

| Route | Desktop | Budget | Headroom | Mobile | Budget | Headroom |
|---|---|---|---|---|---|---|
| index.html | 480.2 | 530.0 | +49.8 | 576.3 | 625.0 | +48.7 |
| admin.html | 679.4 | 680.0 | **+0.6** | 775.5 | 785.0 | +9.5 |
| eden-x1.html | 802.0 | 803.0 | +1.0 | 898.1 | 909.0 | +10.9 |
| eden-x2.html | 802.0 | 802.0 | **+0.0** | 898.1 | 909.0 | +10.9 |
| arcade.html | 461.6 | 463.0 | +1.4 | 557.7 | 585.0 | +27.3 |
| profile.html | 24.1 | 25.0 | +0.9 | 24.1 | 25.0 | +0.9 |
| specialization-towers | 78.3 | 80.0 | +1.7 | 78.3 | 80.0 | +1.7 |
| battle-simulator | 56.0 | 59.0 | +3.0 | 56.0 | 59.0 | +3.0 |

(kB.) Entry CSS 428.5/429.0 (OK). Total CSS 1420.1/1635. Deploy 30,177.2 kB / 658
files / 704 cap (46 headroom — consistent with the corrected file-count claim).
`forbiddenInitialFeaturePattern` reports **no** eager preload of eden-map/hero-atlas
at HEAD: a plain `vite build` of this branch emits 13 modulepreload links, all for
the entry's genuine static graph (ai-launcher, heroes-data, state, app-generator,
…), none for lazy features.

**Provenance of the §0.5 RED table:** its numbers (index 565.2/661.3, admin
719.1/815.2, eden 840.3/936.4, …) are ~85 kB above the clean-branch numbers on every
route. They match the shared stale checkout `codex/vite8-esbuild-standalone`
(22 commits behind gh-pages, `package.json` pinned to vite 8.2.2 + uncommitted
all-star-boh/HTML/CSS edits). **That checkout must never be used for gate
measurements.** This lane's budget discipline: every measurement runs on
`codex/overhaul-16-0-0` after a fresh `npm ci`.

Consequence for commit 3 (below): there is no preload regression to fix and nothing
to "clear". Commit 3 becomes **re-measure + keep budgets + refresh comments** (D1
lean: re-baseline *none*). The token-authority work in commit 2 stays first-class
because it is the only lever that creates route-CSS headroom for phases 10–12 —
eden-x2 has **0.0 kB** desktop headroom today and any Eden-route work will blow it.

### 0.2 Other measured corrections to the master plan

- **"7 stylesheets `min-width: 768px`"** is actually **7 media blocks in 2 files**:
  `css/app.css` (lines 4555, 5034, 5386, 5707, 15193) and `css/components.css`
  (lines 248, 1038). `css/mobile.css` uses `max-width: 768px` (link media attr on
  every page + internal blocks). Six other app.css blocks already use the
  `min-width: 769px` convention — the 7 blocks are drift.
- **Override census:** `css/ocr-dashboard.css` has **262** `[data-theme='light']`
  rule blocks (272 `data-theme` occurrences incl. non-light), `css/eden-x1.css` has
  **79** (85 occurrences) — 341 blocks total. Master plan's "~357 rules" matches
  the occurrence counts; use 341 blocks as the retirement target.
- **`tests/unit/light-theme-compatibility.test.mjs:141-144` pins the old override**
  `[data-theme='light'] #ocrDashboardRoot .dash-login-title { color: #10243b; }` —
  it **must be updated in the same commit** that retires the override or CI fails.
- The plan's D1 table said "entry CSS 422.5/429.0"; current is 428.5/429.0. Both OK.

---

## 1. Ordered work items (file-by-file)

### W1 — Token authority (spine commit 2) — audit 01 + 03

#### 1.1 `css/ocr-dashboard.css` — split the line-12 token block

Current state: `#ocrDashboardRoot { … 24 --ff-* tokens + font/color/min-width … }`
at line 12. Because `#ocrDashboardRoot` (1,0,0) beats `[data-theme='light']`
(0,1,1) from `css/_tokens.css:278`, light theme can only win via the 262
per-property override rules scattered through the file.

Target structure:

```css
/* Non-color tokens + layout props stay unscoped (theme-neutral). */
#ocrDashboardRoot {
  --ff-r-chip: 10px; /* radii/spacing/fonts/transitions: unchanged */
  --ff-font-ui: 'Sora', system-ui, sans-serif;
  --ff-font-mono: 'JetBrains Mono', ui-monospace, monospace;
  /* …radii, spacing, easing, blur, pads… (move out of the color list below) */
  font-family: var(--ff-font-ui);
  color: var(--ff-text);
  min-width: 0;
}

/* Dark color tokens — current values, byte-identical move. */
:root:not([data-theme='light']) #ocrDashboardRoot {
  --ff-void: #070b16;
  --ff-deep: #0a0f1e;
  --ff-glass: rgba(255, 255, 255, 0.06);
  --ff-glass-raised: rgba(255, 255, 255, 0.11);
  --ff-hairline: rgba(255, 255, 255, 0.13);
  --ff-text: #eef4ff;
  --ff-text-dim: #9fb0cc;
  --ff-text-mute: #41527a;
  --ff-cyan: #7dd3fc; --ff-fire: #fb923c; --ff-gold: #f5c451;
  --ff-violet: #a78bfa; --ff-rose: #fb7185; --ff-mint: #34d399;
  --ff-grad-primary: linear-gradient(90deg, #7dd3fc, #fb923c);
  --ff-grad-celestial: linear-gradient(90deg, #7dd3fc, #a78bfa, #fb923c);
}

/* Consolidated light counterpart — placed AFTER the dark block. */
:root[data-theme='light'] #ocrDashboardRoot {
  --ff-glass: rgba(16, 24, 39, 0.04);
  --ff-glass-raised: rgba(16, 24, 39, 0.06);
  --ff-hairline: rgba(16, 24, 39, 0.12);
  --ff-text: #101827;
  --ff-text-dim: #4b5c73;
  --ff-text-mute: #8090a8;
  /* + light values for the remaining dark color tokens */
}
```

**Option choice (the work order asks to evaluate and pick one, justify):**
- Option A — `:root:not([data-theme='light']) #ocrDashboardRoot` **plus** the
  `:root[data-theme='light']` counterpart above. Chosen.
- Option B — keep the unscoped block and add only a light counterpart: the light
  block would need to beat (1,0,0); `[data-theme='light'] #ocrDashboardRoot` is
  (1,1,0) > (1,0,0) — also works and is a smaller diff.

Justification for A over B: with A the dark values are *turned off* under light,
so both themes have exactly one authority and there is no dead dark state waiting
to be re-overridden. Specificity math: dark `:root:not([data-theme='light'])
#ocrDashboardRoot` = (0,1,0)+(0,1,0)+(1,0,0) = **(1,2,0)**; light
`:root[data-theme='light'] #ocrDashboardRoot` = **(1,2,0)** — equal, so **source
order decides** and the light block simply must come after (asserted by test).
`data-theme` lives on `<html>` (`js/theme-prepaint.js:329` sets
`document.documentElement.setAttribute('data-theme', 'light')`), and `:root` *is*
`html`, so both halves match. Do **not** use `html[data-theme='light']` alone
((1,1,1) would lose to (1,2,0)).

**Light values:** derive from the existing 262 light rules and align to
`css/_tokens.css:278+` canonical light values (`--ff-text: #101827`,
`--ff-text-dim: #4b5c73`, `--ff-glass: rgba(16,24,39,0.04)`, `--ff-hairline:
rgba(16,24,39,0.12)`, `--ff-text-mute: #8090a8`, …). The legacy overrides carry
slightly divergent dims (`#52657b` login-sub, `#64748b` kpi-label, `#10243b`
login-title) — collapsing onto the shared values changes a handful of pixels and
must pass the visual-diff acceptance (W6.4). Where the admin design *deliberately*
differs from shared tokens (e.g. `#10243b` vs `#101827` is within tolerance; state
cloud-status colors are per-state and stay component rules), triage per rule.

**Retire the 262 light rules by triage (do not bulk-delete):**
- (a) **Delete** rules whose properties are pure token flows (`color:
  var(--ff-text)`, `background: var(--ff-glass)`, `border-color:
  var(--ff-hairline)`, …) — the majority. Each deletion is verified by the
  acceptance in W6.4.
- (b) **Keep with a one-line justification comment** rules that carry genuinely
  distinct per-state values: `.dash-cloud-status[data-state='live'|'local'|'error']`
  (#0369a1/#047857/#92400e/#b91c1c + their rgba fills), `.dash-ops-overview`
  radial-gradient overlay, table-stack zebra stripes, sigil/animation colors.
- (c) **Optional promote:** where one light value is reused by ≥4 rules, add a
  semantic token (e.g. `--ff-dash-cloud-live`) to the light block instead of
  keeping the override.
- The `#ocrDashboardRoot { overflow-x: clip; }` block at line 9100 and all
  non-theme rules are untouched.

#### 1.2 `css/eden-x1.css` — same triage for its 79 light rules

Same procedure. The `.eden-x1-page`-prefixed rules (e.g. the
`.dash-contribution-weighted-table.dash-table--stack` rules around line 4172) are
per-component and mostly stay with comments; token-flow rules are deleted. Verify
eden-x1 **and** eden-x2 render identically (both link `ocr-dashboard.css` and share
`#ocrDashboardRoot`) — admin-scoped values must remain intact on both Eden routes.

#### 1.3 `css/specialization-towers-v2.css` — primary-button specificity (both themes)

Confirmed bug: the reset at line 52-58
`.specialization-towers-page button, … { color: inherit; font: inherit; }` is
(0,1,1). The primary rules at lines 287-293 are
`.specialization-action--primary, [data-specialization-action='export'] { …
color: var(--ff-on-accent); … }` — each (0,1,0). The reset wins; primary buttons
render inherited text color on the accent fill (bad contrast in **both** themes).

Fix (surgical, keep the reset):
```css
.specialization-towers-page .specialization-action--primary,
.specialization-towers-page [data-specialization-action='export'] { … }
```
(0,2,0) beats (0,1,1). Do **not** use `:where()` on the reset — it would silently
re-order every other inherited-color assumption in the file (lines 948, 1103
`color: inherit` are equal-specificity and rely on source order today). The towers
file is its own theme authority (`html[data-theme='dark']`/`html[data-theme='light']`
at lines 7/11, light component rules at 2089+) and the primary rules are already
token-driven, so one edit fixes both themes. Audit pass: grep towers for any other
`color:` rule on buttons at (0,1,0) or lower that the reset currently beats; fix
each the same way (expected: only the two above).

#### 1.4 `css/admin-login-gate.css` — no edit, verify collateral

`.dash-login-hint { color: var(--ff-text-dim) }` (line 7) currently reads 2.2:1 in
light. After 1.1 the token flips to `#4b5c73` (≈7.5:1 on the light dashboard
surface) by construction. Add this selector to the W6.4 contrast checklist; if any
admin-only hardcoded dark value remains, tokenize it here.

#### 1.5 `tests/unit/light-theme-compatibility.test.mjs` — update the pinned override

Lines 141-144 assert the *retired* `.dash-login-title` override. Replace with an
assertion on the new light token block (e.g. `:root[data-theme='light']
#ocrDashboardRoot` containing `--ff-text: #101827`). Any other assertion in the
file that matches a retired rule must be updated in the same commit.

### W2 — Release gate (spine commit 3)

1. **Preload guard:** no fix needed — `forbiddenInitialFeaturePattern`
   (`scripts/check-size.mjs:346-347`) passes at HEAD and keeps passing (it is the
   regression test; nothing in this lane adds eager links). Optional hardening if
   the orchestrator wants belt-and-braces: extend the pattern with the two other
   lazy-feature chunk names (`app-artifact`, `app-research`) — lean: leave as-is;
   the pattern already covers research/materials/export families.
2. **Re-measure** the eight route budgets *after* W1 lands (commands in §4).
   Record the table in the commit message and in the `check-size.mjs` comment
   history (the house pattern — see the 14.x/15.x comment run at
   `scripts/check-size.mjs:12-321`).
3. **D1 lean: re-baseline NONE.** Keep every ceiling exactly as-is. Rationale:
   the gate is green, budgets are the binding constraint for phases 10–12, and
   every ceiling is currently asserted by
   `tests/unit/light-theme-compatibility.test.mjs:149-170` (`entryCssBytes: 429`,
   `deployFileCount: 704`, the profile/arcade/battle/towers route caps) — changing
   a budget forces test churn for zero shipping value. Token retirement converts
   its savings into *headroom*, which phases 10–12 consume on their own routes
   (index) without any budget edit.
4. **Comment refresh only:** append the 16.0.0 line to each touched budget comment
   (new measured value + why it moved). Do not alter the asserted numeric lines.
5. File-count note: local build emits 658/704 (46 headroom). CI injects
   admin-auth-config before building and may emit a slightly different count;
   record CI's number from the PR check output in the comment, per the existing
   "CI measures larger" notes.

### W3 — Theme batch: profile auth surface (spine commit 4) — audit 02

`css/account-profile.css` (759 lines, 59 raw hex, **0 `var()`**). The light rules
that exist (833+) cover the surface/settings chrome but **not** the auth controls
— hence audit 02: "Create account" (active tab `#fff` on white ≈ 1.00:1), "Sign in"
(inactive tab `#91a6bd` ≈ 2.50), "Reset password" (`#6ee7f5` ≈ 1.46).

Edits (styles only; `profile.html` markup unchanged):

1. **Tokenize the auth surface** onto `var(--ff-*)` from `_tokens.css`:
   - `.account-tabs button` (line ~177): `color: var(--ff-text-dim)`; keep the
     `border-block-end: 2px solid transparent` + selected accent.
   - `.account-tabs button[aria-selected='true']`: `color: var(--ff-text)`;
     `border-color` → a theme-paired cyan token (dark `#2fd5e9`, light `#0e7490` —
     `--ff-action`-family; if the cyan identity must persist, add a local token
     pair rather than a raw hex).
   - `.account-button` base/hover (line ~319): map `#39516c`/`#10233a`/`#edf7ff`/
     `#17304b` onto `--ff-border*`/`--ff-control*`/`--ff-text` pairs.
   - `.account-button--text` (line ~359): `#6ee7f5` → token pair with light
     `#0e7490` (≈4.8:1 on `--ff-surface`).
   - `.account-kicker` `#c8a95d`, `.account-note` border/ink: token pairs with
     light equivalents (gold → `#8a6300` family; note text → `--ff-text-supporting`).
   - `.account-button--primary` gradient ink `#04121c` is fine on both themes —
     keep the gradient, tokenize its stops only if a token already matches.
2. **Contrast acceptance (light):** all of Create account / Sign in / Reset
   password ≥ 4.5:1; form labels and placeholder-adjacent text ≥ 4.5:1; verify in
   dark that nothing drifted (values must round-trip to the pre-change dark
   renders — diff screenshots).
3. **Test:** new `tests/unit/profile-auth-theme-contract.test.mjs` (source-style,
   mirroring `light-theme-compatibility.test.mjs`): asserts (a) zero raw hex in
   `color:`/`background:` declarations inside the auth-surface rules of
   `css/account-profile.css` (regex), (b) the light tab/selected/text-button rules
   exist, (c) min-height ≥ 44px retained on auth buttons.
4. **Budget:** profile route measures 24.1/25.0. Tokenization shrinks or is
   neutral (hex → `var()` shortens minified CSS). Re-measure after the commit;
   if it ever exceeds 25.0 the commit must shed bytes, not the budget.

### W4 — Theme batch: 768px boundary + chips (spine commit 5) — audit 04 + 05

#### 4.1 768px normalization

- `css/app.css` blocks at 4555, 5034, 5386, 5707, 15193 and `css/components.css`
  blocks at 248, 1038: `@media (min-width: 768px)` → `@media (min-width: 769px)`.
  Before editing, verify each block has a mobile counterpart (the footer/content
  2-col blocks pair with `max-width: 768px` rules; the 15193
  `(min-width: 768px) and (prefers-reduced-motion: no-preference)` pairs with the
  reduced-motion rule) — the 1px shift must not create a dead zone at exactly
  768px. `css/mobile.css` and the per-page `<link media="(max-width: 768px)">`
  attributes are the canonical mobile side and stay unchanged.
- **Lint test:** `tests/unit/responsive-boundary.test.mjs` — for every
  `css/*.css`, `assert.doesNotMatch(source, /@media\s*\(\s*min-width:\s*768px\b/)`;
  plus a positive assertion that `css/mobile.css` retains `max-width: 768px`. The
  regex deliberately only matches media queries *starting* with `min-width:
  768px`, so mobile.css's `(min-width: 641px) and (max-width: 768px)` combinations
  keep passing.

#### 4.2 Account chip + Eden announcement chips

- `css/account-chip.css` (minified single rule, hardcoded dark palette:
  `#0a1727e8` bg, `#eef8ff` ink, `#22c7e5` avatar, `#a8c3d5` sub, `#eabf4d` admin
  badge, `#c084fc→#7dd3fc` super gradient): tokenize onto `var(--ff-glass)`/
  `--ff-text`/`--ff-text-dim`/`--ff-gold`-family with the light pairs from
  `_tokens.css`. `css/admin-account-chip.css` already re-maps the chip onto admin
  tokens — mirror its pattern so the deck and the public chip agree.
  `css/shell-account-chip.css` is positioning-only; no change.
- Eden announcement chips (`css/eden-x1.css` 940-985): the chips already use
  `--eden-chip-rgb` per-row vars with a neutral fallback. The dark-only bits are
  the translucent white fill and the pastel inks (unreadable on light). Add:
  `[data-theme='light'] .eden-x1-announcement-chip { background:
  color-mix(in srgb, rgb(var(--eden-chip-rgb, 148, 163, 184)) 16%, #fff);
  color: color-mix(in srgb, rgb(var(--eden-chip-rgb, 148, 163, 184)) 58%,
  #10243b); }` and fix the hardcoded `#7dd3fc` in
  `.eden-x1-announcement-remaining-table td:first-child` (line ~983) the same way.
  Verify both Eden routes.
- Extend the contract test (or `theme-token-authority.test.mjs`): assert no raw
  hex remains in `css/account-chip.css` color/background declarations and the
  light announcement-chip rule exists.

### W5 — Battle-sim tap targets, lazy CSS, maintenance (spine commit 6) — audit 06/07/08

#### 5.1 Tap targets (B6)

Checkbox sources are all JS templates in `js/battle-simulator-app.js`: profile
source toggles (`:871`, 3 per side = 6), assumptions ack (`:1272`),
research-enabled ×2 (`:1500`), skill rows (`:1926`, ~8 visible) ≈ 18 native
checkboxes at 13–16px. CSS lives in `css/battle-simulator.css`.

Fix, CSS-only, no template churn:
- Enforce ≥44px hit areas on the **label** wrapping each checkbox
  (`label:has(> input[type='checkbox'])` or the explicit classes where they
  exist): `min-height: 44px` + padding to the row, keep the native input visually
  small (`width/height: 18px`, `accent-color: var(--ff-action)`), add
  `touch-action: manipulation` and `align-items: center`.
- `.battle-profile-source-toggles label` (line 841) already carries
  `min-height: var(--ff-tap-min)` — verify `--ff-tap-min` = 44px and fix the
  editor rows (`.battle-profile-editor-body label`, skill-toggle rows, the
  assumptions row) which do not.
- Desktop layout neutrality: the min-height must not change single-line row
  heights — use `min-height` (not `height`) and padding that collapses at
  single-line content.
- Acceptance: Playwright probe (`tests/app-smoke.spec.js` or a focused spec):
  for each visible checkbox label, `getBoundingClientRect().height ≥ 44 &&
  width ≥ 44` at desktop and 390px; dark and light.

#### 5.2 Lazy embedded towers stylesheet (B7)

`js/battle-simulator-app.js:155-163` — `loadBattleProfileTowersStyles()` caches a
`null` on failure (`.catch` returns `null` and the promise is memoized, so no
retry ever happens) and is wired only to the `[data-profile-editor]` `<details>`
`toggle` listener at `:3382`.

Fix:
1. On failure: log (keep `console.error`), do **not** cache the rejected/null
   result — reset `battleProfileTowersStylesPromise` so the next open retries.
2. Wire the load to **every** path that expands the editor: the `toggle` listener
   (`open === true`), plus any programmatic `details.open = true` assignment
   (grep `data-profile-editor` + `open` usages), so keyboard/script-opened editors
   are covered.
3. Reuse the existing localized load-failure copy pattern from the #154-168 audit
   fixes (surface a non-blocking hint instead of a broken-looking editor); zero
   new i18n keys — reuse an existing `loadFailed`-style key.
4. Keep the chunk lazy — no eager import on the battle route (route budget 56.0/59).

#### 5.3 Maintenance page theme (B8)

`maintenance.html` is a standalone inline-styled page, dark-only (`:root {
color-scheme: dark; … }`, hardcoded `#080d18`/`#f6f8ff`/card gradients). It has no
theme-prepaint script, so `data-theme` is never set.

Fix:
1. Add `<script src="js/theme-prepaint.js?v=…"></script>` to `<head>` (same stamp
   pattern as index.html) — it sets `html[data-theme]` and updates
   `#themeColorMeta`; add `id="themeColorMeta"` to the meta tag.
2. Add a compact `:root[data-theme='light']` block to the inline style: light
   `color-scheme`, background (`#f5f8fa` family), card surface/border/shadow,
   kicker/ink colors, grid opacity — hand-rolled light values matching
   `_tokens.css` (lean: **do not** link `css/_tokens.css`; the page is the
   failure path and must stay a single document).
3. The version label `v15.0.15` is a version:check surface owned by **lane 5**
   (spine 13) — do not touch it here.
4. Account chip on this page (bootstrap) automatically follows the theme once W4.2
   lands.
5. Acceptance: open with `localStorage` theme=light, confirm light render; dark
   render byte-identical to today.

---

## 2. Interfaces with other lanes

**Consumes**
- Master plan §0.5/D1 (this lane overrides them — see §0.1 correction; the
  orchestrator folds it into master rev 5).
- `_tokens.css` light pairs (shared authority — read-only).
- Lane 2 (Seasons & Roster): none at runtime; but lane 2's scaffolding commit
  touches `index.html` (hidden pills) and `js/app.js` — no overlap with this
  lane's file set (`index.html` is **not** touched by lane 1).
- Lane 5 (Release): owns all version:check surfaces including `maintenance.html`'s
  label — lane 1's B8 edit must leave it at `v15.0.15`.

**Produces**
- For lane 4 (Hero UI): the authoritative token layer. Lane 4's constraint is
  "zero raw hex, `var(--ff-*)` everywhere" — W1/W3/W4 establish the tokens it
  must use; lane 4 must not add eager CSS to any route (same binding budgets).
- For lane 3 (Codex data): freed admin/eden route-CSS headroom. Its payloads must
  stay lazy with zero eager bytes — the W2 comment refresh documents the
  headroom they may consume.
- For the orchestrator: measured post-retirement budget table (W2.2) as the input
  to any future D1 re-baseline decision, plus the §0.5 correction evidence.

---

## 3. Tests to add or update

| Test | File | Kind |
|---|---|---|
| New | `tests/unit/theme-token-authority.test.mjs` | Source-assertion: dark tokens scoped `:root:not([data-theme='light']) #ocrDashboardRoot`; light block `:root[data-theme='light'] #ocrDashboardRoot` exists with light `--ff-text`; light block index > dark block index (source order); `doesNotMatch` on the retired override patterns (`[data-theme='light'] #ocrDashboardRoot .dash-login-title`, `.dash-kpi-label` overrides, …); towers primary compound selector present |
| Update | `tests/unit/light-theme-compatibility.test.mjs:141-144` | Replace the pinned retired override with the light token block assertion (same commit as W1) |
| New | `tests/unit/profile-auth-theme-contract.test.mjs` | No raw hex in account-profile auth-surface color/background declarations; light tab/selected/text-button rules exist; ≥44px auth button floors retained |
| New | `tests/unit/responsive-boundary.test.mjs` | `doesNotMatch(/@media\s*\(\s*min-width:\s*768px\b/)` across `css/*.css`; mobile.css keeps `max-width: 768px` |
| Extend | `tests/app-smoke.spec.js` (or focused spec) | Battle-sim checkbox label rects ≥44×44 (desktop + 390px, both themes); admin light-theme computed `--ff-text` on a dashboard element; towers primary button computed color both themes; maintenance light render |

Unit-test caveat: node:test cannot compute the cascade, so "`--ff-text` resolves
to the light value inside `#ocrDashboardRoot` under light theme" is verified in
the browser probe (computed style) and approximated in unit land by the
source-order + token-value assertions. Probe method notes (from the audit):
neutralize transitions, honor `details[open]`, never rely on rAF in hidden panes
— encode these in every probe script.

Commands per commit (fast lane): `npm run version:check && npm run lint && npm
run format:check && npm run test:unit` + the focused Playwright spec + (W1/W2/W3)
`npm run build && npm run size:check`. Full `npm run check` + `firebase:preview`
is lane 5's release-commit gate, not per-commit.

---

## 4. Budget & risk notes

- **Binding constraint:** per-route CSS budgets. This lane is net-negative or
  neutral CSS bytes on every route by construction (retirement of 341 light
  rules ≈ 20–30 kB pre-minify across ocr-dashboard + eden-x1; minified savings
  ~8–15 kB; the added light token blocks are <1 kB). After W1 the admin/eden
  routes gain the headroom phases 10–12 need — eden-x2 desktop (0.0 kB) is the
  canary; re-measure it first.
- **Visual drift risk (W1):** collapsing the legacy light dims (`#52657b`,
  `#64748b`, `#10243b`) onto shared `_tokens` values changes a few pixels.
  Acceptance: before/after screenshots, both themes, on admin, eden-x1, eden-x2,
  towers, profile, battle-sim, maintenance (the RB-page screenshot practice from
  earlier releases). Any deliberate divergence stays as a commented keep-rule (triage
  bucket b).
- **Cascade risk (W1):** some light overrides exist because the base component
  rule hardcodes an rgba, not a token. Bulk-deleting breaks light theme silently.
  Mitigation: rule-by-rule triage (a/b/c buckets), each deletion gated by the
  browser probe, not by grep.
- **Stale-worktree hazard:** never measure or diff against
  `D:\Project\hero-combo-creator2` (22 behind, vite 8, uncommitted edits). All
  work and measurements happen on `codex/overhaul-16-0-0` / the
  `hcc2-overhaul16` worktree.
- **Pinned-test risk:** `light-theme-compatibility.test.mjs` pins both the old
  override and six budget strings; those edits ship in the same commit as the
  change they describe, or CI goes red.
- **768px shift:** a 1px behavior change at exactly 768px viewport; the dead-zone
  check in W4.1 plus the new lint test close the regression window.
- **Profile route (24.1/25.0):** tokenization must be byte-neutral-or-negative;
  if the contract test + size check disagree, shed bytes in the same commit.
- **i18n:** zero new visible strings in this lane — no locale file changes
  (constraint satisfied by construction). Reuse existing load-failure copy in B7.
- **Admin-scoped integrity (eden-x1/x2):** the shared `#ocrDashboardRoot` token
  block feeds all three admin-family routes; the W6.4 visual diff must cover both
  Eden routes explicitly.

---

## 5. Open questions (orchestrator/owner)

- **O1 — Canonical light dims:** shared `_tokens` values (`--ff-text-dim:
  #4b5c73`) vs the legacy dashboard dims (`#52657b`/`#64748b`)? Lean: shared
  values; visual-diff approval.
- **O2 — Preload guard hardening:** leave `forbiddenInitialFeaturePattern`
  as-is (lean) or extend with `app-artifact|app-research`? No shipping impact
  either way.
- **O3 — Maintenance page:** inline light block + theme-prepaint (lean) vs
  linking `_tokens.css`? Lean: inline; page stays single-document.
- **O4 — B6 hit areas:** label-padding approach (CSS-only, lean) vs
  overlay-stretched inputs? Lean: label padding.
- **O5 — D1 confirmation:** re-baseline none, budgets stay the binding
  constraint (lean), or partially re-baseline to bank explicit headroom? This
  lane proceeds with "none" unless the orchestrator overrides.

---

## 6. Execution checklist

1. [ ] Orchestrator folds §0.5/§0.2 corrections into master plan rev 5.
2. [ ] **Commit 2 (W1):** ocr-dashboard token split + light block; eden-x1
   triage; towers specificity fix; admin-login-gate verify;
   light-theme-compatibility test update; theme-token-authority test; browser
   probe. → `npm run build && npm run size:check` (record deltas).
3. [ ] **Commit 3 (W2):** re-measure eight routes; comment refresh in
   check-size.mjs (no budget changes); preload guard verified passing.
4. [ ] **Commit 4 (W3):** account-profile tokenization + light auth rules +
   contract test. → size:check (profile ≤ 25.0).
5. [ ] **Commit 5 (W4):** 7 blocks → 769px; responsive-boundary lint test; chip
   tokenization (account + shell + eden announcement) + light rules.
6. [ ] **Commit 6 (W5):** battle-sim tap targets + Playwright rect probe; B7
   retry + all-open paths; maintenance theme + prepaint.
7. [ ] Visual-diff acceptance: both themes × admin, eden-x1, eden-x2, towers,
   profile, battle-sim, maintenance; dark = pixel-identical to pre-change.
8. [ ] Full gate (`npm run check`, firebase:preview) — owned by lane 5 at the
   release commit, not per-commit.
