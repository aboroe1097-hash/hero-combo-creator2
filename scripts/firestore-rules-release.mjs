// scripts/firestore-rules-release.mjs
//
// Points the live cloud.firestore release at the ruleset that was already
// uploaded for this checkout's firestore.rules, retrying through 503s.
//
//   node scripts/firestore-rules-release.mjs probe              re-point the release at the live ruleset
//   node scripts/firestore-rules-release.mjs release            switch production to ./firestore.rules
//   node scripts/firestore-rules-release.mjs release --dry-run  show what release would do, change nothing
//
// Why it exists: on 2026-09-23/24 the Firebase Rules API on project abocombo
// returned random 503s on every step of `firebase deploy --only firestore:rules`
// (test, rulesets.create, releases.patch) from both the CLI and the console. A
// 503 did not mean the step failed: one release returned 503 and still took
// effect. The upload usually lands, so this script skips the CLI and retries
// only the release step, then confirms by reading the release back. GETs are
// retried on 429/500/503 too. See docs/firebase-deploy-runbook.md.
//
// It never uploads or deletes. `release` only moves the release to the newest
// uploaded ruleset whose full source matches ./firestore.rules (one file, same
// text after normalizing line endings). `probe` re-points the release at the
// ruleset that is already live: the enforced rules stay unchanged, but the
// PATCH does bump the release's updateTime. Both need an existing
// cloud.firestore release; they cannot bootstrap a new project (the first
// deploy must use the Firebase CLI). Uses the firebase-tools login, like
// scripts/firestore-rules-status.mjs.
//
// Exit codes:
//   0  done (or already live, or a dry run)
//   1  unconfirmed after retries, or a transient/unknown error
//   2  usage error
//   3  no uploaded ruleset matches ./firestore.rules (upload it with the CLI first)
//   4  permanent API error (400, 403 or 404); retrying will not help

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

const USAGE = 'Usage: node scripts/firestore-rules-release.mjs probe | release [--dry-run]';
const RETRYABLE_STATUSES = new Set([429, 500, 503]);
const PERMANENT_STATUSES = new Set([400, 403, 404]);
const PATCH_STOP_STATUSES = new Set([400, 403]);

export class RulesApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RulesApiError';
    this.status = status;
  }
}

const shortText = (text) =>
  String(text ?? '')
    .slice(0, 160)
    .replace(/\s+/g, ' ');

// GET with the same backoff as the release PATCH. Retries 429/500/503 and
// network errors; any other non-200 status is a real answer and throws at once.
export async function getWithRetry(
  url,
  token,
  {
    callApi = call,
    sleepFor = sleep,
    retryDelays = RETRY_DELAYS_S,
    logger = console.log,
    what = url,
  } = {}
) {
  let lastStatus = 0;
  let lastText = '';
  let lastError = null;
  for (const delay of retryDelays) {
    if (delay) {
      logger(`  waiting ${delay}s...`);
      await sleepFor(delay * 1000);
    }
    let res;
    try {
      res = await callApi('GET', url, token);
    } catch (error) {
      lastError = error;
      logger(`  GET ${what} -> network error: ${error instanceof Error ? error.message : error}`);
      continue;
    }
    if (res.status === 200) return res;
    lastError = null;
    lastStatus = res.status;
    lastText = res.text;
    if (!RETRYABLE_STATUSES.has(res.status)) {
      throw new RulesApiError(
        `GET ${what} failed with ${res.status}: ${shortText(res.text)}`,
        res.status
      );
    }
    logger(`  GET ${what} -> ${res.status} ${shortText(res.text)}`);
  }
  if (lastError) throw lastError;
  throw new RulesApiError(
    `GET ${what} still failing after ${retryDelays.length} attempts: ${lastStatus} ${shortText(lastText)}`,
    lastStatus
  );
}

// The release's own read-back is the only trustworthy result: a 503 on the
// PATCH has been seen to apply anyway. A 400 or 403 on the PATCH is a real
// validation or permission error, so it stops at once.
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
    logger(`  PATCH release -> ${res.status} ${shortText(res.text)}`);
    if (PATCH_STOP_STATUSES.has(res.status)) {
      throw new RulesApiError(
        `PATCH release failed with ${res.status}: ${shortText(res.text)}`,
        res.status
      );
    }
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

// Full-source equality: the ruleset must hold exactly the local files, each
// with the same text after normalizing line endings. Files pair by name when
// both sides name the same set of files, otherwise by position. A multi-file
// ruleset therefore never matches a single local firestore.rules.
export function rulesetSourceMatches(ruleset, localFiles) {
  const remote = ruleset?.source?.files;
  if (!Array.isArray(remote) || !Array.isArray(localFiles)) return false;
  if (remote.length !== localFiles.length || remote.length === 0) return false;

  const names = (files) => files.map((file) => file?.name).filter(Boolean);
  const remoteNames = names(remote);
  const localNames = names(localFiles);
  const pairByName =
    remoteNames.length === remote.length &&
    localNames.length === localFiles.length &&
    new Set(remoteNames).size === remoteNames.length &&
    localNames.every((name) => remoteNames.includes(name));

  return localFiles.every((localFile, index) => {
    const remoteFile = pairByName
      ? remote.find((file) => file.name === localFile.name)
      : remote[index];
    return (
      remoteFile !== undefined &&
      normalizeRulesSource(remoteFile.content ?? '') === normalizeRulesSource(localFile.content)
    );
  });
}

const createTimeOf = (summary) => {
  const parsed = Date.parse(summary?.createTime ?? '');
  return Number.isNaN(parsed) ? null : parsed;
};

// Returns the newest uploaded ruleset whose full source matches the local
// rules, as { name, createTime }, or null when none does.
export async function findMatchingRuleset(
  localRules,
  token,
  {
    project = PROJECT,
    callApi = call,
    sleepFor = sleep,
    retryDelays = RETRY_DELAYS_S,
    logger = console.log,
  } = {}
) {
  const localFiles = [{ name: 'firestore.rules', content: localRules }];
  const retry = { callApi, sleepFor, retryDelays, logger };
  const summaries = [];
  let pageToken = '';
  const seenTokens = new Set();

  while (true) {
    const url = new URL(`${API}/projects/${project}/rulesets`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const list = await getWithRetry(url.toString(), token, { ...retry, what: 'rulesets list' });
    if (!Array.isArray(list.json?.rulesets)) {
      throw new Error('Rulesets API returned an invalid list response.');
    }
    for (const summary of list.json.rulesets) {
      if (summary?.name) summaries.push(summary);
    }

    const nextPageToken = list.json.nextPageToken;
    if (!nextPageToken) break;
    if (seenTokens.has(nextPageToken)) {
      throw new Error('Rulesets API repeated a page token; stopping to avoid an infinite loop.');
    }
    seenTokens.add(nextPageToken);
    pageToken = nextPageToken;
  }

  // Newest first, so the first match is the newest of any identical rulesets.
  // Missing or equal createTimes keep list order.
  const ordered = summaries
    .map((summary, index) => ({ summary, index, time: createTimeOf(summary) }))
    .sort((a, b) => {
      if (a.time !== null && b.time !== null && a.time !== b.time) return b.time - a.time;
      if (a.time !== null && b.time === null) return -1;
      if (a.time === null && b.time !== null) return 1;
      return a.index - b.index;
    })
    .map((entry) => entry.summary);

  for (const summary of ordered) {
    const full = await getWithRetry(`${API}/${summary.name}`, token, {
      ...retry,
      what: summary.name,
    });
    if (rulesetSourceMatches(full.json, localFiles)) {
      return {
        name: summary.name,
        createTime: summary.createTime ?? full.json?.createTime ?? null,
      };
    }
  }
  return null;
}

const NO_RELEASE_MESSAGE =
  'The cloud.firestore release does not exist yet. probe and release can only move an existing release; they cannot bootstrap a new project. Do the first deploy with `npx firebase deploy --only firestore:rules`.';

async function readLiveRelease(token, retry) {
  try {
    return await getWithRetry(`${API}/${RELEASE}`, token, { ...retry, what: 'live release' });
  } catch (error) {
    if (error instanceof RulesApiError && error.status === 404) return null;
    throw error;
  }
}

export async function runRelease({
  localRules,
  token,
  dryRun = false,
  project = PROJECT,
  callApi = call,
  sleepFor = sleep,
  retryDelays = RETRY_DELAYS_S,
  logger = console.log,
}) {
  const retry = { callApi, sleepFor, retryDelays, logger };
  const live = await readLiveRelease(token, retry);
  if (!live) {
    logger(NO_RELEASE_MESSAGE);
    return 4;
  }
  const liveRuleset = live.json?.rulesetName;
  logger(`live ruleset : ${liveRuleset}`);

  const match = await findMatchingRuleset(localRules, token, { project, ...retry });
  if (!match) {
    logger(
      `No uploaded ruleset matches ./firestore.rules yet. Run \`npx firebase deploy --only firestore:rules --project ${project}\` first; the upload usually lands even when the command fails.`
    );
    return 3;
  }
  if (match.name === liveRuleset) {
    logger('Already live.');
    return 0;
  }
  if (dryRun) {
    logger(`candidate ruleset : ${match.name}`);
    logger(`created           : ${match.createTime ?? 'unknown'}`);
    logger(`live ruleset      : ${liveRuleset}`);
    logger('DRY RUN: release not changed.');
    return 0;
  }
  logger(`matching ruleset: ${match.name} (created ${match.createTime ?? 'unknown'})`);
  const ok = await pointReleaseAt(match.name, token, retry);
  logger(ok ? 'DONE: new rules are live.' : 'FAILED: production is still on the old rules.');
  return ok ? 0 : 1;
}

export async function runProbe({
  token,
  callApi = call,
  sleepFor = sleep,
  retryDelays = RETRY_DELAYS_S,
  logger = console.log,
}) {
  const retry = { callApi, sleepFor, retryDelays, logger };
  const live = await readLiveRelease(token, retry);
  if (!live) {
    logger(NO_RELEASE_MESSAGE);
    return 4;
  }
  logger(`live ruleset : ${live.json?.rulesetName}`);
  // A matching read-back alone cannot prove a no-op PATCH worked: that
  // ruleset was already live. Require an acknowledged PATCH as well.
  const ok = await pointReleaseAt(live.json?.rulesetName, token, {
    ...retry,
    requireAcknowledgedPatch: true,
  });
  logger(
    ok ? 'RESULT: the release endpoint works.' : 'RESULT: the release endpoint is unconfirmed.'
  );
  return ok ? 0 : 1;
}

// Returns { mode, dryRun } or null for anything that is not exactly one mode
// (probe or release), with --dry-run allowed only for release.
export function parseArgs(args) {
  const modes = args.filter((arg) => arg === 'probe' || arg === 'release');
  const flags = args.filter((arg) => arg === '--dry-run');
  if (modes.length !== 1 || modes.length + flags.length !== args.length) return null;
  if (flags.length > 1) return null;
  const dryRun = flags.length === 1;
  if (dryRun && modes[0] !== 'release') return null;
  return { mode: modes[0], dryRun };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }

  const token = await accessToken();
  if (options.mode === 'probe') {
    process.exitCode = await runProbe({ token });
    return;
  }
  const localRules = fs.readFileSync('firestore.rules', 'utf8');
  process.exitCode = await runRelease({ localRules, token, dryRun: options.dryRun });
}

// True when argv1 names this module: follows symlinks, accepts a path without
// the .mjs extension, and ignores case on Windows.
export function isEntryPoint(argv1, moduleUrl, platform = process.platform) {
  if (!argv1) return false;
  const canonical = (file) => {
    const resolved = path.resolve(file);
    let real = resolved;
    try {
      real = fs.realpathSync.native(resolved);
    } catch {
      // Keep the resolved path when the file cannot be resolved further.
    }
    return platform === 'win32' ? real.toLowerCase() : real;
  };
  const target = canonical(fileURLToPath(moduleUrl));
  const candidates = [argv1];
  if (!path.extname(argv1)) candidates.push(`${argv1}.mjs`);
  return candidates.some((candidate) => canonical(candidate) === target);
}

if (isEntryPoint(process.argv[1], import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode =
      error instanceof RulesApiError && PERMANENT_STATUSES.has(error.status) ? 4 : 1;
  });
}
