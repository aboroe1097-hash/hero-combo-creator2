import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  classifySimVsRecorded,
  scoreAccountResemblance,
} from '../../js/battle-simulator-field-data.js';
import {
  applyFieldDeltasToContributions,
  filterApplicableFieldDeltas,
  isFieldDeltaApplicable,
} from '../../js/battle-simulator-equipment-field-deltas.js';
import { createEquipmentSetLoadout } from '../../js/battle-simulator-equipment.js';

const appSource = readFileSync('js/battle-simulator-app.js', 'utf8');
const moduleSource = readFileSync('js/battle-simulator-field-data.js', 'utf8');
const deltasSource = readFileSync('js/battle-simulator-equipment-field-deltas.js', 'utf8');
const htmlSource = readFileSync('battle-simulator.html', 'utf8');

const duelRecords = JSON.parse(
  readFileSync('tests/fixtures/field-data/duel-records.json', 'utf8')
).records;
const equipmentDeltas = JSON.parse(
  readFileSync('tests/fixtures/field-data/equipment-deltas.json', 'utf8')
).records;

const verifiedRecord = duelRecords.find((record) => record.recordId === 'duel-synth-001');
const historicalRecord = duelRecords.find((record) => record.recordId === 'duel-synth-002');
const unverifiedRecord = duelRecords.find((record) => record.recordId === 'duel-synth-003');

test('Field Data panel is a lazy module behind load-on-expanded + retry', () => {
  assert.match(
    appSource,
    /import\('\.\/battle-simulator-field-data\.js'\)/
  );
  assert.doesNotMatch(appSource, /from '\.\/battle-simulator-field-data\.js'/);
  assert.match(appSource, /data-field-data-panel/);
  assert.match(appSource, /id="battleFieldData"/);
  assert.match(appSource, /if \(event\.target\.open\) ensureFieldDataPanel\(\);/);
  assert.match(appSource, /data-field-retry-boot/);
});

test('Field Data section lives inside the form without growing eager route CSS', () => {
  assert.match(appSource, /\$\{renderBattleProfilePanel\(\)\}\s*<details class="battle-field-data"/);
  assert.doesNotMatch(htmlSource, /battle-simulator-field-data\.css/);
  assert.match(moduleSource, /import\('\.\.\/css\/battle-simulator-field-data\.css'\)/);
});

test('Strict-CSP hygiene: no external URLs in the field data module', () => {
  assert.doesNotMatch(moduleSource, /https?:\/\//);
  assert.doesNotMatch(moduleSource, /<img[^>]*src="https?/);
  assert.match(moduleSource, /escapeHtml\(/);
});

test('Resemblance scoring compares research, equipment, skills and skins', () => {
  const account = {
    researchNodeIds: ['node_1', 'node_4', 'node_9', 'node_15'],
    equipmentSetIds: ['everlasting'],
    heroSkillIds: {
      'King Arthur': ['2', '5', '8'],
      'Cleopatra VII': ['5', '8'],
      Theodora: ['8'],
    },
    skinNames: ['Everlasting'],
  };
  const result = scoreAccountResemblance(account, verifiedRecord);
  assert.equal(result.total, 4);
  assert.equal(result.matched, 4);
  assert.deepEqual(
    result.dimensions.map((dimension) => dimension.key),
    ['researchProfile', 'equipmentProfile', 'heroSkillUnlockProfile', 'skinProfiles']
  );
});

test('Resemblance scoring marks not-captured and mismatched account fields', () => {
  const partial = scoreAccountResemblance(
    { researchNodeIds: null, equipmentSetIds: ['dragon-master'], heroSkillIds: {}, skinNames: null },
    verifiedRecord
  );
  assert.equal(partial.matched, 0);
  assert.equal(partial.total, 4);
  assert.ok(partial.dimensions.every((dimension) => dimension.matched === false));
});

test('Resemblance scoring skips absent record dimensions', () => {
  const result = scoreAccountResemblance(
    { researchNodeIds: ['node_2', 'node_6'], equipmentSetIds: [], heroSkillIds: {}, skinNames: null },
    historicalRecord
  );
  // historicalRecord has researchProfile + heroSkillUnlockProfile only.
  assert.equal(result.total, 2);
  assert.equal(result.matched, 1);
  assert.deepEqual(
    result.dimensions.map((dimension) => dimension.key),
    ['researchProfile', 'heroSkillUnlockProfile']
  );
});

test('Sim-vs-recorded classification respects the confidence interval', () => {
  const recorded = 71 / 120 * 100;
  const ciLo = 0.51 * 100;
  const ciHi = 0.67 * 100;
  assert.equal(classifySimVsRecorded(recorded, recorded, ciLo, ciHi).label, 'agrees');
  assert.equal(classifySimVsRecorded(recorded, ciHi, ciLo, ciHi).label, 'agrees');
  assert.equal(classifySimVsRecorded(recorded, ciHi + 1, ciLo, ciHi).label, 'over');
  assert.equal(classifySimVsRecorded(recorded, ciLo - 1, ciLo, ciHi).label, 'under');
  const under = classifySimVsRecorded(recorded, ciLo - 1, ciLo, ciHi);
  assert.ok(under.delta < 0);
});

test('Equipment deltas: verified only, excluded unverified from simulations', () => {
  const loadout = createEquipmentSetLoadout({ setId: 'dragon-master', gradeId: 'gold' });
  const applicable = filterApplicableFieldDeltas(loadout, equipmentDeltas);
  assert.equal(applicable.length, 1);
  assert.equal(applicable[0].equipmentId, 'dragon-master.armor');
  assert.equal(isFieldDeltaApplicable(equipmentDeltas[0]), true);
  assert.equal(isFieldDeltaApplicable(equipmentDeltas[1]), false);
  const contributions = applyFieldDeltasToContributions([], applicable);
  assert.equal(contributions.length, 1);
  assert.equal(contributions[0].statKey, 'resistance');
  assert.equal(contributions[0].amount, 1.5);
  assert.match(contributions[0].sourceId, /^field-data:dragon-master\.armor:resistance$/);
});

test('Equipment deltas reject unknown stat fields and non-finite values', () => {
  const contributions = applyFieldDeltasToContributions([], [
    { ...equipmentDeltas[0], field: 'bogus' },
    { ...equipmentDeltas[0], value: Number.NaN },
    equipmentDeltas[0],
  ]);
  assert.equal(contributions.length, 1);
  assert.equal(contributions[0].statKey, 'resistance');
});

test('Field data contract fixtures carry the frozen lane-3 shapes', () => {
  for (const record of duelRecords) {
    assert.ok(record.recordId);
    assert.ok(Array.isArray(record.lineup.attacker) && Array.isArray(record.lineup.defender));
    assert.equal(typeof record.battleCount, 'number');
    assert.equal(typeof record.confidenceInterval.lo, 'number');
    assert.equal(typeof record.confidenceInterval.hi, 'number');
    assert.ok(Array.isArray(record.researchProfile.nodeId), 'nodeId must be an array');
    assert.ok(
      Array.isArray(record.researchProfile.requirementGroups),
      'requirementGroups must be an array of nodeId arrays'
    );
    assert.equal(typeof record.provenance.credit, 'string');
    assert.ok(['current', 'historical', 'unverified'].includes(record.provenance.verificationStatus));
  }
  assert.equal(unverifiedRecord.provenance.verificationStatus, 'unverified');
  assert.ok(deltasSource.includes('verificationStatus === \'current\''));
});
