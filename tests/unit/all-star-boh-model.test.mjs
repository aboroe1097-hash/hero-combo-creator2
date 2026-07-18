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
  return Array.from({ length: BOH_FIELD_SIZE }, (_, index) => ({
    playerId: `player-${index + 1}`,
    gameName: `Player ${index + 1}`,
    score: options.sameScore ? 100 : BOH_FIELD_SIZE - index,
    eligibleRoleIds: roles?.[index] || [],
    rolePreferences: roles?.[index] || [],
  }));
}

function completeTeams() {
  const seats = createBohSeatTemplate();
  return Array.from({ length: BOH_TEAM_COUNT }, (_, teamIndex) => ({
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
      fightingTimeIds: ['+20', '+12'],
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
  assert.deepEqual(signup.commitment.fightingTimeIds, ['+12', '+20']);
  assert.deepEqual(BOH_FIGHTING_TIME_IDS, ['+8', '+12', '+14', '+20']);

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
    fightingTimeIds: index % 2 ? ['+8', '+14'] : ['+12', '+20'],
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
  for (const fightingTimeIds of [[], ['+8'], ['+8', '+8'], ['+8', '+12', '+14']]) {
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
    () => normalizeBohSignup({ gameName: 'Bad time', fightingTimeIds: ['+8', '+10'] }),
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
        t9TroopTypes: ['Cavalry', 'Archers', 'Footmen'],
        readySpeedHeroes: ['LionHeart', 'Cao Cao'],
        level50HeroCount: 4,
        bohUsefulRating: 99,
      },
    },
    BOH_2025_SCORING_PROFILE,
    { adminUsefulnessRating: 2 }
  );

  assert.equal(scored.profileId, 'all-star-boh-2025-v1');
  assert.equal(scored.breakdown.totalCastlePower.points, 0);
  assert.equal(scored.breakdown.troopPower.points, 50);
  assert.equal(scored.breakdown.buildingPower.points, 600);
  assert.equal(scored.breakdown.technologyPower.points, 2100);
  assert.equal(scored.breakdown.heroCombatPower.points, 3200);
  assert.equal(scored.breakdown.dragonPower.points, 5000);
  assert.equal(scored.breakdown.t9TroopType.points, 9000);
  assert.equal(scored.breakdown.readySpeedHero.points, 5000);
  assert.equal(scored.breakdown.level50Hero.points, 3000);
  assert.equal(scored.breakdown.bohUsefulRating.points, 2000);
  assert.equal(scored.powerSubtotal, 10950);
  assert.equal(scored.bonusSubtotal, 19000);
  assert.equal(scored.total, 29950);
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
