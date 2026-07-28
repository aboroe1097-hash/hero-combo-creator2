import { getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { createUnlockAllStarBohHandler } from './src/all-star-boh-auth.js';
import { createVtsScoreHandler } from './src/vts-score.js';

const firebaseApp = getApps()[0] || initializeApp();
const firestore = getFirestore(firebaseApp);
const memberPin = defineSecret('BOH_MEMBER_PIN');
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
