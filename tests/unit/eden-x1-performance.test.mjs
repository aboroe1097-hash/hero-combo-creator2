import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const eden = read('js/eden-x1.js');
const edenCss = read('css/eden-x1.css');
const edenFirebase = read('js/firebase-eden.js');
const sdk = read('js/firebase-sdk.js');

test('Eden boot uses the lightweight Firestore module', () => {
  assert.match(sdk, /firebase-firestore-lite\.js/);
  assert.match(sdk, /export function importFirestoreLite\(\)/);
  assert.match(eden, /import\('\.\/firebase-eden\.js'\)/);
  assert.match(eden, /importFirestoreLite/);
  assert.doesNotMatch(eden, /import\('\.\/firebase\.js'\)/);
  assert.match(edenFirebase, /importFirebaseApp\(\), importFirebaseAuth\(\)/);
  assert.doesNotMatch(edenFirebase, /importFirestore/);
});

test('Eden public dashboard rendering is frame-sliced', () => {
  assert.match(eden, /async function renderPublicDashboard\(/);
  assert.match(eden, /edenX1PublicPrimarySlot/);
  assert.match(eden, /await renderPublicAdvancedAnalyticsSections\(host, token\)/);
  assert.match(eden, /await yieldToBrowser\(\);[\s\S]*edenX1PublicHistorySlot/);
});

test('Eden localized rerender tolerates dashboard data that has not loaded yet', () => {
  assert.match(eden, /renderEdenProgression\(publicDashboardData\)/);
  assert.match(eden, /Array\.isArray\(data\?\.attacks\) \? data\.attacks : \[\]/);
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
