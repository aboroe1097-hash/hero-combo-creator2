import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('admin vote season rollover is explicit, closed, unpublished, and formula-preserving', () => {
  const admin = readFileSync('js/ocr-dashboard.js', 'utf8');
  const template = readFileSync('tabs/admin.html', 'utf8');
  const sharedCopy = readFileSync('js/i18n/eden-contribution-mode-copy.js', 'utf8');

  assert.match(template, /id="dashEdenVoteSeasonMismatch"[\s\S]*?hidden/);
  assert.match(template, /id="dashEdenVoteActivateSeasonBtn"[\s\S]*?type="button"/);
  assert.match(
    admin,
    /async function activateCurrentEdenX1VoteSeason\(\)[\s\S]*?\.\.\.previousSettings,[\s\S]*?season: currentEdenVoteSeason\(\),[\s\S]*?votingOpen: false,[\s\S]*?allowEditing: false,[\s\S]*?showPublicResults: false,[\s\S]*?showVoterNames: false,[\s\S]*?closesAt: ''/
  );
  assert.match(
    admin,
    /async function publishEdenX1PublicVoteResults[\s\S]*?if \(hasEdenX1VoteSeasonMismatch\(settings\)\) return false;/
  );
  assert.match(
    admin,
    /dashEdenVoteActivateSeasonBtn'\)\?\.addEventListener\('click',[\s\S]*?activateCurrentEdenX1VoteSeason\(\)/
  );
  assert.match(sharedCopy, /adminEdenVotesSeasonMismatchHint:/);
});
