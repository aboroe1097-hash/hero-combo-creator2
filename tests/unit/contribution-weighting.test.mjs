import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { compactPlayerIdentity, state } = await import('../../js/ocr-shared.js');
const { buildWeightedContributionRows, buildWeightedDutyCounts, getLatestContributionRecord } =
  await import('../../js/contribution-weighting.js');

const TEST_ROSTER_NAMES = ['~Sarafino~', 'UNDEAD', 'ANGEL', 'Zubbs', 'Kika'];

function withRosterNames(callback) {
  const previousRosterNames = state.rosterNames;
  state.rosterNames = TEST_ROSTER_NAMES.slice();
  try {
    return callback();
  } finally {
    state.rosterNames = previousRosterNames;
  }
}

test('weighted contribution rows join contribution, duty counts, and signed R5 conduct', () => {
  withRosterNames(() => {
    const season = 'eden-x1-2026';
    const model = buildWeightedContributionRows({
      season,
      contributionRecords: [
        {
          id: 'contrib-1',
          date: '2026-06-25',
          premiumCutoff: 1,
          entries: [
            { rank: '1', name: '(Vts)Sarafina~', contribution: '200,000' },
            { rank: '2', name: 'Undead_Banner', contribution: '100,000' },
          ],
        },
      ],
      dutyRecords: [
        { type: 'pather', entries: [{ name: 'Sarafina~', confirmed: 'Sarafina~' }] },
        { type: 'speed_tile', entries: [{ name: '~Sarafino~', confirmed: '~Sarafino~' }] },
        { type: 'shield_wall', entries: [{ name: '~Sarafino~', confirmed: '~Sarafino~' }] },
        { type: 'banner', entries: [{ name: 'UNDEAD Banner', confirmed: 'UNDEAD' }] },
      ],
      r5Adjustments: [
        { season, player: '~Sarafino~', points: 20000, category: 'extra_effort' },
        { season, player: 'UNDEAD', points: -10000, category: 'ignored_coordination' },
      ],
    });

    const sarafino = model.rows.find((row) => row.playerKey === compactPlayerIdentity('Sarafino'));
    const undead = model.rows.find((row) => row.playerKey === compactPlayerIdentity('UNDEAD'));

    assert.equal(model.premiumCutoff, 1);
    assert.equal(sarafino.pathers, 2);
    assert.equal(sarafino.shieldWalls, 1);
    assert.equal(sarafino.conductBonus, 20000);
    assert.equal(sarafino.finalRank, 1);
    assert.equal(sarafino.finalReward, 'premium');
    assert.equal(Number(sarafino.weightedScore.toFixed(1)), 85);

    assert.equal(undead.banners, 1);
    assert.equal(undead.conductBonus, -10000);
    assert.equal(undead.currentReward, 'standard');
    assert.equal(undead.finalReward, 'standard');
    assert.equal(Number(undead.weightedScore.toFixed(1)), 35);
  });
});

test('weighted duty counts credit both banner account and operator when present', () => {
  withRosterNames(() => {
    const counts = buildWeightedDutyCounts([
      { type: 'banner', entries: [{ name: 'Angel Banner (zubbs)', confirmed: 'ANGEL' }] },
    ]);

    assert.equal(counts.get(compactPlayerIdentity('ANGEL')).banners, 1);
    assert.equal(counts.get(compactPlayerIdentity('Zubbs')).banners, 1);
  });
});

test('latest contribution record selection uses newest date and premiumSlots fallback', () => {
  withRosterNames(() => {
    const contributionRecords = [
      {
        id: 'older',
        date: '2026-06-24',
        premiumCutoff: 10,
        entries: [{ rank: 1, name: 'Kika', contribution: 100 }],
      },
      {
        id: 'newer',
        date: '2026-06-25',
        premiumSlots: 1,
        entries: [
          { rank: 1, name: 'Kika', contribution: 100 },
          { rank: 2, name: 'UNDEAD', contribution: 90 },
        ],
      },
    ];

    assert.equal(getLatestContributionRecord(contributionRecords).id, 'newer');

    const model = buildWeightedContributionRows({ contributionRecords });
    assert.equal(model.premiumCutoff, 1);
    assert.deepEqual(
      model.rows.map((row) => [row.playerKey, row.currentReward, row.finalReward]),
      [
        [compactPlayerIdentity('Kika'), 'premium', 'premium'],
        [compactPlayerIdentity('UNDEAD'), 'standard', 'standard'],
      ]
    );
  });
});
