# Session Handoff - v13.0.0 Eden X1 Closeout

Date: 2026-07-06
Branch: gh-pages
Repo: D:\Project\hero-combo-creator2
Release: 13.0.0

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
- Version metadata, README, changelog, HTML cache busting, and service worker metadata were updated for 13.0.0.

## Copilot Assessment Disposition

Handled or already covered:

- Admin custom-claim gate and related tests/rules are already in place.
- i18n coverage is green for the new post-push strings: 810 template keys, 1245 runtime keys, 11 languages.
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

- `node --check js\eden-x1.js` passed.
- `npm run i18n:check` passed with 810 template keys, 1245 runtime keys, and 11 languages.
- `npm run test:unit -- tests/unit/contribution-weighting.test.mjs` passed, 151/151 unit tests.
- `npm run build` passed and refreshed cache-bust metadata to `20260706_182742`; the remaining tech-db and non-module script messages are existing build warnings.
- `npm run size:check` passed with total CSS 575.7 kB.
- `npx playwright test tests/app-smoke.spec.js -g "eden x1 reward flow cards filter reward tables|eden x1 mobile surfaces avoid horizontal overflow with Cyrillic names" --reporter=line` passed, 2/2.
- `git diff --check` passed with only normal Windows CRLF warnings.

## Notes For Claude

- Review `CHANGELOG.md` for the user-facing 13.0.0 release summary.
- The main implementation files are `js/eden-x1.js`, `js/contribution-weighting.js`, `js/ocr-dashboard.js`, `js/ocr-roster.js`, `css/eden-x1.css`, `css/ocr-dashboard.css`, `eden-x1.html`, and `firestore.rules`.
- Snapshot changes are intentional: pathers duty tables gained matched-name context, and the mobile header/version changed for 13.0.0.
- Historical `release-12.4.1` repair markers were intentionally left alone.
- GitHub Pages deploys static assets only. Because Team Players vote validation changed, deploy `firestore.rules` separately with `npx firebase-tools deploy --only firestore:rules --project abocombo`; otherwise live voting can still show `Missing or insufficient permissions` even after Pages succeeds.
- `scripts/post-build.mjs` now copies `js/theme-prepaint.js` into `dist`, addressing the live 404 seen for that plain script.
