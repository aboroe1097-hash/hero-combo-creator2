import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const hub = read('../../js/eden-hub.js');
const app = read('../../js/eden-operations.js');
const model = read('../../js/eden-operations-model.js');
const data = read('../../js/eden-operations-data.js');
const html = read('../../tabs/eden-map.html');
const css = read('../../css/eden-operations.css');
const enCopy = read('../../js/i18n/eden-operations/en.js');

test('Eden Operations is a lazy, deep-linkable Eden Hub subtab', () => {
  assert.match(html, /data-eden-subtab="operations"/);
  assert.match(html, /id="edenOperationsRoot"/);
  assert.match(hub, /'operations'/);
  assert.match(hub, /async function loadOperations/);
  assert.match(hub, /import\('\.\/eden-operations\.js'\)/);
  assert.match(hub, /eden-operations\.css/);
  assert.match(app, /params\.set\('subtab', 'operations'\)/);
  assert.match(app, /params\.set\('tool', toolId\)/);
});

test('the operations workspace exposes every requested planner and download path', () => {
  for (const tool of ['specialty', 'honor', 'training', 'buildings', 'siege']) {
    assert.match(app, new RegExp(`id: '${tool}'`));
  }
  assert.match(app, /calculateTrainingComparison/);
  assert.match(app, /calculateCampUpgradeOrder/);
  assert.match(app, /BUILDING_HONOR_YIELDS/);
  assert.match(app, /rowsToCsv/);
  assert.match(app, /canvas\.toDataURL\('image\/png'\)/);
  assert.match(app, /eden-operations-plan\.json/);
  assert.match(model, /encodeEdenOperationsState/);
  assert.match(model, /EDEN_OPERATIONS_LEGACY_KEYS/);
});

test('unknown source values remain explicit and are not interpolated', () => {
  assert.match(data, /Array\(10\)\.fill\(null\)/);
  assert.match(data, /BUILDING_HONOR_YIELDS/);
  assert.match(data, /status: 'not-supplied'/);
  assert.match(data, /topologyStatus: 'route-milestones-only'/);
  assert.match(enCopy, /No values were interpolated/);
  assert.match(enCopy, /not present in the supplied cost sheets/);
});

test('feature-local localization, RTL, responsive, and reduced-motion contracts ship together', () => {
  assert.match(app, /ar: \(\) => import\('\.\/i18n\/eden-operations\/ar\.js'\)/);
  assert.match(app, /mount\.dir = locale\(\) === 'ar' \? 'rtl' : 'ltr'/);
  assert.match(app, /vts:language-change/);
  assert.match(css, /\[data-theme='light'\]/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /min-width: 0/);
  assert.match(app, /role="status" aria-live="polite"/);
  assert.match(app, /role="tablist"/);
  assert.match(app, /ArrowLeft/);
  assert.match(app, /ArrowRight/);
});

test('every Eden locale carries the full Eden Operations copy with intact placeholders', async () => {
  const { default: en } = await import('../../js/i18n/eden-operations/en.js');
  const {
    SPECIALTY_TREE_SCHEMA,
    SPECIALTY_PRESETS,
    TRAINING_MODES,
    BUILDING_DISCOUNTS,
    SPECIALTY_DATA_GAPS,
    EDEN_STRUCTURES,
  } = await import('../../js/eden-operations-data.js');
  // Every data-backed label the renderer localizes must exist in the English pack.
  const dataKeys = [
    ...SPECIALTY_TREE_SCHEMA.flatMap((tree) => [
      `tree.${tree.id}.name`,
      ...tree.routes.flatMap((route) => [
        `route.${route.id}.name`,
        `route.${route.id}.summary`,
        ...(route.caution ? [`route.${route.id}.caution`] : []),
      ]),
    ]),
    ...SPECIALTY_PRESETS.map((preset) => `preset.${preset.id}.summary`),
    ...Object.values(TRAINING_MODES).map((mode) => `mode.${mode.id}`),
    ...BUILDING_DISCOUNTS.map((discount) => `discount.${discount.id}`),
    ...SPECIALTY_DATA_GAPS.map((_, index) => `gap.${index}`),
    ...EDEN_STRUCTURES.map((structure) => `group.${structure.group}`),
  ];
  for (const key of dataKeys) assert.ok(key in en, `en is missing ${key}`);

  const placeholders = (value) => [...value.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();
  for (const locale of ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh']) {
    const { default: pack } = await import(`../../js/i18n/eden-operations/${locale}.js`);
    assert.deepEqual(Object.keys(pack).sort(), Object.keys(en).sort(), `${locale} key parity`);
    for (const [key, value] of Object.entries(en)) {
      assert.ok(pack[key].trim(), `${locale}.${key} is empty`);
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(value),
        `${locale}.${key} placeholders`
      );
    }
    assert.ok(
      app.includes(`${locale}: () => import('./i18n/eden-operations/${locale}.js')`),
      `${locale} pack is lazily loadable`
    );
  }
  // The renderer must not fall back to an English-and-Arabic-only switch again.
  assert.doesNotMatch(app, /locale\(\) === 'ar' \? 'ar-EG'/);
  assert.doesNotMatch(hub, /localizeOperationsButton/);
  assert.match(html, /data-eden-i18n="subTabOperations"/);
});

test('the staffing counters are shared through Firestore, not this device', () => {
  const cloud = read('../../js/eden-operations-cloud.js');
  const counters = read('../../js/eden-operations-counters.js');

  // Reading is the alliance's: the live document is watched, the last snapshot is
  // cached, and the plan's own localStorage value no longer drives the display.
  assert.match(app, /from '\.\/eden-operations-cloud\.js'/);
  assert.match(app, /readCachedSharedCounts\(\)/);
  assert.match(app, /sharedCountsFor\(sharedCounts, currentObjectiveKey\(\)\)/);
  assert.doesNotMatch(app, /staffingStatus\(siege, state\.siege\.assigned\)/);
  assert.match(app, /writeCachedSharedCounts\(lastSyncedCounts\)/);

  // Writes batch optimistic deltas and apply them atomically after the debounce.
  assert.match(app, /queueSharedDelta\(key, side, step\)/);
  assert.match(app, /applySharedDelta\(sharedCounts, key, side, step\)/);
  assert.match(app, /sharedCountsSaveTimer/);
  assert.match(app, /\}, 600\);/);
  assert.match(app, /saveSharedCountDeltas\(deltas\)/);
  assert.match(app, /sharedCountsSaveInFlight/);
  assert.match(app, /countSaveFailed/);

  // Only the claim holder gets the buttons; the sync stops with the page.
  assert.match(app, /canWriteSharedCounts/);
  assert.match(app, /viewerCanWriteSharedCounts\(\)/);
  assert.match(app, /stopSharedCountsSync/);
  assert.match(counters, /data-ops-count/);
  assert.match(counters, /countsReadOnly/);
  assert.match(counters, /is-readonly/);

  // The device still owns the checklist and the board preference.
  assert.match(app, /readBoardOpen\(\)/);
  assert.match(app, /writeEdenOperationsState\(state\)/);
  assert.match(model, /EDEN_OPERATIONS_STORAGE_KEY/);

  // Firebase stays behind the lazy SDK helper. Field increments merge without
  // replacing stale values from another objective or admin.
  assert.match(cloud, /import\('\.\/firebase-sdk\.js'\)/);
  assert.match(cloud, /import\('\.\/firebase\.js'\)/);
  assert.match(cloud, /\{ merge: true \}/);
  assert.match(cloud, /increment\(delta\)/);
  assert.match(cloud, /serverTimestamp\(\)/);
  assert.match(cloud, /EDEN_OPERATIONS_SHARED_PATH/);
  assert.match(cloud, /updatedBy/);
  assert.match(cloud, /let _unsubscribe = null/);
});
