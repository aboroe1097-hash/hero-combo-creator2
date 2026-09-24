import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  EDEN_SNAPSHOT_DOC_KEYS,
  EDEN_SNAPSHOT_SCHEMA,
  buildEdenSnapshotRecallPlan,
  edenRecallDashboardWrite,
  edenSnapshotRecallKeyNeedsAuthorStamp,
  edenSnapshotRecallKeyNeedsTimestamp,
  normalizeEdenSnapshot,
  parseEdenSnapshotJson,
  planEdenSnapshotRecallWrites,
  reviveEdenSnapshotTimestamps,
  summarizeEdenSnapshotRecallPlan,
} from '../../js/eden-seasons.js';

const DASHBOARD = {
  r5Season: 'season-2027',
  syncRevision: 4,
  updatedAtMs: 1_700_000_000_000,
  attacks: [],
};
const VOTE = {
  id: 'vote-1',
  season: 'season-2027',
  voterKey: 'ann',
  updatedAt: { type: 'firebase', seconds: 10, nanoseconds: 0 },
};

function buildSnapshot(overrides = {}) {
  return {
    schema: EDEN_SNAPSHOT_SCHEMA,
    workspace: 'eden-x2',
    label: 'Eden X2',
    exportedAt: '2027-01-01T00:00:00.000Z',
    docs: {
      dashboardData: DASHBOARD,
      rosterData: { snapshots: [], updated: '2027-01-01' },
      voteSettings: { season: 'season-2027', votingOpen: false },
      publicVoteResults: { season: 'season-2027', published: true, rankings: [] },
      publicProjection: { schemaVersion: 1, workspace: 'eden-x2', published: true },
      votes: [{ id: 'vote-1', data: VOTE }],
      voteHistory: [{ id: 'hist-1', data: { id: 'hist-1', createdAt: { seconds: 5 } } }],
      conductAdjustments: [
        {
          id: 'adj-1',
          data: {
            id: 'adj-1',
            season: 'season-2027',
            createdAt: { type: 'firebase', seconds: 7, nanoseconds: 0 },
          },
        },
      ],
    },
    ...overrides,
  };
}

test('a snapshot is refused unless it is the documented envelope', () => {
  assert.deepEqual(parseEdenSnapshotJson('{not json'), {
    ok: false,
    reason: 'snapshot-unreadable',
  });
  assert.deepEqual(parseEdenSnapshotJson(JSON.stringify({ schema: 'something-else', docs: {} })), {
    ok: false,
    reason: 'snapshot-unsupported-schema',
  });
  assert.deepEqual(
    parseEdenSnapshotJson(
      JSON.stringify({ schema: EDEN_SNAPSHOT_SCHEMA, workspace: 'eden-x2', docs: {} })
    ),
    { ok: false, reason: 'snapshot-empty' }
  );
  const parsed = parseEdenSnapshotJson(JSON.stringify(buildSnapshot()));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.snapshot.workspace, 'eden-x2');
  assert.deepEqual(Object.keys(parsed.snapshot.docs), [
    ...EDEN_SNAPSHOT_DOC_KEYS,
    'votes',
    'voteHistory',
    'conductAdjustments',
  ]);
  // Unknown keys are ignored rather than guessed at, so a newer export still
  // imports into an older reader.
  const future = normalizeEdenSnapshot({ ...buildSnapshot(), somethingNew: true });
  assert.equal(future.ok, true);
  assert.equal('somethingNew' in future.snapshot, false);
});

test('the dry run reports what would change without writing anything', () => {
  const snapshot = normalizeEdenSnapshot(buildSnapshot()).snapshot;
  const plan = buildEdenSnapshotRecallPlan({
    snapshot,
    live: {
      docs: {
        // Identical to the snapshot: reported as unchanged, not as a write.
        dashboardData: DASHBOARD,
        // Stored but different: overwritten in place.
        voteSettings: { season: 'season-2026', votingOpen: true },
      },
      collections: {
        votes: [{ id: 'vote-1', data: VOTE }],
      },
    },
    workspaceId: 'eden-x2',
    workspaceLabel: 'Eden X2',
  });
  assert.equal(plan.ok, true);
  const rows = Object.fromEntries(plan.rows.map((row) => [row.key, row]));
  assert.equal(rows.dashboardData.mode, 'unchanged');
  assert.equal(rows.voteSettings.mode, 'update');
  assert.equal(rows.rosterData.mode, 'create');
  assert.equal(rows.publicProjection.mode, 'create');
  assert.deepEqual(
    { create: rows.votes.create, update: rows.votes.update, unchanged: rows.votes.unchanged },
    { create: 0, update: 0, unchanged: 1 }
  );
  assert.equal(rows.voteHistory.readOnly, true, 'vote history is reported, never written');
  assert.deepEqual(
    { create: rows.conductAdjustments.create, update: rows.conductAdjustments.update },
    { create: 1, update: 0 }
  );
  assert.deepEqual(plan.warnings, ['vote-history-append-only', 'conduct-create-needs-author']);
  assert.equal(plan.totals.unchanged, 2, 'one untouched document and one untouched vote');
  assert.match(summarizeEdenSnapshotRecallPlan(plan), /votes:\+0~0=1/);
});

test('the dry run refuses a workspace whose lifecycle does not allow writes', () => {
  const snapshot = normalizeEdenSnapshot(buildSnapshot()).snapshot;
  const plan = buildEdenSnapshotRecallPlan({
    snapshot,
    live: {},
    workspaceId: 'eden-x2',
    writable: false,
  });
  assert.deepEqual(plan, { ok: false, reason: 'workspace-read-only' });
  assert.deepEqual(buildEdenSnapshotRecallPlan({ snapshot, live: {}, workspaceId: 'eden-x1' }), {
    ok: false,
    reason: 'snapshot-workspace-mismatch',
  });
  assert.deepEqual(
    buildEdenSnapshotRecallPlan({
      snapshot: normalizeEdenSnapshot(buildSnapshot({ workspace: '' })).snapshot,
      live: {},
      workspaceId: 'eden-x2',
    }),
    { ok: false, reason: 'snapshot-workspace-mismatch' }
  );
});

test('the write list only creates and overwrites, never deletes, and skips vote history', () => {
  const snapshot = normalizeEdenSnapshot(buildSnapshot()).snapshot;
  const plan = buildEdenSnapshotRecallPlan({
    snapshot,
    live: { docs: { dashboardData: DASHBOARD }, collections: {} },
    workspaceId: 'eden-x2',
  });
  const writes = planEdenSnapshotRecallWrites(plan, snapshot);
  const keys = writes.map((write) => `${write.key}:${write.id || 'doc'}`);
  assert.deepEqual(keys, [
    'rosterData:doc',
    'voteSettings:doc',
    'publicVoteResults:doc',
    'publicProjection:doc',
    'votes:vote-1',
    'conductAdjustments:adj-1',
  ]);
  assert.equal(keys.includes('dashboardData:doc'), false, 'an identical document is not rewritten');
  assert.equal(
    keys.some((key) => key.startsWith('voteHistory')),
    false
  );
  assert.deepEqual(planEdenSnapshotRecallWrites({ ok: false }, snapshot), []);

  // A collection entry that already matches the live one is not written again;
  // only the new or changed ones are.
  const unchangedVote = { id: VOTE.id, data: { ...VOTE } };
  const base = buildSnapshot();
  const withVotes = {
    ...base,
    docs: {
      ...base.docs,
      votes: [unchangedVote, { id: 'vote-2', data: { ...VOTE, id: 'vote-2', voterKey: 'bo' } }],
    },
  };
  const partial = buildEdenSnapshotRecallPlan({
    snapshot: withVotes,
    live: { docs: { dashboardData: DASHBOARD }, collections: { votes: [unchangedVote] } },
    workspaceId: 'eden-x2',
  });
  const voteWrites = planEdenSnapshotRecallWrites(partial, withVotes)
    .filter((write) => write.key === 'votes')
    .map((write) => write.id);
  assert.deepEqual(voteWrites, ['vote-2']);
});

test('a restored dashboard document respects the revision and monotonic-updated contracts', () => {
  const rewritten = edenRecallDashboardWrite(
    DASHBOARD,
    { syncRevision: 4, updatedAtMs: 1_800_000_000_000 },
    { nowMs: 1_900_000_000_000 }
  );
  assert.equal(rewritten.syncRevision, 5, 'the rules require exactly one higher revision');
  assert.equal(rewritten.updatedAtMs, 1_900_000_000_000);
  assert.equal(rewritten.r5Season, 'season-2027');
  const older = edenRecallDashboardWrite(
    { ...DASHBOARD, syncRevision: 1, updatedAtMs: 1 },
    { syncRevision: 9, updatedAtMs: 2_000_000_000_000 },
    { nowMs: 1_900_000_000_000 }
  );
  assert.equal(older.syncRevision, 10);
  assert.equal(older.updatedAtMs, 2_000_000_000_000, 'updatedAtMs may not move backwards');
  assert.equal(
    edenRecallDashboardWrite(DASHBOARD, null).syncRevision,
    1,
    'a first write is revision 1'
  );
});

test('vote and settings documents are stamped, conduct timestamps are revived', () => {
  assert.equal(edenSnapshotRecallKeyNeedsTimestamp('votes'), true);
  assert.equal(edenSnapshotRecallKeyNeedsTimestamp('voteSettings'), true);
  assert.equal(edenSnapshotRecallKeyNeedsTimestamp('publicVoteResults'), true);
  assert.equal(edenSnapshotRecallKeyNeedsTimestamp('conductAdjustments'), false);
  assert.equal(edenSnapshotRecallKeyNeedsAuthorStamp('voteSettings'), true);
  assert.equal(edenSnapshotRecallKeyNeedsAuthorStamp('votes'), false);

  const revived = reviveEdenSnapshotTimestamps(
    {
      createdAt: { type: 'firebase', seconds: 7, nanoseconds: 500_000_000 },
      nested: [{ at: { seconds: 2, nanoseconds: 0 } }],
      name: 'adj',
    },
    (millis) => `ts:${millis}`
  );
  assert.deepEqual(revived, { createdAt: 'ts:7500', nested: [{ at: 'ts:2000' }], name: 'adj' });
  assert.deepEqual(
    reviveEdenSnapshotTimestamps(null, () => 'x'),
    null
  );
});

test('the same instant read as a live timestamp and as JSON compares unchanged', () => {
  const live = {
    id: 'vote-1',
    season: 'season-2027',
    voterKey: 'ann',
    updatedAt: { toMillis: () => 10_000 },
  };
  const snapshot = normalizeEdenSnapshot(buildSnapshot()).snapshot;
  const plan = buildEdenSnapshotRecallPlan({
    snapshot,
    live: { docs: {}, collections: { votes: [{ id: 'vote-1', data: live }] } },
    workspaceId: 'eden-x2',
  });
  const voteRow = plan.rows.find((row) => row.key === 'votes');
  assert.equal(voteRow.unchanged, 1, 'the JSON round trip must not read as a change');
  assert.equal(voteRow.update, 0);
});

test('the panel drives the recall through the exported snapshot format', () => {
  const dashboard = readFileSync('js/ocr-dashboard.js', 'utf8');
  const template = readFileSync('tabs/admin.html', 'utf8');
  assert.match(template, /id="dashSubtabSeasonLifecycle"/);
  assert.match(template, /id="dashSeasonLifecycleRoot"/);
  assert.match(dashboard, /id="dashSeasonRecallFile"/);
  assert.match(dashboard, /id="dashSeasonRecallApplyBtn"/);
  assert.match(
    dashboard,
    /async function dryRunEdenSnapshotRecall\(file\)[\s\S]*?parseEdenSnapshotJson\(await file\.text\(\)\)/
  );
  assert.match(
    dashboard,
    /async function applyEdenSnapshotRecall\(\)[\s\S]*?planEdenSnapshotRecallWrites\(draft\.plan, draft\.snapshot\)/
  );
  assert.match(dashboard, /edenRecallDashboardWrite\(payload, live\.docs\?\.dashboardData/);
  assert.match(
    dashboard,
    /reviveEdenSnapshotTimestamps\(write\.data, \(millis\) =>\s*Timestamp\.fromMillis\(millis\)\s*\)/
  );
  // The revived timestamps go to Firestore untouched: sanitizeForFirestore()
  // flattens a Timestamp into a plain map, which the conduct and vote
  // validators refuse.
  assert.match(dashboard, /await setDoc\(ref, payload\);/);
  assert.equal(/setDoc\(ref, sanitizeForFirestore\(payload\)\)/.test(dashboard), false);
  assert.match(
    dashboard,
    /async function readEdenWorkspaceLiveRecords\(\)[\s\S]*?EDEN_SNAPSHOT_COLLECTION_KEYS[\s\S]*?getDocs\(collection\(db, path\)\)/
  );
});
