# Changelog

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
