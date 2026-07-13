import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyDashboardAttackMutation,
  dashboardAttackFingerprint,
  mergeDashboardOcrAttacks,
} from '../../js/dashboard-attack-mutations.js';

const attacks = [
  {
    id: 'capital_5_1000000000000',
    structure_name: 'Capital',
    structure_level: 'Lv.5',
    game_time: '01/07/2026, 12:00 GT',
    players: [{ name: 'Alpha', value: 100, rank: 1 }],
  },
  {
    id: 'gate_3_1000000001000',
    structure_name: 'Gate',
    structure_level: 'Lv.3',
    game_time: '01/07/2026, 13:00 GT',
    players: [{ name: 'Bravo', value: 80, rank: 1 }],
  },
];

test('delete mutation removes only the selected cloud attack', () => {
  const result = applyDashboardAttackMutation(attacks, {
    type: 'delete',
    attackId: attacks[0].id,
    expectedFingerprint: dashboardAttackFingerprint(attacks[0]),
  });

  assert.equal(result.applied, true);
  assert.deepEqual(
    result.attacks.map((attack) => attack.id),
    [attacks[1].id]
  );
  assert.equal(result.attacks[0].game_time, attacks[1].game_time);
});

test('edit mutation rebases the selected fields and preserves latest players', () => {
  const result = applyDashboardAttackMutation(attacks, {
    type: 'edit',
    attackId: attacks[0].id,
    expectedFingerprint: dashboardAttackFingerprint(attacks[0]),
    patch: {
      game_time: '01/07/2026, 15:30 GT',
      start_time: '15:00',
    },
  });

  assert.equal(result.applied, true);
  assert.equal(result.attacks[0].game_time, '01/07/2026, 15:30 GT');
  assert.equal(result.attacks[0].start_time, '15:00');
  assert.deepEqual(result.attacks[0].players, attacks[0].players);
  assert.equal(result.attacks[1].game_time, attacks[1].game_time);
});

test('missing and colliding edits are rejected without changing the snapshot', () => {
  const missing = applyDashboardAttackMutation(attacks, {
    type: 'edit',
    attackId: 'missing-attack',
    patch: { game_time: '01/07/2026, 16:00 GT' },
  });
  assert.equal(missing.applied, false);
  assert.equal(missing.reason, 'missing');

  const collision = applyDashboardAttackMutation(attacks, {
    type: 'edit',
    attackId: attacks[0].id,
    expectedFingerprint: dashboardAttackFingerprint(attacks[0]),
    patch: { id: attacks[1].id },
  });
  assert.equal(collision.applied, false);
  assert.equal(collision.reason, 'id-collision');
  assert.deepEqual(
    collision.attacks.map((attack) => attack.id),
    attacks.map((attack) => attack.id)
  );
});

test('concurrently changed attacks cannot be edited or deleted', () => {
  const openedFingerprint = dashboardAttackFingerprint(attacks[0]);
  const changedAttacks = [{ ...attacks[0], game_time: '01/07/2026, 18:00 GT' }, attacks[1]];

  for (const type of ['edit', 'delete']) {
    const result = applyDashboardAttackMutation(changedAttacks, {
      type,
      attackId: attacks[0].id,
      expectedFingerprint: openedFingerprint,
      patch: { game_time: '01/07/2026, 19:00 GT' },
    });
    assert.equal(result.applied, false);
    assert.equal(result.reason, 'changed');
    assert.deepEqual(result.attacks, changedAttacks);
  }
});

test('OCR uploads merge into the latest cloud sessions without dropping concurrent data', () => {
  const concurrentCloudAttack = {
    id: 'temple_2_1000000002000',
    structure_name: 'Temple',
    structure_level: 'Lv.2',
    game_time: '01/07/2026, 14:00 GT',
    players: [{ name: 'Cloud', value: 70, rank: 1 }],
  };
  const sameSessionUpload = {
    ...attacks[0],
    players: [
      { name: 'Alpha', value: 100, rank: 1 },
      { name: 'Mobile', value: 60, rank: 2 },
    ],
  };

  const merged = mergeDashboardOcrAttacks([...attacks, concurrentCloudAttack], [sameSessionUpload]);

  assert.equal(merged.length, 3);
  assert.ok(merged.some((attack) => attack.id === concurrentCloudAttack.id));
  const session = merged.find((attack) => attack.id === attacks[0].id);
  assert.deepEqual(
    session.players.map((player) => player.name),
    ['Alpha', 'Mobile']
  );
  assert.equal(session.total_demolition, 160);
  assert.equal(session.players_count, 2);
});
