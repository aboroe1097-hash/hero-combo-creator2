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

test('the published season carries the admin scoring rules, and old publishes carry none', async () => {
  const { readFileSync } = await import('node:fs');
  const weights = {
    banners: { main: 1, alt: 0.5 },
    pathers: { main: 3, alt: 1 },
    shieldWalls: { main: 1, alt: 1 },
  };
  const withScoring = buildEdenPublicProjection({
    scoring: { dutyPointWeights: weights, includeDemolitionPoints: false },
  });
  assert.deepEqual(withScoring.scoring, {
    dutyPointWeights: weights,
    includeDemolitionPoints: false,
  });
  // No scoring passed (unpublish, older callers): the field is simply absent,
  // which the public page reads as "keep the previous behaviour".
  assert.equal('scoring' in buildEdenPublicProjection({}), false);

  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(
    rules,
    /'updatedBy', 'dashboard', 'rosterSnapshots', 'voteSettings', 'publicVoteResults',\s*'scoring'/
  );
  assert.match(
    rules,
    /!\('scoring' in request\.resource\.data\) \|\| request\.resource\.data\.scoring is map/
  );

  const publicPage = readFileSync('js/eden-x1.js', 'utf8');
  assert.match(publicPage, /dutyPointWeights: publishedScoring\?\.dutyPointWeights/);
  assert.match(publicPage, /publishedScoring\?\.includeDemolitionPoints === true/);
});

test('account links stay one level deep and never link a name to itself', async () => {
  const { normalizeAccountLinks, normalizePlayerRegistry } =
    await import('../../js/player-registry.js');
  const links = normalizeAccountLinks([
    { account: 'Angel Banner', owner: 'ANGEL', type: 'banner' },
    { account: 'ANGEL', owner: 'Someone', type: 'banner' },
    { account: 'Loony Banner', owner: 'Angel Banner' },
    { account: 'Self', owner: 'self' },
    { account: 'RedBull#2', owner: 'REDBULL§', type: 'weird' },
    { account: '', owner: 'x' },
  ]);
  assert.deepEqual(links, [
    { account: 'Angel Banner', owner: 'ANGEL', type: 'banner' },
    { account: 'RedBull#2', owner: 'REDBULL§', type: 'banner' },
  ]);
  // Links round-trip through the registry that is saved with dashboard data.
  assert.deepEqual(normalizePlayerRegistry({ accountLinks: links }).accountLinks, links);
});
