import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('public admin auth config stores hashes instead of plaintext passphrases', () => {
  const source = readFileSync('js/admin-auth-config.js', 'utf8');
  assert.match(source, /adminHash:\s*'(?:|[a-f0-9]{64})'/);
  assert.match(source, /clearHash:\s*'(?:|[a-f0-9]{64})'/);
  assert.match(source, /deleteHashes:\s*(?:\[\s*\]|\[\s*'[a-f0-9]{64}'\s*\])/);
  assert.doesNotMatch(source, /12345/);
});

test('admin auth local storage marker is tied to the active password hash', () => {
  const source = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(source, /localStorage\.getItem\(AUTH_KEY\)\s*===\s*AUTH_HASH/);
  assert.match(source, /localStorage\.setItem\(AUTH_KEY,\s*AUTH_HASH\)/);
  assert.doesNotMatch(source, /localStorage\.setItem\(AUTH_KEY,\s*'1'\)/);
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

test('firebase app check token requests retry transient recaptcha failures', () => {
  const source = readFileSync('js/firebase.js', 'utf8');
  assert.match(source, /function shouldRetryAppCheckTokenError/);
  assert.match(source, /attempt < maxAttempts/);
  assert.match(source, /getToken\(currentAppCheck, forceRefresh \|\| attempt > 0\)/);
  assert.match(source, /unhandledrejection/);
  assert.match(source, /reCAPTCHA timed out/);
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
  assert.match(dashboard, /bannerRecords/);
  assert.match(dashboard, /dutyRecords/);
  assert.match(dashboard, /contributionRecords/);
  assert.match(roster, /syncDashboardAuxiliaryRecordsToCloud/);
  assert.match(rules, /'bannerRecords', 'dutyRecords', 'contributionRecords'/);
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
