import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'acorn';

import {
  ADMIN_ALL_STAR_BOH_EN,
  ADMIN_ALL_STAR_BOH_LOCALES,
  adminAllStarBohText,
  loadAdminAllStarBohLocale,
  resolveAdminAllStarBohLocale,
} from '../../js/i18n/admin-all-star-boh/index.js';
import { ADMIN_ALL_STAR_BOH_SHARED_ADDITIONS } from '../../js/i18n/admin-all-star-boh/shared-additions.js';

const adminSourceUrl = new URL('../../js/admin-all-star-boh.js', import.meta.url);
const domainUrl = new URL('../../js/i18n/admin-all-star-boh/index.js', import.meta.url);
const INTEGRATION_KEYS = Object.freeze([
  'adminBohTab',
  'adminBohTitle',
  'adminBohLoading',
  'adminBohUnavailable',
  'adminBohInstructionCount',
]);

function stringValue(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

function placeholderNames(value) {
  return [...String(value || '').matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function analyzeAdminSource(source) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const keys = new Set();
  const fallbackContracts = new Map();

  function record(key, fallback) {
    keys.add(key);
    if (fallback === null) return;
    const signature = placeholderNames(fallback).join(',');
    if (!fallbackContracts.has(key)) fallbackContracts.set(key, new Set());
    fallbackContracts.get(key).add(signature);
  }

  function visit(node, ancestors = []) {
    if (!node || typeof node !== 'object') return;
    const parent = ancestors.at(-1);
    const grandparent = ancestors.at(-2);

    if (
      node.type === 'Literal' &&
      typeof node.value === 'string' &&
      /^adminBoh[A-Za-z0-9]+$/.test(node.value)
    ) {
      let fallback = null;
      if (parent?.type === 'ArrayExpression') {
        const index = parent.elements.indexOf(node);
        fallback = stringValue(parent.elements[index + 1]);
      } else if (parent?.type === 'CallExpression') {
        const index = parent.arguments.indexOf(node);
        fallback = stringValue(parent.arguments[index + 1]);
      } else if (
        parent?.type === 'ConditionalExpression' &&
        grandparent?.type === 'CallExpression'
      ) {
        const index = grandparent.arguments.indexOf(parent);
        const fallbackNode = grandparent.arguments[index + 1];
        if (fallbackNode?.type === 'ConditionalExpression') {
          fallback = stringValue(
            node === parent.consequent ? fallbackNode.consequent : fallbackNode.alternate
          );
        } else {
          fallback = stringValue(fallbackNode);
        }
      }
      record(node.value, fallback);
    }

    const nextAncestors = [...ancestors, node];
    for (const [name, value] of Object.entries(node)) {
      if (name === 'start' || name === 'end' || name === 'loc') continue;
      if (Array.isArray(value)) {
        value.forEach((child) => visit(child, nextAncestors));
      } else if (value?.type) {
        visit(value, nextAncestors);
      }
    }
  }

  visit(ast);
  return { keys, fallbackContracts };
}

test('canonical English exactly covers every admin translator and integration key', async () => {
  const source = await readFile(adminSourceUrl, 'utf8');
  const { keys } = analyzeAdminSource(source);
  INTEGRATION_KEYS.forEach((key) => keys.add(key));

  const sourceKeys = [...keys].sort();
  const englishKeys = Object.keys(ADMIN_ALL_STAR_BOH_EN).sort();
  assert.equal(sourceKeys.length, 666);
  assert.deepEqual(englishKeys, sourceKeys, 'English must have no missing or extra admin keys');
  assert.ok(
    Object.values(ADMIN_ALL_STAR_BOH_EN).every((value) => typeof value === 'string' && value)
  );
  assert.equal(ADMIN_ALL_STAR_BOH_EN.adminBohTab, 'All-Star BoH');
  assert.equal(
    ADMIN_ALL_STAR_BOH_EN.adminBohUnavailable,
    'All-Star administration is unavailable. Refresh and try again.'
  );
  assert.deepEqual(
    {
      unitSpecialtyPower: ADMIN_ALL_STAR_BOH_EN.adminBohScoreUnitSpecialtyPower,
      rocLevel: ADMIN_ALL_STAR_BOH_EN.adminBohScoreRocLevel,
      paidUsableHero: ADMIN_ALL_STAR_BOH_EN.adminBohScorePaidUsableHero,
      loftyTroopMillion: ADMIN_ALL_STAR_BOH_EN.adminBohScoreLoftyTroopMillion,
      enhancedT10TroopMillion: ADMIN_ALL_STAR_BOH_EN.adminBohScoreEnhancedT10TroopMillion,
    },
    {
      unitSpecialtyPower: 'Unit specialty power',
      rocLevel: 'RoC level',
      paidUsableHero: 'Each paid usable hero',
      loftyTroopMillion: 'S (Lofty) troops — points per 1 million',
      enhancedT10TroopMillion: 'Enhanced T10 troops — points per 1 million',
    }
  );
  assert.equal(
    ADMIN_ALL_STAR_BOH_EN.adminBohSignupPlanningSignalsHelp,
    'Preferences guide planning and never lock assignments. Only enabled scoring components affect scores.'
  );
});

test('canonical placeholders exactly match every source fallback contract', async () => {
  const source = await readFile(adminSourceUrl, 'utf8');
  const { keys, fallbackContracts } = analyzeAdminSource(source);

  assert.deepEqual(
    [...keys].filter((key) => !fallbackContracts.has(key)),
    []
  );
  for (const [key, signatures] of fallbackContracts) {
    const canonicalSignature = placeholderNames(ADMIN_ALL_STAR_BOH_EN[key]).join(',');
    assert.deepEqual([...signatures], [canonicalSignature], `${key} placeholder contract drifted`);
  }

  const placeholderKeys = Object.entries(ADMIN_ALL_STAR_BOH_EN)
    .filter(([, value]) => placeholderNames(value).length)
    .map(([key]) => key);
  assert.equal(placeholderKeys.length, 74);
});

test('admin text formatting substitutes supplied values and preserves unresolved placeholders', () => {
  assert.equal(
    adminAllStarBohText('adminBohSignupCaption', { shown: 7 }, 'en'),
    '7 of {total} signups'
  );
  assert.equal(
    adminAllStarBohText('adminBohSeatPlayer', { seat: 4, player: '<b>Abo</b>' }, 'en'),
    'Seat 4 · <b>Abo</b>'
  );
  assert.equal(adminAllStarBohText('missing.{value}', { value: 0 }, 'en'), 'missing.0');
});

test('admin locale resolution, fallback, and lazy-loader contract stay stable', async () => {
  assert.deepEqual(ADMIN_ALL_STAR_BOH_LOCALES, [
    'en',
    'ar',
    'de',
    'es',
    'fr',
    'id',
    'it',
    'kr',
    'pt',
    'ru',
    'tr',
    'zh',
  ]);
  assert.equal(resolveAdminAllStarBohLocale('pt-BR'), 'pt');
  assert.equal(resolveAdminAllStarBohLocale('ko-KR'), 'kr');
  assert.equal(resolveAdminAllStarBohLocale('unsupported'), 'en');
  assert.equal(adminAllStarBohText('adminBohTitle', {}, 'ar'), ADMIN_ALL_STAR_BOH_EN.adminBohTitle);
  assert.strictEqual(await loadAdminAllStarBohLocale('en-US'), ADMIN_ALL_STAR_BOH_EN);
  assert.strictEqual(await loadAdminAllStarBohLocale('unsupported'), ADMIN_ALL_STAR_BOH_EN);

  const sharedFallbackKeys = Object.keys(ADMIN_ALL_STAR_BOH_SHARED_ADDITIONS).filter((key) =>
    Object.hasOwn(ADMIN_ALL_STAR_BOH_EN, key)
  );
  for (const locale of ADMIN_ALL_STAR_BOH_LOCALES.slice(1)) {
    const pack = await loadAdminAllStarBohLocale(locale);
    for (const key of sharedFallbackKeys) {
      assert.equal(pack[key], ADMIN_ALL_STAR_BOH_EN[key], `${locale} should use canonical ${key}`);
    }
  }

  const source = await readFile(domainUrl, 'utf8');
  for (const locale of ADMIN_ALL_STAR_BOH_LOCALES.slice(1)) {
    assert.match(source, new RegExp(`${locale}: \\(\\) => import\\('\\./${locale}\\.js'\\)`));
  }
  assert.doesNotMatch(
    source,
    /import\s+.+\s+from\s+['"]\.\/(?:ar|de|es|fr|id|it|kr|pt|ru|tr|zh)\.js['"]/
  );
});
