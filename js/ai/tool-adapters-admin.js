import {
  AiToolInputError,
  boundedStringArray,
  normalizeLookupToken,
  rejectUnknownArguments,
  requirePlainArguments,
} from './tool-utils.js';

const DASHBOARD_PATH = 'vts_admin/dashboard_data';
const ROSTER_PATH = 'vts_admin/roster_data';

function result(data, options = {}) {
  return {
    data,
    meta: {
      sourceId: 'admin-dashboard',
      filters: options.filters || {},
      truncated: options.truncated === true,
      completeness: options.completeness || 'complete',
      warnings: options.warnings || [],
    },
  };
}

async function loadVerifiedAdminData(context) {
  if (context.adminAuthorized === true && context.adminData) return context.adminData;
  const [{ initFirebase, getCurrentUser, getDb, isAdminAuthUser }, { importFirestore }] =
    await Promise.all([import('../firebase.js'), import('../firebase-sdk.js')]);
  const setup = initFirebase();
  const user = getCurrentUser();
  if (!setup.configured || !user || !(await isAdminAuthUser(user))) {
    throw new AiToolInputError(
      'admin_auth_required',
      'A currently signed-in account with the verified Firebase admin claim is required.'
    );
  }
  const db = getDb();
  const { doc, getDoc } = await importFirestore();
  const [dashboardSnap, rosterSnap] = await Promise.all([
    getDoc(doc(db, DASHBOARD_PATH)),
    getDoc(doc(db, ROSTER_PATH)),
  ]);
  return {
    dashboard: dashboardSnap.exists() ? dashboardSnap.data() || {} : {},
    roster: rosterSnap.exists() ? rosterSnap.data() || {} : {},
  };
}

function latestRosterSnapshot(data) {
  const snapshots = Array.isArray(data?.roster?.snapshots) ? data.roster.snapshots : [];
  return (
    snapshots
      .slice()
      .sort((a, b) =>
        String(b?.date || b?.updatedAt || '').localeCompare(String(a?.date || a?.updatedAt || ''))
      )[0] || null
  );
}

export async function getAdminContextAdapter(rawArguments, context = {}) {
  const args = requirePlainArguments(rawArguments);
  rejectUnknownArguments(args, ['kind', 'names']);
  const kind = normalizeLookupToken(args.kind).replace(/ /g, '_');
  if (!['summary', 'roster_lookup'].includes(kind)) {
    throw new AiToolInputError('unsupported_data', 'kind must be summary or roster_lookup.');
  }
  const adminData = await loadVerifiedAdminData(context);
  const dashboard = adminData.dashboard || {};
  const latestRoster = latestRosterSnapshot(adminData);

  if (kind === 'summary') {
    return result({
      kind,
      verifiedAdmin: true,
      dashboardAsOf: String(dashboard.updatedAt || dashboard.date || '').slice(0, 40) || null,
      season: String(dashboard.r5Season || '').slice(0, 40) || null,
      contributionSnapshots: Array.isArray(dashboard.contributionRecords)
        ? dashboard.contributionRecords.length
        : 0,
      dutyRecords: Array.isArray(dashboard.dutyRecords) ? dashboard.dutyRecords.length : 0,
      attacks: Array.isArray(dashboard.attacks) ? dashboard.attacks.length : 0,
      rosterSnapshotDate:
        String(latestRoster?.date || latestRoster?.updatedAt || '').slice(0, 40) || null,
      rosterMembers: Array.isArray(latestRoster?.members) ? latestRoster.members.length : 0,
      privacy:
        'Bounded summary only; credentials, raw ballots, voter identities, and private notes are excluded.',
    });
  }

  const names = boundedStringArray(args.names, 'names', {
    minimum: 1,
    maximum: 12,
    item: { maximum: 100 },
  });
  const members = Array.isArray(latestRoster?.members) ? latestRoster.members : [];
  const matches = [];
  const missingNames = [];
  for (const requestedName of names) {
    const token = normalizeLookupToken(requestedName);
    const exact = members.find((member) => normalizeLookupToken(member) === token);
    if (exact) matches.push({ requestedName, playerName: String(exact).slice(0, 100) });
    else missingNames.push(requestedName);
  }
  return result(
    {
      kind,
      verifiedAdmin: true,
      snapshotDate:
        String(latestRoster?.date || latestRoster?.updatedAt || '').slice(0, 40) || null,
      matches,
      missingNames,
      privacy: 'Exact-name lookup only; the full private roster is not returned.',
    },
    {
      filters: { names },
      completeness: missingNames.length ? 'partial' : 'complete',
      warnings: missingNames.length
        ? ['Some names were not found in the latest admin roster.']
        : [],
    }
  );
}
