# Handoff — VtsScore Competition #11 + BoH mapper wiring

> **Historical record — 2026-08-02 VtsScore/mapper handoff.** Reviewed for documentation routing on 2026-09-05.
> The BoH mapper pages and shared mapper core described below have been retired. VtsScore and retained grant/OCR services remain; preserve the historical data-change record without replaying it.
> Original content below is retained as dated evidence, not current release instructions.

**Current starting points:** [js/vts-score-store.js](js/vts-score-store.js) · [functions/README.md](functions/README.md) · [Documentation index](docs/README.md).


**Period:** 2026-07-28 → 2026-08-02 · **Branch:** all work merged to `gh-pages`
(head `fa2279b6`) · **Firebase project:** `abocombo` · **Season:** `season-2026`

You have no prior context. §1 is state, §2 is what shipped, §3 is production data that was
edited by hand, §4 is what is still open, §5 is the traps that cost real time.

---

## 1. Current production state (verified 2026-08-02)

| | |
|---|---|
| Live season | **`season-2026`** — *not* "competition-11". That string is UI copy only. |
| Signups | 80 `submitted`, 4 `withdrawn` |
| Scores in | 31 docs in `boh_allstar/season-2026/raceScores` (one is an orphan, see §3.4) |
| Firestore rules | Deployed 2026-07-29, ruleset `e7c525b3`, byte-identical to repo |
| Cloud Functions | `unlockAllStarBoh`, `vtsScore` — live, unchanged, no deploy pending |
| Member page | https://roc-vts.com/vtsscore |

**Data flow:** member unlocks with the alliance PIN → `vtsScore` Function lists eligible
signups → OCR Worker reads the screenshot → member confirms → Function writes
`boh_allstar/{season}/raceScores/{submissionUid}`. Admin reads that at
**admin.html → All-Star BoH → VtsScore**.

---

## 2. What shipped

| PR | What | Why it mattered |
|---|---|---|
| #130 | Deadline copy fixed in ar/es/pt/fr/de | Only English got the extension; 5 languages showed a date that had already passed |
| #131 | Name search relevance floor | Search had no threshold and always returned 8 fuzzy hits, so a member could pick a **stranger** and write their power onto someone else's signup |
| #132 | Errors scroll into view on mobile | The status banner sat ~600–900px above the buttons; failures looked like "nothing happened". Multiple members reported the page broken |
| #133 | BoH mapper integration (authored elsewhere; conflicts, assets and budgets fixed here) | Blew 4 size budgets. Team crests shipped at 512×512 (one at 1254×1254 / 2.2 MB) but render at 22–52px |
| #136 | Per-tier VtsScore leader sections + mapper made reachable | The two mapper pages had **nothing linking to them** — URL-only access |
| #137 | Combined leader board, PNG export, name exemptions | For producing the public standings image |

Not ours: #134 (mobile 403 PIN re-show) and #135 (error diagnostic codes) were merged by
another agent in the same window.

### Admin VtsScore surface now has
- Standings table (all players, unfiltered — the audit view)
- **Tier 1** and **Tier 2** leader sections, each ranking every power category **two ways
  at once**: raw growth (favours big accounts) and growth % (favours small ones)
- **Both tiers combined** — same shape, overall leaders
- **Export PNG** — canvas-drawn, no dependency, no CSP exception; exempt names are printed
  in the image footer
- **Exemptions** — hide players from all three leader tables *and* the export, while the
  standings table still shows them. Stored in `localStorage`, so **per-browser, not synced**

---

## 3. Production data edited by hand

All done via the Firestore REST API with the owner's Firebase CLI credentials, each with a
read-back verification. Do not assume these are "clean" records.

### 3.1 Two players were invisible in the dropdown
The signup OCR wrote the **game's own title** as their name. Both submissions had
`gameName: "Rise of Castles"`, and because the name was duplicated,
`resolveVtsScorePlayer` treated it as ambiguous and returned `null` — so neither could
submit at all.

| uid | was | now |
|---|---|---|
| `aqw1HWqkmwO55FnbolPfjatMNWD2` | `Rise of Castles` | **Jasper** |
| `Oz4e9OZvtFX5Rw470VONRjFIGWq2` | `Rise of Castles` | **Surtii** |

The stored OCR record even carried the warning *"Game name 'Rise of Castles' inferred based
on context"* and nothing acted on it. **Root cause is unfixed** — see §4.

### 3.2 Eight "offline-placeholder" signups have no baseline
Created by an offline import (`joinReason: "offline-placeholder"`, ids `seed-*`) with
**every stat 0**. A zero baseline makes growth compute as `final − 0`, i.e. the player's
entire power counts as growth and they top any absolute-growth ranking.

- **MalakAbo** (`seed-malakabo`) — dragon baseline restored to `16,306,050` from his 27 July
  legacy record (real value, his dragon genuinely did not grow). The other six fields were
  then filled with a **synthetic baseline** at the owner's instruction, back-calculated so
  growth lands in 0.1–0.5%. **These are not real numbers.**
- **Dizz., Dr Zubbs, Mooooo** — still zero baseline, still eligible.
- **AK 47, ImRipper, Kirin, Rudzaks** — set to `status: "withdrawn"` (not VTS members).
  Reversible: set back to `submitted`.

### 3.3 ANGEL's score was entered by an admin
`raceScores/Xa7GfZzameNONAG8Z4KMo7d3FQH2`, `submittedByUid: "admin-manual-entry"`,
`ocr.requestId: "admin-manual-entry-2026-07-29"`. `royalTechPower` is `null` because his
Power panel does not display that row. If ANGEL ever tries to upload himself he will hit
`already_submitted`; delete the doc first.

### 3.4 One orphan score doc
`raceScores/TjJZWYnq1RYRsJgHqH3qYbzoCZ93`, `gameName: "abo"`, `schemaVersion: 1` (legacy,
dragonPower only), **no matching submission**. It is MalakAbo's 27 July submission from the
old single-value flow. Invisible in the admin (rows are built from submissions), harmless,
but it is why the score count reads 31 rather than 30.

### 3.5 Resubmission is blocked by design
`saveScore` rejects with `already_submitted` when `existing.submittedByUid !== uid`. Members
are **anonymous** Firebase users, so a different device or cleared site data means a new uid
and a locked-out member. Fix is to delete their `raceScores` doc. This generated real
support traffic.

---

## 4. Still open

**Needs an owner decision**
1. **Tier 3 is undefined.** The split is a single threshold on baseline dragon power
   (`>= 7M` → Tier 1) in `js/admin-all-star-boh.js`. Only two tiers exist in the data. A
   third needs a cut-off, not code.
2. **MalakAbo's real sign-up numbers** — to replace the synthetic baseline.
3. **Mooooo** — never confirmed whether they withdraw with the other four.
4. **Exemptions in `localStorage`** — chosen to avoid a rules change plus another manual
   deploy. Move to Firestore if the list needs to sync across devices.

**Code**
5. **Signup OCR accepts the game title as a player name** (§3.1) and ignores its own
   `inferred` warning. Guard `js/all-star-boh-ocr.js` / the signup submit path, and warn on
   duplicate `gameName` in the admin — duplicates silently block submission.
6. **Three dead functions in `firestore.rules`** — `validAllStarBohStats`,
   `validAllStarBohCommitment`, `validAllStarBohOcr` (from commit `400351f3`). Every deploy
   warns about them. This file sits near Firestore's 1000-expression ceiling, so removing
   them reclaims real headroom.
7. **Mapper Phase 6 and parts of Phase 7** — see §6.

---

## 5. Traps that cost real time here

1. **Firestore rules and Functions do NOT auto-deploy.** `.github/workflows/deploy.yml`
   ships GitHub Pages only. A merged PR that touches `firestore.rules` changes nothing in
   production until someone runs `npx firebase deploy --only firestore:rules`. Members hit
   403s in the gap.
2. **Validate rules before asking the owner to deploy.** POST the file to
   `https://firebaserules.googleapis.com/v1/projects/abocombo/rulesets` — it compiles and
   returns `issues` **without releasing** — then DELETE the probe ruleset. A `503` from that
   API is a Google outage, not a bad file; it recovered in minutes.
3. **`npm run check` includes Playwright; a unit-test-only gate does not.** Two CI failures
   came from steps skipped locally: the size budget (needs a real `npm run build`) and a
   Playwright test.
4. **Date-dependent Playwright fixtures rot.** `tests/p1-all-star-boh.spec.js` hard-coded a
   schedule at `2026-08-01T11:30Z`; it passed on 30 July and failed on 1 August with no code
   change. Fixed by anchoring to `Date.now()`. **Verify a CI failure against an unmodified
   base branch before assuming it is yours.**
5. **Size budgets are tight and there are six of them** (JS, CSS, deployed total, deployed
   media, max media file, file count) plus per-route CSS caps. Optimise assets before
   raising a cap: #133's crests went 5516 KiB → 1466 KiB, which kept the media budget ~4.8 MB
   lower than the raising-only approach.
6. **`npm run lint` always fails from a `.claude/worktrees/*` checkout** — ESLint 8 ignores
   any path containing a dot-directory. Not a repo problem. Use
   `npx eslint --no-ignore "js/**/*.js" ...`.
7. **Piping npm to `tail` hides the exit code** — `$?` becomes `tail`'s status. Use
   `${PIPESTATUS[0]}` or `set -o pipefail`. This caused a "the gate passed" report when lint
   had actually failed.
8. **The owner's terminal is PowerShell 5.1** — `&&` is a parser error. Give them `;` or
   separate lines.

---

## 6. The BoH mapper (context for whoever picks it up)

`boh-mapper-admin.html` + `boh-plan.html` share one core (`js/boh-mapper/mapper-core.js`,
~8,200 lines, no imports) with a runtime `data-boh-mapper-mode` flag. **That shape is
deliberate** — see decisions 4 and 5 in `C:\Users\alsel\Downloads\firebase-boh-mapper\HANDOFF-QWEN.md`.

⚠️ **That document is stale.** It states `js/boh-plan-page.js` is a hallucinated stub and
"Task Zero" (re-extraction) is pending. Verified against source on 2026-08-02: Task Zero and
Phases 3, 4 and 5 are **already done** on `gh-pages` — substitutions are in the core (22
refs), the member page has `onSnapshot` + empty state + core injection, there are 29
view-mode CSS rules, and self-lookup exists. Correct that file before handing it to another
agent or they will redo finished work.

Genuinely remaining: **Phase 6** (retire the standalone — a manual Export JSON → Restore →
Publish migration, not code) and parts of **Phase 7**: 69 hardcoded English `toast()` calls,
Arabic RTL, the `#rolePlanDialog` focus trap (§10c calls it the one real WCAG violation),
sub-36px tap targets, dead-code sweep.

Note the map plates keep their pixel dimensions on purpose — pins are absolutely positioned
over that art, and `stage1-labeled.png` carries fine label text that quantisation smudges.
Only the crests were resized.

---

## 7. Unrelated: DeepSeek is now a delegated worker

Not part of this repo, but it affects how work gets done here. `opencode-go` ran out of
credits on 2026-07-25, which silently killed the entire T2 tier — every
`delegate.sh mid` call failed for a week. A direct DeepSeek key (separate billing) now leads
the chain:

```
deepseek/deepseek-v4-flash → deepseek/deepseek-v4-pro → glm-5.2 → kimi-k2.7-code → qwen3.7-plus
```

`deepseek-v4-flash` **is** the DeepSeek-V4-Flash-0731 snapshot; the API exposes only
`deepseek-v4-flash` and `deepseek-v4-pro`, with no `-0731` id.

⚠️ Do **not** install `@musistudio/claude-code-router` to run Claude Code itself on DeepSeek.
v3 rewrites `~/.claude/settings.json` at install, the gateway never registered the provider
(`ccr status` → "No available models", gateway → 401), and Claude Code's permission
classifier then refused **every Bash call** — the session could read files but not run
anything, so it could not fix itself. Revert script: `~/.claude/scripts/ccr-revert.mjs`.
