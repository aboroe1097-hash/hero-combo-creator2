import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const eden = read('js/eden-x1.js');
const edenCss = read('css/eden-x1.css');
const edenHtml = read('eden-x1.html');
const edenFirebase = read('js/firebase-eden.js');
const sdk = read('js/firebase-sdk.js');

test('Eden boot uses the lightweight Firestore module', () => {
  assert.match(sdk, /import\('firebase\/firestore\/lite'\)/);
  assert.match(sdk, /export function importFirestoreLite\(\)/);
  assert.doesNotMatch(sdk, /gstatic\.com/);
  assert.match(eden, /import\('\.\/firebase-eden\.js'\)/);
  assert.match(eden, /importFirestoreLite/);
  assert.doesNotMatch(eden, /import\('\.\/firebase\.js'\)/);
  assert.match(edenFirebase, /importFirebaseApp\(\), importFirebaseAuth\(\)/);
  assert.doesNotMatch(edenFirebase, /importFirestore/);
});

test('Eden bounds restored Auth readiness before anonymous sign-in', () => {
  assert.match(edenFirebase, /Promise\.race\(\[/);
  assert.match(edenFirebase, /auth\.authStateReady\(\)/);
  assert.match(edenFirebase, /setTimeout\(resolve, 3000\)/);
});

test('Eden public dashboard rendering is frame-sliced', () => {
  assert.match(eden, /async function renderPublicDashboard\(/);
  assert.match(eden, /edenX1PublicPrimarySlot/);
  assert.match(eden, /await renderPublicAdvancedAnalyticsSections\(host, token\)/);
  assert.match(eden, /await yieldToBrowser\(\);[\s\S]*edenX1PublicHistorySlot/);
});

test('Eden keeps first-viewport Velo feedback through blocking boot rendering', () => {
  assert.match(
    eden,
    /if \(bootLoader && !bootLoader\.hidden\)[\s\S]*globalThis\.VTSLoaderV14\?\.setProgress\?\.\(bootLoader, edenLoadingProgress\)/
  );
  assert.match(
    eden,
    /if \(deferPublicDashboard\) await schedulePublicDashboardRender\(data, renderGeneration\);[\s\S]*else await renderPublicDashboard\(data\);[\s\S]*setEdenPanelLoading\(false\);/
  );
  assert.match(
    eden,
    /function schedulePublicDashboardRender[\s\S]*return new Promise\(\(resolve\)/
  );
  assert.doesNotMatch(
    eden,
    /setEdenPanelLoading\(false\);\s*await yieldToBrowser\(\);\s*\/\/ Stage 2/
  );
});

test('Eden localized rerender tolerates dashboard data that has not loaded yet', () => {
  assert.match(eden, /renderEdenProgression\(publicDashboardData\)/);
  assert.match(eden, /Array\.isArray\(data\?\.attacks\) \? data\.attacks : \[\]/);
});

test('Eden marquee reports the weighted contribution cutoff at rank 20', () => {
  assert.match(eden, /Number\(row\.finalRank\) === DEFAULT_WEIGHTED_CONTRIBUTION_PREMIUM_CUTOFF/);
  assert.match(eden, /edenX1MarqueeTop20Cutoff/);
  assert.doesNotMatch(eden, /edenX1MarqueeDuties/);
});

test('Eden desktop dashboard spans both columns after the voting guidance row', () => {
  assert.match(
    edenHtml,
    /id="dashWeightedContributionPanel"[\s\S]*id="edenX1VoteRail"[\s\S]*id="edenX1PublicOverview"[\s\S]*id="edenX1PublicDashboard"/
  );
  assert.match(edenCss, /'overview rail'[\s\S]*'public\s+public'/);
  assert.match(edenCss, /#edenX1PublicOverview\s*{\s*grid-area: overview;/);
  assert.match(edenCss, /#edenX1PublicDashboard\s*{\s*grid-area: public;/);
  assert.match(eden, /overviewHost\.innerHTML = renderEdenTopNamesOverview\(\)/);
});

test('Eden voting uses only the native form submit activation path', () => {
  assert.match(eden, /form\.addEventListener\('submit', submitEdenTeamVote\)/);
  assert.doesNotMatch(eden, /edenVotePointerSubmitUntil/);
  assert.doesNotMatch(eden, /submitEdenTeamVoteFromPointer/);
  assert.doesNotMatch(eden, /edenVotePointerSubmitBound/);
  assert.doesNotMatch(eden, /addEventListener\('pointerdown', submitEdenTeamVoteFromPointer\)/);
});

test('Eden mobile source order and desktop progression grid follow the visible layout', () => {
  const weightedIndex = edenHtml.indexOf('id="dashWeightedContributionPanel"');
  const railIndex = edenHtml.indexOf('id="edenX1VoteRail"');
  const overviewIndex = edenHtml.indexOf('id="edenX1PublicOverview"');
  const dashboardIndex = edenHtml.indexOf('id="edenX1PublicDashboard"');

  assert.ok(weightedIndex >= 0);
  assert.ok(weightedIndex < railIndex);
  assert.ok(railIndex < overviewIndex);
  assert.ok(overviewIndex < dashboardIndex);
  assert.match(edenCss, /'progress progress'/);
  assert.doesNotMatch(edenCss, /'progress progression'/);
  assert.doesNotMatch(
    edenCss,
    /@media \(max-width: 980px\)[\s\S]*?#edenX1(?:VoteRail|PublicOverview|PublicDashboard)\s*{\s*order:/
  );
});

test('Eden weighted rosters paginate from 10 in 25-row steps and render in cancellable chunks', () => {
  assert.match(eden, /const EDEN_X1_TABLE_INITIAL_ROWS = 10/);
  assert.match(eden, /const EDEN_X1_TABLE_PAGE_STEP = 25/);
  assert.match(eden, /function advanceWeightedTablePagination\(/);
  assert.match(eden, /function expandWeightedTablePagination\(/);
  assert.match(eden, /data-eden-table-page-action="load"/);
  assert.match(eden, /data-eden-table-page-action="all"/);
  assert.match(eden, /data-eden-table-page-action="collapse"/);
  assert.match(eden, /const EDEN_X1_TABLE_RENDER_CHUNK_SIZE = 24/);
  assert.match(eden, /setProgressiveWeightedTablePlan\('reward'/);
  assert.match(eden, /setProgressiveWeightedTablePlan\('public'/);
  assert.match(eden, /activeProgressiveWeightedTablePlan\(channel\) !== plan/);
  assert.match(eden, /afterNextPaint\(appendChunk\)/);
  assert.match(eden, /data-eden-progressive-table=/);
  assert.match(eden, /aria-busy=/);
  assert.match(edenCss, /\.eden-x1-progressive-table tbody tr/);
});

test('Eden row popovers materialize only when a trigger is used', () => {
  assert.match(eden, /const deferredWeightedPopoverFactories = new Map\(\)/);
  assert.match(eden, /function deferredWeightedPopoverParts\(/);
  assert.match(eden, /function materializeWeightedPopover\(/);
  assert.match(eden, /const popover = materializeWeightedPopover\(button\)/);
  assert.match(eden, /data-eden-popover-scope=/);
});

test('Eden weighted popovers escape the card stacking context and keep JS placement', () => {
  assert.match(edenCss, /html\.admin-standalone-root\s*\{\s*scroll-behavior:\s*auto;/);
  assert.match(eden, /behavior:\s*reducedMotion \? 'auto' : 'smooth'/);
  assert.match(eden, /behavior:\s*prefersReducedMotion\(\) \? 'auto' : 'smooth'/);
  assert.match(
    edenCss,
    /\.eden-x1-weighted-card:has\([\s\S]*?\.dash-weighted-score-popover\[aria-hidden='false'\][\s\S]*?-webkit-backdrop-filter:\s*none\s*!important;[\s\S]*?backdrop-filter:\s*none\s*!important;/
  );
  assert.doesNotMatch(
    edenCss,
    /\.eden-x1-popover-trigger\.is-open\s+\.dash-weighted-score-popover\s*\{[^}]*left:\s*50%\s*!important;/
  );
  assert.match(
    eden,
    /button\.classList\.contains\('is-open'\)[\s\S]*?button\.contains\(document\.activeElement\)[\s\S]*?button\.matches\(':hover'\)[\s\S]*?hideWeightedPopover\(button\)/
  );
});

test('Eden vote winner details stay aggregate, shared, and publication-gated', () => {
  assert.match(
    eden,
    /const published = results\.published === true;[\s\S]*?const rankings = published && Array\.isArray\(results\.rankings\) \? results\.rankings : \[\];/
  );
  assert.match(eden, /function voteWinnerWithMetrics\(winner\)/);
  assert.match(
    eden,
    /function getEligibleManagementVoteWinners\(\)[\s\S]*?return selectEligibleVoteWinners\(rankings, getReservedRewardPriorityIdentities\(\)\);/
  );
  assert.match(
    eden,
    /function getEligibleTeamVoteWinners\(\)\s*{\s*if \(currentManagementVoteResults\.status !== 'loaded'\) return \[\];[\s\S]*?return selectEligibleVoteWinners\(results\.rankings, reserved\);/
  );
  assert.match(
    eden,
    /if \(view === 'team'\)[\s\S]*?voteDetails: winners\[index\]\.voteDetails,[\s\S]*?tieBreak: winners\[index\]\.tieBreak,/
  );
  assert.match(eden, /voteDetails: winners\[index\]\.voteDetails/);
  assert.match(
    eden,
    /const detailsTitle = `\$\{row\.group\} [^$]*\$\{t\('edenX1RewardAssignedReasonTitle'\)\}`;/
  );
  assert.match(eden, /t\('edenX1RewardVoted'\)/);
  assert.match(eden, /t\('edenX1ThConduct'\)/);
  assert.match(eden, /edenX1RewardManagementCopy/);
  assert.match(eden, /edenX1RewardTeamCopy/);
  assert.match(eden, /edenX1RewardTieScoreContext/);
  assert.doesNotMatch(eden, /edenX1Reward(?:VotePrivacy|ScoreContext)/);
  assert.doesNotMatch(
    eden,
    /edenX1Reward(?:ManagementDetailsTitle|TeamDetailsTitle|ManagementVotesLabel|TeamVotesLabel|VotersLabel|VoteRankLabel|BonusWeightedLabel)/
  );
  assert.doesNotMatch(eden, /managementDetails:/);
});

test('Eden keeps the last verified contribution authority when live settings are unavailable', () => {
  assert.match(
    eden,
    /hasAuthoritativeEdenVoteSettings\([\s\S]*?cached\?\.data\?\.edenX1VoteSettings,[\s\S]*?cached\?\.data\?\.r5Season[\s\S]*?return hasUsableDashboardCache\(cached\?\.data\) \? cached\.data : null;/
  );
  assert.match(
    eden,
    /if \(cachedData\)\s*{\s*applyEdenVoteSettings\(cachedData\.edenX1VoteSettings\);/
  );
  assert.match(
    eden,
    /const data = \{ \.\.\.dashboardData, edenX1VoteSettings: verifiedVoteSettings \};/
  );
  assert.match(eden, /getDoc\(doc\(db, EDEN_ACTIVE_VOTE_SETTINGS_PATH\)\)/);
  assert.match(
    eden,
    /requireAuthoritativeEdenVoteSettings\(\s*voteSettingsSnap,\s*dashboardData\?\.r5Season\s*\)/
  );
  assert.match(eden, /season: String\(settings\.season \|\| ''\)\.trim\(\)/);
  assert.match(
    eden,
    /verifiedVoteSettings\.showPublicResults !== true[\s\S]*?cachedData\?\.publicEdenX1VoteResults/
  );
  assert.doesNotMatch(
    eden,
    /loadEdenOptionalData\(getDoc\(doc\(db, EDEN_ACTIVE_VOTE_SETTINGS_PATH\)\)/
  );
});

test('Eden live refresh versions roster, vote, and conduct sidecars independently of core', () => {
  assert.match(
    eden,
    /function edenDashboardLiveStateVersion\(data\)[\s\S]*?rosterSnapshots: Array\.isArray\(data\?\.rosterSnapshots\)/
  );
  assert.match(
    eden,
    /dashboardCacheVersion\(result\.data\) !== cachedVersion \|\|[\s\S]*?edenDashboardLiveStateVersion\(result\.data\) !== cachedLiveStateVersion/
  );
  assert.match(
    eden,
    /if \(Array\.isArray\(liveConductAdjustments\)\)\s*{\s*data\.publicConductAdjustments = liveConductAdjustments;/
  );
  assert.match(
    eden,
    /const sidecarReadIncomplete =\s*rosterSnap === null \|\|[\s\S]*?publicVoteResultsSnap === null[\s\S]*?liveConductAdjustments === null;/
  );
  assert.match(
    eden,
    /rosterSnap === null && Array\.isArray\(cachedData\?\.rosterSnapshots\)[\s\S]*?data\.rosterSnapshots = cachedData\.rosterSnapshots;/
  );
  assert.match(
    eden,
    /if \(!result\.sidecarReadIncomplete\) writeEdenPublicDashboardCache\(result\.data\);/
  );
  assert.match(
    eden,
    /cachedEdenDashboardSeasonIsObsolete\(\s*cachedData,\s*err\?\.dashboardSeason\s*\)[\s\S]*?if \(cacheApplied && !cachedSeasonIsObsolete\)[\s\S]*?if \(cachedSeasonIsObsolete\) clearObsoleteEdenDashboardCache\(\);/
  );
  assert.match(
    eden,
    /if \(result\.kind === 'no-data'\)[\s\S]*?clearObsoleteEdenDashboardCache\(\);[\s\S]*?edenX1NoData/
  );
});
