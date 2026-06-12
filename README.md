# Hero Combo Creator — VTS 1097 (8.1)

Static web tool for **Rise of Castles: Ice & Fire** — hero combos, Eden planning, loyalty math, OCR report analysis, and more.

## What's new in 8.1

- **Gemini AI OCR** — replaced Tesseract.js with Gemini 1.5 Flash via Netlify Functions; dramatically better accuracy for occupation report screenshots, no more client-side processing limits
- **Serverless OCR pipeline** — images sent to `/.netlify/functions/gemini-ocr` which returns structured JSON (structure name, level, timestamp, player list) — far more reliable than regex parsing of raw OCR text
- **Streamlined codebase** — removed all client-side image preprocessing (canvas binarization, word-level parsing, column detection, paragraph format fallback) since Gemini handles vision natively
- **Firestore auth race fix** — `saveData`/`loadData`/`clearData` now `await ensureAnonymousAuth()` before any Firestore write, preventing silent failures on cold start
- **Export sanitization** — CSV exports escape double quotes to prevent injection
- **Log panel UX** — monospace font, `white-space: pre-wrap` for cleaner JSON log output

## What's new in 7.9

- **Critical OCR accuracy fixes** — rank column boundary widened, fuzzy threshold dynamic by name length, character substitution map ($→8, 1→l, Q→O), ±100 value proximity dedup, duplicate name cleanup, adaptive column detection
- **Boot splash performance** — faster door animations (1.4s vs 2.6s), reduced minimum boot time (600ms vs 1000ms), quicker dismiss sequence
- **Dashboard UX polish** — taller trend charts, bigger mini-pie bars, hover effects on trend bars, improved insight spacing

## What's new in 7.8

- **Durability auto-validation** — built-in lookup table (Gates Lv1–5, Cities/Capital Lv1–7, Temple Lv1, Stronghold Lv1) checks each attack's total demolition against expected structure HP; shows ✓/! badges in attack list
- **Auto-retry on mismatch** — when total demolition doesn't match expected durability (±5%), a second OCR pass runs with 3× scale / no whitelist / PSM-3 to recover missing players; logs both attempts
- **Detailed analysis terminal** — per-image logs show OCR format (table/paragraph/table+header), timestamp detected, word count, elapsed time, structure name, and grouping decisions
- **Merge fix: real names win** — when split uploads merge, attacks with `Structure Unknown` are overwritten by the real structure name from other images with the same timestamp
- **Individual image structure scan** — if combined text misses the header, each individual image's text is scanned independently
- **Enhanced attack detail modal** — shows Average per Hit, Value Distribution tiers with proportional bars, backward-compat game time
- **Expanded insights panel** — Participation Spread (High/Medium/Low stacked bar) and Activity Trend (last-7-days bar chart) populated with real data
- **New export: CSV Attack Details** — per-attack player breakdown

## What's new in 7.7

- **Timestamp-based attack merging** — merge split uploads by matching timestamps across images
- **Enhanced OCR dashboard logging** — per-image format detection, word counts, elapsed time
- **Paragraph format support** — parse MVP + Participants sections from paragraph-style reports

## What's new in 7.6

- **Multi-device sync** — Firebase Firestore cross-device sync for OCR dashboard data
- **Attack merge logic** — merge same-timestamp attacks from split uploads into single sessions
- **Log panel** — real-time analysis terminal with per-image logs

## What's new in 7.5

- **Structure-based grouping** — groups occupation report images by detected structure name + level
- **Null-guard robustness** — defensive checks against missing word data, empty text, malformed timestamps

## What's new in 7.4

- **Firestore sync** — cloud persistence for OCR dashboard (read/write via Firestore)
- **Mobile UI layout** — responsive adjustments for the admin dashboard on small screens

## What's new in 7.3

- **Paragraph format support** — parse MVP/total demolition paragraph-style reports from occupation notices

## What's new in 7.2

- **Initial OCR dashboard** — client-side Tesseract.js integration, table format parsing, leaderboard rendering
- **Rank-value extraction** — parses rank numbers and demolition values from occupation report screenshots
- **Basic fuzzy matching** — Levenshtein-based name matching against an editable alliance roster

## What's new in b6.2

- **Eden toolbar hover tooltips** — every control-deck button and layer toggle shows a description on hover (i18n via `js/eden-tooltips.js`)
- **Research game-style trees** — Basic Military and Solid Tactics use in-game layout with paged branches (`layoutMode: "game"`)
- **Hero Atlas** — filter bar alignment and layout polish
- **Wonder X1 dataset** — refreshed structure coords from latest screenshot extraction
- **Structure icons** — user-authored gate, town, stronghold, and capital sprites in the icon atlas

## Features

- **Manual Builder** — drag-and-drop 3-hero combos, save to Firebase, export as image/text
- **Combo Generator** — top-5 ranked combos from your roster + "Surprise Me" random mode
- **Combo Counters** — expandable counter matchups with hero portraits, ranks/scores, and optional notes (edit `js/combo-counters.js`)
- **Eden Map Planner** — Season 3, Wonder X1 (Season 5), and X12 reference datasets; parchment underlay, zone filters, paths, terrain-aware distance, and toolbar tooltips
- **Eden Loyalty Calculator** — processing times, poison %, upgrade paths
- **Tech Research Calculator** — medal/resource tracking per season (S0–X2), game-layout trees for key branches
- **Hero Atlas** — rankings, skills, synergies, season-scoped top combos (capped vs all-best toggle), adjustable hero bonuses
- **VTS Admin Dashboard** — client-side OCR for occupation report screenshots; supports both table and paragraph formats; cross-device sync via Firebase Firestore; auto-merges split uploads by timestamp
- **YouTube** — VTS 1097 playlists (lazy-loaded embeds)
- **Comments** — threaded community feedback via Firebase

## Files

| Path | Purpose |
|------|---------|
| `index.html` | Main page shell |
| `css/app.css` | Desktop styles |
| `css/mobile.css` | Mobile overrides |
| `js/app.js` | Core app logic, tabs, combos, research, hero atlas |
| `js/firebase.js` | Firebase init + anonymous auth |
| `js/comments.js` | Threaded comments |
| `js/combos-db.js` | Ranked combo database |
| `js/heroes-info.js` | Hero skill/synergy data |
| `js/loyalty-calculator.js` | Loyalty upgrade math |
| `js/eden-map.js` | Eden map planner UI |
| `js/eden-tooltips.js` | Eden control-deck hover tooltips (i18n) |
| `js/eden-map-data.js` | Map structure data, sector zones (N1–N4, central, S1–S4) |
| `js/eden-map-terrain.js` | Terrain + pathfinding |
| `js/eden-map-assets.js` | Map sprites, faction underlay, user structure icons |
| `js/eden-map-guide.js` | Interactive Eden map walkthrough |
| `js/eden-datasets.payload.js` | Encoded Eden structure datasets (gzip payload) |
| `js/eden-datasets-loader.js` | Runtime decoder; lazy-loaded with Eden tab |
| `assets/eden-reference/faction-division-map.png` | Processed parchment underlay |
| `assets/Gate.png`, `assets/Town.png`, `assets/stronghold.png`, `assets/Capital.png` | Hand-authored structure icons (processed to `assets/eden-reference/icons/user-*.png`) |
| `database/build-eden-datasets.py` | Generate `js/eden-datasets.payload.js` from `database/*.txt` |
| `database/build-eden-from-screenshots.py` | Rebuild Season 5 X1 dataset from screenshots |
| `database/build-eden-x12.py` | Rebuild Wonder X12 reference dataset |
| `database/mask-reference-capitals.py` | Mask baked capitals on faction-division underlay |
| `database/prepare-user-icons.py` | Checkerboard removal + crop for gate/town/stronghold/capital icons |
| `database/build-icon-atlas.py` | Pack structure sprites into atlas (runs `prepare-user-icons.py`) |
| `js/tech-db.js` | Tech research costs |
| `js/translations.js` | i18n (11 languages) |
| `js/heroes-data.js` | Hero roster (name, season, type, image URLs) |
| `js/utils.js` | Shared helpers (e.g. HTML escaping) |
| `js/combo-counters.js` | Counter matchup database + UI |
| `js/ocr-dashboard.js` | VTS Admin client-side OCR dashboard |

## Combo counters (manual data)

Edit `js/combo-counters.js`. Each target combo maps to up to 3 counters:

```js
{
  target: ['Hero A', 'Hero B', 'Hero C'],
  counters: [
    ['Counter 1', 'Counter 2', 'Counter 3'],
    { heroes: ['X', 'Y', 'Z'], reason: 'Optional note shown when expanded' },
  ],
}
```

Ranks and scores are resolved automatically from `combos-db.js`.

## Run locally

**Dev (no build):** serve the repo root with any static server:

```bash
npx serve .
```

**Production build** (minified bundle → `dist/`):

```bash
npm install
npm run build
npx serve dist
```

Open the URL shown by your static server.

### Eden map data rebuild

After updating screenshot JSON or map assets:

```bash
python database/build-eden-from-screenshots.py   # X1 from in-game screenshots
python database/build-eden-x12.py                # X12 reference baseline
python database/mask-reference-capitals.py       # refresh parchment underlay
python database/build-icon-atlas.py              # structure icon atlas
```

`build-eden-from-screenshots.py` and `build-eden-x12.py` both run `build-eden-datasets.py` to regenerate the encoded payload.

Hard-refresh the browser after regenerating assets or JS.

## Deploy

Publish **`dist/`** (from `npm run build`), not the raw repo — keeps `database/` source files off the public site.

- **Netlify / Firebase:** configs in `netlify.toml` and `firebase.json`
- **Custom domain:** `CNAME` → `roc-vts.com`

## Firebase

Client config lives in `js/firebase.js`. Protect data with Firestore security rules (not included in this repo).

**VTS Admin**: add this rule for cross-device sync:
```
match /vts_admin/{document} {
  allow read, write: if request.auth != null;
}
```