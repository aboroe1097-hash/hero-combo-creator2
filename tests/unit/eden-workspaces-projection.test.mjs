import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEdenPublicProjection, stripUndefined } from '../../js/eden-workspaces.js';

test('stripUndefined recursively cleans undefined values while preserving falsey valid values', () => {
  const input = {
    keepNull: null,
    keepFalse: false,
    keepZero: 0,
    keepEmptyStr: '',
    removeUndefined: undefined,
    nested: {
      valid: 'ok',
      nestedUndefined: undefined,
    },
    list: [{ a: 1, bad: undefined }, undefined, 'valid'],
  };

  const output = stripUndefined(input);
  assert.deepEqual(output, {
    keepNull: null,
    keepFalse: false,
    keepZero: 0,
    keepEmptyStr: '',
    nested: {
      valid: 'ok',
    },
    list: [{ a: 1 }, 'valid'],
  });
});

test('buildEdenPublicProjection strips undefined from nested attacks and summaries', () => {
  const projection = buildEdenPublicProjection({
    workspace: 'eden-x2',
    revision: 2,
    dashboardData: {
      r5Season: 'season-2027',
      total_attacks: 1,
      attacks: [
        {
          id: 'test_attack_1',
          structure_name: 'Checkpoint Lv7',
          display_structure_name: undefined,
          display_structure_level: undefined,
        },
      ],
      players_summary: [
        {
          name: 'PlayerOne',
          total_demolition: 5000,
          participation_count: 1,
          unique_structures_count: 1,
          attacks: [
            {
              id: 'att_1',
              display_structure_name: undefined,
              display_structure_level: undefined,
            },
          ],
        },
      ],
    },
  });

  assert.equal(projection.workspace, 'eden-x2');
  assert.equal(projection.revision, 2);
  assert.equal(projection.published, true);

  const hasUndefined = (val) => {
    if (val === undefined) return true;
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) return val.some(hasUndefined);
      return Object.values(val).some(hasUndefined);
    }
    return false;
  };

  assert.equal(hasUndefined(projection), false, 'Projection must contain no undefined values');
  assert.equal(projection.dashboard.attacks[0].id, 'test_attack_1');
  assert.equal('display_structure_name' in projection.dashboard.attacks[0], false);
  assert.equal(
    'display_structure_name' in projection.dashboard.players_summary[0].attacks[0],
    false
  );
});
