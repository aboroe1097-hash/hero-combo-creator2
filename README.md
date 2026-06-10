# Hero Combo Creator — VTS 1097 (b5.0)

Static web tool for **Rise of Castles: Ice & Fire** — hero combos, Eden planning, loyalty math, and more.

## Features

- **Manual Builder** — drag-and-drop 3-hero combos, save to Firebase, export as image/text
- **Combo Generator** — top-5 ranked combos from your roster + "Surprise Me" random mode
- **Eden Map Planner** — interactive X1 map with terrain, paths, and distance measurement
- **Eden Loyalty Calculator** — processing times, poison %, upgrade paths
- **Tech Research Calculator** — medal/resource tracking per season (S0–X2)
- **Hero Atlas** — rankings, skills, synergies, adjustable hero bonuses
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
| `js/eden-map-data.js` | Map structure data |
| `js/eden-map-terrain.js` | Terrain + pathfinding |
| `js/tech-db.js` | Tech research costs |
| `js/translations.js` | i18n (11 languages) |
| `js/heroes-data.js` | Hero roster (name, season, type, image URLs) |
| `js/utils.js` | Shared helpers (e.g. HTML escaping) |
| `js/combo-counters.js` | Combo counter display |

## Run locally

Serve the folder with any static server, e.g.:

```bash
npx serve .
```

Open `http://localhost:3000` (or the port shown).

## Deploy

Configured for GitHub Pages via `CNAME` → `roc-vts.com`.

## Firebase

Client config lives in `js/firebase.js`. Protect data with Firestore security rules (not included in this repo).