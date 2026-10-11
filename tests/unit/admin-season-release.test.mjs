import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSeasonDraft,
  publishSeason,
  parseManagementVotesCsv,
  readSeasonPreview,
} from '../../js/admin-season-release.js';
import {
  buildEmptyEdenWorkspaceDashboard,
  edenWorkspaceFirestorePath,
  EDEN_WORKSPACE_COLLECTION_PATH,
} from '../../js/eden-workspaces.js';
import { SEASON_REGISTRY_PATH } from '../../js/eden-seasons.js';

function fixture(seed = {}) {
  const records = new Map(Object.entries(seed));
  let committed = 0;
  const firestore = {
    doc: (_db, ...path) => path.join('/'),
    serverTimestamp: () => 'SERVER_TIME',
    getDoc: async (path) => snapshot(path),
    runTransaction: async (_db, run) => {
      const writes = [];
      let writing = false;
      const result = await run({
        get: async (path) => {
          assert.equal(writing, false, 'all reads must precede writes');
          return snapshot(path);
        },
        set: (path, value) => {
          writing = true;
          writes.push([path, value]);
        },
      });
      for (const [path, value] of writes) records.set(path, structuredClone(value));
      committed += writes.length;
      return result;
    },
  };
  function snapshot(path) {
    return { exists: () => records.has(path), data: () => records.get(path) };
  }
  return {
    records,
    firestore,
    options: { db: {}, firestore, uid: 'leader', workspaceId: 'eden-x8' },
    get committed() {
      return committed;
    },
  };
}
const metadata = (workspace) => `${EDEN_WORKSPACE_COLLECTION_PATH}/${workspace}`;
const data = (key) => edenWorkspaceFirestorePath('eden-x8', key);

function legacyFixture({ showCounts = true, imported } = {}) {
  const legacyData = (key) => edenWorkspaceFirestorePath('eden-x2', key);
  const f = fixture({
    [legacyData('dashboardData')]: buildEmptyEdenWorkspaceDashboard('season-2027'),
    [legacyData('voteSettings')]: {
      season: 'season-2027',
      showManagementResults: true,
      showManagementVoteCounts: showCounts,
    },
    ...(imported ? { [legacyData('managementVotes')]: imported } : {}),
  });
  return { ...f, legacyData, options: { ...f.options, workspaceId: 'eden-x2' } };
}

test('X2 publication imports existing management results atomically and respects count privacy', async () => {
  const f = legacyFixture({ showCounts: false });
  const { projection } = await publishSeason({
    ...f.options,
    loadLegacyManagementVotes: async () => [
      { playerName: 'Existing winner', votes: 10, voters: ['private'] },
    ],
  });
  assert.deepEqual(f.records.get(f.legacyData('managementVotes')).rows, [
    { playerName: 'Existing winner', votes: 10 },
  ]);
  assert.deepEqual(projection.managementVotes, [{ playerName: 'Existing winner', rank: 1 }]);
  assert.deepEqual(f.records.get('eden_seasons/eden-x2/publications/1'), projection);
});

test('an existing reviewed import, including an intentionally empty result, never reads the Sheet', async () => {
  for (const rows of [[], [{ playerName: 'Reviewed winner', votes: 3 }]]) {
    const f = legacyFixture({ imported: { season: 'season-2027', rows } });
    await publishSeason({
      ...f.options,
      loadLegacyManagementVotes: async () => {
        throw Error('Unexpected Sheet read');
      },
    });
    assert.deepEqual(f.records.get(f.legacyData('managementVotes')).rows, rows);
  }
});

test('a concurrently reviewed CSV wins over the legacy import', async () => {
  const f = legacyFixture();
  const result = await publishSeason({
    ...f.options,
    loadLegacyManagementVotes: async () => {
      f.records.set(f.legacyData('managementVotes'), {
        rows: [{ playerName: 'Reviewed winner', votes: 4 }],
      });
      return [{ playerName: 'Old source', votes: 10 }];
    },
  });
  assert.equal(result.projection.managementVotes[0].playerName, 'Reviewed winner');
});

test('empty or failed legacy imports do not publish a misleading blank result', async () => {
  for (const loadLegacyManagementVotes of [
    async () => [],
    async () => {
      throw Error('Sheet unavailable');
    },
  ]) {
    const f = legacyFixture();
    await assert.rejects(
      publishSeason({ ...f.options, loadLegacyManagementVotes }),
      /imported|unavailable/
    );
    assert.equal(f.records.has(f.legacyData('publicProjection')), false);
    assert.equal(f.records.has(f.legacyData('managementVotes')), false);
  }
});

test('a voting season change during import aborts publication', async () => {
  const f = legacyFixture();
  await assert.rejects(
    publishSeason({
      ...f.options,
      loadLegacyManagementVotes: async () => {
        f.records.set(f.legacyData('voteSettings'), {
          season: 'next-season',
          showManagementResults: true,
        });
        return [{ playerName: 'Previous winner', votes: 10 }];
      },
    }),
    /voting season changed/
  );
  assert.equal(f.records.has(f.legacyData('publicProjection')), false);
});

test('preparing X8 atomically initializes isolated data without ending the running season', async () => {
  const oldDashboard = buildEmptyEdenWorkspaceDashboard('season-2027');
  const f = fixture({ [edenWorkspaceFirestorePath('eden-x2', 'dashboardData')]: oldDashboard });
  const result = await createSeasonDraft({ ...f.options, sourceWorkspaceId: 'eden-x2' });
  assert.equal(result.created, true);
  assert.equal(f.records.get(metadata('eden-x8')).lifecycle, 'draft');
  assert.equal(f.records.get(data('dashboardData')).r5Season, 'season-x8');
  assert.deepEqual(f.records.get(data('dashboardData')).attacks, []);
  assert.equal('date' in f.records.get(data('dashboardData')), false);
  assert.equal(f.records.get(data('voteSettings')).closesAt, '');
  const seasons = f.records.get(SEASON_REGISTRY_PATH).seasons;
  assert.equal(seasons.find((row) => row.workspaceId === 'eden-x2').state, 'active');
  assert.equal(seasons.find((row) => row.workspaceId === 'eden-x8').state, 'draft');
  assert.deepEqual(
    f.records.get(edenWorkspaceFirestorePath('eden-x2', 'dashboardData')),
    oldDashboard
  );
  assert.equal(f.records.has('vts_admin/public_season'), false);
});

test('retrying preparation preserves existing uploads', async () => {
  const f = fixture();
  await createSeasonDraft(f.options);
  const dashboard = f.records.get(data('dashboardData'));
  dashboard.attacks.push({ id: 'uploaded' });
  const before = f.committed;
  const retried = await createSeasonDraft(f.options);
  assert.equal(retried.created, false);
  assert.equal(f.committed, before);
  assert.equal(f.records.get(data('dashboardData')).attacks[0].id, 'uploaded');
});

test('occupied unregistered workspace and legacy workspace never get overwritten', async () => {
  const f = fixture({ [data('dashboardData')]: { attacks: [{ id: 'keep' }] } });
  await assert.rejects(createSeasonDraft(f.options), /already contains/);
  assert.equal(f.committed, 0);
  await assert.rejects(createSeasonDraft({ ...f.options, workspaceId: 'eden-x1' }), /supported/);
});

test('publication commits the projection, immutable revision, pointer and lifecycle together', async () => {
  const f = fixture();
  await createSeasonDraft(f.options);
  const result = await publishSeason({ ...f.options, expectedActiveWorkspace: '' });
  assert.equal(result.revision, 1);
  assert.equal(f.records.get('vts_admin/public_season').workspaceId, 'eden-x8');
  assert.equal(f.records.get(metadata('eden-x8')).lifecycle, 'active');
  assert.deepEqual(f.records.get('eden_seasons/eden-x8/publications/1'), result.projection);
  assert.ok(f.records.get(SEASON_REGISTRY_PATH).seasons[0].startedAtMs > 0);
});

test('activating X8 freezes the prior season while preserving its dashboard', async () => {
  const old = buildEmptyEdenWorkspaceDashboard('season-2027');
  const f = fixture({ [edenWorkspaceFirestorePath('eden-x2', 'dashboardData')]: old });
  await createSeasonDraft({ ...f.options, sourceWorkspaceId: 'eden-x2' });
  await publishSeason({ ...f.options, expectedActiveWorkspace: 'eden-x2' });
  assert.equal(f.records.get(metadata('eden-x2')).lifecycle, 'archived');
  assert.equal(
    f.records.get(SEASON_REGISTRY_PATH).seasons.find((row) => row.workspaceId === 'eden-x2').state,
    'ended'
  );
  assert.deepEqual(f.records.get(edenWorkspaceFirestorePath('eden-x2', 'dashboardData')), old);
});

test('stale activation and archived publication abort every write', async () => {
  const f = fixture();
  await createSeasonDraft(f.options);
  const before = f.committed;
  await assert.rejects(
    publishSeason({ ...f.options, expectedActiveWorkspace: 'eden-x9' }),
    /Another leader/
  );
  assert.equal(f.committed, before);
  f.records.get(metadata('eden-x8')).lifecycle = 'archived';
  await assert.rejects(publishSeason(f.options), /read-only/);
  assert.equal(f.committed, before);
});

test('rollback produces a new revision and never changes working uploads', async () => {
  const f = fixture();
  await createSeasonDraft(f.options);
  await publishSeason(f.options);
  f.records.get(data('dashboardData')).last_updated = 'new working data';
  await publishSeason(f.options);
  const restored = await publishSeason({ ...f.options, restoreRevision: 1 });
  assert.equal(restored.revision, 3);
  assert.equal(
    restored.projection.dashboard.last_updated,
    f.records.get('eden_seasons/eden-x8/publications/1').dashboard.last_updated
  );
  assert.equal(f.records.get(data('dashboardData')).last_updated, 'new working data');
  await assert.rejects(
    publishSeason({ ...f.options, restoreRevision: '../secret' }),
    /valid publication/
  );
});

test('private preview reads cloud data without creating a publication', async () => {
  const f = fixture();
  await createSeasonDraft(f.options);
  const before = f.committed;
  const preview = await readSeasonPreview(f.options);
  assert.equal(preview.workspace, 'eden-x8');
  assert.equal(f.committed, before);
  assert.equal(f.records.has('vts_admin/public_season'), false);
});

test('management CSV validates all rows and detects duplicates', () => {
  assert.deepEqual(parseManagementVotesCsv('Name,Votes\n"Alice, A",4\nBob,2'), [
    { playerName: 'Alice, A', votes: 4 },
    { playerName: 'Bob', votes: 2 },
  ]);
  assert.throws(() => parseManagementVotesCsv('Name,Votes\nAlice,-2'), /Row 2/);
  assert.throws(() => parseManagementVotesCsv('Name,Votes\nAlice,2\nalice,3'), /Duplicate/);
});
