# Changelog

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
