# PR #153 — delegation plan

Follow-up to 15.0.0 (#152, merged `aafeb882`). Base every branch on the latest
`origin/gh-pages`.

Route (from `CLAUDE.md`):

```bash
bash ~/.claude/scripts/delegate.sh mid -R "<why>" -C "D:/Project/hero-combo-creator2" "<prompt>"
```

Always pass `-C` with the absolute checkout path. After every call run
`delegate.sh summary` **and** `git diff --numstat <file>` — a row reading `ok`
with no diff means the worker replied without editing anything.

**One file per call.** A work order spanning several files comes back with
nothing done. Where an item below touches more than one file it is split into
numbered calls; run them in order.

---

## The shape we are building toward

VTS Admin splits into two sides. This is the organising idea behind WO-1, and
every later work order assumes it.

**Eden side** — everything the Eden workspace switch governs. Changing the
season changes all of it: Dashboard, Analytics, Upload Structures,
Contributions, Banners List (OCR), **Banners Planner (new)**, Pathers, Shield
Wall, Eden Workspace/Votes, Bonus Team Effort Points.

**Alliance side** — never season-scoped, no workspace switch: All-Star BoH,
**Throne Buffs (new)**, Alliance View.

15.0.0 already ships the embryo: `<section class="dash-season-scope"
data-subtab-scope="season">` wraps the season rail, and a second
`.dash-subtab-nav[data-subtab-scope="global"]` holds Standing programs. WO-1
promotes that into a real two-sided structure and moves Alliance View across.

**Storage rule that follows from the split:** Eden-side records go through
`edenWorkspaceFirestorePath(ACTIVE_EDEN_WORKSPACE_ID, …)` and
`edenWorkspaceStorageKey(base, ACTIVE_EDEN_WORKSPACE_ID)`. Alliance-side records
use fixed global paths and plain keys — a season rollover must never move or
clear them. Throne Buffs and the Banners *catalog* are Alliance-side. Banner
*event assignments* are Eden-side, because they belong to a season.

---

## Keep for yourself (do not delegate)

- `firestore.rules` — any new collection needs rules, and this file has hit the
  1000-expression per-request limit before.
- The Banners Planner and Throne Buffs Firestore contracts (paths, shapes).
- `CHANGELOG.md` release notes and the version bump.
- Anything deciding *which side* a tool belongs to.

---

## WO-1 — Split the Admin rail into two sides

**Why delegate:** mechanical markup restructure against an explicit target.

### Call 1 of 2 — `tabs/admin.html`

> Edit ONLY `tabs/admin.html`. Touch no other file.
>
> The file currently has two `.dash-subtab-nav.dash-subtab-nav-grouped` blocks:
> one inside `<section class="dash-season-scope" data-subtab-scope="season">`,
> and one after it with `data-subtab-scope="global"`.
>
> Make these changes and nothing else:
>
> 1. Move the `<button class="dash-subtab-btn" data-subtab="allianceView">`
>    element — the whole button including its inline `<svg>` — out of the
>    `data-subtab-group="programs"` container and into the
>    `data-subtab-group="standing"` container, placing it BEFORE the existing
>    `data-subtab="allStarBoh"` button. Do not change the button's own markup.
> 2. In the global nav, change the group title from
>    `data-i18n="adminNavGroupStanding"` to
>    `data-i18n="adminNavGroupAlliance"` and its visible text to
>    `Alliance management`.
> 3. Add `<h2 class="sr-only" id="dashAllianceScopeTitle"
>    data-i18n="adminAllianceScopeTitle">Alliance management</h2>` as the first
>    child of the global nav, and add
>    `aria-labelledby="dashAllianceScopeTitle"` to that nav element.
>
> Keep every `data-subtab` value exactly as it is. Do not reformat the file, do
> not reindent untouched lines, and do not add or remove any other element.

### Call 2 of 2 — locale keys

Run the per-locale prompt from **WO-6** below with this key list instead:

```
adminNavGroupAlliance   → "Alliance management"
adminAllianceScopeTitle → "Alliance management"
```

**Acceptance:**

```bash
node scripts/check-i18n.mjs
node --test tests/unit/admin-all-star-boh-integration.test.mjs tests/unit/admin-runtime-i18n.test.mjs
```

The BoH integration test asserts Alliance View is season-scoped
(`allianceTab < standingNav`). That assertion is now wrong by design — update
it in the same call to assert Alliance View sits in the standing nav
(`allianceTab > standingNav`) and rename the test accordingly.

---

## WO-2 — Banner catalog data module

**Why delegate:** verbatim transcription from a fixed table.

**Prompt:**

> Create ONLY `js/banners-catalog.js`. Touch no other file.
>
> Export a frozen array `BANNERS` transcribed verbatim from the rows below, and
> a derived frozen `BANNER_IDS`. Each entry:
> `{ id, name, group, availability, points, pilot, status }`.
>
> Derive `id` by lowercasing the name and replacing every run of
> non-alphanumeric characters with a single hyphen, trimming hyphens from both
> ends. Preserve names exactly, including the `(02)` suffix and the
> capitalisation of `BiG BOiiE`; trim trailing spaces. An empty cell becomes an
> empty string, never a guess. Do NOT normalise `Find info` and `Find Info` to
> one spelling — keep each row exactly as given.
>
> ```
> group | name            | availability | points    | pilot       | status
> 1097  | Sarafina        | 1-3 / 14-19  | Full      | Sarafino    | Perm
> 1097  | Angel Banner    | 0-5 / 10     | Full      | Angel/Kiji  | Perm
> 1097  | Undead          |              | Full      | Undead      | Perm
> 1097  | Amira Zee       |              | Full      | Zena        | Perm
> 1097  | Zena Banner     |              | Full      | Zena        | Half Season
> 1097  | Redbull Banner  |              | Full      | Redbull     | Perm
> 1097  | Viper           |              | Full      | Redbull     | Perm
> 1097  | Teresita (02)   |              | Full      | Redbull     | Perm
> 1097  | OSO             |              | Full      | Redbull     | Perm
> 1097  | Kika            | 5-20         | Full      | Kika        | Perm
> 1097  | Roha Banner     |              |           | Roha        | Perm
> 1097  | AK Banner       |              |           |             | Find info
> 1097  | Maximus Banner  |              |           |             | Find info
> 1097  | BiG BOiiE       |              |           |             | Find info
> 1100  | Kika Banner 2   | 5-20         | Full      | Kika        | Perm
> 1100  | Beatz           | 5-20         | 59 points | Kika        | WIP
> 1100  | Alex&Kika       | 5-20         | 55 points | Kika        | WIP
> Others| Footloos Banner |              |           |             | Find Info
> Others| Molly Banner    |              |           |             | Find Info
> ```
>
> Use `Object.freeze` on the array and on every entry, matching the style of
> `js/throne-buffs-data.js`. Pure data: no DOM, no imports, no invented fields.

**Acceptance:**

```bash
npx eslint js/banners-catalog.js
node -e "import('./js/banners-catalog.js').then(m=>console.log(m.BANNERS.length, new Set(m.BANNER_IDS).size))"
```

Expect `19 19`.

---

## WO-3 — Banners Planner model (Eden side)

**Why delegate:** pure functions against a written contract.

**Prompt:**

> Create ONLY `js/banners-planner-model.js`. Touch no other file. Pure model:
> no DOM, no Firestore, no imports except from `./banners-catalog.js`.
>
> Model the retired planning sheet. The sheet had one static catalog and then a
> repeated block per event ("Week 1 # Sunday", "Week 2 # Tuesday", …), each
> block listing every banner with an `Assigned` name and a `Used` boolean.
>
> Export:
>
> - `normalizeEventId(value)` — lowercase, non-alphanumeric runs to single
>   hyphens, trimmed; returns `''` for blank input.
> - `createBannerEvent({ id, label, dateIso })` — returns
>   `{ id, label, dateIso, assignments: {} }` with `id` normalised. Reject a
>   blank id by returning `null`.
> - `normalizeBannerEvent(record, bannerIds)` — returns
>   `{ id, label, dateIso, assignments }` where `assignments` has exactly one
>   entry per id in `bannerIds`, each `{ assigned: string, used: boolean }`.
>   Unknown banner ids in the input are dropped; missing ones become
>   `{ assigned: '', used: false }`. Trim and collapse whitespace in `assigned`
>   and cap it at 40 characters. `used` is `true` only for boolean `true` or the
>   string `'TRUE'` (the sheet exported that literal).
> - `eventSummary(event, bannerIds)` — `{ total, assigned, used, unused }`
>   where `total` is `bannerIds.length`, `assigned` counts non-empty names,
>   `used` counts `used === true`, and `unused = assigned - used`.
> - `bannerUsageTotals(events, bannerIds)` — for each banner id,
>   `{ bannerId, timesAssigned, timesUsed, lastEventId }` over all events,
>   sorted by `timesUsed` ascending then `bannerId`. `lastEventId` is the id of
>   the most recent event in which the banner was used, or `''`.
> - `pilotWorkload(events, banners)` — group by the catalog `pilot` field and
>   return `{ pilot, banners, timesUsed }` sorted by `timesUsed` descending.
>   Banners with an empty `pilot` group under the literal `'Unassigned'`.
> - `unavailableBanners(events, bannerIds)` — banner ids that appear in NO
>   event's assignments, so a banner silently dropped from a week is visible
>   instead of just missing.
>
> Every function must tolerate `null`/`undefined`/non-array input by returning
> an empty result rather than throwing. Comment each export with WHY it exists,
> in the style of `js/throne-buffs-model.js`.

**Acceptance:**

```bash
npx eslint js/banners-planner-model.js
```

Then WO-4 tests it.

---

## WO-4 — Banners Planner model tests

**Prompt:**

> Create ONLY `tests/unit/banners-planner-model.test.mjs`. Touch no other file.
>
> Use `node:test` and `node:assert/strict`, matching the style of
> `tests/unit/throne-buffs-model.test.mjs`. Import from
> `../../js/banners-planner-model.js` and `../../js/banners-catalog.js`.
>
> Cover: the catalog is 19 entries with unique ids; `Teresita (02)` keeps its
> suffix and `BiG BOiiE` its capitalisation; `normalizeBannerEvent` drops
> unknown banner ids and fills missing ones; the string `'TRUE'` counts as used
> but the string `'FALSE'` does not; `eventSummary` arithmetic including
> `unused`; `bannerUsageTotals` ordering and `lastEventId`; `pilotWorkload`
> grouping with the `'Unassigned'` bucket; `unavailableBanners` catching a
> banner missing from every event; and that every exported function returns an
> empty result for `null` input instead of throwing.
>
> Assert real values, never just truthiness.

**Acceptance:**

```bash
node --test tests/unit/banners-planner-model.test.mjs
npx prettier --check tests/unit/banners-planner-model.test.mjs
```

Both must exit 0 (`tests/unit/**/*.mjs` is in the `format:check` allow-list).

---

## WO-5 — Throne Buffs admin tab (Alliance side)

The model, the 9-slot catalog and the icons all shipped in 15.0.0. This is the
UI only.

### Call 1 of 3 — `tabs/admin.html`

> Edit ONLY `tabs/admin.html`. Touch no other file.
>
> 1. In the `data-subtab-group="standing"` container, add a new button after
>    the `data-subtab="allStarBoh"` button:
>    `<button class="dash-subtab-btn" data-subtab="throneBuffs"><span
>    data-i18n="adminThroneTab">Throne Buffs</span></button>`
> 2. Add an empty panel `<div class="dash-subtab-panel hidden"
>    id="dashSubtabThroneBuffs"><section id="dashThroneRoot"></section></div>`
>    immediately after the existing `id="dashSubtabAllStarBoh"` panel.
>
> Change nothing else. Do not reformat or reindent untouched lines.

### Call 2 of 3 — `js/admin-throne-buffs.js`

> Create ONLY `js/admin-throne-buffs.js`. Touch no other file.
>
> Import from `./throne-buffs-data.js` (`THRONE_BUFFS`, `THRONE_BUFF_IDS`,
> `throneBuffIconPath`, `throneBuffInitials`) and `./throne-buffs-model.js`
> (`isoWeekKey`, `normalizeWeekAssignment`, `buildFairnessTable`,
> `buildNameSuggestions`, `searchAssignmentHistory`, `summarizeThroneBuffs`).
>
> Export `renderThroneBuffs(mount, { history = [], rosterMembers = [], onSave })`.
> Render into `mount`:
>
> - A week field (`<input type="week">`) defaulting to `isoWeekKey(new Date())`.
> - One row per entry of `THRONE_BUFFS`, in order: the icon
>   (`<img src="${throneBuffIconPath(id)}" alt="" loading="lazy">` with an
>   `onerror` that swaps in a `<span>` of `throneBuffInitials(id)`), the title
>   name, its effects as `label: value` pairs, a member `<input list=...>`
>   backed by a `<datalist>` built from `buildNameSuggestions`, and an optional
>   reason `<input maxlength="120">`.
> - A summary line using `summarizeThroneBuffs`, showing filled/total slots and
>   a warning when `duplicateMembers` is non-empty.
> - A search field filtering past weeks via `searchAssignmentHistory`.
> - A fairness table from `buildFairnessTable`: member, buffs held, weeks since
>   last.
> - A Save button calling `onSave(normalizeWeekAssignment(record, THRONE_BUFF_IDS))`.
>
> Escape every interpolated string. No Firestore, no global state, no `innerHTML`
> with unescaped user input. Throne title names and effects are game data — do
> not translate them. All other visible text via the `data-i18n` keys already in
> `js/i18n/admin-runtime-copy.js` (`adminThroneWeekLabel`, `adminThroneSlotColumn`,
> `adminThroneMemberColumn`, `adminThroneReasonColumn`, `adminThroneSearchLabel`,
> `adminThroneFairnessTitle`, `adminThroneFairnessTotal`, `adminThroneFairnessLast`,
> `adminThroneOpenSlots`, `adminThroneDuplicateWarning`, `adminThroneSaveBtn`,
> `adminThroneEmptyHistory`).

### Call 3 of 3 — `js/throne-buffs-export.js`

> Create ONLY `js/throne-buffs-export.js`. Touch no other file.
>
> Export `exportThroneWeekPng(weekRecord, options)` drawing to a `<canvas>` and
> downloading a PNG, following the hand-drawn canvas pattern in
> `js/alliance-view-brief-export.js` (see `canvasBlob` and
> `exportAllianceBriefPng`). Do NOT use html2canvas.
>
> Draw a titled card: the week key as heading, then one row per throne title in
> `THRONE_BUFFS` order showing the title name and the assigned member (or a
> dash), plus the reason in smaller text when present. Filename
> `throne-buffs-${weekKey}.png`. Await `document.fonts.ready` before drawing if
> available.

**Acceptance:**

```bash
npx eslint js/admin-throne-buffs.js js/throne-buffs-export.js
node scripts/check-i18n.mjs
```

---

## WO-6 — Locale fill helper

Reusable per-locale prompt. Substitute `<LANGUAGE>`, `<FILE>` and the key list.

> Edit ONLY `<FILE>`. Touch no other file.
>
> This file is a flat object of UI strings wrapped in `Object.freeze({ ... })`.
> Add the keys below, translated into <LANGUAGE>, immediately after the existing
> `adminNavGroupStanding` key. Match the file's quoting and indentation exactly:
> single-quoted keys and values, 2-space indent, one key per line with a
> trailing comma. Do not reorder, reword or remove any existing key.
>
> **If a value contains an apostrophe, use double quotes for that value.** A
> single-quoted string containing `'` is a syntax error and will fail lint.
>
> **Placeholder contract** (enforced by `scripts/check-i18n.mjs`): the checker
> extracts every `{word}` token from the English value and from yours, sorts
> both, and fails unless they match. Keep every token spelled and cased exactly,
> add no new ones, and never wrap ordinary words in braces.

Locales: `ar de es fr id it kr pt ru tr zh`, plus the English source in
`js/i18n/admin-runtime-copy.js`.

---

## WO-7 — Remove the Velo runner from the loader

The travelling sprite under "Loading…" is `.vts-loader__runner`.

### Call 1 of 2 — `js/loader-v14.js`

> Edit ONLY `js/loader-v14.js`. Touch no other file.
>
> Remove the runner figure from the rendered loader: the `figure`, `body` and
> `helmet` elements built around lines 305-320, and the code appending that
> figure to the trail wrapper. Keep the stage, kicker, title, trail, rail, fill,
> percent and status elements exactly as they are — the progress bar must still
> render and still animate.
>
> Delete any variable or helper left unused by the removal (for example
> `cloneVisual` if nothing else calls it) so `npx eslint` stays clean. Do not
> change the module's exported API or its call signatures.

### Call 2 of 2 — `css/loader-v14.css`

> Edit ONLY `css/loader-v14.css`. Touch no other file.
>
> Delete every rule whose selector mentions `.vts-loader__runner`, including the
> ones inside media queries and the `.vts-loader.is-complete` state, and delete
> the `@keyframes vts-loader-velo-spark` block if no surviving rule references
> it. Leave `@keyframes vts-loader-indeterminate` and every other rule alone.
> Update the comment near line 161 that says the runner is kept visible on Admin
> and Eden X1, since that is no longer true.

**Acceptance:**

```bash
npx eslint js/loader-v14.js
npm run build
node scripts/check-size.mjs
```

Removing assets should lower CSS/JS totals; the size gate must still pass.

---

## WO-8 — Vialfiend, Strife over Dragon

**Prompt:**

> Edit ONLY `js/strife-db.js`. Touch no other file.
>
> Append one new monster object to the end of the `STRIFE_MONSTERS` array,
> matching the existing entry shape exactly
> (`id`, `name`, `accent`, `imageUrl`, `skills[]` with
> `id`, `name`, `timing`, `target`, `effect`, `answer`, `tags`).
>
> ```
> id: 'vialfiend'
> name: 'Vialfiend'
> accent: '#a855f7'
> imageUrl: 'images/strife/monsters/vialfiend.jpg'
> ```
>
> The four skills, with `effect` transcribed VERBATIM from the game:
>
> 1. id `deaths-aura`, name `Death's Aura`, timing `Every round`,
>    target `2-3 random squads`,
>    effect: `Each round, 90% chance to deal 200% Skill Damage to 2-3 random enemy squads and make their Skill Damage taken +50%, stackable up to 8 stacks, lasting until the end of battle`,
>    tags `['Skill Damage', 'Stacking Debuff']`
> 2. id `intimidate`, name `Intimidate`, timing `Every round`,
>    target `1 random squad each`,
>    effect: `Each round, make 1 random enemy squad enter timid state: 70% chance to fail when releasing an Active Skill and take 500% Skill Damage; each round, make 1 random enemy squad enter hesitation state: 70% chance to fail when releasing an additional attack and take 500% Physical Damage`,
>    tags `['Control', 'Skill Denial']`
> 3. id `demon-wraith`, name `Demon Wraith`, timing `Passive`,
>    target `Vialfiend`,
>    effect: `In battle, Physical Damage taken reduced by 80%, and each instance of damage taken does not exceed 5% of max Troop Power`,
>    tags `['Damage Cap', 'Physical Reduction']`
> 4. id `power-of-the-legion`, name `Power of the Legion`, timing `Passive`,
>    target `Vialfiend`,
>    effect: `The Hero's Legion will have 500% more Might and 70% more Damage, with the marching soldier cap increased by 4875750.`,
>    tags `['Might Buff', 'Troop Cap']`
>
> Note the apostrophes in `Death's Aura` and `The Hero's Legion` — use double
> quotes for those values.
>
> For `answer`, write one short sentence per skill derived from the mechanic,
> matching the tone of existing entries. Suggested, adjust only for phrasing:
> 1. `Stacking Skill Damage amplification punishes long fights — burst it down before the stacks build.`
> 2. `Bring squads that do not depend on Active Skills or extra attacks landing.`
> 3. `Physical damage is capped and cut by 80% — bring Skill Damage instead.`
> 4. `Expect far more Might than the listed level; do not read the tier as the real threat.`
>
> Change nothing else in the file.

**Acceptance:**

```bash
npx eslint js/strife-db.js
node -e "import('./js/strife-db.js').then(m=>{const v=m.STRIFE_MONSTERS.find(x=>x.id==='vialfiend');console.log(v?.skills.length, v?.name)})"
```

Expect `4 Vialfiend`. The owner must supply
`images/strife/monsters/vialfiend.jpg`; until then the card shows a broken
image, so check how sibling monsters handle a missing file first.

---

## Owner-only items (cannot be delegated)

- **Skin item icons.** `assets/skins/items/` still holds only `README.md`. Drop
  in `epic-hero-medal.webp`, `legendary-hero-medal.webp`, `biography-seal.webp`,
  `seasonal-legendary-hero-medal.webp`, `advanced-biography-seal.webp` and the
  slots fill automatically. Until then the Skin Atlas shows initial badges.
- **`images/strife/monsters/vialfiend.jpg`** for WO-8.
- **Emperor effect values.** `js/throne-buffs-data.js` has `effects: []` for the
  Emperor by design rather than guessed. A screenshot of the Emperor tab with
  its effect list showing is all that is needed.

---

## Not yet specified — needs a decision first

**Eden hub layout bug.** `eden-x2.html` is embedded in the Eden Hub through an
iframe, so it renders its own standalone chrome (deck title, clock, language
picker, Account chip, Admin Dashboard button) inside the hub panel, clipped at
the right edge. Two ways to fix, and the choice is a design call:

1. Give the iframe `?embed=1` and hide the chrome via a body class — smallest
   change, keeps one page serving both routes.
2. Extract the season view into a fragment the hub fetches directly, like
   `tabs/loyalty.html`, and keep `eden-x2.html` as the standalone wrapper —
   cleaner, no iframe, but a real refactor of a 1400-line page.

Same bug affects the Previous Seasons panel, which iframes `eden-x1.html`.

**Admin margins and the white-on-white season select.** The
`#dashWorkspaceSelect` dropdown renders unstyled white text on a white popup,
and the header overlaps the account chip with the `EDEN X1 VIEW` link. Needs
someone to read computed styles in a browser first; delegating a CSS fix
blind will produce guesswork.

---

## Release and verification

Version `15.0.1` (the 20-patch train continues; `scripts/check-version-consistency.mjs`
enforces it). Sixteen version surfaces — let the checker name them rather than
grepping:

```bash
node scripts/check-version-consistency.mjs
```

Then regenerate what is generated, and run the gate:

```bash
npm run velo:changelog
node scripts/update-build-metadata.mjs
npm run check
```

`npm run check` is required here: this adds new Firestore collections, which
AGENTS.md classes as high-risk. New collections also need rules — write those
yourself and deploy them separately with
`npx firebase deploy --only firestore:rules --project abocombo`, then confirm
with `node scripts/firestore-rules-status.mjs`.
