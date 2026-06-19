# Changelog

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
- Started the repo versioning flow with this changelog and `VERSIONING.md`.
