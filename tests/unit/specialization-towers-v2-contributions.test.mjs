import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  SPECIALIZATION_COLUMNS,
  SPECIALIZATION_RESEARCH,
  SPECIALIZATION_TROOPS,
} from '../../js/specialization-towers-v2-data.js';
import {
  STAT_CONTRIBUTION_SCHEMA,
  STAT_CONTRIBUTION_SCHEMA_VERSION,
  buildStatContributionSnapshot,
  resolveBasePointTotal,
  summarizeStatContributions,
} from '../../js/specialization-towers-v2-contributions.js';
import {
  createEmptySpecializationState,
  setResearchNodes,
} from '../../js/specialization-towers-v2-model.js';

function allNodeIds(researchId) {
  const research = SPECIALIZATION_RESEARCH[researchId];
  const ids = research.nodes.map((node) => node.id);
  if (research.passiveSkillNodeId !== null) ids.push(research.passiveSkillNodeId);
  return ids;
}

function select(state, troopId, researchId, nodeIds) {
  return setResearchNodes(state, troopId, researchId, nodeIds);
}

function findNode(researchId, predicate) {
  const node = SPECIALIZATION_RESEARCH[researchId].nodes.find(predicate);
  assert.ok(node, `Expected fixture node in ${researchId}`);
  return node;
}

function findResearchNode(predicate) {
  for (const research of Object.values(SPECIALIZATION_RESEARCH)) {
    const node = research.nodes.find(predicate);
    if (node) return { research, node };
  }
  assert.fail('Expected a canonical fixture node');
}

test('snapshot keeps raw unit base modifiers separate from battle percentages', () => {
  const baseMightNode = findNode('training1', (node) => node.bonusName === 'Base Might All');
  const battleMightNode = findNode('training1', (node) => node.bonusName === 'Might All');
  const state = select(createEmptySpecializationState(), 'cavalry', 'training1', [
    battleMightNode.id,
    baseMightNode.id,
  ]);
  const snapshot = buildStatContributionSnapshot(state);

  assert.equal(snapshot.schema, STAT_CONTRIBUTION_SCHEMA);
  assert.equal(snapshot.schemaVersion, STAT_CONTRIBUTION_SCHEMA_VERSION);
  assert.deepEqual(
    snapshot.entries.filter((entry) => entry.kind === 'stat').map((entry) => entry.statKey),
    ['battle.mightPct', 'unit.baseMightBonusPct']
  );
  assert.equal(resolveBasePointTotal(70, 500), 350);
  assert.notEqual(resolveBasePointTotal(70, 500), 70 + 500);
  assert.notEqual(resolveBasePointTotal(70, 500), 70 * 6);
  assert.ok(Math.abs(resolveBasePointTotal(1e-308, 1e308) - 0.01) < 1e-15);
  assert.throws(
    () => resolveBasePointTotal(Number.MAX_VALUE, 200),
    /exceeds the supported numeric range/
  );
});

test('stat summaries reject totals that exceed the supported numeric range', () => {
  const entry = {
    kind: 'stat',
    statKey: 'battle.mightPct',
    troopTarget: 'cavalry',
    rowScope: 'all',
    context: 'general',
    unit: 'percent',
    value: Number.MAX_VALUE,
  };
  assert.throws(
    () =>
      summarizeStatContributions({
        schema: STAT_CONTRIBUTION_SCHEMA,
        schemaVersion: STAT_CONTRIBUTION_SCHEMA_VERSION,
        entries: [entry, entry],
        diagnostics: [],
      }),
    /overflowed/
  );
});

test('canonical unit, battle, combat-speed, and utility stats map to distinct typed keys', () => {
  const expectedMappings = new Map([
    ['Base Might All', 'unit.baseMightBonusPct'],
    ['Base Resistance All', 'unit.baseResistanceBonusPct'],
    ['Base HP All', 'unit.baseHpBonusPct'],
    ['Might All', 'battle.mightPct'],
    ['Resistance All', 'battle.resistancePct'],
    ['HP All', 'battle.hpPct'],
    ['Tactical Might All', 'battle.tacticalMightPct'],
    ['Tactical Resistance All', 'battle.tacticalResistancePct'],
    ['Damage All', 'battle.damagePct'],
    ['Combat Speed All', 'battle.combatSpeedPoints'],
    ['Marching Speed', 'utility.marchingSpeedPoints'],
  ]);
  let state = createEmptySpecializationState();
  const selectedByResearch = new Map();
  for (const bonusName of expectedMappings.keys()) {
    const { research, node } = findResearchNode((candidate) => candidate.bonusName === bonusName);
    const selected = selectedByResearch.get(research.id) || [];
    selected.push(node.id);
    selectedByResearch.set(research.id, selected);
  }
  for (const [researchId, nodeIds] of selectedByResearch) {
    state = select(state, 'footman', researchId, nodeIds);
  }

  const snapshot = buildStatContributionSnapshot(state);
  for (const [bonusName, statKey] of expectedMappings) {
    assert.equal(
      snapshot.entries.some(
        (entry) =>
          entry.kind === 'stat' && entry.rawBonusName === bonusName && entry.statKey === statKey
      ),
      true,
      `${bonusName} should map to ${statKey}`
    );
  }
  assert.equal(
    snapshot.entries.find((entry) => entry.statKey === 'battle.combatSpeedPoints').unit,
    'flat-point'
  );
});

test('secondary bonuses are emitted as independent attributed contributions', () => {
  const node = findNode('defensive1', (candidate) => candidate.secondBonus);
  const state = select(createEmptySpecializationState(), 'footman', 'defensive1', [node.id]);
  const entries = buildStatContributionSnapshot(state).entries;
  const primary = entries.find((entry) => entry.source.nodeId === node.id && !entry.secondBonus);
  const secondary = entries.find((entry) => entry.source.nodeId === node.id && entry.secondBonus);

  assert.equal(primary.statKey, 'battle.tacticalMightPct');
  assert.equal(secondary.statKey, 'battle.tacticalResistancePct');
  assert.equal(primary.context, 'siegeDefense');
  assert.equal(secondary.context, 'siegeDefense');
  assert.notEqual(primary.id, secondary.id);
});

test('troop-specific primary values override rather than add to the generic node', () => {
  const node = findNode('training4', (candidate) => candidate.troopSpecific);
  let state = createEmptySpecializationState();
  state = select(state, 'footman', 'training4', [node.id]);
  state = select(state, 'cavalry', 'training4', [node.id]);
  const entries = buildStatContributionSnapshot(state).entries.filter(
    (entry) => entry.source.researchId === 'training4' && entry.source.nodeId === node.id
  );

  assert.equal(entries.length, 2);
  assert.equal(
    entries.every((entry) => entry.troopSpecific),
    true
  );
  assert.equal(
    entries.find((entry) => entry.troopTarget === 'footman').statKey,
    'unit.baseResistanceBonusPct'
  );
  assert.equal(
    entries.find((entry) => entry.troopTarget === 'cavalry').statKey,
    'unit.baseHpBonusPct'
  );
});

test('row-branched research preserves front, middle, and back scopes', () => {
  const research = SPECIALIZATION_RESEARCH.neat1;
  const nodes = ['front', 'mid', 'back'].map((row) =>
    findNode('neat1', (node) => node.row === row && node.bonusName === 'Might All')
  );
  const state = select(
    createEmptySpecializationState(),
    'archer',
    research.id,
    nodes.map((node) => node.id)
  );
  const entries = buildStatContributionSnapshot(state).entries.filter(
    (entry) => entry.source.researchId === research.id
  );

  assert.deepEqual(entries.map((entry) => entry.rowScope).sort(), ['back', 'front', 'middle']);
  assert.deepEqual(entries.map((entry) => entry.target.rowScopes[0]).sort(), [
    'back',
    'front',
    'middle',
  ]);
});

test('milestone conditions and passive skills are effects, while unconditional combat speed stays numeric', () => {
  const research = SPECIALIZATION_RESEARCH.training1;
  const state = select(
    createEmptySpecializationState(),
    'cavalry',
    'training1',
    allNodeIds('training1')
  );
  const entries = buildStatContributionSnapshot(state).entries.filter(
    (entry) => entry.source.researchId === 'training1'
  );
  const milestoneEntries = entries.filter((entry) => entry.source.kind === 'milestone');
  const passive = entries.find((entry) => entry.source.kind === 'passive');

  assert.equal(milestoneEntries.filter((entry) => entry.kind === 'effect').length, 3);
  assert.equal(
    milestoneEntries.some(
      (entry) => entry.kind === 'stat' && entry.statKey === 'battle.combatSpeedPoints'
    ),
    true
  );
  assert.equal(passive.kind, 'effect');
  assert.equal(passive.parameters.bonusValue, null);
  assert.equal(
    entries.some((entry) => entry.kind === 'stat' && entry.value === 0),
    false
  );
  assert.equal(research.passiveSkillNodeId, passive.source.nodeId);
});

test('legion skill auto-exports as a free effect only after column mastery', () => {
  const column = SPECIALIZATION_COLUMNS[1];
  let state = createEmptySpecializationState();
  for (const researchId of column.researches.slice(0, 3)) {
    state = select(state, 'footman', researchId, allNodeIds(researchId));
  }
  assert.equal(
    buildStatContributionSnapshot(state).entries.some((entry) => entry.source.kind === 'legion'),
    false
  );

  state = select(state, 'footman', column.researches[3], allNodeIds(column.researches[3]));
  const legion = buildStatContributionSnapshot(state).entries.find(
    (entry) => entry.source.kind === 'legion' && entry.source.columnId === 1
  );
  assert.equal(legion.kind, 'effect');
  assert.equal(legion.troopTarget, 'footman');
  assert.match(legion.description, /troop power/i);
});

test('context normalization retains raw context and exposes engine matching dimensions', () => {
  const siegeNode = findNode(
    'siege1',
    (node) => node.context === 'siegeAttacks' && node.bonusName === 'Damage All'
  );
  const rocNode = findNode('callofglory1', (node) => node.context === 'roc');
  let state = select(createEmptySpecializationState(), 'cavalry', 'siege1', [siegeNode.id]);
  state = select(state, 'cavalry', 'callofglory1', [rocNode.id]);
  const entries = buildStatContributionSnapshot(state).entries;
  const siege = entries.find((entry) => entry.source.researchId === 'siege1');
  const roc = entries.find((entry) => entry.source.researchId === 'callofglory1');

  assert.equal(siege.statKey, 'battle.damagePct');
  assert.equal(siege.context, 'siegeAttacks');
  assert.deepEqual(siege.appliesWhen.engagements, ['siege-attack']);
  assert.deepEqual(roc.appliesWhen.events, ['eden']);
});

test('unknown numeric stats produce diagnostics and never enter numeric totals', () => {
  const node = findNode('training7', (candidate) => candidate.bonusName === 'Physical Damage All');
  const state = select(createEmptySpecializationState(), 'footman', 'training7', [node.id]);
  const snapshot = buildStatContributionSnapshot(state);

  assert.equal(snapshot.entries.length, 0);
  assert.equal(snapshot.diagnostics.length, 1);
  assert.equal(snapshot.diagnostics[0].code, 'unmapped-stat');
  assert.equal(snapshot.diagnostics[0].bonusName, 'Physical Damage All');
});

test('export order and IDs are deterministic and summaries reduce only numeric entries', () => {
  let state = createEmptySpecializationState();
  state = select(state, 'cavalry', 'training1', [5, 1, 2]);
  state = select(state, 'footman', 'defensive1', [1, 23]);
  const first = buildStatContributionSnapshot(state);
  const second = buildStatContributionSnapshot(state);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(new Set(first.entries.map((entry) => entry.id)).size, first.entries.length);

  const summary = summarizeStatContributions(first);
  const expectedMight = first.entries
    .filter((entry) => entry.kind === 'stat' && entry.statKey === 'battle.mightPct')
    .reduce((sum, entry) => sum + entry.value, 0);
  assert.equal(summary.byStat['battle.mightPct'], expectedMight);
  assert.equal(
    summary.statEntryCount,
    first.entries.filter((entry) => entry.kind === 'stat').length
  );
  assert.equal(
    summary.effectEntryCount,
    first.entries.filter((entry) => entry.kind === 'effect').length
  );
});

test('a fully completed corpus exports unique sources and all 24 free legion skills', () => {
  let state = createEmptySpecializationState();
  for (const troopId of SPECIALIZATION_TROOPS) {
    for (const researchId of Object.keys(SPECIALIZATION_RESEARCH)) {
      state = select(state, troopId, researchId, allNodeIds(researchId));
    }
  }

  const snapshot = buildStatContributionSnapshot(state);
  assert.equal(new Set(snapshot.entries.map((entry) => entry.id)).size, snapshot.entries.length);
  assert.equal(
    new Set(snapshot.diagnostics.map((diagnostic) => diagnostic.id)).size,
    snapshot.diagnostics.length
  );
  const effects = snapshot.entries.filter((entry) => entry.kind === 'effect');
  assert.equal(new Set(effects.map((entry) => entry.effectKey)).size, effects.length);
  assert.equal(snapshot.entries.filter((entry) => entry.source.kind === 'legion').length, 24);
  assert.equal(
    snapshot.entries.some((entry) => entry.kind === 'stat' && entry.value === 0),
    false
  );
});

test('specialization contract modules never import Battle Simulator implementation files', async () => {
  const modules = [
    'js/specialization-towers-v2-model.js',
    'js/specialization-towers-v2-contributions.js',
    'js/specialization-towers-v2-store.js',
  ];
  for (const modulePath of modules) {
    const source = await readFile(new URL(`../../${modulePath}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /from\s+['"].*battle-simulator/i);
  }
});
