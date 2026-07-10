import assert from 'node:assert/strict';
import test from 'node:test';

import { applyDashboardAttackMutation } from '../../js/dashboard-attack-mutations.js';

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
  });

  assert.equal(result.applied, true);
  assert.deepEqual(result.attacks.map((attack) => attack.id), [attacks[1].id]);
  assert.equal(result.attacks[0].game_time, attacks[1].game_time);
});

test('edit mutation rebases the selected fields and preserves latest players', () => {
  const result = applyDashboardAttackMutation(attacks, {
    type: 'edit',
    attackId: attacks[0].id,
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
    patch: { id: attacks[1].id },
  });
  assert.equal(collision.applied, false);
  assert.equal(collision.reason, 'id-collision');
  assert.deepEqual(collision.attacks.map((attack) => attack.id), attacks.map((attack) => attack.id));
});
