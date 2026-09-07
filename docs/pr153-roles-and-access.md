# Roles and access — replacing the admin PIN with accounts

> **Historical record — Account-role migration plan.** Reviewed for documentation routing on 2026-09-05.
> Account-based roles are implemented. The current server handler and rules govern authorization, not the proposed code snippets below. No historical grant or deploy command is an instruction to change live accounts.
> Original content below is retained as dated evidence, not current release instructions.

**Current starting points:** [functions/src/user-roles.js](../functions/src/user-roles.js) · [SECURITY.md](../SECURITY.md) · [Documentation index](README.md).


Ships with PR #153. Written as design first because this is authorization: a
mistake either locks the owner out of production or opens a gate that is
currently closed.

## What exists today

| Layer | Mechanism | Enforced where |
|---|---|---|
| Entering VTS Admin | Firebase `admin` custom claim | Client **and** Firestore rules (`isAdmin()`) |
| Eden Workspace / Bonus Team Effort Points tabs | SHA-256 PIN hash in the build config | **Client only** |
| Granting admin | `node scripts/firebase-set-admin-claim.mjs <uid-or-email>` | Local Admin SDK |

The important part: **the PIN protects nothing on the server.** `firestore.rules`
has no concept of it. Any account with the `admin` claim can already read and
write eden vote settings and conduct adjustments directly — the PIN only hides
the tabs. So this change is not "swap one gate for another"; it closes a hole.

## Target model

Two custom claims. Superadmin implies admin — never grant `superadmin` alone.

| Claim | Grants |
|---|---|
| `admin: true` | Sign in to VTS Admin; everything except the superadmin tabs |
| `superadmin: true` | Also Eden Workspace/votes, Bonus Team Effort Points, and the roles controller |

Why custom claims rather than a Firestore roles document: a roles doc forces a
`get()` inside `firestore.rules` on every admin evaluation. This file has already
hit Firestore's **1000-expression-per-request limit** once (the All-Star BoH 403s
in July), and `get()` is among the most expensive things available. Reading
`request.auth.token.superadmin` costs two or three expressions and no document
read. Claims are the only option that fits the budget.

The cost of claims is propagation: a claim change does not reach a signed-in user
until their ID token refreshes — up to an hour, or immediately via
`getIdToken(true)`. The controller must say so plainly rather than appear broken.

## The controller

A browser cannot set custom claims; that requires the Admin SDK. So the
controller is a thin UI over a callable Cloud Function:

```
Superadmin UI  ──▶  callable setUserRole  ──▶  auth.setCustomUserClaims()
                     verifies caller is superadmin
                     writes an audit record
```

`functions/` already deploys (`unlockAllStarBoh`, `vtsScore`), so there is
somewhere to put it. The function must verify the **caller's** claim server-side;
never trust a role sent from the client.

Guard rails the function enforces, not the UI:

- Caller must have `superadmin: true`. Reject everything else with
  `permission-denied`.
- A superadmin cannot remove their own superadmin claim — that is how you end up
  with zero superadmins and no way back in.
- Granting `superadmin` implies granting `admin` in the same write.
- Every change appends an immutable audit record: who changed whom, which role,
  which direction, when.

`scripts/firebase-set-admin-claim.mjs` stays as the break-glass path and gains a
`--superadmin` flag, because it is the only way to mint the first superadmin and
the only recovery if the controller is ever broken.

## Deploy order — this one bites

Pages, Functions and rules deploy separately. Wrong order locks people out.

1. **Rules first.** `isSuperAdmin()` and the tightened matches are additive to
   existing admins until step 3, so shipping them early is safe.
2. **Bootstrap the first superadmin** with the local script, then hard-refresh
   so the token carries the claim.
3. **Function**, then **Pages last**. The UI is the only piece that hard-depends
   on the other two.

Verify after step 1 with `node scripts/firestore-rules-status.mjs`.

**Do not remove the PIN client code until a superadmin claim is confirmed
working in production.** Losing both at once means no route into those tabs.

---

## WO-R1 — Rules: add the superadmin level

Keep this one yourself; it touches `firestore.rules`.

Add next to `isAdmin()`:

```
function isSuperAdmin() {
  return signedIn() && request.auth.token.superadmin == true;
}
```

Then change the read/write conditions from `isAdmin()` to `isSuperAdmin()` on the
collections the PIN pretended to protect:

- `vts_admin/eden_x1_vote_settings`
- `vts_admin/eden_x2_vote_settings`
- `vts_admin/conduct_adjustments/records/{id}`
- `vts_admin/eden_x2_conduct_adjustments/records/{id}`

Leave `eden_x1_votes` / `eden_x2_votes` alone — members write their own ballots
there and that contract is unchanged.

Add the audit collection, append-only:

```
match /vts_admin/role_audit/records/{recordId} {
  allow read: if isSuperAdmin();
  allow create: if isSuperAdmin()
    && request.resource.data.keys().hasOnly(['targetUid','role','granted','changedBy','changedAtMs'])
    && request.resource.data.changedBy == request.auth.uid
    && request.resource.data.granted is bool
    && (request.resource.data.role == 'admin' || request.resource.data.role == 'superadmin');
  allow update, delete: if false;
}
```

**Before deploying, measure the expression budget.** Add the rules, then confirm
the All-Star BoH submission path still evaluates — that is the path that broke
before, and it is nowhere near these matches but shares the file's budget.

---

## WO-R2 — Callable function `setUserRole`

**Prompt:**

> Create ONLY `functions/src/user-roles.js`. Touch no other file.
>
> Export an `onCall` handler `setUserRole` following the style of the existing
> handlers in `functions/src/`. It receives `{ targetUid, role, granted }`.
>
> Behaviour, in this order:
> 1. Reject with `permission-denied` unless `request.auth?.token?.superadmin === true`.
> 2. Reject with `invalid-argument` unless `role` is exactly `'admin'` or
>    `'superadmin'`, `granted` is a boolean, and `targetUid` is a non-empty
>    string of at most 128 characters.
> 3. Reject with `failed-precondition` if `role === 'superadmin'`, `granted`
>    is `false`, and `targetUid === request.auth.uid` — a superadmin must not be
>    able to demote themselves.
> 4. Read the target's existing claims with `getAuth().getUser(targetUid)`.
>    Compute the next claims by spreading the existing ones and setting the
>    named role. Granting `superadmin` must also set `admin: true`. Revoking
>    `admin` must also clear `superadmin`.
> 5. Write them with `setCustomUserClaims`.
> 6. Append a record to `vts_admin/role_audit/records` with exactly the fields
>    `targetUid`, `role`, `granted`, `changedBy` (the caller uid) and
>    `changedAtMs`.
> 7. Return `{ ok: true, claims }`.
>
> Never read the caller's role from the request payload. Do not log the target's
> email, display name, or any token contents.

Then wire the export in `functions/index.js` (separate call, one file).

**Acceptance:** `npx eslint functions/src/user-roles.js functions/index.js`

---

## WO-R3 — Roles controller UI (superadmin only)

**Prompt:**

> Create ONLY `js/admin-roles-controller.js`. Touch no other file.
>
> Export `renderRolesController(mount, { currentUser, listMembers, setUserRole })`.
> `setUserRole` is an injected async function calling the callable — this module
> must not import Firebase directly, so it stays unit-testable.
>
> Render:
> - A note that a role change reaches the other person only after their next
>   sign-in or token refresh, which can take up to an hour.
> - A search field and a table of known accounts: display name, uid (truncated
>   with the full value in a `title`), and two toggles, Admin and Superadmin.
> - Toggling calls `setUserRole({ targetUid, role, granted })`, disables the row
>   while in flight, and renders the returned error message on failure without
>   flipping the toggle.
> - The current user's own Superadmin toggle is rendered disabled with an
>   explanatory title: a superadmin cannot demote themselves.
> - Turning Admin off also visually clears Superadmin, matching what the server
>   does.
>
> Escape every interpolated value. Never render a raw error object — show
> `error.message` only. No `innerHTML` with unescaped input.

**Acceptance:** `npx eslint js/admin-roles-controller.js`

---

## WO-R4 — Remove the PIN

Run this **last**, and only after a superadmin claim is confirmed live.

Files, one call each:

1. `js/ocr-dashboard.js` — delete `PIN_GATED_DASH_SUBTABS`, the
   `requireSensitiveAdminPin` branch around line 2380, and the
   `dashSubtabPinOptions` helper. Replace the gate with a check on the
   superadmin claim: a non-superadmin must not be able to open Eden Workspace or
   Bonus Team Effort Points, and the buttons should render disabled with a title
   explaining why, rather than silently doing nothing.
2. `js/battle-simulator.js` — remove the `requireSensitiveAdminPin` call at
   line 35 and whatever it guards; replace with the same claim check.
3. `js/admin-pin-gate.js` — delete the file.
4. `js/admin-auth-config.js` and `scripts/inject-admin-auth-config.mjs` — remove
   `adminPin` and `adminPinHash`.
5. `tests/app-smoke.spec.js` and `tests/p1-admin-vote-season-rollover.spec.js` —
   remove the `vts_sensitive_admin_pin_ok` seeds and replace them with whatever
   the new claim check reads in local test auth mode.

**Acceptance:**

```bash
npx eslint js/ scripts/
grep -rn "sensitiveAdminPin\|adminPinHash\|vts_sensitive_admin_pin_ok" js/ scripts/ tests/
npm run check
```

The grep must return nothing.

---

## Member list — decided: `users/{uid}` profiles

The controller lists accounts from the existing `users/{uid}` profile documents
rather than from Firebase Auth, which has no client-readable user list.

`listMembers` therefore reads those profiles and returns
`{ uid, displayName }` only — never email addresses, and never anything else the
profile happens to carry. Rules must allow a superadmin to list them; check
whether `users/{uid}` is currently self-read-only before assuming a list query
is permitted, and if it is, add a superadmin-only list rule rather than opening
the collection.

Two consequences worth designing around:

- **Only members who have signed in at least once appear.** A profile document
  is created on first sign-in, so someone who has never opened the site cannot
  be promoted from the UI. That is the case where
  `scripts/firebase-set-admin-claim.mjs` stays the answer, and the empty state
  should say so instead of looking broken.
- **A profile is not a role.** The document is member-writable; the claim is
  not. Never read a role out of `users/{uid}` — the profile supplies the
  candidate list and nothing more. Authorization comes from the claim, checked
  server-side.
