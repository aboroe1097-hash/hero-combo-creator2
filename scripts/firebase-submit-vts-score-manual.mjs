// One-off leadership manual VtsScore entry for Competition #11 members who could
// not submit before the deadline. Writes directly to
// boh_allstar/{activeSeason}/raceScores/{submissionUid} with the exact schema the
// vtsScore Cloud Function writes (schemaVersion 2), so the admin comparison and
// Firestore contract stay intact. Refuses to overwrite an existing score unless
// invoked with --overwrite. NOT committed to the repo.
//
// Auth: the firebase-tools CLI login (Google OAuth, project owner) — same pattern
// as scripts/verify-arcade-firestore-contract.mjs. IAM bypasses Firestore rules.
//
// Usage: node scripts/firebase-submit-vts-score-manual.mjs [--overwrite]

import { createRequire } from 'node:module';

import { initializeApp, refreshToken } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const PROJECT_ID = 'abocombo';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const VTS_SCORE_RECORD_SCHEMA_VERSION = 2;
const VTS_SCORE_MAX_POWER = 100_000_000_000;
const REQUIRED_POWER_FIELDS = Object.freeze([
  'totalCastlePower',
  'troopPower',
  'buildingPower',
  'technologyPower',
  'heroCombatPower',
  'dragonPower',
  'unitSpecialtyPower',
]);
const POWER_FIELDS = Object.freeze([...REQUIRED_POWER_FIELDS, 'artifactPower', 'royalTechPower']);
const MANUAL_OCR_REQUEST_ID = 'manual-leadership-entry-2026-07-29';

// Values read by leadership from each member's in-game power breakdown screenshot.
// royalTechPower is not visible in either screenshot; the game client display total
// runs ~22 above the visible component sum on both, consistent with display rounding.
const ENTRIES = [
  {
    gameName: 'Bil.',
    powerValues: {
      totalCastlePower: 611_834_544,
      troopPower: 563_479_134,
      buildingPower: 4_216_494,
      technologyPower: 18_361_967,
      heroCombatPower: 19_086_572,
      dragonPower: 4_235_755,
      unitSpecialtyPower: 2_454_600,
      artifactPower: 0,
      royalTechPower: null,
    },
  },
  {
    gameName: 'old man war',
    powerValues: {
      totalCastlePower: 354_045_650,
      troopPower: 310_753_869,
      buildingPower: 4_319_753,
      technologyPower: 12_940_839,
      heroCombatPower: 20_225_912,
      dragonPower: 4_644_195,
      unitSpecialtyPower: 1_161_060,
      artifactPower: 0,
      royalTechPower: null,
    },
  },
];

const require = createRequire(import.meta.url);
const { configstore } = require('firebase-tools/lib/configstore');
const { clientId, clientSecret } = require('firebase-tools/lib/api');
const { requireAuth } = require('firebase-tools/lib/requireAuth');

function fail(message) {
  console.error(`ABORT: ${message}`);
  process.exit(1);
}

function validatePowerValues(entry) {
  const keys = Object.keys(entry.powerValues).sort();
  const expected = [...POWER_FIELDS].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    fail(`${entry.gameName}: powerValues keys must be exactly ${expected.join(', ')}`);
  }
  for (const field of POWER_FIELDS) {
    const value = entry.powerValues[field];
    if (value === null) {
      if (REQUIRED_POWER_FIELDS.includes(field)) {
        fail(`${entry.gameName}: ${field} is required and cannot be null`);
      }
      continue;
    }
    if (!Number.isSafeInteger(value) || value < 0 || value > VTS_SCORE_MAX_POWER) {
      fail(`${entry.gameName}: ${field}=${value} is not an integer in 0..${VTS_SCORE_MAX_POWER}`);
    }
  }
}

function foldName(value) {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('en');
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (value && typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])
        ),
      },
    };
  }
  throw new Error(`Unsupported value type: ${typeof value}`);
}

function firestoreFields(record) {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, firestoreValue(value)]));
}

function decodeValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeValue(item)])
    );
  }
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeValue);
  return null;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, decodeValue(value)]));
}

async function createAdminContext() {
  const options = {
    project: PROJECT_ID,
    projectRoot: process.cwd(),
    user: configstore.get('user'),
    tokens: configstore.get('tokens'),
  };
  await requireAuth(options);
  const tokens = configstore.get('tokens');
  const accessToken = String(tokens?.access_token || '');
  if (!accessToken) fail('firebase-tools CLI did not yield an access token. Run `npx firebase login`.');
  const credential = refreshToken({
    type: 'authorized_user',
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: tokens.refresh_token,
  });
  const app = initializeApp({ credential, projectId: PROJECT_ID });
  return { app, accessToken, email: String(configstore.get('user')?.email || '') };
}

async function firestoreFetch(accessToken, path, { method = 'GET', body } = {}) {
  const response = await fetch(`${FIRESTORE_BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    fail(`Firestore returned invalid JSON (${response.status}): ${text.slice(0, 200)}`);
  }
  return { status: response.status, payload };
}

async function readDocument(accessToken, resourcePath) {
  const { status, payload } = await firestoreFetch(accessToken, `/${resourcePath}`);
  if (status === 404) return null;
  if (status !== 200) {
    fail(`Firestore read ${resourcePath} failed (${status}): ${payload?.error?.message || 'unknown'}`);
  }
  return decodeFields(payload?.fields);
}

async function listDocuments(accessToken, collectionPath) {
  const documents = [];
  let pageToken = '';
  do {
    const suffix = pageToken ? `?pageSize=300&pageToken=${encodeURIComponent(pageToken)}` : '?pageSize=300';
    const { status, payload } = await firestoreFetch(accessToken, `/${collectionPath}${suffix}`);
    if (status !== 200) {
      fail(`Firestore list ${collectionPath} failed (${status}): ${payload?.error?.message || 'unknown'}`);
    }
    for (const doc of payload?.documents || []) {
      documents.push({ id: String(doc.name || '').split('/').pop(), ...decodeFields(doc.fields) });
    }
    pageToken = String(payload?.nextPageToken || '');
  } while (pageToken);
  return documents;
}

async function commitDocument(accessToken, resourcePath, record, { preserveCreatedAt } = {}) {
  const fields = firestoreFields(record);
  delete fields.createdAt;
  delete fields.updatedAt;
  const updateTransforms = [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }];
  if (preserveCreatedAt instanceof Date) {
    fields.createdAt = firestoreValue(preserveCreatedAt);
  } else {
    updateTransforms.unshift({ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' });
  }
  const { status, payload } = await firestoreFetch(accessToken, ':commit', {
    method: 'POST',
    body: {
      writes: [
        {
          update: {
            name: `projects/${PROJECT_ID}/databases/(default)/documents/${resourcePath}`,
            fields,
          },
          updateTransforms,
        },
      ],
    },
  });
  if (status !== 200) {
    fail(`Firestore commit ${resourcePath} failed (${status}): ${payload?.error?.message || 'unknown'}`);
  }
}

async function resolveSubmitterUid(app, email) {
  if (email) {
    try {
      const user = await getAuth(app).getUserByEmail(email);
      if (user?.uid) return user.uid;
    } catch {
      // Fall through to the explicit manual marker.
    }
  }
  return 'leadership-manual-entry';
}

async function main() {
  const overwrite = process.argv.includes('--overwrite');
  for (const entry of ENTRIES) validatePowerValues(entry);

  const { app, accessToken, email } = await createAdminContext();
  const submittedByUid = await resolveSubmitterUid(app, email);
  console.log(`Authenticated as ${email || '(unknown)'}; submittedByUid=${submittedByUid}`);

  const config = await readDocument(accessToken, 'boh_allstar_config/current');
  const seasonId = String(config?.activeSeason || '');
  if (!seasonId) fail('boh_allstar_config/current has no activeSeason');
  console.log(`Active season: ${seasonId}`);

  const submissions = await listDocuments(accessToken, `boh_allstar/${seasonId}/submissions`);
  const submitted = submissions.filter((doc) => doc.status === 'submitted');
  console.log(`${submitted.length} submitted signups in ${seasonId}`);

  for (const entry of ENTRIES) {
    const matches = submitted.filter((doc) => foldName(doc.gameName) === foldName(entry.gameName));
    if (matches.length !== 1) {
      const near = submitted
        .filter((doc) => foldName(doc.gameName).includes(foldName(entry.gameName).slice(0, 3)))
        .map((doc) => `${doc.gameName} [${doc.id}]`)
        .join(', ');
      fail(
        `${entry.gameName}: expected exactly 1 submitted signup, found ${matches.length}.` +
          (near ? ` Near: ${near}` : '')
      );
    }
    const signup = matches[0];
    const scorePath = `boh_allstar/${seasonId}/raceScores/${signup.id}`;
    const existing = await readDocument(accessToken, scorePath);
    if (existing && !overwrite) {
      fail(
        `${entry.gameName}: a final score already exists ` +
          `(revision ${existing.revision}, total ${existing.powerValues?.totalCastlePower}). ` +
          'Rerun with --overwrite to replace it.'
      );
    }
    const revision = existing && Number.isInteger(existing.revision) ? existing.revision + 1 : 1;
    const record = {
      schemaVersion: VTS_SCORE_RECORD_SCHEMA_VERSION,
      seasonId,
      submissionUid: signup.id,
      gameName: String(signup.gameName),
      baselineSubmissionRevision: Number.isInteger(signup.revision) ? signup.revision : 0,
      powerValues: entry.powerValues,
      ocr: {
        requestId: MANUAL_OCR_REQUEST_ID,
        sourceValues: entry.powerValues,
        confidence: Object.fromEntries(POWER_FIELDS.map((field) => [field, null])),
        correctedFields: [],
      },
      submittedByUid: existing?.submittedByUid || submittedByUid,
      revision,
      createdAt: null, // set via REQUEST_TIME transform on create
      updatedAt: null, // set via REQUEST_TIME transform
    };
    const preserveCreatedAt =
      existing?.createdAt && !Number.isNaN(Date.parse(existing.createdAt))
        ? new Date(existing.createdAt)
        : undefined;
    await commitDocument(accessToken, scorePath, record, { preserveCreatedAt });
    const written = await readDocument(accessToken, scorePath);
    if (!written || written.powerValues?.totalCastlePower !== entry.powerValues.totalCastlePower) {
      fail(`${entry.gameName}: read-back verification failed`);
    }
    console.log(
      `OK ${written.gameName} [${written.submissionUid}] revision ${written.revision}: ` +
        `total=${Number(written.powerValues.totalCastlePower).toLocaleString('en-US')} ` +
        `troop=${Number(written.powerValues.troopPower).toLocaleString('en-US')} ` +
        `dragon=${Number(written.powerValues.dragonPower).toLocaleString('en-US')}`
    );
  }
  console.log('Manual VtsScore entries complete.');
}

main().catch((error) => fail(error?.message || String(error)));
