// Behaviour check for the live Combos ranking rules (combos_plan/current) against
// the Firestore emulator. Run:
//   npx firebase emulators:exec --only firestore --project demo-combos \
//     "node scripts/rules-emulator/combos-plan.mjs"
// Exits non-zero when any case does not behave as expected.
import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { shippedRankedCombos } from '../../js/combos-db.js';
import { buildCombosPlanDoc } from '../../js/combos-live.js';

const PROJECT = process.env.GCLOUD_PROJECT || 'demo-combos';
const PATH = 'combos_plan/current';
let n = 0;
function client(claims) {
  const app = initializeApp({ projectId: PROJECT, apiKey: 'x' }, `c${n++}`);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080, claims ? { mockUserToken: claims } : undefined);
  return db;
}
const anonymous = client({ sub: 'visitor', firebase: { sign_in_provider: 'anonymous' } });
const admin = client({ sub: 'admin1', admin: true });
const superadmin = client({ sub: 'boss', admin: true, superadmin: true });
const signedOut = client(null);

const entries = shippedRankedCombos.map((c) => ({ ...c, heroes: [...c.heroes] })).reverse();
const body = (over = {}, uid = 'boss') => ({
  ...buildCombosPlanDoc(entries),
  updatedAt: serverTimestamp(),
  updatedBy: uid,
  ...over,
});

let failures = 0;
async function expectCase(name, allowed, action) {
  let ok = true;
  let detail = '';
  try {
    await action();
  } catch (error) {
    ok = false;
    detail = error.code || error.message;
  }
  const pass = ok === allowed;
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${ok ? 'allowed' : 'denied'}${detail ? ` (${detail})` : ''}`);
}

await expectCase('admin cannot publish', false, () => setDoc(doc(admin, PATH), body({}, 'admin1')));
await expectCase('superadmin publishes', true, () => setDoc(doc(superadmin, PATH), body()));
await expectCase('anonymous visitor reads', true, async () => {
  const snap = await getDoc(doc(anonymous, PATH));
  if (!snap.exists() || snap.data().count !== entries.length) throw new Error('unexpected document');
});
await expectCase('signed-out visitor reads', true, async () => {
  const snap = await getDoc(doc(signedOut, PATH));
  if (!snap.exists() || snap.data().count !== entries.length) throw new Error('unexpected document');
});
await expectCase('extra key refused', false, () => setDoc(doc(superadmin, PATH), body({ rank: 1 })));
await expectCase('count mismatch refused', false, () =>
  setDoc(doc(superadmin, PATH), body({ count: 3 }))
);
await expectCase('bad first entry refused', false, () =>
  setDoc(
    doc(superadmin, PATH),
    body({ entries: [{ heroes: ['A', 'B'], skin: '999' }, ...entries.slice(1)] })
  )
);
await expectCase('client timestamp refused', false, () =>
  setDoc(doc(superadmin, PATH), body({ updatedAt: new Date() }))
);
await expectCase('someone else as updatedBy refused', false, () =>
  setDoc(doc(superadmin, PATH), body({}, 'someone-else'))
);
await expectCase('over 600 entries refused', false, () => {
  const many = Array.from({ length: 601 }, (_, i) => ({ heroes: [`A${i}`, 'B', 'C'] }));
  return setDoc(doc(superadmin, PATH), body({ entries: many, count: many.length }));
});
await expectCase('useShipped with no entries', true, () =>
  setDoc(doc(superadmin, PATH), {
    ...buildCombosPlanDoc([], { useShipped: true }),
    updatedAt: serverTimestamp(),
    updatedBy: 'boss',
  })
);
await expectCase('empty list without useShipped refused', false, () =>
  setDoc(doc(superadmin, PATH), body({ entries: [], count: 0 }))
);
await expectCase('delete refused', false, () => deleteDoc(doc(superadmin, PATH)));
await expectCase('list refused', false, async () => {
  const { collection, getDocs } = await import('firebase/firestore');
  await getDocs(collection(anonymous, 'combos_plan'));
});

console.log(failures ? `${failures} case(s) failed` : 'All combos_plan cases behave as expected.');
process.exit(failures ? 1 : 0);
