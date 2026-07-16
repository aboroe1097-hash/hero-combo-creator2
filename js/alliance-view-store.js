export const ALLIANCE_VIEW_ROSTER_DOC_ROOT = 'vts_admin/alliance_view/rosters';

export const ALLIANCE_VIEW_ALLIANCE_IDS = Object.freeze(['v3s', 'vts']);

const ALLIANCE_ID_SET = new Set(ALLIANCE_VIEW_ALLIANCE_IDS);
const MAX_ROSTER_MEMBERS = 300;
const MAX_KNOWN_NAMES = 30;

function cleanString(value, maxLength = 160) {
  return String(value ?? '')
    .normalize('NFC')
    .trim()
    .slice(0, maxLength);
}

function normalizeAllianceId(value, fallback = '') {
  const normalized = cleanString(value, 12).toLowerCase();
  if (ALLIANCE_ID_SET.has(normalized)) return normalized;
  const normalizedFallback = cleanString(fallback, 12).toLowerCase();
  return ALLIANCE_ID_SET.has(normalizedFallback) ? normalizedFallback : '';
}

function normalizeOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const normalized =
    typeof value === 'string' ? Number(value.replaceAll(',', '').trim()) : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeTimestampMs(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value?.toMillis === 'function') {
    const millis = Number(value.toMillis());
    return Number.isFinite(millis) && millis >= 0 ? Math.trunc(millis) : null;
  }
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) && millis >= 0 ? Math.trunc(millis) : null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) return Math.trunc(numeric);
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
}

function own(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function firstDefined(source, keys) {
  for (const key of keys) {
    if (own(source, key)) return source[key];
  }
  return undefined;
}

function normalizeImportedFields(input = {}) {
  const source = input?.imported && typeof input.imported === 'object' ? input.imported : input;
  return {
    name: cleanString(firstDefined(source, ['name', 'Name']), 160),
    alliance: cleanString(firstDefined(source, ['alliance', 'Alliance']), 40),
    rank: cleanString(firstDefined(source, ['rank', 'Rank']), 40),
    server: cleanString(firstDefined(source, ['server', 'Server']), 40),
    castleLevel: normalizeOptionalNumber(
      firstDefined(source, ['castleLevel', 'castle_level', 'Castle Level'])
    ),
    totalPower: normalizeOptionalNumber(
      firstDefined(source, ['totalPower', 'total_power', 'Total Power'])
    ),
    lastOnline: cleanString(
      firstDefined(source, ['lastOnline', 'last_online', 'Last Online']),
      120
    ),
  };
}

function normalizeImportedRaw(input, imported) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  return Object.fromEntries(
    Object.keys(imported).map((key) => [
      key,
      cleanString(own(source, key) ? source[key] : imported[key], key === 'name' ? 160 : 120),
    ])
  );
}

function normalizeOverrides(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const output = {};
  for (const key of ['name', 'alliance', 'rank', 'server', 'lastOnline']) {
    if (own(source, key)) output[key] = cleanString(source[key], key === 'name' ? 160 : 120);
  }
  for (const key of ['castleLevel', 'totalPower', 'activityAtMs']) {
    if (own(source, key)) {
      output[key] =
        key === 'activityAtMs'
          ? normalizeTimestampMs(source[key])
          : normalizeOptionalNumber(source[key]);
    }
  }
  return output;
}

function normalizeKnownNames(input, importedName = '') {
  const values = Array.isArray(input) ? input : [];
  const names = [];
  const seen = new Set();
  for (const value of [importedName, ...values]) {
    const name = cleanString(value, 160);
    const key = name.toLocaleLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= MAX_KNOWN_NAMES) break;
  }
  return names;
}

function normalizeEdenAssignment(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const sourceId = cleanString(
    firstDefined(input, ['sourceId', 'accountId', 'edenAccountId']),
    220
  );
  const sourceName = cleanString(
    firstDefined(input, ['sourceName', 'accountName', 'edenAccountName']),
    160
  );
  if (!sourceId && !sourceName) return null;
  return {
    sourceId,
    sourceName,
    playerKey: cleanString(input.playerKey, 160),
    method: cleanString(firstDefined(input, ['method', 'matchType']), 40),
    confirmedAtMs: normalizeTimestampMs(input.confirmedAtMs),
    confirmedBy: cleanString(input.confirmedBy, 128),
  };
}

export function normalizeAllianceRosterMember(input = {}, options = {}) {
  const imported = normalizeImportedFields(input);
  const allianceId = normalizeAllianceId(input.allianceId || imported.alliance, options.allianceId);
  const activityAtMs = normalizeTimestampMs(
    firstDefined(input, ['activityAtMs', 'activityTimestamp', 'activityAt']) ??
      input?.imported?.activityAtMs
  );
  const activityRaw = cleanString(
    firstDefined(input, ['activityRaw', 'lastOnlineRaw']) ?? imported.lastOnline,
    120
  );
  const member = {
    id: cleanString(firstDefined(input, ['id', 'memberId']), 160),
    allianceId,
    imported,
    importedRaw: normalizeImportedRaw(input.importedRaw, imported),
    overrides: normalizeOverrides(input.overrides),
    knownNames: normalizeKnownNames(input.knownNames, imported.name),
    activityAtMs,
    activityRaw,
    edenAssignment: normalizeEdenAssignment(
      firstDefined(input, ['edenAssignment', 'edenMatch', 'manualEdenAssignment'])
    ),
  };
  const importedActivityAtMs = normalizeTimestampMs(input.importedActivityAtMs);
  const importedAtMs = normalizeTimestampMs(input.importedAtMs);
  const createdAtMs = normalizeTimestampMs(input.createdAtMs);
  const updatedAtMs = normalizeTimestampMs(input.updatedAtMs);
  if (importedActivityAtMs !== null) member.importedActivityAtMs = importedActivityAtMs;
  if (importedAtMs !== null) member.importedAtMs = importedAtMs;
  if (createdAtMs !== null) member.createdAtMs = createdAtMs;
  if (updatedAtMs !== null) member.updatedAtMs = updatedAtMs;
  const sourceRowNumber = Number(input.sourceRowNumber);
  if (Number.isInteger(sourceRowNumber) && sourceRowNumber > 0) {
    member.sourceRowNumber = sourceRowNumber;
  }
  if (input.manuallyAdded === true) member.manuallyAdded = true;
  return member;
}

function snapshotExists(snapshot) {
  if (typeof snapshot?.exists === 'function') return snapshot.exists();
  return snapshot?.exists === true;
}

function snapshotData(snapshot) {
  return snapshotExists(snapshot) && typeof snapshot?.data === 'function'
    ? snapshot.data() || {}
    : {};
}

export function normalizeAllianceRosterDocument(input = {}, options = {}) {
  const allianceId = normalizeAllianceId(
    input?.allianceId,
    options.allianceId || options.fallbackAllianceId
  );
  const revisionNumber = Number(input?.revision);
  const revision =
    Number.isInteger(revisionNumber) && revisionNumber > 0 ? Math.trunc(revisionNumber) : 0;
  const members = (Array.isArray(input?.members) ? input.members : [])
    .slice(0, MAX_ROSTER_MEMBERS)
    .map((member) => normalizeAllianceRosterMember(member, { allianceId }));
  return {
    allianceId,
    revision,
    members,
    updatedAt: input?.updatedAt || null,
    updatedAtMs: normalizeTimestampMs(input?.updatedAt),
    updatedBy: cleanString(input?.updatedBy, 128),
  };
}

function cloneMember(member) {
  return {
    ...member,
    imported: { ...member.imported },
    importedRaw: { ...member.importedRaw },
    overrides: { ...member.overrides },
    knownNames: [...member.knownNames],
    edenAssignment: member.edenAssignment ? { ...member.edenAssignment } : null,
  };
}

function cloneRoster(roster) {
  return { ...roster, members: roster.members.map(cloneMember) };
}

function validateRosterMembers(members) {
  if (!Array.isArray(members)) throw new TypeError('Alliance roster members must be an array.');
  if (members.length > MAX_ROSTER_MEMBERS) {
    throw new RangeError(`Alliance rosters are limited to ${MAX_ROSTER_MEMBERS} accounts.`);
  }
  const ids = new Set();
  const assignedSourceIds = new Set();
  for (const member of members) {
    if (!member.id) throw new Error('Every alliance roster account requires a stable member ID.');
    if (ids.has(member.id)) {
      throw new Error(`Duplicate alliance roster member ID: ${member.id}`);
    }
    ids.add(member.id);
    const sourceId = member.edenAssignment?.sourceId;
    if (!member.edenAssignment) continue;
    if (!sourceId) {
      throw new Error(`Eden assignment for ${member.id} requires a stable source ID.`);
    }
    if (assignedSourceIds.has(sourceId)) {
      throw new AllianceRosterDuplicateAssignmentError(sourceId);
    }
    assignedSourceIds.add(sourceId);
  }
}

function validateDistinctAssignments(rosters) {
  const assignedAccounts = new Map();
  const memberIds = new Set();
  for (const roster of rosters) {
    for (const member of roster.members) {
      const sourceId = member.edenAssignment?.sourceId;
      if (sourceId && assignedAccounts.has(sourceId)) {
        throw new AllianceRosterDuplicateAssignmentError(sourceId);
      }
      if (sourceId) assignedAccounts.set(sourceId, member.id);
      if (memberIds.has(member.id)) {
        throw new Error(`Duplicate alliance roster member ID across rosters: ${member.id}`);
      }
      memberIds.add(member.id);
    }
  }
}

function memberForCloud(member) {
  const output = {
    id: member.id,
    allianceId: member.allianceId,
    imported: { ...member.imported },
    importedRaw: { ...member.importedRaw },
    overrides: { ...member.overrides },
    knownNames: [...member.knownNames],
    activityAtMs: member.activityAtMs,
    activityRaw: member.activityRaw,
    edenAssignment: member.edenAssignment ? { ...member.edenAssignment } : null,
  };
  if (Number.isFinite(member.importedActivityAtMs)) {
    output.importedActivityAtMs = Math.trunc(member.importedActivityAtMs);
  }
  if (Number.isFinite(member.importedAtMs)) output.importedAtMs = Math.trunc(member.importedAtMs);
  if (Number.isFinite(member.createdAtMs)) output.createdAtMs = Math.trunc(member.createdAtMs);
  if (Number.isFinite(member.updatedAtMs)) output.updatedAtMs = Math.trunc(member.updatedAtMs);
  if (Number.isInteger(member.sourceRowNumber) && member.sourceRowNumber > 0) {
    output.sourceRowNumber = member.sourceRowNumber;
  }
  if (member.manuallyAdded === true) output.manuallyAdded = true;
  return output;
}

export function serializeAllianceRosterDocument(input, options = {}) {
  const allianceId = normalizeAllianceId(options.allianceId || input?.allianceId);
  if (!allianceId) throw new Error('Alliance roster must target v3s or vts.');
  const expectedRevision = Number(options.expectedRevision ?? input?.revision ?? 0);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
    throw new TypeError('Alliance roster expected revision must be a non-negative integer.');
  }
  const uid = cleanString(options.uid, 128);
  if (!uid) throw new Error('Alliance roster writes require an authenticated admin UID.');
  if (typeof options.serverTimestamp !== 'function') {
    throw new Error('Alliance roster writes require Firestore serverTimestamp().');
  }
  const rosterInput = Array.isArray(input) ? { members: input } : input || {};
  if (Array.isArray(rosterInput.members) && rosterInput.members.length > MAX_ROSTER_MEMBERS) {
    throw new RangeError(`Alliance rosters are limited to ${MAX_ROSTER_MEMBERS} accounts.`);
  }
  const roster = normalizeAllianceRosterDocument({ ...rosterInput, allianceId }, { allianceId });
  roster.members = roster.members.map((member) => ({ ...member, allianceId }));
  validateRosterMembers(roster.members);
  return {
    allianceId,
    revision: expectedRevision + 1,
    members: roster.members.map(memberForCloud),
    updatedAt: options.serverTimestamp(),
    updatedBy: uid,
  };
}

export function getAllianceRosterDocumentPath(allianceId) {
  const normalized = normalizeAllianceId(allianceId);
  if (!normalized) throw new Error('Alliance roster document ID must be v3s or vts.');
  return `${ALLIANCE_VIEW_ROSTER_DOC_ROOT}/${normalized}`;
}

export class AllianceRosterConflictError extends Error {
  constructor(allianceId, expectedRevision, actualRevision) {
    super(
      `${allianceId.toUpperCase()} roster changed in another session (expected revision ${expectedRevision}, found ${actualRevision}).`
    );
    this.name = 'AllianceRosterConflictError';
    this.code = 'alliance-roster-conflict';
    this.allianceId = allianceId;
    this.expectedRevision = expectedRevision;
    this.actualRevision = actualRevision;
  }
}

export class AllianceRosterAdminRequiredError extends Error {
  constructor() {
    super('Alliance View requires the Firebase admin custom claim.');
    this.name = 'AllianceRosterAdminRequiredError';
    this.code = 'alliance-roster-admin-required';
  }
}

export class AllianceRosterDuplicateAssignmentError extends Error {
  constructor(sourceId) {
    super(`Eden account ${sourceId} is already assigned to another roster account.`);
    this.name = 'AllianceRosterDuplicateAssignmentError';
    this.code = 'alliance-roster-duplicate-assignment';
    this.sourceId = sourceId;
  }
}

async function defaultIsAdmin(user) {
  if (!user?.uid || typeof user.getIdTokenResult !== 'function') return false;
  const result = await user.getIdTokenResult();
  return result?.claims?.admin === true;
}

function validateStoreOptions(options) {
  const firestore = options.firestore || {};
  const missing = ['doc', 'onSnapshot', 'runTransaction', 'serverTimestamp'].filter(
    (name) => typeof firestore[name] !== 'function'
  );
  if (!options.db || !options.user?.uid || missing.length) {
    throw new Error(
      `Alliance roster store is missing ${[
        !options.db ? 'db' : '',
        !options.user?.uid ? 'user' : '',
        ...missing,
      ]
        .filter(Boolean)
        .join(', ')}.`
    );
  }
}

export function createAllianceRosterStore(options = {}) {
  validateStoreOptions(options);
  const { db, user, firestore } = options;
  const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
  const onError = typeof options.onError === 'function' ? options.onError : () => {};
  const isAdmin = typeof options.isAdmin === 'function' ? options.isAdmin : defaultIsAdmin;
  const cache = Object.fromEntries(
    ALLIANCE_VIEW_ALLIANCE_IDS.map((allianceId) => [
      allianceId,
      normalizeAllianceRosterDocument({ allianceId }, { allianceId }),
    ])
  );
  let adminCheckPromise = null;
  let started = false;
  let unsubscribers = [];

  async function ensureAdmin() {
    adminCheckPromise ||= Promise.resolve(isAdmin(user));
    if ((await adminCheckPromise) !== true) throw new AllianceRosterAdminRequiredError();
  }

  function refFor(allianceId) {
    return firestore.doc(db, getAllianceRosterDocumentPath(allianceId));
  }

  function getRoster(allianceId) {
    const normalized = normalizeAllianceId(allianceId);
    if (!normalized) throw new Error('Alliance roster ID must be v3s or vts.');
    return cloneRoster(cache[normalized]);
  }

  function getRosters() {
    return Object.fromEntries(
      ALLIANCE_VIEW_ALLIANCE_IDS.map((allianceId) => [allianceId, getRoster(allianceId)])
    );
  }

  function emitChange(allianceId, source) {
    onChange({ allianceId, roster: getRoster(allianceId), rosters: getRosters(), source });
  }

  function handleSnapshot(allianceId, snapshot) {
    const raw = snapshotData(snapshot);
    cache[allianceId] = normalizeAllianceRosterDocument(raw, { allianceId });
    emitChange(allianceId, 'remote');
  }

  async function start() {
    if (started) return controller;
    await ensureAdmin();
    const nextUnsubscribers = [];
    try {
      for (const allianceId of ALLIANCE_VIEW_ALLIANCE_IDS) {
        const unsubscribe = firestore.onSnapshot(
          refFor(allianceId),
          (snapshot) => handleSnapshot(allianceId, snapshot),
          (error) => onError({ allianceId, error })
        );
        if (typeof unsubscribe === 'function') nextUnsubscribers.push(unsubscribe);
      }
    } catch (error) {
      for (const unsubscribe of nextUnsubscribers) unsubscribe();
      throw error;
    }
    unsubscribers = nextUnsubscribers;
    started = true;
    return controller;
  }

  function stop() {
    for (const unsubscribe of unsubscribers) {
      try {
        unsubscribe();
      } catch {
        // Listener teardown is best-effort.
      }
    }
    unsubscribers = [];
    started = false;
  }

  function resolveExpectedRevision(allianceId, input, explicitRevision) {
    const inputRevision = Array.isArray(input) ? undefined : input?.revision;
    const revision = Number(explicitRevision ?? inputRevision ?? cache[allianceId].revision);
    if (!Number.isInteger(revision) || revision < 0) {
      throw new TypeError('Alliance roster expected revision must be a non-negative integer.');
    }
    return revision;
  }

  async function saveRoster(allianceIdInput, input, saveOptions = {}) {
    await ensureAdmin();
    const allianceId = normalizeAllianceId(allianceIdInput);
    if (!allianceId) throw new Error('Alliance roster ID must be v3s or vts.');
    const expectedRevision = resolveExpectedRevision(
      allianceId,
      input,
      saveOptions.expectedRevision
    );
    const ref = refFor(allianceId);
    const otherAllianceId = ALLIANCE_VIEW_ALLIANCE_IDS.find((id) => id !== allianceId);
    const otherRef = refFor(otherAllianceId);
    let payload;
    await firestore.runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const otherSnapshot = await transaction.get(otherRef);
      const cloudRoster = normalizeAllianceRosterDocument(snapshotData(snapshot), { allianceId });
      if (cloudRoster.revision !== expectedRevision) {
        throw new AllianceRosterConflictError(allianceId, expectedRevision, cloudRoster.revision);
      }
      payload = serializeAllianceRosterDocument(input, {
        allianceId,
        expectedRevision,
        uid: user.uid,
        serverTimestamp: firestore.serverTimestamp,
      });
      const otherRoster = normalizeAllianceRosterDocument(snapshotData(otherSnapshot), {
        allianceId: otherAllianceId,
      });
      validateDistinctAssignments([
        normalizeAllianceRosterDocument(payload, { allianceId }),
        otherRoster,
      ]);
      transaction.set(ref, payload);
    });
    cache[allianceId] = normalizeAllianceRosterDocument(payload, { allianceId });
    emitChange(allianceId, 'local');
    return getRoster(allianceId);
  }

  async function saveRosters(inputs, saveOptions = {}) {
    await ensureAdmin();
    const requestedIds = ALLIANCE_VIEW_ALLIANCE_IDS.filter((allianceId) =>
      own(inputs || {}, allianceId)
    );
    if (!requestedIds.length) throw new Error('No alliance rosters were supplied.');
    const expectedRevisions = Object.fromEntries(
      requestedIds.map((allianceId) => [
        allianceId,
        resolveExpectedRevision(
          allianceId,
          inputs[allianceId],
          saveOptions.expectedRevisions?.[allianceId]
        ),
      ])
    );
    const refs = Object.fromEntries(
      ALLIANCE_VIEW_ALLIANCE_IDS.map((allianceId) => [allianceId, refFor(allianceId)])
    );
    const payloads = {};
    await firestore.runTransaction(db, async (transaction) => {
      const snapshots = {};
      for (const allianceId of ALLIANCE_VIEW_ALLIANCE_IDS) {
        snapshots[allianceId] = await transaction.get(refs[allianceId]);
      }
      for (const allianceId of requestedIds) {
        const cloudRoster = normalizeAllianceRosterDocument(snapshotData(snapshots[allianceId]), {
          allianceId,
        });
        if (cloudRoster.revision !== expectedRevisions[allianceId]) {
          throw new AllianceRosterConflictError(
            allianceId,
            expectedRevisions[allianceId],
            cloudRoster.revision
          );
        }
      }
      for (const allianceId of requestedIds) {
        payloads[allianceId] = serializeAllianceRosterDocument(inputs[allianceId], {
          allianceId,
          expectedRevision: expectedRevisions[allianceId],
          uid: user.uid,
          serverTimestamp: firestore.serverTimestamp,
        });
      }
      const combinedRosters = ALLIANCE_VIEW_ALLIANCE_IDS.map((allianceId) =>
        normalizeAllianceRosterDocument(
          payloads[allianceId] || snapshotData(snapshots[allianceId]),
          { allianceId }
        )
      );
      validateDistinctAssignments(combinedRosters);
      for (const allianceId of requestedIds) {
        transaction.set(refs[allianceId], payloads[allianceId]);
      }
    });
    for (const allianceId of requestedIds) {
      cache[allianceId] = normalizeAllianceRosterDocument(payloads[allianceId], { allianceId });
      emitChange(allianceId, 'local');
    }
    return getRosters();
  }

  const controller = { start, stop, getRoster, getRosters, saveRoster, saveRosters };
  return controller;
}
