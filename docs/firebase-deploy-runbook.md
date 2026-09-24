# Firebase deploy runbook (rules and Functions)

[Documentation index](README.md) · [Operations](operations.md) · [Functions guide](../functions/README.md) · [AGENTS.md](../AGENTS.md)

GitHub Pages ships only the static site. `firestore.rules` and the Functions are deployed separately by the owner from a local checkout, after the PR that changes them is merged into `gh-pages`. Follow this page when a release touches either one, and read the incident log below before treating a failed rules deploy as a problem with the rules.

## Before any Firebase deploy

1. Deploy from an up-to-date `gh-pages` checkout (the owner's is `D:\Project\hcc2-release`):
   ```powershell
   cd D:\Project\hcc2-release
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

### If the deploy fails with 503 or 409

Nothing in the rules file causes these errors, so do not edit or shrink it. A compile error comes back as a 400 that names a line, and a permission problem comes back as a 403. Retry until the status script reports a match:

```powershell
for ($i = 1; $i -le 8; $i++) {
  Write-Host "--- attempt $i"
  npx firebase deploy --only firestore:rules --project abocombo
  if ((node scripts/firestore-rules-status.mjs | Out-String) -notmatch 'LIVE DIFFERS') { Write-Host "Rules are live."; break }
  node scripts/firestore-rules-release.mjs release
  if ((node scripts/firestore-rules-status.mjs | Out-String) -notmatch 'LIVE DIFFERS') { Write-Host "Rules are live."; break }
  Start-Sleep -Seconds (30 * $i)
}
node scripts/firestore-rules-status.mjs
```

What the two scripts do:

- `scripts/firestore-rules-status.mjs` (`npm run rules:status`): read-only. It reports which ruleset is live and diffs it against the checkout.
- `scripts/firestore-rules-release.mjs release` (`npm run rules:release`) finds the already-uploaded ruleset whose text is identical to `./firestore.rules`. It points production at that ruleset, retrying through 503s, and confirms by reading the release back. It never uploads or deletes anything.
- `scripts/firestore-rules-release.mjs probe` re-points production at the ruleset that is already live, so it changes nothing. If even this fails for a long time, the release endpoint itself is down: open a Firebase support case.

## Functions

```powershell
cd functions; npm ci; cd ..
$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"
npx firebase deploy --only "functions:<name>,functions:<name>" --project abocombo
```

- Functions run on **Node 22** (`nvm use 22` if you use nvm). The frontend uses Node 20.
- `npm ci` in `functions/` is required on a fresh checkout. Without it, deploy fails with "User code failed to load … Timeout after 10000".
- `FUNCTIONS_DISCOVERY_TIMEOUT=120` avoids the same timeout on a slow first load of the Admin SDK. Set it in the same PowerShell window as the deploy.
- Deploy only the functions the release changed, and name them in the PR's "Separate backend deployment" section. If the CLI offers to delete functions that are not in the code, answer **No**.
- The member unlock returns 503 when a secret is too short: `BOH_MEMBER_PIN` needs at least 12 characters (`MIN_CONFIGURED_PIN_LENGTH`), and `BOH_THROTTLE_PEPPER` needs at least 32. Check them with `npx firebase functions:secrets:access <NAME> --project abocombo` before suspecting the code.

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
- **Lesson:** a 503 from the Rules API is transient and says nothing about whether that step applied. Retry, then trust only `firestore-rules-status`.
