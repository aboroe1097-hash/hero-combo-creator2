import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOH_STAGE1_BACKUP_SEATS,
  BOH_STAGE1_BATTLEFIELD_SKILLS,
  BOH_STAGE1_BATTLE_MERIT,
  BOH_STAGE1_BUILDING_BUFFS,
  BOH_STAGE1_LEGIONS,
  BOH_STAGE1_MAX_ACTIVE_PLAYERS,
  BOH_STAGE1_MILESTONES,
  BOH_STAGE1_PHASES,
  BOH_STAGE1_PLAN_ID,
  BOH_STAGE1_SEATS,
  BOH_STAGE1_TOWER_TOPOLOGY,
  bohIsBackupSeat,
  bohIsStandby,
  bohSeatRoleGroup,
  bohStage1Milestone,
  bohStage1SubstitutionEvents,
  bohStage1Timeline,
  bohValidateStage1Roster,
  bohValidateStage1Substitutions,
  bohValidateStage1TowerTopology,
} from '../../js/all-star-boh-plan.js';
import { bohStructureCodes } from '../../js/all-star-boh-field.js';

test('stage 1 declares five phases and two legions', () => {
  assert.equal(BOH_STAGE1_PLAN_ID, 'stage-1');
  assert.equal(BOH_STAGE1_PHASES.length, 5);
  assert.equal(BOH_STAGE1_LEGIONS.length, 2);
  assert.deepEqual(
    BOH_STAGE1_LEGIONS.map((legion) => legion.id),
    ['legion-1', 'legion-2']
  );
  // Phases must tile 0-60 minutes without a gap.
  BOH_STAGE1_PHASES.forEach((phase, index) => {
    assert.equal(phase.order, index + 1);
    if (index > 0) assert.equal(phase.startMinute, BOH_STAGE1_PHASES[index - 1].endMinute);
  });
  assert.equal(BOH_STAGE1_PHASES[0].startMinute, 0);
  assert.equal(BOH_STAGE1_PHASES[4].endMinute, 60);
});

test('every phase has milestone guidance keyed by phase id', () => {
  assert.equal(BOH_STAGE1_MILESTONES.length, BOH_STAGE1_PHASES.length);
  BOH_STAGE1_PHASES.forEach((phase) => {
    const milestone = bohStage1Milestone(phase.id);
    assert.ok(milestone, `${phase.id} has no milestone`);
    assert.ok(milestone.unlocks);
    assert.ok(milestone.teleport);
    assert.equal('crystal' in milestone, false);
  });
  assert.equal(bohStage1Milestone('phase-99'), null);
});

test('each seat yields exactly five phases by two legions', () => {
  for (let seat = 1; seat <= BOH_STAGE1_SEATS; seat += 1) {
    const timeline = bohStage1Timeline(seat, { playerId: 'uid-1', gameName: 'Tester' });
    assert.equal(timeline.length, 10, `seat ${seat} should have 10 entries`);
    const keys = new Set(timeline.map((entry) => `${entry.legionId}:${entry.phaseId}`));
    assert.equal(keys.size, 10, `seat ${seat} has duplicate phase/legion pairs`);
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

test('backups default to no play for the full match', () => {
  assert.deepEqual([...BOH_STAGE1_BACKUP_SEATS], [11, 12]);
  BOH_STAGE1_BACKUP_SEATS.forEach((seat) => {
    const timeline = bohStage1Timeline(seat, { playerId: `backup-${seat}` });
    assert.equal(timeline.length, 10);
    timeline.forEach((entry) => {
      assert.equal(entry.instruction.standby, true);
      assert.match(entry.instruction.action, /default no play/iu);
    });
    BOH_STAGE1_PHASES.forEach((_phase, index) => assert.equal(bohIsStandby(seat, index), true));
  });
});

test('a paired substitution projects both players at the exact shared minute', () => {
  const players = substitutionRoster();
  const substitutions = [
    { backupPlayerId: 'player-11', replacesPlayerId: 'player-1', entryMinute: 3 },
  ];
  const plan = { players, substitutions };
  const incoming = bohStage1Timeline(11, { playerId: 'player-11', backup: true }, plan);
  incoming
    .filter((entry) => entry.phaseId === 'phase-1')
    .forEach((entry) => {
      assert.equal(entry.startMinute, 3);
      assert.equal('standby' in entry.instruction, false);
      assert.match(entry.instruction.note, /@3:00 replace the starter in seat 1/u);
    });
  const outgoing = bohStage1Timeline(1, { playerId: 'player-1' }, plan);
  outgoing
    .filter((entry) => entry.phaseId === 'phase-1')
    .forEach((entry) => {
      assert.equal(entry.startMinute, 0);
      assert.equal(entry.endMinute, 3);
      assert.match(entry.instruction.action, /swap out for the designated backup/u);
    });
  outgoing
    .filter((entry) => entry.phaseId !== 'phase-1')
    .forEach((entry) => {
      assert.equal(entry.instruction.standby, true);
      assert.match(entry.instruction.action, /remain off the battlefield/u);
    });
  const boundaryPlan = {
    players,
    substitutions: [{ backupPlayerId: 'player-11', replacesPlayerId: 'player-1', entryMinute: 5 }],
  };
  bohStage1Timeline(1, { playerId: 'player-1' }, boundaryPlan)
    .filter((entry) => entry.phaseId === 'phase-2')
    .forEach((entry) => {
      assert.equal(entry.startMinute, 5);
      assert.equal(entry.endMinute, 10);
      assert.equal(entry.instruction.standby, true);
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

test('tower topology has the canonical trunk, branch, and connected objectives', () => {
  const blue = BOH_STAGE1_TOWER_TOPOLOGY.sides.blue;
  const byId = new Map(blue.nodes.map((node) => [node.id, node]));
  assert.equal(BOH_STAGE1_TOWER_TOPOLOGY.coordinateSystem.kind, 'schematic');
  assert.match(BOH_STAGE1_TOWER_TOPOLOGY.coordinateSystem.label, /not in-game coordinates/iu);
  assert.equal(byId.get('T1').parentId, 'HOME');
  for (let tower = 2; tower <= 14; tower += 1)
    assert.equal(byId.get(`T${tower}`).parentId, tower === 5 ? 'T4' : `T${tower - 1}`);
  assert.equal(byId.get('T15').parentId, 'T4');
  for (let tower = 16; tower <= 19; tower += 1)
    assert.equal(byId.get(`T${tower}`).parentId, `T${tower - 1}`);
  assert.ok(blue.links.some((link) => link.from === 'T14' && link.to === 'FH1'));
  assert.ok(blue.links.some((link) => link.from === 'T19' && link.to === 'FH2'));
  assert.deepEqual(bohValidateStage1TowerTopology(), { valid: true, errors: [] });
});
test('tower footprints are 5x5 and red is an exact 180-degree mirror', () => {
  const blue = new Map(BOH_STAGE1_TOWER_TOPOLOGY.sides.blue.nodes.map((node) => [node.id, node]));
  const red = new Map(BOH_STAGE1_TOWER_TOPOLOGY.sides.red.nodes.map((node) => [node.id, node]));
  blue.forEach((node, id) => {
    assert.equal(node.coverage.width, 5);
    assert.equal(node.coverage.height, 5);
    assert.equal(red.get(id).x, 100 - node.x);
    assert.equal(red.get(id).y, 100 - node.y);
  });
});

test('tower validation rejects a disconnected claimed footprint', () => {
  const topology = structuredClone(BOH_STAGE1_TOWER_TOPOLOGY);
  const tower = topology.sides.blue.nodes.find((node) => node.id === 'T7');
  tower.coverage = { minX: 90, minY: 90, maxX: 94, maxY: 94, width: 5, height: 5 };
  const result = bohValidateStage1TowerTopology(topology);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /T7 territory is disconnected/u.test(error)));
});
function substitutionRoster() {
  return Array.from({ length: 12 }, (_, index) => ({
    playerId: `player-${index + 1}`,
    seatNumber: index + 1,
    backup: index >= 10,
    active: true,
  }));
}

test('draft rosters allow zero to two backups while release requires ten plus two', () => {
  assert.equal(BOH_STAGE1_MAX_ACTIVE_PLAYERS, 10);
  const draft = substitutionRoster()
    .slice(0, 10)
    .map((player) => ({ ...player, backup: false }));
  assert.equal(bohValidateStage1Roster(draft).valid, true);
  assert.equal(bohValidateStage1Roster(draft, { release: true }).valid, false);
  const release = bohValidateStage1Roster(substitutionRoster(), { release: true });
  assert.equal(release.valid, true);
  assert.deepEqual(release.counts, { roster: 12, backups: 2, activeStarters: 10 });
});

test('paired substitution events require an inactive backup and exact outgoing starter', () => {
  const roster = substitutionRoster();
  const substitutions = [
    { backupPlayerId: 'player-11', replacesPlayerId: 'player-1', entryMinute: 3 },
  ];
  const result = bohValidateStage1Substitutions(roster, substitutions);
  assert.equal(result.valid, true);
  assert.deepEqual(bohStage1SubstitutionEvents(roster, substitutions), result.events);
  assert.equal(result.events[0].entryMinute, 3);
});
test('substitution validation rejects early, unpaired, duplicate, and over-capacity play', () => {
  const roster = substitutionRoster();
  const invalid = bohValidateStage1Substitutions(roster, [
    { backupPlayerId: 'player-11', replacesPlayerId: 'player-1', entryMinute: 2 },
    { backupPlayerId: 'player-12', replacesPlayerId: 'player-1', entryMinute: 8 },
  ]);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => /minute must be 3\.\.60/u.test(error)));
  assert.ok(invalid.errors.some((error) => /replaced twice/u.test(error)));
  const overCapacity = substitutionRoster().map((player, index) => ({
    ...player,
    backup: index === 11,
  }));
  assert.equal(bohValidateStage1Substitutions(overCapacity, []).valid, false);
});

test('personal skill costs stay separate and unknown mechanics remain explicit', () => {
  const skills = new Map(BOH_STAGE1_BATTLEFIELD_SKILLS.map((skill) => [skill.id, skill]));
  assert.equal(skills.get('battlefield-teleport').battleMeritCost, 1000);
  assert.match(skills.get('battlefield-teleport').effect, /personal battlefield teleport/iu);
  assert.equal(skills.get('emergency-treatment').battleMeritCost, 1000);
  assert.equal(skills.get('rapid-freeze').battleMeritCost, 3000);
  assert.equal(skills.get('meteor-fall').battleMeritCost, 6000);
  ['emergency-treatment', 'rapid-freeze', 'meteor-fall'].forEach((id) =>
    assert.equal(skills.get(id).effect, null)
  );
  assert.equal(BOH_STAGE1_BATTLE_MERIT.conversionRate, null);
  assert.equal(BOH_STAGE1_BUILDING_BUFFS.provisional, true);
  assert.equal(BOH_STAGE1_BUILDING_BUFFS.exactStructureMapping, null);
});
