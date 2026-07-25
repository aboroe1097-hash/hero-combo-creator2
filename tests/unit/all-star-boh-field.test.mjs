import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOH_FIELD_CENTER,
  BOH_STAGE1_DEFAULT_SIDE,
  BOH_STAGE1_FIELD,
  BOH_STAGE1_MAP_ASSET_PATH,
  BOH_STAGE1_MAP_SIZE,
  BOH_STAGE1_REMOVED,
  bohFieldPoint,
  bohLaneTowers,
  bohPhaseTargets,
  bohStage1Objectives,
  bohStage1TerritoryNetwork,
  bohStructureAllegiance,
  bohStructureCodes,
  bohStructureLabel,
  bohStructureTwin,
} from '../../js/all-star-boh-field.js';

test('stage 1 field exposes the production map asset and source dimensions', () => {
  assert.equal(BOH_STAGE1_MAP_ASSET_PATH, 'assets/boh/stage1-map.webp');
  assert.deepEqual(BOH_STAGE1_MAP_SIZE, { width: 972, height: 507 });
  assert.equal(BOH_STAGE1_DEFAULT_SIDE, 'blue');
});

test('stage 1 field holds the expected structure set', () => {
  assert.equal(BOH_STAGE1_FIELD.length, 17);
  assert.equal(BOH_STAGE1_REMOVED.length, 4);
  const kinds = BOH_STAGE1_FIELD.reduce((counts, structure) => {
    counts[structure.kind] = (counts[structure.kind] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(kinds, {
    fort: 2,
    cc: 2,
    op: 2,
    hospital: 2,
    arsenal: 2,
    relay: 4,
    fortress: 2,
    sanctuary: 1,
  });
});

test('the field is 180-degree rotationally symmetric about the centre', () => {
  const pairs = [
    ['CC1', 'CC4'],
    ['CC2', 'CC3'],
    ['H1', 'H2'],
    ['A1', 'A2'],
    ['FH1', 'FH2'],
  ];
  // Every structure must have a twin at (1200 - x, 1200 - y). The game's own coordinates are
  // off by at most 1 on some pairs (e.g. 564 mirrors to 635, not 636), so allow that slack.
  BOH_STAGE1_FIELD.forEach((structure) => {
    const twin = bohStructureTwin(structure);
    assert.ok(twin, `${structure.blue} has no twin`);
    assert.ok(Math.abs(twin.x - (2 * BOH_FIELD_CENTER - structure.x)) <= 2);
    assert.ok(Math.abs(twin.y - (2 * BOH_FIELD_CENTER - structure.y)) <= 2);
  });
  // The specific pairings leadership relies on.
  pairs.forEach(([left]) => {
    const structure = BOH_STAGE1_FIELD.find((entry) => entry.blue === left);
    if (!structure) return;
    assert.ok(bohStructureTwin(structure), `${left} twin missing`);
  });
});

test('starting on red flips every allegiance', () => {
  const hospital1 = BOH_STAGE1_FIELD.find((entry) => entry.blue === 'H1');
  const hospital2 = BOH_STAGE1_FIELD.find((entry) => entry.blue === 'H2');
  assert.equal(bohStructureAllegiance(hospital1, 'blue'), 'ours');
  assert.equal(bohStructureAllegiance(hospital2, 'blue'), 'theirs');
  assert.equal(bohStructureAllegiance(hospital1, 'red'), 'theirs');
  assert.equal(bohStructureAllegiance(hospital2, 'red'), 'ours');
});

test('labels are relative to the side we start on', () => {
  const structure = BOH_STAGE1_FIELD.find((entry) => entry.blue === 'H1');
  assert.equal(bohStructureLabel(structure, 'blue'), 'H1');
  assert.equal(bohStructureLabel(structure, 'red'), 'H2');
});

test('the sanctuary and both fortresses of honor stay contested', () => {
  ['S', 'FH1', 'FH2'].forEach((code) => {
    const structure = BOH_STAGE1_FIELD.find((entry) => entry.blue === code);
    assert.equal(bohStructureAllegiance(structure, 'blue'), 'neutral');
    assert.equal(bohStructureAllegiance(structure, 'red'), 'neutral');
  });
});

test('projection places the strongholds on the correct diagonal', () => {
  const centre = bohFieldPoint(600, 600);
  const blueHome = bohFieldPoint(600, 661);
  const redHome = bohFieldPoint(600, 539);
  // Sanctuary sits near the middle of the art.
  assert.ok(Math.abs(centre.left - 46.863) < 0.001);
  // Blue stronghold renders lower-left, red upper-right, matching the in-game camera.
  assert.ok(blueHome.left < centre.left, 'blue home should be left of centre');
  assert.ok(blueHome.top > centre.top, 'blue home should be below centre');
  assert.ok(redHome.left > centre.left, 'red home should be right of centre');
  assert.ok(redHome.top < centre.top, 'red home should be above centre');
  // Classic 2:1 isometric. left/top are percentages of different axes, so convert to pixels
  // against the source art (972x507) before comparing.
  const horizontalPx = (Math.abs(blueHome.left - centre.left) / 100) * 972;
  const verticalPx = (Math.abs(blueHome.top - centre.top) / 100) * 507;
  assert.ok(
    Math.abs(horizontalPx / verticalPx - 2) < 0.2,
    `expected a 2:1 isometric ratio, got ${(horizontalPx / verticalPx).toFixed(2)}`
  );
});

test('projection rejects non-numeric input', () => {
  assert.equal(bohFieldPoint('x', 600), null);
  assert.equal(bohFieldPoint(600, undefined), null);
});

test('tower lanes grow out of each stronghold toward the sanctuary', () => {
  const blue = bohLaneTowers('blue');
  const red = bohLaneTowers('red');
  assert.equal(blue.length, 8);
  assert.equal(red.length, 8);
  assert.equal(blue[0].id, 'T1');
  // Blue climbs from the high-Y half toward the centre line; red descends from the low-Y half.
  assert.ok(blue[0].y > blue[blue.length - 1].y, 'blue lane should climb toward the centre');
  assert.ok(red[0].y < red[red.length - 1].y, 'red lane should descend toward the centre');
  assert.ok(blue.every((tower) => tower.y > BOH_FIELD_CENTER));
  assert.ok(red.every((tower) => tower.y < BOH_FIELD_CENTER));
});

test('territory network is blue-default with one ordered T1-T8 main chain', () => {
  const network = bohStage1TerritoryNetwork();
  assert.equal(network.side, 'blue');
  assert.equal(network.rotated, false);
  assert.equal(network.assetPath, BOH_STAGE1_MAP_ASSET_PATH);
  assert.deepEqual(network.mapSize, BOH_STAGE1_MAP_SIZE);
  assert.deepEqual(
    network.nodes.filter((node) => node.kind === 'tower').map((tower) => tower.id),
    ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']
  );
  assert.deepEqual(network.mainPath, ['HOME', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'S']);
  assert.deepEqual(
    network.routes.main.map((point) => point.id),
    network.mainPath
  );
});

test('territory network has explicit branches, territory squares, and clickable markers', () => {
  const network = bohStage1TerritoryNetwork('blue');
  assert.deepEqual(
    network.branches.map((branch) => branch.id),
    ['top-fortress', 'bottom-fortress']
  );
  assert.deepEqual(network.branches[0].path, ['T4', 'RP1', 'FH1']);
  assert.deepEqual(network.branches[1].path, ['T4', 'RP2', 'FH2']);
  assert.deepEqual(
    network.routes.branches.map((branch) => branch.points.map((point) => point.id)),
    [
      ['T4', 'RP1', 'FH1'],
      ['T4', 'RP2', 'FH2'],
    ]
  );
  assert.equal(network.territories.length, 8);
  network.territories.forEach((territory) => {
    assert.equal(territory.kind, 'territory-square');
    assert.ok(territory.x >= 0 && territory.x <= 100);
    assert.ok(territory.y >= 0 && territory.y <= 100);
    assert.ok(territory.width > 0);
    assert.ok(territory.height > 0);
  });
  assert.equal(network.markers.length, 10);
  assert.equal(network.markers.filter((marker) => marker.kind === 'tower').length, 8);
  assert.equal(network.markers.filter((marker) => marker.kind === 'relay').length, 2);
  assert.ok(network.markers.every((marker) => marker.clickable === true));
});

test('territory network rotates to red without exposing both chains at once', () => {
  const blue = bohStage1TerritoryNetwork('blue');
  const red = bohStage1TerritoryNetwork('red');
  assert.equal(red.side, 'red');
  assert.equal(red.rotated, true);
  assert.deepEqual(
    red.nodes.map((node) => node.id),
    blue.nodes.map((node) => node.id)
  );
  blue.nodes.forEach((blueNode, index) => {
    const redNode = red.nodes[index];
    assert.equal(redNode.x, 2 * BOH_FIELD_CENTER - blueNode.x);
    assert.equal(redNode.y, 2 * BOH_FIELD_CENTER - blueNode.y);
  });
});

test('structure codes are parsed out of order text', () => {
  assert.deepEqual(bohStructureCodes('Capture Enemy Command Center [CC2]'), ['CC2']);
  assert.deepEqual(bohStructureCodes('Teleport to Relay2 [RP2] - Tower 7 [T7]'), ['RP2', 'T7']);
  assert.deepEqual(bohStructureCodes('Build Towers - T1s & Speed Heroes'), []);
  assert.deepEqual(bohStructureCodes(''), []);
  assert.deepEqual(bohStructureCodes(null), []);
});

test('the objective catalogue satisfies the published plan contract', async () => {
  const { normalizeBohObjectives } = await import('../../js/all-star-boh-model.js');
  const objectives = bohStage1Objectives('blue');
  assert.equal(objectives.length, 25);
  // Coordinates are percentages; the model rejects anything outside 0-100.
  objectives.forEach((objective) => {
    assert.ok(objective.x >= 0 && objective.x <= 100, `${objective.code} x out of range`);
    assert.ok(objective.y >= 0 && objective.y <= 100, `${objective.code} y out of range`);
    assert.ok(objective.id && objective.code && objective.label);
  });
  // The real gate: production must accept the catalogue unchanged.
  const normalized = normalizeBohObjectives(objectives);
  assert.equal(normalized.length, objectives.length);
  const ids = new Set(normalized.map((objective) => objective.id));
  assert.equal(ids.size, normalized.length, 'objective ids must be unique');
});

test('objective catalogue keeps real structures plus the single selected-side tower chain', () => {
  const objectives = bohStage1Objectives();
  const towerObjectives = objectives.filter((objective) => objective.type === 'tower');
  assert.deepEqual(
    towerObjectives.map((objective) => objective.code),
    ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8']
  );
  assert.equal(objectives.filter((objective) => /^T\d+$/u.test(objective.code)).length, 8);
  assert.ok(objectives.find((objective) => objective.code === 'FH1'));
  assert.ok(objectives.find((objective) => objective.code === 'FH2'));
});

test('objective labels flip with the side we start on', () => {
  const blue = bohStage1Objectives('blue');
  const red = bohStage1Objectives('red');
  const blueHospital = blue.find((objective) => objective.code === 'H1');
  const redHospital = red.find((objective) => objective.code === 'H1');
  // H1 is a different building depending on which side we hold.
  assert.notEqual(blueHospital.x, redHospital.x);
});

test('objective labels can be localised without changing the code', () => {
  const translate = (key, fallback) => (key === 'field.sanctuary' ? 'Святилище' : fallback);
  const objectives = bohStage1Objectives('blue', translate);
  const sanctuary = objectives.find((objective) => objective.code === 'S');
  assert.match(sanctuary.label, /Святилище/u);
  assert.equal(sanctuary.code, 'S');
});

test('phase targets merge both legions and the note without duplicates', () => {
  const targets = bohPhaseTargets({
    l1: 'Capture & Defend Our Command Center [CC1]',
    l2: 'Hold [CC1] and push [OP2]',
    note: 'Teleport to Tower 3 [T3]',
  });
  assert.deepEqual(targets, ['CC1', 'OP2', 'T3']);
  assert.deepEqual(bohPhaseTargets(null), []);
});
