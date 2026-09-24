import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

globalThis.window = { VTS_ADMIN_AUTH: {} };
const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) || null,
  setItem: (key, value) => stored.set(key, String(value)),
  removeItem: (key) => stored.delete(key),
};
globalThis.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const { buildEdenPublicDataFromProjection } = await import('../../js/ai/eden-public-data.js');

function publishedProjection(overrides = {}) {
  return {
    workspace: 'eden-x2',
    published: true,
    revision: 4,
    season: 'season-2027',
    dashboard: {
      r5Season: 'season-2027',
      date: '2026-09-24',
      attacks: [],
      contributionRecords: [
        {
          id: 'x2-contributions',
          entries: [{ rank: '1', name: 'X2 Pilot', contribution: '123456' }],
        },
      ],
      dutyRecords: [],
      exGuildContributions: [],
      publicConductAdjustments: [],
      // These private or irrelevant projection fields must not leave the adapter.
      rosterSnapshots: [{ playerName: 'PRIVATE ROSTER MEMBER' }],
      privateAdminNote: 'PRIVATE ADMIN NOTE',
    },
    voteSettings: { votingOpen: true, allowEditing: true, showMemberResults: false },
    publicVoteResults: {
      published: true,
      totalBallots: 1,
      rankings: [{ playerName: 'Public Nominee', votes: 1, voters: ['PRIVATE VOTER'] }],
    },
    rosterSnapshots: [{ playerName: 'PRIVATE ROSTER MEMBER' }],
    ...overrides,
  };
}

test('Velo derives Eden data from the published X2 projection and omits private fields', () => {
  const data = buildEdenPublicDataFromProjection(publishedProjection());

  assert.equal(data.workspace, 'eden-x2');
  assert.equal(data.season, 'season-2027');
  assert.equal(data.seasonLabel, 'X2');
  assert.equal(data.sourceRevision, 4);
  assert.equal(data.rows[0].playerName, 'X2 Pilot');
  assert.equal(data.rows[0].contribution, 123456);
  assert.equal(data.publicVoteResults.published, false);
  assert.deepEqual(data.managementVoteResults.rankings, []);
  assert.doesNotMatch(
    JSON.stringify(data),
    /PRIVATE ROSTER MEMBER|PRIVATE ADMIN NOTE|PRIVATE VOTER/u
  );

  assert.equal(
    buildEdenPublicDataFromProjection({ ...publishedProjection(), published: false }),
    null
  );
  assert.equal(
    buildEdenPublicDataFromProjection({ ...publishedProjection(), workspace: 'eden-x1' }),
    null
  );
});

test('Velo only exposes allowlisted aggregate fields when X2 public results are enabled', () => {
  const data = buildEdenPublicDataFromProjection(
    publishedProjection({
      voteSettings: { votingOpen: true, showMemberResults: true },
    })
  );

  assert.equal(data.publicVoteResults.published, true);
  assert.equal(data.publicVoteResults.rankings[0].playerName, 'Public Nominee');
  assert.equal(data.publicVoteResults.rankings[0].voters, 0);
  assert.doesNotMatch(
    JSON.stringify(data),
    /PRIVATE VOTER|PRIVATE ROSTER MEMBER|PRIVATE ADMIN NOTE/u
  );
});

test('missing published multipliers stay unknown instead of becoming zero', () => {
  const data = buildEdenPublicDataFromProjection(
    publishedProjection({ scoring: { contributionWeight: null, formPointWeight: '' } })
  );

  assert.equal(data.scoring.contributionWeight, null);
  assert.equal(data.scoring.formPointWeight, null);
});

test('Velo Eden loader has no fallback reads from the previous season', () => {
  const source = readFileSync('js/ai/eden-public-data.js', 'utf8');

  assert.match(source, /eden-x2', 'publicProjection'/);
  assert.doesNotMatch(
    source,
    /vts_admin\/dashboard_data|eden_x1_public_vote_results|eden-x1-management-votes/u
  );
});
