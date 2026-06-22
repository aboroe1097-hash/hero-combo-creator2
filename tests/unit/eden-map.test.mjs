import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const [
  { EDEN_STRATEGY_FLOOR },
  { getEdenSectors, getSectorBounds, getTempleCoords },
  { MAP_BOUNDS },
] = await Promise.all([
  import('../../js/eden-map-assets.js'),
  import('../../js/eden-map-data.js'),
  import('../../js/eden-map-terrain.js'),
]);

test('eden map uses the 1600x1600 in-game coordinate range', () => {
  const squareBounds = { minX: 0, maxX: 1600, minY: 0, maxY: 1600 };

  assert.deepEqual(MAP_BOUNDS, squareBounds);
  assert.deepEqual(getSectorBounds('FULL'), squareBounds);
  assert.deepEqual(EDEN_STRATEGY_FLOOR.bounds, squareBounds);
});

test('eden strategy floor is anchored on the center throne', () => {
  assert.deepEqual(getTempleCoords(), { x: 800, y: 800 });
  assert.deepEqual(EDEN_STRATEGY_FLOOR.centerAnchor, {
    label: 'Throne',
    x: 800,
    y: 800,
  });
});

test('built-in eden structures stay inside map bounds', () => {
  const outOfRange = [];

  for (const [sector, data] of Object.entries(getEdenSectors())) {
    const { bounds, structures } = data;
    if (
      bounds.minX < MAP_BOUNDS.minX ||
      bounds.maxX > MAP_BOUNDS.maxX ||
      bounds.minY < MAP_BOUNDS.minY ||
      bounds.maxY > MAP_BOUNDS.maxY
    ) {
      outOfRange.push(`${sector}:bounds`);
    }

    for (const structure of structures) {
      if (
        structure.x < MAP_BOUNDS.minX ||
        structure.x > MAP_BOUNDS.maxX ||
        structure.y < MAP_BOUNDS.minY ||
        structure.y > MAP_BOUNDS.maxY
      ) {
        outOfRange.push(`${sector}:${structure.id}:${structure.x},${structure.y}`);
      }
    }
  }

  assert.deepEqual(outOfRange, []);
});
