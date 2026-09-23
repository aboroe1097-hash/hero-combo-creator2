# Eden Siege — VTS Live Arena (plan)

Planning document for a large, real-time, "live" arcade game for roc-vts.com, modelled on
[`riba2534/claude-opus-5-5-demo`](https://github.com/riba2534/claude-opus-5-5-demo) but built out of our own
domain — heroes, towers, troops and Eden seasons.

**Status:** the L1 vertical slice is implemented on `codex/eden-siege` (see §14 for what shipped, what is
verified and what is still owed). The plan itself is unchanged; this document is now also the reviewer's map of
the remaining work. Cut from `origin/gh-pages` (16.0.19; PR #215 "gallery motion" and PR #216 "workbook medal
costs / 16.0.20" were open at the time of writing). Owner decisions are collected in §12; everything else is the
recommended path.

**Why a plan doc and not a branch:** the last two attempts at "big" work in this repo (16.0.0, 16.5.0) both
shipped as plan-plus-implementation PRs, and both lost time to unrecorded baselines and unlisted wiring. This
document exists so §6 (wiring) and §7 (budgets) are settled before the first line of game code.

---

## 0. What you asked for, and the one ambiguity

You asked for a big live arcade game like the demo repo's, themed to our project. The demo repo contains three
one-shot 3D games, one of which is literally a **ship** (`cf-transport-ship`, 运输船 — a container-deck FPS map).
"A live arcade ship game" therefore has two readings:

- **(a) ship as a verb** — a big arcade game we ship live on the site; or
- **(b) ship as content** — a game set on a ship deck, like the reference's transport-ship map.

**Decision for this plan: build the engine map-agnostic and ship both readings.** The arena is a data-driven
level; "Keep Rampart" (our castle) is map 1 and "Transport Ship" (narrow deck, container cover, one-way pipes) is
map 2. Level data is cheap; the engine, systems and live layer are identical. Nothing else in the plan depends on
which reading you meant.

---

## 1. The reference repo, measured

61 source files, three games, no build tooling beyond `esbuild`, no binary assets at all.

| Game | Modules | Per-game build output | Notables |
|---|---|---|---|
| `pelican-bike` | 11 | ~800 KB single HTML | cloth-physics scarf, day/night, ocean waves, 14 achievements, 5 camera modes, synthesized audio |
| `cf-transport-ship` | 18 + HTML/CSS | ~840 KB single HTML | full FPS: ballistics/recoil, bot AI, hit feedback, viewmodel, touch controls, synthesized gun audio |
| `qq-speed` | 15 + HTML | ~700 KB single HTML | drift/nitro mechanics, 4 tracks, AI racers |

The recipe, from `cf-transport-ship/build.mjs` and `qq-speed/build.mjs`:

```js
// esbuild -> IIFE -> inlined into one self-contained HTML file
const res = await esbuild.build({
  entryPoints: ['src/main.js'], bundle: true, minify: true,
  format: 'iife', target: ['es2020'], write: false, legalComments: 'none',
});
const html = fs.readFileSync('src/index.html', 'utf8')
  .replace('<!--APP_SCRIPT-->', () => `<script>${js}</script>`);
```

Eight things worth taking from it, and one we should not:

1. **Three.js (r186) as the only runtime dependency.** The bulk of each ~700–840 KB single-file build *is* the
   inlined three.js runtime; the game's own 14–23 modules add roughly 100–250 KB minified.
2. **Everything procedural.** `textures.js` paints canvas textures at runtime; `audio.js` synthesizes with
   WebAudio. Zero PNG/MP3/GLB in the tree — which is exactly how a game survives our media budgets (§7).
3. **Bot AI instead of netcode.** The reference has no networking whatsoever. "Opponents" are simulated locally.
   Cheap, robust, and the single biggest reason we can beat it on liveness rather than copy it.
4. **60-second rounds**, arcade scoring, instant restart.
5. **Touch-first controls** with a viewmodel and hit feedback — a phone game that also runs on desktop.
6. **Per-game module split** by system (`map`, `guns`, `bots`, `player`, `physics`, `viewmodel`, `hud`,
   `effects`, `audio`, `textures`).
7. **Self-verification**: `playwright-core` is a devDependency of the demo; the README claims headless soak runs
   (a 320-second fast-forward soak) and a sub-agent review that found 12 issues before shipping.
8. **Client-only data.** No accounts, no leaderboards, no persistence beyond the session.
9. ❌ **Single-file inline build.** We do *not* copy this. Our deploy pipeline (Vite/rolldown route chunks,
   `post-build.mjs`, service-worker precache, size budgets) is the opposite, and our budgets are measured per
   route. Inlining 700 KB of three.js into an HTML page would also break `indexBytes`/CSP-hash conventions.

---

## 2. What we already have (so the plan is an extension, not a parallel universe)

**The arcade today** — five "boot" mini-games (modes A–E: Merge Rush, Sort the Hoard, Crystal Relay, Set
Assembly, Hero Rumble) behind `arcade.html`:

| Layer | Reality today |
|---|---|
| Rendering | **DOM + CSS only.** No `<canvas>`, no WebGL anywhere in any game. Pieces are `<div class="piece" data-color data-type>` with `<img>` inside. |
| Loop | One inline `requestAnimationFrame` loop per game; the shape `const dt = Math.min(32, t - state.last)` is enforced by test. |
| Shell | `games/boot/shared.js` exposes one global, `BootGame.mountShell({modeKey, scoreKey, controlScheme, showShield})`, which **replaces `document.body.innerHTML`** and returns `{stage, playfield, scoreEl, bestEl, heartsEl, …}`. HUD = score / best / hearts / two wings. |
| Combos | `feedByColor` multiplier 1 → 3 with a 3 s decay; wing scale animation; combo badges; float text. |
| Host ↔ game | One-way only: hub iframe posts `{type:'vts:arcade-config', language, theme, title, description, mode}`; games accept it and never reply. Games open as `?embed=1&lang=…&theme=…`. |
| Persistence | localStorage bests (`vts_proto_<gameId>`), profile (`vts_arcade_profile`), retry queue (`vts_arcade_pending_scores`). |
| Cloud | Firestore `arcade_scores`, doc id `{gameId}__{uid}__{playerId}`, monotonic-increase writes only, `allow delete: if false`, deny-all catch-all, `limit(2000)` reads, score cap 100 000 000. **Client-authoritative** by explicit design. |
| Audio | None. No `AudioContext` in the entire shipped app. |
| Real-time | None. No `onSnapshot` for arcade (one-shot `getDocs` only), no WebSocket/SSE in `js/` at all, no matchmaking, no rooms, no presence. |
| Backend | Zero Cloud Functions and zero Worker involvement for arcade. Durable Objects exist in `wrangler.jsonc` (`AiQuotaDurableObject`, `BohOcrRateLimiter`) but only for AI quota and OCR rate limiting. |

**Hard constraints a new big game inherits** (numbers current as of `origin/gh-pages` 16.0.19):

| Budget | Limit | Audited now | Headroom |
|---|---|---|---|
| `entryCssBytes` | 430 KiB | 429.5 KiB | **~0.5 KiB** |
| `entryJsBytes` | 300 KiB | — | entry only; game must be lazy |
| `totalJsBytes` (`dist/assets/*.js`) | 10 084 KiB | 10 076.5 KiB | **~7.5 KiB** |
| `totalCssBytes` (`dist/assets/*.css`) | 1 635 KiB | 1 629.9 KiB | ~5.1 KiB |
| `totalDeployBytes` (whole artifact) | 32 100 KiB | 32 093.1 KiB | ~6.9 KiB |
| `totalMediaBytes` | 18 850 KiB | 18 828.2 KiB | ~21.8 KiB |
| `maxMediaFileBytes` | 4 MiB | — | — |
| `deployFileCount` | 733 | 730 | 3 files |
| `indexBytes` / gzip | 83 KiB / 16 KiB | 82.8 KiB / 14.2 KiB | ~226 B / ~1.8 KiB |
| `routeCssBytes['arcade.html']` | 463 / 585 KiB | 460.7 / 582.3 KiB | ~2.3 / ~2.7 KiB |

Read that table carefully: **there is no room inside the bundled graph for a game.** Any real-time 3D game is a
cap-lift decision, made explicitly and documented with a measured number, exactly the way this repo has lifted
caps at every release. §7 is that decision.

Other things that bind:

- `js/i18n/{en,es,pt,de,fr,hr,tr,ru,id,zh,ar,kr,it}.js` — 13 locales, and `npm run i18n:check` fails on any key
  missing from any locale, on placeholder mismatch, and on English text left in `NON_FALLBACK_KEYS`.
- Reduced motion and the CSS-animation baseline — **landing with PR #215** (`js/fx/motion-policy.js`,
  `scripts/check-motion-css.mjs`, not yet on `gh-pages` at the time of writing): a 16-entry baseline of allowed
  infinite animations. A game must not add CSS animations — canvas animation is invisible to that checker and is
  the right place for a game loop anyway. If PR #215 has not merged when L1 starts, use the existing
  `@media (prefers-reduced-motion: reduce)` convention from `games/boot/shared.css` instead.
- `tests/unit/light-theme-compatibility.test.mjs`, `security-config.test.mjs` (CSP without `unsafe-inline` on
  standalone pages, with SHA-256 hashes for inline scripts), `maintenance-mode.test.mjs` (every game page must
  load `../../js/maintenance-config.js` with the exact string), tap-target floors (44 px) and RTL (`ar`).
- The five-game sets are frozen in at least six places (`GAME_IDS`, `GAME_META`, `firestore.rules`,
  `workers/ai/tools.js`, both card grids, and exact-set assertions in three test files). §6 lists them.

---

## 3. The concept: Eden Siege — VTS Live Arena

**One sentence:** a 3–5 minute real-time siege run where you hold a stronghold against Eden war waves, spending
the gold you earn inside the run on towers and hero skills, and your score lands on a live board.

**Why this, and not a generic FPS:** it makes data we already own playable.

| Game input | Where it already lives |
|---|---|
| Tower types and their per-level costs / effects | `database/specialization/**` + the towers planner corpus (v2 planner, 718-node public corpus) |
| Troop types and counters (footmen / archers / cavalry) | specialization datasets + `js/battle-simulator-coefficients.js`, `-effects.js` catalogs |
| Hero roster, skills, portraits | hero skins (20 icons in `assets/skins/**`), `HERO_ICONS` in `games/boot/shared.js`, hero skills data |
| Materials, rarities, icons | `assets/dm/materials/**` (12 material PNGs), `images/boot/**` (85 KB of wing/gate art) |
| Season / event framing | Eden season data, alliance rosters, VTS score |

Nothing new has to be invented for the fantasy; the new work is the *simulation and the live layer*.

**Run loop (v1):**

1. Pick a map (Keep Rampart or Transport Ship deck) and a hero (from our hero list; the hero contributes one
   active skill and one passive).
2. Waves arrive on a fixed 60 Hz deterministic simulation. Enemy mix is derived from real troop counters, so
   "archers melt cavalry" is a game rule you can read in the battle simulator too.
3. Kill gold buys towers on the stronghold's sockets, or upgrades the hero.
4. Score = waves cleared × efficiency multiplier × combo chain (the wing/combo vocabulary the boot games already
   trained players on).
5. Run ends on stronghold fall or wave 20 (or a hard 5-minute clock). Results → live board, personal best,
   share card, one-tap restart.

**Determinism is the load-bearing decision:** a fixed 60 Hz sim step with a seeded PRNG, render decoupled and
interpolated. That single choice buys daily seeds, ghost replays, server-verifiable score bounds later, and
reproducible soak tests. The reference repo has none of this because nothing there is verified.

---

## 4. Engine decision — the money question

Four viable paths, with honest costs (estimates are estimates; Lane 0 measures them and the cap is set from the
measured number, per repo practice):

| Option | New dep | Cost against budgets | Risk | Verdict |
|---|---|---|---|---|
| **A. three.js, lazy route chunk** (npm dep, imported only by the game entry) | `three@0.18x` (MIT) | `totalJsBytes` ≈ +500–700 KiB min (tree-shaken; ~4–7 % cap lift), `deployFileCount` +4–8, `totalDeployBytes` +~0.6 MiB, new `routeCssBytes` key, entry budgets untouched | proven recipe; new to *this* CI (WebGL under headless Chromium via SwiftShader — must be verified in Lane 0) | **recommended** |
| **B. three.js vendored under `games/`-style static path** | `three` as a copied file | avoids `totalJsBytes` (it only measures `dist/assets/*`), but hits `totalDeployBytes`/`deployFileCount`, and the game then gets *no* bundling, minification, `?v=` stamping or CSP hashing | worst of both worlds; also `games/` is a raw copy dir, so built output there would be clobbered | reject |
| **C. dependency-free WebGL2 / 2.5D canvas renderer of our own** | none | ≈ +80–160 KiB of our code (cap lift ~1–2 %), no vendor bytes, no WebGL-fallback story needed if we stay canvas 2D; matches the existing canvas 2D precedent (`js/eden-map.js`, `js/app-export.js`) | most build risk, least wow; a "big" 3D look is exactly what you asked for | fallback (Plan B) |
| **D. stay DOM/CSS like the boot games** | none | fits budgets roughly as-is | cannot do hundreds of entities at 60 FPS; not "big" | reject |

**Recommendation: A, with C pre-approved as the fallback if Lane 0's measurement or the WebGL-in-CI check
fails.** Adding a runtime dependency also makes the release a "major dependency upgrade" under AGENTS.md, which
means the full `npm run check` before the PR — plan for that (roughly the 10–15 minute matrix), not the fast
lane.

**Quality tiers, because a 3D game on a mid-range phone is a different game than on desktop:**
`low | medium | high` chosen from capability signals (the `deviceMemory` / Save-Data / hardware-concurrency
detection landing with PR #215 in `js/fx/motion-policy.js`; until it merges, read the same signals directly), plus
a hard "WebGL unavailable" path that renders a 2D fallback board (or links to the boot games) instead of a black
screen.

---

## 5. "Live" defined — three tiers, one of which we ship

"Live" can mean anything, so pin it down. Each tier is a separate, gated step.

**L1 — Live board (ships in v1).** Server-timestamped **daily seed** (the run's enemy schedule and rolls derive
from the date + map, so everyone plays the same run that day), leaderboards per map and per day, personal bests,
an `onSnapshot` subscription so the board updates while the player watches (precedent: `js/eden-map-scout.js`
already does exactly this pattern), plus a **live ops config document** so you can flip a weekend modifier or the
featured map without a deploy. New collection, new rules, offline queue copied from `arcade-scores.js`.
Expected trust level: same as today — client-authoritative with plausibility bounds (`score ≤ f(waves, elapsed)`,
elapsed within run bounds, seed must match the day's).
**Cost:** small. No new backend. No new failure domain.

**L2 — Ghosts and spectators (v1.1, optional).** Because the sim is deterministic, a run can be stored as
`{seed, inputTrace, hero, map}` and replayed on any client. That gives visible rival ghosts racing your own
attempt, replay of a friend's run from the board, and a "watch the top run" screen. All cosmetic — the score
itself is still the monotonic best — so it needs no new trust model, and it is the cheapest way to make a
single-player game *feel* inhabited.
**Cost:** medium (input recording + replay UI + a compact trace format).

**L3 — Authoritative real-time PvP (v2, explicitly gated).** Rooms, matchmaking, server-validated rounds,
anti-cheat. The only viable substrate in this repo is a **Cloudflare Durable Object** (precedent already
declared: `AiQuotaDurableObject`, `BohOcrRateLimiter` in `wrangler.jsonc`), which means a new Worker, a new
deploy target, rate limiting, App Check enforcement, and a threat model. This is a second program, not a lane of
this one. **Do not start it before L1 has real players and the daily-seed integrity problems L3 would solve
actually show up.**

---

## 6. Shape, and the complete wiring checklist

**Shape: a standalone top-level route, not a sixth boot game.** Reasons:

- The boot contract is an exact set: `readdirSync('games/boot')` must equal the five files plus
  `shared.css`/`shared.js`, `GAME_IDS` is frozen at five, `firestore.rules` accepts five ids,
  `workers/ai/tools.js` hardcodes five, and `production-smoke.spec.js` asserts exactly five `.arcade-card`s in
  A–E order at 390×844. Adding a six-mode boot game means editing all of that and the A–E sequence tests, for
  no benefit — the boot shell wipes the body and is DOM/CSS by construction.
- The hub iframe only embeds `^/games/boot/[a-z0-9-]+\.html$` cards, so a top-level route is not an iframe
  candidate anyway.
- A separate route gets its own CSP, its own lazy chunks, its own CSS budget key and its own tests — a contained
  blast radius.

It still appears on the Arcade lobby as a **featured banner above the five cards** (not an `.arcade-card`, so the
exact-set smoke assertion keeps passing), and gets a command-palette entry.

Then every registry (verified against `origin/gh-pages`; this table *is* the plan's checklist):

| # | Registry | Change |
|---|---|---|
| 1 | `vite.config.js` `rolldownOptions.input` | add `'eden-siege': resolve(__dirname, 'eden-siege.html')`; the existing `chunkNameFor` group handles chunk naming |
| 2 | `scripts/post-build.mjs` | add an exclusion pattern so the game's chunk(s) are **not** precached (precedent: `PROTECTED_ALL_STAR_PRECACHE_PATTERN`). Top-level `dist/*.html` is auto-scanned into `APP_SHELL` — a 0.6 MiB game chunk must not ride the app shell; keep the html precached, exclude the payload |
| 3 | `scripts/update-build-metadata.mjs` | add `'eden-siege.html'` to `entryHtmlFiles` (gets `?v=` stamps + CSP hash recompute) and to `baseAppShellFiles` |
| 4 | `scripts/check-size.mjs` | add `routeCssBytes['eden-siege.html']`; add the route name to `forbiddenInitialFeaturePattern` so `index.html` can never preload it; **add a `routeJsBytes` budget** (new capability — today only CSS is budgeted per route, which is how a game chunk could grow unseen); lift the caps in §7 |
| 5 | `scripts/check-version-consistency.mjs` | add the page to the "public footer" list (regex `VTS 1097 … &middot; … vX.Y.Z`) |
| 6 | `firestore.rules` + `firestore.indexes.json` | new collection match block mirroring the arcade score contract; composite indexes for the board queries (`npm run rules:check` is in `check`; deploy is separate) |
| 7 | `js/i18n/*.js` (13 locales) + `js/i18n/standalone-copy.js` | new keys with full parity (check-i18n enforces parity, placeholder parity, and non-fallback French… English text); add the page to the scanned HTML list in `scripts/check-i18n.mjs` |
| 8 | Nav surfaces | `index.html` More menu, `js/shell-v14.js` (source id + hash), `js/command-palette.js` destination, `js/ai/toolkit-map.js` (page entry) |
| 9 | `public/sw.js` | no hand edit — regenerated by `post-build.mjs`; verify the exclusion from #2 landed |
| 10 | Tests | new `tests/unit/eden-siege-*.test.mjs` contract tests; extend `tests/production-smoke.spec.js` (footer version, maintenance flag, responsive, no horizontal overflow); `security-config.test.mjs` (CSP for the new page); `light-theme-compatibility.test.mjs` if route CSS is added; `size-check-pipeline` still green |
| 11 | Playwright | new `tests/eden-siege.spec.js` (boot, play, restart, no console errors, FPS floor), wired into the `smoke` script |
| 12 | Release | `CHANGELOG.md` entry, version bump across package/lockfile/app constants/footers/README (user-visible change) |
| 13 | `workers/` | only for L3 — out of scope for v1 |

---

## 7. Budget allocation (the honest part)

The game cannot ship inside today's headroom. So the plan does what this repo always does: **raise specific caps
by a measured amount, with the reason recorded in the cap's comment, and add a budget that prevents the new
spend from growing silently.**

| Budget | Today | Proposed | Why |
|---|---|---|---|
| `totalJsBytes` | 10 084 KiB | **+ measured three.js chunk, rounded up (~10 850–10 950 KiB)** | the engine is the one genuinely new dependency; set from Lane 0's measured minified size, not from a guess |
| `deployFileCount` | 733 | +8–10 | one route's chunks + lazy locale chunks |
| `totalDeployBytes` | 32 100 KiB | +~700 KiB | the chunk(s), nothing else |
| `routeCssBytes['eden-siege.html']` | — | new key, ~24 KiB desktop/mobile | HUD + shell CSS only; the game canvas needs almost none |
| **`routeJsBytes['eden-siege.html']`** | — | **new check, ~900 KiB** | without it, a game chunk is the only unbudgeted byte class in the repo |
| `totalMediaBytes` | 18 850 KiB | **unchanged** | rule: procedural art + reuse of the existing `assets/dm/materials`, `assets/skins`, `images/boot` library (~770 KB already deployed). Any new art is a separate, explicit decision |
| `entryJsBytes` / `entryCssBytes` / `indexBytes` | unchanged | **unchanged** | the game is lazy-loaded and never referenced from `index.html` |

Precache policy: the HTML page is precached (tiny, offline navigable); the game payload is **not** — it loads on
first play, like the boot games do today.

---

## 8. Module layout

```
eden-siege.html                    route shell: CSP (no unsafe-inline), footer version, ?v= stamps, canvas + HUD mounts
css/eden-siege.css                 lazy route CSS (new routeCssBytes key)
js/eden-siege/main.js              entry: capability gate, quality tier, lazy engine import, lifecycle
js/eden-siege/engine/renderer.js   three renderer, camera rig, quality tiers, context-loss recovery
js/eden-siege/engine/loop.js       fixed 60 Hz sim step + interpolated render, pause on visibilitychange
js/eden-siege/engine/input.js      keyboard / gamepad / touch (>= 44 px targets, RTL-aware HUD)
js/eden-siege/engine/textures.js   procedural canvas textures (incl. hero-skin and material-icon reuse)
js/eden-siege/engine/audio.js      WebAudio synthesis — first audio in this project, no assets
js/eden-siege/sim/*.js             units, waves, towers, projectiles, hero skills, economy, scoring
js/eden-siege/data/maps.js         Keep Rampart + Transport Ship deck as level data
js/eden-siege/data/units.js        troop tables derived from the battle-simulator coefficients
js/eden-siege/live/scores.js       new collection + offline queue (mirrors js/arcade-scores.js patterns)
js/eden-siege/live/daily.js        server-time seed + score plausibility bounds
js/eden-siege/live/ghosts.js       L2: record/replay of {seed, inputTrace}
js/eden-siege/ui/hud.js            HUD, results, share card, locale formatting
tests/unit/eden-siege-*.test.mjs   contract + sim determinism tests
tests/eden-siege.spec.js           browser smoke + soak
```

Two structural rules: **`sim/` never imports from `engine/` or from three.js** (it is pure, deterministic and
unit-testable in plain Node), and **`data/` never imports anything** (it is data).

---

## 9. Lanes

Each lane is independently revertable and ends green. Expect roughly: L0 a day, L1–L2 the bulk of the effort,
L3 medium, L4–L5 the tail that decides whether it feels good.

**L0 — Scaffolding and the measurement gate** (small, one PR)
Route shell, lazy chunk, empty canvas, capability gate, quality tiers, WebGL-in-CI verification, **the measured
three.js chunk size**, cap lifts from §7 with the numbers recorded in comments, `routeJsBytes` check, wiring
items 1–5 and 9–10 from §6. Exit: `npm run build && npm run size:check` green with the new route present at zero
gameplay; a Playwright spec loads the page in CI with WebGL available.

**L1 — Engine core**
Renderer, camera, fixed-step loop, input (keyboard/gamepad/touch), procedural texture module, context-loss and
tab-hidden handling, 2D fallback path. Exit: a grey-box arena with a controllable hero at 60 FPS on the mobile
profile; soak spec holds frame time with the 4× CPU throttle.

**L2 — Gameplay systems**
Waves, troop tables and counters, tower placement/upgrade on sockets, hero skill + passive, economy, scoring and
combo, win/lose, restart. Exit: a complete, winnable, lossable run; sim unit tests (determinism: same seed +
same inputs ⇒ same score, byte-identical) green.

**L3 — Content, art, HUD, i18n**
Two maps as data, procedural art pass (materials, icons, hero skins as billboards), HUD/results/share card, 13
locales with parity, RTL, light/dark chrome around a dark canvas, reduced-motion behaviour, audio pass. Exit:
`npm run i18n:check` green across all locales; the page passes the light-theme and motion-css contracts; a
first-time player finishes a run without reading instructions.

**L4 — Live layer (L1 of §5)**
New collection + rules + indexes, daily seed from server time, live board with `onSnapshot`, personal bests,
offline queue, live-ops config document, share. Exit: two browsers signed in as different players see each
other's scores appear without a reload; rules verified against the live project.

**L5 — Hardening and release**
Perf pass (draw calls, texture memory, allocation churn), accessibility pass (focus order, ARIA live score,
pause, 44 px targets), failure paths (no WebGL, mid-run disconnect, storage full, maintenance mode), soak test in
CI, docs (`docs/README.md` index entry, README feature line), CHANGELOG, version bump, full `npm run check`, and
optionally `npm run firebase:preview` since this is the kind of large change that gate exists for.

**L6 — optional, gated — Ghosts (L2 of §5).** Only after L1–L5 are live and people are playing.

---

## 10. Verification matrix

| Gate | What it proves |
|---|---|
| Sim determinism unit test (same seed ⇒ same score) | replays, daily seeds and server-side checks are even possible |
| Soak spec: 5 minutes of scripted play, headless, 4× CPU throttle | no frame-time collapse, no memory growth, no console errors |
| Frame-time budget | p95 frame time within the mobile profile at `medium` quality |
| Boot smoke on the production config | the page loads, plays, restarts; maintenance flag respected; footer version correct |
| Responsive check (390×844 and 1440×900) | no horizontal overflow, HUD reachable, targets ≥ 44 px |
| No-WebGL path | clear message, no black screen, arcade still reachable |
| Reduced motion | non-essential motion off, game still playable |
| `size:check` with the new `routeJsBytes` | the engine cannot grow unseen |
| Rules verification against the live project | the new collection accepts exactly what it should |

---

## 11. Risks and kill criteria

| Risk | Kill / fallback |
|---|---|
| three.js in a headless-CI WebGL context is flaky | Lane 0 verifies before any gameplay work; fallback is option C (§4) |
| Cap lift rejected on principle | fallback is option C; the game keeps every other plan property |
| 60 FPS unreachable on the mobile profile | drop to `low` tier defaults (fewer entities, no shadows); if still failing, cut map 2 and particle systems before cutting the loop |
| Determinism fights the renderer | sim step stays pure; if a system cannot be made deterministic, it moves to the cosmetic layer and is excluded from the seed |
| Scope: "big" becomes "endless" | v1 is exactly §3's run loop on two maps. Multiplayer, progression, cosmetics and hero collection are explicitly *not* v1 |
| New media bytes are needed | separately decided; the default answer is no, and the game is drawn procedurally |

---

## 12. Open decisions (owner)

1. **Engine** — three.js + a measured ~0.6–0.7 MiB cap lift (recommended), or zero-dep 2.5D canvas (option C)?
   This drives everything in §4 and §7.
2. **Map 1 skin** — castle keep first with the ship deck as map 2 (recommended), or ship deck first?
3. **Route shape** — standalone `eden-siege.html` route (recommended), or force it into the boot A–E contract as
   a sixth mode?
4. **v1 liveness** — L1 live board only (recommended), or L1 + ghosts in the first release?
5. **Score storage** — a new collection (recommended; leaves the frozen five-game contract alone), or extend
   `arcade_scores` to a sixth `gameId` and update rules/tests/worker/UI everywhere?
6. **i18n at launch** — all 13 locales (recommended, matches the repo's rule), or English-first with the page
   kept out of the i18n scan until translations land?
7. **Audio** — first audio in the project (synthesized, no assets), or silent v1?
8. **Do the L3 numbers matter to you?** If server-authoritative PvP is a near-term goal rather than a someday
   goal, the sim and storage formats should be designed for it now (they already are in this plan) and the
   Worker spike should be scheduled separately.

---

## 13. Appendix — evidence and commands

**Where each claim came from** (`origin/gh-pages`, 16.0.19 unless noted): budgets and audited numbers —
`scripts/check-size.mjs`; route/precache mechanics — `scripts/post-build.mjs`,
`scripts/update-build-metadata.mjs`, `public/sw.js`; boot contract — `games/boot/shared.js`,
`tests/unit/arcade-artifact-contract.test.mjs`; scores — `js/arcade-scores.js`, `firestore.rules`
(`arcade_scores` match block); hub — `js/arcade-hub.js`, `js/arcade-spa.js`, `js/arcade-lobby-ui.js`;
smoke assertions — `tests/production-smoke.spec.js`; reference repo — its README plus
`cf-transport-ship/build.mjs`, `package.json`, `src/index.html`, and the repository file tree.

**Commands for whoever picks this up:**

```bash
git fetch origin
git switch -c codex/eden-siege-l0 origin/gh-pages
npm ci
npm run build && npm run size:check     # measure before lifting any cap
npm run check:fast                      # lane work
npm run check                           # required for the dependency change + rules change
npm run rules:check
npm run firebase:verify-arcade          # existing browser-side cloud verification, as a reference
```

**One thing to fix while passing through:** `scripts/verify-arcade-firestore-contract.mjs` still writes the old
two-segment doc id (`arcade_scores/{gameId}__{uid}`) with no `playerId`, which the current rules reject with a
403 — the script asserts 200 and would fail against production rules today. `tests/unit/arcade-artifact-contract.test.mjs`
only greps the script for markers, so CI never sees it. Align it with `js/arcade-scores.js` before trusting it as
a model for the new collection's verifier.


---

## 14. Implementation status — L1 slice (branch `codex/eden-siege`)

**Shipped in this slice**

| Area | Where | Notes |
|---|---|---|
| Route shell | `eden-siege.html` | Own CSP (no `unsafe-inline` in `script-src`, no inline scripts), footer with the app version, canvas + HUD host, maintenance flag, theme prepaint |
| Route controller | `js/eden-siege/main.js` | Reads theme/language, sets `dir=rtl` for `ar`, WebGL capability probe, quality tier, lazy `import('./game.js')`, error boundary with retry, exposes `window.__EDEN_SIEGE__` for tests |
| Engine | `js/eden-siege/engine/{renderer,textures,input,audio}.js` | three.js scene, pooled sprites (units/bolts/loot/fx), procedural canvas textures, keyboard + gamepad + touch input, first WebAudio synthesis in the project |
| Simulation | `js/eden-siege/sim/world.js` | Fixed 60 Hz, seeded, DOM-free; waves, troop counters, towers with sockets and upgrades, gold pickups, combo chain, nova, player respawn, core HP, victory/defeat, event stream for sound and HUD |
| Data / theming | `js/eden-siege/data/{theme,balance,maps,copy}.js` | The whole re-skin surface: palette from `css/_tokens.css`, hero roster and stockpile/DM art reuse, balance tables, two maps (Keep Rampart, Transport Ship deck), 5-locale copy with English fallback |
| HUD | `js/eden-siege/ui/hud.js` + `css/eden-siege.css` | Topbar, stronghold bar, wing meters, element/nova dock, build dock, combo readout, toasts, banners, results overlay, touch stick and attack button, light-theme and RTL-safe rules |
| No-WebGL path | `js/eden-siege/ui/fallback2d.js` | Builder view on canvas 2D with the same renderer interface (`render`/`resize`/`socketAtScreen`) |
| Tests | `tests/unit/eden-siege-sim.test.mjs` | 12 tests: seed determinism, rewindable RNG, replay equality, restart reproduces the same run, divergence on a new seed, wave/pickup/tower/upgrade/nova/defeat rules, arena-data sanity, entity budgets over a scripted minute |

**Verified in this slice**

- `node --test tests/unit/eden-siege-sim.test.mjs` — 12/12 pass.
- `npx eslint js/eden-siege/**/*.js tests/eden-siege.spec.js scripts/capture-eden-siege.mjs` — clean.
- `npm run build` (full pipeline: data checks, payloads, vite, post-build, CSS minify) — exit 0 on this branch.
- `npm run siege:test` — **6/6 pass against the production preview build**: the page boots the engine, renders
  frames, plays wave one with kills, score and gold, pause stops the step counter and resume continues it, the
  ship deck is a playable second arena, the 390x844 layout has no horizontal overflow and real touch targets,
  a `?lang=ru` page renders Russian copy, and the shell keeps its CSP/footer contract. No console errors and no
  failed same-origin requests in any run (`tests/eden-siege.spec.js`, third-party font hosts are stubbed so the
  suite runs offline).
- **Lane 0's WebGL gate passed**: headless Chromium reports `mode: "webgl"`, so the three.js path is what ran,
  not only the 2D fallback. A scripted 15-second run measured 193 rendered frames / 898 simulated steps, wave
  one cleared, 4 kills, stronghold and hero at full health, zero console errors; the ship deck played the same
  way. `node scripts/capture-eden-siege.mjs` replays that and writes reviewable PNGs into `tmp/`.
- The browser spec also found and forced fixes for three real defects: a wall across the player's firing lane in
  both maps (no run could ever score), a camera shallow enough that the stronghold hid the arena, and `?lang=`
  never being read despite being documented.

**Measured cost (§7's numbers, now real)**

| Item | Measured | Note |
|---|---|---|
| Engine chunk (`renderer-*.js`: three.js + renderer + textures) | **567,261 B raw / 143,392 B gzip** | this is what the `totalJsBytes` lift must cover |
| Route entry (`eden-siege-*.js`) | 2,946 B raw / 1,368 B gzip | shell + sim + HUD, no engine |
| Route CSS (`eden-siege-*.css`) | 16,968 B raw / 4,066 B gzip | fits a 24 KiB `routeCssBytes` key with room |
| New files in the artifact | +3 chunks (entry, engine, CSS) | this build emitted 739 files against the 733 cap |
| New media bytes | **0** | procedural textures, instanced geometry and Velo himself — no art files added |

A `?quality=low|medium|high` query override now pins the render tier (detection stays the default). It exists
because the browser suite and low-end devices both need to guarantee the cheap path: with shadows on, headless
software rendering starves the main thread badly enough that pointer clicks time out.

The local `size:check` refuses to certify this branch's build because `node_modules` in the authoring worktree
drifted from `package-lock.json` (`vite 8.2.2` installed vs `8.3.0` locked; `npm install` could not complete
here). **The wiring PR must run `npm ci` and take the audited totals from a clean build** — the per-chunk numbers
above are from the full pipeline build and are the ones to budget from.

**Not verified yet (do not merge on this slice alone)**

- The budget lift itself is not applied: `totalJsBytes`, `deployFileCount` and the new `routeJsBytes` check are
  still owed, so `npm run size:check` on a clean tree is expected to fail on the engine chunk and the file count.
- No smoke-matrix coverage: `tests/production-smoke.spec.js` does not know the route, and the route is not linked
  from navigation yet (by design — see the checklist).
- Visual polish is unfinished: the arena still reads dark and there is no weather or day-night variation. All
  cosmetic, all in `engine/renderer.js` / `engine/textures.js`.
- **Two owner corrections are folded in, and both were right.** First: the arena was technically WebGL but read
  as 2D — flat billboards on a near-top-down camera. Units are now low-poly bodies (torso, head, cavalry mount
  or dreadnought shoulder plate) drawn as four instanced meshes, so a wave of forty units costs four draw calls
  and turns to face where it walks; the camera is a 3/4 view that shows height; shadows are on above the low
  tier; walls, containers and flanking props are taller; and drifting snow/spray particles give the scene depth.
  Second: the hero was a flat RoC skin portrait above a generic body. The player is now **Velo**, the project
  mascot, modelled from primitives in `engine/velo.js` — dark navy hide, grey horns, cyan eyes, patched wings, a
  tattered scarf and a flame-tipped tail that takes the wing the player is carrying (blue for Ice, orange for
  Fire), with idle/walk animation for the wings, tail and bob. Velo is the avatar; the chosen RoC hero is
  identified in the HUD dock instead of being pasted into the scene. The unit type icons still fly above enemies
  as small banners, because troop type is gameplay information.
- The `package-lock.json` entry for `three` was written by hand (the tarball's SHA-512 was verified against the
  registry). A clean `npm install` should be allowed to normalise it.

**Still owed (the L0 wiring list from §6, in order)**

1. Measure the built `eden-siege` chunk, then lift `totalJsBytes`, `deployFileCount` and `totalDeployBytes` by the
   measured amount, and add `routeCssBytes['eden-siege.html']` plus the new `routeJsBytes` check.
2. Add the route to `forbiddenInitialFeaturePattern` and exclude the game chunk from the service-worker precache
   (`scripts/post-build.mjs`, precedent: `PROTECTED_ALL_STAR_PRECACHE_PATTERN`).
3. Add `eden-siege.html` to `scripts/update-build-metadata.mjs` (`entryHtmlFiles`, `baseAppShellFiles`) and to
   the footer list in `scripts/check-version-consistency.mjs`.
4. Add the page to `scripts/check-i18n.mjs`'s scanned HTML list and move `js/eden-siege/data/copy.js` into the 13
   locale packs with key parity (lane L3).
5. Link the route from the Arcade lobby as a featured banner (not an `.arcade-card`, so the exact-five smoke
   assertion holds), the More menu, `js/command-palette.js` and `js/ai/toolkit-map.js`.
6. Add the Playwright spec, extend `production-smoke.spec.js`, and decide the light-theme/motion-contract entries
   for the new stylesheet.
7. Then: `npm run check`, `CHANGELOG.md`, version bump.
