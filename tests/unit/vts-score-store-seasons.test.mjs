// PR #257 regression pin. The admin growth preview used to read the seasons
// collection to find earlier seasons, but the boh_allstar season parents were
// never written as documents, so the client read zero prior seasons and every
// baseline silently collapsed to the sign-up stats (MalakAbo showed no 2026
// match while the server matched him fine — the Admin SDK lists subcollection
// ids, the client SDK cannot). The preview must read raceScores as a
// collection group, take the season from each doc's path, and fall back to the
// 2026 baseline season — never to a bare seasons-collection listing.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const store = readFileSync('js/vts-score-store.js', 'utf8');

test('the admin preview finds prior seasons without parent documents', () => {
  assert.match(store, /collectionGroup\(db, 'raceScores'\)/);
  assert.match(
    store,
    /entry\.ref\?\.parent\?\.parent\?\.id/,
    'the season id comes from the document path'
  );
  assert.doesNotMatch(
    store,
    /getDocs\(collection\(db, 'boh_allstar'\)\)/,
    'the seasons collection listing is what returned nothing'
  );
  assert.match(
    store,
    /getVtsScoreRaceScoresPath\(COMPETITION_BASELINE_SEASON\)/,
    'a failed group query still loads the 2026 baseline season'
  );
});
