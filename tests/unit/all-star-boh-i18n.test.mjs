import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'acorn';

import {
  ALL_STAR_BOH_EN,
  ALL_STAR_BOH_LOCALES,
  allStarBohText,
  applyAllStarBohTranslations,
  loadAllStarBohLocale,
  resolveAllStarBohLocale,
} from '../../js/i18n/all-star-boh/index.js';

const templateUrl = new URL('../../tabs/all-star-boh.html', import.meta.url);
const domainUrl = new URL('../../js/i18n/all-star-boh/index.js', import.meta.url);
const runtimeUrls = [
  'all-star-boh.js',
  'all-star-boh-bootstrap.js',
  'all-star-boh-access.js',
  'all-star-boh-ocr.js',
  'all-star-boh-model.js',
].map((file) => new URL(`../../js/${file}`, import.meta.url));

function extractTemplateKeys(html) {
  return Array.from(
    html.matchAll(/\bdata-boh-i18n(?:-aria|-alt|-placeholder)?="([^"]+)"/g),
    (match) => match[1]
  );
}

function stringValue(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return null;
}

function placeholderNames(value) {
  return Array.from(String(value || '').matchAll(/\{(\w+)\}/gu), (match) => match[1]).sort();
}

function memberName(node) {
  if (node?.type !== 'MemberExpression') return null;
  return node.computed ? stringValue(node.property) : node.property?.name || null;
}

function extractRuntimeContracts(source, sourceName) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const contracts = [];
  const unresolved = [];

  function visit(node, scopeName = '') {
    if (!node || typeof node !== 'object') return;
    const nextScopeName =
      node.type === 'FunctionDeclaration' ? node.id?.name || '<anonymous>' : scopeName;
    if (node.type === 'CallExpression') {
      const isTranslator =
        node.callee?.type === 'MemberExpression' &&
        node.callee.object?.type === 'Identifier' &&
        node.callee.object.name === 'state' &&
        memberName(node.callee) === 'tr';
      const isNotice = node.callee?.type === 'Identifier' && node.callee.name === 'notice';
      const key = stringValue(node.arguments[isNotice ? 1 : 0]);
      const fallback = stringValue(node.arguments[isNotice ? 2 : 1]);
      const isNoticeWrapper =
        isTranslator &&
        nextScopeName === 'notice' &&
        node.arguments[0]?.type === 'Identifier' &&
        node.arguments[0].name === 'key' &&
        node.arguments[1]?.type === 'Identifier' &&
        node.arguments[1].name === 'fallback';
      if ((isTranslator || isNotice) && !isNoticeWrapper) {
        if (key && fallback !== null) contracts.push({ key, fallback, sourceName });
        else unresolved.push({ sourceName, scopeName: nextScopeName || '<module>' });
      }
    }
    for (const [name, value] of Object.entries(node)) {
      if (name === 'start' || name === 'end' || name === 'loc') continue;
      if (Array.isArray(value)) value.forEach((child) => visit(child, nextScopeName));
      else if (value?.type) visit(value, nextScopeName);
    }
  }

  visit(ast);
  return { contracts, unresolved };
}

function makeNode(dataset) {
  const attributes = {};
  return {
    dataset,
    textContent: 'fallback',
    attributes,
    setAttribute(name, value) {
      attributes[name] = value;
    },
    set innerHTML(_value) {
      throw new Error('Translations must not write HTML');
    },
  };
}

test('canonical English covers every current All-Star BoH template key', async () => {
  const html = await readFile(templateUrl, 'utf8');
  const templateKeys = [...new Set(extractTemplateKeys(html))].sort();

  assert.equal(templateKeys.length, 273);
  assert.deepEqual(
    templateKeys.filter((key) => !Object.hasOwn(ALL_STAR_BOH_EN, key)),
    [],
    'English must cover every template key'
  );
  assert.equal(ALL_STAR_BOH_EN['hero.title'], 'Build your strongest team');
  assert.equal(ALL_STAR_BOH_EN['nav.ariaLabel'], 'All-Star BoH sections');
  assert.equal(ALL_STAR_BOH_EN['signup.ocrPreviewAlt'], 'Selected account-stat screenshot preview');
  assert.equal(ALL_STAR_BOH_EN['signup.timezonePlaceholder'], 'Example: UTC+2');
});

test('canonical English exactly covers template and runtime translator contracts', async () => {
  const [html, ...runtimeSources] = await Promise.all([
    readFile(templateUrl, 'utf8'),
    ...runtimeUrls.map((url) => readFile(url, 'utf8')),
  ]);
  const templateKeys = extractTemplateKeys(html);
  const runtimeScans = runtimeSources.map((source, index) =>
    extractRuntimeContracts(source, runtimeUrls[index].pathname.split('/').at(-1))
  );
  const runtimeContracts = runtimeScans.flatMap(({ contracts }) => contracts);
  const unresolvedRuntimeCalls = runtimeScans.flatMap(({ unresolved }) => unresolved);
  const runtimeKeys = [...new Set(runtimeContracts.map(({ key }) => key))].sort();
  const runtimeOnlyKeys = runtimeKeys.filter((key) => !templateKeys.includes(key));
  const expectedKeys = [...new Set([...templateKeys, ...runtimeKeys])].sort();

  assert.deepEqual(
    unresolvedRuntimeCalls,
    [],
    'Every player runtime translation call must use a literal key and English fallback'
  );
  assert.equal(runtimeKeys.length, 103);
  assert.equal(runtimeOnlyKeys.length, 68);
  assert.equal(expectedKeys.length, 341);
  assert.deepEqual(
    Object.keys(ALL_STAR_BOH_EN).sort(),
    expectedKeys,
    'English must have no missing or unused player-domain keys'
  );

  for (const { key, fallback, sourceName } of runtimeContracts) {
    assert.equal(
      ALL_STAR_BOH_EN[key],
      fallback,
      `${sourceName} fallback for ${key} must match canonical English`
    );
    assert.deepEqual(
      placeholderNames(ALL_STAR_BOH_EN[key]),
      placeholderNames(fallback),
      `${key} must preserve its runtime placeholder contract`
    );
  }
});

test('DOM translation routes text and accessible attributes without writing unsafe HTML', () => {
  const textNode = makeNode({ bohI18n: 'hero.title' });
  const ariaNode = makeNode({ bohI18nAria: 'nav.ariaLabel' });
  const altNode = makeNode({ bohI18nAlt: 'signup.ocrPreviewAlt' });
  const placeholderNode = makeNode({ bohI18nPlaceholder: 'signup.timezonePlaceholder' });
  const nodesBySelector = {
    '[data-boh-i18n]': [textNode],
    '[data-boh-i18n-aria]': [ariaNode],
    '[data-boh-i18n-alt]': [altNode],
    '[data-boh-i18n-placeholder]': [placeholderNode],
  };
  const root = {
    querySelectorAll(selector) {
      return nodesBySelector[selector] || [];
    },
  };

  assert.equal(applyAllStarBohTranslations(root, 'en'), root);
  assert.equal(textNode.textContent, 'Build your strongest team');
  assert.equal(ariaNode.attributes['aria-label'], 'All-Star BoH sections');
  assert.equal(altNode.attributes.alt, 'Selected account-stat screenshot preview');
  assert.equal(placeholderNode.attributes.placeholder, 'Example: UTC+2');
});

test('text formatting substitutes supplied variables and preserves unresolved placeholders', () => {
  assert.equal(
    allStarBohText('Player {name} / {role}', { name: 'Abo' }, 'en'),
    'Player Abo / {role}'
  );
  assert.equal(
    allStarBohText('Player {name} / {role}', { name: '<strong>Abo</strong>', role: 0 }, 'en'),
    'Player <strong>Abo</strong> / 0'
  );
  assert.equal(allStarBohText('missing.key', {}, 'en'), 'missing.key');
});

test('locale resolution, English fallback, and lazy-loader contract stay stable', async () => {
  assert.deepEqual(ALL_STAR_BOH_LOCALES, [
    'en',
    'ar',
    'de',
    'es',
    'fr',
    'id',
    'kr',
    'pt',
    'ru',
    'tr',
    'zh',
  ]);
  assert.equal(resolveAllStarBohLocale('pt-BR'), 'pt');
  assert.equal(resolveAllStarBohLocale('ko-KR'), 'kr');
  assert.equal(resolveAllStarBohLocale('unsupported'), 'en');
  assert.equal(allStarBohText('hero.title', {}, 'ar'), ALL_STAR_BOH_EN['hero.title']);
  assert.strictEqual(await loadAllStarBohLocale('en-US'), ALL_STAR_BOH_EN);
  assert.strictEqual(await loadAllStarBohLocale('unsupported'), ALL_STAR_BOH_EN);

  const source = await readFile(domainUrl, 'utf8');
  for (const locale of ALL_STAR_BOH_LOCALES.slice(1)) {
    assert.match(source, new RegExp(`${locale}: \\(\\) => import\\('\\./${locale}\\.js'\\)`));
  }
  assert.doesNotMatch(
    source,
    /import\s+.+\s+from\s+['"]\.\/(?:ar|de|es|fr|id|kr|pt|ru|tr|zh)\.js['"]/
  );
});
