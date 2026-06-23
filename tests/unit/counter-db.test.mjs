import test from 'node:test';
import assert from 'node:assert/strict';

import {
  comboKey,
  getCountersForCombo,
  normalizeCounter,
  validateCounterDatabase,
} from '../../js/counter-db.js';

test('counter database validates without unknown heroes or malformed rows', () => {
  assert.deepEqual(validateCounterDatabase(), []);
});

test('counter lookup is order-independent and returns defensive copies', () => {
  const counters = getCountersForCombo(['Theodora', 'Alexander', 'Cleopatra VII']);

  assert.ok(counters.length > 0);
  assert.equal(
    comboKey(['Theodora', 'Alexander', 'Cleopatra VII']),
    comboKey(['Alexander', 'Cleopatra VII', 'Theodora'])
  );

  counters[0].heroes[0] = 'Mutated';
  assert.notEqual(
    getCountersForCombo(['Alexander', 'Cleopatra VII', 'Theodora'])[0].heroes[0],
    'Mutated'
  );
});

test('duel screenshot counters include Arthur and Octavius skin-meta paths', () => {
  assert.ok(
    getCountersForCombo(['King Arthur', 'Rozen Blade', 'Theodora']).some(
      (counter) =>
        comboKey(counter.heroes) === comboKey(['Octavius', 'Rozen Blade', 'Caesar']) &&
        counter.confidence === 'Duel screenshot'
    )
  );
  assert.ok(
    getCountersForCombo(['Octavius', 'Rozen Blade', 'Caesar']).some(
      (counter) =>
        comboKey(counter.heroes) === comboKey(['Immortal Guardian', 'Ramses II', 'Beowulf']) &&
        counter.confidence === 'Duel screenshot'
    )
  );
});

test('latest VTS skin-mode counter relationships are recorded', () => {
  const arthurLaneCounters = getCountersForCombo([
    'King Arthur',
    'Cleopatra VII',
    'Bleeding Steed',
  ]);
  assert.ok(
    arthurLaneCounters.some(
      (counter) => comboKey(counter.heroes) === comboKey(['Beowulf', 'Ramses II', 'Theodora'])
    )
  );
  assert.ok(
    arthurLaneCounters.some(
      (counter) => comboKey(counter.heroes) === comboKey(['Octavius', 'Rozen Blade', 'Caesar'])
    )
  );

  const octaviusLaneCounters = getCountersForCombo(['Octavius', 'Rozen Blade', 'Caesar']);
  assert.ok(
    octaviusLaneCounters.some(
      (counter) => comboKey(counter.heroes) === comboKey(['Beowulf', 'Ramses II', 'Theodora'])
    )
  );
  assert.ok(
    octaviusLaneCounters.some(
      (counter) =>
        comboKey(counter.heroes) === comboKey(['Hunk', 'Boudica', 'Sakura']) &&
        counter.confidence === 'Soft counter'
    )
  );
});

test('counter normalization supports arrays and annotated objects', () => {
  assert.deepEqual(normalizeCounter(['A', 'B', 'C']), {
    heroes: ['A', 'B', 'C'],
    reason: null,
    confidence: null,
  });
  assert.deepEqual(
    normalizeCounter({ heroes: ['A', 'B', 'C'], reason: ' Useful ', confidence: 'High' }),
    {
      heroes: ['A', 'B', 'C'],
      reason: 'Useful',
      confidence: 'High',
    }
  );
  assert.equal(normalizeCounter(['A', 'B']), null);
});
