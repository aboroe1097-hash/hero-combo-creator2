import './dom-stub.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRESET_STORAGE_KEY,
  createEmptyPresetStore,
  loadPresetStore,
  removePreset,
  savePresetStore,
  serializePresetStore,
  upsertPreset,
} from '../../js/preset-engine-store.js';
import { decodePresetShare, encodePresetShare } from '../../js/preset-engine-share.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    values,
  };
}

const record = {
  id: 'preset-1',
  name: 'AoE rush',
  treeId: 'towers-cavalry',
  allocation: { root: 2, aoe: 1 },
};

test('preset store round-trips through injectable storage', () => {
  const storage = memoryStorage();
  let state = createEmptyPresetStore();
  state = upsertPreset(state, record);
  assert.equal(state.presets.length, 1);
  assert.equal(savePresetStore(state, storage), true);
  assert.ok(storage.values.has(PRESET_STORAGE_KEY));
  const loaded = loadPresetStore(storage);
  assert.equal(loaded.presets.length, 1);
  assert.equal(loaded.presets[0].name, 'AoE rush');
  assert.deepEqual(loaded.presets[0].allocation, { root: 2, aoe: 1 });
});

test('upsert replaces by id and remove drops records', () => {
  let state = createEmptyPresetStore();
  state = upsertPreset(state, record);
  state = upsertPreset(state, { ...record, name: 'Renamed' });
  assert.equal(state.presets.length, 1);
  assert.equal(state.presets[0].name, 'Renamed');
  state = removePreset(state, 'preset-1');
  assert.equal(state.presets.length, 0);
});

test('store drops invalid allocation entries', () => {
  const storage = memoryStorage();
  storage.setItem(
    PRESET_STORAGE_KEY,
    serializePresetStore({
      presets: [
        { ...record, allocation: { root: 2, 'bad key!': 3 } },
        { ...record, allocation: { root: -2 } },
        { ...record, allocation: { root: 1001 } },
      ],
    })
  );
  const loaded = loadPresetStore(storage);
  assert.equal(loaded.presets.length, 3);
  assert.deepEqual(loaded.presets[0].allocation, { root: 2 });
  assert.deepEqual(loaded.presets[1].allocation, {});
  assert.deepEqual(loaded.presets[2].allocation, {});
});

test('store discards corrupted JSON', () => {
  const storage = memoryStorage();
  storage.setItem(PRESET_STORAGE_KEY, '{{{');
  assert.deepEqual(loadPresetStore(storage), createEmptyPresetStore());
});

test('share codec round-trips and rejects tampering', () => {
  const hash = encodePresetShare('towers-cavalry', 'AoE rush', { root: 2, aoe: 1 });
  assert.ok(hash.length > 0);
  const decoded = decodePresetShare(hash);
  assert.equal(decoded.treeId, 'towers-cavalry');
  assert.equal(decoded.name, 'AoE rush');
  assert.deepEqual(decoded.allocation, { root: 2, aoe: 1 });
  assert.equal(decodePresetShare('not-a-hash'), null);
  assert.equal(decodePresetShare(`${hash}xyz`), null);
  assert.equal(decodePresetShare(''), null);
});

test('share codec rejects empty tree ids on decode', () => {
  const hash = encodePresetShare('', 'unnamed', {});
  assert.ok(hash.length > 0);
  assert.equal(decodePresetShare(hash), null);
});
