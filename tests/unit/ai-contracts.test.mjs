import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AI_CONTRACT_VERSION,
  AI_LIMITS,
  AI_SSE_EVENT_TYPES,
  AI_TOOL_GROUPS,
  boundAiToolResults,
  normalizeAiHistory,
  normalizeAllowedToolGroups,
  resolveAiTurnEndpoint,
  validateAiTurnRequest,
} from '../../js/ai/contracts.js';
import {
  AI_SAVED_STATE_KEYS,
  getAiSavedStatePresence,
  getExplicitSkinOwnership,
  readExplicitSkinOwnershipState,
  readMaterialPlanState,
  readResearchProgressState,
  readSelectedHeroState,
} from '../../js/ai/saved-state.js';
import { hasRawSavedState } from '../../js/ai/consent.js';
import { toVisibleWireHistory } from '../../js/ai/session-history.js';

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
}

function initialRequest(overrides = {}) {
  return {
    version: AI_CONTRACT_VERSION,
    requestId: 'f2de24a4-2347-4acf-8b8f-324a343f3b12',
    history: [],
    input: { kind: 'message', text: 'Compare Cleopatra and Theodora.', locale: 'en' },
    allowedToolGroups: [AI_TOOL_GROUPS.STATIC],
    ...overrides,
  };
}

test('assistant request contract accepts bounded initial and continuation requests', () => {
  assert.equal(validateAiTurnRequest(initialRequest()).ok, true);

  const continuation = {
    version: AI_CONTRACT_VERSION,
    requestId: 'f2de24a4-2347-4acf-8b8f-324a343f3b12',
    round: 1,
    providerState: { version: 1, steps: [], callFingerprints: [], startedAt: 1 },
    continuationToken: 'x'.repeat(40),
    input: {
      kind: 'tool_results',
      results: [{ callId: 'fc_1', name: 'get_hero_details', ok: true, data: {} }],
    },
  };
  assert.equal(validateAiTurnRequest(continuation).ok, true);
});

test('assistant request contract rejects oversized, mixed, and unknown capability input', () => {
  const oversized = validateAiTurnRequest(
    initialRequest({ input: { kind: 'message', text: 'x'.repeat(4001), locale: 'en' } })
  );
  assert.equal(oversized.ok, false);
  assert.ok(oversized.issues.some((entry) => entry.code === 'invalid_message'));

  const mixed = validateAiTurnRequest(initialRequest({ round: 1 }));
  assert.equal(mixed.ok, false);
  assert.ok(mixed.issues.some((entry) => entry.code === 'mixed_request_kind'));

  const unknownGroup = validateAiTurnRequest(
    initialRequest({ allowedToolGroups: ['static', 'personal:raw_storage'] })
  );
  assert.equal(unknownGroup.ok, false);
  assert.ok(unknownGroup.issues.some((entry) => entry.code === 'invalid_tool_group'));
});

test('shared contract freezes the normalized event, history, and capability surface', () => {
  assert.deepEqual(AI_SSE_EVENT_TYPES, [
    'start',
    'status',
    'text_delta',
    'tool_calls',
    'state',
    'sources',
    'usage',
    'done',
    'error',
  ]);
  assert.equal(AI_LIMITS.maxHistoryPairs, 8);
  assert.equal(AI_LIMITS.requestTimeoutMs, 180_000);
  assert.equal(AI_LIMITS.maxToolResultBytes, 8 * 1024);
  assert.deepEqual(normalizeAllowedToolGroups(['static', 'static', 'personal:raw_storage']), [
    'static',
  ]);
  const history = Array.from({ length: 20 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    text: String(index),
  }));
  assert.equal(normalizeAiHistory(history).length, 16);
  assert.equal(normalizeAiHistory(history)[0].text, '4');
});

test('visible history drops incomplete and orphaned messages without breaking wire pairs', () => {
  assert.deepEqual(
    toVisibleWireHistory([
      { role: 'user', text: 'orphaned', complete: true },
      { role: 'assistant', text: 'partial', complete: false },
      { role: 'user', text: 'kept user', complete: true },
      { role: 'assistant', text: 'kept answer', complete: true },
      { role: 'user', text: 'trailing orphan', complete: true },
    ]),
    [
      { role: 'user', text: 'kept user' },
      { role: 'assistant', text: 'kept answer' },
    ]
  );
  const invalid = validateAiTurnRequest(
    initialRequest({ history: [{ role: 'user', text: 'unpaired' }] })
  );
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((entry) => entry.code === 'invalid_history'));
});

test('client endpoint and tool-result wire shape match the Worker turn contract', () => {
  assert.equal(
    resolveAiTurnEndpoint('https://assistant.example.workers.dev/'),
    'https://assistant.example.workers.dev/v1/assistant/turn'
  );
  assert.equal(
    resolveAiTurnEndpoint('https://assistant.example.workers.dev/v1/assistant/turn'),
    'https://assistant.example.workers.dev/v1/assistant/turn'
  );
  const [result] = boundAiToolResults([
    { callId: 'fc_1', name: 'get_hero_details', ok: false, data: {}, error: {}, meta: {} },
  ]);
  assert.deepEqual(Object.keys(result), ['callId', 'name', 'ok', 'data']);
});

test('selected hero reader uses non-empty runtime truth then the versioned saved fallback', () => {
  const storage = new MemoryStorage({
    [AI_SAVED_STATE_KEYS.selectedHeroes]: JSON.stringify({
      _version: 1,
      heroes: ['Theodora', 'King Arthur', 'Unknown'],
    }),
  });
  const validHeroNames = new Set(['Theodora', 'King Arthur', 'Cleopatra VII']);

  const runtime = readSelectedHeroState({
    storage,
    validHeroNames,
    runtimeState: { generatorSelectedHeroes: new Set(['Cleopatra VII']) },
  });
  assert.equal(runtime.source, 'runtime');
  assert.deepEqual(runtime.heroes, ['Cleopatra VII']);

  const fallback = readSelectedHeroState({
    storage,
    validHeroNames,
    runtimeState: { generatorSelectedHeroes: new Set() },
  });
  assert.equal(fallback.source, 'storage');
  assert.deepEqual(fallback.heroes, ['Theodora', 'King Arthur']);
});

test('selected hero consent sees live Generator state before debounced storage catches up', () => {
  const storage = new MemoryStorage();
  assert.equal(
    hasRawSavedState('selected_heroes', storage, { generatorSelectedHeroes: new Set() }),
    false
  );
  assert.equal(
    hasRawSavedState('selected_heroes', storage, {
      generatorSelectedHeroes: new Set(['Beowulf']),
    }),
    true
  );
});

test('saved state readers distinguish absent data from malformed data and normalizer defaults', () => {
  const absent = new MemoryStorage();
  assert.deepEqual(getAiSavedStatePresence({ storage: absent }), {
    selectedHeroes: false,
    explicitSkins: false,
    dmPlan: false,
    researchProgress: false,
  });
  assert.equal(readMaterialPlanState({ storage: absent }).exists, false);

  const malformed = new MemoryStorage({
    [AI_SAVED_STATE_KEYS.dmPlan]: '{bad',
    [AI_SAVED_STATE_KEYS.researchProgress]: '[]',
    [AI_SAVED_STATE_KEYS.selectedHeroes]: '{bad',
  });
  assert.equal(readMaterialPlanState({ storage: malformed }).malformed, true);
  assert.equal(readResearchProgressState({ storage: malformed }).malformed, true);
  assert.equal(readSelectedHeroState({ storage: malformed }).malformed, true);
});

test('explicit skin ownership is tri-state and never inferred from catalog availability', () => {
  const storage = new MemoryStorage({
    [AI_SAVED_STATE_KEYS.explicitSkins]: JSON.stringify({
      _version: 2,
      heroes: { Theodora: true, 'King Arthur': false, Bad: 'yes' },
    }),
  });
  const state = readExplicitSkinOwnershipState({
    storage,
    validHeroNames: new Set(['Theodora', 'King Arthur', 'Cleopatra VII']),
  });
  assert.equal(getExplicitSkinOwnership(state, 'Theodora'), 'owned');
  assert.equal(getExplicitSkinOwnership(state, 'King Arthur'), 'not_owned');
  assert.equal(getExplicitSkinOwnership(state, 'Cleopatra VII'), 'unknown');
  assert.equal(getExplicitSkinOwnership(state, 'Bad'), 'unknown');
});
