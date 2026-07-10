import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('public admin auth config only keeps destructive action override hashes', () => {
  const source = readFileSync('js/admin-auth-config.js', 'utf8');
  assert.match(source, /clearHash:\s*''/);
  assert.match(source, /deleteHashes:\s*\[\s*\]/);
  assert.match(source, /adminPin:\s*''/);
  const edenVotesPinHash = source.match(/edenVotesPinHash:\s*'([^']*)'/)?.[1];
  assert.notEqual(edenVotesPinHash, undefined);
  if (process.env.VTS_EDEN_VOTES_PIN || process.env.VTS_EDEN_VOTES_PIN_HASH) {
    assert.match(edenVotesPinHash, /^(?:|[a-f0-9]{64})$/);
  } else {
    assert.equal(edenVotesPinHash, '');
  }
  assert.doesNotMatch(source, /adminHash/);
  assert.doesNotMatch(source, /12345/);
  assert.doesNotMatch(source, /232323/);
  assert.doesNotMatch(source, /5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5/);
});

test('Eden votes PIN gate has no committed fallback secret', () => {
  const source = readFileSync('js/admin-pin-gate.js', 'utf8');
  assert.match(source, /window\.VTS_ADMIN_AUTH\?\.edenVotesPinHash/);
  assert.match(source, /window\.VTS_ADMIN_AUTH\?\.adminPin \|\| ''/);
  assert.match(source, /if \(!hasConfiguredPinGate\(\)\) return false;/);
  assert.doesNotMatch(source, /if \(!hasConfiguredPinGate\(\)\) return Promise\.resolve\(true\);/);
  assert.match(source, /Owner PIN not configured/);
  assert.match(source, /subtle\.digest\('SHA-256'/);
  assert.doesNotMatch(source, /232323/);
});

test('admin boot does not preload gated Eden vote records', () => {
  const source = readFileSync('js/ocr-dashboard.js', 'utf8');
  const bootBlock = source.match(
    /async function openAdminDashboardAfterAuth[\s\S]*?\/\/ --- Persistence ---/
  )?.[0];
  assert.ok(bootBlock, 'openAdminDashboardAfterAuth block should be present');
  assert.doesNotMatch(bootBlock, /loadEdenX1VoteAdminData/);
});

test('deploy can inject sensitive admin PIN hash without committing raw PIN', () => {
  const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
  const script = readFileSync('scripts/inject-admin-auth-config.mjs', 'utf8');
  assert.match(workflow, /VTS_EDEN_VOTES_PIN:/);
  assert.match(workflow, /VTS_EDEN_VOTES_PIN_HASH:/);
  assert.match(workflow, /node scripts\/inject-admin-auth-config\.mjs/);
  assert.match(script, /createHash\('sha256'\)/);
  assert.match(script, /edenVotesPinHash:\s*'\$\{nextHash\}'/);
  assert.doesNotMatch(script, /232323/);
});

test('frontend CSP and markup avoid executable inline script bypasses', () => {
  const pages = ['index.html', 'admin.html', 'eden-x1.html'];
  const inlineExecutableScript =
    /<script(?![^>]*\bsrc=)(?![^>]*type="(?:application\/ld\+json|importmap)")/i;

  for (const page of pages) {
    const source = readFileSync(page, 'utf8');
    assert.doesNotMatch(source, /\son(?:click|load)\s*=/i, `${page} should not use inline handlers`);
    assert.doesNotMatch(source, inlineExecutableScript, `${page} should not use executable inline scripts`);
  }

  for (const page of ['index.html', 'admin.html', 'eden-x1.html']) {
    const source = readFileSync(page, 'utf8');
    const csp = source.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1] || '';
    const scriptSrc = csp.match(/script-src\s+([^;]+)/)?.[1] || '';
    assert.ok(scriptSrc, `${page} should define script-src`);
    assert.doesNotMatch(scriptSrc, /'unsafe-inline'/);
    if (page === 'eden-x1.html') assert.match(scriptSrc, /https:\/\/docs\.google\.com/);
  }

  const index = readFileSync('index.html', 'utf8');
  assert.match(index, /js\/theme-prepaint\.js/);
  assert.match(index, /js\/index-page-enhancements\.js/);
  assert.match(index, /data-footer-tab="manual"/);
});

test('build metadata refreshes lazy app module cache busters', () => {
  const script = readFileSync('scripts/update-build-metadata.mjs', 'utf8');
  const app = readFileSync('js/app.js', 'utf8');
  assert.match(script, /app-whats-new\|app-research\|material-calculator\|eden-map\|app-strife/);
  assert.doesNotMatch(app, /20260708_101500/);
  assert.match(app, /app-whats-new\.js\?v=\d{8}_\d{6}/);
  assert.match(app, /app-research\.js\?v=\d{8}_\d{6}/);
  assert.match(app, /material-calculator\.js\?v=\d{8}_\d{6}/);
  assert.match(app, /eden-map\.js\?v=\d{8}_\d{6}/);
  assert.match(app, /app-strife\.js\?v=\d{8}_\d{6}/);
});

test('theme manifests include dark and light install colors', () => {
  const darkManifest = JSON.parse(readFileSync('site.webmanifest', 'utf8'));
  const lightManifest = JSON.parse(readFileSync('site-light.webmanifest', 'utf8'));
  assert.equal(darkManifest.theme_color, '#0f172a');
  assert.equal(darkManifest.background_color, '#0f172a');
  assert.equal(lightManifest.theme_color, '#f8fafc');
  assert.equal(lightManifest.background_color, '#f8fafc');
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
  const source = readFileSync('js/firebase-config.js', 'utf8');
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
  assert.match(dashboard, /const payload = withDashboardTimestamp\(auxiliaryPayload\);/);
  assert.match(dashboard, /runTransaction\(db, async \(transaction\)/);
  assert.match(dashboard, /transaction\.set\(ref, nextPayload, \{ merge: true \}\)/);
  assert.match(dashboard, /writeDashboardSnapshotToCloud\(/);
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
  assert.match(dashboard, /DASHBOARD_CLOUD_RETRY_FLUSH_DELAY_MS/);
  assert.match(
    dashboard,
    /return Number\.isFinite\(override\) && override > 0 \? override : 20000;/
  );
  assert.match(dashboard, /function isRecoverableDashboardCloudError/);
  assert.match(dashboard, /function isFirestoreInternalWatchAssertion/);
  assert.match(dashboard, /installDashboardFirestoreErrorGuard\(\)/);
  assert.match(dashboard, /window\.addEventListener\('unhandledrejection'/);
  assert.match(dashboard, /state\._fsRosterUnsub = null/);
  assert.match(dashboard, /function runDashboardCloudTaskWithTimeout/);
  assert.match(dashboard, /function scheduleDashboardCloudRetryFlush/);
  assert.match(
    dashboard,
    /if \(shouldAutoFlushDashboardCloudRetry\(reason\)\) scheduleDashboardCloudRetryFlush\(\);/
  );
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

test('shared admin dashboard reads stay available while writes require the admin custom claim', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  // Writes are gated on the `admin` custom claim, not the sign-in provider,
  // because the public web API key lets anyone self-register a password account.
  assert.match(rules, /function isAdmin\(\)/);
  assert.doesNotMatch(rules, /sign_in_provider == 'password'/);
  assert.match(dashboard, /isAdminAuthUser/);
  assert.match(
    rules,
    /match \/vts_admin\/dashboard_data\s*\{[\s\S]*allow read: if signedIn\(\);[\s\S]*allow create: if isAdmin\(\)[\s\S]*request\.resource\.data\.syncRevision == 1;[\s\S]*allow update: if isAdmin\(\)[\s\S]*validDashboardData\(\)[\s\S]*request\.resource\.data\.syncRevision == resource\.data\.syncRevision \+ 1[\s\S]*request\.resource\.data\.updatedAtMs >= resource\.data\.updatedAtMs/
  );
  assert.match(
    rules,
    /match \/vts_admin\/roster_data\s*\{[\s\S]*allow read: if signedIn\(\);[\s\S]*allow create, update: if isAdmin\(\) && validRosterData\(\);/
  );
  assert.doesNotMatch(rules, /allow create, update: if signedIn\(\) && validDashboardData\(\);/);
  assert.doesNotMatch(rules, /allow create, update: if signedIn\(\) && validRosterData\(\);/);
});

test('dashboard cloud revisions prevent stale local snapshots from overwriting cloud data', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const dashboardValidator = rules.match(/function validDashboardData\(\) \{([\s\S]*?)\n[ ]{4}\}/)?.[1] || '';

  assert.match(dashboard, /DASHBOARD_CLOUD_FIELD_KEYS = new Set\(\[\s*'updatedAtMs'/);
  assert.match(dashboard, /'syncRevision'/);
  assert.match(dashboard, /persistedData\.updatedAtMs = Date\.now\(\);/);
  assert.match(dashboard, /const seedPayload = withDashboardTimestamp\(/);
  assert.match(dashboard, /const clearedPayload = \{\s*updatedAtMs: Date\.now\(\),/);
  assert.match(dashboard, /function writeDashboardSnapshotToCloud/);
  assert.match(dashboard, /transaction\.get\(ref\)/);
  assert.match(dashboard, /syncRevision: cloudRevision \+ 1/);
  assert.match(dashboard, /dashboardCloudSavePendingBaseRevision/);
  assert.match(
    dashboard,
    /dashboardCloudSavePendingBaseRevision = result \? dashboardCloudBaseRevision : null/
  );
  assert.match(dashboard, /dashboardCloudSavePendingBaseRevision = dashboardCloudSaveInFlight/);
  assert.doesNotMatch(dashboard, /dashboardCloudSaveInFlightTargetRevision/);
  assert.match(dashboard, /function preserveLocalDashboardConflict/);
  assert.doesNotMatch(dashboard, /adminLocalNewerRestorePrompt/);
  assert.doesNotMatch(dashboard, /Ignored an older dashboard snapshot returned by cloud sync/);
  assert.match(dashboardValidator, /'updatedAtMs'/);
  assert.match(dashboardValidator, /'syncRevision'/);
  assert.match(dashboardValidator, /request\.resource\.data\.updatedAtMs is number/);
  assert.match(dashboardValidator, /request\.resource\.data\.syncRevision is int/);
  assert.doesNotMatch(dashboardValidator, /!\('updatedAtMs' in request\.resource\.data\)/);
  assert.match(
    rules,
    /request\.resource\.data\.updatedAtMs >= resource\.data\.updatedAtMs/
  );
  assert.match(dashboard, /const loadGeneration = \+\+dashboardLoadGeneration;/);
  assert.match(dashboard, /if \(!isCurrentLoad\(\)\) return;/);
  assert.match(dashboard, /Cloud sync failed; kept dashboard data already in memory\./);
});

test('Eden X1 does not block voting on optional Firestore reads', () => {
  const eden = readFileSync('js/eden-x1.js', 'utf8');

  assert.match(eden, /const EDEN_X1_OPTIONAL_READ_TIMEOUT_MS = 3500;/);
  assert.match(eden, /async function loadEdenOptionalData/);
  assert.match(eden, /'roster data'/);
  assert.match(eden, /'vote settings'/);
  assert.match(eden, /'bonus team effort points'/);
  assert.match(eden, /liveConductAdjustments\?\.length/);
});

test('admin gate uses a password sign-in check and sign-out cannot auto re-login', () => {
  const firebase = readFileSync('js/firebase.js', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const adjustments = readFileSync('js/ocr-adjustments.js', 'utf8');

  // The password-sign-in helper exists and inspects the password provider.
  assert.match(firebase, /export async function isPasswordAuthUser/);
  assert.match(firebase, /providerId === 'password'|signInProvider === 'password'/);
  assert.match(firebase, /catch\s*\{[\s\S]*return false;[\s\S]*\}/);
  assert.doesNotMatch(firebase, /token read failed[\s\S]*return true;/i);
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

test('admin stale chunk failures trigger one guarded asset recovery reload', () => {
  const adminPage = readFileSync('js/admin-page.js', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  for (const source of [adminPage, dashboard]) {
    assert.match(source, /vts_admin_stale_asset_recovery_v1/);
    assert.match(source, /Failed to fetch dynamically imported module/);
    assert.match(source, /caches\.delete/);
    assert.match(source, /registration\.unregister\(\)/);
    assert.match(source, /window\.location\.reload\(\)/);
  }
  assert.match(adminPage, /vite:preloadError/);
  assert.match(dashboard, /recoverFromStaleAssetGraph\(e\)/);
});

test('R5 conduct adjustments are stored separately and use the admin claim', () => {
  const rules = readFileSync('firestore.rules', 'utf8');

  assert.match(rules, /function validConductAdjustment\(\)/);
  assert.match(rules, /match \/vts_admin\/conduct_adjustments\/records\/\{adjustmentId\}/);
  assert.match(rules, /allow read: if signedIn\(\);/);
  assert.match(rules, /allow create: if isAdmin\(\)[\s\S]*validConductAdjustment\(\)/);
  assert.match(rules, /allow update: if isAdmin\(\)[\s\S]*validConductAdjustment\(\)/);
  assert.match(rules, /request\.resource\.data\.createdBy == request\.auth\.uid/);
  assert.match(rules, /function repairsHistoricalConductMetadata\(\)/);
  assert.match(rules, /keepsConductMetadata\(\) \|\| repairsHistoricalConductMetadata\(\)/);
});

test('Eden X1 votes are member-keyed with admin list and owner get', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  const eden = readFileSync('js/eden-x1.js', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  assert.match(rules, /function validEdenX1Vote\(\)/);
  assert.match(rules, /function validEdenX1VotePath\(voteId\)/);
  assert.match(rules, /function canGetOwnEdenX1Vote\(voteId\)/);
  assert.match(rules, /match \/vts_admin\/eden_x1_votes\/records\/\{voteId\}/);
  assert.match(rules, /allow get: if isAdmin\(\) \|\| canGetOwnEdenX1Vote\(voteId\);/);
  assert.match(rules, /allow list, delete: if isAdmin\(\);/);
  assert.match(rules, /resource\.data\.id == voteId/);
  assert.match(rules, /allow create: if signedIn\(\)[\s\S]*validEdenX1Vote\(\)/);
  assert.match(rules, /allow create: if signedIn\(\)[\s\S]*validEdenX1VotePath\(voteId\)/);
  assert.match(
    rules,
    /allow update: if signedIn\(\)[\s\S]*validEdenX1VotePath\(voteId\)[\s\S]*\(isAdmin\(\) \|\| resource\.data\.voterAuthUid == request\.auth\.uid\)/
  );
  assert.match(
    rules,
    /voteId == request\.resource\.data\.season \+ '__team_players__' \+ request\.resource\.data\.voterKey/
  );
  assert.match(rules, /request\.resource\.data\.category == 'team_players'/);
  assert.match(rules, /request\.resource\.data\.candidateKeys is list/);
  assert.match(rules, /request\.resource\.data\.candidateKeys\.size\(\) >= 1/);
  assert.match(rules, /request\.resource\.data\.candidateKeys\.size\(\) <= 4/);
  assert.match(rules, /request\.resource\.data\.candidateNames is list/);
  assert.match(
    rules,
    /request\.resource\.data\.candidateNames\.size\(\) == request\.resource\.data\.candidateKeys\.size\(\)/
  );
  assert.match(rules, /request\.resource\.data\.candidateNames\.size\(\) >= 1/);
  assert.match(rules, /request\.resource\.data\.candidateNames\.size\(\) <= 4/);
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[0\] != request\.resource\.data\.candidateKeys\[1\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[0\] != request\.resource\.data\.candidateKeys\[2\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[0\] != request\.resource\.data\.candidateKeys\[3\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[1\] != request\.resource\.data\.candidateKeys\[2\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[1\] != request\.resource\.data\.candidateKeys\[3\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKeys\[2\] != request\.resource\.data\.candidateKeys\[3\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateKey == request\.resource\.data\.candidateKeys\[0\]/
  );
  assert.match(
    rules,
    /request\.resource\.data\.candidateName == request\.resource\.data\.candidateNames\[0\]/
  );
  assert.match(rules, /request\.resource\.data\.voterAuthUid == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.updatedAt == request\.time/);
  assert.match(rules, /function validEdenX1VoteHistory\(\)/);
  assert.match(rules, /match \/vts_admin\/eden_x1_vote_history\/records\/\{historyId\}/);
  assert.match(rules, /allow read: if isAdmin\(\);/);
  assert.match(
    rules,
    /allow create: if signedIn\(\)[\s\S]*validEdenX1VoteHistory\(\)[\s\S]*validEdenX1VoteHistoryPath\(historyId\)/
  );
  assert.match(rules, /allow update, delete: if false;/);
  assert.match(rules, /match \/vts_admin\/eden_x1_vote_settings/);
  assert.match(rules, /allow read: if signedIn\(\);/);
  assert.match(rules, /allow create, update: if isAdmin\(\) && validEdenX1VoteSettings\(\);/);
  assert.match(eden, /EDEN_X1_VOTES_COLLECTION_PATH = 'vts_admin\/eden_x1_votes\/records'/);
  assert.match(
    eden,
    /EDEN_X1_VOTE_HISTORY_COLLECTION_PATH = 'vts_admin\/eden_x1_vote_history\/records'/
  );
  assert.match(
    eden,
    /EDEN_X1_VOTE_SETTINGS_DOC_PATH = 'vts_admin\/eden_x1_vote_settings'/
  );
  assert.match(
    eden,
    /const voterAuthUid = edenVoteWriteContext\?\.user\?\.uid \|\| 'local-test';[\s\S]*const id = edenVoteDocId\(season, voter\.playerKey\);/
  );
  assert.doesNotMatch(eden, /edenVoteDocId\(season, voterAuthUid\)/);
  assert.match(eden, /voterAuthUid/);
  assert.match(dashboard, /function dedupeEdenX1Votes/);
  assert.match(eden, /previousVoteKnown/);
  assert.match(eden, /saving vote with create-only history fallback/);
  assert.match(eden, /serverTimestamp\(\)/);
  assert.match(dashboard, /loadEdenX1VoteAdminData/);
  assert.match(dashboard, /setEdenX1VotesForTest/);
});

test('service worker precaches a complete, version-stamped app shell', () => {
  const source = readFileSync('public/sw.js', 'utf8');
  const urls = [...source.matchAll(/ {2}'([^']+)'/g)].map((match) => match[1]);
  const stamp = /\?v=\d{8}_\d{6}$/;

  assert.ok(urls.length <= 40, `expected bounded app shell, found ${urls.length} URLs`);
  assert.ok(urls.includes('/index.html'));
  assert.ok(urls.includes('/admin.html'));
  assert.ok(urls.includes('/eden-x1.html'));
  assert.ok(urls.includes('/images/logo.png'));
  // css/js entries must carry the ?v= stamp so cache keys can never mix
  // assets from different deploys.
  for (const url of urls) {
    if (/\.(?:css|js)(?:\?|$)/.test(url)) {
      assert.match(url, stamp, `unstamped css/js precache entry: ${url}`);
    }
  }
  assert.ok(urls.some((url) => url.startsWith('/js/app.js?v=')));
  assert.ok(urls.some((url) => url.startsWith('/js/theme-prepaint.js?v=')));
  assert.ok(urls.some((url) => url.startsWith('/tabs/admin.html?v=')));
  // Dynamically imported modules are added from the built output by
  // scripts/post-build.mjs, not the source manifest.
  assert.ok(!urls.some((url) => url.startsWith('/js/ocr-dashboard.js')));
  assert.ok(!urls.some((url) => url.startsWith('/js/tech-db.js')));
  assert.ok(!urls.includes('/images/strife/roc-strife-reference.png'));

  // Caching mechanics: atomic critical precache, no forced full re-downloads,
  // and the previous deploy's cache retained for already-open pages.
  assert.match(source, /batchAddAll\(cache, critical/);
  assert.doesNotMatch(source, /cache:\s*'reload'/);
  assert.match(source, /CRITICAL_PRECACHE_PATTERN/);
  assert.match(source, /older\[older\.length - 1\]/);
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
  assert.match(rules, /request\.resource\.data\.parentId == null/);
  assert.match(rules, /request\.resource\.data\.parentId is string/);
  assert.match(rules, /request\.resource\.data\.parentId\.matches\('\^\[A-Za-z0-9_-\]\{1,150\}\$'\)/);
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
