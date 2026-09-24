// scripts/firestore-rules-release.mjs
//
// Points the live cloud.firestore release at the ruleset that was already
// uploaded for this checkout's firestore.rules, retrying through 503s.
//
//   node scripts/firestore-rules-release.mjs probe     re-point at the live ruleset (no change)
//   node scripts/firestore-rules-release.mjs release   switch production to ./firestore.rules
//
// Why it exists: on 2026-09-23/24 the Firebase Rules API on project abocombo
// returned random 503s on every step of `firebase deploy --only firestore:rules`
// (test, rulesets.create, releases.patch) from both the CLI and the console. A
// 503 did not mean the step failed: one release returned 503 and still took
// effect. The upload usually lands, so this script skips the CLI and retries
// only the release step, then confirms by reading the release back. See
// docs/firebase-deploy-runbook.md.
//
// It never uploads, never deletes, and only moves the release to a ruleset
// whose text is byte-identical to ./firestore.rules (or, for `probe`, to the
// ruleset that is already live). Uses the firebase-tools login, like
// scripts/firestore-rules-status.mjs.

import fs from 'node:fs';
import path from 'node:path';

const PROJECT = process.env.FIREBASE_PROJECT || 'abocombo';
const RELEASE = `projects/${PROJECT}/releases/cloud.firestore`;
const API = 'https://firebaserules.googleapis.com/v1';
const RETRY_DELAYS_S = [0, 5, 15, 30, 60, 120];
const mode = process.argv[2];

if (mode !== 'probe' && mode !== 'release') {
  console.log('Usage: node scripts/firestore-rules-release.mjs probe|release');
  process.exit(1);
}

function configStoreCandidates() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return [
    process.env.XDG_CONFIG_HOME,
    path.join(home, '.config'),
    process.env.APPDATA,
    process.env.LOCALAPPDATA,
    process.platform === 'darwin' ? path.join(home, 'Library', 'Preferences') : null,
  ]
    .filter(Boolean)
    .map((dir) => path.join(dir, 'configstore', 'firebase-tools.json'));
}

async function accessToken() {
  const { getAccessToken } = await import('firebase-tools/lib/auth.js');
  if (process.env.FIREBASE_TOKEN) {
    const token = await getAccessToken(process.env.FIREBASE_TOKEN, []);
    return token?.access_token || token;
  }
  const file = configStoreCandidates().find((candidate) => fs.existsSync(candidate));
  if (!file) throw new Error('No firebase-tools login found. Run: npx firebase login');
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  const refresh = cfg?.tokens?.refresh_token || cfg?.user?.tokens?.refresh_token;
  if (!refresh) throw new Error('No refresh token in the firebase-tools configstore.');
  const token = await getAccessToken(refresh, []);
  return token?.access_token || token;
}

async function call(method, url, token, body) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // Keep the raw text for the log line.
  }
  return { status: response.status, json, text };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The release's own read-back is the only trustworthy result: a 503 on the
// PATCH has been seen to apply anyway.
async function pointReleaseAt(rulesetName, token) {
  for (const delay of RETRY_DELAYS_S) {
    if (delay) {
      console.log(`  waiting ${delay}s...`);
      await sleep(delay * 1000);
    }
    const res = await call('PATCH', `${API}/${RELEASE}`, token, {
      release: { name: RELEASE, rulesetName },
      updateMask: 'rulesetName',
    });
    console.log(`  PATCH release -> ${res.status} ${res.text.slice(0, 160).replace(/\s+/g, ' ')}`);
    const now = await call('GET', `${API}/${RELEASE}`, token);
    if (now.json?.rulesetName === rulesetName) return true;
  }
  return false;
}

const token = await accessToken();
const live = await call('GET', `${API}/${RELEASE}`, token);
if (live.status !== 200) throw new Error(`Could not read the live release: ${live.text}`);
console.log(`live ruleset : ${live.json.rulesetName}`);

if (mode === 'probe') {
  const ok = await pointReleaseAt(live.json.rulesetName, token);
  console.log(ok ? 'RESULT: the release endpoint works.' : 'RESULT: the release endpoint is failing.');
  process.exit(ok ? 0 : 1);
}

const local = fs.readFileSync('firestore.rules', 'utf8');
const list = await call('GET', `${API}/projects/${PROJECT}/rulesets?pageSize=20`, token);
if (list.status !== 200) throw new Error(`Could not list rulesets: ${list.text}`);
let match = null;
for (const summary of list.json?.rulesets || []) {
  const full = await call('GET', `${API}/${summary.name}`, token);
  if ((full.json?.source?.files || []).some((file) => file.content === local)) {
    match = summary.name;
    break;
  }
}
if (!match) {
  console.log(
    'No uploaded ruleset matches ./firestore.rules yet. Run `npx firebase deploy --only firestore:rules --project abocombo` first; the upload usually lands even when the command fails.'
  );
  process.exit(1);
}
if (match === live.json.rulesetName) {
  console.log('Already live.');
  process.exit(0);
}
console.log(`matching ruleset: ${match}`);
const ok = await pointReleaseAt(match, token);
console.log(ok ? 'DONE: new rules are live.' : 'FAILED: production is still on the old rules.');
process.exit(ok ? 0 : 1);
