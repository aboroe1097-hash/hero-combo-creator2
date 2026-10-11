import assert from 'node:assert/strict';
import test from 'node:test';
import { buildVtsScoreAudit, vtsScoreAuditCsv } from '../../js/vts-score-audit.js';
import { buildAdminVtsScoreRows } from '../../js/vts-score-admin.js';
import { normalizeVtsScoreSettings } from '../../js/vts-score-settings.js';
import { saveVtsScoreSettings } from '../../js/vts-score-store.js';

const stats = {
  totalCastlePower: 100,
  troopPower: 20,
  buildingPower: 20,
  technologyPower: 20,
  heroCombatPower: 20,
  dragonPower: 20,
  unitSpecialtyPower: 20,
};
const signup = (id, overrides = {}) => ({
  submissionUid: id,
  gameName: id,
  status: 'submitted',
  stats,
  ...overrides,
});

test('exports preserve all raw records and flag missing, duplicate, invalid and orphan records', () => {
  const submissions = Array.from({ length: 250 }, (_, index) => signup(`player-${index}`));
  submissions.push(
    signup('duplicate', {
      gameName: 'player-0',
      stats: { ...stats, troopPower: -1 },
      commitment: { privateNote: '=SUM(A1)' },
    })
  );
  const audit = buildVtsScoreAudit(
    {
      season: 'season-test',
      submissions,
      raceScores: [{ submissionUid: 'orphan', powerValues: stats }],
      historyScope: 'baseline-fallback',
    },
    { now: 0 }
  );
  assert.equal(audit.records.submissions.length, 251);
  assert.equal(audit.records.submissions[250].stats.troopPower, -1);
  const codes = audit.reconciliation.map((row) => row.code);
  for (const code of [
    'duplicate-name',
    'invalid-power',
    'missing-final-upload',
    'orphan-final-upload',
    'incomplete-history',
  ])
    assert.ok(codes.includes(code), code);
  assert.equal(audit.provenance.exportedAt, '1970-01-01T00:00:00.000Z');
  const csv = vtsScoreAuditCsv(audit);
  assert.match(csv, /player-249/);
  assert.match(csv, /commitment.privateNote/);
  assert.match(csv, /'=SUM\(A1\)/);
});

test('authoritative identifiers and raw team totals produce actionable cross-checks', () => {
  const audit = buildVtsScoreAudit({
    submissions: [signup('a', { documentId: 'a', storedSubmissionUid: 'spoof' })],
    matchResults: [
      {
        documentId: 'match-1',
        totalScore: 99,
        memberCount: 4,
        entries: [
          { playerName: 'unknown', score: 1 },
          { playerName: 'unknown', score: 2 },
        ],
      },
    ],
  });
  const codes = audit.reconciliation.map((row) => row.code);
  for (const code of [
    'identity-mismatch',
    'unmatched-match-player',
    'duplicate-match-player',
    'match-total-mismatch',
    'match-count-mismatch',
  ])
    assert.ok(codes.includes(code), code);
  assert.equal(audit.records.matchResults[0].totalScore, 99);
});

test('giant OCR growth is flagged with source and original values without changing ranking', () => {
  const audit = buildVtsScoreAudit({
    submissions: [signup('giant', { stats: { ...stats, troopPower: 550_000_000 } })],
    raceScores: [
      {
        submissionUid: 'giant',
        schemaVersion: 2,
        documentPath: 'boh_allstar/test/raceScores/giant',
        powerValues: { ...stats, troopPower: 61_066_500_000 },
      },
    ],
  });
  const issue = audit.reconciliation.find(
    (entry) => entry.code === 'extreme-growth-review' && entry.field === 'troopPower'
  );
  assert.equal(issue.before, 550_000_000);
  assert.equal(issue.after, 61_066_500_000);
  assert.equal(issue.growthPercent, 11003);
  assert.equal(issue.documentPath, 'boh_allstar/test/raceScores/giant');
  assert.equal(audit.records.raceScores[0].powerValues.troopPower, issue.after);
  const relaxed = buildVtsScoreAudit({
    submissions: [signup('giant')],
    raceScores: [
      { submissionUid: 'giant', schemaVersion: 2, powerValues: { ...stats, troopPower: 25 } },
    ],
    settings: { growthWarningAbsolute: 100, growthWarningPercent: 100 },
  });
  assert.equal(
    relaxed.reconciliation.some((entry) => entry.code === 'extreme-growth-review'),
    false
  );
});

test('shared Dragon cutoff has an inclusive boundary and preserves the 7M default', () => {
  const submissions = [
    signup('below', { stats: { ...stats, dragonPower: 9 } }),
    signup('at', { stats: { ...stats, dragonPower: 10 } }),
  ];
  const rows = buildAdminVtsScoreRows(submissions, [], { dragonTierCutoff: 10 });
  assert.equal(rows.find((row) => row.submissionUid === 'at').tier, 1);
  assert.equal(rows.find((row) => row.submissionUid === 'below').tier, 2);
  assert.equal(normalizeVtsScoreSettings().dragonTierCutoff, 7_000_000);
  assert.equal(normalizeVtsScoreSettings({ dragonTierCutoff: -1 }).dragonTierCutoff, 7_000_000);
});

test('cutoff saves require real Admin claims and reject concurrent policy changes', async () => {
  let writes = 0;
  const context = {
    db: {},
    user: { uid: 'admin', getIdTokenResult: async () => ({ claims: { admin: true } }) },
    firestore: {
      doc: () => 'settings',
      runTransaction: async (_db, fn) =>
        fn({
          get: async () => ({ data: () => ({ revision: 2 }) }),
          set() {
            writes += 1;
          },
        }),
    },
  };
  await assert.rejects(saveVtsScoreSettings(10, 1, context), /Another Admin/);
  assert.equal(writes, 0);
  assert.equal((await saveVtsScoreSettings(10, 2, context)).revision, 3);
  assert.equal(writes, 1);
  context.user.getIdTokenResult = async () => ({ claims: {} });
  await assert.rejects(saveVtsScoreSettings(10, 3, context), /Admin access/);
  await assert.rejects(saveVtsScoreSettings(10.1, 3, context), /whole Dragon/);
});
