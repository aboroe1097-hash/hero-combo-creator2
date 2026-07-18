# Changelog

## 14.1.2 - 2026-07-18

- Added four read-only Velo tools so the assistant knows the whole toolkit: `get_toolkit_map` (every tab/page with what it answers and its deep link), `get_whats_new` (recent release notes from a generated changelog digest), `get_specialization_context` (canonical Specialization Towers columns, researches, nodes, milestones, medal costs, and Legion Skills), and `get_skin_tier_details` (the three skin tiers with star-up costs and acquisition paths).
- Added a `velo:changelog` script that generates `js/ai/changelog-digest.js` from CHANGELOG.md; the build runs it automatically and a unit test keeps the digest in sync with the released version.
- Rebranded the assistant build as Velo b0.2 and refreshed Velo's system prompt: the role now covers Specialization Towers, skin tiers, All-Star BoH public mechanics, Battle Simulator context, and app navigation; the helmet gag became occasional and varied; out-of-scope answers now route to the right toolkit tab instead of refusing; and answer shape/wording is instructed to vary between turns.
- Added grounded VTS guide knowledge entries for the All-Star BoH member flow, Specialization Towers structure, skin-tier economy, and the Fordogreen X1 Strife approach, plus community-shorthand aliases (dm, ac, boh, spec, cop, f2p, p2w) in guide retrieval.
- Added an optional `activeTab` breadcrumb to the chat request contract: the Worker schema accepts it and injects an ACTIVE APP TAB section into the model instruction; the client keeps it disabled until the Worker deploy that accepts the field is live.
- Added the verified Cavalry columns I–III evidence overlay with 17 source screenshots, 23 exact icon crops, provenance metadata, and stable research/node records; unknown medal costs, learning order, prerequisites, and ambiguous icon mappings remain explicitly unknown.
- Added the verified Archer columns I–III evidence overlay with 17 hashed source screenshots, 19 exact icon crops, 253 research-node records, observed layouts, provenance metadata, and canonical troop overrides while retaining unknown costs and prerequisite directions as `null`.
- Added the verified Footmen columns I–III evidence corpus with 17 source screenshots, pixel-preserving crop descriptors, completed-graph node counts and visual ordering, and confirmed Legion Skill names/effects without inventing canonical node mappings, costs, or prerequisite directions.
- Added a localized Hall of Honor to the bottom of the integrated Specialization tab for the VTS 1097 Community, Ptr, Old.Faithful, Raven G, and every data contributor.
- Separated node inspection from learning changes so selecting a node now shows its name, troop-specific buff, learned state, and an explicit learn/unlearn action.
- Added an unknown-medal help prompt that opens and focuses the selected node's Community Data record, with contribution storage now scoped by research and node instead of colliding numeric node IDs.
- Reworked the Specialization phone layout with touch-safe nodes and controls, compact summary and troop navigation, snap-scrolling towers, responsive contribution records, sticky learning actions, and a two-column mobile Hall of Honor.

## 14.1.1 - 2026-07-18

- Removed public navigation to the legacy standalone Specialization Towers page so the integrated `#specialization` tab is the only advertised destination.
- Cleared the integrated Specialization loading placeholder after the tool mounts successfully.
- Fixed integrated Specialization node selection, Complete Learning, Reset Learning, and recorded-medal changes persisting the model's returned state.
- Added a localized quick-MAX action to every Specialization overview badge so a learning can be completed without opening its node graph.
- Localized the Community Data contributor, medal-cost, reviewer, and completion-count fields across all eleven supported languages.
- Reworked Community Data into compact game-node records with separate contributor and reviewer medal values, preserving earlier saved submissions while supporting partial research updates.

## 14.1.0 - 2026-07-18

- Fixed manually pasted Total Contribution names retaining a separator comma, including previously saved records when they are normalized for display and export.
- Restored contribution snapshot matching when the optional guild field is omitted by applying the VTS X1 default only within the normal contribution comparison, avoiding unnecessary one-off aliases.

## 14.0.20 - 2026-07-17

- Added a Specialization Towers tab inside the main app (index.html) that follows the in-game flow: column banners of circular badges with a Legion Skill crest at the foot, and tapping a badge opens a node graph — an oval ring for most families and a dependency tree for Enhanced Tactics — with milestones, a medal-entry field, and complete/reset. Reuses the verified Specialization dataset, model, store, and eleven-language i18n; no game data is reinvented.
- Added a community contribution form to the Specialization tab with an inline fillable UI: contributor name, per-node medal cost entry, and optional reviewer name — all persisted in localStorage, replacing the previous CSV-download and external-sheet approach.
- Merged Battle Simulator v2 engine with research and equipment source breakdowns, per-stat node UI with source-level breakdown, whole-legion equipment loadouts with set/grade/enhancement selection, full i18n support, and v2 synthetic test fixtures.

## 14.0.19 - 2026-07-17

- Added a VTS-only All-Star BoH member hub with a server-verified seasonal PIN, anonymous Firebase Auth, App Check, expiring server-owned member grants, locked-by-default navigation, and Firestore enforcement instead of exposing another reusable client-side PIN.
- Added manual and screenshot-assisted signup for the full legacy power breakdown, T9 and speed-hero readiness, fieldable hero availability, self-reported research-tree percentages, exactly two preferred All-Star fighting windows, an optional favorite role, non-binding teammate requests, teleport/voice readiness, and plan commitment; searchable hero controls and grouped research quick-fill actions keep the expanded form usable, while OCR screenshots are resized in-browser, processed through a fixed server-owned schema, explicitly reviewed, and never stored.
- Added an independent Epic Showdown Planning section where members can multi-select South, Center, and North lanes plus multiple reset-relative play windows (`+8`, `+10`, and `+12`); updates remain separate from All-Star signup revisions, and admins receive live per-player details and preference counts.
- Added deterministic, versioned strength scoring and an admin-controlled six-team builder that requires exactly 12 unique accounts per team, respects seat and role locks, exposes score breakdowns, and validates all 72 assignments before publication.
- Added the Admin VTS All-Star command center for signup review, formula versions and overrides, team balancing and seat moves, configurable 12-seat role groups, four timed phases, two Legion plans, rotations, loadouts, teleport notes, objectives, and separate Team Announcement and Team Plan releases.
- Adapted the supplied 2025 plan safely: Offensive, Rune, Top, and Bottom roles plus the 0–5, 5–10, 10–15, and 15–30 minute structure and objective codes can be reused, while all 15-seat player names, assignments, and capacities are deliberately excluded from the new 12-seat format.
- Added complete player and admin All-Star copy for all eleven supported languages, revision-safe live persistence, authenticated OCR rate limits, privacy-safe member publications, identity and security contracts, responsive/RTL/keyboard behavior, and focused model, controller, storage, Worker, and integration coverage.
- Bound every member-visible overview, team, and personal-plan read to the current published revision, published team set, and matching announcement/plan state so hidden or stale publication documents cannot be fetched directly.
- Preserved the production AI quota Durable Object bindings, declarative SQLite export, and existing namespace while adding the All-Star rate limiter through the same exports lifecycle, preventing a later Worker deploy from orphaning live quota state.
- Added declarative Firestore TTL cleanup for expired All-Star member grants and security-attempt records; authorization continues to reject expiry synchronously and never depends on delayed cleanup.
- Changed the release workflow for normal additive `gh-pages` PRs: `npm run check` remains mandatory, while `npm run firebase:preview` is reserved for major version upgrades, broad overhauls, or changes that explicitly need Firebase-hosted validation.

## 14.0.18 - 2026-07-17

- Added a Skin Atlas mode to the Hero Atlas: a Heroes/Skins toggle that opens a catalog of the three hero-skin tiers (Mythic, Legendary, Everlasting), each showing the Star 1 activation bonus, the Star 1→2 Inheriting Skill cost, the Star 2→3 Preserving Skill cost, the full maximize total, how to obtain the skin, and known heroes for that tier.
- Encoded the verified per-tier star-up material costs (Biography Seal, Advanced Biography Seal, Epic/Legendary/Seasonal Legendary Hero Medals) with theme-aware styling and complete copy across all eleven supported languages.

## 14.0.17 - 2026-07-17

- Added the public Specialization Towers v2 planner with separate Cavalry, Archers, and Footmen towers; eight game-like columns; four research learnings per column; 25/50/75/100 milestones; and medal-free Legion Skills that unlock only after all four learnings reach 100%.
- Added the canonical X28+ specialization corpus with 32 researches, shared internal-node structures across troop types, troop-specific names and effects, exact full-research badge costs, S3/SX1 availability, portable progress import/export, undo/redo, and persistent local planning state.
- Kept partial medal accounting evidence-based: unknown node costs remain unknown, recorded exact totals are invalidated whenever their selected nodes change, and the community-data panel links to the shared Google Sheet plus a versioned one-row-per-node CSV contribution template.
- Added evidence-backed progressive node revelation for Enhanced Tactics IV: its two screenshot-confirmed roots are available together, the observed final node remains visible and locked, unverified downstream nodes stay hidden, and the contribution template now collects initial visibility, reveal prerequisites, branch identity, and evidence references without inventing an order.
- Added a standalone battle-contribution contract that keeps unit base-point modifiers separate from battle percentages, exports scoped numeric/effect contributions with diagnostics, supports future engine extraction without Battle Simulator imports, and rejects non-finite arithmetic.
- Added the accepted dense dark/light tower-board UI, persistent desktop inspector, scrollable mobile dialogs, keyboard/focus restoration, RTL and eleven-language UI packs, strict local-only CSP-safe rendering, public navigation/command-palette discovery, service-worker coverage, responsive production smoke tests, and route-specific size budgets.

## 14.0.16 - 2026-07-17

- Rebuilt the Strife over Dragon boss Fordogreen as "Fordogreen the Dark Rider" with its current four-skill kit — Preemptive Strike, Broken Promise, Hunt You Down, and Power of the Legion — including timings, targets, counters, and localized copy across all eleven supported languages.
- Added the top X1 pay-to-win recommendation for Fordogreen (Edward the Confessor / Ramses II / Beowulf) alongside the existing formations.
- Added a localized Rank 1 reward callout to the Strife boss intel band that surfaces the exclusive hero icon gifted to the event's top-ranked player, rendering a placeholder badge until the reward artwork is supplied.

## 14.0.15 - 2026-07-16

- Added a simple, case-insensitive search inside the Alliance View Eden account-match editor while preserving the current selection during filtering and live contribution refreshes.
- Added a localized, one-click Alliance merge briefing PNG generated from the current live admin data, comparing a power-ranked full Top 100 against 95 keeps plus 5 reserved incoming seats with alliance composition, power cutoffs, C30 strength, Eden coverage, and manual-match recovery totals.
- Kept the leadership brief honest about uneven Eden tracking coverage by using total power for both cross-alliance routes and labeling accounts outside the keep route as feeder candidates rather than automatic removals.

## 14.0.14 - 2026-07-16

- Fixed Eden X1 weighted-score popovers closing immediately when opened by hover or keyboard focus: the scroll-dismiss grace window now covers every open path, not only click, so the scroll that brings the trigger into view no longer dismisses the popover it just opened.

## 14.0.13 - 2026-07-16

- Added the admin-only Alliance View for the V3S/VTS merge: upload either current roster with a review-before-replace diff, keep every castle/account as its own ranked row, and switch between combined or split All/Top-100 tables.
- Ranked live season data by Extended Weighted, Base, the Eden Votes active admin mode, raw contribution, ex-guild, duties, individual duty types, Bonus Team Effort, or total power, with searchable sortable tables, score/activity/match filters, configurable columns, breakdowns, accessible status bands, and filtered or complete audit exports.
- Added strict account-specific Eden matching through exact source names, unique normalized names, and verified cross-dataset registry aliases; saved manual assignments remain authoritative for reassignment or disambiguation, fuzzy suggestions always require review, one Eden source cannot serve multiple roster accounts, and unmatched accounts remain at zero.
- Added roster import reconciliation and admin editing for additions, removals, updates, possible renames, transfers, confirmed name changes, imported-value resets, and Eden reassignment; relative Last Online values are preserved and converted to absolute timestamps at import.
- Stored only the current V3S and VTS rosters in admin-claim-protected Firestore documents with revision-checked transactions and live subscriptions, and connected Alliance View directly to existing contribution, ex-guild, duty, Bonus Team Effort, season, registry, and active-mode state without another Eden export.
- Added complete Alliance View copy for all eleven supported languages plus model, persistence, security-contract, synthetic 91/98-roster, responsive, keyboard, RTL, export, edit, and live-refresh coverage.

## 14.0.12 - 2026-07-16

- Reworked all ten non-English catalogs with gaming-community wording across the established public tools, Eden X1, Admin, accessibility labels, guidance, and contribution-formula explanations instead of accepting English fallbacks or literal translations as complete; the beta Battle Simulator remains outside this localization pass.
- Added semantic Research localization for tree metadata, node names, buffs, section headings, MAX/complete actions, resource labels, localized-and-English search, and live language switching while keeping canonical IDs, costs, parsing, art matching, and saved progress unchanged.
- Localized the Dragon Master planner and enhancement workflow through stable display IDs for equipment, materials, routes, resources, actions, and the default plan name, without changing crafting calculations or stored plans.
- Added locale-safe display packs for Hero Atlas skills and help, Strife monsters and recommendations, Eden Map structures and sectors, and Manual Builder, Generator, and Counter guidance while preserving canonical game data and saved identifiers.
- Localized the Admin OCR and Eden Votes workflows, Arcade hub and games, standalone/error/maintenance/PWA shells, exports, loyalty time units, accessibility text, and live language refresh behavior; user-facing numbers and dates now follow the selected language where applicable.
- Strengthened translation verification with bidirectional catalog checks, duplicate-key detection, dynamic runtime-key discovery, reviewed per-language gaming terminology contracts, placeholder and numeric-token validation, and complete Research, Hero Atlas, Strife, Eden Map, Admin, and standalone content-pack coverage.

## 14.0.11 - 2026-07-16

- Added the PIN-gated Battle Simulator Beta foundation with three ordered troop rows per side, verified T9/T10 Cavalry, Archers, and Footmen presets, 31,000 troops per row by default, independently editable base Attack/Might, Defense/Resistance, and HP values for every row, and manual entry as either extra-source bonuses or final totals for all seven combat stats.
- Added single and seeded batch simulation modes for 1, 10, 50, 100, or 500 iterations with correct aggregate averages/medians; large batches run in an isolated worker, on-screen logs hydrate only when opened, and full JSON, summary CSV, event CSV, and copied diagnostics retain complete reproducible data.
- Kept Phase 1 intentionally troop-only while exposing round logs and Combat Speed initiative for later calibration before heroes, skills, equipment, dragons, and tactical-skill damage enter the model.

## 14.0.10 - 2026-07-15

- Prevented desktop Eden weighted-score popovers from briefly animating outside the viewport at the 769 px breakpoint by snapping the JavaScript-clamped position immediately while retaining opacity and visibility fades.

## 14.0.9 - 2026-07-15

- Completed Delivery P1 quick wins: Eden Team Player votes now use the native form-submit path exactly once, and the mobile DOM/focus order matches the visible reward, vote, overview, and dashboard flow while preserving the desktop grid.
- Applied the same deterministic cutoff tie-break hierarchy to R4 / Management and published Team Player winners: aggregate votes first, then Bonus Team Effort, the admin-selected contribution score, and canonical member name.
- Made winner detail popovers paint above the voting rail and show localized vote totals, rank, active contribution breakdown, anonymity, and the exact tie-break criterion when one decided a slot; unpublished or wrong-season Team Player results expose nothing.
- Restored the Home navigation contract at the 640/641 and 1439/1440 boundaries, added a localized first-focus Skip to current tool link with hash/Back synchronization, and retained one meaningful mobile page heading.
- Prevented Best and Surprise Me from leaving stale Generator results or downloads, added one neutral result-count announcement, and now show a persistent, focus-managed recovery action whenever no ranked combinations match.
- Added targeted accessible names, contrast, progress text, group semantics, and conditional keyboard access across Admin, Eden Map, Dragon Master, Research, and the public participation heatmap; reduced-motion users no longer receive the known title/shell animations, and the two broad component transitions now list only their intended properties.
- Stabilized the Total Contribution formula selector so its buttons no longer shift between views, and renamed the user-facing Default formula to Base while preserving the existing stored setting and formula behavior.
- Reconciled the July 15 vote export with verified public-member and OCR aliases, hardened non-Latin name matching, canonicalized legacy voter keys at read time, and prevented one ballot from counting multiple spellings of the same player family.
- Consolidated Management and Team winner rankings by verified player family so alias spellings cannot split votes or occupy duplicate reward slots, including recalculated competition ranks for legacy aggregates.
- Added an explicit fail-closed admin action for activating a new vote season, and made the public cache refresh authoritative settings, published results, and Bonus Team Effort sidecars without retaining or indefinitely renewing obsolete season data.

## 14.0.8 - 2026-07-15

- Made R4 / Management assignment transparent by publishing each selected name's management-vote total, competition rank, public Bonus Team Effort Points, and weighted-contribution breakdown while keeping individual ballots anonymous.
- Added deterministic management-vote tie-breaks using Bonus Team Effort Points, then the admin-selected Total Contribution score, then canonical player-name order; the assignment details now identify ties and the criterion that decided a cutoff slot.
- Canonicalized public R4 aliases during reward-priority exclusions so variants such as `Dr Thunder` and `Dr Thunder 293` cannot receive overlapping higher-priority and management assignments.
- Added an admin-only Eden X1 Votes control for choosing the authoritative Total Contribution formula: Extended includes contribution, ex-guild, duty, and Bonus Team Effort weight, while Default ranks contribution plus ex-guild only. Existing settings safely fall back to Extended.
- Added a public Extended/Default comparison switch with active-chain labels and formula-aware score breakdowns; comparison never changes assignments, while the admin choice drives the actual Top 10, R4 / Management exclusions, and Team Players exclusions.

## 14.0.7 - 2026-07-15

- Kept Velo's pending saved-hero request across the Generator handoff so a follow-up such as "I saved them" immediately opens the correct explicit consent, including selections made before the debounced local save completes.
- Made multi-result recommendations from a selected hero roster non-overlapping, matching the Generator by using each hero in at most one returned formation.

## 14.0.6 - 2026-07-15

- Replaced Eden X1's empty Duty Activity marquee metric with the current rank-20 weighted-contribution cutoff, including translated labels and a clear fallback when fewer than 20 contributors are ranked.
- Expanded Complete season activity and the lower Eden X1 dashboard across the full desktop content width after the voting panel ends.

## 14.0.5 - 2026-07-14

- Restored responsive Admin startup by bundling Firebase core as same-origin hashed assets, bounding Auth readiness, binding controls before cached data is revealed, deferring hidden/secondary panels, and caching per-attack identity resolution instead of repeatedly rescanning every player row.
- Added a resilient management-vote transport fallback through the existing allow-listed worker, bounded Eden's complete Auth restore phase, and made cached dashboards treat live refresh timeouts as non-blocking.
- Removed the Quick Tour and all of its activation, navigation, styling, and legacy-storage paths on every device so it can no longer cover the initial mobile view or become the largest-content paint.
- Delayed Analytics until the first real interaction or a ten-second post-load fallback and allowed Google's regional collection endpoint in every public page's Content Security Policy.
- Raised only the Lighthouse-flagged mobile shell, Generator, hero-card, installation, and footer text to a 12 px legibility floor while preserving the existing desktop density and global CSS structure.

## 14.0.4 - 2026-07-14

- Removed the retired Comments and What's New startup surfaces while preserving their Firestore data protections; made Generator the stable first-paint tool and fixed the touched tour, switch, and filter semantics for keyboard and screen-reader users.
- Deferred Arcade, Eden Map, Strife, Loyalty, Research, Dragon Master, export, Analytics, and Velo assistant feature code/styles until their first relevant intent; stopped hidden-tab loaders from creating offscreen artwork; and added smaller launcher/maintenance imagery plus one-shot stale hashed-asset recovery.
- Made Eden management votes start beside dashboard boot, retry the public aggregate sheet once, tolerate late Google JSONP callbacks, wait for the member/reward model before exclusions, preserve cached dashboards on live timeouts, and expose an explicit in-place Retry state after final failure.
- Reopened the toolkit after the maintenance window while retaining the shared hold page for future use.

## 14.0.3 - 2026-07-14

- Enabled a site-wide maintenance hold that redirects the main toolkit, Admin, Eden X1, Arcade, mini-games, and missing routes to a lightweight status page while preserving an explicit local/session bypass for release verification.

## 14.0.2 - 2026-07-14

- Restored Eden X1's immediate full-viewport Velo loader, tied it to real boot progress, and kept it visible until blocking dashboard rendering finishes so Index navigation no longer lands on an apparently frozen page.
- Refined Velo's three-round helmet mishap into a 20-second story: two seconds calm before the first red dodge, three seconds before the stronger second correction, four seconds before the final red-eye burst, and a four-second disappearance before the loop restarts.

## 14.0.1 - 2026-07-14

- Prioritized Eden's cached reward controls ahead of its heavy analytics render so repeat visits show the four reward lanes before background tables and charts finish hydrating.
- Added a translated public Eden X1 Rankings entry to the main desktop and mobile More Tools navigation, separate from authenticated VTS Admin operations.
- Widened and rebalanced the desktop Team Players ballot, placed candidate fields in a compact two-column grid, and replaced the cramped nested rail with normal page scrolling.

## 14.0.0 - 2026-07-11

- Added a privacy-filtered, dated VTS guide knowledge library for Velo covering Eden coordination, progression, hero leveling, and ticket planning, with bounded topic search, historical-plan warnings, and explicit exclusion of expired links, personal results, raw votes, and current war intelligence.
- Added exact Eden upgrade-material tools for Velo, covering T1-T16 loyalty requirements, per-building AC1-AC4 level ranges, and the cheapest material path from current camp levels to a target tile.
- Added Abo giving Velo his oversized slipping helmet as explicit character lore, preventing Velo from confusing Abo with the current user, denying the visible helmet is separate from his scales, or omitting a brief helmet-adjustment beat when someone directly asks him for help.
- Labeled Velo as Beta 0.1, kept his complete walking mascot above shared Admin and Eden X1 loading rails instead of clipping him into the legacy 5px progress bar, and reconciled the July 13 contribution snapshots with verified player-name aliases while leaving unsafe generic banner fragments unmerged.
- Removed the cinematic first-visit entry gate so the toolkit opens directly; protected the game clock across compact Index, Admin, and Eden X1 headers; restored Velo's three-round helmet mishap with correctly seated 2s, 4s, and 6s recovery waits between slips, escalating horn and eye reactions, and a final annoyed burst on visible launchers and chat headers; upgraded the compact mobile chat layout; and replaced the mobile More-menu entry with an always-visible bottom-right Velo icon while keeping a persistent desktop compact toggle.
- Made the Arcade overall leaderboard transparent by listing each played game and raw best score and calculating the overall rating as their direct sum.
- Merged renewed Arcade sessions into one leaderboard identity by normalized player name and state, keeping the highest score from every game while leaving same-name players from different states separate.
- Added searchable, filterable contribution snapshot reconciliation that resolves old OCR spellings to canonical player identities, queues multiple renamed-member matches for one cloud save, distinguishes automatic/OCR aliases from manual matches, preserves both snapshot names for audit, lets admins undo only manually saved contribution aliases, collapses repeated OCR fragments from overlapping screenshots before ranking or comparison, and makes each newly saved snapshot the active contribution/reward source while preserving the choice during edits.
- Made authenticated Admin boot use meaningful local data immediately while cloud, roster, conduct, and retry hydration continue without blocking; empty caches now retain Velo's loader until the primary cloud read completes or times out.
- Added a bounded 24-hour public Eden X1 dashboard cache so repeat visits paint useful rewards data immediately, refresh live data in the background, skip an expensive second render when the cloud revision is unchanged, and keep all four reward-category cards painted without requiring a second click.
- Prevented a different player name entered on the same browser from relabeling the previous player's Arcade rows or inheriting their local bests by assigning a separate score-profile identity on player switches.
- Restored a staged OCR-to-cloud progress bar in Admin Upload Structures and added a live bounded activity log for screenshot reading, retries, validation, merging, upload confirmation, cancellation, and errors.
- Made structure OCR uploads transactionally merge into the newest cloud dashboard so simultaneous mobile/desktop sessions cannot trigger a stale-revision collapse or erase one another; mobile now pins and reveals the live progress block, and Admin tab changes paint before rendering only their visible panel.
- Added an exact static Dragon Master calculator for Velo, including blue/purple/gold routes, already-crafted normal-gear scenarios, and per-piece/per-set diamond, Super Dragonite, and Dragonite totals without requiring personal-data access.
- Taught Velo to resolve Dragon Master route, set-versus-piece scope, and completed normal gear before calculating; ambiguous German terms such as `Rüstung` now receive one concise clarification, while per-piece Purple-route totals are correctly described as producing one final Gold DM piece.
- Made Velo a non-modal side panel on desktop and tablet so users can inspect and edit Research, heroes, and materials while the conversation stays open; phone-width chat remains a focus-contained modal.
- Reconciled the July 13 Eden vote export and latest three structure hits with the player identity authority, adding verified OCR aliases while preventing combined names such as `АЛЕКС & Kika` from being absorbed into another Kika account.
- Fixed Merge Rush's unreachable red-overload state by allowing the tray to reach its 10-piece danger threshold, using real elapsed time when mobile frames are throttled, and labeling safe, building, paused, and critical overload states in every game-shell language.
- Reworked Velo's opening suggestions around personal hero combos, saved Research guidance, and full account reviews; missing setup now produces direct toolkit actions, while the DM planner saves exact owned counts for all six gold pieces so Velo can include equipment inventory in account advice.
- Made saved-Research reviews compact and actionable by returning overall completion, per-tree percentages, maxed/not-maxed status, and only the highest-priority unfinished nodes instead of overflowing Velo with the full catalog.
- Replaced the mobile VTS Admin dock shortcut with Arcade while keeping Admin in More, moved hero-card info actions below troop metadata so portraits remain unobstructed, made Velo's launcher burst escape the compact icon, and replaced the oversized Admin/Eden shield loader with Velo.
- Added a paint-first Velo transition for Eden X1 navigation and reward-category changes, exposed the Friday 23:59 game-time voting cutoff with a direct vote action, renamed the mobile shortcut to My Stats in every language, and restored a narrow vertical scroll lane around mobile reward cards.
- Restored readable light-theme contrast throughout Hero Info popovers, including hero names, placement metadata, skill descriptions, highlighted values, copy counts, targets, and synergy chips on desktop and mobile.
- Fixed light-theme contrast and surface inheritance across every main tool, standalone Arcade cards, research and Dragon Master actions, Eden Map selections, shared footer text, and enlarged hero-detail hit targets while preserving compact icons; selected Generator heroes now use a clearer tinted surface, inset outline, and motion-safe confirmation pulse.
- Added semantic dark- and light-theme accents to Research buff-summary cards so Tactical Might, Might, Resistance, HP, Damage, Speed, and economy buffs are visually distinct while unknown effects retain their season color.
- Added the AI Strategy Assistant as a translated floating launcher and right-side drawer, backed by a dedicated Firebase Auth/App Check protected Cloudflare Worker with Gemini streaming, explicit per-session data consent, bounded tool calls, quotas, and local-only conversation history.
- Fixed Velo's Mary Tudor formation flow by aligning the Worker and browser tool contracts, preserving short follow-up intent such as “yes please,” making unsupported tool requests retryable, and preventing empty failed-response bubbles.
- Reinforced Velo's identity and selected-hero guidance, added read-only public VTS 1097 player context for names such as Abo/MalakAbo, linked Combo Generator setup from relevant answers, and kept private rosters and Eden ballots out of AI access.
- Expanded Velo's grounded strategy scope with combat-first Research priorities, Free/Paid and spender-tier planning, public Eden X1 guides and live leaderboards, player/reward/voting explanations, deterministic loyalty calculations, and an explicitly consented admin summary that is independently gated by the verified Firebase admin claim.
- Restored readable light-theme copy on the cinematic wing boot gate and moved Velo's thinking fire burst to originate at his mouth.
- Fixed AI chat startup and retries by rebuilding only complete history pairs, keeping a single drawer entry point, and aligning Gemini Interactions streaming with the current text, thought-signature, and function-argument event contract.
- Added per-piece decrement controls to Dragon Master full-set enhancement planning and deepened the Purple-route equipment background while preserving route-specific Blue and Gold treatments.
- Added the six exact Orange Dragon Master equipment cards so the Orange merge stage no longer repeats Gold artwork.
- Kept the Velo launcher contained on every main and standalone page, switched chat avatars to Velo's unhelmeted head, buffered streaming replies behind a mini fire-breathing state, fixed quota placeholders and the Charles the Great alias, and added a localized one-tap invitation to challenge the Arcade high scores.
- Propagated language changes across the main app, Velo, Admin, Eden X1, Arcade, and lazy-loaded tools; refreshed the German Dragon Master planner catalog and localized Velo's live response state in all 11 languages.
- Rebranded the VTS Assistant as “Talk with Velo,” with a layered little-dragon mascot, a looping oversized-helmet comedy animation, provider-neutral user copy, coordinated light and dark drawer themes, and Velo walking each shared loading rail from 0% to 100%.
- Unified Velo's motion identity across launchers, chat, loading rails, and Arcade games with calm breathing, delayed helmet inertia, squash-and-stretch landings, thinking and fire-breathing reactions, reduced-motion fallbacks, and a new-high-score celebration.
- Velo now recognizes questions about the user's saved Research status, requests the relevant permission when needed, and reads saved node progress instead of giving a generic game-account refusal; available privacy categories are preselected for one-click consent.
- Velo now consistently speaks as the warm little-dragon mascot and AI teammate of the VTS 1097 community, including more natural responses to affection and team spirit.
- Removed the redundant floating Bug and Data pills so fixed mobile controls no longer compete with the AI launcher and bottom navigation.
- Rebuilt the main shell around the selected 1c direction: compact aurora-glass header, one-row desktop tool rail with More overflow, mobile four-primary navigation plus an accessible More sheet, aligned dark/light/RTL states, and a compact modern footer.
- Reworked Manual Builder, Combo Generator, and Hero Atlas into compact task workspaces with grouped filters/actions, sticky mobile command bars and selection docks, clear empty/selected states, numeric podium styling, consistent squircle crops, and single-scroll Atlas details.
- Kept the Hero Atlas control deck in normal document flow so its search and filter controls no longer cover ranked hero cards on desktop or wide mobile layouts.
- Replaced the staged DM calculator with a mobile-first Dragon Master Command Center covering direct Gold, recommended Purple, and Blue routes; exact six-piece Dragon Master and normal-troop equipment art; verified route totals; normal equipment recipes; tier-by-tier merges; owned/needed/shortfall tracking; completion state; and save/export/share flows.
- Switched every DM equipment view to the captured Blue, Purple, and Gold game cards and removed the synthetic art gradients, tier frames, and hover color filters.
- Refined light-mode hierarchy across Manual Builder, Research, and Dragon Master planning; restored visible Gold recipe quantities, replaced placeholder resource squares with captured in-game icons, and removed the redundant route-comparison entry point.
- Simplified Dragon Master crafting around an always-visible Blue, Purple, or Direct Gold route choice, with complete cost and tier paths up front, a route-aware numbered recipe flow, no hidden equipment, materials, view, or completion controls on mobile, and restored Gold stockpile, normal-gear Dragonite, and final-piece resource inputs.
- Hardened Arcade leaderboard mapping so each game has one canonical score key, duplicate player/game rows cannot skew ratings, and exact overall ties rank deterministically.
- Kept Eden Map compact in the More tools sheet by replacing its expanded construction note with a single Soon badge.
- Rebranded all five Arcade games with a shared VTS/Velo play shell, concise localized instructions, visual control cues, smoother pause/frame handling, and synchronized light/dark themes without changing their score keys.
- Redesigned Research as a responsive catalog and dependency map with clearer tree states, resource/progress summaries, keyboard-safe MAX controls, dialog focus handling, and a viewport calculator.
- Made completed Research season bands collapse automatically, persist each manual open/closed choice across tab reopens and refreshes, collapse immediately after MAX all, and reopen after reset.
- Rebuilt YouTube around an on-demand featured player and selectable playlist rail so no third-party iframe loads until a member asks to watch, with timeout/retry and direct YouTube fallbacks.
- Added a standalone, member-facing Arcade lobby for five lightweight VTS mini-games, with responsive
  cards, shared theme/language controls, production-safe game and asset paths, anonymous cloud
  leaderboards, durable offline retries, automatic migration of existing device bests, and a timed
  Hero Rumble finish that submits its score.
- Added a deterministic, offline Ctrl/Cmd+K navigator for quickly finding every main tool and
  standalone page without sending queries to an external service.
- Polished Strife, Eden Loyalty, and Eden Map with compact mobile selector rails, readable result cards, locally scrolling toolbars, a collapsible map Mission panel, 44px controls, and contained 390px layouts while preserving the intentional Strife S0-X2 scope.
- Added a synchronized, privacy-redacted Admin Activity terminal with a bounded offline outbox, deduplication, filters, copy/export, admin-only Firestore access, immutable events, and 30-day expiry metadata.
- Added an optional admin-scheduled Eden voting deadline with localized datetime controls, autosave/clear actions, a public accessible live countdown, and expiry checks before both editing and cloud submission.
- Fixed the Eden dataset chooser dead end with real hydration/error/retry/dismiss states and saved selection; staged large Eden/Admin lists and corrected duplicate roots, clipped charts, table overflow, and mobile card containment.
- Removed post-X8 heroes such as Achilles, Al-Hawra, and Alberich from the X8 roster while retaining the intentional X8 catch-up pool; standardized squircle portrait framing and restored lightweight skin-card motion with reduced-motion support.
- Expanded all 11 locale packs for Research catalog/calculator actions, Arcade cards, the DM planner, Admin Activity terminal, structured admin logs, and Eden loader failures, with shared locale-safe number/date/percent formatting.
- Restored CSP-safe Research MAX and dynamic VTS Admin controls, removing blocked inline handlers while preserving click, keyboard, change, and input behavior.
- Added revision-fenced admin writes, edit-session protection from modal open, own-revision write queues, record fingerprints, serialized roster saves, conflict backups, and transactional conduct/structure edit/delete checks so concurrent devices cannot silently replace unsent work.
- Made combo and roster share links render their validated payloads, preserve the share URL, reject oversized input, and win over later cloud-profile restoration.
- Hardened service-worker updates and offline fallbacks, revalidated mutable assets, removed more than 4 MiB of source-only files from deployment, corrected entry-CSS enforcement, added gzip, per-page CSS, complete-artifact, media, and file-count budgets, and smoke-tested the built artifact plus service worker.
- Regenerated inline-script CSP hashes from browser-normalized source during each build and made Eden X1 localized startup rendering null-safe, eliminating preview-only console errors before dashboard data arrives.
- Improved accessible labels, status regions, upload-zone keyboard support, validation focus, destructive confirmations, image fallbacks, retry controls, and i18n attribute coverage across the main and admin surfaces.
- Unified PR and production verification under `deploy-verification`, scoped deploy secrets/permissions, blocked non-`gh-pages` manual deploys, added CODEOWNERS and release-version/build-environment checks, restored all test sources to Git, removed unreferenced workspace artifacts and obsolete mutation scripts, and documented the intentional Strife S0-X2 boundary.
- Added a Firebase Hosting preview-channel gate before release commits: the version-derived,
  Hosting-only deploy runs the full local suite, expires after seven days, and smoke-tests the exact
  online URL before the protected GitHub Pages pull-request flow begins.

## 13.1.11 - 2026-07-10

- Eden X1 startup/tap freeze fix: the public Weighted Total Contribution table (200+ players, each with four popovers) now renders the first 50 rows with a "Show all N players" button, and its search is debounced (150ms). This removes the long main-thread block on load and while typing. The reward-flow view tables are capped the same way.
- Combo Generator: on very narrow phones (≤340px) the hero avatars shrink so a 3-hero combo fits without the third avatar clipping.
- Updated a smoke test to allow the new popover X close control in the conduct popover's text (the 13.1.10 popover X button had broken this exact-text assertion, which blocked that deploy). The 13.1.10 Eden X1 popover X button and reward-flow card fixes ship together here.

## 13.1.10 - 2026-07-10

- Eden X1 score/reward/rank/conduct popovers now have an explicit X close button (in addition to click-outside and Escape), so touch users can dismiss them reliably. The mobile bottom-sheet reserves space so the X and drag handle don't overlap the content.
- Fixed Eden X1 reward-flow card titles clipping/overlapping the step badge on mobile — long titles ("Total Contribution", "R4 / Management") now wrap instead of being cut off.

## 13.1.9 - 2026-07-10

- Added an "Export CSV" button (and `window.exportEdenX1Votes()` console helper) to the VTS Admin → Eden X1 Votes panel. It exports the currently loaded Team-Player ballots as one row per candidate selection (season, voter name/key/uid, choice rank, candidate name, candidate key, normalized-name key, updated time, vote id) so names can be audited for typos and near-duplicates in a spreadsheet.
- Moved the destructive-action admin override (Clear All + per-record delete) to build-time secret injection: `scripts/inject-admin-auth-config.mjs` now fills `clearHash`/`deleteHashes` from the `VTS_ADMIN_OVERRIDE_CODE` (raw code, hashed at build) or `VTS_ADMIN_OVERRIDE_HASH` secret, so no override hash is ever committed to the public repo.

## 13.1.8 - 2026-07-10

- Hotfix: Eden X1 showed "Firebase is not configured. Cannot load data." and rendered nothing but the static reward boxes. The 13.1.7 lightweight Firebase split changed `initFirebase()` to return `{ app, auth, configured }` without a Firestore `db`, but the Eden boot code still destructured `db` from it and bailed as unconfigured. The page now creates the Firestore Lite instance from `getFirestore(app)` after auth, as intended. Anonymous auth and voting were untouched.
- Corrected `js/state.js` `APP_VERSION`, which was left at 13.1.6.

## 13.1.7 - 2026-07-10

- Mobile polish: reward-flow step badges no longer overlap card titles and long titles wrap instead of clipping; the fixed bottom quicknav got an opaque blurred backdrop; busy admin buttons show a visible spinner instead of an invisible one; long tab labels and stacked-table labels ("Contributions", "CONTRIBUTION") no longer break mid-word; top-performer names are no longer clipped; the language picker is wide enough to read; the disabled Ex-Guild upload button keeps readable text; long decorated player names in the weighted table no longer spill past the card edge.
- Admin refresh now paints its busy spinner before the heavy dashboard render, and the OCR progress bar moves within each image scan instead of freezing between images.
- OCR screenshots are re-encoded as JPEG (capped at 2200px longest side) before upload — multi-MB PNG scans that took 100s+ on mobile now upload a fraction of the bytes; falls back to original bytes on any error.
- First-time visitors now start in their browser's language when one of the 11 supported translations matches, instead of English.
- Fixed Eden X1 main-thread startup stalls: deferred blocking SDK init and staged the dashboard boot so the page is interactive sooner.
- Synced public version labels, README, changelog, and app constants to 13.1.7.

## 13.1.6 - 2026-07-10

- Allowed the Firebase auth helper iframe (`abocombo.firebaseapp.com`) in the `frame-src` Content-Security-Policy of `index.html` and `admin.html`, matching the Eden X1 fix from 13.1.5 — admin sign-in no longer logs CSP violations.
- Synced public version labels, README, changelog, and app constants to 13.1.6.

## 13.1.5 - 2026-07-10

- Eden X1 page performance overhaul (Lighthouse mobile score was 25). Stylesheets no longer block first paint: critical loading-state CSS is inlined, the seven CSS files are preloaded in `<head>` and applied at the end of `<body>`, and `maintenance-config.js` moved to a deferred body-end script.
- Split the Eden X1 dashboard render into stages: the weighted table paints first, then the browser gets a frame before the heavy public dashboard (analytics, charts, attack history) renders, cutting the main-thread block that froze phones. Off-screen public sections now use `content-visibility: auto` so they render only when scrolled near.
- Fixed layout shift (CLS 0.389) by reserving the weighted-table area while data loads.
- Firebase Analytics now loads in the background instead of blocking every page's Firebase boot on the gtag CDN chain.
- Fixed a Content-Security-Policy error: the Firebase auth helper iframe (`abocombo.firebaseapp.com`) was blocked by `frame-src` on the Eden X1 page, spamming console errors during sign-in.
- Added a `preconnect` hint for `www.gstatic.com` so Firebase SDK downloads start their connection earlier.
- Synced public version labels, README, changelog, and app constants to 13.1.5.

## 13.1.4 - 2026-07-10

- Replaced timestamp-based local restore prompts with revision-guarded cloud sync. A reachable cloud dashboard is now authoritative on every device; a conflicting local snapshot is backed up instead of being offered as an automatic overwrite.
- Full dashboard writes and queued retries now run through Firestore transactions tied to the exact cloud revision they started from. A second device can no longer use a stale cache to replace a newer cloud snapshot.
- Added a required `syncRevision` field to dashboard rules. The first 13.1.4 write safely migrates the existing document; older cached clients are rejected rather than allowed to overwrite current cloud data.
- Made Eden X1 roster, vote-settings, and bonus-team-effort reads optional after a short timeout, so a stalled secondary query no longer leaves public voters frozen at 80% once the main dashboard snapshot has loaded.
- Synced public version labels, README, changelog, and app constants to 13.1.4.

## 13.1.3 - 2026-07-10

- Replaced the Eden X1 loading card's static 72% / `...` placeholder with real progress tied to Firebase imports, anonymous sign-in, Firestore reads, and the public conduct-adjustment load. The progress caps below completion until the dashboard is actually ready, and stale retries cannot update a newer attempt.
- Hardened admin refreshes so a delayed or failed request cannot replace a newer cloud snapshot with its older local fallback. Firestore now requires a timestamp on every dashboard write and rejects timestamp regressions, blocking older cached clients after the first stamped update.
- Added regression coverage for the Eden loader's real initial progress plus the dashboard timestamp and refresh-ordering contracts.
- Synced public version labels, README, changelog, and app constants to 13.1.3.

## 13.1.2 - 2026-07-09

- Fixed dashboard data loss where a stale client could silently overwrite newer cloud data (this erased the Tuesday/Thursday structure uploads, reverting the dashboard to Sunday's snapshot): every full-document cloud write now carries an `updatedAtMs` stamp and is checked against the cloud document's timestamp first.
- Queued offline cloud writes are discarded (with a translated warning) instead of replayed when the cloud already has newer data — a days-old queued snapshot can no longer erase newer uploads at the next admin sign-in.
- Live saves from a session whose cloud view is behind (e.g. it booted from the local fallback while the cloud read stalled) are blocked with a "refresh first" warning instead of overwriting newer data.
- When a device holds newer local dashboard data than the cloud, the admin boot now keeps a local backup snapshot (`vts_ocr_dashboard_backup_v1`) and offers to restore the newer data to the cloud instead of silently discarding it.
- Fixed the Eden X1 public Weighted Total Contribution table so Support Work winners show the same planned final reward as the reward-flow support table.
- Synced public version labels, README, changelog, and app constants to 13.1.2.

## 13.1.1 - 2026-07-09

- Fixed the Eden X1 page getting stuck on the loading panel forever on flaky mobile connections: Firebase CDN imports now retry with backoff, the data load has a 20s timeout, and failures show a translated error with a Retry button instead of an endless spinner.
- Overhauled the service worker: the precache manifest is rebuilt from the actual deploy output (including hashed chunks), HTML/CSS/JS precaching is atomic per version, cache keys keep their `?v=` stamps so old and new assets can never mix, the previous deploy's cache is retained for already-open pages, gstatic Firebase modules are cached for offline use, and forced full re-downloads (`cache: 'reload'`) were removed.
- Fixed service worker registration silently never happening when app startup finished after the window load event.
- Removed the fragile mobile `font-size: 0` + `::after` hack on the seasonal VTS Admin tab that rendered the button blank when cached CSS versions mixed.
- Hardened stale-asset recovery reloads with an in-memory guard so blocked sessionStorage can no longer cause reload loops.
- Synced public version labels, README, changelog, and app constants to 13.1.1.

## 13.1.0 - 2026-07-09

- Aligned version strings to 13.1.0 across package config, HTML pages, README, and JS state modules.
- Performed pre-flight security and layout audit for the roc-vts.com release.
- Verified that Firestore security rules are fully synchronized with all active v13.1.0 schemas and collections.
- Audited responsive utility styles and flex elements for viewport widths down to 360px to prevent overflow or text clipping.
- Confirmed navigation tab switching, hashchange events, and popstate handling prevent CLS and dead ends.

## 13.0.3 - 2026-07-07

- Merged the Eden X1 voting helper's separate banner and pathing cards into one wider "Most Banners & Paths" helper ranked by combined banner/path support.
- Widened Eden X1 helper-card columns and reduced value-column reservation so long player names have more usable room on PC.
- Added translated combined banner/path labels and regression coverage for the five-card helper layout.
- Synced public version labels, README, changelog, app constants, i18n keys, and smoke coverage to 13.0.3.

## 13.0.2 - 2026-07-07

- Fixed the Eden X1 vote settings Firestore document path so public/admin pages no longer throw an invalid document reference before falling back to defaults.
- Kept DM Materials in Coming Soon state, moved its main-nav badge to "Soon", and stopped the staged calculator module from loading in production tabs until launch.
- Added Manual Builder skin mode with translated filter text, localized skin-count badges, skin portraits, and visible skin badges using the existing skin dataset.
- Synced public version labels, README, changelog, app constants, Firestore rules/tests, and smoke coverage to 13.0.2.

## 13.0.1 - 2026-07-06

- Moved Eden X1 Team Players vote admin into its own VTS Admin subtab with voting-open/editing/public-result controls, current ballots, and immutable edit-history review.
- Added Firestore validation for Eden X1 vote history and vote settings documents; these rule changes require a Firebase rules deploy before live cloud vote history/settings work.
- Changed Team Players voting helper UX so the top-name tables are reached from a translated "Need Help With Voting? - View Top Names" jump link; mobile starts helper cards at top 3, then expands to top 5 and top 10.
- Kept saved vote fields quiet on reload so confirmed names do not reopen suggestion panels until the user focuses or types in a field.
- Compressed structure-hit trend x-axis spacing to Eden X1 attack windows only: Sunday, Tuesday, and Thursday game-time windows count; blocked days no longer take visual width.
- Preserved forfeited premium-rank names in the Total Contribution table with a skipped-premium label so generosity is visible while reward slots continue to the next eligible player.
- Synced public version labels, README, changelog, app constants, i18n keys, and regression coverage to 13.0.1.

## 13.0.0 - 2026-07-06

- Added a DM Materials tab as a Coming Soon placeholder while the Dragon Master material calculator remains staged for a later launch.
- Expanded Eden X1 Team Players voting to four teammate picks with resolved roster-name selection, confirmation chips, clear controls, invalid-name nudges, translated saved-vote messages, and a final-results timing note.
- Updated Eden X1 reward slots so R4 / Management and Team Players both expose three reward rows, and tightened Firestore vote validation/tests for four unique candidates.
- Post-push polish: Team Players voting now accepts one to four unique votes, asks for a second confirmation on partial ballots, blocks duplicates without saving, offers a one-click self-vote shortcut, and places the translated "Vote here for Best TeamPlayers" tag on the Team Players reward card.
- Added translated calculation info chips to Eden X1 player stat tiles and clearer helper-card labels with one-line explanations; helper lists show five rows by default and can expand toward the top ten when more data exists.
- Documented that GitHub Pages deploys do not push Firestore rules, so public Team Players vote rule changes require a separate Firebase rules deploy before live cloud writes pass.
- Reworked Total Contribution reward ordering to use current contribution plus ex-guild contribution for final reward rank, while keeping R5 Bonus Team Effort Points visible as support signal data rather than reward-rank input.
- Finalized the post-queue Eden X1 polish: Support Work now ranks the top four by combined support signals, helper cards dropped the separate Shield Wall list, long Kika helper names display as `Kika`, and helper expansion uses compact arrow controls.
- Added MVP on Buildings and R5 Bonus Team Effort Points guidance cards, renamed helper guidance with clearer plain-language labels, added translated helper hints, centered helper headings, and completed the new i18n strings across all 11 languages.
- Improved Eden X1 public/table UX with sortable weighted-contribution columns, better chart x-axis labels, fuller Attack History height usage, tighter dashboard gutters, and consistent card/table start-end alignment.
- Added matched-name confirmation tags to Shield Wall and R5 Bonus Team Effort summary tables so uploaded aliases visibly map back to confirmed roster names.
- Raised the measured CSS size budget for the larger Eden X1 route split: Eden X1 CSS cap 36 KiB -> 52 KiB and total CSS cap 560 KiB -> 576 KiB.
- Reconciled the GitHub Copilot audit: the release keeps the already-resolved admin custom-claim gate and i18n validation improvements, while broader recommendations such as comment rate limiting, Dependabot SLA, CSP hardening, and long-term type/JSDoc coverage remain non-blocking backlog.
- Synced public version labels, README, changelog, handoff notes, and app version constants to 13.0.0.

## 12.4.1 - 2026-07-06

- Marked Wicked Russian with the R4 management badge in Eden X1 management slot rows.
- Revised Eden X1 and VTS Admin consistency scoring so inactive or tiny-sample players no longer appear as perfect steady contributors.
- Added accessible pressed/selected state handling for the main theme toggle and tab pills.
- Tightened comment Firestore rules so reply `parentId` values must be null or bounded safe document-id strings.
- Locked Eden X1 vote documents to each authenticated voter id so duplicate vote documents cannot be created by changing Firestore ids.
- Fixed Eden X1 Support Work rewards so only players with real support points are eligible, preventing raw Guild Master reward overrides from appearing in the support table.
- Kept support reward labels scoped to Support Work rewards and added regression coverage for MalakAbo's forfeited Guild Master reward case.
- Added +1 Bonus Team Effort Points for `Феечка))` and `Obliterated` for helping connect roads to structures.
- Bounded VTS Admin cloud boot and save attempts so Firestore proxy/network failures fall back to local cache instead of leaving the connecting overlay stuck.
- Treated Firebase's known internal Firestore watch-stream assertion as a recoverable local-cache fallback and tightened sign-out listener cleanup.
- Raised the CSS size-check ceiling by 1 KiB for the measured 12.4.1 admin/translation layout baseline.
- Synced public version labels, README, and app version constants to 12.4.1.

## 12.4.0 - 2026-07-05

- Fixed VTS Admin dashboard grid alignment so analytics, insights, attack history, and leaderboard panels keep the tightened gap-free layout.
- Improved Ex-Guild contribution matching by keeping search responsive across the full contribution list and clarifying the dark-theme match controls.
- Expanded VTS OCR player alias handling with confirmed variants from the debug export while preserving protected separate accounts.
- Synced README, changelog, planning notes, public footer labels, and app version constants to 12.4.0.

## 12.2.1 - 2026-07-04

- Broadened ESLint coverage to every JavaScript module and script while keeping the newly covered pass focused on correctness checks.
- Added Autoprefixer to the Vite/PostCSS pipeline so browser prefixes are generated by the build instead of maintained by hand.
- Aligned R5 Bonus Team Effort Points cloud writes with the same shared admin Firestore context used by the dashboard.
- Fixed Eden scout Firestore helpers so the newly widened lint pass catches no undefined Firebase calls.
- Documented the shared Firebase Email/Password admin flow and the one-writer rule for the live `gh-pages` branch.
- Cleaned `.gitignore` so new test files are not accidentally hidden.
- Added visible cloud-sync recovery states and widened dashboard Firestore validation for newer auxiliary records.

## 12.1.1 - 2026-06-26

- Added compact summary tables above Banners and Pathers / Speed Tile Plans so all uploaded duty records can be reviewed before the detailed OCR rows.
- Polished the admin dashboard connecting animation with layered scan, route, particle, and progress motion.

## 12.1.0 - 2026-06-25

- Replaced VTS Admin guest/local-password access with a shared Firebase Email/Password login that maps username `1097` to `1097@abocombo.web.app`.
- Gated OCR dashboard and roster cloud writes behind the Firebase `admin` custom claim, while keeping public toolkit features on anonymous auth.
- Removed the signup/approval request flow and added loud cloud-sync failure states for missing admin auth or permission-denied writes.
- Fixed the Firebase admin-claim helper for the current `firebase-admin` modular import shape.
- Updated smoke/unit coverage for the shared admin login, cloud-stall local fallback, Firestore admin rules, and auxiliary admin list cloud sync.

## 12.0.0 - 2026-06-25

- Added a unified v12 command-center design layer across the main toolkit, hero cards, filters, saved/generated combo panels, research, Eden, loyalty, comments, admin cards, tables, and OCR terminal surfaces.
- Normalized the visual system around compact 8px surfaces, dark-first tactical colors, cyan/amber/green action states, stronger focus rings, and matching light-theme overrides.
- Loaded the v12 redesign stylesheet on both `index.html` and `admin.html`, and updated public version labels and documentation to 12.0.0.

## 11.5.0 - 2026-06-24

- Removed duplicated OCR dashboard CSS from `app.css` and `mobile.css`; dashboard styles now live only in `ocr-dashboard.css`.
- Unified the Analysis Terminal log across all VTS Admin subtabs (Dashboard, Analytics, Contributions, Upload Structures, Pathers, Banners, Shield Wall, Roster).
- Hardened mobile UX: added `viewport-fit=cover`, eliminated iOS input zoom, increased touch targets for info buttons, combo delete, comment actions, and dashboard delete buttons.
- Added keyboard-aware layout via `visualViewport` so fixed bars reposition correctly when the on-screen keyboard opens.
- Replaced emoji/ASCII icons in Eden Map and Loyalty toolbars with consistent inline SVGs; added colored ownership/status dots to replace colored emoji circles.
- Improved dashboard loading feedback: persistent "Last synced" timestamp, refresh button busy state, and cleaner busy overlay styling.
- Removed committed Firebase fallback keys; Firebase browser config now comes from `VITE_FIREBASE_*` environment values during Vite builds.
- Lazy-load Firebase App Check so comments and anonymous auth do not trigger reCAPTCHA/App Check token requests unless OCR explicitly needs them.
- Bumped public version labels to 11.5.0.

## 11.3.3 - 2026-06-23

- Added a VTS Admin Total Contribution subtab for OCR screenshot intake, manual row paste, reviewed contribution tables, top-20 premium reward defaults, per-row reward overrides, and CSV sheet export.
- Added contribution-list smoke coverage so the new admin subtab, panel, and upload dropzone stay wired in future dashboard changes.
- Updated public version labels and documentation for the 11.3.3 release.

## 11.3.2 - 2026-06-23

- Fixed OCR player summaries and player CSV exports so same-target Kika-family duplicate rows with different ranks/values split into separate accounts instead of merging into one reward total.
- Updated dashboard analytics aggregation to use the same context-aware player identity split for player trends, structure MVPs, participation heatmap counts, and at-risk streak checks.
- Added a regression test proving same-upload Kika rows remain separate summaries.

## 11.3.1 - 2026-06-23

- Tightened generated combo result cards with a denser strip layout, normalized portrait sizing, score-relative progress bars, and clearer clickable counter badges.
- Changed generated combo scoring to normalize against the user's buildable candidate pool, so unavailable later-season combos no longer lower earlier-season results.
- Added VTS counter relationships for the current top skin-mode results: Beowulf/Ramses II/Theodora counters the Arthur and Octavius lanes, Octavius/Rozen/Caesar counters Arthur/Cleo/Bleeding Steed, and Hunk/Boudica/Sakura is marked as a soft counter to Octavius/Rozen/Caesar.
- Documented the release cadence: patch releases run through `.19`, then the next release bumps the minor version.

## 11.3.0 - 2026-06-23

- Added Firebase admin-claim tooling and clearer deployed-admin warnings so OCR cloud sync, roster snapshots, and Eden shared intel writes can be configured from the repo instead of failing with generic permission errors.
- Optimized Eden map runtime structure markers by replacing multi-megabyte PNG icons with small WebP marker assets and keeping heavy source art out of the service-worker app shell.
- Fixed Strife Over Dragon recommendations to respect hero release-season progression when selecting S0-X8 availability.
- Reworked boot loading wing timing and service-worker precache behavior from the A-to-Z QA pass.
- Updated README, changelog, session log, and public version labels for 11.3.0; future pushes should increment patch versions.

## 11.2.0 - 2026-06-22

- Split VTS Admin structure uploads into a dedicated Upload Structures tab while keeping the existing structure OCR, recording, and analytics logic unchanged.
- Reworked the visible Banners workflow into a Banners List duty tracker with image/paste intake and roster-name confirmation.
- Added Pathers and Shield Wall duty tracking, including nickname/near-name matching against the existing roster database before records are saved.
- Added shared duty history storage so officers can review repeated Banner, Pather, and Shield Wall appearances by confirmed roster name.
- Synced public version labels and README release notes for 11.2.0.

## 11.0 - 2026-06-22

- Synced the public app version, README, footer, and What's New version key for the 11.0 release.
- Consolidated OCR/admin summary building so player rankings, unique-structure counts, exports, and cached dashboard data use the same canonical calculation.
- Fixed OCR analytics sorting, target-filter behavior, heatmap start-hour bucketing, and persisted log error styling.
- Included the latest Eden live-map/session planning updates and generated map assets from the parallel project sessions.

## 11.0.2 - 2026-06-20

- Added an audit-first importer for public Rise of Castles combo datasets, with S0-X8 filtering, local hero alias mapping, duplicate detection, and review-only candidate output.
- Added attribution for the Rise of Castles Tools team/community in the importer outputs and README.
- Added unit coverage for the combo importer normalization, skin-code conversion, acceptance rules, and duplicate reporting.
- Improved X8 catch-up hero icons with supplied clean AVIF assets and adjusted card image framing.
- Added skin-rank combo support so curated skin combos can use must/recommended/optional slot requirements without replacing the base ranking.

## 11.0.0 - 2026-06-20

- Removed the maintenance splash and startup gate for the live release.
- Bumped the public app version to 11.0.0.
- Added dynamic loading for heavier Research, Hero Atlas, translation, Firebase, and Eden-related modules/assets.
- Expanded the skin database with pending-detail biography skin records and local WebP skin icons for the S0-X1 skin combo pool.
- Improved small-screen Research tab layout and generated combo card sizing.
- Added a What's New version banner, global keyboard shortcuts, undo toasts for destructive actions, and JSON user data import/export.
- Added Firestore-backed client error reporting plus a floating bug report widget with screenshot capture.
- Improved OCR scan feedback with retry/status progress and a cancel action.
- Added Hero Atlas URL filter params and expanded Eden map share links to include the full plan store.
- Added README screenshot previews for the Combo Generator, Eden Map Planner, and OCR Admin entry view.
- Added `CONTRIBUTING.md` with community data-update guidance for heroes, combos, skins, Eden screenshots, OCR examples, and translations.
- Removed overlapping internal maintainer and AI-agent notes so public docs consolidate around README, CONTRIBUTING, and CHANGELOG.
- Added `docs/media/` as the home for README screenshots and future workflow GIFs.
- Moved Eden Python tooling from `database/` to `scripts/eden/`, leaving `database/` for source datasets.
- Removed stale one-off helper scripts and the obsolete Firebase hosting config.

## 10.4.0 - 2026-06-20

- Added the X8 catch-up hero wave covering original X4, X5, X6, X7, X8, and SP heroes.
- Added local in-game hero icon assets cropped from the supplied screenshots.
- Added max-level skill data for the new heroes, plus the missing X1 Ragnar entry.
- Added X8 season filters and catch-up helper notes for X1, X2, and X8 season brackets.
- Added original-release badges so X8 cards can still show their source season.
- Synced app version and service-worker cache versions for the new dataset.

## 10.3.0 - 2026-06-20

- Upgraded the boot splash to use the real Dreamy Wings and Blazing Soul wing assets as layered door art.
- Added lightweight boot particles, parallax tilt, a pulsing gate beam, and smoother status text swaps.
- Reworked the center gate lock into a glowing portal-style emblem without adding extra image dependencies.
- Removed the remaining old gate/deck UI wording from the header and boot label.
- Synced app version and service-worker cache versions for the new boot animation.

## 10.2.0 - 2026-06-20

- Activated the Eden Map planner from the construction gate for the next planning pass.
- Added a user-supplied Strategy Floor layer using the East/West Central base map.
- Highlighted West Central and East Central as the next-week focus sectors on the floor layer.
- Made the Strategy Floor the clean default view, with structure markers available as an optional overlay.
- Added smoke coverage for the live Eden floor layer, construction gate, and default layer state.
- Added translated labels for the new Eden floor controls and focus badges.
- Synced root and build service-worker cache versions for the new map asset.

## 10.1.0 - 2026-06-20

- Moved combo counter data into `js/counter-db.js` with reusable lookup and validation helpers.
- Upgraded counter panels with animated open states, compact matchup cards, reasons, and "Use this counter" actions in the Generator.
- Added Hero Atlas counter sections so each hero can show lineups they counter and lineups that counter them.
- Added smoke coverage for the counter database, Generator counter panels, counter reuse action, and Hero Atlas counter view.
- Started the repo versioning flow with this changelog.
