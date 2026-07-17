import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { STRIFE_MONSTER_COMBOS, STRIFE_MONSTERS, STRIFE_SEASONS } from '../../js/strife-db.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const comboRows = Object.values(STRIFE_MONSTER_COMBOS).flat();

test('Strife exposes only the intentional S0 through X2 stage scope', () => {
  assert.deepEqual(STRIFE_SEASONS, ['S0', 'S1', 'S2', 'S3', 'S4', 'X1', 'X2']);
  assert.equal(comboRows.length, 33);
  assert.deepEqual(
    comboRows.reduce((counts, { stage }) => {
      counts[stage] = (counts[stage] || 0) + 1;
      return counts;
    }, {}),
    { X1: 13, S3: 7, S4: 4, X2: 3, S1: 3, S2: 3 }
  );
  assert.equal(
    comboRows.some(({ stage }) => stage === 'X8'),
    false
  );
  assert.equal(
    comboRows.every(({ stage }) => STRIFE_SEASONS.includes(stage)),
    true
  );
});

test('Strife recommendations and local monster art remain internally complete', () => {
  const monsterIds = new Set(STRIFE_MONSTERS.map(({ id }) => id));

  assert.deepEqual(new Set(Object.keys(STRIFE_MONSTER_COMBOS)), monsterIds);
  for (const { imageUrl } of STRIFE_MONSTERS) {
    if (/^https?:\/\//u.test(imageUrl)) continue;
    assert.equal(existsSync(path.join(projectRoot, imageUrl)), true, imageUrl);
  }
});

test('Strife rank-1 rewards carry a name and only reference art that exists', () => {
  for (const monster of STRIFE_MONSTERS) {
    const reward = monster.rankOneReward;
    if (!reward) continue;
    assert.ok(reward.name, `${monster.id} rank-1 reward is missing a name`);
    const { imageUrl } = reward;
    if (!imageUrl || /^https?:\/\//u.test(imageUrl)) continue;
    assert.equal(existsSync(path.join(projectRoot, imageUrl)), true, imageUrl);
  }
});
