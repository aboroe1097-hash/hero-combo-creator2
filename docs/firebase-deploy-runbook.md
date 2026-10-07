# Firebase deploy runbook (rules and Functions)

[Documentation index](README.md) · [Operations](operations.md) · [Functions guide](../functions/README.md) · [AGENTS.md](../AGENTS.md)

GitHub Pages ships only the static site. `firestore.rules` and the Functions are deployed separately by the owner from a local checkout, after the PR that changes them is merged into `gh-pages`. Follow this page when a release touches either one, and read the incident log below before treating a failed rules deploy as a problem with the rules.

## Before any Firebase deploy

1. Deploy from your up-to-date `gh-pages` checkout:
   ```powershell
   cd <your gh-pages checkout>
   git status            # must be on gh-pages with no local edits
   git pull origin gh-pages
   ```
   A stale checkout deploys stale rules. On 2026-09-24, a deploy from a checkout that was one release behind uploaded the 23 Sep rules without the Competition #12 paths.
2. Run commands from the **repo root**, the folder that holds `firebase.json`. `firebase.json` points Firebase at `functions/`, so do not deploy from inside `functions/`.

## Firestore rules

```powershell
npm run rules:upload
npm run rules:release
npm run rules:status
```

The deploy is done only when `rules:status` prints `LIVE MATCHES THIS CHECKOUT`. Do not use `npx firebase deploy --only firestore:rules` for this file: it cannot ship it (see the 2026-10-06 incident below).

- `rules:upload` (`firestore-rules-release.mjs upload`) uploads `./firestore.rules` as a new ruleset without releasing it. If a ruleset with exactly this source is already uploaded it sends nothing. The Rules API compiles a ruleset this size more slowly than its gateway waits, so the upload usually answers **503 after about six seconds and is created anyway**; the script then finds it in the rulesets list and prints `UPLOADED: … (the 503 was a gateway timeout; the upload landed)`. A 400 prints the compile errors with line numbers and stops.
- `rules:release` (`firestore-rules-release.mjs release`) finds the newest uploaded ruleset whose full source matches `./firestore.rules` (one file, same text after normalizing line endings; a multi-file ruleset never matches), points production at it, retrying through 503s, and confirms by reading the release back. A 503 on the release PATCH has been seen to apply anyway, so only the read-back counts. Its GETs retry on 429, 500 and 503. It never uploads or deletes.
- `npm run rules:release -- --dry-run` prints the candidate ruleset, its `createTime` and the live ruleset, then stops without changing the release.
- `rules:status` (`firestore-rules-status.mjs`) is read-only. It reports which ruleset is live and diffs it against the checkout with the same full-source match, and prints the live file count when the ruleset holds more than one file.
- `firestore-rules-release.mjs probe` re-points the release at the ruleset that is already live, then reads the release back. The enforced rules stay unchanged; the PATCH does bump the release's `updateTime`. It reports success only when the PATCH is acknowledged and the GET confirms the same ruleset.
- `upload`, `probe` and `release` need an existing `cloud.firestore` release. They cannot bootstrap a new project: its first rules deploy must use the Firebase CLI.

Exit codes of `firestore-rules-release.mjs`:

| Code | Meaning |
| --- | --- |
| 0 | Done, already uploaded, already live, or a dry run. |
| 1 | Unconfirmed after retries, or a transient error. Run the same command again. |
| 2 | Usage error: pass exactly one of `upload`, `probe` or `release`; `--dry-run` works only with `release`. |
| 3 | `release` found no uploaded ruleset matching `./firestore.rules`. Run `npm run rules:upload` first. |
| 4 | Permanent API error (400, 403 or 404): a compile error, a permission problem or a missing release. Retrying will not help. |

### Rules paths that need a deploy before their feature works

- `combos_plan/current` — the live Combos ranking (see [Combos Planner](combos-planner.md#publishing-live)). Until the rules that add it are live, **Publish live** in VTS Admin → Combos fails with `permission-denied` and every visitor keeps the shipped `js/combos-db.js`; nothing else breaks. After the deploy, a superadmin publish should show "Live: published … by you (N lineups)" in the tab. Check the rules behaviour locally with `npm run rules:emulator:combos` (Firestore emulator, needs Java).

## Storage rules

`storage.rules` is small and compiles quickly, so the CLI deploys it normally:

```powershell
npx firebase deploy --only storage --project abocombo
```

## Functions

```powershell
cd functions; npm ci; cd ..
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
npx firebase deploy --only "functions:<name>,functions:<name>" --project abocombo
```

- Functions run on **Node 22** (`nvm use 22` if you use nvm). The frontend uses Node 22 too.
- Deploying from a newer local Node works: on 2026-09-24 a deploy from Node 24 printed `EBADENGINE … required: { node: '22' }` and still deployed to the Node 22 runtime. The "outdated firebase-functions" and `npm audit` notices are follow-up work for their own PR, not something to fix in the release checkout.
- `npm ci` in `functions/` is required on a fresh checkout. Without it, deploy fails with "User code failed to load … Timeout after 10000".
- `FUNCTIONS_DISCOVERY_TIMEOUT=120` avoids the same timeout on a slow first load of the Admin SDK. Set it in the same PowerShell window as the deploy.
- Deploy only the functions the release changed, and name them in the PR's "Separate backend deployment" section. If the CLI offers to delete functions that are not in the code, answer **No**.
- The member unlock returns 503 when a secret is too short: `BOH_MEMBER_PIN` needs at least 12 characters (`MIN_CONFIGURED_PIN_LENGTH`), and `BOH_THROTTLE_PEPPER` needs at least 32. Check them with `npx firebase functions:secrets:access <NAME> --project abocombo` before suspecting the code. That command prints the secret value in plain text: check only its length, and never paste the value into a PR, issue, chat or log.

## For agents preparing a release

- Say in the PR body which rules and which functions need a deploy, and give the owner the exact commands from this page.
- If superadmin saves or loads fail after a release that changed `firestore.rules`, check the live rules first (`node scripts/firestore-rules-status.mjs`). In the 2026-09-24 incident, the diagnosis "the account lacks the superadmin claim" was wrong: the claim was fine and the rules were not live.
- Never tell the owner a rules deploy is done because the CLI printed success. Wait for `LIVE MATCHES THIS CHECKOUT`.
- A 503 from `rulesets.create` or the CLI's `:test` step means the compile outlasted the gateway, not that the rules are broken or that Google is down. Before blaming a release on it, compare compile time of a minimal ruleset with this file's.

## Incident log

### 2026-09-28 to 2026-10-06: the 16.6.12 rules could not be uploaded (root cause of the 503s)

- **Impact:** the 16.6.12 Firestore rules (complaints filed only through `fileComplaint`, retired throttle stamps, `phaseSyncPausedUntil` on the season config) were not live for over a week. Production stayed on the 2026-09-27 16:59 UTC ruleset, which still lets browsers create complaints directly. The Functions were deployed; `storage.rules` was also still on its 2026-09-23 version.
- **Root cause:** the 503 is not an outage. It is the Rules API timing out while it compiles a ruleset of this size and complexity:
  - A minimal Firestore ruleset and `storage.rules` compiled in 1–2 s with 200, at the same moment that `firestore.rules` returned 503 after a steady ~6 s, ten times in a row. An exact copy of the ruleset that was already live failed the same way.
  - Padding the minimal ruleset with 150 KB of comments still compiled, so file size is not the trigger; rule complexity is. Stubbing any one third of the All-Star BoH published-overview/team/timeline/player validators let the full file compile, so no single rule is at fault: the whole ruleset sits at the edge of the compile budget, and attempts pass at random (1 in 10 for the 16.6.12 file).
  - Every `rulesets.create` that answered 503 had in fact created the ruleset (21 of 21 probe uploads were in the rulesets list afterwards). The CLI never gets that far: its `:test` pre-check hits the same timeout and it stops before uploading. That is why repeated `firebase deploy` attempts failed while an API upload works.
- **Fix:** `npm run rules:upload` uploads through the API, treats a 503 as "check the list" rather than failure, and `npm run rules:release` then switches production. The Firestore rules section above now uses only those commands.
- **Headroom:** the file also carries 17 functions that nothing calls (the retired per-field submission validators `validAllStarBohStats`, `validAllStarBohCommitment`, `validAllStarBohOcr` and their helpers). Removing them cut the compile failure rate in a probe from 9 in 10 to about 1 in 2. Their removal needs the structural tests in `tests/unit/all-star-boh-security.test.mjs` that still assert their bodies to be retired at the same time, so it is follow-up work.
- **Note on the 2026-09-23 entry below:** that "about a day" outage was the same compile-time ceiling, not a Google-side incident; it cleared when attempts happened to compile in time.

### 2026-09-23 to 2026-09-24: Firestore rules deploy returned 503 for about a day

- **Impact:** every rules change after the 2026-09-22 21:16 UTC release stayed off production. Four superadmin paths failed with permission errors: vote settings, reward settings, complaints and the season registry. After the 16.5.4 release, the Competition #12 schedule, board and matches documents were missing too.
- **Symptoms:**
  - `firebase deploy --only firestore:rules` failed with HTTP 503 "The service is currently unavailable". The failing step changed from run to run: `projects/abocombo:test`, `rulesets.create` or `releases.patch`.
  - The console's Rules editor showed "Error saving rules - An unknown error occurred", with the same 503s in the browser console.
  - When `releases.patch` returned 503, the CLI fell back to `releases.create` and printed a misleading **409 "Requested entity already exists"**.
  - status.firebase.google.com listed no incident.
- **What was ruled out:**
  - Rule syntax: the rules compiled in the emulator and via `:test` when it answered.
  - Size: 145 KB is well under the 256 KB limit.
  - IAM: permission checks returned 200.
  - The superadmin claim.
  - Even the unchanged live ruleset with one added comment failed in the console.
- **What worked:** retrying. One `releases.patch` returned 503 and still took effect. The next deploy failed at `:test`, but its ruleset had already been uploaded, and `scripts/firestore-rules-release.mjs release` switched production to it on the second attempt: 503, then 200. Final state: `LIVE MATCHES THIS CHECKOUT`, ruleset `05643584-ba74-423d-87ee-0829897f5b98`, 144,821 bytes, 2026-09-24 17:02 UTC.
- **Follow-up the same day:** `syncCompetitionPhase` (created), `vtsScore` and `bohSignupAdmin` deployed on the first attempt using the Functions steps above.
- **Lesson:** a 503 from the Rules API is transient and says nothing about whether that step applied. Retry, then trust only `firestore-rules-status`.
