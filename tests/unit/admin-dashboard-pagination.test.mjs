import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const renderSource = readFileSync('js/ocr-render.js', 'utf8');
const dashboardCss = readFileSync('css/ocr-dashboard.css', 'utf8');
const mobileCss = readFileSync('css/mobile.css', 'utf8');

test('Admin weighted and attack lists use a 10-row start with 25-row increments', () => {
  assert.match(renderSource, /const ADMIN_TABLE_INITIAL_ROWS = 10;/);
  assert.match(renderSource, /const ADMIN_TABLE_PAGE_ROWS = 25;/);
  assert.match(renderSource, /function resolveAdminTablePage\(owner, signature, rows\)/);
  assert.match(
    renderSource,
    /renderAdminTablePager\('weighted', weightedPage, 'dashWeightedContributionTable', \{ showAll: true \}\)/
  );
  assert.match(renderSource, /renderAdminTablePager\('attacks', attackPage, 'dashAttackList'\)/);
  assert.match(renderSource, /data-admin-table-page="more"/);
  assert.match(renderSource, /data-admin-table-page="all"/);
  assert.match(renderSource, /data-admin-table-page="reset"/);
});

test('Activity Trend constrains only its inner chart instead of clipping the full widget', () => {
  assert.match(
    dashboardCss,
    /#ocrDashboardRoot #dashTrendChart\.dash-mini-trend\.dash-activity-rendered\s*\{[\s\S]*?height:\s*auto !important;[\s\S]*?overflow:\s*hidden;/
  );
  assert.match(
    dashboardCss,
    /#ocrDashboardRoot #dashInsightsCard\s*\{[\s\S]*?height:\s*auto;[\s\S]*?overflow:\s*clip;/
  );
});

test('Admin narrow theme control stays touch-safe and standalone RTL follows document direction', () => {
  assert.match(
    mobileCss,
    /\[data-theme='light'\] body\.admin-standalone-page \.admin-command-actions #themeToggle\s*\{[\s\S]*?width:\s*44px !important;[\s\S]*?height:\s*44px !important;/
  );
  assert.match(
    mobileCss,
    /\[dir='rtl'\] body\.admin-standalone-page \.admin-command-actions \.admin-control-row\s*\{[\s\S]*?direction:\s*rtl;/
  );
});

test('Admin phone command deck prioritizes readable controls over decoration', () => {
  assert.match(
    mobileCss,
    /@media \(max-width:\s*640px\)[\s\S]*?\.admin-command-actions \.command-kicker\s*\{[\s\S]*?display:\s*none !important;/
  );
  assert.match(
    mobileCss,
    /\.admin-command-actions \.global-game-clock\s*\{[\s\S]*?grid-column:\s*1 \/ 3 !important;/
  );
  assert.match(
    mobileCss,
    /\.admin-command-actions \.lang-select-wrapper\s*\{[\s\S]*?grid-column:\s*1 \/ -1 !important;[\s\S]*?grid-row:\s*2 !important;/
  );
  assert.match(
    mobileCss,
    /\.admin-command-actions \.admin-back-tools:last-of-type\s*\{[\s\S]*?grid-column:\s*2 \/ -1 !important;[\s\S]*?grid-row:\s*3 !important;/
  );
});
