import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  MAX_SEASON_COUNT,
  SEASON_REGISTRY_PATH,
  activeEdenSeason,
  adoptEdenSeason,
  adoptableEdenWorkspace,
  defaultEdenSeasonLabel,
  endEdenSeason,
  findEdenSeason,
  nextEdenSeasonId,
  normalizeSeasonRegistry,
  renameEdenSeason,
  seasonWorkspaceCandidates,
  startNextEdenSeason,
} from '../../js/eden-seasons.js';
import {
  edenWorkspaceMutationError,
  isEdenWorkspaceMutable,
  parseEdenWorkspaceRecord,
} from '../../js/eden-workspaces.js';

const SEEDED_REGISTRY = {
  seasons: [
    {
      id: 'season-2026',
      label: 'Eden X1',
      state: 'ended',
      workspaceId: 'eden-x1',
      startedAtMs: 1_700_000_000_000,
      endedAtMs: 1_750_000_000_000,
    },
    {
      id: 'season-2027',
      label: 'Eden X2',
      state: 'active',
      workspaceId: 'eden-x2',
      startedAtMs: 1_760_000_000_000,
      endedAtMs: 0,
    },
  ],
};

const WORKSPACES = [
  {
    id: 'eden-x1',
    label: 'Eden X1',
    lifecycle: 'active',
    legacy: true,
    holdsSeasonId: 'season-2026',
  },
  {
    id: 'eden-x2',
    label: 'Eden X2',
    lifecycle: 'active',
    legacy: false,
    holdsSeasonId: 'season-2027',
  },
];

test('the season registry is one global document, not a per-workspace one', () => {
  assert.equal(SEASON_REGISTRY_PATH, 'vts_admin/season_registry');
  // The document has to stay writable once a workspace is archived, which is
  // the moment the rollover happens, so it cannot live inside a workspace.
  assert.ok(!SEASON_REGISTRY_PATH.includes('eden_workspaces'));
});

test('the registry normalizer treats a stored document as hostile input', () => {
  const cleaned = normalizeSeasonRegistry({
    schemaVersion: '2',
    seasons: [
      {
        id: 'Season-2027',
        label: '  Eden   X2  ',
        state: 'active',
        workspaceId: 'EDEN-X2',
        startedAtMs: 5,
      },
      { id: 'season-2027', label: 'duplicate key', state: 'ended', workspaceId: 'eden-x1' },
      { id: 'season-2028', label: '', state: 'nonsense', workspaceId: 'eden-x9' },
      { id: 'x!', label: 'bad key', state: 'active' },
      null,
      'not a season',
      { label: 'no id at all' },
      { id: 'season-2029', state: 'ended', endedAtMs: -5, startedAtMs: 'later' },
    ],
    updatedAt: { toMillis: () => 42 },
    updatedBy: 'uid-1',
  });

  assert.deepEqual(cleaned.seasons.map((season) => season.id).sort(), [
    'season-2027',
    'season-2028',
    'season-2029',
  ]);
  const first = findEdenSeason(cleaned, 'season-2027');
  const second = findEdenSeason(cleaned, 'season-2028');
  const third = findEdenSeason(cleaned, 'season-2029');
  assert.equal(first.id, 'season-2027', 'the key is normalized to lower case');
  assert.equal(first.label, 'Eden X2', 'the label is collapsed and trimmed');
  assert.equal(first.workspaceId, 'eden-x2');
  assert.equal(second.label, 'season-2028', 'an empty label falls back to the key');
  assert.equal(second.state, 'draft', 'an unknown state falls back to prepared');
  assert.equal(second.workspaceId, '', 'a workspace outside the pinned table is dropped');
  assert.equal(third.startedAtMs, 0, 'a non-numeric start is not carried');
  assert.equal(third.endedAtMs, 0, 'a negative end stamp is not carried');
  assert.equal(cleaned.updatedAtMs, 42);
  assert.equal(cleaned.updatedBy, 'uid-1');
  assert.equal(cleaned.schemaVersion, 1);
});

test('an active season that is not over carries no end stamp, and one document cannot run two seasons', () => {
  const cleaned = normalizeSeasonRegistry({
    seasons: [
      { id: 'season-2026', label: 'X1', state: 'active', startedAtMs: 100, endedAtMs: 500 },
      { id: 'season-2027', label: 'X2', state: 'active', startedAtMs: 200 },
    ],
  });
  const [older, newer] = cleaned.seasons;
  assert.equal(older.endedAtMs, 0, 'a running season never carries an end stamp');
  assert.equal(activeEdenSeason(cleaned).id, 'season-2027', 'the newest active season wins');
  assert.equal(older.state, 'draft', 'the older claim is demoted, not silently kept');
});

test('the registry keeps the newest seasons when a document exceeds the pinned count', () => {
  const seasons = Array.from({ length: MAX_SEASON_COUNT + 3 }, (_, index) => ({
    id: `season-${2000 + index}`,
    label: `Season ${index}`,
    state: 'ended',
    startedAtMs: 1000 + index,
    endedAtMs: 2000 + index,
  }));
  const cleaned = normalizeSeasonRegistry({ seasons });
  assert.equal(cleaned.seasons.length, MAX_SEASON_COUNT);
  assert.equal(cleaned.seasons[0].id, 'season-2003');
  assert.equal(cleaned.seasons.at(-1).id, 'season-2010');
});

test('ending the running season is the transition that freezes its workspace', () => {
  const registry = normalizeSeasonRegistry(SEEDED_REGISTRY);
  const ended = endEdenSeason(registry, 'season-2027', { nowMs: 1_800_000_000_000 });
  assert.equal(ended.ok, true);
  assert.equal(ended.season.state, 'ended');
  assert.equal(ended.season.endedAtMs, 1_800_000_000_000);
  assert.equal(ended.season.workspaceId, 'eden-x2', 'the workspace to archive is reported back');
  assert.equal(activeEdenSeason(ended.registry), null);
  // The stored registry is not mutated in place; the caller writes what it gets.
  assert.equal(activeEdenSeason(registry).id, 'season-2027');
});

test('ending refuses anything that is not the running season', () => {
  const registry = normalizeSeasonRegistry(SEEDED_REGISTRY);
  assert.deepEqual(endEdenSeason(registry, 'season-2026'), {
    ok: false,
    reason: 'season-already-ended',
  });
  assert.deepEqual(endEdenSeason(registry, 'season-1999'), {
    ok: false,
    reason: 'unknown-season',
  });
  const prepared = normalizeSeasonRegistry({
    seasons: [{ id: 'season-2028', label: 'Eden 2028', state: 'draft', workspaceId: 'eden-x2' }],
  });
  assert.deepEqual(endEdenSeason(prepared, 'season-2028'), {
    ok: false,
    reason: 'season-not-active',
  });
});

test('an ended season refuses writes through the existing archive guard', () => {
  const registry = normalizeSeasonRegistry(SEEDED_REGISTRY);
  const ended = endEdenSeason(registry, 'season-2027', { nowMs: 1_800_000_000_000 });
  const archivedRecord = parseEdenWorkspaceRecord({
    id: ended.season.workspaceId,
    lifecycle: 'archived',
    active: false,
    createdAtMs: 1_760_000_000_000,
    archivedAtMs: ended.season.endedAtMs,
    publication: null,
    updatedBy: 'uid-1',
  });
  assert.equal(archivedRecord.lifecycle, 'archived');
  const err = edenWorkspaceMutationError(ended.season.workspaceId, archivedRecord);
  assert.ok(err instanceof Error);
  assert.match(err.message, /archived season/);
  assert.equal(isEdenWorkspaceMutable(ended.season.workspaceId, archivedRecord), false);
  // Without the resolved record the shipped default still says writable, which
  // is why the dashboard passes the view it read from the cloud.
  assert.equal(edenWorkspaceMutationError(ended.season.workspaceId), null);
});

test('starting the next season needs a workspace that is free and still served', () => {
  const registry = normalizeSeasonRegistry(SEEDED_REGISTRY);
  const ended = endEdenSeason(registry, 'season-2027', { nowMs: 1_800_000_000_000 });
  const proposed = nextEdenSeasonId(ended.registry, { nowMs: Date.parse('2027-01-01T00:00:00Z') });
  assert.equal(proposed, 'season-2028');
  assert.equal(defaultEdenSeasonLabel(proposed), 'Eden 2028');

  // Nothing is free yet: X2 is archived and X1 is the retired legacy archive.
  const blocked = startNextEdenSeason(ended.registry, {
    nowMs: 1_900_000_000_000,
    workspaces: [
      { id: 'eden-x1', label: 'Eden X1', lifecycle: 'active', legacy: true },
      { id: 'eden-x2', label: 'Eden X2', lifecycle: 'archived', legacy: false },
    ],
  });
  assert.deepEqual(blocked, { ok: false, reason: 'no-free-workspace' });

  const rows = seasonWorkspaceCandidates({
    registry: ended.registry,
    workspaces: [
      { id: 'eden-x1', label: 'Eden X1', lifecycle: 'active', legacy: true },
      { id: 'eden-x2', label: 'Eden X2', lifecycle: 'archived', legacy: false },
    ],
  });
  assert.deepEqual(rows.candidates, []);
  assert.deepEqual(
    rows.blocked.map((row) => row.reason),
    ['workspace-retired', 'workspace-archived']
  );
});

test('starting the next season binds a free workspace and becomes the active season', () => {
  const registry = normalizeSeasonRegistry(SEEDED_REGISTRY);
  const ended = endEdenSeason(registry, 'season-2027', { nowMs: 1_800_000_000_000 });
  const started = startNextEdenSeason(ended.registry, {
    nowMs: 1_900_000_000_000,
    seasonId: 'season-2028',
    label: 'Eden 2028',
    workspaceId: 'eden-x2',
    workspaces: [
      { id: 'eden-x1', label: 'Eden X1', lifecycle: 'active', legacy: true },
      { id: 'eden-x2', label: 'Eden X2', lifecycle: 'draft', legacy: false, holdsSeasonId: '' },
    ],
  });
  assert.equal(started.ok, true);
  assert.deepEqual(started.season, {
    id: 'season-2028',
    label: 'Eden 2028',
    state: 'active',
    workspaceId: 'eden-x2',
    startedAtMs: 1_900_000_000_000,
    endedAtMs: 0,
  });
  assert.equal(activeEdenSeason(started.registry).id, 'season-2028');
  assert.equal(findEdenSeason(started.registry, 'season-2027').state, 'ended');
  // The season key is bound to the pinned workspace table: a workspace the
  // release does not serve cannot be named, even when the caller asks for it.
  assert.deepEqual(
    startNextEdenSeason(ended.registry, {
      seasonId: 'season-2028',
      workspaceId: 'eden-x3',
      workspaces: [{ id: 'eden-x3', label: 'Eden X3', lifecycle: 'draft' }],
    }),
    { ok: false, reason: 'unknown-workspace' }
  );
});

test('starting refuses a running season, a duplicate key, and a busy workspace', () => {
  const registry = normalizeSeasonRegistry(SEEDED_REGISTRY);
  assert.deepEqual(startNextEdenSeason(registry, { seasonId: 'season-2028' }), {
    ok: false,
    reason: 'active-season-exists',
  });
  const ended = endEdenSeason(registry, 'season-2027', { nowMs: 1_800_000_000_000 }).registry;
  assert.deepEqual(
    startNextEdenSeason(ended, { seasonId: 'season-2026', workspaces: WORKSPACES }),
    { ok: false, reason: 'duplicate-season-id' }
  );
  assert.deepEqual(
    startNextEdenSeason(ended, {
      seasonId: 'season-2028',
      workspaceId: 'eden-x9',
      workspaces: WORKSPACES,
    }),
    { ok: false, reason: 'unknown-workspace' }
  );
  assert.deepEqual(
    startNextEdenSeason(ended, {
      seasonId: 'season-2028',
      workspaceId: 'eden-x1',
      workspaces: WORKSPACES,
    }),
    { ok: false, reason: 'workspace-retired' }
  );
  assert.deepEqual(
    startNextEdenSeason(ended, {
      seasonId: 'season-2028',
      workspaceId: 'eden-x2',
      workspaces: WORKSPACES,
    }),
    { ok: false, reason: 'workspace-in-use' },
    'X2 still holds season-2027 records, so it cannot host a new season'
  );
  assert.deepEqual(
    startNextEdenSeason(ended, {
      seasonId: 'season-2028',
      workspaceId: 'eden-x2',
      workspaces: [
        {
          id: 'eden-x2',
          label: 'Eden X2',
          lifecycle: 'archived',
          legacy: false,
          holdsSeasonId: 'season-2027',
        },
      ],
    }),
    { ok: false, reason: 'workspace-archived' },
    'the archive reason wins over the data it still holds'
  );
  assert.deepEqual(
    startNextEdenSeason(ended, { seasonId: 'season-2028', workspaces: WORKSPACES }),
    { ok: false, reason: 'no-free-workspace' },
    'with no workspace named and none free, the start reports the missing slot'
  );
});

test('renaming changes the label only and never the season key', () => {
  const registry = normalizeSeasonRegistry(SEEDED_REGISTRY);
  const renamed = renameEdenSeason(registry, 'season-2027', '  Eden   2027  ', { nowMs: 5 });
  assert.equal(renamed.ok, true);
  assert.deepEqual(renamed.season, {
    id: 'season-2027',
    label: 'Eden 2027',
    state: 'active',
    workspaceId: 'eden-x2',
    startedAtMs: 1_760_000_000_000,
    endedAtMs: 0,
  });
  assert.equal(findEdenSeason(renamed.registry, 'season-2027').workspaceId, 'eden-x2');
  assert.deepEqual(renameEdenSeason(registry, 'season-1999', 'Nope'), {
    ok: false,
    reason: 'unknown-season',
  });
  assert.deepEqual(renameEdenSeason(registry, 'season-2027', '   '), {
    ok: false,
    reason: 'empty-label',
  });
  assert.deepEqual(renameEdenSeason(registry, 'season-2027', 'Eden X2'), {
    ok: false,
    reason: 'label-unchanged',
  });
});

test('the dashboard guards every season write with the archive guard', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  // The guard now sees the workspace the admin actually read, so an ended
  // season is read-only in the tab that ended it.
  assert.match(
    dashboard,
    /function blockEdenArchiveWrite[\s\S]*?edenWorkspaceMutationError\(\s*ACTIVE_EDEN_WORKSPACE_ID,\s*currentEdenWorkspaceView\(\)\s*\)/
  );
  // Ending a season changes the season's own workspace, not the one on screen,
  // so the archive write asks the guard about that workspace.
  assert.match(
    dashboard,
    /async function endEdenSeasonAtomically\(workspaceId, registry\)[\s\S]*?edenWorkspaceMutationError\(workspaceId, existing\)/
  );
  assert.match(
    dashboard,
    /async function endCurrentEdenSeason\(\)[\s\S]*?await endEdenSeasonAtomically\(season\.workspaceId, result\.registry\)/
  );
  // The recall writes this workspace's records, so it goes through the guard
  // and refuses before it plans anything.
  assert.match(
    dashboard,
    /async function applyEdenSnapshotRecall\(\) \{\s*if \(blockEdenArchiveWrite\('recall snapshot'\)\) return false;/
  );
  assert.match(dashboard, /writable: !guardErr,/);
});

test('an empty registry adopts the season the live workspace already runs', () => {
  const empty = normalizeSeasonRegistry(null);
  const live = {
    id: 'eden-x2',
    label: 'Eden X2',
    lifecycle: 'active',
    holdsSeasonId: 'season-2027',
  };
  // Without adopt there is nothing to end, and the only workspace is in use.
  assert.equal(activeEdenSeason(empty), null);
  assert.equal(
    seasonWorkspaceCandidates({ registry: empty, workspaces: [live] }).candidates.length,
    0
  );

  assert.equal(adoptableEdenWorkspace({ registry: empty, workspaces: [live] }), live);
  const adopted = adoptEdenSeason(empty, { workspace: live, nowMs: 1_900_000_000_000 });
  assert.equal(adopted.ok, true);
  assert.equal(adopted.season.id, 'season-2027');
  assert.equal(adopted.season.label, 'Eden 2027');
  assert.equal(adopted.season.state, 'active');
  assert.equal(adopted.season.workspaceId, 'eden-x2');
  assert.equal(activeEdenSeason(adopted.registry)?.id, 'season-2027');
  // The adopted season can now be ended; nothing is adoptable twice.
  assert.equal(endEdenSeason(adopted.registry, 'season-2027').ok, true);
  assert.equal(adoptableEdenWorkspace({ registry: adopted.registry, workspaces: [live] }), null);
  assert.equal(
    adoptEdenSeason(adopted.registry, { workspace: live }).reason,
    'active-season-exists'
  );

  // An archived, retired or empty workspace is never adopted.
  for (const workspace of [
    { ...live, lifecycle: 'archived' },
    { ...live, legacy: true },
    { ...live, holdsSeasonId: '' },
  ]) {
    assert.equal(adoptEdenSeason(empty, { workspace }).ok, false);
    assert.equal(adoptableEdenWorkspace({ registry: empty, workspaces: [workspace] }), null);
  }
});
