# Changelog

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
