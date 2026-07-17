import assert from 'node:assert/strict';
import test from 'node:test';

import { SPECIALIZATION_RESEARCH } from '../../js/specialization-towers-v2-data.js';
import {
  createEmptySpecializationState,
  getResearchProgress,
  toggleResearchNode,
} from '../../js/specialization-towers-v2-model.js';
import {
  SPECIALIZATION_STORAGE_KEY,
  exportSpecializationJson,
  importSpecializationJson,
  loadSpecializationState,
  saveSpecializationState,
} from '../../js/specialization-towers-v2-store.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    read(key) {
      return values.get(key);
    },
  };
}

test('storage uses the dedicated v2 key and round-trips normalized state', () => {
  assert.equal(SPECIALIZATION_STORAGE_KEY, 'vts_specialization_towers_v2');
  const nodeId = SPECIALIZATION_RESEARCH.training1.nodes[0].id;
  const state = toggleResearchNode(
    createEmptySpecializationState(),
    'cavalry',
    'training1',
    nodeId
  );
  const storage = createStorage();

  assert.equal(saveSpecializationState(state, storage), true);
  assert.equal(typeof storage.read(SPECIALIZATION_STORAGE_KEY), 'string');
  const loaded = loadSpecializationState(storage);
  assert.equal(getResearchProgress(loaded, 'cavalry', 'training1').completedNodes, 1);
  assert.deepEqual(loaded, state);
});

test('missing, unreadable, and malformed saved state safely fall back to empty state', () => {
  assert.equal(
    getResearchProgress(loadSpecializationState(createStorage()), 'footman', 'training1')
      .completedNodes,
    0
  );
  const unreadable = {
    getItem() {
      throw new Error('blocked');
    },
  };
  assert.equal(
    getResearchProgress(loadSpecializationState(unreadable), 'footman', 'training1').completedNodes,
    0
  );
  const malformed = createStorage({ [SPECIALIZATION_STORAGE_KEY]: '{bad-json' });
  assert.equal(
    getResearchProgress(loadSpecializationState(malformed), 'footman', 'training1').completedNodes,
    0
  );
});

test('storage write failures return false without losing caller state', () => {
  const state = createEmptySpecializationState();
  const blocked = {
    setItem() {
      throw new Error('quota');
    },
  };
  assert.equal(saveSpecializationState(state, blocked), false);
  assert.equal(saveSpecializationState(state, null), false);
  assert.equal(state.troops.footman.researches.training1.selectedNodeIds.length, 0);
});

test('JSON import and export are deterministic and validated by the shared model parser', () => {
  const nodeId = SPECIALIZATION_RESEARCH.encounter1.nodes[0].id;
  const state = toggleResearchNode(
    createEmptySpecializationState(),
    'archer',
    'encounter1',
    nodeId
  );
  const exported = exportSpecializationJson(state);
  assert.match(exported, /\n {2}"schema"/);
  assert.deepEqual(importSpecializationJson(exported), state);
  assert.equal(exportSpecializationJson(importSpecializationJson(exported)), exported);
  assert.throws(() => importSpecializationJson('{"schemaVersion":99}'), /schema/);
});
