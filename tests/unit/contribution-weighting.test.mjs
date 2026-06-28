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
const {
  buildWeightedContributionRows,
  buildWeightedDutyCounts,
  getLatestContributionRecord,
  getWeightedContributionRecordLabel,
} = await import('../../js/contribution-weighting.js');

const TEST_ROSTER_NAMES = ['~Sarafino~', 'UNDEAD', 'ANGEL', 'Zubbs', 'Kika'];
const KIKA_MAIN = '\ua9c1 Kika \ua9c2';
const KIKA_ALT = '\ua9c1\u0f3a Kika \u0f3b\ua9c2';

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
        { season, player: '~Sarafino~', points: 2, category: 'extra_effort' },
        { season, player: 'UNDEAD', points: -1, category: 'ignored_coordination' },
      ],
    });

    const sarafino = model.rows.find((row) => row.playerKey === compactPlayerIdentity('Sarafino'));
    const undead = model.rows.find((row) => row.playerKey === compactPlayerIdentity('UNDEAD'));

    assert.equal(model.premiumCutoff, 1);
    assert.equal(sarafino.pathers, 2);
    assert.equal(sarafino.shieldWalls, 1);
    assert.equal(sarafino.conductBonus, 2);
    assert.equal(sarafino.finalRank, 1);
    assert.equal(sarafino.finalReward, 'guild_master');
    assert.equal(Number(sarafino.weightedScore.toFixed(1)), 250000);

    assert.equal(undead.banners, 1);
    assert.equal(undead.conductBonus, -1);
    assert.equal(undead.currentReward, 'core');
    assert.equal(undead.finalReward, 'core');
    assert.equal(Number(undead.weightedScore.toFixed(1)), 100000);
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
        [compactPlayerIdentity('Kika'), 'guild_master', 'guild_master'],
        [compactPlayerIdentity('UNDEAD'), 'core', 'core'],
      ]
    );
  });
});

test('weighted contribution labels hide image upload source notes', () => {
  assert.equal(
    getWeightedContributionRecordLabel({
      date: '2026-06-24',
      note: 'WhatsApp Image 2026-06-25 at 01.18.36.jpeg, D:\\Uploads\\panel.png',
    }),
    '2026-06-24'
  );
  assert.equal(
    getWeightedContributionRecordLabel({
      date: '2026-06-24',
      note: 'Manual contribution reading',
    }),
    '2026-06-24 - Manual contribution reading'
  );
});

test('weighted contribution keeps decorated Kika account duty counts separate', () => {
  withRosterNames(() => {
    const season = 'eden-x1-2026';
    const model = buildWeightedContributionRows({
      season,
      contributionRecords: [
        {
          id: 'kika-split',
          date: '2026-06-25',
          entries: [
            { rank: 9, name: KIKA_MAIN, contribution: 144650 },
            { rank: 48, name: KIKA_ALT, contribution: 78617 },
          ],
        },
      ],
      dutyRecords: [
        { type: 'pather', entries: [{ name: KIKA_MAIN, confirmed: KIKA_MAIN }] },
        { type: 'banner', entries: [{ name: KIKA_MAIN, confirmed: KIKA_MAIN }] },
      ],
      r5Adjustments: [
        { season, player: KIKA_MAIN, points: 1, category: 'banner_help' },
        { season, player: KIKA_ALT, points: -1, category: 'ignored_coordination' },
      ],
    });

    const main = model.rows.find((row) => row.playerName === KIKA_MAIN);
    const alt = model.rows.find((row) => row.playerName === KIKA_ALT);

    assert.ok(main);
    assert.ok(alt);
    assert.notEqual(main.playerKey, alt.playerKey);
    assert.equal(main.pathers, 1);
    assert.equal(main.banners, 1);
    assert.equal(main.conductBonus, 1);
    assert.equal(alt.pathers, 0);
    assert.equal(alt.banners, 0);
    assert.equal(alt.conductBonus, -1);
  });
});

test('R5 premium grant and forfeit flags override weighted final reward tier', () => {
  const season = 'eden-x1-2026';
  const entries = Array.from({ length: 25 }, (_, index) => ({
    rank: index + 1,
    name: `Player ${index + 1}`,
    contribution: 25000 - index,
  }));

  const model = buildWeightedContributionRows({
    season,
    contributionRecords: [
      {
        id: 'contrib-flags',
        date: '2026-06-25',
        entries,
      },
    ],
    r5Adjustments: [
      {
        season,
        playerKey: compactPlayerIdentity('Player 1'),
        playerName: 'Player 1',
        category: 'forfeit_premium',
        points: 0,
      },
      {
        season,
        playerKey: compactPlayerIdentity('Player 25'),
        playerName: 'Player 25',
        category: 'grant_premium',
        points: 0,
      },
    ],
  });

  const forfeitedTop = model.rows.find(
    (row) => row.playerKey === compactPlayerIdentity('Player 1')
  );
  const grantedLow = model.rows.find((row) => row.playerKey === compactPlayerIdentity('Player 25'));

  assert.equal(forfeitedTop.finalRank, 1);
  assert.equal(forfeitedTop.finalReward, 'power_house');
  assert.equal(grantedLow.finalRank, 25);
  assert.equal(grantedLow.finalReward, 'core');
});
