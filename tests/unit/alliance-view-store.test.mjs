import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ALLIANCE_VIEW_ROSTER_DOC_ROOT,
  AllianceRosterAdminRequiredError,
  AllianceRosterConflictError,
  AllianceRosterDuplicateAssignmentError,
  createAllianceRosterStore,
  getAllianceRosterDocumentPath,
  normalizeAllianceRosterDocument,
  normalizeAllianceRosterMember,
  serializeAllianceRosterDocument,
} from '../../js/alliance-view-store.js';

const SERVER_TIMESTAMP = Object.freeze({ kind: 'server-timestamp' });

function member(id, name, allianceId = 'v3s') {
  return {
    id,
    allianceId,
    imported: {
      name,
      alliance: allianceId.toUpperCase(),
      rank: 'R4',
      server: '123',
      castleLevel: 30,
      totalPower: 123_456_789,
      lastOnline: '2 hours ago',
    },
    overrides: {},
    knownNames: [name],
    activityAtMs: 1_750_000_000_000,
    activityRaw: '2 hours ago',
    edenAssignment: null,
  };
}

function assignedMember(id, name, sourceId, allianceId = 'v3s') {
  const result = member(id, name, allianceId);
  result.edenAssignment = {
    sourceId,
    sourceName: name,
    playerKey: name.toLocaleLowerCase(),
    method: 'manual',
    confirmedAtMs: 1_752_659_999_000,
    confirmedBy: 'admin-1',
  };
  return result;
}

function cloudRoster(allianceId, revision, members = []) {
  return {
    allianceId,
    revision,
    members,
    updatedAt: 1_750_000_000_000,
    updatedBy: 'admin-1',
  };
}

function createFirestoreFake(initial = {}) {
  const documents = new Map(
    Object.entries(initial).map(([path, value]) => [path, structuredClone(value)])
  );
  const listeners = new Map();
  let transactionCount = 0;

  function snapshot(path) {
    return {
      exists: () => documents.has(path),
      data: () => (documents.has(path) ? structuredClone(documents.get(path)) : undefined),
    };
  }

  function notify(path) {
    for (const listener of listeners.get(path) || []) listener.next(snapshot(path));
  }

  const firestore = {
    doc(_db, ...segments) {
      return { path: segments.join('/') };
    },
    onSnapshot(ref, next, error) {
      const entries = listeners.get(ref.path) || [];
      const entry = { next, error };
      entries.push(entry);
      listeners.set(ref.path, entries);
      next(snapshot(ref.path));
      return () => {
        const active = listeners.get(ref.path) || [];
        listeners.set(
          ref.path,
          active.filter((candidate) => candidate !== entry)
        );
      };
    },
    async runTransaction(_db, callback) {
      transactionCount += 1;
      const staged = new Map();
      const transaction = {
        async get(ref) {
          return snapshot(ref.path);
        },
        set(ref, payload) {
          staged.set(ref.path, structuredClone(payload));
        },
      };
      const result = await callback(transaction);
      for (const [path, payload] of staged) documents.set(path, payload);
      for (const path of staged.keys()) notify(path);
      return result;
    },
    serverTimestamp() {
      return SERVER_TIMESTAMP;
    },
  };

  return {
    firestore,
    read(path) {
      return documents.has(path) ? structuredClone(documents.get(path)) : undefined;
    },
    listenerCount(path) {
      return (listeners.get(path) || []).length;
    },
    get transactionCount() {
      return transactionCount;
    },
  };
}

function adminUser(isAdmin = true) {
  return {
    uid: 'admin-1',
    async getIdTokenResult() {
      return { claims: { admin: isAdmin } };
    },
  };
}

test('Alliance View roster paths use the nested admin-only collection', () => {
  assert.equal(ALLIANCE_VIEW_ROSTER_DOC_ROOT, 'vts_admin/alliance_view/rosters');
  assert.equal(getAllianceRosterDocumentPath('V3S'), 'vts_admin/alliance_view/rosters/v3s');
  assert.throws(() => getAllianceRosterDocumentPath('other'), /v3s or vts/);
});

test('roster member normalization preserves Unicode, imported values, aliases, and account assignment', () => {
  const normalized = normalizeAllianceRosterMember(
    {
      memberId: 'castle-古风无道',
      allianceId: 'V3S',
      imported: {
        Name: '古风无道',
        Alliance: 'V3S',
        Rank: 'R4',
        Server: '123',
        'Castle Level': '30',
        'Total Power': '123,456,789',
        'Last Online': '2 hours ago',
      },
      importedRaw: {
        name: '古风无道',
        alliance: 'V3S',
        rank: 'R4',
        server: '123',
        castleLevel: '30',
        totalPower: '123,456,789',
        lastOnline: '2 hours ago',
      },
      overrides: { rank: 'R5', totalPower: '130,000,000' },
      knownNames: ['古風無道', '古风无道'],
      activityTimestamp: new Date('2026-07-16T10:00:00Z'),
      importedActivityAtMs: Date.parse('2026-07-16T09:00:00Z'),
      lastOnlineRaw: '2 hours ago',
      edenMatch: {
        accountId: 'eden-source-17',
        accountName: '古风无道',
        playerKey: '古风无道',
        matchType: 'manual',
        confirmedAtMs: 1_752_659_999_000,
        confirmedBy: 'admin-1',
      },
    },
    { allianceId: 'v3s' }
  );

  assert.equal(normalized.id, 'castle-古风无道');
  assert.equal(normalized.allianceId, 'v3s');
  assert.equal(normalized.imported.totalPower, 123_456_789);
  assert.equal(normalized.importedRaw.totalPower, '123,456,789');
  assert.equal(normalized.overrides.totalPower, 130_000_000);
  assert.deepEqual(normalized.knownNames, ['古风无道', '古風無道']);
  assert.equal(normalized.activityAtMs, Date.parse('2026-07-16T10:00:00Z'));
  assert.equal(normalized.importedActivityAtMs, Date.parse('2026-07-16T09:00:00Z'));
  assert.deepEqual(normalized.edenAssignment, {
    sourceId: 'eden-source-17',
    sourceName: '古风无道',
    playerKey: '古风无道',
    method: 'manual',
    confirmedAtMs: 1_752_659_999_000,
    confirmedBy: 'admin-1',
  });
});

test('roster serialization retains current account data and advances the expected revision', () => {
  const account = member('v3s-1', '‼Uzumaki‼');
  account.allianceId = 'vts';
  account.importedActivityAtMs = 1_749_999_000_000;
  const payload = serializeAllianceRosterDocument(
    { allianceId: 'v3s', revision: 4, members: [account] },
    {
      allianceId: 'v3s',
      expectedRevision: 4,
      uid: 'admin-1',
      serverTimestamp: () => SERVER_TIMESTAMP,
    }
  );

  assert.equal(payload.revision, 5);
  assert.equal(payload.updatedAt, SERVER_TIMESTAMP);
  assert.equal(payload.updatedBy, 'admin-1');
  assert.equal(payload.members[0].imported.name, '‼Uzumaki‼');
  assert.equal(payload.members[0].allianceId, 'v3s');
  assert.equal(payload.members[0].activityRaw, '2 hours ago');
  assert.equal(payload.members[0].importedActivityAtMs, 1_749_999_000_000);
  assert.equal('history' in payload, false);
  assert.equal('snapshots' in payload, false);
});

test('roster serialization rejects missing and duplicate stable member IDs', () => {
  const options = {
    allianceId: 'v3s',
    expectedRevision: 0,
    uid: 'admin-1',
    serverTimestamp: () => SERVER_TIMESTAMP,
  };
  assert.throws(
    () => serializeAllianceRosterDocument({ members: [{ imported: { name: 'No ID' } }] }, options),
    /stable member ID/
  );
  assert.throws(
    () =>
      serializeAllianceRosterDocument(
        { members: [member('same', 'Primary'), member('same', 'Farm')] },
        options
      ),
    /Duplicate alliance roster member ID/
  );
  assert.throws(
    () =>
      serializeAllianceRosterDocument(
        {
          members: [
            assignedMember('primary', 'Primary', 'eden-row-1'),
            assignedMember('farm', 'Farm', 'eden-row-1'),
          ],
        },
        options
      ),
    AllianceRosterDuplicateAssignmentError
  );
  assert.throws(
    () =>
      serializeAllianceRosterDocument(
        {
          members: Array.from({ length: 301 }, (_, index) =>
            member(`member-${index}`, `#${index}`)
          ),
        },
        options
      ),
    /limited to 300 accounts/
  );
});

test('store subscribes to both alliance documents and normalizes missing rosters', async () => {
  const v3sPath = getAllianceRosterDocumentPath('v3s');
  const vtsPath = getAllianceRosterDocumentPath('vts');
  const fake = createFirestoreFake({
    [v3sPath]: cloudRoster('v3s', 3, [member('v3s-1', 'EightBall _\\I/_')]),
  });
  const changes = [];
  const store = createAllianceRosterStore({
    db: {},
    user: adminUser(),
    firestore: fake.firestore,
    onChange: (change) => changes.push(change),
  });

  await store.start();

  assert.equal(fake.listenerCount(v3sPath), 1);
  assert.equal(fake.listenerCount(vtsPath), 1);
  assert.equal(store.getRoster('v3s').revision, 3);
  assert.equal(store.getRoster('v3s').members[0].imported.name, 'EightBall _\\I/_');
  assert.deepEqual(store.getRoster('vts'), {
    allianceId: 'vts',
    revision: 0,
    members: [],
    updatedAt: null,
    updatedAtMs: null,
    updatedBy: '',
  });
  assert.deepEqual(
    changes.map((change) => [change.allianceId, change.source]),
    [
      ['v3s', 'remote'],
      ['vts', 'remote'],
    ]
  );

  store.stop();
  assert.equal(fake.listenerCount(v3sPath), 0);
  assert.equal(fake.listenerCount(vtsPath), 0);
});

test('saveRoster compares cloud revision and writes the next revision transactionally', async () => {
  const path = getAllianceRosterDocumentPath('v3s');
  const fake = createFirestoreFake({
    [path]: cloudRoster('v3s', 1, [member('v3s-1', 'Primary')]),
  });
  const store = createAllianceRosterStore({
    db: {},
    user: adminUser(),
    firestore: fake.firestore,
  });

  const saved = await store.saveRoster('v3s', {
    allianceId: 'v3s',
    revision: 1,
    members: [member('v3s-1', 'Primary'), member('v3s-2', 'Farm')],
  });

  assert.equal(fake.transactionCount, 1);
  assert.equal(saved.revision, 2);
  assert.equal(saved.members.length, 2);
  assert.equal(fake.read(path).revision, 2);
  assert.equal(fake.read(path).members[1].imported.name, 'Farm');

  await assert.rejects(
    store.saveRoster(
      'v3s',
      { revision: 1, members: [member('v3s-1', 'Stale edit')] },
      { expectedRevision: 1 }
    ),
    (error) =>
      error instanceof AllianceRosterConflictError &&
      error.expectedRevision === 1 &&
      error.actualRevision === 2
  );
  assert.equal(fake.read(path).members[0].imported.name, 'Primary');
});

test('saveRosters does not partially replace rosters when either revision conflicts', async () => {
  const v3sPath = getAllianceRosterDocumentPath('v3s');
  const vtsPath = getAllianceRosterDocumentPath('vts');
  const fake = createFirestoreFake({
    [v3sPath]: cloudRoster('v3s', 1, [member('v3s-1', 'V3S old')]),
    [vtsPath]: cloudRoster('vts', 2, [member('vts-1', 'VTS old', 'vts')]),
  });
  const store = createAllianceRosterStore({
    db: {},
    user: adminUser(),
    firestore: fake.firestore,
  });

  await assert.rejects(
    store.saveRosters(
      {
        v3s: { revision: 1, members: [member('v3s-1', 'V3S new')] },
        vts: { revision: 1, members: [member('vts-1', 'VTS new', 'vts')] },
      },
      { expectedRevisions: { v3s: 1, vts: 1 } }
    ),
    (error) => error instanceof AllianceRosterConflictError && error.allianceId === 'vts'
  );

  assert.equal(fake.read(v3sPath).members[0].imported.name, 'V3S old');
  assert.equal(fake.read(vtsPath).members[0].imported.name, 'VTS old');
});

test('saveRoster prevents one Eden source row from being assigned across alliances', async () => {
  const v3sPath = getAllianceRosterDocumentPath('v3s');
  const vtsPath = getAllianceRosterDocumentPath('vts');
  const fake = createFirestoreFake({
    [v3sPath]: cloudRoster('v3s', 1, [member('v3s-1', 'V3S primary')]),
    [vtsPath]: cloudRoster('vts', 1, [
      assignedMember('vts-1', 'VTS primary', 'eden-row-shared', 'vts'),
    ]),
  });
  const store = createAllianceRosterStore({
    db: {},
    user: adminUser(),
    firestore: fake.firestore,
  });

  await assert.rejects(
    store.saveRoster('v3s', {
      revision: 1,
      members: [assignedMember('v3s-1', 'V3S primary', 'eden-row-shared')],
    }),
    (error) =>
      error instanceof AllianceRosterDuplicateAssignmentError &&
      error.sourceId === 'eden-row-shared'
  );

  assert.equal(fake.read(v3sPath).members[0].edenAssignment, null);
  assert.equal(fake.read(vtsPath).members[0].edenAssignment.sourceId, 'eden-row-shared');
});

test('cross-roster duplicate protection also rejects repeated member IDs and same-ID assignments', async () => {
  const v3sPath = getAllianceRosterDocumentPath('v3s');
  const vtsPath = getAllianceRosterDocumentPath('vts');
  const fake = createFirestoreFake({
    [v3sPath]: cloudRoster('v3s', 1, []),
    [vtsPath]: cloudRoster('vts', 1, [
      assignedMember('shared-id', 'VTS account', 'eden-shared', 'vts'),
    ]),
  });
  const store = createAllianceRosterStore({
    db: {},
    user: adminUser(),
    firestore: fake.firestore,
  });

  await assert.rejects(
    store.saveRoster('v3s', {
      revision: 1,
      members: [assignedMember('shared-id', 'V3S account', 'eden-shared')],
    }),
    AllianceRosterDuplicateAssignmentError
  );
  await assert.rejects(
    store.saveRoster('v3s', {
      revision: 1,
      members: [assignedMember('shared-id', 'V3S account', 'eden-other')],
    }),
    /Duplicate alliance roster member ID across rosters/
  );
});

test('store refuses subscriptions and writes without the admin custom claim', async () => {
  const path = getAllianceRosterDocumentPath('v3s');
  const fake = createFirestoreFake();
  const store = createAllianceRosterStore({
    db: {},
    user: adminUser(false),
    firestore: fake.firestore,
  });

  await assert.rejects(store.start(), AllianceRosterAdminRequiredError);
  await assert.rejects(
    store.saveRoster('v3s', { revision: 0, members: [member('v3s-1', 'Denied')] }),
    AllianceRosterAdminRequiredError
  );
  assert.equal(fake.listenerCount(path), 0);
  assert.equal(fake.transactionCount, 0);
});

test('cloud document normalization exposes Firestore timestamps as milliseconds', () => {
  const normalized = normalizeAllianceRosterDocument(
    cloudRoster('vts', 7, [member('vts-1', 'Крепость', 'vts')]),
    { allianceId: 'vts' }
  );
  assert.equal(normalized.updatedAtMs, 1_750_000_000_000);
  assert.equal(normalized.members[0].imported.name, 'Крепость');
});
