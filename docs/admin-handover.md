# Three-month admin handover

This release gives team administrators daily operation controls and gives Super Admins season and recovery controls. Infrastructure failures, provider credit exhaustion, domain expiry, or lost cloud access still require a designated infrastructure operator. A website release cannot guarantee those services remain available for three months.

## Before departure

Deploy the Firestore rules first, then the changed Firebase Functions and both AI/OCR Workers, then this frontend release. The Workers read the public, non-secret operations configuration and refuse paid requests if that configuration cannot be checked. Older rules that deny this read will therefore stop AI/OCR requests until the new rules deploy. Test the live pause and recovery controls after all services deploy.

1. Maintain at least two named Super Admin accounts with independently accessible recovery emails or Google accounts. Sign in on a second device, open Users & Roles, verify the actual roles, and test account password recovery. Use individual accounts, not a shared password.
2. Have an ordinary Admin rehearse uploading and reviewing data. Have a Super Admin rehearse creating the next season in a draft workspace, checking its dashboard, previewing its public update, and switching the Admin workspace back. Keep the upcoming season unpublished until the team is ready; rehearse the publication transition in a separate test environment.
3. Have a Super Admin save a short test notice with a near-term expiry. Confirm it appears to a public visitor and disappears automatically. Test a feature pause with an ordinary account. Super Admins retain recovery access; the Admin dashboard does not redirect into maintenance.
4. Record the person responsible for domain renewal, Firebase/Google Cloud billing, Cloudflare access, and AI/OCR provider balances. Enable each provider's own billing and service alerts for that person. Check renewal and payment dates cover the full absence.
5. Confirm the frontend release, Firestore rules, and changed Functions have each actually deployed. Pages deployment does not deploy the backend. Verify Users & Roles and settings against the live services after deployment.
6. Configure and verify cloud backups as described below. Download an Admin JSON export too, but do not treat one browser's export or local recovery cache as a complete server backup.

## Starting the next Eden season

1. A Super Admin opens **Season & publication** in the Admin command center. The next-season card defaults to **Start X8 season** for the first transition, then advances to the next season number. Review the name and optional roster/scoring copies before creating the draft.
2. Creation opens a separate dashboard with empty uploads and voting closed. The existing public season stays online. Admins can upload and correct the new season's data; Super Admins configure scoring, rewards, voting, and management-vote CSV data.
3. Use **Preview** to review the draft. Preview requires an Admin account and disables voting. It does not publish or replace the visitor cache.
4. When ready, a Super Admin selects **Publish**. Confirm the transition and save the automatic download of the old season. Publication switches the Eden hub and public season together and makes the previous workspace read-only. The X1 hub remains an archive; registered older seasons remain available through the archive picker.
5. Further uploads remain working data until a Super Admin publishes again. To reverse a public mistake, select an earlier publication revision and publish its contents as a new revision. Working uploads remain available for correction.
6. For data recovery, export a complete workspace backup, import the matching workspace backup, inspect the restore preview, and apply it. Restore downloads the current state first and refuses records changed since the preview. Recheck the preview after any conflict. Public content requires a separate publication after recovery.

Season creation and publication do not require a new website release once this frontend and its corresponding backend rules have deployed.

## Finding your tools

On phones, use **Open admin tool** to move between Eden and alliance programs. The selected tool stays in the URL after refresh. Context above the active panel identifies its scope; changing the Eden workspace does not change signups, VtsScore, throne assignments or other alliance-wide records. **Preview working season** shows saved draft changes before publication.

## Daily operation

- **Competition review:** VtsScore exports preserve raw signup, upload and match records with document provenance. Use the reconciliation report to investigate duplicate identities, missing records, mismatched totals and extreme growth. Review warnings do not alter records or competition rankings. Set the dragon tier boundary and optional growth-warning limits in VtsScore; exported images record the selected threshold.
- **Vote-count privacy:** team-player and R4/management counts have separate switches from result visibility. Keep winners visible while hiding either set of counts, then publish the season. Published projections and new share images omit hidden counts. Publishing X2 imports its existing management Sheet once when no cloud results have been saved. Reviewed CSV imports take priority; import an updated CSV to replace them later. Historical X1 Google Sheets remain independently public; these controls do not revoke access to those old source sheets.
- **Throne Buffs:** ordinary Admins can assign buffs and save shared weekly history. A concurrent edit refuses to overwrite another Admin's saved version; reopen the panel and review before retrying. Existing browser history is available for explicit migration by saving its week. Exports include buff icons and wrapped assignment text.

- **Admin:** upload and correct data, manage supported team features, inspect recent site errors, and resolve investigated error reports. Eden publication requires a Super Admin.
- **Super Admin:** manage Admin/Super Admin roles, change runtime notice and pause settings, and create, publish and manage seasons. Role checkboxes show Firebase Auth claims; a member's editable profile never grants access.
- **Roles:** operators cannot remove their own access. Demotion revokes refresh sessions. Already-issued Firestore ID tokens may remain valid for up to their normal lifetime; role-management calls check current Auth privileges immediately. The bootstrap script remains the recovery path if every Super Admin account becomes inaccessible.
- **Site operations:** set a public notice, pause team changes, or pause individual features. Set an automatic expiry when possible. Blank expiry keeps the setting active until changed. Notice text is public; never paste tokens, personal records, or diagnostic dumps into it.
- **AI and OCR pauses:** the separately deployed AI and OCR Workers check public operation settings before paid provider work, with a maximum 30-second cache request. Missing settings retain normal defaults; unavailable or malformed settings pause paid requests until settings can be checked. Ordinary browsing remains available. The general OCR route cannot identify Super Admins and follows its upload pause for everyone; use Site operations to restore it. Authenticated AI and competition OCR allow verified Super Admin recovery.
- **Recent errors:** the list shows the newest 30 reports. Resolve deletes that diagnostic record after investigation; it does not fix the underlying problem. A rejected or interrupted report is retained on its originating browser for later delivery.

## Incident procedure

1. Sign in to `admin.html` using a Super Admin account. Check Site operations and recent errors. Keep browsing available while pausing the affected feature if necessary.
2. Check whether the failure affects one user, all browsers, or one external provider. Record the visible error, affected page, approximate time, and operation performed. Avoid publishing private data.
3. For lost Admin access, use another Super Admin to inspect Users & Roles. Recover the affected account through its sign-in provider. For zero accessible Super Admins, the infrastructure operator must use `scripts/firebase-set-admin-claim.mjs` with the documented privileged cloud credentials.
4. For provider quota, billing, domain, or backend outage, contact the designated infrastructure operator. Runtime settings cannot replenish provider funds, change Firebase rules, rotate deployed secrets, or repair a cloud outage.
5. Restore a paused feature after checking the failing operation. Clear temporary notices or let their expiry restore normal operation.

## Availability monitoring

`.github/workflows/operations-monitor.yml` checks public pages, the recovery page, and the AI/OCR Workers' configuration endpoints every six hours. It makes only GET requests, performs no OCR or paid AI turn, and changes no data. Failed runs use GitHub Actions failure notifications; the backup operator must enable and verify their own notification settings. Health checks confirm reachability and reported configuration, not real provider credit or successful image processing.

GitHub scheduled workflows run from the default branch. Confirm this workflow is present there and Actions are enabled. Public repositories can have scheduled workflows disabled after 60 days without repository activity, which is shorter than this absence. Configure an independent external uptime monitor for the full three months, or assign an operator to verify and re-enable the schedule. No workflow here creates artificial commits or sends messages to external services. See [GitHub's scheduled-workflow requirements](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Cloud backups: required service setup

Cloud backups are not automatically enabled by merging this release. Before departure, an infrastructure operator should use Google Cloud Firestore's managed backup schedules for the production database, select daily backups, and choose retention covering the absence (up to 14 weeks). Alternatively, use managed exports to a dedicated Cloud Storage bucket with an explicitly configured schedule. These are cloud operations requiring appropriate IAM access and billing; do not put a service-account key in the browser or repository. Follow [Firestore's backup and restore setup](https://firebase.google.com/docs/firestore/backups) and the [current schedule command reference](https://docs.cloud.google.com/sdk/gcloud/reference/firestore/backups/schedules/create).

- Verify the actual production project/database before creating a schedule.
- Give the backup operator only the cloud permissions needed to view backup status and perform the approved recovery process. Managed exports need Firestore import/export permission and service-agent access to the destination bucket.
- Set backup-failure alerts and a retention policy. Check a completed backup's date and scope.
- Rehearse restoration into a separate database/project. Never test recovery by overwriting production.
- Firestore backups do not cover Firebase Auth accounts, Functions secrets, Worker bindings, domain ownership, or provider balances. Preserve recovery access and configuration for those services separately using their supported secure administration tools.

Until the cloud operator confirms a recent successful backup and a recovery rehearsal, record backup readiness as **pending**.

The infrastructure operator can run `node scripts/setup-firestore-backups.mjs` to inspect the fixed production target `abocombo/(default)` and preview creating a daily schedule with 14-week retention. Nothing changes by default. After reviewing billing and the target, run the same command with `--apply` to create and verify the schedule. Repeating it leaves an already matching schedule unchanged; an existing daily schedule with different retention requires manual review. This helper does not enable billing, change IAM, restore data, or verify a completed backup.

Use an authenticated Google Cloud CLI session with the `roles/datastore.backupSchedulesAdmin` role to manage schedules. A recovery operator additionally needs the documented backup viewing and restore permissions; give those separately rather than granting project Owner. See [Firestore backup IAM roles](https://firebase.google.com/docs/firestore/backups#required_roles). The script does not display login credentials or raw cloud responses.
