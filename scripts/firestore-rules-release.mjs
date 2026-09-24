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
// It never uploads or deletes. It only moves the release to a ruleset whose
// rules text matches ./firestore.rules after normalizing line endings (or, for
// `probe`, to the ruleset that is already live). Uses the firebase-tools login,
// like scripts/firestore-rules-status.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = process.env.FIREBASE_PROJECT || 'abocombo';
const RELEASE = `projects/${PROJECT}/releases/cloud.firestore`;
const API = 'https://firebaserules.googleapis.com/v1';
const RETRY_DELAYS_S = [0, 5, 15, 30, 60, 120];
const normalizeRulesSource = (text) => String(text).replace(/\r\n?/g, '\n');

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
export async function pointReleaseAt(
  rulesetName,
  token,
  {
    callApi = call,
    sleepFor = sleep,
    retryDelays = RETRY_DELAYS_S,
    logger = console.log,
    requireAcknowledgedPatch = false,
  } = {}
) {
  for (const delay of retryDelays) {
    if (delay) {
      logger(`  waiting ${delay}s...`);
      await sleepFor(delay * 1000);
    }
    const res = await callApi('PATCH', `${API}/${RELEASE}`, token, {
      release: { name: RELEASE, rulesetName },
      updateMask: 'rulesetName',
    });
    logger(`  PATCH release -> ${res.status} ${res.text.slice(0, 160).replace(/\s+/g, ' ')}`);
    const now = await callApi('GET', `${API}/${RELEASE}`, token);
    const patchAcknowledged = res.status >= 200 && res.status < 300;
    if (
      now.status === 200 &&
      now.json?.rulesetName === rulesetName &&
      (!requireAcknowledgedPatch || patchAcknowledged)
    ) {
      return true;
    }
  }
  return false;
}

export async function findMatchingRuleset(
  localRules,
  token,
  { project = PROJECT, callApi = call } = {}
) {
  const normalizedLocalRules = normalizeRulesSource(localRules);
  let pageToken = '';
  const seenTokens = new Set();

  while (true) {
    const url = new URL(`${API}/projects/${project}/rulesets`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const list = await callApi('GET', url.toString(), token);
    if (list.status !== 200) throw new Error(`Could not list rulesets: ${list.text}`);
    if (!Array.isArray(list.json?.rulesets)) {
      throw new Error('Rulesets API returned an invalid list response.');
    }

    for (const summary of list.json.rulesets) {
      if (!summary?.name) continue;
      const full = await callApi('GET', `${API}/${summary.name}`, token);
      if (full.status !== 200) {
        throw new Error(`Could not read ruleset ${summary.name}: ${full.text}`);
      }
      if (
        (full.json?.source?.files || []).some(
          (file) => normalizeRulesSource(file.content ?? '') === normalizedLocalRules
        )
      ) {
        return summary.name;
      }
    }

    const nextPageToken = list.json.nextPageToken;
    if (!nextPageToken) return null;
    if (seenTokens.has(nextPageToken)) {
      throw new Error('Rulesets API repeated a page token; stopping to avoid an infinite loop.');
    }
    seenTokens.add(nextPageToken);
    pageToken = nextPageToken;
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode !== 'probe' && mode !== 'release') {
    console.log('Usage: node scripts/firestore-rules-release.mjs probe|release');
    process.exitCode = 1;
    return;
  }

  const token = await accessToken();
  const live = await call('GET', `${API}/${RELEASE}`, token);
  if (live.status !== 200) throw new Error(`Could not read the live release: ${live.text}`);
  console.log(`live ruleset : ${live.json.rulesetName}`);

  if (mode === 'probe') {
    // A matching read-back alone cannot prove a no-op PATCH worked: that
    // ruleset was already live. Require an acknowledged PATCH as well.
    const ok = await pointReleaseAt(live.json.rulesetName, token, {
      requireAcknowledgedPatch: true,
    });
    console.log(
      ok ? 'RESULT: the release endpoint works.' : 'RESULT: the release endpoint is unconfirmed.'
    );
    process.exitCode = ok ? 0 : 1;
    return;
  }

  const local = fs.readFileSync('firestore.rules', 'utf8');
  const match = await findMatchingRuleset(local, token);
  if (!match) {
    console.log(
      'No uploaded ruleset matches ./firestore.rules yet. Run `npx firebase deploy --only firestore:rules --project abocombo` first; the upload usually lands even when the command fails.'
    );
    process.exitCode = 1;
    return;
  }
  if (match === live.json.rulesetName) {
    console.log('Already live.');
    process.exitCode = 0;
    return;
  }
  console.log(`matching ruleset: ${match}`);
  const ok = await pointReleaseAt(match, token);
  console.log(ok ? 'DONE: new rules are live.' : 'FAILED: production is still on the old rules.');
  process.exitCode = ok ? 0 : 1;
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (scriptPath && scriptPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
