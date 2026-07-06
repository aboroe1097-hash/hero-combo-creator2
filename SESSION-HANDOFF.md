# Session Handoff - v13.0.3 Eden X1 Helper Layout

Date: 2026-07-07
Branch: gh-pages
Repo: D:\Project\hero-combo-creator2
Release: 13.0.3

## 13.0.3 Notes

- Eden X1 voting guidance now merges the separate banner and pathing helper cards into a single translated "Most Banners & Paths" card.
- The combined helper ranks by `banners + pathers`, then by banners, pathers, weighted score, and name.
- Helper cards use a wider grid and smaller value-column reservation so long player names get more room on PC.
- Smoke coverage now expects five helper cards and verifies the old separate banner/path cards are not shown.

## 13.0.2 Hotfix Notes

- Fixed the Eden X1 vote settings Firestore document path from the invalid three-segment `vts_admin/eden_x1_vote_settings/config` reference to the valid document path `vts_admin/eden_x1_vote_settings` in public/admin code, rules, and tests.
- DM Materials is back to a Coming Soon tab with a visible `SOON` nav badge. The staged `js/material-calculator.js` module remains in the repo but is no longer loaded by the tab.
- Manual Builder now has a skin-mode toggle that uses the existing translated generator skin label, localized skin-count badges, skin portraits, and visible skin badges.
- Firebase rules still need a separate deploy for the vote settings/history permissions to match the static Pages release.

## What Changed

- Eden X1 team-player voting now accepts one to four teammate votes, stores unique candidate keys, and has matching Firestore rule/test coverage.
- The voter identity placeholder is now "Put your In-Game Name" and is translated across all 11 locales.
- Vote inputs now keep clicked suggestions, show confirmation chips for matched names, provide a small clear X for each picked name, and nudge invalid names with an error state.
- Saved vote status is translated, thanks the voter, confirms who received votes, and adds that final results will be announced during the last day.
- Team Players reward card now includes the translated tag "Vote here for Best TeamPlayers" so players know where to vote for team-player rewards.
- R4 / Management and Team Players reward slots are now three total each.
- Total Contribution rewards are ranked by contribution plus ex-guild contribution after Support Work slots. R5 conduct/bonus points no longer affect that reward rank.
- Forfeited premium rewards are skipped and backfilled by the next eligible player.
- Eden X1 helper lists were cleaned up with plain-language labels, translated one-line hints, default top-five rows, compact arrow expansion to top ten, MVP on Buildings, R5 Bonus Team Effort Points, shortened long Kika display names, and no separate Shield Wall helper card.
- Player stat tiles now have translated info chips that explain how weighted score, final rank, contribution, support, R5 bonus, structure hits, total demolition, and consistency are calculated; the chips open on hover, focus, or click.
- Partial ballots ask for a second confirmation before saving, duplicate votes are blocked without saving, and voters can optionally put their own in-game name into the next open vote slot.
- Public Eden X1 layout received alignment, spacing, chart axis, sortable table, and attack-history stretch fixes for desktop/mobile consistency.
- Shield Wall and Bonus Team Effort summary tables now include matched-name confirmation/source context.
- Eden X1 vote admin was moved into its own VTS Admin subtab with voting-open/editing/public-results toggles, current ballot summaries, and immutable edit-history review.
- Public Team Players voting now honors admin voting-open/editing-closed settings, keeps saved vote suggestions closed on reload, and writes vote history entries alongside the latest ballot.
- The voting helper is reached from the translated "Need Help With Voting? - View Top Names" link; mobile helper cards start at top 3 and expand to top 5 then top 10.
- Structure-hit trend x-axis spacing now compresses to Eden X1 attack windows only: Sunday, Tuesday, and Thursday game-time windows.
- Total Contribution keeps forfeited premium-rank names visible with a skipped-premium label while reward slots continue to the next eligible player.
- Version metadata, README, changelog, HTML cache busting, and service worker metadata were updated for 13.0.1.

## Copilot Assessment Disposition

Handled or already covered:

- Admin custom-claim gate and related tests/rules are already in place.
- i18n coverage is green for the new post-push strings: 844 template keys, 1277 runtime keys, 11 languages.
- Eden X1 vote validation now covers one to four unique teammate votes in rules and tests.
- CSS growth is tracked through the size budget, with the Eden X1 split budget intentionally raised for this release.
- Visual/layout concerns from the queued screenshots are covered by updated smoke snapshots and overflow assertions.

Deferred backlog from the Copilot report:

- Comment-create rate limiting.
- Dependabot/security update SLA or automerge policy.
- CSP/script/style tightening beyond current tests.
- TypeScript/JSDoc and large-file refactors.
- ICU pluralization and deeper RTL visual-regression coverage.

## Validation

- `npm run check` passed.
- `npm run check` includes lint, Prettier check, 151/151 unit tests, i18n validation with 844 template keys / 1277 runtime keys / 11 languages, production build, bundle-size check, and 50/50 Playwright smoke + visual tests.
- `npm run build` refreshed cache-bust metadata to `20260706_203433`; the remaining tech-db and non-module script messages are existing build warnings.
- The 13.0.1 CSS size budgets were raised against measured output: total CSS 577.7 kB, Eden X1 CSS 54.27 kB, OCR Dashboard CSS 132.10 kB.
- Visual baselines were refreshed for the intentional mobile/admin/research layout changes.
- `git diff --check` passed with only normal Windows CRLF warnings.

## Notes For Claude

- Review `CHANGELOG.md` for the user-facing 13.0.1 release summary.
- The main implementation files are `js/eden-x1.js`, `js/contribution-weighting.js`, `js/ocr-dashboard.js`, `js/ocr-roster.js`, `js/material-calculator.js`, `css/eden-x1.css`, `css/ocr-dashboard.css`, `eden-x1.html`, and `firestore.rules`.
- Snapshot changes are intentional: pathers duty tables gained matched-name context, and the mobile header/version changed for 13.0.1.
- Historical `release-12.4.1` repair markers were intentionally left alone.
- GitHub Pages deploys static assets only. Because Team Players vote validation, vote history, and vote settings rules changed, deploy `firestore.rules` separately with `npx firebase-tools deploy --only firestore:rules --project abocombo`; otherwise live voting/history/settings can still show `Missing or insufficient permissions` even after Pages succeeds.
- `scripts/post-build.mjs` now copies `js/theme-prepaint.js` into `dist`, addressing the live 404 seen for that plain script.
