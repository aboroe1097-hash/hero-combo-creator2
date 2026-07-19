import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  VTS_ADMIN_AUTH: {},
};
const localStorageData = new Map();
globalThis.localStorage = {
  getItem: (key) => localStorageData.get(key) ?? null,
  setItem: (key, value) => localStorageData.set(key, String(value)),
  removeItem: (key) => localStorageData.delete(key),
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { compactPlayerIdentity, state } = await import('../../js/ocr-shared.js');
const {
  EDEN_X1_CONTRIBUTION_RANKING_MODES,
  buildWeightedContributionRows,
  buildWeightedDutyCounts,
  compareEdenX1ContributionRankingRows,
  dedupeWeightedRowsByFamily,
  getEdenX1ContributionRankingScore,
  getLatestContributionRecord,
  getWeightedContributionRecordLabel,
  getWeightedPlayerFamilyKey,
  normalizeEdenX1ContributionRankingMode,
  sanitizePublicR5Adjustments,
} = await import('../../js/contribution-weighting.js');
const { PLAYER_REGISTRY_KEY, writeStoredPlayerRegistry } =
  await import('../../js/player-registry.js');

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

test('Eden X1 contribution modes produce distinct authoritative rankings', () => {
  const extendedWinner = {
    playerName: 'Extended Winner',
    currentRank: 2,
    contributionScore: 100000,
    contributionExGuild: 0,
    contributionRewardScore: 100000,
    weightedScore: 130000,
  };
  const defaultWinner = {
    playerName: 'Default Winner',
    currentRank: 1,
    contributionScore: 110000,
    contributionExGuild: 5000,
    contributionRewardScore: 115000,
    weightedScore: 115000,
  };

  assert.equal(
    normalizeEdenX1ContributionRankingMode('default'),
    EDEN_X1_CONTRIBUTION_RANKING_MODES.DEFAULT
  );
  assert.equal(
    normalizeEdenX1ContributionRankingMode('invalid'),
    EDEN_X1_CONTRIBUTION_RANKING_MODES.EXTENDED
  );
  assert.equal(getEdenX1ContributionRankingScore(extendedWinner, 'extended'), 130000);
  assert.equal(getEdenX1ContributionRankingScore(extendedWinner, 'default'), 100000);

  assert.deepEqual(
    [defaultWinner, extendedWinner]
      .sort((a, b) => compareEdenX1ContributionRankingRows(a, b, 'extended'))
      .map((row) => row.playerName),
    ['Extended Winner', 'Default Winner']
  );
  assert.deepEqual(
    [extendedWinner, defaultWinner]
      .sort((a, b) => compareEdenX1ContributionRankingRows(a, b, 'default'))
      .map((row) => row.playerName),
    ['Default Winner', 'Extended Winner']
  );
});

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

    const sarafina = model.rows.find((row) => row.playerKey === compactPlayerIdentity('Sarafina'));
    const undeadBanner = model.rows.find(
      (row) => row.playerKey === compactPlayerIdentity('Undead_Banner')
    );

    assert.equal(model.premiumCutoff, 1);
    assert.equal(sarafina.pathers, 2);
    assert.equal(sarafina.shieldWalls, 1);
    assert.equal(sarafina.conductBonus, 2);
    assert.equal(sarafina.finalRank, 1);
    assert.equal(sarafina.finalReward, 'core');
    assert.equal(Number(sarafina.weightedScore.toFixed(1)), 250000);

    assert.equal(undeadBanner.banners, 1);
    assert.equal(undeadBanner.conductBonus, -1);
    assert.equal(undeadBanner.currentReward, 'core');
    assert.equal(undeadBanner.finalReward, 'core');
    assert.equal(Number(undeadBanner.weightedScore.toFixed(1)), 100000);
  });
});

test('weighted contribution final rank uses weighted total points', () => {
  const season = 'eden-x1-2026';
  const model = buildWeightedContributionRows({
    season,
    contributionRecords: [
      {
        id: 'reward-rank-score',
        date: '2026-07-06',
        entries: [
          { rank: 1, name: 'Alpha', contribution: 100000 },
          { rank: 2, name: 'Bravo', contribution: 90000 },
          { rank: 3, name: 'Charlie', contribution: 99000 },
        ],
      },
    ],
    exGuildContributions: [
      {
        id: 'bravo-ex-guild',
        playerName: '(BIG) Bravo',
        matchedName: 'Bravo',
        guild: 'BIG',
        contribution: 15000,
      },
    ],
    r5Adjustments: [
      {
        season,
        player: 'Charlie',
        points: 3,
        category: 'merit_other',
      },
    ],
  });

  const [charlie, bravo, alpha] = model.rows;

  assert.equal(charlie.playerName, 'Charlie');
  assert.equal(charlie.contributionRewardScore, 99000);
  assert.equal(charlie.conductPoints, 30000);
  assert.equal(charlie.weightedScore, 129000);
  assert.equal(charlie.finalRank, 1);

  assert.equal(bravo.playerName, 'Bravo');
  assert.equal(bravo.contributionRewardScore, 105000);
  assert.equal(bravo.weightedScore, 105000);
  assert.equal(bravo.finalRank, 2);

  assert.equal(alpha.playerName, 'Alpha');
  assert.equal(alpha.contributionRewardScore, 100000);
  assert.equal(alpha.weightedScore, 100000);
  assert.equal(alpha.finalRank, 3);
});

test('public R5 conduct mirror keeps scores and premium flags without private notes', () => {
  const season = 'eden-x1-2026';
  const publicRows = sanitizePublicR5Adjustments(
    [
      {
        season,
        player: 'Alpha',
        points: -2,
        category: 'toxicity',
        note: 'Private R5 note',
        createdBy: 'admin-user',
      },
      {
        season,
        player: 'Road Helper',
        points: 1,
        category: 'connected_road',
        note: 'Public-safe category, private note',
      },
      {
        season,
        player: 'Bravo',
        points: 0,
        category: 'grant_premium',
        note: 'Private grant reason',
      },
    ],
    season
  );

  assert.deepEqual(
    publicRows.map((row) => ({
      playerName: row.playerName,
      points: row.points,
      category: row.category,
      note: row.note,
      createdBy: row.createdBy,
    })),
    [
      {
        playerName: 'Alpha',
        points: -2,
        category: 'penalty_other',
        note: undefined,
        createdBy: undefined,
      },
      {
        playerName: 'Road Helper',
        points: 1,
        category: 'connected_road',
        note: undefined,
        createdBy: undefined,
      },
      {
        playerName: 'Bravo',
        points: 0,
        category: 'grant_premium',
        note: undefined,
        createdBy: undefined,
      },
    ]
  );
});

test('weighted contribution applies seeded 12.4.1 road support points once', () => {
  const season = 'season-2026';
  const model = buildWeightedContributionRows({
    season,
    contributionRecords: [
      {
        id: 'seeded-road-support',
        date: '2026-07-06',
        entries: [
          { rank: 1, name: 'Феечка))', contribution: 100000 },
          { rank: 2, name: 'Obliterated', contribution: 90000 },
        ],
      },
    ],
    r5Adjustments: [
      {
        season,
        player: 'Obliterated',
        points: 1,
        category: 'connected_road',
        note: 'Cloud copy of road help',
      },
    ],
  });

  const feechka = model.rows.find((row) => row.playerName === 'Феечка))');
  const obliterated = model.rows.find((row) => row.playerName === 'Obliterated');

  assert.equal(feechka.conductBonus, 1);
  assert.equal(feechka.conductPoints, 10000);
  assert.equal(obliterated.conductBonus, 1);
  assert.equal(obliterated.conductPoints, 10000);
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

test('weighted contribution joins Wicked Russian duties to typoed Vicked contribution row', () => {
  const model = buildWeightedContributionRows({
    contributionRecords: [
      {
        id: 'wicked-typo',
        date: '2026-07-05',
        entries: [{ rank: 29, name: 'VICKED RUSSIAN', contribution: 93950 }],
      },
    ],
    dutyRecords: [
      { type: 'banner', entries: [{ name: 'WICKED RUSSIAN', confirmed: 'WICKED RUSSIAN' }] },
      { type: 'pather', entries: [{ name: 'Wicked Russian', confirmed: 'Wicked Russian' }] },
    ],
  });

  const row = model.rows.find((entry) => entry.playerName === 'WICKED RUSSIAN');

  assert.ok(row);
  assert.equal(row.playerKey, compactPlayerIdentity('WICKED RUSSIAN'));
  assert.equal(row.sourceName, 'VICKED RUSSIAN');
  assert.equal(row.banners, 1);
  assert.equal(row.pathers, 1);
});

test('weighted contribution exposes ex-guild contribution breakdown by source guild', () => {
  const model = buildWeightedContributionRows({
    contributionRecords: [
      {
        id: 'ex-guild-breakdown-main',
        date: '2026-07-06',
        entries: [{ rank: 1, name: 'Alpha', contribution: 100000 }],
      },
    ],
    exGuildContributions: [
      {
        id: 'ex-guild-big-1',
        playerName: '(BIG) Alpha',
        matchedName: 'Alpha',
        guild: 'BIG',
        contribution: 5000,
      },
      {
        id: 'ex-guild-big-2',
        playerName: '(BIG) Alpha',
        matchedName: 'Alpha',
        guild: 'BIG',
        contribution: 2000,
      },
      {
        id: 'ex-guild-dev-1',
        playerName: '(DEV) Alpha',
        matchedName: 'Alpha',
        guild: 'DEV',
        contribution: 11000,
      },
    ],
  });

  const alpha = model.rows.find((row) => row.playerName === 'Alpha');

  assert.equal(alpha.contributionExGuild, 18000);
  assert.deepEqual(
    alpha.contributionExGuildBreakdown.map((row) => ({
      guild: row.guild,
      contribution: row.contribution,
    })),
    [
      { guild: 'DEV', contribution: 11000 },
      { guild: 'BIG', contribution: 7000 },
    ]
  );
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
        [compactPlayerIdentity('Kika'), 'core', 'core'],
        [compactPlayerIdentity('UNDEAD'), 'core', 'core'],
      ]
    );
  });
});

test('weighted contribution keeps top contributors in core rewards', () => {
  const model = buildWeightedContributionRows({
    contributionRecords: [
      {
        id: 'leader-default',
        date: '2026-07-05',
        entries: [
          { rank: 1, name: 'Alpha', contribution: 300000 },
          { rank: 2, name: 'MalakAdo', contribution: 250000 },
          { rank: 9, name: 'MalakAbo', contribution: 100000 },
        ],
      },
    ],
  });

  const alpha = model.rows.find((row) => row.playerName === 'Alpha');
  const malakAdo = model.rows.find((row) => row.playerName === 'MalakAdo');
  const malakAbo = model.rows.find((row) => row.playerName === 'MalakAbo');

  assert.equal(alpha.currentReward, 'core');
  assert.equal(alpha.finalReward, 'core');
  assert.equal(malakAdo.currentReward, 'core');
  assert.equal(malakAdo.finalReward, 'core');
  assert.equal(malakAbo.currentReward, 'core');
  assert.equal(malakAbo.finalReward, 'core');
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

test('weighted contribution consolidates a player family duty + conduct onto the main account', () => {
  withRosterNames(() => {
    const season = 'eden-x1-2026';
    // KIKA_MAIN and KIKA_ALT are distinct accounts of the same person (family).
    // Each stays its own row, but the person's duty + conduct consolidate onto
    // Kika's configured #1 main account (KIKA_ALT), even when it is not the
    // highest-contribution row.
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
        { type: 'pather', entries: [{ name: KIKA_ALT, confirmed: KIKA_ALT }] },
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
    assert.notEqual(main.playerKey, alt.playerKey); // accounts stay separate rows
    // Family duty (banner on MAIN + pather on ALT) and conduct (+1 + -1) all
    // land on the #1 account; the other account row carries none.
    assert.equal(alt.banners, 1);
    assert.equal(alt.pathers, 1);
    assert.equal(alt.conductBonus, 0);
    assert.equal(main.banners, 0);
    assert.equal(main.pathers, 0);
    assert.equal(main.conductBonus, 0);
  });
});

test('audited public aliases and service accounts resolve to one reward family', () => {
  const families = [
    ['drthunder293', 'drthunder'],
    ['lisavetka', 'lisaveta'],
    ['angel1097', 'angel'],
    ['λngξl1097', 'angel'],
    ['julirae', 'juli'],
    ['maximusss', 'maximus'],
    ['maximusssbanner', 'maximus'],
    ['qimmortalis', 'qimmortal'],
  ];

  families.forEach(([accountKey, expectedFamily]) => {
    assert.equal(getWeightedPlayerFamilyKey(accountKey), expectedFamily);
  });
});

test('audited guild tags and public aliases credit conduct to the contribution family', () => {
  const season = 'season-2026';
  const model = buildWeightedContributionRows({
    season,
    contributionRecords: [
      {
        id: 'audited-conduct-aliases',
        date: '2026-07-18',
        entries: [
          { rank: 1, name: 'Lisaveta', contribution: 100000 },
          { rank: 2, name: 'Obliterated', contribution: 90000 },
          { rank: 3, name: 'Dr Thunder', contribution: 80000 },
        ],
      },
    ],
    r5Adjustments: [
      { season, player: '(Pic)Lisavetka', points: 1, category: 'connected_road' },
      { season, player: '(Pic)Obliterated', points: 1, category: 'connected_road' },
      { season, player: 'Obliterated', points: 1, category: 'connected_road' },
      { season, player: 'Dr Thunder 293', points: 3, category: 'extra_effort' },
    ],
  });

  assert.equal(model.rows.find((row) => row.playerName === 'Lisaveta').conductBonus, 1);
  assert.equal(model.rows.find((row) => row.playerName === 'Obliterated').conductBonus, 2);
  assert.equal(model.rows.find((row) => row.playerName === 'Dr Thunder').conductBonus, 3);
});

test('audited duty aliases credit Juli and Maximus contribution accounts', () => {
  const model = buildWeightedContributionRows({
    contributionRecords: [
      {
        id: 'audited-duty-aliases',
        date: '2026-07-18',
        entries: [
          { rank: 1, name: '**Juli Rae**', contribution: 100000 },
          { rank: 2, name: 'MaximuSss', contribution: 90000 },
        ],
      },
    ],
    dutyRecords: [
      { type: 'banner', entries: [{ name: 'Juli', confirmed: 'Juli' }] },
      { type: 'banner', entries: [{ name: 'Maximus', confirmed: 'Maximus' }] },
    ],
  });

  assert.equal(model.rows.find((row) => row.sourceName === '**Juli Rae**').banners, 1);
  assert.equal(model.rows.find((row) => row.sourceName === 'MaximuSss').banners, 1);
});

test('duty workers absent from contribution stay support-only and do not shift ranks', () => {
  const model = buildWeightedContributionRows({
    includeSupportOnly: true,
    contributionRecords: [
      {
        id: 'support-only-workers',
        date: '2026-07-18',
        entries: [{ rank: 1, name: 'Ranked Player', contribution: 100000 }],
      },
    ],
    dutyRecords: [
      {
        type: 'banner',
        entries: [
          { name: 'Ezeta.TV', confirmed: 'Ezeta.TV' },
          { name: '@She selkie', confirmed: '@She selkie' },
        ],
      },
    ],
  });

  const ranked = model.rows.find((row) => row.playerName === 'Ranked Player');
  const supportOnly = model.rows.filter((row) => row.supportOnly);
  assert.equal(ranked.finalRank, 1);
  assert.equal(supportOnly.length, 2);
  supportOnly.forEach((row) => {
    assert.equal(row.currentRank, 0);
    assert.equal(row.finalRank, 0);
    assert.equal(row.finalReward, 'none');
    assert.equal(row.contributionScore, 0);
    assert.equal(row.banners, 1);
  });
});

test('support-only duty names discard a stored trailing quote artifact', () => {
  const model = buildWeightedContributionRows({
    includeSupportOnly: true,
    contributionRecords: [
      {
        id: 'support-only-name-cleanup',
        date: '2026-07-18',
        entries: [{ rank: 1, name: 'Ranked Player', contribution: 100000 }],
      },
    ],
    dutyRecords: [{ type: 'banner', entries: [{ name: '@Ezeta.TV', confirmed: 'Ezeta.TV",' }] }],
  });

  const supportOnly = model.rows.find((row) => row.supportOnly);
  assert.equal(supportOnly.playerName, 'Ezeta.TV');
  assert.equal(supportOnly.banners, 1);
});

test('reward row deduplication keeps the best sorted account per family', () => {
  const rows = [
    { playerKey: 'sarafino', familyKey: 'sarafino', playerName: 'Sarafino' },
    { playerKey: 'sarafina', familyKey: 'sarafino', playerName: 'Sarafina' },
    { playerKey: 'other', familyKey: 'other', playerName: 'Other' },
  ];

  assert.deepEqual(
    dedupeWeightedRowsByFamily(rows).map((row) => row.playerName),
    ['Sarafino', 'Other']
  );
  assert.deepEqual(
    dedupeWeightedRowsByFamily(rows, { reservedFamilyKeys: ['sarafino'] }).map(
      (row) => row.playerName
    ),
    ['Other']
  );
});

test('Power House allocation can retain exactly 90 unique unreserved families', () => {
  const rows = Array.from({ length: 92 }, (_, index) => ({
    playerKey: `player-${index + 1}`,
    familyKey: `family-${index + 1}`,
    playerName: `Player ${index + 1}`,
  }));
  rows.splice(25, 0, {
    playerKey: 'player-10-alt',
    familyKey: 'family-10',
    playerName: 'Player 10 Alt',
  });

  const allocated = dedupeWeightedRowsByFamily(rows, {
    reservedFamilyKeys: new Set(['family-1', 'family-2']),
  }).slice(0, 90);

  assert.equal(allocated.length, 90);
  assert.equal(new Set(allocated.map((row) => row.familyKey)).size, 90);
  assert.ok(allocated.every((row) => !['family-1', 'family-2'].includes(row.familyKey)));
});

test('weighted contribution routes RedBull service credit to the main managed account', () => {
  withRosterNames(() => {
    const season = 'eden-x1-2026';
    const model = buildWeightedContributionRows({
      season,
      contributionRecords: [
        {
          id: 'redbull-split',
          date: '2026-06-25',
          entries: [
            { rank: 11, name: 'REDBULLS', contribution: 50000 },
            { rank: 12, name: 'REDBULL-#', contribution: 90000 },
            { rank: 13, name: 'RedBull_Banner', contribution: 1000 },
          ],
        },
      ],
      dutyRecords: [
        { type: 'banner', entries: [{ name: '@redbull (osito)', confirmed: 'redbull' }] },
        { type: 'pather', entries: [{ name: 'RedBull®', confirmed: 'RedBull®' }] },
      ],
      r5Adjustments: [{ season, player: 'RedBull@', points: 2, category: 'banner_help' }],
    });

    const main = model.rows.find((row) => row.playerName === 'REDBULLS');
    const secondary = model.rows.find((row) => row.playerName === 'REDBULL-#');
    const banner = model.rows.find((row) => row.playerName === 'RedBull_Banner');

    assert.ok(main);
    assert.ok(secondary);
    assert.ok(banner);
    assert.equal(main.banners, 1);
    assert.equal(main.pathers, 1);
    assert.equal(main.conductBonus, 2);
    assert.equal(secondary.banners, 0);
    assert.equal(secondary.pathers, 0);
    assert.equal(secondary.conductBonus, 0);
    assert.equal(banner.banners, 0);
  });
});

test('weighted contribution uses registry families for custom account groups', () => {
  localStorageData.delete(PLAYER_REGISTRY_KEY);
  try {
    writeStoredPlayerRegistry({
      players: [
        { canonical: 'Registry Main', family: 'registry-player', aliases: ['Registry Main'] },
        { canonical: 'Registry Banner', family: 'registry-player', aliases: ['Registry Banner'] },
      ],
    });

    const season = 'eden-x1-2026';
    const model = buildWeightedContributionRows({
      season,
      contributionRecords: [
        {
          id: 'registry-family',
          date: '2026-06-25',
          entries: [
            { rank: 1, name: 'Registry Main', contribution: 100000 },
            { rank: 2, name: 'Registry Banner', contribution: 10000 },
          ],
        },
      ],
      dutyRecords: [
        { type: 'banner', entries: [{ name: 'Registry Banner', confirmed: 'Registry Banner' }] },
      ],
      r5Adjustments: [{ season, player: 'Registry Banner', points: 2, category: 'banner_help' }],
    });

    const main = model.rows.find((row) => row.playerName === 'Registry Main');
    const banner = model.rows.find((row) => row.playerName === 'Registry Banner');

    assert.ok(main);
    assert.ok(banner);
    assert.notEqual(main.playerKey, banner.playerKey);
    assert.equal(main.banners, 1);
    assert.equal(main.conductBonus, 2);
    assert.equal(banner.banners, 0);
    assert.equal(banner.conductBonus, 0);
  } finally {
    localStorageData.delete(PLAYER_REGISTRY_KEY);
  }
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

test('shared-identity accounts credit duty + conduct to the highest-contribution row only', () => {
  withRosterNames(() => {
    const season = 'eden-x1-2026';
    // Both entries are plain "Kika" -> same resolved identity/key (her alt/banner
    // accounts often read without decorations). Duty + conduct must land on the
    // main account (highest contribution), not be duplicated onto every row.
    const model = buildWeightedContributionRows({
      season,
      contributionRecords: [
        {
          id: 'kika-shared',
          date: '2026-06-25',
          entries: [
            { rank: 190, name: 'Kika', contribution: 2873 },
            { rank: 9, name: 'Kika', contribution: 144650 },
          ],
        },
      ],
      dutyRecords: [
        { type: 'banner', entries: [{ name: 'Kika', confirmed: 'Kika' }] },
        { type: 'pather', entries: [{ name: 'Kika', confirmed: 'Kika' }] },
      ],
      r5Adjustments: [{ season, player: 'Kika', points: 1, category: 'banner_help' }],
    });

    const kikaKey = compactPlayerIdentity('꧁ Kika ꧂');
    const kikaRows = model.rows.filter((row) => row.playerKey === kikaKey);
    assert.equal(kikaRows.length, 2); // both accounts still shown as separate rows

    const main = kikaRows.find((row) => row.contributionScore === 144650);
    const secondary = kikaRows.find((row) => row.contributionScore === 2873);

    assert.equal(main.banners, 1);
    assert.equal(main.pathers, 1);
    assert.equal(main.conductBonus, 1);
    assert.equal(secondary.banners, 0);
    assert.equal(secondary.pathers, 0);
    assert.equal(secondary.conductBonus, 0);
  });
});
