// functions/src/user-roles.js
//
// Grants and revokes the `admin` and `superadmin` custom claims.
//
// A browser cannot set custom claims — that needs the Admin SDK — so the roles
// controller in VTS Admin is a thin UI over this handler. Everything that
// matters is decided here, server-side, from the CALLER'S verified token. A
// role sent in the payload is data, never authority.
//
// Written as a factory over injected dependencies so the decision logic can be
// unit-tested from the repo root without pulling in firebase-admin.

export const ROLE_AUDIT_COLLECTION = 'vts_admin/role_audit/records';
export const ASSIGNABLE_ROLES = Object.freeze(['admin', 'superadmin']);
const MAX_UID_LENGTH = 128;

/**
 * Error carrying a callable-friendly code. index.js maps this onto HttpsError,
 * which keeps this module free of firebase-functions imports.
 */
export class RoleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RoleError';
    this.code = code;
  }
}

/**
 * Resolves the claims a change produces, keeping the two levels consistent:
 * superadmin implies admin, and losing admin necessarily loses superadmin.
 * Returned as a plain object so the caller can diff or log it.
 */
export function nextClaimsFor(existingClaims, role, granted) {
  const claims = { ...(existingClaims || {}) };
  if (role === 'superadmin') {
    claims.superadmin = granted === true;
    // A superadmin who is not an admin could not open the dashboard the
    // superadmin tabs live inside, so granting one grants both.
    if (granted === true) claims.admin = true;
  } else {
    claims.admin = granted === true;
    // Revoking admin must not leave a dangling superadmin claim behind: that
    // would be an account rules still treat as privileged on the tightened
    // collections while the UI refuses to let it in.
    if (granted !== true) claims.superadmin = false;
  }
  return claims;
}

export function createSetUserRoleHandler({ auth, db, now = () => Date.now() }) {
  return async function setUserRole(request) {
    const callerUid = request?.auth?.uid || '';
    const callerIsSuperAdmin = request?.auth?.token?.superadmin === true;
    if (!callerUid || !callerIsSuperAdmin) {
      throw new RoleError('permission-denied', 'Superadmin access is required.');
    }
    await assertCurrentSuperAdmin(auth, callerUid);

    const { targetUid, role, granted } = request?.data || {};
    if (typeof targetUid !== 'string' || !targetUid.trim() || targetUid.length > MAX_UID_LENGTH) {
      throw new RoleError('invalid-argument', 'A target account is required.');
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
      throw new RoleError('invalid-argument', 'Unknown role.');
    }
    if (typeof granted !== 'boolean') {
      throw new RoleError('invalid-argument', 'The granted flag must be a boolean.');
    }

    // Self-demotion is how a project ends up with zero superadmins and no route
    // back in. The break-glass script stays the only way to change your own.
    if (granted === false && targetUid === callerUid) {
      throw new RoleError('failed-precondition', 'A superadmin cannot remove their own access.');
    }

    let existingClaims = {};
    try {
      const target = await auth.getUser(targetUid);
      existingClaims = target?.customClaims || {};
    } catch {
      // Deliberately opaque: probing this endpoint must not reveal which uids
      // exist on the project.
      throw new RoleError('not-found', 'That account was not found.');
    }

    const claims = nextClaimsFor(existingClaims, role, granted);
    await auth.setCustomUserClaims(targetUid, claims);
    if (!granted) await auth.revokeRefreshTokens(targetUid);

    // Audit after the claim lands: a record of a change that did not happen is
    // worse than a change with no record, and the write below is the one most
    // likely to fail on rules or quota.
    await db.collection(ROLE_AUDIT_COLLECTION).add({
      targetUid,
      role,
      granted,
      changedBy: callerUid,
      changedAtMs: now(),
    });

    return { ok: true, claims };
  };
}

async function assertCurrentSuperAdmin(auth, uid) {
  let caller;
  try {
    caller = await auth.getUser(uid);
  } catch {
    throw new RoleError('permission-denied', 'Superadmin access is required.');
  }
  if (caller.disabled || caller.customClaims?.superadmin !== true) {
    throw new RoleError('permission-denied', 'Superadmin access is required.');
  }
}

export function createListUserRolesHandler({ auth, db }) {
  return async function listUserRoles(request) {
    const uid = request?.auth?.uid;
    if (!uid || request.auth.token?.superadmin !== true) {
      throw new RoleError('permission-denied', 'Superadmin access is required.');
    }
    await assertCurrentSuperAdmin(auth, uid);
    const { pageToken, pageSize = 100 } = request.data || {};
    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 1000 ||
      (pageToken !== undefined && (typeof pageToken !== 'string' || pageToken.length > 2048))
    ) {
      throw new RoleError('invalid-argument', 'Invalid account page.');
    }
    const page = await auth.listUsers(pageSize, pageToken || undefined);
    const profiles = page.users.length
      ? await db.getAll(...page.users.map((user) => db.doc(`users/${user.uid}`)))
      : [];
    return {
      members: page.users.map((user, index) => ({
        uid: user.uid,
        displayName: String(
          profiles[index]?.data()?.accountProfile?.displayName || user.displayName || ''
        ).slice(0, 80),
        admin: user.customClaims?.admin === true,
        superadmin: user.customClaims?.superadmin === true,
        disabled: user.disabled === true,
      })),
      nextPageToken: page.pageToken || '',
    };
  };
}
