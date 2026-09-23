# 16.5.0 — Motion and visual-craft release plan

Status: **planning complete; implementation not started**  
Target: **16.5.0**, requested by the owner. This document does not bump the application version.  
Revised: 2026-09-23 · Production reference: origin/gh-pages **fd177c38**, application **16.0.18**  
Source: [100 HTML Files gallery](https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/)

## 0. Release intent and scope

Make the tools feel more responsive and easier to understand: calmer hubs, clear navigation and completion
feedback, richer hero presentation, and readable map/data states. Preserve fast interaction, keyboard access,
existing calculations, URLs, saved plans, and backend permissions.

The gallery is a technique catalogue, not a component library. The 100-page inventory below remains useful
research; its ADOPT label is **not a commitment to ship every idea**. The release scope and gates below
supersede the original draft's all-at-once rollout.

### 0.1 What belongs in 16.5.0

| Priority | Deliverable | Release decision |
|---|---|---|
| **P0 — required** | Measured baseline, audited weight reclaim, motion policy, lifecycle cleanup, accessibility, size and motion checks | Must pass before enabling effects |
| **P1 — release core** | Hub entry/spotlight, panel transitions, loader completion, combo deal, detail-card sheen, keyboard/filter audit, confirmed-success feedback, bounded total transitions | The coherent 16.5.0 experience; simplify individual effects to pass gates |
| **P2 — conditional** | Eden route playback, tower connectors, season timeline, existing-data charts, share art, Arcade feedback | Include only with verified data, isolated bytes, and completed acceptance evidence |
| **P3 — separate follow-up** | Per-marker scouting history, new historical data collection, Materials scale-by-N, simulator worker pool | Different data/calculation/concurrency contracts; preserve proposals without making them release blockers |

Token contrast checking is P0 tooling for new/touched token pairs. Expanding coverage to all existing pairs
is incremental; unrelated legacy failures must be listed, not silently waived or added to this release.

At scope freeze, record every P2 feature as **included**, **static fallback**, or **deferred**, with a reason.
Do not describe a gated feature as shipped in the release notes. The default when a gate fails is the existing
functional UI, with the optional effect omitted.

### 0.2 Boundaries and visual language

- Keep Frost & Flame tokens, typography, themes, and component shapes. Avoid adding an unrelated visual theme.
- One primary motion per interaction. Entry, hover, progress, and celebration must not compete on one element.
- Reuse existing duration/easing tokens. Initial design ranges: feedback 120–180 ms, panel swaps 160–220 ms,
  card reveals 240–360 ms; a whole stagger finishes within 600 ms. These are proposed limits, not measurements.
- Decorative motion is finite and dispensable. Text, totals, focus, and success/error state update immediately.
- Use independently written implementations; do not copy gallery source, art, text, prompts, or assets.
  The original author reported no licence grant; that finding was not re-audited here. Recheck source
  permissions only if literal reuse is later proposed. This plan requires none.
- No new runtime animation library, external origin, tracking, backend write, or persistent data schema.
  This plan does not authorize changes to Firebase rules, scoring, account matching, voting, or OCR logic.
- No full-site animation-loop migration. No broad typography or CSS cleanup beyond verified consumers.

### 0.3 Definition of done

16.5.0 is ready when all P0/P1 rows have recorded acceptance evidence, included P2 rows pass their gates,
static fallbacks remain functional, release/version checks accept the real release history, the full
integration checks pass, and the owner can review one coherent release PR into gh-pages.

## 1. Gallery inventory and evidence quality

The original 2026-09-23 draft reported scanning all 100 sources and reading technique notes for 20 candidates.
Its aggregate findings were: 100 reduced-motion mentions, 86 Canvas 2D pages, 93 rAF users, 74 visibility
handlers, 90 inline-SVG users, 40 Web Audio users, 29 backdrop filters, 24 CSS-3D pages, 11 WAAPI users,
2 @property users, 2 WebGL pages, and 1 worker example. It reported no scroll timelines, View Transitions,
or container queries, and source sizes of 28–110 KB (median roughly 55 KB).

**Evidence status:** these are inherited research notes, not fresh measurements or proof that the behaviours
are correct. The gallery was unavailable through the web reader during this revision. Preserve the inventory,
but verify a selected technique against the actual browser and product before implementation. Source file
size is not the same as deployed minified or compressed size.

### 1.1 Verdict for every page

Legend: **ADOPT** means a feature candidate from this technique · **PATTERN** means borrow one engineering
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


## 2. Ground truth, baseline, and byte accounting

### 2.1 Verified repository facts

- Vite multi-page application using vanilla ES modules and route-specific controllers/styles.
- Existing motion tokens and reduced-motion rules live in css/_tokens.css and css/shell-v14.css.
  Existing tests/unit/motion-css-contract.test.mjs passes its two checks at the reference revision.
- Size limits below are present in scripts/check-size.mjs. Their historical audit comments are not a fresh build.
- js/eden-map.js uses a coalesced, **on-demand** scheduleDraw callback; it is not a permanent render loop.
- js/eden-map-scout.js writes one shared-document updatedAt. It does not establish per-marker observation ages.
- js/battle-simulator-app.js already creates js/battle-simulator-worker.js as a bundled module worker.
- Hero Atlas has English plus 11 lazy locale packs. Other surfaces have their own registries; do not assume
  one universal locale count.
- css/atmosphere.css contains global focus-visible and tab-pill-active styles as well as opt-in utilities.
  A lack of literal class matches alone is insufficient evidence for deleting the whole sheet.

### 2.2 Claims requiring a fresh baseline

The previous draft reported 84 running animations, but its listed counts included 66 card-pop and 23
skin-portrait-breathe instances alone. Those totals cannot describe one consistent snapshot. Treat the
animation census, font-use claims, unused-utility claims, and hidden-launcher findings as audit leads.

Reproduce on a **visible** browser using a production build. Record commit, Node/browser versions, lockfile,
viewport, DPR, CPU/network settings, fixture, cache state, and route. Capture normal and reduced motion,
dark and light, desktop 1440×900 and mobile 390×844, plus 320px overflow checks. Use fixtures for private
admin/score states and never submit live votes, scores, or duty edits for QA.

Baseline routes: Home/hubs, Atlas detail and filtering, combo generation, Eden map and playbook,
Research/Towers, Admin/OCR, VtsScore; add Arcade/export only when included.

Collect at least five cold-load samples and five repetitions of each selected interaction. Report median
and worst sample, with raw traces. Lighthouse TBT is a lab metric; do not report it as INP. Scripted
interaction latency is also lab evidence, not field p75 INP. If field data exists, report it separately.
[INP measurement reference](https://web.dev/articles/inp).

### 2.3 Budget ledger

| Existing metric | Current cap | Historical audit in original draft | Fresh baseline |
|---|---:|---:|---|
| entryCssBytes | 430 KiB | 429.5 KiB | Phase 0 records |
| totalJsBytes | 10084 KiB | 10076.5 KiB | Phase 0 records |
| totalCssBytes | 1635 KiB | approximately 1630 KiB | Phase 0 records |
| admin.html CSS, desktop/mobile | 684 / 786 KiB | 682.8 / 779.5 KiB | Phase 0 records |
| eden-x1.html CSS, desktop/mobile | 664 / 761 KiB | 663.0 / 759.7 KiB | Phase 0 records |

Use **minified uncompressed deployed bytes** for these caps, as enforced by the script. Report gzip transfer
bytes separately. Dynamic imports improve initial-route cost but still count toward aggregate deployed JS.
Reclaiming CSS does not create JS headroom.

The original estimates mixed gzip, source, and built sizes, and its feature additions exceeded the reported
7.5 KiB JS headroom. Discard those totals as commitments. Before each implementation slice, record:

| Slice | Built JS delta | Built CSS delta | Initial route delta | Gzip delta | Cumulative headroom | Decision |
|---|---:|---:|---:|---:|---:|---|
| Baseline/reclaim/core/each included feature | measured | measured | measured | informational | measured per cap | pass, simplify, defer |

Requirements:
1. All existing aggregate and touched-route caps pass; no automatic budget increase.
2. Proposed **core** target: policy + scheduler + pointer/spring helpers together ≤3 KiB gzip.
   This is a separate transfer target, not an exemption from raw-byte caps.
3. Give each optional renderer its own measured allocation after reclaim. Do not classify all js/fx files
   under a contradictory 4 KiB cap while also adding charts, particles, and canvas helpers there.
4. Identify modules through the build graph/manifest and transitive entry imports; do not rely on generated
   filenames or the absence of a modulepreload string alone.
5. Lower caps only after allocating the included release scope and retaining a documented small reserve.
   Every reclaim needs before/after evidence; no premature promise of 4–8 KiB savings.

## 3. Minimal motion architecture

### 3.1 Ownership and loading

Use route CSS for simple transitions. Introduce js/fx helpers only when an included feature needs them;
start with policy and lifecycle, then extract genuinely shared behaviour. No empty framework scaffolding.

| Proposed module | Responsibility | Consumers / load point |
|---|---|---|
| js/fx/motion-policy.js | Live reduced-motion, visibility, capability and optional-data-saving signals | Enhanced routes only |
| js/fx/frame-loop.js | Shared scheduling for new effects that truly need rAF; explicit disposal | Springs and active route playback |
| js/fx/pointer-vars.js + spring.js | One delegated pointer owner; batched reads/writes; settle to idle | Hub or detail interaction |
| js/fx/particles.js | Lazy, bounded WAAPI pool | Confirmed-success handler |
| js/fx/view-swap.js | Optional panel transition around the existing state update | Shell navigation |
| Feature-local renderer | Canvas/SVG/chart logic and route-specific cleanup | Owning controller only |

Load when the feature mounts or is intentionally used. Optional idle prefetch must be cancellable and
have a timer fallback where requestIdleCallback is absent. **Idle does not prove that LCP has happened**;
verify the request waterfall. A first-use success must still work if the helper has not loaded or import fails.
[Idle callback reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback).

CSS and WAAPI do not need a JS frame scheduler. Existing game loops and on-demand map draws retain ownership.
For new rAF effects, permit only one scheduled callback per shared scheduler and stop it with zero active
subscribers. An effect invalidates the map through scheduleDraw; it does not draw competing frames.

### 3.2 Required lifecycle contract

Every mounted effect has an idempotent dispose operation, tied to its route/component lifetime.
It cancels frames/timers/WAAPI, disconnects observers, releases listeners/caches, and prevents stale async
imports from mounting on detached elements.

- On document hidden, route hidden, offscreen, or reduced-motion change: settle or cancel decoration promptly.
  IntersectionObserver alone does not describe an inactive SPA panel; use explicit route activation too.
- On resume: reset the time origin and bound dt; never replay hidden-tab elapsed time through a spring.
- On pointer leave/cancel, focus loss, or resize: clear or recompute targets without retaining old geometry.
- A throwing subscriber must not stop other effects. Unsubscription during a callback is safe.
- No settled-effect frame callbacks, no detached-element references, and no multiplying handlers after
  20 route enter/leave cycles.
- Save-Data/deviceMemory are optional hints, not reliable power detectors. Missing APIs use conservative
  defaults; core information remains available. Do not add a persistent preference unless an existing
  setting can own it.

### 3.3 Rendering rules and fallbacks

Prefer transform and opacity for animation. **Filter, gradients, background-position, blend layers,
stroke-dashoffset, custom-property counters, and canvas can repaint.** Small, finite paint effects require
trace evidence; will-change does not make them compositor-only.
[Rendering-cost reference](https://web.dev/articles/animations-guide).

| Capability | Enhancement | Fallback / constraint |
|---|---|---|
| @starting-style | Initial entry transitions | Already-visible content; it is not a viewport observer |
| Scroll timelines | Decorative guide progress or bounded reveal | Fully visible content and existing navigation |
| View Transitions | Same-document panel swap | Existing immediate swap; no routing rewrite |
| WAAPI | Finite deals and bursts | Final state immediately |
| @property | Optional visual counter twin | Canonical localized number |
| Fine pointer + hover | Tilt/spotlight on one active card | Static card and visible keyboard focus |
| Canvas/SVG effects | Route-local data display | Equivalent text/table/list |

Use feature detection, not UA sniffing. For entry, distinguish newly inserted DOM from viewport entry:
below-fold reveals require an observer or supported scroll timeline.
[Starting-style reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@starting-style).

## 4. Feature specifications

Each feature retains its gallery reference, but implementation follows the product contract below.

### 4.1 Shell, hubs, and loading — P1

**Outcome:** navigation feels immediate and only relevant content moves.

- Hub spotlight/rim (068): update one hovered card, cap tilt at 3 degrees, and avoid full-card moving gradients
  if traces show paint cost. Keyboard focus uses a static, high-contrast ring.
- Entry (068): at most 12 initially visible cards, capped stagger; repeated filter/tab refreshes do not replay
  the whole screen. Preserve layout space and coordinate independent translate/transform ownership.
- Loader completion (050): one bounded check animation after real completion. Keep loading, error, retry,
  and success text independent of animation events; never delay content to finish the check.
- Panel transitions: wrap the existing shell update once. Preserve URL/hash, back/forward, scroll restoration,
  focus, aria-selected, and deep links. Preload necessary data before the visual transition.
- Suppress the root-wide snapshot animation and assign unique names only to the intended panel.
  Handle rapid navigation, skipped transitions, and rejected transition promises without repeating state
  updates or dropping the latest navigation. Reduced motion uses the direct update.
  [View Transition behaviour](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using).

**Acceptance:** 20 rapid panel switches leave the correct URL/panel/focus, loader failure remains actionable,
no clipped hub labels at 320px or zoom, and an unavailable enhancement never blocks navigation.

### 4.2 Heroes, combos, and skins — P1

- Combo deal (053): animate only the visible top five results after the final DOM order exists.
  Prefer simple transform/opacity over FLIP unless actual position changes justify measurements.
  Read all geometry before writes. Regenerating mid-animation cancels the old reveal; results and controls
  remain available immediately.
- Detail sheen (032): one detail card at a time, spring settles, maximum tilt 3 degrees and translation 6px.
  Show rarity text/badge regardless of sheen. Map strength only to existing canonical rarity values;
  do not introduce invented Legendary/Epic data. Start with static gradients; sparkle texture is conditional.
- Header parallax (018): P2 embellishment only after the core sheen passes. Never apply competing transforms
  to the same layer.
- Atlas navigation (028): retain existing filter semantics, result count, sorting, selection, and deep links.
  Do **not** turn hidden non-matches into merely dimmed, focusable results.
  Add arrow navigation only where the existing component is a true composite grid. Otherwise retain native
  links/buttons. A grid needs roving focus, Home/End, resize/filter recovery, RTL-aware movement, and clear
  handling of controls inside a card. [ARIA grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/).

**Acceptance:** keyboard-only filtering/open/close returns focus correctly, regeneration never exposes stale
results, touch keeps all actions available, and the detail remains readable in both themes/forced colors.

### 4.3 Confirmed-success feedback and totals — P1

Use a lazy pool of at most 24 particles per document. One burst lasts at most 600 ms; allow at most one burst
per second, dropping overlaps. The layer is aria-hidden, pointer-events:none, contained, and disposed.
No nodes are created in reduced-motion mode; use an immediate static check and existing status text.

Wire only after the existing action confirms success:
- save acknowledged;
- copy confirmed or share resolved successfully (share cancellation does not celebrate);
- vote/score acknowledged by the existing persistence path;
- personal best actually changed;
- tower completion committed to the existing local state.

Map the real handlers before editing; the old draft's reference to vote/ is a route, not necessarily the
write owner. Do not add writes, retries, or success deduplication to the backend. Prevent duplicate bursts
from rerenders or subscription echoes; failed and pending actions retain their own feedback.

Totals update canonical text immediately, with Intl.NumberFormat and existing rounding. Optional animated
twins are aria-hidden, reserve width, respect decimals/negative values/RTL, and never announce every frame.
A CSS integer counter is not a replacement for localized currency, percentages, or decimal totals.

**Acceptance:** one confirmed action produces one bounded burst; failure/cancellation produces none;
missing WAAPI/import failure still shows success; reduced motion produces no new effect animation.

### 4.4 Eden map and playbook — P2, data-gated

**Route playback (036):** draw from existing selected route coordinates. The 45°/90° transit style is schematic;
it must not distort map positions, path legality, distances, obstacles, or imply a calculated march ETA.
Use arc length for visual playback speed only. Provide Play/Pause/Replay; reduced motion shows route and
numbered stops. Map geometry stays geographic under RTL; only controls and prose mirror.

Retain on-demand rendering. While playback is active, request invalidation through scheduleDraw; cancel
when paused, hidden, or complete. Batch same-style markers (083) only where painter order, alpha, and overlap
remain correct. Hex ripple (069) is optional, bounded to 300 ms, and shares the same invalidation path.

**Scouting glow (089):** the existing shared-document timestamp cannot truthfully encode per-marker age.
16.5.0 may show a document-level "Last synced" label from available data. Per-marker freshness waits for
verified observation timestamps and a separately scoped data contract. Never synthesize live intel.

If phosphor rendering is later included, fading must revisit all previously lit dirty regions until they
expire; painting only regions with incoming updates leaves stale trails. Text/icon age, expiry, unknown,
future timestamp, offline, and stale states must work without glow.

**Acceptance:** idle map remains idle, pan/zoom/hit-testing coordinates are unchanged, playback pauses cleanly,
and dense-map draw/interaction timings do not regress.

### 4.5 Research, towers, and Materials — P2 / P3

- Connector draw (056/073): one finite reveal on first view; selection remains apparent as a static path.
  Stroke animation is a bounded paint effect, not compositor-only. No perpetual path pulse.
- Grid navigation follows §4.2 and preserves existing focus/selection/calculation behaviour.
- Materials scale-by-N (040) is P3: define integer quantities, rounding, overflow, source costs, persistence,
  and export consistency in a separate functional plan. It is not an animation task.

**Acceptance for connectors:** upgrade order and totals are unchanged, focus is visible, offscreen paths do
not animate, and selected branches are legible in reduced motion and both themes.

### 4.6 Season timeline — P2, content-gated

Use canonical hero-release seasons and hero counts, not an assumed X1–X12 range or Eden event dates.
Define whether skins/variants count; derive values from existing data. Keep hero release seasons distinct
from Eden campaign seasons. Each item links to the current filter/deep-link route.

Prefer a semantic list with small SVG ribbons. Hero counts also appear as text; do not make narrow
zero/small-count ribbons inaccessible. Horizontal desktop and vertical mobile layouts preserve DOM order,
keyboard navigation, and touch scrolling. No mandatory scroll snapping or JS needed just to read it.

**Acceptance:** displayed counts reconcile with the Atlas under the same rules; unknown data is labelled;
all season links work at 320px, 200% zoom, keyboard, and RTL.

### 4.7 Admin, OCR, and VtsScore — P2, data-gated

Before building charts/heatmaps, record the existing read owner, timestamp field, time zone, units,
aggregation rule, pagination/completeness, and whether history really exists. A current total cannot become
a fabricated historical series. No new Firestore collection, polling, or write is included here.

- Trend charts (060/076): first prefer existing semantic markup/SVG for small datasets. Canvas needs a
  demonstrated benefit, DPR cap 2, bounded sample count/cache memory, and disposal on resize/unmount.
  Include the same filtered data in an accessible table plus keyboard/touch-selectable values.
- Heatmap (046): distinguish no record from zero; label dates/time zone and provide a text legend.
  A ring buffer is for display, not the source of truth.
- Panel chrome (076): static and subordinate to status text; never signal "live" without actual updates.
- Countdown dials (024/031): compute remaining time from a canonical deadline minus Date.now().
  Intl.DateTimeFormat formats a date; it does not supply time. Use a visibility-aware timer, at most once
  per second when visible, never a 60 Hz loop. Stop at expiry and reconcile after resume.
  Announce milestones only, not each second; missing deadlines get a neutral state.

**Acceptance:** charts reconcile with the displayed totals/table, empty/error/stale states are explicit,
there are no additional backend writes, and chart modules load only on their owning surfaces.

### 4.8 Arcade — P2

Keep existing game simulation timing and controls. Add finite particle shatter/text pop only after the
motion policy is integrated. Stage shake is opt-in to normal motion, max 80 ms, and disabled in reduced
motion; ensure no flashing sequence. Hit-stop cannot alter scoring or elapsed-time rules.

Optional Web Audio SFX (007/026/038) stays muted by default. Create/resume AudioContext only after an explicit
sound action; persist the existing setting if available, cap concurrent voices, handle blocked audio, and
suspend/dispose on route exit. Labyrinth light and falling-sand sparkle stay game-local candidates.

**Acceptance:** sound-off creates no audio playback, reduced motion removes shake, deterministic game checks
still pass, and pause/background/resume cannot award duplicate scores.

### 4.9 Share images — P2

Seed background art (003) from a stable combo/roster identifier or normalized content plus a renderer version.
Same inputs produce the same composition; pixel identity across different font/browser engines is not
promised. Preserve export dimensions, text contrast, existing assets/credits, and plain fallback.

Verify same-origin/CORS-safe image use, font readiness, download success, and recovery from tainted canvas
or a failed image. Run only on export; do not preload renderers for every visitor.

**Acceptance:** exported text is readable in both themes, repeat exports preserve composition, and failed
decoration does not prevent the existing export.

### 4.10 Battle Simulator — P3 follow-up

Retain the current single module worker for 16.5.0. A pool is a separate concurrency change, justified only
by a reproducible throughput win after startup, data duplication, and memory costs.

A later proposal must define deterministic run seeds independent of worker count, request IDs, cancellation,
late-message rejection, ordered aggregation, progress throttling, and worker error recovery. Clamp workers
to at least one and at most four, with a safe fallback when hardwareConcurrency is absent. Preserve
single-worker/main-thread fallback and CSP; do not use Blob workers. Histogram preview must identify partial
sample count and preserve the same final result. No centre-out processing that biases the statistical sample.

### 4.11 Contrast and motion tooling — P0

Add scripts/check-token-contrast.mjs only after defining explicit semantic foreground/background pairs.
Resolve token aliases, themes, alpha compositing, and actual backing surfaces. WCAG contrast uses
**relative luminance**, not OKLab distance. OKLCH may suggest a new color, but validate the resulting
rendered pair. Body text needs 4.5:1; large text 3:1; relevant UI boundaries/focus indicators require their
own non-text assessment. Token checks do not prove full-page accessibility.
[WCAG contrast reference](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Extend existing motion-css-contract coverage and use a parsed stylesheet check for changed/new infinite
paint animations. A regex cannot establish visibility, compositing, or effective cascade. Baseline existing
exceptions explicitly; fail new violations. Do not require unrelated CSS remediation.

A global shadow multiplier (048) is deferred unless a touched component needs it; introducing it everywhere
would expand visual regression scope without helping the core release.

## 5. Implementation map and dependency order

These are **future implementation files**, not files changed by this plan revision. Reconfirm owners and
nested instructions from the latest production baseline before coding.

| Area | Existing ownership to inspect | Proposed additions / evidence |
|---|---|---|
| Baseline and reclaim | css/atmosphere.css, css/app.css, css/_tokens.css, public/ai-launcher-critical.css, js/ai-launcher.js, HTML font links | Versioned baseline report; exact selector/import/asset consumer audit |
| Motion foundation | Existing reduced-motion CSS and motion-css-contract test | js/fx helpers only as needed; tests/unit/fx-*.test.mjs |
| Shell and loader | js/shell-v14.js, css/shell-v14.css, js/loader-v14.js and owning loader styles | Shell URL/focus/transition tests |
| Heroes and feedback | js/app-hero-atlas.js, js/combo-share.js, combo renderer and actual persistence handlers | Existing Atlas/deep-link/i18n tests plus effect lifecycle tests |
| Eden | js/eden-map.js, js/eden-map-scout.js, js/eden-playbook.js and route CSS | Optional route renderer; dense-map fixture |
| Data surfaces | js/ocr-dashboard.js, js/vts-score.js, js/vts-score-model.js, js/vts-score-store.js | Optional chart module; table reconciliation fixture |
| Other conditional work | Tower controller, js/app-export.js, js/throne-buffs-export.js, games/boot consumers | Touch only included features and their existing tests |
| Build and quality | scripts/check-size.mjs, package.json, test configs | Transitive import accounting; contrast/motion checks |
| Release | package.json, package-lock.json, js/constants.js, public version surfaces, README.md, CHANGELOG.md, scripts/check-version-consistency.mjs, AGENTS.md | Verified 16.5.0 transition; build-generated metadata |

The exact combo, loader-style, tower, locale, and public-version paths must be recorded during each slice's
preflight; this table does not license broad edits by filename pattern.

| Stage | Work | Depends on | Exit evidence |
|---|---|---|---|
| 0 | Fresh baseline, data/capability inventory, consumer audit, byte ledger | Latest production | Reproducible report; realistic P1 allocations |
| 1 | Small verified reclaim, core policy/lifecycle, initial quality checks | 0 | Focused tests; measured savings; no removed live styles |
| 2 | One vertical slice: hub interaction through policy/loading/cleanup | 1 | Both themes, touch, reduced motion, rapid remount, size delta |
| 3 | Remaining P1 shell, hero, and confirmed-success work | 2 | Per-feature acceptance plus locale and deep-link checks |
| 4 | Included P2 work, one isolated surface at a time | 3 and each data gate | Reconciled data, bounded cost, fallback evidence |
| 5 | Scope freeze, integration checks, release metadata, owner review | All included work | Full gate and rollback instructions |
| 6 | Merge/deploy verification | Owner merge and protected CI | Production smoke, asset/CSP checks, recorded deployed revision |

If delegation is used during implementation, assign disjoint file ownership. One integrator owns shared
runtime, shell tokens, build scripts, and release metadata. The old claim that all later phases are
independent was inaccurate: maps share lifecycle policy, features share feedback helpers, and release
metadata/build budgets are shared integration points.

## 6. Verification and acceptance matrix

| Area | Automated evidence | Human/trace evidence |
|---|---|---|
| Lifecycle | Policy changes, hidden route, zero subscribers, bounded dt, subscriber failure, disposal/remount | 20 route cycles; stable listeners/cache/particle counts |
| Behaviour | Navigation/hash/history, focus recovery, success/error/cancel paths, preserved result totals | Keyboard and touch task completion |
| Reduced motion | Zero **new decorative** running effects; zero particle nodes; immediate final values | Preference switched while an effect is active |
| Compatibility | Capability APIs removed/stubbed; import failure; offline fallback | Chromium, Firefox, WebKit; one real touch device before release |
| Visuals | Existing app-visual and css-computed-baseline where affected | Dark/light, RTL Arabic, long translation, forced colors, 200% zoom, 320px |
| Data | Charts/timeline match fixtures; no added writes; timestamp unknown/expired cases | Labels communicate scope, units, freshness |
| Performance | Aggregate/route size checks; transitive load graph; settled scheduler counter | Production traces for hub/Atlas/map/Admin |
| Security | Existing CSP and functional tests stay green | No new origins or worker violations |

Do not assert zero WAAPI animations across unrelated legacy features. Scope tests to newly owned effects.
document.getAnimations() alone cannot prove compositor execution or absence of canvas/rAF work.
Use stable reduced-motion fixtures for layout snapshots and separate normal-motion behaviour tests;
do not blindly regenerate all reference screenshots.

**Proposed performance gates, calibrated against Phase 0 noise before implementation:**
- No new continuously repainting decorative animation when the touched surface is settled.
- New scheduler performs zero work once its subscribers settle; hidden/offscreen effects stop.
- CLS ≤0.1 per load and no unexplained increase greater than 0.01 in comparable lab samples.
- No median load or selected-interaction regression beyond the larger of 5% or 50 ms; investigate the worst
  sample and all new >50 ms tasks attributable to effects. Do not average away repeatable regressions.
- On a fixed dense-map fixture, draw/interaction timings stay within baseline tolerance; target p95 active
  effect work ≤4 ms per frame on the recorded test device. Lower density or remove the effect if it fails.
- No new render-blocking requests or effect-induced delay to visible content. Document route-local requests.

Use the repo's actual commands:
- Focused slices: relevant node --test files and Playwright specs, npm run check:fast when practical,
  plus npm run build and npm run size:check for bundle changes.
- Example existing baseline: node --test tests/unit/motion-css-contract.test.mjs.
- Add new browser tests to a command/CI path that actually runs them. Existing smoke selects app-smoke and
  p1-* specs; production config selects production-smoke.spec.js. A new filename alone is not CI coverage.
- Final broad 16.5.0 integration: **npm run check**, then protected **deploy-verification** through the
  repository's existing npm run verify:deploy workflow.
- npm run firebase:preview is optional for this broad release when Hosting validation is useful. It is
  public and uses the real backend; QA stays read-only. It does not replace GitHub Pages deployment checks.

Every included feature records commit, command result, screenshots/trace location, size delta, and fallback
result in the PR. **None of these future release checks is claimed to have passed by this document.**

## 7. Release workflow, version jump, and rollback

### 7.1 One coherent 16.5.0 release

Start implementation from freshly fetched origin/gh-pages on a codex/ branch. Keep reviewable commits and
isolated subtask worktrees as useful, then integrate into one release PR targeting gh-pages. This supersedes
the original "one production PR per phase" proposal, which would expose partial work as multiple releases.

If production fixes are needed while preparing 16.5.0, ship them through separate focused PRs and refresh
the release branch from the new production tip. Preserve other agents' changes and re-run affected evidence.
Do not commit/push directly to gh-pages. The owner merges unless explicitly requesting fast-merge.

### 7.2 Explicit version-cadence handling

The checked reference is 16.0.18. scripts/check-version-consistency.mjs currently expects **16.4.20**
immediately before **16.5.0**. Setting package.json alone will fail.

At release preparation:
1. Fetch the actual latest production history. If 16.4.20 is then the predecessor, use normal cadence.
2. Otherwise implement a **single explicit release-transition exception** for the real predecessor → 16.5.0,
   documenting the owner's requested release target in AGENTS.md and the checker.
3. Add focused tests proving the exact transition passes while arbitrary skips, patch >20, mismatched
   public surfaces, and a wrong predecessor still fail. Keep 16.5.1 and subsequent normal cadence enforced.
4. Never fabricate 16.1–16.4 changelog entries or disable version verification to force a green result.

At scope freeze, update package and lockfile root/package versions, app constants, all public HTML/version
surfaces covered by the checker, README heading, and truthful CHANGELOG entry. Build updates service-worker
and cache metadata; review and include intended generated changes. This planning edit changes none of them.

### 7.3 Failure isolation and rollback

Each optional feature has one route-level enable/mount boundary with a static default if loading fails.
Avoid a new remote-configuration backend. Core actions never depend on effect completion.

If a feature fails acceptance, remove/disable its mount and imports before release and verify the fallback.
After deployment, use a focused corrective or revert PR through the protected branch; no force-push.
Re-run the affected behaviour and deploy checks, preserve real release history, and verify cache/asset
refresh in a fresh browser and a previously installed service-worker session.

No Cloudflare Worker or Firebase deploy is required unless their files/contracts actually change.
Any later data-contract extension gets a separate backend plan and its required checks.

## 8. Risks, decisions, and handoff checklist

| Risk | Decision / response |
|---|---|
| Nearly exhausted aggregate budgets | Measure first; reclaim same resource type; simplify or defer additions |
| Overbuilding a motion framework | One vertical slice first; extract only reused helpers |
| New animation harms idle map/launcher cost | Preserve demand-driven rendering; verify hidden/settled traces |
| Missing history or per-marker ages | Gate charts/recency; no fabricated data or hidden schema expansion |
| Decorative effects block usability | Immediate semantic state, static fallbacks, reduced-motion cancellation |
| 16.5.0 conflicts with cadence | Exact tested transition exception when required |
| Gallery research cannot be reproduced | Keep provenance labels; implement independently from product requirements |

Defaults resolved by this plan: independent implementations; season timeline conditional; Arcade sound
conditional and muted; budget caps tightened only after measuring the complete included release.
No author outreach, sound enablement, or backend extension is assumed.

### 8.1 Owner decisions (2026-09-23)

- **Licence:** no outreach to the gallery author. All work stays clean-room; no gallery source, art,
  text, prompts, or assets are reused. Revisit only if literal reuse is later proposed.
- **Season timeline (§4.6):** wanted as a feature. Treat as included for 16.5.0, still subject to its
  content/data gate; if canonical hero-release season data cannot be reconciled with the Atlas, record
  the row as static fallback or deferred rather than fabricating seasons.
- **Arcade SFX (§4.8):** acceptable to ship sound. Keep muted by default, create/resume the
  AudioContext only after an explicit sound action, and keep the existing setting as owner.
- **Budget:** lowering the `entryCssBytes` ceiling after Phase 0 reclaims bytes is approved. Lower it
  only by the measured, verified reclaim, with before/after evidence and a documented reserve; do not
  tighten below the included release scope.

Before coding:
- [ ] Record latest production SHA, clean worktree/branch, instructions, and baseline environment.
- [ ] Complete route/asset consumer map and P1 byte allocations.
- [ ] Verify real action handlers, locale registries, timestamp/history sources, and capability fallbacks.
- [ ] Assign exact file ownership and register new tests in the execution path.

Before owner review:
- [ ] P0/P1 acceptance complete; every P2 row explicitly included/static/deferred.
- [ ] Before/after byte ledger, traces, accessibility results, and screenshots attached.
- [ ] Full integration check passes; release-transition tests and version surfaces agree.
- [ ] No fabricated data, unexplained budget lifts, copied gallery assets, or unrelated backend changes.
- [ ] CHANGELOG lists only delivered behaviour; rollback and deploy-verification steps are concrete.
