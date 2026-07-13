import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { setTimeout as delay } from 'node:timers/promises';

import { chromium } from '@playwright/test';

const PROJECT_ID = 'abocombo';
const TEST_NAME = 'Arcade Cloud Verify';
const TEST_STATE = 'TEST';
const TEST_GAME = 'merge_rush';
const TEST_SCORE = 1;

const require = createRequire(import.meta.url);
const { configstore } = require('firebase-tools/lib/configstore');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');

function parseBaseUrl(value) {
  const url = new URL(String(value || ''));
  assert.equal(url.protocol, 'https:', 'Arcade cloud verification requires HTTPS');
  assert.match(
    url.hostname,
    /^abocombo--[a-z0-9-]+-[a-z0-9]+\.web\.app$/,
    'Arcade cloud verification only runs against an abocombo Firebase preview channel'
  );
  return url.origin;
}

async function authenticateFirebaseCli() {
  const options = {
    project: PROJECT_ID,
    projectRoot: process.cwd(),
    user: configstore.get('user'),
    tokens: configstore.get('tokens'),
  };
  await requireAuth(options);
}

async function createFirestoreClient() {
  await authenticateFirebaseCli();
  return new Client({
    urlPrefix: 'https://firestore.googleapis.com',
    apiVersion: 'v1',
  });
}

async function queryTestScores(client) {
  const response = await client.post(
    `/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      structuredQuery: {
        from: [{ collectionId: 'arcade_scores' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'name' },
            op: 'EQUAL',
            value: { stringValue: TEST_NAME },
          },
        },
      },
    },
    { skipLog: { resBody: true } }
  );
  return response.body.flatMap((entry) => (entry.document ? [entry.document] : []));
}

async function deleteTestScores(client) {
  const rows = await queryTestScores(client);
  for (const row of rows) {
    const documentPath = row.name.split('/documents/')[1];
    if (!documentPath?.startsWith('arcade_scores/')) continue;
    const response = await client.delete(
      `/projects/${PROJECT_ID}/databases/(default)/documents/${documentPath}`,
      { skipLog: { resBody: true } }
    );
    assert.equal(response.status, 200, 'Temporary Arcade verification row was not deleted');
  }
}

async function waitForTestScore(client) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const rows = await queryTestScores(client);
    const row = rows.find((entry) => entry.fields?.gameId?.stringValue === TEST_GAME);
    if (row) return row;
    await delay(2_000);
  }
  throw new Error('Timed out waiting for the Arcade score in Firestore');
}

async function main() {
  const baseUrl = parseBaseUrl(process.argv[2]);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const browserErrors = [];
  const firestore = await createFirestoreClient();

  await deleteTestScores(firestore);

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      browserErrors.push(`[${message.type()}] ${message.text()}`);
    }
  });

  try {
    await page.addInitScript(
      ({ gameId, score }) => {
        localStorage.setItem(`vts_proto_${gameId}`, String(score));
        localStorage.removeItem('vts_arcade_profile');
        localStorage.removeItem('vts_arcade_pending_scores');
      },
      { gameId: TEST_GAME, score: TEST_SCORE }
    );
    await page.goto(`${baseUrl}/arcade.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#arcadeLobby').waitFor({ state: 'visible', timeout: 30_000 });
    await page.locator('.arcade-profile-edit').click();
    await page.locator('.arcade-input-name').fill(TEST_NAME);
    await page.locator('.arcade-input-state').fill(TEST_STATE);
    await page.locator('.arcade-profile-form button[type="submit"]').click();
    await page.locator('.arcade-sync-pill.is-synced').waitFor({ timeout: 45_000 });
    await page.locator('[data-board="merge_rush"]').click();
    await page
      .locator('.arcade-lb-row', { hasText: TEST_NAME })
      .waitFor({ state: 'visible', timeout: 45_000 });

    const result = await waitForTestScore(firestore);
    const fields = result.fields || {};
    assert.deepEqual(
      {
        gameId: fields.gameId?.stringValue,
        name: fields.name?.stringValue,
        score: Number(fields.score?.integerValue),
        state: fields.state?.stringValue,
      },
      { gameId: TEST_GAME, name: TEST_NAME, score: TEST_SCORE, state: TEST_STATE }
    );
    assert.ok(fields.uid?.stringValue, 'Anonymous Firebase auth did not persist a uid');
    console.log(`Arcade cloud write/read verified against ${baseUrl}`);
  } catch (error) {
    if (browserErrors.length) console.error(browserErrors.join('\n'));
    throw error;
  } finally {
    try {
      await browser.close();
    } finally {
      await deleteTestScores(firestore);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
