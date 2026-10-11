import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import * as firestore from 'firebase/firestore';
import {
  loadThroneHistory,
  saveThroneWeek,
  THRONE_HISTORY_PATH,
} from '../../js/throne-buffs-cloud.js';
const projectId = 'demo-throne-admin';
const host = process.env.FIRESTORE_EMULATOR_HOST;
assert.match(host || '', /^(127\.0\.0\.1|localhost):\d+$/, 'emulator only');
const [hostname, port] = host.split(':');
const client = (uid, admin = false) => {
  const db = firestore.getFirestore(initializeApp({ projectId, apiKey: 'demo' }, uid));
  firestore.connectFirestoreEmulator(db, hostname, Number(port), {
    mockUserToken: { sub: uid, admin, superadmin: uid === 'superadmin' },
  });
  return db;
};
const db = client('ordinary-admin', true);
const member = client('member');
const record = {
  weekKey: '2026-W41',
  assignments: { emperor: 'محمد 王' },
  reasons: { emperor: 'Weekly rotation' },
};
const saved = await saveThroneWeek({ db, firestore, uid: 'ordinary-admin', record });
assert.equal(saved.syncRevision, 1);
assert.equal((await loadThroneHistory({ db, firestore }))[0].assignments.emperor, 'محمد 王');
await assert.rejects(() => saveThroneWeek({ db: member, firestore, uid: 'member', record }), {
  code: 'permission-denied',
});
await assert.rejects(() => loadThroneHistory({ db: member, firestore }), {
  code: 'permission-denied',
});
await assert.rejects(
  () => saveThroneWeek({ db, firestore, uid: 'ordinary-admin', record }),
  /Another Admin changed/
);
assert.equal(
  (await saveThroneWeek({ db, firestore, uid: 'ordinary-admin', record, expectedRevision: 1 }))
    .syncRevision,
  2
);
const ref = firestore.doc(db, THRONE_HISTORY_PATH, record.weekKey);
await assert.rejects(
  () =>
    firestore.setDoc(ref, {
      ...saved,
      syncRevision: 3,
      updatedAt: firestore.serverTimestamp(),
      assignments: { ...saved.assignments, extra: 'bad' },
    }),
  { code: 'permission-denied' }
);
await assert.rejects(() => firestore.deleteDoc(ref), { code: 'permission-denied' });
const scoreRef = firestore.doc(db, 'vts_admin/vts_score_settings');
const score = (revision) => ({
  dragonTierCutoff: 7000000,
  revision,
  updatedAtMs: Date.now(),
  updatedBy: 'ordinary-admin',
});
await firestore.setDoc(scoreRef, score(1));
assert.equal((await firestore.getDoc(scoreRef)).data().dragonTierCutoff, 7000000);
await firestore.setDoc(scoreRef, score(2));
await assert.rejects(() => firestore.setDoc(scoreRef, score(2)), { code: 'permission-denied' });
await assert.rejects(
  () => firestore.getDoc(firestore.doc(member, 'vts_admin/vts_score_settings')),
  { code: 'permission-denied' }
);
await assert.rejects(
  () =>
    firestore.setDoc(firestore.doc(member, 'vts_admin/vts_score_settings'), {
      ...score(3),
      updatedBy: 'member',
    }),
  { code: 'permission-denied' }
);
await assert.rejects(() => firestore.deleteDoc(scoreRef), { code: 'permission-denied' });
await firestore.setDoc(scoreRef, {
  ...score(3),
  growthWarningAbsolute: 1000000000000,
  growthWarningPercent: 1000000000,
});
await firestore.setDoc(scoreRef, {
  ...score(4),
  growthWarningAbsolute: 0,
  growthWarningPercent: 0,
});
for (const invalid of [
  { growthWarningAbsolute: -1 },
  { growthWarningAbsolute: 1000000000001 },
  { growthWarningAbsolute: '500' },
  { growthWarningPercent: -1 },
  { growthWarningPercent: 1000000001 },
  { growthWarningPercent: 1.5 },
]) {
  await assert.rejects(() => firestore.setDoc(scoreRef, { ...score(5), ...invalid }), {
    code: 'permission-denied',
  });
}
const { createSeasonDraft, publishSeason } = await import('../../js/admin-season-release.js');
const { edenWorkspaceFirestorePath } = await import('../../js/eden-workspaces.js');
const superdb = client('superadmin', true);
await createSeasonDraft({ db: superdb, firestore, uid: 'superadmin', workspaceId: 'eden-x8' });
const settingsRef = firestore.doc(superdb, edenWorkspaceFirestorePath('eden-x8', 'voteSettings'));
const settings = (await firestore.getDoc(settingsRef)).data();
await firestore.setDoc(settingsRef, {
  ...settings,
  showMemberVoteCounts: false,
  showManagementVoteCounts: false,
  updatedAt: firestore.serverTimestamp(),
});
await publishSeason({ db: superdb, firestore, uid: 'superadmin', workspaceId: 'eden-x8' });
const projection = (
  await firestore.getDoc(
    firestore.doc(superdb, edenWorkspaceFirestorePath('eden-x8', 'publicProjection'))
  )
).data();
assert.equal(projection.voteSettings.showMemberVoteCounts, false);
assert.equal(projection.voteSettings.showManagementVoteCounts, false);
await assert.rejects(
  () =>
    firestore.setDoc(settingsRef, {
      ...settings,
      showMemberVoteCounts: 'yes',
      updatedAt: firestore.serverTimestamp(),
    }),
  { code: 'permission-denied' }
);
await assert.rejects(
  () =>
    firestore.setDoc(firestore.doc(db, edenWorkspaceFirestorePath('eden-x8', 'voteSettings')), {
      ...settings,
      updatedBy: 'ordinary-admin',
      updatedAt: firestore.serverTimestamp(),
    }),
  { code: 'permission-denied' }
);
console.log('28 Throne, VTS settings and vote privacy emulator checks passed.');
process.exit(0);
