import assert from 'node:assert/strict';
import test from 'node:test';

import { createCompetitionGrowthSection } from '../../js/vts-score-admin-view.js';
import { DEAD_TROOP_COUNT_KEYS } from '../../js/dead-troops.js';

const DEAD_TROOP_COUNTS = Object.fromEntries(DEAD_TROOP_COUNT_KEYS.map((key) => [key, 0]));

test('the admin comparison is read-only and previews an automatic unique name match', async () => {
  const section = createCompetitionGrowthSection({
    t: (key) => key,
    num: String,
    signed: String,
    load: async () => ({
      season: 'competition-12',
      submissions: [
        {
          submissionUid: 'new',
          status: 'submitted',
          gameName: 'MalakAbo',
          stats: { totalCastlePower: 1000 },
          commitment: { publicComparisonConsent: true },
        },
      ],
      raceScores: [
        {
          submissionUid: 'new',
          schemaVersion: 2,
          powerValues: { totalCastlePower: 1200 },
          deadTroopCounts: DEAD_TROOP_COUNTS,
          updatedAt: 2000,
        },
      ],
      baselineRaceScores: [
        {
          submissionUid: 'old',
          gameName: 'MalakAbo',
          schemaVersion: 2,
          powerValues: { totalCastlePower: 800 },
          deadTroopCounts: DEAD_TROOP_COUNTS,
        },
      ],
      schedule: { reuploadOpensAt: 1000, reuploadClosesAt: 3000 },
    }),
  });
  const element = { innerHTML: '', querySelectorAll: () => [] };
  section.mount(element);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.match(element.innerHTML, /MalakAbo/);
  assert.match(element.innerHTML, /c12SourceVtsScore/);
  assert.doesNotMatch(element.innerHTML, /data-comp12-(publish|save|server|candidate)/);
});
