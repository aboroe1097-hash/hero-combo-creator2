// Run only against the demo emulator:
// firebase emulators:exec --only firestore --project demo-eden-autonomy "node scripts/rules-emulator/eden-autonomy.mjs"
import assert from 'node:assert/strict';
import * as firestore from 'firebase/firestore';
import { createSeasonDraft, publishSeason } from '../../js/admin-season-release.js';
import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { buildEdenPublicProjection, edenWorkspaceFirestorePath } from '../../js/eden-workspaces.js';

const projectId = 'demo-eden-autonomy';
const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/, 'this check is emulator-only');
const [hostname, port] = host.split(':');
let count = 0;
const client = (uid, claims = {}) => {
  const app = initializeApp({ projectId, apiKey: 'demo' }, `eden-${count++}`);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, hostname, Number(port), { mockUserToken: { sub: uid, ...claims } });
  return db;
};
const admin = client('admin', { admin: true });
const superadmin = client('superadmin', { admin: true, superadmin: true });
const member = client('member');
const path = (key, workspace = 'eden-x8') => edenWorkspaceFirestorePath(workspace, key);
const metadataPath = (id = 'eden-x8') => `vts_admin/eden_workspaces/records/${id}`;
const metadata = (id = 'eden-x8', lifecycle = 'draft') => ({
  id,
  lifecycle,
  active: lifecycle === 'active',
  createdAtMs: 1,
  publication: null,
  updatedAt: serverTimestamp(),
  updatedBy: 'superadmin',
});
const dashboard = (revision = 1) => ({
  updatedAtMs: Date.now() + revision,
  syncRevision: revision,
  r5Season: 'season-x8',
  attacks: [],
  players_summary: [],
  contributionRecords: [],
  dutyRecords: [],
  total_attacks: 0,
});
const settings = (votingOpen = false) => ({
  season: 'season-x8',
  votingOpen,
  allowEditing: true,
  showPublicResults: false,
  showMemberResults: false,
  showManagementResults: false,
  showVoterNames: false,
  closesAt: '',
  updatedAt: serverTimestamp(),
  updatedBy: 'superadmin',
});
let passed = 0;
const expect = async (label, allowed, action) => {
  try {
    await action();
    assert.equal(allowed, true, `${label}: unexpectedly allowed`);
  } catch (error) {
    if (allowed || error.code !== 'permission-denied') throw error;
  }
  passed += 1;
  console.log(`PASS ${label}`);
};
const publish = async (revision, extra = {}) => {
  const projection = buildEdenPublicProjection({
    workspace: 'eden-x8',
    revision,
    dashboardData: dashboard(),
    updatedBy: 'superadmin',
    ...extra,
  });
  const batch = writeBatch(superadmin);
  batch.set(doc(superadmin, path('publicProjection')), projection);
  batch.set(doc(superadmin, `eden_seasons/eden-x8/publications/${revision}`), projection);
  await batch.commit();
};

await expect('an Admin cannot mint a workspace', false, () =>
  setDoc(doc(admin, metadataPath()), metadata())
);
await expect('data without workspace metadata is refused', false, () =>
  setDoc(doc(superadmin, path('dashboardData')), dashboard())
);
await expect('legacy X2 stays writable before it is archived', true, () =>
  setDoc(doc(admin, path('dashboardData', 'eden-x2')), { ...dashboard(), r5Season: 'season-2027' })
);
await expect('Super Admin atomically prepares X8 and its empty data', true, async () => {
  await createSeasonDraft({
    db: superadmin,
    firestore,
    uid: 'superadmin',
    workspaceId: 'eden-x8',
    sourceWorkspaceId: 'eden-x2',
  });
});
await expect('retrying a draft preserves uploaded records', true, async () => {
  const result = await createSeasonDraft({
    db: superadmin,
    firestore,
    uid: 'superadmin',
    workspaceId: 'eden-x8',
    sourceWorkspaceId: 'eden-x2',
  });
  assert.equal(result.created, false);
});
await expect('Admin uploads stay isolated to X8', true, () =>
  setDoc(doc(admin, path('dashboardData')), dashboard(2))
);
await expect('members cannot read working uploads', false, () =>
  getDoc(doc(member, path('dashboardData')))
);
await expect('Admin cannot publish', false, () =>
  setDoc(
    doc(admin, path('publicProjection')),
    buildEdenPublicProjection({ workspace: 'eden-x8', dashboardData: dashboard() })
  )
);
await expect(
  'real publication commits history, pointer, and active metadata together',
  true,
  async () => {
    await publishSeason({
      db: superadmin,
      firestore,
      uid: 'superadmin',
      workspaceId: 'eden-x8',
      sourceWorkspaceId: 'eden-x2',
    });
    assert.equal(
      (await getDoc(doc(superadmin, 'vts_admin/public_season'))).data().workspaceId,
      'eden-x8'
    );
    assert.equal((await getDoc(doc(superadmin, metadataPath()))).data().lifecycle, 'active');
    assert.equal(
      (await getDoc(doc(superadmin, metadataPath('eden-x2')))).data().lifecycle,
      'archived'
    );
  }
);
await expect('members can read the allowlisted public projection', true, async () => {
  const data = (await getDoc(doc(member, path('publicProjection')))).data();
  assert.equal(data.workspace, 'eden-x8');
  assert.equal(data.season, 'season-x8');
});
await expect('a projection cannot carry private extra dashboard fields', false, () =>
  publish(2, { dashboardData: { ...dashboard(), privateNotes: 'secret' } }).then(async () => {
    // The client strips extras, so test a direct malicious payload too.
    const current = (await getDoc(doc(superadmin, path('publicProjection')))).data();
    await setDoc(doc(superadmin, path('publicProjection')), {
      ...current,
      revision: 3,
      dashboard: { ...current.dashboard, privateNotes: 'secret' },
    });
  })
);
await expect('rollback publishes an immutable prior snapshot as a new revision', true, async () => {
  const result = await publishSeason({
    db: superadmin,
    firestore,
    uid: 'superadmin',
    workspaceId: 'eden-x8',
    restoreRevision: 1,
  });
  assert.equal(result.revision, 3);
  assert.equal(
    (await getDoc(doc(superadmin, 'eden_seasons/eden-x8/publications/3'))).data().revision,
    3
  );
});
await assert.rejects(
  () =>
    publishSeason({
      db: superadmin,
      firestore,
      uid: 'superadmin',
      workspaceId: 'eden-x8',
      expectedActiveWorkspace: 'eden-x2',
    }),
  /Another leader changed the season/
);
passed += 1;
console.log('PASS stale leader cannot replace a newly selected season');
await expect('publication history cannot be edited', false, () =>
  setDoc(doc(superadmin, 'eden_seasons/eden-x8/publications/1'), { bad: true })
);
await expect('publication history cannot be deleted', false, () =>
  deleteDoc(doc(superadmin, 'eden_seasons/eden-x8/publications/1'))
);
const voteId = 'season-x8__team_players__member';
const vote = () => ({
  id: voteId,
  season: 'season-x8',
  category: 'team_players',
  voterKey: 'member',
  voterName: 'Member',
  candidateKey: 'a',
  candidateName: 'A',
  candidateKeys: ['a'],
  candidateNames: ['A'],
  voterAuthUid: 'member',
  updatedAt: serverTimestamp(),
});
await expect('a closed ballot rejects member writes', false, () =>
  setDoc(doc(member, `${path('votes')}/${voteId}`), vote())
);
await setDoc(doc(superadmin, path('voteSettings')), settings(true));
await expect('an open published ballot accepts own member vote', true, () =>
  setDoc(doc(member, `${path('votes')}/${voteId}`), vote())
);

const config = (revision, changes = {}) => ({
  schemaVersion: 1,
  notice: '',
  readOnly: false,
  disabledFeatures: ['uploads'],
  expiresAtMs: 0,
  revision,
  updatedAtMs: Date.now(),
  updatedBy: 'superadmin',
  ...changes,
});
await expect('Admin cannot set emergency controls', false, () =>
  setDoc(doc(admin, 'vts_admin/operations_config'), { ...config(1), updatedBy: 'admin' })
);
await setDoc(doc(superadmin, 'vts_admin/operations_config'), config(1));
await expect('upload pause rejects Admin uploads', false, () =>
  setDoc(doc(admin, path('dashboardData')), dashboard(3))
);
await expect('Super Admin retains recovery access during pause', true, () =>
  setDoc(doc(superadmin, path('dashboardData')), dashboard(3))
);
await setDoc(doc(superadmin, 'vts_admin/operations_config'), config(2, { expiresAtMs: 1 }));
await expect('expired pause restores Admin access', true, () =>
  setDoc(doc(admin, path('dashboardData')), dashboard(4))
);
await setDoc(
  doc(superadmin, 'vts_admin/operations_config'),
  config(3, { readOnly: true, disabledFeatures: [] })
);
await expect('runtime read-only blocks Admin uploads', false, () =>
  setDoc(doc(admin, path('dashboardData')), dashboard(5))
);
await expect('runtime read-only blocks member ballots', false, () =>
  setDoc(doc(member, `${path('votes')}/${voteId}`), vote())
);
await setDoc(doc(superadmin, 'vts_admin/operations_config'), config(4, { disabledFeatures: [] }));
const adjustment = {
  id: 'restore',
  season: 'season-x8',
  playerKey: 'a',
  playerName: 'A',
  points: 1,
  category: 'extra_effort',
  note: 'restored',
  createdAt: Timestamp.fromMillis(1),
  createdBy: 'original-author',
  restoredBy: 'superadmin',
  restoredAt: serverTimestamp(),
};
await expect('Super Admin can restore historical conduct with explicit audit stamps', true, () =>
  setDoc(doc(superadmin, `${path('conductAdjustments')}/restore`), adjustment)
);
await expect('Admin cannot impersonate a restore author', false, () =>
  setDoc(doc(admin, `${path('conductAdjustments')}/restore-admin`), {
    ...adjustment,
    id: 'restore-admin',
    restoredBy: 'admin',
  })
);
await expect('Admin cannot archive a season', false, () =>
  setDoc(doc(admin, metadataPath()), metadata('eden-x8', 'archived'))
);
await expect('real rollover atomically archives X8 and publishes X9', true, async () => {
  await createSeasonDraft({ db: superadmin, firestore, uid: 'superadmin', workspaceId: 'eden-x9' });
  await publishSeason({
    db: superadmin,
    firestore,
    uid: 'superadmin',
    workspaceId: 'eden-x9',
    expectedActiveWorkspace: 'eden-x8',
  });
  assert.equal((await getDoc(doc(superadmin, metadataPath()))).data().lifecycle, 'archived');
  assert.equal(
    (await getDoc(doc(superadmin, 'vts_admin/public_season'))).data().workspaceId,
    'eden-x9'
  );
});
await expect('stale Admin upload cannot change an archived season', false, () =>
  setDoc(doc(admin, path('dashboardData')), dashboard(5))
);
await expect('Super Admin cannot mutate archived data', false, () =>
  setDoc(doc(superadmin, path('dashboardData')), dashboard(5))
);
await expect('archived projection cannot be republished', false, () => publish(3));
await expect('archiving is terminal', false, () =>
  setDoc(doc(superadmin, metadataPath()), metadata())
);
await expect('archived member votes cannot change', false, () =>
  setDoc(doc(member, `${path('votes')}/${voteId}`), vote())
);
await expect('legacy X2 archived uploads are also protected', false, () =>
  setDoc(doc(admin, path('dashboardData', 'eden-x2')), { ...dashboard(2), r5Season: 'season-2027' })
);

console.log(`${passed} Eden autonomy rule checks passed.`);
process.exit(0);
