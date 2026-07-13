import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

import { getAuth } from 'firebase-admin/auth';
import { initializeApp, refreshToken } from 'firebase-admin/app';

import { firebaseConfig } from '../js/firebase-config.js';

const PROJECT_ID = 'abocombo';
const TEST_UID = 'arcade-cloud-verify-contract';
const TEST_EMAIL = 'arcade-cloud-verify-contract@example.invalid';
const TEST_NAME = 'Arcade Cloud Verify';
const TEST_STATE = 'TEST';
const TEST_GAME = 'merge_rush';
const TEST_SCORE = 1;

const require = createRequire(import.meta.url);
const { configstore } = require('firebase-tools/lib/configstore');
const { clientId, clientSecret } = require('firebase-tools/lib/api');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');

function firestoreValue(value) {
  if (typeof value === 'number') return { integerValue: String(value) };
  return { stringValue: value };
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
  const credential = refreshToken({
    type: 'authorized_user',
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: tokens.refresh_token,
  });
  const app = initializeApp({ credential, projectId: PROJECT_ID });
  return {
    auth: getAuth(app),
    firestore: new Client({
      urlPrefix: 'https://firestore.googleapis.com',
      apiVersion: 'v1',
    }),
  };
}

async function signInTestUser(password) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password, returnSecureToken: true }),
    }
  );
  const body = await response.json();
  assert.equal(response.status, 200, `Disposable Firebase sign-in failed: ${body.error?.message}`);
  assert.equal(body.localId, TEST_UID);
  assert.ok(body.idToken, 'Disposable Firebase sign-in did not return an ID token');
  return body.idToken;
}

async function commitScore(idToken, score) {
  const documentName = `projects/${PROJECT_ID}/databases/(default)/documents/arcade_scores/${TEST_GAME}__${TEST_UID}`;
  return fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: documentName,
              fields: {
                gameId: firestoreValue(TEST_GAME),
                uid: firestoreValue(TEST_UID),
                name: firestoreValue(TEST_NAME),
                state: firestoreValue(TEST_STATE),
                score: firestoreValue(score),
              },
            },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
          },
        ],
      }),
    }
  );
}

async function readScore(idToken) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/arcade_scores/${TEST_GAME}__${TEST_UID}`,
    { headers: { authorization: `Bearer ${idToken}` } }
  );
  const body = await response.json();
  assert.equal(response.status, 200, `Firestore client read failed: ${body.error?.message}`);
  return body.fields || {};
}

async function cleanup({ auth, firestore }) {
  try {
    await firestore.delete(
      `/projects/${PROJECT_ID}/databases/(default)/documents/arcade_scores/${encodeURIComponent(`${TEST_GAME}__${TEST_UID}`)}`,
      { skipLog: { resBody: true } }
    );
  } catch {
    // Missing cleanup targets are expected after a successful prior run.
  }
  try {
    await auth.deleteUser(TEST_UID);
  } catch {
    // Missing cleanup targets are expected after a successful prior run.
  }
}

async function assertCleanup({ auth, firestore }) {
  await assert.rejects(
    auth.getUser(TEST_UID),
    (error) => error?.code === 'auth/user-not-found',
    'Temporary Firebase Auth user was not deleted'
  );
  const response = await firestore.post(
    `/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      structuredQuery: {
        from: [{ collectionId: 'arcade_scores' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'uid' },
            op: 'EQUAL',
            value: { stringValue: TEST_UID },
          },
        },
      },
    },
    { skipLog: { resBody: true } }
  );
  assert.equal(
    response.body.some((entry) => entry.document),
    false,
    'Temporary Arcade verification row was not deleted'
  );
}

async function main() {
  assert.ok(firebaseConfig.apiKey, 'Firebase web API key is not configured');
  const admin = await createAdminContext();
  const password = `${randomBytes(18).toString('base64url')}Aa1!`;

  await cleanup(admin);
  try {
    await admin.auth.createUser({ uid: TEST_UID, email: TEST_EMAIL, password });
    const idToken = await signInTestUser(password);
    const write = await commitScore(idToken, TEST_SCORE);
    const writeBody = await write.json();
    assert.equal(write.status, 200, `Firestore client write failed: ${writeBody.error?.message}`);

    const lowerWrite = await commitScore(idToken, 0);
    assert.equal(lowerWrite.status, 403, 'Firestore accepted a lower Arcade best score');

    const fields = await readScore(idToken);
    assert.deepEqual(
      {
        gameId: fields.gameId?.stringValue,
        name: fields.name?.stringValue,
        score: Number(fields.score?.integerValue),
        state: fields.state?.stringValue,
        uid: fields.uid?.stringValue,
      },
      {
        gameId: TEST_GAME,
        name: TEST_NAME,
        score: TEST_SCORE,
        state: TEST_STATE,
        uid: TEST_UID,
      }
    );
  } finally {
    await cleanup(admin);
  }
  await assertCleanup(admin);
  console.log('Arcade Firestore write/read, monotonic-best rules, and cleanup verified.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
