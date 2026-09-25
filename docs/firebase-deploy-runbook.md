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
npx firebase deploy --only firestore:rules --project abocombo
node scripts/firestore-rules-status.mjs
```

The deploy is done only when `firestore-rules-status` prints `LIVE MATCHES THIS CHECKOUT`. The CLI's own success or failure message is not proof either way, as the incident below shows.

### Rules paths that need a deploy before their feature works

- `combos_plan/current` — the live Combos ranking (see [Combos Planner](combos-planner.md#publishing-live)). Until the rules that add it are live, **Publish live** in VTS Admin → Combos fails with `permission-denied` and every visitor keeps the shipped `js/combos-db.js`; nothing else breaks. After the deploy, a superadmin publish should show "Live: published … by you (N lineups)" in the tab. Check the rules behaviour locally with `npm run rules:emulator:combos` (Firestore emulator, needs Java).

### If the deploy fails with 503 or 409

Nothing in the rules file causes these errors, so do not edit or shrink it. A compile error comes back as a 400 that names a line, and a permission problem comes back as a 403; both stop the loop below. Otherwise it retries until the status script reports a match. The first attempt runs the full CLI deploy. Later attempts only re-point the release with `firestore-rules-release.mjs`, and upload again with the CLI only when no uploaded ruleset matches the checkout (exit code 3). Paste it into Windows PowerShell 5 as one block:

```powershell
function Test-RulesMatch {
  $statusOutput = node scripts/firestore-rules-status.mjs 2>&1 | Out-String
  $statusExitCode = $LASTEXITCODE
  Write-Host $statusOutput
  return ($statusExitCode -eq 0 -and $statusOutput.Contains('RESULT: LIVE MATCHES THIS CHECKOUT'))
}

# Runs the CLI deploy and returns $true when it failed for a reason retrying cannot fix.
function Invoke-RulesDeploy {
  $deployOutput = npx firebase deploy --only firestore:rules --project abocombo 2>&1 | Out-String
  Write-Host $deployOutput
  return ($deployOutput -match 'HTTP Error: 40[03]' -or $deployOutput -match 'Compilation errors')
}

$outcome = 'unconfirmed'
for ($i = 1; $i -le 8; $i++) {
  Write-Host "--- attempt $i"
  if ($i -eq 1) {
    if (Invoke-RulesDeploy) { $outcome = 'stopped'; break }
  } else {
    node scripts/firestore-rules-release.mjs release
    $releaseExitCode = $LASTEXITCODE
    if ($releaseExitCode -eq 4) { $outcome = 'stopped'; break }
    if ($releaseExitCode -eq 3) {
      if (Invoke-RulesDeploy) { $outcome = 'stopped'; break }
    }
  }
  if (Test-RulesMatch) { $outcome = 'live'; break }
  if ($i -lt 8) { Start-Sleep -Seconds (30 * $i) }
}
switch ($outcome) {
  'live'    { Write-Host "Rules are live." }
  'stopped' { Write-Host "Stopped: a 400/403, a compile error or a missing release. Read the output above; retrying will not help." }
  default   { Write-Host "Could not confirm that the checkout's rules are live after all retries." }
}
```

What the two scripts do:

- `scripts/firestore-rules-status.mjs` (`npm run rules:status`): read-only. It reports which ruleset is live and diffs it against the checkout. It uses the same full-source match as the release script, and prints the live file count when the ruleset holds more than one file.
- `scripts/firestore-rules-release.mjs release` (`npm run rules:release`) finds the already-uploaded ruleset whose full source matches `./firestore.rules`: exactly one file, with the same text after normalizing line endings. A multi-file ruleset never matches. When several uploaded rulesets are identical, it picks the newest by `createTime`. It points production at that ruleset, retrying through 503s, and confirms by reading the release back. Its GETs (live release, ruleset list, each ruleset) retry on 429, 500 and 503 with the same backoff. It never uploads or deletes anything.
- `npm run rules:release -- --dry-run` (or `node scripts/firestore-rules-release.mjs release --dry-run`) prints the candidate ruleset, its `createTime` and the live ruleset, then stops without changing the release.
- `scripts/firestore-rules-release.mjs probe` re-points the release at the ruleset that is already live, then reads the release back. The enforced rules stay unchanged; the PATCH does bump the release's `updateTime`. It reports success only when the PATCH is acknowledged and the GET confirms the same ruleset; a matching GET after a failed PATCH is not enough to prove the endpoint works. If repeated probes remain unconfirmed, inspect the API response and credentials before escalating.
- `probe` and `release` need an existing `cloud.firestore` release. They cannot bootstrap a new project: its first rules deploy must use the Firebase CLI.

Exit codes of `firestore-rules-release.mjs`:

| Code | Meaning |
| --- | --- |
| 0 | Done, already live, or a dry run. |
| 1 | Unconfirmed after retries, or a transient error. Retry. |
| 2 | Usage error: pass exactly one of `probe` or `release`; `--dry-run` works only with `release`. |
| 3 | No uploaded ruleset matches `./firestore.rules`. Upload it with `npx firebase deploy --only firestore:rules --project abocombo`. |
| 4 | Permanent API error (400, 403 or 404), including a missing release. Retrying will not help. |

## Functions

```powershell
cd functions; npm ci; cd ..
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
npx firebase deploy --only "functions:<name>,functions:<name>" --project abocombo
```

- Functions run on **Node 22** (`nvm use 22` if you use nvm). The frontend uses Node 20.
- Deploying from a newer local Node works: on 2026-09-24 a deploy from Node 24 printed `EBADENGINE … required: { node: '22' }` and still deployed to the Node 22 runtime. The "outdated firebase-functions" and `npm audit` notices are follow-up work for their own PR, not something to fix in the release checkout.
- `npm ci` in `functions/` is required on a fresh checkout. Without it, deploy fails with "User code failed to load … Timeout after 10000".
- `FUNCTIONS_DISCOVERY_TIMEOUT=120` avoids the same timeout on a slow first load of the Admin SDK. Set it in the same PowerShell window as the deploy.
- Deploy only the functions the release changed, and name them in the PR's "Separate backend deployment" section. If the CLI offers to delete functions that are not in the code, answer **No**.
- The member unlock returns 503 when a secret is too short: `BOH_MEMBER_PIN` needs at least 12 characters (`MIN_CONFIGURED_PIN_LENGTH`), and `BOH_THROTTLE_PEPPER` needs at least 32. Check them with `npx firebase functions:secrets:access <NAME> --project abocombo` before suspecting the code. That command prints the secret value in plain text: check only its length, and never paste the value into a PR, issue, chat or log.

## For agents preparing a release

- Say in the PR body which rules and which functions need a deploy, and give the owner the exact commands from this page.
- If superadmin saves or loads fail after a release that changed `firestore.rules`, check the live rules first (`node scripts/firestore-rules-status.mjs`). In the 2026-09-24 incident, the diagnosis "the account lacks the superadmin claim" was wrong: the claim was fine and the rules were not live.
- Never tell the owner a rules deploy is done because the CLI printed success. Wait for `LIVE MATCHES THIS CHECKOUT`.

## Incident log

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
