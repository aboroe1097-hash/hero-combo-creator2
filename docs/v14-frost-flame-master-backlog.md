# V14 Frost & Flame Master Backlog

Status: planning and parallel implementation handoff
Production branch: `gh-pages` (owner-merge only)
Working branch for every contributor: `codex/platform-hardening`
Canonical design source: `C:\Users\alsel\Downloads\Fainal Site Design\VTS Frontend System v14.dc.html`
Canonical source SHA-256: `F07EAF4AA39B529EC71E50AF1882A71DA732EB778699069BAE128ED3B890433D`

## 0. Authority and non-negotiables

- [ ] DESIGN-001 Treat the final **Frost & Flame** system as authoritative.
- [ ] DESIGN-002 Use 1c for the core shell, glass depth, type, and responsive card language.
- [ ] DESIGN-003 Use 2c for hierarchy and progression storytelling.
- [ ] DESIGN-004 Use 2a for navigation, compass/progression ideas, and mobile sheets.
- [ ] DESIGN-005 Use 2b for countdown, live-vote, and urgency states.
- [ ] DESIGN-006 Use 1a for selected names, command feedback, compact data, and focus states.
- [ ] DESIGN-007 Do not implement rejected 1b parchment/War Hall or 1d Broadcast directions.
- [ ] DESIGN-008 Treat all names, counts, dates, ranks, and ballots in the design document as mock examples only.
- [ ] DESIGN-009 Preserve real production data, recipes, research values, hero scopes, voting limits, scoring, privacy, and auth.
- [ ] DESIGN-010 Do not create `/me`, new auth, new CRUD, or a new backend only because the blueprint mentions them.
- [ ] DESIGN-011 Keep plain HTML/CSS/JavaScript; do not migrate frameworks during v14 polish.
- [ ] DESIGN-012 Use only real repository game assets or an honest no-art state; never fabricate visible game art.
- [ ] DESIGN-013 Do not copy the reference PNGs into production without owner approval.
- [ ] DESIGN-014 Keep dark and light themes feature-equivalent.
- [ ] DESIGN-015 Keep all 11 locales and Arabic RTL feature-equivalent.
- [ ] DESIGN-016 Test mobile at 390 px before desktop.

## 1. Parallel-work safety gate

- [ ] SAFE-001 Every contributor reads `AGENTS.md` completely.
- [ ] SAFE-002 Every contributor verifies `git branch --show-current` is exactly `codex/platform-hardening`.
- [ ] SAFE-003 Stop immediately if the branch differs; never switch to or edit `gh-pages`.
- [ ] SAFE-004 Record `git status --short` before touching files.
- [ ] SAFE-005 Record the pre-existing diff for every assigned file.
- [ ] SAFE-006 Never reset, restore, checkout, clean, stash, rebase, merge, or broadly format the dirty worktree.
- [ ] SAFE-007 Do not edit files outside the lane allowlist.
- [ ] SAFE-008 Do not stage, commit, push, or create a PR unless the owner explicitly authorizes that exact action.
- [ ] SAFE-009 Parent Codex owns conflict resolution, release metadata, final checks, and PR preparation.
- [ ] SAFE-010 Preserve all existing IDs, data hooks, selectors, hashes, URL contracts, and test fixtures unless the entire call chain is updated in-lane.
- [ ] SAFE-011 Contributors report out-of-scope needs instead of crossing ownership.
- [ ] SAFE-012 Parent Codex reviews each hunk before accepting a lane.

## 2. Design foundations and tokens (Sol 5.6 #2 lane, Codex review)

- [ ] FND-001 Load Sora for UI/display and JetBrains Mono for data-only text.
- [ ] FND-002 Remove reliance on unloaded `Outfit` and avoid mixing Inter/Cinzel in new v14 surfaces.
- [ ] FND-003 Add canonical void token `#070B16`.
- [ ] FND-004 Add canonical deep token `#0A0F1E`.
- [ ] FND-005 Add 6% surface glass, 11% raised glass, and 13% hairline tokens.
- [ ] FND-006 Add primary text `#EEF4FF`, secondary `#9FB0CC`, and muted `#41527A`.
- [ ] FND-007 Add cyan `#7DD3FC`, fire `#FB923C`, gold `#F5C451`, violet `#A78BFA`, rose `#FB7185`, and mint `#34D399`.
- [ ] FND-008 Add primary cyan-to-fire and celestial cyan-to-violet-to-fire gradients.
- [ ] FND-009 Map existing semantic tokens to the new vocabulary without breaking old features.
- [ ] FND-010 Create light-theme semantic counterparts with sufficient contrast.
- [ ] FND-011 Freeze a 4 px spacing scale: 4, 8, 12, 16, 24, 32, 48.
- [ ] FND-012 Normalize radii: 10 controls/rows, 16 cards, 20–24 hero/sheets, pill chips.
- [ ] FND-013 Normalize surface blur to 14 px and raised blur to 18 px.
- [ ] FND-014 Cap stacked backdrop-filter layers per view.
- [ ] FND-015 Define 120 ms tap, 180 ms hover, and 260 ms expand motion tokens.
- [ ] FND-016 Define visible 2 px cyan focus ring plus halo.
- [ ] FND-017 Define rest, hover, active, selected, disabled, success, warning, error, empty, and loading states.
- [ ] FND-018 Ensure selected state uses label/accent plus a non-color marker.
- [ ] FND-019 Enforce minimum 44 px targets and 12 px minimum data text.
- [ ] FND-020 Document wide-workspace exceptions: Admin tables, Eden map, Research trees, DM dependency views.
- [ ] FND-021 Use max 1120 px for narrative shells; allow approved dense workspaces to exceed it.
- [ ] FND-022 Set breakpoint contract: mobile ≤640, tablet 641–1024, desktop ≥1025, with named narrow-landscape exceptions only.
- [ ] FND-023 Add GPU-only aurora transforms/opacity and reduced-motion shutdown.
- [ ] FND-024 Avoid new arbitrary hex colors; consolidate local colors gradually after parity.

## 3. Shared application shell (Sol 5.6 #2 lane, Codex review)

- [ ] SHELL-001 Rebuild the main header with compact Frost & Flame glass hierarchy.
- [ ] SHELL-002 Keep real VTS logo, game clock, language, theme, install, and status controls.
- [ ] SHELL-003 Preserve boot/reveal behavior without adding a second controller.
- [ ] SHELL-004 Keep desktop navigation compact, calm, and single-row.
- [ ] SHELL-005 Keep mobile primary dock: Combo Generator, Research, YouTube, VTS Admin, More.
- [ ] SHELL-006 Ensure every mobile destination has a consistent real icon.
- [ ] SHELL-007 Make More a proper bottom sheet on mobile and anchored panel on desktop.
- [ ] SHELL-008 Preserve keyboard focus return, Escape, backdrop dismissal, and scroll lock.
- [ ] SHELL-009 Keep URL hashes and browser back/forward synchronized.
- [ ] SHELL-010 Preserve footer hash navigation and lazy module loading.
- [ ] SHELL-011 Ensure shell never overlays section headings or first controls.
- [ ] SHELL-012 Add safe-area padding for mobile dock and fixed actions.
- [ ] SHELL-013 Verify 360, 390, 430, 768, 1024, 1280, and 1440 widths.
- [ ] SHELL-014 Verify English, long German/Russian, Arabic RTL, and 200% zoom.
- [ ] SHELL-015 Keep a single interactive DOM per control; no duplicate focus targets by breakpoint.
- [ ] SHELL-016 Fix any remaining stale lazy-module version stamps.

## 4. Parent Codex-owned core tool convergence

- [ ] CORE-001 Create or consolidate a scoped `core-tools-v14` layer instead of adding more global overrides.
- [ ] CORE-002 Preserve Manual Builder drag/drop, touch selection, slots, export, and share behavior.
- [ ] CORE-003 Rebuild Manual Builder cards with canonical spacing, selected state, and responsive controls.
- [ ] CORE-004 Preserve Generator scoring, skin mode, filters, and selection limits.
- [ ] CORE-005 Rebuild Generator filters as compact mobile-first groups without dead gaps.
- [ ] CORE-006 Keep hero selection count/actions visible and non-overlapping below the dock.
- [ ] CORE-007 Normalize Hero Atlas and Generator portrait crop masks and focal positioning.
- [ ] CORE-008 Preserve X8 roster restriction and future-hero exclusion.
- [ ] CORE-009 Keep static skin motion as honest fallback; add real animated media only when actual assets exist.
- [ ] CORE-010 Add an explicit animated-skin asset hook for future WebM/GIF sources without autoplaying hidden media.
- [ ] CORE-011 Keep large hero lists performant with content visibility/batching.
- [ ] CORE-012 Rebuild hero detail as the shared sheet/modal contract.
- [ ] CORE-013 Keep counters, top combos, paid/free, troop, season, and skin filters keyboard accessible.
- [ ] CORE-014 Verify selected names use accent plus check/pressed semantics.
- [ ] CORE-015 Remove legacy core selectors only after screenshot parity.

## 5. DM Materials (Parent Codex)

- [ ] DM-001 Preserve the three exact routes: direct Gold, Purple recommended, Blue maximum savings.
- [ ] DM-002 Preserve materials → normal troop gear → DM piece → 4:1 tier merge flow.
- [ ] DM-003 Preserve verified recipe quantities and resource totals.
- [ ] DM-004 Keep White, Green, Blue, Purple, Orange, and Gold identity on every item/material/equipment surface.
- [ ] DM-005 Recolor only frames/surfaces; never tint actual in-game item art incorrectly.
- [ ] DM-006 Maintain true mobile 3×2 six-piece grid.
- [ ] DM-007 Keep `Selected` from covering `0 / 1` counts.
- [ ] DM-008 Keep route cards compact on mobile; move detailed cost comparison into comparison view.
- [ ] DM-009 Keep sticky completion CTA above dock without covering selected-piece content.
- [ ] DM-010 Convert normal troop gear and merge stages to readable vertical mobile flow.
- [ ] DM-011 Keep owned-resource editing, shortfalls, save, export, and share fully functional.
- [ ] DM-012 Add Frost & Flame tokens/type/focus/RTL/light parity.
- [ ] DM-013 Verify exact icons and honest broken-image fallback for every recipe node.
- [ ] DM-014 Verify 360 px and short-landscape behavior.
- [ ] DM-015 Remove the `Verified crafting guide` label everywhere it can render.
- [ ] DM-016 Add a separate DM Enhancement planner for advancing completed pieces through +5, +10, +15, +20, and +25 milestones.
- [ ] DM-017 Support both one-piece and full six-piece enhancement totals without multiplying already supplied full-set figures again.
- [ ] DM-018 Track owned, needed, and shortfall values for Super Dragon Core, Exotic Crystal, and Dragon Crystal.
- [ ] DM-019 Show milestone deltas, cumulative totals, next affordable milestone, and next best action only after Redbull 1097 confirms whether the supplied values are cumulative or per-stage.
- [ ] DM-020 Use only the exact enhancement-resource icons supplied by the owner; do not substitute approximations.
- [ ] DM-021 Persist enhancement progress separately from crafting-route inventory so changing one calculator never corrupts the other.
- [ ] DM-022 Add source credit for Redbull 1097 (enhancement cost data) and Roha 1097 (major DM-tool contribution) in a compact translated contributor note.
- [ ] DM-023 Validate the supplied one-piece/full-set milestone table against independent multiplication and source screenshots before release.

## 6. Research (Parent Codex)

- [ ] RSRCH-001 Preserve corrected research database values, costs, names, and stable IDs.
- [ ] RSRCH-002 Preserve exact supplied topology edges.
- [ ] RSRCH-003 Preserve gray idle, highlighted in-progress, and luminous MAX outer states.
- [ ] RSRCH-004 Request only exact captured art matching the live state.
- [ ] RSRCH-005 Never show a mismatched amber/MAX capture inside a gray node.
- [ ] RSRCH-006 Keep declared contaminated/missing art as honest no-exact-art states.
- [ ] RSRCH-007 Preserve authored edge paths across responsive layouts.
- [ ] RSRCH-008 Apply canonical compact cards and mono numeric controls.
- [ ] RSRCH-009 Keep node inspector a desktop rail and mobile sheet.
- [ ] RSRCH-010 Keep decrease, increase, clear, MAX, Reset, and totals keyboard accessible.
- [ ] RSRCH-011 Keep current persistence keys and costs unchanged.
- [ ] RSRCH-012 Prevent legacy `app.css`/`mobile.css` research selectors from winning.
- [ ] RSRCH-013 Verify all supplied tree groups at idle, partial, and MAX states.
- [ ] RSRCH-014 Verify light, RTL, reduced motion, and narrow landscape.

## 7. YouTube and secondary tools (Parent Codex)

- [ ] YT-001 Keep lazy playlist loading; no hidden autoplay iframe.
- [ ] YT-002 Apply canonical library cards, state hierarchy, typography, and light/RTL parity.
- [ ] YT-003 Preserve direct YouTube fallback and retry/error states.
- [ ] SEC-001 Bring Strife into canonical cards/filters without changing intentional S0–X2 scope.
- [ ] SEC-002 Bring Loyalty calculator into canonical cards/forms/results without changing formulas.
- [ ] SEC-003 Bring Eden Map toolbar/picker into canonical hierarchy without changing datasets/coordinates.
- [ ] SEC-004 Keep Eden dataset picker retry/apply/close states reliable.
- [ ] SEC-005 Translate or intentionally label Eden Construction’s coming-soon state.
- [ ] SEC-006 Keep wide map canvas as a documented workspace exception.
- [ ] SEC-007 Prevent body-level horizontal overflow around internal canvases/tables.

## 8. Admin Console (DeepSeek lane, Codex review)

- [ ] ADMIN-001 Apply Frost & Flame tokens with higher information density.
- [ ] ADMIN-002 Preserve Firebase admin claim, PIN gates, Firestore rules assumptions, and sign-out behavior.
- [ ] ADMIN-003 Preserve OCR upload/drop/paste, validation, retries, and service status.
- [ ] ADMIN-004 Preserve roster normalization, duties, contributions, adjustments, and time filters.
- [ ] ADMIN-005 Preserve immutable cross-device terminal log sync and privacy redaction.
- [ ] ADMIN-006 Preserve concurrent-edit revision/fingerprint protection.
- [ ] ADMIN-007 Consolidate competing Admin desktop/tab/mobile navigation rules.
- [ ] ADMIN-008 Decide and implement a dense desktop sidebar or document why current top tabs remain.
- [ ] ADMIN-009 Keep all internal subtools reachable in the mobile bottom dock.
- [ ] ADMIN-010 Use 40 px noninteractive rows but 44 px interactive controls.
- [ ] ADMIN-011 Use mono numerals for scores, counts, timestamps, demolition, and ranks.
- [ ] ADMIN-012 Convert wide mobile tables to labeled cards or controlled internal scroll regions.
- [ ] ADMIN-013 Prevent charts, rankings, insights, and history sections from overlapping or leaving collapse gaps.
- [ ] ADMIN-014 Replace normal bare alerts with localized inline/status feedback where safe.
- [ ] ADMIN-015 Keep destructive confirmations explicit.
- [ ] ADMIN-016 Scope all Admin rules so Eden X1 does not regress through shared OCR CSS.
- [ ] ADMIN-017 Verify logged-out, loading, empty, seeded, error, offline, stale, and synchronized states.
- [ ] ADMIN-018 Verify dark/light, English/Arabic RTL, 390/768/1024/1440.

## 9. Eden X1 (Mimo 2.5 lane, Codex review)

- [ ] EDENX1-001 Preserve all real contribution formulas, rank order, reward filters, and datasets.
- [ ] EDENX1-002 Preserve current one-to-four unique teammate voting behavior.
- [ ] EDENX1-003 Preserve configurable deadline/open/closed state and privacy boundaries.
- [ ] EDENX1-004 Preserve public/member/admin visibility and existing route.
- [ ] EDENX1-005 Rebuild the top as a marquee season hero using live real data.
- [ ] EDENX1-006 Add top-three podium hierarchy without fabricating avatars/data.
- [ ] EDENX1-007 Add season progression/route treatment using decorative CSS and real milestones.
- [ ] EDENX1-008 Create desktop content + approximately 320 px vote/tools rail.
- [ ] EDENX1-009 Keep mobile a single column with sheets, safe areas, and no clipped text.
- [ ] EDENX1-010 Preserve reward flow tables, Find Player, Team MVPs, analytics, and weighted contribution details.
- [ ] EDENX1-011 Make ranking rows/cards expandable with accessible state and stable layout.
- [ ] EDENX1-012 Show selected count, deadline, eligibility, and submission state in ballot UI.
- [ ] EDENX1-013 Preserve existing member privacy; do not expose protected records through CSS/markup.
- [ ] EDENX1-014 Keep real runtime data; never ship mock names/dates/scores from the design.
- [ ] EDENX1-015 Preserve shared standalone language, theme, footer, and loader integrations.
- [ ] EDENX1-016 Verify 390, 768, 1024, 1440; dark/light; English/Arabic RTL; 200% zoom.

## 10. Shared standalone surfaces (Parent Codex)

- [ ] STAND-001 Align Admin and Eden X1 headers with the main Frost & Flame shell without pretending they are the same route.
- [ ] STAND-002 Keep branded custom language popovers on all three shells.
- [ ] STAND-003 Keep standalone footer compact, wrapped, and consistent at 360–430 px.
- [ ] STAND-004 Keep contact mailto `aboroe1097@gmail.com`.
- [ ] STAND-005 Keep all Admin internal tools at the page bottom/mobile dock.
- [ ] STAND-006 Redesign `public/404.html` as a lightweight recovery page.
- [ ] STAND-007 Unify loader/empty/skeleton state language while preserving the branded boot gate exception.
- [ ] STAND-008 Use real loader progress/milestones only; never delay navigation for decoration.

## 11. Theme, i18n, RTL, accessibility (Parent Codex final owner)

- [ ] QA-I18N-001 Keep parity across en, ar, de, es, fr, id, kr, pt, ru, tr, zh.
- [ ] QA-I18N-002 Reject accidental English fallback for critical UI keys.
- [ ] QA-I18N-003 Use `Intl` for dates, times, numbers, percentages, and currency-like counts.
- [ ] QA-I18N-004 Verify German/Russian wrapping and decorated Unicode player names.
- [ ] QA-I18N-005 Verify Arabic logical ordering, chevrons, sheets, tables, and docks.
- [ ] QA-A11Y-001 Maintain semantic landmarks and heading order.
- [ ] QA-A11Y-002 Verify every icon-only control has an accessible name.
- [ ] QA-A11Y-003 Verify keyboard operation, visible focus, Escape, and focus return.
- [ ] QA-A11Y-004 Verify selected/current/expanded/disabled states are programmatic.
- [ ] QA-A11Y-005 Verify glass text contrast ≥4.5:1.
- [ ] QA-A11Y-006 Verify 200% zoom and no lost controls.
- [ ] QA-A11Y-007 Honor reduced motion everywhere.
- [ ] QA-A11Y-008 Avoid `transition: all`, blocked paste, disabled zoom, and outline removal without replacement.

## 12. Performance and cascade cleanup (Parent Codex final owner)

- [ ] PERF-001 Measure before/after CSS, JS, media, total deploy bytes, and file count.
- [ ] PERF-002 Keep route-specific styles lazy where architecture supports it.
- [ ] PERF-003 Cap aurora layers and nested blur surfaces.
- [ ] PERF-004 Keep animations transform/opacity only.
- [ ] PERF-005 Keep large hero/player/research lists batched or content-visible.
- [ ] PERF-006 Remove superseded selectors only after same-viewport screenshot parity.
- [ ] PERF-007 Reduce `!important` by scope/cascade, not blind deletion.
- [ ] PERF-008 Consolidate duplicate media queries toward 640/1024 with documented exceptions.
- [ ] PERF-009 Derive light theme from tokens instead of route-specific override piles.
- [ ] PERF-010 Centralize duplicated theme/language initialization after visual parity.
- [ ] PERF-011 Measure the intentional DM/Research asset file-count increase and set a narrow evidence-based budget.
- [ ] PERF-012 Do not relax JS/CSS/media budgets without measured cause.

## 13. Final validation and release (Parent Codex only)

- [ ] REL-001 Reconcile every contributor handoff one lane at a time.
- [ ] REL-002 Check unexpected file edits and revert nothing blindly.
- [ ] REL-003 Run `git diff --check`.
- [ ] REL-004 Run `npm run version:check`.
- [ ] REL-005 Run `npm run check` after all lanes merge.
- [ ] REL-006 Run production preview and local smoke tests.
- [ ] REL-007 Browser-QA main shell, DM, Research, Generator/Heroes, YouTube, Eden Map, Loyalty, Strife, Admin, and Eden X1.
- [ ] REL-008 Capture 390/768/1024/1440 screenshots for dark/light and Arabic RTL.
- [ ] REL-009 Inspect console errors, failed requests, overflow, sticky coverage, and focus order.
- [ ] REL-010 Create/update `design-qa.md` with P0–P2 fixes and accepted evidence.
- [ ] REL-011 Update public version surfaces and changelog only after scope is frozen.
- [ ] REL-012 Keep this unreleased overhaul at `14.0.0`; production remains `13.1.11` until the owner-reviewed v14 PR is merged.
- [ ] REL-013 Stage only intended files.
- [ ] REL-014 Commit and push only after explicit owner authorization.
- [ ] REL-015 Open a PR from `codex/platform-hardening` to `gh-pages`.
- [ ] REL-016 Wait for `deploy-verification` and owner/CODEOWNERS review.
- [ ] REL-017 Owner merges; no direct production push.

## 14. Known external-source limitations

- [ ] LIMIT-001 Obtain real animated skin portrait media before claiming true in-game video motion.
- [ ] LIMIT-002 Obtain clean transparent Research sprites before replacing declared contaminated crops.
- [ ] LIMIT-003 Obtain original MAX sparkle/particle media before adding exact in-game effects.
- [ ] LIMIT-004 Treat missing key art as an honest visual state, not a fabricated placeholder asset.

## Lane ownership summary

- **Sol 5.6 #2:** `index.html`, `css/_tokens.css`, `css/shell-v14.css`, `js/shell-v14.js`.
- **DeepSeek v4 Pro (completed):** Admin/OCR presentation lane and platform-hardening/source-tracking workflow lane.
- **DeepSeek v4 Pro (active next):** 11 locale catalogs, `scripts/check-i18n.mjs`, and the focused V14 i18n contract test only; see `v14-deepseek-i18n-convergence.md`.
- **Mimo 2.5 (completed):** `eden-x1.html`, `css/eden-x1.css`, `js/eden-x1.js`, `js/eden-x1-management-votes.js`, and `js/eden-vote-deadline.js`.
- **Mimo 2.5 (active next):** Eden Map picker/loader/map accessibility and focused season/loader tests only; see `v14-mimo25-eden-map-reliability.md`.
- **Parent Codex / Sol:** every unassigned shared integration file, feature-tool convergence, standalone footer/language, release metadata, build budgets, final QA, and release arbitration.
