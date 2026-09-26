import { getApps, initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { createUnlockAllStarBohHandler } from './src/all-star-boh-auth.js';
import { createBohSignupAdminHandler } from './src/boh-signup-admin.js';
import { autoPublishCompetitionBoard } from './src/competition-board.js';
import { createCompetitionPhaseSyncJob } from './src/competition-phase.js';
import { createComplaintRetentionJob } from './src/complaint-retention.js';
import { createSetUserRoleHandler } from './src/user-roles.js';
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

const setUserRoleHandler = createSetUserRoleHandler({
  auth: getAuth(firebaseApp),
  db: firestore,
});

// Leadership's manual add/edit path for season signups. firestore.rules keeps
// the submissions collection owner-written (a test pins that admins never get
// create/update there), so this endpoint is the only administrative writer. It
// re-checks the admin custom claim itself — see src/boh-signup-admin.js.
const bohSignupAdminHandler = createBohSignupAdminHandler({
  auth: getAuth(firebaseApp),
  appCheck: getAppCheck(firebaseApp),
  db: firestore,
  serverTimestamp: () => FieldValue.serverTimestamp(),
});

export const bohSignupAdmin = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
    concurrency: 20,
    cors: false,
  },
  bohSignupAdminHandler
);

// onCall rather than onRequest: the callable protocol verifies the caller's ID
// token and hands the decoded claims to the handler, which is exactly the
// authority this decision rests on. The handler stays free of
// firebase-functions imports and signals failure with RoleError, mapped here.
export const setUserRole = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 5,
  },
  async (request) => {
    try {
      return await setUserRoleHandler(request);
    } catch (error) {
      if (error?.name === 'RoleError') throw new HttpsError(error.code, error.message);
      // Anything else propagates untouched. The callable runtime logs it
      // server-side and returns a generic INTERNAL to the caller, so the real
      // message — which can carry uids or internal paths — never reaches the
      // client and nothing is logged from this entrypoint.
      throw error;
    }
  }
);

// Complaint screenshots are kept only while leadership reviews them: once a
// day, every screenshot older than 30 days is deleted (the complaint text
// stays), which keeps Storage far inside the free tier. One small daily run on
// Cloud Scheduler's free allowance.
const purgeComplaintImagesJob = createComplaintRetentionJob({
  db: firestore,
  bucket: getStorage(firebaseApp).bucket(),
  serverTimestamp: () => FieldValue.serverTimestamp(),
});

export const purgeComplaintImages = onSchedule(
  {
    schedule: 'every day 04:00',
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 120,
    maxInstances: 1,
    retryCount: 0,
  },
  async () => {
    // The entrypoint logs nothing (see the security tests); the run's counts are
    // visible in the function's execution history.
    await purgeComplaintImagesJob();
  }
);

// Competition #12: firestore.rules reads `open` and `acceptNewSignups` on the
// season config rather than the schedule (the member write path has no
// expression budget for it), so every ten minutes this job derives both flags
// from the schedule's current phase and writes them only when they change.
const syncCompetitionPhaseJob = createCompetitionPhaseSyncJob({ db: firestore });

export const syncCompetitionPhase = onSchedule(
  {
    schedule: 'every 10 minutes',
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
    maxInstances: 1,
    retryCount: 0,
  },
  async () => {
    // Logs nothing, like every entrypoint here (see the security tests); the
    // run's outcome is visible in the function's execution history.
    await syncCompetitionPhaseJob();
    // Once the re-upload window has closed, publish the growth board built
    // from the season's records (once; a later superadmin rebuild wins). It
    // reads three small documents per run and the scores only when a build is due.
    await autoPublishCompetitionBoard({
      db: firestore,
      now: Date.now,
      serverTimestamp: () => FieldValue.serverTimestamp(),
    });
  }
);
