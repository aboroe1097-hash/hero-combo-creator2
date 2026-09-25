import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AI_TOOL_DECLARATIONS,
  AI_TOOL_EXECUTORS,
  AI_TOOL_NAMES,
} from '../../js/ai/tool-registry.js';
import { SOURCE_LABEL_KEYS, TOOL_SOURCE_LABEL_KEYS } from '../../js/ai/ui-actions.js';
import { AI_CATEGORY_TOOL_GROUPS, AI_PERSONAL_CATEGORIES } from '../../js/ai/consent.js';
import { AI_TOOL_GROUPS } from '../../js/ai/contracts.js';
import { VELO_COPY_LOCALES, getVeloCopy } from '../../js/i18n/velo-copy.js';
import {
  loadTranslationsForLanguage,
  translationCoverage,
  translations,
} from '../../js/translations.js';
import { TOOL_GROUPS } from '../../workers/ai/constants.js';
import { buildGeminiRequest } from '../../workers/ai/gemini.js';
import {
  TOOL_DECLARATIONS,
  validateToolArguments,
  validateToolPermission,
} from '../../workers/ai/tools.js';

const LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'hr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];

test('every Worker tool has a client adapter and registry entry, and vice versa', () => {
  const workerNames = TOOL_DECLARATIONS.map((tool) => tool.name).sort();
  const clientNames = [...AI_TOOL_NAMES].sort();
  assert.deepEqual(workerNames, clientNames);
  assert.deepEqual(AI_TOOL_DECLARATIONS.map((tool) => tool.name).sort(), clientNames);
  for (const name of AI_TOOL_NAMES) {
    assert.equal(typeof AI_TOOL_EXECUTORS[name], 'function', `${name} has an adapter`);
  }
  for (const name of [
    'get_competition_status',
    'get_building_costs',
    'get_eden_operations',
    'get_my_competition',
  ]) {
    assert.ok(clientNames.includes(name), `${name} is registered`);
  }
});

test('every tool has a source label, translated in all 13 locales', async () => {
  assert.deepEqual([...VELO_COPY_LOCALES].sort(), [...LOCALES].sort());
  assert.deepEqual(Object.keys(TOOL_SOURCE_LABEL_KEYS).sort(), [...AI_TOOL_NAMES].sort());
  const keys = new Set([
    ...Object.values(TOOL_SOURCE_LABEL_KEYS),
    ...Object.values(SOURCE_LABEL_KEYS),
  ]);
  for (const locale of LOCALES) {
    const catalog = await loadTranslationsForLanguage(locale);
    const missingBeforeFallback = new Set(translationCoverage[locale]?.missingBeforeFallback || []);
    for (const key of keys) {
      const own = getVeloCopy(locale)[key];
      const fromCatalog =
        locale === 'en' || !missingBeforeFallback.has(key) ? catalog[key] : undefined;
      const value = own || fromCatalog;
      assert.ok(typeof value === 'string' && value.trim(), `${locale} translates ${key}`);
    }
  }
  assert.ok(translations.en);
});

test('the Velo copy pack has every key in every locale with the same tokens', () => {
  const tokens = (value) => [...String(value).matchAll(/\{(\w+)\}/gu)].map((m) => m[1]).sort();
  const english = getVeloCopy('en');
  for (const locale of LOCALES) {
    const pack = getVeloCopy(locale);
    for (const [key, value] of Object.entries(english)) {
      // Croatian also carries the pre-1.0 source labels the main catalog lacks.
      assert.ok(pack[key], `${locale} has ${key}`);
      assert.deepEqual(tokens(pack[key]), tokens(value), `${locale} ${key} keeps its tokens`);
    }
  }
  assert.deepEqual(getVeloCopy('ko-KR'), getVeloCopy('kr'));
  assert.deepEqual(getVeloCopy('xx'), {});
});

test('My Competition #12 is its own consent category on both sides of the wire', () => {
  assert.ok(AI_PERSONAL_CATEGORIES.includes('my_competition'));
  assert.equal(AI_CATEGORY_TOOL_GROUPS.my_competition, AI_TOOL_GROUPS.MY_COMPETITION);
  assert.ok(TOOL_GROUPS.includes('personal:my_competition'));
  assert.equal(validateToolPermission('get_my_competition', {}, ['static']), false);
  assert.equal(
    validateToolPermission('get_my_competition', {}, ['static', 'personal:my_competition']),
    true
  );
  const hidden = buildGeminiRequest({
    model: 'gemini-3.5-flash',
    providerInput: [{ type: 'user_input', content: [{ type: 'text', text: 'my registration' }] }],
    allowedToolGroups: ['static'],
    locale: 'en',
  });
  const names = hidden.tools.map((tool) => tool.name);
  assert.equal(names.includes('get_my_competition'), false);
  assert.ok(names.includes('get_competition_status'));
  assert.ok(names.includes('get_building_costs'));
  assert.ok(names.includes('get_eden_operations'));
  const shown = buildGeminiRequest({
    model: 'gemini-3.5-flash',
    providerInput: [{ type: 'user_input', content: [{ type: 'text', text: 'my registration' }] }],
    allowedToolGroups: ['static', 'personal:my_competition'],
    locale: 'en',
  });
  assert.ok(shown.tools.some((tool) => tool.name === 'get_my_competition'));
});

test('the Worker validates the new tools arguments strictly', () => {
  assert.equal(validateToolArguments('get_competition_status', {}), true);
  assert.equal(validateToolArguments('get_competition_status', { season: 'x' }), false);
  assert.equal(validateToolArguments('get_my_competition', {}), true);
  assert.equal(validateToolArguments('get_my_competition', { uid: 'someone' }), false);
  assert.equal(validateToolArguments('get_building_costs', { kind: 'castle' }), true);
  assert.equal(validateToolArguments('get_building_costs', { kind: 'list' }), true);
  assert.equal(
    validateToolArguments('get_building_costs', { kind: 'building', building: 'Tavern' }),
    true
  );
  assert.equal(validateToolArguments('get_building_costs', { kind: 'building' }), false);
  assert.equal(
    validateToolArguments('get_building_costs', { kind: 'castle', building: 'x' }),
    false
  );
  assert.equal(
    validateToolArguments('get_eden_operations', { kind: 'pathing_rule', tiles: 81 }),
    true
  );
  assert.equal(
    validateToolArguments('get_eden_operations', { kind: 'pathing_rule', tiles: -1 }),
    false
  );
  assert.equal(
    validateToolArguments('get_eden_operations', {
      kind: 'staffing',
      structure: 'gate-3',
      banner: true,
    }),
    true
  );
  assert.equal(validateToolArguments('get_eden_operations', { kind: 'staffing', tiles: 3 }), false);
  assert.equal(validateToolArguments('get_eden_operations', { kind: 'war' }), false);
});
