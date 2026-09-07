// One-off sign-up baseline correction for Dr Thund€r. Writes corrected
// troopPower and totalCastlePower to the submission document in
// boh_allstar/{season}/submissions/{submissionUid}. Does NOT touch raceScores.
//
// Auth: firebase-tools CLI apiv2 Client (auto token refresh).
//
// Usage: node scripts/firestore-correct-baseline.mjs

import { createRequire } from 'node:module';

const PROJECT_ID = 'abocombo';

const TARGET_NAME = 'Dr Thund€r';
const CORRECT_TROOP_POWER = 470_233_322;
const CORRECT_TOTAL_POWER = 534_061_498;

const require = createRequire(import.meta.url);
const { configstore } = require('firebase-tools/lib/configstore');
const { clientId, clientSecret } = require('firebase-tools/lib/api');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');

const FIRESTORE_DOCS = `/projects/${PROJECT_ID}/databases/(default)/documents`;

function fail(message) {
  console.error(`ABORT: ${message}`);
  process.exit(1);
}

function foldName(value) {
  return String(value || '')
    .normalize('NFC')
    .trim()
    .toLocaleLowerCase('en');
}

function firestoreFields(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined).map(([key, value]) => [key, firestoreValue(value)])
  );
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'boolean') return { booleanValue: value };
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
  return new Client({
    urlPrefix: 'https://firestore.googleapis.com',
    apiVersion: 'v1',
  });
}

async function readDocument(firestore, resourcePath) {
  const response = await firestore.get(resourcePath);
  if (response.status === 404) return null;
  if (response.status !== 200) {
    fail(`Firestore read ${resourcePath} failed (${response.status}): ${response.body?.error?.message || 'unknown'}`);
  }
  return decodeFields(response.body?.fields);
}

async function listDocuments(firestore, collectionPath) {
  const documents = [];
  let pageToken = '';
  do {
    const suffix = pageToken ? `?pageSize=300&pageToken=${encodeURIComponent(pageToken)}` : '?pageSize=300';
    const response = await firestore.get(`${collectionPath}${suffix}`);
    if (response.status !== 200) {
      fail(`Firestore list ${collectionPath} failed (${response.status}): ${response.body?.error?.message || 'unknown'}`);
    }
    for (const doc of response.body?.documents || []) {
      documents.push({ id: String(doc.name || '').split('/').pop(), ...decodeFields(doc.fields) });
    }
    pageToken = String(response.body?.nextPageToken || '');
  } while (pageToken);
  return documents;
}

async function commitDocument(firestore, resourcePath, record, { preserveCreatedAt } = {}) {
  const fields = firestoreFields(record);
  delete fields.createdAt;
  delete fields.updatedAt;
  const updateTransforms = [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }];
  if (preserveCreatedAt instanceof Date) {
    fields.createdAt = firestoreValue(preserveCreatedAt);
  } else {
    updateTransforms.unshift({ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' });
  }
  const response = await firestore.post(`/projects/${PROJECT_ID}/databases/(default)/documents:commit`, {
    writes: [
      {
        update: {
          name: resourcePath.replace(/^\//, ''),
          fields,
        },
        updateTransforms,
      },
    ],
  });
  if (response.status !== 200) {
    fail(`Firestore commit ${resourcePath} failed (${response.status}): ${response.body?.error?.message || 'unknown'}`);
  }
}

async function main() {
  const firestore = await createAdminContext();
  console.log(`Authenticated via firebase-tools CLI`);

  const config = await readDocument(firestore, `${FIRESTORE_DOCS}/boh_allstar_config/current`);
  const seasonId = String(config?.activeSeason || '');
  if (!seasonId) fail('boh_allstar_config/current has no activeSeason');
  console.log(`Active season: ${seasonId}`);

  const submissions = await listDocuments(firestore, `${FIRESTORE_DOCS}/boh_allstar/${seasonId}/submissions`);
  const submitted = submissions.filter((doc) => doc.status === 'submitted');
  console.log(`${submitted.length} submitted signups in ${seasonId}`);

  const targetFolded = foldName(TARGET_NAME);
  const matches = submitted.filter((doc) => foldName(doc.gameName) === targetFolded);
  if (matches.length !== 1) {
    const near = submitted
      .filter((doc) => foldName(doc.gameName).includes(targetFolded.slice(0, 3)))
      .map((doc) => `${doc.gameName} [${doc.id}]`)
      .join(', ');
    fail(
      `${TARGET_NAME}: expected exactly 1 submitted signup, found ${matches.length}.` +
        (near ? ` Near: ${near}` : '')
    );
  }

  const signup = matches[0];
  const submissionPath = `${FIRESTORE_DOCS}/boh_allstar/${seasonId}/submissions/${signup.id}`;
  console.log(`Found: ${signup.gameName} [${signup.id}] revision=${signup.revision}`);
  console.log(`Current stats: troopPower=${signup.stats?.troopPower}, totalCastlePower=${signup.stats?.totalCastlePower}`);
  if (signup.confirmedStats) {
    console.log(`Current confirmedStats: troopPower=${signup.confirmedStats.troopPower}, totalCastlePower=${signup.confirmedStats.totalCastlePower}`);
  }

  const updated = {
    ...signup,
    stats: {
      ...signup.stats,
      troopPower: CORRECT_TROOP_POWER,
      totalCastlePower: CORRECT_TOTAL_POWER,
    },
    confirmedStats: signup.confirmedStats
      ? {
          ...signup.confirmedStats,
          troopPower: CORRECT_TROOP_POWER,
          totalCastlePower: CORRECT_TOTAL_POWER,
        }
      : undefined,
    revision: (Number.isInteger(signup.revision) ? signup.revision : 0) + 1,
  };
  delete updated.id;
  delete updated.createdAt;
  delete updated.updatedAt;

  const preserveCreatedAt =
    signup?.createdAt && !Number.isNaN(Date.parse(signup.createdAt))
      ? new Date(signup.createdAt)
      : undefined;

  await commitDocument(firestore, submissionPath, updated, { preserveCreatedAt });

  const written = await readDocument(firestore, submissionPath);
  if (!written) fail('Read-back: document not found');
  const newTroop = written.stats?.troopPower;
  const newTotal = written.stats?.totalCastlePower;
  if (newTroop !== CORRECT_TROOP_POWER || newTotal !== CORRECT_TOTAL_POWER) {
    fail(
      `Read-back verification failed: stats troop=${newTroop} (expected ${CORRECT_TROOP_POWER}), ` +
        `total=${newTotal} (expected ${CORRECT_TOTAL_POWER})`
    );
  }
  if (written.confirmedStats) {
    const ct = written.confirmedStats.troopPower;
    const ctt = written.confirmedStats.totalCastlePower;
    if (ct !== CORRECT_TROOP_POWER || ctt !== CORRECT_TOTAL_POWER) {
      fail(
        `Read-back verification failed: confirmedStats troop=${ct} (expected ${CORRECT_TROOP_POWER}), ` +
          `total=${ctt} (expected ${CORRECT_TOTAL_POWER})`
      );
    }
    console.log(`confirmedStats: troop=${ct.toLocaleString('en-US')}, total=${ctt.toLocaleString('en-US')}`);
  }
  console.log(`stats: troop=${newTroop.toLocaleString('en-US')}, total=${newTotal.toLocaleString('en-US')}`);
  console.log(`revision: ${written.revision}`);
  console.log('Baseline correction complete.');
}

main().catch((error) => fail(error?.message || String(error)));