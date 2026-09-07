import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import arCatalog from '../../js/i18n/ar.js';
import itCatalog from '../../js/i18n/it.js';
import krCatalog from '../../js/i18n/kr.js';
import { AI_ACTION_LOCALES, getAiActionCopy } from '../../js/i18n/ai-action-copy.js';
import {
  loadTranslationsForLanguage,
  translationCoverage,
  translations,
} from '../../js/translations.js';
import { DM_MATERIAL_LOCALES, auditDmMaterialsPack } from '../../js/i18n/dm-materials/index.js';
import { DM_MATERIAL_PACKS } from '../../js/i18n/dm-materials/packs.js';
import {
  auditResearchPack,
  getResearchPack,
  loadResearchLocale,
  researchSearchText,
} from '../../js/i18n/research/index.js';
import {
  RUNTIME_MISC_LOCALES,
  getRuntimeMiscCopy,
  runtimeMiscT,
} from '../../js/i18n/runtime-misc.js';
import { techDatabase } from '../../js/tech-db.js';

const NON_ENGLISH_LOCALES = Object.freeze([
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

test('Italian and Korean main catalogs own the complete current English key contract', async () => {
  const englishKeys = Object.keys(translations.en).sort();
  const placeholders = (value) =>
    [...String(value || '').matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();

  for (const [locale, catalog] of [
    ['it', itCatalog],
    ['kr', krCatalog],
  ]) {
    assert.deepEqual(Object.keys(catalog).sort(), englishKeys, `${locale}: main key parity`);
    for (const key of englishKeys) {
      assert.deepEqual(
        placeholders(catalog[key]),
        placeholders(translations.en[key]),
        `${locale}.${key}: placeholders`
      );
    }
  }

  const italianSource = await readFile(new URL('../../js/i18n/it.js', import.meta.url), 'utf8');
  assert.doesNotMatch(italianSource, /import en from/u);
  assert.doesNotMatch(italianSource, /\.\.\.en\b/u);
  assert.match(italianSource, /import \{ ADMIN_RUNTIME_IT \} from '\.\/admin-runtime\/it\.js'/u);
  assert.match(italianSource, /\.\.\.ADMIN_RUNTIME_IT/u);

  await loadTranslationsForLanguage('it');
  assert.deepEqual(translationCoverage.it.missingBeforeFallback, []);
});
test('every Research locale covers every canonical tree and compound node ID', async () => {
  for (const locale of NON_ENGLISH_LOCALES) {
    const module = await import(`../../js/i18n/research/${locale}.js`);
    const pack = module.default || module.researchContent;
    const audit = auditResearchPack(pack, techDatabase);

    assert.equal(
      audit.complete,
      true,
      `${locale}: missing trees [${audit.missingTrees.join(', ')}], nodes [${audit.missingNodes.slice(0, 12).join(', ')}]`
    );
    assert.deepEqual(audit.missingTrees, [], `${locale}: all Research trees must be localized`);
    assert.deepEqual(audit.missingNodes, [], `${locale}: all Research nodes must be localized`);
  }
});

test('every non-English DM Materials locale exports a complete placeholder-safe pack', () => {
  const expectedLocales = DM_MATERIAL_LOCALES.filter((locale) => locale !== 'en').sort();
  const exportedLocales = Object.keys(DM_MATERIAL_PACKS).sort();

  assert.deepEqual(
    exportedLocales,
    expectedLocales,
    'DM Materials must export all eleven supported non-English locale packs'
  );

  for (const locale of expectedLocales) {
    const audit = auditDmMaterialsPack(DM_MATERIAL_PACKS[locale], { locale });
    assert.equal(
      audit.complete,
      true,
      `${locale}: missing [${audit.missing.slice(0, 12).join(', ')}], placeholder mismatches [${audit.placeholderMismatches.join(', ')}]`
    );
    assert.deepEqual(audit.missing, [], `${locale}: every DM display message must be present`);
    assert.deepEqual(
      audit.placeholderMismatches,
      [],
      `${locale}: localized DM messages must preserve canonical placeholders`
    );
    assert.deepEqual(
      audit.missingLocalizedMaterials,
      [],
      `${locale}: material names must be authored instead of inherited from English`
    );
    assert.deepEqual(
      audit.missingLocalizedDisplayNames,
      [],
      `${locale}: set, equipment, and Dragon Master item names must be authored instead of inherited from English`
    );
  }

  const fallbackMergedOnly = {
    ...DM_MATERIAL_PACKS.fr,
    __authoredMaterialIds: [],
    __authoredDisplayIds: [],
  };
  const fallbackAudit = auditDmMaterialsPack(fallbackMergedOnly, { locale: 'fr-test' });
  assert.equal(fallbackAudit.complete, false);
  assert.equal(fallbackAudit.missingLocalizedMaterials.length, 12);
  assert.equal(fallbackAudit.missingLocalizedDisplayNames.length, 27);
});

test('Arabic Research uses the reviewed gaming action for Complete all', () => {
  assert.equal(arCatalog.researchMaxAll, 'إكمال الكل');
  assert.notEqual(
    arCatalog.researchMaxAll,
    'تعظيم الكل',
    'Do not restore the old literal mathematical wording for the gaming action'
  );
});

test('Research localization distinguishes repeated node IDs and searches localized plus canonical copy', async () => {
  const [firstTree, secondTree] = techDatabase.filter((tree) =>
    tree.nodes.some((node) => node.id === 'node_1')
  );
  assert.ok(firstTree && secondTree, 'fixture requires node_1 to occur in at least two trees');

  const canonicalTreeName = firstTree.name;
  const canonicalNodeName = firstTree.nodes.find((node) => node.id === 'node_1').name;
  await loadResearchLocale('ar');
  const arabicPack = getResearchPack('ar');
  const firstCompoundId = `${firstTree.id}:node_1`;
  const secondCompoundId = `${secondTree.id}:node_1`;

  assert.notEqual(firstCompoundId, secondCompoundId);
  assert.ok(arabicPack.nodes[firstCompoundId], `missing ${firstCompoundId}`);
  assert.ok(arabicPack.nodes[secondCompoundId], `missing ${secondCompoundId}`);
  assert.equal(arabicPack.nodes.node_1, undefined, 'bare node IDs must never key localized copy');

  const searchText = researchSearchText(firstTree, 'ar');
  assert.ok(searchText.includes(canonicalTreeName.toLocaleLowerCase()));
  assert.ok(searchText.includes(canonicalNodeName.toLocaleLowerCase()));
  assert.ok(searchText.includes(arabicPack.trees[firstTree.id].name.toLocaleLowerCase()));
  assert.ok(searchText.includes(arabicPack.nodes[firstCompoundId].name.toLocaleLowerCase()));

  assert.equal(firstTree.name, canonicalTreeName, 'display localization must not mutate tree data');
  assert.equal(
    firstTree.nodes.find((node) => node.id === 'node_1').name,
    canonicalNodeName,
    'display localization must not mutate node data'
  );
});

test('Research and DM tools reload localized content when the app language changes', async () => {
  const [researchSource, materialSource, appSource] = await Promise.all([
    readFile(new URL('../../js/app-research.js', import.meta.url), 'utf8'),
    readFile(new URL('../../js/material-calculator.js', import.meta.url), 'utf8'),
    readFile(new URL('../../js/app.js', import.meta.url), 'utf8'),
  ]);

  assert.match(
    researchSource,
    /do\s*\{[\s\S]*?requestedLocale\s*=\s*currentLanguage;[\s\S]*?await\s+loadResearchLocale\(requestedLocale\);[\s\S]*?\}\s*while\s*\(requestedLocale\s*!==\s*currentLanguage\)/
  );
  assert.match(
    researchSource,
    /async function refreshResearchLocale\(locale = currentLanguage\)[\s\S]*?await\s+loadResearchLocale\(locale\)/
  );
  assert.match(researchSource, /export\s*\{[\s\S]*?refreshResearchLocale/);
  assert.match(appSource, /mod\.refreshResearchLocale\(currentLanguage\)/);

  assert.match(
    materialSource,
    /async function renderForLanguage\([\s\S]*?await\s+loadDmMaterialsLocale\(language\)/
  );
  assert.match(
    materialSource,
    /window\.addEventListener\('vts:language-change',\s*renderForLanguage\)/
  );
  assert.match(materialSource, /await\s+renderForLanguage\(\)/);
  assert.doesNotMatch(appSource, /MATERIAL_TAB_LABELS/);
  assert.match(appSource, /tabMaterialsLabel: t\.tabMaterials \|\| translations\.en\.tabMaterials/);
});

test('miscellaneous runtime accessibility and retry copy covers every locale', () => {
  assert.deepEqual([...RUNTIME_MISC_LOCALES].sort(), ['en', ...NON_ENGLISH_LOCALES].sort());
  const english = getRuntimeMiscCopy('en');
  const englishKeys = Object.keys(english).sort();
  for (const locale of RUNTIME_MISC_LOCALES) {
    const pack = getRuntimeMiscCopy(locale);
    assert.deepEqual(Object.keys(pack).sort(), englishKeys, `${locale}: runtime misc key parity`);
    for (const key of englishKeys) {
      const expectedPlaceholders = [...english[key].matchAll(/\{([^}]+)\}/g)]
        .map((match) => match[1])
        .sort();
      const actualPlaceholders = [...pack[key].matchAll(/\{([^}]+)\}/g)]
        .map((match) => match[1])
        .sort();
      assert.deepEqual(actualPlaceholders, expectedPlaceholders, `${locale}.${key} placeholders`);
    }
    const retry = runtimeMiscT(locale, 'aiRetryAfter', { time: '30s' });
    assert.ok(retry.includes('30s'), `${locale}: retry copy must preserve the time value`);
    assert.notEqual(
      runtimeMiscT(locale, 'edenSortWeighted'),
      'edenSortWeighted',
      `${locale}: weighted-table sort label must be localized`
    );
  }
});

test('AI navigation actions are translated for every supported locale', () => {
  assert.deepEqual([...AI_ACTION_LOCALES].sort(), [
    'ar',
    'de',
    'en',
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
  for (const locale of AI_ACTION_LOCALES) {
    const localeCopy = getAiActionCopy(locale);
    assert.ok(localeCopy['ai.action.openLoyalty']);
    assert.ok(localeCopy['ai.action.openGenerator']);
  }
  assert.equal(getAiActionCopy('ko-KR')['ai.action.openGenerator'], '콤보 생성기 열기');
});
