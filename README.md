# Hero Combo Creator — VTS 1097 (b6.0)

Static web tool for **Rise of Castles: Ice & Fire** — hero combos, Eden planning, loyalty math, and more.

## Features

- **Manual Builder** — drag-and-drop 3-hero combos, save to Firebase, export as image/text
- **Combo Generator** — top-5 ranked combos from your roster + "Surprise Me" random mode
- **Combo Counters** — expandable counter matchups with hero portraits, ranks/scores, and optional notes (edit `js/combo-counters.js`)
- **Eden Map Planner** — Season 5 Wonders map with faction-division parchment underlay, zone filters (North / Central / South), paths, and terrain-aware distance
- **Eden Loyalty Calculator** — processing times, poison %, upgrade paths
- **Tech Research Calculator** — medal/resource tracking per season (S0–X2)
- **Hero Atlas** — rankings, skills, synergies, season-scoped top combos (capped vs all-best toggle), adjustable hero bonuses
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
| `js/eden-map-data.js` | Map structure data, sector zones (N1–N4, central, S1–S4) |
| `js/eden-map-terrain.js` | Terrain + pathfinding |
| `js/eden-map-assets.js` | Map sprites, faction underlay, user structure icons |
| `js/eden-map-guide.js` | Interactive Eden map walkthrough |
| `js/eden-datasets.generated.js` | Generated Season 5 structure coords |
| `assets/eden-reference/faction-division-map.png` | Processed parchment underlay |
| `assets/Gate.png`, `assets/Town.png`, `assets/stronghold.png`, `assets/Capital.png` | Hand-authored structure icons (capital falls back to extracted `c5.png` until you add `Capital.png`) |
| `database/build-eden-from-screenshots.py` | Rebuild structure dataset from screenshots |
| `database/prepare-faction-map.py` | Crop/upscale faction-division source image |
| `database/prepare-user-icons.py` | Checkerboard removal for gate/town icons |
| `database/build-icon-atlas.py` | Pack structure sprites into atlas |
| `js/tech-db.js` | Tech research costs |
| `js/translations.js` | i18n (11 languages) |
| `js/heroes-data.js` | Hero roster (name, season, type, image URLs) |
| `js/utils.js` | Shared helpers (e.g. HTML escaping) |
| `js/combo-counters.js` | Counter matchup database + UI |

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

Serve the folder with any static server, e.g.:

```bash
npx serve .
```

Open `http://localhost:3000` (or the port shown).

### Eden map data rebuild

After updating screenshot JSON or the faction source image:

```bash
python database/build-eden-from-screenshots.py
python database/prepare-faction-map.py
python database/build-icon-atlas.py
```

Hard-refresh the browser after regenerating assets or JS.

## Deploy

Configured for GitHub Pages via `CNAME` → `roc-vts.com`.

## Firebase

Client config lives in `js/firebase.js`. Protect data with Firestore security rules (not included in this repo).