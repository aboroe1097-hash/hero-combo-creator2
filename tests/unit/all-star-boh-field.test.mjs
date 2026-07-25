import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOH_FIELD_CENTER,
  BOH_STAGE1_FIELD,
  BOH_STAGE1_REMOVED,
  bohFieldPoint,
  bohLaneTowers,
  bohPhaseTargets,
  bohStructureAllegiance,
  bohStructureCodes,
  bohStructureLabel,
  bohStructureTwin,
} from '../../js/all-star-boh-field.js';

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

test('structure codes are parsed out of order text', () => {
  assert.deepEqual(bohStructureCodes('Capture Enemy Command Center [CC2]'), ['CC2']);
  assert.deepEqual(bohStructureCodes('Teleport to Relay2 [RP2] - Tower 7 [T7]'), ['RP2', 'T7']);
  assert.deepEqual(bohStructureCodes('Build Towers - T1s & Speed Heroes'), []);
  assert.deepEqual(bohStructureCodes(''), []);
  assert.deepEqual(bohStructureCodes(null), []);
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
