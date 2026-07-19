import assert from 'node:assert/strict';
import test from 'node:test';

import * as BohModel from '../../js/all-star-boh-model.js';
import { buildBohSubmissionPayload } from '../../js/all-star-boh.js';
import { createAllStarBohPlayerStore } from '../../js/all-star-boh-store.js';

function validSignup() {
  return {
    gameName: '玩家 ١٠٩٧',
    timezone: 'Africa/Cairo',
    totalCastlePower: '1000000000',
    troopPower: '400000000',
    buildingPower: '100000000',
    technologyPower: '200000000',
    heroCombatPower: '200000000',
    dragonPower: '100000000',
    unitSpecialtyPower: '50000000',
    t9Types: ['cavalry', 'archers'],
    speedHeroes: ['lionheart'],
    level50Heroes: '8',
    rocLevel: '12',
    availability: 'all',
    fightingTimeIds: ['+12', '+14'],
    preferredRole: 'offensive',
    leadershipInterest: 'no',
    vts1097Member: 'yes',
    unavailableTimes: '',
    canTeleport: 'on',
    canUseVoice: 'on',
    planCommitment: 'on',
    playerNotes: '',
  };
}

function createWriteCaptureFirestore() {
  let written = null;
  return {
    firestore: {
      doc(_db, path) {
        return { path };
      },
      async getDoc() {
        return { exists: () => false, data: () => undefined };
      },
      onSnapshot() {
        return () => {};
      },
      async runTransaction(_db, callback) {
        return callback({
          async get() {
            return { exists: () => false, data: () => undefined };
          },
          set(_ref, value) {
            written = value;
          },
        });
      },
      serverTimestamp() {
        return { __serverTimestamp: true };
      },
    },
    getWritten() {
      return written;
    },
  };
}

test('player store persists the authenticated uid even when model normalization derives a name id', async () => {
  const uid = 'firebase-anonymous-uid-1097';
  const seasonId = 'season-2026';
  let derivedPlayerId = '';
  const observingModel = {
    normalizeBohSignup(input) {
      const normalized = BohModel.normalizeBohSignup(input);
      derivedPlayerId = normalized.playerId;
      return normalized;
    },
  };
  const payload = buildBohSubmissionPayload(validSignup(), {
    model: observingModel,
    language: 'zh',
    now: 1_721_200_000_000,
  });
  assert.match(
    derivedPlayerId,
    /^boh-player-/u,
    'the model precondition should derive a name-based planning ID'
  );
  assert.equal(
    payload.playerId,
    undefined,
    'the client payload must not claim a persisted identity'
  );

  const capture = createWriteCaptureFirestore();
  const store = createAllStarBohPlayerStore({
    db: {},
    firestore: capture.firestore,
    seasonId,
    uid,
  });
  await store.saveSubmission(payload, { expectedRevision: 0 });

  assert.equal(
    capture.getWritten()?.playerId,
    uid,
    'Firestore requires submission.playerId to equal the authenticated document UID'
  );
});
