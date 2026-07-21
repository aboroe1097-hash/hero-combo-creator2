import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOH_2025_SCORING_PROFILE,
  BOH_DEFAULT_LEGIONS,
  BOH_DEFAULT_PHASES,
  BOH_DEFAULT_ROLE_GROUPS,
  BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS,
  BOH_EPIC_SHOWDOWN_LANES,
  BOH_FIGHTING_TIME_IDS,
  BOH_FIELD_SIZE,
  BOH_MAX_USABLE_HERO_NAMES,
  BOH_MAX_PREFERRED_TEAMMATES,
  BOH_TEAM_COUNT,
  BOH_TEAM_SIZE,
  balanceBohTeams,
  createBohPlayerId,
  createBohScoringProfile,
  createBohSeatTemplate,
  normalizeBohName,
  normalizeBohEpicShowdownPreferences,
  normalizeBohEpicShowdownTimeSlotIds,
  normalizeBohObjectives,
  normalizeBohPlan,
  normalizeBohRoleGroups,
  normalizeBohSignup,
  projectBohPhaseAssignments,
  projectBohPlayerTimeline,
  resolveBohInstruction,
  scoreBohSignup,
  validateBohPlan,
  validateBohTeamAssignments,
} from '../../js/all-star-boh-model.js';

function draftPlayers(options = {}) {
  const roles = options.roles || null;
  const fieldSize = (options.teamCount || BOH_TEAM_COUNT) * BOH_TEAM_SIZE;
  return Array.from({ length: fieldSize }, (_, index) => ({
    playerId: `player-${index + 1}`,
    gameName: `Player ${index + 1}`,
    score: options.sameScore ? 100 : fieldSize - index,
    eligibleRoleIds: roles?.[index] || [],
    rolePreferences: roles?.[index] || [],
  }));
}

function completeTeams(teamCount = BOH_TEAM_COUNT) {
  const seats = createBohSeatTemplate();
  return Array.from({ length: teamCount }, (_, teamIndex) => ({
    id: `team-${teamIndex + 1}`,
    players: seats.map((seat) => ({
      playerId: `player-${teamIndex * BOH_TEAM_SIZE + seat.seatNumber}`,
      gameName: `Player ${teamIndex * BOH_TEAM_SIZE + seat.seatNumber}`,
      seatNumber: seat.seatNumber,
      roleGroupId: seat.roleGroupId,
      score: 100,
    })),
  }));
}

function oneTeam() {
  return completeTeams()[0];
}

function assignmentIds(result) {
  return result.teams.map((team) => team.players.map((player) => player.playerId));
}

function metricDraftPlayers(options = {}) {
  const teamCount = options.teamCount || 2;
  const fieldSize = teamCount * BOH_TEAM_SIZE;
  const powerScale = options.powerScale || 1;
  const scoreScale = options.scoreScale || 1;
  return Array.from({ length: fieldSize }, (_, index) => ({
    playerId: `metric-${index + 1}`,
    gameName: `Metric ${index + 1}`,
    score: options.zeroScore ? 0 : (fieldSize - index) ** 3 * scoreScale,
    stats: {
      totalCastlePower: options.zeroPower ? 0 : (index + 1) ** 2 * 1000 * powerScale,
    },
  }));
}

function seededDominanceDraftPlayers(fixtureIndex = 26) {
  let state = 0x98765432;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
  let players = [];
  for (let fixture = 0; fixture <= fixtureIndex; fixture += 1) {
    players = Array.from({ length: 2 * BOH_TEAM_SIZE }, (_, index) => ({
      playerId: `seed-${fixture}-${index}`,
      gameName: `Seed ${fixture}-${index}`,
      score: 1000 + (next() % 100000),
      stats: { totalCastlePower: 1_000_000 + (next() % 900_000_000) },
    }));
  }
  return players;
}

function normalizedBalanceSse(result) {
  const scoreMean =
    result.teams.reduce((total, team) => total + team.totalScore, 0) / result.teamCount;
  const powerMean =
    result.teams.reduce((total, team) => total + team.totalCastlePower, 0) / result.teamCount;
  return result.teams.reduce((total, team) => {
    const scoreDeviation = scoreMean > 0 ? (team.totalScore - scoreMean) / scoreMean : 0;
    const powerDeviation = powerMean > 0 ? (team.totalCastlePower - powerMean) / powerMean : 0;
    return total + scoreDeviation ** 2 + powerDeviation ** 2;
  }, 0);
}

function paretoDominates(left, right) {
  return (
    left.scoreSpread <= right.scoreSpread &&
    left.powerSpread <= right.powerSpread &&
    (left.scoreSpread < right.scoreSpread || left.powerSpread < right.powerSpread)
  );
}

function normalizedWorstSpread(result) {
  const scoreMean =
    result.teams.reduce((total, team) => total + team.totalScore, 0) / result.teamCount;
  const powerMean =
    result.teams.reduce((total, team) => total + team.totalCastlePower, 0) / result.teamCount;
  return Math.max(
    scoreMean > 0 ? result.scoreSpread / scoreMean : 0,
    powerMean > 0 ? result.powerSpread / powerMean : 0
  );
}

test('signup normalization preserves Unicode names, accepts localized digits, and drops images', () => {
  const signup = normalizeBohSignup({
    gameName: '  Ａｌｉ   古風無道  ',
    aliases: ['Ａｌｉ 古風無道', 'علي'],
    stats: {
      totalCastlePower: '١٢٣٬٤٥٦٬٧٨٩',
      troopPower: '۹۸٬۷۶۵',
      buildingPower: -100,
      technologyPower: '1,250,000',
      heroPower: 2500000,
      dragonsPower: 500000,
      t9TroopTypes: ['Cavalry', 'cavalry', 'Archers', 'None'],
      readySpeedHeroes: 'LionHeart; Cao Cao; none',
      level50HeroCount: '٣',
      rocLevel: '١٢',
      bohUsefulRating: '2.5',
    },
    rolePreferences: ['Rune', 'rune', 'Top'],
    screenshotBase64: 'must-not-survive',
    imageData: { secret: true },
  });

  assert.equal(signup.gameName, 'Ali 古風無道');
  assert.match(signup.playerId, /^boh-player-[a-z0-9]+$/);
  assert.deepEqual(signup.knownNames, ['Ali 古風無道', 'علي']);
  assert.equal(signup.stats.totalCastlePower, 123456789);
  assert.equal(signup.stats.troopPower, 98765);
  assert.equal(signup.stats.buildingPower, 0);
  assert.equal(signup.stats.level50HeroCount, 3);
  assert.equal(signup.stats.rocLevel, 12);
  assert.equal('bohUsefulRating' in signup.stats, false);
  assert.deepEqual(signup.stats.t9TroopTypes, ['Cavalry', 'Archers']);
  assert.deepEqual(signup.stats.readySpeedHeroes, ['LionHeart', 'Cao Cao']);
  assert.deepEqual(signup.rolePreferences, ['Rune', 'Top']);
  assert.equal('screenshotBase64' in signup, false);
  assert.equal('imageData' in signup, false);
  assert.doesNotMatch(JSON.stringify(signup), /must-not-survive|secret/);
});

test('signup normalization preserves optional aggregate troop estimates in troopRoster', () => {
  const signup = normalizeBohSignup({
    gameName: 'Troop Estimator',
    stats: {
      troopRoster: [
        'estimate|lofty|7000000',
        'estimate|enhanced-t10|1500000',
        'estimate|t10|2000000',
        'estimate|t9|3000000',
      ],
    },
  });

  assert.deepEqual(signup.stats.troopRoster, [
    'estimate|lofty|7000000',
    'estimate|enhanced-t10|1500000',
    'estimate|t10|2000000',
    'estimate|t9|3000000',
  ]);
});

test('signup normalization carries the form locale and commitment fields canonically', () => {
  const signup = normalizeBohSignup({
    playerId: 'member-1097',
    gameName: 'Rune Captain',
    locale: ' pt-BR ',
    timezone: '  UTC+2  ',
    entryMethod: 'OCR',
    availability: 'MOST',
    preferredRole: 'TOP',
    canHelpLead: 'yes',
    teamNamePreferences: ['night-falcons', 'iron-wolves'],
    unavailableTimes: ' Friday  20:00–21:00 ',
    canTeleport: 'on',
    canUseVoice: false,
    planCommitment: 1,
    playerNotes: 'Can rotate to rune.\r\nExperienced caller.\u0000',
    commitment: {
      notes: 'Top-level playerNotes takes precedence.',
      screenshotData: 'never persist this',
    },
  });

  assert.equal(signup.locale, 'pt-BR');
  assert.equal(signup.timezone, 'UTC+2');
  assert.equal(signup.entryMethod, 'ocr');
  assert.deepEqual(signup.rolePreferences, ['top']);
  assert.deepEqual(signup.commitment, {
    availability: 'most',
    preferredRole: 'top',
    secondaryRole: '',
    canHelpLead: true,
    vts1097Member: null,
    contactNumber: '',
    currentState: '',
    joinReason: '',
    fightingTimeIds: [],
    teamNamePreferences: ['iron-wolves', 'night-falcons'],
    unavailableTimes: 'Friday 20:00–21:00',
    canTeleport: true,
    canUseVoice: false,
    planCommitment: true,
    notes: 'Can rotate to rune.\nExperienced caller.',
  });
  assert.equal('playerNotes' in signup, false);
  assert.doesNotMatch(JSON.stringify(signup), /screenshotData|never persist this/);
});

test('preferred teammate requests are optional, bounded, normalized, and do not affect scoring', () => {
  const withPreferences = normalizeBohSignup({
    gameName: 'Self',
    troopPower: 1_000_000,
    preferredTeammates: ['  \uFF2Date One  ', 'Mate One', 'Mate\u0000 Two', 'Self'],
  });
  const withoutPreferences = normalizeBohSignup({ gameName: 'Self', troopPower: 1_000_000 });

  assert.deepEqual(withPreferences.preferredTeammates, ['Mate One', 'Mate Two']);
  assert.deepEqual(withoutPreferences.preferredTeammates, []);
  assert.deepEqual(scoreBohSignup(withPreferences), scoreBohSignup(withoutPreferences));
  const players = draftPlayers({ sameScore: true });
  const baselineTeams = balanceBohTeams(players);
  const preferenceTeams = balanceBohTeams(
    players.map((player, index) => ({
      ...player,
      preferredTeammates: [players[(index + 1) % players.length].gameName],
    }))
  );
  const assignments = (result) =>
    result.teams.map((team) =>
      team.players.map((player) => `${player.seatNumber}:${player.playerId}`)
    );
  assert.deepEqual(assignments(preferenceTeams), assignments(baselineTeams));
  assert.throws(
    () =>
      normalizeBohSignup({
        gameName: 'Self',
        preferredTeammates: Array.from(
          { length: BOH_MAX_PREFERRED_TEAMMATES + 1 },
          (_, index) => `Player ${index + 1}`
        ),
      }),
    /boh_signup_list_too_long/
  );
  assert.throws(
    () => normalizeBohSignup({ gameName: 'Self', preferredTeammates: ['x'.repeat(161)] }),
    /boh_signup_field_too_long/
  );
});

test('Epic Showdown preferences support independent lane and configured time multi-selects', () => {
  assert.deepEqual(BOH_EPIC_SHOWDOWN_LANES, ['south', 'center', 'north']);
  assert.deepEqual(BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS, [
    '+6',
    '+8',
    '+10',
    '+12',
    '+14',
    '+16',
    '+18',
    '+20',
  ]);
  assert.deepEqual(normalizeBohEpicShowdownTimeSlotIds(), BOH_EPIC_SHOWDOWN_DEFAULT_TIME_SLOT_IDS);
  assert.deepEqual(
    normalizeBohEpicShowdownPreferences({
      gameName: '  \uFF21bo\u0000 Epic ',
      lanePreferences: ['North', 'south', 'north'],
      timePreferences: ['+12', '+8'],
      flexibilityPreference: 'fixed',
    }),
    {
      schemaVersion: 1,
      gameName: 'Abo Epic',
      lanePreferences: ['north', 'south'],
      timePreferences: ['+12', '+8'],
      flexibilityPreference: 'fixed',
    }
  );
  assert.deepEqual(
    normalizeBohEpicShowdownPreferences(
      { gameName: 'Epic only', lanePreferences: ['center'], timePreferences: ['reset-2'] },
      { timeSlotIds: ['reset-1', 'reset-2'] }
    ),
    {
      schemaVersion: 1,
      gameName: 'Epic only',
      lanePreferences: ['center'],
      timePreferences: ['reset-2'],
    }
  );
  assert.throws(
    () => normalizeBohEpicShowdownPreferences({ gameName: 'Player', lanePreferences: ['east'] }),
    /boh_epic_lane_invalid/
  );
  assert.throws(
    () =>
      normalizeBohEpicShowdownPreferences({
        gameName: 'Player',
        lanePreferences: ['center'],
        timePreferences: ['+22'],
      }),
    /boh_epic_time_slot_not_configured/
  );
  assert.throws(
    () =>
      normalizeBohEpicShowdownPreferences({
        gameName: 'Player',
        timePreferences: ['+8'],
      }),
    /boh_epic_lane_required/
  );
  assert.throws(
    () =>
      normalizeBohEpicShowdownPreferences({
        gameName: 'Player',
        lanePreferences: ['center'],
      }),
    /boh_epic_time_required/
  );
  assert.throws(() => normalizeBohEpicShowdownPreferences({}), /boh_epic_game_name_required/);
  assert.throws(
    () => normalizeBohEpicShowdownPreferences({ gameName: 'x'.repeat(161) }),
    /boh_epic_game_name_too_long/
  );
});

test('nested commitment aliases normalize and invalid form values fail explicitly', () => {
  const signup = normalizeBohSignup({
    gameName: 'Backup Player',
    commitment: {
      availability: 'backup',
      preferredRole: 'flexible',
      secondaryRole: '',
      canHelpLead: false,
      unavailableTimes: 'None',
      canTeleport: 0,
      canUseVoice: 'yes',
      planCommitment: 'true',
      notes: 'Ready when called.',
    },
  });
  assert.deepEqual(signup.rolePreferences, ['flexible']);
  assert.deepEqual(signup.commitment, {
    availability: 'backup',
    preferredRole: 'flexible',
    secondaryRole: '',
    canHelpLead: false,
    vts1097Member: null,
    contactNumber: '',
    currentState: '',
    joinReason: '',
    fightingTimeIds: [],
    teamNamePreferences: [],
    unavailableTimes: 'None',
    canTeleport: false,
    canUseVoice: true,
    planCommitment: true,
    notes: 'Ready when called.',
  });

  assert.throws(
    () => normalizeBohSignup({ gameName: 'Bad', availability: 'sometimes' }),
    /boh_signup_enum_invalid/
  );
  assert.throws(
    () => normalizeBohSignup({ gameName: 'Bad', entryMethod: 'camera-roll' }),
    /boh_signup_enum_invalid/
  );
  assert.throws(
    () => normalizeBohSignup({ gameName: 'Bad', canTeleport: 'maybe' }),
    /boh_signup_boolean_invalid/
  );
  assert.throws(
    () => normalizeBohSignup({ gameName: 'Bad', playerNotes: 'x'.repeat(2001) }),
    /boh_signup_field_too_long/
  );
});

test('planning signals use canonical catalogs without changing readiness, scoring, or balance', () => {
  const heroNames = ['Hero Z', 'Hero A', 'Hero B'];
  const researchTreeIds = ['development', 'combat', 'advanced'];
  const raw = {
    gameName: 'Planner',
    stats: {
      troopPower: 1_000_000,
      buildingPower: 2_000_000,
      technologyPower: 3_000_000,
      heroCombatPower: 4_000_000,
      dragonPower: 5_000_000,
      readySpeedHeroes: ['LionHeart'],
      usableHeroNames: ['hero b', 'HERO Z', 'hero b'],
      researchProgressPct: { advanced: ' ', combat: 0, development: '75' },
    },
    commitment: {
      preferredRole: '',
      fightingTimeIds: ['+16', '+12'],
    },
  };
  const planningOptions = { heroNames, researchTreeIds, requireFightingTimeIds: true };
  const signup = normalizeBohSignup(raw, planningOptions);

  assert.deepEqual(signup.stats.usableHeroNames, ['Hero Z', 'Hero B']);
  assert.deepEqual(signup.stats.readySpeedHeroes, ['LionHeart']);
  assert.deepEqual(signup.stats.researchProgressPct, { development: 75, combat: 0 });
  assert.deepEqual(Object.keys(signup.stats.researchProgressPct), ['development', 'combat']);
  assert.equal(signup.commitment.preferredRole, '');
  assert.deepEqual(signup.rolePreferences, []);
  assert.deepEqual(signup.commitment.fightingTimeIds, ['+12', '+16']);
  assert.deepEqual(BOH_FIGHTING_TIME_IDS, ['+12', '+14', '+16']);

  const baseline = structuredClone(raw);
  delete baseline.stats.usableHeroNames;
  delete baseline.stats.researchProgressPct;
  assert.deepEqual(
    scoreBohSignup(raw, BOH_2025_SCORING_PROFILE, planningOptions),
    scoreBohSignup(baseline, BOH_2025_SCORING_PROFILE, planningOptions)
  );

  const players = draftPlayers({ sameScore: true });
  const plannedPlayers = players.map((player, index) => ({
    ...player,
    usableHeroNames: index % 2 ? ['Hero A'] : ['Hero B', 'Hero Z'],
    researchProgressPct: { development: index % 101, combat: 0 },
    fightingTimeIds: index % 2 ? ['+12', '+14'] : ['+14', '+16'],
  }));
  const assignments = (result) =>
    result.teams.map((team) => team.players.map((player) => player.playerId));
  assert.deepEqual(
    assignments(balanceBohTeams(plannedPlayers, { heroNames, researchTreeIds })),
    assignments(balanceBohTeams(players, { heroNames, researchTreeIds }))
  );
});

test('planning signal validation keeps sparse blanks distinct from zero and new times exact', () => {
  const options = {
    heroNames: ['First', 'Second'],
    researchTreeIds: ['tree-a', 'tree-b'],
  };
  const legacy = normalizeBohSignup({ gameName: 'Legacy', preferredRole: '' }, options);
  assert.deepEqual(legacy.stats.usableHeroNames, []);
  assert.deepEqual(legacy.stats.researchProgressPct, {});
  assert.deepEqual(legacy.commitment.fightingTimeIds, []);
  assert.equal(legacy.commitment.preferredRole, '');

  assert.throws(
    () => normalizeBohSignup({ gameName: 'Unknown hero', usableHeroNames: ['Third'] }, options),
    /boh_signup_catalog_value_invalid/
  );
  assert.throws(
    () =>
      normalizeBohSignup(
        { gameName: 'Too many heroes' },
        {
          heroNames: Array.from(
            { length: BOH_MAX_USABLE_HERO_NAMES + 1 },
            (_, index) => `Hero ${index + 1}`
          ),
        }
      ),
    /boh_signup_catalog_too_long/
  );
  assert.throws(
    () =>
      normalizeBohSignup(
        { gameName: 'Unknown tree', researchProgressPct: { 'tree-c': 50 } },
        options
      ),
    /boh_signup_research_tree_invalid/
  );
  for (const invalidProgress of [-1, 101, 12.5, 'not-a-number']) {
    assert.throws(
      () =>
        normalizeBohSignup(
          { gameName: 'Bad research', researchProgressPct: { 'tree-a': invalidProgress } },
          options
        ),
      /boh_signup_research_progress_invalid/
    );
  }
  for (const fightingTimeIds of [[], ['+12'], ['+12', '+12'], ['+12', '+14', '+16']]) {
    assert.throws(
      () =>
        normalizeBohSignup(
          { gameName: 'Bad times', fightingTimeIds },
          { ...options, requireFightingTimeIds: true }
        ),
      /boh_signup_fighting_times_required/
    );
  }
  assert.throws(
    () => normalizeBohSignup({ gameName: 'Bad time', fightingTimeIds: ['+8', '+12'] }),
    /boh_signup_fighting_time_invalid/
  );
});

test('Unicode compatibility forms produce one stable identity without flattening distinct names', () => {
  assert.equal(normalizeBohName('Ａｂｏ'), 'Abo');
  assert.equal(createBohPlayerId('Ａｂｏ'), createBohPlayerId('Abo'));
  assert.equal(createBohPlayerId('Éowyn'), createBohPlayerId('E\u0301owyn'));
  assert.notEqual(createBohPlayerId('玩家一'), createBohPlayerId('玩家二'));
  assert.notEqual(createBohPlayerId('Banner', 'one'), createBohPlayerId('Banner', 'two'));
});

test('2025 formula exposes an exact deterministic component breakdown', () => {
  const scored = scoreBohSignup(
    {
      playerId: 'legacy-player',
      gameName: 'Legacy Player',
      stats: {
        totalCastlePower: 999999999,
        troopPower: 1000000,
        buildingPower: 2000000,
        technologyPower: 3000000,
        heroCombatPower: 4000000,
        dragonPower: 5000000,
        unitSpecialtyPower: 6000000,
        t9TroopTypes: ['Cavalry', 'Archers', 'Footmen'],
        readySpeedHeroes: ['LionHeart', 'Cao Cao'],
        usableHeroNames: ['Cleopatra'],
        troopRoster: ['estimate|lofty|7000000', 'estimate|enhanced-t10|1500000'],
        level50HeroCount: 4,
        rocLevel: 160,
        bohUsefulRating: 99,
      },
    },
    BOH_2025_SCORING_PROFILE,
    { adminUsefulnessRating: 2, paidUsableHeroNames: ['cleopatra'] }
  );

  assert.equal(scored.profileId, 'all-star-boh-2025-v1');
  assert.equal(scored.breakdown.totalCastlePower.points, 0);
  assert.equal(scored.breakdown.troopPower.points, 50);
  assert.equal(scored.breakdown.buildingPower.points, 600);
  assert.equal(scored.breakdown.technologyPower.points, 2100);
  assert.equal(scored.breakdown.heroCombatPower.points, 3200);
  assert.equal(scored.breakdown.dragonPower.points, 5000);
  assert.equal(scored.breakdown.unitSpecialtyPower.points, 0);
  assert.equal(scored.breakdown.t9TroopType.points, 9000);
  assert.equal(scored.breakdown.readySpeedHero.points, 5000);
  assert.equal(scored.breakdown.level50Hero.points, 3000);
  assert.equal(scored.breakdown.bohUsefulRating.points, 2000);
  assert.equal(scored.breakdown.rocLevel.points, 0);
  assert.equal(scored.breakdown.paidUsableHero.points, 0);
  assert.equal(scored.breakdown.loftyTroopMillion.points, 0);
  assert.equal(scored.breakdown.enhancedT10TroopMillion.points, 0);
  assert.equal(scored.powerSubtotal, 10950);
  assert.equal(scored.bonusSubtotal, 19000);
  assert.equal(scored.total, 29950);
});

test('frozen legacy specialty weight stays zero while explicit v2 profiles can score it', () => {
  const input = {
    gameName: 'Specialist',
    stats: { unitSpecialtyPower: 1_234_000 },
  };
  const legacy = scoreBohSignup(input);
  const customV2 = scoreBohSignup(
    input,
    createBohScoringProfile({
      id: 'custom-v2-specialty-power',
      version: 2,
      powerWeights: { unitSpecialtyPower: 1 },
    })
  );

  assert.equal(BOH_2025_SCORING_PROFILE.powerWeights.unitSpecialtyPower, 0);
  assert.equal(legacy.breakdown.unitSpecialtyPower.weight, 0);
  assert.equal(legacy.breakdown.unitSpecialtyPower.points, 0);
  assert.equal(legacy.total, 0);
  assert.equal(customV2.profileVersion, 2);
  assert.equal(customV2.breakdown.unitSpecialtyPower.weight, 1);
  assert.equal(customV2.breakdown.unitSpecialtyPower.points, 1234);
  assert.equal(customV2.total, 1234);
});

test('custom scoring profiles apply all five new model inputs', () => {
  const profile = createBohScoringProfile({
    powerWeights: { unitSpecialtyPower: 0.5 },
    bonusWeights: {
      rocLevel: 10,
      paidUsableHero: 500,
      loftyTroopMillion: 200,
      enhancedT10TroopMillion: 400,
    },
  });
  const scored = scoreBohSignup(
    {
      gameName: 'New Inputs',
      stats: {
        unitSpecialtyPower: 2000000,
        rocLevel: 160,
        usableHeroNames: ['Cleopatra', 'Ragnar', 'Free Hero'],
        troopRoster: ['estimate|lofty|7500000', 'estimate|enhanced-t10|1250000'],
      },
    },
    profile,
    { paidUsableHeroNames: ['cleopatra', 'RAGNAR'] }
  );

  assert.deepEqual(
    Object.fromEntries(
      [
        'unitSpecialtyPower',
        'rocLevel',
        'paidUsableHero',
        'loftyTroopMillion',
        'enhancedT10TroopMillion',
      ].map((field) => [field, scored.breakdown[field].input])
    ),
    {
      unitSpecialtyPower: 2000000,
      rocLevel: 160,
      paidUsableHero: 2,
      loftyTroopMillion: 7.5,
      enhancedT10TroopMillion: 1.25,
    }
  );
  assert.equal(scored.breakdown.unitSpecialtyPower.points, 1000);
  assert.equal(scored.breakdown.rocLevel.points, 1600);
  assert.equal(scored.breakdown.paidUsableHero.points, 1000);
  assert.equal(scored.breakdown.loftyTroopMillion.points, 1500);
  assert.equal(scored.breakdown.enhancedT10TroopMillion.points, 500);
  assert.equal(scored.total, 5600);
});

test('paid usable heroes require trusted metadata and normalize names before intersection', () => {
  const input = {
    gameName: 'Hero Trust',
    paidUsableHero: 99,
    paidUsableHeroCount: 99,
    stats: {
      usableHeroNames: [' Cleopatra ', 'CLEOPATRA', 'Ragnar', 'Free Hero'],
      paidUsableHero: 99,
      paidUsableHeroCount: 99,
    },
  };
  const profile = createBohScoringProfile({ bonusWeights: { paidUsableHero: 100 } });
  const trusted = scoreBohSignup(input, profile, {
    paidUsableHeroNames: ['cleopatra', 'RAGNAR', 'ragnar', 'Unowned Paid Hero'],
  });
  const missingMetadata = scoreBohSignup(input, profile);

  assert.equal(trusted.breakdown.paidUsableHero.input, 2);
  assert.equal(trusted.breakdown.paidUsableHero.points, 200);
  assert.equal(missingMetadata.breakdown.paidUsableHero.input, 0);
  assert.equal(missingMetadata.breakdown.paidUsableHero.points, 0);
});

test('aggregate troop estimates override legacy rows and legacy encodings still sum', () => {
  const profile = createBohScoringProfile({
    bonusWeights: { loftyTroopMillion: 10, enhancedT10TroopMillion: 20 },
  });
  const aggregate = scoreBohSignup(
    {
      gameName: 'Aggregate Troops',
      troopRoster: [
        'estimate|lofty|7000000',
        'cavalry|S|normal|1000000',
        'archers|SS|enhanced|2000000',
        'footmen|SSS|normal|3000000',
        'estimate|enhanced-t10|1500000',
        'cavalry|X|enhanced|4000000',
        'archers|X|normal|9000000',
      ],
    },
    profile
  );
  const legacy = scoreBohSignup(
    {
      gameName: 'Legacy Troops',
      troopRoster: [
        'cavalry|S|normal|1000000',
        'archers|SS|enhanced|2000000',
        'footmen|SSS|normal|3000000',
        'cavalry|X|enhanced|4000000',
        'footmen|X|enhanced|500000',
        'archers|X|normal|9000000',
        'footmen|IX|enhanced|8000000',
      ],
    },
    profile
  );

  assert.equal(aggregate.breakdown.loftyTroopMillion.input, 7);
  assert.equal(aggregate.breakdown.enhancedT10TroopMillion.input, 1.5);
  assert.equal(aggregate.breakdown.loftyTroopMillion.points, 70);
  assert.equal(aggregate.breakdown.enhancedT10TroopMillion.points, 30);
  assert.equal(legacy.breakdown.loftyTroopMillion.input, 6);
  assert.equal(legacy.breakdown.enhancedT10TroopMillion.input, 4.5);
  assert.equal(legacy.breakdown.loftyTroopMillion.points, 60);
  assert.equal(legacy.breakdown.enhancedT10TroopMillion.points, 90);
});

test('player-controlled usefulness is ignored and only a bounded admin adjustment can score', () => {
  const playerInput = {
    playerId: 'member-owned',
    gameName: 'Member Owned',
    stats: { bohUsefulRating: 100, bohUseful: 100 },
    bohUsefulRating: 100,
  };
  const withoutAdminAdjustment = scoreBohSignup(playerInput);
  const withAdminAdjustment = scoreBohSignup(playerInput, BOH_2025_SCORING_PROFILE, {
    adminUsefulnessRating: 3.5,
  });

  assert.equal('bohUsefulRating' in normalizeBohSignup(playerInput).stats, false);
  assert.equal(withoutAdminAdjustment.breakdown.bohUsefulRating.input, 0);
  assert.equal(withoutAdminAdjustment.breakdown.bohUsefulRating.points, 0);
  assert.equal(withAdminAdjustment.breakdown.bohUsefulRating.input, 3.5);
  assert.equal(withAdminAdjustment.breakdown.bohUsefulRating.points, 3500);
  assert.throws(
    () =>
      scoreBohSignup(playerInput, BOH_2025_SCORING_PROFILE, {
        adminUsefulnessRating: 101,
      }),
    /boh_admin_usefulness_rating_invalid/u
  );
  assert.throws(
    () =>
      scoreBohSignup(playerInput, BOH_2025_SCORING_PROFILE, {
        adminUsefulnessRating: 'not-a-rating',
      }),
    /boh_admin_usefulness_rating_invalid/u
  );
});

test('commitment and locale fields do not change the legacy strength score', () => {
  const stats = {
    troopPower: 1000000,
    buildingPower: 2000000,
    technologyPower: 3000000,
    heroCombatPower: 4000000,
    dragonPower: 5000000,
    t9TroopTypes: ['Cavalry'],
  };
  const available = scoreBohSignup({
    playerId: 'same-player',
    gameName: 'Same Player',
    locale: 'ar',
    stats,
    availability: 'all',
    preferredRole: 'offensive',
    canTeleport: true,
    canUseVoice: true,
    planCommitment: true,
  });
  const backup = scoreBohSignup({
    playerId: 'same-player',
    gameName: 'Same Player',
    locale: 'en',
    stats,
    availability: 'backup',
    preferredRole: 'bottom',
    canTeleport: false,
    canUseVoice: false,
    planCommitment: false,
  });
  assert.deepEqual(available, backup);
});

test('an admin can version and edit a score profile without mutating the legacy default', () => {
  const custom = createBohScoringProfile({
    id: 'boh-2026-v2',
    version: 2,
    precision: 2,
    weights: { troopPower: 0.1, totalCastlePower: 0.01, t9TroopType: 100 },
  });
  const result = scoreBohSignup(
    {
      playerId: 'custom',
      gameName: 'Custom',
      totalCastlePower: 100000,
      troopPower: 100000,
      t9TroopTypes: ['Cavalry'],
    },
    custom
  );

  assert.equal(result.profileId, 'boh-2026-v2');
  assert.equal(result.profileVersion, 2);
  assert.equal(result.breakdown.totalCastlePower.points, 1);
  assert.equal(result.breakdown.troopPower.points, 10);
  assert.equal(result.breakdown.t9TroopType.points, 100);
  assert.equal(BOH_2025_SCORING_PROFILE.powerWeights.totalCastlePower, 0);
  assert.equal(BOH_2025_SCORING_PROFILE.bonusWeights.t9TroopType, 3000);
  assert.throws(
    () => createBohScoringProfile({ powerDivisor: 0 }),
    /boh_score_power_divisor_invalid/
  );
});

test('role groups are configurable but must describe exactly twelve seats', () => {
  const groups = normalizeBohRoleGroups([
    { id: 'attack', label: 'Attack', capacity: 3 },
    { id: 'relay', label: 'Relay', capacity: 3 },
    { id: 'top', label: 'Top', capacity: 2 },
    { id: 'bottom', label: 'Bottom', capacity: 2 },
    { id: 'backup', label: 'Back-up', capacity: 2 },
  ]);
  const seats = createBohSeatTemplate(groups);
  assert.equal(seats.length, BOH_TEAM_SIZE);
  assert.deepEqual(
    seats.filter((seat) => seat.roleGroupId === 'backup').map((seat) => seat.seatNumber),
    [11, 12]
  );
  assert.throws(
    () => normalizeBohRoleGroups([{ id: 'attack', label: 'Attack', capacity: 11 }]),
    /boh_role_capacity_total_invalid/
  );
  assert.equal(
    BOH_DEFAULT_ROLE_GROUPS.reduce((sum, role) => sum + role.capacity, 0),
    12
  );
});

test('team validation requires six teams, twelve seats each, and 72 unique accounts', () => {
  const teams = completeTeams();
  const valid = validateBohTeamAssignments(teams);
  assert.equal(valid.valid, true);
  assert.equal(valid.teamCount, 6);
  assert.equal(valid.playerCount, 72);
  assert.equal(valid.uniquePlayerCount, 72);

  teams[1].players[0].playerId = teams[0].players[0].playerId;
  teams[2].players.pop();
  const invalid = validateBohTeamAssignments(teams);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.code === 'boh_player_id_duplicate'));
  assert.ok(invalid.errors.some((error) => error.code === 'boh_team_size_invalid'));
  assert.ok(invalid.errors.some((error) => error.code === 'boh_field_size_invalid'));
});

test('balancing is deterministic, complete, role-covered, and score-balanced', () => {
  const input = draftPlayers();
  const first = balanceBohTeams(input);
  const second = balanceBohTeams(input);
  const assignments = (result) =>
    result.teams.map((team) => team.players.map((player) => player.playerId));

  assert.deepEqual(assignments(first), assignments(second));
  assert.equal(first.validation.valid, true);
  assert.equal(first.teams.length, BOH_TEAM_COUNT);
  assert.ok(first.teams.every((team) => team.players.length === BOH_TEAM_SIZE));
  assert.ok(first.scoreSpread <= 1, `expected near-even totals, received ${first.scoreSpread}`);
  for (const team of first.teams) {
    for (const group of BOH_DEFAULT_ROLE_GROUPS) {
      assert.equal(
        team.players.filter((player) => player.roleGroupId === group.id).length,
        group.capacity
      );
    }
  }
});

test('omitted balance options preserve the legacy six-team assignment order', () => {
  const result = balanceBohTeams(draftPlayers());
  assert.equal(result.teamCount, BOH_TEAM_COUNT);
  assert.equal(result.fieldSize, BOH_FIELD_SIZE);
  assert.equal(result.balanceMetric, 'score');
  assert.deepEqual(
    result.teams.map((team) => team.players.map((player) => player.playerId)),
    [
      [
        'player-1',
        'player-2',
        'player-3',
        'player-4',
        'player-5',
        'player-67',
        'player-66',
        'player-65',
        'player-64',
        'player-63',
        'player-62',
        'player-36',
      ],
      [
        'player-13',
        'player-14',
        'player-15',
        'player-16',
        'player-18',
        'player-55',
        'player-54',
        'player-53',
        'player-52',
        'player-51',
        'player-50',
        'player-47',
      ],
      [
        'player-6',
        'player-17',
        'player-46',
        'player-45',
        'player-44',
        'player-43',
        'player-42',
        'player-41',
        'player-40',
        'player-39',
        'player-38',
        'player-37',
      ],
      [
        'player-61',
        'player-35',
        'player-34',
        'player-33',
        'player-32',
        'player-25',
        'player-30',
        'player-29',
        'player-28',
        'player-27',
        'player-56',
        'player-48',
      ],
      [
        'player-24',
        'player-23',
        'player-22',
        'player-21',
        'player-20',
        'player-19',
        'player-26',
        'player-49',
        'player-57',
        'player-58',
        'player-59',
        'player-60',
      ],
      [
        'player-12',
        'player-11',
        'player-10',
        'player-9',
        'player-8',
        'player-7',
        'player-31',
        'player-68',
        'player-69',
        'player-70',
        'player-71',
        'player-72',
      ],
    ]
  );
  assert.deepEqual(
    result.teams.map((team) => team.totalScore),
    [438, 438, 438, 438, 438, 438]
  );
});

test('balancing supports every team count from two through six deterministically', () => {
  const assignments = (result) =>
    result.teams.map((team) => team.players.map((player) => player.playerId));

  for (let teamCount = 2; teamCount <= BOH_TEAM_COUNT; teamCount += 1) {
    const players = draftPlayers({ teamCount });
    const first = balanceBohTeams(players, { teamCount });
    const second = balanceBohTeams(players, { teamCount });
    const playerIds = first.teams.flatMap((team) => team.players.map((player) => player.playerId));

    assert.deepEqual(assignments(first), assignments(second));
    assert.equal(first.teamCount, teamCount);
    assert.equal(first.fieldSize, teamCount * BOH_TEAM_SIZE);
    assert.equal(first.teams.length, teamCount);
    assert.equal(first.validation.valid, true);
    assert.equal(
      validateBohTeamAssignments(first.teams, { teamCount }).valid,
      true,
      `expected ${teamCount} teams to validate`
    );
    assert.equal(playerIds.length, teamCount * BOH_TEAM_SIZE);
    assert.equal(new Set(playerIds).size, playerIds.length);
    first.teams.forEach((team) => {
      assert.equal(team.players.length, BOH_TEAM_SIZE);
      BOH_DEFAULT_ROLE_GROUPS.forEach((group) => {
        assert.equal(
          team.players.filter((player) => player.roleGroupId === group.id).length,
          group.capacity
        );
      });
    });
  }
});

test('team counts and their exact field sizes are validated before balancing', () => {
  for (const teamCount of [1, 7, 2.5, 'not-a-count']) {
    assert.throws(() => balanceBohTeams(draftPlayers(), { teamCount }), /boh_team_count_invalid/);
  }
  const threeTeams = draftPlayers({ teamCount: 3 });
  assert.throws(
    () => balanceBohTeams(threeTeams.slice(0, -1), { teamCount: 3 }),
    /boh_field_size_invalid/
  );
  assert.throws(
    () =>
      balanceBohTeams(
        [...threeTeams, { playerId: 'extra-player', gameName: 'Extra Player', score: 0 }],
        { teamCount: 3 }
      ),
    /boh_field_size_invalid/
  );
  assert.throws(
    () => balanceBohTeams(draftPlayers({ teamCount: 2 }), { teamCount: 2, balanceMetric: 'power' }),
    /boh_balance_metric_invalid/
  );

  const invalidValidation = validateBohTeamAssignments(completeTeams(2), { teamCount: 1 });
  assert.equal(invalidValidation.valid, false);
  assert.ok(invalidValidation.errors.some((error) => error.code === 'boh_team_count_invalid'));
});

test('custom team numbers are unique integers from one through six with omitted defaults', () => {
  const players = draftPlayers({ teamCount: 2 });
  const defaults = balanceBohTeams(players, {
    teamCount: 2,
    teams: [{ id: 'alpha' }, { id: 'beta' }],
  });
  assert.deepEqual(
    defaults.teams.map((team) => team.number),
    [1, 2]
  );

  assert.throws(
    () =>
      balanceBohTeams(players, {
        teamCount: 2,
        teams: [
          { id: 'alpha', number: 1 },
          { id: 'beta', number: '1' },
        ],
      }),
    /boh_team_number_duplicate/
  );
  for (const number of [0, 7, 1.5, 'not-a-number']) {
    assert.throws(
      () =>
        balanceBohTeams(players, {
          teamCount: 2,
          teams: [
            { id: 'alpha', number },
            { id: 'beta', number: 2 },
          ],
        }),
      /boh_team_number_invalid/
    );
  }

  const duplicateNumbers = completeTeams(2);
  duplicateNumbers[0].number = 1;
  duplicateNumbers[1].number = '1';
  const duplicateValidation = validateBohTeamAssignments(duplicateNumbers, { teamCount: 2 });
  assert.equal(duplicateValidation.valid, false);
  assert.ok(duplicateValidation.errors.some((error) => error.code === 'boh_team_number_duplicate'));

  const invalidNumbers = completeTeams(2);
  invalidNumbers[0].number = 7;
  const invalidNumberValidation = validateBohTeamAssignments(invalidNumbers, { teamCount: 2 });
  assert.equal(invalidNumberValidation.valid, false);
  assert.ok(
    invalidNumberValidation.errors.some((error) => error.code === 'boh_team_number_invalid')
  );
});

test('explicit team references are strict and ambiguous legacy references are rejected', () => {
  const players = draftPlayers({ teamCount: 2 });
  const teams = [
    { id: '2', number: 1, label: 'Numeric ID' },
    { id: 'alpha', number: 2, label: 'Numeric Number' },
  ];
  const strict = balanceBohTeams(players, {
    teamCount: 2,
    teams,
    forcedTeamAssignments: [
      { playerId: 'player-1', teamId: '2' },
      { playerId: 'player-2', teamNumber: 2 },
    ],
  });
  const teamFor = (result, playerId) =>
    result.teams.find((team) => team.players.some((player) => player.playerId === playerId));
  assert.equal(teamFor(strict, 'player-1').id, '2');
  assert.equal(teamFor(strict, 'player-2').id, 'alpha');

  assert.throws(
    () =>
      balanceBohTeams(players, {
        teamCount: 2,
        teams,
        forcedTeamAssignments: { 'player-1': '2' },
      }),
    /boh_forced_team_ambiguous/
  );
  assert.throws(
    () =>
      balanceBohTeams(players, {
        teamCount: 2,
        teams,
        lockedAssignments: [{ playerId: 'player-1', team: 2 }],
      }),
    /boh_locked_team_ambiguous/
  );
  assert.throws(
    () =>
      balanceBohTeams(players, {
        teamCount: 2,
        teams: [
          { id: 'alpha', number: 1 },
          { id: 'beta', number: 2 },
        ],
        forcedTeamAssignments: [{ playerId: 'player-1', teamId: '2' }],
      }),
    /boh_forced_team_unknown/
  );
});

test('balancing honors exact-seat, team, and role locks while retaining legal coverage', () => {
  const result = balanceBohTeams(draftPlayers(), {
    lockedAssignments: {
      'player-1': { teamId: 'team-6', seatNumber: 1 },
      'player-2': { teamId: 'team-1', roleGroupId: 'bottom' },
      'player-3': 'team-4',
    },
  });
  const find = (playerId) => {
    for (const team of result.teams) {
      const player = team.players.find((entry) => entry.playerId === playerId);
      if (player) return { team, player };
    }
    return null;
  };

  assert.equal(find('player-1').team.id, 'team-6');
  assert.equal(find('player-1').player.seatNumber, 1);
  assert.equal(find('player-2').team.id, 'team-1');
  assert.equal(find('player-2').player.roleGroupId, 'bottom');
  assert.equal(find('player-3').team.id, 'team-4');
  assert.ok(find('player-1').player.locked);
  assert.equal(result.validation.valid, true);
});

test('forced team assignments accept array, map, and object inputs without locking seats', () => {
  const inputs = [
    [{ playerId: 'player-1', teamId: 'team-2' }],
    new Map([['player-1', 'team-2']]),
    { 'player-1': { teamId: 'team-2' } },
  ];

  inputs.forEach((forcedTeamAssignments) => {
    const result = balanceBohTeams(draftPlayers({ teamCount: 2 }), {
      teamCount: 2,
      forcedTeamAssignments,
      lockedAssignments: {
        'player-2': { teamId: 'team-1', seatNumber: 1 },
      },
    });
    const forcedTeam = result.teams.find((team) =>
      team.players.some((player) => player.playerId === 'player-1')
    );
    const forcedPlayer = forcedTeam.players.find((player) => player.playerId === 'player-1');
    const lockedPlayer = result.teams
      .flatMap((team) => team.players)
      .find((player) => player.playerId === 'player-2');

    assert.equal(forcedTeam.id, 'team-2');
    assert.equal(forcedPlayer.locked, false);
    assert.equal(lockedPlayer.locked, true);
    assert.equal(result.validation.valid, true);
  });
});

test('forced team assignments reject unknowns, duplicates, and conflicting seat locks', () => {
  const players = draftPlayers({ teamCount: 2 });
  assert.throws(
    () =>
      balanceBohTeams(players, {
        teamCount: 2,
        forcedTeamAssignments: { 'missing-player': 'team-1' },
      }),
    /boh_forced_player_unknown/
  );
  assert.throws(
    () =>
      balanceBohTeams(players, {
        teamCount: 2,
        forcedTeamAssignments: { 'player-1': 'team-3' },
      }),
    /boh_forced_team_unknown/
  );
  assert.throws(
    () =>
      balanceBohTeams(players, {
        teamCount: 2,
        forcedTeamAssignments: [
          { playerId: 'player-1', teamId: 'team-1' },
          { playerId: 'player-1', teamId: 'team-2' },
        ],
      }),
    /boh_forced_player_duplicate/
  );
  assert.throws(
    () =>
      balanceBohTeams(players, {
        teamCount: 2,
        forcedTeamAssignments: { 'player-1': 'team-2' },
        lockedAssignments: {
          'player-1': { teamId: 'team-1', seatNumber: 1 },
        },
      }),
    /boh_forced_locked_team_conflict/
  );

  const compatible = balanceBohTeams(players, {
    teamCount: 2,
    forcedTeamAssignments: { 'player-1': 'team-1' },
    lockedAssignments: { 'player-1': { teamId: 'team-1', seatNumber: 1 } },
  });
  const player = compatible.teams[0].players.find((entry) => entry.playerId === 'player-1');
  assert.equal(player.seatNumber, 1);
  assert.equal(player.locked, true);
});

test('score and total-power balancing optimize inverse fixtures while emitting both totals', () => {
  const teamCount = 2;
  const players = metricDraftPlayers({ teamCount });
  const scoreBalanced = balanceBohTeams(players, { teamCount, balanceMetric: 'score' });
  const powerBalanced = balanceBohTeams(players, {
    teamCount,
    balanceMetric: 'totalPower',
  });

  assert.deepEqual(assignmentIds(scoreBalanced), [
    [
      'metric-1',
      'metric-2',
      'metric-3',
      'metric-23',
      'metric-20',
      'metric-19',
      'metric-18',
      'metric-17',
      'metric-16',
      'metric-15',
      'metric-14',
      'metric-9',
    ],
    [
      'metric-12',
      'metric-11',
      'metric-10',
      'metric-13',
      'metric-8',
      'metric-7',
      'metric-6',
      'metric-5',
      'metric-4',
      'metric-22',
      'metric-21',
      'metric-24',
    ],
  ]);
  assert.deepEqual(assignmentIds(powerBalanced), [
    [
      'metric-24',
      'metric-23',
      'metric-22',
      'metric-4',
      'metric-5',
      'metric-6',
      'metric-7',
      'metric-17',
      'metric-9',
      'metric-10',
      'metric-11',
      'metric-12',
    ],
    [
      'metric-13',
      'metric-14',
      'metric-15',
      'metric-16',
      'metric-8',
      'metric-18',
      'metric-19',
      'metric-20',
      'metric-21',
      'metric-3',
      'metric-2',
      'metric-1',
    ],
  ]);
  assert.notDeepEqual(assignmentIds(scoreBalanced), assignmentIds(powerBalanced));
  assert.ok(scoreBalanced.scoreSpread < powerBalanced.scoreSpread);
  assert.ok(powerBalanced.powerSpread < scoreBalanced.powerSpread);
  assert.equal(scoreBalanced.balanceMetric, 'score');
  assert.equal(scoreBalanced.balanceSpread, scoreBalanced.scoreSpread);
  assert.equal(powerBalanced.balanceMetric, 'totalPower');
  assert.equal(powerBalanced.balanceSpread, powerBalanced.powerSpread);

  for (const result of [scoreBalanced, powerBalanced]) {
    result.teams.forEach((team) => {
      const totalScore = team.players.reduce((total, player) => total + player.score, 0);
      const totalCastlePower = team.players.reduce(
        (total, player) => total + player.totalCastlePower,
        0
      );
      assert.equal(team.totalScore, totalScore);
      assert.equal(team.totalCastlePower, totalCastlePower);
      assert.equal(
        team.balanceTotal,
        result.balanceMetric === 'totalPower' ? totalCastlePower : totalScore
      );
      team.players.forEach((player) => {
        assert.equal(player.totalCastlePower, player.signup.stats.totalCastlePower);
      });
    });
    const scoreTotals = result.teams.map((team) => team.totalScore);
    const powerTotals = result.teams.map((team) => team.totalCastlePower);
    assert.equal(result.scoreSpread, Math.max(...scoreTotals) - Math.min(...scoreTotals));
    assert.equal(result.powerSpread, Math.max(...powerTotals) - Math.min(...powerTotals));
  }
});

test('balanced metric is public, deterministic, scale-stable, and improves two-axis tradeoffs', () => {
  const teamCount = 2;
  const players = metricDraftPlayers({ teamCount });
  const scoreBalanced = balanceBohTeams(players, { teamCount, balanceMetric: 'score' });
  const powerBalanced = balanceBohTeams(players, { teamCount, balanceMetric: 'totalPower' });
  const balanced = balanceBohTeams(players, { teamCount, balanceMetric: 'balanced' });
  const repeated = balanceBohTeams(players, { teamCount, balanceMetric: 'balanced' });
  const scaled = balanceBohTeams(
    metricDraftPlayers({ teamCount, scoreScale: 37, powerScale: 10_000 }),
    {
      teamCount,
      balanceMetric: 'balanced',
    }
  );

  assert.equal(balanced.balanceMetric, 'balanced');
  assert.equal(balanced.balanceSpread, balanced.scoreSpread);
  assert.deepEqual(assignmentIds(balanced), assignmentIds(repeated));
  assert.deepEqual(assignmentIds(balanced), assignmentIds(scaled));
  assert.ok(normalizedWorstSpread(balanced) < normalizedWorstSpread(scoreBalanced));
  assert.ok(normalizedWorstSpread(balanced) < normalizedWorstSpread(powerBalanced));
  assert.ok(balanced.scoreSpread > scoreBalanced.scoreSpread);
  assert.ok(balanced.powerSpread > powerBalanced.powerSpread);
  assert.ok(balanced.scoreSpread < powerBalanced.scoreSpread);
  assert.ok(balanced.powerSpread < scoreBalanced.powerSpread);
  balanced.teams.forEach((team) => {
    assert.equal(team.balanceTotal, team.totalScore);
  });
});

test('balanced multi-start fixes the deterministic single-seed Pareto regression', () => {
  const players = seededDominanceDraftPlayers();
  const scoreBalanced = balanceBohTeams(players, { teamCount: 2, balanceMetric: 'score' });
  const powerBalanced = balanceBohTeams(players, { teamCount: 2, balanceMetric: 'totalPower' });
  const balanced = balanceBohTeams(players, { teamCount: 2, balanceMetric: 'balanced' });
  const balancedObjective = normalizedBalanceSse(balanced);

  // The former direct score-seeded hill climb returned spreads of 7,340 and
  // 12,148,164 here, so the legacy total-power result Pareto-dominated it.
  assert.deepEqual([balanced.scoreSpread, balanced.powerSpread], [3744, 1031968]);
  assert.ok(balancedObjective <= normalizedBalanceSse(scoreBalanced) + 1e-15);
  assert.ok(balancedObjective <= normalizedBalanceSse(powerBalanced) + 1e-15);
  assert.equal(paretoDominates(scoreBalanced, balanced), false);
  assert.equal(paretoDominates(powerBalanced, balanced), false);
});

test('balanced multi-start is no worse than either legacy objective for three to six teams', () => {
  for (let teamCount = 3; teamCount <= BOH_TEAM_COUNT; teamCount += 1) {
    const players = metricDraftPlayers({ teamCount });
    const scoreBalanced = balanceBohTeams(players, { teamCount, balanceMetric: 'score' });
    const powerBalanced = balanceBohTeams(players, { teamCount, balanceMetric: 'totalPower' });
    const balanced = balanceBohTeams(players, { teamCount, balanceMetric: 'balanced' });
    const balancedObjective = normalizedBalanceSse(balanced);

    assert.ok(
      balancedObjective <= normalizedBalanceSse(scoreBalanced) + 1e-15,
      `teamCount=${teamCount} exceeded score objective`
    );
    assert.ok(
      balancedObjective <= normalizedBalanceSse(powerBalanced) + 1e-15,
      `teamCount=${teamCount} exceeded total-power objective`
    );
    assert.equal(balanced.validation.valid, true);
  }
});

test('balanced metric keeps forced and locked seats deterministically', () => {
  const teamCount = 2;
  const options = {
    teamCount,
    balanceMetric: 'balanced',
    forcedTeamAssignments: { 'metric-24': { teamId: 'team-1' } },
    lockedAssignments: { 'metric-1': { teamId: 'team-2', seatNumber: 1 } },
  };
  const constrained = balanceBohTeams(metricDraftPlayers({ teamCount }), options);
  const repeated = balanceBohTeams(metricDraftPlayers({ teamCount }), options);
  const constrainedPlayers = constrained.teams.flatMap((team) =>
    team.players.map((player) => ({ teamId: team.id, ...player }))
  );
  const locked = constrainedPlayers.find((player) => player.playerId === 'metric-1');
  const forced = constrainedPlayers.find((player) => player.playerId === 'metric-24');

  assert.equal(locked.teamId, 'team-2');
  assert.equal(locked.seatNumber, 1);
  assert.equal(locked.locked, true);
  assert.equal(forced.teamId, 'team-1');
  assert.equal(forced.locked, false);
  assert.equal(constrained.validation.valid, true);
  assert.deepEqual(assignmentIds(constrained), assignmentIds(repeated));
});

test('balanced metric handles zero-power and zero-both objective axes', () => {
  const teamCount = 2;
  const zeroMeanScore = balanceBohTeams(metricDraftPlayers({ teamCount, zeroScore: true }), {
    teamCount,
    balanceMetric: 'balanced',
  });
  const zeroMeanPower = balanceBohTeams(metricDraftPlayers({ teamCount, zeroPower: true }), {
    teamCount,
    balanceMetric: 'balanced',
  });
  const zeroBoth = balanceBohTeams(
    metricDraftPlayers({ teamCount, zeroScore: true, zeroPower: true }),
    { teamCount, balanceMetric: 'balanced' }
  );

  assert.equal(zeroMeanScore.scoreSpread, 0);
  assert.equal(zeroMeanScore.balanceSpread, 0);
  assert.ok(Number.isFinite(zeroMeanScore.powerSpread));
  assert.equal(zeroMeanScore.validation.valid, true);
  assert.equal(zeroMeanPower.powerSpread, 0);
  assert.ok(Number.isFinite(zeroMeanPower.scoreSpread));
  assert.equal(zeroMeanPower.validation.valid, true);
  assert.equal(zeroBoth.scoreSpread, 0);
  assert.equal(zeroBoth.powerSpread, 0);
  assert.equal(normalizedBalanceSse(zeroBoth), 0);
  assert.equal(zeroBoth.validation.valid, true);
});

test('total-power balancing normalizes mixed adapter aliases before applying constraints', () => {
  const teamCount = 3;
  const basePlayers = draftPlayers({ teamCount });
  const expectedPower = new Map(
    basePlayers.map((player, index) => [player.playerId, (index + 1) ** 2 * 1000])
  );
  const canonical = basePlayers.map((player) => ({
    ...player,
    stats: { totalCastlePower: expectedPower.get(player.playerId) },
  }));
  const mixed = basePlayers.map((player, index) => {
    const power = expectedPower.get(player.playerId);
    if (index % 4 === 0) {
      return {
        ...player,
        signup: {
          playerId: player.playerId,
          gameName: player.gameName,
          stats: { totalCastlePower: 1 },
        },
        totalCastlePower: power,
      };
    }
    if (index % 4 === 1) {
      return {
        ...player,
        signup: {
          playerId: player.playerId,
          gameName: player.gameName,
          totalPower: 1,
        },
        totalPower: power,
      };
    }
    if (index % 4 === 2) return { ...player, stats: { totalPower: power } };
    return { ...player, totalPower: power };
  });
  const options = {
    teamCount,
    balanceMetric: 'totalPower',
    forcedTeamAssignments: { 'player-1': { teamNumber: 3 } },
    lockedAssignments: { 'player-2': { teamNumber: 2, seatNumber: 1 } },
  };
  const canonicalResult = balanceBohTeams(canonical, options);
  const mixedResult = balanceBohTeams(mixed, options);
  const assignments = (result) =>
    result.teams.map((team) => team.players.map((player) => player.playerId));

  assert.deepEqual(assignments(mixedResult), assignments(canonicalResult));
  mixedResult.teams.forEach((team) => {
    team.players.forEach((player) => {
      assert.equal(player.totalCastlePower, expectedPower.get(player.playerId));
      assert.equal(player.signup.stats.totalCastlePower, expectedPower.get(player.playerId));
    });
  });
  const teamFor = (playerId) =>
    mixedResult.teams.find((team) => team.players.some((player) => player.playerId === playerId));
  assert.equal(teamFor('player-1').number, 3);
  assert.equal(
    teamFor('player-1').players.find((player) => player.playerId === 'player-1').locked,
    false
  );
  assert.equal(teamFor('player-2').number, 2);
  assert.equal(
    teamFor('player-2').players.find((player) => player.playerId === 'player-2').seatNumber,
    1
  );
});

test('draft total power is finite and clamped to the store-compatible range', () => {
  const players = draftPlayers({ teamCount: 2, sameScore: true }).map((player, index) => {
    if (index === 0) return { ...player, totalCastlePower: -100 };
    if (index === 1) return { ...player, totalPower: Number.POSITIVE_INFINITY };
    if (index === 2) return { ...player, stats: { totalCastlePower: 10 ** 15 } };
    if (index === 3) return { ...player, stats: { totalPower: '1,234' } };
    if (index === 4) {
      return {
        ...player,
        signup: {
          playerId: player.playerId,
          gameName: player.gameName,
          stats: { totalCastlePower: 10 },
        },
        stats: { totalCastlePower: 20 },
        totalPower: 30,
        totalCastlePower: 40,
      };
    }
    return player;
  });
  const result = balanceBohTeams(players, { teamCount: 2, balanceMetric: 'totalPower' });
  const byId = new Map(
    result.teams.flatMap((team) => team.players.map((player) => [player.playerId, player]))
  );

  assert.equal(byId.get('player-1').totalCastlePower, 0);
  assert.equal(byId.get('player-2').totalCastlePower, 0);
  assert.equal(byId.get('player-3').totalCastlePower, 10 ** 12);
  assert.equal(byId.get('player-4').totalCastlePower, 1234);
  assert.equal(byId.get('player-5').totalCastlePower, 40);
});

test('role eligibility is a hard coverage input and impossible coverage is rejected', () => {
  const roleIds = [];
  BOH_DEFAULT_ROLE_GROUPS.forEach((group) => {
    for (let index = 0; index < group.capacity * BOH_TEAM_COUNT; index += 1) {
      roleIds.push([group.id]);
    }
  });
  const specialists = draftPlayers({ roles: roleIds, sameScore: true });
  const result = balanceBohTeams(specialists);
  result.teams.forEach((team) => {
    team.players.forEach((player) => {
      assert.deepEqual(player.signup.eligibleRoleIds, [player.roleGroupId]);
    });
  });

  const impossible = draftPlayers({
    roles: Array.from({ length: BOH_FIELD_SIZE }, () => ['offensive']),
  });
  assert.throws(() => balanceBohTeams(impossible), /boh_role_coverage_unavailable/);
});

test('field size and duplicate account failures are explicit before a draft is returned', () => {
  assert.throws(() => balanceBohTeams(draftPlayers().slice(0, 71)), /boh_field_size_invalid/);
  const duplicate = draftPlayers();
  duplicate[71].playerId = duplicate[0].playerId;
  assert.throws(() => balanceBohTeams(duplicate), /boh_player_id_duplicate/);
});

test('the default plan normalizes four time phases, two Legions, and twelve seats', () => {
  const plan = normalizeBohPlan({ id: 'final-plan' });
  assert.equal(plan.id, 'final-plan');
  assert.deepEqual(
    plan.phases.map((phase) => phase.id),
    BOH_DEFAULT_PHASES.map((phase) => phase.id)
  );
  assert.deepEqual(
    plan.legions.map((legion) => legion.id),
    BOH_DEFAULT_LEGIONS.map((legion) => legion.id)
  );
  assert.equal(createBohSeatTemplate(plan.roleGroups).length, 12);
  assert.throws(
    () =>
      normalizeBohPlan({
        roleDefaults: [
          {
            roleGroupId: 'not-a-role',
            phaseId: 'phase-0-5',
            legionId: 'legion-1',
            instruction: 'Nope',
          },
        ],
      }),
    /boh_role_unknown/
  );
});

test('plan objectives preserve only admin-authored schematic coordinates', () => {
  const objectives = normalizeBohObjectives([
    { id: 'south-spawn', code: 'SP', label: 'South Spawn', type: 'spawn', x: 8, y: 88 },
    { id: 'tower-3', code: 'T3', label: 'Tower 3', x: '50', y: '50' },
    { id: 'cc-1', code: 'CC1', label: 'Command Center 1' },
  ]);
  assert.deepEqual(
    objectives.map(({ id, x, y }) => ({ id, x, y })),
    [
      { id: 'south-spawn', x: 8, y: 88 },
      { id: 'tower-3', x: 50, y: 50 },
      { id: 'cc-1', x: null, y: null },
    ]
  );
  const plan = normalizeBohPlan({ objectives });
  assert.equal(plan.objectives[0].label, 'South Spawn');
  assert.equal(plan.objectives[0].type, 'spawn');
  assert.throws(
    () => normalizeBohObjectives([{ id: 'outside', x: 101, y: 50 }]),
    /boh_objective_coordinate_invalid/u
  );
  assert.throws(
    () => normalizeBohObjectives([{ id: 'same' }, { id: 'same' }]),
    /boh_objective_id_duplicate/u
  );
});

test('instruction resolution merges wildcard and exact rules in global-role-seat-player order', () => {
  const plan = {
    id: 'precedence-plan',
    instructions: [
      {
        id: 'global-opening',
        phaseId: '*',
        legionId: '*',
        instruction: { action: 'Wait', summary: 'Hold until the team call' },
      },
    ],
    roleDefaults: [
      {
        id: 'role-global',
        roleGroupId: 'offensive',
        phaseId: '*',
        legionId: '*',
        instruction: { action: 'Build', target: 'Center', loadout: 'T1s' },
      },
      {
        id: 'role-exact',
        roleGroupId: 'offensive',
        phaseId: 'phase-0-5',
        legionId: 'legion-1',
        instruction: { target: 'CC1' },
      },
    ],
    seatOverrides: [
      {
        id: 'seat-exact',
        seatNumber: 1,
        phaseId: 'phase-0-5',
        legionId: 'legion-1',
        instruction: { action: 'Capture', teleport: false },
      },
    ],
    playerOverrides: [
      {
        id: 'player-exact',
        playerId: 'player-1',
        phaseId: 'phase-0-5',
        legionId: 'legion-1',
        instruction: { target: 'CC2', note: 'Lead the push' },
      },
    ],
  };
  const resolved = resolveBohInstruction(plan, {
    teamId: 'team-1',
    phaseId: 'phase-0-5',
    legionId: 'legion-1',
    roleGroupId: 'offensive',
    seatNumber: 1,
    playerId: 'player-1',
  });

  assert.deepEqual(resolved.instruction, {
    action: 'Capture',
    target: 'CC2',
    loadout: 'T1s',
    teleport: false,
    note: 'Lead the push',
    summary: 'Hold until the team call',
  });
  assert.deepEqual(
    resolved.sources.map((source) => source.level),
    ['global', 'role', 'role', 'seat', 'player']
  );
});

test('phase and Legion rotations swap seats without duplicating players', () => {
  const team = oneTeam();
  const plan = {
    rotations: [
      {
        id: 'move-attacker-to-rune',
        playerId: 'player-1',
        seatNumber: 5,
        phaseId: 'phase-5-10',
        legionId: 'legion-1',
      },
    ],
  };
  const legionOne = projectBohPhaseAssignments(plan, team, 'phase-5-10', 'legion-1');
  const moved = legionOne.find((entry) => entry.playerId === 'player-1');
  const displaced = legionOne.find((entry) => entry.playerId === 'player-5');
  assert.equal(moved.seatNumber, 5);
  assert.equal(moved.roleGroupId, 'rune');
  assert.equal(moved.rotated, true);
  assert.equal(displaced.seatNumber, 1);
  assert.equal(displaced.roleGroupId, 'offensive');
  assert.equal(new Set(legionOne.map((entry) => entry.playerId)).size, 12);
  assert.equal(new Set(legionOne.map((entry) => entry.seatNumber)).size, 12);

  const legionTwo = projectBohPhaseAssignments(plan, team, 'phase-5-10', 'legion-2');
  assert.equal(legionTwo.find((entry) => entry.playerId === 'player-1').seatNumber, 1);
});

test('a player timeline follows rotations and exposes both Legion alternatives by default', () => {
  const team = oneTeam();
  const plan = {
    roleDefaults: [
      {
        id: 'offensive-default',
        roleGroupId: 'offensive',
        phaseId: '*',
        legionId: '*',
        instruction: { action: 'Attack', target: 'Center' },
      },
      {
        id: 'rune-default',
        roleGroupId: 'rune',
        phaseId: '*',
        legionId: '*',
        instruction: { action: 'Take Rune', target: 'Relay' },
      },
    ],
    rotations: [
      {
        id: 'phase-two-rotation',
        playerId: 'player-1',
        seatNumber: 5,
        phaseId: 'phase-5-10',
        legionId: 'legion-1',
      },
    ],
    playerOverrides: [
      {
        id: 'player-phase-two',
        playerId: 'player-1',
        phaseId: 'phase-5-10',
        legionId: 'legion-1',
        instruction: { target: 'RP2', teleport: true },
      },
    ],
  };

  const allAlternatives = projectBohPlayerTimeline(plan, team, 'player-1');
  assert.equal(allAlternatives.length, 8);
  const legionOne = projectBohPlayerTimeline(plan, team, 'player-1', {
    legionId: 'legion-1',
  });
  assert.equal(legionOne.length, 4);
  assert.deepEqual(
    legionOne.map((entry) => entry.phaseId),
    BOH_DEFAULT_PHASES.map((phase) => phase.id)
  );
  assert.equal(legionOne[0].seatNumber, 1);
  assert.equal(legionOne[0].roleGroupId, 'offensive');
  assert.equal(legionOne[0].instruction.action, 'Attack');
  assert.equal(legionOne[1].seatNumber, 5);
  assert.equal(legionOne[1].roleGroupId, 'rune');
  assert.equal(legionOne[1].rotated, true);
  assert.deepEqual(legionOne[1].instruction, {
    action: 'Take Rune',
    target: 'RP2',
    teleport: true,
  });
});

test('custom phases and team-specific rules stay isolated to their intended plan context', () => {
  const team = oneTeam();
  const plan = {
    phases: [
      { id: 'opening', label: 'Opening', startMinute: 0, endMinute: 8 },
      { id: 'finish', label: 'Finish', startMinute: 8, endMinute: 30 },
    ],
    roleDefaults: [
      {
        id: 'general',
        roleGroupId: 'offensive',
        phaseId: 'opening',
        legionId: 'legion-1',
        instruction: { target: 'CC1' },
      },
      {
        id: 'team-one',
        teamId: 'team-1',
        roleGroupId: 'offensive',
        phaseId: 'opening',
        legionId: 'legion-1',
        instruction: { target: 'CC4' },
      },
    ],
  };
  const timeline = projectBohPlayerTimeline(plan, team, 'player-1', {
    legionId: 'legion-1',
  });
  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].startMinute, 0);
  assert.equal(timeline[0].endMinute, 8);
  assert.equal(timeline[0].instruction.target, 'CC4');
});

test('plan validation finds missing instructions and invalid rotation players', () => {
  const team = oneTeam();
  const missing = validateBohPlan({}, { team, requireInstructions: true });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.some((error) => error.code === 'boh_instruction_missing'));

  const invalidRotation = validateBohPlan(
    {
      rotations: [
        {
          playerId: 'not-on-team',
          seatNumber: 1,
          phaseId: 'phase-0-5',
          legionId: 'legion-1',
        },
      ],
    },
    { team }
  );
  assert.equal(invalidRotation.valid, false);
  assert.ok(
    invalidRotation.errors.some((error) => error.code === 'boh_rotation_player_not_in_team')
  );
});
