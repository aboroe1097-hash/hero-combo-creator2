import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEdenPublicProjection } from '../../js/eden-workspaces.js';

const team = {
  season: 'season-x8',
  published: true,
  privateTotals: 987,
  rankings: [
    { playerName: 'First', playerKey: 'first', votes: 9, voters: 4, private: 'secret' },
    { playerName: 'Second', votes: 5, voters: 3 },
  ],
};
const management = [
  { playerName: 'Leader A', votes: 10 },
  { playerName: 'Leader B', votes: 10 },
  { playerName: 'Leader C', votes: 3 },
];
function project(flags) {
  return buildEdenPublicProjection({
    workspace: 'eden-x8',
    publicVoteResults: team,
    managementVotes: management,
    voteSettings: { showMemberResults: true, showManagementResults: true, ...flags },
  });
}

test('team and management vote counts are independently stripped from published data', () => {
  const hiddenTeam = project({ showMemberVoteCounts: false });
  assert.deepEqual(
    hiddenTeam.publicVoteResults.rankings.map((row) => row.rank),
    [1, 2]
  );
  assert.equal('votes' in hiddenTeam.publicVoteResults.rankings[0], false);
  assert.equal('voters' in hiddenTeam.publicVoteResults.rankings[0], false);
  assert.equal('private' in hiddenTeam.publicVoteResults.rankings[0], false);
  assert.equal('privateTotals' in hiddenTeam.publicVoteResults, false);
  assert.equal(hiddenTeam.managementVotes[0].votes, 10);
  const hiddenManagement = project({ showManagementVoteCounts: false });
  assert.equal(hiddenManagement.publicVoteResults.rankings[0].votes, 9);
  assert.deepEqual(
    hiddenManagement.managementVotes.map((row) => row.rank),
    [1, 1, 3]
  );
  assert.ok(hiddenManagement.managementVotes.every((row) => !('votes' in row)));
});

test('unpublished results are absent even if count visibility is enabled', () => {
  const result = project({ showMemberResults: false, showManagementResults: false });
  assert.deepEqual(result.publicVoteResults.rankings, []);
  assert.deepEqual(result.managementVotes, []);
});
