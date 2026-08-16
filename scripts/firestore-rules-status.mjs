// scripts/firestore-rules-status.mjs
//
// Reports which firestore.rules is actually LIVE on the project, and diffs it
// against the file in this checkout.
//
// The Firebase CLI can upload a ruleset and then fail to move the release that
// points production at it (a 409 on /releases). When that happens the CLI's own
// output is misleading: a later run says "already up to date, skipping upload",
// which describes the ruleset, not the release. This script answers the only
// question that matters — is the rules file in this checkout the one being
// enforced right now?
//
//   node scripts/firestore-rules-status.mjs
//
// Read-only: it performs GETs and never creates, releases, or deletes anything.

import fs from 'node:fs';
import path from 'node:path';

const PROJECT = process.env.FIREBASE_PROJECT || 'abocombo';
const RELEASE = 'cloud.firestore';

function configStorePath() {
  const appData =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(process.env.HOME || '', 'Library', 'Preferences')
      : path.join(process.env.HOME || '', '.config'));
  return path.join(appData, 'configstore', 'firebase-tools.json');
}

async function accessToken() {
  const file = configStorePath();
  if (!fs.existsSync(file)) {
    throw new Error(`No firebase-tools credentials at ${file}. Run: npx firebase login`);
  }
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  const refresh = cfg?.tokens?.refresh_token || cfg?.user?.tokens?.refresh_token;
  if (!refresh) throw new Error('No refresh token in the firebase-tools configstore.');
  const { getAccessToken } = await import('firebase-tools/lib/auth.js');
  // Takes the refresh token STRING, not the tokens object, and extra scopes
  // such as cloud-platform make it fail with "credentials are no longer valid".
  const token = await getAccessToken(refresh, []);
  return token?.access_token || token;
}

async function api(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body;
}

const token = await accessToken();

const release = await api(
  `https://firebaserules.googleapis.com/v1/projects/${PROJECT}/releases/${RELEASE}`,
  token
);
console.log(`live release : ${release.name}`);
console.log(`points at    : ${release.rulesetName}`);
console.log(`updated      : ${release.updateTime}`);

const ruleset = await api(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`, token);
const liveSource = ruleset.source?.files?.[0]?.content ?? '';
const repoSource = fs.readFileSync('firestore.rules', 'utf8');

// Compare on normalized line endings: a CRLF checkout would otherwise report a
// difference on every line while the deployed content is identical.
const normalize = (text) => text.replace(/\r\n?/g, '\n');
const live = normalize(liveSource);
const repo = normalize(repoSource);

console.log(`live bytes   : ${live.length}`);
console.log(`repo bytes   : ${repo.length}`);

if (live === repo) {
  console.log('\nRESULT: LIVE MATCHES THIS CHECKOUT — the deploy is done.');
  process.exit(0);
}

console.log('\nRESULT: LIVE DIFFERS FROM THIS CHECKOUT — the deploy did NOT take effect.');

// Name the paths that exist in one and not the other; that is far more useful
// than a line diff of a 2600-line file.
const blocks = (text) => new Set([...text.matchAll(/match\s+(\/[^\s{]+)/g)].map((m) => m[1]));
const liveBlocks = blocks(live);
const repoBlocks = blocks(repo);
const missing = [...repoBlocks].filter((p) => !liveBlocks.has(p));
const extra = [...liveBlocks].filter((p) => !repoBlocks.has(p));

if (missing.length) console.log(`\nIn this checkout but NOT live (${missing.length}):`);
for (const p of missing) console.log(`  - ${p}`);
if (extra.length) console.log(`\nLive but not in this checkout (${extra.length}):`);
for (const p of extra) console.log(`  + ${p}`);
process.exit(1);
