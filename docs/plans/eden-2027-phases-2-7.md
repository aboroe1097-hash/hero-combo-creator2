# Eden 2027 admin + scoring — Phases 2–7

Owner work order of 2026-09-23, tracking the twelve requested items. Phase 0 (verify the 16.5.0
release, close the audit gaps) and Phase 1 (score multipliers, expandable duty breakdown, paged
long lists) landed in PR #218 on top of #215. **Everything below is the remaining work, one
integrated release, version 16.5.1 until the final release commit.**

Reconnaissance behind these designs was read from `8a169b3f` (PR #215 head), production
`origin/gh-pages` = `81dba72a` (16.0.19). Every "today" statement below is a verified repo fact,
not an assumption.

## Phase 2 — Reward distribution config + R5 toggle (#2, #3)

**Today:** the reward distribution numbers are literals, not configuration. Support takes the top
4 by weighted score with slot 1 forced to `guild_master` (`js/eden-x1.js` `getSupportRewardRows`),
contribution stops at slot 10 (`getContributionRewardRows`), management and team are each
`Array.from({ length: 3 })`, and the five reward-flow cards on the Eden page carry **static** counts
in the markup (`eden-x2.html` lines 1152/1173/1194/1215/1239 = 4/10/3/3/20). The tier boundaries
(rank ≤20 core, ≤110 power house, ≤200 members) are duplicated in `js/contribution-weighting.js`
in two places, and the tier→label map is hand-copied in four modules.

**Plan:**
- New superadmin, per-workspace document `vts_admin/eden_x{1,2}_reward_settings`, shape-pinned by a
  new validator: `quotas {support, contribution, management, team}`, `guildMasterSource`
  (`support_top1` | `r5`), `r5PlayerKey`, `updatedAt`, `updatedBy`.
- Replace the literals in `js/eden-x1.js` with values read from the published projection; render
  the flow-card counts from config instead of the static spans.
- Collapse the duplicated tier boundaries and the four label maps into one exported source so a
  renumbered distribution adjusts automatically, as requested.
- **#3** is `guildMasterSource`, defaulting to `r5` with `r5PlayerKey` = MalakAbo; the panel shows
  it as a switch next to the quotas.
- Publish through the season projection (new allowlist entry + rules check), so the public page
  ranks and labels rewards the way the publishing admin configured them.

## Phase 3 — Accounts tab, secondaries, teachable aliases, link-all (#8, #9)

**Today:** links live in `playerRegistry.accountLinks` (`{account, owner, type: banner|alt}`) inside
the active workspace's dashboard document and are consumed by the whole duty-scoring pipeline — but
the card that edits them is mounted on only three of thirteen admin subtabs (Banners, Pathers,
Shield Wall), the suggestion list is capped at 16 with per-row Link/Edit, removal exists per link,
and aliases can only be taught through `registry.contributionMatches` on the Contributions tab.
`docs/name-grouping-workflow.md` is explicit that `findBestMatch` is the single alias authority and
that no second merge list may be built.

**Plan:**
- Promote the account-links card to its own **Accounts** subtab in the Alliance group, so linking is
  reachable from everywhere rather than only the duty tabs.
- Add `secondary` as a third link type end to end (normalizer, class split, and a third column in
  the weights panel), plus "stop treating this account as a banner/alt" and a bulk **Link all
  suggestions** action with a real count.
- Teach aliases by storing them in the registry (`registry.playerAliases` — inside the map field, so
  no rules change) and consulting them first in `resolveConfirmedPlayerAlias`/`findBestMatch`, which
  keeps one authority. Seed `zubs → Lady Zubbs` and `kiji → MalakaKiji`; the existing assertion that
  `resolveConfirmedPlayerAlias('Zubbs')` is empty is deliberately updated.

## Phase 4 — Revived 2027 signup, My Stats, vote autofill (#4, #6)

**Today:** the All-Star BoH signup UI is retired (nothing mounts `js/all-star-boh-model.js`), the
signup documents at `boh_allstar/{season}/submissions/{uid}` are owner-writable only, and
`boh_allstar_config/current` — the season authority — has no admin UI at all. The Eden page has no
account↔roster linkage: My Stats searches by name and the vote name field is typed by hand.

**Plan:**
- Rebuild the member signup form over `js/all-star-boh-model.js`, whose
  `BOH_2025_SCORING_PROFILE` registry (`id`, `version`, `label`) is the natural "which version"
  hook; the superadmin picks the active season/version.
- Manual add/edit of signups goes through a Cloud Function rather than a new `isAdmin()` clause on
  the submissions collection: the owner-only rule is guarded by a test asserting admins must not get
  create/update, and routing through the Function keeps that contract intact.
- Eden X2 gets the signup prompt; after signing up, My Stats looks the account up by
  `accountProfile.gameName` through the existing matcher (`resolvePublicStatsOption`, threshold 86),
  and the vote name field prefills from the same value.
- Deployment: the new page needs a `vite.config.js` entry, an `entryHtmlFiles` line in
  `scripts/update-build-metadata.mjs` (its absence is why `vtsscore.html` still ships `?v=14.3.5`),
  and a measured trade against `deployFileCount` (731 of 734).

## Phase 5 — Complaints / issues tab (#5)

**Today:** no complaint mechanism exists anywhere, and nothing in the repo uploads an image — there
is no Firebase Storage usage at all and `firebase.json` has no `storage` section. The Eden page's CSP
allows Firestore and the two workers but not the Functions origin.

**Plan:**
- New collection, deny-by-default, create for `signedIn()` behind a strict validator that makes
  anonymity structural (an anonymous complaint may not carry identity fields at all); read/update
  only for superadmins.
- "Issue or complaint" button on Eden X2 opening a form (category, description, optional images,
  named/anonymous), with new copy in the twelve shell locales.
- A superadmin **Complaints** subtab in the Alliance group.
- Images via Firebase Storage, which needs four things: enable Storage in the console, add
  `storage.rules` + a `"storage"` block to `firebase.json`, deploy with
  `firebase deploy --only storage` (Pages deploys do not carry it), and add
  `firebasestorage.googleapis.com` to the Eden page's CSP.

## Phase 6 — Separate public-result toggles (#1)

**Today:** one switch, `showPublicResults`, publishes the members ballot and the R4/R5 management
results together; `showVoterNames` is parsed but never read publicly.

**Plan:** split it into `showMemberResults` and `showManagementResults`, keeping `showPublicResults`
accepted as a legacy fallback so existing settings keep working. Touch points: the vote-settings
validator and both per-workspace settings blocks in `firestore.rules`, the projection allowlist, the
admin toggle row, and the two public gates (management results, team winners).

## Phase 7 — Season lifecycle (#11)

**Today:** there is no rollover, rename, or recall code. The primitives are workspace switching
(which reloads the page), publish/unpublish (flips `lifecycle` between `active` and `draft`), a
one-way archive, a full JSON snapshot export with **no** import, and the per-season `r5Season`
string.

**Plan:** a `vts_admin/season_registry` document describing each season (id, label, state,
timestamps, workspace) with superadmin controls to end the current season, start the next, rename
the label, browse ended seasons read-only, and recall a snapshot through a dry-run-first import.
Renaming stays label-only by default; renaming the season *key* would need a migration that rewrites
`season` fields on conduct and vote documents, so it ships as a separate dry-run tool if wanted.
Chosen over adding a third workspace id (`eden-x3`), which the rules validator and the static
workspace table both pin.

## Cross-cutting requirements

- **Rules:** new validators on a file that has already hit Firestore's 1000-expression ceiling;
  compile-only probe before release, then a separate `firebase deploy --only firestore:rules`.
- **i18n:** new copy in 13 site locales, 12 Eden shell locales, 11 admin-runtime packs and 6 VtsScore
  languages; `npm run i18n:check` enforces parity.
- **Tests:** unit tests per phase plus at least one Playwright spec in a path CI actually runs —
  closing the browser-coverage gap the #215 audit identified.
- **Budgets:** `deployFileCount` is 731 of 734; new pages and chunks trade against measured reclaims
  or a documented cap move.
- **Verification per phase:** `npm run check:fast`, then build + `size:check` for bundle changes,
  then `npm run check` before the release commit.
