# v15.0.0 — delegation work orders

Paste-ready work orders for external models. Each one is scoped to **one file
per call**, inlines the **exact list** to act on, and ends with an **acceptance
command** the delegator runs before accepting the result.

Route (from `CLAUDE.md`):

```bash
bash ~/.claude/scripts/delegate.sh mid -R "<why>" -C "D:/Project/hero-combo-creator2" "<prompt>"
```

Always pass `-C` with the absolute checkout path, or the worker edits the wrong
tree. Check every result with `delegate.sh summary` plus `git diff --numstat` —
a row reading `ok` with no diff means the worker replied without editing.

## Run order and preconditions

1. **WO-1** after the Throne Buffs admin UI lands (the anchor key
   `adminNavGroupStanding` exists in `js/i18n/admin-runtime-copy.js`). If the
   tree does not have that key yet, insert after `adminExpJsonDebug` instead —
   it exists in all twelve packs today.
2. **WO-2** any time; it creates one new file and depends on nothing.
3. **WO-3** and **WO-4** last, right before the release metadata pass. Run
   WO-4 first, then WO-3, then `npm run version:check` once.

Keep for yourself: the Banners Planner data model, the Throne Buffs tab layout,
the season-scope boundary, `CHANGELOG.md` release notes, and anything touching
`firestore.rules`. Those are judgement calls, not fills.

---

## WO-1 — Throne Buffs locale fill (12 calls, one per file)

**Why delegate:** pure translation fill against a fixed key list.

**Per-call prompt** (substitute `<LANGUAGE>` and `<FILE>` from the table below):

> Edit ONLY `<FILE>`. Touch no other file.
>
> This file is a flat object of UI strings wrapped in `Object.freeze({ ... })`.
> Add the following keys, translated into <LANGUAGE>, immediately after the
> existing `adminNavGroupStanding` key (if that key does not exist in the file,
> insert after `adminExpJsonDebug` instead). Match the file's existing quoting
> and indentation exactly: single-quoted keys and values, 2-space indent, one
> key per line with a trailing comma. Do not reorder, reword, or remove any
> existing key.
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
> **Placeholder contract (enforced by `scripts/check-i18n.mjs` and
> `tests/unit/admin-runtime-i18n.test.mjs`).** The checker extracts every
> `{word}` token from the English value and from your translation, sorts both
> lists, and fails unless they are identical. Therefore:
>
> - `adminThroneOpenSlots` must contain exactly one `{n}` and exactly one
>   `{total}`, spelled and cased exactly as written, and no other `{...}` token.
> - `adminThroneDuplicateWarning` must contain exactly one `{name}` and no other
>   `{...}` token.
> - The other thirteen keys must contain **no** `{...}` tokens at all. Never
>   wrap ordinary words in braces for emphasis or word order — that adds tokens
>   and fails the check. If your language needs a different word order, move
>   the tokens, keep them intact.
> - Values must be non-blank strings with no `??`, no `�` replacement character,
>   and no pattern like a letter immediately followed by `?` and another letter.
> - Add all fifteen keys, add no other keys, and do not rename the keys.
>
> Throne title names (Emperor, Queen, Prime Minister, Barrister, Finance
> Minister, Legion Master, Royal Guard, Minister of Science, Minister of
> Construction) are game data and are NOT in this file — do not add them.

**Calls:**

| #  | Locale | Language            | File (relative to repo root)                    |
|----|--------|---------------------|-------------------------------------------------|
| 1  | ar     | Arabic (RTL)        | `js/i18n/admin-runtime/ar.js`                   |
| 2  | de     | German              | `js/i18n/admin-runtime/de.js`                   |
| 3  | es     | Spanish             | `js/i18n/admin-runtime/es.js`                   |
| 4  | fr     | French              | `js/i18n/admin-runtime/fr.js`                   |
| 5  | id     | Indonesian          | `js/i18n/admin-runtime/id.js`                   |
| 6  | it     | Italian             | `js/i18n/admin-runtime/it.js`                   |
| 7  | kr     | Korean              | `js/i18n/admin-runtime/kr.js`                   |
| 8  | pt     | Portuguese          | `js/i18n/admin-runtime/pt.js`                   |
| 9  | ru     | Russian             | `js/i18n/admin-runtime/ru.js`                   |
| 10 | tr     | Turkish             | `js/i18n/admin-runtime/tr.js`                   |
| 11 | zh     | Chinese (Simplified)| `js/i18n/admin-runtime/zh.js`                   |
| 12 | en     | English (no translation — insert the exact values above) | `js/i18n/admin-runtime-copy.js` |

**Acceptance (run once after all twelve calls):**

```bash
node scripts/check-i18n.mjs && node --test tests/unit/admin-runtime-i18n.test.mjs
```

Both must exit 0. The unit test also enforces exact sorted key parity between
the English pack and every locale pack, so a call that skips a key or invents
one fails here.

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
> Use `Object.freeze` on the array and on every entry object. Export
> `BANNER_IDS` as a frozen array of the ids in order. No DOM code, no imports,
> no invented fields, no comments beyond a one-line header. Do not normalise
> `Find info` / `Find Info` to one spelling — keep each row as given.

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
> Preserve quoting and formatting exactly.

**Calls** (each file is one delegate call; the table also says what the version
string is in that file so the worker does not hunt):

| #  | File                                | What carries the version                                   |
|----|-------------------------------------|-------------------------------------------------------------|
| 1  | `package.json`                      | `"version"` field                                          |
| 2  | `package-lock.json`                 | root `version` and the self-referencing `packages[""]` entry only |
| 3  | `js/state.js`                       | `APP_VERSION` constant                                     |
| 4  | `js/admin-page.js`                  | `APP_VERSION` constant                                     |
| 5  | `js/eden-x1.js`                     | `APP_VERSION` constant                                     |
| 6  | `js/arcade.js`                      | `APP_VERSION` constant                                     |
| 7  | `js/battle-simulator-app.js`        | `APP_VERSION` constant                                     |
| 8  | `js/specialization-towers-v2-app.js`| `APP_VERSION` constant                                     |
| 9  | `js/ai/tool-envelope.js`            | `DEFAULT_APP_VERSION` constant                             |
| 10 | `battle-simulator.html`             | `<meta name="vts-app-version" content="…">`                |
| 11 | `specialization-towers.html`        | `<meta name="vts-app-version" content="…">`                |
| 12 | `index.html`                        | public footer `VTS 1097 · v…`                              |
| 13 | `admin.html`                        | public footer `VTS 1097 · v…`                              |
| 14 | `eden-x1.html`                      | public footer `VTS 1097 · v…`                              |
| 15 | `arcade.html`                       | public footer `VTS 1097 · v…`                              |
| 16 | `README.md`                         | release heading `# Hero Combo Creator - VTS 1097 (v…)`     |

**Not delegated — do these yourself:**

- `CHANGELOG.md`: write the `## 15.0.0` release notes, then run
  `npm run velo:changelog` to regenerate `js/ai/changelog-digest.js`.
- `scripts/check-size.mjs`: the `14.3.9` strings there are audit comment labels,
  not the app version. Leave them alone.
- `HANDOFF.md`: historical notes. Leave alone.

**Acceptance:**

```bash
npm run version:check
```

Must pass with `15.0.0` in `package.json`.

---

## WO-4 — Version cadence hole

**Why delegate:** small, well-specified logic fix with a clear test.

**Prompt:**

> Edit ONLY `scripts/check-version-consistency.mjs`. Touch no other file.
>
> The previous-release expectation is currently computed as:
>
> ```js
>   const expectedPrevious =
>     patch > 0 ? `${major}.${minor}.${patch - 1}` : minor > 0 ? `${major}.${minor - 1}.20` : null;
>
>   if (expectedPrevious && changelogVersions[1] !== expectedPrevious) {
> ```
>
> When patch and minor are both 0 — a major release such as `15.0.0` — this
> yields `null` and the cadence check is skipped entirely, so a major bump is
> never validated against its predecessor. Fix it: for a major release, the
> previous CHANGELOG entry must be the highest `${major - 1}.<minor>.<patch>`
> entry present in `CHANGELOG.md`. If no such entry exists, keep skipping
> rather than failing. Preserve the existing failure-message format.

**Acceptance:**

```bash
npm run version:check
```

- Passes with `15.0.0` in `package.json`, `## 15.0.0` as the latest CHANGELOG
  entry, and `14.3.9` as the second entry.
- Fails when a `14.x` entry exists in the changelog but the entry immediately
  after `15.0.0` is not the highest `14.x` (e.g. it was replaced with `13.x`).
- Skips (passes) when no `14.x` entry exists at all.
