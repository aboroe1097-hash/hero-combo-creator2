import { getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { createUnlockAllStarBohHandler } from './src/all-star-boh-auth.js';
import { createVtsScoreHandler } from './src/vts-score.js';
import {
  constantTimePinMatches,
  extractAppCheckToken,
  extractBearerToken,
  isAllowedAllStarBohOrigin,
  issueAllStarBohGrant,
} from './src/all-star-boh-auth.js';

const firebaseApp = getApps()[0] || initializeApp();
const firestore = getFirestore(firebaseApp);
const memberPin = defineSecret('BOH_MEMBER_PIN');
const vtsComp11Pin = defineSecret('VTS_COMP11_PIN');
const throttlePepper = defineSecret('BOH_THROTTLE_PEPPER');

const handler = createUnlockAllStarBohHandler({
  auth: getAuth(firebaseApp),
  appCheck: getAppCheck(firebaseApp),
  db: firestore,
  getMemberPin: () => memberPin.value(),
  getThrottlePepper: () => throttlePepper.value(),
  timestampFromMillis: (value) => Timestamp.fromMillis(value),
  serverTimestamp: () => FieldValue.serverTimestamp(),
});

export const unlockAllStarBoh = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
    concurrency: 20,
    cors: false,
    secrets: [memberPin, throttlePepper],
  },
  handler
);

const vtsScoreHandler = createVtsScoreHandler({
  auth: getAuth(firebaseApp),
  appCheck: getAppCheck(firebaseApp),
  db: firestore,
  serverTimestamp: () => FieldValue.serverTimestamp(),
});

function addCors(response, origin) {
  response.set('Access-Control-Allow-Origin', origin);
  response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Firebase-AppCheck');
  response.set('Vary', 'Origin');
}

async function verifyAuth(dependencies, request) {
  try {
    const decoded = await dependencies.auth.verifyIdToken(extractBearerToken(request), true);
    if (!decoded?.uid) throw new Error();
    await dependencies.appCheck.verifyToken(extractAppCheckToken(request));
    return decoded.uid;
  } catch {
    throw new Error('Auth failed');
  }
}

const vtsComp11Handler = async (request, response) => {
  const origin = (request.get('origin') || '').trim().toLowerCase();
  if (!isAllowedAllStarBohOrigin(origin)) {
    response.status(403).json({ error: 'origin_denied' });
    return;
  }
  addCors(response, origin);
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  if (request.method !== 'POST') {
    response.set('Allow', 'POST, OPTIONS');
    response.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const uid = await verifyAuth(
      { auth: getAuth(firebaseApp), appCheck: getAppCheck(firebaseApp) },
      request
    );
    const pin = String(request.body?.pin || '');
    if (!pin || pin.length > 128) {
      response.status(400).json({ error: 'invalid_request' });
      return;
    }
    if (!constantTimePinMatches(pin, vtsComp11Pin.value())) {
      response.status(403).json({ error: 'access_denied' });
      return;
    }
    const grant = await issueAllStarBohGrant({
      db: firestore,
      uid,
      nowMs: Date.now(),
      timestampFromMillis: (value) => Timestamp.fromMillis(value),
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
    response.status(200).json({ season: grant.season, expiresAt: grant.expiresAt });
  } catch {
    response.status(401).json({ error: 'unauthorized' });
  }
};

export const unlockVtsScore = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
    concurrency: 20,
    cors: false,
    secrets: [vtsComp11Pin],
  },
  vtsComp11Handler
);

export const vtsScore = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
    concurrency: 20,
    cors: false,
  },
  vtsScoreHandler
);
