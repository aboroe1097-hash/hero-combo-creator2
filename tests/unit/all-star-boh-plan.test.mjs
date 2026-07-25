import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOH_STAGE1_BACKUP_ENTRY_PHASE,
  BOH_STAGE1_BACKUP_ORDER,
  BOH_STAGE1_BACKUP_POSITIONS,
  BOH_STAGE1_FLOW,
  BOH_STAGE1_MILESTONES,
  BOH_STAGE1_POSITIONS,
  BOH_STAGE1_STANDBY_ORDER,
  bohIsBackupPosition,
  bohIsStandby,
  bohStage1Order,
} from '../../js/all-star-boh-plan.js';
import { bohPhaseTargets } from '../../js/all-star-boh-field.js';

test('stage 1 runs four phases with matching milestones', () => {
  assert.equal(BOH_STAGE1_FLOW.length, 4);
  assert.equal(BOH_STAGE1_MILESTONES.length, 4);
  BOH_STAGE1_FLOW.forEach((phase, index) => {
    assert.equal(phase.time, BOH_STAGE1_MILESTONES[index].time);
  });
  assert.deepEqual(
    BOH_STAGE1_FLOW.map((phase) => phase.time),
    ['0-5 Minutes', '5-10 Minutes', '10-15 Minutes', '15-30 Minutes']
  );
});

test('every milestone carries unlock, teleport and crystal guidance', () => {
  BOH_STAGE1_MILESTONES.forEach((milestone) => {
    assert.ok(milestone.unlocks, `${milestone.time} missing unlocks`);
    assert.ok(milestone.teleport, `${milestone.time} missing teleport guidance`);
    assert.ok(milestone.crystal, `${milestone.time} missing crystal guidance`);
    assert.ok(milestone.teleportTag, `${milestone.time} missing teleport tag`);
  });
});

test('every position in every phase resolves to a complete order', () => {
  for (let phase = 0; phase < BOH_STAGE1_FLOW.length; phase += 1) {
    for (let position = 1; position <= BOH_STAGE1_POSITIONS; position += 1) {
      const order = bohStage1Order(position, phase);
      assert.ok(order, `position ${position} phase ${phase} has no order`);
      assert.ok(order.stageRole, `position ${position} phase ${phase} missing stageRole`);
      assert.ok(order.l1, `position ${position} phase ${phase} missing legion 1`);
      assert.ok(order.l2, `position ${position} phase ${phase} missing legion 2`);
    }
  }
});

test('backups stand by for the opening phase and deploy from 5:00', () => {
  assert.deepEqual([...BOH_STAGE1_BACKUP_POSITIONS], [11, 12]);
  assert.equal(BOH_STAGE1_BACKUP_ENTRY_PHASE, 1);
  BOH_STAGE1_BACKUP_POSITIONS.forEach((position) => {
    assert.equal(bohIsStandby(position, 0), true);
    assert.equal(bohStage1Order(position, 0), BOH_STAGE1_STANDBY_ORDER);
    for (let phase = 1; phase < BOH_STAGE1_FLOW.length; phase += 1) {
      assert.equal(bohIsStandby(position, phase), false);
      assert.equal(bohStage1Order(position, phase), BOH_STAGE1_BACKUP_ORDER);
    }
  });
});

test('starters are never treated as standby', () => {
  for (let position = 1; position <= 10; position += 1) {
    assert.equal(bohIsBackupPosition(position), false);
    for (let phase = 0; phase < BOH_STAGE1_FLOW.length; phase += 1) {
      assert.equal(bohIsStandby(position, phase), false);
      assert.notEqual(bohStage1Order(position, phase), BOH_STAGE1_STANDBY_ORDER);
    }
  }
});

test('an unknown phase yields no order rather than throwing', () => {
  assert.equal(bohStage1Order(1, 9), null);
  assert.equal(bohStage1Order(1, -1), null);
});

test('orders reference structures the field model recognises', () => {
  const known = /^(CC[1-4]|OP[1-4]|FH[12]|H[12]|A[12]|RP[1-4]|S|T[1-9])$/u;
  let referenced = 0;
  for (let phase = 0; phase < BOH_STAGE1_FLOW.length; phase += 1) {
    for (let position = 1; position <= BOH_STAGE1_POSITIONS; position += 1) {
      bohPhaseTargets(bohStage1Order(position, phase)).forEach((code) => {
        referenced += 1;
        assert.match(code, known, `unknown structure code ${code}`);
      });
    }
  }
  // The plan should actually point people at the map, not just describe tasks.
  assert.ok(referenced > 20, `expected plentiful structure references, saw ${referenced}`);
});

test('the opening phase keeps everyone off teleports except the defensive wings', () => {
  // Positions 1-6 hold teleports at the start; 7-12 reposition to their tower.
  for (let position = 1; position <= 6; position += 1) {
    assert.match(bohStage1Order(position, 0).note, /no teleport/iu);
  }
});
