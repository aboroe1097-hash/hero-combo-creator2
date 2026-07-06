import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('public admin auth config only keeps destructive action override hashes', () => {
  const source = readFileSync('js/admin-auth-config.js', 'utf8');
  assert.match(source, /clearHash:\s*'(?:|[a-f0-9]{64})'/);
  assert.match(source, /deleteHashes:\s*(?:\[\s*\]|\[\s*'[a-f0-9]{64}'\s*\])/);
  assert.doesNotMatch(source, /adminHash/);
  assert.doesNotMatch(source, /12345/);
});

test('admin dashboard uses Firebase auth instead of local password markers', () => {
  const source = readFileSync('js/ocr-dashboard.js', 'utf8');
  const firebase = readFileSync('js/firebase.js', 'utf8');
  assert.match(source, /signInWithUsername/);
  assert.match(source, /isPasswordAuthUser/);
  assert.match(source, /adminIsAdmin/);
  assert.doesNotMatch(source, /localStorage\.getItem\(AUTH_KEY\)\s*===\s*AUTH_HASH/);
  assert.doesNotMatch(source, /localStorage\.setItem\(AUTH_KEY,\s*AUTH_HASH\)/);
  assert.doesNotMatch(source, /sessionStorage\.setItem\('vts_guest'/);
  assert.match(firebase, /signInWithEmailAndPassword/);
  assert.match(firebase, /usernameToEmail/);
  assert.match(firebase, /isPasswordAuthUser/);
});

test('firebase config reads public web config without committed Google API keys', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  assert.match(source, /VITE_FIREBASE_API_KEY/);
  assert.match(source, /import\.meta\.env/);
  assert.match(source, /VTS_FIREBASE_CONFIG/);
  assert.doesNotMatch(source, /FALLBACK_CONFIG/);
  assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/);
});

test('firebase app check is lazy so comments do not trigger recaptcha throttling', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  const initStart = source.indexOf('export function initFirebase()');
  const authStart = source.indexOf('let authInFlight', initStart);
  assert.notEqual(initStart, -1);
  assert.notEqual(authStart, -1);
  const initBody = source.slice(initStart, authStart);
  assert.doesNotMatch(initBody, /initializeAppCheck|ReCaptchaEnterpriseProvider|getToken/);
  assert.match(source, /async function ensureFirebaseAppCheck\(\)/);
  assert.match(source, /export async function getFirebaseAppCheckToken/);
});

test('firebase init preserves configured status after first initialization', () => {
  const source = readFileSync('js/firebase.js', 'utf8');

  assert.match(source, /if \(app\) return \{ app, db, auth, analytics, configured: true \};/);
});

test('firebase app check token requests retry transient recaptcha failures', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  assert.match(source, /function shouldRetryAppCheckTokenError/);
  assert.match(source, /attempt < maxAttempts/);
  assert.match(source, /getToken\(currentAppCheck, forceRefresh \|\| attempt > 0\)/);
  assert.match(source, /unhandledrejection/);
  assert.match(source, /reCAPTCHA timed out/);
});

test('anonymous auth waits for persisted admin sessions before sign-in', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  const ensureStart = source.indexOf('export async function ensureAnonymousAuth()');
  const ensureEnd = source.indexOf('async function ensureFirebaseAppCheck()', ensureStart);
  assert.notEqual(ensureStart, -1);
  assert.notEqual(ensureEnd, -1);
  const ensureSource = source.slice(ensureStart, ensureEnd);

  assert.match(source, /export async function waitForAuthReady\(\)/);
  assert.match(source, /auth\.authStateReady/);
  assert.match(ensureSource, /waitForAuthReady\(\)/);
  assert.match(ensureSource, /signInAnonymously\(auth\)/);
  assert.ok(
    ensureSource.indexOf('waitForAuthReady()') < ensureSource.indexOf('signInAnonymously(auth)')
  );
});

test('admin dashboard cloud saves are coalesced before Firestore writes', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const engine = readFileSync('js/ocr-engine.js', 'utf8');
  assert.match(dashboard, /DASHBOARD_CLOUD_SAVE_DEBOUNCE_MS/);
  assert.match(dashboard, /function scheduleDashboardCloudSave/);
  assert.match(dashboard, /dashboardCloudSaveInFlight/);
  assert.match(dashboard, /dashboardCloudSavePendingData/);
  assert.match(dashboard, /if \(options\.cloud === false\) return false;/);
  assert.match(engine, /saveParsedData\(progressiveParsed, \{ cloud: false \}\)/);
  assert.match(engine, /saveParsedData\(parsed, \{ immediate: true, awaitCloud: true \}\)/);
});

test('admin auxiliary records are included in dashboard cloud sync', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const roster = readFileSync('js/ocr-roster.js', 'utf8');
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(dashboard, /function attachAuxiliaryRecords/);
  assert.match(dashboard, /function getAuxiliaryRecordPayload/);
  assert.match(dashboard, /function pruneDashboardCloudData/);
  assert.match(dashboard, /const DASHBOARD_CLOUD_FIELD_KEYS = new Set/);
  assert.match(dashboard, /function writeAuxiliaryPayloadToCloud/);
  assert.match(dashboard, /setDoc\(doc\(db, FS_PATH\), auxiliaryPayload, \{ merge: true \}\)/);
  assert.match(dashboard, /setDoc\(doc\(db, FS_PATH\), repairPayload\)/);
  assert.match(dashboard, /bannerRecords/);
  assert.match(dashboard, /dutyRecords/);
  assert.match(dashboard, /contributionRecords/);
  assert.match(dashboard, /playerRegistry/);
  assert.match(dashboard, /PLAYER_REGISTRY_KEY/);
  assert.match(roster, /syncDashboardAuxiliaryRecordsToCloud/);
  assert.match(roster, /export async function savePlayerRegistry/);
  assert.match(roster, /await saveDutyRecords\(\{ immediate: true, awaitCloud: true \}\)/);
  assert.match(roster, /notifySpecialListCloudResult/);
  assert.match(rules, /'bannerRecords', 'dutyRecords', 'contributionRecords'/);
  assert.match(rules, /'playerRegistry'/);
  assert.match(rules, /request\.resource\.data\.playerRegistry is map/);
});

test('admin cloud boot and saves have bounded local-cache fallback', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  assert.match(dashboard, /DASHBOARD_CLOUD_BOOT_TIMEOUT_MS/);
  assert.match(dashboard, /DASHBOARD_CLOUD_WRITE_TIMEOUT_MS/);
  assert.match(dashboard, /function isRecoverableDashboardCloudError/);
  assert.match(dashboard, /function isFirestoreInternalWatchAssertion/);
  assert.match(dashboard, /installDashboardFirestoreErrorGuard\(\)/);
  assert.match(dashboard, /window\.addEventListener\('unhandledrejection'/);
  assert.match(dashboard, /state\._fsRosterUnsub = null/);
  assert.match(dashboard, /function runDashboardCloudTaskWithTimeout/);
  assert.match(
    dashboard,
    /runDashboardCloudTaskWithTimeout\('Roster cloud load', loadRosterSnapshotsFromFirestore\)/
  );
  assert.match(
    dashboard,
    /runDashboardCloudTaskWithTimeout\(\s*'Bonus team effort points cloud load',\s*loadConductAdjustmentsForSeason/
  );
  assert.match(dashboard, /withDashboardCloudTimeout\(\s*cloudSave/);
  assert.match(dashboard, /withDashboardCloudTimeout\(promise, DASHBOARD_CLOUD_WRITE_TIMEOUT_MS/);
});

test('shared admin dashboard reads stay available while writes require a password admin login', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  assert.match(rules, /function isAdminLogin\(\)/);
  // Writes are gated on a real email/password sign-in, not a per-account claim.
  assert.match(rules, /sign_in_provider == 'password'/);
  assert.match(dashboard, /isPasswordAuthUser/);
  assert.match(
    rules,
    /match \/vts_admin\/dashboard_data\s*\{[\s\S]*allow read: if signedIn\(\);[\s\S]*allow create, update: if isAdminLogin\(\) && validDashboardData\(\);/
  );
  assert.match(
    rules,
    /match \/vts_admin\/roster_data\s*\{[\s\S]*allow read: if signedIn\(\);[\s\S]*allow create, update: if isAdminLogin\(\) && validRosterData\(\);/
  );
  assert.doesNotMatch(rules, /allow create, update: if signedIn\(\) && validDashboardData\(\);/);
  assert.doesNotMatch(rules, /allow create, update: if signedIn\(\) && validRosterData\(\);/);
});

test('admin gate uses a password sign-in check and sign-out cannot auto re-login', () => {
  const firebase = readFileSync('js/firebase.js', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const adjustments = readFileSync('js/ocr-adjustments.js', 'utf8');

  // The password-sign-in helper exists and inspects the password provider.
  assert.match(firebase, /export async function isPasswordAuthUser/);
  assert.match(firebase, /providerId === 'password'|signInProvider === 'password'/);
  // Both the dashboard gates and the conduct-write context use it.
  assert.match(dashboard, /isPasswordAuthUser/);
  assert.match(adjustments, /isPasswordAuthUser/);
  // Auth-state changes must validate a candidate before replacing the stored
  // admin session; anonymous/public auth events can arrive while the admin UI
  // is still open and should not poison later conduct writes.
  assert.match(dashboard, /const candidateIsAdmin = await isPasswordAuthUser\(user\)/);
  assert.doesNotMatch(
    dashboard,
    /state\.adminUser = user;\s*state\.adminIsAdmin = await isPasswordAuthUser\(user\);/
  );
  assert.match(
    dashboard,
    /if \(await isPasswordAuthUser\(state\.adminUser, options\)\) return state\.adminUser;/
  );
  // Explicit sign-out sets a guard so the auth-state listener cannot restore
  // the session or reopen the dashboard (the auto re-login bug).
  assert.match(dashboard, /state\._signingOut = true/);
  assert.match(dashboard, /if \(state\._signingOut\)/);
});

test('R5 conduct adjustments are stored separately and use the admin claim', () => {
  const rules = readFileSync('firestore.rules', 'utf8');

  assert.match(rules, /function validConductAdjustment\(\)/);
  assert.match(rules, /match \/vts_admin\/conduct_adjustments\/records\/\{adjustmentId\}/);
  assert.match(rules, /allow read: if signedIn\(\);/);
  assert.match(rules, /allow create: if isAdminLogin\(\)[\s\S]*validConductAdjustment\(\)/);
  assert.match(rules, /allow update: if isAdminLogin\(\)[\s\S]*validConductAdjustment\(\)/);
  assert.match(rules, /request\.resource\.data\.createdBy == request\.auth\.uid/);
});

test('service worker precaches only the lightweight app shell', () => {
  const source = readFileSync('public/sw.js', 'utf8');
  const urls = [...source.matchAll(/ {2}'([^']+)'/g)].map((match) => match[1]);

  assert.ok(urls.length <= 25, `expected lean app shell, found ${urls.length} URLs`);
  assert.ok(urls.includes('/index.html'));
  assert.ok(urls.includes('/js/app.js'));
  assert.ok(urls.includes('/images/logo.png'));
  assert.ok(!urls.includes('/admin.html'));
  assert.ok(!urls.includes('/js/ocr-dashboard.js'));
  assert.ok(!urls.includes('/js/tech-db.js'));
  assert.ok(!urls.includes('/images/strife/roc-strife-reference.png'));
});

test('qwen worker rejects requests without an Origin header', () => {
  const source = readFileSync('workers/qwen-cors-proxy.js', 'utf8');
  assert.match(source, /if\s*\(!origin\)\s*return false;/);
  assert.doesNotMatch(source, /if\s*\(!origin\)\s*return true;/);
});

test('eden dataset payload is copied into the production build', () => {
  const source = readFileSync('scripts/post-build.mjs', 'utf8');
  assert.match(source, /js\/eden-datasets\.payload\.json/);
});

test('comments no longer store email or allow public reads', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const comments = readFileSync('js/comments.js', 'utf8');
  assert.doesNotMatch(rules, /'email'/);
  assert.match(rules, /function canReadComment\(\)/);
  assert.match(rules, /resource\.data\.approved == true/);
  assert.match(rules, /resource\.data\.public == true/);
  assert.match(rules, /resource\.data\.authorId == request\.auth\.uid/);
  assert.match(rules, /allow read: if canReadComment\(\);/);
  assert.match(rules, /approved == false/);
  assert.doesNotMatch(comments, /email:/);
  assert.doesNotMatch(comments, /commentEmail/);
  assert.match(comments, /where\('approved', '==', true\)/);
  assert.match(comments, /where\('public', '==', true\)/);
  assert.match(comments, /where\('authorId', '==', currentUserId\)/);
  assert.match(comments, /where\('approved', '==', false\)/);
  assert.doesNotMatch(
    comments,
    /query\(collection\(db, 'comments'\), orderBy\('createdAt', 'desc'\)\)/
  );
});

test('client error reports are bounded and not publicly readable', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const reporting = readFileSync('js/app-error-reporting.js', 'utf8');

  assert.match(rules, /function validClientError\(\)/);
  assert.match(rules, /match \/errors\/\{errorId\}/);
  assert.match(rules, /allow create: if signedIn\(\) && validClientError\(\);/);
  assert.match(rules, /match \/errors\/\{errorId\}\s*\{\s*allow read, delete: if isAdmin\(\);/);
  assert.match(rules, /request\.resource\.data\.authorId == request\.auth\.uid/);
  assert.match(reporting, /authorId:\s*user\.uid/);
  assert.match(reporting, /remoteReportingDisabled = true/);
});
