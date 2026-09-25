# Combos Planner

The tool that keeps `js/combos-db.js` — the ranked combo list the Generator, the Hero
Atlas and the counter tables all read — in one piece. It runs in two places, and both
places run the *same* interface:

| Host | Where | Loads from | Save writes |
| --- | --- | --- | --- |
| Local tool | `npm run combos:plan` → <http://127.0.0.1:5396/> | `js/combos-db.js` plus the two queue files, over its loopback server | `js/combos-db.js` and `x8-queue.json` on disk, ready for `git diff` |
| VTS Admin | Admin → **Combos** (Beta) | the shipped `js/combos-db.js` (served as source next to the bundled copy) plus a draft kept in the browser | rebuilds `js/combos-db.js` in the browser and downloads it for review |

## Files

- `js/combos-planner-ui.js` — the interface. `mountCombosPlanner(root, adapter)` renders
  it and returns `{ destroy() }`; everything it needs from a host arrives through the
  adapter (`load`, `save`, labels, storage prefix, unload guard). It touches nothing
  outside its mount element and every style is scoped to `.combos-planner`.
- `js/combo-plan.js` — the engine: parse the file, describe the view, apply a plan and
  rebuild the file text. Pure strings in and out, no DOM and no `node:` imports, so the
  browser host and the node host run identical code and cannot drift.
- `css/combos-planner.css` — the interface's stylesheet, scoped and driven by the site's
  shared tokens with local fallbacks. Loaded lazily by whichever host mounts the tool.
- `js/combo-lanes.js` — troop, paid and tier facts, the filters, the sorts, the overlap
  check and the troop logos.
- `tools/combos-planner/host.js` — the local host: a loopback adapter over
  `scripts/combos-planner-server.mjs`.
- `js/admin-combos.js` — the admin host: reads the shipped database, rebuilds the file on
  Save, and keeps unplaced added lineups in a browser draft.

## A plan

```
{ order:    [{ id, anchor }],   // where each new lineup sits (anchor '' = waiting at the end)
  added:    [{ id, heroes, skin }],
  baseOrder:[id],               // the current lineups, in order (all of them, once each)
  edits:    [{ id, heroes, skin }],
  removed:  [id] }
```

Ids come from the view: `b0…` for current lineups in file order, `x0…` for the lineups
that carry an X8 hero. The engine validates every plan (three different heroes, known
names, skin codes of `[123]{3}`, no duplicate lineup, nothing crossing the current/new
line) and refuses rather than writing something half-valid. Removing a lineup takes its
line out and drops the lineups anchored above it back to the end of the list instead of
losing them.

An unchanged plan reproduces the file **byte for byte**: every entry stays on one line,
so comments, blank lines and the section banners survive any reorder. That property is
pinned by `tests/unit/combos-planner.test.mjs`.

## Adding lineups to rank

- `tools/combos-planner/x8-queue.js` — hand-written, for the local tool. The planner only
  reads it; a lineup leaves the list once the same three heroes and skin code are in the
  database. The file explains the skin-code digits inline.
- `tools/combos-planner/x8-queue.json` — what the local tool's Add form keeps.
- The admin tab has no queue file: lineups you add there live in the browser as a draft
  and stay listed until you place them or remove them.

## Shipping a change

The local tool writes the file directly, so the change ships as a reviewed commit:
`git diff`, then commit and push. The admin tab hands you the rebuilt file (download,
plus the clipboard) for the same review; players keep the current list until that file is
committed, and the tab says so.

## Tests

`tests/unit/combos-planner.test.mjs` (server contract and the file round trip),
`combo-plan.test.mjs` (the shared engine: the view, the queue, and a browser-side plan's
result), `combos-planner-lanes.test.mjs` (filters, sorts, overlap), `combos-db.test.mjs`
(the shipped list's own invariants) and `combos-admin-tab.test.mjs` (the tab is declared,
mounts lazily, runs the shared interface and keeps its styles scoped).

## Not built yet

Publishing without a deploy — a stored plan the site resolves at load — is a separate
release: it needs a `firestore.rules` block deployed and touches the Generator, the Hero
Atlas ranks, the counter tables and their tests. The adapter seam above is what makes it
a small change instead of a rewrite.
