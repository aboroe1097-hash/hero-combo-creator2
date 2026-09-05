# 16.0.0 Lane 4 — En-Canonical i18n Key List (FINAL for translation lanes)

> **Historical record — v16 translation handoff.** Reviewed for documentation routing on 2026-09-05.
> The key list is a historical handoff, not authority to overwrite present translations. Derive keys and supported locales from the current domain loaders and preserve placeholders.
> Original content below is retained as dated evidence, not current release instructions.

**Current starting points:** [js/translations.js](../../../js/translations.js) · [tests/unit/hero-atlas-i18n.test.mjs](../../../tests/unit/hero-atlas-i18n.test.mjs) · [Documentation index](../../README.md).


Status: EN-CANONICAL FINAL (2026-09-02, lane 4 rev 2). This is the single source
of truth translation work orders consume. **No `js/` file may be edited until T0
calls implementation start** — this document is the frozen reference.

Companion: `docs/plans/lanes/overhaul-16.0.0-lane4-hero-ui.md` §4.

## Surface map (which keys land where)

| Surface | Files | Non-English count | Section here |
|---|---|---|---|
| Core app chrome | `js/i18n/en.js` + `js/i18n/{ar,de,es,fr,hr,id,it,kr,pt,ru,tr,zh}.js` | **12** (incl. `hr`) | §1 |
| Hero Atlas UI keys | `js/i18n/hero-atlas/ui.js` (`KEYS` + `ROWS` blocks, en + non-en) | 11 (no `hr`) | §2 |
| Hero Atlas content strings | `js/i18n/hero-atlas/locales/{ar,de,es,fr,id,it,kr,pt,ru,tr,zh}.js` `strings` packs | 11 | §3 |
| Battle Simulator keys | `js/battle-simulator-i18n.js` (`BATTLE_SIMULATOR_ENGLISH`) + `js/battle-simulator-i18n-packs.js` | 11 | §4 |

Conventions: placeholders `{n}`, `{hero}`, `{season}`, `{status}`, `{lo}`, `{hi}`,
`{matched}`, `{total}`, `{delta}`, `{preset}`, `{date}`. Keys are camelCase;
battle-sim keys are dotted (`fieldData.*`). Era labels are short tokens and
should be **transliterated, not localized** (`X10` stays `X10`).

---

## §1 Core app chrome (1 key, 12 non-English files incl. `hr`)

| Key | English | Notes |
|---|---|---|
| `tabCodex` | Codex | New 5th sub-tab button in the Heroes & Combos hub bar (`index.html`, `data-i18n="tabCodex"`, sits between `tabGenerator` and `tabHeroesOnly`). Short word or transliteration — keep ≤ 8 chars so the hub bar does not reflow. Also reused by the command palette entry for the hub. |

## §2 Hero Atlas UI keys (`ui.js` `KEYS` + `ROWS`; en + 11 non-en)

| Key | English | Notes |
|---|---|---|
| `codexModeName` | Codex | mode label inside the Atlas (mirrors `tabCodex`) |
| `codexModeHint` | Verified hero data with source tracking. | sub-headline under the preset pills |
| `codexPresetFree` | Free | |
| `codexPresetPaid` | Paid + Royal | |
| `codexPresetSkinsPaid` | Skins + Paid | |
| `codexColSeason` | Season | column header (reuse `original` for origin season) |
| `codexColAccess` | Access | access column header (standard/paid/royal) |
| `codexColSkinType` | Skin | column header |
| `codexColStarCost` | Star-up cost | seals + medals summary |
| `codexColRankDelta` | Rank gain (skin) | best rank improvement chip |
| `codexColVerification` | Verification | column header |
| `accessStandard` | Standard | access value label |
| `accessPaid` | Paid | access value label |
| `accessRoyal` | Royal | access value label |
| `codexEmptyFree` | No free heroes match your search. | |
| `codexEmptyPaid` | No paid heroes match your search. | |
| `codexEmptySkinsPaid` | No heroes with skins match your search. | |
| `codexLoading` | Loading verified data… | |
| `codexUnavailable` | Verified data unavailable right now. Local data shown. | |
| `codexSort` | Sort | aria/tooltip for the codex sort control |
| `verificationCurrent` | Verified current | short chip label |
| `verificationHistorical` | Historical | short chip label |
| `verificationUnverified` | Unverified | short chip label |
| `verificationAria` | Data verification: {status} | screen-reader label |
| `skillVerification` | Skill data: {status} | drawer skill chip aria |
| `skillTranslationMissing` | Translation pending — showing English. | chip shown when a payload skill lacks a localized description |
| `duelsTitle` | Duels & Evidence | drawer section title |
| `duelWinRate` | Win rate | bar label |
| `duelRecordCount` | {n} recorded battles | |
| `duelEraUnknown` | Era unknown | |
| `duelEvidenceOnly` | Evidence only — not verified | collapsed-group label |
| `duelCIAria` | Confidence interval {lo}%–{hi}% | |
| `duelNoData` | No duel records for this hero yet. | |
| `snapshotRecommendation` | Community recommendation | combo-snapshot label (drop if lane 3 defers snapshots) |
| `snapshotDatedAria` | Posted {date} | |
| `codexExportCsv` | Export {preset} table | toast/title |

## §3 Hero Atlas content strings (`locales/*.js` `strings` packs; 11 non-en)

Registered in `js/i18n/hero-atlas/content-contract.js` so `auditHeroAtlasPack`
enforces them. English value doubles as the pack key (per the existing
`heroContentText` lookup convention).

| English (key = value) | Notes |
|---|---|
| `Royal` | access value string (mirrors `accessRoyal` above for `heroContentText` call sites) |
| `Standard` | access value string |
| Era badge labels — exact set finalized against lane-3 `CODEX_ERA_BADGES` (`sourceGameVersion` → era map). Anticipated tokens: `S0–S4`, `X1–X8`, `X10`, `X12`, `X15+` | transliterate, do not localize the season letters; en-dash in ranges |
| Verification chip labels (`Verified current`, `Historical`, `Unverified`) | same three strings as §2 chip labels, duplicated into the strings pack only if a `heroContentText` call site needs them — prefer the §2 UI keys |

## §4 Battle Simulator keys (`battle-simulator-i18n.js` + 11 packs)

| Key | English | Notes |
|---|---|---|
| `fieldData.summary` | Field Data — recorded duels & matchup evidence | `<details>` toggle label |
| `fieldData.kicker` | Field data | |
| `fieldData.title` | Recorded duel evidence | |
| `fieldData.copy` | Community-recorded duels with methodology and provenance. Numbers never rank players or alliances. | |
| `fieldData.loading` | Loading field data… | |
| `fieldData.retry` | Retry loading field data | B7 retry button |
| `fieldData.empty` | No verified field data yet. | |
| `fieldData.metadata` | Methodology | |
| `fieldData.attackerSpeedPriority` | Attacker speed priority | |
| `fieldData.inclusionCriteria` | Inclusion criteria | |
| `fieldData.battleCount` | Battles | |
| `fieldData.wins` | Wins | |
| `fieldData.losses` | Losses | |
| `fieldData.confidenceInterval` | Confidence interval | |
| `fieldData.sourceGameVersion` | Game version | |
| `fieldData.resembles` | Resembles your account? | |
| `fieldData.resemblesMatch` | {matched}/{total} profile fields match | |
| `fieldData.researchProfile` | Research profile | |
| `fieldData.equipmentProfile` | Equipment profile | |
| `fieldData.heroSkillUnlockProfile` | Hero skill unlocks | |
| `fieldData.skinProfiles` | Castle/Legion skins | |
| `fieldData.runComparison` | Compare with simulator | |
| `fieldData.simVsRecorded` | Sim vs recorded | |
| `fieldData.simAgrees` | Sim agrees with the record ({delta}%) | |
| `fieldData.simUnder` | Sim under-estimates by {delta}% | |
| `fieldData.simOver` | Sim over-estimates by {delta}% | |
| `fieldData.unverifiedNote` | Unverified record — evidence only, excluded from simulations. | |
| `fieldData.provenance` | Source / credit | |
| `fieldData.notCaptured` | Not captured | named-exclusion label for absent profile fields |
| `verification.current` | Verified current | provenance chip |
| `verification.historical` | Historical | provenance chip |
| `verification.unverified` | Unverified | provenance chip |
| `era.S0S4` / `era.X1X8` / `era.X10` / `era.X12` / `era.X15Plus` | `S0–S4` / `X1–X8` / `X10` / `X12` / `X15+` | transliterate; final set per lane-3 `CODEX_ERA_BADGES` |
| `era.unknown` | Era unknown | |

## Translation work-order packaging (for the orchestrator)

One DeepSeek work order **per file**, keys inlined from this document:

1. Core: 12 orders (`js/i18n/{ar,de,es,fr,hr,id,it,kr,pt,ru,tr,zh}.js`) — only `tabCodex`.
2. Atlas UI: 11 orders (`js/i18n/hero-atlas/ui.js` per-locale `ROWS` block) — §2 list.
3. Atlas content: 11 orders (`js/i18n/hero-atlas/locales/*.js` `strings` packs) — §3 list + `content-contract.js` registration (en side, implementer's job).
4. Battle sim: 11 orders (`js/battle-simulator-i18n-packs.js` locale pack) — §4 list.

Acceptance per order: `node --test` on the surface's i18n audit test
(`tests/unit/hero-atlas-i18n.test.mjs`, `tests/unit/battle-simulator-i18n.test.mjs`)
plus the parity test added at implementation start.
