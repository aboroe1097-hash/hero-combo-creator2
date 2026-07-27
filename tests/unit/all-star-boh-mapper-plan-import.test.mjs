import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BOH_MAPPER_PLAN_IMPORT_FORMAT,
  BOH_MAPPER_PLAN_IMPORT_MAX_BYTES,
  BOH_MAPPER_PLAN_IMPORT_VERSION,
  parseAllStarBohMapperStage1RolePlan,
} from '../../js/all-star-boh-mapper-plan-import.js';

const PHASE_TIMES = ['0-5', '5-10', '10-15', '15-30', '30-60'];

function rolePlan() {
  return {
    format: BOH_MAPPER_PLAN_IMPORT_FORMAT,
    version: BOH_MAPPER_PLAN_IMPORT_VERSION,
    savedAt: '2026-07-27T12:00:00.000Z',
    ignored: '<script>outside allowlist</script>',
    team: {
      id: 'team-1',
      name: 'Team One',
      score: 1_000_000,
      power: 5_000_000_000,
      displayLocale: 'en',
      dominantPlayerLocale: 'ar',
      ignored: true,
    },
    rule: 'Follow the assigned timeline.',
    buildFocus: {
      center: 'Center build',
      top: 'Top build',
      bottom: 'Bottom build',
      rune: 'Rune build',
      ignored: 'not imported',
    },
    titleBadges: [
      { label: 'Captain', value: 'Player 1', ignored: true },
      { label: 'Tower', value: 'Player 2' },
    ],
    players: Array.from({ length: 12 }, (_, index) => ({
      scoreRank: index + 1,
      name: `Player ${index + 1}`,
      locale: index % 2 ? 'ar' : 'en',
      score: 100_000 - index,
      power: 900_000_000 - index,
      roleKey: ['offensive', 'top', 'bottom', 'rune'][index % 4],
      role: {
        label: `Role ${index + 1}`,
        description: `Role description ${index + 1}`,
        ignored: true,
      },
      phases: PHASE_TIMES.map((time, phaseIndex) => ({
        time: time + ' Minutes',
        stageRole: `Stage role ${phaseIndex + 1}`,
        legion1: `Legion 1 instruction ${phaseIndex + 1}`,
        legion2: `Legion 2 instruction ${phaseIndex + 1}`,
        note: phaseIndex === 0 ? 'No teleport' : '',
        ignored: '<unsafe>',
      })),
      ignored: { private: true },
    })),
  };
}

function json(value = rolePlan()) {
  return JSON.stringify(value);
}

function expectCode(run, code) {
  assert.throws(run, (error) => error?.code === code);
}

test('strict role-plan parser sanitizes the supported 12-player, 5-phase contract', () => {
  const parsed = parseAllStarBohMapperStage1RolePlan(json());
  assert.equal(parsed.format, BOH_MAPPER_PLAN_IMPORT_FORMAT);
  assert.equal(parsed.version, BOH_MAPPER_PLAN_IMPORT_VERSION);
  assert.equal(parsed.playerCount, 12);
  assert.equal(parsed.phaseCount, 5);
  assert.deepEqual(Object.keys(parsed), [
    'format',
    'version',
    'savedAt',
    'team',
    'rule',
    'buildFocus',
    'titleBadges',
    'playerCount',
    'phaseCount',
    'players',
  ]);
  assert.deepEqual(Object.keys(parsed.team), [
    'id',
    'name',
    'score',
    'power',
    'displayLocale',
    'dominantPlayerLocale',
  ]);
  assert.deepEqual(Object.keys(parsed.players[0]), [
    'scoreRank',
    'name',
    'locale',
    'score',
    'power',
    'roleKey',
    'role',
    'phases',
  ]);
  assert.deepEqual(
    parsed.players[0].phases.map((phase) => phase.time),
    PHASE_TIMES
  );
  const localized = rolePlan();
  localized.players[1].phases.forEach((phase, index) => {
    phase.time = PHASE_TIMES[index] + ' \u5206\u949f';
  });
  assert.deepEqual(
    parseAllStarBohMapperStage1RolePlan(json(localized)).players[1].phases.map(
      (phase) => phase.time
    ),
    PHASE_TIMES
  );
  assert.deepEqual(parsed.buildFocus, {
    center: 'Center build',
    top: 'Top build',
    bottom: 'Bottom build',
    rune: 'Rune build',
  });
  assert.equal(parsed.ignored, undefined);
  assert.equal(parsed.team.ignored, undefined);
  assert.equal(parsed.players[0].ignored, undefined);
  assert.equal(parsed.players[0].phases[0].ignored, undefined);
});

test('strict role-plan parser accepts absent optional metadata and numeric player fields', () => {
  const payload = rolePlan();
  delete payload.savedAt;
  delete payload.rule;
  delete payload.buildFocus;
  delete payload.titleBadges;
  delete payload.team.score;
  delete payload.team.power;
  delete payload.team.displayLocale;
  delete payload.team.dominantPlayerLocale;
  delete payload.players[0].locale;
  delete payload.players[0].score;
  delete payload.players[0].power;
  delete payload.players[0].phases[0].note;

  const parsed = parseAllStarBohMapperStage1RolePlan(json(payload));
  assert.equal(parsed.savedAt, '');
  assert.equal(parsed.rule, '');
  assert.equal(parsed.buildFocus, null);
  assert.deepEqual(parsed.titleBadges, []);
  assert.equal(parsed.team.score, null);
  assert.equal(parsed.team.power, null);
  assert.equal(parsed.players[0].locale, '');
  assert.equal(parsed.players[0].score, null);
  assert.equal(parsed.players[0].power, null);
  assert.equal(parsed.players[0].phases[0].note, '');
});

test('strict role-plan parser rejects malformed, oversized, and wrong-contract inputs', () => {
  expectCode(() => parseAllStarBohMapperStage1RolePlan(null), 'boh-mapper-plan-input-type');
  expectCode(() => parseAllStarBohMapperStage1RolePlan('{'), 'boh-mapper-plan-invalid-json');
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan('x'.repeat(BOH_MAPPER_PLAN_IMPORT_MAX_BYTES + 1)),
    'boh-mapper-plan-file-too-large'
  );
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json({ ...rolePlan(), format: 'other' })),
    'boh-mapper-plan-wrong-format'
  );
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json({ ...rolePlan(), version: 1 })),
    'boh-mapper-plan-wrong-version'
  );
  const short = rolePlan();
  short.players.pop();
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(short)),
    'boh-mapper-plan-player-count'
  );
});

test('strict role-plan parser rejects duplicate normalized names and score ranks', () => {
  const duplicateName = rolePlan();
  duplicateName.players[1].name = '  PLAYER   1  ';
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(duplicateName)),
    'boh-mapper-plan-duplicate-player-name'
  );

  const duplicateRank = rolePlan();
  duplicateRank.players[1].scoreRank = 1;
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(duplicateRank)),
    'boh-mapper-plan-duplicate-player-rank'
  );

  const outOfRangeRank = rolePlan();
  outOfRangeRank.players[0].scoreRank = 13;
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(outOfRangeRank)),
    'boh-mapper-plan-player-rank'
  );
});

test('strict role-plan parser rejects unsupported roles and corrupt phase timelines', () => {
  const badRole = rolePlan();
  badRole.players[0].roleKey = 'leader';
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(badRole)),
    'boh-mapper-plan-player-role'
  );

  const shortTimeline = rolePlan();
  shortTimeline.players[0].phases.pop();
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(shortTimeline)),
    'boh-mapper-plan-phase-count'
  );

  const reorderedTimeline = rolePlan();
  [reorderedTimeline.players[0].phases[0], reorderedTimeline.players[0].phases[1]] = [
    reorderedTimeline.players[0].phases[1],
    reorderedTimeline.players[0].phases[0],
  ];
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(reorderedTimeline)),
    'boh-mapper-plan-phase-time'
  );

  const missingInstruction = rolePlan();
  missingInstruction.players[0].phases[0].legion1 = '  ';
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(missingInstruction)),
    'boh-mapper-plan-phase-legion'
  );
});

test('strict role-plan parser bounds optional metadata and finite scores', () => {
  const longRule = rolePlan();
  longRule.rule = 'x'.repeat(601);
  expectCode(() => parseAllStarBohMapperStage1RolePlan(json(longRule)), 'boh-mapper-plan-rule');

  const manyBadges = rolePlan();
  manyBadges.titleBadges = Array.from({ length: 13 }, () => ({
    label: 'Badge',
    value: 'Value',
  }));
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(manyBadges)),
    'boh-mapper-plan-title-badges'
  );

  const badScore = rolePlan();
  badScore.players[0].score = Number.NaN;
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(badScore)),
    'boh-mapper-plan-player-score'
  );

  const longInstruction = rolePlan();
  longInstruction.players[0].phases[0].legion2 = 'x'.repeat(1_001);
  expectCode(
    () => parseAllStarBohMapperStage1RolePlan(json(longInstruction)),
    'boh-mapper-plan-phase-legion'
  );
});
