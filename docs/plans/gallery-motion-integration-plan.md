# Motion & visual-craft integration plan — "100 HTML Files" gallery → roc-vts.com

Status: **proposal, not started** · Drafted 2026-09-23 against gh-pages `fd177c38` (16.0.18)
Source studied: <https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/> (100 self-contained pages + per-page technique notes)

---

## 0. Ground rules (read first)

1. **No code is copied from the gallery.** The repository ships no LICENSE file (checked `LICENSE`,
   `LICENSE.md` → 404; README has no licence grant), so the default is *all rights reserved*. Every item
   below is a **clean-room re-implementation of a technique** (the techniques themselves — spring tilt, pooled
   WAAPI particles, phosphor persistence, arc-length train motion — are general knowledge). Do not paste
   source; do not ship their SVG art, copy, or prompts. If the owner wants literal reuse, ask the author
   for a licence first.
2. **Performance is a hard gate, not a goal.** Our budgets have almost no headroom today (see §2.3). Every
   phase has to *pay for itself* in bytes and in main-thread time, which is why Phase 0 removes weight before
   anything is added.
3. **Everything is opt-in, route-isolated, and reduced-motion safe.** Nothing new lands in the shared entry
   CSS/JS unless it replaces something bigger.

---

## 1. What the gallery actually contains (assessment of all 100)

I fetched all 100 pages and scanned each source for rendering tech and APIs, then read the technique notes
for the 20 strongest candidates. Aggregate profile:

| Signal | Pages | Notes |
|---|---|---|
| `prefers-reduced-motion` handled | **100 / 100** | Consistent discipline, and the one habit we must match everywhere |
| Canvas 2D | 86 | Almost always DPR-aware (capped at 2×) with offscreen sprite caches |
| `requestAnimationFrame` loop | 93 | Most pause on `visibilitychange` (74 pages) |
| Inline SVG | 90 | Procedural SVG built at runtime (gradients in `userSpaceOnUse`) |
| Web Audio synthesis | 40 | Zero audio assets; everything synthesized |
| `backdrop-filter` | 29 | Glass panels |
| CSS 3D (`perspective`) | 24 | Cards, corridors, page turns |
| WAAPI `element.animate()` | 11 | Pooled particle bursts |
| `@property` | 2 | Animated integers/angles (050, 031) |
| WebGL | 2 | 010 liquid mercury, 099 Droste — **both rejected** |
| Workers | 1 | 042 fractal worker pool (Blob-URL worker: **blocked by our CSP**, see §6) |
| Scroll-driven animations / View Transitions / container queries | **0** | The gallery never uses the modern CSS primitives; we should, because they are cheaper than its JS equivalents |

Sizes: 28–110 KB each (median about 55 KB), all inline. So **no page can be embedded as-is**. Any one of them
would eat our entire remaining JS budget.

### 1.1 Verdict for every page

Legend: **ADOPT** means build a feature from this technique · **PATTERN** means borrow one engineering
pattern · **ARCADE** means only inside the isolated Arcade games · **SKIP** means no fit, or too costly for
the value.

| # | Page | Verdict | Where / why |
|---|---|---|---|
| 001 | Aurora Glass | PATTERN | Quarter-res offscreen canvas + additive upscale is the right way to do any ambient bg. We keep our CSS `shell-aurora-drift` (compositor-only) rather than add canvas |
| 002 | Neon Rain | SKIP | Scene art |
| 003 | Swiss Poster Machine | PATTERN | Seeded generative layout → share-card generator (§4.9) |
| 004 | Brass Orrery | SKIP | |
| 005 | Sumi Ink | SKIP | Fluid sim, heavy |
| 006 | Brutalist Zine | SKIP | |
| 007 | Neumorphic Synth | ARCADE | Synth SFX voice design (§4.8) |
| 008 | Lighthouse Longform | PATTERN | IO-driven chapter reveals → Guides (Bounty/Playbook) |
| 009 | Constellation Mapper | PATTERN | Point-and-join line drawing → Eden map route drawing |
| 010 | Liquid Mercury | SKIP | WebGL |
| 011 | Victorian Herbarium | SKIP | |
| 012 | Nimbus Weather | PATTERN | Weighted scene cross-fade of cached sprites → Eden day/phase states |
| 013 | Knitted Life | SKIP | |
| 014 | Kinetic Manifesto | PATTERN | Sticky 100vh stages + per-scene progress → "What's new" release story; we do it with `animation-timeline: view()` instead of JS |
| 015 | Art Deco Hotel | SKIP | |
| 016 | Vaporwave Mall | SKIP | |
| 017 | Pendulum Wave | SKIP | |
| 018 | Paper-cut Diorama | PATTERN | Layered pointer parallax (transform only) → hero detail header |
| 019 | Phosphor Terminal | PATTERN | Type-on/boot sequence → Velo "thinking" and OCR processing states |
| 020 | Rivers of the World | **ADOPT** | Ribbon geometry that reflows horizontal↔vertical → Season timeline (§4.6) |
| 021 | Bauhaus Composer | PATTERN | Snap-to-hidden-grid drag → Eden/Alliance team board drag |
| 022 | Deep-Sea Descent | PATTERN | Scroll depth gauge → long guides progress rail |
| 023 | Symmetry Painter | SKIP | |
| 024 | Luxury Watch | PATTERN | Live SVG dial with Intl time → event countdown dials (§4.7) |
| 025 | Isometric City | SKIP | Painter's sort + cast shadows is overkill for our maps |
| 026 | Pulse Visualizer | ARCADE | |
| 027 | Origami Crane | SKIP | |
| 028 | Periodic Table | **ADOPT** | Keyboard-navigable dense grid, category filters, glow on focus → Hero Atlas / Research grid (§4.5) |
| 029 | Typewriter Letters | SKIP | |
| 030 | Gravity Sandbox | SKIP | |
| 031 | Twenty-Four Seasons | PATTERN | `@property` angle dial → season/event ring |
| 032 | Holographic Card | **ADOPT** | Spring tilt → CSS vars → foil layers → hero/skin rarity cards (§4.2) |
| 033 | Stone Labyrinth | ARCADE | |
| 034 | Flow Field Studio | SKIP | |
| 035 | Coffee Roasters | PATTERN | Interactive flavour wheel → radial stat wheel for hero stats |
| 036 | Transit Map | **ADOPT** | 45°/90° line geometry, arc-length markers, timetable → Eden map march routes & playbook phases (§4.4) |
| 037 | Frost Garden | SKIP | |
| 038 | Neon Breakout | ARCADE | Game "juice": particle shatter, combo blips, screen shake (§4.8) |
| 039 | Virtual Gallery | SKIP | CSS 3D corridor, heavy DOM |
| 040 | Lemon Tart Recipe | PATTERN | Servings scaler + checklist → Materials planner "scale by N" + checklist ticks |
| 041 | Rain on Glass | SKIP | |
| 042 | Fractal Explorer | PATTERN | Progressive worker pool, centre-out strips → Battle Simulator batch runs (§4.10) |
| 043 | Fashion Lookbook | SKIP | |
| 044 | Tide & Moon Clock | PATTERN | Procedural phase dial |
| 045 | Stained Glass | SKIP | |
| 046 | Habit Garden | **ADOPT** | Pooled WAAPI celebration particles → saves, votes, scores (§4.3); streak heatmap → contribution history |
| 047 | Solar System Scale | SKIP | |
| 048 | Claymorphism Kit | PATTERN | One `--soft` multiplier scaling every shadow → our shadow tokens |
| 049 | Riso Halftone Lab | SKIP | |
| 050 | Loader Atelier | **ADOPT** | Stroke-dashoffset "ink check", `@property` integer counters, orbit trails → loader-v14 + counters (§4.1) |
| 051 | Winter Cabin | SKIP | |
| 052 | DNA Helix | SKIP | |
| 053 | Tarot Reading | **ADOPT** | Deal-and-fan card reveal → Combo Generator Top-5 reveal (§4.2) |
| 054 | Elastic Letters | SKIP | |
| 055 | Falling Sand | ARCADE | |
| 056 | Architectural Blueprint | PATTERN | Self-drawing SVG lines → tower/specialization tree connectors on first view |
| 057 | Vinyl Listening Room | SKIP | |
| 058 | Memphis Fest | SKIP | |
| 059 | Zen Sand Garden | SKIP | |
| 060 | Trading Terminal | **ADOPT** | DPR canvas chart, crosshair + OHLC tooltip, eased y-range → OCR/VtsScore trend charts (§4.7) |
| 061 | Firefly Meadow | SKIP | |
| 062 | Lava Lamp | SKIP | |
| 063 | History of Flight | **ADOPT** | Horizontal timeline, year-keyed sky gradient → Season timeline (§4.6) |
| 064 | Magnetic Poetry | SKIP | |
| 065 | Generative Quilt | SKIP | |
| 066 | Planet Forge | SKIP | |
| 067 | ASCII Tides | SKIP | |
| 068 | Bento Portfolio | **ADOPT** | Per-tile `--mx/--my` spotlight + mask-composite rim light; independent `translate` for entry → hub cards (§4.1) |
| 069 | Honeycomb Apiary | PATTERN | Hex grid ripple under cursor → Eden hex/territory hover |
| 070 | Chess Study | SKIP | |
| 071 | Palette Studio | **ADOPT (build-time)** | OKLab/OKLCH + WCAG contrast matrix → token contrast CI check (§4.11). Zero runtime bytes |
| 072 | Double Exposure | SKIP | |
| 073 | Circuit Board | PATTERN | Signals racing along traces (dash offset) → Specialization tower "path" highlight |
| 074 | Soap Bubbles | SKIP | |
| 075 | Calligraphy Pad | SKIP | |
| 076 | Mission Control | **ADOPT** | Corner-bracket panel chrome (one pseudo-element), ring-buffer strip charts → Admin/VtsScore (§4.7) |
| 077 | Noir Story | SKIP | |
| 078 | Fractal Tree Seasons | SKIP | |
| 079 | Pulsar Ridges | SKIP | |
| 080 | Falling-notes Piano | SKIP | |
| 081 | Glitch Portfolio | PATTERN | Self-decoding text → Velo reply reveal / rank reveal (rate-limited) |
| 082 | Perfume Rosée | SKIP | |
| 083 | Dot Globe | PATTERN | Batched fills per colour bucket (one `fill()` per bucket) → Eden map dot/marker rendering perf |
| 084 | Snowflake Generator | SKIP | |
| 085 | Art Nouveau | SKIP | |
| 086 | Cellular Tapestry | SKIP | |
| 087 | Sketchbook Portfolio | SKIP | |
| 088 | Hourglass Timer | PATTERN | Event countdown visual (CSS-only version) |
| 089 | Radar Console | **ADOPT** | Phosphor persistence layer (destination-out fade, dirty-slice only) → Eden live scouting/"last seen" overlay (§4.4) |
| 090 | Word Clock | SKIP | |
| 091 | Alpenglow Day Cycle | SKIP | |
| 092 | Soundscape Mixer | SKIP | |
| 093 | Strandbeest | SKIP | |
| 094 | Watercolour Landscapes | SKIP | |
| 095 | Magnetic Field | SKIP | |
| 096 | Concrete Monolith | SKIP | |
| 097 | Harmonograph | SKIP | |
| 098 | Paper Moon Storybook | PATTERN | 3D page turn → Arcade story/tutorial only |
| 099 | Droste | SKIP | WebGL |
| 100 | Organic Wave Lab | SKIP | |

**Totals:** 13 ADOPT (one build-time only) · 24 PATTERN · 5 ARCADE · 58 SKIP. More than half are art pieces with no product fit.
Adopting them would be decoration that costs budget.

---

## 2. Where our frontend stands (measured, not assumed)

### 2.1 Stack
- Vite 8 multi-page build (10 root HTML entries + `tabs/`, `eden/`, `vote/`, `vtsscore/`), vanilla ES modules,
  no framework. 40 CSS files (1.9 MB source), 221 JS modules. Firebase via dynamic import.
- Motion tokens already exist in `css/_tokens.css:192-208` (`--ease-out`, `--ease-spring`, `--t-fast/med/slow`,
  `--dur-tap/hover/expand`) and a **global reduced-motion kill switch** at `css/_tokens.css:346`.
- Theme: dark default, `data-theme="light"` set pre-paint by `js/theme-prepaint.js`.
- CSP (`index.html:9`): `worker-src 'self'`, `script-src` hash-pinned, `style-src 'unsafe-inline'` allowed.

### 2.2 Live production observations (roc-vts.com home, 2026-09-23)
- **84 running animations on the first screen**: 66 × `card-pop`, 23 × `skin-portrait-breathe`, 6 × `pulse-soft`
  (infinite), `shell-aurora-drift` (infinite), `iceFireShift` (infinite), plus **8 infinite Velo launcher
  animations that tick while hidden** (`velo-body-story`, `velo-helmet-eye-glint`, `velo-rage-burst`…).
- `iceFireShift` (`css/app.css:10750`, 4 s infinite) animates **`background-position`**, which repaints on the
  main thread every frame for as long as the page is open.
- `velo-helmet-eye-glint` (`public/ai-launcher-critical.css:198`) animates `background`, `box-shadow` and
  `filter`, all of which are paint properties.
- 12 render-blocking resources in `<head>`, including Google Fonts loading **Sora 300–800 (6 weights) +
  JetBrains Mono 400–700 (4)**. Only 6 of those 10 faces are used on the home screen.
- `css/atmosphere.css` (258 lines, opt-in `.u-*` utility layer) is linked on 5 pages, but **none of its 15
  utility classes are used anywhere** in `js/`, `tabs/` or any HTML. It is dead weight on every page and
  already does half of what this plan wants (lift, tilt, burst, skeleton, counter). Also note that the
  whole layer counts toward the entry CSS budget.
- CLS is effectively 0 (0.00015). Keep it that way: every effect below is transform/opacity or out-of-flow.
- I did **not** trust paint timings from this session: the browser pane was hidden, which defers paint. Get a
  real LCP/INP baseline with Lighthouse/Playwright in Phase 0.

### 2.3 Budget headroom (from `scripts/check-size.mjs`)

| Budget | Limit | Last audit | Headroom |
|---|---|---|---|
| `entryCssBytes` (shared stylesheet) | 430 KiB | 429.5 KiB | **~0.5 KiB** |
| `totalJsBytes` | 10084 KiB | 10076.5 KiB | **~7.5 KiB** |
| `totalCssBytes` | 1635 KiB | ~1630 KiB | ~5 KiB |
| `admin.html` route CSS | 684 / 786 KiB | 682.8 / 779.5 | ~1 KiB desktop |
| `eden-x1.html` route CSS | 664 / 761 KiB | 663.0 / 759.7 | ~1 KiB |

**Implication:** as the budget stands, we can add *nothing* to the shared stylesheet, and at most ~7 KiB of
JS across the whole graph. So the plan is structured as: **reclaim → foundation → features**, and every
feature PR states its byte delta against those numbers.

---

## 3. Architecture of the integration

### 3.1 Three tiers of cost

| Tier | What | Loaded | Budget line |
|---|---|---|---|
| **T0 — CSS primitives** | Tokens, `@property`, `animation-timeline`, View Transitions, `:hover` spotlights | In the stylesheet of the route that uses it, never shared unless it replaces bytes | route CSS |
| **T1 — `js/fx/` micro-runtime** | One scheduler + helpers, ≤ 3 KiB min+gz | Dynamic `import()` on first idle after LCP (`requestIdleCallback`), never on the critical path | new `fxJsBytes` cap |
| **T2 — feature renderers** | Canvas charts, route layer, particle pool, foil card | Dynamic `import()` from the feature controller that needs it | per-route |

### 3.2 `js/fx/` — the single motion runtime (new)

One small module family. Every animated thing in the site goes through it, so there is exactly one place
that enforces the performance rules:

```
js/fx/
  motion-policy.js   // reducedMotion(), saveData(), lowPower(); live MediaQueryList listeners
  frame-loop.js      // ONE shared rAF; subscribers get (dt, now); auto-stops when zero subscribers,
                     // pauses on visibilitychange, per-subscriber IntersectionObserver gating
  pointer-vars.js    // rAF-throttled pointer → CSS custom props (--mx, --my, --tilt-x, --tilt-y)
  spring.js          // critically-damped spring integrator (stiffness/damping), settles → unsubscribes
  canvas-surface.js  // DPR-aware canvas (cap 2×), ResizeObserver, offscreen sprite cache helper
  particles.js       // pooled WAAPI particle layer (fixed pool, e.g. 24 nodes, reused)
  view-swap.js       // document.startViewTransition wrapper with a no-op fallback
```

Rules the runtime enforces (each has a unit test in `tests/unit/fx-*.test.mjs`):
1. **One rAF for the whole page.** 93 of the gallery pages run their own loop. We do not.
2. **Stop when idle:** a spring that has settled unsubscribes, and when no subscribers are left there is no rAF.
3. **Offscreen = stopped:** subscribers register an element; an IntersectionObserver pauses them outside the
   viewport. `document.hidden` pauses everything.
4. **Reduced motion:** `motion-policy` returns the final state immediately; particles are skipped; springs jump
   to target. This works alongside the CSS kill switch; it does not replace it.
5. **Save-Data / low-end:** `navigator.connection?.saveData` or `deviceMemory <= 2` drops T2 decorative effects
   (foil sparkle, phosphor trail) but keeps functional motion (route markers, chart crosshair).
6. **Only compositor properties animate continuously** (`transform`, `opacity`, `filter` on small elements).
   A lint rule (see §7) forbids infinite keyframes on paint properties.
7. **Pointer effects only for `(hover: hover) and (pointer: fine)`.** Touch devices get tap feedback only.

### 3.3 Modern CSS instead of the gallery's JS
Where the gallery uses JS, we use the cheaper platform primitive with a static fallback:

| Gallery technique (JS) | Our implementation |
|---|---|
| Scroll progress via `getBoundingClientRect` per frame (014, 022, 063) | `animation-timeline: view()` / `scroll()` inside `@supports`; no JS. Fallback: content simply visible |
| Staggered entry via IO + class toggles (068, 008) | `@starting-style` + `transition-behavior` for entry; IO only for below-the-fold batches |
| Tab/route cross-fades in JS | View Transitions API (`view-swap.js`) for tab switches in `shell-v14.js`; fallback = current instant swap |
| Integer tween in JS | `@property --n { syntax: '<integer>' }` counter (already prototyped in `atmosphere.css:213`) |
| Pointer tilt on each element listener | One delegated `pointermove` → CSS vars on the hovered card only |

---

## 4. Feature integrations (by product surface)

Every item lists: **what**, **where**, **technique source**, **cost**, **guardrails**.

### 4.1 Hub & shell polish (Home, Heroes & Combos hub, Research & Towers hub)
- **Cursor spotlight + rim light on hub cards** *(068)*. `::before` radial glow at `var(--mx) var(--my)` and
  `::after` 1px rim via `mask-composite: exclude`. `pointer-vars.js` writes vars **only on the hovered card**.
  Replaces the unused `.u-lift`/`.u-tilt`. Cost: ~0.6 KiB CSS (hub route CSS), ~0.4 KiB JS.
- **Entry stagger with the independent `translate` property** *(068)*, so entry never fights hover `transform`.
  Replace the 66 simultaneous `card-pop` animations with an `@starting-style` transition staggered by
  `--i` (index var), and **cap the stagger at the first 12 visible cards**; the rest appear instantly.
  Result: fewer concurrent animations, not more.
- **Loader "ink check" success state and orbit trail** *(050)* in `loader-v14`: stroke-dashoffset draw on
  completion, then fade. Pure SVG+CSS, ~0.5 KiB, loader CSS only.
- **Tab switches via View Transitions** in `shell-v14.js` (`view-swap.js`), limited to the tab panel with
  `view-transition-name: tab-panel`, 180 ms. Fallback: today's behaviour.

### 4.2 Heroes: Combo Generator, Hero Atlas, Skins
- **Top-5 result reveal as a card deal** *(053)*. Cards start stacked, FLIP to their grid slots with 40 ms
  stagger via WAAPI, and then settle. Runs once per generation and never loops. Screen readers get the
  results immediately (the animation is purely visual; the DOM order is final from the start).
- **Holographic rarity foil on hero/skin detail cards** *(032)*. Spring-driven tilt (`spring.js`) → CSS vars
  `--px --py --hyp` → two foil layers (`mix-blend-mode: color-dodge` rainbow bands, and an etch pattern).
  Strength by rarity (Legendary > Epic > none), so the effect *carries information* instead of decorating.
  Guardrails: the effect runs only while the card is hovered/focused, and the spring unsubscribes on settle.
  Sparkle sheet is a pre-rendered 256² canvas pattern cached once. Off for touch, Save-Data and reduced
  motion (those get a static sheen gradient). Cost: ~1.8 KiB JS + ~1 KiB CSS, lazily imported by
  `app-hero-atlas.js`.
- **Hero Atlas grid as a periodic table** *(028)*. Roving-tabindex arrow-key navigation, category filter
  chips that dim non-matches (opacity only, no re-layout), and a focus glow. This is mostly an
  **accessibility win**, and `p1-accessibility-*` specs can assert it.
- **Pointer parallax on hero detail header** *(018)*. 3 layers, translate only, ±6 px max.

### 4.3 Celebration & feedback (cross-cutting)
- **Pooled particle burst** *(046)* in `js/fx/particles.js`: a fixed pool of 24 absolutely positioned nodes in
  one `position: fixed` layer, animated with WAAPI (transform/opacity only), recycled on `finish`. Uses
  theme accent colours via tokens.
  Triggers (one per meaningful success, never on routine clicks):
  - combo saved / shared (`combo-share.js`)
  - Eden X1/X2 vote cast (`eden-x1.js`, `vote/`)
  - VtsScore final score submitted (`vts-score.js`) and top-3 rank reached (replaces unused `.u-top3/.u-burst`)
  - Arcade new personal best
  - Specialization tower maxed
  Cost: ~1.2 KiB JS, loaded on first trigger. Reduced motion → a subtle check-mark pulse instead.
- **`@property` animated counters** *(050)* for score/total changes (VtsScore totals, Research totals,
  Materials totals). CSS-only with `counter()`; fallback = instant number. Numbers stay in the DOM for a11y
  (the counter is decoration on a `aria-hidden` twin).

### 4.4 Eden (map, playbook, operations)
- **Transit-style march routes** *(036)*. Routes are drawn as 45°/90° polylines with rounded corners. Markers
  move by **arc-length parameterisation** along the same sampled polyline, with eased dwell at objectives.
  They render in the existing `eden-map.js` canvas draw pass (`eden-map.js:1676` rAF), so no second loop is
  added; it moves onto `frame-loop.js`. The playbook uses the same geometry to animate each phase.
- **Phosphor "last seen" overlay** *(089)*. An offscreen layer fades exponentially (`destination-out`) and
  is painted **only in dirty regions** where updates arrived, which gives a radar-style afterglow showing how
  fresh each intel point is. Functional, not decorative: brightness = recency.
- **Batched marker drawing** *(083)*: one `fill()` per colour bucket instead of per marker, a pure draw-cost
  reduction for dense maps.
- **Hex hover ripple** *(069)* on territory hover, drawn in the same pass with a 300 ms decay.
- Cost: T2 chunk `eden-map-fx.js` (~3 KiB), Eden route only.

### 4.5 Research, Specialization Towers, Materials
- **Self-drawing connectors** *(056, 073)*. On first view, tower-tree SVG connectors draw with
  `stroke-dashoffset` driven by `animation-timeline: view()`, and the selected upgrade path "pulses" a signal
  along the traces (dash offset, compositor-friendly with `will-change` only while active).
- **Periodic-table grid navigation** reused from §4.2 for research node grids.
- **Materials "scale by N"** *(040)*: servings-scaler interaction with friendly fractions for multi-hero plans.
  This is logic, not motion, and cheap.

### 4.6 Season timeline (new, small feature)
*(020 + 063)* A horizontal X1 → X12 timeline where each season is a ribbon whose width encodes hero count. The
same geometry reflows to vertical on phones (020's along/cross coordinate trick). The background gradient
keys to the season, and scroll progress comes from `animation-timeline: scroll()`. SVG only, no canvas.
Candidate home: the Heroes & Combos hub, lazily loaded. Cost ~4 KiB JS + 1.5 KiB CSS on its own chunk.

### 4.7 Admin, OCR dashboard, VtsScore (data-heavy surfaces)
- **Canvas trend charts** *(060, 076)*. DPR-capped canvas, pixel-snapped bars, eased y-range, and a crosshair
  plus tooltip card for contribution history, duty points over time and VtsScore progression. A ring buffer
  gives smooth live updates. Replaces nothing (there are no charts today); lazy `js/fx/strip-chart.js` in the
  admin route only. **Accessibility: every chart has a data table twin** (`<details>`).
- **Contribution heatmap** *(046)*, a 12-week grid for member activity. CSS grid of cells coloured through tokens.
- **Corner-bracket panel chrome** *(076)* for "live" panels (VtsScore leaderboard, OCR queue): one pseudo-element
  with 8 gradient strokes, so no extra DOM.
- **Event countdown dials** *(024, 031)*: an SVG ring via `@property --angle`, time from `Intl.DateTimeFormat`,
  updated once per second by the shared loop (not per frame).

### 4.8 Arcade (`games/boot/*`, `arcade.html`), the place for "juice"
The Arcade is already isolated (standalone HTML + `shared.js`) with its own budget line, so it is **the one
place where heavier effects are welcome**:
- **Synthesised SFX** *(007, 026, 038)*. A tiny Web Audio voice bank (square/triangle blips, noise hits,
  pitch-rising combo blips). **Zero audio asset bytes**, muted by default, and the toggle persists.
- **Game feel** *(038)*: particle shatter from the pooled layer, 80 ms screen shake (transform on the stage),
  hit-stop frames, combo text pop.
- **Mode-specific** borrowings: falling-sand sparkle *(055)* for merge-rush, labyrinth torch light *(033)*
  for hero-rumble. Each is scoped to its game file.

### 4.9 Share cards (export)
*(003)* Seeded generative background for combo/roster share images (`app-export.js`, `throne-buffs-export.js`
already use canvas). The seed comes from the combo ID, so the same combo always gets the same art.
Canvas-only, runs only on export and has no runtime cost otherwise.

### 4.10 Battle Simulator
*(042)* Progressive batch results: **Vite-bundled module worker** (`new Worker(new URL('./x.js', import.meta.url),
{ type: 'module' })`, which satisfies `worker-src 'self'`; the gallery's Blob-URL approach would violate our
CSP). Results stream centre-out into the histogram, and a coarse preview comes first. The simulator already
creates a Worker (`battle-simulator-app.js`), so this extends it to a pool sized
`min(4, hardwareConcurrency - 1)`.

### 4.11 Design-system tooling (build time, zero runtime bytes)
*(071)* A `scripts/check-token-contrast.mjs` step that parses `_tokens.css` light and dark values, converts them
through OKLab, and fails CI when text/surface pairs drop under WCAG AA (4.5:1 body, 3:1 large/UI). It can
also *suggest* the nearest passing OKLCH lightness. Also *(048)*: introduce one `--shadow-soft` multiplier token
so every shadow tier scales from one knob, which makes the dark and light themes easier to tune.

---

## 5. Phased delivery (each phase is one PR into gh-pages, owner merges)

| Phase | Content | Net bytes (target) | Exit criteria |
|---|---|---|---|
| **0 — Reclaim & baseline** | Lighthouse/Playwright baseline (LCP, INP, TBT, long tasks, running-animation count) on Home, Atlas, Eden, Admin, VtsScore. Delete unused `.u-*` rules from `atmosphere.css` (keep the global focus-visible + `tab-pill-active` rules it also carries). Rewrite `iceFireShift` to animate `transform` on an oversized pseudo-element. Pause Velo launcher loops while hidden (`animation-play-state` via a class set by `ai-launcher.js`). Trim Google Fonts to used weights. | **−4 to −8 KiB CSS**, fewer font bytes | Budgets re-audited *down*; zero visual diffs in `app-visual` except intended; paint-per-frame on idle home = 0 |
| **1 — `js/fx/` runtime** | §3.2 modules + unit tests + `fxJsBytes` size-check line + lint rule | +3 KiB JS (lazy) | Unit tests; runtime not on critical path (size-check asserts `index.html` does not preload it) |
| **2 — Shell & hubs** | §4.1 spotlight, capped stagger, View Transition tabs, loader check | ≤ 0 on entry CSS (paid by Phase 0) | Running-animation count on home ≤ baseline; no CLS regression |
| **3 — Heroes** | §4.2 deal reveal, foil, grid nav, parallax | ~3 KiB lazy JS, ~1.5 KiB route CSS | a11y specs for grid nav; INP ≤ baseline on Atlas |
| **4 — Feedback** | §4.3 particles + counters wired to 5 triggers | ~1.5 KiB lazy | reduced-motion spec shows no particles |
| **5 — Eden** | §4.4 routes, phosphor, batched draw | ~3 KiB on Eden chunk; draw-time *down* | Frame time on a dense map ≤ baseline (Performance trace) |
| **6 — Data surfaces** | §4.7 charts, heatmap, chrome, dials | ~5 KiB admin-only | Charts have table twins; Admin route CSS within ceiling |
| **7 — Arcade juice + share art + sim pool** | §4.8, §4.9, §4.10 | Arcade/sim chunks only | Arcade mute default; worker pool obeys CSP |
| **8 — Season timeline + token contrast CI** | §4.6, §4.11 | ~5 KiB lazy; 0 runtime for CI script | Contrast check green on both themes |

Phases 3–8 are independent after Phase 1 and can run in parallel lanes on disjoint files (one worker per file,
as with past lanes).

---

## 6. Performance guardrails (enforced, not advisory)

1. **Size:** add `fxJsBytes` (≤ 4 KiB for `js/fx/*`) and require every PR in this plan to state its delta against
   `entryCssBytes`, `totalJsBytes`, `totalCssBytes` and the touched route. No ceiling lift without a matching
   reclaim in the same PR, which follows the existing `check-size.mjs` comment convention.
2. **Critical path:** nothing from `js/fx/` is statically imported by an entry. Size check asserts no
   `modulepreload` of `fx-*` chunks from `index.html`.
3. **Main thread:** the only continuous animations allowed are transform/opacity. A stylelint-style check
   (small script over `css/**`) flags `infinite` keyframes that touch `background*`, `box-shadow`, `width`,
   `height`, `top/left`, or `filter` on large elements.
4. **Idle is idle:** a Playwright spec loads Home, waits 3 s, and asserts `document.getAnimations()` of
   infinite, visible, non-compositor animations is 0, and that no rAF callbacks fire with no subscribers
   (instrumented through `frame-loop.js` debug counter).
5. **Reduced motion:** a Playwright spec with `reducedMotion: 'reduce'` visits each touched route and asserts
   zero running WAAPI animations and no particle layer nodes. The existing `app-visual` and
   `css-computed-baseline` specs should run with reduced motion so the new motion never flakes snapshots.
6. **CSP:** workers via Vite `new URL()` only (no Blob URLs); no new external origins; no inline scripts
   (the `script-src` is hash-pinned).
7. **Canvas:** DPR capped at 2, `ResizeObserver` not `resize`, offscreen sprite caches built once, and one
   `fill()` per colour bucket.
8. **Localisation/RTL:** all new labels go through the existing i18n registries (13 locales; hr partial).
   Directional motion (deal, timeline, route markers) mirrors under `dir="rtl"` via logical properties or a
   `--dir` multiplier.

---

## 7. Explicitly rejected (and why)

- **WebGL anything** (010, 099): new pipeline, GPU/battery cost, and no product need.
- **Full-screen canvas backgrounds** (001, 002, 041, 061): continuous paint on every page for pure decoration.
  Our CSS aurora is already compositor-only.
- **Fluid/cellular/particle sims** (005, 013, 034, 037, 055 outside Arcade, 086, 100): CPU-heavy, no fit.
- **Ambient soundscapes** (092) outside Arcade: autoplay audio on a tools site is hostile.
- **CSS 3D corridors / page-turn books** (039, 098) on product surfaces: heavy DOM, poor on mid phones.
- **Embedding any gallery page** as an iframe or port: 28–110 KB each, and licence status is unclear.

---

## 8. Open questions for the owner

1. Licence: do we want to contact the gallery author for explicit reuse rights, or stay strictly clean-room
   (this plan's default)?
2. Is a new **Season timeline** (§4.6) wanted as a feature, or should that budget go elsewhere?
3. Arcade SFX: acceptable to ship sound at all (muted by default)?
4. OK to lower the `entryCssBytes` ceiling after Phase 0 reclaims bytes, locking in the gain?
