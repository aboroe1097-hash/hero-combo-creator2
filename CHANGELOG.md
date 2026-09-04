# Changelog

## 16.0.1 - 2026-09-04

- Restored the X12 research season selector. All 30 Charge nodes are editable in a list without invented topology or unlock rules; Defense retains all 29 nodes and now discloses the source's conflicting cost totals.
- Fixed the research planner re-normalizing already normalized families and silently replacing their costs with zero. X12 estimates retain their unverified status while source gaps remain.
- Renamed Codex to Hero Tables across supported languages. Restored hero-detail opening and keyboard return focus, kept deselected season filters reachable, explained combo-derived ratings, and hid empty duel sections.
- Added a shared local portrait-unavailable image for the X10/X12 heroes whose artwork has not yet been supplied, preventing broken images across roster consumers without misidentifying their portraits.

## 16.0.0 - 2026-09-03

- **VTS Player Alias Reconciliation**: Folded decoration, whitespace and case variants of the same account into one identity across leaderboards, contribution matching and weighted scoring, adopting Moldo1313 and D O F F Y as display names. Sixteen owner-confirmed merges join spellings whose letters differ — FALLEN across eight homoglyph forms, Made3110 across nine prefixes, Dobby, пупОк, Shabir and the rest — recovering demolition points that had been stranded on unmatched spellings. Just as importantly, accounts previously folded into their owner are now separated: DvD18 / DvD18 x2, BOiiE / BOiiE BANNER, ANGEL / Angel Banner and the Kika main, alt and banner accounts each score independently. Matching stays exact after normalisation, with no fuzzy or confusable fallback, and new OCR spellings must be confirmed before they resolve. Historical attack rows are unchanged.
- **CSS Token Authority & Theme Refactor**: Established centralized theme token authority across dashboard and Eden surfaces, retiring ~357 redundant override rules while maintaining strict net-negative route CSS budgets. Normalized colliding 768px responsive boundaries and enlarged touch targets. Tokenized the account/profile surface, the command palette, the AI drawer and the Royal Bounty guide so light theme resolves through the token chain rather than hand-written overrides.
- **Seasons & Roster Expansion**: Landed X10 and X12 season scaffolding and integrated the nine free plus two paid heroes into the canonical roster (expanding the roster from 78 to 89 heroes), with tower profiles for the paid pair and synchronized Firestore security rule allowlists and caps. X10 is an intermediate bracket carrying only Healer and Hellfire; the research ladder skips it entirely and runs X8 to X12.
- **Codex Data Platform**: Introduced a scalable dataset pipeline with pipe-delimited source tables, gzipped on-demand payload streaming, strict provenance verification, and hero alias quarantine protection.
- **Hero Atlas Codex & Field Data**: Added unified multi-table Codex browsing (Free, Paid, Skins+Paid), full 1–8 skill drawer inspection, and the Battle Simulator Field Data evidence panel with match resemblance metrics.
- **Progression Planners & Preset Engine**: Shipped the unified Research Cost & Progression Planner, Castle Development Planner, Stamina Projection Calculator with shareable alliance operation cards, and a shared Specialty Preset Engine with cross-tool adapters.
- **X12 Research Trees**: Imported X12 *Melee Legion - Defense* (with 29/29 screenshot-backed layout positions) and *Charge* (with explicit absent-tree gap handling) into the tech database, advancing the research season ladder to X12.
- **Localization**: Attained 100% key parity across all 13 supported languages for core, atlas, battle simulator, and planner surfaces.

## 15.0.15 - 2026-09-01

- Restored the missing More action to the fixed mobile navigation so Arcade, Battle Simulator, DM Materials, Strife, YouTube, and VTS Admin remain reachable from phones.
- Compacted the mobile header, kept the inline account control in the utility row, and preserved full-size controls down to 320px without the stray third row.
- Updated the public VTS leadership badge roster: Loony is now R4, while Zubbs no longer receives the R4 badge; Zubbs aliases remain grouped for historical records.
- Added each player's structure demolition to Weighted Total Contribution at a temporary 1:20 rate, so 1,000,000 demolition contributes 50,000 weighted points for every admin role.
- Moved substantive Velo requests to DeepSeek Reasoner with a verification round and a larger shared reasoning/output budget; short standalone questions still use the fast chat model.
- Updated the compatible frontend CSS toolchain to Autoprefixer 10.5.4 while retaining the Node 20-compatible cssnano 8 and Vite 6 build path.

## 15.0.14 - 2026-08-28

- Signing in now returns you to the tool you came from instead of leaving you on the account page, and new accounts finish onboarding before being redirected.
- Fixed the mobile account chip covering the theme and language buttons; on phones a tap on the theme toggle opened the account page instead of switching theme.
- Rating every player is now required when filing a BoH match result, and the scale is shown as "/ 10".
- A refused save now says the server rejected the write and the security rules may be out of date, instead of claiming you are not signed in.
- Fixed the language coverage report claiming 26 missing translations per locale that were in fact already translated.
- Corrected stale version labels on the account, VtsScore and maintenance pages, and gave the 404 page a mobile layout.
- Removed the retired Eden X1 links from the admin header and footer.

## 15.0.13 - 2026-08-26

- Added bulk row pasting to Bonus Team Effort so conduct adjustments can be entered as `player | points | reason` lines in one action.
- Added admin-submitted team conduct suggestions with visible attribution and a super-admin approval or rejection workflow.
- Restored VtsScore as a dedicated super-admin leaderboard tab and replaced the legacy All-Star command center with the focused BoH match-results workflow.

## 15.0.12 - 2026-08-18

- Reworked the playbook Day 1 route around the loyalty build: unlock and build the Assault and Guardian Fortresses before resetting, run the all-Green Frontline Workshop honor setup, then reset into the Blue tree (left & right) for loyalty and processing; tile Farm, Marble, and Ale nodes for Coalition Base Camp upgrades, and stay in the loyalty build for the first weeks before switching to an alliance role.
- Replaced the Eden Tips & Guides screenshots with the actual in-game specialization captures: Demolition, Speed Tiling (main plus the optional 14–20 Blue reference), Structure Honor (40 Green), Tiling Honor, and Fortress Unlock.

## 15.0.11 - 2026-08-18

- Fixed a crash in the Artifact calculator that showed “Artifact Calculator failed to load” whenever heroes were selected in the generator (or synced from an account roster); the Sword path planning now reads the analyzed hero mechanics correctly.
- Fixed the Artifact tree board image on the live site, which loaded from a doubled asset path.

## 15.0.10 - 2026-08-18

- Fixed the Eden Playbook Week 1 “Balancing Income & Production” tool link so it reliably opens the Eden Loyalty subtab instead of staying on the playbook when a stale subtab intent was present.
- Reassigned the DrThunder in-game route screenshots across the playbook timeline: Day 1, Day 2, and Week 1 now share the two route references, and the Role entry no longer repeats them (full routes remain in Eden Tips & Guides).
- Improved the Loyalty Targets layout with centered copy, tighter centered income-jump cards, a gradient card accent, and balanced spacing.

## 15.0.9 - 2026-08-18

- Reworked Artifact node leveling with direct numeric entry, −5/−1/+1/+5 controls, and a one-click prerequisite-aware MAX action that funds only the required path before maxing the selected node.
- Improved the Artifact inspector layout for faster desktop and mobile use while preserving keyboard access, RTL, and dark/light themes.
- Added a hero-targeted Sword path driven by the heroes selected in Heroes & Combos, their analyzed skill mechanics, a prerequisite-valid node order, board step markers, and exact-node share links.
- Added the interactive DrThunder Eden Loyalty Playbook with separate day/week and topic-guide flows, six specialization-role references, a responsive HTML income table, detailed poison strategy, 13 contextual in-game visuals, responsive themes, deep links, and prominent original-author credit.
- Added a global “Share this exact view” control and canonical subtab/section URL state so tool, Artifact-node, and Eden Playbook links can be passed directly to other players.
- Clarified navigation status with Hub badges on primary destinations plus Beta/New badges on Towers, Artifacts, Eden Playbook, and Royal Bounty Eden X2 subtools.

## 15.0.8 - 2026-08-18

- Added the official Royal Bounty Alliance 2.0 Aiding Skills overview to the Eden X2 bounty guide, with responsive sizing, accessible context, and source credit to riseofcastles.net.
- Optimized the reference image for fast mobile loading while preserving the original in-game text and visual detail.

## 15.0.7 - 2026-08-18

- Corrected the X2 Artifact tool to make **Sword of Judgment** the current default instead of the not-yet-available Redemption Grail.
- Added the complete 33-node Sword tree with exact level costs, prerequisites, stage layout, Sword Emblem and Artifact Soulstone totals, node icons, and in-game Sword artwork.
- Kept Redemption Grail data available for a future release without presenting it as current X2 content.

## 15.0.6 - 2026-08-18

- Replaced the Artifact board's synthetic gradient with the exact in-game Redemption Grail capture embedded in the source sheet, including its Grail silhouette, ruins, node rings, and branching frame.
- Refined the mobile tracker into a centered, pannable game board with the board before the inspector, compact two-column resource totals, cleaner actions, and level badges shown only for the selected or upgraded nodes.
- Preserved readable dark and light surfaces, 44px mobile node targets, keyboard focus, and the existing 40-node calculation and account-sync behavior.

## 15.0.5 - 2026-08-18

- Added the new **Artifact Calculator** subtool under the Research & Towers Hub with full support for **Artifact One: Redemption Grail**.
- Transcribed all 40 nodes across 4 tiers directly from the community research database: Skill 1 (Sacred Light, 10 levels RGE), Skill 2 (Sacred Flame, 20 levels RGE), Branch 2a/2b Apex (Holy Grail & Enhanced Grail, 25 levels RGE each), and Skill 4 (Divine Radiance, 50 levels RGE), plus 35 Artifact Soulstone (AS) upgrade nodes with accurate costs (11,707 total RGE, 107,280 total AS).
- Recreated the Redemption Grail's in-game branching board as 40 interactive gold-framed nodes, with exact Emblem and Artifact Soulstone icons, per-node level controls, resource totals, search highlighting, tier shortcuts, permanent-attribute tracking, account sync, and responsive light/dark layouts. ETA estimates are intentionally excluded.
- Added separately sourced Unit Specialisation VII–IX medal evidence without introducing the unrelated Royal Tech Books feature or inventing values for blank spreadsheet cells.
- Localized the complete Artifact interface across all 13 supported languages and added keyboard, focus, touch, reduced-motion, RTL, and screen-reader support.

## 15.0.4 - 2026-08-17

- Fixed the VTS Admin mobile dock covering half the screen. The grouped season rail kept its in-page grid layout inside the fixed bottom dock, stacking every group's buttons and pinning a 400px panel over the content; the dock is now a single scrollable row that keeps the group labels and clears the reserved bottom padding on both the season and Alliance sides.

## 15.0.3 - 2026-08-17

- Renamed Royal Bounty Alliance to Royal Bounty Eden X2 across the Eden Hub: the guide's hero title and credits, the hub sub-tab, the command-palette entry and every locale now carry the season name.
- Removed the admin username and password form. VTS Admin now runs entirely off your VTS account: the gate links into the normal sign-in flow, and access is decided by the admin claim on whichever account you are already signed in with. A shared admin login meant a single identity for everyone who knew it, so no admin action could be attributed to a person.
- A signed-in account without admin access is now told so plainly and pointed at an R5 to request it, instead of being shown a sign-in it has already completed.
- The admin claim is re-read with a forced token refresh at boot, so an account promoted moments ago gets in immediately instead of waiting for its old ID token to expire.

## 15.0.2 - 2026-08-17

- Fixed the reversed typing in Users & Roles: the member search no longer rebuilds its own input on every keystroke, so the caret stays put and characters land where you typed them, and it now shows a live "showing X of Y" count.
- Superadmins can now list every member profile in Users & Roles. The Firestore rules previously limited `users/{uid}` reads to the account owner, which silently emptied the roster; superadmin read access is now granted alongside self-read.
- The account chip now says "Superadmin" with its own violet badge when you hold the higher claim, instead of showing both roles the same gold "Admin".
- Locked the whole Alliance management side of VTS Admin — Alliance View, All-Star BoH, Throne Buffs and Users & Roles — behind the superadmin claim. A plain admin no longer sees a nav row whose tabs would all refuse them.
- Gave the Throne Buffs tab its stylesheet: one compact header row for the week picker, slot badges and actions, a bordered assignment table with the title icons and effects, pill badges for slot counts and duplicate warnings, styled history search results, and a rotation fairness table. It ships as a lazy CSS chunk with the tab instead of padding the dashboard bundle.
- Rebuilt the desktop admin navigation layout: each tab group is now a single compact row of mono label plus content-sized pills instead of three narrow columns of stretched buttons, which had wrapped every group into a tall stack and pushed the page content far below the header.
- Styled the Users & Roles roster: search toolbar with live count, tone-coloured save status, compact member rows with stacked name and account id, and touch-friendly toggle rows on phones.

## 15.0.1 - 2026-08-16

- Split VTS Admin into two sides. Alliance management now holds Alliance View, All-Star BoH and the new Throne Buffs tab, and sits deliberately outside the Eden season scope, so a season rollover never moves or clears it.
- Added the Throne Buffs assignment tab: pick any week, assign the nine throne titles to members with optional reasons, watch the rotation fairness table flag who is overdue, search past weeks, and export the week as a PNG card.
- Added the Banners Planner groundwork: a 19-banner alliance catalog transcribed from the retired planning sheet, plus the pure planning model that normalizes weekly event blocks and tracks banner usage, pilot workload and banners that silently dropped out of a week.
- Added Vialfiend to the Strife monster lab with its four skills verbatim from the game: Death's Aura, Intimidate, Demon Wraith and Power of the Legion.
- Removed the Velo runner sprite that travelled along the loading bar; the loader keeps its identity art and the progress bar still animates.
- Embedded the Eden X2 season page and Previous Seasons into the Eden Hub without their standalone chrome, and fixed the white-on-white workspace select and the cramped admin command strip on mid-width screens.

## 15.0.0 - 2026-08-15

- Added the Eden X2 season workspace. Eden X1 becomes a read-only archive that stays exactly as it was, while X2 starts empty in its own isolated space, so a new season never overwrites the last one.
- Added a public Eden X2 page that only ever shows what an admin has explicitly published. Before publication it says the season is not published yet instead of showing an empty scoreboard, and it appears in the Eden Hub only once it is live.
- Reorganised VTS Admin around what actually changes each season. The Eden workspace switch now governs only the season surfaces; All-Star BoH sits in a separate Standing programs area that a season rollover never touches.
- Added an Eden workspace command strip with the season selector, its draft or published state, and safe publish, unpublish and snapshot actions. The archived X1 season stays viewable and exportable but refuses every change.
- Added the Throne Buffs weekly assignment groundwork: the nine throne titles with their real effects, weekly assignments with optional reasoning, and rotation fairness that tracks who has held which buff and how long ago.
- Shipped the nine Throne title icons in `images/throne/`, cropped from the in-game Province panel. A slot whose icon file is absent still falls back to its two-letter initials, and the Emperor's effect list stays empty until its in-game tab is captured.
- Rebuilt the Towers planner around a path decision card that names the mode, tower, chosen preset and next upgrade at a glance, and moved the long hero mechanics into a collapsed Hero synergies panel.
- Rebuilt the Skins sub-tab with a skin gallery and tier guide, including search, type filters, real skin art, and a jump from any gallery card straight to that hero.
- Reworked Eden Loyalty and DM Materials on phones and tablets: single-column loyalty inputs, readable type, larger tap targets, and an equipment grid that no longer squeezes six columns onto a small screen.
- Removed the VtsScore pill from the navigation rail and promoted DM Materials in its place; the VtsScore page itself is unchanged and every existing link still works.
- Signed-in members now see their account on the admin deck, with a sign-in that returns them to the page they came from.

## 14.3.9 - 2026-08-14

- Combined Manual Builder, Combo Generator, Hero Atlas, and skins into the new Heroes & Combos Hub. The generator is its default view; Heroes and Skins are separate hub sub-tabs, while existing deep links keep working.
- Combined Tech Research and Towers Specialization into the new Research & Towers Hub, opening on the Towers planner by default and preserving both legacy routes.
- Reworked the Towers planner around exactly two paths ? Siege / Rally and Field (Non-Siege) ? with paid-hero presets, owned-hero controls, clear 1/32 path numbering, and full troop coverage.
- Made Royal Bounty the VTS Eden Hub landing page, with its visual 9-hero guide, mission/commission loop, Aiding Skill rules, and a one-click return to the Eden map.
- Completed the public app locale contract across every shipped language and updated Velo?s tower, hero-path, and Royal Bounty guidance.

## 14.3.8 - 2026-08-13

- The Combo Generator now opens in skin mode. Skin icons, skin toggles and skin-aware combos are on by default; the toggle still turns them off.
- Hero cards in the generator now stay in seasonal order (S0 first, X2 last) instead of floating heroes that own a skin to the top, so a hero stays where you expect when you switch skin mode on or off.
- Replaced Beowulf's skin icon with a clean portrait crop, without the level and name overlay from the old capture.

## 14.3.7 - 2026-08-13

- Brought back the full Specialization tool inside the main site. The tab is the interactive planner again, not a summary card that sends you to another page.
- Moved the suggested routes and the easy medal fill onto that tab, so both surfaces now offer the same tools and share the route you pick.
- Fixed the Combo Generator hiding its best combos. A hero with a "recommended" skin no longer removes a combo from the normal list; only a combo that truly requires a skin is held back for skin mode. The top of the list now matches the ranking, starting with Alexander / Bleeding Steed / Theodora.

## 14.3.6 - 2026-08-12

- The Specialization tab on the main site is now a thin summary card that links to the full standalone planner; the duplicate in-tab graph renderer is gone, and the community node-data submission section stays on the main site.
- Added a local Towers dev/test loop: `npm run towers:dev`, `towers:test`, and `towers:check` run only the Specialization Towers unit slice and every Specialization browser spec, so a Towers change can be checked in about half a minute instead of a full smoke run.
- Repaired the hero combos list after recent direct edits: three hero names that do not exist in the roster (Rozen, Jeane, Beast Queen) are corrected, and four combos that had been added twice are back to a single entry each.

## 14.3.5 - 2026-08-11

- Added Spenders and F2P suggested routes to Specialization Towers. Picking one numbers every research in order and marks the next one to take, and the choice is remembered.
- Added an easy medal fill toggle to Specialization Towers, with 25/50/75/100% quick fills so medals can be recorded without stepping through nodes first.
- Node data contributions now require a signed-in account and are credited to it, which also removes the per-node contributor field so a whole column is just one number per row.
- Added the exact in-game node topologies for Encounter Battle IV, Cavalry Training VII and Neat Formation III, including the three battle-row loops that make up Neat Formation III.
- Corrected Army Breaker to season X1 and Defender to the Archers troop type.
- Raised the minimum copies for free X1 and X2 heroes to 22; paid heroes stay at 14 and the maximum is unchanged at 34.
- The Combo Generator now opens with every season from S0 to X2 selected instead of just S0 and S1.
- Ranked the all-skins Rozen Blade / Ramses II / Beowulf lane above the no-skin Immortal Guardian / Ramses II / Beowulf lane.
- Tightened the research calculator tree spacing and replaced the empty inspector panel with a live summary of tree progress, completed nodes and the next available node.

## 14.3.4 - 2026-08-10

- Added a spent total to the research calculator, so each tech tree now reports how many War Badges and Courage Medals you have already invested next to how many are still remaining.
- Kept the tree footer naming its real currencies once a tree is fully maxed, instead of collapsing to a generic resource row when nothing is left to buy.
- Made partially levelled nodes look the same in every tech tree. Trees using the card layout only ever showed "maxed or not", so a half-finished node was indistinguishable from an untouched one; they now use the same idle, in-progress, and complete states as the rest of the trees.

## 14.3.3 - 2026-08-10

- Rebuilt the hero combos database as one plain ranked list. Every entry is now just the three heroes plus an optional skin code and an optional note, replacing the imported tier-and-score format that came from the external combo datasets.
- Limited the combos database to heroes from seasons up to X2 and removed the 82 imported formations that depended on X8 heroes, leaving 203 ranked combos.
- Fixed the two promoted top-rank combos being listed twice, which rendered duplicate "Use this counter" buttons in the counter panels.
- Added database guards so a combo can only use known hero names, can never reintroduce an X8 hero, can only carry the heroes/skin/note fields, and can never be listed twice with the same heroes and skin code.

## 14.3.2 - 2026-08-03

- Upgraded Velo to the smarter gemini-3.5-flash model while keeping the lighter model for short chat turns, so simple questions stay fast and big questions get better answers.
- Added Velo retry support that automatically falls back to the alternate model when the first request is rate-limited or the service is unavailable.
- Gave Velo three new capabilities: live Arcade leaderboards for all five games, All-Star BoH public mechanics and scoring, and the public VtsScore power-field contract.
- Expanded Velo's output limit and tool budget so answers can include compact markdown tables that stay readable on phones.
- Added a copy-answer button to completed Velo replies, plus table-aware rendering for tool-generated data.
- Enabled Velo's active-tab context so follow-up questions know which tool page you are looking at.
- Expanded the hero combos database with 32 curated A/B/S-tier formations from the public Rise of Castles community dataset: 7 new no-skin base combos (led by Alexander / Bleeding Steed / Theodora) enter the shared generator, and 25 skin-mode formations (e.g. the all-skins Alexander / Bleeding Steed / Theodora and Boudica / Jade Eagle / Ramses II lanes) join the skin-mode pool.
- This release requires the Worker deploy (`workers/ai`) to ship together with the browser bundle.

## 14.3.1 - 2026-07-29

- Replaced the generic VtsScore failure banner with specific messages for every secure-service outcome: rate limits (with the wait time), oversized screenshots, service outages, unsupported image types, locked accounts, closed signups, and rejected requests.
- Appended the machine-readable error code to VtsScore failure banners so member screenshots identify the exact failure for support.
- Restored the stable captured sign-in reference for the All-Star secure client on the VtsScore and BoH pages.

## 14.3.0 - 2026-07-28

- Corrected VtsScore to OCR, review, submit, and compare the complete nine-field power breakdown instead of a single Total or Dragon Power value.
- Added editable per-field OCR review with confidence context for Total, Troop, Building, Technology, Hero, Dragon, Unit Specialty, Artifact, and Royal Tech power.
- Added migration-safe VtsScore storage: new uploads use the full versioned contract while earlier one-field uploads remain visible as incomplete and require re-upload.
- Expanded the All-Star admin comparison to show sign-up, final, and growth values for every power category.

## 14.2.20 - 2026-07-27

- Corrected VtsScore OCR and review to submit Total Power rather than Dragon Power while preserving the deployed secured endpoint contract.
- Replaced the browser datalist with ranked closest-name search across every eligible All-Star signup, including keyboard selection.
- Added six complete VtsScore languages, Arabic RTL, and accessible light/dark theme controls with improved form and button contrast.
- Updated the All-Star admin growth table to compare sign-up and final Total Power while retaining the original Dragon-based reward tiers.
- Raised aggregate JavaScript and Pages artifact budgets by 20 kB for the complete VtsScore locale packs.

## 14.2.19 - 2026-07-27

- Added the focused VtsScore page for Competition #11 final Dragon Power re-uploads, with a searchable All-Star signup selector and one-image OCR review.
- Added a secured Auth, App Check, and member-grant verified score endpoint that stores confirmed numbers and bounded OCR audit metadata without retaining screenshots.
- Added an All-Star admin VtsScore stage comparing sign-up and final Dragon Power, growth, percentage, original reward tier, and missing uploads.

## 14.2.18 - 2026-07-27

- Added a guided All-Star admin team builder with semantic action colors.
- Added safe player display-name and total-power corrections, plus reasoned base-score overrides derived from occupied team seats.
- Added atomic import for one to six role-plan files or a complete six-team bundle, plus admin export of every team plan.
- Polished member event progress with a connected timeline, selected-milestone state, accessibility improvements, and reduced-motion behavior.
- Rebuilt account creation as provider-first authentication followed by a focused private-profile confirmation step, with direct Google sign-in, a referral dropdown, and dismissible timed notices.
- Improved Specialization Towers light-theme MAX, UNMAX, zero-progress, and disabled-state contrast with consistent semantic colors.
- This release does not change the Firestore rules or schema; production rules deployment remains separate for the existing UID/playerId 403 fix.

## 14.2.17 - 2026-07-27

- Improved the All-Star BoH Mapper workspace action hierarchy with distinct colors for importing, validating, opening team plans, saving team edits, and publishing.
- Added strict per-team Stage-1 role-plan JSON preview and draft import, with exact player matching and 120 canonical personal instructions.
- Added one explicit publication-scope control for team lists, plan updates, or an atomic combined release.
- Added a draft-only announcement composer and clearer schedule controls for adding, duplicating, reordering, clearing, hiding, and validating public milestones and team times.
- Redesigned the member announcement and event schedule with editable release copy, team accents, a connected animated timeline, accurate next-event countdowns, and reduced-motion support.

## 14.2.16 - 2026-07-26

- Fixed the All-Star published-player Firestore contract so UID and playerId identity fields remain consistent.
- Replaced the Admin All-Star five-stage Team Builder/Plans wizard with a mapper-first workflow.
- Added explicit manual reconciliation from unmatched mapper names to fresh verified signups.
- Added five-phase personal plans with connected 5x5 tower routes, player-specific crystal and Battle Merit assignments, and paired minute-3-or-later substitutions that preserve the ten-player field limit.
- Added private per-team resource, skill, building-buff, and substitution editing without exposing draft-only identities or tactics in player publications.
- Added independent editable Battle Simulator profile drafts for Side A and Side B, including a visual Specialization Towers board, selective source application, and aligned header controls.

## 14.2.15 - 2026-07-26

- Made the approved All-Star BoH mapper exact view the source of truth for ranked team order, role distribution, command roles, and explicit main or backup deployment.
- Added member My Orders, Team Plan, and Map Briefing views with shared four-phase teleport, crystal, roster, duty, and real-map context.
- Reframed the admin team workspace around mapper preview, draft save, review, validation, and announcement while retaining legacy balancing tools as advanced compatibility controls.
- Added a Battle Simulator saved-profile checklist that validates Research, Equipment, and Specialization Towers before explicitly importing those automatic sources into either side.
- Redesigned Account & Profile into responsive Profile, Privacy, and Account settings sections with a clearer create/sign-in flow.
- Added safer dirty/save handling, required-field reveal, localized save and error states, counters, and RTL/mobile safe-area behavior.
- Registered the standalone profile route with the service worker and generated precache inputs.

## 14.2.14 - 2026-07-26

- Fixed the mobile header so the Account control has its own touch-safe slot without displacing the clock, search, theme, or language controls.

## 14.2.13 - 2026-07-26

- Made Battle Simulator hero skills and assignments explicitly canonical and added the verified Cavalry Movement in Unison specialization passive.
- Renamed the team-planning surface to All-Star BoH Hub and added Admin exact-view mapper reconciliation into editable drafts with explicit publication.
- Simplified accounts to one in-game name, restored private state/referral/comments onboarding, localized the full flow across all 13 locales, and recovered Google signup when a guest selects an existing Google account.
- Made Dragon Master completion advance to the next unfinished targeted piece.

## 14.2.12 - 2026-07-26

- Added Velo Beta 0.3 saved-data consent and optional Firebase-backed user profiles.
- Expanded All-Star BoH with a six-team, 12-player roster and schedule, supporting rules, and X8 name-matched formations.
- Completed Italian and Korean localization across the shipped experience.
- Made Battle Simulator scenarios apply Research and Specialization through a deterministic runtime, with upgraded setup/export schemas and diagnostics.
- Expanded Battle Simulator coverage to 78 heroes and 208 skills using conservative modeled effects, plus provisional observed equipment effects; partial or unverified battle clauses fail closed, and Dragon Master catalog stats are never invented.

## 14.2.11 - 2026-07-25

- Restored All-Star BoH member PIN access after registration closes and made the Stage-1 battle mapper the default post-login page, with separate Team Formation and Event Schedule pages.
- Updated All-Star publication to use the six currently approved teams and their occupied seats instead of blocking on unused 72-seat placeholders; captain metadata is optional but validated when present.
- Split the All-Star season switch so closed registration blocks member signup and Epic preference writes without hiding published teams, personal plans, or schedules.

## 14.2.10 - 2026-07-25

- Added an interactive real Stage-1 map to the All-Star BoH plan view, replacing the schematic placeholder.
- Added personal plan behavior for each player, including standby and gather-crystals instruction options.
- Added a member-facing event schedule with a live countdown to the next milestone or team game time.
- Added an admin event-schedule editor for publishing event milestones and per-team game times.
- Added a default Stage-1 plan template so new seasons start from a complete, editable plan.
- Improved mobile layout and accessibility across the All-Star BoH member and admin views.

## 14.2.9 - 2026-07-22

- Closed the public All-Star BoH registration view with a clear “Teams are full” status and notice that team matching is underway and assignments will be announced soon.
- Made the All-Star admin balance configuration collapsible and added a non-persisting “Select highest X” shortcut sized to the currently configured team field.
- Reflowed the six-team admin board into a spacious 3-by-2 desktop grid, two columns on narrower screens, and one column on mobile.

## 14.2.8 - 2026-07-22

- Rebuilt mobile site headers and control grouping so centered branding/version, time/search/theme/language controls, fixed bottom navigation, and Generator action areas no longer overlap or float over content.
- Reduced and repositioned hero-card information controls in Combo Generator and Manual Builder, keeping card content readable and touch targets intentional.
- Harmonized Specialization Towers with the shared site palette and added compact icon-only Cavalry/Archers/Footmen controls on mobile.
- Converted the completed Eden X1 public page into an archive centered on the Final Top 20, player lookup, guild contribution, and analysis while keeping active-season voting/reward machinery reusable behind the season-state switch.
- Fixed Structure Detail modal rows so long multilingual names, rank tags, large scores, and hit badges remain compact and fully visible on mobile.

## 14.2.7 - 2026-07-22

- Fixed the All-Star BoH Team Builder eligible-player pool so checkbox changes immediately update the selected-player count and save-button count before saving, with a compact searchable/filterable manager that starts collapsed when the saved count is already valid.
- Improved All-Star Team Builder outputs with exact team-count columns, leader plus co-leader metadata, ranked role assignment, batch commitment-score helpers, and shareable CSV/PNG team exports for roles or scores/power.

## 14.2.6 - 2026-07-21

- Added persisted Epic Showdown planning controls for excluding secondary accounts, forcing lane assignments, and keeping named or language-based groups together.
- Evaluated every keep-together group as one shared lane, surfaced unresolved or conflicting groups, and showed active-versus-excluded totals in the admin workspace.
- Added a formula-safe active Epic planning CSV with player locale, preferences, lane overrides, effective lanes, and group IDs.

## 14.2.5 - 2026-07-21

- Collapsed Epic Showdown preference summary by default (H1).
- Collapsed player preference details and usable-heroes disclosure by default (H1).
- Persisted Epic Showdown collapse state in sessionStorage (H1).
- Moved review status/actions leftward in the signup table (H2).
- Added sticky leading identity columns with LTR/RTL support (H2).
- Added `data-label` attributes to all `<td>` for card-mode responsive layout (H2).

## 14.2.4 - 2026-07-21

- Added audited All-Star admin corrections across player-entered profile, stats, roster, hero, research, availability, role, and commitment data while preserving the original submission.
- Added reasoned 1-10,000 leadership commitment scores as an additive score component, stored-score diagnostics, and a balanced team-building mode that evaluates scoring points and Total Castle Power independently.
- Expanded All-Star score and review tooling with richer score provenance, sortable audit data, roster-aware CSV export, clearer selection controls, and sequential batch confirmation and deletion.
- Let existing All-Star signups save manual corrections when replacement screenshot OCR fails, with actionable Russian retry and fallback guidance; first-time OCR verification remains required.
- Improved Specialization Towers on mobile and RTL layouts with scroll position cues, focus and modal-scroll preservation, touch accessibility, and explicit provenance that public totals are whole-research totals while per-node medal costs remain unknown.

## 14.2.3 - 2026-07-20

- Added five configurable All-Star scoring components for Unit Specialty Power, RoC level, paid usable heroes, Lofty troops per million, and Enhanced T10 troops per million, all defaulting to zero.
- Derived paid usable hero counts from the canonical hero catalog and preserved all five component weights through scoring-version and admin-draft store round trips.
- Kept legacy scoring totals unchanged until an admin explicitly creates and enables a new scoring version with nonzero weights.
- Made Team Builder support configurable 2–6 12-player teams, an explicit eligible pool, and exact-team forces, with preview/apply balancing by active score or Total Castle Power and both totals visible.
- Made reviewed player names and stats editable and applied those corrections throughout scoring, team building, publication, and export.
- Added compound review filters, stable sorting, and formula-safe CSV export limited to the current visible row order.
- Added sequential batch confirmation for selected visible rows with clear partial-success reporting.

## 14.2.2 - 2026-07-20

- Added actionable VPN, different-network, and Retry guidance when regional or network restrictions prevent access to required Google signup security services, without presenting the failure as an incorrect PIN; semantic validation, authentication, and admin-session errors remain distinct.
- Kept the first paint fail-closed with a visible loader and access gate before CSS and security boot, added an accessible localized PIN visibility control, and accepted hash casing variants.
- Made screenshot OCR a generation-safe single-flight flow with deterministic processing, ready, and error states plus retry support.
- Prevented clipping of the header, logo, and version badge at 375 px and 390 px mobile widths while keeping the safe-area bottom navigation separate.

## 14.2.1 - 2026-07-20

- Fixed All-Star BoH signup validation so RoC specialization levels from 0 through the in-game maximum of 160 can be submitted instead of forcing affected members to leave the field blank.
- Kept the browser, data normalization, and Firestore rules on the same RoC level range so accepted values appear correctly in the admin review panel.
- Prevented non-1097 applicants from exhausting Firestore's rules-expression budget when their required contact number, current state, and join reason are submitted; the client and store continue to require all three values.
- Added a visible screenshot-OCR progress bar, strengthened Unit Specialty Power extraction guidance, and kept duplicate OCR requests disabled while one read is running.
- Sorted research groups chronologically and pinned the verified S1 and X1 trees in regression coverage so those season sections remain visible in the cumulative X1 view.

## 14.2.0 - 2026-07-20

- Completed the shared-admin signup protection by wiring the private-window instruction into the real access gate instead of leaving the error copy undefined.
- Localized the leadership-session warning across all twelve supported site languages and added rendered browser coverage for the exact message.

## 14.1.20 - 2026-07-20

- Blocked the member All-Star signup from inheriting an existing leadership/admin Firebase login, preventing shared admin browsers from opening or overwriting one member submission.
- Added a fail-closed message directing leadership users to open the signup in a private window, where the site creates a separate anonymous member identity.

## 14.1.19 - 2026-07-20

- Restored backward-compatible All-Star signup reads for historical `+8` and `+20` fighting-time selections so one older record cannot prevent the admin dashboard or a player's saved form from loading.
- Kept all new and updated submissions restricted to exactly two current fighting times from `+12`, `+14`, and `+16`.
- Prioritized Research, YouTube, All-Star BoH, and Eden X1 Rankings in the mobile bottom navigation, restored a compact mobile version badge, and fully hid the off-screen skip-link outline until keyboard focus.
- Made shared tab links case-insensitive so common variants such as `#allstarboh` and `#AllStarBoh` open and normalize to the canonical `#allStarBoh` route.

## 14.1.18 - 2026-07-20

- Replaced unreliable multi-image troop OCR with four optional million-based estimates for Lofty (S), enhanced T10, regular T10, and T9 troops; entering `7` records an estimated `7,000,000` troops while preserving legacy reviewed troop rows.
- Limited All-Star fighting-time choices to `+12`, `+14`, and `+16`, with exactly two choices still required; Epic Showdown time choices are unchanged.
- Completed localized All-Star participation, VTS membership, contact, state, reason, and troop-estimate copy across all twelve supported languages instead of falling back to English.
- Verified protected admin signup deletion removes only the selected signup, review, and feedback while preserving independent Epic Showdown preferences.

## 14.1.17 - 2026-07-19

- Audited all 200 Eden contribution entries, 180 duty records, 40 conduct records, management votes, and teammate votes against canonical player families while preserving the published Top 20 order.
- Deduplicated reward families across Support, Contribution, Management, Team Players, and the 90 Power House positions so secondary accounts cannot receive a second season reward.
- Mapped verified public aliases and duty-only workers without letting zero-contribution support accounts enter Contribution or Power House rankings, and retained all 142 banners, 30 pathers, 8 shield walls, and 44 net conduct points.

## 14.1.16 - 2026-07-19

- Added explicit Guild Master and Core reward tiers to the Final Top 20 while preserving each winner's support, contribution, management-vote, or team-vote selection reason.
- Added a deduplicated 90-player Power House ranking for positions 21–110 and one-click PNG downloads for both reward tables.

## 14.1.15 - 2026-07-19

- Added a Final Top 20 announcement view to the Eden X1 reward flow that combines the four support, contribution, management, and team reward lanes into one shareable recipient table with category chips and placeholder rows until each lane is decided.
- Aligned the eden-x1 smoke expectation for the language selector with the Croatian option position shipped in 14.1.13.

## 14.1.14 - 2026-07-19

- Fixed the Croatian language smoke-test contract that blocked #84 deploy verification after the twelfth locale was added.
- Expanded All-Star admin corrections to Unit Specialty, Artifact, and Royal Tech power and reject suspicious OCR `1` placeholders in unreadable extended-power rows.
- Displayed reviewed troop OCR rows in the admin signup panel and widened the combined T10 portraits so they remain distinct on desktop and mobile.
- Added a confirmed admin-only signup deletion action for removing test entries while preserving separate Epic Showdown preferences.

## 14.1.13 - 2026-07-19

- Filled editable power fields directly from account-stat OCR and removed the separate extracted-value confirmation checkbox while retaining third-party processing consent.
- Removed the visible timezone question while preserving the stored submission schema for existing records.
- Replaced the crowded mobile footer with compact centered account links and removed duplicate tool navigation already available in the mobile dock.
- Added Croatian (`hr`) as the twelfth project language with translated core navigation, PWA, and player-facing All-Star signup copy plus explicit canonical-English fallback for specialist catalogs still awaiting reviewed Croatian terminology.
- Restored the visible required marker for Unit Specialty Power and replaced raw Firestore permission errors with a translated PIN-expiry recovery message for signup and Epic Showdown saves.

## 14.1.12 - 2026-07-19

- Reduced All-Star submission security-rule evaluation by caching the active member grant and validating submission submaps through short aliases, preventing valid large signups from exceeding Firestore's 1,000-expression limit.

## 14.1.11 - 2026-07-19

- Defaulted hero and research catalog filters to X1 and added a one-tap "Max all" action for each season's research group.
- Saved the primary All-Star signup before optional Epic Showdown preferences so a rejected signup can no longer leave an Epic-only player record, and visibly marked required Unit Specialty Power.
- Added an opening All-Star participation choice, an Epic-only path, automatic in-game-name sharing with Epic Showdown, and required contact/state/reason details for applicants outside VTS 1097.
- Updated the owner-scoped Firestore signup contract for the new VTS applicant fields and surfaced them in the leadership review panel.
- Fixed the mobile All-Star signup so the optional Troop OCR buttons remain inside their own section instead of floating over manual entry fields.
- Separated the three troop portraits in the “All T10 troop types” selector so each icon remains individually visible on phones.

## 14.1.10 - 2026-07-19

- Added a true top-layer confirmation after successful All-Star signup submissions and edits, clearing stale permission errors only after the write succeeds and keeping delayed listener failures from replacing the confirmed result.
- Moved optional Epic Showdown choices ahead of the single signup action, saving them with the signup only when changed and fixing saved flexibility radio choices so untouched Epic fields never block submission.
- Replaced the first-visit PIN wait with a Velo secure-access loader, limited the mobile Add to Home Screen prompt to 20 seconds, and immediately hid the install prompt, tool dock, Velo launcher, and overlapping controls while a mobile user is writing.

## 14.1.9 - 2026-07-19

- Kept owner-authenticated All-Star signup edits below Firestore's rules-expression limit by removing redundant update checks while preserving the shared schema, path-bound identity, immutable creation timestamp, and exact revision increment.

## 14.1.8 - 2026-07-19

- Preserved the successful All-Star signup confirmation when a delayed realtime-listener permission error arrives after the submission has already been committed, while continuing to report the background error through the controller error hook.

## 14.1.7 - 2026-07-19

- Replaced the expression-heavy All-Star signup write path with bounded, owner-scoped validation that keeps the exact previously denied member payload below Firestore's 1,000-expression limit while requiring Unit Specialty Power at the database boundary.

## 14.1.6 - 2026-07-19

- Reduced All-Star Firestore rule evaluation for short signup lists while preserving validation through the full 60-item troop roster, preventing valid submissions from exceeding the rules expression budget.

## 14.1.5 - 2026-07-18

- Completed the Specialization Towers public planner corpus with all 32 researches, 718 attribute nodes, 384 milestone buffs, 17 passive skills, and 24 troop-specific Legion Skills while keeping unverified prerequisite edges and node medal costs explicitly unknown.
- Added all 33 public research and Legion Skill emblems as locally embedded, size-budgeted WebP assets with source URLs, original hashes, optimized hashes, dimensions, and planner JavaScript provenance.
- Exposed the full 24-node Enhanced Tactics IV catalog in both Specialization renderers, added the public artwork to overview/detail/Legion Skill surfaces, and expanded automated coverage for the complete catalog and asset integrity.
- Rebuilt the README's Specialization documentation and replaced outdated gallery captures with current desktop and mobile planner screenshots.
- Kept the All-Star signup form and member hub intact when Firestore rejects a save, showing the write error inline instead of incorrectly treating every permission denial as an expired PIN grant.

## 14.1.4 - 2026-07-18

- Reworked the All-Star signup OCR panel into a desktop split layout with a much larger full-list example opposite the upload controls while preserving the stacked mobile flow.
- Limited the cumulative hero season filter to S0, S1, S2, S3, S4, X1, X2, and X8; added exact supplied troop portraits to the T10 readiness choices; replaced missing or incorrect research artwork with all 29 exact supplied in-game icon crops; and added an explicit, admin-visible willingness-to-lead planning signal.
- Folded Epic Showdown preferences into the end of Signup, expanded its selectable game times to every two hours from +6 through +20, added a planning-only choice between flexible roles, flexible fight times, or one fixed assignment, and simplified the member journey navigation to Signup, Team Announcement, and My Team Plan without changing the independent Epic preference revision contract.
- Made Unit Specialty Power mandatory, added visible focus-guided submission errors and an explicit Edit my signup action, a safe Lock hub action, and automatic one-time recovery from stale All-Star asset chunks so access happens before private form entry, saved answers remain editable, and valid grants resume without another PIN.
- Added six optional animal team-name concepts with original matching emblems; players can favorite any number for leadership planning without affecting scores or automatic team balance.

## 14.1.3 - 2026-07-18

- Improved Specialization node selection with a clear node guide, stronger selected/focus states, explicit learned/not-learned choices, localized research and column names, and accessible mobile controls.
- Added reversible MAX/UNMAX controls to every Specialization research and an interactive Legion Skill preview that unlocks after all four column researches are complete.
- Rebuilt the All-Star BoH signup around screenshot-first multilingual OCR for the six common power rows plus three optional extended rows, an in-form screenshot example, compact timezone and mobile controls, T10 readiness, portrait-backed hero selection with cumulative seasons through X8, verified in-game research artwork where source evidence exists, and a Red-tree RoC reference.
- Simplified All-Star planning to full/most attendance, two game-required time preferences with a cross-team majority explanation, translated primary and secondary role selection with an inline role guide, and no backup, unavailable-time, level-50, or generic commitment questions; Epic Showdown remains the final optional VTS 1097-only section.
- Removed the All-Star access-gate dismissal path so the private signup form can only be revealed after the seasonal member PIN is successfully verified.
- Added a localized, mobile-ready All-Star signup-window banner that counts down to opening and then closing, shows the exact local dates, and falls back to a clear schedule-pending state until leadership enters the confirmed ISO timestamps.
- Added optional multi-image Troop Details OCR with both supplied in-game examples, editable type/tier/normal-or-enhanced/count review rows, overlap deduplication, S through SSS support, and explicit confirmation before the compact troop inventory reaches leadership.
- Corrected the Velo drawer badge to Beta 0.2 so it matches the already-deployed b0.2 Worker and removed retired contributor names from public credits.

## 14.1.2 - 2026-07-18

- Added four read-only Velo tools so the assistant knows the whole toolkit: `get_toolkit_map` (every tab/page with what it answers and its deep link), `get_whats_new` (recent release notes from a generated changelog digest), `get_specialization_context` (canonical Specialization Towers columns, researches, nodes, milestones, medal costs, and Legion Skills), and `get_skin_tier_details` (the three skin tiers with star-up costs and acquisition paths).
- Added a `velo:changelog` script that generates `js/ai/changelog-digest.js` from CHANGELOG.md; the build runs it automatically and a unit test keeps the digest in sync with the released version.
- Rebranded the assistant build as Velo b0.2 and refreshed Velo's system prompt: the role now covers Specialization Towers, skin tiers, All-Star BoH public mechanics, Battle Simulator context, and app navigation; the helmet gag became occasional and varied; out-of-scope answers now route to the right toolkit tab instead of refusing; and answer shape/wording is instructed to vary between turns.
- Added grounded VTS guide knowledge entries for the All-Star BoH member flow, Specialization Towers structure, skin-tier economy, and the Fordogreen X1 Strife approach, plus community-shorthand aliases (dm, ac, boh, spec, cop, f2p, p2w) in guide retrieval.
- Added an optional `activeTab` breadcrumb to the chat request contract: the Worker schema accepts it and injects an ACTIVE APP TAB section into the model instruction; the client keeps it disabled until the Worker deploy that accepts the field is live.
- Added the verified Cavalry columns I–III evidence overlay with 17 source screenshots, 23 exact icon crops, provenance metadata, and stable research/node records; unknown medal costs, learning order, prerequisites, and ambiguous icon mappings remain explicitly unknown.
- Added the verified Archer columns I–III evidence overlay with 17 hashed source screenshots, 19 exact icon crops, 253 research-node records, observed layouts, provenance metadata, and canonical troop overrides while retaining unknown costs and prerequisite directions as `null`.
- Added the verified Footmen columns I–III evidence corpus with 17 source screenshots, pixel-preserving crop descriptors, completed-graph node counts and visual ordering, and confirmed Legion Skill names/effects without inventing canonical node mappings, costs, or prerequisite directions.
- Added a localized Hall of Honor to the bottom of the integrated Specialization tab for the VTS 1097 Community and every data contributor.
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
