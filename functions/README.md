# ROC VTS Firebase Functions

## Runtime and exported services

This package uses Node 22 and its own package-lock.json. The frontend uses Node 20; install dependencies in the package you are changing.

| Export | Protocol | Responsibility |
|---|---|---|
| unlockAllStarBoh | HTTP | Validate Auth/App Check, throttle attempts, issue expiring member grants |
| vtsScore | HTTP | Handle gated score operations with server-side validation |
| setUserRole | Callable | Require caller superadmin claim and apply audited admin/superadmin changes |

The grant and publication notes below retain backend compatibility details; they do not describe a currently available BoH signup UI. [Operations](../docs/operations.md) · [Security](../SECURITY.md) · [Documentation index](../docs/README.md)


`unlockAllStarBoh` is the retained server-side membership-grant endpoint. The old BoH member UI is retired; VtsScore and related protected services still consume the access contract. It verifies Firebase Auth and App Check, applies per-user and per-IP-digest lockouts, and writes an expiring server-owned member grant. No raw PIN, IP address, or player screenshot is written by this function.

## Required secrets

Set both secrets in the `abocombo` Firebase project. Never place either value in a repository file or client build.

```powershell
firebase functions:secrets:set BOH_MEMBER_PIN --project abocombo
firebase functions:secrets:set BOH_THROTTLE_PEPPER --project abocombo
```

`BOH_THROTTLE_PEPPER` should be an independent random value of at least 32 characters. It is used only to HMAC throttle keys; do not reuse the member PIN.

`BOH_MEMBER_PIN` must be at least 12 characters. Use a season-specific, high-entropy value rather than a short numeric code; the Function fails closed when the configured secret is missing, too short, or longer than 128 characters.

## Required Firestore configuration

Create the admin-only document `boh_allstar_config/current` with:

```json
{
  "activeSeason": "season-2026",
  "open": true,
  "grantDurationMinutes": 720
}
```

- `activeSeason`: 1-80 ASCII letters, numbers, `_`, or `-`.
- `open`: whether members can create or update signup and Epic Showdown preference documents.
- `grantDurationMinutes`: 5-10080 minutes (maximum seven days).

The Admin SDK reads this document. Firestore rules deny member access to it and to `boh_allstar_security_attempts`.

The exact config document is readable directly by callers carrying the Firebase `admin` custom claim; it is not listable or member-readable. The Function reads it inside the same transaction that writes a grant, and Firestore compares every protected member request to it. Changing `activeSeason` therefore invalidates older grant documents immediately even when their timestamp has time remaining. Setting `open` to `false` keeps PIN-protected team formation, plans, and schedules available while Firestore denies member signup and Epic preference writes. The Admin VTS client must read this exact document after confirming the admin claim and use `activeSeason` for every BoH store path; the Eden vote season and client constants are not BoH season authorities.

## Member grant contract

A successful unlock replaces only the caller's server-owned document at `boh_allstar_member_grants/{uid}`:

```json
{
  "schemaVersion": 1,
  "uid": "<Firebase UID>",
  "seasonId": "season-2026",
  "issuedAt": "<Firestore server timestamp>",
  "expiresAt": "<Firestore timestamp>"
}
```

Members can get only their own document while it is unexpired and its `seasonId` still equals `boh_allstar_config/current.activeSeason`. They cannot list, create, update, or delete grants. The Admin SDK Function bypasses client rules to issue them. Deleting a grant revokes access immediately.

Configure Firestore TTL policies for the `expiresAt` field on both the `boh_allstar_security_attempts` and `boh_allstar_member_grants` collection groups. Successful unlocks remove their two throttle documents immediately; TTL removes expired failed-attempt digests and expired grants. Authorization still checks expiry synchronously and never relies on eventual TTL deletion.

## Verification and deployment

```powershell
npm --prefix functions test
firebase deploy --only functions:unlockAllStarBoh --project abocombo
```

Deploy the additive Firestore rules before the Function and before exposing the client tab. After a successful unlock, the browser reads its own grant document through the Firestore REST API with its Firebase ID token and App Check token, validates the fixed schema, and requires the returned season and expiry to match the Function response. Reload uses the same own-document read; no browser credential marker is stored.

Firebase Auth supports only whole-object custom-claim replacement, not an atomic patch/CAS. The member unlock path therefore never calls `getUser` or `setCustomUserClaims`: it cannot restore a revoked admin claim or clobber any unrelated concurrent claim writer. The existing `admin` custom claim remains independent and continues to authorize Admin VTS operations.

Members may read the allowlisted publication overview and the configured set of roster-only `publishedTeams/{teamId}` documents needed for the team announcement. Team documents reject `plan`, timeline, instruction, and unknown fields. Full plans exist only in `publishedPlayers/{uid}`, which remains owner-get-only and non-listable. Raw reviews remain admin-only; sanitized feedback is separately owner-get-only at `boh_allstar/{season}/feedback/{uid}`.

## Focused tests and release evidence

The package test script covers the legacy grant contract; it is not the whole Functions suite. From the repository root also run the user-roles and VtsScore unit tests for those handlers. A Functions change must identify which exports need deployment, the project, dependent rules, and the observed result. Do not deploy unchanged exports for a documentation update.
