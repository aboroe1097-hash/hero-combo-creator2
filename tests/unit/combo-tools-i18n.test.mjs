import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  COMBO_TOOL_ENGLISH,
  COMBO_TOOL_MESSAGE_IDS,
  COMBO_TOOL_PACKS,
  auditComboToolsPack,
  comboSkinTypeText,
  comboToolsText,
} from '../../js/i18n/combo-tools/index.js';
import { getCountersForCombo, validateCounterDatabase } from '../../js/counter-db.js';

const LOCALES = ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];

test('combo-tool packs cover every stable display ID with matching placeholders', () => {
  assert.equal(COMBO_TOOL_MESSAGE_IDS.length, 76);
  for (const locale of LOCALES) {
    assert.deepEqual(auditComboToolsPack(COMBO_TOOL_PACKS[locale], locale), {
      locale,
      complete: true,
      missing: [],
      placeholderMismatches: [],
    });
  }
});

test('combo-tool copy switches locale without changing canonical hero identifiers', () => {
  assert.equal(comboToolsText('generator.base', {}, 'en'), 'Base');
  assert.equal(comboToolsText('generator.base', {}, 'ar'), 'الأساسي');
  assert.equal(comboToolsText('generator.base', {}, 'zh'), '基础');
  assert.equal(
    comboToolsText('builder.placedHero', { hero: 'King Arthur', slot: 2 }, 'fr'),
    'King Arthur a été placé dans l’emplacement de combo 2.'
  );
  assert.equal(COMBO_TOOL_ENGLISH['builder.placedHero'].includes('{hero}'), true);
  assert.equal(comboSkinTypeText('Legendary', 'de'), 'Legendär');
  assert.equal(comboSkinTypeText('Everlasting', 'zh'), '永恒');
  assert.equal(comboSkinTypeText('Unknown', 'fr'), 'Unknown');
});

test('counter evidence has stable localized reason and confidence IDs', () => {
  assert.deepEqual(validateCounterDatabase(), []);
  const counters = getCountersForCombo(['Beowulf', 'Immortal Guardian', 'Ramses II']);
  const annotated = counters.find((counter) => counter.reasonId);
  assert.ok(annotated);
  assert.equal(annotated.reasonId, 'arthurVsRamses');
  assert.equal(annotated.confidenceId, 'duelScreenshot');
  assert.match(comboToolsText(`counter.reason.${annotated.reasonId}`, {}, 'de'), /Arthur/);
  assert.equal(
    comboToolsText(`counter.confidence.${annotated.confidenceId}`, {}, 'kr'),
    '결투 스크린샷'
  );
});

test('language changes refresh mounted Manual and Generator surfaces', () => {
  const appSource = readFileSync('js/app.js', 'utf8');
  const builderSource = readFileSync('js/app-builder.js', 'utf8');
  const generatorSource = readFileSync('js/app-generator.js', 'utf8');
  assert.match(appSource, /refreshManualComboLocalization/);
  assert.match(appSource, /refreshGeneratorLocalization\(\)/);
  assert.match(builderSource, /updateComboSlotDisplay\(slot, currentCombo\[index\], index\)/);
  assert.match(builderSource, /renderSavedComboRows\(\)/);
  assert.match(builderSource, /const deleteContext = savedComboDeleteContext/);
  assert.match(builderSource, /deleteContext\.db/);
  assert.doesNotMatch(
    builderSource,
    /delBtn\.onclick[\s\S]*?savedComboDeleteContext\.(?:userId|deleteDoc|doc)/
  );
  assert.match(builderSource, /translations\[currentLanguage\][\s\S]*?messageConfirmRemoveCombo/);
  assert.match(generatorSource, /if \(!resultsEl \|\| !lastGeneratorRunMeta\) return/);
  assert.match(appSource, /restoreSharedGeneratorResults\(validSharedCombos\)/);
  assert.match(
    generatorSource,
    /export function restoreSharedGeneratorResults\(combos\)[\s\S]*lastGeneratorRunMeta = \{[\s\S]*renderGeneratorResults\(restored, \{ countMessage \}\)/
  );
  assert.doesNotMatch(generatorSource, /resultsEl\?\.childElementCount/);
  assert.match(generatorSource, /durationMs: lastGeneratorRunMeta\.durationMs/);
  assert.match(generatorSource, /button\.dataset\.idleText = idleText/);
});
