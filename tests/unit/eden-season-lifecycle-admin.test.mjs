import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ADMIN_RUNTIME_EN } from '../../js/i18n/admin-runtime-copy.js';
import { MAX_SEASON_COUNT } from '../../js/eden-seasons.js';

const LOCALES = ['ar', 'de', 'es', 'fr', 'id', 'it', 'kr', 'pt', 'ru', 'tr', 'zh'];

// Every key the season lifecycle panel renders. The English catalog is the
// authority for the set, so a key that is added to the panel without copy (or
// copy that no longer renders) fails here.
const SEASON_KEYS = [
  'adminSeasonLifecycleTab',
  'adminSeasonLifecycleTitle',
  'adminSeasonLifecycleSubtitle',
  'adminSeasonLifecycleLoading',
  'adminSeasonLifecycleEmpty',
  'adminSeasonCurrentLabel',
  'adminSeasonCurrentNone',
  'adminSeasonStateActive',
  'adminSeasonStateEnded',
  'adminSeasonStateDraft',
  'adminSeasonColSeason',
  'adminSeasonColState',
  'adminSeasonColWorkspace',
  'adminSeasonColWindow',
  'adminSeasonColActions',
  'adminSeasonWindow',
  'adminSeasonWorkspaceNone',
  'adminSeasonEndBtn',
  'adminSeasonEndConfirm',
  'adminSeasonEndDone',
  'adminSeasonEndAlreadyArchived',
  'adminSeasonEndNothing',
  'adminSeasonStartBtn',
  'adminSeasonStartConfirm',
  'adminSeasonStartDone',
  'adminSeasonStartTarget',
  'adminSeasonNoFreeWorkspace',
  'adminSeasonReadOnlyNotice',
  'adminSeasonRegistryFailed',
  'adminSeasonActionFailed',
  'adminSeasonReasonGeneric',
  'adminSeasonReasonUnknownSeason',
  'adminSeasonReasonNotActive',
  'adminSeasonReasonAlreadyEnded',
  'adminSeasonReasonActiveExists',
  'adminSeasonReasonDuplicate',
  'adminSeasonReasonUnknownWorkspace',
  'adminSeasonReasonWorkspaceArchived',
  'adminSeasonReasonWorkspaceRetired',
  'adminSeasonReasonWorkspaceInUse',
  'adminSeasonReasonEmptyLabel',
  'adminSeasonReasonLabelUnchanged',
  'adminSeasonRenameLabelField',
  'adminSeasonRenamePlaceholder',
  'adminSeasonRenameBtn',
  'adminSeasonRenameSave',
  'adminSeasonRenameDone',
  'adminSeasonRenamePick',
  'adminSeasonRenameKeyHint',
  'adminSeasonBrowseBtn',
  'adminSeasonBrowseConfirm',
  'adminSeasonBrowseCurrent',
  'adminSeasonRecallTitle',
  'adminSeasonRecallSubtitle',
  'adminSeasonRecallPick',
  'adminSeasonRecallDryRunBtn',
  'adminSeasonRecallApplyBtn',
  'adminSeasonRecallApplyConfirm',
  'adminSeasonRecallHint',
  'adminSeasonRecallPlanFor',
  'adminSeasonRecallColDocument',
  'adminSeasonRecallColChange',
  'adminSeasonRecallCollectionCounts',
  'adminSeasonRecallReadOnlyRow',
  'adminSeasonRecallDocModeCreate',
  'adminSeasonRecallDocModeUpdate',
  'adminSeasonRecallDocModeUnchanged',
  'adminSeasonRecallDocModeSkipped',
  'adminSeasonRecallNothing',
  'adminSeasonRecallDone',
  'adminSeasonRecallPartial',
  'adminSeasonRecallUnreadable',
  'adminSeasonRecallUnsupportedSchema',
  'adminSeasonRecallEmpty',
  'adminSeasonRecallWorkspaceMismatch',
  'adminSeasonRecallReadOnly',
  'adminSeasonRecallVoteHistoryWarning',
  'adminSeasonRecallConductWarning',
  'adminSeasonRecallSeasonWarning',
  'adminLogSeasonEnded',
  'adminLogSeasonStarted',
  'adminLogSeasonRenamed',
  'adminLogSeasonRecallChecked',
  'adminLogSeasonRecalled',
  'adminLogSeasonRecallPartial',
];

function placeholders(value) {
  return [...String(value).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

// The rename field shows an example season label and the window is nothing but
// an arrow between two already-localized dates: those two are meant to read the
// same everywhere. Single words such as "Active", "Actions" and "Document" are
// also the correct French, so a few coincidences are expected; a pack copied
// wholesale from English is not.
const SAME_BY_DESIGN = new Set(['adminSeasonWindow', 'adminSeasonRenamePlaceholder']);
const MAX_WORD_COINCIDENCES = 4;

// Keys the panel builds at render time from a state name, so a literal cannot
// appear at the call site. They are part of the same contract.
test('the season lifecycle copies exist in English', () => {
  for (const key of SEASON_KEYS) {
    assert.equal(typeof ADMIN_RUNTIME_EN[key], 'string', `${key} must exist in English`);
    assert.ok(String(ADMIN_RUNTIME_EN[key]).trim(), `${key} must not be blank`);
  }
  assert.ok(SEASON_KEYS.length >= 80, 'the panel copy set should cover the whole surface');
});

test('the season lifecycle copy reaches every locale the admin runtime ships', async () => {
  for (const locale of LOCALES) {
    const module = await import(`../../js/i18n/admin-runtime/${locale}.js`);
    const pack = module[`ADMIN_RUNTIME_${locale.toUpperCase()}`];
    const missing = SEASON_KEYS.filter((key) => typeof pack[key] !== 'string' || !pack[key].trim());
    assert.deepEqual(missing, [], `${locale} is missing season lifecycle copy`);
    const coincidences = [];
    for (const key of SEASON_KEYS) {
      assert.deepEqual(
        placeholders(pack[key]),
        placeholders(ADMIN_RUNTIME_EN[key]),
        `${locale}.${key} placeholders`
      );
      if (pack[key] === ADMIN_RUNTIME_EN[key] && !SAME_BY_DESIGN.has(key)) coincidences.push(key);
    }
    assert.ok(
      coincidences.length <= MAX_WORD_COINCIDENCES,
      `${locale} still ships English copy for ${coincidences.length} keys: ${coincidences.join(', ')}`
    );
  }
});

test('the season panel is a superadmin subtab wired into the dashboard', () => {
  const template = readFileSync('tabs/admin.html', 'utf8');
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');

  assert.match(
    template,
    /data-subtab="seasonLifecycle"[\s\S]{0,200}?data-requires-superadmin[\s\S]{0,100}?hidden/
  );
  assert.match(
    template,
    /data-subtab="seasonLifecycle"[\s\S]{0,600}?data-i18n="adminSeasonLifecycleTab"/
  );
  assert.match(
    template,
    /<div class="dash-subtab-panel hidden" id="dashSubtabSeasonLifecycle">[\s\S]{0,300}?id="dashSeasonLifecycleRoot"/
  );
  assert.match(
    dashboard,
    /const SUPERADMIN_DASH_SUBTABS = new Set\(\[[^\]]*'seasonLifecycle',[^\]]*\]\);/
  );
  assert.match(
    dashboard,
    /if \(name === 'seasonLifecycle'\) void refreshEdenSeasonLifecyclePanel\(\);/
  );
  assert.match(
    dashboard,
    /if \(name === 'seasonLifecycle'\) void refreshEdenSeasonLifecyclePanel\(\);/
  );
});

test('the season panel renders the end, start, rename, browse, and recall controls', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  for (const id of [
    'dashSeasonEndBtn',
    'dashSeasonStartBtn',
    'dashSeasonRenameInput',
    'dashSeasonRenameBtn',
    'dashSeasonRecallFile',
    'dashSeasonRecallDryRunBtn',
  ]) {
    assert.match(dashboard, new RegExp(`id="${id}"`), `${id} must be rendered`);
  }
  assert.match(dashboard, /data-season-browse="\$\{esc\(entry\.id\)\}"/);
  assert.match(dashboard, /data-season-rename="\$\{esc\(entry\.id\)\}"/);
  assert.match(
    dashboard,
    /async function loadEdenSeasonRegistry\(\)[\s\S]*?getDoc\(doc\(db, SEASON_REGISTRY_PATH\)\)/
  );
  assert.match(dashboard, /async function saveEdenSeasonRegistry\(registry\)/);
  assert.match(dashboard, /SEASON_REGISTRY_PATH/);
});

test('renaming acts on the season the admin picked, not on whatever is running', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(dashboard, /let edenSeasonRenameTargetId = '';/);
  // A row's Rename button pins the save button to that season...
  assert.match(dashboard, /edenSeasonRenameTargetId = season\.id;/);
  // ...and the input, the hint and the save handler all read the pin, falling
  // back to the running season so a fresh panel renames the current one.
  assert.match(
    dashboard,
    /const renameTarget = findEdenSeason\(registry, edenSeasonRenameTargetId\) \|\| season;/
  );
  assert.match(
    dashboard,
    /findEdenSeason\(registry, edenSeasonRenameTargetId\) \|\| activeEdenSeason\(registry\);/
  );
});

test('ending a season archives the workspace through the existing lifecycle path', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  assert.match(
    dashboard,
    /async function endEdenSeasonAtomically\(workspaceId, registry\)[\s\S]*?doc\(db, EDEN_WORKSPACE_COLLECTION_PATH, workspaceId\)/
  );
  assert.match(dashboard, /lifecycle: 'archived',\s*active: false,/);
  // One batch: the archive and the registry's "ended" mark land together.
  assert.match(
    dashboard,
    /async function endEdenSeasonAtomically[\s\S]*?const batch = writeBatch\(db\);[\s\S]*?batch\.set\(doc\(db, SEASON_REGISTRY_PATH\)[\s\S]*?await batch\.commit\(\);/
  );
  // A snapshot is downloaded before the season ends, and before a recall.
  assert.match(
    dashboard,
    /async function endCurrentEdenSeason\(\)[\s\S]*?if \(!\(await exportActiveEdenWorkspaceSnapshot\(\)\)\) return false;[\s\S]*?await endEdenSeasonAtomically\(season\.workspaceId, result\.registry\)/
  );
  assert.match(
    dashboard,
    /async function applyEdenSnapshotRecall\(\)[\s\S]*?if \(!\(await exportActiveEdenWorkspaceSnapshot\(\)\)\) return false;/
  );
  // Nothing in the season panel deletes a document; the recall writes only.
  const seasonSection = dashboard.slice(
    dashboard.indexOf('// --- Season lifecycle panel (superadmin) ---'),
    dashboard.indexOf('function bindEdenWorkspaceStrip()')
  );
  assert.ok(seasonSection.length > 2000, 'the season panel section must be present');
  assert.equal(/\bdeleteDoc\(|\.delete\(/.test(seasonSection), false);
});

test('firestore.rules pins the season registry and the superadmin archive gate', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(
    rules,
    /function validEdenSeasonRegistry\(\) \{\s*let d = request\.resource\.data;\s*return d\.keys\(\)\.hasOnly\(\['schemaVersion', 'seasons', 'updatedAt', 'updatedBy'\]\)/
  );
  assert.match(
    rules,
    /function validEdenSeasonEntry\(entry\) \{\s*return entry is map\s*&& entry\.keys\(\)\.hasOnly\(\[/
  );
  assert.match(rules, /entry\.id\.matches\('\^\[a-z0-9\]\[a-z0-9_-\]\{2,39\}\$'\)/);
  assert.match(
    rules,
    /\(entry\.state == 'ended' \|\| entry\.state == 'active' \|\| entry\.state == 'draft'\)/
  );
  assert.match(rules, /entry\.workspaceId == 'eden-x1'/);
  assert.match(rules, /entry\.workspaceId == 'eden-x2'/);
  assert.match(rules, /&& d\.updatedAt == request\.time\s*&& d\.updatedBy == request\.auth\.uid;/);
  assert.match(
    rules,
    /match \/vts_admin\/season_registry \{\s*allow read: if isAdmin\(\);\s*allow create, update: if isSuperAdmin\(\) && validEdenSeasonRegistry\(\);\s*allow delete: if false;/
  );
  // Ending a season archives a workspace, so the terminal lifecycle is a
  // superadmin write while publish/unpublish stays an admin write.
  assert.match(
    rules,
    /match \/vts_admin\/eden_workspaces\/records\/\{workspaceId\} \{[\s\S]*?allow create, update: if isAdmin\(\)\s*&& validEdenWorkspaceRecord\(workspaceId\)\s*&& \(\(request\.resource\.data\.lifecycle != 'archived'\s*&& \(resource == null \|\| resource\.data\.lifecycle != 'archived'\)\)\s*\|\| isSuperAdmin\(\)\);/
  );
  // Rules cannot iterate a list, so the validator checks one position per
  // season under a size guard; that count has to match the client's cap.
  const positions = rules.match(/validEdenSeasonEntryAt\(d\.seasons, (\d)\)/g) || [];
  assert.equal(positions.length, MAX_SEASON_COUNT);
  assert.match(rules, new RegExp(`d\\.seasons\\.size\\(\\) <= ${MAX_SEASON_COUNT}`));
});
