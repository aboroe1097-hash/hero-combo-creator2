// Compares firestore.rules in this checkout against the ruleset actually
// released to Firestore.
//
// Merging a PR does not deploy rules. The Pages workflow ships the app; rules
// are a separate manual `firebase deploy --only firestore:rules`. When #173
// merged, the new BoH Match Results UI went live against a ruleset that still
// carried the old team ids, so every save was refused — and the dashboard
// reported it as "Not signed in as admin", which sent the operator looking at
// accounts instead of at the release.
//
// Default mode never fails the build: a branch whose rules differ from live is
// the normal state before the deploy happens, and CI has no Firebase
// credentials at all. It prints a verdict so the drift is visible in the gate
// output. `--strict` exits non-zero on any difference, which is what to run
// straight after deploying to prove the release landed.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rulesPath = path.join(rootDir, 'firestore.rules');
const strict = process.argv.includes('--strict');
const PROJECT = process.env.FIREBASE_PROJECT || 'abocombo';

function skip(reason) {
  console.log(`Firestore rules live check skipped: ${reason}`);
  process.exit(0);
}

function readRefreshToken() {
  const explicit = String(process.env.FIREBASE_TOKEN || '').trim();
  if (explicit) return explicit;
  const home = process.env.USERPROFILE || process.env.HOME || '';
  if (!home) return '';
  for (const candidate of [
    path.join(home, '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA || home, 'configstore', 'firebase-tools.json'),
  ]) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      const token = String(parsed?.tokens?.refresh_token || '').trim();
      if (token) return token;
    } catch {
      // A malformed or unreadable config is the same as having no credentials.
    }
  }
  return '';
}

function loadFirebaseAuth() {
  const require = createRequire(import.meta.url);
  for (const candidate of [
    'firebase-tools/lib/auth.js',
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'firebase-tools', 'lib', 'auth.js'),
  ]) {
    try {
      if (!candidate) continue;
      return require(candidate);
    } catch {
      // Try the next location.
    }
  }
  return null;
}

if (!fs.existsSync(rulesPath)) skip('firestore.rules is missing');
const repoRules = fs.readFileSync(rulesPath, 'utf8');

const refreshToken = readRefreshToken();
if (!refreshToken) skip('no Firebase CLI credentials on this machine');
const auth = loadFirebaseAuth();
if (!auth?.getAccessToken) skip('firebase-tools is not installed');

let accessToken = '';
try {
  ({ access_token: accessToken } = await auth.getAccessToken(refreshToken, []));
} catch (error) {
  skip(`could not exchange the Firebase refresh token (${error?.message || error})`);
}
if (!accessToken) skip('Firebase returned no access token');

const headers = { Authorization: `Bearer ${accessToken}` };

async function getJson(url) {
  const response = await fetch(url, { headers });
  const json = await response.json();
  if (json?.error) throw new Error(`${json.error.code} ${json.error.message}`);
  return json;
}

let liveRules = '';
let releasedAt = '';
try {
  const releases = await getJson(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases`
  );
  const release = (releases.releases || []).find((entry) => entry.name.endsWith('cloud.firestore'));
  if (!release) skip('the project has no cloud.firestore rules release');
  releasedAt = release.updateTime;
  const ruleset = await getJson(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
  liveRules = ruleset?.source?.files?.[0]?.content || '';
} catch (error) {
  // The Rules API 503s intermittently. That is not a drift signal, so it must
  // not fail the gate even in strict mode.
  skip(`the Rules API is unavailable (${error?.message || error})`);
}

const inSync = liveRules === repoRules;
const repoBytes = Buffer.byteLength(repoRules);
const liveBytes = Buffer.byteLength(liveRules);

console.log('Firestore rules live check:');
console.log(`- project: ${PROJECT}`);
console.log(`- released: ${releasedAt}`);
console.log(`- repo ${repoBytes} bytes, live ${liveBytes} bytes`);

if (inSync) {
  console.log('- live ruleset matches this checkout.');
  process.exit(0);
}

// Name what changed rather than just reporting a byte count, so the reader can
// tell an unreleased feature from an accidental rollback.
const identifiers = (source) =>
  new Set(
    [...source.matchAll(/match \/([A-Za-z0-9_]+)|function ([A-Za-z0-9_]+)\(/g)].map(
      (entry) => entry[1] || entry[2]
    )
  );
const repoIds = identifiers(repoRules);
const liveIds = identifiers(liveRules);
const onlyRepo = [...repoIds].filter((id) => !liveIds.has(id));
const onlyLive = [...liveIds].filter((id) => !repoIds.has(id));

console.log('- live ruleset DIFFERS from this checkout.');
if (onlyRepo.length) console.log(`  not yet released: ${onlyRepo.join(', ')}`);
if (onlyLive.length) console.log(`  live only (would be removed): ${onlyLive.join(', ')}`);
console.log('  Merging does not deploy rules. After merging, run:');
console.log('    firebase deploy --only firestore:rules --project ' + PROJECT);
console.log('  The compile endpoint 503s intermittently; retry until it lands.');

process.exit(strict ? 1 : 0);
