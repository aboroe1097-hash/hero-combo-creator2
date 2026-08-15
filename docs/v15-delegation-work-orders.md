# v15.0.0 — delegation work orders

Paste-ready work orders for external models. Each one is scoped to **one file**,
inlines the **exact list** to act on, and ends with an **acceptance command** the
delegator runs before accepting the result.

Route (from `CLAUDE.md`):

```bash
bash ~/.claude/scripts/delegate.sh mid -R "<why>" -C "D:/Project/hero-combo-creator2" "<prompt>"
```

Always pass `-C` with the absolute checkout path, or the worker edits the wrong
tree. Check every result with `delegate.sh summary` plus `git diff --numstat` —
a row reading `ok` with no diff means the worker replied without editing.

Keep for yourself: the Banners Planner data model, the Throne Buffs tab layout,
the season-scope boundary, and anything touching `firestore.rules`. Those are
judgement calls, not fills.

---

## WO-1 — Throne Buffs locale fill (12 calls, one per file)

**Why delegate:** pure translation fill against a fixed key list.

**Per-call prompt** (substitute `<LOCALE>` and the target path):

> Edit ONLY `js/i18n/admin-runtime/<LOCALE>.js`. Touch no other file.
>
> This file is a flat object of UI strings. Add the following keys, translated
> into <LANGUAGE>, immediately after the existing `adminNavGroupStanding` key.
> Match the file's existing quoting and indentation exactly. Do not reorder,
> reword, or remove any existing key.
>
> ```
> adminThroneTab               → "Throne Buffs"
> adminThroneWeekLabel         → "Assignment week"
> adminThroneSlotColumn        → "Throne title"
> adminThroneMemberColumn      → "Member"
> adminThroneReasonColumn      → "Reason (optional)"
> adminThroneSearchLabel       → "Search past weeks"
> adminThroneSearchPlaceholder → "Name, reason or title"
> adminThroneFairnessTitle     → "Rotation fairness"
> adminThroneFairnessTotal     → "Buffs held"
> adminThroneFairnessLast      → "Weeks since last"
> adminThroneOpenSlots         → "{n} of {total} slots filled"
> adminThroneDuplicateWarning  → "{name} holds more than one buff this week."
> adminThroneExportBtn         → "Export week as PNG"
> adminThroneSaveBtn           → "Save week"
> adminThroneEmptyHistory      → "No weeks recorded yet."
> ```
>
> `{n}`, `{total}` and `{name}` are placeholders. They must appear verbatim in
> your translation, exactly once each, spelled the same as above. Translate the
> surrounding words only.
>
> Throne title names (Emperor, Queen, Prime Minister, Barrister, Finance
> Minister, Legion Master, Royal Guard, Minister of Science, Minister of
> Construction) are game data and are NOT in this file — do not add them.

**Locales:** `ar de es fr id it kr pt ru tr zh` plus the English source in
`js/i18n/admin-runtime-copy.js`.

**Acceptance:**

```bash
node scripts/check-i18n.mjs && node --test tests/unit/admin-runtime-i18n.test.mjs
```

---

## WO-2 — Banner catalog transcription

**Why delegate:** mechanical transcription from a known table into a data module.

**Prompt:**

> Create ONLY `js/banners-catalog.js`. Touch no other file.
>
> Export a frozen array `BANNERS` transcribed verbatim from the rows below, and
> a derived `BANNER_IDS`. Each entry: `{ id, name, group, availability, points,
> pilot, status }`. Derive `id` by lowercasing the name and replacing every run
> of non-alphanumeric characters with a single hyphen, trimming hyphens from
> both ends. Preserve the names exactly as written, including the `(02)` suffix
> and the capitalisation of `BiG BOiiE`; trim trailing spaces from names.
> An empty cell becomes an empty string, never a guess.
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
> Use `Object.freeze` on the array and every entry, matching the style of
> `js/throne-buffs-data.js`. No DOM, no imports, no invented fields. Do not
> normalise `Find info` / `Find Info` to one spelling — keep each row as given.

**Acceptance:**

```bash
npx eslint js/banners-catalog.js && node -e "import('./js/banners-catalog.js').then(m=>console.log(m.BANNERS.length, new Set(m.BANNER_IDS).size))"
```

Expect `19 19`.

---

## WO-3 — Version surfaces to 15.0.0

**Why delegate:** repetitive find-and-replace across known files. **One call per
file** — a single call spanning all of them comes back empty.

**Per-call prompt:**

> Edit ONLY `<FILE>`. Touch no other file. Change every occurrence of the
> application version `14.3.9` to `15.0.0`. Do not touch dependency versions,
> lockfile integrity hashes, `?v=` cache-bust stamps, or any other number.

**Files:** `package.json`, `package-lock.json` (root and the self-referencing
package entry only), `index.html`, `admin.html`, `eden-x1.html`, `eden-x2.html`,
`arcade.html`, `specialization-towers.html`, `js/eden-x1.js`, `README.md`.

**Acceptance:**

```bash
npm run version:check
```

Note: `CHANGELOG.md` is **not** delegated — write the release notes yourself.

---

## WO-4 — Version cadence hole

**Why delegate:** small, well-specified logic fix with a clear test.

**Prompt:**

> Edit ONLY `scripts/check-version-consistency.mjs`. Touch no other file.
>
> At line 112 the previous-release expectation is computed as:
>
> ```js
> const expectedPrevious =
>   patch > 0 ? `${major}.${minor}.${patch - 1}` : minor > 0 ? `${major}.${minor - 1}.20` : null;
> ```
>
> When patch and minor are both 0 — a major release such as `15.0.0` — this
> yields `null` and the cadence check is skipped entirely, so a major bump is
> never validated against its predecessor. Fix it: for a major release, the
> previous CHANGELOG entry must be the highest `${major - 1}.<minor>.<patch>`
> entry present in `CHANGELOG.md`. If no such entry exists, keep skipping rather
> than failing. Preserve the existing failure-message format.

**Acceptance:**

```bash
npm run version:check
```

Must pass with `15.0.0` in `package.json` and `14.3.9` as the previous CHANGELOG
entry, and must fail if the `14.x` entry is removed.
