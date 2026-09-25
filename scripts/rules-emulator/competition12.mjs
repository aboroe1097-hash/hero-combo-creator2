// Behaviour check for the Competition #12 rules against the Firestore emulator.
// Run: npx firebase emulators:exec --only firestore --project demo-comp12 \
//   "node scripts/rules-emulator/competition12.mjs"
// The member sign-up request runs within ~4-7 expressions of Firestore's
// 1000-expression limit; re-run this after any change to the submission rules.
import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { buildBohSignupDocument } from '../../js/boh-signup-document.js';

const PROJECT = 'demo-comp12';
const BASE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const SEASON = 'season-2027';
const H = 60 * 60 * 1000;
let n = 0;
function client(claims) {
  const app = initializeApp({ projectId: PROJECT, apiKey: 'x' }, `c${n++}`);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080, { mockUserToken: claims });
  return db;
}
function val(v) {
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  return { stringValue: String(v) };
}
async function seed(path, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, val(v)]));
  const res = await fetch(`${BASE}/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' }, body: JSON.stringify({ fields }) });
  if (!res.ok) throw new Error(`seed ${path}: ${res.status} ${await res.text()}`);
}
async function wipe() {
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
}
function schedule(offsetsH) {
  const now = Date.now();
  const keys = ['opensAt','phase1ClosesAt','deadlineAt','reuploadOpensAt','reuploadClosesAt','winnersStartAt','winnersEndAt'];
  return Object.fromEntries(keys.map((k, i) => [k, new Date(now + offsetsH[i] * H)]));
}
async function seedBase(offsets, flags = { open: true, acceptNewSignups: true }) {
  await seed('boh_allstar_config/current', { activeSeason: SEASON, grantDurationMinutes: 720, scoringProfileId: 'all-star-boh-2027-v1', ...flags });
  for (const uid of ['m1', 'm2']) {
    await seed(`boh_allstar_member_grants/${uid}`, { schemaVersion: 1, uid, seasonId: SEASON, issuedAt: new Date(Date.now() - H), expiresAt: new Date(Date.now() + 5 * H) });
  }
  if (offsets) await seed('boh_allstar_competition/current', { seasonId: SEASON, title: 'Competition #12', ...schedule(offsets), updatedAt: new Date(), updatedBy: 'seed' });
}
const values = (extra = {}) => ({
  gameName: 'MalakAbo',
  stats: { totalCastlePower: 1_112_473_195, troopPower: 999_076_138, buildingPower: 6_477_467, technologyPower: 38_902_234, heroCombatPower: 30_585_714, dragonPower: 16_306_050, unitSpecialtyPower: 21_125_570, t9TroopTypes: ['Spearman'], readySpeedHeroes: [], level50HeroCount: 12, rocLevel: 55 },
  commitment: { availability: 'all', preferredRole: 'offensive', bohTimeSlots: ['+20', '+8'], epicTimeSlots: ['+10'], publicComparisonConsent: true, vts1097Member: true, ...extra },
});
function signupDoc(uid, createdAt, revision = 1, v = values()) {
  const d = buildBohSignupDocument({ uid, seasonId: SEASON, values: v, createdAt, updatedAt: serverTimestamp() });
  d.revision = revision;
  return d;
}
const results = [];
async function expectOk(label, fn) { try { await fn(); results.push(`PASS allow  ${label}`); } catch (e) { results.push(`FAIL allow  ${label}: ${e.code} ${String(e.message).slice(0, 600)}`); } }
async function expectDenied(label, fn) { try { await fn(); results.push(`FAIL deny   ${label}: was allowed`); } catch (e) { results.push(e.code === 'permission-denied' ? `PASS deny   ${label}` : `FAIL deny   ${label}: ${e.code || e.message}`); } }

const m1 = client({ sub: 'm1', firebase: { sign_in_provider: 'anonymous' } });
const m2 = client({ sub: 'm2', firebase: { sign_in_provider: 'anonymous' } });
const anon = client({ sub: 'anon1', firebase: { sign_in_provider: 'anonymous' } });
const admin = client({ sub: 'adm', admin: true, firebase: { sign_in_provider: 'password' } });
const superadmin = client({ sub: 'sup', admin: true, superadmin: true, firebase: { sign_in_provider: 'password' } });
const subPath = (uid) => `boh_allstar/${SEASON}/submissions/${uid}`;

// Registration phase (the sync Function sets open + acceptNewSignups)
await wipe(); await seedBase([-1, 24, 48, 72, 96, 120, 144]);
await expectOk('member registers with slots during registration', () => setDoc(doc(m1, subPath('m1')), signupDoc('m1', serverTimestamp())));
await expectDenied('an unknown commitment key is rejected', () => { const d = signupDoc('m2', serverTimestamp()); d.commitment.favouriteColour = 'red'; return setDoc(doc(m2, subPath('m2')), d); });
await expectOk('anonymous visitor reads the schedule', () => getDoc(doc(anon, 'boh_allstar_competition/current')));
// Final check: no new sign-ups, edits allowed
const stored = (await getDoc(doc(m1, subPath('m1')))).data();
await seedBase([-48, -1, 24, 48, 72, 96, 120], { open: true, acceptNewSignups: false });
await expectDenied('new sign-up after phase 1 closes', () => setDoc(doc(m2, subPath('m2')), signupDoc('m2', serverTimestamp())));
await expectOk('existing member edits during final check', () => setDoc(doc(m1, subPath('m1')), signupDoc('m1', stored.createdAt, 2)));
// After the deadline: registration closed
await seedBase([-72, -48, -1, 24, 48, 72, 96], { open: false, acceptNewSignups: false });
await expectDenied('edit after the deadline', () => setDoc(doc(m1, subPath('m1')), signupDoc('m1', stored.createdAt, 3)));
// Schedule writes
const good = { seasonId: SEASON, title: 'Competition #12', ...Object.fromEntries(Object.entries(schedule([1, 2, 3, 4, 5, 6, 7])).map(([k, v]) => [k, Timestamp.fromDate(v)])) };
await expectDenied('plain admin cannot set the schedule', () => setDoc(doc(admin, 'boh_allstar_competition/current'), { ...good, updatedAt: serverTimestamp(), updatedBy: 'adm' }));
await expectOk('superadmin sets a valid schedule', () => setDoc(doc(superadmin, 'boh_allstar_competition/current'), { ...good, updatedAt: serverTimestamp(), updatedBy: 'sup' }));
await expectDenied('out-of-order schedule is rejected', () => setDoc(doc(superadmin, 'boh_allstar_competition/current'), { ...good, deadlineAt: good.opensAt, updatedAt: serverTimestamp(), updatedBy: 'sup' }));
await expectDenied('member cannot set the schedule', () => setDoc(doc(m1, 'boh_allstar_competition/current'), { ...good, updatedAt: serverTimestamp(), updatedBy: 'm1' }));
// Growth board (published by a superadmin) and the private baseline matches
const board = { schemaVersion: 1, seasonId: SEASON, rows: [{ rank: 1, gameName: 'MalakAbo', baselineSource: 'signup', growthPct: 12.5, growthAbs: 1000, fields: {} }], winners: [{ rank: 1, gameName: 'MalakAbo', growthPct: 12.5, growthAbs: 1000 }], notRanked: 0, publishedAt: new Date().toISOString() };
await expectOk('superadmin publishes a valid growth board', () => setDoc(doc(superadmin, 'boh_allstar_competition/board'), { ...board, updatedAt: serverTimestamp(), updatedBy: 'sup' }));
await expectOk('anonymous visitor reads the growth board', () => getDoc(doc(anon, 'boh_allstar_competition/board')));
await expectDenied('plain admin cannot publish the growth board', () => setDoc(doc(admin, 'boh_allstar_competition/board'), { ...board, updatedAt: serverTimestamp(), updatedBy: 'adm' }));
await expectDenied('growth board with an extra key is rejected', () => setDoc(doc(superadmin, 'boh_allstar_competition/board'), { ...board, raw: 1, updatedAt: serverTimestamp(), updatedBy: 'sup' }));
await expectOk('superadmin saves baseline match decisions', () => setDoc(doc(superadmin, 'boh_allstar_competition/matches'), { schemaVersion: 1, seasonId: SEASON, decisions: { m1: { decision: 'signup', matchedSubmissionUid: '' } }, updatedAt: serverTimestamp(), updatedBy: 'sup' }));
await expectOk('admin reads baseline match decisions', () => getDoc(doc(admin, 'boh_allstar_competition/matches')));
await expectDenied('anonymous visitor cannot read baseline match decisions', () => getDoc(doc(anon, 'boh_allstar_competition/matches')));
// No schedule: the 2026 shape still works under the open switch alone
await wipe(); await seedBase(null);
const legacy = { ...values(), commitment: { availability: 'all', preferredRole: 'offensive', fightingTimeIds: ['+12', '+14'], vts1097Member: true } };
await expectOk('2026-shape sign-up without a schedule', () => setDoc(doc(m1, subPath('m1')), (() => { const d = buildBohSignupDocument({ uid: 'm1', seasonId: SEASON, values: legacy, requireCompetitionSlots: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return d; })()));
// Shared Eden Operations counters: admins write bounded increments and any
// signed-in member (including an anonymous session) can read the alliance totals.
await wipe();
const operationsPath = 'eden_operations/current';
const counterUpdate = (counts, updatedBy) => ({
  counts,
  updatedAt: serverTimestamp(),
  updatedBy,
});
await expectOk('first admin increment creates the shared counter document', () =>
  setDoc(
    doc(admin, operationsPath),
    counterUpdate({ 'gate-1': { attackers: increment(1) } }, 'adm'),
    { merge: true }
  )
);
await expectOk('anonymous visitor reads the shared counters', () =>
  getDoc(doc(anon, operationsPath))
);
await expectDenied('member cannot change shared counters', () =>
  setDoc(
    doc(m1, operationsPath),
    counterUpdate({ 'gate-1': { attackers: increment(1) } }, 'm1'),
    { merge: true }
  )
);
await expectDenied('unknown objective is rejected', () =>
  setDoc(
    doc(admin, operationsPath),
    counterUpdate({ 'gate-99': { attackers: increment(1) } }, 'adm'),
    { merge: true }
  )
);
await expectDenied('counter above 500 is rejected', () =>
  setDoc(
    doc(admin, operationsPath),
    counterUpdate({ 'gate-1': { attackers: 501 } }, 'adm'),
    { merge: true }
  )
);
await expectDenied('unknown counter fields are rejected', () =>
  setDoc(
    doc(admin, operationsPath),
    counterUpdate({ 'gate-1': { attackers: 1, visitors: 1 } }, 'adm'),
    { merge: true }
  )
);
await expectOk('concurrent admin increments are applied atomically', () =>
  Promise.all([
    setDoc(
      doc(admin, operationsPath),
      counterUpdate({ 'gate-1': { attackers: increment(1) } }, 'adm'),
      { merge: true }
    ),
    setDoc(
      doc(superadmin, operationsPath),
      counterUpdate({ 'gate-1': { attackers: increment(1) } }, 'sup'),
      { merge: true }
    ),
  ])
);
await expectOk('an objective update preserves other counters', () =>
  setDoc(
    doc(admin, operationsPath),
    counterUpdate({ 'city-1': { support: increment(1) } }, 'adm'),
    { merge: true }
  )
);
const operationsCounts = (await getDoc(doc(admin, operationsPath))).data().counts;
if (
  operationsCounts['gate-1']?.attackers !== 3 ||
  operationsCounts['city-1']?.support !== 1
) {
  results.push('FAIL shared increments: concurrent or partial updates lost a counter');
} else {
  results.push('PASS shared increments preserve concurrent and unrelated counters');
}
console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
