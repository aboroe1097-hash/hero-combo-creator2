import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOH_STAGE1_BACKUP_ENTRY_MINUTE,
  BOH_STAGE1_BACKUP_ENTRY_PHASE,
  BOH_STAGE1_BACKUP_SEATS,
  BOH_STAGE1_LEGIONS,
  BOH_STAGE1_MILESTONES,
  BOH_STAGE1_PHASES,
  BOH_STAGE1_PLAN_ID,
  BOH_STAGE1_SEATS,
  bohIsBackupSeat,
  bohIsStandby,
  bohSeatRoleGroup,
  bohStage1Milestone,
  bohStage1Timeline,
} from '../../js/all-star-boh-plan.js';
import { bohStructureCodes } from '../../js/all-star-boh-field.js';

test('stage 1 declares four phases and two legions', () => {
  assert.equal(BOH_STAGE1_PLAN_ID, 'stage-1');
  assert.equal(BOH_STAGE1_PHASES.length, 4);
  assert.equal(BOH_STAGE1_LEGIONS.length, 2);
  assert.deepEqual(
    BOH_STAGE1_LEGIONS.map((legion) => legion.id),
    ['legion-1', 'legion-2']
  );
  // Phases must tile 0-30 minutes without a gap.
  BOH_STAGE1_PHASES.forEach((phase, index) => {
    assert.equal(phase.order, index + 1);
    if (index > 0) assert.equal(phase.startMinute, BOH_STAGE1_PHASES[index - 1].endMinute);
  });
  assert.equal(BOH_STAGE1_PHASES[0].startMinute, 0);
  assert.equal(BOH_STAGE1_PHASES[3].endMinute, 30);
});

test('every phase has milestone guidance keyed by phase id', () => {
  assert.equal(BOH_STAGE1_MILESTONES.length, BOH_STAGE1_PHASES.length);
  BOH_STAGE1_PHASES.forEach((phase) => {
    const milestone = bohStage1Milestone(phase.id);
    assert.ok(milestone, `${phase.id} has no milestone`);
    assert.ok(milestone.unlocks);
    assert.ok(milestone.teleport);
    assert.ok(milestone.crystal);
  });
  assert.equal(bohStage1Milestone('phase-99'), null);
});

test('each seat yields exactly four phases by two legions', () => {
  for (let seat = 1; seat <= BOH_STAGE1_SEATS; seat += 1) {
    const timeline = bohStage1Timeline(seat, { playerId: 'uid-1', gameName: 'Tester' });
    assert.equal(timeline.length, 8, `seat ${seat} should have 8 entries`);
    const keys = new Set(timeline.map((entry) => `${entry.legionId}:${entry.phaseId}`));
    assert.equal(keys.size, 8, `seat ${seat} has duplicate phase/legion pairs`);
  }
});

test('timeline entries carry the published contract fields', () => {
  const [entry] = bohStage1Timeline(1, { playerId: 'uid-abc', gameName: 'Synthetic Tester' });
  assert.equal(entry.playerId, 'uid-abc');
  assert.equal(entry.gameName, 'Synthetic Tester');
  assert.equal(entry.phaseId, 'phase-1');
  assert.equal(entry.legionId, 'legion-1');
  assert.equal(entry.seatNumber, 1);
  assert.equal(entry.baseSeatNumber, 1);
  assert.equal(entry.rotated, false);
  assert.ok(entry.roleGroupId);
  assert.ok(entry.roleLabel);
  assert.ok(entry.instruction.action);
  ['action', 'target', 'loadout', 'teleport', 'note', 'priority'].forEach((field) => {
    assert.ok(field in entry.instruction, `instruction missing ${field}`);
  });
});

test('identity is never inferred - a missing player id stays empty', () => {
  const [entry] = bohStage1Timeline(1);
  assert.equal(entry.playerId, '');
  assert.equal(entry.gameName, '');
});

test('backups stand by through the opening phase and deploy from 5:00', () => {
  assert.deepEqual([...BOH_STAGE1_BACKUP_SEATS], [11, 12]);
  assert.equal(BOH_STAGE1_BACKUP_ENTRY_PHASE, 1);
  BOH_STAGE1_BACKUP_SEATS.forEach((seat) => {
    assert.equal(bohIsBackupSeat(seat), true);
    const timeline = bohStage1Timeline(seat, { playerId: 'uid-b' });
    const opening = timeline.filter((entry) => entry.phaseId === 'phase-1');
    assert.equal(opening.length, 2);
    opening.forEach((entry) => {
      assert.equal(entry.instruction.standby, true);
      assert.match(entry.instruction.action, /stand by/iu);
      assert.match(entry.instruction.note, new RegExp(`${BOH_STAGE1_BACKUP_ENTRY_MINUTE}:00`, 'u'));
    });
    // From phase 2 onward they hold real support orders.
    timeline
      .filter((entry) => entry.phaseId !== 'phase-1')
      .forEach((entry) => {
        assert.equal('standby' in entry.instruction, false);
        assert.doesNotMatch(entry.instruction.action, /stand by/iu);
      });
  });
});

test('an explicit backup flag overrides numeric seat behavior', () => {
  const flaggedBackup = bohStage1Timeline(1, { playerId: 'uid-b', backup: true });
  flaggedBackup
    .filter((entry) => entry.phaseId === 'phase-1')
    .forEach((entry) => {
      assert.equal(entry.instruction.standby, true);
      assert.match(entry.instruction.action, /stand by/iu);
    });
  flaggedBackup
    .filter((entry) => entry.phaseId !== 'phase-1')
    .forEach((entry) => {
      assert.equal('standby' in entry.instruction, false);
      assert.equal(entry.roleLabel, 'Backup - Support');
    });

  const explicitMain = bohStage1Timeline(11, { playerId: 'uid-m', main: true, backup: false });
  explicitMain.forEach((entry) => {
    assert.equal('standby' in entry.instruction, false);
    assert.doesNotMatch(entry.instruction.action, /stand by/iu);
  });
});

test('starters are never marked standby', () => {
  for (let seat = 1; seat <= 10; seat += 1) {
    assert.equal(bohIsBackupSeat(seat), false);
    BOH_STAGE1_PHASES.forEach((_phase, index) => assert.equal(bohIsStandby(seat, index), false));
    bohStage1Timeline(seat, { playerId: 'uid-s' }).forEach((entry) => {
      assert.equal('standby' in entry.instruction, false);
      assert.doesNotMatch(entry.instruction.action, /stand by/iu);
    });
  }
});

test('crystal gathering flag is specific to the assigned player legion entry', () => {
  const seatThreeOpening = bohStage1Timeline(3).filter((entry) => entry.phaseId === 'phase-1');
  const legionOne = seatThreeOpening.find((entry) => entry.legionId === 'legion-1');
  const legionTwo = seatThreeOpening.find((entry) => entry.legionId === 'legion-2');
  assert.equal('gatherCrystals' in legionOne.instruction, false);
  assert.equal(legionTwo.instruction.gatherCrystals, true);
  assert.equal(legionTwo.instruction.action, 'Gather Crystals - T1s');
  assert.equal(legionTwo.instruction.loadout, '');

  const unrelatedSeat = bohStage1Timeline(1).filter((entry) => entry.phaseId === 'phase-1');
  unrelatedSeat.forEach((entry) => {
    assert.equal('gatherCrystals' in entry.instruction, false);
  });
});

test('crystal gathering is not global across both legions or phases', () => {
  const timeline = bohStage1Timeline(7);
  const gathering = timeline.filter((entry) => entry.instruction.gatherCrystals === true);
  assert.equal(gathering.length, 1);
  assert.equal(gathering[0].phaseId, 'phase-1');
  assert.equal(gathering[0].legionId, 'legion-2');
  timeline
    .filter((entry) => entry !== gathering[0])
    .forEach((entry) => {
      assert.equal('gatherCrystals' in entry.instruction, false);
    });
});

test('the two legions receive different orders in the opening phase', () => {
  for (let seat = 1; seat <= 10; seat += 1) {
    const opening = bohStage1Timeline(seat).filter((entry) => entry.phaseId === 'phase-1');
    const [legionOne, legionTwo] = opening;
    assert.notEqual(
      legionOne.instruction.action,
      legionTwo.instruction.action,
      `seat ${seat} gives both legions the same opening order`
    );
  }
});

test('role groups cover the published catalogue and fill every seat', () => {
  const allowed = new Set(['offensive', 'rune', 'top', 'bottom']);
  const counts = {};
  for (let seat = 1; seat <= BOH_STAGE1_SEATS; seat += 1) {
    const group = bohSeatRoleGroup(seat);
    assert.ok(allowed.has(group), `seat ${seat} has unknown role group ${group}`);
    counts[group] = (counts[group] || 0) + 1;
  }
  // Role capacities are offensive 4, rune 2, top 3, bottom 3 in the model; the seat map
  // spreads twelve seats across all four groups.
  assert.equal(Object.keys(counts).length, 4);
  assert.equal(
    Object.values(counts).reduce((sum, value) => sum + value, 0),
    BOH_STAGE1_SEATS
  );
});

test('an out-of-range seat yields no timeline rather than throwing', () => {
  assert.deepEqual(bohStage1Timeline(0), []);
  assert.deepEqual(bohStage1Timeline(13), []);
  assert.deepEqual(bohStage1Timeline('x'), []);
});

test('orders reference only structures the field model recognises', () => {
  const known = /^(CC[1-4]|OP[1-4]|FH[12]|H[12]|A[12]|RP[1-4]|S|T[1-9])$/u;
  let referenced = 0;
  for (let seat = 1; seat <= BOH_STAGE1_SEATS; seat += 1) {
    bohStage1Timeline(seat).forEach((entry) => {
      [entry.instruction.action, entry.instruction.note].forEach((text) => {
        bohStructureCodes(text).forEach((code) => {
          referenced += 1;
          assert.match(code, known, `unknown structure code ${code}`);
        });
      });
    });
  }
  assert.ok(referenced > 40, `expected plentiful structure references, saw ${referenced}`);
});
