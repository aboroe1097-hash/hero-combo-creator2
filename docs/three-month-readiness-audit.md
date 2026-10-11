# Three-month administrator readiness audit

Audit date: 10 October 2026. Production source: `origin/gh-pages`, commit `d9ee9124`, release **16.6.16**. Intended operating window: approximately October 2026–January 2027; confirm actual departure dates before setting alerts or schedules.

## Decision

**Not ready for a three-month period with website-only administration.** Existing administrators can operate many current workflows, but the shipped season lifecycle cannot complete a real rollover. Recovery, privileged access and incident handling also retain owner dependencies.

Ship a bounded operational release before departure: season-scoped creation/publication, safe role administration, recoverable backups, runtime incident controls, and a rehearsed handover. This can remove foreseeable routine deployment needs. It cannot guarantee that no deployment will ever be necessary after a game update or service failure.

## Scope and evidence limits

Reviewed production season/dashboard/publication code, roles and account recovery, Firebase rules and Functions, OCR/AI service handling, backup/import/recall, error reporting, maintenance controls, release workflows and operational documentation. This is a source and automated-unit audit, not a live security penetration test or a complete visual/accessibility audit of every page.

The original checkout is older (15.0.13) and has substantial existing modifications. It was preserved. The report and verification use a separate checkout of production on `codex/three-month-readiness-audit`.

Live Firebase rules, deployed Functions/Worker versions, cloud configuration, balances, backup schedules, domain renewal and actual delegate access require separate verification. Source support does not prove production deployment. No production records were changed.

## Confirmed findings

### P1: The next season has nowhere to run

The Super Admin panel already offers adopt/end/start/rename/browse/recall. However, only `eden-x1` and `eden-x2` exist. X1 is legacy and cannot host a new season. Ending X2 archives its workspace; an archived or occupied workspace is excluded from new-season candidates. The existing test explicitly expects `no-free-workspace` after this transition.

Evidence: `js/eden-workspaces.js:15`, `js/eden-seasons.js:339`, `tests/unit/eden-season-lifecycle.test.mjs:191`, `firestore.rules:914`.

**Ship:** dynamically addressed season records with their own dashboard, uploads, roster snapshots, settings, votes, conduct, projection and caches. Preserve existing X1/X2 URLs as compatibility views. Do not recycle the current workspace or merely rename it X8.

### P1: Public views do not follow a newly created season

The Eden hub embeds `eden-x2.html` and reads the fixed X2 projection. The rules also validate the projection as X2. Adding a new workspace alone does not make its public view reachable.

Evidence: `js/eden-hub.js:30`, `js/eden-hub.js:243`, `firestore.rules:888`.

**Ship:** one public season route driven by the published season selection, with an archive picker and stable links. Keep the working season, public season and last successful publication distinguishable. Visitors should never see an unpublished draft.

### P1: Archive protection and publication are incomplete

Browser mutation guards consult archive metadata, but operational-data rules do not enforce the same lifecycle boundary. An old admin tab or another authorized client can still write archived records. Publication has no archive guard and writes the projection before the workspace metadata. A metadata refusal can therefore occur after the public projection changes. Super Admin metadata rules also permit unarchiving, despite the client describing archiving as one-way.

Evidence: `js/ocr-dashboard.js:128`, `js/ocr-dashboard.js:4431`, `firestore.rules:3213` and the operational-data write clauses.

**Ship:** backend-enforced archive policy, concurrency checks and atomic publication. If correction of an archive is needed, make it an explicit audited Super Admin operation. A failed publish must preserve the prior public version.

### P1: Super Admin self-lockout is possible

The role handler blocks self-revocation of `superadmin`, but permits self-revocation of `admin`; the latter clears both claims. The operator's own Admin checkbox is enabled. A mocked execution of the production handler confirmed that self-revoking Admin returns success with both claims false.

Evidence: `functions/src/user-roles.js:46`, `functions/src/user-roles.js:72`, `js/admin-roles-controller.js:87`.

**Ship:** validate the resulting privilege set server-side, block self-demotion that removes Super Admin access, and protect the last remaining Super Admin. Keep at least two independently recoverable Super Admin accounts and test both.

### P1: Users & Roles reads the wrong authority

The loader reads top-level name/admin/superadmin fields from user profile documents. Actual privileges live in Firebase Auth custom claims; profiles use nested account/player data, and the callable does not mirror claims to these fields. The table can therefore display existing administrators unchecked and unnamed after reload.

Evidence: `js/ocr-dashboard.js:918`, `firestore.rules:183`, `functions/src/user-roles.js`.

**Ship:** a paginated Super Admin endpoint returning authoritative role state and safe profile labels. Test grant, reload, revoke, search and absence of profile-spoofed privileges.

### P1: Revocation is not an immediate containment tool

Sensitive role operations trust the caller's already-issued token. Replacing custom claims does not immediately invalidate that token, so a recently revoked Super Admin can still attempt privileged operations until refresh. The existing UI acknowledges a token lag of approximately an hour.

Evidence: `functions/src/user-roles.js:55`, `functions/src/user-roles.js:87`, `adminRolesTokenLag` in the admin runtime copy.

**Ship:** check current authorization for sensitive server actions, provide a session/account revocation procedure, and document/test the remaining direct-Firestore authorization window. Removing UI controls alone does not revoke access.

### P1: Full export is not a full restore

The JSON full backup contains multiple datasets. The ordinary importer only merges attacks and rebuilds the player summary; it ignores the other backup fields. A separate workspace snapshot recall DOES exist, including a dry run and pre-restore snapshot, but its allowlist omits duty/reward settings, conduct suggestions and broader application datasets. Vote history is deliberately non-recallable. Recall applies individual writes and can leave a partially restored state.

Evidence: `js/ocr-dashboard.js:8924`, `js/ocr-dashboard.js:9534`, `js/ocr-dashboard.js:5073`, `js/eden-seasons.js:72`.

**Ship:** explicitly version and label each backup's coverage. Add complete supported restoration, validation, preview, progress and resumable partial-failure handling. Keep Auth/Storage/cloud recovery separate from browser workspace restore. Verify scheduled database backup/PITR configuration externally and rehearse recovery in a disposable environment.

### P2: Creating a registry entry does not initialize operations

The start action records the registry transition but does not initialize a clean dashboard, its season key, settings or selection. Once the workspace-capacity blocker is removed, this remains a gap in the creation flow.

Evidence: `js/ocr-dashboard.js:4866`, `js/ocr-dashboard.js:4906`.

**Ship:** one resumable, idempotent creation operation that prepares all required records and changes the dashboard selection only after success. Copy roster identities/settings only when explicitly chosen; do not copy previous season totals, votes or uploads by default.

### P2: Publication can silently erase the public roster

A failed roster snapshot read is converted to an empty array, after which publication proceeds. A temporary error can publish an empty roster without distinguishing it from genuinely empty data.

Evidence: `js/ocr-dashboard.js:4417`.

**Ship:** refuse incomplete publication with a clear retry action; validate dataset completeness before activation.

### P2: Emergency controls still require technical intervention

Maintenance mode is a shipped boolean, with a comment instructing the developer to toggle it before pushing. Provider credentials and the membership PIN are server configuration/secrets rather than website settings. A query-string maintenance bypass is presentation behavior, not a write-protection boundary.

Evidence: `js/maintenance-config.js:1`, `functions/index.js:19`, `functions/README.md:23`.

**Ship:** Super Admin runtime notices and feature-specific read-only/disable controls, with expiry and an accessible recovery interface. Enforce write restrictions in the backend. Decide which secret rotations remain delegated cloud tasks; never put provider secrets in public settings.

### P2: Monitoring does not yet provide an operator response loop

Client errors are sent to Firestore, but no administrator triage/alert consumer was found. The reporting queue removes an entry before upload succeeds and persists that removal on transient failure. The AI health response reports configuration/liveness, not successful provider operation. Repository workflows verify releases, not continuous service operation during the absence.

Evidence: `js/app-error-reporting.js:117`, `workers/ai-handler.js:286`, `.github/workflows/`.

**Ship/configure:** operator-visible failure summaries and alerts for public availability, sign-in, cloud writes, OCR, scheduled jobs and stale public data. Retain failed error reports for retry. Separate liveness from readiness and avoid costly provider probes for every visitor.

## Whole-site operating coverage

| Area | Existing capability | Absence requirement |
| --- | --- | --- |
| Eden/X8 lifecycle | Lifecycle panel, isolated X1/X2 data | Dynamic future seasons, atomic initialization and route selection |
| Uploads and OCR | Parsing/review, multiple provider attempts | Season-bound uploads; retry/manual alternative; no duplicate writes |
| Contributions and scoring | Runtime scoring/reward controls | Persist and restore per season; public/admin totals agree |
| Voting | Season keys and configurable controls | New-season ballot isolation, deadlines and prior-season protection |
| Public publication | Allowlisted projection | Complete-data validation, atomic publish and rollback |
| Historical seasons | X1 archive and lifecycle browse | Arbitrary season archive picker and backend freeze policy |
| Roles | Server-side claims and audited changes | Authoritative role list, safe demotion and tested recovery |
| Account recovery | Password reset and Google sign-in | Both standby Super Admins rehearse recovery |
| Competition/VtsScore | Runtime schedule/season config and phase sync | Rehearse next competition; remove any active-flow dependency on fixed competition labels/slot contracts if those must change |
| Complaints | Admin handling and image retention job | Named reviewer, privacy/retention expectations and job alerts |
| Combos | Super Admin live publishing exists | Verify rules deployed, public consumer sees updates and shipped fallback works |
| Heroes/research/artifacts/maps | Mostly bundled data | Ship expected X8 content now or accept that unsupported game changes require a later release |
| AI/OCR infrastructure | Limits and provider fallback | Fund/configure fallback; delegates see failures and know manual alternatives |
| Conflict/offline handling | Local snapshots and revision guards | Rehearse two-admin edits, offline retry and stale-tab recovery |
| Backups | JSON export and partial snapshot recall | Scheduled cloud recovery plus tested, correctly scoped UI restore |
| Monitoring | Local/error collection and release checks | Continuous alerts reaching someone available |
| Runtime incident controls | Static maintenance page | Safe server-enforced feature pause/read-only and notice controls |
| Hosting/domain | Pages deployment and custom domain | Renewal/payment ownership and incident access confirmed |
| Backend deployment | Documented separate deployment | Verify live Rules/Storage/Functions/Worker before freeze |
| Handover | Developer operations documentation | Short nontechnical runbook, named owners and practical rehearsal |

## What the X8 Super Admin flow should do

1. **Create season:** enter X8 label, season identifier, dates and supported map/template. Create a draft without touching the current public season.
2. **Prepare:** optionally copy the roster and selected scoring settings. Show exactly what is copied and what starts empty.
3. **Operate:** Admins upload/review data in a dashboard visibly labeled X8. Uploads, votes, settings and caches cannot cross season boundaries.
4. **Preview:** show the complete public page privately to authorized leadership, including totals, rankings, rewards and privacy checks.
5. **Publish:** Super Admin activates a validated immutable publication revision. Public navigation switches to X8 as one operation; old links remain useful.
6. **Correct/rollback:** publish a corrected revision or revert the public pointer to the last good revision without deleting working data.
7. **Close/archive:** stop configured writes, preserve a final publication and backup, then make the archive browseable. A later season can be prepared independently.

Distinguish game progression (X8), the site's historical X1/X2 workspace labels and internal season IDs. Do not derive the next game season by incrementing the calendar year: the current helper defaults to `season-YYYY` and the registry currently holds at most eight entries. These are storage conventions, not the game's schedule.

## Shipping order and acceptance gates

1. **Access safety:** fix authoritative roles and self-lockout; nominate two Super Admins and backup recovery access.
2. **Season foundation:** generic season paths/rules, legacy compatibility and clean initialization; then registry-driven public routing.
3. **Publication safety:** backend archive checks, revision/concurrency protection, complete-data validation and rollback.
4. **Recovery:** honest backup coverage, tested restore and externally verified scheduled cloud backups.
5. **Operations:** runtime controls, alert delivery, provider funding/access and administrator runbook.
6. **Release/rehearsal:** perform the full required checks, deploy changed backend services separately, confirm live configuration, and run the delegation exercise.

The season/auth/rules changes meet repository high-risk criteria: full `npm run check`, relevant emulator tests and explicit backend deployment verification are required. Keep changes in reviewed PRs to `gh-pages`; the owner merges. No PR or deployment was made for this audit.

**Departure acceptance:** two delegate accounts, without the owner's computer or GitHub credentials, can create a fresh X8 draft, upload/review records, publish it, recover a bad publish, restore supported data, close voting and archive the season. A member sees only the published projection. An ordinary Admin cannot grant roles or create a privileged lifecycle transition. A stale tab cannot mutate an archive. Prior-season records and publication hashes remain unchanged. A designated infrastructure delegate can resolve billing/credential/backup incidents through a separate documented recovery path.

## External checks before the freeze

- Verify actual live Firestore and Storage rules, Functions, indexes, Worker bindings and Scheduler jobs against the final release. The deploy runbook records prior source/live mismatches.
- Verify backup schedules/retention and restore permissions; do not infer backup availability from export buttons.
- Check Firebase/Cloudflare/provider billing, payment methods, balances, budgets and alert recipients; domain/DNS renewal must cover the absence.
- Verify TTL policies separately from timestamp fields. Scheduled competition and complaint jobs currently specify zero retries; configure failure alerts and recovery responsibility.
- Test account recovery/MFA for delegates. Site roles do not confer cloud console, billing or backup-restoration privileges.
- Record which game/content changes are supported through runtime controls and which are deliberately deferred until return.
- Provide a one-page guide: daily checks, season creation, publication, failed OCR/manual path, cloud conflicts, backup/restore, incident pause and escalation.

## Verification record

- Release consistency: passed, **16.6.16**.
- Focused lifecycle/recall/publication/roles/sync/schedule/OCR unit selection: **116 passed**.
- Broad unit run before dependency installation completed: **2,233 passed, two dependency-loading failures, one skipped**. Both loading failures reported missing `postcss` in CSS/motion tests. After that dependency became available, rerunning both affected files passed **all five tests**. No unresolved behavior failure was observed in these runs; a complete full release gate was not run.
- A read-only live-rules comparison was attempted but could not load the Firebase CLI authentication module while dependencies were still installing. Live rules remain unverified.
- The passing season test confirms the rollover blocker; passing tests do not demonstrate autonomous rollover.
- Production roles handler was exercised with mocked Auth/Firestore dependencies to confirm the self-demotion path. This was not a live role change.
- No production browser rehearsal, live cloud state verification, provider payment check or disaster restore was performed. Do not treat this report as departure approval until those gates are met.
