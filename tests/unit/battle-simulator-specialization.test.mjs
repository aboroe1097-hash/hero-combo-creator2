import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STAT_CONTRIBUTION_PRODUCER,
  STAT_CONTRIBUTION_SCHEMA,
  STAT_CONTRIBUTION_SCHEMA_VERSION,
  buildStatContributionSnapshot,
} from '../../js/specialization-towers-v2-contributions.js';
import { SPECIALIZATION_RESEARCH } from '../../js/specialization-towers-v2-data.js';
import {
  createEmptySpecializationState,
  setResearchNodes,
} from '../../js/specialization-towers-v2-model.js';
import {
  SPECIALIZATION_BATTLE_ADAPTER_REVISION,
  adaptSpecializationBattleSources,
  resolveSpecializationBattleSources,
} from '../../js/battle-simulator-specialization.js';

function snapshot(entries = [], diagnostics = []) {
  return {
    schema: STAT_CONTRIBUTION_SCHEMA,
    schemaVersion: STAT_CONTRIBUTION_SCHEMA_VERSION,
    producer: { id: STAT_CONTRIBUTION_PRODUCER, dataRevision: 'fixture-r1' },
    selection: {},
    entries,
    diagnostics,
  };
}

function entry(overrides = {}) {
  return {
    id: 'fixture/cavalry/node/1/primary/battle.mightpct',
    kind: 'stat',
    source: { type: 'specialization-tower', kind: 'node', troopId: 'cavalry', nodeId: 1 },
    statKey: 'battle.mightPct',
    operation: 'add',
    unit: 'percentage-point',
    value: 12.5,
    rawBonusName: 'Might All',
    appliesWhen: {
      battleModes: ['*'],
      engagements: ['*'],
      events: ['*'],
      formations: ['*'],
    },
    troopTarget: 'cavalry',
    rowScope: 'all',
    ...overrides,
  };
}

test('empty state produces an immutable empty adapter result', () => {
  const result = resolveSpecializationBattleSources(createEmptySpecializationState());
  assert.deepEqual(result.sources, []);
  assert.deepEqual(result.unitSources, []);
  assert.deepEqual(result.effects, []);
  assert.deepEqual(result.excluded, []);
  assert.equal(result.summary.sourceCount, 0);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.sources), true);
  assert.equal(SPECIALIZATION_BATTLE_ADAPTER_REVISION, 1);
});

test('a fully selected canonical research sample maps its battle-ready contributions', () => {
  const research = SPECIALIZATION_RESEARCH.training1;
  const selected = research.nodes.map(({ id }) => id);
  if (research.passiveSkillNodeId !== null) selected.push(research.passiveSkillNodeId);
  const state = setResearchNodes(
    createEmptySpecializationState(),
    'cavalry',
    research.id,
    selected
  );
  const producer = buildStatContributionSnapshot(state);
  const result = resolveSpecializationBattleSources(state);

  assert.equal(result.revision, producer.producer.dataRevision);
  assert.ok(result.sources.length > 0);
  assert.ok(result.unitSources.length > 0);
  assert.ok(result.effects.length > 0);
  assert.ok(result.sources.every(({ sourceType }) => sourceType === 'specialization'));
  assert.ok(result.sources.every(({ appliesTo }) => appliesTo.troopTypes[0] === 'cavalry'));
  assert.ok(
    result.sources.every(
      ({ provenance }) =>
        provenance.adapterRevision === SPECIALIZATION_BATTLE_ADAPTER_REVISION &&
        provenance.dataRevision === result.revision
    )
  );
});

test('battle mappings use percent units and combat speed uses raw points', () => {
  const keys = [
    ['battle.mightPct', 'might', 'percent'],
    ['battle.resistancePct', 'resistance', 'percent'],
    ['battle.hpPct', 'hp', 'percent'],
    ['battle.tacticalMightPct', 'tacticalMight', 'percent'],
    ['battle.tacticalResistancePct', 'tacticalResistance', 'percent'],
    ['battle.damagePct', 'damage', 'percent'],
    ['battle.combatSpeedPoints', 'combatSpeed', 'raw'],
  ];
  const entries = keys.map(([statKey], index) =>
    entry({ id: `mapped-${index}`, statKey, value: index + 1 })
  );
  const result = adaptSpecializationBattleSources(snapshot(entries));
  assert.deepEqual(
    result.sources.map(({ statKey, unit }) => [statKey, unit]).sort(),
    keys.map(([, statKey, unit]) => [statKey, unit]).sort()
  );
});

test('scopes normalize troop IDs and scenario context excludes non-matches with diagnostics', () => {
  const scoped = entry({
    id: 'scoped',
    troopTarget: 'footman',
    rowScope: 'mid',
    appliesWhen: {
      battleModes: ['pvp-field'],
      engagements: ['siege-attack'],
      events: ['eden'],
      formations: ['rally-lead'],
    },
  });
  const matching = adaptSpecializationBattleSources(snapshot([scoped]), {
    battleMode: 'pvp-field',
    engagement: 'siege-attack',
    event: 'eden',
    formation: 'rally-lead',
  });
  assert.deepEqual(matching.sources[0].appliesTo, {
    battleModes: ['pvp-field'],
    troopTypes: ['footmen'],
    rowIds: ['middle'],
  });

  const mismatch = adaptSpecializationBattleSources(snapshot([scoped]), {
    battleMode: 'pvp-field',
    engagement: 'field',
    event: 'eden',
    formation: 'rally-lead',
  });
  assert.deepEqual(mismatch.sources, []);
  assert.equal(mismatch.excluded[0].reason, 'context-mismatch');
  assert.equal(mismatch.excluded[0].contextField, 'engagement');
  assert.equal(mismatch.diagnostics[0].code, 'context-mismatch');
});

test('unit base percentages remain separate and map to attack, defense, and hp', () => {
  const entries = [
    ['unit.baseMightBonusPct', 'attack'],
    ['unit.baseResistanceBonusPct', 'defense'],
    ['unit.baseHpBonusPct', 'hp'],
  ].map(([statKey], index) => entry({ id: `unit-${index}`, statKey, value: index + 2 }));
  const result = adaptSpecializationBattleSources(snapshot(entries));

  assert.deepEqual(result.sources, []);
  assert.deepEqual(
    result.unitSources.map(({ statKey, unit }) => [statKey, unit]),
    [
      ['attack', 'percent'],
      ['defense', 'percent'],
      ['hp', 'percent'],
    ]
  );
  assert.deepEqual(result.summary.unitTotals, { attack: 2, defense: 3, hp: 4 });
});

test('unmapped numeric stats fail closed and retain producer diagnostics', () => {
  const result = adaptSpecializationBattleSources(
    snapshot(
      [entry({ id: 'unknown', statKey: 'utility.marchingSpeedPct' })],
      [{ id: 'producer-unknown', code: 'unmapped-stat', bonusName: 'Physical Damage All' }]
    )
  );
  assert.deepEqual(result.sources, []);
  assert.equal(result.excluded[0].reason, 'unmapped-stat');
  assert.equal(result.diagnostics.filter(({ code }) => code === 'unmapped-stat').length, 2);
});

test('conditional prose remains visible but is never applied as a numeric source', () => {
  const prose = entry({
    id: 'conditional-effect',
    kind: 'effect',
    effectKey: 'specialization.effect',
    description: 'Increase damage for the first 2 rounds.',
    statKey: undefined,
    value: undefined,
    appliesWhen: {
      battleModes: ['*'],
      engagements: ['siege-defense'],
      events: ['*'],
      formations: ['*'],
    },
  });
  const result = adaptSpecializationBattleSources(snapshot([prose]), {
    engagement: 'field',
  });
  assert.deepEqual(result.sources, []);
  assert.equal(result.effects.length, 1);
  assert.equal(result.effects[0].description, prose.description);
  assert.equal(result.effects[0].active, false);
  assert.equal(result.excluded[0].kind, 'effect');
});

test('malformed states, contexts, snapshots, and entries fail closed', () => {
  const badState = resolveSpecializationBattleSources({ troops: [] });
  assert.deepEqual(badState.sources, []);
  assert.equal(badState.diagnostics[0].code, 'invalid-state');

  const badContext = adaptSpecializationBattleSources(snapshot([entry()]), { weather: 'rain' });
  assert.deepEqual(badContext.sources, []);
  assert.equal(badContext.diagnostics[0].code, 'invalid-input');

  const badSnapshot = adaptSpecializationBattleSources({ schema: 'wrong' });
  assert.deepEqual(badSnapshot.sources, []);
  assert.equal(badSnapshot.diagnostics[0].code, 'invalid-input');

  const badEntry = adaptSpecializationBattleSources(snapshot([entry({ value: Infinity })]));
  assert.deepEqual(badEntry.sources, []);
  assert.equal(badEntry.excluded[0].reason, 'invalid-contribution');
});

test('exact duplicates apply once while conflicting IDs apply nothing', () => {
  const exact = entry({ id: 'duplicate' });
  const duplicate = adaptSpecializationBattleSources(snapshot([exact, structuredClone(exact)]));
  assert.equal(duplicate.sources.length, 1);
  assert.equal(duplicate.diagnostics[0].code, 'duplicate-contribution');

  const conflict = adaptSpecializationBattleSources(
    snapshot([exact, entry({ id: 'duplicate', value: 99 })])
  );
  assert.deepEqual(conflict.sources, []);
  assert.equal(conflict.excluded[0].reason, 'conflicting-contribution');
  assert.equal(conflict.diagnostics[0].code, 'conflicting-contribution');
});

test('results are deterministic, detached, and deeply immutable', () => {
  const alpha = entry({ id: 'alpha', value: 1 });
  const zulu = entry({ id: 'zulu', value: 2, troopTarget: 'archer' });
  const raw = snapshot([zulu, alpha]);
  const before = structuredClone(raw);
  const forward = adaptSpecializationBattleSources(raw);
  const reverse = adaptSpecializationBattleSources(snapshot([alpha, zulu]));

  assert.deepEqual(forward, reverse);
  assert.deepEqual(raw, before);
  assert.deepEqual(
    forward.sources.map(({ sourceId }) => sourceId),
    ['specialization:alpha', 'specialization:zulu']
  );
  assert.equal(Object.isFrozen(forward.sources[0].provenance.specializationSource), true);
  assert.equal(Object.isFrozen(forward.summary), true);
});
