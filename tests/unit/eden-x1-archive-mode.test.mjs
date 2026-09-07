import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../../eden-x1.html', import.meta.url), 'utf8');
const js = await readFile(new URL('../../js/eden-x1.js', import.meta.url), 'utf8');

test('Eden X1 production HTML defaults to archive with dormant season-only buttons', () => {
  assert.match(html, /<body[^>]+data-eden-season-state="archive"/);
  assert.match(html, /data-quicknav="vote"[\s\S]*?data-i18n="edenX1QuickVote"[\s\S]*?hidden/);
  assert.match(html, /data-quicknav="team"[\s\S]*?data-i18n="edenX1QuickTeam"[\s\S]*?hidden/);
  assert.match(html, /class="eden-x1-quicknav-chip eden-x1-season-only"/);
  assert.match(html, /id="edenX1RewardFlowPanel"/);
});

test('Eden X1 JS resolves archive state and suppresses public voting UI in archive mode', () => {
  assert.match(js, /globalThis\.VTS_EDEN_X1_SEASON_STATE/);
  assert.match(js, /document\.body\?\.dataset\?\.edenSeasonState/);
  assert.match(js, /return EDEN_X1_SEASON_STATES\.has\(normalized\) \? normalized : 'archive'/);
  assert.match(js, /let currentRewardView = EDEN_X1_IS_ARCHIVE \? 'announcement' : 'team'/);
  assert.match(js, /if \(EDEN_X1_IS_ARCHIVE\) \{\s*if \(edenVoteCountdownTimer\)/);
  assert.match(
    js,
    /if \(EDEN_X1_IS_ARCHIVE\) \{\s*host\.hidden = true;\s*host\.innerHTML = '';\s*return;\s*}\s*const rows = currentRows \|\| \[\];/
  );
  assert.match(js, /panel\.innerHTML = EDEN_X1_IS_ARCHIVE\s*\? renderAnnouncementTable\(\)/);
  assert.match(js, /id="edenX1FinalRewardsCard"/);
  assert.match(js, /overviewHost\.classList\.add\('hidden'\)/);
});

test('Eden X1 active voting and reward machinery remains in source for next season', () => {
  for (const symbol of [
    'renderEdenTeamVotePanel',
    'bindEdenVoteControls',
    'applyEdenVotePickToForm',
    'renderAnnouncementRemainingTable',
    'renderRewardSlotTable',
    'loadEdenManagementVoteResults',
    'updateEdenVoteCountdownState',
  ]) {
    assert.match(js, new RegExp(`function ${symbol}\\b|const ${symbol}\\b|${symbol}\\(`));
  }
  assert.match(js, /if \(target === 'vote'\)/);
  assert.match(js, /if \(target === 'team'\)/);
  assert.match(js, /currentRewardView === 'management' \|\| currentRewardView === 'team'/);
});
