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
- `js/combo-workflow.js` — the placement workflow, pure as well: the ranking as rows,
  placing a block at a gap, the suggested slot, auto-draft, grouping by X8 hero, the
  undo history, the plan Save sends, the save summary and the paste parser.
- `js/hero-name-match.js` — reading typed hero names (case, "The", aliases, prefixes,
  small typos); shared with `scripts/roc-combo-importer.mjs`.
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

## Placing a season's lineups

The interface is keyboard-first (the **Keys** button lists everything):

| Key | Does |
| --- | --- |
| `J` / `K` | next / previous lineup in the queue |
| `Enter` | accept the suggested slot (or place a multi-selection as a block) |
| digits, then `Enter` | place above that rank |
| `↑` / `↓`, `Shift` + `↑` / `↓` | move the selected placed lineup one row / ten rows |
| `U` | unplace it |
| `Z` / `Shift+Z` (and `Ctrl+Z` / `Ctrl+Shift+Z`) | undo / redo |
| `Ctrl+S` | review the changed lines, then save |
| `Esc` | cancel the typed rank, placing, the selection or the dialog |

Keys do nothing while you type in a field, and only act while the planner is on screen.

**Suggestions.** Every unplaced lineup carries a suggested slot and its reason, from
four signals in order: (a) a current lineup sharing two of its heroes, preferring the one
where the X8 hero takes the replaced hero's slot — the suggestion is directly above it;
(b) what you already placed: when an X8 hero replacing the same hero was placed N rows
from its analogue, the new one gets the same offset (the median of yours, learned from
the plan in memory); (c) a lineup without a paid hero goes below a run of paid lineups
that directly follows the gap; (d) with no analogue, the ROC Academy tier maps to the
median rank of your placements of that tier, or the lineup waits at the end.
**Auto-draft all** places every lineup at its suggestion as one undoable step.

**Focus view.** Selecting a lineup shows the ±15 rows around its place or suggestion
(the **All rows** switch shows everything) and tints rows that share two or more heroes
with it. Rows are compact by default (about 29px, 24px portraits); **Comfortable** brings
back larger rows and word badges, and each host remembers the choice.

**Queue.** Grouped by X8 hero with progress per group and overall, filterable by troop
(and paid, tier, sort under Filters). Shift/Ctrl-click selects several lineups to place as
one block. **Paste lineups** reads lines such as `Lawman / Bjorn / The Avalanche` or
`Lawman, Bjorn, Avalanche 222`, lists names it cannot match for correction, and adds the
rest to the queue.

**Safety.** Every change is one undo step. Unsaved work is kept in `localStorage` per
host (`combosPlannerDraft`, `vtsCombosAdminDraft`) and offered back on load with
*Restore draft / Discard*; a draft made against a different `combos-db.js` is set aside.
Save first shows a summary ("14 placed, 3 moved, 2 new, 1 edited") and the exact lines
of `combos-db.js` it changes.

## Adding lineups to rank

- `tools/combos-planner/x8-queue.js` — hand-written, for the local tool. The planner only
  reads it; a lineup leaves the list once the same three heroes and skin code are in the
  database. The file explains the skin-code digits inline.
- `tools/combos-planner/x8-queue.json` — what the local tool's Add form keeps.
- The admin tab has no queue file: lineups you add there live in the browser as a draft
  and stay listed until you place them or remove them.

## Portraits

Portraits come from `js/heroes-data.js`: `static.wixstatic.com` and `i.ibb.co` URLs, or
`images/heroes/…` paths relative to the page. The admin page's CSP must allow both hosts
in `img-src` (it lacked `i.ibb.co`, which is why most X2 portraits showed the grey
placeholder there); `tests/unit/combos-admin-tab.test.mjs` now checks every hero's URL
against `admin.html`'s CSP and every local path on disk. A portrait that still fails
shows `images/heroes/portrait-unavailable.svg`.

## Shipping a change

The local tool writes the file directly, so the change ships as a reviewed commit:
`git diff`, then commit and push. The admin tab hands you the rebuilt file (download,
plus the clipboard) for the same review; players keep the current list until that file is
committed, and the tab says so.

## Tests

`tests/unit/combos-planner.test.mjs` (server contract and the file round trip),
`combo-workflow.test.mjs` (each suggestion signal, auto-draft, moves, undo/redo, paste
parsing and the save summary, plus the no-op byte-for-byte save through the new plan
builder),
`combo-plan.test.mjs` (the shared engine: the view, the queue, and a browser-side plan's
result), `combos-planner-lanes.test.mjs` (filters, sorts, overlap), `combos-db.test.mjs`
(the shipped list's own invariants) and `combos-admin-tab.test.mjs` (the tab is declared,
mounts lazily, runs the shared interface, keeps its styles scoped and its portraits
allowed). `npm run combos:test` drives the local tool in a browser
(`tests/combos-planner-keys.spec.js`, `playwright.combos.config.js`): J then Enter
places, Z undoes, Ctrl+S shows the summary, digits and arrows, the draft prompt, and the
paste import. It never confirms Save, so the database file is not written.

## Not built yet

Publishing without a deploy — a stored plan the site resolves at load — is a separate
release: it needs a `firestore.rules` block deployed and touches the Generator, the Hero
Atlas ranks, the counter tables and their tests. The adapter seam above is what makes it
a small change instead of a rewrite.
